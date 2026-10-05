// tests/profile-protection.test.ts
// Pruebas negativas y de validación de mutaciones de perfil (Inmutabilidad de roles)

import { describe, it, expect } from 'vitest';
import { validateProfileMutationPayload } from '../src/lib/rbac';

describe('Protección e Inmutabilidad de Perfil (Anti-Privilege Escalation)', () => {
  it('debe RECHAZAR cuando un PLAYER intenta modificar su propio rol', () => {
    const maliciousPayload = {
      role: 'ADMIN',
    };
    const result = validateProfileMutationPayload(maliciousPayload, 'PLAYER');
    expect(result.valid).toBe(false);
    expect(result.violation).toContain("El campo 'role' no puede ser alterado");
  });

  it('debe RECHAZAR cuando un PLAYER intenta modificar su estado de cuenta', () => {
    const maliciousPayload = {
      status: 'ACTIVE',
    };
    const result = validateProfileMutationPayload(maliciousPayload, 'PLAYER');
    expect(result.valid).toBe(false);
    expect(result.violation).toContain("El campo 'status' no puede ser alterado");
  });

  it('debe RECHAZAR cuando un PLAYER intenta alterar su nivel de seguridad', () => {
    const maliciousPayload = {
      security_level: 5,
    };
    const result = validateProfileMutationPayload(maliciousPayload, 'PLAYER');
    expect(result.valid).toBe(false);
    expect(result.violation).toContain("El campo 'security_level' no puede ser alterado");
  });

  it('debe RECHAZAR cuando un PLAYER intenta alterar su identificador público BCV', () => {
    const maliciousPayload = {
      public_id: 'BCV-000001',
    };
    const result = validateProfileMutationPayload(maliciousPayload, 'PLAYER');
    expect(result.valid).toBe(false);
    expect(result.violation).toContain("El campo 'public_id' no puede ser alterado");
  });

  it('debe PERMITIR que un PLAYER modifique su display_name y teléfono', () => {
    const legalPayload = {
      display_name: 'Carlos Vnzla',
      phone: '+58 412 9998877',
    };
    const result = validateProfileMutationPayload(legalPayload, 'PLAYER');
    expect(result.valid).toBe(true);
    expect(result.violation).toBeUndefined();
  });

  it('un ADMIN sí posee autorización para alterar roles de usuarios en el sistema', () => {
    const adminPayload = {
      role: 'OPERATOR',
      status: 'ACTIVE',
    };
    const result = validateProfileMutationPayload(adminPayload, 'ADMIN');
    expect(result.valid).toBe(true);
  });
});
