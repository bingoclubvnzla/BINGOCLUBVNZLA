// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MOTOR CENTRAL DE SEGURIDAD MFA Y STEP-UP (FASE 2.8)
// Implementa la Matriz de Riesgo, Anti-Replay, Action Binding y Políticas por Rol
// ==============================================================================

import type { UserRole } from '../types/database';
import type { RiskLevel, StepUpActionType, RiskMatrixRule, StepUpAuthorizationRecord } from '../types/mfa';

/**
 * Matriz Centralizada de Riesgo (Risk Matrix)
 * Define unívocamente el nivel de riesgo, requerimientos de TOTP, cooldown y roles permitidos.
 */
export const RISK_MATRIX: Record<StepUpActionType, RiskMatrixRule> = {
  CHANGE_PAGO_MOVIL: {
    actionType: 'CHANGE_PAGO_MOVIL',
    riskLevel: 'HIGH',
    requiresTotp: true,
    requiresRecentAuth: true,
    cooldownHours: 24,
    allowedRoles: ['PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Modificación del número o banco para pagos móviles',
    userWarning: 'Por seguridad, tras cambiar sus datos financieros se aplicará un período de enfriamiento (cooldown) de 24 horas antes de poder solicitar retiros.',
  },
  REQUEST_WITHDRAWAL: {
    actionType: 'REQUEST_WITHDRAWAL',
    riskLevel: 'HIGH',
    requiresTotp: true,
    requiresRecentAuth: true,
    allowedRoles: ['PLAYER'],
    description: 'Solicitud formal de retiro de saldo disponible',
    userWarning: 'Se requiere confirmación con su segundo factor de autenticación para solicitar la transferencia a su Pago Móvil registrado.',
  },
  ACCOUNT_DELETION: {
    actionType: 'ACCOUNT_DELETION',
    riskLevel: 'CRITICAL',
    requiresTotp: true,
    requiresRecentAuth: true,
    allowedRoles: ['PLAYER'],
    description: 'Eliminación definitiva y anonimización de la cuenta',
    userWarning: 'ADVERTENCIA CRÍTICA: Esta acción es irreversible. Se anonimizarán sus datos de perfil mientras que los registros contables se preservarán conforme a la ley.',
  },
  CONFIRM_RECHARGE: {
    actionType: 'CONFIRM_RECHARGE',
    riskLevel: 'HIGH',
    requiresTotp: true,
    requiresRecentAuth: true,
    allowedRoles: ['OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Acreditación y conciliación de recargas financieras',
    userWarning: 'Debe ingresar su código TOTP para confirmar y asentar en el libro contable (ledger) la recarga del usuario.',
  },
  APPROVE_WITHDRAWAL: {
    actionType: 'APPROVE_WITHDRAWAL',
    riskLevel: 'CRITICAL',
    requiresTotp: true,
    requiresRecentAuth: true,
    allowedRoles: ['SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Aprobación final y liquidación de retiros',
    userWarning: 'Operación crítica con salida de fondos institucionales. Se requiere segundo factor de autenticación y validación de supervisor.',
  },
  CHANGE_USER_ROLE: {
    actionType: 'CHANGE_USER_ROLE',
    riskLevel: 'CRITICAL',
    requiresTotp: true,
    requiresRecentAuth: true,
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    description: 'Modificación de privilegios y asignación de roles RBAC',
    userWarning: 'Elevación de privilegios de usuario. Toda modificación de roles es auditada inmutablemente.',
  },
  UPDATE_FINANCIAL_SETTINGS: {
    actionType: 'UPDATE_FINANCIAL_SETTINGS',
    riskLevel: 'CRITICAL',
    requiresTotp: true,
    requiresRecentAuth: true,
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    description: 'Modificación de parámetros y cuentas institucionales',
    userWarning: 'Cambio de configuración financiera global del club. Requiere verificación estricta de segundo factor.',
  },
  MFA_DISABLE: {
    actionType: 'MFA_DISABLE',
    riskLevel: 'HIGH',
    requiresTotp: true,
    requiresRecentAuth: true,
    allowedRoles: ['PLAYER'], // Bloqueado para operadores y admins
    description: 'Desactivación del segundo factor de autenticación',
    userWarning: 'Desactivar la autenticación de dos factores reducirá la seguridad de su cuenta.',
  },
};

/**
 * Roles con obligación estricta de MFA
 * OPERATOR, SUPERVISOR, ADMIN y SUPER_ADMIN tienen MFA obligatorio.
 */
export const MFA_MANDATORY_ROLES: ReadonlySet<UserRole> = new Set([
  'OPERATOR',
  'SUPERVISOR',
  'ADMIN',
  'SUPER_ADMIN',
]);

export function isMfaMandatoryForRole(role: UserRole): boolean {
  return MFA_MANDATORY_ROLES.has(role);
}

/**
 * Los roles con MFA obligatorio NO pueden desactivar su segundo factor
 */
export function canRoleDisableMfa(role: UserRole): boolean {
  return !isMfaMandatoryForRole(role);
}

/**
 * Validación de formato de teléfono Pago Móvil venezolano (11 dígitos, 0414, 0424, 0412, 0416, 0426)
 */
export function sanitizeVenezuelanPhone(rawPhone: string): string {
  let cleaned = (rawPhone || '').replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('4')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

export function isValidVenezuelanPhone(rawPhone: string): boolean {
  const cleaned = sanitizeVenezuelanPhone(rawPhone);
  if (cleaned.length !== 11) return false;
  const prefix = cleaned.substring(0, 4);
  return ['0414', '0424', '0412', '0416', '0426'].includes(prefix);
}

/**
 * Enmascara números telefónicos para auditoría y visualización segura
 * Ej: 04141234567 -> 0414***4567
 */
export function maskPhone(phone: string): string {
  const cleaned = sanitizeVenezuelanPhone(phone);
  if (cleaned.length < 8) return '****';
  return `${cleaned.substring(0, 4)}***${cleaned.substring(cleaned.length - 4)}`;
}

/**
 * Validador autoritativo del contexto Step-Up (Anti-Replay & Action Binding)
 */
export function validateStepUpToken(
  authRecord: StepUpAuthorizationRecord,
  expectedUserId: string,
  expectedAction: StepUpActionType,
  expectedResourceId?: string | null
): { isValid: boolean; error?: string } {
  if (!authRecord) {
    return { isValid: false, error: 'Autorización inexistente.' };
  }

  if (authRecord.user_id !== expectedUserId) {
    return { isValid: false, error: 'Violación de Identidad: La autorización no pertenece al usuario autenticado.' };
  }

  if (authRecord.action_type !== expectedAction) {
    return {
      isValid: false,
      error: `Violación de Action Binding: Autorización emitida para ${authRecord.action_type}, no para ${expectedAction}.`,
    };
  }

  if (expectedResourceId && authRecord.resource_id && authRecord.resource_id !== expectedResourceId) {
    return { isValid: false, error: 'Violación de Resource Binding: El identificador de recurso no coincide.' };
  }

  if (authRecord.is_used) {
    return { isValid: false, error: 'Violación de Anti-Replay: Esta autorización ya ha sido consumida.' };
  }

  const now = new Date().getTime();
  const expiresAt = new Date(authRecord.expires_at).getTime();

  if (now >= expiresAt) {
    return { isValid: false, error: 'Autorización expirada. Por favor confirme su segundo factor nuevamente.' };
  }

  return { isValid: true };
}

/**
 * Rate Limiter en memoria para reintentos de códigos TOTP (mitiga ataques de fuerza bruta)
 */
const rateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

export function checkTotpRateLimit(identifier: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; remainingAttempts: number; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  if (entry.attempts >= maxAttempts) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSec };
  }

  entry.attempts += 1;
  return { allowed: true, remainingAttempts: maxAttempts - entry.attempts };
}

export function resetTotpRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}
