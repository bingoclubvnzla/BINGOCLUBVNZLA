import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Menu, X, Shield, LayoutDashboard } from 'lucide-react';
import type { UserRole } from '../../types/database.types';

interface HeaderProps {
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  activeView: 'landing' | 'dashboard';
  setActiveView: (view: 'landing' | 'dashboard') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth, activeView, setActiveView }) => {
  const { user, profile, effectiveRole, isAuthenticated, logout, setActiveRolePreview } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleSelect = (roleToTest: UserRole | 'RESET') => {
    if (roleToTest === 'RESET') {
      setActiveRolePreview(null);
    } else {
      setActiveRolePreview(roleToTest);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element brand wordmark */}
        <button
          onClick={() => setActiveView('landing')}
          className="text-left group cursor-pointer focus:outline-none"
        >
          <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
            Bingo Club Vnzla
          </span>
        </button>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveView('landing')}
            className={`transition-colors hover:text-white ${activeView === 'landing' ? 'text-amber-400 font-semibold' : ''}`}
          >
            Inicio
          </button>
          <a href="#modalidades" className="transition-colors hover:text-white">
            Modalidades
          </a>
          <a href="#como-funciona" className="transition-colors hover:text-white">
            Cómo funciona
          </a>
          <a href="#seguridad" className="transition-colors hover:text-white">
            Seguridad
          </a>
          <a href="#juego-responsable" className="transition-colors hover:text-white">
            Juego Responsable
          </a>
          <a href="#faq" className="transition-colors hover:text-white">
            Preguntas
          </a>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView(activeView === 'dashboard' ? 'landing' : 'dashboard')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeView === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{activeView === 'dashboard' ? 'Ver Portal' : 'Mi Panel'}</span>
              </button>

              <div className="text-right leading-tight max-w-[140px] truncate">
                <span className="block text-xs font-medium text-slate-200 truncate">
                  {profile?.display_name || user?.email?.split('@')[0] || 'Jugador'}
                </span>
                <span className="text-[11px] font-mono text-amber-400 tabular-nums">
                  {profile?.public_id || 'BCV-USER'}
                </span>
              </div>

              <button
                onClick={() => logout()}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                Registrarme
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => setActiveView(activeView === 'dashboard' ? 'landing' : 'dashboard')}
              className="p-1.5 rounded-md text-amber-400 bg-slate-900 border border-slate-800"
              aria-label="Panel"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/98 px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm text-slate-300">
            <button
              onClick={() => {
                setActiveView('landing');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-amber-400"
            >
              Inicio
            </button>
            <a
              href="#modalidades"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-amber-400"
            >
              Modalidades
            </a>
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-amber-400"
            >
              Cómo funciona
            </a>
            <a
              href="#seguridad"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-amber-400"
            >
              Seguridad
            </a>
            <a
              href="#juego-responsable"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-amber-400"
            >
              Juego Responsable
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-amber-400"
            >
              Preguntas
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                  <span>Conectado como {profile?.display_name}</span>
                  <span className="font-mono text-amber-400">{profile?.public_id}</span>
                </div>
                <button
                  onClick={() => {
                    setActiveView('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg"
                >
                  Ir a Mi Panel ({effectiveRole})
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-xs font-medium text-red-400 bg-slate-900 rounded-lg"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 text-center text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 rounded-lg"
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 text-center text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg"
                >
                  Registrarme
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
