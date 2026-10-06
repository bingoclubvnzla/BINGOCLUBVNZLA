/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * BINGO CLUB VNZLA ONLINE - Public Identity Generator
 */

/**
 * Validates and formats a public player code.
 * Example format: BCV-A8F3C2
 */
export function isValidPublicCode(code: string): boolean {
  if (!code) return false;
  const regex = /^BCV-[A-Z0-9]{6}$/;
  return regex.test(code.toUpperCase());
}

/**
 * Generates a compliant BCV public identifier.
 * Uses unambiguous characters: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ
 */
export function generatePublicCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'BCV-';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}
