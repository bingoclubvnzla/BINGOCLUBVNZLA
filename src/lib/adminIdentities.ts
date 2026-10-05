// ==============================================================================
// BINGO CLUB VNZLA ONLINE — IDENTIDADES ADMINISTRATIVAS OFICIALES (FASE 2.9)
// Jerarquía estricta: SUPER_ADMIN > ADMIN > SUPERVISOR > OPERATOR > PLAYER
// ==============================================================================

import type { UserRole } from '../types/database';

/**
 * Cuentas administrativas canónicas de Bingo Club Venezuela Online
 * Principio: La autorización definitiva se valida en base de datos mediante user_id y RBAC server-side.
 */
export const OFFICIAL_ADMIN_IDENTITIES = {
  SUPER_ADMIN: 'v19629049@gmail.com',
  ADMIN: 'bingoclubvnzla@gmail.com',
  OPERATOR: 'bingobingovnz@gmail.com',
} as const;

export const OFFICIAL_ADMIN_EMAILS = Object.values(OFFICIAL_ADMIN_IDENTITIES) as readonly string[];

/**
 * Retorna el rol administrativo oficial asignado a un correo si coincide con la política
 */
export function getOfficialRoleForEmail(email?: string | null): UserRole | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();

  if (normalized === OFFICIAL_ADMIN_IDENTITIES.SUPER_ADMIN) {
    return 'SUPER_ADMIN';
  }
  if (normalized === OFFICIAL_ADMIN_IDENTITIES.ADMIN) {
    return 'ADMIN';
  }
  if (normalized === OFFICIAL_ADMIN_IDENTITIES.OPERATOR) {
    return 'OPERATOR';
  }
  return null;
}

/**
 * Valida si un correo electrónico corresponde a una de las identidades oficiales
 */
export function isOfficialAdminEmail(email?: string | null): boolean {
  return getOfficialRoleForEmail(email) !== null;
}

/**
 * Matriz de Jerarquía Numérica RBAC Estricta
 */
export const OFFICIAL_ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 50,
  ADMIN: 40,
  SUPERVISOR: 30,
  OPERATOR: 20,
  PLAYER: 10,
};

/**
 * Comprueba si un rol posee mayor o igual jerarquía que otro
 */
export function hasSufficientRole(callerRole: UserRole, targetRequiredRole: UserRole): boolean {
  return (OFFICIAL_ROLE_HIERARCHY[callerRole] ?? 0) >= (OFFICIAL_ROLE_HIERARCHY[targetRequiredRole] ?? 0);
}

/**
 * Valida si un rol tiene autorización para asignar un nuevo rol
 * Regla:
 * - SUPER_ADMIN puede asignar cualquier rol (PLAYER, OPERATOR, SUPERVISOR, ADMIN).
 * - ADMIN solo puede asignar roles estrictamente inferiores a ADMIN (PLAYER, OPERATOR, SUPERVISOR).
 * - OPERATOR, SUPERVISOR y PLAYER NO pueden modificar roles.
 * - Ningún rol puede auto-asignarse SUPER_ADMIN.
 */
export function canRoleAssignTargetRole(callerRole: UserRole, roleToAssign: UserRole): boolean {
  if (callerRole === 'SUPER_ADMIN') {
    // SUPER_ADMIN puede asignar cualquier rol inferior o igual a ADMIN
    return roleToAssign !== 'SUPER_ADMIN'; // El SUPER_ADMIN se reserva a la identidad oficial
  }
  if (callerRole === 'ADMIN') {
    // ADMIN solo puede asignar roles menores a ADMIN
    return (OFFICIAL_ROLE_HIERARCHY[roleToAssign] ?? 0) < OFFICIAL_ROLE_HIERARCHY.ADMIN;
  }
  return false;
}
