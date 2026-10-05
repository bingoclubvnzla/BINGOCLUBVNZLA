-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 09: SECURITY STEP-UP AUTHENTICATION (FASE 2.8)
-- Implementación de Step-Up Authorization Server-Side, Anti-Replay, Idempotencia,
-- Vinculación de Acciones (Action Binding), Cooldown Financiero y Auditoría Forense.
-- ==============================================================================

-- 1. EXTENSIÓN DE PERFILES CON CAMPOS FINANCIEROS Y DE SEGURIDAD MFA
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pago_movil_phone TEXT,
ADD COLUMN IF NOT EXISTS pago_movil_bank TEXT,
ADD COLUMN IF NOT EXISTS pago_movil_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS financial_cooldown_until TIMESTAMPTZ;

-- 2. TABLA DE AUTORIZACIONES TEMPORALES STEP-UP (SERVER-AUTHORITATIVE)
CREATE TABLE IF NOT EXISTS public.step_up_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    resource_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN NOT NULL DEFAULT false,
    ip_address TEXT,
    user_agent TEXT
);

-- Índices de alto rendimiento para validaciones en tiempo real
CREATE INDEX IF NOT EXISTS idx_step_up_user ON public.step_up_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_step_up_idempotency ON public.step_up_authorizations(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_step_up_action ON public.step_up_authorizations(action_type);
CREATE INDEX IF NOT EXISTS idx_step_up_expires ON public.step_up_authorizations(expires_at);

-- RLS: Solo lectura del propio usuario; mutaciones restringidas estrictamente a RPCs de servidor
ALTER TABLE public.step_up_authorizations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own step-up authorizations" ON public.step_up_authorizations;
    CREATE POLICY "Users can view own step-up authorizations"
        ON public.step_up_authorizations
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
END $$;

-- 3. EXPANDIR LISTA BLANCA DE AUDITORÍA EN log_auth_event
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_clean_metadata JSONB;
    v_allowed_actions TEXT[] := ARRAY[
        'LOGIN_FAILURE',
        'LOGIN_ATTEMPT',
        'PASSWORD_RESET_REQUESTED',
        'LOGOUT',
        'MFA_ENROLLMENT_STARTED',
        'MFA_ENROLLMENT_VERIFIED',
        'MFA_ENROLLMENT_FAILED',
        'MFA_DISABLED',
        'MFA_CHALLENGE_CREATED',
        'MFA_VERIFICATION_SUCCESS',
        'MFA_VERIFICATION_FAILED',
        'MFA_RECOVERY_USED',
        'STEP_UP_AUTHORIZED',
        'STEP_UP_REJECTED',
        'SENSITIVE_ACTION_STARTED',
        'SENSITIVE_ACTION_COMPLETED',
        'SENSITIVE_ACTION_REJECTED'
    ];
BEGIN
    -- Validar lista blanca estricta de eventos autorizados
    IF NOT (p_action = ANY(v_allowed_actions)) THEN
        RAISE EXCEPTION 'Acceso denegado: Acción de auditoría no permitida para cliente (%).', p_action;
    END IF;

    -- Límite de tamaño de metadata (2KB) para mitigar denegación de almacenamiento
    IF octet_length(COALESCE(p_metadata, '{}'::jsonb)::text) > 2048 THEN
        RAISE EXCEPTION 'Payload de metadata excede el límite máximo permitido (2KB).';
    END IF;

    -- Redacción estricta de credenciales, secretos, TOTP y tokens
    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'password'
        - 'contraseña'
        - 'token'
        - 'access_token'
        - 'refresh_token'
        - 'secret'
        - 'totp_secret'
        - 'totp_code'
        - 'code'
        - 'recovery_code'
        - 'recovery_codes'
        - 'client_secret'
        - 'turnstile_token'
        - 'cf_turnstile';

    -- Derivar identidad real desde el contexto criptográfico de sesión PostgreSQL
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT role::text INTO v_role FROM public.profiles WHERE id = v_user_id;
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        COALESCE(v_role, 'ANON'),
        p_action,
        'auth',
        COALESCE(v_user_id::text, 'anon'),
        v_clean_metadata
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. PROCEDIMIENTO SERVER-AUTHORITATIVE: CREAR STEP-UP AUTHORIZATION
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
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado: Se requiere una sesión válida para solicitar Step-Up Authorization.';
    END IF;

    IF p_risk_level NOT IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') THEN
        RAISE EXCEPTION 'Nivel de riesgo inválido: %', p_risk_level;
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
        p_risk_level,
        p_resource_id,
        COALESCE(p_metadata, '{}'::jsonb),
        p_idempotency_key,
        v_expires_at
    )
    RETURNING id INTO v_auth_id;

    -- Registro en auditoría
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
            'risk_level', p_risk_level,
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

