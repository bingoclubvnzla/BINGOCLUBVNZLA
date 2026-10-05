// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SUITE DE PRUEBAS FASE 2.8: STEP-UP AUTH & MFA
// Cobertura completa: Matriz de Riesgo, Anti-Replay, Action Binding, RBAC MFA,
// Rate Limiting, Sanitización Financiera e Integridad de Migración 09.
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  RISK_MATRIX,
  isMfaMandatoryForRole,
  canRoleDisableMfa,
  isValidVenezuelanPhone,
  sanitizeVenezuelanPhone,
  maskPhone,
  validateStepUpToken,
  checkTotpRateLimit,
  resetTotpRateLimit
} from '../src/lib/mfaSecurity';
import type { StepUpAuthorizationRecord } from '../src/types/mfa';
import type { UserRole } from '../src/types/database';

describe('Fase 2.8 — Matriz de Riesgo Centralizada', () => {
  it('debe definir las 8 operaciones sensibles con niveles HIGH o CRITICAL', () => {
    const actions = Object.keys(RISK_MATRIX);
    expect(actions).toContain('CHANGE_PAGO_MOVIL');
    expect(actions).toContain('REQUEST_WITHDRAWAL');
    expect(actions).toContain('ACCOUNT_DELETION');
    expect(actions).toContain('CONFIRM_RECHARGE');
    expect(actions).toContain('APPROVE_WITHDRAWAL');
    expect(actions).toContain('CHANGE_USER_ROLE');
    expect(actions).toContain('UPDATE_FINANCIAL_SETTINGS');
    expect(actions).toContain('MFA_DISABLE');
    expect(actions.length).toBe(8);
  });

  it('todas las operaciones de alto riesgo deben exigir segundo factor TOTP de forma obligatoria', () => {
    for (const actionKey of Object.keys(RISK_MATRIX)) {
      const rule = RISK_MATRIX[actionKey as keyof typeof RISK_MATRIX];
      expect(rule.requiresTotp).toBe(true);
      expect(['HIGH', 'CRITICAL']).toContain(rule.riskLevel);
      expect(rule.userWarning).toBeDefined();
      expect(rule.userWarning.length).toBeGreaterThan(10);
    }
  });

  it('CHANGE_PAGO_MOVIL debe poseer un período de cooldown configurado de 24 horas', () => {
    expect(RISK_MATRIX.CHANGE_PAGO_MOVIL.cooldownHours).toBe(24);
    expect(RISK_MATRIX.CHANGE_PAGO_MOVIL.riskLevel).toBe('HIGH');
  });

  it('ACCOUNT_DELETION, APPROVE_WITHDRAWAL y CHANGE_USER_ROLE deben tener nivel CRITICAL', () => {
    expect(RISK_MATRIX.ACCOUNT_DELETION.riskLevel).toBe('CRITICAL');
    expect(RISK_MATRIX.APPROVE_WITHDRAWAL.riskLevel).toBe('CRITICAL');
    expect(RISK_MATRIX.CHANGE_USER_ROLE.riskLevel).toBe('CRITICAL');
    expect(RISK_MATRIX.UPDATE_FINANCIAL_SETTINGS.riskLevel).toBe('CRITICAL');
  });
});

describe('Fase 2.8 — Política de MFA Obligatorio por Rol', () => {
  it('OPERATOR, SUPERVISOR, ADMIN y SUPER_ADMIN deben tener MFA obligatorio', () => {
    const privilegedRoles: UserRole[] = ['OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'];
    for (const r of privilegedRoles) {
      expect(isMfaMandatoryForRole(r)).toBe(true);
      expect(canRoleDisableMfa(r)).toBe(false);
    }
  });

  it('PLAYER debe tener MFA opcional para lobby pero permitido desactivar con autorización', () => {
    expect(isMfaMandatoryForRole('PLAYER')).toBe(false);
    expect(canRoleDisableMfa('PLAYER')).toBe(true);
  });
});

