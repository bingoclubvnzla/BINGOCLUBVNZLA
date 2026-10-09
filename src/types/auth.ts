// =====================================================================
// BINGO CLUB VNZLA ONLINE - TIPOS DE AUTENTICACIÓN Y ROLES (RBAC)
// =====================================================================

export type UserRole =
  | 'PLAYER'
  | 'OPERATOR'
  | 'SUPERVISOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type ProfileStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'PENDING_VERIFICATION';

export interface UserProfile {
  id: string;
  user_id: string;
  public_id: string; // BCV-XXXXXX (no expone email ni UUID)
  display_name: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  role: UserRole;
  security_level: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'DRAWS' | 'CARDS' | 'FINANCE' | 'ADMIN' | 'SECURITY';
}

export interface RolePermissionsMap {
  [role: string]: string[];
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  PLAYER: 1,
  OPERATOR: 2,
  SUPERVISOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  PLAYER: 'Jugador Oficial',
  OPERATOR: 'Operador de Sala',
  SUPERVISOR: 'Supervisor Técnico',
  ADMIN: 'Administrador General',
  SUPER_ADMIN: 'Super Administrador',
};

// =====================================================================
// HELPERS DE COMPATIBILIDAD PARA TESTS (RBAC Y AUTH)
// =====================================================================

/**
 * Normaliza un identificador público al formato canónico BCV-XXXXXX.
 * Acepta entradas con o sin prefijo BCV- (case-insensitive).
 * Devuelve BCV-000000 para entradas nulas, vacías o sin dígitos.
 */
export function formatPublicId(input: string | null | undefined): string {
  if (input === null || input === undefined || input === '') {
    return 'BCV-000000';
  }
  let digits = String(input).trim().toUpperCase().replace(/^BCV-/, '');
  digits = digits.replace(/\D/g, '');
  if (digits.length === 0) {
    return 'BCV-000000';
  }
  digits = digits.padStart(6, '0').slice(-6);
  return `BCV-${digits}`;
}

/**
 * Sanitiza texto libre eliminando etiquetas HTML y caracteres peligrosos.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>()\[\]{}"'`;]/g, '')
    .trim();
}

/**
 * Determina si un rol tiene privilegios de OPERATOR o superiores.
 */
export function hasOperatorAccess(role: AppRole | null | undefined): boolean {
  if (!role) return false;
  const level = ROLE_HIERARCHY[role];
  return typeof level === 'number' && level >= ROLE_HIERARCHY.OPERATOR;
}

/**
 * Determina si un rol tiene privilegios administrativos (ADMIN o SUPER_ADMIN).
 */
export function hasAdminAccess(role: AppRole | null | undefined): boolean {
  if (!role) return false;
  const level = ROLE_HIERARCHY[role];
  return typeof level === 'number' && level >= ROLE_HIERARCHY.ADMIN;
}
