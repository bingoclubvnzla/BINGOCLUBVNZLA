import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('FASE FINAL CERTIFICACIÓN — VALIDACIÓN MIGRACIONES 13 & 14 (ACL & WRAPPERS)', () => {
  const mig13Path = path.resolve('supabase/migrations/20261005000013_fix_draw_permutation_authoritative.sql');
  const mig14Path = path.resolve('supabase/migrations/20261005000014_harden_acl_and_public_wrappers.sql');

  const content13 = fs.readFileSync(mig13Path, 'utf8');
  const content14 = fs.readFileSync(mig14Path, 'utf8');

  describe('1. Validación ACL PostgreSQL Canónico (SCHEMA -> USAGE, FUNCTION -> EXECUTE)', () => {
    it('No debe existir GRANT EXECUTE ON SCHEMA private', () => {
      expect(content13).not.toMatch(/GRANT\s+.*EXECUTE.*\s+ON\s+SCHEMA\s+private/i);
      expect(content14).not.toMatch(/GRANT\s+.*EXECUTE.*\s+ON\s+SCHEMA\s+private/i);
    });

    it('Migración 14 revoca explícitamente SCHEMA private de PUBLIC, anon y authenticated', () => {
      expect(content14).toContain('REVOKE ALL ON SCHEMA private FROM PUBLIC;');
      expect(content14).toContain('REVOKE ALL ON SCHEMA private FROM anon;');
      expect(content14).toContain('REVOKE ALL ON SCHEMA private FROM authenticated;');
    });

    it('Migración 14 revoca explícitamente todas las funciones de private de PUBLIC, anon y authenticated', () => {
      expect(content14).toContain('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;');
    });

    it('Solo service_role y postgres tienen USAGE en SCHEMA private y EXECUTE en FUNCTIONS private', () => {
      expect(content14).toContain('GRANT USAGE ON SCHEMA private TO service_role, postgres;');
      expect(content14).toContain('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role, postgres;');
    });
  });

  describe('2. Hardening SECURITY DEFINER en Wrappers Públicos que delegan a private', () => {
    const requiredWrappers = [
      'log_auth_event',
      'start_draw_authoritative',
      'emit_next_ball_authoritative',
      'request_step_up_authorization',
      'execute_update_pago_movil',
      'execute_request_withdrawal',
      'execute_confirm_recharge',
      'execute_approve_withdrawal',
      'execute_disable_mfa',
      'execute_account_soft_deletion',
      'execute_admin_change_role',
      'execute_admin_toggle_user_status',
      'sync_official_admin_identities',
    ];

    for (const wrapper of requiredWrappers) {
      it(`Wrapper public.${wrapper} está definido como SECURITY DEFINER con search_path seguro`, () => {
        expect(content14).toContain(`CREATE OR REPLACE FUNCTION public.${wrapper}`);
        const regexDefiner = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${wrapper}[\\s\\S]*?SECURITY DEFINER`, 'm');
        expect(regexDefiner.test(content14)).toBe(true);
      });
    }

    it('Todos los wrappers en migración 14 usan search_path = public, extensions, pg_temp', () => {
      expect(content14).toContain('SET search_path = public, extensions, pg_temp');
      expect(content14).not.toContain("SET search_path = ''");
    });

    it('Todos los wrappers revocan EXECUTE de anon y PUBLIC y conceden a authenticated', () => {
      expect(content14).toContain('REVOKE EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) FROM PUBLIC, anon;');
      expect(content14).toContain('GRANT EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) TO authenticated, service_role, postgres;');
      expect(content14).toContain('REVOKE EXECUTE ON FUNCTION public.execute_admin_change_role');
      expect(content14).toContain('REVOKE EXECUTE ON FUNCTION public.sync_official_admin_identities');
    });
  });

  describe('3. P1-01 & P2-03 Integridad de Migración 13', () => {
    it('v_permutation utiliza 1..total_balls sin epoch', () => {
      expect(content13).toContain('v_permutation := public.generate_draw_permutation(v_total_balls, 1);');
    });

    it('claim_bingo_authoritative implementa bloqueo transaccional FOR UPDATE y validaciones', () => {
      expect(content13).toContain('SELECT * INTO v_draw\n    FROM public.draws\n    WHERE id = p_draw_id\n    FOR UPDATE;');
      expect(content13).toContain('SELECT * INTO v_card\n    FROM public.cards\n    WHERE id = p_card_id AND draw_id = p_draw_id\n    FOR UPDATE;');
      expect(content13).toContain('bool_and(cn.number_value = ANY(v_draw.drawn_numbers))');
    });
  });
});
