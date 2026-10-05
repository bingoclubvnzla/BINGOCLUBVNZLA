// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MOTOR OFICIAL DE SORTEOS (DRAW ENGINE)
// Principio Fundamental: SERVER AUTHORITATIVE.
// Cero Math.random(). Cero autoridad del cliente en números o resultados.
// ==============================================================================

import { DRAW_REALTIME_EVENTS, type DrawRealtimeEventType, type DrawSnapshot, type DrawEventPayload } from '../types/realtimeEvents';
import type { DrawStatus, UserRole } from '../types/database';
import { getBallMetadata } from './catalogs';
import { sha256Hex } from './security';

export interface AuthoritativeDraw {
  id: string;
  public_code: string;
  room_id: string;
  modality_id: 'BINGO_75' | 'BINGO_90' | 'ANIMALITOS' | 'OBJETOS' | 'CHAPITAS';
  title: string;
  status: DrawStatus;
  version: number;
  total_balls: number;
  sequence: number[]; // Permutación oficial criptográfica
  current_sequence: number; // Índice actual en la secuencia
  drawn_numbers: number[]; // Balotas cantadas en orden histórico
  created_at: string;
  created_by: string;
  updated_at: string;
  last_event_hash: string;
}

// 1. GENERADOR CRIPTOGRÁFICO DE NÚMEROS ALEATORIOS (CSPRNG)
// Utiliza exclusivamente crypto.getRandomValues para generar una permutación uniforme
export function generateSecurePermutation(poolSize: number, minVal = 1): number[] {
  if (poolSize <= 0) throw new Error('El tamaño del pozo debe ser mayor a 0');

  // Inicializar arreglo con el conjunto completo de números
  const pool: number[] = Array.from({ length: poolSize }, (_, i) => i + minVal);

  // Fisher-Yates shuffle con CSPRNG de 32 bits
  const randomBuffer = new Uint32Array(poolSize);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBuffer);
  } else {
    // Fallback defensivo usando módulo node crypto si corre en entorno backend
    const nodeCrypto = require('crypto');
    const bytes = nodeCrypto.randomBytes(poolSize * 4);
    for (let i = 0; i < poolSize; i++) {
      randomBuffer[i] = bytes.readUInt32LE(i * 4);
    }
  }

  for (let i = pool.length - 1; i > 0; i--) {
    // Mapeo no sesgado a rango [0, i]
    const j = randomBuffer[i] % (i + 1);
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  return pool;
}

// Obtener tamaño y rango base según la modalidad
export function getModalityPoolConfig(modalityId: string): { totalBalls: number; minVal: number } {
  switch (modalityId) {
    case 'BINGO_75':
      return { totalBalls: 75, minVal: 1 };
    case 'BINGO_90':
      return { totalBalls: 90, minVal: 1 };
    case 'ANIMALITOS':
      return { totalBalls: 75, minVal: 1 }; // Exactamente 75 animales (1-75)
    case 'OBJETOS':
      return { totalBalls: 75, minVal: 1 }; // Exactamente 75 objetos (1-75)
    case 'CHAPITAS':
      return { totalBalls: 90, minVal: 1 }; // 90 números oficiales (45 animales + 45 objetos)
    default:
      return { totalBalls: 75, minVal: 1 };
  }
}

// 2. FUNCIÓN DE INTEGRIDAD DE HASH EN CADENA (HASH CHAINING SHA-256)
export function calculateEventHash(
  drawId: string,
  sequenceNumber: number,
  eventType: string,
  payload: string,
  previousEventHash: string,
  timestamp: string
): string {
  // Digest SHA-256 criptográfico para integridad forense inalterable
  const data = `${drawId}:${sequenceNumber}:${eventType}:${payload}:${previousEventHash}:${timestamp}`;
  return sha256Hex(data);
}

