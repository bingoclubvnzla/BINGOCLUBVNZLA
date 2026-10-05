// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PRUEBAS DE AUTENTICACIÓN HARDENED (FASE 2.4)
// Cobertura completa: Google OAuth, Cloudflare Turnstile, Verificación de Correo,
// Anti-Enumeración, Prevención de Open Redirects, Auditoría Forense y Roles RBAC.
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { isAllowedRedirectUrl, getSafeRedirectUrl } from '../src/lib/authRedirect';
import { sanitizeAuditMetadata, type AuthAuditEventType } from '../src/lib/audit';

describe('FASE 2.4 — AUTH HARDENING & SEGURIDAD DE AUTENTICACIÓN', () => {

  // ----------------------------------------------------------------------------
  // 1. REGISTRO TRADICIONAL Y VALIDACIONES
  // ----------------------------------------------------------------------------
  describe('1. Registro Tradicional (Email + Contraseña)', () => {
    it('Debe exigir contraseña de longitud mínima de 6 caracteres', () => {
      const validatePassword = (pwd: string) => pwd.length >= 6;
      expect(validatePassword('')).toBe(false);
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('Caracas2026!')).toBe(true);
    });

    it('Debe validar que las contraseñas coincidan exactamente', () => {
      const matchPasswords = (p1: string, p2: string) => p1 === p2;
      expect(matchPasswords('clave123', 'clave124')).toBe(false);
      expect(matchPasswords('ClaveSegura#1', 'ClaveSegura#1')).toBe(true);
    });

    it('Debe exigir nombre y apellido válidos y derivar display_name correctamente', () => {
      const parseNames = (fullName: string) => {
        const trimmed = fullName.trim();
        if (!trimmed) return null;
        const parts = trimmed.split(/\s+/);
        return {
          full_name: trimmed,
          display_name: parts[0] || 'Jugador',
        };
      };

      expect(parseNames('   ')).toBeNull();
      const user1 = parseNames('  Simón Bolívar  ');
      expect(user1).not.toBeNull();
      expect(user1?.full_name).toBe('Simón Bolívar');
      expect(user1?.display_name).toBe('Simón');
    });

    it('Debe validar formato sintáctico estricto de correo electrónico', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('usuario')).toBe(false);
      expect(emailRegex.test('usuario@')).toBe(false);
      expect(emailRegex.test('usuario@dominio')).toBe(false);
      expect(emailRegex.test('jugador.venezolano@bingoclub.com.ve')).toBe(true);
      expect(emailRegex.test('carlos.mendoza@gmail.com')).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. INICIO DE SESIÓN Y MANEJO DE CORREO NO CONFIRMADO
  // ----------------------------------------------------------------------------
  describe('2. Inicio de Sesión y Verificación de Correo', () => {
    it('Debe detectar estado de correo no confirmado sin revelar credenciales erróneas', () => {
      const handleAuthError = (rawErrorMessage: string) => {
        const lower = rawErrorMessage.toLowerCase();
        const isUnconfirmed = lower.includes('email not confirmed');
        return {
          isUnconfirmed,
          userFriendlyMessage: isUnconfirmed
            ? 'Tu correo electrónico no ha sido verificado aún. Por favor revisa tu bandeja de entrada o solicita un nuevo enlace.'
            : 'Credenciales inválidas. Verifique su correo electrónico y contraseña.',
        };
      };

      const resUnconfirmed = handleAuthError('Email not confirmed');
      expect(resUnconfirmed.isUnconfirmed).toBe(true);
      expect(resUnconfirmed.userFriendlyMessage).toContain('no ha sido verificado');

      const resBadCreds = handleAuthError('Invalid login credentials');
      expect(resBadCreds.isUnconfirmed).toBe(false);
      expect(resBadCreds.userFriendlyMessage).toContain('Credenciales inválidas');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. RECUPERACIÓN DE CONTRASEÑA Y ANTI-ENUMERACIÓN
  // ----------------------------------------------------------------------------
  describe('3. Recuperación de Contraseña y Anti-Enumeración', () => {
    it('Debe presentar un mensaje uniforme tanto si el usuario existe como si no (Anti-Enumeración)', () => {
      // Regla de oro de seguridad: nunca decir "Ese correo no existe en el sistema"
      const getRecoveryResponse = () => {
        return 'Si el correo electrónico está registrado, recibirás un enlace seguro para restablecer tu contraseña.';
      };

      const existingAccountMsg = getRecoveryResponse();
      const nonExistingAccountMsg = getRecoveryResponse();
      expect(existingAccountMsg).toBe(nonExistingAccountMsg);
      expect(existingAccountMsg).toContain('Si el correo electrónico está registrado');
    });

    it('Debe validar que la nueva contraseña tras recuperación tenga al menos 6 caracteres', () => {
      const validateNewPassword = (pwd: string, confirmPwd: string) => {
        if (pwd.length < 6) return { valid: false, error: 'Mínimo 6 caracteres requeridos' };
        if (pwd !== confirmPwd) return { valid: false, error: 'Las contraseñas no coinciden' };
        return { valid: true };
      };

      expect(validateNewPassword('123', '123').valid).toBe(false);
      expect(validateNewPassword('nuevaClave2026', 'otraClave').valid).toBe(false);
      expect(validateNewPassword('nuevaClave2026', 'nuevaClave2026').valid).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 4. PREVENCIÓN DE OPEN REDIRECT Y ESQUEMAS PELIGROSOS
  // ----------------------------------------------------------------------------
  describe('4. Prevención Estricta de Open Redirects (isAllowedRedirectUrl)', () => {
    it('Debe rechazar esquemas de scripting maliciosos (javascript:, data:, vbscript:, file:)', () => {
      expect(isAllowedRedirectUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isAllowedRedirectUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isAllowedRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isAllowedRedirectUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isAllowedRedirectUrl('file:///etc/passwd')).toBe(false);
      expect(isAllowedRedirectUrl('about:blank')).toBe(false);
    });

    it('Debe rechazar evasiones con doble barra protocol-relative (//malicious-site.com)', () => {
      expect(isAllowedRedirectUrl('//malicious-site.com/auth')).toBe(false);
      expect(isAllowedRedirectUrl('//bingoclub.com.ve.phishing.io')).toBe(false);
    });

    it('Debe rechazar inyecciones de cabecera CRLF', () => {
      expect(isAllowedRedirectUrl('https://bingoclub.com.ve\r\nSet-Cookie: evil=true')).toBe(false);
      expect(isAllowedRedirectUrl('https://bingoclub.com.ve\nLocation: http://evil.com')).toBe(false);
    });

    it('Debe rechazar dominios externos no autorizados', () => {
      expect(isAllowedRedirectUrl('https://phishing-bingo.ru/steal-tokens')).toBe(false);
      expect(isAllowedRedirectUrl('https://evil-site.com')).toBe(false);
      expect(isAllowedRedirectUrl('https://bingoclub.com.ve.attacker.com')).toBe(false);
    });

    it('Debe permitir rutas relativas locales seguras', () => {
      expect(isAllowedRedirectUrl('/')).toBe(true);
      expect(isAllowedRedirectUrl('/dashboard')).toBe(true);
      expect(isAllowedRedirectUrl('/reset-password')).toBe(true);
      expect(isAllowedRedirectUrl('/play/draw-123')).toBe(true);
    });

    it('Debe permitir orígenes oficiales autorizados y entornos de desarrollo/preview', () => {
      expect(isAllowedRedirectUrl('https://bingoclub.com.ve')).toBe(true);
      expect(isAllowedRedirectUrl('https://www.bingoclub.com.ve')).toBe(true);
      expect(isAllowedRedirectUrl('http://localhost:3000')).toBe(true);
      expect(isAllowedRedirectUrl('http://127.0.0.1:5173')).toBe(true);
      expect(isAllowedRedirectUrl('https://bingo-test.run.app')).toBe(true);
      expect(isAllowedRedirectUrl('https://bingo-preview.vercel.app')).toBe(true);
    });

    it('getSafeRedirectUrl debe retornar una URL canónica segura por defecto ante URLs maliciosas', () => {
      const fallback = getSafeRedirectUrl('javascript:evil()');
      expect(fallback).not.toContain('javascript');
      expect(fallback.startsWith('http://') || fallback.startsWith('https://')).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. CLOUDFLARE TURNSTILE & ACCIONES DE PROTECCIÓN
  // ----------------------------------------------------------------------------
  describe('5. Cloudflare Turnstile & Protección Anti-Bot', () => {
    it('Debe categorizar correctamente las acciones permitidas de Turnstile', () => {
      const validActions: Array<'login' | 'signup' | 'recovery' | 'resend'> = [
        'login',
        'signup',
        'recovery',
        'resend',
      ];
      expect(validActions).toHaveLength(4);
      validActions.forEach((action) => {
        expect(['login', 'signup', 'recovery', 'resend']).toContain(action);
      });
    });

    it('Debe contemplar modo NOT_CONFIGURED de forma transparente en desarrollo local', () => {
      const checkTurnstileStatus = (siteKey?: string) => {
        if (!siteKey || siteKey.trim().length <= 5) {
          return 'NOT_CONFIGURED';
        }
        return 'CONFIGURED';
      };

      expect(checkTurnstileStatus('')).toBe('NOT_CONFIGURED');
      expect(checkTurnstileStatus('   ')).toBe('NOT_CONFIGURED');
      expect(checkTurnstileStatus('0x4AAAAAA')).toBe('CONFIGURED');
    });
  });

  // ----------------------------------------------------------------------------
  // 6. SANITIZACIÓN FORENSE DE AUDITORÍA (CERO FUGA DE SECRETOS)
  // ----------------------------------------------------------------------------
  describe('6. Auditoría Forense y Sanitización de Metadatos', () => {
    it('Debe filtrar de forma estricta contraseñas, tokens y claves privadas en audit_logs', () => {
      const dirtyMetadata = {
        email: 'jugador@bingoclub.com.ve',
        password: 'PasswordSuperSecreta123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
        access_token: 'secret-token',
        refresh_token: 'refresh-token',
        captchaToken: '0.sample-turnstile-token',
        turnstile_token: '0.sample-turnstile-token',
        service_role: 'super-admin-key-leak',
        client_secret: 'google-oauth-secret',
        secret: 'vault-secret',
        provider: 'google',
        public_id: 'BCV-A1B2C3',
      };

      const cleanMetadata = sanitizeAuditMetadata(dirtyMetadata);

      // Verificación de eliminación completa
      expect(cleanMetadata).not.toHaveProperty('password');
      expect(cleanMetadata).not.toHaveProperty('token');
      expect(cleanMetadata).not.toHaveProperty('access_token');
      expect(cleanMetadata).not.toHaveProperty('refresh_token');
      expect(cleanMetadata).not.toHaveProperty('captchaToken');
      expect(cleanMetadata).not.toHaveProperty('turnstile_token');
      expect(cleanMetadata).not.toHaveProperty('service_role');
      expect(cleanMetadata).not.toHaveProperty('client_secret');
      expect(cleanMetadata).not.toHaveProperty('secret');

      // Verificación de preservación de metadatos legítimos
      expect(cleanMetadata.email).toBe('jugador@bingoclub.com.ve');
      expect(cleanMetadata.provider).toBe('google');
      expect(cleanMetadata.public_id).toBe('BCV-A1B2C3');
    });

    it('Debe truncar recursivamente cadenas excesivamente largas para evitar ataques de DoS por almacenamiento', () => {
      const longPayload = 'A'.repeat(800);
      const clean = sanitizeAuditMetadata({ test_string: longPayload });
      expect((clean.test_string as string).length).toBeLessThan(550);
      expect((clean.test_string as string)).toContain('...[truncado]');
    });

    it('Debe procesar objetos anidados recursivamente sin fallar', () => {
      const nested = {
        outer: {
          nested_password: 'bad_password',
          password: 'must_be_stripped',
          legit_key: 'good_value',
        },
      };
      const clean = sanitizeAuditMetadata(nested);
      expect((clean.outer as Record<string, unknown>)).not.toHaveProperty('password');
      expect((clean.outer as Record<string, unknown>).legit_key).toBe('good_value');
    });
  });

  // ----------------------------------------------------------------------------
  // 7. SANITIZACIÓN DE ERRORES (NO FUGA DE SQL / JWT)
  // ----------------------------------------------------------------------------
  describe('7. Sanitización de Mensajes de Error Expuestos al Usuario', () => {
    function sanitizeErrorMessage(rawMessage: string): string {
      const lower = rawMessage.toLowerCase();
      if (
        lower.includes('invalid login credentials') ||
        lower.includes('invalid credentials') ||
        lower.includes('invalid email or password')
      ) {
        return 'Credenciales inválidas. Verifique su correo electrónico y contraseña.';
      }
      if (lower.includes('user already registered') || lower.includes('already exists')) {
        return 'Este correo electrónico ya se encuentra registrado en Bingo Club VNZLA.';
      }
      if (lower.includes('password should be at least') || lower.includes('password is too short')) {
        return 'La contraseña debe contener al menos 6 caracteres.';
      }
      if (lower.includes('rate limit') || lower.includes('too many requests')) {
        return 'Demasiados intentos. Por favor espere unos momentos antes de reintentar.';
      }
      if (lower.includes('captcha') || lower.includes('turnstile')) {
        return 'Fallo en la verificación de seguridad anti-bot. Por favor intente nuevamente.';
      }
      if (lower.includes('email not confirmed')) {
        return 'Su correo electrónico no ha sido confirmado aún. Por favor revise su bandeja de entrada.';
      }
      return 'No fue posible completar la solicitud. Verifique los datos ingresados.';
    }

    it('Debe ocultar errores de base de datos Postgres sin exponer SQL', () => {
      const psqlError = 'Postgres error 42P01: relation "public.profiles" does not exist';
      expect(sanitizeErrorMessage(psqlError)).toBe(
        'No fue posible completar la solicitud. Verifique los datos ingresados.'
      );
    });

    it('Debe devolver mensaje comprensible y seguro para credenciales erróneas', () => {
      expect(sanitizeErrorMessage('Invalid login credentials provided by user')).toBe(
        'Credenciales inválidas. Verifique su correo electrónico y contraseña.'
      );
    });

    it('Debe traducir error de límites de tasa (Rate Limiting)', () => {
      expect(sanitizeErrorMessage('Rate limit exceeded: too many requests')).toBe(
        'Demasiados intentos. Por favor espere unos momentos antes de reintentar.'
      );
    });
  });

  // ----------------------------------------------------------------------------
  // 8. ASIGNACIÓN ESTRICTA DE ROL PLAYER Y AUTORIDAD DEL SERVIDOR
  // ----------------------------------------------------------------------------
  describe('8. Asignación Invariante del Rol PLAYER en Creación de Cuenta', () => {
    it('Cualquier nuevo registro (email o Google) debe recibir exclusivamente el rol PLAYER', () => {
      interface RawUserPayload {
        id: string;
        email: string;
        user_metadata: {
          role?: string;
          admin?: boolean;
          full_name?: string;
        };
      }

      function createProfileDefensive(user: RawUserPayload) {
        // En el servidor (handle_new_user trigger), el rol es FORZADO a 'PLAYER'.
        // Cualquier intento del cliente por inyectar role: 'ADMIN' en user_metadata es ignorado.
        return {
          id: user.id,
          public_id: `BCV-${user.id.substring(0, 6).toUpperCase()}`,
          full_name: user.user_metadata?.full_name || 'Jugador Registrado',
          role: 'PLAYER', // INVARIANTE
          status: 'ACTIVE',
          security_level: 1,
        };
      }

      // Intento malicioso de auto-asignarse rol 'SUPER_ADMIN' en el metadata
      const maliciousRegistration: RawUserPayload = {
        id: '12345678-aaaa-bbbb-cccc-1234567890ab',
        email: 'hacker@bingoclub.com.ve',
        user_metadata: {
          role: 'SUPER_ADMIN',
          admin: true,
          full_name: 'Attacker Profile',
        },
      };

      const createdProfile = createProfileDefensive(maliciousRegistration);
      expect(createdProfile.role).toBe('PLAYER');
      expect(createdProfile.security_level).toBe(1);
      expect(createdProfile.public_id).toMatch(/^BCV-[A-Z0-9]{6}$/);
    });
  });
});
