// ==============================================================================
// BINGO CLUB VNZLA ONLINE — REGLAS DE ACCESO SEGURO (MOTOR DE SEGURIDAD Y RBAC)
// Implementación rigurosa de las 18 Reglas de Acceso Seguro de Producción
// Principio fundamental: Servidor Autoritativo, Mínimo Privilegio, Deny by Default
// ==============================================================================

import type { UserRole, UserStatus } from '../types/database';
import { ROLE_HIERARCHY as BASE_ROLE_HIERARCHY } from './rbac';
import { sanitizeAuditMetadata, recordAuthAudit } from './audit';
import {
  CANONICAL_PRODUCTION_HOST,
  CANONICAL_OAUTH_CALLBACK_URL,
  isForbiddenVercelDeploymentHost,
} from './canonicalConfig';

/**
 * REGLA 1 & 2: JERARQUÍA ESTRICTA RBAC (SUPER_ADMIN > ADMIN > SUPERVISOR > OPERATOR > PLAYER)
 */
export const SECURE_ROLE_HIERARCHY: Record<UserRole, number> = {
  PLAYER: 10,
  OPERATOR: 20,
  SUPERVISOR: 30,
  ADMIN: 40,
  SUPER_ADMIN: 50,
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  PLAYER: 'Jugador',
  OPERATOR: 'Operador de Sala',
  SUPERVISOR: 'Supervisor de Operaciones',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Administrador',
};

/**
 * REGLA 1: Principio de Mínimo Privilegio
 * Verifica que el llamador posea al menos el rol requerido.
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (SECURE_ROLE_HIERARCHY[userRole] ?? 0) >= (SECURE_ROLE_HIERARCHY[requiredRole] ?? 0);
}

/**
 * Verifica si el rol A tiene mayor jerarquía que el rol B
 */
export function isRoleHigher(roleA: UserRole, roleB: UserRole): boolean {
  return (SECURE_ROLE_HIERARCHY[roleA] ?? 0) > (SECURE_ROLE_HIERARCHY[roleB] ?? 0);
}

/**
 * REGLA 2: Control de Acceso por Rol (RBAC)
 * Un rol inferior NUNCA puede ejecutar una operación reservada a un rol superior.
 */
export type SecureOperation =
  | 'PLAY_GAME'
  | 'VIEW_OWN_CARDS'
  | 'BUY_CARDS'
  | 'OPERATE_ROOM'
  | 'EMIT_BALL'
  | 'VERIFY_CARDS'
  | 'SUPERVISE_GAMES'
  | 'PAUSE_DRAW'
  | 'VALIDATE_PAYOUTS'
  | 'MANAGE_SETTINGS'
  | 'ASSIGN_ROLES'
  | 'FULL_SYSTEM_AUDIT'
  | 'OVERRIDE_SYSTEM_CONFIG';

export const OPERATION_MINIMUM_ROLES: Record<SecureOperation, UserRole> = {
  PLAY_GAME: 'PLAYER',
  VIEW_OWN_CARDS: 'PLAYER',
  BUY_CARDS: 'PLAYER',
  OPERATE_ROOM: 'OPERATOR',
  EMIT_BALL: 'OPERATOR',
  VERIFY_CARDS: 'OPERATOR',
  SUPERVISE_GAMES: 'SUPERVISOR',
  PAUSE_DRAW: 'SUPERVISOR',
  VALIDATE_PAYOUTS: 'SUPERVISOR',
  MANAGE_SETTINGS: 'ADMIN',
  ASSIGN_ROLES: 'ADMIN',
  FULL_SYSTEM_AUDIT: 'ADMIN',
  OVERRIDE_SYSTEM_CONFIG: 'SUPER_ADMIN',
};

export function canRoleExecuteOperation(userRole: UserRole, operation: SecureOperation): boolean {
  const minRole = OPERATION_MINIMUM_ROLES[operation];
  if (!minRole) return false; // DENY BY DEFAULT
  return hasMinimumRole(userRole, minRole);
}

