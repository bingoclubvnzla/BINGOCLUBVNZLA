// src/lib/stateMachine.ts
// Máquina de estados oficial para Sorteos (Server-Authoritative)

import { DrawStatus } from '../types/database';

export const VALID_DRAW_TRANSITIONS: Record<DrawStatus, DrawStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['READY', 'PAUSED', 'CANCELLED'],
  READY: ['ACTIVE', 'PAUSED', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'FINISHED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  FINISHED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

export interface StateTransitionResult {
  allowed: boolean;
  reason?: string;
}

export function canTransitionDrawStatus(
  currentStatus: DrawStatus,
  targetStatus: DrawStatus
): StateTransitionResult {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  const allowedTargets = VALID_DRAW_TRANSITIONS[currentStatus];
  if (!allowedTargets) {
    return {
      allowed: false,
      reason: `Estado actual '${currentStatus}' no es reconocido en la máquina de estados.`,
    };
  }

  if (allowedTargets.includes(targetStatus)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Transición ilícita: No se permite cambiar de '${currentStatus}' a '${targetStatus}'. Transiciones válidas: [${allowedTargets.join(', ')}].`,
  };
}

export function isDrawMutable(status: DrawStatus): boolean {
  return status !== 'FINISHED' && status !== 'ARCHIVED' && status !== 'CANCELLED';
}

export function getDrawStatusLabel(status: DrawStatus): string {
  const labels: Record<DrawStatus, string> = {
    DRAFT: 'Borrador',
    SCHEDULED: 'Programado',
    READY: 'Listo para Iniciar',
    ACTIVE: 'En Juego (En Vivo)',
    PAUSED: 'Pausado',
    FINISHED: 'Finalizado',
    CANCELLED: 'Cancelado',
    ARCHIVED: 'Archivado',
  };
  return labels[status] || status;
}
