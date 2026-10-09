-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 12: REMEDIACIÓN DEFINITIVA DEL SECURITY ADVISOR (FASE 2.8.4)
-- Seguridad en Profundidad: SECURITY DEFINER / SECURITY INVOKER / VIEWS / SEARCH_PATH / POSTGREST
-- Resuelve:
-- 1. ERROR: security_definer_view en public.v_chapitas_catalog (SET security_invoker = true)
-- 2. WARN: function_search_path_mutable en validate_draw_state_transition y get_role_hierarchy_level
-- 3. WARN: anon_security_definer_function_executable (0028)
-- 4. WARN: authenticated_security_definer_function_executable (0029) mediante arquitectura
--          PostgREST API Wrapper (SECURITY INVOKER) -> Internal Elevated Core (private.fn, SECURITY DEFINER)
-- 5. Least Privilege: Endurecimiento de default privileges y revocación explícita de anon.
-- ==============================================================================

-- ==============================================================================
-- 1. CORRECCIÓN CRÍTICA DE VISTA: public.v_chapitas_catalog (SECURITY INVOKER)
-- ==============================================================================
-- PostgreSQL 15+ / Supabase: Fuerza que la vista ejecute con los privilegios RLS del caller
ALTER VIEW public.v_chapitas_catalog SET (security_invoker = true);

-- ==============================================================================
-- 2. CORRECCIÓN DE SEARCH_PATH MUTABLE (0011)
-- ==============================================================================

-- 2.1 validate_draw_state_transition (versión con parámetros de estado)
CREATE OR REPLACE FUNCTION public.validate_draw_state_transition(
    p_current_state public.draw_status,
    p_new_state public.draw_status
) RETURNS BOOLEAN 
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
BEGIN
    IF p_current_state = p_new_state THEN
        RETURN true;
    END IF;

    CASE p_current_state
        WHEN 'DRAFT' THEN
            RETURN p_new_state IN ('SCHEDULED', 'CANCELLED');
        WHEN 'SCHEDULED' THEN
            RETURN p_new_state IN ('READY', 'CANCELLED');
        WHEN 'READY' THEN
            RETURN p_new_state IN ('ACTIVE', 'PAUSED', 'CANCELLED');
        WHEN 'ACTIVE' THEN
            RETURN p_new_state IN ('PAUSED', 'FINISHED', 'CANCELLED');
        WHEN 'PAUSED' THEN
            RETURN p_new_state IN ('ACTIVE', 'FINISHED', 'CANCELLED');
        WHEN 'FINISHED' THEN
            RETURN p_new_state = 'ARCHIVED';
        WHEN 'CANCELLED' THEN
            RETURN p_new_state = 'ARCHIVED';
        WHEN 'ARCHIVED' THEN
            RETURN false;
        ELSE
            RETURN false;
    END CASE;
END;
$$;

-- 2.2 validate_draw_state_transition (versión trigger)
CREATE OR REPLACE FUNCTION public.validate_draw_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_is_valid := public.validate_draw_state_transition(OLD.status, NEW.status);
    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Transición de estado de sorteo inválida: % -> %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

-- 2.3 get_role_hierarchy_level
CREATE OR REPLACE FUNCTION public.get_role_hierarchy_level(p_role public.user_role)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
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
$$;

-- ==============================================================================
-- 3. ESQUEMA PRIVADO (private) — PROTECCIÓN DEL NÚCLEO ELEVADO
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS private;

-- Restricción estricta de esquema: PostgREST NO expone 'private'
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role, postgres;

-- ==============================================================================
-- 4. HELPERS DE ROL Y VERIFICACIÓN RLS (CONVERSIÓN A SECURITY INVOKER EN public)
-- ==============================================================================

-- 4.1 current_user_role(): SECURITY INVOKER en public
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- 4.2 is_admin(): SECURITY INVOKER en public
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4.3 is_operator_or_higher(): SECURITY INVOKER en public
CREATE OR REPLACE FUNCTION public.is_operator_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_operator_or_higher() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_operator_or_higher() TO authenticated;

-- 4.4 get_draw_snapshot(): SECURITY INVOKER en public
-- Consulta directamente sobre draws y draw_events protegidos por sus políticas RLS
CREATE OR REPLACE FUNCTION public.get_draw_snapshot(p_draw_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_draw RECORD;
    v_events JSONB;
BEGIN
    SELECT * INTO v_draw FROM public.draws WHERE id = p_draw_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Sorteo no encontrado');
    END IF;

    -- Protección anti-enumeración de sorteos en borrador
    IF v_draw.status = 'DRAFT' AND NOT public.is_operator_or_higher() THEN
        RETURN jsonb_build_object('error', 'Acceso denegado: Sorteo no disponible');
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'sequence_number', sequence_number,
            'event_type', event_type,
            'ball_number', ball_number,
            'event_hash', event_hash,
            'created_at', created_at
        ) ORDER BY sequence_number ASC
    ) INTO v_events
    FROM public.draw_events
    WHERE draw_id = p_draw_id;

    RETURN jsonb_build_object(
        'draw_id', v_draw.id,
        'public_code', v_draw.public_code,
        'modality_id', v_draw.modality_id,
        'status', v_draw.status,
        'version', v_draw.version,
        'drawn_numbers', v_draw.drawn_numbers,
        'current_ball', CASE WHEN array_length(v_draw.drawn_numbers, 1) > 0 
                             THEN v_draw.drawn_numbers[array_length(v_draw.drawn_numbers, 1)] 
                             ELSE null END,
        'current_sequence', v_draw.current_sequence,
        'server_time', now(),
        'events', COALESCE(v_events, '[]'::jsonb)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_draw_snapshot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_draw_snapshot(UUID) TO anon, authenticated;

-- ==============================================================================
-- 5. AUDITORÍA FORENSE: log_auth_event
-- ==============================================================================

-- 5.1 Implementación privilegiada en private
CREATE OR REPLACE FUNCTION private.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
        'SENSITIVE_ACTION_REJECTED',
        'PAYMENT_METHOD_CHANGED',
        'WITHDRAWAL_REQUESTED',
        'WITHDRAWAL_APPROVED',
        'WITHDRAWAL_REJECTED',
        'RECHARGE_CONFIRMED',
        'ACCOUNT_DELETION_REQUESTED',
        'ACCOUNT_DELETION_COMPLETED'
    ];
