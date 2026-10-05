import { describe, it, expect } from 'vitest';
import { 
  validateVenezuelanPhone, 
  validatePasswordStrength, 
  validatePublicPlayerId, 
  isValidDrawTransition,
  formatSafeErrorMessage,
  hasMinimumRole,
  isOperatorOrHigher,
  isAdminOrHigher
} from '../src/lib/security';
import { DrawStatus, UserRole } from '../src/types';

describe('Security Layer — Validaciones & Reglas Antifraude', () => {
  describe('Validación de Teléfono Móvil Venezolano', () => {
    it('debe aceptar números venezolanos válidos con código nacional (0414, 0412, etc.)', () => {
      const res1 = validateVenezuelanPhone('04141234567');
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe('+584141234567');

      const res2 = validateVenezuelanPhone('04129876543');
      expect(res2.isValid).toBe(true);
      expect(res2.normalized).toBe('+584129876543');

      const res3 = validateVenezuelanPhone('+58 416 1112233');
      expect(res3.isValid).toBe(true);
      expect(res3.normalized).toBe('+584161112233');
    });

    it('debe rechazar números con operadoras o formatos inválidos', () => {
      const res1 = validateVenezuelanPhone('04991234567'); // 0499 no existe
      expect(res1.isValid).toBe(false);

      const res2 = validateVenezuelanPhone('12345'); // muy corto
      expect(res2.isValid).toBe(false);

      const res3 = validateVenezuelanPhone('');
      expect(res3.isValid).toBe(false);
    });
  });

  describe('Validación de Robustez de Contraseña', () => {
    it('debe aceptar contraseñas que cumplan con la política de seguridad', () => {
      const res = validatePasswordStrength('BingoVnzla$2026');
      expect(res.isValid).toBe(true);
    });

    it('debe rechazar contraseñas débiles o incompletas', () => {
      expect(validatePasswordStrength('12345').isValid).toBe(false); // < 8
      expect(validatePasswordStrength('solominusc').isValid).toBe(false); // sin mayus ni num
      expect(validatePasswordStrength('SOLOMAYUSC').isValid).toBe(false); // sin minus ni num
      expect(validatePasswordStrength('SinEspecial123').isValid).toBe(false); // sin caracter especial
    });
  });

  describe('Formato de Identificador Público BCV-XXXXXX', () => {
    it('debe validar identificadores conformes a la especificación', () => {
      expect(validatePublicPlayerId('BCV-A79B12')).toBe(true);
      expect(validatePublicPlayerId('BCV-000000')).toBe(true);
      expect(validatePublicPlayerId('BCV-FFFFFF')).toBe(true);
    });

    it('debe rechazar formatos que filtren información o no cumplan la estructura', () => {
      expect(validatePublicPlayerId('user@email.com')).toBe(false);
      expect(validatePublicPlayerId('bcv-lowercase')).toBe(false);
      expect(validatePublicPlayerId('BCV-123')).toBe(false); // longitud errónea
      expect(validatePublicPlayerId('UUID-39849283-9382')).toBe(false);
    });
  });

  describe('Máquina de Estados de Sorteos (draw_status)', () => {
    it('debe permitir secuencias canónicas válidas', () => {
      expect(isValidDrawTransition('DRAFT', 'SCHEDULED')).toBe(true);
      expect(isValidDrawTransition('SCHEDULED', 'READY')).toBe(true);
      expect(isValidDrawTransition('READY', 'ACTIVE')).toBe(true);
      expect(isValidDrawTransition('ACTIVE', 'PAUSED')).toBe(true);
      expect(isValidDrawTransition('PAUSED', 'ACTIVE')).toBe(true);
      expect(isValidDrawTransition('ACTIVE', 'FINISHED')).toBe(true);
      expect(isValidDrawTransition('FINISHED', 'ARCHIVED')).toBe(true);
    });

    it('debe RECHAZAR saltos de estado arbitrarios o ilegítimos (Negative tests)', () => {
      // Un sorteo en DRAFT no puede saltar directo a ACTIVE ni FINISHED
      expect(isValidDrawTransition('DRAFT', 'ACTIVE')).toBe(false);
      expect(isValidDrawTransition('DRAFT', 'FINISHED')).toBe(false);

      // Un sorteo ARCHIVED no puede volver a estar ACTIVE
      expect(isValidDrawTransition('ARCHIVED', 'ACTIVE')).toBe(false);
      expect(isValidDrawTransition('FINISHED', 'ACTIVE')).toBe(false);
    });
  });

  describe('Sanitización de Mensajes de Error (Sin fuga de SQL, JWT ni Stack Traces)', () => {
    it('debe enmascarar errores de base de datos o sintaxis SQL', () => {
      const sqlError = new Error('syntax error at or near "SELECT" in pg_catalog');
      const safe = formatSafeErrorMessage(sqlError);
      expect(safe).not.toContain('syntax error');
      expect(safe).not.toContain('pg_catalog');
    });

    it('debe enmascarar errores con tokens JWT o credenciales', () => {
      const jwtError = new Error('invalid signature for JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      const safe = formatSafeErrorMessage(jwtError);
      expect(safe).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(safe).toContain('sesión ha expirado');
    });
  });
});
