// ==============================================================================
// BINGO CLUB VNZLA ONLINE — NAVEGACIÓN Y CABECERA OFICIAL
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, Play, User as UserIcon, ShieldAlert } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-850/80 bg-[#050b14]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand: BINGO CLUB VNZLA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-black text-xs tracking-tighter">
              BCV
            </span>
            <span className="font-display font-extrabold tracking-wider text-base sm:text-lg text-white group-hover:text-amber-400 transition-colors">
              BINGO CLUB <span className="gold-text-gradient">VNZLA</span>
            </span>
          </button>
        </div>

        {/* Zone 2: Enlaces de navegación públicos */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className={`transition-colors hover:text-amber-400 cursor-pointer ${
              activeView === 'landing' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Inicio
          </button>

          <button
            onClick={() => { playClickSound(); setActiveView('play'); }}
            className={`flex items-center gap-1.5 transition-colors hover:text-amber-400 cursor-pointer ${
              activeView === 'play' ? 'text-amber-400 font-semibold' : 'text-slate-300'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sala en Vivo</span>
          </button>

          <a
            href="#modalidades"
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="transition-colors hover:text-amber-400 cursor-pointer"
          >
            Modalidades
          </a>

          <a
            href="#como-jugar"
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="transition-colors hover:text-amber-400 cursor-pointer"
          >
            Cómo jugar
          </a>

          <a
            href="#ayuda"
            onClick={() => { playClickSound(); setActiveView('landing'); }}
            className="transition-colors hover:text-amber-400 cursor-pointer"
          >
            Ayuda
          </a>


          {/* Menú de gestión exclusiva para personal autorizado (RBAC) */}
          {isAuthenticated && hasSufficientRole(role, 'OPERATOR') && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
              {hasSufficientRole(role, 'OPERATOR') && (
                <button
                  onClick={() => setActiveView('operator')}
                  className={`px-2 py-1 rounded transition-colors ${
                    activeView === 'operator' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400 hover:text-sky-300'
                  }`}
                >
                  Operador
                </button>
              )}
              {hasSufficientRole(role, 'SUPERVISOR') && (
                <button
                  onClick={() => setActiveView('supervisor')}
                  className={`px-2 py-1 rounded transition-colors ${
                    activeView === 'supervisor' ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'text-slate-400 hover:text-indigo-300'
                  }`}
                >
                  Supervisor
                </button>
              )}
              {hasSufficientRole(role, 'ADMIN') && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-2 py-1 rounded transition-colors ${
                    activeView === 'admin' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  Admin
                </button>
              )}
              {role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => setActiveView('super-admin')}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
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

        {/* Acciones principales de cabecera */}
        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => { playClickSound(); onOpenAuth('login'); }}
                className="px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
              >
                INICIAR SESIÓN
              </button>
              <button
                onClick={() => { playClickSound(); onOpenAuth('register'); }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-lg shadow-sm hover:from-amber-300 hover:to-amber-500 transition-all cursor-pointer whitespace-nowrap"
              >
                REGISTRARME
              </button>
            </div>
          ) : (

            <div className="flex items-center gap-3">
              <button
                onClick={handleEnterGame}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer shadow-sm"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>ENTRAR AL JUEGO</span>
              </button>

              <button
                onClick={handleMyAccount}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  activeView === 'player'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <UserIcon className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">MI CUENTA</span>
                <span className="sm:hidden font-mono text-[11px] text-amber-400">{publicId}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-900 border border-slate-800 rounded-lg hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-900 transition-all cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">CERRAR SESIÓN</span>
              </button>
            </div>
          )}

          {/* Botón de Menú Móvil */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menú Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-2.5">
          <button
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Inicio
          </button>
          <button
            onClick={() => { setActiveView('play'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sala en Vivo</span>
          </button>
          <a
            href="#modalidades"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Modalidades
          </a>
          <a
            href="#como-jugar"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Cómo jugar
          </a>
          <a
            href="#ayuda"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Ayuda
          </a>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => { handleEnterGame(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 px-3 text-center text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg shadow-sm"
              >
                ENTRAR AL JUEGO
              </button>
              <button
                onClick={() => { setActiveView('player'); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-sm font-medium text-amber-400"
              >
                Mi Cuenta ({publicId})
              </button>
              {hasSufficientRole(role, 'OPERATOR') && (
                <button
                  onClick={() => { setActiveView('operator'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-1.5 text-xs font-medium text-sky-400"
                >
                  Panel Operador
                </button>
              )}
              {hasSufficientRole(role, 'SUPERVISOR') && (
                <button
                  onClick={() => { setActiveView('supervisor'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-1.5 text-xs font-medium text-indigo-400"
                >
                  Panel Supervisor
                </button>
              )}
              {hasSufficientRole(role, 'ADMIN') && (
                <button
                  onClick={() => { setActiveView('admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-1.5 text-xs font-medium text-rose-400"
                >
                  Panel Administrador
                </button>
              )}
              {role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => { setActiveView('super-admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-1.5 text-xs font-bold text-rose-500"
                >
                  Panel Super Administrador
                </button>
              )}
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left py-2 text-xs font-medium text-rose-400 hover:text-rose-300"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                className="py-2 px-3 text-center text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg"
              >
                INICIAR SESIÓN
              </button>
              <button
                onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                className="py-2 px-3 text-center text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg"
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