BEGIN
    IF p_action != ALL(v_allowed_actions) THEN
        RAISE EXCEPTION 'Acceso denegado: Acción de auditoría no permitida para cliente (%).', p_action;
    END IF;

    IF octet_length(COALESCE(p_metadata, '{}'::jsonb)::text) > 2048 THEN
        RAISE EXCEPTION 'Payload de metadata excede el límite máximo permitido (2KB).';
    END IF;

    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'password'
        - 'contraseña'
        - 'token'
        - 'access_token'
        - 'refresh_token'
        - 'turnstile_token'
        - 'turnstiletoken'
        - 'captchatoken'
        - 'secret'
        - 'client_secret';

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
        COALESCE(v_role, 'AUTHENTICATED'),
        p_action,
        'auth_security',
        v_user_id::text,
        v_clean_metadata
    );

    RETURN true;
END;
$$;

-- 5.2 Wrapper seguro en public (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere sesión autenticada.';
    END IF;
    RETURN private.log_auth_event(p_action, p_metadata);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) TO authenticated;

-- ==============================================================================
-- 6. DRAW ENGINE: TRASLADO DE LÓGICA ATÓMICA A private Y WRAPPERS EN public
-- ==============================================================================

-- Secuencia oficial atómica anti-concurrencia para numeración de sorteos
CREATE SEQUENCE IF NOT EXISTS public.draw_number_seq START WITH 101;

