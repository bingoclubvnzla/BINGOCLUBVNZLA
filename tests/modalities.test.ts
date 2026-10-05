import { describe, it, expect } from 'vitest';
import { OFFICIAL_MODALITIES, ANIMALITOS_LIST } from '../src/lib/modalities';

describe('Catálogo Oficial de Modalidades de Juego (Fase 1)', () => {
  it('debe registrar exactamente las 5 modalidades requeridas', () => {
    const keys = Object.keys(OFFICIAL_MODALITIES);
    expect(keys).toContain('BINGO_75');
    expect(keys).toContain('BINGO_90');
    expect(keys).toContain('ANIMALITOS');
    expect(keys).toContain('OBJETOS');
    expect(keys).toContain('CHAPITAS');
    expect(keys.length).toBe(5);
  });

  describe('Configuración Geométrica y Reglas', () => {
    it('BINGO_75 debe ser cuadrícula 5x5 con centro libre y 75 balotas', () => {
      const m = OFFICIAL_MODALITIES.BINGO_75;
      expect(m.grid_type).toBe('5x5');
      expect(m.free_center).toBe(true);
      expect(m.total_numbers).toBe(75);
      expect(m.ball_range_max).toBe(75);
    });

    it('BINGO_90 debe ser cuadrícula 3x5 sin centro libre y 90 balotas', () => {
      const m = OFFICIAL_MODALITIES.BINGO_90;
      expect(m.grid_type).toBe('3x5');
      expect(m.free_center).toBe(false);
      expect(m.total_numbers).toBe(90);
      expect(m.ball_range_max).toBe(90);
    });

    it('ANIMALITOS debe ser cuadrícula 5x5 con centro libre y 38 figuras tradicionales', () => {
      const m = OFFICIAL_MODALITIES.ANIMALITOS;
      expect(m.grid_type).toBe('5x5');
      expect(m.free_center).toBe(true);
      expect(m.total_numbers).toBe(38);
      expect(ANIMALITOS_LIST.length).toBe(38);
    });

    it('OBJETOS debe ser cuadrícula 5x5 con centro libre', () => {
      const m = OFFICIAL_MODALITIES.OBJETOS;
      expect(m.grid_type).toBe('5x5');
      expect(m.free_center).toBe(true);
      expect(m.total_numbers).toBe(50);
    });

    it('CHAPITAS debe ser cuadrícula 3x5 de alta velocidad', () => {
      const m = OFFICIAL_MODALITIES.CHAPITAS;
      expect(m.grid_type).toBe('3x5');
      expect(m.free_center).toBe(false);
      expect(m.total_numbers).toBe(60);
    });
  });
});
