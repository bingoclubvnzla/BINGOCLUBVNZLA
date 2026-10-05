// ==============================================================================
// PRUEBAS AUTOMATIZADAS: MOTOR DE SORTEOS AUTORITATIVO (FASE 2)
// Requisito: Mínimo 70+ pruebas en la suite global. Pruebas reales de CSPRNG,
// máquina de estados, eventos monotónicos, snapshot, reconexión, concurrencia y replay.
// ==============================================================================

import { describe, it, expect } from 'vitest';
import {
  generateSecurePermutation,
  getModalityPoolConfig,
  calculateEventHash,
  validateStateTransition,
  createDraw,
  startDraw,
  emitNextBall,
  pauseDraw,
  resumeDraw,
  finishDraw,
  createDrawSnapshot,
  rebuildFromSnapshot,
  type AuthoritativeDraw
} from '../lib/drawEngine';
import { DRAW_REALTIME_EVENTS, type DrawEventPayload } from '../types/realtimeEvents';
import {
  ANIMALITOS_CATALOG,
  OBJETOS_CRIOLLOS_CATALOG,
  CHAPITAS_CATALOG,
  getBallMetadata,
  getBingo75Letter
} from '../lib/catalogs';

describe('1. Generación de Aleatoriedad Criptográfica Server-Side (CSPRNG)', () => {
  it('BINGO_75: Debe generar exactamente 75 números sin duplicados en rango 1..75', () => {
    const seq = generateSecurePermutation(75, 1);
    expect(seq.length).toBe(75);
    const unique = new Set(seq);
    expect(unique.size).toBe(75);
    expect(Math.min(...seq)).toBe(1);
    expect(Math.max(...seq)).toBe(75);
  });

  it('BINGO_90: Debe generar exactamente 90 números sin duplicados en rango 1..90', () => {
    const seq = generateSecurePermutation(90, 1);
    expect(seq.length).toBe(90);
    const unique = new Set(seq);
    expect(unique.size).toBe(90);
    expect(Math.min(...seq)).toBe(1);
    expect(Math.max(...seq)).toBe(90);
  });

  it('ANIMALITOS: Debe generar exactamente 75 figuras oficiales de la suerte en rango 1..75', () => {
    const seq = generateSecurePermutation(75, 1);
    expect(seq.length).toBe(75);
    expect(new Set(seq).size).toBe(75);
    expect(Math.min(...seq)).toBe(1);
    expect(Math.max(...seq)).toBe(75);
    expect(ANIMALITOS_CATALOG.length).toBe(75);
  });

  it('OBJETOS CRIOLLOS: Debe generar exactamente 75 símbolos criollos en rango 1..75', () => {
    const seq = generateSecurePermutation(75, 1);
    expect(seq.length).toBe(75);
    expect(new Set(seq).size).toBe(75);
    expect(Math.min(...seq)).toBe(1);
    expect(Math.max(...seq)).toBe(75);
    expect(OBJETOS_CRIOLLOS_CATALOG.length).toBe(75);
  });

  it('CHAPITAS: Debe generar exactamente 90 elementos oficiales (45 animales + 45 objetos)', () => {
    const seq = generateSecurePermutation(90, 1);
    expect(seq.length).toBe(90);
    expect(new Set(seq).size).toBe(90);
    expect(Math.min(...seq)).toBe(1);
    expect(Math.max(...seq)).toBe(90);
    expect(CHAPITAS_CATALOG.length).toBe(90);
  });
});

