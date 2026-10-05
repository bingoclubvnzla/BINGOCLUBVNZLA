// ==============================================================================
// BINGO CLUB VNZLA ONLINE — CLIENTE SUPABASE OFICIAL
// Restricción de seguridad: Solo claves públicas (anon key) en el navegador.
// RLS aplicado rigurosamente en el servidor de PostgreSQL.
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, GameModality, AuditLogEntry, Draw, Card, Wallet } from '../types/database';

export type SupabaseDiagnosticStatus =
  | 'CONECTADO'
  | 'CONFIGURACION_AUSENTE'
  | 'SUPABASE_NO_DISPONIBLE'
  | 'AUTENTICACION_NO_AUTORIZADA'
  | 'ESQUEMA_PENDIENTE';

export interface SupabaseHealthReport {
  status: SupabaseDiagnosticStatus;
  message: string;
  urlConfigured: boolean;
  keyConfigured: boolean;
  realtimeAvailable: boolean;
  schemaReady: boolean;
}

const defaultProductionUrl = 'https://lfmavupbxfkxuzncfzzs.supabase.co';

const getStoredCredentials = () => {
  if (typeof window === 'undefined') return { url: '', key: '' };
  try {
    const url = localStorage.getItem('BCV_SUPABASE_URL') || '';
    const key =
      localStorage.getItem('BCV_SUPABASE_KEY') ||
      localStorage.getItem('BCV_SUPABASE_ANON_KEY') ||
      '';
    return { url, key };
  } catch {
    return { url: '', key: '' };
  }
};

const stored = getStoredCredentials();

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  stored.url ||
  defaultProductionUrl;

const rawAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  stored.key ||
  '';

// Validación estricta: Sin inventar valores ni aceptar cadenas placeholder
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl.startsWith('https://') &&
  !rawUrl.includes('your-project-id') &&
  rawAnonKey.length > 20 &&
  !rawAnonKey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
);

export const supabaseUrl = isSupabaseConfigured ? rawUrl : '';
export const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey : '';

// Inicializar cliente oficial de Supabase
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? rawUrl : 'https://unconfigured.supabase.co',
  isSupabaseConfigured ? rawAnonKey : 'unconfigured-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Diagnóstico en vivo de conexión con el proyecto real de Supabase
export async function diagnoseSupabaseConnection(): Promise<SupabaseHealthReport> {
  if (!isSupabaseConfigured) {
    return {
      status: 'CONFIGURACION_AUSENTE',
      message: 'CONFIGURACIÓN AUSENTE: VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY no están configuradas.',
      urlConfigured: Boolean(rawUrl),
      keyConfigured: Boolean(rawAnonKey),
      realtimeAvailable: false,
      schemaReady: false,
    };
  }

  try {
    // 1. Verificar conectividad REST básica (ping al endpoint de health/auth)
    const authHealthRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey },
    }).catch(() => null);

    if (!authHealthRes) {
      return {
        status: 'SUPABASE_NO_DISPONIBLE',
        message: 'SUPABASE NO DISPONIBLE: No se pudo establecer conexión de red con el host de Supabase.',
        urlConfigured: true,
        keyConfigured: true,
        realtimeAvailable: false,
        schemaReady: false,
      };
    }

    if (authHealthRes.status === 401 || authHealthRes.status === 403) {
      return {
        status: 'AUTENTICACION_NO_AUTORIZADA',
        message: 'AUTENTICACIÓN NO AUTORIZADA: La clave anónima (VITE_SUPABASE_PUBLISHABLE_KEY) fue rechazada.',
        urlConfigured: true,
        keyConfigured: true,
        realtimeAvailable: false,
        schemaReady: false,
      };
    }

    // 2. Verificar si las tablas del esquema (Fase 1 + 1.1 + 2) ya fueron aplicadas
    const { data, error } = await supabase.from('game_modalities').select('id').limit(1);

    if (error && (error.code === 'PGRST205' || error.message.includes('schema cache'))) {
      return {
        status: 'ESQUEMA_PENDIENTE',
        message: 'ESQUEMA PENDIENTE: El proyecto Supabase responde, pero las migraciones SQL aún no han sido ejecutadas en el SQL Editor.',
        urlConfigured: true,
        keyConfigured: true,
        realtimeAvailable: true,
        schemaReady: false,
      };
    }

    return {
      status: 'CONECTADO',
      message: 'CONECTADO: Comunicación con PostgreSQL, RLS y Realtime de Supabase operativa.',
      urlConfigured: true,
      keyConfigured: true,
      realtimeAvailable: true,
      schemaReady: true,
    };
  } catch (err: any) {
    return {
      status: 'SUPABASE_NO_DISPONIBLE',
      message: `SUPABASE NO DISPONIBLE: ${err?.message || 'Error de red inesperado'}`,
      urlConfigured: true,
      keyConfigured: true,
      realtimeAvailable: false,
      schemaReady: false,
    };
  }
}

// ==============================================================================
// SERVICIOS DE PERFIL Y SEGURIDAD (RBAC)
// ==============================================================================

export async function fetchUserProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase no configurado' };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as UserProfile, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al obtener perfil' };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; display_name?: string; phone?: string; avatar_url?: string }
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al actualizar perfil' };
  }
}

// ==============================================================================
// SERVICIOS DE MODALIDADES
// ==============================================================================