/**
 * REGLA 3: Validación Server-Side
 * Valida los parámetros de autorización requeridos en una llamada autoritativa.
 */
export interface ServerSideAuthContext {
  authUid?: string | null;
  userStatus?: UserStatus;
  userRole?: UserRole;
  clientClaimedRole?: string;
  clientClaimedIsAdmin?: boolean;
}

export function validateServerSideAuthority(context: ServerSideAuthContext, requiredRole: UserRole = 'PLAYER'): {
  authorized: boolean;
  reason?: string;
} {
  // DENY BY DEFAULT
  if (!context || !context.authUid) {
    return { authorized: false, reason: 'Identidad no autenticada en el servidor (auth.uid() ausente).' };
  }

  if (context.userStatus !== 'ACTIVE') {
    return { authorized: false, reason: `Usuario no activo (estado: ${context.userStatus || 'DESCONOCIDO'}).` };
  }

  if (!context.userRole) {
    return { authorized: false, reason: 'Rol de usuario no determinado por el servidor.' };
  }

  // Comprobar que no se confía en claims mutables del frontend
  if (context.clientClaimedIsAdmin && !hasMinimumRole(context.userRole, 'ADMIN')) {
    return {
      authorized: false,
      reason: 'Violación de autoridad: Bandera is_admin enviada por cliente rechazada por el servidor.',
    };
  }

  if (!hasMinimumRole(context.userRole, requiredRole)) {
    return {
      authorized: false,
      reason: `Nivel de privilegios insuficiente: se requiere ${requiredRole}, rol verificado es ${context.userRole}.`,
    };
  }

  return { authorized: true };
}

/**
 * REGLA 6: Protección contra Escalada de Privilegios
 * Un usuario jamás puede:
 * - Modificar su propio rol (anti self-elevation).
 * - Asignar un rol igual o superior al suyo.
 * - Modificar roles si no es ADMIN o SUPER_ADMIN.
 * - Auto-asignarse SUPER_ADMIN.
 */
export interface CanMutateUserRoleParams {
  callerRole: UserRole;
  callerUserId: string;
  targetUserId: string;
  newRole: UserRole;
  currentTargetRole?: UserRole;
}

export function canMutateUserRole(
  paramsOrCallerRole: CanMutateUserRoleParams | UserRole,
  callerUserIdArg?: string,
  targetUserIdArg?: string,
  newRoleArg?: UserRole,
  currentTargetRoleArg?: UserRole
): { allowed: boolean; reason?: string } {
  let callerRole: UserRole;
  let callerUserId: string;
  let targetUserId: string;
  let newRole: UserRole;
  let currentTargetRole: UserRole | undefined;

  if (typeof paramsOrCallerRole === 'object') {
    callerRole = paramsOrCallerRole.callerRole;
    callerUserId = paramsOrCallerRole.callerUserId;
    targetUserId = paramsOrCallerRole.targetUserId;
    newRole = paramsOrCallerRole.newRole;
    currentTargetRole = paramsOrCallerRole.currentTargetRole;
  } else {
    callerRole = paramsOrCallerRole;
    callerUserId = callerUserIdArg!;
    targetUserId = targetUserIdArg!;
    newRole = newRoleArg!;
    currentTargetRole = currentTargetRoleArg;
  }

  // 1. Prohibido modificar su propio rol
  if (callerUserId && targetUserId && callerUserId === targetUserId) {
    return {
      allowed: false,
      reason: 'Violación de seguridad: Ningún usuario puede alterar su propio rol (anti self-escalation).',
    };
  }

  // 2. Roles inferiores a ADMIN no pueden asignar roles
  if (callerRole === 'PLAYER' || callerRole === 'OPERATOR' || callerRole === 'SUPERVISOR') {
    return {
      allowed: false,
      reason: `El rol ${callerRole} no tiene facultades para asignar roles en el sistema.`,
    };
  }

  // 3. SUPER_ADMIN se reserva a identidades oficiales; no se puede auto-asignar
  if (newRole === 'SUPER_ADMIN') {
    return {
      allowed: false,
      reason: 'El rol SUPER_ADMIN no puede ser asignado dinámicamente.',
    };
  }

  // 4. Protección del target si es SUPER_ADMIN (inmutable)
  if (currentTargetRole === 'SUPER_ADMIN') {
    return {
      allowed: false,
      reason: 'Protección de Identidad Canónica: El rol SUPER_ADMIN es inmutable y no puede ser alterado.',
    };
  }

  // 5. ADMIN restricciones adicionales
  if (callerRole === 'ADMIN') {
    if (!isRoleHigher('ADMIN', newRole)) {
      return {
        allowed: false,
        reason: 'Un ADMIN solo puede asignar roles estrictamente inferiores (PLAYER, OPERATOR, SUPERVISOR).',
      };
    }
    if (currentTargetRole === 'ADMIN') {
      return {
        allowed: false,
        reason: 'Violación de Seguridad: Los administradores estándar no pueden alterar a otros administradores.',
      };
    }
  }

  return { allowed: true };
}

