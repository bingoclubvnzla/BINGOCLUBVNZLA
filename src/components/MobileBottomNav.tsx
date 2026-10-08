// ==============================================================================
// BINGO CLUB VNZLA ONLINE — BARRA INFERIOR MÓVIL (MOBILE-FIRST)
// Proporciona navegación táctil fluida estilo app nativa en dispositivos móviles
// ==============================================================================

import React from 'react';
import { Home, Radio, Grid3X3, User, Sparkles } from 'lucide-react';
import type { AppView } from './Navbar';
import { playClickSound } from '../lib/soundFx';

interface MobileBottomNavProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isAuthenticated: boolean;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  isAuthenticated,
  onOpenAuth,
}) => {
  const handleNav = (target: AppView) => {
    playClickSound();
    if (target === 'player' && !isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    setActiveView(target);
  };

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#060919]/95 backdrop-blur-2xl border-t border-slate-800/80 px-2 py-1.5 safe-area-bottom shadow-2xl">
      <div className="grid grid-cols-4 items-center justify-around gap-1.5 max-w-md mx-auto">
        {/* 1. Inicio / Lobby */}
        <button
          onClick={() => handleNav('landing')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeView === 'landing'
              ? 'text-amber-300 font-black bg-amber-500/15 border border-amber-500/30 shadow-md shadow-amber-500/10 scale-102'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
          aria-label="Ir al inicio"
        >
          <Home className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">Inicio</span>
        </button>

        {/* 2. Sala en Vivo */}
        <button
          onClick={() => handleNav('play')}
          className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeView === 'play'
              ? 'text-rose-300 font-black bg-rose-500/20 border border-rose-500/40 shadow-md shadow-rose-500/20 scale-102'
              : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
          }`}
          aria-label="Sala en Vivo"
        >
          <div className="relative">
            <Radio className="h-5 w-5 mb-0.5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>
          <span className="text-[10px] tracking-tight font-extrabold">En Vivo</span>
        </button>

        {/* 3. Modalidades / Cartones */}
        <button
          onClick={() => {
            if (isAuthenticated) {
              handleNav('player');
            } else {
              playClickSound();
              setActiveView('landing');
              setTimeout(() => {
                document.getElementById('modalidades')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeView === 'player'
              ? 'text-sky-300 font-black bg-sky-500/15 border border-sky-500/30 shadow-md shadow-sky-500/10 scale-102'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
          aria-label="Cartones o modalidades"
        >
          <Grid3X3 className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">{isAuthenticated ? 'Cartones' : 'Juegos'}</span>
        </button>

        {/* 4. Mi Cuenta / Perfil */}
        <button
          onClick={() => handleNav('player')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeView === 'player'
              ? 'text-amber-300 font-black bg-amber-500/15 border border-amber-500/30 shadow-md shadow-amber-500/10 scale-102'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
          aria-label="Mi Cuenta"
        >
          <User className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">
            {isAuthenticated ? 'Mi Cuenta' : 'Entrar'}
          </span>
        </button>
      </div>
    </div>
  );
};
