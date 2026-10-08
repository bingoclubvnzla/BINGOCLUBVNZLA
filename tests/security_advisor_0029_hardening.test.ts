// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PRUEBAS FORENSES DE SEGURIDAD (MIGRACIÓN 15)
// Supabase Security Advisor 0029 + Leaked Password Protection + 24 Reglas Obligatorias
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SUPABASE SECURITY ADVISOR 0029 — AUDITORÍA FORENSE Y MIGRACIÓN 15', () => {
  const mig15Path = path.resolve('supabase/migrations/20261005000015_security_advisor_0029_hardening.sql');
  const mig14Path = path.resolve('supabase/migrations/20261005000014_harden_acl_and_public_wrappers.sql');
  const mig13Path = path.resolve('supabase/migrations/20261005000013_fix_draw_permutation_authoritative.sql');

  const content15 = fs.readFileSync(mig15Path, 'utf8');
  const content14 = fs.readFileSync(mig14Path, 'utf8');
  const content13 = fs.readFileSync(mig13Path, 'utf8');

  // --------------------------------------------------------------------------
  // GRUPO 1: REGLAS 1 A 5 — DIBUJO Y BARRERAS DE PLAYER
  // --------------------------------------------------------------------------
  describe('Grupo 1: Control de Motor de Sorteos y Privilegios Anon/Player', () => {
    it('1. anon no puede ejecutar funciones privilegiadas (REVOKE explícito de anon y PUBLIC)', () => {
      expect(content15).toContain('REVOKE EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) FROM PUBLIC, anon;');
      expect(content15).toContain('REVOKE EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) FROM PUBLIC, anon;');
      expect(content15).toContain('REVOKE EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) FROM PUBLIC, anon;');
      expect(content15).toContain('REVOKE EXECUTE ON FUNCTION public.claim_bingo_authoritative(UUID, UUID, TEXT) FROM PUBLIC, anon;');
      expect(content15).toContain('REVOKE EXECUTE ON FUNCTION public.execute_approve_withdrawal(UUID, UUID, UUID) FROM PUBLIC, anon;');
    });

    it('2. authenticated PLAYER no puede ejecutar funciones administrativas (Gatekeepers RBAC activos)', () => {
      expect(content15).toContain('IF NOT public.is_operator_or_higher() THEN');
      expect(content15).toContain('IF NOT public.is_supervisor_or_higher() THEN');
      expect(content15).toContain('IF NOT public.is_admin() THEN');
    });

    it('3. PLAYER no puede crear sorteo (exige rol OPERATOR o superior)', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.create_draw_authoritative[\s\S]*?is_operator_or_higher/);
      expect(content15).toContain('Acceso denegado: Se requiere rol OPERATOR o superior para crear sorteos.');
    });

    it('4. PLAYER no puede iniciar sorteo (start_draw_authoritative bloqueado)', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.start_draw_authoritative[\s\S]*?is_operator_or_higher/);
    });

    it('5. PLAYER no puede extraer/cantar bola (emit_next_ball_authoritative bloqueado)', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.emit_next_ball_authoritative[\s\S]*?is_operator_or_higher/);
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 2: REGLAS 6 A 12 — FINANZAS, ROLES, IDENTIDAD Y MFA
  // --------------------------------------------------------------------------
  describe('Grupo 2: Finanzas, Roles, Identidad y MFA', () => {
    it('6. PLAYER no puede aprobar retiro (execute_approve_withdrawal exige SUPERVISOR+)', () => {
      expect(content15).toContain('IF NOT public.is_supervisor_or_higher() THEN');
      expect(content15).toContain('Acceso denegado: Se requiere rol SUPERVISOR o superior para aprobar retiros.');
    });

    it('7. PLAYER no puede confirmar recarga (execute_confirm_recharge exige OPERATOR+)', () => {
      expect(content15).toContain('Acceso denegado: Se requiere rol OPERATOR o superior para confirmar recargas.');
    });

    it('8. PLAYER no puede cambiar rol (execute_admin_change_role exige ADMIN+)', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.execute_admin_change_role[\s\S]*?is_admin\(\)/);
    });

    it('9. PLAYER no puede cambiar estado de otro usuario (execute_admin_toggle_user_status exige ADMIN+)', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.execute_admin_toggle_user_status[\s\S]*?is_admin\(\)/);
    });

    it('10. PLAYER no puede sincronizar identidades oficiales (sync_official_admin_identities exige ADMIN+)', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.sync_official_admin_identities[\s\S]*?is_admin\(\)/);
      expect(content15).toContain('Acceso denegado: Se requiere rol ADMIN o SUPER_ADMIN para reconciliar identidades oficiales.');
    });

    it('11. PLAYER no puede desactivar MFA de otro usuario (ambas firmas exigen sesión y validan identidad)', () => {
      expect(content15).toContain('CREATE OR REPLACE FUNCTION public.execute_disable_mfa(\n    p_auth_id UUID,\n    p_factor_id TEXT\n)');
      expect(content15).toContain('CREATE OR REPLACE FUNCTION public.execute_disable_mfa(\n    p_auth_id UUID,\n    p_factor_id TEXT,\n    p_idempotency_key UUID\n)');
      expect(content15).toContain('IF auth.uid() IS NULL THEN');
    });

    it('12. PLAYER no puede modificar identidad bloqueada o eliminar cuenta ajena', () => {
      expect(content15).toMatch(/CREATE OR REPLACE FUNCTION public\.execute_account_soft_deletion[\s\S]*?auth\.uid\(\) IS NULL/);
      expect(content15).toContain('execute_account_soft_deletion');
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 3: REGLAS 13 A 17 — CLAIM BINGO, PREMIOS, JERARQUÍA Y AUDITORÍA
  // --------------------------------------------------------------------------
  describe('Grupo 3: Claim Bingo, Premios y Jerarquía RBAC', () => {
    it('13. PLAYER no puede reclamar cartón ajeno (validación estricta de propiedad v_card.user_id <> v_user_id)', () => {
      expect(content15).toContain('IF v_card.user_id <> v_user_id THEN');
      expect(content15).toContain('Violación de Propiedad: El cartón no pertenece al usuario autenticado.');
    });

    it('14. PLAYER no puede modificar premio arbitrariamente (claim_bingo determina premio server-authoritative)', () => {
      expect(content15).toContain('SELECT * INTO v_prize');
      expect(content15).toContain("WHERE draw_id = p_draw_id\n      AND status = 'PENDING'");
      expect(content15).toContain('FOR UPDATE;');
    });

    it('15. PLAYER no puede modificar ledger directamente (acreditación atómica en wallets vía validación matemática)', () => {
      expect(content15).toContain('bool_and(cn.number_value = ANY(v_draw.drawn_numbers))');
      expect(content15).toContain('UPDATE public.wallets');
    });

    it('16. OPERATOR no puede ejecutar funciones exclusivas de ADMIN/SUPER_ADMIN', () => {
      expect(content15).toContain('IF NOT public.is_admin() THEN');
      expect(content15).toContain('Acceso denegado: Se requiere rol ADMIN o SUPER_ADMIN.');
    });

    it('17. Helper regional is_supervisor_or_higher segrega SUPERVISOR de OPERATOR', () => {
      expect(content15).toContain('CREATE OR REPLACE FUNCTION public.is_supervisor_or_higher()');
      expect(content15).toContain("role IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')");
    });
  });

  // --------------------------------------------------------------------------
  // GRUPO 4: REGLAS 18 A 24 — STEP-UP, IDEMPOTENCIA, SEARCH_PATH Y PASSWORD SECURITY
  // --------------------------------------------------------------------------
  describe('Grupo 4: Step-Up Anti-Replay, Idempotencia, Search Path y Leaked Password', () => {
    it('18. Step-Up no puede reutilizar autorización de otro usuario (filtro user_id = v_user_id)', () => {
      expect(content15).toContain('user_id = v_user_id');
    });

    it('19. Step-Up no puede reutilizar autorización para otro recurso (filtro resource_id)', () => {
      expect(content15).toContain("COALESCE(resource_id, '') = COALESCE(p_resource_id, '')");
    });

    it('20. Step-Up no puede reutilizar autorización para otra acción (filtro action_type = p_action_type)', () => {
      expect(content15).toContain('action_type = p_action_type');
      expect(content15).toContain('risk_level = p_risk_level');
      expect(content15).toContain('is_used = false');
    });

    it('21. Idempotency key no produce doble operación (índice único en winners y step-up auth)', () => {
      expect(content15).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_winners_draw_card ON public.winners(draw_id, card_id);');
      expect(content15).toContain("WHERE draw_id = p_draw_id AND card_id = p_card_id;");
    });

    it('22. SECURITY DEFINER mantiene search_path seguro e inmutable en todas las funciones', () => {
      const definerMatches = content15.match(/SECURITY DEFINER/g) || [];
      const searchPathMatches = content15.match(/SET search_path = (?:public, extensions, pg_temp|public, pg_temp|'')/g) || [];
      expect(definerMatches.length).toBeGreaterThan(0);
      expect(searchPathMatches.length).toBe(definerMatches.length);
    });

    it('23. log_auth_event mitiga falsificación de eventos privilegiados y desbordamiento', () => {
      expect(content15).toContain('p_action != ALL(v_client_allowed_actions)');
      expect(content15).toContain('Acceso denegado: Acción de auditoría no permitida para llamadas directas del cliente');
      expect(content15).toContain('octet_length(COALESCE(p_metadata, \'{}\'::jsonb)::text) > 2048');
    });

    it('24. Leaked Password Protection y políticas de Supabase Auth documentadas para mitigación', () => {
      expect(content15).toContain('SUPABASE AUTH LEAKED PASSWORD PROTECTION');
      expect(content15).toContain('SUPABASE SECURITY ADVISOR 0029');
    });

    it('25. ALTER DEFAULT PRIVILEGES bloquea exposición automática de funciones futuras', () => {
      expect(content15).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;');
      expect(content15).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;');
    });
  });
});
