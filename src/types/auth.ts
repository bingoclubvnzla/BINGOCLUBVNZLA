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
