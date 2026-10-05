// ==============================================================================
// PRUEBAS DE MODALIDADES Y MÁQUINA DE ESTADOS AUTORITATIVA
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { getFallbackModalities } from '../lib/supabase';
import type { DrawStatus } from '../types/database';

describe('Modalidades Oficiales de Bingo Club VNZLA', () => {
  const modalities = getFallbackModalities();

  it('Debe incluir exactamente las 5 modalidades requeridas', () => {
    const ids = modalities.map((m) => m.id);
    expect(ids).toContain('BINGO_75');
    expect(ids).toContain('BINGO_90');
    expect(ids).toContain('ANIMALITOS');
    expect(ids).toContain('OBJETOS');
    expect(ids).toContain('CHAPITAS');
    expect(modalities.length).toBe(5);
  });

  it('BINGO_75 debe ser 5x5 con centro libre y 75 balotas', () => {
    const b75 = modalities.find((m) => m.id === 'BINGO_75');
    expect(b75).toBeDefined();
    expect(b75?.grid_rows).toBe(5);
    expect(b75?.grid_cols).toBe(5);
    expect(b75?.has_free_center).toBe(true);
    expect(b75?.total_balls).toBe(75);
  });

  it('BINGO_90 debe ser 3x9 y 90 balotas', () => {
    const b90 = modalities.find((m) => m.id === 'BINGO_90');
    expect(b90).toBeDefined();
    expect(b90?.grid_rows).toBe(3);
    expect(b90?.grid_cols).toBe(9);
    expect(b90?.has_free_center).toBe(false);
    expect(b90?.total_balls).toBe(90);
  });

  it('ANIMALITOS debe ser 5x5 con centro libre y 75 figuras', () => {
    const ani = modalities.find((m) => m.id === 'ANIMALITOS');
    expect(ani).toBeDefined();
    expect(ani?.grid_rows).toBe(5);
    expect(ani?.grid_cols).toBe(5);
    expect(ani?.has_free_center).toBe(true);
    expect(ani?.total_balls).toBe(75);
  });

  it('OBJETOS debe ser 5x5 con centro libre y 75 objetos criollos', () => {
    const obj = modalities.find((m) => m.id === 'OBJETOS');
    expect(obj).toBeDefined();
    expect(obj?.grid_rows).toBe(5);
    expect(obj?.grid_cols).toBe(5);
    expect(obj?.has_free_center).toBe(true);
    expect(obj?.total_balls).toBe(75);
  });

  it('CHAPITAS debe ser 3x9 y 90 balotas (45 animales + 45 objetos)', () => {
    const chap = modalities.find((m) => m.id === 'CHAPITAS');
    expect(chap).toBeDefined();
    expect(chap?.grid_rows).toBe(3);
    expect(chap?.grid_cols).toBe(9);
    expect(chap?.has_free_center).toBe(false);
    expect(chap?.total_balls).toBe(90);
  });
});

describe('Máquina de Estados de Sorteos (Server-Authoritative)', () => {
  // Lógica replicada de public.validate_draw_state_transition()
  function validateDrawStateTransition(currentState: DrawStatus, newState: DrawStatus): boolean {
    if (currentState === newState) return true;

    switch (currentState) {
      case 'DRAFT':
        return newState === 'SCHEDULED' || newState === 'CANCELLED';
      case 'SCHEDULED':
        return newState === 'READY' || newState === 'CANCELLED';
      case 'READY':
        return newState === 'ACTIVE' || newState === 'PAUSED' || newState === 'CANCELLED';
      case 'ACTIVE':
        return newState === 'PAUSED' || newState === 'FINISHED' || newState === 'CANCELLED';
      case 'PAUSED':
        return newState === 'ACTIVE' || newState === 'FINISHED' || newState === 'CANCELLED';
      case 'FINISHED':
        return newState === 'ARCHIVED';
      case 'CANCELLED':
        return newState === 'ARCHIVED';
      case 'ARCHIVED':
        return false;
      default:
        return false;
    }
  }

  it('Transición Legal: DRAFT -> SCHEDULED', () => {
    expect(validateDrawStateTransition('DRAFT', 'SCHEDULED')).toBe(true);
  });

  it('Transición Legal: SCHEDULED -> READY', () => {
    expect(validateDrawStateTransition('SCHEDULED', 'READY')).toBe(true);
  });

  it('Transición Legal: READY -> ACTIVE', () => {
    expect(validateDrawStateTransition('READY', 'ACTIVE')).toBe(true);
  });

  it('Transición Legal: ACTIVE -> PAUSED y PAUSED -> ACTIVE', () => {
    expect(validateDrawStateTransition('ACTIVE', 'PAUSED')).toBe(true);
    expect(validateDrawStateTransition('PAUSED', 'ACTIVE')).toBe(true);
  });

  it('Transición Legal: ACTIVE -> FINISHED -> ARCHIVED', () => {
    expect(validateDrawStateTransition('ACTIVE', 'FINISHED')).toBe(true);
    expect(validateDrawStateTransition('FINISHED', 'ARCHIVED')).toBe(true);
  });

  it('Transición ILEGAL: DRAFT -> ACTIVE directo (Debe fallar)', () => {
    expect(validateDrawStateTransition('DRAFT', 'ACTIVE')).toBe(false);
  });

  it('Transición ILEGAL: FINISHED -> ACTIVE (Debe fallar)', () => {
    expect(validateDrawStateTransition('FINISHED', 'ACTIVE')).toBe(false);
  });

  it('Transición ILEGAL: ARCHIVED -> DRAFT (Estado terminal, debe fallar)', () => {
    expect(validateDrawStateTransition('ARCHIVED', 'DRAFT')).toBe(false);
  });
});
