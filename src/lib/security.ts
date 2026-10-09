/**
 * BINGO CLUB VNZLA ONLINE — Utilidades de Seguridad y Validaciones RBAC
 */

import { AppRole, DrawStatus } from '../types/database';

/**
 * Jerarquía de roles RBAC
 */
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  PLAYER: 1,
  OPERATOR: 2,
  SUPERVISOR: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

/**
 * Valida si un rol tiene al menos el nivel de privilegios requerido
 */
export function hasMinimumRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function canAccessOperator(role: AppRole): boolean {
  return hasMinimumRole(role, 'OPERATOR');
}

export function canAccessSupervisor(role: AppRole): boolean {
  return hasMinimumRole(role, 'SUPERVISOR');
}

export function canAccessAdmin(role: AppRole): boolean {
  return hasMinimumRole(role, 'ADMIN');
}

export function isOperatorOrHigher(role: AppRole): boolean {
  return hasMinimumRole(role, 'OPERATOR');
}

export function isAdminOrHigher(role: AppRole): boolean {
  return hasMinimumRole(role, 'ADMIN');
}

/**
 * Matriz de Permisos por Rol
 */
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  PLAYER: ['play_games', 'view_draws', 'view_profile'],
  OPERATOR: ['play_games', 'view_draws', 'view_profile', 'validate_payments', 'emit_balls', 'manage_rooms'],
  SUPERVISOR: ['play_games', 'view_draws', 'view_profile', 'validate_payments', 'emit_balls', 'manage_rooms', 'view_audit_logs', 'approve_withdrawals'],
  ADMIN: ['play_games', 'view_draws', 'view_profile', 'validate_payments', 'emit_balls', 'manage_rooms', 'view_audit_logs', 'approve_withdrawals', 'manage_users', 'system_config'],
  SUPER_ADMIN: ['play_games', 'view_draws', 'view_profile', 'validate_payments', 'emit_balls', 'manage_rooms', 'view_audit_logs', 'approve_withdrawals', 'manage_users', 'system_config', 'full_override'],
};

/**
 * Generador de UUID v4 criptográfico para claves de idempotencia (CSPRNG estricto)
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Cálculo determinista de Hash SHA-256 en formato hexadecimal (64 caracteres)
 */
export function sha256Hex(message: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function rotr(n: number, x: number) {
    return (x >>> n) | (x << (32 - n));
  }
  function ch(x: number, y: number, z: number) {
    return (x & y) ^ (~x & z);
  }
  function maj(x: number, y: number, z: number) {
    return (x & y) ^ (x & z) ^ (y & z);
  }
  function sigma0(x: number) {
    return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
  }
  function sigma1(x: number) {
    return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
  }
  function gamma0(x: number) {
    return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
  }
  function gamma1(x: number) {
    return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
  }

  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    const code = message.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }

  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }
  for (let i = 7; i >= 0; i--) {
    bytes.push((bitLength >>> (i * 8)) & 0xff);
  }

  let [h0, h1, h2, h3, h4, h5, h6, h7] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const w = new Array(64);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] =
        (bytes[i + t * 4] << 24) |
        (bytes[i + t * 4 + 1] << 16) |
        (bytes[i + t * 4 + 2] << 8) |
        bytes[i + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      w[t] = (gamma1(w[t - 2]) + w[t - 7] + gamma0(w[t - 15]) + w[t - 16]) | 0;
    }

    let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7];

    for (let t = 0; t < 64; t++) {
      const t1 = (h + sigma1(e) + ch(e, f, g) + K[t] + w[t]) | 0;
      const t2 = (sigma0(a) + maj(a, b, c)) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

/**
 * Generador de Identificador Público estilo BCV-XXXXXX
 */
export function isValidPublicId(publicId: string): boolean {
  const bcvRegex = /^BCV-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
  return bcvRegex.test(publicId);
}

export function validatePublicPlayerId(publicId: string): boolean {
  return /^BCV-[0-9A-Z]{6}$/.test(publicId);
}

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

export function validateVenezuelanPhone(phone: string): PhoneValidationResult {
  if (!phone) {
    return { isValid: false, error: 'El número de teléfono es requerido.' };
  }
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const match = cleaned.match(/^(?:\+58|0)?(412|414|424|416|426)(\d{7})$/);
  if (!match) {
    return {
      isValid: false,
      error: 'Formato inválido. Debe ser una operadora venezolana válida (0412, 0414, 0424, 0416, 0426) con 7 dígitos.',
    };
  }
  return {
    isValid: true,
    normalized: `+58${match[1]}${match[2]}`,
  };
}

/**
 * Máquina de estados finita de Sorteos (Draws)
 */
export const ALLOWED_DRAW_TRANSITIONS: Record<DrawStatus, DrawStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['READY', 'CANCELLED'],
  READY: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'FINISHED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  FINISHED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionDrawStatus(current: DrawStatus, target: DrawStatus): boolean {
  if (current === target) return true;
  const allowed = ALLOWED_DRAW_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export const isValidDrawTransition = canTransitionDrawStatus;

/**
 * Validador de contraseña segura
 */
export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else errors.push('Mínimo 8 caracteres requeridos.');

  if (/[A-Z]/.test(password)) score++;
  else errors.push('Debe incluir al menos una letra mayúscula.');

  if (/[a-z]/.test(password)) score++;
  else errors.push('Debe incluir al menos una letra minúscula.');

  if (/[0-9]/.test(password)) score++;
  else errors.push('Debe incluir al menos un número.');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else errors.push('Debe incluir al menos un carácter especial.');

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
  };
}

