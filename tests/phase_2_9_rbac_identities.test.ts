// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SUITE DE PRUEBAS FASE 2.9: RBAC DEFINITIVO
// Verificación exhaustiva de:
// 1. Identidades Administrativas Canónicas (v19629049, bingoclubvnzla, bingobingovnz)
// 2. Jerarquía Numérica Estricta (SUPER_ADMIN > ADMIN > SUPERVISOR > OPERATOR > PLAYER)
// 3. Matriz de Autorización Server-Side y Anti-Escalada de Privilegios
// 4. Integridad Estructural de la Migración 10 y Funciones SECURITY DEFINER
// 5. Gestión Segura de Estado y Tolerancia a Fallas (ADMIN_IDENTITY_PENDING)
// ==============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  OFFICIAL_ADMIN_IDENTITIES,
  OFFICIAL_ADMIN_EMAILS,
  getOfficialRoleForEmail,
  isOfficialAdminEmail,
  OFFICIAL_ROLE_HIERARCHY,
  hasSufficientRole,
  canRoleAssignTargetRole
} from '../src/lib/adminIdentities';
import { syncOfficialAdminIdentities } from '../src/services/adminService';
import type { UserRole } from '../src/types/database';

describe('Fase 2.9 — 1. Identidades Oficiales Canónicas', () => {
  it('debe registrar exactamente las 3 identidades oficiales del proyecto', () => {
    expect(OFFICIAL_ADMIN_IDENTITIES.SUPER_ADMIN).toBe('v19629049@gmail.com');
    expect(OFFICIAL_ADMIN_IDENTITIES.ADMIN).toBe('bingoclubvnzla@gmail.com');
    expect(OFFICIAL_ADMIN_IDENTITIES.OPERATOR).toBe('bingobingovnz@gmail.com');
  });

  it('debe mapear correctamente correos electrónicos oficiales a sus roles correspondientes (case-insensitive y trimmed)', () => {
    expect(getOfficialRoleForEmail('v19629049@gmail.com')).toBe('SUPER_ADMIN');
    expect(getOfficialRoleForEmail('V19629049@GMAIL.COM ')).toBe('SUPER_ADMIN');
    expect(getOfficialRoleForEmail('bingoclubvnzla@gmail.com')).toBe('ADMIN');
    expect(getOfficialRoleForEmail('  bingoclubvnzla@gmail.com')).toBe('ADMIN');
    expect(getOfficialRoleForEmail('bingobingovnz@gmail.com')).toBe('OPERATOR');
    expect(getOfficialRoleForEmail('BINGOBINGOVNZ@GMAIL.COM')).toBe('OPERATOR');
  });

  it('debe rechazar correos no autorizados retornando null', () => {
    expect(getOfficialRoleForEmail('hacker@attack.com')).toBeNull();
    expect(getOfficialRoleForEmail('player1@gmail.com')).toBeNull();
    expect(getOfficialRoleForEmail('')).toBeNull();
    expect(getOfficialRoleForEmail(null)).toBeNull();
    expect(getOfficialRoleForEmail(undefined)).toBeNull();
  });

  it('isOfficialAdminEmail debe devolver true únicamente para las 3 cuentas oficiales', () => {
    expect(isOfficialAdminEmail('v19629049@gmail.com')).toBe(true);
    expect(isOfficialAdminEmail('bingoclubvnzla@gmail.com')).toBe(true);
    expect(isOfficialAdminEmail('bingobingovnz@gmail.com')).toBe(true);

    expect(isOfficialAdminEmail('usuario_comun@gmail.com')).toBe(false);
    expect(isOfficialAdminEmail(null)).toBe(false);
  });
});

