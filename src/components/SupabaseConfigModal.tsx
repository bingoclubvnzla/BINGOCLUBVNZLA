// ============================================================================
// BINGO CLUB VNZLA ONLINE — MODAL DE CONFIGURACIÓN SUPABASE & ESTADO
// ============================================================================

import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Key, Globe } from 'lucide-react';
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseAnonKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && key.trim()) {
      localStorage.setItem('BCV_SUPABASE_URL', url.trim());
      localStorage.setItem('BCV_SUPABASE_KEY', key.trim());
      setSaved(true);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('BCV_SUPABASE_URL');
    localStorage.removeItem('BCV_SUPABASE_KEY');
    setSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Estado de Conexión a Supabase
            </h2>
            <p className="text-xs text-slate-400">
              Integración de Supabase Auth, PostgreSQL y Realtime
            </p>
          </div>
        </div>

        {/* Estado actual */}
        <div className={`p-4 rounded-xl border mb-6 text-xs ${
          isSupabaseConfigured
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            {isSupabaseConfigured ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Supabase Conectado y Operativo</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>Modo de Ejecución Local Activo</span>
              </>
            )}
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {isSupabaseConfigured
              ? 'Las consultas de autenticación y datos se ejecutan en tu proyecto Supabase remoto con políticas RLS.'
              : 'El cliente de desarrollo local gestiona sesiones, RBAC, auditoría y verificaciones de forma determinista para pruebas inmediatas.'}
          </p>
        </div>

        {/* Formulario para conectar proyecto Supabase */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Project URL (VITE_SUPABASE_URL)
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="url"
                required
                placeholder="https://xyzproject.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Anon / Publishable Key (VITE_SUPABASE_ANON_KEY)
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Solo claves públicas (anon). Nunca ingresar la clave service_role.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-amber-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors"
            >
              {saved ? 'Guardando...' : 'Conectar Proyecto'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Restablecer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
