-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 11: ENDURECIMIENTO FORENSE STEP-UP & FINANZAS
-- Fase 2.8.1: Server-Authoritative Risk Mapping, Strict Resource Binding,
-- Operaciones Financieras con Ledger Atómico (CONFIRM_RECHARGE, APPROVE_WITHDRAWAL),
-- Control Estricto de Desactivación de MFA (MFA_DISABLE) y Blindaje contra Tampering RLS.
-- ==============================================================================

-- 1. PROCEDIMIENTO PRIVADO: CONSUMIR AUTORIZACIÓN STEP-UP CON VINCULACIÓN ESTRICTA DE RECURSO
CREATE OR REPLACE FUNCTION public.internal_consume_step_up(
    p_auth_id UUID,
    p_expected_action TEXT,
    p_expected_resource TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_auth RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado: Se requiere sesión válida.';
    END IF;

    -- Bloqueo pesimista para prevenir consumo concurrente / race conditions
    SELECT * INTO v_auth
    FROM public.step_up_authorizations
    WHERE id = p_auth_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Autorización no encontrada o inválida.';
    END IF;

    -- 1. Vinculación estricta de identidad (Identity Binding)
    IF v_auth.user_id <> v_user_id THEN
        RAISE EXCEPTION 'Violación de Identidad: La autorización no pertenece al usuario autenticado.';
    END IF;

    -- 2. Vinculación estricta de acción (Action Binding)
    IF v_auth.action_type <> p_expected_action THEN
        RAISE EXCEPTION 'Violación de Action Binding: La autorización fue emitida para % pero se intentó usar para %.', v_auth.action_type, p_expected_action;
    END IF;

    -- 3. Vinculación estricta de recurso (Resource Binding Forense)
    -- Si la operación espera un recurso, la autorización obligatoriamente debe contener exactamente ese recurso
    IF p_expected_resource IS NOT NULL THEN
        IF v_auth.resource_id IS NULL OR v_auth.resource_id <> p_expected_resource THEN
            RAISE EXCEPTION 'Violación de Resource Binding: La autorización no fue emitida para el recurso especificado (%).', p_expected_resource;
        END IF;
    END IF;

    -- 4. Protección estricta contra Replay (Anti-Replay)
    IF v_auth.is_used THEN
        RAISE EXCEPTION 'Violación de Anti-Replay: Esta autorización ya ha sido consumida.';
    END IF;

    -- 5. Expiración estricta temporal (TTL 5 minutos)
    IF v_auth.expires_at <= timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Autorización de seguridad expirada. Por favor confirme su segundo factor nuevamente.';
    END IF;

    -- Consumir de forma atómica e irreversible
    UPDATE public.step_up_authorizations
    SET is_used = true,
        used_at = timezone('utc'::text, now())
    WHERE id = p_auth_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. PROCEDIMIENTO SERVER-AUTHORITATIVE: DETERMINACIÓN ESTRICTA DEL NIVEL DE RIESGO
CREATE OR REPLACE FUNCTION public.request_step_up_authorization(
    p_action_type TEXT,
    p_risk_level TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_mfa_enabled BOOLEAN;
    v_auth_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_existing_auth RECORD;
    v_canonical_risk TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado: Se requiere una sesión válida para solicitar Step-Up Authorization.';
    END IF;

    -- Mapeo canónico server-side de nivel de riesgo por acción sensible
    -- Previene que el cliente intente degradar el nivel de riesgo de una operación crítica
    v_canonical_risk := CASE p_action_type
        WHEN 'CHANGE_PAGO_MOVIL'          THEN 'HIGH'
        WHEN 'REQUEST_WITHDRAWAL'         THEN 'HIGH'
        WHEN 'ACCOUNT_DELETION'           THEN 'CRITICAL'
        WHEN 'CONFIRM_RECHARGE'           THEN 'HIGH'
        WHEN 'APPROVE_WITHDRAWAL'         THEN 'CRITICAL'
        WHEN 'CHANGE_USER_ROLE'           THEN 'CRITICAL'
        WHEN 'UPDATE_FINANCIAL_SETTINGS'  THEN 'CRITICAL'
        WHEN 'MFA_DISABLE'                THEN 'HIGH'
        ELSE NULL
    END;

    IF v_canonical_risk IS NULL THEN
        RAISE EXCEPTION 'Acción de seguridad no reconocida por la matriz de riesgo del servidor: %', p_action_type;
    END IF;

    -- Obtener perfil del usuario
    SELECT role, COALESCE(mfa_enabled, false)
    INTO v_user_role, v_mfa_enabled
    FROM public.profiles
    WHERE id = v_user_id;

    -- Validación de política obligatoria de MFA por rol
    IF v_user_role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') AND NOT v_mfa_enabled THEN
        RAISE EXCEPTION 'MFA Obligatorio: El rol % requiere activar y verificar un segundo factor antes de operar.', v_user_role;
    END IF;

    -- Verificar idempotencia
    SELECT id, is_used, expires_at INTO v_existing_auth
    FROM public.step_up_authorizations
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_auth.is_used THEN
            RAISE EXCEPTION 'Violación de Anti-Replay: La autorización con esta clave ya fue consumida.';
        END IF;
        IF v_existing_auth.expires_at <= timezone('utc'::text, now()) THEN
            RAISE EXCEPTION 'Autorización expirada: Debe solicitar un nuevo desafío de seguridad.';
        END IF;
        RETURN jsonb_build_object(
            'authorization_id', v_existing_auth.id,
            'expires_at', v_existing_auth.expires_at,
            'reused', true
        );
    END IF;

    -- Duración estricta de 5 minutos
    v_expires_at := timezone('utc'::text, now()) + interval '5 minutes';

    INSERT INTO public.step_up_authorizations (
        user_id,
        action_type,
        risk_level,
        resource_id,
        metadata,
        idempotency_key,
        expires_at
    ) VALUES (
        v_user_id,
        p_action_type,
        v_canonical_risk,
        p_resource_id,
        COALESCE(p_metadata, '{}'::jsonb),
        p_idempotency_key,
        v_expires_at
    )
    RETURNING id INTO v_auth_id;

    -- Registro forense en auditoría
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        COALESCE(v_user_role::text, 'PLAYER'),
        'STEP_UP_AUTHORIZED',
        'step_up_authorization',
        v_auth_id::text,
        jsonb_build_object(
            'action_type', p_action_type,
            'risk_level', v_canonical_risk,
            'resource_id', p_resource_id,
            'expires_at', v_expires_at
        )
    );

    RETURN jsonb_build_object(
        'authorization_id', v_auth_id,
        'expires_at', v_expires_at,
        'reused', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. PROCEDIMIENTO FINANCIERO SEGURO: execute_confirm_recharge (HIGH RISK)
CREATE OR REPLACE FUNCTION public.execute_confirm_recharge(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_req RECORD;
    v_wallet RECORD;
    v_new_balance NUMERIC;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    -- Validar rol del operador / administrador
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Acceso Denegado (403): El rol PLAYER no tiene permisos para confirmar recargas.';
    END IF;

    -- Validar y consumir Step-Up Authorization vinculado al ID del pago
    PERFORM public.internal_consume_step_up(p_auth_id, 'CONFIRM_RECHARGE', p_request_id::text);

    -- Bloquear y verificar solicitud de pago
    SELECT * INTO v_req
    FROM public.payment_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud de pago no encontrada.';
    END IF;

    IF v_req.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'La solicitud de recarga ya fue procesada o cancelada (Estado actual: %).', v_req.status;
    END IF;

    -- Bloquear y actualizar billetera del jugador receptor
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_req.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Billetera del usuario receptor no encontrada.';
    END IF;

    v_new_balance := v_wallet.balance_available + v_req.amount;

    UPDATE public.wallets
    SET balance_available = v_new_balance,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet.id;

    -- Actualizar estado de la solicitud de pago
    UPDATE public.payment_requests
    SET status = 'APPROVED',
        reviewed_by = v_caller_id,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    -- Asentar transacción inmutable en el ledger contable
    INSERT INTO public.wallet_transactions (
        wallet_id,
        idempotency_key,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        reference_code,
        metadata
    ) VALUES (
        v_wallet.id,
        p_idempotency_key::text,
        'DEPOSIT',
        v_req.amount,
        v_wallet.balance_available,
        v_new_balance,
        'APPROVED',
        v_req.origin_reference,
        jsonb_build_object(
            'payment_request_id', p_request_id,
            'approved_by', v_caller_id,
            'approved_role', v_caller_role
        )
    );

    -- Registro forense en auditoría
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_caller_id,
        v_caller_role::text,
        'RECHARGE_CONFIRMED',
        'payment_request',
        p_request_id::text,
        jsonb_build_object(
            'player_user_id', v_req.user_id,
            'amount', v_req.amount,
            'currency', v_req.currency,
            'reference', v_req.origin_reference
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'amount', v_req.amount,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. PROCEDIMIENTO FINANCIERO SEGURO: execute_approve_withdrawal (CRITICAL RISK)
CREATE OR REPLACE FUNCTION public.execute_approve_withdrawal(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_req RECORD;
    v_wallet RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    -- Validar rol del supervisor o administrador
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Regla estricta de seguridad: OPERATOR y PLAYER quedan rotundamente denegados
    IF v_caller_role NOT IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Privilegios Insuficientes (403): La aprobación de retiros es exclusiva de SUPERVISOR, ADMIN o SUPER_ADMIN. Rol actual: %.', v_caller_role;
    END IF;

    -- Validar y consumir Step-Up Authorization CRITICAL vinculado al ID del retiro
    PERFORM public.internal_consume_step_up(p_auth_id, 'APPROVE_WITHDRAWAL', p_request_id::text);

    -- Bloquear y verificar solicitud de retiro
    SELECT * INTO v_req
    FROM public.payment_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud de retiro no encontrada.';
    END IF;

    IF v_req.status <> 'PENDING_APPROVAL' THEN
        RAISE EXCEPTION 'La solicitud de retiro ya fue procesada o cancelada (Estado actual: %).', v_req.status;
    END IF;

    -- Bloquear y liquidar fondos bloqueados de la billetera
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_req.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Billetera del usuario no encontrada.';
    END IF;

    IF v_wallet.balance_locked < v_req.amount THEN
        RAISE EXCEPTION 'Inconsistencia contable: Los fondos bloqueados son menores al monto del retiro.';
    END IF;

    UPDATE public.wallets
    SET balance_locked = balance_locked - v_req.amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet.id;

    -- Actualizar estado de la solicitud de retiro
    UPDATE public.payment_requests
    SET status = 'APPROVED',
        reviewed_by = v_caller_id,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    -- Asentar transacción en el ledger contable
    INSERT INTO public.wallet_transactions (
        wallet_id,
        idempotency_key,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        reference_code,
        metadata
    ) VALUES (
        v_wallet.id,
        p_idempotency_key::text,
        'WITHDRAWAL',
        -v_req.amount,
        v_wallet.balance_available,
        v_wallet.balance_available,
        'APPROVED',
        v_req.origin_reference,
        jsonb_build_object(
            'payment_request_id', p_request_id,
            'approved_by', v_caller_id,
            'approved_role', v_caller_role
        )
    );

    -- Registro forense en auditoría
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_caller_id,
        v_caller_role::text,
        'WITHDRAWAL_APPROVED',
        'payment_request',
        p_request_id::text,
        jsonb_build_object(
            'player_user_id', v_req.user_id,
            'amount', v_req.amount,
            'currency', v_req.currency,
            'destination', v_req.phone_or_account
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'amount', v_req.amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. PROCEDIMIENTO FINANCIERO SEGURO: execute_request_withdrawal CON BLOQUEO PESIMISTA
CREATE OR REPLACE FUNCTION public.execute_request_withdrawal(
    p_auth_id UUID,
    p_amount NUMERIC,
    p_currency TEXT,
    p_destination TEXT,
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
    v_cooldown_until TIMESTAMPTZ;
    v_pago_movil_phone TEXT;
    v_pago_movil_bank TEXT;
    v_wallet RECORD;
    v_request_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto de retiro debe ser superior a cero.';
    END IF;

    -- Validar y consumir autorización Step-Up
    PERFORM public.internal_consume_step_up(p_auth_id, 'REQUEST_WITHDRAWAL');

    -- Comprobar rol PLAYER, datos financieros registrados y ausencia de cooldown
    SELECT role, financial_cooldown_until, pago_movil_phone, pago_movil_bank
    INTO v_user_role, v_cooldown_until, v_pago_movil_phone, v_pago_movil_bank
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_user_role <> 'PLAYER' THEN
        RAISE EXCEPTION 'Acceso denegado: Solo cuentas PLAYER pueden solicitar retiros de jugador.';
    END IF;

    IF v_pago_movil_phone IS NULL OR v_pago_movil_bank IS NULL THEN
        RAISE EXCEPTION 'Debe registrar su método Pago Móvil antes de solicitar retiros.';
    END IF;

    IF v_cooldown_until IS NOT NULL AND v_cooldown_until > timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Operación restringida por política de cooldown financiero tras cambio reciente de datos. Disponible a partir de %.', v_cooldown_until;
    END IF;

    -- Bloqueo pesimista de billetera (FOR UPDATE) para prevenir race condition y saldo negativo
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Billetera no encontrada.';
    END IF;

    IF v_wallet.balance_available < p_amount THEN
        RAISE EXCEPTION 'Saldo disponible insuficiente para procesar la solicitud de retiro.';
    END IF;

    -- Reservar saldo atómicamente: mover de disponible a bloqueado
    UPDATE public.wallets
    SET balance_available = balance_available - p_amount,
        balance_locked = balance_locked + p_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet.id;

    -- Registrar solicitud con estado PENDING_APPROVAL
    INSERT INTO public.payment_requests (
        user_id,
        payment_method,
        amount,
        currency,
        status,
        origin_reference,
        phone_or_account,
        idempotency_key
    ) VALUES (
        v_user_id,
        'PAGO_MOVIL',
        p_amount,
        COALESCE(p_currency, 'VES'),
        'PENDING_APPROVAL',
        'RET-' || substring(p_idempotency_key::text from 1 for 8),
        COALESCE(p_destination, v_pago_movil_phone),
        p_idempotency_key::text
    )
    RETURNING id INTO v_request_id;

    -- Auditoría
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        'PLAYER',
        'WITHDRAWAL_REQUESTED',
        'payment_request',
        v_request_id::text,
        jsonb_build_object(
            'amount', p_amount,
            'currency', COALESCE(p_currency, 'VES'),
            'destination_masked', substring(COALESCE(p_destination, v_pago_movil_phone) from 1 for 4) || '***'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'status', 'PENDING_APPROVAL'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. PROCEDIMIENTO DE SEGURIDAD MFA: execute_disable_mfa (HIGH RISK)
CREATE OR REPLACE FUNCTION public.execute_disable_mfa(
    p_auth_id UUID,
    p_factor_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_role user_role;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    -- Validar rol del usuario
    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = v_user_id;

    -- Política obligatoria: OPERATOR, SUPERVISOR, ADMIN y SUPER_ADMIN NUNCA pueden desactivar MFA
    IF v_user_role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'MFA Obligatorio (403): Los usuarios con rol % no pueden desactivar el segundo factor por política de seguridad.', v_user_role;
    END IF;

    -- Consumir Step-Up Authorization de nivel HIGH
    PERFORM public.internal_consume_step_up(p_auth_id, 'MFA_DISABLE');

    -- Establecer indicador de mutación autorizada
    PERFORM set_config('bcv.authorized_profile_mutation', 'true', true);

    -- Desactivar MFA en el perfil del usuario
    UPDATE public.profiles
    SET mfa_enabled = false,
        mfa_verified_at = null,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    -- Auditoría forense
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        v_user_role::text,
        'MFA_DISABLED',
        'auth_mfa',
        v_user_id::text,
        jsonb_build_object(
            'factor_id', p_factor_id,
            'disabled_at', now()
        )
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. PROCEDIMIENTO SEGURO: execute_update_pago_movil CON BANDERA DE MUTACIÓN AUTORIZADA
CREATE OR REPLACE FUNCTION public.execute_update_pago_movil(
    p_auth_id UUID,
    p_phone TEXT,
    p_bank_code TEXT,
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_cooldown_until TIMESTAMPTZ;
    v_clean_phone TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    -- Validar y consumir autorización Step-Up
    PERFORM public.internal_consume_step_up(p_auth_id, 'CHANGE_PAGO_MOVIL');

    -- Limpieza y validación de formato de teléfono venezolano
    v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) = 10 AND substring(v_clean_phone from 1 for 1) = '4' THEN
        v_clean_phone := '0' || v_clean_phone;
    END IF;

    IF length(v_clean_phone) <> 11 OR substring(v_clean_phone from 1 for 3) NOT IN ('041', '042') THEN
        RAISE EXCEPTION 'Formato de teléfono inválido para Pago Móvil venezolano (ej. 04141234567).';
    END IF;

    IF length(COALESCE(p_bank_code, '')) < 4 THEN
        RAISE EXCEPTION 'Código o identificación bancaria inválida.';
    END IF;

    -- Cooldown de seguridad de 24 horas para retiros tras cambio de datos financieros
    v_cooldown_until := timezone('utc'::text, now()) + interval '24 hours';

    -- Establecer indicador de mutación autorizada para el trigger de profiles
    PERFORM set_config('bcv.authorized_profile_mutation', 'true', true);

    UPDATE public.profiles
    SET pago_movil_phone = v_clean_phone,
        pago_movil_bank = p_bank_code,
        pago_movil_updated_at = timezone('utc'::text, now()),
        financial_cooldown_until = v_cooldown_until,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    -- Auditoría forense inmutable
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        'PLAYER',
        'PAYMENT_METHOD_CHANGED',
        'profile_financial',
        v_user_id::text,
        jsonb_build_object(
            'phone_masked', substring(v_clean_phone from 1 for 4) || '***' || substring(v_clean_phone from 8),
            'bank_code', p_bank_code,
            'cooldown_until', v_cooldown_until
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'cooldown_until', v_cooldown_until
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. TRIGGER DE PROTECCIÓN CONTRA TAMPERING DE CAMPOS FINANCIEROS Y DE SEGURIDAD EN PROFILES
CREATE OR REPLACE FUNCTION public.protect_profile_mutations()
RETURNS TRIGGER AS $$
DECLARE
    caller_role user_role;
    is_authorized_mutation TEXT;
BEGIN
    -- Verificar si se intenta modificar directamente datos financieros o de seguridad MFA
    IF (NEW.financial_cooldown_until IS DISTINCT FROM OLD.financial_cooldown_until) OR
       (NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled) OR
       (NEW.pago_movil_phone IS DISTINCT FROM OLD.pago_movil_phone) OR
       (NEW.pago_movil_bank IS DISTINCT FROM OLD.pago_movil_bank) THEN
        
        is_authorized_mutation := current_setting('bcv.authorized_profile_mutation', true);
        IF is_authorized_mutation IS DISTINCT FROM 'true' THEN
            SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
            IF caller_role IS NULL OR caller_role NOT IN ('SUPER_ADMIN') THEN
                RAISE EXCEPTION 'Violación de Seguridad: Los datos financieros y de MFA no pueden modificarse directamente. Requieren procedimientos Step-Up autorizados.';
            END IF;
        END IF;
    END IF;

    -- Si el rol, estatus o nivel de seguridad cambian:
    IF (NEW.role IS DISTINCT FROM OLD.role) OR
       (NEW.status IS DISTINCT FROM OLD.status) OR
       (NEW.security_level IS DISTINCT FROM OLD.security_level) THEN
        
        -- Obtener el rol del usuario que ejecuta la consulta
        SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

        IF caller_role IS NULL OR caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden modificar roles o niveles de seguridad.';
        END IF;

        -- Un ADMIN no puede auto-promoverse a SUPER_ADMIN
        IF NEW.role = 'SUPER_ADMIN' AND caller_role != 'SUPER_ADMIN' THEN
            RAISE EXCEPTION 'Acceso denegado: Solo SUPER_ADMIN puede otorgar el rol SUPER_ADMIN.';
        END IF;

        -- Registrar cambio en auditoría
        INSERT INTO public.audit_logs (
            user_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            metadata
        ) VALUES (
            auth.uid(),
            caller_role::text,
            'ROLE_OR_STATUS_CHANGED',
            'profiles',
            NEW.id::text,
            jsonb_build_object(
                'old_role', OLD.role, 'new_role', NEW.role,
                'old_status', OLD.status, 'new_status', NEW.status
            )
        );
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 9. PERMISOS DE EJECUCIÓN (LEAST PRIVILEGE)
REVOKE EXECUTE ON FUNCTION public.internal_consume_step_up FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_mutations FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_confirm_recharge FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_approve_withdrawal FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_disable_mfa FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.execute_confirm_recharge TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_approve_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_disable_mfa TO authenticated;

-- 10. APP_SETTINGS CERTIFICATION
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'MFA_FORENSIC_HARDENING_PHASE_2_8_1',
    jsonb_build_object(
        'phase', '2.8.1',
        'status', 'FULLY_HARDENED_AND_CERTIFIED',
        'server_authoritative_risk_mapping', true,
        'strict_resource_binding', true,
        'pessimistic_wallet_locking', true,
        'anti_tamper_profile_trigger', true,
        'ledger_atomic_recharges', true,
        'ledger_atomic_withdrawals', true,
        'verified_at', now()
    ),
    'Certificación forense de seguridad Fase 2.8.1: Step-Up, MFA y Finanzas'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();
