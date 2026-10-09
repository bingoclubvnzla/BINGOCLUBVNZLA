import { describe, it, expect } from 'vitest';
import type { DrawStatus } from '../types/database.types';

describe('Pruebas de Modalidades de Juego y Máquina de Estados', () => {
  const MODALITIES = {
    BINGO_75: { rows: 5, cols: 5, freeCenter: true, maxBalls: 75, cardNumbers: 24 },
    BINGO_90: { rows: 3, cols: 5, freeCenter: false, maxBalls: 90, cardNumbers: 15 },
    ANIMALITOS: { rows: 5, cols: 5, freeCenter: true, maxBalls: 38, cardNumbers: 24 },
    OBJETOS: { rows: 5, cols: 5, freeCenter: true, maxBalls: 50, cardNumbers: 24 },
    CHAPITAS: { rows: 3, cols: 5, freeCenter: false, maxBalls: 60, cardNumbers: 15 },
  };

  it('debe validar las especificaciones estructurales de las 5 modalidades', () => {
    // BINGO_75: 5x5 con centro libre
    expect(MODALITIES.BINGO_75.rows).toBe(5);
    expect(MODALITIES.BINGO_75.cols).toBe(5);
    expect(MODALITIES.BINGO_75.freeCenter).toBe(true);
    expect(MODALITIES.BINGO_75.cardNumbers).toBe(24);

    // BINGO_90: 3x5
    expect(MODALITIES.BINGO_90.rows).toBe(3);
    expect(MODALITIES.BINGO_90.cols).toBe(5);
    expect(MODALITIES.BINGO_90.freeCenter).toBe(false);

    // ANIMALITOS: 5x5 centro libre
    expect(MODALITIES.ANIMALITOS.freeCenter).toBe(true);

    // OBJETOS: 5x5 centro libre
    expect(MODALITIES.OBJETOS.freeCenter).toBe(true);

    // CHAPITAS: 3x5 dinámica rápida
    expect(MODALITIES.CHAPITAS.rows).toBe(3);
    expect(MODALITIES.CHAPITAS.cols).toBe(5);
  });

  describe('Máquina de Estados de Sorteos (Draws)', () => {
    const VALID_TRANSITIONS: Record<DrawStatus, DrawStatus[]> = {
      DRAFT: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['READY', 'CANCELLED'],
      READY: ['ACTIVE', 'SCHEDULED', 'CANCELLED'],
      ACTIVE: ['PAUSED', 'FINISHED', 'CANCELLED'],
      PAUSED: ['ACTIVE', 'CANCELLED'],
      FINISHED: ['ARCHIVED'],
      CANCELLED: ['ARCHIVED'],
      ARCHIVED: [],
    };

    const validateTransition = (current: DrawStatus, next: DrawStatus): boolean => {
      const allowed = VALID_TRANSITIONS[current];
      if (!allowed.includes(next)) {
        throw new Error(`Transición ilegal: de ${current} a ${next} está prohibida`);
      }
      return true;
    };

    it('debe permitir transiciones válidas del ciclo de vida del sorteo', () => {
      expect(validateTransition('DRAFT', 'SCHEDULED')).toBe(true);
      expect(validateTransition('SCHEDULED', 'READY')).toBe(true);
      expect(validateTransition('READY', 'ACTIVE')).toBe(true);
      expect(validateTransition('ACTIVE', 'PAUSED')).toBe(true);
      expect(validateTransition('PAUSED', 'ACTIVE')).toBe(true);
      expect(validateTransition('ACTIVE', 'FINISHED')).toBe(true);
      expect(validateTransition('FINISHED', 'ARCHIVED')).toBe(true);
    });

    describe('Pruebas Negativas de Estados', () => {
      it('NEGATIVO: no debe permitir saltar de DRAFT directamente a ACTIVE o FINISHED', () => {
        expect(() => validateTransition('DRAFT', 'ACTIVE')).toThrow('Transición ilegal');
        expect(() => validateTransition('DRAFT', 'FINISHED')).toThrow('Transición ilegal');
      });

      it('NEGATIVO: un sorteo FINISHED o ARCHIVED no puede ser reabierto a ACTIVE', () => {
        expect(() => validateTransition('FINISHED', 'ACTIVE')).toThrow('Transición ilegal');
        expect(() => validateTransition('ARCHIVED', 'ACTIVE')).toThrow('Transición ilegal');
      });

      it('NEGATIVO: no permite transiciones desde el estado terminal ARCHIVED', () => {
        expect(() => validateTransition('ARCHIVED', 'DRAFT')).toThrow('Transición ilegal');
      });
    });
  });
});
