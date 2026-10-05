// ============================================================================
// BINGO CLUB VNZLA ONLINE — CONSTANTES Y CONFIGURACIONES FUNDACIONALES
// ============================================================================

import { GameModality, DrawStatus, AppRole } from '../types';

export const OFFICIAL_MODALITIES: Record<string, GameModality> = {
  BINGO_75: {
    id: 'BINGO_75',
    name: 'Bingo 75 Clásico',
    description: 'Matriz clásica americana de 5x5 con columnas B-I-N-G-O (75 balotas) y casilla central libre.',
    grid_rows: 5,
    grid_cols: 5,
    free_center: true,
    total_balls: 75,
    layout_config: {
      columns: ['B', 'I', 'N', 'G', 'O'],
      ranges: [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]],
      free_cell: [2, 2],
    },
    is_active: true,
  },
  BINGO_90: {
    id: 'BINGO_90',
    name: 'Bingo 90 Tradicional',
    description: 'El bingo tradicional de 90 números. Cartón de 3 filas y 5 números por fila (total 15 números).',
    grid_rows: 3,
    grid_cols: 5,
    free_center: false,
    total_balls: 90,
    layout_config: {
      numbers_per_row: 5,
      total_numbers: 15,
      range: [1, 90],
    },
    is_active: true,
  },
  ANIMALITOS: {
    id: 'ANIMALITOS',
    name: 'Bingo de Animalitos Criollo',
    description: 'Modalidad venezolana emblemática con los 38 animalitos tradicionales de la cultura popular.',
    grid_rows: 5,
    grid_cols: 5,
    free_center: true,
    total_balls: 38,
    layout_config: {
      theme: 'animalitos_venezuela',
      free_cell: [2, 2],
      animals_count: 38,
      elements: [
        'Delfín', 'Ballena', 'Carnero', 'Toro', 'Ciempiés',
        'León', 'Rana', 'Perico', 'Ratón', 'Águila',
        'Tigre', 'Gato', 'Caballo', 'Mono', 'Paloma',
        'Zorro', 'Oso', 'Pavo', 'Burro', 'Chivo',
        'Gallo', 'Camello', 'Cebra', 'Iguana', 'Gallina',
        'Vaca', 'Perro', 'Zamuro', 'Elefante', 'Caimán',
        'Lapa', 'Ardilla', 'Pescado', 'Venado', 'Jirafa',
        'Culebra', 'Mariposa', 'Chigüire'
      ],
    },
    is_active: true,
  },
  OBJETOS: {
    id: 'OBJETOS',
    name: 'Bingo de Objetos Cotidianos',
    description: 'Matriz dinámica de 5x5 con casilla libre conmemorativa y elementos icónicos venezolanos.',
    grid_rows: 5,
    grid_cols: 5,
    free_center: true,
    total_balls: 50,
    layout_config: {
      theme: 'objetos_populares',
      free_cell: [2, 2],
      objects_count: 50,
    },
    is_active: true,
  },
  CHAPITAS: {
    id: 'CHAPITAS',
    name: 'Bingo de Chapitas',
    description: 'Modalidad ágil de 3x5 de estilo callejero criollo, ideal para rondas relámpago con 60 balotas.',
    grid_rows: 3,
    grid_cols: 5,
    free_center: false,
    total_balls: 60,
    layout_config: {
      theme: 'chapitas_rapido',
      numbers_per_row: 5,
      total_numbers: 15,
      range: [1, 60],
    },
    is_active: true,
  },
};

// Máquina de estados formal de sorteos: Transiciones válidas estrictas
export const ALLOWED_DRAW_TRANSITIONS: Record<DrawStatus, DrawStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['READY', 'CANCELLED'],
  READY: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'FINISHED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  FINISHED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [], // Terminal state
};

export function isValidDrawTransition(from: DrawStatus, to: DrawStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_DRAW_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// Jerarquía de Roles
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  PLAYER: 1,
  OPERATOR: 2,
  SUPERVISOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

export function hasMinimumRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageRole(actorRole: AppRole, targetRole: AppRole): boolean {
  if (actorRole !== 'ADMIN' && actorRole !== 'SUPER_ADMIN') {
    return false;
  }
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

// Generador seguro de identificador público BCV-XXXXXX
export function generatePublicId(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'BCV-';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}