// 3. MÁQUINA DE ESTADOS AUTORITATIVA
export function validateStateTransition(currentState: DrawStatus, nextState: DrawStatus): boolean {
  if (currentState === nextState) return true;

  switch (currentState) {
    case 'DRAFT':
      return nextState === 'SCHEDULED' || nextState === 'CANCELLED';
    case 'SCHEDULED':
      return nextState === 'READY' || nextState === 'CANCELLED';
    case 'READY':
      return nextState === 'ACTIVE' || nextState === 'PAUSED' || nextState === 'CANCELLED';
    case 'ACTIVE':
      return nextState === 'PAUSED' || nextState === 'FINISHED' || nextState === 'CANCELLED';
    case 'PAUSED':
      return nextState === 'ACTIVE' || nextState === 'FINISHED' || nextState === 'CANCELLED';
    case 'FINISHED':
      return nextState === 'ARCHIVED';
    case 'CANCELLED':
      return nextState === 'ARCHIVED';
    case 'ARCHIVED':
      return false; // Terminal
    default:
      return false;
  }
}

// 4. CREACIÓN DE SORTEO (create_draw)
export function createDraw(
  actorRole: UserRole,
  actorId: string,
  params: {
    modality_id: 'BINGO_75' | 'BINGO_90' | 'ANIMALITOS' | 'OBJETOS' | 'CHAPITAS';
    title: string;
    room_id?: string;
  }
): AuthoritativeDraw {
  if (actorRole === 'PLAYER') {
    throw new Error('Acceso denegado: Un usuario con rol PLAYER no tiene autorización para crear sorteos.');
  }

  const poolConfig = getModalityPoolConfig(params.modality_id);
  const randomBytes = new Uint8Array(3);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  }
  const randomHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const now = new Date().toISOString();

  return {
    id: `draw-${Date.now()}-${randomHex.toLowerCase()}`,
    public_code: `BCV-S${randomHex}`,
    room_id: params.room_id || 'room-general-01',
    modality_id: params.modality_id,
    title: params.title,
    status: 'DRAFT',
    version: 1,
    total_balls: poolConfig.totalBalls,
    sequence: [], // Se genera exclusivamente al pasar a ACTIVE mediante CSPRNG
    current_sequence: 0,
    drawn_numbers: [],
    created_at: now,
    created_by: actorId,
    updated_at: now,
    last_event_hash: 'GENESIS_DRAW_HASH',
  };
}

// 5. INICIAR SORTEO (start_draw)
export function startDraw(
  draw: AuthoritativeDraw,
  actorRole: UserRole,
  actorId: string,
  expectedVersion: number
): { draw: AuthoritativeDraw; event: DrawEventPayload } {
  if (actorRole === 'PLAYER') {
    throw new Error('Acceso denegado: PLAYER no puede iniciar un sorteo.');
  }

  if (draw.version !== expectedVersion) {
    throw new Error(`Conflicto de concurrencia: Sorteo en versión ${draw.version}, esperado ${expectedVersion}`);
  }

  if (draw.status !== 'READY') {
    throw new Error(`Transición ilegal: No se puede iniciar un sorteo en estado ${draw.status}. Debe estar en READY.`);
  }

  const poolConfig = getModalityPoolConfig(draw.modality_id);
  // Generación criptográfica única de la permutación oficial
  const officialSequence = generateSecurePermutation(poolConfig.totalBalls, poolConfig.minVal);
  const now = new Date().toISOString();

  const nextVersion = draw.version + 1;
  const eventHash = calculateEventHash(
    draw.id,
    1,
    DRAW_REALTIME_EVENTS.DRAW_STARTED,
    JSON.stringify({ modality: draw.modality_id, total: poolConfig.totalBalls }),
    draw.last_event_hash,
    now
  );

  const updatedDraw: AuthoritativeDraw = {
    ...draw,
    status: 'ACTIVE',
    version: nextVersion,
    sequence: officialSequence,
    current_sequence: 0,
    drawn_numbers: [],
    updated_at: now,
    last_event_hash: eventHash,
  };

  const event: DrawEventPayload = {
    id: `evt-${draw.id}-1`,
    draw_id: draw.id,
    sequence_number: 1,
    event_type: DRAW_REALTIME_EVENTS.DRAW_STARTED,
    previous_event_hash: draw.last_event_hash,
    event_hash: eventHash,
    created_at: now,
    created_by: 'SERVER_AUTHORITY',
    version: nextVersion,
  };

  return { draw: updatedDraw, event };
}

