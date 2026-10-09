import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ConfigBanner: React.FC = () => {
  const { isConfigured } = useAuth();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900 border-b border-amber-500/20 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold uppercase tracking-wider text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Fase 1: Fundación Profesional
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 font-medium hidden md:inline">
            Modo de Pruebas Activo — Operaciones con dinero real desactivadas
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Supabase Backend:</span>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Conectado (PostgreSQL RLS)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                <ShieldAlert className="w-3 h-3" /> Sandbox Local
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-0.5 underline text-[11px]"
          >
            {expanded ? 'Ocultar detalles' : 'Ver arquitectura'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800 text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3 pb-1">
          <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80">
            <p className="font-semibold text-amber-400 mb-1">🔐 Server-Authoritative</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              El cliente web no decide premios, saldos ni números sorteados. La validación se ejecuta en PostgreSQL con Row Level Security.
            </p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80">
            <p className="font-semibold text-amber-400 mb-1">🛡️ Identidad BCV-XXXXXX</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Los jugadores reciben un código público anónimo. Los correos electrónicos y UUIDs internos nunca se exponen en partidas.
            </p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80">
            <p className="font-semibold text-amber-400 mb-1">🚫 Cero Mocks Financieros</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              La billetera indica con claridad &quot;Función financiera próximamente disponible&quot;, cumpliendo la regla de no inventar saldos ficticios.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
