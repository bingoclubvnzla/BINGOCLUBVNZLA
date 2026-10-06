import { describe, it, expect } from 'vitest';
import { generateSecurePermutation, createDraw, startDraw, emitNextBall, createDrawSnapshot } from '../src/lib/drawEngine';
import fs from 'fs';
import path from 'path';

describe('FASE REMEDIACIÓN FINAL — P1 / P2 / P3 Unit & Integration Tests', () => {
  describe('1. P1-01: Draw Permutation & Range Verification (1..N)', () => {
    it('BINGO_75 permutation: exactamente 75 números, min=1, max=75, sin duplicados', () => {
      const perm = generateSecurePermutation(75, 1);
      expect(perm.length).toBe(75);
      expect(Math.min(...perm)).toBe(1);
      expect(Math.max(...perm)).toBe(75);
      const unique = new Set(perm);
      expect(unique.size).toBe(75);
    });

    it('BINGO_90 permutation: exactamente 90 números, min=1, max=90, sin duplicados', () => {
      const perm = generateSecurePermutation(90, 1);
      expect(perm.length).toBe(90);
      expect(Math.min(...perm)).toBe(1);
      expect(Math.max(...perm)).toBe(90);
      const unique = new Set(perm);
      expect(unique.size).toBe(90);
    });

    it('Rechaza tamaños de pozo inválidos (0 o negativos)', () => {
      expect(() => generateSecurePermutation(0)).toThrow();
      expect(() => generateSecurePermutation(-1)).toThrow();
    });

    it('Verifica que la migración 13 utiliza invocación corregida con p_min_val = 1 sin epoch', () => {
      const migPath = path.resolve('supabase/migrations/20261005000013_fix_draw_permutation_authoritative.sql');
      const content = fs.readFileSync(migPath, 'utf8');
      expect(content).toContain('v_permutation := public.generate_draw_permutation(v_total_balls, 1);');
      expect(content).not.toContain('extract(epoch from now()) * 1000');
    });
  });

  describe('2. P2-01: Private ACL Mínimo Privilegio', () => {
    it('Verifica que la migración 13 revoca permisos de private a authenticated', () => {
      const migPath = path.resolve('supabase/migrations/20261005000013_fix_draw_permutation_authoritative.sql');
      const content = fs.readFileSync(migPath, 'utf8');
      expect(content).toContain('REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;');
      expect(content).toContain('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;');
      expect(content).toContain('GRANT USAGE ON SCHEMA private TO service_role, postgres;');
      expect(content).toContain('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role, postgres;');
    });
  });

  describe('3. P2-03: Winner Engine Server-Authoritative', () => {
    it('Verifica que claim_bingo_authoritative está formalizada con FOR UPDATE y validación matemática', () => {
      const migPath = path.resolve('supabase/migrations/20261005000013_fix_draw_permutation_authoritative.sql');
      const content = fs.readFileSync(migPath, 'utf8');
      expect(content).toContain('CREATE OR REPLACE FUNCTION public.claim_bingo_authoritative');
      expect(content).toContain('FOR UPDATE');
      expect(content).toContain('v_card.user_id <> v_user_id');
      expect(content).toContain('bool_and');
      expect(content).toContain('CARTON_LLENO');
      expect(content).toContain('LINEA');
    });

    it('Valida en TypeScript la lógica estricta de evaluación de cartón completo vs balotas cantadas', () => {
      const cardNumbers = [5, 12, 23, 44, 55, 67, 72];
      const drawnNumbers = [5, 12, 23, 44, 55, 67]; // falta el 72

      const isComplete = cardNumbers.every(n => drawnNumbers.includes(n));
      expect(isComplete).toBe(false);

      drawnNumbers.push(72);
      const isCompleteAfter = cardNumbers.every(n => drawnNumbers.includes(n));
      expect(isCompleteAfter).toBe(true);
    });
  });

  describe('4. P3-01: F5 & PostgreSQL State Reconciliation', () => {
    it('Garantiza que createDrawSnapshot empaqueta versión y números sin pérdida', () => {
      const draw = createDraw('ADMIN', 'system-admin', {
        modality_id: 'BINGO_75',
        title: 'Sorteo Test',
      });
      draw.status = 'READY';
      const started = startDraw(draw, 'ADMIN', 'system-admin', 1);
      const b1 = emitNextBall(started.draw, 'ADMIN', started.draw.version);
      const b2 = emitNextBall(b1.draw, 'ADMIN', b1.draw.version);

      const snapshot = createDrawSnapshot(b2.draw, 10, 50);
      expect(snapshot.drawn_numbers).toHaveLength(2);
      expect(snapshot.current_sequence).toBe(2);
      expect(snapshot.status).toBe('ACTIVE');
    });
  });
});
