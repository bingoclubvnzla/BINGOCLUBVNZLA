// ==============================================================================
// BINGO CLUB VNZLA ONLINE — NAVEGACIÓN Y CABECERA OFICIAL
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, Play, User as UserIcon, ShieldAlert, Sparkles, Radio } from 'lucide-react';
import type { UserRole } from '../types/database';
import { hasSufficientRole } from '../lib/adminIdentities';
import { playClickSound } from '../lib/soundFx';

export type AppView = 'landing' | 'player' | 'operator' | 'supervisor' | 'admin' | 'super-admin' | 'play' | 'support';

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  onOpenDiagnostic?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeView, setActiveView }) => {
  const { isAuthenticated, role, publicId, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEnterGame = () => {
    playClickSound();
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    if (role === 'SUPER_ADMIN') {
      setActiveView('super-admin');
    } else if (role === 'ADMIN') {
      setActiveView('admin');
    } else if (role === 'SUPERVISOR') {
      setActiveView('supervisor');
    } else if (role === 'OPERATOR') {
      setActiveView('operator');
    } else {
      setActiveView('player');
    }
  };

  const handleMyAccount = () => {
    playClickSound();
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    setActiveView('player');
  };

  const handleLogout = async () => {
    playClickSound();
    await signOut();
    setActiveView('landing');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060919]/90 backdrop-blur-xl transition-all shadow-lg shadow-black/40">
      {/* Barra superior de acento tricolor brillante */}
      <div className="h-1 w-full criollo-accent-bar shadow-sm" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand: BINGO CLUB VNZLA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="flex items-center gap-3 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl p-1 transition-transform active:scale-95"
            aria-label="Ir al inicio de Bingo Club Venezuela"
          >
            {/* Esfera 3D de Bingo dorada con brillo y logo oficial */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl ball-sphere-gold text-slate-950 font-black text-xs tracking-tighter transition-all duration-300 group-hover:scale-110 shadow-lg shadow-amber-500/30 overflow-hidden p-1">
              <img src="/bingoclub.png" alt="Logo" className="w-full h-full object-contain drop-shadow-xs" />
              {/* Baliza de estado en línea */}
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-xs" />
            </div>

            <div className="flex flex-col">
              <span className="font-display font-black tracking-wider text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors leading-none flex items-center gap-1.5">
                <span>BINGO CLUB</span>
                <span className="gold-text-gradient drop-shadow-sm font-extrabold">VNZLA</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-amber-400/80 font-bold uppercase mt-1 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Oficial Online
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-3 text-sm font-medium">
          <button
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className={`px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer font-bold ${
              activeView === 'landing'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Inicio
          </button>

          <button
            onClick={() => { playClickSound(); setActiveView('play'); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer font-extrabold border ${
              activeView === 'play'
                ? 'bg-rose-950/60 text-rose-300 border-rose-500/60 shadow-lg shadow-rose-500/20'
                : 'text-rose-400 hover:text-rose-300 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="tracking-wide">Sala en Vivo</span>
          </button>

          <a
            href="#modalidades"
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer font-medium"
          >
            Modalidades
          </a>

          <a
            href="#como-jugar"
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer font-medium"
          >
            Cómo jugar
          </a>

          <a
            href="#ayuda"
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer font-medium"
          >
            Ayuda
          </a>

          {/* Menú de gestión exclusiva para personal autorizado (RBAC) */}
          {isAuthenticated && hasSufficientRole(role, 'OPERATOR') && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs">
              {hasSufficientRole(role, 'OPERATOR') && (
                <button
                  onClick={() => setActiveView('operator')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                    activeView === 'operator' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-sky-300'
                  }`}
                >
                  Operador
                </button>
              )}
              {hasSufficientRole(role, 'SUPERVISOR') && (
                <button
                  onClick={() => setActiveView('supervisor')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                    activeView === 'supervisor' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-indigo-300'
                  }`}
                >
                  Supervisor
                </button>
              )}
              {hasSufficientRole(role, 'ADMIN') && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                    activeView === 'admin' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  Admin
                </button>
              )}
              {role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => setActiveView('super-admin')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                    activeView === 'super-admin' ? 'bg-rose-600 text-white font-bold' : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>Super Admin</span>
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => { playClickSound(); onOpenAuth('login'); }}
                className="px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-amber-300 transition-colors cursor-pointer rounded-xl hover:bg-slate-800/50"
              >
                INICIAR SESIÓN
              </button>
              <button
                onClick={() => { playClickSound(); onOpenAuth('register'); }}
                className="px-4 py-2.5 text-xs font-black text-slate-950 btn-gaming-gold shine-sweep rounded-xl shadow-lg cursor-pointer whitespace-nowrap"
              >
                REGISTRARME
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleEnterGame}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-black text-slate-950 btn-gaming-gold shine-sweep rounded-xl cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>ENTRAR AL JUEGO</span>
              </button>

              <button
                onClick={handleMyAccount}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                  activeView === 'player'
                    ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/20'
                    : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white hover:border-amber-500/40'
                }`}
              >
                <div className="h-5.5 w-5.5 rounded-full bg-amber-500/25 border border-amber-400/50 flex items-center justify-center text-amber-300 text-[10px] font-black">
                  {publicId ? publicId.slice(-2) : 'JG'}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="block text-[9px] font-mono leading-none text-slate-400">ID CLUB</span>
                  <span className="font-mono text-xs font-black text-amber-400 leading-tight">{publicId}</span>
                </div>
                <span className="sm:hidden font-mono text-[11px] text-amber-400 font-bold">{publicId}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-xs font-bold text-slate-400 bg-slate-900/80 border border-slate-800 rounded-xl hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-800/80 transition-all cursor-pointer"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden lg:inline">SALIR</span>
              </button>
            </div>
          )}

          {/* Botón de Menú Móvil */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-slate-900/70 border border-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-amber-400" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#060919]/98 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2.5 animate-in slide-in-from-top-2 duration-150 shadow-2xl">
          <button
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 px-3.5 rounded-xl text-sm font-bold text-slate-200 hover:bg-slate-900 hover:text-amber-400 transition-colors"
          >
            Inicio
          </button>
          <button
            onClick={() => { setActiveView('play'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 w-full text-left py-2.5 px-3.5 rounded-xl text-sm font-extrabold text-rose-400 bg-rose-950/30 border border-rose-500/30 hover:bg-rose-900/40"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span>Sala en Vivo (Sorteo Activo)</span>
          </button>
          <a
            href="#modalidades"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 px-3.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-amber-400"
          >
            5 Modalidades Criollas
          </a>
          <a
            href="#como-jugar"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 px-3.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-amber-400"
          >
            Cómo jugar
          </a>
          <a
            href="#ayuda"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 px-3.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-amber-400"
          >
            Centro de Ayuda
          </a>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => { handleEnterGame(); setMobileMenuOpen(false); }}
                className="w-full py-3 px-3 text-center text-xs font-black text-slate-950 btn-gaming-gold shine-sweep rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>ENTRAR AL JUEGO</span>
              </button>
              <button
                onClick={() => { setActiveView('player'); setMobileMenuOpen(false); }}
                className="flex items-center justify-between w-full text-left py-2.5 px-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-amber-400"
              >
                <span>Mi Panel de Jugador</span>
                <span className="font-mono text-[11px] text-slate-300">{publicId}</span>
              </button>
              {hasSufficientRole(role, 'OPERATOR') && (
                <button
                  onClick={() => { setActiveView('operator'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 px-3.5 rounded-xl text-xs font-bold text-sky-400 hover:bg-sky-950/30"
                >
                  Panel Operador
                </button>
              )}
              {hasSufficientRole(role, 'SUPERVISOR') && (
                <button
                  onClick={() => { setActiveView('supervisor'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 px-3.5 rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-950/30"
                >
                  Panel Supervisor
                </button>
              )}
              {hasSufficientRole(role, 'ADMIN') && (
                <button
                  onClick={() => { setActiveView('admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 px-3.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30"
                >
                  Panel Administrador
                </button>
              )}
              {role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => { setActiveView('super-admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 px-3.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-950/40"
                >
                  Panel Super Administrador
                </button>
              )}
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left py-2.5 px-3.5 text-xs font-bold text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                className="py-2.5 px-3 text-center text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700"
              >
                INICIAR SESIÓN
              </button>
              <button
                onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                className="py-2.5 px-3 text-center text-xs font-black text-slate-950 btn-gaming-gold shine-sweep rounded-xl"
              >
                REGISTRARME
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
