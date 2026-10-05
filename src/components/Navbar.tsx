// ==============================================================================
// BINGO CLUB VNZLA ONLINE — TOP BAR CONTRACT
// Zone 1: Single Brand wordmark text element
// Zone 2: Clean 4-6 text navigation links
// Zone 3: 1-2 primary actions (Auth / Dashboard / Logout)
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, User, LogOut, Menu, X, ChevronDown, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import type { UserRole } from '../types/database';

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  activeView: 'landing' | 'player' | 'operator' | 'admin' | 'play';
  setActiveView: (view: 'landing' | 'player' | 'operator' | 'admin' | 'play') => void;
  onOpenDiagnostic?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeView, setActiveView, onOpenDiagnostic }) => {
  const { isAuthenticated, role, publicId, signOut, isConfigured, setActiveTestRole, activeTestRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const handleRoleSwitch = (newRole: UserRole | null) => {
    setActiveTestRole(newRole);
    setRoleSwitcherOpen(false);
    if (newRole === 'ADMIN' || newRole === 'SUPER_ADMIN') {
      setActiveView('admin');
    } else if (newRole === 'OPERATOR' || newRole === 'SUPERVISOR') {
      setActiveView('operator');
    } else {
      setActiveView('player');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2.5 text-left text-xl font-bold tracking-tight text-white hover:text-amber-400 transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/10 font-black text-sm tracking-tighter">
              BCV
            </span>
            <span className="font-display font-bold tracking-wider">
              BINGO CLUB VNZLA
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveView('landing')}
            className={`transition-colors hover:text-amber-400 ${activeView === 'landing' ? 'text-amber-400 font-semibold' : ''}`}
          >
            Inicio
          </button>
          <button
            onClick={() => setActiveView('play')}
            className={`flex items-center gap-1.5 transition-colors hover:text-amber-400 ${activeView === 'play' ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sala en Vivo</span>
          </button>
          <a
            href="#modalidades"
            onClick={() => setActiveView('landing')}
            className="transition-colors hover:text-amber-400"
          >
            Modalidades
          </a>
          <a
            href="#como-funciona"
            onClick={() => setActiveView('landing')}
            className="transition-colors hover:text-amber-400"
          >
            Cómo Funciona
          </a>
          <a
            href="#seguridad"
            onClick={() => setActiveView('landing')}
            className="transition-colors hover:text-amber-400"
          >
            Seguridad & RLS
          </a>
          <a
            href="#faq"
            onClick={() => setActiveView('landing')}
            className="transition-colors hover:text-amber-400"
          >
            Preguntas
          </a>

          {/* Si está autenticado, enlaces a vistas de dashboards según rol */}
          {isAuthenticated && (
            <div className="flex items-center gap-4 pl-3 border-l border-slate-800">
              <button
                onClick={() => setActiveView('player')}
                className={`transition-colors hover:text-amber-400 ${activeView === 'player' ? 'text-amber-400 font-semibold' : ''}`}
              >
                Mi Panel
              </button>
              {(role === 'OPERATOR' || role === 'SUPERVISOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                <button
                  onClick={() => setActiveView('operator')}
                  className={`transition-colors hover:text-amber-400 ${activeView === 'operator' ? 'text-amber-400 font-semibold' : ''}`}
                >
                  Operador
                </button>
              )}
              {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`transition-colors hover:text-amber-400 ${activeView === 'admin' ? 'text-amber-400 font-semibold' : ''}`}
                >
                  Admin
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {/* Botón de Diagnóstico de Supabase (Fase 2.1) */}
          {onOpenDiagnostic && (
            <button
              onClick={onOpenDiagnostic}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-slate-900 border border-slate-700/80 text-slate-300 hover:border-amber-500/50 hover:text-white transition-colors cursor-pointer"
              title="Auditoría de conexión real con Supabase"
            >
              <Database className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Supabase</span>
            </button>
          )}

          {/* Selector de inspección de roles RBAC para pruebas de Fase 1 */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-md hover:bg-slate-800 transition-colors"
              title="Alternador de roles para verificación técnica de RBAC"
            >
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>Rol: {role}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {roleSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-800 bg-slate-900/95 p-1.5 shadow-xl backdrop-blur-md z-50">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Verificar Vistas RBAC
                </div>
                {(['PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSwitch(r)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                      role === r ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{r}</span>
                    {role === r && <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />}
                  </button>
                ))}
                {activeTestRole && (
                  <div className="pt-1 mt-1 border-t border-slate-800">
                    <button
                      onClick={() => handleRoleSwitch(null)}
                      className="w-full text-left px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded"
                    >
                      Restablecer al Real
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
              >
                INICIAR SESIÓN
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg shadow-sm hover:from-amber-300 hover:to-amber-400 transition-all whitespace-nowrap"
              >
                REGISTRARME
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-amber-400 font-mono tracking-tight">
                  {publicId}
                </span>
                <span className="text-[11px] text-slate-400">
                  {role}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-900 transition-all"
                title="Cerrar sesión segura"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          )}

          {/* Botón de Menú Móvil */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menú Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Inicio
          </button>
          <a
            href="#modalidades"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Modalidades
          </a>
          <a
            href="#como-funciona"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Cómo Funciona
          </a>
          <a
            href="#seguridad"
            onClick={() => { setActiveView('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-slate-300 hover:text-amber-400"
          >
            Seguridad & RLS
          </a>
          {isAuthenticated && (
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <button
                onClick={() => { setActiveView('player'); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-sm font-medium text-amber-400"
              >
                Mi Panel de Jugador
              </button>
              {(role === 'OPERATOR' || role === 'SUPERVISOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                <button
                  onClick={() => { setActiveView('operator'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 text-sm font-medium text-sky-400"
                >
                  Panel Operador
                </button>
              )}
              {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                <button
                  onClick={() => { setActiveView('admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 text-sm font-medium text-rose-400"
                >
                  Panel Administrador
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
