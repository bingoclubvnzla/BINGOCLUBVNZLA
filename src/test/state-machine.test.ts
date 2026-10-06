/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - Draw State Machine Tests
 */

import { describe, it, expect } from 'vitest';
import { DrawStateMachine } from '../lib/state-machine';
import { isValidDrawTransition } from '../types/game.types';

describe('Draw State Machine (Server-Authoritative Enforcement)', () => {
  it('should initialize at DRAFT by default', () => {
    const sm = new DrawStateMachine();
    expect(sm.getStatus()).toBe('DRAFT');
  });

  it('should allow valid sequence: DRAFT -> SCHEDULED -> READY -> ACTIVE -> PAUSED -> ACTIVE -> FINISHED -> ARCHIVED', () => {
    const sm = new DrawStateMachine('DRAFT');

    expect(sm.transition('SCHEDULED').success).toBe(true);
    expect(sm.getStatus()).toBe('SCHEDULED');

    expect(sm.transition('READY').success).toBe(true);
    expect(sm.getStatus()).toBe('READY');

    expect(sm.transition('ACTIVE').success).toBe(true);
    expect(sm.getStatus()).toBe('ACTIVE');

    expect(sm.transition('PAUSED').success).toBe(true);
    expect(sm.getStatus()).toBe('PAUSED');

    expect(sm.transition('ACTIVE').success).toBe(true);
    expect(sm.getStatus()).toBe('ACTIVE');

    expect(sm.transition('FINISHED').success).toBe(true);
    expect(sm.getStatus()).toBe('FINISHED');

    expect(sm.transition('ARCHIVED').success).toBe(true);
    expect(sm.getStatus()).toBe('ARCHIVED');
  });

  it('should reject illegal direct transitions (Negative Testing)', () => {
    // Cannot skip directly from DRAFT to ACTIVE
    expect(isValidDrawTransition('DRAFT', 'ACTIVE')).toBe(false);

    // Cannot skip directly from DRAFT to FINISHED
    expect(isValidDrawTransition('DRAFT', 'FINISHED')).toBe(false);

    // Cannot revive a FINISHED draw back to ACTIVE
    expect(isValidDrawTransition('FINISHED', 'ACTIVE')).toBe(false);

    // Cannot revive an ARCHIVED draw
    expect(isValidDrawTransition('ARCHIVED', 'DRAFT')).toBe(false);
    expect(isValidDrawTransition('ARCHIVED', 'ACTIVE')).toBe(false);
  });

  it('should allow cancellation from early non-terminal states', () => {
    expect(isValidDrawTransition('DRAFT', 'CANCELLED')).toBe(true);
    expect(isValidDrawTransition('SCHEDULED', 'CANCELLED')).toBe(true);
    expect(isValidDrawTransition('READY', 'CANCELLED')).toBe(true);
    expect(isValidDrawTransition('ACTIVE', 'CANCELLED')).toBe(true);
    expect(isValidDrawTransition('PAUSED', 'CANCELLED')).toBe(true);
  });

  it('should treat ARCHIVED as terminal with no further transitions', () => {
    const sm = new DrawStateMachine('ARCHIVED');
    expect(sm.getAllowedNextStates()).toEqual([]);
  });
});