describe('2. Creación y Ciclo de Vida del Sorteo (Server-Authoritative)', () => {
  it('create_draw: OPERATOR o ADMIN pueden crear sorteo en estado DRAFT con public_code BCV-SXXXXXX', () => {
    const draw = createDraw('OPERATOR', 'op-user-1', {
      modality_id: 'BINGO_75',
      title: 'Sorteo Estelar de la Noche',
    });

    expect(draw.id).toBeDefined();
    expect(draw.public_code).toMatch(/^BCV-S[A-Z0-9]{4,6}$/);
    expect(draw.status).toBe('DRAFT');
    expect(draw.version).toBe(1);
    expect(draw.total_balls).toBe(75);
    expect(draw.sequence.length).toBe(0); // Vacío hasta que pase a ACTIVE
  });

  it('create_draw: PLAYER que intenta crear sorteo debe ser rechazado', () => {
    expect(() => {
      createDraw('PLAYER', 'player-uuid-1', {
        modality_id: 'BINGO_75',
        title: 'Sorteo No Autorizado',
      });
    }).toThrow('Acceso denegado');
  });

  it('start_draw: Inicia sorteo desde estado READY, genera secuencia CSPRNG e incrementa versión', () => {
    const draw = createDraw('ADMIN', 'admin-1', {
      modality_id: 'BINGO_75',
      title: 'Sorteo en Vivo',
    });
    draw.status = 'READY';

    const { draw: startedDraw, event } = startDraw(draw, 'ADMIN', 'admin-1', 1);

    expect(startedDraw.status).toBe('ACTIVE');
    expect(startedDraw.version).toBe(2);
    expect(startedDraw.sequence.length).toBe(75);
    expect(event.event_type).toBe(DRAW_REALTIME_EVENTS.DRAW_STARTED);
    expect(event.sequence_number).toBe(1);
    expect(event.created_by).toBe('SERVER_AUTHORITY');
  });

  it('start_draw: Intento de iniciar un sorteo que no está en READY debe fallar', () => {
    const draw = createDraw('ADMIN', 'admin-1', {
      modality_id: 'BINGO_75',
      title: 'Sorteo Borrador',
    });
    expect(draw.status).toBe('DRAFT');

    expect(() => {
      startDraw(draw, 'ADMIN', 'admin-1', 1);
    }).toThrow('Transición ilegal');
  });
});

describe('3. Emisión de Balotas, Secuencia Monotónica y Prevención de Duplicados', () => {
  it('emit_next_ball: Extrae la siguiente balota de la permutación oficial del servidor', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo B75' });
    rawDraw.status = 'READY';
    const { draw: activeDraw } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);

    const firstExpectedBall = activeDraw.sequence[0];
    const { draw: step1, event: evt1 } = emitNextBall(activeDraw, 'ADMIN', activeDraw.version);

    expect(step1.drawn_numbers.length).toBe(1);
    expect(step1.drawn_numbers[0]).toBe(firstExpectedBall);
    expect(evt1.ball_number).toBe(firstExpectedBall);
    expect(evt1.sequence_number).toBe(1);
    expect(evt1.event_type).toBe(DRAW_REALTIME_EVENTS.BALL_DRAWN);
  });

  it('emit_next_ball: Secuencia estrictamente monotónica (1, 2, 3...) sin saltos', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo B75' });
    rawDraw.status = 'READY';
    let { draw: current } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);

    for (let seq = 1; seq <= 5; seq++) {
      const res = emitNextBall(current, 'ADMIN', current.version);
      expect(res.event.sequence_number).toBe(seq);
      current = res.draw;
    }

    expect(current.drawn_numbers.length).toBe(5);
    // Verificar que no existen duplicados entre las 5
    expect(new Set(current.drawn_numbers).size).toBe(5);
  });

  it('emit_next_ball: Finaliza automáticamente al cantar la última balota del pozo (75 balotas)', () => {
    // Sorteo oficial (Animalitos, 75 figuras)
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'ANIMALITOS', title: 'Sorteo Animalitos' });
    rawDraw.status = 'READY';
    let { draw: current } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);

    for (let i = 0; i < 74; i++) {
      const res = emitNextBall(current, 'ADMIN', current.version);
      expect(res.finished).toBe(false);
      expect(res.draw.status).toBe('ACTIVE');
      current = res.draw;
    }

    // Balota número 75 (última de la permutación oficial)
    const finalRes = emitNextBall(current, 'ADMIN', current.version);
    expect(finalRes.finished).toBe(true);
    expect(finalRes.draw.status).toBe('FINISHED');
    expect(finalRes.event.event_type).toBe(DRAW_REALTIME_EVENTS.DRAW_FINISHED);
  });
});

describe('4. Integridad Criptográfica de Eventos (Event Hash Chaining)', () => {
  it('Cada evento vincula su hash con el previous_event_hash de forma inalterable', () => {
    const hash1 = calculateEventHash('draw-1', 1, 'DRAW_STARTED', '{}', 'GENESIS_HASH', '2026-10-04T12:00:00Z');
    const hash2 = calculateEventHash('draw-1', 2, 'BALL_DRAWN', '{"ball":15}', hash1, '2026-10-04T12:00:05Z');
    const hash3 = calculateEventHash('draw-1', 3, 'BALL_DRAWN', '{"ball":42}', hash2, '2026-10-04T12:00:10Z');

    expect(hash1).not.toBe(hash2);
    expect(hash2).not.toBe(hash3);

    // Si se modifica el payload de la balota 15 a 16, el hash calculado no coincide
    const tamperedHash2 = calculateEventHash('draw-1', 2, 'BALL_DRAWN', '{"ball":16}', hash1, '2026-10-04T12:00:05Z');
    expect(tamperedHash2).not.toBe(hash2);
  });
});

