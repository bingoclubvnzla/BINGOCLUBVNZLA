import { describe, it, expect } from 'vitest';
import { GameModality } from '../src/types/database';

describe('Modalidades de Juego Oficiales (Sección 11 del Prompt Maestro)', () => {
  const officialModalities: Record<string, GameModality> = {
    BINGO_75: {
      id: 'BINGO_75',
      name: 'Bingo 75 Tradicional',
      description: 'Matriz 5x5 americana con casilla central libre.',
      grid_rows: 5,
      grid_cols: 5,
      free_center: true,
      number_range_min: 1,
      number_range_max: 75,
      is_active: true,
      display_order: 1,
    },
    BINGO_90: {
      id: 'BINGO_90',
      name: 'Bingo 90 Español',
      description: 'Matriz 3x9 (3 filas con 9 columnas, 15 números por cartón).',
      grid_rows: 3,
      grid_cols: 9,
      free_center: false,
      number_range_min: 1,
      number_range_max: 90,
      is_active: true,
      display_order: 2,
    },
    ANIMALITOS: {
      id: 'ANIMALITOS',
      name: 'Bingo de Animalitos',
      description: 'Matriz 5x5 con centro libre basada en tradición venezolana con 75 animalitos de la suerte.',
      grid_rows: 5,
      grid_cols: 5,
      free_center: true,
      number_range_min: 1,
      number_range_max: 75,
      is_active: true,
      display_order: 3,
    },
    OBJETOS: {
      id: 'OBJETOS',
      name: 'Bingo de Objetos Criollos',
      description: 'Matriz 5x5 con centro libre temática con 75 objetos criollos de Venezuela.',
      grid_rows: 5,
      grid_cols: 5,
      free_center: true,
      number_range_min: 1,
      number_range_max: 75,
      is_active: true,
      display_order: 4,
    },
    CHAPITAS: {
      id: 'CHAPITAS',
      name: 'Bingo Chapitas Criollo',
      description: 'Matriz 3x9 de 90 números conformada por 45 animalitos y 45 objetos tradicionales.',
      grid_rows: 3,
      grid_cols: 9,
      free_center: false,
      number_range_min: 1,
      number_range_max: 90,
      is_active: true,
      display_order: 5,
    },
  };

  it('Debe incluir exactamente las 5 modalidades obligatorias', () => {
    const requiredKeys = ['BINGO_75', 'BINGO_90', 'ANIMALITOS', 'OBJETOS', 'CHAPITAS'];
    expect(Object.keys(officialModalities)).toEqual(requiredKeys);
  });

  it('BINGO_75 debe ser 5x5 con centro libre y rango 1 a 75', () => {
    const b75 = officialModalities.BINGO_75;
    expect(b75.grid_rows).toBe(5);
    expect(b75.grid_cols).toBe(5);
    expect(b75.free_center).toBe(true);
    expect(b75.number_range_min).toBe(1);
    expect(b75.number_range_max).toBe(75);
  });

  it('BINGO_90 debe ser 3x9 sin centro libre y rango 1 a 90', () => {
    const b90 = officialModalities.BINGO_90;
    expect(b90.grid_rows).toBe(3);
    expect(b90.grid_cols).toBe(9);
    expect(b90.free_center).toBe(false);
    expect(b90.number_range_min).toBe(1);
    expect(b90.number_range_max).toBe(90);
  });

  it('ANIMALITOS debe ser 5x5 con centro libre y rango 1 a 75 (75 elementos)', () => {
    const anm = officialModalities.ANIMALITOS;
    expect(anm.grid_rows).toBe(5);
    expect(anm.grid_cols).toBe(5);
    expect(anm.free_center).toBe(true);
    expect(anm.number_range_min).toBe(1);
    expect(anm.number_range_max).toBe(75);
  });

  it('OBJETOS debe ser 5x5 con centro libre y rango 1 a 75 (75 elementos)', () => {
    const obj = officialModalities.OBJETOS;
    expect(obj.grid_rows).toBe(5);
    expect(obj.grid_cols).toBe(5);
    expect(obj.free_center).toBe(true);
    expect(obj.number_range_min).toBe(1);
    expect(obj.number_range_max).toBe(75);
  });

  it('CHAPITAS debe ser 3x9 sin centro libre y rango 1 a 90 (45 animales + 45 objetos)', () => {
    const chap = officialModalities.CHAPITAS;
    expect(chap.grid_rows).toBe(3);
    expect(chap.grid_cols).toBe(9);
    expect(chap.free_center).toBe(false);
    expect(chap.number_range_min).toBe(1);
    expect(chap.number_range_max).toBe(90);
  });
});

