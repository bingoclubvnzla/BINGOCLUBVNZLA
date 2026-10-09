import { describe, it, expect } from 'vitest';
import { ROLE_HIERARCHY } from '../src/types/auth';
import { hasOperatorAccess, hasAdminAccess } from '../src/lib/security';

describe('Roles & RBAC Authorization Engine', () => {
  it('correctly maps hierarchy levels from PLAYER to SUPER_ADMIN', () => {
    expect(ROLE_HIERARCHY['PLAYER']).toBe(1);
    expect(ROLE_HIERARCHY['OPERATOR']).toBe(2);
    expect(ROLE_HIERARCHY['SUPERVISOR']).toBe(3);
    expect(ROLE_HIERARCHY['ADMIN']).toBe(4);
    expect(ROLE_HIERARCHY['SUPER_ADMIN']).toBe(5);
  });

  it('denies operator privileges to PLAYER', () => {
    expect(hasOperatorAccess('PLAYER')).toBe(false);
    expect(hasOperatorAccess(null)).toBe(false);
  });

  it('grants operator privileges to OPERATOR, SUPERVISOR, ADMIN and SUPER_ADMIN', () => {
    expect(hasOperatorAccess('OPERATOR')).toBe(true);
    expect(hasOperatorAccess('SUPERVISOR')).toBe(true);
    expect(hasOperatorAccess('ADMIN')).toBe(true);
    expect(hasOperatorAccess('SUPER_ADMIN')).toBe(true);
  });

  it('denies admin privileges to PLAYER and OPERATOR', () => {
    expect(hasAdminAccess('PLAYER')).toBe(false);
    expect(hasAdminAccess('OPERATOR')).toBe(false);
    expect(hasAdminAccess('SUPERVISOR')).toBe(false);
  });

  it('grants admin privileges strictly to ADMIN and SUPER_ADMIN', () => {
    expect(hasAdminAccess('ADMIN')).toBe(true);
    expect(hasAdminAccess('SUPER_ADMIN')).toBe(true);
  });
});
