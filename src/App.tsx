// ==============================================================================
// BINGO CLUB VNZLA ONLINE — ENRUTADOR PRINCIPAL Y APLICACIÓN OFICIAL
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar, type AppView } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { PlayerDashboard } from './components/PlayerDashboard';
import { OperatorDashboard } from './components/OperatorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';
import { SupervisorDashboard } from './components/dashboard/SupervisorDashboard';
import { LivePlayRoom } from './components/LivePlayRoom';
import { AuthModal } from './components/AuthModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FloatingBallsBackground } from './components/FloatingBallsBackground';
import { ShieldAlert, Lock, Loader2 } from 'lucide-react';
import {
  createDraw,
  startDraw,
  emitNextBall,
  createDrawSnapshot,
  type AuthoritativeDraw
} from './lib/drawEngine';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { DRAW_REALTIME_EVENTS } from './types/realtimeEvents';
import { SupabaseDiagnosticModal } from './components/SupabaseDiagnosticModal';
import { hasSufficientRole } from './lib/adminIdentities';
import { recordUnauthorizedRouteAccess } from './lib/secureAccessRules';
import type { UserRole } from './types/database';
import { enforceCanonicalDomainClientSide } from './lib/canonicalConfig';

function getViewPath(view: AppView): string {
  switch (view) {
    case 'player':
      return '/player';
    case 'operator':
      return '/operator';
    case 'supervisor':
      return '/supervisor';
    case 'admin':
      return '/admin';
    case 'super-admin':
      return '/super-admin';
    case 'play':
      return '/play';
    case 'landing':
    default:
      return '/';
  }
}

function parseInitialRoute(): { view: AppView; authMode?: 'login' | 'register' } {
  if (typeof window === 'undefined') return { view: 'landing' };
  const path = window.location.pathname.toLowerCase();

  if (path === '/player') return { view: 'player' };
  if (path === '/operator') return { view: 'operator' };
  if (path === '/supervisor') return { view: 'supervisor' };
  if (path === '/admin') return { view: 'admin' };
  if (path === '/super-admin') return { view: 'super-admin' };
  if (path === '/play' || path.startsWith('/play/')) return { view: 'play' };
  if (path === '/auth/callback' || path.startsWith('/auth/callback')) return { view: 'player' };
  if (path === '/login') return { view: 'landing', authMode: 'login' };
  if (path === '/register') return { view: 'landing', authMode: 'register' };

  return { view: 'landing' };
}

function getRoleTargetView(userRole: UserRole): { view: AppView; path: string } {
  if (userRole === 'SUPER_ADMIN') {
    return { view: 'super-admin', path: '/super-admin' };
  }
  if (userRole === 'ADMIN') {
    return { view: 'admin', path: '/admin' };
  }
  if (userRole === 'SUPERVISOR') {
    return { view: 'supervisor', path: '/supervisor' };
  }
  if (userRole === 'OPERATOR') {
    return { view: 'operator', path: '/operator' };
  }
  return { view: 'player', path: '/player' };
}

