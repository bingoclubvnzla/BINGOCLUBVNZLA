// ==============================================================================
// PRUEBAS DE CONCURRENCIA, INTEGRIDAD DE LEDGER Y MÁQUINA DE ESTADOS
// Requisitos: Control de concurrencia optimista, secuencia monotónica y hash chaining
// ==============================================================================

import { describe, it, expect } from 'vitest';
import type { DrawStatus } from '../types/database';

describe('Control de Concurrencia Optimista en Sorteos (Draws Versioning)', () => {
  interface DrawEntity {
    id: string;
    status: DrawStatus;
    version: number;
  }

  // Simulador de transition_draw_state_atomic()
  function transitionDrawAtomic(
    draw: DrawEntity,
    expectedVersion: number,
    newState: DrawStatus
  ): { success: boolean; updatedDraw?: DrawEntity; error?: string } {
    if (draw.version !== expectedVersion) {
      return {
        success: false,
        error: `Conflicto de concurrencia: El sorteo se encuentra en versión ${draw.version}, esperado ${expectedVersion}.`,
      };
    }

    return {
      success: true,
      updatedDraw: {
        ...draw,
        status: newState,
        version: draw.version + 1,
      },
    };
  }

  it('Dos operadores intentando cambiar el mismo estado al mismo tiempo: el segundo debe fallar por colisión de versión', () => {
    const initialDraw: DrawEntity = {
      id: 'draw-concurrency-01',
      status: 'SCHEDULED',
      version: 1,
    };

    // Operador A lee versión 1 y envía transición a 'READY'
    const resultOpA = transitionDrawAtomic(initialDraw, 1, 'READY');
    expect(resultOpA.success).toBe(true);
    expect(resultOpA.updatedDraw?.status).toBe('READY');
    expect(resultOpA.updatedDraw?.version).toBe(2);

    const updatedDbState = resultOpA.updatedDraw!;

    // Operador B, que leyó la misma versión 1 antes de que A guardara, intenta enviar transición a 'CANCELLED'
    const resultOpB = transitionDrawAtomic(updatedDbState, 1, 'CANCELLED');
    expect(resultOpB.success).toBe(false);
    expect(resultOpB.error).toContain('Conflicto de concurrencia');
  });

  it('Transición secuencial con versión correcta debe completarse con éxito', () => {
    let draw: DrawEntity = {
      id: 'draw-seq-01',
      status: 'READY',
      version: 2,
    };

    const step1 = transitionDrawAtomic(draw, 2, 'ACTIVE');
    expect(step1.success).toBe(true);
    draw = step1.updatedDraw!;

    const step2 = transitionDrawAtomic(draw, 3, 'PAUSED');
    expect(step2.success).toBe(true);
    expect(step2.updatedDraw?.version).toBe(4);
  });
});

describe('Integridad Criptográfica del Ledger Financiero (Hash Chaining)', () => {
  interface LedgerEntry {
    id: string;
    amount: number;
    type: string;
    previous_hash: string;
    transaction_hash: string;
  }

  function computeHash(id: string, amount: number, type: string, previousHash: string): string {
    // Simulación determinista de SHA-256
    const payload = `${id}|${amount.toFixed(2)}|${type}|${previousHash}`;
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  function verifyLedgerChain(chain: LedgerEntry[]): boolean {
    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i];
      const expectedPrev = i === 0 ? 'GENESIS_HASH' : chain[i - 1].transaction_hash;
      if (entry.previous_hash !== expectedPrev) return false;

      const calculated = computeHash(entry.id, entry.amount, entry.type, entry.previous_hash);
      if (entry.transaction_hash !== calculated) return false;
    }
    return true;
  }

  it('Debe validar una cadena íntegra de transacciones contables', () => {
    const tx1: LedgerEntry = {
      id: 'tx-1',
      amount: 100.0,
      type: 'DEPOSIT',
      previous_hash: 'GENESIS_HASH',
      transaction_hash: computeHash('tx-1', 100.0, 'DEPOSIT', 'GENESIS_HASH'),
    };

    const tx2: LedgerEntry = {
      id: 'tx-2',
      amount: 25.0,
      type: 'CARD_PURCHASE',
      previous_hash: tx1.transaction_hash,
      transaction_hash: computeHash('tx-2', 25.0, 'CARD_PURCHASE', tx1.transaction_hash),
    };

    const chain = [tx1, tx2];
    expect(verifyLedgerChain(chain)).toBe(true);
  });

  it('Debe detectar adulteración si un atacante intenta alterar el monto de una transacción histórica', () => {
    const tx1: LedgerEntry = {
      id: 'tx-1',
      amount: 100.0,
      type: 'DEPOSIT',
      previous_hash: 'GENESIS_HASH',
      transaction_hash: computeHash('tx-1', 100.0, 'DEPOSIT', 'GENESIS_HASH'),
    };

    const tx2: LedgerEntry = {
      id: 'tx-2',
      amount: 25.0,
      type: 'CARD_PURCHASE',
      previous_hash: tx1.transaction_hash,
      transaction_hash: computeHash('tx-2', 25.0, 'CARD_PURCHASE', tx1.transaction_hash),
    };

    // Atacante manipula tx1.amount de 100 a 1000 sin poder recomputar hashes
    const tamperedTx1 = { ...tx1, amount: 1000.0 };
    const tamperedChain = [tamperedTx1, tx2];

    expect(verifyLedgerChain(tamperedChain)).toBe(false);
  });
});

describe('Reglas de Moneda Venezolana (VES) y Síntesis de Audio (TTS)', () => {
  function formatCurrencyForTTS(textWithCurrency: string): string {
    return textWithCurrency
      .replace(/Bs\.\s?(\d+(?:,\d+)?)/gi, '$1 bolívares')
      .replace(/Bs/gi, 'bolívares');
  }

  it('Debe convertir la abreviatura "Bs." a la palabra completa "bolívares"', () => {
    const formatted = formatCurrencyForTTS('Premio acumulado de Bs. 500');
    expect(formatted).toBe('Premio acumulado de 500 bolívares');
    expect(formatted).not.toContain('Bs.');
    expect(formatted.toLowerCase()).not.toContain('bolivianos');
  });

  it('Nunca debe emitir "bolivianos" ni la sigla literal "Bes"', () => {
    const formatted = formatCurrencyForTTS('Costo por cartón: Bs. 10');
    expect(formatted).toBe('Costo por cartón: 10 bolívares');
    expect(formatted.toLowerCase()).not.toContain('bes');
  });
});
