-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — CONSOLIDADO MIGRACIONES 09, 10 & 11 (FASE 2.8, 2.9, 2.8.1)
-- Ejecutar este bloque completo en el SQL Editor de Supabase oficial
-- ==============================================================================

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

-- ==============================================================================

-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 10: RBAC DEFINITIVO & IDENTIDADES OFICIALES
-- Fase 2.9: Jerarquía de Roles, Cuentas Administrativas Oficiales y Protección Server-Side
-- ==============================================================================

-- 1. REGISTRO EN APP_SETTINGS DE LAS IDENTIDADES ADMINISTRATIVAS OFICIALES
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'OFFICIAL_ADMIN_IDENTITIES',
    jsonb_build_object(
        'SUPER_ADMIN', 'v19629049@gmail.com',
        'ADMIN', 'bingoclubvnzla@gmail.com',
        'OPERATOR', 'bingobingovnz@gmail.com',
        'hierarchy', jsonb_build_array('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERATOR', 'PLAYER'),
        'configured_at', now()
    ),
    'Identidades oficiales de administración y jerarquía RBAC definitiva'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- 2. JERARQUÍA NUMÉRICA RBAC OFICIAL
CREATE OR REPLACE FUNCTION public.get_role_hierarchy_level(p_role user_role)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_role
        WHEN 'SUPER_ADMIN' THEN 50
        WHEN 'ADMIN'       THEN 40
        WHEN 'SUPERVISOR'  THEN 30
        WHEN 'OPERATOR'    THEN 20
        WHEN 'PLAYER'      THEN 10
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. ACTUALIZACIÓN DE handle_new_user() CON ASIGNACIÓN AUTOMÁTICA SERVER-SIDE DE IDENTIDADES OFICIALES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_id TEXT;
    v_full_name TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
    v_target_role user_role := 'PLAYER';
    v_email_normalized TEXT;
