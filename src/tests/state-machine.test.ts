import { describe, it, expect } from 'vitest';
import { isValidDrawTransition } from '../lib/security';

describe('Máquina de Estados de Sorteos - Validación de Transiciones', () => {
  it('debe permitir transiciones válidas según el flujo del juego', () => {
    // DRAFT -> SCHEDULED
    expect(isValidDrawTransition('DRAFT', 'SCHEDULED')).toBe(true);
    expect(isValidDrawTransition('DRAFT', 'CANCELLED')).toBe(true);

    // SCHEDULED -> READY
    expect(isValidDrawTransition('SCHEDULED', 'READY')).toBe(true);

    // READY -> ACTIVE
    expect(isValidDrawTransition('READY', 'ACTIVE')).toBe(true);

    // ACTIVE -> PAUSED, FINISHED, CANCELLED
    expect(isValidDrawTransition('ACTIVE', 'PAUSED')).toBe(true);
    expect(isValidDrawTransition('ACTIVE', 'FINISHED')).toBe(true);
    expect(isValidDrawTransition('ACTIVE', 'CANCELLED')).toBe(true);

    // PAUSED -> ACTIVE
    expect(isValidDrawTransition('PAUSED', 'ACTIVE')).toBe(true);

    // FINISHED -> ARCHIVED
    expect(isValidDrawTransition('FINISHED', 'ARCHIVED')).toBe(true);

    // Mismo estado es válido (sin cambio)
    expect(isValidDrawTransition('ACTIVE', 'ACTIVE')).toBe(true);
  });

  it('debe RECHAZAR transiciones ilegales o saltos arbitrarios (Pruebas Negativas)', () => {
    // DRAFT no puede saltar directo a ACTIVE sin programarse
    expect(isValidDrawTransition('DRAFT', 'ACTIVE')).toBe(false);

    // DRAFT no puede marcarse como FINISHED
    expect(isValidDrawTransition('DRAFT', 'FINISHED')).toBe(false);

    // ARCHIVED es terminal: no puede reactivarse
    expect(isValidDrawTransition('ARCHIVED', 'ACTIVE')).toBe(false);
    expect(isValidDrawTransition('ARCHIVED', 'DRAFT')).toBe(false);

    // FINISHED no puede volver a ACTIVE ni a DRAFT
    expect(isValidDrawTransition('FINISHED', 'ACTIVE')).toBe(false);
    expect(isValidDrawTransition('FINISHED', 'DRAFT')).toBe(false);

    // READY no puede pasar a FINISHED sin haber sido ACTIVE
    expect(isValidDrawTransition('READY', 'FINISHED')).toBe(false);
  });
});
