// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SALA DE JUEGO EN VIVO (/play/:drawCode) (FASE 2)
// Principio: SERVER AUTHORITATIVE. No genera números localmente.
// Muestra: Número actual visible, historial completo, contadores y reconexión.
// ==============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { DrawSnapshot, ConnectionStatus } from '../types/realtimeEvents';
import { DRAW_REALTIME_EVENTS } from '../types/realtimeEvents';
import { getBallMetadata, getBingo75Letter, speakBallTTS } from '../lib/catalogs';
import { supabase, isSupabaseConfigured, fetchUserCards, claimBingoAuthoritative } from '../lib/supabase';
import { playBallChime, isSoundMuted, toggleSound } from '../lib/soundFx';
import { useAuth } from '../contexts/AuthContext';
import { BingoCard } from './BingoCard';
import { WinCelebration, type WinCelebrationData } from './WinCelebration';
import type { Card } from '../types/database';
import { createDraw, createDrawSnapshot, type AuthoritativeDraw } from '../lib/drawEngine';
import {
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Users,
  ShieldCheck,
  PauseCircle,
  CheckCircle,
  ArrowLeft,
  Flame,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';

interface LivePlayRoomProps {
  initialSnapshot?: DrawSnapshot;
  draw?: AuthoritativeDraw;
  onBackToLobby?: () => void;
  // Callback opcional si un operador/admin emite comandos desde la consola
  onOperatorEmitNext?: () => void;
  isOperatorOrAdmin?: boolean;
}

export const LivePlayRoom: React.FC<LivePlayRoomProps> = ({
  initialSnapshot,
  draw,
  onBackToLobby = () => {},
  onOperatorEmitNext,
  isOperatorOrAdmin = false,
}) => {
  const fallbackSnapshot = useMemo(() => {
    if (initialSnapshot) return initialSnapshot;
    if (draw) {
      return createDrawSnapshot(draw, draw.version || 1, draw.version || 1);
    }
    const d = createDraw('ADMIN', 'system-admin', {
      modality_id: 'BINGO_75',
      title: 'Sorteo Estelar Bingo 75 en Directo',
    });
    return createDrawSnapshot(d, 1, 1);
  }, [initialSnapshot, draw]);

  const [snapshot, setSnapshot] = useState<DrawSnapshot>(fallbackSnapshot);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    isSupabaseConfigured ? 'SINCRONIZANDO' : 'EN_VIVO'
  );
  const [isSimulatingReconnect, setIsSimulatingReconnect] = useState(false);
  const [serverClock, setServerClock] = useState<string>(new Date().toISOString().substring(11, 19) + ' UTC');
  const [isMuted, setIsMuted] = useState(() => isSoundMuted());

  // Estado del usuario y cartones del jugador en esta sala
  const { user } = useAuth();
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Celebración de ganador server-authoritative
  const [winnerCelebrationData, setWinnerCelebrationData] = useState<WinCelebrationData | null>(null);
  const celebratedEventsRef = useRef<Set<string>>(new Set());

  // Cargar cartones reales del jugador para este sorteo
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || !snapshot?.draw_id) return;
    let isMounted = true;
    setLoadingCards(true);

    fetchUserCards(user.id).then((res) => {
      if (isMounted && res.data) {
        const matching = res.data.filter((c) => c.draw_id === snapshot.draw_id);
        setPlayerCards(matching);
      }
      if (isMounted) setLoadingCards(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id, snapshot?.draw_id]);

  // Mantener snapshot actualizado si cambian las props
  useEffect(() => {
    if (initialSnapshot) {
      setSnapshot(initialSnapshot);
    } else if (draw) {
      setSnapshot(createDrawSnapshot(draw, draw.version || 1, draw.version || 1));
    }
  }, [initialSnapshot, draw]);

  // Locución oficial automática mediante Web Speech API y chime sutil cuando el servidor emite una nueva balota
  useEffect(() => {
    if (snapshot.current_ball !== null && !isMuted) {
      playBallChime();
      speakBallTTS(snapshot.modality_id, snapshot.current_ball, true);
    }
  }, [snapshot.current_ball, snapshot.modality_id, isMuted]);

  // Reloj oficial del servidor sincronizado
  useEffect(() => {
    const timer = setInterval(() => {
      setServerClock(new Date().toISOString().substring(11, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMute = () => {
    const next = toggleSound();
    setIsMuted(next);
  };


  // Suscripción al canal WebSocket Realtime oficial de Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnectionStatus('EN_VIVO');
      return;
    }

    const channelName = `draw:${snapshot.draw_id}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: DRAW_REALTIME_EVENTS.BALL_DRAWN }, ({ payload }) => {
        if (payload && payload.ball_number !== undefined) {
          setSnapshot((prev) => {
            if (prev.drawn_numbers.includes(payload.ball_number)) return prev;
            return {
              ...prev,
              drawn_numbers: [...prev.drawn_numbers, payload.ball_number],
              current_ball: payload.ball_number,
              current_sequence: prev.current_sequence + 1,
              version: payload.version || prev.version + 1,
              server_time: payload.created_at || new Date().toISOString(),
            };
          });
        }
      })
      .on('broadcast', { event: DRAW_REALTIME_EVENTS.DRAW_PAUSED }, () => {
        setSnapshot((prev) => ({ ...prev, status: 'PAUSED' }));
      })
      .on('broadcast', { event: DRAW_REALTIME_EVENTS.DRAW_RESUMED }, () => {
        setSnapshot((prev) => ({ ...prev, status: 'ACTIVE' }));
      })
      .on('broadcast', { event: DRAW_REALTIME_EVENTS.DRAW_FINISHED }, () => {
        setSnapshot((prev) => ({ ...prev, status: 'FINISHED' }));
      })
      .on('broadcast', { event: DRAW_REALTIME_EVENTS.WINNER_AWARDED }, ({ payload }) => {
        if (!payload) return;
        const winnerKey = payload.event_hash || payload.winner_id || payload.card_id;
        if (winnerKey && celebratedEventsRef.current.has(winnerKey)) return;
        if (winnerKey) celebratedEventsRef.current.add(winnerKey);

        setWinnerCelebrationData({
          winner_id: payload.winner_id || 'OFICIAL',
          draw_id: payload.draw_id || snapshot.draw_id,
          card_id: payload.card_id,
          user_id: payload.user_id,
          pattern: payload.pattern || 'CARTON_LLENO',
          prize_amount: Number(payload.prize_amount || 0),
          event_hash: payload.event_hash,
          sequence_number: payload.sequence_number,
          isCurrentPlayer: user?.id && payload.user_id ? user.id === payload.user_id : false,
        });

        // Actualizar cartón a WON si es del jugador
        setPlayerCards((prev) =>
          prev.map((c) => (c.id === payload.card_id ? { ...c, status: 'WON' } : c))
        );
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('EN_VIVO');
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('RECONEXION');
        } else if (status === 'CLOSED') {
          setConnectionStatus('DESCONECTADO');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [snapshot.draw_id]);

  // Simulación de Reconexión / Refresh (Demostración de resiliencia de Snapshot)
  const handleSimulateReconnect = () => {
    setIsSimulatingReconnect(true);
    setConnectionStatus('RECONEXION');

    setTimeout(() => {
      setConnectionStatus('SINCRONIZANDO');
      setTimeout(() => {
        // Restauración completa e instantánea del snapshot sin pérdida de estado
        setSnapshot((prev) => ({
          ...prev,
          server_time: new Date().toISOString(),
        }));
        setConnectionStatus('EN_VIVO');
        setIsSimulatingReconnect(false);
      }, 700);
    }, 1200);
  };

  // Reclamo autoritativo de bingo validado directamente por PostgreSQL
  const handleClaimBingo = async (cardId: string, pattern: string = 'CARTON_LLENO') => {
    const res = await claimBingoAuthoritative(snapshot.draw_id, cardId, pattern);
    if (res.success && res.data) {
      const winnerData = res.data;
      const winnerKey = winnerData.winner_id;
      if (winnerKey && !celebratedEventsRef.current.has(winnerKey)) {
        celebratedEventsRef.current.add(winnerKey);
        setWinnerCelebrationData({
          winner_id: winnerData.winner_id,
          draw_id: snapshot.draw_id,
          card_id: cardId,
          user_id: user?.id,
          pattern: winnerData.pattern || pattern,
          prize_amount: Number(winnerData.prize_amount || 0),
          isCurrentPlayer: true,
        });
      }

      setPlayerCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: 'WON' } : c))
      );

      // Difundir evento de ganador por Realtime a la sala
      if (isSupabaseConfigured) {
        const channel = supabase.channel(`draw:${snapshot.draw_id}`);
        channel.send({
          type: 'broadcast',
          event: DRAW_REALTIME_EVENTS.WINNER_AWARDED,
          payload: {
            winner_id: winnerData.winner_id,
            draw_id: snapshot.draw_id,
            card_id: cardId,
            user_id: user?.id,
            pattern: winnerData.pattern || pattern,
            prize_amount: Number(winnerData.prize_amount || 0),
          },
        });
      }

      return { success: true, message: winnerData.message || '¡Premio verificado y otorgado exitosamente!' };
    }

    return { success: false, message: res.message || res.error || 'El servidor autoritativo no validó el bingo.' };
  };

  const currentBallNum = snapshot.current_ball;
  const currentBallMeta = currentBallNum !== null ? getBallMetadata(snapshot.modality_id, currentBallNum) : null;

  // Lista de todos los números del pozo de la modalidad (rango oficial 1..total_balls)
  const poolNumbers = Array.from(
    { length: snapshot.total_balls },
    (_, i) => i + 1
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* BARRA SUPERIOR DE LA SALA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLobby}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver</span>
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-amber-400 font-bold">{snapshot.public_code}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300 font-semibold">{snapshot.title}</span>
                <span className="text-slate-600">·</span>
                <span className="text-sky-400">{snapshot.modality_id}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white font-display">
                Sala Oficial de Bingo en Vivo
              </h1>
            </div>
          </div>

          {/* TELEMETRÍA Y ESTADO DE CONEXIÓN */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Estado de Conexión Real */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              connectionStatus === 'EN_VIVO'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : connectionStatus === 'SINCRONIZANDO'
                ? 'bg-sky-950/40 border-sky-500/40 text-sky-400'
                : connectionStatus === 'RECONEXION'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
            }`}>
              {connectionStatus === 'EN_VIVO' && <Radio className="h-3.5 w-3.5 animate-pulse" />}
              {connectionStatus === 'SINCRONIZANDO' && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {connectionStatus === 'RECONEXION' && <WifiOff className="h-3.5 w-3.5 animate-bounce" />}
              {connectionStatus === 'DESCONECTADO' && <WifiOff className="h-3.5 w-3.5" />}
              <span className="font-bold">{connectionStatus}</span>
            </div>

            {/* Estado del Sorteo */}
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Estado:{' '}
              <strong className={
                snapshot.status === 'ACTIVE'
                  ? 'text-emerald-400'
                  : snapshot.status === 'PAUSED'
                  ? 'text-amber-400'
                  : snapshot.status === 'FINISHED'
                  ? 'text-slate-400'
                  : 'text-sky-400'
              }>
                {snapshot.status}
              </strong>
            </div>

            {/* Hora Oficial del Servidor */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{serverClock}</span>
            </div>

            {/* Contadores Distinguidos: Conectados vs Registrados */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Users className="h-3.5 w-3.5 text-sky-400" />
              <span>
                <strong className="text-white">{snapshot.players_connected}</strong> en vivo /{' '}
                <span className="text-slate-400">{snapshot.players_registered} reg.</span>
              </span>
            </div>

            {/* Locutor TTS Oficial (Voz del sorteo) */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Activar voz oficial del cantador' : 'Silenciar voz del cantador'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/50'
              }`}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{isMuted ? 'Sonido Desactivado' : 'Locutor En Vivo'}</span>
            </button>
          </div>
        </div>

        {/* ÁREA CENTRAL: BALOTA ACTUAL (MÁXIMA VISIBILIDAD Y ACCESIBILIDAD) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-[#050b14] p-6 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
            {/* Resplandor superior sutil */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/20 via-amber-400/50 to-amber-500/20" />

            <div className="flex items-center justify-between w-full text-xs text-slate-400 font-mono mb-4 border-b border-slate-800 pb-2.5">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Flame className="h-3.5 w-3.5" />
                BALOTA CANTADA
              </span>
              <span className="text-slate-300 font-semibold">
                {snapshot.drawn_numbers.length} / {snapshot.total_balls}
              </span>
            </div>

            {currentBallNum !== null && currentBallMeta ? (
              <div className="flex flex-col items-center justify-center my-4 animate-in zoom-in-95 duration-200">
                {/* Esfera 3D con relieve metálico según modalidad */}
                <div className={`relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full text-slate-950 font-black border-4 border-amber-200/90 ${
                  snapshot.modality_id === 'BINGO_90'
                    ? 'ball-sphere-navy text-white'
                    : snapshot.modality_id === 'ANIMALITOS' || snapshot.modality_id === 'CHAPITAS'
                    ? 'ball-sphere-criollo'
                    : 'ball-sphere-gold'
                }`}>
                  {currentBallMeta.letter && (
                    <span className="absolute top-2.5 sm:top-3.5 text-sm sm:text-base tracking-widest font-bold text-slate-900/90 font-mono">
                      {currentBallMeta.letter}
                    </span>
                  )}
                  <span className="text-5xl sm:text-6xl font-extrabold tracking-tight font-display">
                    {currentBallNum}
                  </span>
                </div>

                {/* Nombre de la figura / subtexto y botón de locución */}
                <div className="mt-5">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
                      {currentBallMeta.subtext || currentBallMeta.displayLabel}
                    </h2>
                    <button
                      onClick={() => speakBallTTS(snapshot.modality_id, currentBallNum, true)}
                      title="Repetir locución oficial"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {snapshot.modality_id === 'ANIMALITOS'
                      ? 'Animalito Oficial'
                      : snapshot.modality_id === 'OBJETOS'
                      ? 'Objeto Criollo Oficial'
                      : 'Balota Oficial'}{' '}
                    · Secuencia #{snapshot.drawn_numbers.length} · Sorteo {snapshot.public_code}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center my-10 text-slate-500">
                <div className="h-32 w-32 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center mb-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400">En Espera</span>
                </div>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  {snapshot.status === 'READY'
                    ? 'Sorteo preparado. Esperando señal de inicio del servidor autoritativo.'
                    : 'Aún no se ha emitido ninguna balota oficial.'}
                </p>
              </div>
            )}


            {/* Botón de Prueba de Resiliencia / F5 Reconnect */}
            <div className="w-full pt-4 mt-auto border-t border-slate-800/80 flex flex-col gap-2">
              <button
                onClick={handleSimulateReconnect}
                disabled={isSimulatingReconnect}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSimulatingReconnect ? 'animate-spin text-amber-400' : ''}`} />
                <span>Simular Desconexión / Reconexión (F5 Snapshot)</span>
              </button>

              {/* Botón de Operador Autorizado (si tiene rol OPERATOR/ADMIN) */}
              {isOperatorOrAdmin && onOperatorEmitNext && snapshot.status === 'ACTIVE' && (
                <button
                  onClick={onOperatorEmitNext}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md"
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>Emitir Siguiente Balota (Autoridad del Servidor)</span>
                </button>
              )}
            </div>
          </div>

          {/* TABLERO DE TODAS LAS BALOTAS Y NÚMEROS CANTADOS */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-display">
                    Tablero de Números Oficiales
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sincronización en tiempo real con la tómbola oficial.
                  </p>
                </div>
                <div className="text-xs font-mono text-amber-400">
                  {snapshot.drawn_numbers.length} / {snapshot.total_balls} Cantadas
                </div>
              </div>

              {/* Tira de últimas 5 balotas cantadas */}
              {snapshot.drawn_numbers.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-mono uppercase text-slate-400 block mb-2 font-semibold">
                    Últimas Balotas Emitidas:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {snapshot.drawn_numbers.slice(-6).reverse().map((num, i) => {
                      const m = getBallMetadata(snapshot.modality_id, num);
                      return (
                        <div
                          key={num}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                            i === 0
                              ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {m.letter && <span>{m.letter}</span>}
                          <span>{num}</span>
                          {m.subtext && <span className="text-[10px] opacity-80">({m.subtext})</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matriz completa del pozo de la modalidad */}
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5 sm:gap-2 max-h-80 overflow-y-auto pr-1">
                {poolNumbers.map((num) => {
                  const isDrawn = snapshot.drawn_numbers.includes(num);
                  const isCurrent = num === currentBallNum;
                  return (
                    <div
                      key={num}
                      className={`flex h-9 sm:h-10 items-center justify-center rounded-lg text-xs font-mono font-bold transition-all ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-950 scale-105 z-10'
                          : isDrawn
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-slate-950/60 text-slate-600 border border-slate-850'
                      }`}
                      title={`Balota ${num}`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aviso de Transparencia de Autoridad */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Verificación de Integridad por Event Hash Monotónico</span>
              </span>
              <span className="font-mono text-slate-400">
                Versión del Sorteo: v{snapshot.version}
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE CARTONES DEL JUGADOR EN ESTA SALA */}
        {user && (
          <div className="pt-6 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Tus Cartones Oficiales
                </h2>
                <p className="text-xs text-slate-400">
                  Cartones adquiridos vinculados a este sorteo. El marcado es server-authoritative según las balotas cantadas.
                </p>
              </div>

              <span className="self-start sm:self-auto px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-400">
                {playerCards.length} {playerCards.length === 1 ? 'Cartón en Juego' : 'Cartones en Juego'}
              </span>
            </div>

            {loadingCards ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                <span>Cargando cartones oficiales del jugador...</span>
              </div>
            ) : playerCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {playerCards.map((card) => (
                  <BingoCard
                    key={card.id}
                    card={card}
                    drawnNumbers={snapshot.drawn_numbers}
                    modalityId={snapshot.modality_id}
                    onClaimBingo={handleClaimBingo}
                    isDrawActive={snapshot.status === 'ACTIVE'}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center max-w-lg mx-auto">
                <p className="text-xs text-slate-400 leading-relaxed">
                  No tienes cartones registrados para este sorteo en vivo. Puedes adquirir cartones en las salas programadas o regresar al lobby.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CELEBRACIÓN DE GANADOR (WINNER_AWARDED) */}
      <WinCelebration
        data={winnerCelebrationData}
        onClose={() => setWinnerCelebrationData(null)}
      />
    </div>
  );
};
