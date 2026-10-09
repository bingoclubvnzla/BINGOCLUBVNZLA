// ====================================================================
// BINGO CLUB VNZLA ONLINE — MODAL DE INSPECCIÓN DE BASE DE DATOS Y SUPABASE
// ====================================================================

import React, { useState } from 'react';
import { getSupabaseConfigStatus } from '../../lib/supabaseClient';
import { X, Database, Check, Copy, Terminal, ShieldCheck } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const status = getSupabaseConfigStatus();

  if (!isOpen) return null;

  const envSnippet = `# Variables de Entorno del Frontend (Vite)
# NUNCA utilizar service_role en el navegador
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-600/40 text-blue-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Configuración y Estado de Supabase</h2>
            <p className="text-xs text-slate-400">FASE 1: Fundación PostgreSQL con Row Level Security</p>
          </div>
        </div>

        {/* Estado actual */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mb-6 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Estado de Conexión:</span>
            <span
              className={`px-2 py-0.5 rounded font-mono font-bold ${
                status.configured
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {status.mode}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">URL del Proyecto:</span>
            <span className="font-mono text-slate-200">{status.url}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Clave Pública Anon/Publishable:</span>
            <span className="font-mono text-slate-200">{status.keyConfigured ? 'Configurada (Anon)' : 'Pendiente en .env'}</span>
          </div>
        </div>

        {/* Instrucciones de enlace */}
        <div className="space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>Variables para Producción (.env)</span>
          </h3>
          <p className="text-slate-400">
            Para enlazar un proyecto Supabase existente, configura las siguientes claves públicas en tu archivo de entorno o variables de hosting (Vercel):
          </p>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto">
              {envSnippet}
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-medium flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-blue-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Migración SQL Disponible</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              El archivo completo con las 18 tablas, triggers, RLS y funciones se encuentra en:
            </p>
            <code className="block p-2 rounded bg-slate-950 text-amber-300 font-mono text-[10px]">
              /supabase/migrations/20260101000000_fase1_foundation.sql
            </code>
            <p className="text-slate-400 text-[11px]">
              Los datos iniciales de modalidades y roles están en:
            </p>
            <code className="block p-2 rounded bg-slate-950 text-amber-300 font-mono text-[10px]">
              /supabase/seed.sql
            </code>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