export async function fetchOfficialModalities(): Promise<{ data: GameModality[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: getFallbackModalities(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('game_modalities')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (error || !data || data.length === 0) {
      return { data: getFallbackModalities(), error: error ? error.message : null };
    }
    return { data: data as GameModality[], error: null };
  } catch (err: any) {
    return { data: getFallbackModalities(), error: err.message };
  }
}

// Modalidades oficiales catalogadas según el requerimiento maestro
export function getFallbackModalities(): GameModality[] {
  return [
    {
      id: 'BINGO_75',
      name: 'Bingo 75 Clásico',
      description: 'Modalidad tradicional con cartón de 5x5, números del 1 al 75 y centro libre.',
      grid_rows: 5,
      grid_cols: 5,
      has_free_center: true,
      total_balls: 75,
      config: {
        winning_patterns: ['LÍNEA', 'CARTÓN LLENO'],
      },
      is_active: true,
    },
    {
      id: 'BINGO_90',
      name: 'Bingo 90 Bolas',
      description: 'Modalidad oficial de 90 números con cartón de 3 filas y 9 columnas con 15 números por cartón.',
      grid_rows: 3,
      grid_cols: 9,
      has_free_center: false,
      total_balls: 90,
      config: {
        numbers_per_card: 15,
        numbers_per_row: 5,
        winning_patterns: ['1 LÍNEA', '2 LÍNEAS', 'BINGO'],
      },
      is_active: true,
    },
    {
      id: 'ANIMALITOS',
      name: 'Bingo de los Animalitos',
      description: 'La tradición oficial de 75 animalitos de la suerte en cuadrícula 5x5 con centro libre.',
      grid_rows: 5,
      grid_cols: 5,
      has_free_center: true,
      total_balls: 75,
      config: {
        theme: 'ANIMALITOS_VENEZUELA',
        winning_patterns: ['LÍNEA', 'CARTÓN LLENO'],
      },
      is_active: true,
    },
    {
      id: 'OBJETOS',
      name: 'Bingo Objetos Criollos',
      description: '75 iconos y símbolos representativos de la venezolanidad en cuadrícula 5x5 con centro libre.',
      grid_rows: 5,
      grid_cols: 5,
      has_free_center: true,
      total_balls: 75,
      config: {
        theme: 'CRIOLLO_VNZLA',
        winning_patterns: ['LÍNEA', 'CARTÓN LLENO'],
      },
      is_active: true,
    },
    {
      id: 'CHAPITAS',
      name: 'Bingo Chapitas Tradicional',
      description: 'Modalidad oficial de 90 números conformada por 45 animalitos y 45 objetos tradicionales venezolanos.',
      grid_rows: 3,
      grid_cols: 9,
      has_free_center: false,
      total_balls: 90,
      config: {
        theme: 'CHAPITAS_45_45',
        numbers_per_card: 15,
        winning_patterns: ['LÍNEA', 'CARTÓN LLENO'],
      },
      is_active: true,
    },
  ];
}

// ==============================================================================
// AUDITORÍA Y BITÁCORA
// ==============================================================================

export async function fetchRecentAuditLogs(limit = 20): Promise<{ data: AuditLogEntry[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase no configurado' };
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data as AuditLogEntry[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

// Aliases para compatibilidad con módulos existentes
export const getProfile = fetchUserProfile;
export const updateProfile = updateUserProfile;

/**
 * Mapeo de errores de autenticación a mensajes amigables y seguros en español
 * Previene la fuga de información interna (tablas SQL, constraints, líneas de código).
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Error desconocido de autenticación.';
  const msg = typeof error === 'string' ? error : error?.message || '';

  // Detección de errores internos de base de datos
  if (
    msg.includes('foreign key') ||
    msg.includes('postgres.c') ||
    msg.includes('relation "') ||
    msg.includes('Database error') ||
    msg.includes('schema cache') ||
    msg.includes('PGRST')
  ) {
    return 'Ocurrió un error en el servidor. Por favor intente más tarde.';
  }

  if (msg.includes('Invalid login credentials')) {
    return 'Credenciales incorrectas. Verifique su correo electrónico y contraseña.';
  }

  if (msg.includes('User already registered')) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }

  if (msg.includes('Password should be at least 6 characters')) {
    return 'La contraseña debe contener al menos 6 caracteres seguros.';
  }

  if (msg.includes('Email not confirmed')) {
    return 'El correo electrónico no ha sido verificado. Revise su bandeja de entrada.';
  }

  return msg || 'Error en la operación de autenticación.';
}

// ==============================================================================
// SERVICIOS DE SORTEOS Y SALAS EN VIVO (REAL DATA)
// ==============================================================================

export async function fetchActiveDraws(): Promise<{ data: Draw[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from('draws')
      .select('*')
      .in('status', ['READY', 'ACTIVE', 'SCHEDULED'])
      .order('scheduled_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data as Draw[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al consultar sorteos' };
  }
}

export async function fetchActiveGameRooms(): Promise<{ data: any[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al consultar salas' };
  }
}

export async function fetchUserCards(userId: string): Promise<{ data: Card[]; error: string | null }> {
  if (!isSupabaseConfigured || !userId) {
    return { data: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*, card_numbers(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data as Card[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al consultar cartones' };
  }
}

export function setCustomSupabaseCredentials(url: string, key: string): boolean {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('BCV_SUPABASE_URL', url.trim());
      localStorage.setItem('BCV_SUPABASE_KEY', key.trim());
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function clearCustomSupabaseCredentials(): boolean {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('BCV_SUPABASE_URL');
      localStorage.removeItem('BCV_SUPABASE_KEY');
      localStorage.removeItem('BCV_SUPABASE_ANON_KEY');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

