/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - Modalities Data & Card Generators
 */

import { ModalityDetails, DemoCard, CardCell } from '../types/game.types';

export const MODALITIES_CONFIG: Record<string, ModalityDetails> = {
  BINGO_75: {
    code: 'BINGO_75',
    name: 'Bingo 75 Clásico',
    subtitle: '75 Balotas • Cuadrícula 5x5 • Centro Libre',
    description:
      'El tradicional formato americano organizado en 5 columnas con las letras B-I-N-G-O. Incluye la casilla central libre con el sello oficial de Bingo Club Vnzla.',
    gridRows: 5,
    gridCols: 5,
    hasFreeCenter: true,
    totalNumbers: 75,
    layoutDescription: '5 columnas: B (1-15), I (16-30), N (31-45), G (46-60), O (61-75)',
    rulesSummary: [
      '24 números aleatorios más la casilla central libre.',
      'Líneas horizontales, verticales y diagonales.',
      'Cuatro esquinas y Cartón Lleno (Bingo Pleno).',
    ],
    patterns: ['LÍNEA HORIZONTAL', 'LÍNEA VERTICAL', 'DIAGONALES', '4 ESQUINAS', 'CARTÓN LLENO'],
  },
  BINGO_90: {
    code: 'BINGO_90',
    name: 'Bingo 90 Español',
    subtitle: '90 Balotas • 3 Filas x 9 Columnas • 15 Números',
    description:
      'Modalidad europea de 90 balotas. El cartón tiene 3 filas y 9 columnas, con exactamente 5 números por fila (15 números por cartón) y 4 espacios vacíos.',
    gridRows: 3,
    gridCols: 9,
    hasFreeCenter: false,
    totalNumbers: 90,
    layoutDescription: '3 filas x 9 columnas. 5 números y 4 espacios vacíos por fila.',
    rulesSummary: [
      '15 números en total repartidos en 3 líneas de 5 números.',
      'Premio a la primera Línea completada.',
      'Premio a Doble Línea.',
      'Premio mayor a Bingo Pleno (cartón completo de 15 números).',
    ],
    patterns: ['LÍNEA', 'DOBLE LÍNEA', 'BINGO PLENO'],
  },
  ANIMALITOS: {
    code: 'ANIMALITOS',
    name: 'Bingo Animalitos Vnzla',
    subtitle: '38 Figuras Criollas • Cuadrícula 5x5 • Centro Libre',
    description:
      'Inspirado en la histórica ruleta criolla de 38 animalitos venezolanos (Delfín 0, Ballena 00, Carnero 1, Toro 2, Ciempiés 3, Alacrán 4... hasta Culebra 36).',
    gridRows: 5,
    gridCols: 5,
    hasFreeCenter: true,
    totalNumbers: 38,
    layoutDescription: '24 animalitos emblemáticos por cartón con el centro libre.',
    rulesSummary: [
      'Cada casilla muestra el número, el nombre criollo y la ilustración del animalito.',
      'Cantada tradicional: ¡Carnero el 1!, ¡León el 5!, ¡Caimán el 30!.',
      'Modalidades de línea, cruz llanera y tabla llena.',
    ],
    patterns: ['LÍNEA', 'CRUZ LLANERA', 'ESQUINAS', 'TABLA LLENA'],
  },
  OBJETOS: {
    code: 'OBJETOS',
    name: 'Bingo Objetos Populares',
    subtitle: 'Iconografía Nacional • Cuadrícula 5x5 • Centro Libre',
    description:
      'Homenaje a los símbolos culturales, gastronómicos y naturales de Venezuela: Arepa, Cuatro, Arpa, Turpial, Araguaney, El Ávila, Salto Ángel y más.',
    gridRows: 5,
    gridCols: 5,
    hasFreeCenter: true,
    totalNumbers: 40,
    layoutDescription: '24 objetos populares ilustrados con centro libre.',
    rulesSummary: [
      'Identificación visual instantánea mediante íconos y nombres.',
      'Ideal para partidas familiares y torneos recreativos.',
      'Validación criptográfica server-authoritative de cantadas.',
    ],
    patterns: ['LÍNEA', 'DIAGONAL', 'MARCO EXTERIOR', 'CARTÓN LLENO'],
  },
  CHAPITAS: {
    code: 'CHAPITAS',
    name: 'Bingo Chapitas Callejero',
    subtitle: '45 Fichas • 3 Filas x 5 Columnas • Partidas Rápidas',
    description:
      'Inspirado en la tradición callejera venezolana de jugar con chapitas de refresco. Partidas ultra veloces de 15 números con dinamismo garantizado.',
    gridRows: 3,
    gridCols: 5,
    hasFreeCenter: false,
    totalNumbers: 45,
    layoutDescription: '3 filas y 5 columnas de chapitas numeradas.',
    rulesSummary: [
      'Cartón compacto de 15 posiciones sin espacios vacíos.',
      'Extracción rápida de balotas (intervalos cortos).',
      'Premio a Línea rápida y Chapita Plena.',
    ],
    patterns: ['LÍNEA RÁPIDA', 'CHAPITA PLENA'],
  },
};

