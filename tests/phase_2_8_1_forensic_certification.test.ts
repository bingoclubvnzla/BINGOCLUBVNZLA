// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SUITE DE CERTIFICACIÓN FORENSE FASE 2.8.1
// Verificación exhaustiva de:
// 1. Integridad de Migración 11 (Endurecimiento Forense de Step-Up y Finanzas)
// 2. Server-Authoritative Risk Mapping & Strict Resource Binding
// 3. Control Estricto de Operaciones Financieras (Ledger Atómico, Cooldown, Anti-Replay)
// 4. Bloqueo Pesimista (FOR UPDATE) y Mitigación de Concurrencia / Saldo Negativo
// 5. Política Inquebrantable de Desactivación de MFA (MFA_DISABLE por Rol)
// 6. Matriz de Privilegios EXECUTE y Protección Anti-Tampering de Profiles
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  RISK_MATRIX,
  isMfaMandatoryForRole,
  canRoleDisableMfa,
  validateStepUpToken
} from '../src/lib/mfaSecurity';
import type { StepUpAuthorizationRecord } from '../src/types/mfa';
import type { UserRole } from '../src/types/database';

describe('Fase 2.8.1 — 1. Integridad de Migración 11 (Endurecimiento Forense)', () => {
  const mig11Path = path.resolve(__dirname, '../supabase/migrations/20261005000011_forensic_financial_step_up_hardening.sql');

  it('el archivo de migración 11 debe existir físicamente en el repositorio', () => {
    expect(fs.existsSync(mig11Path)).toBe(true);
  });

  it('todas las funciones en migración 11 deben contar con SECURITY DEFINER y search_path = public, pg_temp', () => {
    const content = fs.readFileSync(mig11Path, 'utf8');
    const functions = [
      'internal_consume_step_up',
      'request_step_up_authorization',
      'execute_confirm_recharge',
      'execute_approve_withdrawal',
      'execute_request_withdrawal',
      'execute_disable_mfa',
      'execute_update_pago_movil',
      'protect_profile_mutations'
    ];

    for (const fn of functions) {
      expect(content).toContain(`FUNCTION public.${fn}`);
    }

    // Comprobar que no hay funciones sin search_path seguro
    const secDefCount = (content.match(/SECURITY\s+DEFINER/g) || []).length;
    const searchPathCount = (content.match(/SET\s+search_path\s*=\s*public,\s*pg_temp/g) || []).length;
    expect(secDefCount).toBe(functions.length);
    expect(searchPathCount).toBe(functions.length);
  });
});

describe('Fase 2.8.1 — 2. Server-Authoritative Risk Mapping & Strict Resource Binding', () => {
  const mig11Content = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/20261005000011_forensic_financial_step_up_hardening.sql'),
    'utf8'
  );

  it('request_step_up_authorization debe mapear de forma autoritativa el riesgo server-side', () => {
    expect(mig11Content).toContain("WHEN 'CHANGE_PAGO_MOVIL'          THEN 'HIGH'");
    expect(mig11Content).toContain("WHEN 'REQUEST_WITHDRAWAL'         THEN 'HIGH'");
    expect(mig11Content).toContain("WHEN 'ACCOUNT_DELETION'           THEN 'CRITICAL'");
    expect(mig11Content).toContain("WHEN 'CONFIRM_RECHARGE'           THEN 'HIGH'");
    expect(mig11Content).toContain("WHEN 'APPROVE_WITHDRAWAL'         THEN 'CRITICAL'");
    expect(mig11Content).toContain("WHEN 'CHANGE_USER_ROLE'           THEN 'CRITICAL'");
    expect(mig11Content).toContain("WHEN 'MFA_DISABLE'                THEN 'HIGH'");
    expect(mig11Content).toContain('Acción de seguridad no reconocida por la matriz de riesgo del servidor');
  });

  it('internal_consume_step_up debe imponer vinculación estricta de recurso (Resource Binding)', () => {
    expect(mig11Content).toContain('IF p_expected_resource IS NOT NULL THEN');
    expect(mig11Content).toContain('v_auth.resource_id IS NULL OR v_auth.resource_id <> p_expected_resource');
    expect(mig11Content).toContain('Violación de Resource Binding');
  });

  it('internal_consume_step_up debe implementar bloqueo pesimista (FOR UPDATE) anti race-condition', () => {
    expect(mig11Content).toContain('SELECT * INTO v_auth');
    expect(mig11Content).toContain('WHERE id = p_auth_id');
    expect(mig11Content).toContain('FOR UPDATE;');
  });
});

