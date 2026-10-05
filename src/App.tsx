// ==============================================================================
// BINGO CLUB VNZLA ONLINE — ENRUTADOR PRINCIPAL Y APLICACIÓN
// ==============================================================================

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { PlayerDashboard } from './components/PlayerDashboard';
import { OperatorDashboard } from './components/OperatorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';
import { SupervisorDashboard } from './components/dashboard/SupervisorDashboard';
import { LivePlayRoom } from './components/LivePlayRoom';
import { AuthModal } from './components/AuthModal';
import { ShieldAlert } from 'lucide-react';
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
import type { ModalityCode } from './types/database';
import type { AppView } from './components/Navbar';
import { hasSufficientRole } from './lib/adminIdentities';

function AppContent() {
  const { isAuthenticated, role, publicId } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  // Estado del sorteo en vivo autoritativo (Server Authoritative)
  const [liveDraw, setLiveDraw] = useState<AuthoritativeDraw>(() => {
    const d = createDraw('ADMIN', 'system-admin', {
      modality_id: 'BINGO_75',
      title: 'Sorteo Estelar Bingo 75 en Directo',
    });
    // Preparar e iniciar para que la sala esté lista
    d.status = 'READY';
    const started = startDraw(d, 'ADMIN', 'system-admin', 1);
    // Emitir 3 balotas iniciales autoritativas para que la sala comience con historial real
    const b1 = emitNextBall(started.draw, 'ADMIN', started.draw.version);
    const b2 = emitNextBall(b1.draw, 'ADMIN', b1.draw.version);
    const b3 = emitNextBall(b2.draw, 'ADMIN', b2.draw.version);
    return b3.draw;
  });

  const openAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleEnterLiveRoom = (modalityId?: string) => {
    if (modalityId && modalityId !== liveDraw.modality_id) {
      // Iniciar nuevo sorteo autoritativo para la modalidad solicitada
      const newD = createDraw('ADMIN', 'system-admin', {
        modality_id: modalityId as any,
        title: `Sorteo Oficial de ${modalityId}`,
      });
      newD.status = 'READY';
      const started = startDraw(newD, 'ADMIN', 'system-admin', 1);
      const b1 = emitNextBall(started.draw, 'ADMIN', started.draw.version);
      setLiveDraw(b1.draw);
    }
    setActiveView('play');
  };

  const handleOperatorEmitNext = () => {
    if (role === 'PLAYER') {
      alert('Acceso denegado: El rol PLAYER no puede emitir balotas.');
      return;
    }
    try {
      const res = emitNextBall(liveDraw, role, liveDraw.version);
      setLiveDraw(res.draw);

      // Difundir evento inmediatamente a todos los clientes por Supabase Realtime
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

  // Protección de rutas por RBAC
  const renderActiveView = () => {
    if (activeView === 'play') {
      const snapshot = createDrawSnapshot(liveDraw, 142, 580);
      return (
        <LivePlayRoom
          initialSnapshot={snapshot}
          onBackToLobby={() => setActiveView(isAuthenticated ? 'player' : 'landing')}
          onOperatorEmitNext={handleOperatorEmitNext}
          isOperatorOrAdmin={role !== 'PLAYER'}
        />
      );
    }

    if (activeView === 'super-admin') {
      if (role !== 'SUPER_ADMIN') {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center">
              <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Acceso Exclusivo SUPER_ADMIN</h2>
              <p className="mt-2 text-xs text-slate-300">
                Se requiere el rol de máxima jerarquía <strong className="text-rose-400">SUPER_ADMIN</strong> (identidad autoritativa server-side) para acceder al panel maestro de gobernanza, sincronización y asignación de roles. Su rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => setActiveView('player')}
                className="mt-5 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Volver a mi Panel de Jugador
              </button>
            </div>
          </div>
        );
      }
      return <SuperAdminDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    if (activeView === 'supervisor') {
      if (!hasSufficientRole(role, 'SUPERVISOR')) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-6 text-center">
              <ShieldAlert className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Módulo de Supervisión</h2>
              <p className="mt-2 text-xs text-slate-300">
                Este panel requiere rol de <strong className="text-indigo-400">SUPERVISOR</strong>, <strong className="text-rose-400">ADMIN</strong> o <strong className="text-rose-400">SUPER_ADMIN</strong>. Su rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => setActiveView('player')}
                className="mt-5 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Volver a mi Panel de Jugador
              </button>
            </div>
          </div>
        );
      }
      return <SupervisorDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    if (activeView === 'admin') {
      if (!hasSufficientRole(role, 'ADMIN')) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center">
              <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Acceso Restringido (RBAC)</h2>
              <p className="mt-2 text-xs text-slate-300">
                Se requiere rol de ADMINISTRADOR o SUPER_ADMIN en el servidor para acceder a este módulo. Su rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => setActiveView('player')}
                className="mt-5 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Volver a mi Panel de Jugador
              </button>
            </div>
          </div>
        );
      }
      return <AdminDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    if (activeView === 'operator') {
      if (!hasSufficientRole(role, 'OPERATOR')) {
        return (
          <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
            <div className="max-w-md rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 text-center">
              <ShieldAlert className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white font-display">Módulo de Operaciones</h2>
              <p className="mt-2 text-xs text-slate-300">
                Este panel es exclusivo para OPERADORES, SUPERVISORES y ADMINISTRADORES. Su rol actual es <strong className="text-amber-400">{role}</strong>.
              </p>
              <button
                onClick={() => setActiveView('player')}
                className="mt-5 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Volver a mi Panel de Jugador
              </button>
            </div>
          </div>
        );
      }
      return <OperatorDashboard />;
    }

    if (activeView === 'player') {
      return <PlayerDashboard onEnterLiveRoom={handleEnterLiveRoom} />;
    }

    return (
      <LandingPage
        onOpenAuth={openAuth}
        onExplorePlayer={() => setActiveView(isAuthenticated ? 'player' : 'play')}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onOpenAuth={openAuth}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenDiagnostic={() => setDiagnosticOpen(true)}
      />

      <main className="flex-1">
        {renderActiveView()}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
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
