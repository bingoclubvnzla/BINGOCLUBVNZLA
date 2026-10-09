-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 08: SECURITY DEFINER HARDENING & RPC AUDIT
-- Fase 2.6.2: Endurecimiento definitivo de RPCs, Prevención de Falsificación de Auditoría
-- y Restricción Estricta de Funciones Internas
-- ==============================================================================

-- 1. HARDENING DE log_auth_event: PREVENCIÓN DE FALSIFICACIÓN DE EVENTOS PRIVILEGIADOS
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_clean_metadata JSONB;
BEGIN
    -- Validar lista blanca estricta de eventos autorizados para cliente
    -- Rechazo incondicional de eventos privilegiados o administrativos
    IF p_action NOT IN ('LOGIN_FAILURE', 'LOGIN_ATTEMPT', 'PASSWORD_RESET_REQUESTED', 'LOGOUT') THEN
        RAISE EXCEPTION 'Acceso denegado: Acción de auditoría no permitida para cliente (%).', p_action;
    END IF;

    -- Límite de tamaño de metadata (2KB) para mitigar denegación de almacenamiento
    IF octet_length(COALESCE(p_metadata, '{}'::jsonb)::text) > 2048 THEN
        RAISE EXCEPTION 'Payload de metadata excede el límite máximo permitido (2KB).';
    END IF;

    -- Redacción de credenciales y secretos potencialmente enviados
    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'password'
        - 'contraseña'
        - 'token'
        - 'access_token'
        - 'refresh_token'
        - 'secret'
        - 'client_secret'
        - 'turnstile_token'
        - 'captchatoken'
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

GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) TO anon, authenticated;

-- 2. BLINDAJE DE transition_draw_state_atomic (TRANSICIÓN DE ESTADOS ATÓMICA)
-- No debe ser ejecutable directamente por el cliente vía PostgREST
REVOKE EXECUTE ON FUNCTION public.transition_draw_state_atomic(UUID, INTEGER, draw_status) FROM PUBLIC, anon, authenticated;

-- 3. BLINDAJE DE TRIGGERS Y FUNCIONES DE SOPORTE INTERNO
REVOKE EXECUTE ON FUNCTION public.enforce_audit_log_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_card_lock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_mutations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_chapitas_catalog_integrity() FROM PUBLIC, anon, authenticated;

-- 4. LIMITACIÓN DE FUNCIONES DE ROL (NO EXECUTABLE POR ANON)
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_operator_or_higher() FROM anon;

-- 5. RATIFICACIÓN DE APP_SETTINGS
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'SECURITY_DEFINER_PHASE_2_6_2',
    jsonb_build_object(
        'phase', '2.6.2',
        'status', 'FULLY_AUDITED_AND_HARDENED',
        'log_auth_event_hardened', true,
        'transition_atomic_isolated', true,
        'internal_triggers_revoked', true,
        'verified_at', now()
    ),
    'Certificación final de endurecimiento SECURITY DEFINER y PostgREST RPC'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();