describe('Fase 2.8.1 — 3. Operaciones Financieras con Ledger Atómico y RBAC', () => {
  const mig11Content = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/20261005000011_forensic_financial_step_up_hardening.sql'),
    'utf8'
  );

  it('execute_confirm_recharge: debe exigir rol OPERATOR/SUPERVISOR/ADMIN/SUPER_ADMIN y rechazar a PLAYER', () => {
    expect(mig11Content).toContain('FUNCTION public.execute_confirm_recharge');
    expect(mig11Content).toContain("IF v_caller_role NOT IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN");
    expect(mig11Content).toContain('Acceso Denegado (403): El rol PLAYER no tiene permisos para confirmar recargas');
    expect(mig11Content).toContain("PERFORM public.internal_consume_step_up(p_auth_id, 'CONFIRM_RECHARGE', p_request_id::text);");
    expect(mig11Content).toContain("status = 'APPROVED'");
    expect(mig11Content).toContain("transaction_type");
    expect(mig11Content).toContain("balance_before");
    expect(mig11Content).toContain("'DEPOSIT'");
  });

  it('execute_approve_withdrawal: debe ser exclusivo de SUPERVISOR, ADMIN y SUPER_ADMIN (rechazo tajante a OPERATOR y PLAYER)', () => {
    expect(mig11Content).toContain('FUNCTION public.execute_approve_withdrawal');
    expect(mig11Content).toContain("IF v_caller_role NOT IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN");
    expect(mig11Content).toContain('Privilegios Insuficientes (403): La aprobación de retiros es exclusiva de SUPERVISOR, ADMIN o SUPER_ADMIN');
    expect(mig11Content).toContain("PERFORM public.internal_consume_step_up(p_auth_id, 'APPROVE_WITHDRAWAL', p_request_id::text);");
    expect(mig11Content).toContain("balance_locked = balance_locked - v_req.amount");
    expect(mig11Content).toContain("'WITHDRAWAL'");
  });

  it('execute_request_withdrawal: debe exigir rol PLAYER, datos Pago Móvil registrados y bloqueo pesimista', () => {
    expect(mig11Content).toContain('FUNCTION public.execute_request_withdrawal');
    expect(mig11Content).toContain("IF v_user_role <> 'PLAYER' THEN");
    expect(mig11Content).toContain("IF v_pago_movil_phone IS NULL OR v_pago_movil_bank IS NULL THEN");
    expect(mig11Content).toContain('Debe registrar su método Pago Móvil antes de solicitar retiros');
    expect(mig11Content).toContain('v_cooldown_until > timezone');
    expect(mig11Content).toContain('Operación restringida por política de cooldown financiero');
    expect(mig11Content).toContain('SELECT * INTO v_wallet');
    expect(mig11Content).toContain('FROM public.wallets');
    expect(mig11Content).toContain('WHERE user_id = v_user_id');
    expect(mig11Content).toContain('FOR UPDATE;');
    expect(mig11Content).toContain('balance_available = balance_available - p_amount');
    expect(mig11Content).toContain('balance_locked = balance_locked + p_amount');
  });
});

describe('Fase 2.8.1 — 4. Política Estricta de Desactivación de MFA (MFA_DISABLE)', () => {
  const mig11Content = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/20261005000011_forensic_financial_step_up_hardening.sql'),
    'utf8'
  );

  it('execute_disable_mfa debe impedir desactivar MFA a OPERATOR, SUPERVISOR, ADMIN y SUPER_ADMIN', () => {
    expect(mig11Content).toContain('FUNCTION public.execute_disable_mfa');
    expect(mig11Content).toContain("IF v_user_role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN");
    expect(mig11Content).toContain('MFA Obligatorio (403): Los usuarios con rol % no pueden desactivar el segundo factor');
    expect(mig11Content).toContain("PERFORM public.internal_consume_step_up(p_auth_id, 'MFA_DISABLE');");
  });

  it('el motor typescript mfaSecurity debe mantener coherencia con la política SQL', () => {
    const privileged: UserRole[] = ['OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'];
    for (const r of privileged) {
      expect(canRoleDisableMfa(r)).toBe(false);
      expect(isMfaMandatoryForRole(r)).toBe(true);
    }
    expect(canRoleDisableMfa('PLAYER')).toBe(true);
  });
});