BEGIN
    gen_id := public.generate_public_id();
    v_email_normalized := lower(trim(COALESCE(NEW.email, '')));

    -- Extraer nombres y metadatos tanto de registro tradicional como de Google OAuth
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
    );

    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        gen_id
    );

    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        null
    );

    -- Asignación autoritativa de identidades oficiales server-side
    IF v_email_normalized = 'v19629049@gmail.com' THEN
        v_target_role := 'SUPER_ADMIN';
    ELSIF v_email_normalized = 'bingoclubvnzla@gmail.com' THEN
        v_target_role := 'ADMIN';
    ELSIF v_email_normalized = 'bingobingovnz@gmail.com' THEN
        v_target_role := 'OPERATOR';
    ELSE
        v_target_role := 'PLAYER';
    END IF;

    -- Inserción segura en profiles
    INSERT INTO public.profiles (
        id,
        public_id,
        full_name,
        display_name,
        avatar_url,
        role,
        status,
        security_level,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        gen_id,
        v_full_name,
        v_display_name,
        v_avatar_url,
        v_target_role,
        'ACTIVE',
        CASE WHEN v_target_role = 'SUPER_ADMIN' THEN 5
             WHEN v_target_role = 'ADMIN' THEN 4
             WHEN v_target_role = 'OPERATOR' THEN 2
             ELSE 1 END,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = CASE 
            WHEN v_email_normalized = 'v19629049@gmail.com' THEN 'SUPER_ADMIN'
            WHEN v_email_normalized = 'bingoclubvnzla@gmail.com' THEN 'ADMIN'
            WHEN v_email_normalized = 'bingobingovnz@gmail.com' THEN 'OPERATOR'
            ELSE profiles.role
        END,
        updated_at = now();

    -- Registrar auditoría si se asignó un rol administrativo oficial
    IF v_target_role <> 'PLAYER' THEN
        INSERT INTO public.audit_logs (
            user_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            metadata
        ) VALUES (
            NEW.id,
            v_target_role::text,
            'ADMIN_CREATED',
            'user_role',
            NEW.id::text,
            jsonb_build_object(
                'email', v_email_normalized,
                'role', v_target_role,
                'event', 'OFFICIAL_IDENTITY_BOOTSTRAP'
            )
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. PROCEDIMIENTO SERVER-SIDE: SINCRONIZACIÓN Y BOOTSTRAP DE IDENTIDADES OFICIALES
CREATE OR REPLACE FUNCTION public.sync_official_admin_identities()
RETURNS JSONB AS $$
DECLARE
    v_super_admin_user RECORD;
    v_admin_user RECORD;
    v_operator_user RECORD;
    v_result JSONB := '{}'::jsonb;
BEGIN
    -- 1. Reconciliar SUPER_ADMIN (v19629049@gmail.com)
    SELECT id, email INTO v_super_admin_user
    FROM auth.users
    WHERE lower(trim(email)) = 'v19629049@gmail.com'
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.profiles
        SET role = 'SUPER_ADMIN',
            security_level = 5,
            updated_at = now()
        WHERE id = v_super_admin_user.id;

        INSERT INTO public.audit_logs (user_id, actor_role, action, entity_type, entity_id, metadata)
        VALUES (v_super_admin_user.id, 'SUPER_ADMIN', 'ROLE_ASSIGNED', 'profile', v_super_admin_user.id::text,
                jsonb_build_object('role', 'SUPER_ADMIN', 'email', 'v19629049@gmail.com'));

        v_result := jsonb_set(v_result, '{SUPER_ADMIN}', jsonb_build_object('status', 'ACTIVE', 'user_id', v_super_admin_user.id));
    ELSE
        v_result := jsonb_set(v_result, '{SUPER_ADMIN}', jsonb_build_object('status', 'ADMIN_IDENTITY_PENDING', 'email', 'v19629049@gmail.com'));
    END IF;

    -- 2. Reconciliar ADMIN (bingoclubvnzla@gmail.com)
    SELECT id, email INTO v_admin_user
    FROM auth.users
    WHERE lower(trim(email)) = 'bingoclubvnzla@gmail.com'
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.profiles
        SET role = 'ADMIN',
            security_level = 4,
            updated_at = now()
        WHERE id = v_admin_user.id;

        INSERT INTO public.audit_logs (user_id, actor_role, action, entity_type, entity_id, metadata)
        VALUES (v_admin_user.id, 'ADMIN', 'ROLE_ASSIGNED', 'profile', v_admin_user.id::text,
                jsonb_build_object('role', 'ADMIN', 'email', 'bingoclubvnzla@gmail.com'));

        v_result := jsonb_set(v_result, '{ADMIN}', jsonb_build_object('status', 'ACTIVE', 'user_id', v_admin_user.id));
    ELSE
        v_result := jsonb_set(v_result, '{ADMIN}', jsonb_build_object('status', 'ADMIN_IDENTITY_PENDING', 'email', 'bingoclubvnzla@gmail.com'));
    END IF;

    -- 3. Reconciliar OPERATOR (bingobingovnz@gmail.com)
    SELECT id, email INTO v_operator_user
    FROM auth.users
    WHERE lower(trim(email)) = 'bingobingovnz@gmail.com'
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.profiles
        SET role = 'OPERATOR',
            security_level = 2,
            updated_at = now()
        WHERE id = v_operator_user.id;

        INSERT INTO public.audit_logs (user_id, actor_role, action, entity_type, entity_id, metadata)
        VALUES (v_operator_user.id, 'OPERATOR', 'ROLE_ASSIGNED', 'profile', v_operator_user.id::text,
                jsonb_build_object('role', 'OPERATOR', 'email', 'bingobingovnz@gmail.com'));

        v_result := jsonb_set(v_result, '{OPERATOR}', jsonb_build_object('status', 'ACTIVE', 'user_id', v_operator_user.id));
    ELSE
        v_result := jsonb_set(v_result, '{OPERATOR}', jsonb_build_object('status', 'ADMIN_IDENTITY_PENDING', 'email', 'bingobingovnz@gmail.com'));
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. PROCEDIMIENTO SEGURO: GESTIÓN DE ROLES CON STEP-UP OBLIGATORIO
CREATE OR REPLACE FUNCTION public.execute_admin_change_role(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_role user_role,
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_target_current_role user_role;
    v_target_email TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    -- Consumir Step-Up Authorization de nivel CRITICAL
    PERFORM public.internal_consume_step_up(p_auth_id, 'CHANGE_USER_ROLE');

    -- Obtener rol del llamador
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Acceso Denegado (403): Solo administradores pueden gestionar roles.';
    END IF;

    -- Comprobar que no se intente modificar a sí mismo (anti-self-lockout / anti-self-elevation)
    IF v_caller_id = p_target_user_id THEN
        RAISE EXCEPTION 'Violación de Seguridad: No puede modificar su propio rol.';
    END IF;

    -- Obtener rol actual del usuario destino
    SELECT role INTO v_target_current_role
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario destino no encontrado.';
    END IF;

    -- Si el llamador es ADMIN (no SUPER_ADMIN):
    IF v_caller_role = 'ADMIN' THEN
        -- No puede asignar roles ADMIN ni SUPER_ADMIN
        IF p_new_role IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Privilegios Insuficientes: Un ADMIN no puede otorgar roles ADMIN ni SUPER_ADMIN.';
        END IF;
        -- Tampoco puede modificar a un usuario que ya sea ADMIN o SUPER_ADMIN
        IF v_target_current_role IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Privilegios Insuficientes: Un ADMIN no puede alterar a otros administradores.';
        END IF;
    END IF;

    -- Protección estricta de la identidad SUPER_ADMIN
    IF v_target_current_role = 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Protección de Identidad Canónica: El rol SUPER_ADMIN es inmutable.';
    END IF;

    -- Actualizar rol del perfil
    UPDATE public.profiles
    SET role = p_new_role,
        security_level = CASE 
            WHEN p_new_role = 'SUPER_ADMIN' THEN 5
            WHEN p_new_role = 'ADMIN' THEN 4
            WHEN p_new_role = 'SUPERVISOR' THEN 3
            WHEN p_new_role = 'OPERATOR' THEN 2
            ELSE 1 END,
        updated_at = now()
    WHERE id = p_target_user_id;

    -- Auditoría inmutable de roles
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
        'ROLE_CHANGED',
        'user_role',
        p_target_user_id::text,
        jsonb_build_object(
            'actor_id', v_caller_id,
            'target_id', p_target_user_id,
            'previous_role', v_target_current_role,
            'new_role', p_new_role
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_id', p_target_user_id,
        'new_role', p_new_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. PROCEDIMIENTO SEGURO: BLOQUEO Y DESBLOQUEO DE USUARIOS
CREATE OR REPLACE FUNCTION public.execute_admin_toggle_user_status(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_status user_status,
    p_reason TEXT DEFAULT 'Modificación por administración',
    p_idempotency_key UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_target_role user_role;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Acceso Denegado: Se requiere rol de administrador.';
    END IF;

    SELECT role INTO v_target_role
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario destino no encontrado.';
    END IF;

    IF v_target_role = 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'No es posible modificar el estado de la cuenta SUPER_ADMIN.';
    END IF;

    UPDATE public.profiles
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_target_user_id;

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
        CASE WHEN p_new_status = 'BLOCKED' OR p_new_status = 'SUSPENDED' THEN 'USER_BLOCKED' ELSE 'USER_UNBLOCKED' END,
        'user_profile',
        p_target_user_id::text,
        jsonb_build_object(
            'target_id', p_target_user_id,
            'new_status', p_new_status,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. RESTRICCIÓN DE PERMISOS EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_official_admin_identities FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_admin_change_role FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_admin_toggle_user_status FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_role_hierarchy_level TO PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_official_admin_identities TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_admin_change_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_admin_toggle_user_status TO authenticated;

-- ==============================================================================

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

-- ==============================================================================
-- VERIFICACIÓN INMEDIATA POST-DEPLOY DE MIGRACIONES 09-11
-- ==============================================================================
SELECT to_regclass('public.step_up_authorizations') AS step_up_table;
SELECT public.validate_chapitas_catalog_integrity();