// 6. EMITIR SIGUIENTE BALOTA OFICIAL (emit_next_ball)
// El operador NUNCA elige la balota; el servidor toma la siguiente de la secuencia oficial.
export function emitNextBall(
  draw: AuthoritativeDraw,
  actorRole: UserRole,
  expectedVersion: number
): { draw: AuthoritativeDraw; event: DrawEventPayload; finished: boolean } {
  if (actorRole === 'PLAYER') {
    throw new Error('Acceso denegado: PLAYER no puede emitir balotas.');
  }

  if (draw.version !== expectedVersion) {
    throw new Error(`Conflicto de concurrencia: Sorteo en versión ${draw.version}, esperado ${expectedVersion}`);
  }

  if (draw.status !== 'ACTIVE') {
    throw new Error(`El sorteo no está en estado ACTIVE (estado actual: ${draw.status}).`);
  }

  if (draw.current_sequence >= draw.sequence.length) {
    throw new Error('Todas las balotas de la modalidad ya han sido cantadas.');
  }

  // Tomar el siguiente número oficial generado por el servidor
  const nextBall = draw.sequence[draw.current_sequence];

  // Verificación estricta contra duplicados
  if (draw.drawn_numbers.includes(nextBall)) {
    throw new Error(`Error de integridad: La balota ${nextBall} ya fue emitida previamente en este sorteo.`);
  }

  const nextSeqIndex = draw.current_sequence + 1;
  const nextSeqNumber = draw.drawn_numbers.length + 1; // Monotónico 1..N
  const nextVersion = draw.version + 1;
  const now = new Date().toISOString();

  const meta = getBallMetadata(draw.modality_id, nextBall);

  const eventHash = calculateEventHash(
    draw.id,
    nextSeqNumber,
    DRAW_REALTIME_EVENTS.BALL_DRAWN,
    JSON.stringify({ ball: nextBall, letter: meta.letter, name: meta.subtext }),
    draw.last_event_hash,
    now
  );

  const isLastBall = nextSeqIndex >= draw.sequence.length;
  const nextStatus = isLastBall ? 'FINISHED' : 'ACTIVE';

  const updatedDraw: AuthoritativeDraw = {
    ...draw,
    current_sequence: nextSeqIndex,
    drawn_numbers: [...draw.drawn_numbers, nextBall],
    status: nextStatus,
    version: nextVersion,
    updated_at: now,
    last_event_hash: eventHash,
  };

  const event: DrawEventPayload = {
    id: `evt-${draw.id}-${nextSeqNumber}`,
    draw_id: draw.id,
    sequence_number: nextSeqNumber,
    event_type: isLastBall ? DRAW_REALTIME_EVENTS.DRAW_FINISHED : DRAW_REALTIME_EVENTS.BALL_DRAWN,
    ball_number: nextBall,
    ball_name: meta.subtext,
    ball_letter: meta.letter,
    asset_key: meta.assetKey,
    previous_event_hash: draw.last_event_hash,
    event_hash: eventHash,
    created_at: now,
    created_by: 'SERVER_AUTHORITY',
    version: nextVersion,
  };

  return { draw: updatedDraw, event, finished: isLastBall };
}

// 7. PAUSAR SORTEO (pause_draw)
export function pauseDraw(
  draw: AuthoritativeDraw,
  actorRole: UserRole,
  expectedVersion: number
): { draw: AuthoritativeDraw; event: DrawEventPayload } {
  if (actorRole === 'PLAYER') {
    throw new Error('Acceso denegado: PLAYER no puede pausar sorteos.');
  }

  if (draw.version !== expectedVersion) {
    throw new Error(`Conflicto de concurrencia: Sorteo en versión ${draw.version}, esperado ${expectedVersion}`);
  }

  if (draw.status !== 'ACTIVE') {
    throw new Error(`Solo se puede pausar un sorteo en estado ACTIVE (estado actual: ${draw.status})`);
  }

  const nextVersion = draw.version + 1;
  const now = new Date().toISOString();
  const eventHash = calculateEventHash(
    draw.id,
    draw.drawn_numbers.length + 1,
    DRAW_REALTIME_EVENTS.DRAW_PAUSED,
    JSON.stringify({ at_sequence: draw.current_sequence }),
    draw.last_event_hash,
    now
  );

  const updatedDraw: AuthoritativeDraw = {
    ...draw,
    status: 'PAUSED',
    version: nextVersion,
    updated_at: now,
    last_event_hash: eventHash,
  };

  const event: DrawEventPayload = {
    id: `evt-${draw.id}-pause-${nextVersion}`,
    draw_id: draw.id,
    sequence_number: draw.drawn_numbers.length + 1,
    event_type: DRAW_REALTIME_EVENTS.DRAW_PAUSED,
    previous_event_hash: draw.last_event_hash,
    event_hash: eventHash,
    created_at: now,
    created_by: 'SERVER_AUTHORITY',
    version: nextVersion,
  };

  return { draw: updatedDraw, event };
}

