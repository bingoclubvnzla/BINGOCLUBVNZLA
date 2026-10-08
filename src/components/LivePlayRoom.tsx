// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SALA DE JUEGO EN VIVO (/play/:drawCode) (FASE 2)
// Principio: SERVER AUTHORITATIVE. No genera números localmente.
// Muestra: Número actual visible en 3D, historial dinámico, contadores y reconexión.
// ==============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { DrawSnapshot, ConnectionStatus } from '../types/realtimeEvents';
import { DRAW_REALTIME_EVENTS } from '../types/realtimeEvents';
import { getBallMetadata, getBingo75Letter, speakBallTTS } from '../lib/catalogs';
import { supabase, isSupabaseConfigured, fetchUserCards, claimBingoAuthoritative } from '../lib/supabase';
import { playBallChime, isSoundMuted, toggleSound, playClickSound } from '../lib/soundFx';
import { useAuth } from '../contexts/AuthContext';
import { BingoCard } from './BingoCard';
import { BingoClubLiveVisualizer } from './BingoClubLiveVisualizer';
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
  Sparkles,
  Trophy,
  Play
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

  return (
    <div className="min-h-screen bg-[#060919] text-slate-100 py-6 px-4 sm:px-6 lg:px-8 pb-24 md:pb-12">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* ==================================================================== */}
        {/* VISUALIZADOR PRINCIPAL DE SORTEOS (BROADCAST / CINEMA)               */}
        {/* ARQUITECTURA DE 3 CAPAS: ATMÓSFERA VIDEO + LOGO CENTRAL TRANSPARENTE */}
        {/* ==================================================================== */}
        <BingoClubLiveVisualizer
          snapshot={snapshot}
          connectionStatus={connectionStatus}
          serverClock={serverClock}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onBackToLobby={onBackToLobby}
          onSimulateReconnect={handleSimulateReconnect}
          isSimulatingReconnect={isSimulatingReconnect}
          onOperatorEmitNext={onOperatorEmitNext}
          isOperatorOrAdmin={isOperatorOrAdmin}
          playerCardsCount={playerCards.length}
          onBuyCards={onBackToLobby}
        />

        {/* ==================================================================== */}
        {/* SECCIÓN: CARTONES DEL JUGADOR EN ESTA SALA                            */}
        {/* ==================================================================== */}
        {user && (
          <div className="pt-6 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white font-display flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  <span>Tus Cartones Oficiales en Juego</span>
                </h2>
                <p className="text-xs text-slate-400">
                  El marcado es server-authoritative y se actualiza al ritmo de la tómbola oficial.
                </p>
              </div>

              <span className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-mono font-bold text-amber-400">
                {playerCards.length} {playerCards.length === 1 ? 'Cartón Activo' : 'Cartones Activos'}
              </span>
            </div>

            {loadingCards ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
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
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center max-w-lg mx-auto space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  No tienes cartones registrados para este sorteo en vivo. Puedes sintonizar la tómbola oficial como espectador o adquirir cartones en los sorteos programados.
                </p>
                <button
                  onClick={() => onBackToLobby()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 transition-colors cursor-pointer"
                >
                  Volver al Lobby de Salas
                </button>
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
