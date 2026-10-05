// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SERVICIO OFICIAL SUPABASE MFA & STEP-UP (FASE 2.8)
// Integración con Supabase Auth MFA (RFC 6238 TOTP), RPCs y Auditoría Forense
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordAuthAudit } from '../lib/audit';
import { generateIdempotencyKey } from '../lib/security';
import { checkTotpRateLimit, resetTotpRateLimit } from '../lib/mfaSecurity';
import type {
  MfaFactorInfo,
  RiskLevel,
  StepUpActionType,
  StepUpAuthorizationToken,
} from '../types/mfa';

export interface TotpEnrollmentResult {
  success: boolean;
  factorId?: string;
  qrCode?: string;
  secret?: string;
  uri?: string;
  error?: string;
}

export interface StepUpVerificationResult {
  success: boolean;
  token?: StepUpAuthorizationToken;
  error?: string;
  retryAfterSec?: number;
}

/**
 * Inicia el enrolamiento de un nuevo factor TOTP oficial en Supabase Auth
 * Genera el código QR compatible con Google Authenticator, Microsoft Authenticator y RFC 6238
 */
export async function enrollTotpFactor(): Promise<TotpEnrollmentResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor Supabase no configurado.' };
  }

  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Bingo Club Vnzla',
      friendlyName: 'Google Authenticator',
    });

    if (error || !data) {
      await recordAuthAudit({
        action: 'MFA_ENROLLMENT_FAILED',
        actor_role: 'PLAYER',
        metadata: { error: error?.message || 'Error al enrolar' },
      });
      return { success: false, error: error?.message || 'No se pudo iniciar el enrolamiento TOTP.' };
    }

    await recordAuthAudit({
      action: 'MFA_ENROLLMENT_STARTED',
      actor_role: 'PLAYER',
      metadata: { factor_id: data.id, factor_type: data.type },
    });

    return {
      success: true,
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de red inesperado al enrolar factor MFA.' };
  }
}

/**
 * Verifica el primer código TOTP para confirmar y activar definitivamente el factor en Supabase
 */
export async function verifyTotpEnrollment(factorId: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor Supabase no configurado.' };
  }

  const cleanCode = code.replace(/\D/g, '');
  if (cleanCode.length !== 6) {
    return { success: false, error: 'El código TOTP debe contener exactamente 6 dígitos numéricos.' };
  }

  try {
    // 1. Crear desafío
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challengeData) {
      return { success: false, error: challengeError?.message || 'Error al generar desafío MFA.' };
    }

    // 2. Verificar desafío con el código proporcionado
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: cleanCode,
    });

    if (verifyError) {
      await recordAuthAudit({
        action: 'MFA_VERIFICATION_FAILED',
        actor_role: 'PLAYER',
        metadata: { factor_id: factorId, context: 'enrollment_verification' },
      });
      return { success: false, error: 'Código de autenticación inválido o expirado. Verifique la hora de su dispositivo.' };
    }

    // 3. Actualizar estado en el perfil del usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          mfa_enabled: true,
          mfa_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await recordAuthAudit({
        action: 'MFA_ENROLLMENT_VERIFIED',
        user_id: user.id,
        actor_role: 'PLAYER',
        metadata: { factor_id: factorId },
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error durante la verificación del código.' };
  }
}

/**
 * Lista los factores MFA registrados del usuario actual
 */
export async function listUserMfaFactors(): Promise<{ success: boolean; factors: MfaFactorInfo[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true, factors: [] };
  }

  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      return { success: false, factors: [], error: error.message };
    }

    const totpFactors: MfaFactorInfo[] = (data.totp || []).map((f) => ({
      id: f.id,
      friendly_name: f.friendly_name || 'App de Autenticación',
      factor_type: 'totp',
      status: f.status as 'unverified' | 'verified',
      created_at: f.created_at,
      updated_at: f.updated_at,
    }));

    return { success: true, factors: totpFactors };
  } catch (err: any) {
    return { success: false, factors: [], error: err?.message || 'Error al listar factores MFA.' };
  }
}

/**
 * Desactiva un factor TOTP (Unenroll) de forma autorizada server-side con Step-Up
 */
export async function unenrollTotpFactor(factorId: string, stepUpAuthId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    // Si se proporciona token de Step-Up, ejecutar la RPC autoritativa en PostgreSQL
    if (stepUpAuthId) {
      const { error: rpcErr } = await supabase.rpc('execute_disable_mfa', {
        p_auth_id: stepUpAuthId,
        p_factor_id: factorId,
      });
      if (rpcErr) {
        return { success: false, error: rpcErr.message };
      }
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al desactivar el factor MFA.' };
  }
}

/**
 * Verifica el código TOTP y solicita al servidor una autorización Step-Up
 * Protegido con Rate Limiting, Anti-Replay y vinculación de acción.
 */