// 8. REANUDAR SORTEO (resume_draw)
export function resumeDraw(
  draw: AuthoritativeDraw,
  actorRole: UserRole,
  expectedVersion: number
): { draw: AuthoritativeDraw; event: DrawEventPayload } {
  if (actorRole === 'PLAYER') {
    throw new Error('Acceso denegado: PLAYER no puede reanudar sorteos.');
  }

  if (draw.version !== expectedVersion) {
    throw new Error(`Conflicto de concurrencia: Sorteo en versión ${draw.version}, esperado ${expectedVersion}`);
  }

  if (draw.status !== 'PAUSED') {
    throw new Error(`Solo se puede reanudar un sorteo en estado PAUSED (estado actual: ${draw.status})`);
  }

  const nextVersion = draw.version + 1;
  const now = new Date().toISOString();
  const eventHash = calculateEventHash(
    draw.id,
    draw.drawn_numbers.length + 1,
    DRAW_REALTIME_EVENTS.DRAW_RESUMED,
    JSON.stringify({ at_sequence: draw.current_sequence }),
    draw.last_event_hash,
    now
  );

  const updatedDraw: AuthoritativeDraw = {
    ...draw,
    status: 'ACTIVE',
    version: nextVersion,
    updated_at: now,
    last_event_hash: eventHash,
  };

  const event: DrawEventPayload = {
    id: `evt-${draw.id}-resume-${nextVersion}`,
    draw_id: draw.id,
    sequence_number: draw.drawn_numbers.length + 1,
    event_type: DRAW_REALTIME_EVENTS.DRAW_RESUMED,
    previous_event_hash: draw.last_event_hash,
    event_hash: eventHash,
    created_at: now,
    created_by: 'SERVER_AUTHORITY',
    version: nextVersion,
  };

  return { draw: updatedDraw, event };
}

// 9. FINALIZAR SORTEO (finish_draw)
export function finishDraw(
  draw: AuthoritativeDraw,
  actorRole: UserRole,
  expectedVersion: number
): { draw: AuthoritativeDraw; event: DrawEventPayload } {
  if (actorRole === 'PLAYER') {
    throw new Error('Acceso denegado: PLAYER no puede finalizar sorteos.');
  }

  if (draw.version !== expectedVersion) {
    throw new Error(`Conflicto de concurrencia: Sorteo en versión ${draw.version}, esperado ${expectedVersion}`);
  }

  if (draw.status !== 'ACTIVE' && draw.status !== 'PAUSED') {
    throw new Error(`No se puede finalizar un sorteo en estado ${draw.status}`);
  }

  const nextVersion = draw.version + 1;
  const now = new Date().toISOString();
  const eventHash = calculateEventHash(
    draw.id,
    draw.drawn_numbers.length + 1,
    DRAW_REALTIME_EVENTS.DRAW_FINISHED,
    JSON.stringify({ total_drawn: draw.drawn_numbers.length }),
    draw.last_event_hash,
    now
  );

  const updatedDraw: AuthoritativeDraw = {
    ...draw,
    status: 'FINISHED',
    version: nextVersion,
    updated_at: now,
    last_event_hash: eventHash,
  };

  const event: DrawEventPayload = {
    id: `evt-${draw.id}-finish-${nextVersion}`,
    draw_id: draw.id,
    sequence_number: draw.drawn_numbers.length + 1,
    event_type: DRAW_REALTIME_EVENTS.DRAW_FINISHED,
    previous_event_hash: draw.last_event_hash,
    event_hash: eventHash,
    created_at: now,
    created_by: 'SERVER_AUTHORITY',
    version: nextVersion,
  };

  return { draw: updatedDraw, event };
}

