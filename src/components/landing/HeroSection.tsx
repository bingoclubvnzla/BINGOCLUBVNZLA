// ====================================================================
// BINGO CLUB VNZLA ONLINE — HERO SECTION
// Título, Subtítulo y Llamados a la Acción según especificación
// ====================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Sparkles, ArrowRight, PlayCircle, Lock } from 'lucide-react';

interface HeroSectionProps {
  onOpenAuth: (tab: 'login' | 'register') => void;
  onNavigateToDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenAuth,
  onNavigateToDashboard,
}) => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
      {/* Luces y efectos de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-[350px] h-[250px] bg-amber-500/10 blur-[110px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge Informativo Oficial */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-6 shadow-lg shadow-black/40">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>MODO DE PRUEBAS — FASE 1: FUNDACIÓN Y REGISTRO</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            BINGO CLUB <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">VNZLA</span>
          </h1>

          {/* Subtítulo Exacto del Requerimiento */}
          <p className="text-xl sm:text-2xl text-slate-200 font-medium mb-4">
            Bingo digital venezolano en tiempo real.
          </p>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
            Plataforma con arquitectura de máxima seguridad basada en PostgreSQL y Supabase. Servidor autoritativo, Row Level Security (RLS) y auditoría inmutable.
          </p>

          {/* Botones Principales de Acción */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {user ? (
              <button
                onClick={onNavigateToDashboard}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-base shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acceder a Mi Panel de Jugador</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-base shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>REGISTRARME</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base border border-slate-700 hover:border-slate-600 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>INICIAR SESIÓN</span>
                </button>
              </>
            )}
          </div>

          {/* Tres Pilares Técnicos Fundacionales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-6 border-t border-slate-800/80">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-amber-400 mb-1 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Servidor Autoritativo</span>
              </div>
              <p className="text-xs text-slate-400">
                El cliente nunca decide sorteos, premios ni transacciones. Cero manipulación en navegador.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-blue-400 mb-1 text-xs font-bold uppercase tracking-wider">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>Identidad BCV Protegida</span>
              </div>
              <p className="text-xs text-slate-400">
                Identificador público único por jugador. Datos personales y correos resguardados bajo RLS.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-emerald-400 mb-1 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>5 Modalidades Oficiales</span>
              </div>
              <p className="text-xs text-slate-400">
                Bingo 75, Bingo 90, Animalitos venezolanos, Objetos culturales y Chapitas 3x5.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
