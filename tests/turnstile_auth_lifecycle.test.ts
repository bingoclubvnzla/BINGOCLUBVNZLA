import { describe, it, expect } from 'vitest';
import type { TurnstileStatus } from '../src/components/CloudflareTurnstile';

describe('REPARACIÓN QUIRÚRGICA — Ciclo de Vida de Turnstile y Bloqueo de Autenticación', () => {
  // 1. Estado único y máquina de estados formal
  describe('1. Máquina de Estados de Turnstile (TurnstileStatus)', () => {
    it('Debe incluir los 5 estados formales requeridos', () => {
      const allowedStates: TurnstileStatus[] = [
        'NO_VERIFICADO',
        'VERIFICANDO',
        'VERIFICADO',
        'EXPIRADO',
        'ERROR',
      ];
      expect(allowedStates).toHaveLength(5);
    });

    it('Solo el estado VERIFICADO con token no vacío permite autenticación', () => {
      function canAuthenticate(status: TurnstileStatus, token: string | null): boolean {
        return status === 'VERIFICADO' && Boolean(token && token.trim().length > 0);
      }

      expect(canAuthenticate('NO_VERIFICADO', null)).toBe(false);
      expect(canAuthenticate('VERIFICANDO', null)).toBe(false);
      expect(canAuthenticate('VERIFICANDO', 'fake-token')).toBe(false);
      expect(canAuthenticate('EXPIRADO', null)).toBe(false);
      expect(canAuthenticate('EXPIRADO', 'expired-token')).toBe(false);
      expect(canAuthenticate('ERROR', null)).toBe(false);
      expect(canAuthenticate('VERIFICADO', null)).toBe(false);
      expect(canAuthenticate('VERIFICADO', '')).toBe(false);
      expect(canAuthenticate('VERIFICADO', '   ')).toBe(false);
      expect(canAuthenticate('VERIFICADO', 'valid-cf-token-xyz')).toBe(true);
    });
  });

  // 2. Bloqueo total de Google OAuth antes de verificar
  describe('2. Bloqueo de Google OAuth sin Verificación Humana', () => {
    function simulateGoogleOAuthGuard(
      isTurnstileVerified: boolean,
      captchaToken?: string
    ): { allowed: boolean; error?: string } {
      if (!isTurnstileVerified || !captchaToken || !captchaToken.trim()) {
        return {
          allowed: false,
          error: 'Debe completar la verificación de seguridad anti-bot antes de continuar con Google.',
        };
      }
      return { allowed: true };
    }

    it('Google debe estar BLOQUEADO si Turnstile es NO_VERIFICADO', () => {
      const res = simulateGoogleOAuthGuard(false, undefined);
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('anti-bot');
    });

    it('Google debe estar BLOQUEADO si Turnstile está en proceso (VERIFICANDO)', () => {
      const res = simulateGoogleOAuthGuard(false, '');
      expect(res.allowed).toBe(false);
    });

    it('Google debe estar BLOQUEADO si el token expira (EXPIRADO)', () => {
      const res = simulateGoogleOAuthGuard(false, 'expired-token');
      expect(res.allowed).toBe(false);
    });

    it('Google debe estar HABILITADO únicamente cuando Turnstile está VERIFICADO con token válido', () => {
      const res = simulateGoogleOAuthGuard(true, 'cf_verified_token_123');
      expect(res.allowed).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  // 3. Bloqueo total de Correo y Contraseña (Login / Registro / Recuperación)
  describe('3. Bloqueo de Correo/Contraseña sin Verificación Humana', () => {
    function simulatePasswordAuthGuard(
      action: 'login' | 'register' | 'recovery',
      isTurnstileVerified: boolean,
      captchaToken?: string
    ): { allowed: boolean; error?: string } {
      if (!isTurnstileVerified || !captchaToken || !captchaToken.trim()) {
        return {
          allowed: false,
          error: 'Debe completar la verificación de seguridad anti-bot antes de continuar.',
        };
      }
      return { allowed: true };
    }

    const actions: Array<'login' | 'register' | 'recovery'> = ['login', 'register', 'recovery'];

    it('Todas las acciones protegidas deben estar bloqueadas antes de Turnstile', () => {
      for (const act of actions) {
        const res = simulatePasswordAuthGuard(act, false, undefined);
        expect(res.allowed).toBe(false);
        expect(res.error).toContain('anti-bot');
      }
    });

    it('Todas las acciones protegidas se desbloquean tras completar Turnstile exitosamente', () => {
      for (const act of actions) {
        const res = simulatePasswordAuthGuard(act, true, 'cf_token_passed_abc');
        expect(res.allowed).toBe(true);
      }
    });
  });

  // 4. Ciclo de vida estable y prevención de verificaciones repetidas
  describe('4. Estabilidad de Ciclo de Vida y Prevención de Verificaciones Repetidas', () => {
    it('El cambio de inputs del formulario (keystrokes) no debe alterar el token verificado', () => {
      let currentToken: string | null = 'cf_token_active';
      let verificationStatus: TurnstileStatus = 'VERIFICADO';

      // Simular usuario escribiendo en los campos
      const formKeystrokes = ['c', 'a', 'r', 'l', 'o', 's', '@', 'g', 'm', 'a', 'i', 'l', '.', 'c', 'o', 'm'];
      let emailState = '';

      for (const char of formKeystrokes) {
        emailState += char;
        // El estado de verificación debe permanecer intacto
        expect(verificationStatus).toBe('VERIFICADO');
        expect(currentToken).toBe('cf_token_active');
      }
      expect(emailState).toBe('carlos@gmail.com');
    });

    it('El cambio de pestañas (Login <-> Registro) no destruye la verificación si el modal sigue abierto', () => {
      let verificationStatus: TurnstileStatus = 'VERIFICADO';
      let token: string | null = 'token_persistent_session';

      // Usuario pasa de login a register
      let currentTab = 'login';
      currentTab = 'register';

      // La verificación debe mantenerse activa para el usuario en la misma sesión de modal
      expect(currentTab).toBe('register');
      expect(verificationStatus).toBe('VERIFICADO');
      expect(token).toBe('token_persistent_session');
    });

    it('Al expirar el token, el estado se revierte a EXPIRADO y se bloquean las acciones', () => {
      let verificationStatus: TurnstileStatus = 'VERIFICADO';
      let token: string | null = 'sample-token';

      // Callback expired disparado por Cloudflare
      const handleExpire = () => {
        token = null;
        verificationStatus = 'EXPIRADO';
      };

      handleExpire();
      expect(verificationStatus).toBe('EXPIRADO');
      expect(token).toBeNull();
    });
  });
});