describe('Fase 2.8 — Validación de Formatos y Datos Financieros', () => {
  it('debe validar prefijos oficiales de telefonía móvil venezolana (0414, 0424, 0412, 0416, 0426)', () => {
    expect(isValidVenezuelanPhone('04141234567')).toBe(true);
    expect(isValidVenezuelanPhone('04249876543')).toBe(true);
    expect(isValidVenezuelanPhone('04125554321')).toBe(true);
    expect(isValidVenezuelanPhone('04161112233')).toBe(true);
    expect(isValidVenezuelanPhone('04267778899')).toBe(true);
    // Formato con código sin cero pero 10 dígitos (4141234567)
    expect(isValidVenezuelanPhone('4141234567')).toBe(true);
  });

  it('debe rechazar números telefónicos inválidos o extranjeros', () => {
    expect(isValidVenezuelanPhone('02121234567')).toBe(false); // Fijo Caracas
    expect(isValidVenezuelanPhone('04181234567')).toBe(false); // Prefijo inexistente
    expect(isValidVenezuelanPhone('+13051234567')).toBe(false); // USA
    expect(isValidVenezuelanPhone('12345')).toBe(false); // Incompleto
    expect(isValidVenezuelanPhone('')).toBe(false);
  });

  it('debe limpiar caracteres especiales y normalizar números', () => {
    expect(sanitizeVenezuelanPhone('+58 (414) 123-4567')).toBe('584141234567');
    expect(sanitizeVenezuelanPhone('414-1234567')).toBe('04141234567');
  });

  it('debe enmascarar números telefónicos protegiendo los dígitos centrales', () => {
    const masked = maskPhone('04141234567');
    expect(masked).toBe('0414***4567');
    expect(masked).not.toContain('123');
  });
});

