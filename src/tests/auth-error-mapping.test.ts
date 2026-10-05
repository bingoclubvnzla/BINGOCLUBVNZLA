import { describe, it, expect } from 'vitest';
import { getFriendlyAuthErrorMessage } from '../lib/supabase';

describe('Mapeo de Errores Amigables - Protección de Fuga de Información', () => {
  it('no debe exponer stack traces, tokens ni consultas SQL en el mensaje al usuario', () => {
    const rawSqlError = {
      message: 'Database error: relation "public.profiles" violates foreign key constraint auth_users_id_fkey at postgres.c:1245',
    };
    const friendly = getFriendlyAuthErrorMessage(rawSqlError);
    expect(friendly).not.toContain('foreign key');
    expect(friendly).not.toContain('postgres.c');
    expect(friendly).not.toContain('public.profiles');
  });

  it('debe mapear errores comunes a mensajes comprensibles en español', () => {
    expect(
      getFriendlyAuthErrorMessage({ message: 'Invalid login credentials' })
    ).toBe('Credenciales incorrectas. Verifique su correo electrónico y contraseña.');

    expect(
      getFriendlyAuthErrorMessage({ message: 'User already registered' })
    ).toBe('Ya existe una cuenta registrada con este correo electrónico.');

    expect(
      getFriendlyAuthErrorMessage({ message: 'Password should be at least 6 characters' })
    ).toBe('La contraseña debe contener al menos 6 caracteres seguros.');
  });
});
