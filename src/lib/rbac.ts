// src/lib/rbac.ts
// Lógica de Control de Acceso Basado en Roles (RBAC) y validaciones de seguridad

import { UserRole } from '../types/database';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  PLAYER: 1,
  OPERATOR: 2,
  SUPERVISOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  PLAYER: 'Jugador',
  OPERATOR: 'Operador de Sala',
  SUPERVISOR: 'Supervisor de Operaciones',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Administrador',
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isOperator(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, 'OPERATOR');
}

export function isSupervisor(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, 'SUPERVISOR');
}

export function isAdmin(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, 'ADMIN');
}

export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === 'SUPER_ADMIN';
}

/**
 * Validar si un jugador está intentando alterar campos prohibidos en su perfil
 */
export function validateProfileMutationPayload(
  payload: Record<string, unknown>,
  callerRole: UserRole
): { valid: boolean; violation?: string } {
  const protectedFields = ['role', 'status', 'security_level', 'public_id', 'user_id', 'id'];

  if (callerRole !== 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
    for (const field of protectedFields) {
      if (field in payload) {
        return {
          valid: false,
          violation: `Violación de seguridad: El campo '${field}' no puede ser alterado por un usuario con rol '${callerRole}'.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Enmascara direcciones de correo electrónico para preservar privacidad en auditoría
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

/**
 * Formatea o valida un identificador público BCV
 */
export function isValidPublicId(publicId: string): boolean {
  return /^BCV-[0-9]{6}$/.test(publicId);
}
