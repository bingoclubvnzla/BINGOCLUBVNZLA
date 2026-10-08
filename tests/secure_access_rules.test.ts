// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PRUEBAS FORENSES DE REGLAS DE ACCESO SEGURO
// Validación exhaustiva de las 18 Reglas de Seguridad, RBAC y Autoridad Server-Side
// ==============================================================================

import { describe, it, expect } from 'vitest';
import {
  SECURE_ROLE_HIERARCHY,
  hasMinimumRole,
  isRoleHigher,
  canRoleExecuteOperation,
  validateServerSideAuthority,
  canMutateUserRole,
  validateResourceAccess,
  validateFinancialMutationRequest,
  validateStepUpActionBinding,
  isCanonicalOAuthRedirect,
  recordUnauthorizedRouteAccess,
  createSafeDenialResponse,
} from '../src/lib/secureAccessRules';
import { isForbiddenVercelDeploymentHost } from '../src/lib/canonicalConfig';
import { isAllowedRedirectUrl } from '../src/lib/authRedirect';
import { sanitizeAuditMetadata } from '../src/lib/audit';
import type { UserRole } from '../src/types/database';

describe('REGLAS DE ACCESO SEGURO — BINGO CLUB VNZLA ONLINE', () => {

  // --------------------------------------------------------------------------
  // REGLA 1 & 2: PRINCIPIO DE MÍNIMO PRIVILEGIO Y JERARQUÍA RBAC
  // --------------------------------------------------------------------------
  describe('Regla 1 & 2: Mínimo Privilegio y Jerarquía RBAC', () => {
    it('debe mantener estrictamente la jerarquía: SUPER_ADMIN > ADMIN > SUPERVISOR > OPERATOR > PLAYER', () => {
      expect(SECURE_ROLE_HIERARCHY.SUPER_ADMIN).toBeGreaterThan(SECURE_ROLE_HIERARCHY.ADMIN);
      expect(SECURE_ROLE_HIERARCHY.ADMIN).toBeGreaterThan(SECURE_ROLE_HIERARCHY.SUPERVISOR);
      expect(SECURE_ROLE_HIERARCHY.SUPERVISOR).toBeGreaterThan(SECURE_ROLE_HIERARCHY.OPERATOR);
      expect(SECURE_ROLE_HIERARCHY.OPERATOR).toBeGreaterThan(SECURE_ROLE_HIERARCHY.PLAYER);
    });

    it('PLAYER no debe poder ejecutar operaciones de OPERATOR, SUPERVISOR, ADMIN o SUPER_ADMIN', () => {
      expect(canRoleExecuteOperation('PLAYER', 'PLAY_GAME')).toBe(true);
      expect(canRoleExecuteOperation('PLAYER', 'BUY_CARDS')).toBe(true);
      expect(canRoleExecuteOperation('PLAYER', 'OPERATE_ROOM')).toBe(false);
      expect(canRoleExecuteOperation('PLAYER', 'EMIT_BALL')).toBe(false);
      expect(canRoleExecuteOperation('PLAYER', 'SUPERVISE_GAMES')).toBe(false);
      expect(canRoleExecuteOperation('PLAYER', 'PAUSE_DRAW')).toBe(false);
      expect(canRoleExecuteOperation('PLAYER', 'MANAGE_SETTINGS')).toBe(false);
      expect(canRoleExecuteOperation('PLAYER', 'ASSIGN_ROLES')).toBe(false);
      expect(canRoleExecuteOperation('PLAYER', 'OVERRIDE_SYSTEM_CONFIG')).toBe(false);
    });

    it('OPERATOR no debe poder ejecutar operaciones de SUPERVISOR ni superiores', () => {
      expect(canRoleExecuteOperation('OPERATOR', 'OPERATE_ROOM')).toBe(true);
      expect(canRoleExecuteOperation('OPERATOR', 'EMIT_BALL')).toBe(true);
      expect(canRoleExecuteOperation('OPERATOR', 'SUPERVISE_GAMES')).toBe(false);
      expect(canRoleExecuteOperation('OPERATOR', 'VALIDATE_PAYOUTS')).toBe(false);
      expect(canRoleExecuteOperation('OPERATOR', 'ASSIGN_ROLES')).toBe(false);
    });

    it('SUPERVISOR no debe poder ejecutar operaciones reservadas a ADMIN', () => {
      expect(canRoleExecuteOperation('SUPERVISOR', 'SUPERVISE_GAMES')).toBe(true);
      expect(canRoleExecuteOperation('SUPERVISOR', 'PAUSE_DRAW')).toBe(true);
      expect(canRoleExecuteOperation('SUPERVISOR', 'MANAGE_SETTINGS')).toBe(false);
      expect(canRoleExecuteOperation('SUPERVISOR', 'ASSIGN_ROLES')).toBe(false);
      expect(canRoleExecuteOperation('SUPERVISOR', 'OVERRIDE_SYSTEM_CONFIG')).toBe(false);
    });

    it('ADMIN no debe poder ejecutar operaciones exclusivas de SUPER_ADMIN', () => {
      expect(canRoleExecuteOperation('ADMIN', 'MANAGE_SETTINGS')).toBe(true);
      expect(canRoleExecuteOperation('ADMIN', 'ASSIGN_ROLES')).toBe(true);
      expect(canRoleExecuteOperation('ADMIN', 'FULL_SYSTEM_AUDIT')).toBe(true);
      expect(canRoleExecuteOperation('ADMIN', 'OVERRIDE_SYSTEM_CONFIG')).toBe(false);
    });

    it('SUPER_ADMIN debe poseer facultades para todas las operaciones autoritativas', () => {
      expect(canRoleExecuteOperation('SUPER_ADMIN', 'OVERRIDE_SYSTEM_CONFIG')).toBe(true);
      expect(canRoleExecuteOperation('SUPER_ADMIN', 'MANAGE_SETTINGS')).toBe(true);
      expect(canRoleExecuteOperation('SUPER_ADMIN', 'SUPERVISE_GAMES')).toBe(true);
      expect(canRoleExecuteOperation('SUPER_ADMIN', 'OPERATE_ROOM')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 3: VALIDACIÓN SERVER-SIDE
  // --------------------------------------------------------------------------
  describe('Regla 3: Validación Server-Side', () => {
    it('debe rechazar solicitudes sin auth.uid() en el servidor (Deny by Default)', () => {
      const result = validateServerSideAuthority({ authUid: null, userRole: 'PLAYER' }, 'PLAYER');
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('auth.uid() ausente');
    });

    it('debe rechazar usuarios con estado inactivo o bloqueado', () => {
      const result = validateServerSideAuthority({
        authUid: 'usr-123',
        userStatus: 'BLOCKED',
        userRole: 'PLAYER',
      }, 'PLAYER');
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Usuario no activo');
    });

    it('debe rechazar banderas is_admin enviadas por el frontend si el rol real no es ADMIN', () => {
      const result = validateServerSideAuthority({
        authUid: 'usr-456',
        userStatus: 'ACTIVE',
        userRole: 'PLAYER',
        clientClaimedIsAdmin: true,
      }, 'ADMIN');
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Violación de autoridad');
    });

    it('debe autorizar cuando auth.uid(), rol y estado cumplen los requisitos del servidor', () => {
      const result = validateServerSideAuthority({
        authUid: 'usr-789',
        userStatus: 'ACTIVE',
        userRole: 'ADMIN',
      }, 'ADMIN');
      expect(result.authorized).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 6: PROTECCIÓN CONTRA ESCALADA DE PRIVILEGIOS
  // --------------------------------------------------------------------------
  describe('Regla 6: Protección contra Escalada de Privilegios', () => {
    it('un usuario jamás puede modificar su propio rol (anti self-escalation)', () => {
      const result = canMutateUserRole({
        callerRole: 'ADMIN',
        callerUserId: 'usr-same-123',
        targetUserId: 'usr-same-123',
        newRole: 'SUPER_ADMIN',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('anti self-escalation');
    });

    it('PLAYER, OPERATOR y SUPERVISOR no pueden asignar ningún rol', () => {
      const roles: UserRole[] = ['PLAYER', 'OPERATOR', 'SUPERVISOR'];
      for (const callerRole of roles) {
        const result = canMutateUserRole({
          callerRole,
          callerUserId: 'actor-1',
          targetUserId: 'target-2',
          newRole: 'OPERATOR',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('no tiene facultades para asignar roles');
      }
    });

    it('ADMIN no puede asignar el rol ADMIN ni SUPER_ADMIN', () => {
      const toAdmin = canMutateUserRole({
        callerRole: 'ADMIN',
        callerUserId: 'admin-1',
        targetUserId: 'target-2',
        newRole: 'ADMIN',
      });
      expect(toAdmin.allowed).toBe(false);

      const toSuperAdmin = canMutateUserRole({
        callerRole: 'ADMIN',
        callerUserId: 'admin-1',
        targetUserId: 'target-2',
        newRole: 'SUPER_ADMIN',
      });
      expect(toSuperAdmin.allowed).toBe(false);
    });

    it('ADMIN puede asignar roles estrictamente inferiores (PLAYER, OPERATOR, SUPERVISOR)', () => {
      const toOperator = canMutateUserRole({
        callerRole: 'ADMIN',
        callerUserId: 'admin-1',
        targetUserId: 'target-2',
        newRole: 'OPERATOR',
      });
      expect(toOperator.allowed).toBe(true);

      const toSupervisor = canMutateUserRole({
        callerRole: 'ADMIN',
        callerUserId: 'admin-1',
        targetUserId: 'target-2',
        newRole: 'SUPERVISOR',
      });
      expect(toSupervisor.allowed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 7: ACCESO A RECURSOS (AUTORIZACIÓN POR OBJETO)
  // --------------------------------------------------------------------------
  describe('Regla 7: Acceso a Recursos (Autorización por Objeto)', () => {
    it('PLAYER + recurso propio = PERMITIDO', () => {
      const result = validateResourceAccess({
        actorUserId: 'player-100',
        actorRole: 'PLAYER',
        resourceType: 'CARD',
        resourceOwnerId: 'player-100',
      });
      expect(result.allowed).toBe(true);
    });

    it('PLAYER + recurso ajeno = DENEGADO ESTRICTO', () => {
      const result = validateResourceAccess({
        actorUserId: 'player-100',
        actorRole: 'PLAYER',
        resourceType: 'CARD',
        resourceOwnerId: 'player-200',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Violación de propiedad de objeto');
    });

    it('PLAYER intentando acceder a billetera o transacciones ajenas es bloqueado', () => {
      const resultWallet = validateResourceAccess({
        actorUserId: 'player-100',
        actorRole: 'PLAYER',
        resourceType: 'WALLET',
        resourceOwnerId: 'victim-300',
      });
      expect(resultWallet.allowed).toBe(false);

      const resultTx = validateResourceAccess({
        actorUserId: 'player-100',
        actorRole: 'PLAYER',
        resourceType: 'TRANSACTION',
        resourceOwnerId: 'victim-300',
      });
      expect(resultTx.allowed).toBe(false);
    });

    it('SUPERVISOR y ADMIN pueden auditar transacciones en su ámbito', () => {
      const result = validateResourceAccess({
        actorUserId: 'supervisor-1',
        actorRole: 'SUPERVISOR',
        resourceType: 'TRANSACTION',
        resourceOwnerId: 'player-200',
      });
      expect(result.allowed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 8: OPERACIONES FINANCIERAS SERVER-AUTHORITATIVE
  // --------------------------------------------------------------------------
  describe('Regla 8: Operaciones Financieras Server-Authoritative', () => {
    it('debe rechazar solicitudes financieras sin clave de idempotencia o con clave corta', () => {
      const noKey = validateFinancialMutationRequest({
        idempotencyKey: '',
        userId: 'u1',
        amount: 100,
        type: 'DEPOSIT',
      });
      expect(noKey.valid).toBe(false);
      expect(noKey.reason).toContain('clave de idempotencia');

      const shortKey = validateFinancialMutationRequest({
        idempotencyKey: 'abc-123',
        userId: 'u1',
        amount: 100,
        type: 'DEPOSIT',
      });
      expect(shortKey.valid).toBe(false);
    });

    it('debe rechazar importes financieros menores o iguales a cero o no numéricos', () => {
      const zeroAmount = validateFinancialMutationRequest({
        idempotencyKey: '01234567-89ab-cdef-0123-456789abcdef',
        userId: 'u1',
        amount: 0,
        type: 'WITHDRAWAL',
      });
      expect(zeroAmount.valid).toBe(false);
      expect(zeroAmount.reason).toContain('estrictamente positivo');

      const negativeAmount = validateFinancialMutationRequest({
        idempotencyKey: '01234567-89ab-cdef-0123-456789abcdef',
        userId: 'u1',
        amount: -50,
        type: 'WITHDRAWAL',
      });
      expect(negativeAmount.valid).toBe(false);
    });

    it('acepta solicitud válida con idempotencia e importe correcto', () => {
      const validReq = validateFinancialMutationRequest({
        idempotencyKey: '01234567-89ab-cdef-0123-456789abcdef',
        userId: 'u1',
        amount: 50.5,
        type: 'DEPOSIT',
      });
      expect(validReq.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 9: STEP-UP / MFA CON VINCULACIÓN ESTRICTA (ACTION BINDING)
  // --------------------------------------------------------------------------
  describe('Regla 9: Step-Up / MFA con Vinculación Estricta', () => {
    const futureTime = Date.now() + 300000;

    it('debe rechazar tokens si el usuario objetivo no coincide (Identity Violation)', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'legit-user',
        tokenAction: 'REQUEST_WITHDRAWAL',
        tokenIsUsed: false,
        tokenExpiresAt: futureTime,
        targetUserId: 'attacker-user',
        targetAction: 'REQUEST_WITHDRAWAL',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Violación de Identidad Step-Up');
    });

    it('debe rechazar token emitido para una acción si se intenta usar en otra (Action Binding Violation)', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'user-1',
        tokenAction: 'CHANGE_PAGO_MOVIL',
        tokenIsUsed: false,
        tokenExpiresAt: futureTime,
        targetUserId: 'user-1',
        targetAction: 'REQUEST_WITHDRAWAL',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Violación de Action Binding');
    });

    it('debe rechazar token si el recurso objetivo difiere (Resource Binding Violation)', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'user-1',
        tokenAction: 'APPROVE_WITHDRAWAL',
        tokenResourceId: 'tx-100',
        tokenIsUsed: false,
        tokenExpiresAt: futureTime,
        targetUserId: 'user-1',
        targetAction: 'APPROVE_WITHDRAWAL',
        targetResourceId: 'tx-999',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Violación de Resource Binding');
    });

    it('debe rechazar token si ya fue consumido (Anti-Replay Violation)', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'user-1',
        tokenAction: 'REQUEST_WITHDRAWAL',
        tokenIsUsed: true,
        tokenExpiresAt: futureTime,
        targetUserId: 'user-1',
        targetAction: 'REQUEST_WITHDRAWAL',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Violación Anti-Replay');
    });

    it('debe rechazar token expirado', () => {
      const pastTime = Date.now() - 1000;
      const result = validateStepUpActionBinding({
        tokenUserId: 'user-1',
        tokenAction: 'REQUEST_WITHDRAWAL',
        tokenIsUsed: false,
        tokenExpiresAt: pastTime,
        targetUserId: 'user-1',
        targetAction: 'REQUEST_WITHDRAWAL',
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expirada');
    });

    it('debe autorizar cuando todos los enlaces de seguridad coinciden', () => {
      const result = validateStepUpActionBinding({
        tokenUserId: 'user-1',
        tokenAction: 'REQUEST_WITHDRAWAL',
        tokenResourceId: 'res-42',
        tokenIsUsed: false,
        tokenExpiresAt: futureTime,
        targetUserId: 'user-1',
        targetAction: 'REQUEST_WITHDRAWAL',
        targetResourceId: 'res-42',
      });
      expect(result.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 11: OAUTH CANÓNICO
  // --------------------------------------------------------------------------
  describe('Regla 11: OAuth Canónico', () => {
    it('debe validar únicamente el dominio de producción canónico oficial', () => {
      expect(isCanonicalOAuthRedirect('https://bingoclubvnzla.vercel.app/auth/callback')).toBe(true);
      expect(isCanonicalOAuthRedirect('http://localhost:3000/auth/callback')).toBe(true);
    });

    it('debe rechazar dominios no canónicos o preview de Vercel', () => {
      expect(isCanonicalOAuthRedirect('https://bingoclubvnzla-git-main-bingoclubvnzla.vercel.app/auth/callback')).toBe(false);
      expect(isCanonicalOAuthRedirect('https://bingoclubvnzla-bingoclubvnzla.vercel.app/auth/callback')).toBe(false);
      expect(isCanonicalOAuthRedirect('https://bingoclubvnzla-d7x9q1-preview.vercel.app/auth/callback')).toBe(false);
      expect(isCanonicalOAuthRedirect('https://malicious-site.com/auth/callback')).toBe(false);
    });

    it('isForbiddenVercelDeploymentHost debe detectar cualquier alias de Vercel y proteger el dominio canónico', () => {
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla.vercel.app')).toBe(false);
      expect(isForbiddenVercelDeploymentHost('https://bingoclubvnzla.vercel.app')).toBe(false);
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla-bingoclubvnzla.vercel.app')).toBe(true);
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla-git-main-bingoclubvnzla.vercel.app')).toBe(true);
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla-abc123xyz.vercel.app')).toBe(true);
      expect(isForbiddenVercelDeploymentHost('bingoclubvnzla-pr-42.vercel.app')).toBe(true);
    });

    it('isAllowedRedirectUrl debe rechazar cualquier deployment preview de Vercel', () => {
      expect(isAllowedRedirectUrl('https://bingoclubvnzla.vercel.app/')).toBe(true);
      expect(isAllowedRedirectUrl('https://bingoclubvnzla-bingoclubvnzla.vercel.app/')).toBe(false);
      expect(isAllowedRedirectUrl('https://bingoclubvnzla-git-main.vercel.app/auth/callback')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 14: AUDITORÍA Y PROTECCIÓN DE DATOS SENSIBLES
  // --------------------------------------------------------------------------
  describe('Regla 14: Auditoría y Filtrado de Secretos', () => {
    it('debe eliminar automáticamente contraseñas, tokens y claves de los metadatos de auditoría', () => {
      const rawMeta = {
        email: 'test@example.com',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        turnstile_token: '0.X123456789',
        secret: 'cf_turnstile_secret_key',
        safeData: 'valor_permitido',
      };

      const sanitized = sanitizeAuditMetadata(rawMeta);

      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.safeData).toBe('valor_permitido');
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('token');
      expect(sanitized).not.toHaveProperty('turnstile_token');
      expect(sanitized).not.toHaveProperty('secret');
    });
  });

  // --------------------------------------------------------------------------
  // REGLA 15 & 16: DENEGACIÓN SEGURA Y ANTI-ENUMERACIÓN
  // --------------------------------------------------------------------------
  describe('Regla 15 & 16: Denegación Segura y Anti-Enumeración', () => {
    it('debe responder con mensajes genéricos para evitar enumeración de recursos privados', () => {
      const response = createSafeDenialResponse('WALLET');
      expect(response.error).toBe('Acceso no disponible o recurso no encontrado.');
      expect(response.code).toBe('ACCESS_DENIED_GENERIC');
    });
  });
});