describe('5. Pausa, Reanudación y Conservación de Estado', () => {
  it('pause_draw: Pasa de ACTIVE a PAUSED y detiene la secuencia', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo B75' });
    rawDraw.status = 'READY';
    const { draw: started } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);
    const { draw: active } = emitNextBall(started, 'ADMIN', started.version);

    const { draw: paused, event } = pauseDraw(active, 'ADMIN', active.version);
    expect(paused.status).toBe('PAUSED');
    expect(event.event_type).toBe(DRAW_REALTIME_EVENTS.DRAW_PAUSED);

    // Intentar emitir balota en sorteo pausado debe fallar
    expect(() => {
      emitNextBall(paused, 'ADMIN', paused.version);
    }).toThrow('no está en estado ACTIVE');
  });

  it('resume_draw: Reanuda sorteo exactamente en la siguiente balota sin regenerar secuencia', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo B75' });
    rawDraw.status = 'READY';
    const { draw: started } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);
    const { draw: step1 } = emitNextBall(started, 'ADMIN', started.version);
    const originalSequence = [...step1.sequence];

    const { draw: paused } = pauseDraw(step1, 'ADMIN', step1.version);
    const { draw: resumed } = resumeDraw(paused, 'ADMIN', paused.version);

    expect(resumed.status).toBe('ACTIVE');
    expect(resumed.sequence).toEqual(originalSequence); // Permutación idéntica conservada
    expect(resumed.drawn_numbers).toEqual(step1.drawn_numbers);

    // Continuar emitiendo
    const { draw: step2 } = emitNextBall(resumed, 'ADMIN', resumed.version);
    expect(step2.drawn_numbers.length).toBe(2);
  });
});

describe('6. Snapshots, Reconexión y Resiliencia ante Refresco (F5)', () => {
  it('createDrawSnapshot: Empaqueta estado fidedigno con balota actual y lista de números', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo B75' });
    rawDraw.status = 'READY';
    const { draw: started } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);
    const { draw: withBalls } = emitNextBall(started, 'ADMIN', started.version);

    const snapshot = createDrawSnapshot(withBalls, 25, 100);

    expect(snapshot.draw_id).toBe(withBalls.id);
    expect(snapshot.status).toBe('ACTIVE');
    expect(snapshot.players_connected).toBe(25);
    expect(snapshot.players_registered).toBe(100);
    expect(snapshot.current_ball).toBe(withBalls.drawn_numbers[0]);
    expect(snapshot.drawn_numbers.length).toBe(1);
    expect(snapshot.server_time).toBeDefined();
  });

  it('rebuildFromSnapshot: Reconstruye estado sin pérdida tras desconexión y reconexión', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo B75' });
    rawDraw.status = 'READY';
    let { draw: current } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);

    // 1. Cliente conectado presencia balotas 1, 2, 3
    for (let i = 0; i < 3; i++) {
      current = emitNextBall(current, 'ADMIN', current.version).draw;
    }

    // 2. Se toma snapshot en la balota 3 (cliente se desconecta temporalmente)
    const snapshotAt3 = createDrawSnapshot(current, 10, 50);

    // 3. Mientras el cliente está desconectado, el servidor canta balotas 4 y 5
    const step4 = emitNextBall(current, 'ADMIN', current.version);
    const step5 = emitNextBall(step4.draw, 'ADMIN', step4.draw.version);

    // 4. Cliente reconecta y recibe eventos pendientes [step4.event, step5.event]
    const rebuilt = rebuildFromSnapshot(snapshotAt3, [step4.event, step5.event]);

    expect(rebuilt.drawnNumbers.length).toBe(5);
    expect(rebuilt.currentBall).toBe(step5.event.ball_number);
    expect(rebuilt.hasGap).toBe(false);
  });

  it('Deduplicación: Ignora eventos que ya fueron procesados o recibidos repetidos', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo B75' });
    rawDraw.status = 'READY';
    const { draw: started } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);
    const { draw: step1, event: evt1 } = emitNextBall(started, 'ADMIN', started.version);

    const snapshot = createDrawSnapshot(step1, 10, 50);

    // Evento 1 recibido por duplicado
    const rebuilt = rebuildFromSnapshot(snapshot, [evt1]);
    expect(rebuilt.drawnNumbers.length).toBe(1); // No duplica la balota
  });
});