export async function verifyTotpAndMintStepUpToken(
  code: string,
  actionType: StepUpActionType,
  riskLevel: RiskLevel,
  resourceId?: string | null,
  metadata?: Record<string, any>
): Promise<StepUpVerificationResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Sesión no iniciada. Debe identificarse primero.' };
  }

  // Rate Limiter
  const rateLimit = checkTotpRateLimit(user.id);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Demasiados intentos fallidos. Por favor espere ${rateLimit.retryAfterSec} segundos antes de volver a intentar.`,
      retryAfterSec: rateLimit.retryAfterSec,
    };
  }

  const cleanCode = code.replace(/\D/g, '');
  if (cleanCode.length !== 6) {
    return { success: false, error: 'El código de seguridad debe tener 6 dígitos numéricos.' };
  }

  try {
    // 1. Obtener factor TOTP verificado del usuario
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      return { success: false, error: 'Error al verificar factores de seguridad.' };
    }

    const verifiedFactor = (factorsData.totp || []).find((f) => f.status === 'verified');
    if (!verifiedFactor) {
      return { success: false, error: 'No tiene un factor TOTP activo. Debe enrolar Google Authenticator antes de continuar.' };
    }

    // 2. Crear desafío y verificar código contra Supabase Auth oficial
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    });

    if (challengeError || !challengeData) {
      return { success: false, error: challengeError?.message || 'Error al iniciar desafío TOTP.' };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: challengeData.id,
      code: cleanCode,
    });

    if (verifyError) {
      await recordAuthAudit({
        action: 'MFA_VERIFICATION_FAILED',
        user_id: user.id,
        actor_role: 'PLAYER',
        metadata: { action_type: actionType, context: 'step_up_challenge' },
      });
      return { success: false, error: 'Código incorrecto. Verifique el código de su aplicación de autenticación.' };
    }

    // Reiniciar rate limiter al tener éxito
    resetTotpRateLimit(user.id);

    // 3. Solicitar al servidor PostgreSQL la creación autoritativa del Step-Up Token
    const idempotencyKey = generateIdempotencyKey();
    const { data: authRpcData, error: authRpcError } = await supabase.rpc('request_step_up_authorization', {
      p_action_type: actionType,
      p_risk_level: riskLevel,
      p_resource_id: resourceId || null,
      p_metadata: metadata || {},
      p_idempotency_key: idempotencyKey,
    });

    if (authRpcError || !authRpcData) {
      return { success: false, error: authRpcError?.message || 'No fue posible registrar la autorización temporal.' };
    }

    return {
      success: true,
      token: {
        authorization_id: authRpcData.authorization_id,
        expires_at: authRpcData.expires_at,
        reused: authRpcData.reused,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error inesperado al validar segundo factor.' };
  }
}

/**
 * Ejecuta el cambio de Pago Móvil con el Step-Up Token ya verificado
 */
export async function executeChangePagoMovil(
  authorizationId: string,
  phone: string,
  bankCode: string
): Promise<{ success: boolean; cooldownUntil?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const { data, error } = await supabase.rpc('execute_update_pago_movil', {
      p_auth_id: authorizationId,
      p_phone: phone,
      p_bank_code: bankCode,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, cooldownUntil: data?.cooldown_until };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al actualizar Pago Móvil.' };
  }
}

/**
 * Ejecuta la solicitud de retiro de fondos con Step-Up Token
 */
export async function executeRequestWithdrawal(
  authorizationId: string,
  amount: number,
  currency: string,
  destination: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const { data, error } = await supabase.rpc('execute_request_withdrawal', {
      p_auth_id: authorizationId,
      p_amount: amount,
      p_currency: currency,
      p_destination: destination,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requestId: data?.request_id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al procesar solicitud de retiro.' };
  }
}

/**
 * Ejecuta la eliminación y soft-delete de cuenta con Step-Up Token (CRITICAL)
 */
export async function executeAccountDeletion(
  authorizationId: string,
  confirmationPhrase: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const { error } = await supabase.rpc('execute_account_soft_deletion', {
      p_auth_id: authorizationId,
      p_confirmation_phrase: confirmationPhrase,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al procesar la eliminación de la cuenta.' };
  }
}

/**
 * Confirma una recarga de fondos con Step-Up Token (HIGH RISK - OPERATOR, SUPERVISOR, ADMIN, SUPER_ADMIN)
 */
export async function executeConfirmRecharge(
  authorizationId: string,
  requestId: string
): Promise<{ success: boolean; requestId?: string; amount?: number; newBalance?: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const { data, error } = await supabase.rpc('execute_confirm_recharge', {
      p_auth_id: authorizationId,
      p_request_id: requestId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      requestId: data?.request_id,
      amount: data?.amount,
      newBalance: data?.new_balance,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al confirmar recarga.' };
  }
}

/**
 * Aprueba una solicitud de retiro de fondos con Step-Up Token (CRITICAL RISK - SUPERVISOR, ADMIN, SUPER_ADMIN)
 */
export async function executeApproveWithdrawal(
  authorizationId: string,
  requestId: string
): Promise<{ success: boolean; requestId?: string; amount?: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const { data, error } = await supabase.rpc('execute_approve_withdrawal', {
      p_auth_id: authorizationId,
      p_request_id: requestId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      requestId: data?.request_id,
      amount: data?.amount,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al aprobar retiro.' };
  }
}