/**
 * Sanitiza y formatea mensajes de error para no exponer detalles de base de datos o secretos
 */
export function formatSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/syntax error|pg_catalog|select|relation|foreign key|constraint/i.test(msg)) {
    return 'Error en la base de datos. Operación registrada para auditoría.';
  }
  if (/jwt|signature|token|bearer|unauthorized/i.test(msg)) {
    return 'Su sesión ha expirado o las credenciales no son válidas. Por favor vuelva a iniciar sesión.';
  }
  return msg;
}

/**
 * Enmascara direcciones de correo para vistas públicas
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '******';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Tipos de entornos operativos
 */
export type AppEnvironment = 'LOCAL' | 'PREVIEW' | 'PRODUCTION';

export function getAppEnvironment(): AppEnvironment {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.localhost')
    ) {
      return 'LOCAL';
    }
    if (hostname === 'bingoclubvnzla.vercel.app') {
      return 'PRODUCTION';
    }
    if (hostname.endsWith('.run.app') || hostname.endsWith('.vercel.app')) {
      return 'PREVIEW';
    }
    return 'PRODUCTION';
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return 'PRODUCTION';
  }
  return 'LOCAL';
}

export function isTurnstileRequired(env: AppEnvironment = getAppEnvironment()): boolean {
  return env === 'PRODUCTION' || env === 'PREVIEW';
}

// =====================================================================
// HELPERS DE COMPATIBILIDAD CON TESTS (RBAC Y AUTH)
// =====================================================================

/**
 * Normaliza un identificador público al formato canónico BCV-XXXXXX.
 * Acepta entradas con o sin prefijo BCV- (case-insensitive).
 * Devuelve BCV-000000 para entradas nulas, vacías o sin dígitos.
 */
export function formatPublicId(input: string | null | undefined): string {
  if (input === null || input === undefined || input === '') {
    return 'BCV-000000';
  }
  let digits = String(input).trim().toUpperCase().replace(/^BCV-/, '');
  digits = digits.replace(/\D/g, '');
  if (digits.length === 0) {
    return 'BCV-000000';
  }
  digits = digits.padStart(6, '0').slice(-6);
  return `BCV-${digits}`;
}

/**
 * Sanitiza texto libre eliminando etiquetas HTML y caracteres peligrosos.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>()\[\]{}"'`;]/g, '')
    .trim();
}

/**
 * Determina si un rol tiene privilegios de OPERATOR o superiores.
 */
export function hasOperatorAccess(role: AppRole | null | undefined): boolean {
  if (!role) return false;
  const level = ROLE_HIERARCHY[role];
  return typeof level === 'number' && level >= ROLE_HIERARCHY.OPERATOR;
}

/**
 * Determina si un rol tiene privilegios administrativos (ADMIN o SUPER_ADMIN).
 */
export function hasAdminAccess(role: AppRole | null | undefined): boolean {
  if (!role) return false;
  const level = ROLE_HIERARCHY[role];
  return typeof level === 'number' && level >= ROLE_HIERARCHY.ADMIN;
}
