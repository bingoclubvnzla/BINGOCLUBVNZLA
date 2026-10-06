/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - RBAC & Permissions Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ROLE_HIERARCHY,
  hasMinimumRole,
  canManageUsers,
  canOperateDraws,
  canSuperviseOperations,
  canAuditSystem,
} from '../types/auth.types';

describe('RBAC Roles & Authority Boundary', () => {
  it('should enforce strict role hierarchy: PLAYER < OPERATOR < SUPERVISOR < ADMIN < SUPER_ADMIN', () => {
    expect(ROLE_HIERARCHY.PLAYER).toBe(1);
    expect(ROLE_HIERARCHY.OPERATOR).toBe(2);
    expect(ROLE_HIERARCHY.SUPERVISOR).toBe(3);
    expect(ROLE_HIERARCHY.ADMIN).toBe(4);
    expect(ROLE_HIERARCHY.SUPER_ADMIN).toBe(5);
  });

  it('PLAYER role must NOT have administrative permissions', () => {
    expect(canManageUsers('PLAYER')).toBe(false);
    expect(canOperateDraws('PLAYER')).toBe(false);
    expect(canSuperviseOperations('PLAYER')).toBe(false);
    expect(canAuditSystem('PLAYER')).toBe(false);
  });

  it('OPERATOR role cannot manage users or change system settings', () => {
    expect(canManageUsers('OPERATOR')).toBe(false);
    expect(canSuperviseOperations('OPERATOR')).toBe(false);
    // But can operate draws:
    expect(canOperateDraws('OPERATOR')).toBe(true);
  });

  it('SUPERVISOR role can supervise and audit but not perform full system management', () => {
    expect(canOperateDraws('SUPERVISOR')).toBe(true);
    expect(canSuperviseOperations('SUPERVISOR')).toBe(true);
    expect(canAuditSystem('SUPERVISOR')).toBe(true);
    expect(canManageUsers('SUPERVISOR')).toBe(false);
  });

  it('ADMIN and SUPER_ADMIN have full supervisory and user management capabilities', () => {
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canManageUsers('SUPER_ADMIN')).toBe(true);
    expect(canOperateDraws('ADMIN')).toBe(true);
    expect(canAuditSystem('ADMIN')).toBe(true);
  });
});
