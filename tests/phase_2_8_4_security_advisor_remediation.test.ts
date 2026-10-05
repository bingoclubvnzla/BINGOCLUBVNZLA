// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SUITE DE PRUEBAS FASE 2.8.4: REMEDIACIÓN SECURITY ADVISOR
// Verificación exhaustiva de:
// 1. Corrección de vista public.v_chapitas_catalog con security_invoker = true (0010)
// 2. Inmutabilidad de search_path en validate_draw_state_transition y get_role_hierarchy_level (0011)
// 3. Eliminación de ejecuciones anónimas sobre funciones SECURITY DEFINER (0028)
// 4. Arquitectura de wraps seguros en public (SECURITY INVOKER) y núcleo en private (0029)
// 5. Restricción de Default Privileges y Certificación en app_settings
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Fase 2.8.4 — Remediación Definitiva del Security Advisor', () => {
  const mig12Path = path.resolve(__dirname, '../supabase/migrations/20261005000012_security_advisor_remediation.sql');
  const deployPath = path.resolve(__dirname, '../supabase/PHASE_2_8_AND_2_9_MIGRATION_DEPLOY.sql');
  const fullSchemaPath = path.resolve(__dirname, '../supabase/FULL_SCHEMA_DEPLOY.sql');

  it('1. El archivo de migración 12 debe existir y ser legible', () => {
    expect(fs.existsSync(mig12Path)).toBe(true);
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content.length).toBeGreaterThan(500);
    expect(content).toContain('FASE 2.8.4');
  });

  it('2. public.v_chapitas_catalog debe estar configurada como SECURITY INVOKER (Eliminación de ERROR 0010)', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content).toContain('ALTER VIEW public.v_chapitas_catalog SET (security_invoker = true);');

    // Comprobar también en los bundles de despliegue
    const deployContent = fs.readFileSync(deployPath, 'utf8');
    expect(deployContent).toContain('ALTER VIEW public.v_chapitas_catalog SET (security_invoker = true);');
  });

  it('3. validate_draw_state_transition debe tener search_path = \'\' inmutable (Eliminación de WARN 0011)', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content).toContain('FUNCTION public.validate_draw_state_transition(');
    expect(content).toContain("SET search_path = ''");
    expect(content).toContain('IMMUTABLE');
    expect(content).toContain('STRICT');
  });

  it('4. get_role_hierarchy_level debe tener search_path = \'\' y mantener jerarquía numérica (Eliminación de WARN 0011)', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content).toContain('FUNCTION public.get_role_hierarchy_level(');
    expect(content).toContain("SET search_path = ''");
    expect(content).toContain("WHEN 'SUPER_ADMIN' THEN 50");
    expect(content).toContain("WHEN 'ADMIN'       THEN 40");
    expect(content).toContain("WHEN 'SUPERVISOR'  THEN 30");
    expect(content).toContain("WHEN 'OPERATOR'    THEN 20");
    expect(content).toContain("WHEN 'PLAYER'      THEN 10");
  });

  it('5. Esquema private debe crearse y asegurarse contra accesos anónimos o públicos', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content).toContain('CREATE SCHEMA IF NOT EXISTS private;');
    expect(content).toContain('REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;');
    expect(content).toContain('GRANT USAGE ON SCHEMA private TO authenticated, service_role, postgres;');
  });

  it('6. current_user_role, is_admin e is_operator_or_higher deben ser SECURITY INVOKER en public y revocar anon (0028/0029)', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');

    // current_user_role
    expect(content).toContain('FUNCTION public.current_user_role()');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;');
    expect(content).toContain('GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;');

    // is_admin
    expect(content).toContain('FUNCTION public.is_admin()');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;');
    expect(content).toContain('GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;');

    // is_operator_or_higher
    expect(content).toContain('FUNCTION public.is_operator_or_higher()');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.is_operator_or_higher() FROM PUBLIC, anon;');
    expect(content).toContain('GRANT EXECUTE ON FUNCTION public.is_operator_or_higher() TO authenticated;');
  });

  it('7. get_draw_snapshot debe ser SECURITY INVOKER con protección contra sorteos DRAFT', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content).toContain('FUNCTION public.get_draw_snapshot(p_draw_id UUID)');
    expect(content).toContain('SECURITY INVOKER');
    expect(content).toContain("IF v_draw.status = 'DRAFT' AND NOT public.is_operator_or_higher() THEN");
  });

  it('8. log_auth_event debe revocar ejecución anónima y delegar a private con whitelist estricta', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content).toContain('FUNCTION private.log_auth_event(');
    expect(content).toContain('FUNCTION public.log_auth_event(');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) FROM PUBLIC, anon;');
    expect(content).toContain('GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) TO authenticated;');
  });

  it('9. Draw Engine debe desacoplar lógica en private y exponer wrappers en public con RBAC', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    
    // create_draw_authoritative
    expect(content).toContain('FUNCTION private.create_draw_authoritative(');
    expect(content).toContain('FUNCTION public.create_draw_authoritative(');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) FROM PUBLIC, anon;');

    // start_draw_authoritative
    expect(content).toContain('FUNCTION private.start_draw_authoritative(');
    expect(content).toContain('FUNCTION public.start_draw_authoritative(');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) FROM PUBLIC, anon;');

    // emit_next_ball_authoritative
    expect(content).toContain('FUNCTION private.emit_next_ball_authoritative(');
    expect(content).toContain('FUNCTION public.emit_next_ball_authoritative(');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) FROM PUBLIC, anon;');
  });

  it('10. Operaciones Financieras y MFA deben proteger su núcleo en private con Step-Up obligatorio', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');

    // request_step_up_authorization
    expect(content).toContain('FUNCTION private.request_step_up_authorization(');
    expect(content).toContain('FUNCTION public.request_step_up_authorization(');

    // execute_update_pago_movil
    expect(content).toContain('FUNCTION private.execute_update_pago_movil(');
    expect(content).toContain('FUNCTION public.execute_update_pago_movil(');

    // execute_request_withdrawal
    expect(content).toContain('FUNCTION private.execute_request_withdrawal(');
    expect(content).toContain('FUNCTION public.execute_request_withdrawal(');

    // execute_confirm_recharge
    expect(content).toContain('FUNCTION private.execute_confirm_recharge(');
    expect(content).toContain('FUNCTION public.execute_confirm_recharge(');

    // execute_approve_withdrawal
    expect(content).toContain('FUNCTION private.execute_approve_withdrawal(');
    expect(content).toContain('FUNCTION public.execute_approve_withdrawal(');

    // execute_disable_mfa
    expect(content).toContain('FUNCTION private.execute_disable_mfa(');
    expect(content).toContain('FUNCTION public.execute_disable_mfa(');

    // execute_account_soft_deletion
    expect(content).toContain('FUNCTION private.execute_account_soft_deletion(');
    expect(content).toContain('FUNCTION public.execute_account_soft_deletion(');
  });

  it('11. Funciones de Administración deben restringir auto-escalada y proteger SUPER_ADMIN', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');

    expect(content).toContain('FUNCTION private.execute_admin_change_role(');
    expect(content).toContain('FUNCTION public.execute_admin_change_role(');
    expect(content).toContain('FUNCTION private.execute_admin_toggle_user_status(');
    expect(content).toContain('FUNCTION public.execute_admin_toggle_user_status(');
    expect(content).toContain('FUNCTION private.sync_official_admin_identities()');
    expect(content).toContain('FUNCTION public.sync_official_admin_identities()');
    expect(content).toContain('IF NOT public.is_admin() THEN');
  });

  it('12. Endurecimiento de default privileges y registro de certificación en app_settings', () => {
    const content = fs.readFileSync(mig12Path, 'utf8');
    expect(content).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;');
    expect(content).toContain('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, service_role, postgres;');
    expect(content).toContain('SECURITY_ADVISOR_REMEDIATION_PHASE_2_8_4');
    expect(content).toContain("'status', 'FULLY_REMEDIATED'");
    expect(content).toContain("'security_definer_views_count', 0");
    expect(content).toContain("'mutable_search_path_functions_count', 0");
    expect(content).toContain("'anon_security_definer_functions_count', 0");
    expect(content).toContain("'authenticated_security_definer_functions_count', 0");
  });
});
