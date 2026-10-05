// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SERVICIO DE ADMINISTRACIÓN Y RBAC (FASE 2.9)
// Control de identidades oficiales, elevación autorizada y auditoría
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateIdempotencyKey } from '../lib/security';
import type { UserProfile, UserRole, UserStatus, AuditLogEntry } from '../types/database';

export interface OfficialIdentityReport {
  SUPER_ADMIN: { status: 'ACTIVE' | 'ADMIN_IDENTITY_PENDING'; user_id?: string; email?: string };
  ADMIN: { status: 'ACTIVE' | 'ADMIN_IDENTITY_PENDING'; user_id?: string; email?: string };
  OPERATOR: { status: 'ACTIVE' | 'ADMIN_IDENTITY_PENDING'; user_id?: string; email?: string };
}

/**
 * Reconcilia y sincroniza las identidades administrativas oficiales en Supabase
 */
export async function syncOfficialAdminIdentities(): Promise<{ success: boolean; report?: OfficialIdentityReport; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      report: {
        SUPER_ADMIN: { status: 'ADMIN_IDENTITY_PENDING', email: 'v19629049@gmail.com' },
        ADMIN: { status: 'ADMIN_IDENTITY_PENDING', email: 'bingoclubvnzla@gmail.com' },
        OPERATOR: { status: 'ADMIN_IDENTITY_PENDING', email: 'bingobingovnz@gmail.com' },
      },
    };
  }

  try {
    const { data, error } = await supabase.rpc('sync_official_admin_identities');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, report: data as OfficialIdentityReport };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al reconciliar identidades administrativas.' };
  }
}

/**
 * Modifica el rol de un usuario con Step-Up Token de autorización
 */
export async function executeAdminChangeRole(
  stepUpAuthId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; target_id?: string; new_role?: UserRole; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const { data, error } = await supabase.rpc('execute_admin_change_role', {
      p_auth_id: stepUpAuthId,
      p_target_user_id: targetUserId,
      p_new_role: newRole,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, target_id: data.target_id, new_role: data.new_role };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar rol de usuario.' };
  }
}

/**
 * Modifica el estado (ACTIVE / BLOCKED / SUSPENDED) de un usuario
 */
export async function executeAdminToggleStatus(
  stepUpAuthId: string,
  targetUserId: string,
  newStatus: UserStatus,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Servidor no configurado.' };
  }

  try {
    const idempotencyKey = generateIdempotencyKey();
    const { error } = await supabase.rpc('execute_admin_toggle_user_status', {
      p_auth_id: stepUpAuthId,
      p_target_user_id: targetUserId,
      p_new_status: newStatus,
      p_reason: reason,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al modificar estado del usuario.' };
  }
}

/**
 * Lista usuarios registrados para gestión administrativa (con RLS)
 */
export async function fetchAllUsers(limit = 25): Promise<{ success: boolean; users: UserProfile[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true, users: [] };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, users: [], error: error.message };
    }
    return { success: true, users: (data as UserProfile[]) || [] };
  } catch (err: any) {
    return { success: false, users: [], error: err?.message || 'Error al obtener usuarios.' };
  }
}

/**
 * Lista toda la auditoría forense inmutable para SUPER_ADMIN y ADMIN
 */
export async function fetchFullAuditLogs(limit = 50): Promise<{ success: boolean; logs: AuditLogEntry[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true, logs: [] };
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, logs: [], error: error.message };
    }
    return { success: true, logs: (data as AuditLogEntry[]) || [] };
  } catch (err: any) {
    return { success: false, logs: [], error: err?.message || 'Error al obtener bitácora de auditoría.' };
  }
}
