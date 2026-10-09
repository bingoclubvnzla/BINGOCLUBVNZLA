import React, { useState } from 'react';
import {
  Sparkles,
  LogOut,
  User as UserIcon,
  Shield,
  Copy,
  Check,
  LayoutDashboard,
  Menu,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/database.types';

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  activeView: 'landing' | 'player' | 'operator' | 'admin';
  setActiveView: (view: 'landing' | 'player' | 'operator' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeView, setActiveView }) => {
  const { user, profile, role, signOut, switchRolePreview } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const copyPublicCode = () => {
    if (profile?.public_code) {
      navigator.clipboard.writeText(profile.public_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case 'SUPER_ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'ADMIN':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'SUPERVISOR':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'OPERATOR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => setActiveView('landing')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-lg tracking-tighter bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                BCV
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                BINGO CLUB VNZLA
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              Bingo Club Venezuela Online
            </p>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          <button
            onClick={() => setActiveView('landing')}
            className={`text-xs font-semibold tracking-wide transition-colors ${
              activeView === 'landing' ? 'text-amber-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            Inicio
          </button>
          <a
            href="#modalidades"
            onClick={() => setActiveView('landing')}
            className="text-xs font-semibold tracking-wide text-slate-300 hover:text-white transition-colors"
          >
            Modalidades
          </a>
          <a
            href="#como-funciona"
            onClick={() => setActiveView('landing')}
            className="text-xs font-semibold tracking-wide text-slate-300 hover:text-white transition-colors"
          >
            Cómo Funciona
          </a>
          <a
            href="#seguridad"
            onClick={() => setActiveView('landing')}
            className="text-xs font-semibold tracking-wide text-slate-300 hover:text-white transition-colors"
          >
            Seguridad
          </a>
          <a
            href="#juego-responsable"
            onClick={() => setActiveView('landing')}
            className="text-xs font-semibold tracking-wide text-slate-300 hover:text-white transition-colors"
          >
            Juego Responsable
          </a>
          <a
            href="#faq"
            onClick={() => setActiveView('landing')}
            className="text-xs font-semibold tracking-wide text-slate-300 hover:text-white transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* User Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* Public Code Badge */}
              <button
                onClick={copyPublicCode}
                title="Copiar código público anónimo"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono transition-colors group"
              >
                <span className="text-slate-400 text-[10px]">ID:</span>
                <span className="font-bold text-amber-400">
                  {profile?.public_code || 'BCV-000000'}
                </span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                )}
              </button>

              {/* Role Inspector / Switcher for Testing */}
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${getRoleBadgeColor(
                    role
                  )}`}
                  title="Inspeccionar vistas por Rol"
                >
                  <Shield className="w-3 h-3" />
                  <span>{role}</span>
                  <SlidersHorizontal className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-fade-in text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                      Simular Rol (Fase 1 QA)
                    </div>
                    {(['PLAYER', 'OPERATOR', 'ADMIN'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          switchRolePreview(r);
                          setRoleMenuOpen(false);
                          if (r === 'PLAYER') setActiveView('player');
                          if (r === 'OPERATOR') setActiveView('operator');
                          if (r === 'ADMIN') setActiveView('admin');
                        }}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          role === r ? 'text-amber-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        <span>{r}</span>
                        {role === r && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dashboard Navigation Button */}
              <button
                onClick={() => {
                  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
                    setActiveView('admin');
                  } else if (role === 'OPERATOR' || role === 'SUPERVISOR') {
                    setActiveView('operator');
                  } else {
                    setActiveView('player');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Panel</span>
              </button>

              {/* Sign Out */}
              <button
                onClick={signOut}
                title="Cerrar Sesión"
                className="p-2 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
              >
                INICIAR SESIÓN
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>REGISTRARME</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex sm:hidden items-center gap-2">
          {user && (
            <button
              onClick={() => {
                if (role === 'ADMIN') setActiveView('admin');
                else if (role === 'OPERATOR') setActiveView('operator');
                else setActiveView('player');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
            >
              Panel
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-2 pb-5 bg-slate-950 border-b border-slate-800 space-y-3 animate-fade-in">
          {user ? (
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Jugador:</span>
                <span className="text-xs font-bold text-white">{profile?.display_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Código ID:</span>
                <span className="text-xs font-mono font-bold text-amber-400">{profile?.public_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Rol:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadgeColor(role)}`}>
                  {role}
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    setActiveView(role === 'ADMIN' ? 'admin' : role === 'OPERATOR' ? 'operator' : 'player');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg text-center"
                >
                  Ir al Panel
                </button>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  onOpenAuth('login');
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl text-center"
              >
                INICIAR SESIÓN
              </button>
              <button
                onClick={() => {
                  onOpenAuth('register');
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl text-center"
              >
                REGISTRARME
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-900 flex flex-col space-y-2 text-xs text-slate-400 font-medium">
            <button
              onClick={() => {
                setActiveView('landing');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-white"
            >
              Inicio
            </button>
            <a href="#modalidades" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
              Modalidades
            </a>
            <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
              Cómo Funciona
            </a>
            <a href="#seguridad" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
              Seguridad Antifraude
            </a>
            <a href="#juego-responsable" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
              Juego Responsable
            </a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
              Preguntas Frecuentes
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