describe('Fase 2.8 — Validación Step-Up Token (Anti-Replay & Action Binding)', () => {
  const baseValidRecord: StepUpAuthorizationRecord = {
    id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u0000000-0000-0000-0000-000000000001',
    action_type: 'CHANGE_PAGO_MOVIL',
    risk_level: 'HIGH',
    resource_id: 'prof-123',
    idempotency_key: 'idemp-123',
    created_at: new Date(Date.now() - 30000).toISOString(),
    expires_at: new Date(Date.now() + 270000).toISOString(), // 4.5 min vigentes
    is_used: false,
  };

  it('debe aprobar un token válido, no usado, no expirado y con usuario y acción correctos', () => {
    const res = validateStepUpToken(
      baseValidRecord,
      'u0000000-0000-0000-0000-000000000001',
      'CHANGE_PAGO_MOVIL',
      'prof-123'
    );
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('Anti-Replay: debe RECHAZAR una autorización que ya fue marcada como utilizada', () => {
    const usedRecord: StepUpAuthorizationRecord = {
      ...baseValidRecord,
      is_used: true,
      used_at: new Date().toISOString(),
    };
    const res = validateStepUpToken(
      usedRecord,
      'u0000000-0000-0000-0000-000000000001',
      'CHANGE_PAGO_MOVIL'
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Violación de Anti-Replay');
  });

  it('Expiración: debe RECHAZAR una autorización cuya vigencia temporal ya venció', () => {
    const expiredRecord: StepUpAuthorizationRecord = {
      ...baseValidRecord,
      expires_at: new Date(Date.now() - 1000).toISOString(), // Venció hace 1 segundo
    };
    const res = validateStepUpToken(
      expiredRecord,
      'u0000000-0000-0000-0000-000000000001',
      'CHANGE_PAGO_MOVIL'
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Autorización expirada');
  });

  it('Action Binding: debe RECHAZAR el uso de un token emitido para una acción en otra diferente', () => {
    // Token emitido para CHANGE_PAGO_MOVIL intentando usarse para ACCOUNT_DELETION
    const res = validateStepUpToken(
      baseValidRecord,
      'u0000000-0000-0000-0000-000000000001',
      'ACCOUNT_DELETION'
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Violación de Action Binding');
  });

  it('Identity Binding: debe RECHAZAR el uso de un token emitido para un usuario por un atacante', () => {
    const res = validateStepUpToken(
      baseValidRecord,
      'u9999999-9999-9999-9999-999999999999', // Atacante
      'CHANGE_PAGO_MOVIL'
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Violación de Identidad');
  });

  it('Resource Binding: debe RECHAZAR si el resource_id de la operación no coincide con el autorizado', () => {
    const res = validateStepUpToken(
      baseValidRecord,
      'u0000000-0000-0000-0000-000000000001',
      'CHANGE_PAGO_MOVIL',
      'prof-VIOLACION-DISTINTO'
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Violación de Resource Binding');
  });
});

describe('Fase 2.8 — Rate Limiting de Códigos TOTP', () => {
  const testUserId = 'test-rate-limit-user-123';

  beforeEach(() => {
    resetTotpRateLimit(testUserId);
  });

  it('debe permitir intentos sucesivos hasta el límite establecido (5 intentos)', () => {
    const r1 = checkTotpRateLimit(testUserId, 5);
    expect(r1.allowed).toBe(true);
    expect(r1.remainingAttempts).toBe(4);

    checkTotpRateLimit(testUserId, 5);
    checkTotpRateLimit(testUserId, 5);
    checkTotpRateLimit(testUserId, 5);
    const r5 = checkTotpRateLimit(testUserId, 5);
    expect(r5.allowed).toBe(true);
    expect(r5.remainingAttempts).toBe(0);

    // 6to intento debe bloquearse
    const r6 = checkTotpRateLimit(testUserId, 5);
    expect(r6.allowed).toBe(false);
    expect(r6.retryAfterSec).toBeGreaterThan(0);
  });

  it('debe reiniciar el contador de intentos al llamar resetTotpRateLimit tras un éxito', () => {
    checkTotpRateLimit(testUserId, 5);
    checkTotpRateLimit(testUserId, 5);
    resetTotpRateLimit(testUserId);

    const rNew = checkTotpRateLimit(testUserId, 5);
    expect(rNew.allowed).toBe(true);
    expect(rNew.remainingAttempts).toBe(4);
  });
});

describe('Fase 2.8 — Integridad de Migración 09 en el Repositorio', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261005000009_security_step_up_auth.sql'
  );

  it('el archivo de migración 09 debe existir en el repositorio', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('debe definir la tabla step_up_authorizations con RLS obligatorio', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public.step_up_authorizations');
    expect(content).toContain('ALTER TABLE public.step_up_authorizations ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('CREATE POLICY "Users can view own step-up authorizations"');
  });

  it('todas las funciones SECURITY DEFINER deben contar con SET search_path = public, pg_temp', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    const funcMatches = content.match(/CREATE OR REPLACE FUNCTION\s+public\.([a-zA-Z0-9_]+)/g) || [];
    expect(funcMatches.length).toBeGreaterThanOrEqual(5);

    // Debe contener las funciones clave de Step-Up
    expect(content).toContain('request_step_up_authorization');
    expect(content).toContain('internal_consume_step_up');
    expect(content).toContain('execute_update_pago_movil');
    expect(content).toContain('execute_request_withdrawal');
    expect(content).toContain('execute_account_soft_deletion');

    // Cada función creada debe tener search_path seguro
    const occurrencesSecDef = (content.match(/SECURITY DEFINER/g) || []).length;
    const occurrencesSearchPath = (content.match(/SET search_path = public, pg_temp/g) || []).length;
    expect(occurrencesSearchPath).toBeGreaterThanOrEqual(occurrencesSecDef);
  });

  it('debe revocar privilegios EXECUTE de la función interna a PUBLIC, anon y authenticated', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.internal_consume_step_up FROM PUBLIC, anon, authenticated');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.request_step_up_authorization FROM PUBLIC, anon');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.execute_update_pago_movil FROM PUBLIC, anon');
  });

  it('debe registrar la certificación en app_settings', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    expect(content).toContain('MFA_STEP_UP_CONFIG_PHASE_2_8');
    expect(content).toContain('RFC_6238');
    expect(content).toContain('step_up_token_ttl_seconds');
  });
});

describe('Fase 2.8 — Políticas de Seguridad Específicas por Rol (Section 32)', () => {
  it('OPERATOR: operador sin MFA no puede validar recargas ni retiros', () => {
    const operatorRole: UserRole = 'OPERATOR';
    expect(isMfaMandatoryForRole(operatorRole)).toBe(true);
    expect(RISK_MATRIX.CONFIRM_RECHARGE.allowedRoles).toContain('OPERATOR');
    expect(RISK_MATRIX.CONFIRM_RECHARGE.requiresTotp).toBe(true);
  });

  it('OPERATOR: no puede ejecutar funciones de SUPERVISOR ni ADMIN (Separación de Funciones)', () => {
    expect(RISK_MATRIX.APPROVE_WITHDRAWAL.allowedRoles).not.toContain('OPERATOR');
    expect(RISK_MATRIX.CHANGE_USER_ROLE.allowedRoles).not.toContain('OPERATOR');
    expect(RISK_MATRIX.UPDATE_FINANCIAL_SETTINGS.allowedRoles).not.toContain('OPERATOR');
  });

  it('ADMIN: modificación de roles y parámetros exige Step-Up TOTP y queda auditada', () => {
    expect(RISK_MATRIX.CHANGE_USER_ROLE.allowedRoles).toContain('ADMIN');
    expect(RISK_MATRIX.CHANGE_USER_ROLE.riskLevel).toBe('CRITICAL');
    expect(RISK_MATRIX.CHANGE_USER_ROLE.requiresTotp).toBe(true);
  });

  it('SUPER_ADMIN: tiene MFA obligatorio y no cuenta con bypass de auditoría ni de TOTP', () => {
    const superAdminRole: UserRole = 'SUPER_ADMIN';
    expect(isMfaMandatoryForRole(superAdminRole)).toBe(true);
    expect(canRoleDisableMfa(superAdminRole)).toBe(false);
  });
});

describe('Fase 2.8 — Simulación de Vectores de Ataque (Section 32)', () => {
  const victimUserId = 'victim-uuid-0001';
  const attackerUserId = 'attacker-uuid-0666';

  const legitimateToken: StepUpAuthorizationRecord = {
    id: 'auth-token-valid-001',
    user_id: victimUserId,
    action_type: 'REQUEST_WITHDRAWAL',
    risk_level: 'HIGH',
    resource_id: 'wallet-001',
    metadata: { amount: 100, currency: 'VES' },
    idempotency_key: 'idemp-legit-001',
    created_at: new Date(Date.now() - 10000).toISOString(),
    expires_at: new Date(Date.now() + 290000).toISOString(),
    is_used: false,
  };

  it('Ataque 1 — Identity Hijacking: Atacante intenta redimir token emitido para víctima', () => {
    const attackResult = validateStepUpToken(
      legitimateToken,
      attackerUserId, // Atacante usurpa
      'REQUEST_WITHDRAWAL',
      'wallet-001'
    );
    expect(attackResult.isValid).toBe(false);
    expect(attackResult.error).toContain('Violación de Identidad');
  });

  it('Ataque 2 — Action Privilege Escalation: Token de retiro usado para eliminar cuenta', () => {
    const attackResult = validateStepUpToken(
      legitimateToken,
      victimUserId,
      'ACCOUNT_DELETION', // Escalación no autorizada
      'wallet-001'
    );
    expect(attackResult.isValid).toBe(false);
    expect(attackResult.error).toContain('Violación de Action Binding');
  });

  it('Ataque 3 — Resource Tampering: Token emitido para Billetera A aplicado en Billetera B', () => {
    const attackResult = validateStepUpToken(
      legitimateToken,
      victimUserId,
      'REQUEST_WITHDRAWAL',
      'wallet-OTRA-VICTIMA' // Manipulación de recurso
    );
    expect(attackResult.isValid).toBe(false);
    expect(attackResult.error).toContain('Violación de Resource Binding');
  });

  it('Ataque 4 — Replay Attack: Reutilización de token ya consumido en concurrencia', () => {
    const consumedToken: StepUpAuthorizationRecord = {
      ...legitimateToken,
      is_used: true,
      used_at: new Date().toISOString(),
    };
    const attackResult = validateStepUpToken(
      consumedToken,
      victimUserId,
      'REQUEST_WITHDRAWAL',
      'wallet-001'
    );
    expect(attackResult.isValid).toBe(false);
    expect(attackResult.error).toContain('Violación de Anti-Replay');
  });

  it('Ataque 5 — Expired Challenge Exploit: Intento de consumo tras ventana de 5 minutos', () => {
    const staleToken: StepUpAuthorizationRecord = {
      ...legitimateToken,
      expires_at: new Date(Date.now() - 500).toISOString(), // Venció hace 500ms
    };
    const attackResult = validateStepUpToken(
      staleToken,
      victimUserId,
      'REQUEST_WITHDRAWAL',
      'wallet-001'
    );
    expect(attackResult.isValid).toBe(false);
    expect(attackResult.error).toContain('Autorización expirada');
  });
});
