// tests/draw-state-machine.test.ts
// Pruebas unitarias de la máquina de estados de sorteos (Server-Authoritative)

import { describe, it, expect } from 'vitest';
import { canTransitionDrawStatus, VALID_DRAW_TRANSITIONS } from '../src/lib/stateMachine';
import { DrawStatus } from '../src/types/database';

describe('Máquina de Estados de Sorteos (Server-Authoritative)', () => {
  it('debe permitir transiciones legales desde DRAFT', () => {
    expect(canTransitionDrawStatus('DRAFT', 'SCHEDULED').allowed).toBe(true);
    expect(canTransitionDrawStatus('DRAFT', 'CANCELLED').allowed).toBe(true);
  });

  it('debe RECHAZAR transiciones ilegales desde DRAFT', () => {
    // Un sorteo en borrador no puede saltar directamente a ACTIVE ni a FINISHED
    expect(canTransitionDrawStatus('DRAFT', 'ACTIVE').allowed).toBe(false);
    expect(canTransitionDrawStatus('DRAFT', 'FINISHED').allowed).toBe(false);
    expect(canTransitionDrawStatus('DRAFT', 'ARCHIVED').allowed).toBe(false);
  });

  it('debe permitir transiciones legales desde SCHEDULED', () => {
    expect(canTransitionDrawStatus('SCHEDULED', 'READY').allowed).toBe(true);
    expect(canTransitionDrawStatus('SCHEDULED', 'PAUSED').allowed).toBe(true);
    expect(canTransitionDrawStatus('SCHEDULED', 'CANCELLED').allowed).toBe(true);
  });

  it('debe permitir transiciones legales desde READY', () => {
    expect(canTransitionDrawStatus('READY', 'ACTIVE').allowed).toBe(true);
    expect(canTransitionDrawStatus('READY', 'PAUSED').allowed).toBe(true);
    expect(canTransitionDrawStatus('READY', 'CANCELLED').allowed).toBe(true);
  });

  it('debe permitir transiciones legales desde ACTIVE', () => {
    expect(canTransitionDrawStatus('ACTIVE', 'PAUSED').allowed).toBe(true);
    expect(canTransitionDrawStatus('ACTIVE', 'FINISHED').allowed).toBe(true);
  });

  it('debe RECHAZAR transiciones ilícitas desde ACTIVE', () => {
    // Un sorteo en juego no puede retroceder a DRAFT ni a SCHEDULED
    expect(canTransitionDrawStatus('ACTIVE', 'DRAFT').allowed).toBe(false);
    expect(canTransitionDrawStatus('ACTIVE', 'SCHEDULED').allowed).toBe(false);
  });

  it('debe permitir finalizar y luego archivar', () => {
    expect(canTransitionDrawStatus('FINISHED', 'ARCHIVED').allowed).toBe(true);
  });

  it('un sorteo en ARCHIVED debe ser terminal e inmutable', () => {
    const allStatuses: DrawStatus[] = ['DRAFT', 'SCHEDULED', 'READY', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED'];
    for (const status of allStatuses) {
      expect(canTransitionDrawStatus('ARCHIVED', status).allowed).toBe(false);
    }
  });

  it('debe ser reflexivo para el mismo estado (idempotencia)', () => {
    expect(canTransitionDrawStatus('ACTIVE', 'ACTIVE').allowed).toBe(true);
    expect(canTransitionDrawStatus('DRAFT', 'DRAFT').allowed).toBe(true);
  });
});
