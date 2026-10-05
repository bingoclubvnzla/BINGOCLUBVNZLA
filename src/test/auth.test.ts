// ==============================================================================
// PRUEBAS AUTOMATIZADAS: AUTENTICACIÓN Y SANITIZACIÓN DE ERRORES
// ==============================================================================

import { describe, it, expect } from 'vitest';

describe('Flujos de Autenticación y Sanitización de Errores', () => {
  it('Debe validar que las contraseñas tengan longitud mínima de 6 caracteres', () => {
    const isPasswordValid = (pwd: string) => pwd.length >= 6;
    expect(isPasswordValid('12345')).toBe(false);
    expect(isPasswordValid('123456')).toBe(true);
    expect(isPasswordValid('ClaveSegura2026!')).toBe(true);
  });

  it('Debe validar formato de correo electrónico antes de enviar a Supabase', () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValidEmail('invalido')).toBe(false);
    expect(isValidEmail('usuario@')).toBe(false);
    expect(isValidEmail('jugador@bingoclub.com.ve')).toBe(true);
  });

  it('Debe sanitizar mensajes de error para no filtrar SQL, JWT ni trazas internas', () => {
    function sanitizeErrorMessage(rawMessage: string): string {
      const lower = rawMessage.toLowerCase();
      if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        return 'Credenciales inválidas. Verifique su correo electrónico y contraseña.';
      }
      if (lower.includes('jwt') || lower.includes('token') || lower.includes('signature')) {
        return 'Sesión expirada o no válida. Inicie sesión nuevamente.';
      }
      if (lower.includes('syntax error at or near') || lower.includes('relation') || lower.includes('psql')) {
        return 'Error de procesamiento en el servidor.';
      }
      return 'No fue posible completar la solicitud. Verifique los datos ingresados.';
    }

    expect(sanitizeErrorMessage('Invalid login credentials provided')).toBe(
      'Credenciales inválidas. Verifique su correo electrónico y contraseña.'
    );
    expect(sanitizeErrorMessage('JWT expired: eyJhbGciOi...')).toBe(
      'Sesión expirada o no válida. Inicie sesión nuevamente.'
    );
    expect(sanitizeErrorMessage('psql error: syntax error at or near SELECT * FROM')).toBe(
      'Error de procesamiento en el servidor.'
    );
  });
});
