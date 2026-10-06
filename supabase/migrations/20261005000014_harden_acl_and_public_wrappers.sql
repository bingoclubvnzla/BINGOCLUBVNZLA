-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN CORRECTIVA FASE FINAL (ACL & WRAPPERS)
-- 20261005000014_harden_acl_and_public_wrappers.sql
-- 
-- 1. HARDENING ACL SCHEMA private:
--    - SCHEMA: Solo USAGE para postgres y service_role. REVOKE de PUBLIC, anon, authenticated.
--    - FUNCTIONS: Solo EXECUTE para postgres y service_role. REVOKE de PUBLIC, anon, authenticated.
-- 
-- 2. WRAPPERS PÚBLICOS SECURITY DEFINER:
--    - Todos los wrappers en public que delegan a private son SECURITY DEFINER con
--      SET search_path = public, extensions, pg_temp.
--    - Control estricto de RBAC interno (is_operator_or_higher, is_admin, auth.uid()).
--    - Concedidos a authenticated, service_role, postgres. Revocados de anon y PUBLIC.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SECCIÓN 1: ACL ESTRICTO Y SEGREGADO PARA SCHEMA private
-- ------------------------------------------------------------------------------
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

GRANT USAGE ON SCHEMA private TO service_role, postgres;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 2: WRAPPERS DE AUDITORÍA Y EVENTOS
-- ------------------------------------------------------------------------------

-- 2.1 log_auth_event
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere sesión autenticada.';
    END IF;
    RETURN private.log_auth_event(p_action, p_metadata);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) TO authenticated, service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 3: WRAPPERS DE MOTOR DE SORTEOS (DRAW ENGINE)
-- ------------------------------------------------------------------------------

-- 3.1 start_draw_authoritative
CREATE OR REPLACE FUNCTION public.start_draw_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.start_draw_authoritative(p_draw_id, p_expected_version);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) TO authenticated, service_role, postgres;

-- 3.2 emit_next_ball_authoritative
CREATE OR REPLACE FUNCTION public.emit_next_ball_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.emit_next_ball_authoritative(p_draw_id, p_expected_version);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) TO authenticated, service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 4: WRAPPERS DE STEP-UP AUTH Y FINANZAS
-- ------------------------------------------------------------------------------

-- 4.1 request_step_up_authorization
CREATE OR REPLACE FUNCTION public.request_step_up_authorization(
    p_action_type TEXT,
    p_risk_level TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.request_step_up_authorization(p_action_type, p_risk_level, p_resource_id, p_metadata, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_step_up_authorization(TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_step_up_authorization(TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated, service_role, postgres;

-- 4.2 execute_update_pago_movil
CREATE OR REPLACE FUNCTION public.execute_update_pago_movil(
    p_auth_id UUID,
    p_phone TEXT,
    p_bank_code TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.execute_update_pago_movil(p_auth_id, p_phone, p_bank_code, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_update_pago_movil(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_update_pago_movil(UUID, TEXT, TEXT, UUID) TO authenticated, service_role, postgres;

-- 4.3 execute_request_withdrawal (5 parámetros)
CREATE OR REPLACE FUNCTION public.execute_request_withdrawal(
    p_auth_id UUID,
    p_amount NUMERIC,
    p_currency TEXT,
    p_destination TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.execute_request_withdrawal(p_auth_id, p_amount, p_currency::varchar, p_destination, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, TEXT, TEXT, UUID) TO authenticated, service_role, postgres;

-- 4.4 execute_request_withdrawal (4 parámetros)
CREATE OR REPLACE FUNCTION public.execute_request_withdrawal(
    p_auth_id UUID,
    p_amount NUMERIC,
    p_currency VARCHAR,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.execute_request_withdrawal(p_auth_id, p_amount, p_currency, NULL, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, VARCHAR, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_request_withdrawal(UUID, NUMERIC, VARCHAR, UUID) TO authenticated, service_role, postgres;

-- 4.5 execute_confirm_recharge
CREATE OR REPLACE FUNCTION public.execute_confirm_recharge(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.execute_confirm_recharge(p_auth_id, p_request_id, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_confirm_recharge(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_confirm_recharge(UUID, UUID, UUID) TO authenticated, service_role, postgres;

-- 4.6 execute_approve_withdrawal
CREATE OR REPLACE FUNCTION public.execute_approve_withdrawal(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.execute_approve_withdrawal(p_auth_id, p_request_id, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_approve_withdrawal(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_approve_withdrawal(UUID, UUID, UUID) TO authenticated, service_role, postgres;

-- 4.7 execute_disable_mfa (2 parámetros)
CREATE OR REPLACE FUNCTION public.execute_disable_mfa(
    p_auth_id UUID,
    p_factor_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.execute_disable_mfa(p_auth_id, p_factor_id, NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT) TO authenticated, service_role, postgres;

-- 4.8 execute_disable_mfa (3 parámetros)
CREATE OR REPLACE FUNCTION public.execute_disable_mfa(
    p_auth_id UUID,
    p_factor_id TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.execute_disable_mfa(p_auth_id, p_factor_id, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_disable_mfa(UUID, TEXT, UUID) TO authenticated, service_role, postgres;

-- 4.9 execute_account_soft_deletion
CREATE OR REPLACE FUNCTION public.execute_account_soft_deletion(
    p_auth_id UUID,
    p_confirmation_phrase TEXT,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.execute_account_soft_deletion(p_auth_id, p_confirmation_phrase, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_account_soft_deletion(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_account_soft_deletion(UUID, TEXT, UUID) TO authenticated, service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 5: WRAPPERS DE ADMINISTRACIÓN Y CONTROL DE ACCESO (ADMIN / SUPER_ADMIN)
-- ------------------------------------------------------------------------------

-- 5.1 execute_admin_change_role
CREATE OR REPLACE FUNCTION public.execute_admin_change_role(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_role public.user_role,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol ADMIN o superior.';
    END IF;
    RETURN private.execute_admin_change_role(p_auth_id, p_target_user_id, p_new_role, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_admin_change_role(UUID, UUID, public.user_role, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_admin_change_role(UUID, UUID, public.user_role, UUID) TO authenticated, service_role, postgres;

-- 5.2 execute_admin_toggle_user_status
CREATE OR REPLACE FUNCTION public.execute_admin_toggle_user_status(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_status public.user_status,
    p_reason TEXT DEFAULT 'Modificación por administración',
    p_idempotency_key UUID DEFAULT gen_random_uuid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol ADMIN o superior.';
    END IF;
    RETURN private.execute_admin_toggle_user_status(p_auth_id, p_target_user_id, p_new_status, p_reason, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_admin_toggle_user_status(UUID, UUID, public.user_status, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_admin_toggle_user_status(UUID, UUID, public.user_status, TEXT, UUID) TO authenticated, service_role, postgres;

-- 5.3 sync_official_admin_identities
CREATE OR REPLACE FUNCTION public.sync_official_admin_identities()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol ADMIN o SUPER_ADMIN para reconciliar identidades oficiales.';
    END IF;
    RETURN private.sync_official_admin_identities();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_official_admin_identities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_official_admin_identities() TO authenticated, service_role, postgres;
