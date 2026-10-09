import { describe, it, expect } from 'vitest';
import { formatPublicId, sanitizeText } from '../src/lib/security';

describe('Auth & Identity Verification', () => {
  it('generates and formats valid public IDs with BCV prefix', () => {
    expect(formatPublicId('BCV-123456')).toBe('BCV-123456');
    expect(formatPublicId('123456')).toBe('BCV-123456');
    expect(formatPublicId('bcv-999888')).toBe('BCV-999888');
    expect(formatPublicId(null)).toBe('BCV-000000');
  });

  it('never exposes raw email as public identifier', () => {
    const rawEmail = 'usuario.secreto@ejemplo.com';
    const publicId = formatPublicId('BCV-849201');
    expect(publicId).not.toContain(rawEmail);
    expect(publicId).not.toContain('@');
    expect(/^BCV-\d{6}$/.test(publicId)).toBe(true);
  });

  it('sanitizes input fields to prevent script injection', () => {
    const maliciousInput = '<script>alert("hack")</script>ElTigre';
    const sanitized = sanitizeText(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('(');
    expect(sanitized).not.toContain(')');
    expect(sanitized).toContain('ElTigre');
  });
});
