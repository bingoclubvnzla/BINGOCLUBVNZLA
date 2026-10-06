-- =============================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1: FUNDACIÓN
-- Migration: 20260101000003_audit_and_triggers.sql
-- Description: Automated Audit Triggers and Secure Audit Ingestion
-- Author: Bingo Club Vnzla Security Engineering Team
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SECURE CLIENT EVENT AUDIT FUNCTION
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_client_security_event(
    p_action VARCHAR(64),
    p_entity_type VARCHAR(64),
    p_entity_id VARCHAR(64),
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_role public.user_role;
    v_log_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: Debes iniciar sesión para registrar eventos de auditoría.';
    END IF;

    -- Lookup user role
    SELECT COALESCE(role, 'PLAYER'::public.user_role) INTO v_role
    FROM public.profiles
    WHERE user_id = v_user_id;

    -- Strip sensitive keys if accidentally present
    p_metadata := p_metadata - 'password' - 'token' - 'secret' - 'apiKey' - 'key';

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        COALESCE(v_role, 'PLAYER'),
        p_action,
        p_entity_type,
        p_entity_id,
        p_metadata
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. AUTOMATED DATABASE AUDIT TRIGGERS
-- -----------------------------------------------------------------------------

-- Audit draw status modifications
CREATE OR REPLACE FUNCTION public.audit_draw_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_logs (
            user_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            metadata
        ) VALUES (
            auth.uid(),
            COALESCE(public.get_current_user_role(), 'ADMIN'::public.user_role),
            'DRAW_STATUS_CHANGED',
            'draws',
            NEW.id::TEXT,
            jsonb_build_object(
                'draw_number', NEW.draw_number,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_draw_status ON public.draws;
CREATE TRIGGER trg_audit_draw_status
    AFTER UPDATE OF status ON public.draws
    FOR EACH ROW EXECUTE FUNCTION public.audit_draw_status_change();

-- Audit profile role or status modifications
CREATE OR REPLACE FUNCTION public.audit_profile_role_or_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (
            user_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            metadata
        ) VALUES (
            auth.uid(),
            COALESCE(public.get_current_user_role(), 'SUPER_ADMIN'::public.user_role),
            'PROFILE_PRIVILEGE_CHANGED',
            'profiles',
            NEW.id::TEXT,
            jsonb_build_object(
                'target_user_id', NEW.user_id,
                'target_public_code', NEW.public_code,
                'old_role', OLD.role,
                'new_role', NEW.role,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profile_changes ON public.profiles;
CREATE TRIGGER trg_audit_profile_changes
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_profile_role_or_status();
