// ====================================================================
// BINGO CLUB VNZLA ONLINE — SUPABASE CLIENT SINGLETON
// Cliente seguro para navegador: SÓLO ANON/PUBLISHABLE KEY
// NUNCA service_role en el navegador — RLS activo
// ====================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lectura segura de variables Vite
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificador de URLs válidas de Supabase
export function isValidSupabaseUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://') && (url.includes('.supabase.co') || url.includes('.supabase.in') || url.includes('localhost'));
}

export function isValidSupabaseKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  // Standard Supabase anon keys are JWTs with 3 parts or sb_publishable_* format
  return key.length > 20 && !key.includes('example_anon_key');
}

// Determinación del estado de conexión
export const isSupabaseConfigured = (): boolean => {
  return isValidSupabaseUrl(envUrl) && isValidSupabaseKey(envAnonKey);
};

// Cliente oficial singleton
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? envUrl : 'https://placeholder-bcv.supabase.co',
  isSupabaseConfigured() ? envAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'bcv_auth_session',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Metadata pública del estado de conexión
export const getSupabaseConfigStatus = () => {
  return {
    configured: isSupabaseConfigured(),
    urlConfigured: isValidSupabaseUrl(envUrl),
    keyConfigured: isValidSupabaseKey(envAnonKey),
    url: envUrl ? `${envUrl.substring(0, 15)}...` : 'No configurada',
    mode: isSupabaseConfigured() ? 'PRODUCCIÓN_CONECTADA' : 'CONFIGURACIÓN_PENDIENTE',
  };
};