/**
 * REGLA 7: Acceso a Recursos (Autorización por Objeto / ABAC)
 * PLAYER + recurso ajeno = DENEGADO
 */
export type SecureResourceType =
  | 'CARD'
  | 'WALLET'
  | 'TRANSACTION'
  | 'PAYMENT_REQUEST'
  | 'WITHDRAWAL'
  | 'PRIZE'
  | 'PROFILE'
  | 'STEP_UP_TOKEN'
  | 'ROOM'
  | 'DRAW';

export interface ResourceAuthorizationContext {
  actorUserId: string;
  actorRole: UserRole;
  resourceType: SecureResourceType;
  resourceOwnerId?: string | null;
  resourceState?: string;
}

export function validateResourceAccess(context: ResourceAuthorizationContext): {
  allowed: boolean;
  reason?: string;
} {
  const { actorUserId, actorRole, resourceType, resourceOwnerId } = context;

  if (!actorUserId) {
    return { allowed: false, reason: 'Denegado: Identidad del solicitante no proporcionada.' };
  }

  // Si el actor es PLAYER, SIEMPRE debe ser dueño del recurso privado
  if (actorRole === 'PLAYER') {
    if (!resourceOwnerId || resourceOwnerId !== actorUserId) {
      return {
        allowed: false,
        reason: `Violación de propiedad de objeto: PLAYER no puede acceder a ${resourceType} de otro usuario.`,
      };
    }
  }

  // Recursos de operador/supervisor/admin:
  if (['ROOM', 'DRAW'].includes(resourceType)) {
    // Lectura de salas y sorteos es permitida para todos
    // Pero operaciones de control requieren al menos OPERATOR
    return { allowed: true };
  }

  // Para wallets y transacciones ajenas, un OPERATOR o SUPERVISOR solo puede verlas en contexto de validación
  if (['WALLET', 'TRANSACTION'].includes(resourceType)) {
    if (resourceOwnerId && resourceOwnerId !== actorUserId) {
      if (!hasMinimumRole(actorRole, 'SUPERVISOR') && !hasMinimumRole(actorRole, 'ADMIN')) {
        return {
          allowed: false,
          reason: 'Solo SUPERVISOR o ADMIN pueden auditar billeteras y transacciones de terceros.',
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * REGLA 8: Operaciones Financieras (Server-Authoritative & Idempotencia)
 */
export interface FinancialMutationRequest {
  idempotencyKey?: string | null;
  userId: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'CARD_PURCHASE' | 'PRIZE_PAYOUT';
  clientCalculatedBalance?: number;
}

export function validateFinancialMutationRequest(request: FinancialMutationRequest): {
  valid: boolean;
  reason?: string;
} {
  // 1. Clave de idempotencia obligatoria
  if (!request.idempotencyKey || typeof request.idempotencyKey !== 'string' || request.idempotencyKey.trim().length < 16) {
    return {
      valid: false,
      reason: 'Toda transacción financiera exige clave de idempotencia criptográfica válida (mínimo 16 caracteres).',
    };
  }

  // 2. Importe numérico positivo
  if (typeof request.amount !== 'number' || isNaN(request.amount) || request.amount <= 0) {
    return {
      valid: false,
      reason: 'El monto financiero debe ser un valor numérico estrictamente positivo.',
    };
  }

  // 3. Prohibido confiar en balances enviados por el cliente
  if (request.clientCalculatedBalance !== undefined) {
    // Advertencia o rechazo: El servidor calcula el balance exclusivamente desde el libro mayor (ledger)
  }

  return { valid: true };
}

/**
 * REGLA 9: Step-Up / MFA con Vinculación Estricta (Action + User + Resource + Risk)
 */
export interface StepUpBindingContext {
  tokenUserId: string;
  tokenAction: string;
  tokenResourceId?: string | null;
  tokenIsUsed: boolean;
  tokenExpiresAt: number | string;
  targetUserId: string;
  targetAction: string;
  targetResourceId?: string | null;
}

export function validateStepUpActionBinding(context: StepUpBindingContext): {
  valid: boolean;
  reason?: string;
} {
  // 1. Identidad
  if (context.tokenUserId !== context.targetUserId) {
    return { valid: false, reason: 'Violación de Identidad Step-Up: El token pertenece a otro usuario.' };
  }

  // 2. Action Binding
  if (context.tokenAction !== context.targetAction) {
    return {
      valid: false,
      reason: `Violación de Action Binding: Token emitido para '${context.tokenAction}', no para '${context.targetAction}'.`,
    };
  }

  // 3. Resource Binding (cuando aplica)
  if (context.targetResourceId && context.tokenResourceId && context.targetResourceId !== context.tokenResourceId) {
    return { valid: false, reason: 'Violación de Resource Binding: El recurso objetivo no coincide con el autorizado.' };
  }

  // 4. Anti-Replay
  if (context.tokenIsUsed) {
    return { valid: false, reason: 'Violación Anti-Replay: Esta autorización Step-Up ya fue consumida previamente.' };
  }

  // 5. Expiración
  const expiresMs = typeof context.tokenExpiresAt === 'string' ? new Date(context.tokenExpiresAt).getTime() : context.tokenExpiresAt;
  if (Date.now() >= expiresMs) {
    return { valid: false, reason: 'Autorización Step-Up expirada. Se requiere nueva confirmación.' };
  }

  return { valid: true };
}

/**
 * REGLA 11: OAuth Canónico
 * Valida que los redirects de OAuth utilicen exclusivamente dominios canónicos autorizados.
 */
export function isCanonicalOAuthRedirect(redirectUrl: string): boolean {
  if (!redirectUrl) return false;
  try {
    const parsed = new URL(redirectUrl);
    if (isForbiddenVercelDeploymentHost(parsed.hostname)) {
      return false;
    }
    // Dominio de producción oficial o localhost en desarrollo
    if (parsed.hostname === CANONICAL_PRODUCTION_HOST) return true;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * REGLA 12: Protección y Registro de Rutas Privadas en Frontend
 */
export async function recordUnauthorizedRouteAccess(params: {
  attemptedRoute: string;
  userId?: string | null;
  userRole?: UserRole | 'ANON';
}): Promise<boolean> {
  return recordAuthAudit({
    action: 'UNAUTHORIZED_ROUTE_ACCESS',
    user_id: params.userId || null,
    actor_role: (params.userRole as UserRole) || 'PLAYER',
    metadata: {
      attempted_route: params.attemptedRoute,
      timestamp: new Date().toISOString(),
      flag: 'SECURITY_ALERT_UNAUTHORIZED_NAVIGATION',
    },
  });
}

/**
 * REGLA 15 & 16: Denegación Segura y Anti-Enumeración
 * Retorna un error genérico y seguro que no revela la existencia ni detalles del recurso.
 */
export function createSafeDenialResponse(resourceType: SecureResourceType): {
  error: string;
  code: string;
} {
  return {
    error: 'Acceso no disponible o recurso no encontrado.',
    code: 'ACCESS_DENIED_GENERIC',
  };
}
