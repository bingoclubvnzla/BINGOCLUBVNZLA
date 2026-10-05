import React from 'react';
import { ShieldAlert, Database, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StatusBannerProps {
  onOpenSetup: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ onOpenSetup }) => {
  const { isConfigured, effectiveRole } = useAuth();

  return (
    <aside aria-label="Aviso de modo de pruebas" className="bg-amber-950/40 border-b border-amber-500/20 text-xs text-amber-200/90 py-2 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500/10 text-amber-400 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
          </span>
          <p className="leading-snug">
            <strong className="font-semibold text-amber-300">FASE 1 — MODO DE PRUEBAS</strong>
            <span className="mx-2 text-amber-500/60" aria-hidden="true">·</span>
            <span>Fundación arquitectónica real. Operaciones financieras y dinero real desactivados.</span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={onOpenSetup}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-amber-500/30 text-amber-300 hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Database className="w-3 h-3 text-amber-400" />
            <span>{isConfigured ? 'Supabase Conectado' : 'Configurar Supabase'}</span>
            {isConfigured && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          </button>

          {effectiveRole !== 'PLAYER' && (
            <span className="text-sky-300 font-medium whitespace-nowrap bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30">
              Vista: {effectiveRole}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
