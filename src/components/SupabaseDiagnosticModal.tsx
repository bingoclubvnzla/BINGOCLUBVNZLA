// ==============================================================================
// BINGO CLUB VNZLA ONLINE — DIAGNÓSTICO EN VIVO SUPABASE (FASE 2.1)
// Diferencia claramente: CONFIGURACIÓN AUSENTE, SUPABASE NO DISPONIBLE,
// AUTENTICACIÓN NO AUTORIZADA y ESQUEMA PENDIENTE. Sin exponer secretos.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  diagnoseSupabaseConnection,
  type SupabaseHealthReport,
  isSupabaseConfigured,
  supabaseUrl
} from '../lib/supabase';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  X,
  FileCode,
  ShieldCheck,
  Server
} from 'lucide-react';

interface SupabaseDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseDiagnosticModal: React.FC<SupabaseDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    const res = await diagnoseSupabaseConnection();
    setReport(res);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMigration(label);
    setTimeout(() => setCopiedMigration(null), 2000);
  };

  const maskedUrl = supabaseUrl ? supabaseUrl.replace(/https:\/\/[^.]+\./, 'https://[PROYECTO-ID].') : 'No configurado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                Diagnóstico de Integración Real Supabase (Fase 2.1)
              </h2>
              <p className="text-xs text-slate-400">
                Auditoría en tiempo real de PostgreSQL, Row Level Security y WebSockets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ESTADO GENERAL DIAGNOSTICADO */}
        {report && (
          <div className={`mb-6 p-4 rounded-xl border ${
            report.status === 'CONECTADO'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : report.status === 'ESQUEMA_PENDIENTE'
              ? 'bg-sky-950/30 border-sky-500/40 text-sky-300'
              : report.status === 'CONFIGURACION_AUSENTE'
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-start gap-3">
              {report.status === 'CONECTADO' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />}
              {report.status === 'ESQUEMA_PENDIENTE' && <Server className="h-5 w-5 shrink-0 text-sky-400 mt-0.5" />}
              {report.status === 'CONFIGURACION_AUSENTE' && <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />}
              {report.status === 'SUPABASE_NO_DISPONIBLE' && <XCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />}
              {report.status === 'AUTENTICACION_NO_AUTORIZADA' && <XCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />}
              <div>
                <span className="font-bold text-sm block mb-1">
                  ESTADO: {report.status}
                </span>
                <p className="text-xs leading-relaxed opacity-90">
                  {report.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MATRIZ DE VERIFICACIÓN TÉCNICA */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Parámetros y Servicios Verificados:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span>VITE_SUPABASE_URL</span>
              <span className={report?.urlConfigured ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {report?.urlConfigured ? 'PRESENTE' : 'AUSENTE'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span>VITE_SUPABASE_PUBLISHABLE_KEY</span>
              <span className={report?.keyConfigured ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {report?.keyConfigured ? 'PRESENTE' : 'AUSENTE'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span>Supabase Realtime WebSockets</span>
              <span className={report?.realtimeAvailable ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {report?.realtimeAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span>PostgreSQL Schema Cache</span>
              <span className={report?.schemaReady ? 'text-emerald-400 font-bold' : 'text-sky-400 font-bold'}>
                {report?.schemaReady ? 'LISTO' : 'PENDIENTE'}
              </span>
            </div>
          </div>
        </div>

        {/* INSTRUCCIONES DE APLICACIÓN DE MIGRACIONES SI EL ESQUEMA ESTÁ PENDIENTE */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <FileCode className="h-4 w-4 text-amber-400" />
              <span>Migraciones SQL Secuenciales (Fases 1 + 1.1 + 2)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Total: 4 archivos en /supabase/migrations</span>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Para aprovisionar o actualizar las tablas en el proyecto real de Supabase, ejecute en orden los archivos en el <strong>SQL Editor</strong> del panel de Supabase:
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-300">1. 20261005000000_initial_schema.sql</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Esquema Base</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-300">2. 20261005000001_rls_policies.sql</span>
              <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">Políticas RLS</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-300">3. 20261005000002_security_hardening.sql</span>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Hardening & Versioning</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-300">4. 20261005000003_draw_engine.sql</span>
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Motor de Sorteos CSPRNG</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
              <span className="text-slate-300">5. seed.sql</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Catálogo Oficial</span>
            </div>
          </div>
        </div>

        {/* ACCIONES DEL MODAL */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Volver a Diagnosticar</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