export const VENEZUELAN_ANIMALS = [
  { num: 0, name: 'Delfín', emoji: '🐬' },
  { num: '00', name: 'Ballena', emoji: '🐋' },
  { num: 1, name: 'Carnero', emoji: '🐏' },
  { num: 2, name: 'Toro', emoji: '🐂' },
  { num: 3, name: 'Ciempiés', emoji: '🐛' },
  { num: 4, name: 'Alacrán', emoji: '🦂' },
  { num: 5, name: 'León', emoji: '🦁' },
  { num: 6, name: 'Rana', emoji: '🐸' },
  { num: 7, name: 'Perico', emoji: '🦜' },
  { num: 8, name: 'Ratón', emoji: '🐭' },
  { num: 9, name: 'Águila', emoji: '🦅' },
  { num: 10, name: 'Tigre', emoji: '🐅' },
  { num: 11, name: 'Gato', emoji: '🐱' },
  { num: 12, name: 'Caballo', emoji: '🐎' },
  { num: 13, name: 'Mono', emoji: '🐒' },
  { num: 14, name: 'Paloma', emoji: '🕊️' },
  { num: 15, name: 'Zorro', emoji: '🦊' },
  { num: 16, name: 'Oso', emoji: '🐻' },
  { num: 17, name: 'Pavo', emoji: '🦃' },
  { num: 18, name: 'Burro', emoji: '🫏' },
  { num: 19, name: 'Chivo', emoji: '🐐' },
  { num: 20, name: 'Cochino', emoji: '🐷' },
  { num: 21, name: 'Gallo', emoji: '🐓' },
  { num: 22, name: 'Camello', emoji: '🐫' },
  { num: 23, name: 'Cebra', emoji: '🦓' },
  { num: 24, name: 'Iguana', emoji: '🦎' },
  { num: 25, name: 'Gallina', emoji: '🐔' },
  { num: 26, name: 'Vaca', emoji: '🐄' },
  { num: 27, name: 'Perro', emoji: '🐕' },
  { num: 28, name: 'Zamuro', emoji: '🦅' },
  { num: 29, name: 'Elefante', emoji: '🐘' },
  { num: 30, name: 'Caimán', emoji: '🐊' },
  { num: 31, name: 'Lapa', emoji: '🐹' },
  { num: 32, name: 'Ardilla', emoji: '🐿️' },
  { num: 33, name: 'Pescado', emoji: '🐟' },
  { num: 34, name: 'Venado', emoji: '🦌' },
  { num: 35, name: 'Jirafa', emoji: '🦒' },
  { num: 36, name: 'Culebra', emoji: '🐍' },
];

export const VENEZUELAN_OBJECTS = [
  { id: 1, name: 'Arepa', emoji: '🫓' },
  { id: 2, name: 'Cuatro Criollo', emoji: '🎸' },
  { id: 3, name: 'Arpa Llanera', emoji: '🎼' },
  { id: 4, name: 'Maracas', emoji: '🪇' },
  { id: 5, name: 'Turpial', emoji: '🐦' },
  { id: 6, name: 'Orquídea', emoji: '🌸' },
  { id: 7, name: 'Araguaney', emoji: '🌳' },
  { id: 8, name: 'El Ávila', emoji: '⛰️' },
  { id: 9, name: 'Salto Ángel', emoji: '🌊' },
  { id: 10, name: 'Chinchorro', emoji: '🛋️' },
  { id: 11, name: 'Papelón con Limón', emoji: '🥤' },
  { id: 12, name: 'Hallaca', emoji: '🫔' },
  { id: 13, name: 'Cachapa', emoji: '🥞' },
  { id: 14, name: 'Queso Telita', emoji: '🧀' },
  { id: 15, name: 'Guarura', emoji: '🐚' },
  { id: 16, name: 'Sombrero de Cogollo', emoji: '👒' },
  { id: 17, name: 'Hamaca', emoji: '🏖️' },
  { id: 18, name: 'Piragua', emoji: '🛶' },
  { id: 19, name: 'Totuma', emoji: '🥣' },
  { id: 20, name: 'Tinajero', emoji: '🏺' },
  { id: 21, name: 'Tambor Mina', emoji: '🪘' },
  { id: 22, name: 'Diablo Danzante', emoji: '👺' },
  { id: 23, name: 'Tequeño', emoji: '🥖' },
  { id: 24, name: 'Golfeado', emoji: '🥨' },
];

