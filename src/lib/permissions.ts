// BINGO CLUB VNZLA ONLINE — MATRIZ RBAC Y AUTORIDAD DE PERMISOS
// FASE 1: ARQUITECTURA DE SEGURIDAD ESTRICTA

import { UserRole, DrawStatus } from '../types/database.types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  PLAYER: 1,
  OPERATOR: 2,
  SUPERVISOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export const ROLE_LABELS: Record<UserRole, { label: string; badgeColor: string; description: string }> = {
  PLAYER: {
    label: 'Jugador',
    badgeColor: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
    description: 'Acceso a salas públicas, adquisición de cartones y consulta de sorteos.',
  },
  OPERATOR: {
    label: 'Operador de Cabina',
    badgeColor: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
    description: 'Monitoreo de salas asignadas, supervisión de cartones y atención a incidencias.',
  },
  SUPERVISOR: {
    label: 'Supervisor de Juego',
    badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    description: 'Control de estados de sorteos, pausado de contingencia y validación de premios.',
  },
  ADMIN: {
    label: 'Administrador',
    badgeColor: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
    description: 'Gestión de modalidades, programación de sorteos y auditoría de la plataforma.',
  },
  SUPER_ADMIN: {
    label: 'Super Administrador',
    badgeColor: 'bg-rose-900/60 text-rose-300 border-rose-700/50',
    description: 'Acceso irrestricto, configuración global del sistema y auditoría de seguridad forense.',
  },
};

export const PERMISSIONS_LIST = [
  'draws:read',
  'draws:create',
  'draws:execute',
  'draws:cancel',
  'cards:buy',
  'cards:verify',
  'players:view',
  'players:manage',
  'roles:assign',
  'audit:view',
  'settings:manage',
] as const;

export type PermissionCode = (typeof PERMISSIONS_LIST)[number];

export const ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  PLAYER: ['draws:read', 'cards:buy'],
  OPERATOR: ['draws:read', 'draws:create', 'draws:execute', 'cards:verify', 'players:view'],
  SUPERVISOR: [
    'draws:read',
    'draws:create',
    'draws:execute',
    'draws:cancel',
    'cards:verify',
    'players:view',
    'players:manage',
    'audit:view',
  ],
  ADMIN: [
    'draws:read',
    'draws:create',
    'draws:execute',
    'draws:cancel',
    'cards:verify',
    'players:view',
    'players:manage',
    'roles:assign',
    'audit:view',
    'settings:manage',
  ],
  SUPER_ADMIN: [
    'draws:read',
    'draws:create',
    'draws:execute',
    'draws:cancel',
    'cards:verify',
    'players:view',
    'players:manage',
    'roles:assign',
    'audit:view',
    'settings:manage',
  ],
};

/**
 * Valida si un rol tiene un permiso determinado
 */
export function hasPermission(role: UserRole, permission: PermissionCode): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

/**
 * Valida si un rol puede asignar o modificar a otro rol objetivo
 * REGLA ESTRICTA: Nadie puede auto-escalarse ni asignar un rol igual o superior al suyo
 */
export function canAssignRole(operatorRole: UserRole, targetRole: UserRole): boolean {
  if (operatorRole === 'PLAYER' || operatorRole === 'OPERATOR') {
    return false;
  }
  const operatorLevel = ROLE_HIERARCHY[operatorRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];
  return operatorLevel > targetLevel;
}

/**
 * Máquina de Estados para Sorteos (Server Authoritative)
 */
export const ALLOWED_DRAW_TRANSITIONS: Record<DrawStatus, DrawStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['READY', 'CANCELLED', 'DRAFT'],
  READY: ['ACTIVE', 'PAUSED', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'FINISHED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  FINISHED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function isValidDrawTransition(currentStatus: DrawStatus, targetStatus: DrawStatus): boolean {
  const allowed = ALLOWED_DRAW_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * Validador del formato de identificación pública BCV-XXXXXX
 */
export function isValidPublicId(publicId: string): boolean {
  return /^BCV-[A-Z0-9]{6}$/.test(publicId);
}

/**
 * Validador estricto de teléfono venezolano (+58 412/414/416/424/426)
 */
export function isValidVenezuelanPhone(phone: string): boolean {
  const clean = phone.replace(/[\s-]/g, '');
  return /^(\+58|0)?(412|414|416|424|426|212)\d{7}$/.test(clean);
}