function AppContent() {
  const { isAuthenticated, role, user, isLoading } = useAuth();
  const initial = parseInitialRoute();

  const [activeView, setActiveView] = useState<AppView>(initial.view);
  const [authModalOpen, setAuthModalOpen] = useState(Boolean(initial.authMode));
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>(initial.authMode || 'login');
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  // Navegación con sincronización de historial de navegador
  const navigateTo = useCallback((newView: AppView, customPath?: string) => {
    setActiveView(newView);
    if (typeof window !== 'undefined') {
      const path = customPath || getViewPath(newView);
      if (window.location.pathname !== path) {
        window.history.pushState({ view: newView }, '', path);
      }
    }
  }, []);

  // Escuchar botón Atrás/Adelante del navegador
  useEffect(() => {
    const handlePopState = () => {
      const current = parseInitialRoute();
      setActiveView(current.view);
      if (current.authMode) {
        setAuthModalMode(current.authMode);
        setAuthModalOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Manejador cuando el usuario inicia sesión exitosamente
  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    const target = getRoleTargetView(role);
    navigateTo(target.view, target.path);
  }, [role, navigateTo]);

  // Garantizar dominio canónico absoluto (redirección instantánea si entra por preview alias)
  useEffect(() => {
    enforceCanonicalDomainClientSide();
  }, []);

  // Si la ruta inicial era /player o retorno de /auth/callback o parámetros de sesión OAuth
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
      const hasAuthHashOrCode = typeof window !== 'undefined' && (
        window.location.hash.includes('access_token') ||
        window.location.hash.includes('error') ||
        window.location.search.includes('code=')
      );

      if (currentPath === '/player' || currentPath.startsWith('/auth/callback') || hasAuthHashOrCode) {
        const target = getRoleTargetView(role);
        setActiveView(target.view);
        if (typeof window !== 'undefined' && (currentPath.startsWith('/auth/callback') || hasAuthHashOrCode)) {
          window.history.replaceState({ view: target.view }, '', target.path);
        }
      }
    }
  }, [isLoading, isAuthenticated, role]);

  // REGLA 12: Auditoría de intentos de navegación no autorizada en rutas administrativas
  useEffect(() => {
    if (isLoading) return;
    const isRestrictedView = ['super-admin', 'admin', 'supervisor', 'operator'].includes(activeView);
    if (!isRestrictedView) return;

    let unauthorized = false;
    if (!isAuthenticated) {
      unauthorized = true;
    } else if (activeView === 'super-admin' && role !== 'SUPER_ADMIN') {
      unauthorized = true;
    } else if (activeView === 'admin' && !hasSufficientRole(role, 'ADMIN')) {
      unauthorized = true;
    } else if (activeView === 'supervisor' && !hasSufficientRole(role, 'SUPERVISOR')) {
      unauthorized = true;
    } else if (activeView === 'operator' && !hasSufficientRole(role, 'OPERATOR')) {
      unauthorized = true;
    }

    if (unauthorized) {
      recordUnauthorizedRouteAccess({
        attemptedRoute: activeView,
        userId: user?.id,
        userRole: isAuthenticated ? role : 'ANON',
      }).catch(() => {});
    }
  }, [activeView, isAuthenticated, role, user?.id, isLoading]);

  // Estado del sorteo en vivo autoritativo (Server Authoritative)
  const [liveDraw, setLiveDraw] = useState<AuthoritativeDraw>(() => {
    const d = createDraw('ADMIN', 'system-admin', {
      modality_id: 'BINGO_75',
      title: 'Sorteo Estelar Bingo 75 en Directo',
    });
    d.status = 'READY';
    const started = startDraw(d, 'ADMIN', 'system-admin', 1);
    const b1 = emitNextBall(started.draw, 'ADMIN', started.draw.version);
    const b2 = emitNextBall(b1.draw, 'ADMIN', b1.draw.version);
    const b3 = emitNextBall(b2.draw, 'ADMIN', b2.draw.version);
    return b3.draw;
  });

  // Recuperación F5 / Reanudación de Sorteo Activo desde PostgreSQL (P3-01 Fix)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    async function recoverActiveDrawFromDB() {
      try {
        const { data, error } = await supabase
          .from('draws')
          .select('*')
          .in('status', ['ACTIVE', 'READY', 'PAUSED'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0 && isMounted) {
          const dbDraw = data[0];
          setLiveDraw((prev) => {
            // Reconciliar versión: sincronizar si la base de datos tiene sorteo activo o versión superior
            if (dbDraw.version >= prev.version || prev.id !== dbDraw.id) {
              return {
                id: dbDraw.id,
                public_code: dbDraw.public_code || `BCV-S${dbDraw.draw_number}`,
                room_id: dbDraw.room_id,
                modality_id: dbDraw.modality_id,
                title: dbDraw.title,
                status: dbDraw.status,
                version: dbDraw.version || 1,
                total_balls: dbDraw.metadata?.total_balls || 75,
                sequence: dbDraw.permutation || [],
                current_sequence: dbDraw.current_sequence || (dbDraw.drawn_numbers?.length || 0),
                drawn_numbers: dbDraw.drawn_numbers || [],
                created_at: dbDraw.created_at,
                created_by: dbDraw.metadata?.created_by || 'system',
                updated_at: dbDraw.updated_at || dbDraw.created_at,
                last_event_hash: `hash_${dbDraw.id}_${dbDraw.version || 1}`,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Sincronización de sorteo DB en segundo plano:', err);
      }
    }

    recoverActiveDrawFromDB();

    return () => {
      isMounted = false;
    };
  }, [activeView]);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/${mode}`);
    }
  };

  const closeAuth = () => {
    setAuthModalOpen(false);
    if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
      const currentPath = getViewPath(activeView);
      window.history.replaceState({}, '', currentPath);
    }
  };

  const handleEnterLiveRoom = (modalityId?: string) => {
    if (modalityId && modalityId !== liveDraw.modality_id) {
      const newD = createDraw('ADMIN', 'system-admin', {
        modality_id: modalityId as any,
        title: `Sorteo Oficial de ${modalityId}`,
      });
      newD.status = 'READY';
      const started = startDraw(newD, 'ADMIN', 'system-admin', 1);
      const b1 = emitNextBall(started.draw, 'ADMIN', started.draw.version);
      setLiveDraw(b1.draw);
    }
    navigateTo('play', '/play');
  };

  const handleOperatorEmitNext = () => {
    if (role === 'PLAYER') {
      alert('Acceso denegado: El rol PLAYER no puede emitir balotas.');
      return;
    }
    try {
      const res = emitNextBall(liveDraw, role, liveDraw.version);
      setLiveDraw(res.draw);

      if (isSupabaseConfigured) {
        const channel = supabase.channel(`draw:${liveDraw.id}`);
        channel.send({
          type: 'broadcast',
          event: res.finished ? DRAW_REALTIME_EVENTS.DRAW_FINISHED : DRAW_REALTIME_EVENTS.BALL_DRAWN,
          payload: res.event,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Error al emitir balota');
    }
  };

  // Pantalla de carga mientras se verifica la sesión en Supabase (previene parpadeo)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm mb-4 shadow-lg shadow-amber-500/20">
          BCV
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          <span>Iniciando sesión segura...</span>
        </div>
      </div>
    );
  }

  // Protección de rutas por RBAC y autenticación
  const renderActiveView = () => {
    if (activeView === 'play') {
      const snapshot = createDrawSnapshot(liveDraw, 1, 1);
      return (
        <LivePlayRoom
          initialSnapshot={snapshot}
          onBackToLobby={() => navigateTo(isAuthenticated ? 'player' : 'landing')}
          onOperatorEmitNext={handleOperatorEmitNext}
          isOperatorOrAdmin={role !== 'PLAYER'}
        />
      );
    }

    if (activeView === 'super-admin') {
      if (!isAuthenticated) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
              <Lock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Inicio de Sesión Requerido</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Debes iniciar sesión con una cuenta autorizada para acceder al panel de administración.
              </p>
              <button
                onClick={() => openAuth('login')}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
              >
                INICIAR SESIÓN
              </button>
            </div>
          </div>
        );
      }

      if (role !== 'SUPER_ADMIN') {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center shadow-2xl">
              <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Acceso Exclusivo SUPER_ADMIN</h2>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Este panel requiere rol de máxima jerarquía <strong className="text-rose-400">SUPER_ADMIN</strong>. Tu rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => navigateTo('player', '/player')}
                className="mt-6 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Volver a mi Cuenta
              </button>
            </div>
          </div>
        );
      }
      return <SuperAdminDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    if (activeView === 'supervisor') {
      if (!isAuthenticated) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
              <Lock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Inicio de Sesión Requerido</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Debes iniciar sesión con una cuenta de supervisor autorizada.
              </p>
              <button
                onClick={() => openAuth('login')}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
              >
                INICIAR SESIÓN
              </button>
            </div>
          </div>
        );
      }

      if (!hasSufficientRole(role, 'SUPERVISOR')) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-8 text-center shadow-2xl">
              <ShieldAlert className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Módulo de Supervisión</h2>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Este panel requiere rol de <strong className="text-indigo-400">SUPERVISOR</strong>, <strong className="text-rose-400">ADMIN</strong> o <strong className="text-rose-400">SUPER_ADMIN</strong>. Tu rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => navigateTo('player', '/player')}
                className="mt-6 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Volver a mi Cuenta
              </button>
            </div>
          </div>
        );
      }
      return <SupervisorDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    if (activeView === 'admin') {
      if (!isAuthenticated) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
              <Lock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Inicio de Sesión Requerido</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Debes iniciar sesión con una cuenta de administrador.
              </p>
              <button
                onClick={() => openAuth('login')}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
              >
                INICIAR SESIÓN
              </button>
            </div>
          </div>
        );
      }

      if (!hasSufficientRole(role, 'ADMIN')) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center shadow-2xl">
              <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Acceso Restringido (RBAC)</h2>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Se requiere rol de ADMINISTRADOR o SUPER_ADMIN. Tu rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => navigateTo('player', '/player')}
                className="mt-6 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Volver a mi Cuenta
              </button>
            </div>
          </div>
        );
      }
      return <AdminDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    if (activeView === 'operator') {
      if (!isAuthenticated) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
              <Lock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Inicio de Sesión Requerido</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Debes iniciar sesión con una cuenta de operador autorizada.
              </p>
              <button
                onClick={() => openAuth('login')}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
              >
                INICIAR SESIÓN
              </button>
            </div>
          </div>
        );
      }

      if (!hasSufficientRole(role, 'OPERATOR')) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-amber-500/30 bg-amber-950/20 p-8 text-center shadow-2xl">
              <ShieldAlert className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Módulo de Operaciones</h2>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Este panel es exclusivo para operadores y administradores. Tu rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => navigateTo('player', '/player')}
                className="mt-6 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Volver a mi Cuenta
              </button>
            </div>
          </div>
        );
      }
      return <OperatorDashboard />;
    }

    if (activeView === 'player') {
      if (!isAuthenticated) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
              <Lock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Inicio de Sesión Requerido</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Para acceder a tu panel de jugador y consultar tus cartones, debes iniciar sesión con tu cuenta de Bingo Club Venezuela.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={() => openAuth('login')}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
                >
                  INICIAR SESIÓN
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Crear Cuenta Nueva
                </button>
              </div>
            </div>
          </div>
        );
      }
      return <PlayerDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    return (
      <LandingPage
        onOpenAuth={openAuth}
        onExplorePlayer={() => {
          if (isAuthenticated) {
            const target = getRoleTargetView(role);
            navigateTo(target.view, target.path);
          } else {
            openAuth('login');
          }
        }}
        onEnterLiveRoom={handleEnterLiveRoom}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#060919] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-amber-400 selection:text-slate-950">
      {/* Fondo de esferas 3D de bingo y partículas de casino */}
      <FloatingBallsBackground />

      <div className="relative z-10 flex flex-col flex-1">
        <Navbar
          onOpenAuth={openAuth}
          activeView={activeView}
          setActiveView={(v) => navigateTo(v)}
          onOpenDiagnostic={() => setDiagnosticOpen(true)}
        />

        <main className="flex-1">
          {renderActiveView()}
        </main>

        <MobileBottomNav
          activeView={activeView}
          setActiveView={(v) => navigateTo(v)}
          isAuthenticated={isAuthenticated}
          onOpenAuth={openAuth}
        />
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuth}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />

      <SupabaseDiagnosticModal
        isOpen={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