describe('Fase 2.8.1 — 5. Anti-Tampering Trigger de Profiles & Privilegios EXECUTE', () => {
  const mig11Content = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/20261005000011_forensic_financial_step_up_hardening.sql'),
    'utf8'
  );

  it('protect_profile_mutations debe impedir la modificación directa desde cliente de cooldown y datos financieros', () => {
    expect(mig11Content).toContain('NEW.financial_cooldown_until IS DISTINCT FROM OLD.financial_cooldown_until');
    expect(mig11Content).toContain('NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled');
    expect(mig11Content).toContain('NEW.pago_movil_phone IS DISTINCT FROM OLD.pago_movil_phone');
    expect(mig11Content).toContain('bcv.authorized_profile_mutation');
    expect(mig11Content).toContain('Violación de Seguridad: Los datos financieros y de MFA no pueden modificarse directamente');
  });

  it('debe revocar privilegios EXECUTE a PUBLIC y anon para funciones sensibles', () => {
    expect(mig11Content).toContain('REVOKE EXECUTE ON FUNCTION public.internal_consume_step_up FROM PUBLIC, anon, authenticated;');
    expect(mig11Content).toContain('REVOKE EXECUTE ON FUNCTION public.execute_confirm_recharge FROM PUBLIC, anon;');
    expect(mig11Content).toContain('REVOKE EXECUTE ON FUNCTION public.execute_approve_withdrawal FROM PUBLIC, anon;');
    expect(mig11Content).toContain('REVOKE EXECUTE ON FUNCTION public.execute_disable_mfa FROM PUBLIC, anon;');
  });

  it('debe otorgar permisos de ejecución exclusivamente a authenticated para endpoints RPC PostgREST', () => {
    expect(mig11Content).toContain('GRANT EXECUTE ON FUNCTION public.execute_confirm_recharge TO authenticated;');
    expect(mig11Content).toContain('GRANT EXECUTE ON FUNCTION public.execute_approve_withdrawal TO authenticated;');
    expect(mig11Content).toContain('GRANT EXECUTE ON FUNCTION public.execute_disable_mfa TO authenticated;');
  });
});

describe('Fase 2.8.1 — 6. Anti-Replay y Validación Forense de Step-Up Token', () => {
  const baseToken: StepUpAuthorizationRecord = {
    id: 'stepup-0000-1111-2222',
    user_id: 'user-player-1',
    action_type: 'APPROVE_WITHDRAWAL',
    risk_level: 'CRITICAL',
    resource_id: 'req-withdrawal-888',
    idempotency_key: 'idemp-req-888',
    created_at: new Date(Date.now() - 60000).toISOString(),
    expires_at: new Date(Date.now() + 240000).toISOString(),
    is_used: false,
  };

  it('debe validar exitosamente cuando el token, usuario, acción y recurso coinciden', () => {
    const res = validateStepUpToken(baseToken, 'user-player-1', 'APPROVE_WITHDRAWAL', 'req-withdrawal-888');
    expect(res.isValid).toBe(true);
  });

  it('debe RECHAZAR inmediatamente si el recurso no coincide (Resource Binding)', () => {
    const res = validateStepUpToken(baseToken, 'user-player-1', 'APPROVE_WITHDRAWAL', 'req-otro-recurso-999');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Violación de Resource Binding');
  });

  it('debe RECHAZAR inmediatamente si el token ya fue consumido (Anti-Replay)', () => {
    const consumedToken: StepUpAuthorizationRecord = { ...baseToken, is_used: true };
    const res = validateStepUpToken(consumedToken, 'user-player-1', 'APPROVE_WITHDRAWAL', 'req-withdrawal-888');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Violación de Anti-Replay');
  });

  it('debe RECHAZAR inmediatamente si la acción no coincide (Action Binding)', () => {
    const res = validateStepUpToken(baseToken, 'user-player-1', 'CONFIRM_RECHARGE', 'req-withdrawal-888');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Violación de Action Binding');
  });
});