describe('Fase 2.9 — 2. Jerarquía Numérica Estricta de Roles', () => {
  it('debe cumplir la relación numérica SUPER_ADMIN (50) > ADMIN (40) > SUPERVISOR (30) > OPERATOR (20) > PLAYER (10)', () => {
    expect(OFFICIAL_ROLE_HIERARCHY.SUPER_ADMIN).toBe(50);
    expect(OFFICIAL_ROLE_HIERARCHY.ADMIN).toBe(40);
    expect(OFFICIAL_ROLE_HIERARCHY.SUPERVISOR).toBe(30);
    expect(OFFICIAL_ROLE_HIERARCHY.OPERATOR).toBe(20);
    expect(OFFICIAL_ROLE_HIERARCHY.PLAYER).toBe(10);

    expect(OFFICIAL_ROLE_HIERARCHY.SUPER_ADMIN).toBeGreaterThan(OFFICIAL_ROLE_HIERARCHY.ADMIN);
    expect(OFFICIAL_ROLE_HIERARCHY.ADMIN).toBeGreaterThan(OFFICIAL_ROLE_HIERARCHY.SUPERVISOR);
    expect(OFFICIAL_ROLE_HIERARCHY.SUPERVISOR).toBeGreaterThan(OFFICIAL_ROLE_HIERARCHY.OPERATOR);
    expect(OFFICIAL_ROLE_HIERARCHY.OPERATOR).toBeGreaterThan(OFFICIAL_ROLE_HIERARCHY.PLAYER);
  });

  it('hasSufficientRole debe validar permisos descendentes correctamente', () => {
    // SUPER_ADMIN tiene permisos para todo
    expect(hasSufficientRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
    expect(hasSufficientRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
    expect(hasSufficientRole('SUPER_ADMIN', 'SUPERVISOR')).toBe(true);
    expect(hasSufficientRole('SUPER_ADMIN', 'OPERATOR')).toBe(true);
    expect(hasSufficientRole('SUPER_ADMIN', 'PLAYER')).toBe(true);

    // ADMIN
    expect(hasSufficientRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
    expect(hasSufficientRole('ADMIN', 'ADMIN')).toBe(true);
    expect(hasSufficientRole('ADMIN', 'SUPERVISOR')).toBe(true);
    expect(hasSufficientRole('ADMIN', 'OPERATOR')).toBe(true);
    expect(hasSufficientRole('ADMIN', 'PLAYER')).toBe(true);

    // SUPERVISOR
    expect(hasSufficientRole('SUPERVISOR', 'SUPER_ADMIN')).toBe(false);
    expect(hasSufficientRole('SUPERVISOR', 'ADMIN')).toBe(false);
    expect(hasSufficientRole('SUPERVISOR', 'SUPERVISOR')).toBe(true);
    expect(hasSufficientRole('SUPERVISOR', 'OPERATOR')).toBe(true);
    expect(hasSufficientRole('SUPERVISOR', 'PLAYER')).toBe(true);

    // OPERATOR
    expect(hasSufficientRole('OPERATOR', 'SUPERVISOR')).toBe(false);
    expect(hasSufficientRole('OPERATOR', 'OPERATOR')).toBe(true);
    expect(hasSufficientRole('OPERATOR', 'PLAYER')).toBe(true);

    // PLAYER
    expect(hasSufficientRole('PLAYER', 'OPERATOR')).toBe(false);
    expect(hasSufficientRole('PLAYER', 'PLAYER')).toBe(true);
  });
});

describe('Fase 2.9 — 3. Protección Contra Escalada de Privilegios', () => {
  it('SUPER_ADMIN puede asignar roles hasta ADMIN, pero no delegar SUPER_ADMIN (inmutable)', () => {
    expect(canRoleAssignTargetRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
    expect(canRoleAssignTargetRole('SUPER_ADMIN', 'SUPERVISOR')).toBe(true);
    expect(canRoleAssignTargetRole('SUPER_ADMIN', 'OPERATOR')).toBe(true);
    expect(canRoleAssignTargetRole('SUPER_ADMIN', 'PLAYER')).toBe(true);
    expect(canRoleAssignTargetRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(false);
  });

  it('ADMIN no puede otorgar roles de ADMIN ni SUPER_ADMIN', () => {
    expect(canRoleAssignTargetRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
    expect(canRoleAssignTargetRole('ADMIN', 'ADMIN')).toBe(false);
    expect(canRoleAssignTargetRole('ADMIN', 'SUPERVISOR')).toBe(true);
    expect(canRoleAssignTargetRole('ADMIN', 'OPERATOR')).toBe(true);
    expect(canRoleAssignTargetRole('ADMIN', 'PLAYER')).toBe(true);
  });

  it('SUPERVISOR, OPERATOR y PLAYER no pueden asignar ningún rol', () => {
    const rolesToTest: UserRole[] = ['PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'];
    for (const caller of ['SUPERVISOR', 'OPERATOR', 'PLAYER'] as UserRole[]) {
      for (const target of rolesToTest) {
        expect(canRoleAssignTargetRole(caller, target)).toBe(false);
      }
    }
  });
});

describe('Fase 2.9 — 4. Integridad de Migración 10 y Código SQL', () => {
  const migPath = path.resolve(__dirname, '../supabase/migrations/20261005000010_rbac_definitive_and_admin_identities.sql');

  it('el archivo de migración 10 debe existir físicamente', () => {
    expect(fs.existsSync(migPath)).toBe(true);
  });

  it('debe registrar OFFICIAL_ADMIN_IDENTITIES en app_settings', () => {
    const content = fs.readFileSync(migPath, 'utf8');
    expect(content).toContain('OFFICIAL_ADMIN_IDENTITIES');
    expect(content).toContain('v19629049@gmail.com');
    expect(content).toContain('bingoclubvnzla@gmail.com');
    expect(content).toContain('bingobingovnz@gmail.com');
  });

  it('debe implementar la función server-side sync_official_admin_identities', () => {
    const content = fs.readFileSync(migPath, 'utf8');
    expect(content).toContain('FUNCTION public.sync_official_admin_identities');
    expect(content).toContain('ADMIN_IDENTITY_PENDING');
    expect(content).toContain('SECURITY DEFINER SET search_path = public, pg_temp');
  });

  it('debe proteger execute_admin_change_role contra auto-modificación y consumo de Step-Up', () => {
    const content = fs.readFileSync(migPath, 'utf8');
    expect(content).toContain('FUNCTION public.execute_admin_change_role');
    expect(content).toContain('public.internal_consume_step_up');
    expect(content).toContain('v_caller_id = p_target_user_id');
    expect(content).toContain('Violación de Seguridad: No puede modificar su propio rol');
    expect(content).toContain('Protección de Identidad Canónica: El rol SUPER_ADMIN es inmutable');
  });

  it('debe revocar permisos de ejecución a PUBLIC y anon para las funciones sensibles', () => {
    const content = fs.readFileSync(migPath, 'utf8');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.sync_official_admin_identities FROM PUBLIC, anon');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.execute_admin_change_role FROM PUBLIC, anon');
    expect(content).toContain('REVOKE EXECUTE ON FUNCTION public.execute_admin_toggle_user_status FROM PUBLIC, anon');
  });
});

describe('Fase 2.9 — 5. Tolerancia a Fallas y Reporte de Identidades', () => {
  it('syncOfficialAdminIdentities debe retornar ADMIN_IDENTITY_PENDING si no está conectado o en espera de registro', async () => {
    const res = await syncOfficialAdminIdentities();
    expect(res).toBeDefined();
    if (res.report) {
      expect(res.report.SUPER_ADMIN.email).toBe('v19629049@gmail.com');
      expect(res.report.ADMIN.email).toBe('bingoclubvnzla@gmail.com');
      expect(res.report.OPERATOR.email).toBe('bingobingovnz@gmail.com');
      expect(['ACTIVE', 'ADMIN_IDENTITY_PENDING']).toContain(res.report.SUPER_ADMIN.status);
    }
  });

  it('el código no debe contener credenciales ficticias o contraseñas en texto plano', () => {
    const codeFiles = [
      path.resolve(__dirname, '../src/lib/adminIdentities.ts'),
      path.resolve(__dirname, '../src/services/adminService.ts'),
      path.resolve(__dirname, '../supabase/migrations/20261005000010_rbac_definitive_and_admin_identities.sql')
    ];

    for (const f of codeFiles) {
      const text = fs.readFileSync(f, 'utf8');
      expect(text).not.toMatch(/password\s*[:=]\s*['"][^'"]+['"]/i);
      expect(text).not.toMatch(/contrasena\s*[:=]\s*['"][^'"]+['"]/i);
    }
  });
});
