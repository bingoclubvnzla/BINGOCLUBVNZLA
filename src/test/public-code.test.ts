/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - Public Identity Tests
 */

import { describe, it, expect } from 'vitest';
import { generatePublicCode, isValidPublicCode } from '../lib/id-generator';

describe('Public Identity (BCV-XXXXXX)', () => {
  it('should generate code with BCV- prefix and 6 alphanumeric characters', () => {
    const code = generatePublicCode();
    expect(code).toMatch(/^BCV-[A-Z0-9]{6}$/);
    expect(code.length).toBe(10);
  });

  it('should validate correctly formatted codes', () => {
    expect(isValidPublicCode('BCV-A72F9C')).toBe(true);
    expect(isValidPublicCode('BCV-89K2M4')).toBe(true);
    expect(isValidPublicCode('BCV-ZZZZZZ')).toBe(true);
  });

  it('should reject invalid codes', () => {
    expect(isValidPublicCode('USR-123456')).toBe(false);
    expect(isValidPublicCode('BCV-12345')).toBe(false); // only 5 chars
    expect(isValidPublicCode('BCV-1234567')).toBe(false); // 7 chars
    expect(isValidPublicCode('carlos@gmail.com')).toBe(false); // email is not allowed as public id
    expect(isValidPublicCode('')).toBe(false);
  });

  it('should generate unique values across successive calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generatePublicCode());
    }
    expect(set.size).toBe(100);
  });
});