/**
 * Deterministic demo card generator for each modality
 */
export function generateDemoCard(modalityCode: string, seed: number = 42): DemoCard {
  const cardSerial = `CRD-${modalityCode.substring(0, 3)}-${(seed * 1000 + 137).toString().padStart(6, '0')}`;

  if (modalityCode === 'BINGO_75') {
    // 5x5: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
    const ranges = [
      [1, 15],
      [16, 30],
      [31, 45],
      [46, 60],
      [61, 75],
    ];

    const grid: CardCell[][] = [];
    for (let r = 0; r < 5; r++) {
      const row: CardCell[] = [];
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) {
          row.push({
            row: r,
            col: c,
            value: 'BCV',
            label: 'LIBRE',
            isFree: true,
            marked: true,
          });
        } else {
          const [min, max] = ranges[c];
          const val = min + ((seed * 7 + r * 3 + c * 5) % (max - min + 1));
          row.push({
            row: r,
            col: c,
            value: val,
            isFree: false,
            marked: (r + c + seed) % 4 === 0,
          });
        }
      }
      grid.push(row);
    }
    return { id: `demo_${cardSerial}`, modalityCode: 'BINGO_75', cardSerial, grid };
  }

  if (modalityCode === 'BINGO_90') {
    // 3 rows x 9 cols (each row has 5 numbers, 4 empty spaces)
    const grid: CardCell[][] = [];
    for (let r = 0; r < 3; r++) {
      const row: CardCell[] = [];
      const occupiedCols = [0, 2, 4, 6, 8]; // 5 numbers
      for (let c = 0; c < 9; c++) {
        if (occupiedCols.includes((c + r) % 9)) {
          const min = c === 0 ? 1 : c * 10;
          const max = c === 8 ? 90 : c * 10 + 9;
          const val = min + ((seed * 3 + r * 2 + c) % (max - min + 1));
          row.push({
            row: r,
            col: c,
            value: val,
            isFree: false,
            marked: (r + c) % 3 === 0,
          });
        } else {
          row.push({
            row: r,
            col: c,
            value: null,
            isFree: false,
            marked: false,
          });
        }
      }
      grid.push(row);
    }
    return { id: `demo_${cardSerial}`, modalityCode: 'BINGO_90', cardSerial, grid };
  }

  if (modalityCode === 'ANIMALITOS') {
    // 5x5 with 24 animals and center free
    const grid: CardCell[][] = [];
    let count = 0;
    for (let r = 0; r < 5; r++) {
      const row: CardCell[] = [];
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) {
          row.push({
            row: r,
            col: c,
            value: 'BCV',
            label: 'LIBRE',
            isFree: true,
            marked: true,
          });
        } else {
          const animal = VENEZUELAN_ANIMALS[(seed * 3 + count) % VENEZUELAN_ANIMALS.length];
          row.push({
            row: r,
            col: c,
            value: animal.num,
            label: animal.name,
            emoji: animal.emoji,
            isFree: false,
            marked: (count + seed) % 5 === 0,
          });
          count++;
        }
      }
      grid.push(row);
    }
    return { id: `demo_${cardSerial}`, modalityCode: 'ANIMALITOS', cardSerial, grid };
  }

  if (modalityCode === 'OBJETOS') {
    const grid: CardCell[][] = [];
    let count = 0;
    for (let r = 0; r < 5; r++) {
      const row: CardCell[] = [];
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) {
          row.push({
            row: r,
            col: c,
            value: 'BCV',
            label: 'LIBRE',
            isFree: true,
            marked: true,
          });
        } else {
          const obj = VENEZUELAN_OBJECTS[(seed * 2 + count) % VENEZUELAN_OBJECTS.length];
          row.push({
            row: r,
            col: c,
            value: obj.id,
            label: obj.name,
            emoji: obj.emoji,
            isFree: false,
            marked: (count + seed) % 4 === 0,
          });
          count++;
        }
      }
      grid.push(row);
    }
    return { id: `demo_${cardSerial}`, modalityCode: 'OBJETOS', cardSerial, grid };
  }

  // CHAPITAS (3x5)
  const grid: CardCell[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: CardCell[] = [];
    for (let c = 0; c < 5; c++) {
      const val = 1 + ((seed * 5 + r * 9 + c * 3) % 45);
      row.push({
        row: r,
        col: c,
        value: val,
        label: `CH-${val}`,
        isFree: false,
        marked: (r + c + seed) % 3 === 0,
      });
    }
    grid.push(row);
  }
  return { id: `demo_${cardSerial}`, modalityCode: 'CHAPITAS', cardSerial, grid };
}
