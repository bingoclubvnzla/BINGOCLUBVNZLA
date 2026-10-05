-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 07: REMEDIACIÓN SECURITY DEFINER
-- Fase 2.6.1: Erradicación de rls_auto_enable() y Hardening de Endpoints PostgREST
--
-- Hallazgo resuelto:
-- anon_security_definer_function_executable / authenticated_security_definer_function_executable
-- sobre public.rls_auto_enable()
-- ==============================================================================

-- 1. DESVINCULAR Y ELIMINAR EVENT TRIGGERS VINCULADOS A rls_auto_enable (SI EXISTEN)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT evtname 
        FROM pg_event_trigger 
        WHERE evtfoid = 'public.rls_auto_enable'::regproc
    LOOP
        EXECUTE 'DROP EVENT TRIGGER IF EXISTS ' || quote_ident(r.evtname);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. REVOCAR PRIVILEGIOS Y ELIMINAR TODAS LAS SOBRECARGAS DE public.rls_auto_enable()
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    LOOP
        EXECUTE 'REVOKE ALL ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon, authenticated';
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- 3. ENDURECIMIENTO EXPLÍCITO DE TODAS LAS FUNCIONES INTERNAS SECURITY DEFINER
-- Garantiza que PostgREST/Data API (/rest/v1/rpc/*) no exponga funciones de lógica interna a roles no autorizados

-- 3.1 Generador de ID público (uso exclusivo en trigger handle_new_user)
REVOKE EXECUTE ON FUNCTION public.generate_public_id() FROM PUBLIC, anon, authenticated;

-- 3.2 Protección contra escalada de roles en perfiles (uso exclusivo por trigger)
REVOKE EXECUTE ON FUNCTION public.protect_profile_mutations() FROM PUBLIC, anon, authenticated;

-- 3.3 Validación de máquina de estados del sorteo (uso exclusivo del Draw Engine)
REVOKE EXECUTE ON FUNCTION public.validate_draw_state_transition(draw_status, draw_status) FROM PUBLIC, anon, authenticated;

-- 3.4 Generación de permutaciones aleatorias (uso exclusivo del servidor)
REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

-- 3.5 Validación canónica de integridad de catálogos (uso administrativo / migración)
REVOKE EXECUTE ON FUNCTION public.validate_chapitas_catalog_integrity() FROM PUBLIC, anon;

-- 4. RATIFICACIÓN DE ACTIVACIÓN DE ROW LEVEL SECURITY EN LA TOTALIDAD DE TABLAS PÚBLICAS
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.draw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.card_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.operator_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.modality_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chapitas_mappings ENABLE ROW LEVEL SECURITY;

-- 5. ACTUALIZACIÓN DE ESTADO EN APP_SETTINGS
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'SECURITY_DEFINER_AUDIT',
    jsonb_build_object(
        'phase', '2.6.1',
        'status', 'CERTIFIED_HARDENED',
        'rls_auto_enable_remediated', true,
        'security_definer_rpc_hardened', true,
        'timestamp', now()
    ),
    'Certificación de mitigación de vulnerabilidades SECURITY DEFINER y endurecimiento RPC'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();
