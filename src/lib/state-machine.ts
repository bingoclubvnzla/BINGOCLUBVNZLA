/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - Draw State Machine (Server-Authoritative Mirror)
 */

import { DrawStatus, UserRole } from '../types/database.types';
import { DRAW_STATE_MACHINE, isValidDrawTransition } from '../types/game.types';

export { isValidDrawTransition };
export const VALID_DRAW_TRANSITIONS = DRAW_STATE_MACHINE;

export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  const levels: Record<UserRole, number> = {
    PLAYER: 1,
    OPERATOR: 2,
    SUPERVISOR: 3,
    ADMIN: 4,
    SUPER_ADMIN: 5,
  };
  return (levels[userRole] || 0) >= (levels[requiredRole] || 0);
}

export function canAccessOperatorPanel(role: UserRole): boolean {
  return ['OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canAccessAdminPanel(role: UserRole): boolean {
  return ['ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canManageDraws(role: UserRole): boolean {
  return ['OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canViewAuditLogs(role: UserRole): boolean {
  return ['SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function canModifyModalities(role: UserRole): boolean {
  return ['ADMIN', 'SUPER_ADMIN'].includes(role);
}

export function isValidPublicId(publicId: string): boolean {
  return /^BCV-[A-Z0-9]{6,}$/.test(publicId);
}

export function generateIdempotencyKey(prefix = 'TX'): string {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
}

export interface StateTransitionResult {
  success: boolean;
  from: DrawStatus;
  to: DrawStatus;
  error?: string;
}

export class DrawStateMachine {
  private currentStatus: DrawStatus;

  constructor(initialStatus: DrawStatus = 'DRAFT') {
    this.currentStatus = initialStatus;
  }

  public getStatus(): DrawStatus {
    return this.currentStatus;
  }

  public getAllowedNextStates(): DrawStatus[] {
    return DRAW_STATE_MACHINE[this.currentStatus] || [];
  }

  public canTransitionTo(targetStatus: DrawStatus): boolean {
    return isValidDrawTransition(this.currentStatus, targetStatus);
  }

  public transition(targetStatus: DrawStatus): StateTransitionResult {
    if (!this.canTransitionTo(targetStatus)) {
      return {
        success: false,
        from: this.currentStatus,
        to: targetStatus,
        error: `Transición no permitida: de '${this.currentStatus}' a '${targetStatus}'.`,
      };
    }

    this.currentStatus = targetStatus;
    return {
      success: true,
      from: this.currentStatus,
      to: targetStatus,
    };
  }

  public static getStatusBadge(status: DrawStatus): {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
  } {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Borrador',
          color: 'text-slate-400',
          bgColor: 'bg-slate-800/80',
          borderColor: 'border-slate-700',
        };
      case 'SCHEDULED':
        return {
          label: 'Programado',
          color: 'text-sky-400',
          bgColor: 'bg-sky-950/80',
          borderColor: 'border-sky-700',
        };
      case 'READY':
        return {
          label: 'Listo para Iniciar',
          color: 'text-amber-400',
          bgColor: 'bg-amber-950/80',
          borderColor: 'border-amber-700',
        };
      case 'ACTIVE':
        return {
          label: 'En Vivo (Activo)',
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-950/80',
          borderColor: 'border-emerald-600',
        };
      case 'PAUSED':
        return {
          label: 'Pausado',
          color: 'text-orange-400',
          bgColor: 'bg-orange-950/80',
          borderColor: 'border-orange-700',
        };
      case 'FINISHED':
        return {
          label: 'Finalizado',
          color: 'text-indigo-400',
          bgColor: 'bg-indigo-950/80',
          borderColor: 'border-indigo-700',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelado',
          color: 'text-rose-400',
          bgColor: 'bg-rose-950/80',
          borderColor: 'border-rose-700',
        };
      case 'ARCHIVED':
        return {
          label: 'Archivado',
          color: 'text-neutral-500',
          bgColor: 'bg-neutral-900',
          borderColor: 'border-neutral-800',
        };
    }
  }
}