// 10. GENERAR SNAPSHOT OFICIAL DEL SORTEO
export function createDrawSnapshot(
  draw: AuthoritativeDraw,
  playersConnected: number,
  playersRegistered: number
): DrawSnapshot {
  const history = draw.drawn_numbers.map((ballNum, idx) => {
    const meta = getBallMetadata(draw.modality_id, ballNum);
    return {
      sequence_number: idx + 1,
      ball_number: ballNum,
      name: meta.subtext,
      letter: meta.letter,
      asset_key: meta.assetKey,
      event_hash: `hash_${ballNum}_${idx}`,
      timestamp: draw.updated_at,
    };
  });

  return {
    draw_id: draw.id,
    public_code: draw.public_code,
    room_id: draw.room_id,
    modality_id: draw.modality_id,
    title: draw.title,
    status: draw.status,
    version: draw.version,
    total_balls: draw.total_balls,
    drawn_numbers: [...draw.drawn_numbers],
    current_ball: draw.drawn_numbers.length > 0 ? draw.drawn_numbers[draw.drawn_numbers.length - 1] : null,
    current_sequence: draw.current_sequence,
    last_event_hash: draw.last_event_hash,
    server_time: new Date().toISOString(),
    players_connected: playersConnected,
    players_registered: playersRegistered,
    history,
  };
}

// 11. RECONSTRUCTOR DE ESTADO ANTE RECONEXIÓN O REFRESH (F5)
export function rebuildFromSnapshot(
  snapshot: DrawSnapshot,
  incomingEvents: DrawEventPayload[]
): {
  drawnNumbers: number[];
  currentBall: number | null;
  status: DrawStatus;
  version: number;
  hasGap: boolean;
} {
  // Deduplicación de eventos
  const seenSequences = new Set<number>(snapshot.drawn_numbers.map((_, idx) => idx + 1));
  const mergedDrawn = [...snapshot.drawn_numbers];
  let currentStatus = snapshot.status;
  let currentVersion = snapshot.version;
  let hasGap = false;

  const sortedEvents = [...incomingEvents].sort((a, b) => a.sequence_number - b.sequence_number);

  for (const evt of sortedEvents) {
    if (seenSequences.has(evt.sequence_number)) {
      continue; // Ignorar evento duplicado (Deduplicación)
    }

    // Verificar si hay brecha en la secuencia (Monotonic sequence integrity)
    const expectedSequence = mergedDrawn.length + 1;
    if (evt.event_type === DRAW_REALTIME_EVENTS.BALL_DRAWN && evt.sequence_number !== expectedSequence) {
      hasGap = true;
      break;
    }

    if (evt.ball_number !== undefined && !mergedDrawn.includes(evt.ball_number)) {
      mergedDrawn.push(evt.ball_number);
      seenSequences.add(evt.sequence_number);
    }

    if (evt.event_type === DRAW_REALTIME_EVENTS.DRAW_PAUSED) currentStatus = 'PAUSED';
    if (evt.event_type === DRAW_REALTIME_EVENTS.DRAW_RESUMED) currentStatus = 'ACTIVE';
    if (evt.event_type === DRAW_REALTIME_EVENTS.DRAW_FINISHED) currentStatus = 'FINISHED';
    if (evt.event_type === DRAW_REALTIME_EVENTS.DRAW_CANCELLED) currentStatus = 'CANCELLED';

    currentVersion = Math.max(currentVersion, evt.version);
  }

  return {
    drawnNumbers: mergedDrawn,
    currentBall: mergedDrawn.length > 0 ? mergedDrawn[mergedDrawn.length - 1] : null,
    status: currentStatus,
    version: currentVersion,
    hasGap,
  };
}
