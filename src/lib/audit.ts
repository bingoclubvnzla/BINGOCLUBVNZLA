// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MÓDULO DE AUDITORÍA FORENSE DE AUTENTICACIÓN (FASE 2.4)
// Registra eventos de seguridad sin almacenar nunca contraseñas, tokens ni secretos.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { UserRole } from '../types/database';

export type AuthAuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'GOOGLE_OAUTH_SUCCESS'
  | 'SIGNUP'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_CHANGED'
  | 'LOGOUT'
  | 'MFA_ENROLLMENT_STARTED'
  | 'MFA_ENROLLMENT_VERIFIED'
  | 'MFA_ENROLLMENT_FAILED'
  | 'MFA_DISABLED'
  | 'MFA_CHALLENGE_CREATED'
  | 'MFA_VERIFICATION_SUCCESS'
  | 'MFA_VERIFICATION_FAILED'
  | 'MFA_RECOVERY_USED'
  | 'STEP_UP_AUTHORIZED'
  | 'STEP_UP_REJECTED'
  | 'SENSITIVE_ACTION_STARTED'
  | 'SENSITIVE_ACTION_COMPLETED'
  | 'SENSITIVE_ACTION_REJECTED'
  | 'PAYMENT_METHOD_CHANGED'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'RECHARGE_CONFIRMED'
  | 'ACCOUNT_DELETION_REQUESTED'
  | 'ACCOUNT_DELETION_COMPLETED';

export interface AuditEventPayload {
  action: AuthAuditEventType;
  actor_role?: UserRole | 'ANON';
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}

// Lista negra de claves que NUNCA deben registrarse en la bitácora (en minúsculas)
const SENSITIVE_KEYS = new Set([
  'password',
  'contraseña',
  'token',
  'access_token',
  'refresh_token',
  'captchatoken',
  'turnstile_token',
  'turnstiletoken',
  'cf_turnstile',
  'secret',
  'client_secret',
  'service_role',
  'auth_code',
  'authorization_code',
  'code',
  'api_key',
  'apikey',
]);

/**
 * Filtra recursivamente cualquier clave o dato sensible antes de guardar el metadata
 */
export function sanitizeAuditMetadata(meta: Record<string, unknown> = {}): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      continue;
    }

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeAuditMetadata(val as Record<string, unknown>);
    } else if (typeof val === 'string' && val.length > 500) {
      // Truncar cadenas excesivamente largas para mitigar ataques de denegación de almacenamiento
      clean[key] = val.substring(0, 500) + '...[truncado]';
    } else {
      clean[key] = val;
    }
  }

  return clean;
}

/**
 * Registra un evento de auditoría en la tabla inmutable public.audit_logs
 */
export async function recordAuthAudit(payload: AuditEventPayload): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }

  try {
    const cleanMeta = sanitizeAuditMetadata(payload.metadata || {});

    // Hash ligero del navegador / entorno si está disponible
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'server';
    const userAgentHash = userAgent.length > 0 ? `ua_${userAgent.length}` : null;

    const auditEntry = {
      user_id: payload.user_id || null,
      actor_role: payload.actor_role || 'PLAYER',
      action: payload.action,
      entity_type: 'auth',
      entity_id: payload.user_id || null,
      user_agent_hash: userAgentHash,
      metadata: {
        ...cleanMeta,
        timestamp: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from('audit_logs').insert(auditEntry);
    if (error) {
      // No interrumpir el flujo de auth si la tabla está en caché pendiente o RLS restringido
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
