import { describe, it, expect } from 'vitest';
import {
  hasMinimumRole,
  canAccessOperator,
  canAccessAdmin,
  isValidPublicId,
  canTransitionDrawStatus,
  generateIdempotencyKey,
  validatePasswordStrength,
  maskEmail,
} from '../src/lib/security';
import { AppRole, DrawStatus } from '../src/types/database';

describe('Seguridad y Modelo RBAC (Control de Acceso Basado en Roles)', () => {
  it('Debe jerarquizar correctamente los roles del sistema', () => {
    expect(hasMinimumRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
    expect(hasMinimumRole('ADMIN', 'SUPERVISOR')).toBe(true);
    expect(hasMinimumRole('SUPERVISOR', 'OPERATOR')).toBe(true);
    expect(hasMinimumRole('OPERATOR', 'PLAYER')).toBe(true);
    expect(hasMinimumRole('PLAYER', 'PLAYER')).toBe(true);
  });

  describe('Pruebas Negativas de Autorización', () => {
    it('PLAYER intenta acceder a funciones de OPERATOR: DEBE FALLAR', () => {
      const playerRole: AppRole = 'PLAYER';
      expect(canAccessOperator(playerRole)).toBe(false);
    });

    it('PLAYER intenta acceder a funciones de ADMIN: DEBE FALLAR', () => {
      const playerRole: AppRole = 'PLAYER';
      expect(canAccessAdmin(playerRole)).toBe(false);
    });

    it('OPERATOR intenta auto-asignarse privilegios de ADMIN: DEBE FALLAR', () => {
      const operatorRole: AppRole = 'OPERATOR';
      expect(canAccessAdmin(operatorRole)).toBe(false);
    });

    it('Función simulada de actualización de perfil bloquea la mutación de campos de seguridad si no es ADMIN', () => {
      // Simulación de la regla del trigger PostgreSQL check_profile_immutable_fields
      const attemptProfileUpdate = (
        actorRole: AppRole,
        proposedChanges: { role?: AppRole; status?: string; display_name?: string }
      ) => {
        if (proposedChanges.role && !['ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
          throw new Error('Acción denegada: No posee privilegios administrativos para modificar atributos de seguridad.');
        }
        return { success: true, updated: proposedChanges };
      };

      // Jugador intenta modificar su propio rol a ADMIN
      expect(() => {
        attemptProfileUpdate('PLAYER', { role: 'ADMIN' });
      }).toThrow(/privilegios administrativos/);

      // Jugador modifica su display_name (permitido)
      const allowedUpdate = attemptProfileUpdate('PLAYER', { display_name: 'NuevoApodo' });
      expect(allowedUpdate.success).toBe(true);
    });
  });
});

describe('Máquina de Estados de Sorteos (Draws State Machine)', () => {
  it('Permite transiciones legales definidas en la arquitectura', () => {
    expect(canTransitionDrawStatus('DRAFT', 'SCHEDULED')).toBe(true);
    expect(canTransitionDrawStatus('SCHEDULED', 'READY')).toBe(true);
    expect(canTransitionDrawStatus('READY', 'ACTIVE')).toBe(true);
    expect(canTransitionDrawStatus('ACTIVE', 'PAUSED')).toBe(true);
    expect(canTransitionDrawStatus('PAUSED', 'ACTIVE')).toBe(true);
    expect(canTransitionDrawStatus('ACTIVE', 'FINISHED')).toBe(true);
    expect(canTransitionDrawStatus('FINISHED', 'ARCHIVED')).toBe(true);
  });

  describe('Pruebas Negativas de Estados de Sorteos', () => {
    it('Transición ilegal desde DRAFT directamente a ACTIVE: DEBE FALLAR', () => {
      expect(canTransitionDrawStatus('DRAFT', 'ACTIVE')).toBe(false);
    });

    it('Transición ilegal desde FINISHED hacia SCHEDULED (Replay attack): DEBE FALLAR', () => {
      expect(canTransitionDrawStatus('FINISHED', 'SCHEDULED')).toBe(false);
    });

    it('Transición ilegal desde ARCHIVED hacia cualquier estado: DEBE FALLAR', () => {
      const allStates: DrawStatus[] = ['DRAFT', 'SCHEDULED', 'READY', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED'];
      for (const target of allStates) {
        expect(canTransitionDrawStatus('ARCHIVED', target)).toBe(false);
      }
    });
  });
});

describe('Identidad de Usuario Segura y Privacidad', () => {
  it('Valida el formato del identificador público BCV-XXXXXX', () => {
    expect(isValidPublicId('BCV-A8F2K9')).toBe(true);
    expect(isValidPublicId('BCV-77492X')).toBe(true);
    // Casos inválidos
    expect(isValidPublicId('carlos@gmail.com')).toBe(false);
    expect(isValidPublicId('12345')).toBe(false);
    expect(isValidPublicId('BCV-12')).toBe(false);
  });

  it('Enmascara correctamente el correo electrónico para evitar exposición en vistas públicas', () => {
    const masked = maskEmail('usuario123@gmail.com');
    expect(masked).not.toContain('usuario123');
    expect(masked).toBe('u***3@gmail.com');
  });

  it('Genera claves de idempotencia con formato UUIDv4 válido', () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(key1)).toBe(true);
    expect(uuidRegex.test(key2)).toBe(true);
    expect(key1).not.toBe(key2);
  });
});

describe('Políticas de Contraseña Segura', () => {
  it('Rechaza contraseñas débiles', () => {
    const short = validatePasswordStrength('abc');
    expect(short.isValid).toBe(false);

    const noNumbers = validatePasswordStrength('PasswordOnly');
    expect(noNumbers.isValid).toBe(false);

    const noUppercase = validatePasswordStrength('password123');
    expect(noUppercase.isValid).toBe(false);
  });

  it('Acepta contraseñas robustas', () => {
    const valid = validatePasswordStrength('BingoClub2026!');
    expect(valid.isValid).toBe(true);
    expect(valid.score).toBeGreaterThanOrEqual(3);
  });
});