describe('Validación Forense de Integridad de Catálogos (Fase 2.3)', () => {
  it('ANIMALITOS: Exactamente 75 elementos oficiales con IDs estables y TTS normalizado', async () => {
    const { ANIMALITOS_CATALOG } = await import('../src/lib/catalogs');
    expect(ANIMALITOS_CATALOG.length).toBe(75);
    const numbers = ANIMALITOS_CATALOG.map((a) => a.numero);
    expect(new Set(numbers).size).toBe(75);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(75);

    // Sin números prohibidos (0, 00, 76+)
    expect(numbers.includes(0)).toBe(false);
    expect(numbers.some((n) => n > 75)).toBe(false);

    // Cada registro debe contener catalog_id, number, name, tts_name, asset_key
    for (const item of ANIMALITOS_CATALOG) {
      expect(item.id).toMatch(/^ani-\d+$/);
      expect(item.nombre.trim().length).toBeGreaterThan(0);
      expect(item.tts_name.trim().length).toBeGreaterThan(0);
      expect(item.asset_key.trim().length).toBeGreaterThan(0);
      expect(item.activo).toBe(true);
    }
  });

  it('OBJETOS: Exactamente 75 elementos oficiales con IDs estables y TTS normalizado', async () => {
    const { OBJETOS_CRIOLLOS_CATALOG } = await import('../src/lib/catalogs');
    expect(OBJETOS_CRIOLLOS_CATALOG.length).toBe(75);
    const numbers = OBJETOS_CRIOLLOS_CATALOG.map((o) => o.numero);
    expect(new Set(numbers).size).toBe(75);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(75);

    // Sin números prohibidos (0, 00, 76+)
    expect(numbers.includes(0)).toBe(false);
    expect(numbers.some((n) => n > 75)).toBe(false);

    // Cada registro debe contener catalog_id, number, name, tts_name, asset_key
    for (const item of OBJETOS_CRIOLLOS_CATALOG) {
      expect(item.id).toMatch(/^obj-\d+$/);
      expect(item.nombre.trim().length).toBeGreaterThan(0);
      expect(item.tts_name.trim().length).toBeGreaterThan(0);
      expect(item.asset_key.trim().length).toBeGreaterThan(0);
      expect(item.activo).toBe(true);
    }
  });

  it('CHAPITAS: Exactamente 90 números con descomposición estricta (45 Animalitos + 45 Objetos)', async () => {
    const { CHAPITAS_CATALOG, ANIMALITOS_CATALOG, OBJETOS_CRIOLLOS_CATALOG } = await import('../src/lib/catalogs');
    expect(CHAPITAS_CATALOG.length).toBe(90);

    const chapNums = CHAPITAS_CATALOG.map((c) => c.chapitas_number);
    expect(new Set(chapNums).size).toBe(90);
    expect(Math.min(...chapNums)).toBe(1);
    expect(Math.max(...chapNums)).toBe(90);

    const animals = CHAPITAS_CATALOG.filter((c) => c.source_type === 'ANIMAL');
    const objects = CHAPITAS_CATALOG.filter((c) => c.source_type === 'OBJECT');

    // Descomposición matemática exacta
    expect(animals.length).toBe(45);
    expect(objects.length).toBe(45);

    // Rango de animales (1 al 45) y objetos (46 al 90)
    for (let i = 1; i <= 45; i++) {
      const item = CHAPITAS_CATALOG.find((c) => c.chapitas_number === i);
      expect(item).toBeDefined();
      expect(item?.source_type).toBe('ANIMAL');
      // Verificación de referencia canónica al catálogo de origen
      const originAnimal = ANIMALITOS_CATALOG.find((a) => a.id === item?.source_catalog_id);
      expect(originAnimal).toBeDefined();
      expect(originAnimal?.nombre).toBe(item?.nombre);
    }

    for (let i = 46; i <= 90; i++) {
      const item = CHAPITAS_CATALOG.find((c) => c.chapitas_number === i);
      expect(item).toBeDefined();
      expect(item?.source_type).toBe('OBJECT');
      // Verificación de referencia canónica al catálogo de origen
      const originObj = OBJETOS_CRIOLLOS_CATALOG.find((o) => o.id === item?.source_catalog_id);
      expect(originObj).toBeDefined();
      expect(originObj?.nombre).toBe(item?.nombre);
    }
  });
});

