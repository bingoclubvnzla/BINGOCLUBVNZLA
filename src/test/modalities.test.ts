/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - Modalities Specification Tests
 */

import { describe, it, expect } from 'vitest';
import { MODALITIES_CONFIG, VENEZUELAN_ANIMALS, generateDemoCard } from '../data/modalities';

describe('Game Modalities Specification', () => {
  it('should define all 5 official Venezuelan modalities', () => {
    const keys = Object.keys(MODALITIES_CONFIG);
    expect(keys).toContain('BINGO_75');
    expect(keys).toContain('BINGO_90');
    expect(keys).toContain('ANIMALITOS');
    expect(keys).toContain('OBJETOS');
    expect(keys).toContain('CHAPITAS');
    expect(keys.length).toBe(5);
  });

  it('BINGO_75 must be 5x5 with free center and 75 balls', () => {
    const b75 = MODALITIES_CONFIG.BINGO_75;
    expect(b75.gridRows).toBe(5);
    expect(b75.gridCols).toBe(5);
    expect(b75.hasFreeCenter).toBe(true);
    expect(b75.totalNumbers).toBe(75);

    const card = generateDemoCard('BINGO_75', 50);
    expect(card.grid.length).toBe(5);
    expect(card.grid[0].length).toBe(5);
    expect(card.grid[2][2].isFree).toBe(true);
    expect(card.grid[2][2].value).toBe('BCV');
  });

  it('BINGO_90 must be 3x9 with 90 balls and no free center', () => {
    const b90 = MODALITIES_CONFIG.BINGO_90;
    expect(b90.gridRows).toBe(3);
    expect(b90.gridCols).toBe(9);
    expect(b90.hasFreeCenter).toBe(false);
    expect(b90.totalNumbers).toBe(90);

    const card = generateDemoCard('BINGO_90', 50);
    expect(card.grid.length).toBe(3);
    expect(card.grid[0].length).toBe(9);

    // Each row must have exactly 5 numbers
    card.grid.forEach((row) => {
      const numbersInRow = row.filter((c) => c.value !== null);
      expect(numbersInRow.length).toBe(5);
    });
  });

  it('ANIMALITOS must include exactly the 38 Venezuelan figures', () => {
    const anim = MODALITIES_CONFIG.ANIMALITOS;
    expect(anim.gridRows).toBe(5);
    expect(anim.gridCols).toBe(5);
    expect(anim.hasFreeCenter).toBe(true);
    expect(anim.totalNumbers).toBe(38);

    expect(VENEZUELAN_ANIMALS.length).toBe(38);
    // Spot check traditional numbers
    expect(VENEZUELAN_ANIMALS.find((a) => a.num === 0)?.name).toBe('Delfín');
    expect(VENEZUELAN_ANIMALS.find((a) => a.num === '00')?.name).toBe('Ballena');
    expect(VENEZUELAN_ANIMALS.find((a) => a.num === 1)?.name).toBe('Carnero');
    expect(VENEZUELAN_ANIMALS.find((a) => a.num === 5)?.name).toBe('León');
    expect(VENEZUELAN_ANIMALS.find((a) => a.num === 36)?.name).toBe('Culebra');
  });

  it('OBJETOS must be 5x5 with free center', () => {
    const obj = MODALITIES_CONFIG.OBJETOS;
    expect(obj.gridRows).toBe(5);
    expect(obj.gridCols).toBe(5);
    expect(obj.hasFreeCenter).toBe(true);
  });

  it('CHAPITAS must be 3x5 with 45 tokens', () => {
    const chap = MODALITIES_CONFIG.CHAPITAS;
    expect(chap.gridRows).toBe(3);
    expect(chap.gridCols).toBe(5);
    expect(chap.hasFreeCenter).toBe(false);
    expect(chap.totalNumbers).toBe(45);

    const card = generateDemoCard('CHAPITAS', 25);
    expect(card.grid.length).toBe(3);
    expect(card.grid[0].length).toBe(5);
  });
});
