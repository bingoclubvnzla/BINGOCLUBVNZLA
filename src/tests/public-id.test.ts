import { describe, it, expect } from 'vitest';
import { isValidPublicId } from '../lib/security';

describe('Identificador Público BCV - Formato y Seguridad', () => {
  it('debe validar identificadores con formato oficial BCV-XXXXXX', () => {
    expect(isValidPublicId('BCV-7K9M2W')).toBe(true);
    expect(isValidPublicId('BCV-ABCDEF')).toBe(true);
    expect(isValidPublicId('BCV-234567')).toBe(true);
  });

  it('debe rechazar formatos inválidos o con caracteres ambiguos (0, 1, I, O)', () => {
    // Caracteres excluidos para evitar confusión visual en boletería o soporte
    expect(isValidPublicId('BCV-000000')).toBe(false); // Contiene '0'
    expect(isValidPublicId('BCV-111111')).toBe(false); // Contiene '1'
    expect(isValidPublicId('BCV-IIIIII')).toBe(false); // Contiene 'I'
    expect(isValidPublicId('BCV-OOOOOO')).toBe(false); // Contiene 'O'

    // Longitud incorrecta
    expect(isValidPublicId('BCV-ABC')).toBe(false);
    expect(isValidPublicId('BCV-ABCDEFG')).toBe(false);

    // Sin prefijo BCV
    expect(isValidPublicId('7K9M2W')).toBe(false);
    expect(isValidPublicId('XYZ-7K9M2W')).toBe(false);

    // Letras minúsculas
    expect(isValidPublicId('bcv-7k9m2w')).toBe(false);
  });
});
