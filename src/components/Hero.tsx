// ============================================================================
// BINGO CLUB VNZLA ONLINE — SECCIÓN HERO
// ============================================================================

import React from 'react';
import { ShieldCheck, Cpu, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface HeroProps {
  user: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onGoToDashboard: () => void;
}

export const Hero: React.FC<HeroProps> = ({ user, onOpenAuth, onGoToDashboard }) => {
  return (
    <section className="relative overflow-hidden border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 sm:py-28 lg:py-32">
      {/* Resplandor sutil con la paleta venezolana (Azul, Oro, Carmesí suave) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80"
      >
        <div 
          className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-blue-700/20 via-amber-500/15 to-rose-600/15 opacity-50"
          style={{
            clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Aviso obligatorio de Fase 1 (No dinero real en esta fase) */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>MODO DE PRUEBAS · FASE 1: FUNDACIÓN Y SEGURIDAD</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl font-sans" style={{ textWrap: 'balance' }}>
            BINGO CLUB <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">VNZLA</span>
          </h1>

          {/* Subtítulo solicitado textualmente */}
          <p className="mt-4 text-xl sm:text-2xl font-medium text-slate-300">
            Bingo digital venezolano en tiempo real.
          </p>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Plataforma con arquitectura <span className="text-slate-200 font-semibold">Server-Authoritative</span>, 
            identidad seudónima <span className="font-mono text-amber-300 text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">BCV-XXXXXX</span> y 
            seguridad bancaria con Row Level Security (RLS) en PostgreSQL.
          </p>

          {/* Botones de Acción */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {!user ? (
              <>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300 transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95"
                >
                  REGISTRARME
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-sm font-bold text-white hover:bg-slate-800 hover:border-slate-600 transition-all active:scale-95"
                >
                  INICIAR SESIÓN
                </button>
              </>
            ) : (
              <button
                onClick={onGoToDashboard}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-300 transition-all shadow-lg shadow-amber-500/10 active:scale-95"
              >
                IR A MI PANEL ({user.public_id})
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <a
              href="#modalidades"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-5 py-3.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              Explorar Modalidades
            </a>
          </div>

          {/* Pilares Técnicos y de Seguridad (Sin iconos en cada línea, tipografía limpia) */}
          <div className="mt-14 pt-10 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                <Cpu className="h-4 w-4" />
                <span>Servidor Autoritativo</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                El navegador nunca decide balotas, premios ni saldos. Toda mutación se valida en PostgreSQL con integridad garantizada.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>RLS & RBAC Estricto</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Row Level Security activo en las 19 tablas. Ningún jugador puede ver carteras, pagos ni cartones de otros usuarios.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
                <Lock className="h-4 w-4" />
                <span>Fase 1: Cero Dinero Ficticio</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                No inventamos balances ni transacciones simuladas. La billetera permanece en modo de preparación para la Fase 2.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
