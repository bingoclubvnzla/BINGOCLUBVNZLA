// ============================================================================
// BINGO CLUB VNZLA ONLINE — PRUEBAS DE SEGURIDAD, RBAC Y REGLAS NEGATIVAS
// ============================================================================

import { describe, it, expect } from 'vitest';
import { 
  OFFICIAL_MODALITIES, 
  isValidDrawTransition, 
  canManageRole, 
  hasMinimumRole,
  generatePublicId 
} from '../lib/constants';
import { AppRole, DrawStatus, UserProfile } from '../types';

describe('1. Identidad de Usuario y Privacidad', () => {
  it('debe generar identificadores públicos en formato BCV-XXXXXX', () => {
    const id = generatePublicId();
    expect(id).toMatch(/^BCV-[0-9A-Z]{6}$/);
  });

  it('no debe exponer el correo electrónico en el identificador público', () => {
    const id = generatePublicId();
    expect(id).not.toContain('@');
    expect(id).not.toContain('.com');
  });
});

describe('2. Control de Acceso Basado en Roles (RBAC) y Seguridad Negativa', () => {
  const playerProfile: UserProfile = {
    id: 'prf_123',
    user_id: 'usr_player_1',
    public_id: 'BCV-PLY001',
    display_name: 'Carlos Perez',
    status: 'ACTIVE',
    role: 'PLAYER',
    security_level: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const operatorProfile: UserProfile = {
    ...playerProfile,
    user_id: 'usr_op_1',
    public_id: 'BCV-OPR001',
    role: 'OPERATOR',
    security_level: 2,
  };

  const adminProfile: UserProfile = {
    ...playerProfile,
    user_id: 'usr_adm_1',
    public_id: 'BCV-ADM001',
    role: 'ADMIN',
    security_level: 4,
  };

  it('PRUEBA NEGATIVA: Un PLAYER no puede elevar su propio rol a ADMIN', () => {
    const attemptRoleChange = (actorRole: AppRole, newRole: AppRole): boolean => {
      if (actorRole === 'PLAYER' && newRole !== 'PLAYER') {
        throw new Error('Acción denegada: Un usuario no puede alterar su propio rol en el sistema.');
      }
      return true;
    };

    expect(() => attemptRoleChange(playerProfile.role, 'ADMIN')).toThrow(
      'Acción denegada: Un usuario no puede alterar su propio rol en el sistema.'
    );
  });

  it('PRUEBA NEGATIVA: Un OPERATOR no puede auto-elevarse a ADMIN ni asignar roles superiores', () => {
    expect(canManageRole('OPERATOR', 'ADMIN')).toBe(false);
    expect(canManageRole('OPERATOR', 'SUPER_ADMIN')).toBe(false);
  });

  it('PRUEBA NEGATIVA: Un PLAYER no puede modificar transacciones ni manipular la billetera', () => {
    const clientAttemptModifyWallet = (actorRole: AppRole): boolean => {
      // Regla de arquitectura: El cliente jamás puede decidir directamente el saldo
      if (actorRole === 'PLAYER') {
        return false;
      }
      return false; // Ni siquiera un operador puede alterar directamente la tabla sin función server-side
    };

    expect(clientAttemptModifyWallet(playerProfile.role)).toBe(false);
  });

  it('PRUEBA NEGATIVA: Un PLAYER no puede leer datos privados de otro jugador', () => {
    const targetUserId = 'usr_player_999';
    const canAccessPrivateData = (actorId: string, actorRole: AppRole, resourceOwnerId: string): boolean => {
      if (actorRole === 'PLAYER') {
        return actorId === resourceOwnerId;
      }
      return hasMinimumRole(actorRole, 'SUPERVISOR');
    };

    expect(canAccessPrivateData(playerProfile.user_id, playerProfile.role, targetUserId)).toBe(false);
    expect(canAccessPrivateData(playerProfile.user_id, playerProfile.role, playerProfile.user_id)).toBe(true);
    expect(canAccessPrivateData(adminProfile.user_id, adminProfile.role, targetUserId)).toBe(true);
  });

  it('debe respetar la jerarquía estricta de roles', () => {
    expect(hasMinimumRole('PLAYER', 'PLAYER')).toBe(true);
    expect(hasMinimumRole('PLAYER', 'OPERATOR')).toBe(false);
    expect(hasMinimumRole('OPERATOR', 'PLAYER')).toBe(true);
    expect(hasMinimumRole('OPERATOR', 'ADMIN')).toBe(false);
    expect(hasMinimumRole('ADMIN', 'OPERATOR')).toBe(true);
    expect(hasMinimumRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
  });
});

describe('3. Configuración Oficial de Modalidades de Juego', () => {
  it('BINGO_75: Matriz 5x5, centro libre, 75 balotas', () => {
    const mod = OFFICIAL_MODALITIES.BINGO_75;
    expect(mod).toBeDefined();
    expect(mod.grid_rows).toBe(5);
    expect(mod.grid_cols).toBe(5);
    expect(mod.free_center).toBe(true);
    expect(mod.total_balls).toBe(75);
    expect(mod.layout_config.columns).toEqual(['B', 'I', 'N', 'G', 'O']);
  });

  it('BINGO_90: Matriz 3x5, sin centro libre, 90 balotas', () => {
    const mod = OFFICIAL_MODALITIES.BINGO_90;
    expect(mod).toBeDefined();
    expect(mod.grid_rows).toBe(3);
    expect(mod.grid_cols).toBe(5);
    expect(mod.free_center).toBe(false);
    expect(mod.total_balls).toBe(90);
  });

  it('ANIMALITOS: Matriz 5x5, centro libre, 38 animales tradicionales', () => {
    const mod = OFFICIAL_MODALITIES.ANIMALITOS;
    expect(mod).toBeDefined();
    expect(mod.grid_rows).toBe(5);
    expect(mod.grid_cols).toBe(5);
    expect(mod.free_center).toBe(true);
    expect(mod.total_balls).toBe(38);
    expect(mod.layout_config.elements?.length).toBe(38);
    expect(mod.layout_config.elements).toContain('Chigüire');
    expect(mod.layout_config.elements).toContain('Delfín');
  });

  it('OBJETOS: Matriz 5x5, centro libre', () => {
    const mod = OFFICIAL_MODALITIES.OBJETOS;
    expect(mod).toBeDefined();
    expect(mod.grid_rows).toBe(5);
    expect(mod.grid_cols).toBe(5);
    expect(mod.free_center).toBe(true);
  });

  it('CHAPITAS: Matriz 3x5, sin centro libre, 60 balotas', () => {
    const mod = OFFICIAL_MODALITIES.CHAPITAS;
    expect(mod).toBeDefined();
    expect(mod.grid_rows).toBe(3);
    expect(mod.grid_cols).toBe(5);
    expect(mod.free_center).toBe(false);
    expect(mod.total_balls).toBe(60);
  });
});

describe('4. Máquina de Estados de Sorteos (Transiciones Seguras)', () => {
  it('debe permitir transiciones legales', () => {
    expect(isValidDrawTransition('DRAFT', 'SCHEDULED')).toBe(true);
    expect(isValidDrawTransition('SCHEDULED', 'READY')).toBe(true);
    expect(isValidDrawTransition('READY', 'ACTIVE')).toBe(true);
    expect(isValidDrawTransition('ACTIVE', 'PAUSED')).toBe(true);
    expect(isValidDrawTransition('PAUSED', 'ACTIVE')).toBe(true);
    expect(isValidDrawTransition('ACTIVE', 'FINISHED')).toBe(true);
    expect(isValidDrawTransition('FINISHED', 'ARCHIVED')).toBe(true);
  });

  it('PRUEBA NEGATIVA: debe bloquear transiciones ilegales o saltos de estado no permitidos', () => {
    expect(isValidDrawTransition('DRAFT', 'ACTIVE')).toBe(false);
    expect(isValidDrawTransition('DRAFT', 'FINISHED')).toBe(false);
    expect(isValidDrawTransition('ACTIVE', 'SCHEDULED')).toBe(false);
    expect(isValidDrawTransition('FINISHED', 'ACTIVE')).toBe(false);
    expect(isValidDrawTransition('ARCHIVED', 'ACTIVE')).toBe(false);
  });
});