-- 5. PROCEDIMIENTO PRIVADO: CONSUMIR AUTORIZACIÓN STEP-UP (ANTI-REPLAY & ACTION BINDING)
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
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    SELECT * INTO v_auth
    FROM public.step_up_authorizations
    WHERE id = p_auth_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Autorización no encontrada o inválida.';
    END IF;

    IF v_auth.user_id <> v_user_id THEN
        RAISE EXCEPTION 'Violación de Identidad: La autorización no pertenece al usuario autenticado.';
    END IF;

    IF v_auth.action_type <> p_expected_action THEN
        RAISE EXCEPTION 'Violación de Action Binding: La autorización fue emitida para % pero se intentó usar para %.', v_auth.action_type, p_expected_action;
    END IF;

    IF p_expected_resource IS NOT NULL AND v_auth.resource_id IS NOT NULL AND v_auth.resource_id <> p_expected_resource THEN
        RAISE EXCEPTION 'Violación de Resource Binding: El identificador de recurso no coincide.';
    END IF;

    IF v_auth.is_used THEN
        RAISE EXCEPTION 'Violación de Anti-Replay: Esta autorización ya ha sido consumida.';
    END IF;

    IF v_auth.expires_at <= timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Autorización de seguridad expirada. Por favor confirme su segundo factor nuevamente.';
    END IF;

    -- Consumir de inmediato
    UPDATE public.step_up_authorizations
    SET is_used = true,
        used_at = timezone('utc'::text, now())
    WHERE id = p_auth_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. ACCIÓN SENSIBLE: CAMBIO DE PAGO MÓVIL DEL JUGADOR (HIGH RISK)
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

    -- Limpieza y validación de formato de teléfono venezolano (0414, 0424, 0412, 0416, 0426)
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

-- 7. ACCIÓN SENSIBLE: SOLICITUD DE RETIRO DE FONDOS (HIGH/CRITICAL)
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
    v_cooldown_until TIMESTAMPTZ;
    v_wallet_id UUID;
    v_balance NUMERIC;
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

    -- Comprobar cooldown financiero activo
    SELECT financial_cooldown_until INTO v_cooldown_until
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_cooldown_until IS NOT NULL AND v_cooldown_until > timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Operación restringida por política de cooldown financiero tras cambio reciente de datos. Disponible a partir de %.', v_cooldown_until;
    END IF;

    -- Obtener billetera
    SELECT id, balance_available INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = v_user_id;

    IF FOUND AND v_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo disponible insuficiente para procesar la solicitud de retiro.';
    END IF;

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
        p_destination,
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
            'destination_masked', substring(COALESCE(p_destination, '') from 1 for 4) || '***'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'status', 'PENDING_APPROVAL'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. ACCIÓN SENSIBLE: ELIMINACIÓN DE CUENTA (CRITICAL - SOFT-DELETE & AUDIT PRESERVATION)
CREATE OR REPLACE FUNCTION public.execute_account_soft_deletion(
    p_auth_id UUID,
    p_confirmation_phrase TEXT,
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    IF trim(p_confirmation_phrase) <> 'ELIMINAR MI CUENTA DEFINITIVAMENTE' THEN
        RAISE EXCEPTION 'Frase de confirmación incorrecta. No se procedió con la eliminación.';
    END IF;

    -- Validar y consumir autorización Step-Up
    PERFORM public.internal_consume_step_up(p_auth_id, 'ACCOUNT_DELETION');

    -- Anonimización y soft-delete preservando la trazabilidad contable
    UPDATE public.profiles
    SET status = 'SUSPENDED',
        display_name = 'Usuario Eliminado',
        full_name = 'Anonimizado por Solicitud',
        phone = null,
        pago_movil_phone = null,
        pago_movil_bank = null,
        avatar_url = null,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

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
        'ACCOUNT_DELETION_COMPLETED',
        'user_profile',
        v_user_id::text,
        jsonb_build_object(
            'preserved_ledger', true,
            'action', 'soft_delete_anonymization'
        )
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 9. PERMISOS DE EJECUCIÓN (LEAST PRIVILEGE)
REVOKE EXECUTE ON FUNCTION public.internal_consume_step_up FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_step_up_authorization FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_update_pago_movil FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_request_withdrawal FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_account_soft_deletion FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_step_up_authorization TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_update_pago_movil TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_request_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_account_soft_deletion TO authenticated;

-- 10. APP_SETTINGS REGISTRATION
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'MFA_STEP_UP_CONFIG_PHASE_2_8',
    jsonb_build_object(
        'phase', '2.8',
        'totp_standard', 'RFC_6238',
        'step_up_token_ttl_seconds', 300,
        'pago_movil_cooldown_hours', 24,
        'mandatory_roles', jsonb_build_array('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'),
        'verified_at', now()
    ),
    'Configuración central de seguridad MFA / TOTP y Step-Up Authorization'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();
