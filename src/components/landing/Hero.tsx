import React from 'react';
import { ArrowRight, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeroProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenSetup: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAuth, onOpenSetup }) => {
  const { isAuthenticated, profile } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-16 sm:py-24 border-b border-slate-800">
      {/* Decorative ambient subtle glow */}
      <div 
        aria-hidden="true" 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-blue-900/20 via-amber-600/10 to-red-900/10 blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Block */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Unboxed natural kicker */}
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest">
              <span>Bingo Club Venezuela Online</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400 font-normal">Fase 1</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight" style={{ textWrap: 'balance' }}>
              BINGO CLUB VNZLA
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 font-medium leading-relaxed" style={{ textWrap: 'balance' }}>
              Bingo digital venezolano en tiempo real.
            </p>

            <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
              Plataforma desarrollada con arquitectura segura de servidor autoritativo, control de acceso RBAC, auditoría y cartones digitales con verificación criptográfica.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="px-6 py-3 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 whitespace-nowrap active:scale-[0.98]"
                  >
                    <span>REGISTRARME</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-6 py-3 text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <span>INICIAR SESIÓN</span>
                  </button>
                </>
              ) : (
                <div className="p-3 bg-slate-900/90 border border-slate-700 rounded-xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Bienvenido de vuelta</span>
                    <span className="text-sm font-bold text-white">
                      {profile?.display_name} <span className="font-mono text-xs text-amber-400 font-normal">({profile?.public_id})</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Test mode notice */}
            <div className="pt-4 border-t border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-300 font-medium">MODO DE PRUEBAS ACTIVO:</strong> Las funciones financieras, recargas por Pago Móvil y Binance serán habilitadas en la Fase 2 tras completar la certificación técnica.
              </p>
            </div>
          </div>

          {/* Right Visual Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] flex items-center justify-center">
              <img
                src="/src/assets/images/bingo_hero_banner_1791225375124.jpg"
                alt="Ambiente visual oficial de Bingo Club Venezuela"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback container when asset is missing
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.classList.add('bg-gradient-to-br', 'from-blue-950', 'via-slate-900', 'to-amber-950/40');
                  }
                }}
              />
              
              {/* Overlay badge info */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-6">
                <span className="text-xs font-mono text-amber-400 tabular-nums">ESTÁNDAR VENEZUELA</span>
                <h3 className="text-lg font-bold text-white font-serif">5 Modalidades Nativas</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Bingo 75 · Bingo 90 · Animalitos · Objetos · Chapitas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
