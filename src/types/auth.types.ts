import type { Profile, UserRole } from './database.types';

export interface AuthState {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface RegisterDTO {
  email: string;
  password: string;
  displayName: string;
  fullName?: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateProfileDTO {
  displayName: string;
  fullName?: string;
  phone?: string;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  PLAYER: 1,
  OPERATOR: 2,
  SUPERVISOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function canOperateDraws(role: UserRole): boolean {
  return ['OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canSuperviseOperations(role: UserRole): boolean {
  return ['SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canAuditSystem(role: UserRole): boolean {
  return ['SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