describe('7. Pruebas Negativas y Ataques de Seguridad (Fase 2)', () => {
  it('Ataque Negativo: PLAYER intenta iniciar un sorteo (Debe fallar)', () => {
    const draw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo' });
    draw.status = 'READY';

    expect(() => {
      startDraw(draw, 'PLAYER', 'player-uuid-1', 1);
    }).toThrow('Acceso denegado');
  });

  it('Ataque Negativo: PLAYER intenta emitir una balota (Debe fallar)', () => {
    const draw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo' });
    draw.status = 'READY';
    const { draw: active } = startDraw(draw, 'ADMIN', 'admin-1', 1);

    expect(() => {
      emitNextBall(active, 'PLAYER', active.version);
    }).toThrow('Acceso denegado');
  });

  it('Ataque de Concurrencia: Dos operadores intentan iniciar o emitir sobre la misma versión simultáneamente (Falla por version collision)', () => {
    const draw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo' });
    draw.status = 'READY';

    // Operador A inicia exitosamente con versión 1
    const { draw: startedByA } = startDraw(draw, 'ADMIN', 'admin-op-A', 1);
    expect(startedByA.version).toBe(2);

    // Operador B intenta iniciar simultáneamente enviando la misma versión esperada 1 sobre el draw actualizado
    expect(() => {
      startDraw(startedByA, 'ADMIN', 'admin-op-B', 1);
    }).toThrow('Conflicto de concurrencia');
  });

  it('Ataque de Replay: Reenvío de la misma transición produce excepción de estado o versión', () => {
    const draw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo' });
    draw.status = 'READY';
    const { draw: started } = startDraw(draw, 'ADMIN', 'admin-1', 1);

    // Intentar re-iniciar el mismo sorteo ya iniciado
    expect(() => {
      startDraw(started, 'ADMIN', 'admin-1', started.version);
    }).toThrow('Transición ilegal');
  });

  it('Cancelación Protegida: No se puede cancelar un sorteo en estado FINISHED o ARCHIVED', () => {
    expect(validateStateTransition('FINISHED', 'CANCELLED')).toBe(false);
    expect(validateStateTransition('ARCHIVED', 'CANCELLED')).toBe(false);
    expect(validateStateTransition('SCHEDULED', 'CANCELLED')).toBe(true);
    expect(validateStateTransition('ACTIVE', 'CANCELLED')).toBe(true);
  });

  it('Resolución de Metadatos de Balota: Mapea columnas B-I-N-G-O e iconografía criolla', () => {
    const b75Meta = getBallMetadata('BINGO_75', 5);
    expect(b75Meta.letter).toBe('B');
    expect(getBingo75Letter(20)).toBe('I');
    expect(getBingo75Letter(40)).toBe('N');
    expect(getBingo75Letter(55)).toBe('G');
    expect(getBingo75Letter(70)).toBe('O');

    const aniMeta = getBallMetadata('ANIMALITOS', 2);
    expect(aniMeta.subtext).toBe('Carnero');

    const objMeta = getBallMetadata('OBJETOS', 1);
    expect(objMeta.subtext).toBe('Cuatro');
  });

  it('Detección de Brecha de Secuencia: Si se salta una balota, rebuildFromSnapshot activa hasGap', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo' });
    rawDraw.status = 'READY';
    const { draw: started } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);
    const step1 = emitNextBall(started, 'ADMIN', started.version);
    const step2 = emitNextBall(step1.draw, 'ADMIN', step1.draw.version);
    const step3 = emitNextBall(step2.draw, 'ADMIN', step2.draw.version);

    const snapshotAt1 = createDrawSnapshot(step1.draw, 10, 50);

    // Se simula pérdida del evento 2; solo llega el evento 3 (brecha 1 -> 3)
    const resultWithGap = rebuildFromSnapshot(snapshotAt1, [step3.event]);
    expect(resultWithGap.hasGap).toBe(true);
  });

  it('Diferenciación de Contadores: PLAYERS_CONNECTED vs PLAYERS_REGISTERED', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo' });
    const snapshot = createDrawSnapshot(rawDraw, 84, 320);

    expect(snapshot.players_connected).toBe(84);
    expect(snapshot.players_registered).toBe(320);
    expect(snapshot.players_connected).not.toBe(snapshot.players_registered);
  });

  it('Inmutabilidad de Identidad: Código público BCV-SXXXXXX se mantiene idéntico tras emitir balotas', () => {
    const rawDraw = createDraw('ADMIN', 'admin-1', { modality_id: 'BINGO_75', title: 'Sorteo' });
    const initialCode = rawDraw.public_code;
    rawDraw.status = 'READY';
    const { draw: started } = startDraw(rawDraw, 'ADMIN', 'admin-1', 1);
    const { draw: step1 } = emitNextBall(started, 'ADMIN', started.version);

    expect(step1.public_code).toBe(initialCode);
  });
});
