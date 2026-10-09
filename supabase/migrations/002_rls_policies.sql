-- ============================================================================
-- MIGRACIÓN 002 (DEFENSIVA / NO-OP)
-- Las políticas RLS canónicas fueron creadas por:
--   20260101000001_security_and_rls.sql
--   20261005000002_rls_policies.sql
--   20261005000007_remediate_rls_auto_enable.sql
-- ============================================================================

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'profiles','permissions','role_permissions','app_settings',
        'game_modalities','game_rooms','draws','draw_events',
        'cards','card_numbers','prizes','winners','wallets',
        'wallet_transactions','payment_requests','operator_actions','audit_logs'
    ];
    v_t TEXT;
BEGIN
    FOREACH v_t IN ARRAY v_tables LOOP
        IF to_regclass('public.'||v_t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_t);
        END IF;
    END LOOP;
END $$;
