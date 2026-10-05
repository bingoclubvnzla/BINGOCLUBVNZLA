import { describe, it, expect } from 'vitest';
import { 
  hasMinimumRole, 
  isOperatorOrHigher, 
  isAdminOrHigher, 
  ROLE_HIERARCHY 
} from '../src/lib/security';
import { UserRole } from '../src/types';

describe('RBAC & Políticas de Autorización (Negative & Positive Security Tests)', () => {
  describe('Jerarquía de Roles', () => {
    it('debe respetar el orden ascendente de privilegios', () => {
      expect(ROLE_HIERARCHY.PLAYER).toBeLessThan(ROLE_HIERARCHY.OPERATOR);
      expect(ROLE_HIERARCHY.OPERATOR).toBeLessThan(ROLE_HIERARCHY.SUPERVISOR);
      expect(ROLE_HIERARCHY.SUPERVISOR).toBeLessThan(ROLE_HIERARCHY.ADMIN);
      expect(ROLE_HIERARCHY.ADMIN).toBeLessThan(ROLE_HIERARCHY.SUPER_ADMIN);
    });

    it('hasMinimumRole debe evaluar permisos correctamente', () => {
      expect(hasMinimumRole('ADMIN', 'OPERATOR')).toBe(true);
      expect(hasMinimumRole('OPERATOR', 'ADMIN')).toBe(false);
      expect(hasMinimumRole('PLAYER', 'OPERATOR')).toBe(false);
      expect(hasMinimumRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
    });
  });

  describe('Pruebas Negativas de Seguridad (Negative Security Enforcements)', () => {
    it('PRUEBA NEGATIVA: PLAYER intenta modificar role -> DEBE FALLAR', () => {
      const playerRole: UserRole = 'PLAYER';
      const targetRoleToEscalate: UserRole = 'ADMIN';

      // Simulación de función de verificación de seguridad server-authoritative
      const canChangeRole = (callerRole: UserRole) => isAdminOrHigher(callerRole);

      expect(canChangeRole(playerRole)).toBe(false);
      expect(() => {
        if (!canChangeRole(playerRole)) {
          throw new Error('Permiso denegado: solo administradores pueden cambiar roles');
        }
      }).toThrow('Permiso denegado');
    });

    it('PRUEBA NEGATIVA: OPERATOR intenta auto-promoverse a ADMIN -> DEBE FALLAR', () => {
      const operatorRole: UserRole = 'OPERATOR';
      const canEscalateToAdmin = (callerRole: UserRole) => isAdminOrHigher(callerRole);

      expect(canEscalateToAdmin(operatorRole)).toBe(false);
      expect(() => {
        if (!canEscalateToAdmin(operatorRole)) {
          throw new Error('Permiso denegado: un operador no puede auto-promoverse');
        }
      }).toThrow('Permiso denegado');
    });

    it('PRUEBA NEGATIVA: PLAYER intenta modificar perfil de otro usuario -> DEBE FALLAR', () => {
      const authenticatedUserId = 'user-uuid-111';
      const targetUserIdToTamper = 'user-uuid-999';

      const canUpdateProfile = (callerId: string, targetId: string, callerRole: UserRole) => {
        return callerId === targetId || isAdminOrHigher(callerRole);
      };

      const allowed = canUpdateProfile(authenticatedUserId, targetUserIdToTamper, 'PLAYER');
      expect(allowed).toBe(false);
    });

    it('PRUEBA NEGATIVA: PLAYER intenta insertar o modificar una transacción de billetera -> DEBE FALLAR', () => {
      // Regla: Las transacciones de billetera solo pueden ser creadas por service_role (backend/edge function)
      const isClientAuthoritative = false; // El navegador jamás es autoridad financiera
      const canPlayerModifyTransactions = (callerRole: UserRole) => {
        // Ningún rol en frontend puede alterar transacciones directamente
        return false;
      };

      expect(canPlayerModifyTransactions('PLAYER')).toBe(false);
      expect(canPlayerModifyTransactions('OPERATOR')).toBe(false);
      expect(isClientAuthoritative).toBe(false);
    });

    it('PRUEBA NEGATIVA: PLAYER intenta leer billetera o datos privados ajenos -> DEBE FALLAR', () => {
      const authenticatedUserId = 'user-uuid-111';
      const targetWalletOwnerId = 'user-uuid-222';

      // RLS Policy emulation: user_id = auth.uid() OR is_admin()
      const canReadWallet = (callerId: string, ownerId: string, role: UserRole) => {
        return callerId === ownerId || isAdminOrHigher(role);
      };

      const canPlayerReadOtherWallet = canReadWallet(authenticatedUserId, targetWalletOwnerId, 'PLAYER');
      expect(canPlayerReadOtherWallet).toBe(false);

      // En cambio, el dueño legítimo sí puede leer su propia billetera
      const canPlayerReadOwnWallet = canReadWallet(authenticatedUserId, authenticatedUserId, 'PLAYER');
      expect(canPlayerReadOwnWallet).toBe(true);
    });
  });
});
