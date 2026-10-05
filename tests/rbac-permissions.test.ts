// tests/rbac-permissions.test.ts
// Pruebas unitarias de Jerarquía y Control de Acceso Basado en Roles (RBAC)

import { describe, it, expect } from 'vitest';
import { 
  hasMinimumRole, isOperator, isSupervisor, isAdmin, isSuperAdmin, 
  ROLE_HIERARCHY 
} from '../src/lib/rbac';
import { UserRole } from '../src/types/database';

describe('Control de Acceso Basado en Roles (RBAC)', () => {
  it('debe mantener la jerarquía de roles estricta', () => {
    expect(ROLE_HIERARCHY.PLAYER).toBeLessThan(ROLE_HIERARCHY.OPERATOR);
    expect(ROLE_HIERARCHY.OPERATOR).toBeLessThan(ROLE_HIERARCHY.SUPERVISOR);
    expect(ROLE_HIERARCHY.SUPERVISOR).toBeLessThan(ROLE_HIERARCHY.ADMIN);
    expect(ROLE_HIERARCHY.ADMIN).toBeLessThan(ROLE_HIERARCHY.SUPER_ADMIN);
  });

  describe('Permisos de Jugador (PLAYER)', () => {
    const role: UserRole = 'PLAYER';

    it('un PLAYER no tiene permisos de Operador', () => {
      expect(isOperator(role)).toBe(false);
    });

    it('un PLAYER no tiene permisos de Supervisor', () => {
      expect(isSupervisor(role)).toBe(false);
    });

    it('un PLAYER no tiene permisos de Administrador', () => {
      expect(isAdmin(role)).toBe(false);
    });

    it('un PLAYER no tiene permisos de Super Administrador', () => {
      expect(isSuperAdmin(role)).toBe(false);
    });
  });

  describe('Permisos de Operador (OPERATOR)', () => {
    const role: UserRole = 'OPERATOR';

    it('un OPERATOR tiene permisos de Operador', () => {
      expect(isOperator(role)).toBe(true);
    });

    it('un OPERATOR no puede ejecutar acciones de Administrador', () => {
      expect(isAdmin(role)).toBe(false);
    });

    it('un OPERATOR no puede auto-elevarse a Administrador', () => {
      expect(hasMinimumRole('OPERATOR', 'ADMIN')).toBe(false);
    });
  });

  describe('Permisos de Administrador (ADMIN)', () => {
    const role: UserRole = 'ADMIN';

    it('un ADMIN tiene privilegios de Operador, Supervisor y Administrador', () => {
      expect(isOperator(role)).toBe(true);
      expect(isSupervisor(role)).toBe(true);
      expect(isAdmin(role)).toBe(true);
    });
  });
});
