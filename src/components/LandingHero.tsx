import React from 'react';
import { ArrowRight, ShieldCheck, Cpu, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LandingHeroProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onGoToDashboard: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onOpenAuth, onGoToDashboard }) => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
      {/* Background Graphic Scrim & Generated Visual Asset */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/hero_bingo_venezuela_1791180080082.jpg"
          alt="Lounge digital de Bingo Club Vnzla"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-25 filter brightness-75 scale-105 transform"
        />
        {/* Measured dark gradient overlay to guarantee AA contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070D18]/90 via-[#070D18]/95 to-[#070D18]" />
        
        {/* Subtle geometric light traces in gold and deep blue */}
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Unboxed Metadata Header Notice (No Pill Badges) */}
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-6 tracking-wide">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>FASE 1: FUNDACIÓN ARQUITECTÓNICA</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400">MODO DE PRUEBAS SEGURO</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400">SIN DINERO REAL ACTIVADO</span>
        </div>

        {/* Main Hero Content */}
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white font-['Outfit'] leading-[1.08] text-balance">
            BINGO CLUB <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">VNZLA</span>
          </h1>

          <p className="mt-4 text-xl sm:text-2xl font-medium text-slate-200 font-['Plus_Jakarta_Sans']">
            Bingo digital venezolano en tiempo real.
          </p>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Plataforma diseñada con arquitectura <strong>Server-Authoritative</strong>, control de acceso RBAC estricto, auditoría inmutable en PostgreSQL y transmisión de sorteos en vivo.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {user ? (
              <button
                onClick={onGoToDashboard}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-bold text-[#070D18] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
              >
                <span>ACCEDER A MI TABLERO</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-[#070D18] bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <span>REGISTRARME</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 hover:text-white rounded-xl border border-slate-700/80 transition-all whitespace-nowrap"
                >
                  <span>INICIAR SESIÓN</span>
                </button>
              </>
            )}
            <a
              href="#modalidades"
              className="inline-flex items-center justify-center px-5 py-3.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
            >
              Explorar Modalidades
            </a>
          </div>
        </div>

        {/* Claim-to-Proof Architectural Principles (Adjacent Grid) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Server-Authoritative</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              El cliente web nunca toma decisiones sobre números cantados, saldo ni cartones ganadores. Toda regla crítica se valida en el servidor.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Row Level Security (RLS)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              100% de las tablas protegidas por políticas en PostgreSQL. Aislamiento total de perfiles, cartones y transacciones por usuario.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Identidad Privada BCV</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Identificador público seguro (<span className="font-mono text-xs text-amber-300">BCV-XXXXXX</span>). Nunca se expone el correo electrónico en salas públicas.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