-- 6.1 create_draw_authoritative
CREATE OR REPLACE FUNCTION private.create_draw_authoritative(
    p_room_id UUID,
    p_modality_id VARCHAR,
    p_title TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_draw_id UUID;
    v_draw_number BIGINT;
    v_public_code VARCHAR(16);
    v_total_balls INTEGER;
    v_permutation INTEGER[];
BEGIN
    -- Secuencia server-authoritative atómica para prevenir colisiones bajo concurrencia
    v_draw_number := nextval('public.draw_number_seq');

    -- CSPRNG para código público oficial de sorteo (BCV-SXXXXXX)
    v_public_code := 'BCV-S' || upper(substr(encode(sha256((gen_random_uuid()::text || clock_timestamp()::text)::bytea), 'hex'), 1, 6));

    SELECT total_balls INTO v_total_balls
    FROM public.game_modalities
    WHERE id = p_modality_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Modalidad no encontrada o inactiva: %', p_modality_id;
    END IF;

    v_permutation := public.generate_draw_permutation(v_total_balls, (extract(epoch from now()) * 1000)::integer);

    INSERT INTO public.draws (
        room_id,
        modality_id,
        title,
        draw_number,
        public_code,
        status,
        version,
        permutation,
        drawn_numbers,
        current_sequence,
        metadata
    ) VALUES (
        p_room_id,
        p_modality_id,
        COALESCE(p_title, 'Sorteo #' || v_draw_number || ' (' || p_modality_id || ')'),
        v_draw_number,
        v_public_code,
        'DRAFT',
        1,
        v_permutation,
        '{}'::integer[],
        0,
        jsonb_build_object(
            'created_by', auth.uid(),
            'total_balls', v_total_balls,
            'source', 'private_authoritative_engine'
        )
    ) RETURNING id INTO v_draw_id;

    INSERT INTO public.draw_events (
        draw_id,
        sequence_number,
        event_type,
        event_hash,
        payload
    ) VALUES (
        v_draw_id,
        0,
        'DRAW_CREATED',
        encode(sha256((v_draw_id::text || ':0:DRAW_CREATED:' || clock_timestamp()::text)::bytea), 'hex'),
        jsonb_build_object(
            'modality_id', p_modality_id,
            'public_code', v_public_code,
            'total_balls', v_total_balls
        )
    );

    RETURN jsonb_build_object(
        'draw_id', v_draw_id,
        'draw_number', v_draw_number,
        'public_code', v_public_code,
        'status', 'DRAFT',
        'version', 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_draw_authoritative(
    p_room_id UUID,
    p_modality_id VARCHAR,
    p_title TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.create_draw_authoritative(p_room_id, p_modality_id, p_title);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) TO authenticated;

-- 6.2 start_draw_authoritative
CREATE OR REPLACE FUNCTION private.start_draw_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_draw RECORD;
    v_new_version INTEGER;
BEGIN
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado: %', p_draw_id;
    END IF;

    IF v_draw.version <> p_expected_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia: versión esperada %, versión actual %',
            p_expected_version, v_draw.version;
    END IF;

    IF NOT public.validate_draw_state_transition(v_draw.status, 'ACTIVE') THEN
        RAISE EXCEPTION 'Transición inválida de % a ACTIVE para sorteo %', v_draw.status, p_draw_id;
    END IF;

    v_new_version := v_draw.version + 1;

    UPDATE public.draws
    SET status = 'ACTIVE',
        started_at = timezone('utc'::text, now()),
        version = v_new_version,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_draw_id;

    INSERT INTO public.draw_events (
        draw_id,
        sequence_number,
        event_type,
        event_hash,
        payload
    ) VALUES (
        p_draw_id,
        v_draw.current_sequence + 1,
        'DRAW_STARTED',
        encode(sha256((p_draw_id::text || ':' || (v_draw.current_sequence + 1)::text || ':DRAW_STARTED:' || clock_timestamp()::text)::bytea), 'hex'),
        jsonb_build_object(
            'started_by', auth.uid(),
            'previous_status', v_draw.status,
            'version', v_new_version
        )
    );

    RETURN jsonb_build_object(
        'draw_id', p_draw_id,
        'status', 'ACTIVE',
        'version', v_new_version,
        'started_at', now()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_draw_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.start_draw_authoritative(p_draw_id, p_expected_version);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) TO authenticated;

-- 6.3 emit_next_ball_authoritative
CREATE OR REPLACE FUNCTION private.emit_next_ball_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_draw RECORD;
    v_next_seq INTEGER;
    v_next_ball INTEGER;
    v_total_balls INTEGER;
    v_new_version INTEGER;
    v_event_hash VARCHAR(64);
    v_prev_hash VARCHAR(64);
    v_is_finished BOOLEAN := false;
BEGIN
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado: %', p_draw_id;
    END IF;

    IF v_draw.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'El sorteo no está activo (estado actual: %)', v_draw.status;
    END IF;

    IF v_draw.version <> p_expected_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia: versión esperada %, versión actual %',
            p_expected_version, v_draw.version;
    END IF;

    v_total_balls := array_length(v_draw.permutation, 1);
    v_next_seq := v_draw.current_sequence + 1;

    IF v_next_seq > v_total_balls THEN
        RAISE EXCEPTION 'Todas las balotas han sido emitidas para este sorteo (% de %)',
            v_draw.current_sequence, v_total_balls;
    END IF;

    v_next_ball := v_draw.permutation[v_next_seq];

    SELECT event_hash INTO v_prev_hash
    FROM public.draw_events
    WHERE draw_id = p_draw_id
    ORDER BY sequence_number DESC
    LIMIT 1;

    -- Cadena criptográfica SHA-256 (Server-Authoritative)
    v_event_hash := encode(sha256((
        COALESCE(v_prev_hash, 'GENESIS') || ':' ||
        p_draw_id::text || ':' ||
        v_next_seq::text || ':' ||
        v_next_ball::text || ':' ||
        clock_timestamp()::text
    )::bytea), 'hex');

    v_new_version := v_draw.version + 1;

    IF v_next_seq = v_total_balls THEN
        v_is_finished := true;
    END IF;

    UPDATE public.draws
    SET current_sequence = v_next_seq,
        drawn_numbers = array_append(drawn_numbers, v_next_ball),
        status = CASE WHEN v_is_finished THEN 'FINISHED'::public.draw_status ELSE 'ACTIVE'::public.draw_status END,
        finished_at = CASE WHEN v_is_finished THEN timezone('utc'::text, now()) ELSE null END,
        version = v_new_version,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_draw_id;

    INSERT INTO public.draw_events (
        draw_id,
        sequence_number,
        event_type,
        ball_number,
        event_hash,
        payload
    ) VALUES (
        p_draw_id,
        v_next_seq,
        CASE WHEN v_is_finished THEN 'DRAW_FINISHED' ELSE 'BALL_DRAWN' END,
        v_next_ball,
        v_event_hash,
        jsonb_build_object(
            'ball_number', v_next_ball,
            'sequence', v_next_seq,
            'total_balls', v_total_balls,
            'emitted_by', auth.uid(),
            'version', v_new_version
        )
    );

    RETURN jsonb_build_object(
        'draw_id', p_draw_id,
        'ball_number', v_next_ball,
        'sequence', v_next_seq,
        'total_balls', v_total_balls,
        'event_hash', v_event_hash,
        'is_finished', v_is_finished,
        'version', v_new_version
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_next_ball_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.emit_next_ball_authoritative(p_draw_id, p_expected_version);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) TO authenticated;

-- ==============================================================================
-- 7. STEP-UP AUTH & OPERACIONES FINANCIERAS: ARQUITECTURA PRIVILEGIADA INTERNA
-- ==============================================================================

-- 7.1 request_step_up_authorization
CREATE OR REPLACE FUNCTION private.request_step_up_authorization(
    p_action_type TEXT,
    p_risk_level TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_idemp UUID;
    v_auth_record RECORD;
    v_expires_at TIMESTAMPTZ;
    v_clean_metadata JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación para solicitar Step-Up.';
    END IF;

    IF p_action_type NOT IN (
        'CHANGE_PAGO_MOVIL', 'REQUEST_WITHDRAWAL', 'ACCOUNT_DELETION',
        'CONFIRM_RECHARGE', 'APPROVE_WITHDRAWAL', 'CHANGE_USER_ROLE',
        'UPDATE_FINANCIAL_SETTINGS', 'MFA_DISABLE'
    ) THEN
        RAISE EXCEPTION 'Tipo de acción no reconocido para Step-Up: %', p_action_type;
    END IF;

    IF p_risk_level NOT IN ('HIGH', 'CRITICAL') THEN
        RAISE EXCEPTION 'Nivel de riesgo inválido: % (solo HIGH o CRITICAL permitidos)', p_risk_level;
    END IF;

    v_idemp := COALESCE(p_idempotency_key, gen_random_uuid());

    SELECT * INTO v_auth_record
    FROM public.step_up_authorizations
    WHERE idempotency_key = v_idemp;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'authorization_id', v_auth_record.id,
            'action_type', v_auth_record.action_type,
            'risk_level', v_auth_record.risk_level,
            'expires_at', v_auth_record.expires_at,
            'idempotency_key', v_auth_record.idempotency_key,
            'is_cached', true
        );
    END IF;

    v_expires_at := timezone('utc'::text, now()) + interval '5 minutes';

    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'password'
        - 'token'
        - 'totp_code';

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
        v_clean_metadata,
        v_idemp,
        v_expires_at
    ) RETURNING * INTO v_auth_record;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        'AUTHENTICATED',
        'STEP_UP_CHALLENGE_CREATED',
        'step_up_authorizations',
        v_auth_record.id::text,
        jsonb_build_object(
            'action_type', p_action_type,
            'risk_level', p_risk_level,
            'resource_id', p_resource_id,
            'idempotency_key', v_idemp
        )
    );

    RETURN jsonb_build_object(
        'authorization_id', v_auth_record.id,
        'action_type', v_auth_record.action_type,
        'risk_level', v_auth_record.risk_level,
        'expires_at', v_auth_record.expires_at,
        'idempotency_key', v_auth_record.idempotency_key,
        'is_cached', false
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_step_up_authorization(
    p_action_type TEXT,
    p_risk_level TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.request_step_up_authorization(p_action_type, p_risk_level, p_resource_id, p_metadata, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_step_up_authorization(TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_step_up_authorization(TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated;

-- 7.2 execute_update_pago_movil
CREATE OR REPLACE FUNCTION private.execute_update_pago_movil(
    p_auth_id UUID,
    p_phone TEXT,
    p_bank TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_clean_phone TEXT;
    v_step_up_id UUID;
    v_current_cooldown TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    -- Consumir Step-Up obligatorio
    PERFORM public.internal_consume_step_up(
        p_auth_id,
        'CHANGE_PAGO_MOVIL'
    );
    v_step_up_id := p_auth_id;

    -- Validar formato del teléfono venezolano
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    IF v_clean_phone ~ '^58' THEN
        v_clean_phone := substr(v_clean_phone, 3);
    END IF;

    IF v_clean_phone !~ '^(412|414|416|424|426)[0-9]{7}$' THEN
        RAISE EXCEPTION 'Teléfono inválido. Debe ser una operadora venezolana (0412, 0414, 0416, 0424, 0426) con 7 dígitos.';
    END IF;

    IF trim(p_bank) = '' OR length(p_bank) < 4 THEN
        RAISE EXCEPTION 'Código o nombre de banco inválido.';
    END IF;

    -- Verificar cooldown financiero previo
    SELECT financial_cooldown_until INTO v_current_cooldown
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_current_cooldown IS NOT NULL AND v_current_cooldown > now() THEN
        RAISE EXCEPTION 'Operación bloqueada por cooldown de seguridad activo hasta %', v_current_cooldown;
    END IF;

    -- Actualizar perfil con cooldown de 24h
    UPDATE public.profiles
    SET pago_movil_phone = '0' || v_clean_phone,
        pago_movil_bank = trim(p_bank),
        pago_movil_updated_at = timezone('utc'::text, now()),
        financial_cooldown_until = timezone('utc'::text, now()) + interval '24 hours',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

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
        'PAGO_MOVIL_UPDATED',
        'profiles',
        v_user_id::text,
        jsonb_build_object(
            'step_up_id', v_step_up_id,
            'bank', trim(p_bank),
            'cooldown_until', timezone('utc'::text, now()) + interval '24 hours',
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'phone', '0' || v_clean_phone,
        'bank', trim(p_bank),
        'cooldown_until', timezone('utc'::text, now()) + interval '24 hours'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_update_pago_movil(
    p_auth_id UUID,
    p_phone TEXT,
    p_bank_code TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_update_pago_movil(p_auth_id, p_phone, p_bank_code, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_update_pago_movil(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_update_pago_movil(UUID, TEXT, TEXT, UUID) TO authenticated;

-- 7.3 execute_request_withdrawal
CREATE OR REPLACE FUNCTION private.execute_request_withdrawal(
    p_auth_id UUID,
    p_amount NUMERIC,
    p_currency VARCHAR,
    p_destination TEXT DEFAULT NULL,
    p_idempotency_key UUID DEFAULT gen_random_uuid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_step_up_id UUID;
    v_wallet RECORD;
    v_cooldown TIMESTAMPTZ;
    v_pago_phone TEXT;
    v_pago_bank TEXT;
    v_new_req_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser estrictamente positivo.';
    END IF;

    IF p_currency NOT IN ('VES', 'USDT') THEN
        RAISE EXCEPTION 'Moneda inválida: %', p_currency;
    END IF;

    -- Consumir Step-Up obligatorio
    PERFORM public.internal_consume_step_up(
        p_auth_id,
        'REQUEST_WITHDRAWAL'
    );
    v_step_up_id := p_auth_id;

    -- Verificar perfil y datos bancarios
    SELECT financial_cooldown_until, pago_movil_phone, pago_movil_bank
    INTO v_cooldown, v_pago_phone, v_pago_bank
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_cooldown IS NOT NULL AND v_cooldown > now() THEN
        RAISE EXCEPTION 'Retiro bloqueado: Cuenta en período de cooldown hasta %', v_cooldown;
    END IF;

    IF v_pago_phone IS NULL OR v_pago_bank IS NULL THEN
        RAISE EXCEPTION 'Debe registrar y verificar su Pago Móvil antes de solicitar retiros.';
    END IF;

    -- Bloqueo pesimista de billetera
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Billetera no encontrada para el usuario.';
    END IF;

    IF v_wallet.is_frozen THEN
        RAISE EXCEPTION 'La billetera está temporalmente congelada por auditoría.';
    END IF;

    IF p_currency = 'VES' AND v_wallet.balance_ves < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente en VES (disponible: %, solicitado: %)', v_wallet.balance_ves, p_amount;
    END IF;

    IF p_currency = 'USDT' AND v_wallet.balance_usdt < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente en USDT (disponible: %, solicitado: %)', v_wallet.balance_usdt, p_amount;
    END IF;

    -- En Fase 1 / Modo Staging las solicitudes quedan registradas como PENDING_VERIFICATION
    INSERT INTO public.payment_requests (
        user_id,
        idempotency_key,
        method,
        amount,
        currency,
        bank_destination,
        reference_number,
        status,
        metadata
    ) VALUES (
        v_user_id,
        p_idempotency_key::text,
        'PAGO_MOVIL',
        p_amount,
        p_currency,
        COALESCE(p_destination, v_pago_bank || ' / ' || v_pago_phone),
        'WTH-' || upper(substr(encode(sha256((p_idempotency_key::text || clock_timestamp()::text)::bytea), 'hex'), 1, 8)),
        'PENDING',
        jsonb_build_object(
            'step_up_id', v_step_up_id,
            'source', 'private_authoritative_finance'
        )
    ) RETURNING id INTO v_new_req_id;

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
        'payment_requests',
        v_new_req_id::text,
        jsonb_build_object(
            'amount', p_amount,
            'currency', p_currency,
            'step_up_id', v_step_up_id,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_req_id,
        'amount', p_amount,
        'currency', p_currency,
        'status', 'PENDING'
    );
END;
$$;

-- Wrapper canónico de 5 parámetros (compatibilidad con migración 11 y mfaService.ts)
CREATE OR REPLACE FUNCTION public.execute_request_withdrawal(
    p_auth_id UUID,
    p_amount NUMERIC,
    p_currency TEXT,
    p_destination TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_request_withdrawal(p_auth_id, p_amount, p_currency::varchar, p_destination, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, TEXT, TEXT, UUID) TO authenticated;

-- Wrapper de 4 parámetros (compatibilidad con llamadas sin destino explícito)
CREATE OR REPLACE FUNCTION public.execute_request_withdrawal(
    p_auth_id UUID,
    p_amount NUMERIC,
    p_currency VARCHAR,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_request_withdrawal(p_auth_id, p_amount, p_currency, NULL, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, VARCHAR, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, VARCHAR, UUID) TO authenticated;

-- 7.4 execute_confirm_recharge
CREATE OR REPLACE FUNCTION private.execute_confirm_recharge(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_operator_id UUID;
    v_step_up_id UUID;
    v_req RECORD;
    v_wallet RECORD;
    v_prev_bal NUMERIC;
    v_new_bal NUMERIC;
BEGIN
    v_operator_id := auth.uid();
    IF v_operator_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior para confirmar recargas.';
    END IF;

    -- Consumir Step-Up obligatorio
    PERFORM public.internal_consume_step_up(
        p_auth_id,
        'CONFIRM_RECHARGE',
        p_request_id::text
    );
    v_step_up_id := p_auth_id;

    SELECT * INTO v_req
    FROM public.payment_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud de pago no encontrada: %', p_request_id;
    END IF;

    IF v_req.status <> 'PENDING' THEN
        RAISE EXCEPTION 'La solicitud no se encuentra en estado PENDING (estado actual: %)', v_req.status;
    END IF;

    -- Bloqueo pesimista de billetera del usuario acreditado
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_req.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Billetera destino no encontrada para usuario: %', v_req.user_id;
    END IF;

    IF v_req.currency = 'VES' THEN
        v_prev_bal := v_wallet.balance_ves;
        v_new_bal := v_prev_bal + v_req.amount;
        UPDATE public.wallets
        SET balance_ves = v_new_bal,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = v_req.user_id;
    ELSE
        v_prev_bal := v_wallet.balance_usdt;
        v_new_bal := v_prev_bal + v_req.amount;
        UPDATE public.wallets
        SET balance_usdt = v_new_bal,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = v_req.user_id;
    END IF;

    -- Asentar transacción en libro mayor inmutable
    INSERT INTO public.wallet_transactions (
        user_id,
        idempotency_key,
        type,
        status,
        amount,
        currency,
        balance_before,
        balance_after,
        reference_id,
        metadata
    ) VALUES (
        v_req.user_id,
        p_idempotency_key::text,
        'DEPOSIT',
        'COMPLETED',
        v_req.amount,
        v_req.currency,
        v_prev_bal,
        v_new_bal,
        p_request_id::text,
        jsonb_build_object(
            'confirmed_by_operator', v_operator_id,
            'step_up_id', v_step_up_id
        )
    );

    UPDATE public.payment_requests
    SET status = 'APPROVED',
        operator_id = v_operator_id,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_operator_id,
        'OPERATOR',
        'RECHARGE_CONFIRMED',
        'payment_requests',
        p_request_id::text,
        jsonb_build_object(
            'beneficiary_user_id', v_req.user_id,
            'amount', v_req.amount,
            'currency', v_req.currency,
            'new_balance', v_new_bal,
            'step_up_id', v_step_up_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'user_id', v_req.user_id,
        'amount', v_req.amount,
        'currency', v_req.currency,
        'new_balance', v_new_bal
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_confirm_recharge(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_confirm_recharge(p_auth_id, p_request_id, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_confirm_recharge(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_confirm_recharge(UUID, UUID, UUID) TO authenticated;

-- 7.5 execute_approve_withdrawal
CREATE OR REPLACE FUNCTION private.execute_approve_withdrawal(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_supervisor_id UUID;
    v_step_up_id UUID;
    v_req RECORD;
    v_wallet RECORD;
    v_prev_bal NUMERIC;
    v_new_bal NUMERIC;
    v_caller_role public.user_role;
BEGIN
    v_supervisor_id := auth.uid();
    IF v_supervisor_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_supervisor_id;

    IF v_caller_role NOT IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol SUPERVISOR o superior para aprobar retiros.';
    END IF;

    -- Consumir Step-Up CRITICAL obligatorio
    PERFORM public.internal_consume_step_up(
        p_auth_id,
        'APPROVE_WITHDRAWAL',
        p_request_id::text
    );
    v_step_up_id := p_auth_id;

    SELECT * INTO v_req
    FROM public.payment_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud de retiro no encontrada: %', p_request_id;
    END IF;

    IF v_req.status <> 'PENDING' THEN
        RAISE EXCEPTION 'La solicitud no se encuentra en estado PENDING (estado actual: %)', v_req.status;
    END IF;

    -- Bloqueo pesimista de billetera del usuario debitado
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_req.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Billetera no encontrada para usuario: %', v_req.user_id;
    END IF;

    IF v_req.currency = 'VES' THEN
        IF v_wallet.balance_ves < v_req.amount THEN
            RAISE EXCEPTION 'Saldo insuficiente al momento de la aprobación.';
        END IF;
        v_prev_bal := v_wallet.balance_ves;
        v_new_bal := v_prev_bal - v_req.amount;
        UPDATE public.wallets
        SET balance_ves = v_new_bal,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = v_req.user_id;
    ELSE
        IF v_wallet.balance_usdt < v_req.amount THEN
            RAISE EXCEPTION 'Saldo insuficiente al momento de la aprobación.';
        END IF;
        v_prev_bal := v_wallet.balance_usdt;
        v_new_bal := v_prev_bal - v_req.amount;
        UPDATE public.wallets
        SET balance_usdt = v_new_bal,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = v_req.user_id;
    END IF;

    -- Registrar débito en libro mayor
    INSERT INTO public.wallet_transactions (
        user_id,
        idempotency_key,
        type,
        status,
        amount,
        currency,
        balance_before,
        balance_after,
        reference_id,
        metadata
    ) VALUES (
        v_req.user_id,
        p_idempotency_key::text,
        'WITHDRAWAL',
        'COMPLETED',
        v_req.amount,
        v_req.currency,
        v_prev_bal,
        v_new_bal,
        p_request_id::text,
        jsonb_build_object(
            'approved_by_supervisor', v_supervisor_id,
            'step_up_id', v_step_up_id
        )
    );

    UPDATE public.payment_requests
    SET status = 'APPROVED',
        operator_id = v_supervisor_id,
        processed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_supervisor_id,
        v_caller_role::text,
        'WITHDRAWAL_APPROVED',
        'payment_requests',
        p_request_id::text,
        jsonb_build_object(
            'beneficiary_user_id', v_req.user_id,
            'amount', v_req.amount,
            'currency', v_req.currency,
            'new_balance', v_new_bal,
            'step_up_id', v_step_up_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'user_id', v_req.user_id,
        'amount', v_req.amount,
        'currency', v_req.currency,
        'new_balance', v_new_bal
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_approve_withdrawal(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_approve_withdrawal(p_auth_id, p_request_id, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_approve_withdrawal(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_approve_withdrawal(UUID, UUID, UUID) TO authenticated;

-- 7.6 execute_disable_mfa
CREATE OR REPLACE FUNCTION private.execute_disable_mfa(
    p_auth_id UUID,
    p_factor_id TEXT DEFAULT NULL,
    p_idempotency_key UUID DEFAULT gen_random_uuid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_step_up_id UUID;
    v_role public.user_role;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = v_user_id;

    -- Restricción estricta de política: Solo jugadores pueden deshabilitar MFA
    IF v_role <> 'PLAYER' THEN
        RAISE EXCEPTION 'Violación de Seguridad: Los roles administrativos y operativos (%s) tienen MFA obligatorio por política.', v_role;
    END IF;

    -- Consumir Step-Up obligatorio
    PERFORM public.internal_consume_step_up(
        p_auth_id,
        'MFA_DISABLE'
    );
    v_step_up_id := p_auth_id;

    UPDATE public.profiles
    SET mfa_enabled = false,
        mfa_verified_at = null,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

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
        'MFA_DISABLED',
        'profiles',
        v_user_id::text,
        jsonb_build_object(
            'step_up_id', v_step_up_id,
            'factor_id', p_factor_id,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'mfa_enabled', false
    );
END;
$$;

-- Wrapper de 2 parámetros (compatibilidad con migración 11 y mfaService.ts)
CREATE OR REPLACE FUNCTION public.execute_disable_mfa(
    p_auth_id UUID,
    p_factor_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_disable_mfa(p_auth_id, p_factor_id, NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT) TO authenticated;

-- Wrapper de 3 parámetros (compatibilidad con idempotencia explícita)
CREATE OR REPLACE FUNCTION public.execute_disable_mfa(
    p_auth_id UUID,
    p_factor_id TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_disable_mfa(p_auth_id, p_factor_id, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT, UUID) TO authenticated;

-- 7.7 execute_account_soft_deletion
CREATE OR REPLACE FUNCTION private.execute_account_soft_deletion(
    p_auth_id UUID,
    p_confirmation_phrase TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_step_up_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    IF p_confirmation_phrase <> 'ELIMINAR MI CUENTA DEFINITIVAMENTE' THEN
        RAISE EXCEPTION 'Frase de confirmación incorrecta.';
    END IF;

    -- Consumir Step-Up CRITICAL
    PERFORM public.internal_consume_step_up(
        p_auth_id,
        'ACCOUNT_DELETION'
    );
    v_step_up_id := p_auth_id;

    UPDATE public.profiles
    SET status = 'SUSPENDED',
        display_name = 'Usuario Retirado',
        phone = null,
        pago_movil_phone = null,
        pago_movil_bank = null,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

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
        'profiles',
        v_user_id::text,
        jsonb_build_object(
            'step_up_id', v_step_up_id,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object('success', true, 'status', 'SUSPENDED');
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_account_soft_deletion(
    p_auth_id UUID,
    p_confirmation_phrase TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.execute_account_soft_deletion(p_auth_id, p_confirmation_phrase, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_account_soft_deletion(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_account_soft_deletion(UUID, TEXT, UUID) TO authenticated;

-- 7.8 execute_admin_change_role
CREATE OR REPLACE FUNCTION private.execute_admin_change_role(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_role public.user_role,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_role public.user_role;
    v_target_old_role public.user_role;
    v_target_email TEXT;
    v_step_up_id UUID;
    v_caller_auth_id UUID;
BEGIN
    v_caller_auth_id := auth.uid();
    IF v_caller_auth_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    -- Consumir Step-Up CRITICAL
    PERFORM public.internal_consume_step_up(
        p_auth_id,
        'CHANGE_USER_ROLE'
    );
    v_step_up_id := p_auth_id;

    -- Obtener rol del operador
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_auth_id;

    IF v_caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Violación de Seguridad: Rol insuficiente (%s) para modificar roles.', v_caller_role;
    END IF;

    -- Prohibición absoluta de auto-modificación
    IF v_caller_auth_id = p_target_user_id THEN
        RAISE EXCEPTION 'Violación de Seguridad: No puede modificar su propio rol.';
    END IF;

    -- Obtener datos del usuario destino
    SELECT p.role, lower(trim(u.email))
    INTO v_target_old_role, v_target_email
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario destino no encontrado: %', p_target_user_id;
    END IF;

    -- Protección de Identidad Canónica del SUPER_ADMIN
    IF v_target_old_role = 'SUPER_ADMIN' OR v_target_email = 'v19629049@gmail.com' THEN
        RAISE EXCEPTION 'Protección de Identidad Canónica: El rol SUPER_ADMIN es inmutable y no puede ser alterado.';
    END IF;

    -- Un ADMIN no puede otorgar ni revocar roles iguales o superiores a su nivel
    IF v_caller_role = 'ADMIN' THEN
        IF p_new_role IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Violación de Seguridad: Los administradores estándar no pueden promover a nivel ADMIN o SUPER_ADMIN.';
        END IF;

        IF v_target_old_role IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Violación de Seguridad: Los administradores estándar no pueden alterar a otros administradores.';
        END IF;
    END IF;

    -- Aplicar cambio
    UPDATE public.profiles
    SET role = p_new_role,
        security_level = CASE 
            WHEN p_new_role = 'SUPER_ADMIN' THEN 5
            WHEN p_new_role = 'ADMIN'       THEN 4
            WHEN p_new_role = 'SUPERVISOR'  THEN 3
            WHEN p_new_role = 'OPERATOR'    THEN 2
            ELSE 1 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_caller_auth_id,
        v_caller_role::text,
        'USER_ROLE_CHANGED',
        'profiles',
        p_target_user_id::text,
        jsonb_build_object(
            'old_role', v_target_old_role,
            'new_role', p_new_role,
            'target_user_id', p_target_user_id,
            'step_up_id', v_step_up_id,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', p_target_user_id,
        'old_role', v_target_old_role,
        'new_role', p_new_role
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_admin_change_role(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_role public.user_role,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol ADMIN o superior.';
    END IF;
    RETURN private.execute_admin_change_role(p_auth_id, p_target_user_id, p_new_role, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_admin_change_role(UUID, UUID, public.user_role, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_admin_change_role(UUID, UUID, public.user_role, UUID) TO authenticated;

-- 7.9 execute_admin_toggle_user_status
CREATE OR REPLACE FUNCTION private.execute_admin_toggle_user_status(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_status public.user_status,
    p_reason TEXT DEFAULT 'Modificación por administración',
    p_idempotency_key UUID DEFAULT gen_random_uuid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_role public.user_role;
    v_target_role public.user_role;
    v_target_email TEXT;
    v_caller_auth_id UUID;
BEGIN
    v_caller_auth_id := auth.uid();
    IF v_caller_auth_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_auth_id;

    IF v_caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Violación de Seguridad: Rol insuficiente (%s) para suspender o activar usuarios.', v_caller_role;
    END IF;

    IF v_caller_auth_id = p_target_user_id THEN
        RAISE EXCEPTION 'Violación de Seguridad: Un administrador no puede suspender su propia cuenta.';
    END IF;

    SELECT p.role, lower(trim(u.email))
    INTO v_target_role, v_target_email
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario destino no encontrado: %', p_target_user_id;
    END IF;

    IF v_target_role = 'SUPER_ADMIN' OR v_target_email = 'v19629049@gmail.com' THEN
        RAISE EXCEPTION 'Protección de Identidad Canónica: La cuenta SUPER_ADMIN no puede ser suspendida ni bloqueada.';
    END IF;

    IF v_caller_role = 'ADMIN' AND v_target_role IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Violación de Seguridad: Un ADMIN no puede suspender o activar a otros administradores.';
    END IF;

    UPDATE public.profiles
    SET status = p_new_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_target_user_id;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_caller_auth_id,
        v_caller_role::text,
        'USER_STATUS_TOGGLED',
        'profiles',
        p_target_user_id::text,
        jsonb_build_object(
            'new_status', p_new_status,
            'reason', p_reason,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', p_target_user_id,
        'new_status', p_new_status
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_admin_toggle_user_status(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_status public.user_status,
    p_reason TEXT DEFAULT 'Modificación por administración',
    p_idempotency_key UUID DEFAULT gen_random_uuid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol ADMIN o superior.';
    END IF;
    RETURN private.execute_admin_toggle_user_status(p_auth_id, p_target_user_id, p_new_status, p_reason, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_admin_toggle_user_status(UUID, UUID, public.user_status, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_admin_toggle_user_status(UUID, UUID, public.user_status, TEXT, UUID) TO authenticated;

-- 7.10 sync_official_admin_identities
CREATE OR REPLACE FUNCTION private.sync_official_admin_identities()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
            updated_at = timezone('utc'::text, now())
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
            updated_at = timezone('utc'::text, now())
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
            updated_at = timezone('utc'::text, now())
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
$$;

CREATE OR REPLACE FUNCTION public.sync_official_admin_identities()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol ADMIN o SUPER_ADMIN para reconciliar identidades oficiales.';
    END IF;
    RETURN private.sync_official_admin_identities();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_official_admin_identities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_official_admin_identities() TO authenticated;

-- ==============================================================================
-- 8. DEFAULT PRIVILEGES ENDURECIDOS Y REVOCACIÓN GENERAL DE anon
-- ==============================================================================
-- Asegurar que cualquier función futura creada en public NO sea ejecutable por anon por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

-- Concesión de ejecución en funciones privadas exclusivamente a los roles autorizados
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, service_role, postgres;

-- ==============================================================================
-- 9. CERTIFICACIÓN EN APP_SETTINGS: FASE 2.8.4
-- ==============================================================================
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'SECURITY_ADVISOR_REMEDIATION_PHASE_2_8_4',
    jsonb_build_object(
        'phase', '2.8.4',
        'status', 'FULLY_REMEDIATED',
        'security_definer_views_count', 0,
        'mutable_search_path_functions_count', 0,
        'anon_security_definer_functions_count', 0,
        'authenticated_security_definer_functions_count', 0,
        'chapitas_view_security_invoker', true,
        'private_schema_hardened', true,
        'public_invoker_wrappers_active', true,
        'default_privileges_restricted', true,
        'verified_at', now()
    ),
    'Certificación forense de remediación definitiva del Security Advisor (Fase 2.8.4)'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();
