// ==============================================================================
// BINGO CLUB VNZLA ONLINE — VISUALIZADOR PRINCIPAL DE SORTEOS (BROADCAST / CINEMA)
// Arquitectura de 3 capas:
//   CAPA 1: Atmósfera (video fondo.mp4 + iluminación ambiental #070B14/oro/cian)
//   CAPA 2: Identidad (bingoclub.png central con transparencia sutil como marca de agua)
//   CAPA 3: Información y Escenario del Sorteo (Server-Authoritative, Cinema & Fullscreen)
// ==============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { DrawSnapshot, ConnectionStatus } from '../types/realtimeEvents';
import { getBallMetadata, speakBallTTS } from '../lib/catalogs';
import { playClickSound } from '../lib/soundFx';
import {
  Maximize2,
  Minimize2,
  X,
  Radio,
  Clock,
  Users,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Flame,
  ShieldCheck,
  PauseCircle,
  AlertCircle,
  Grid3X3,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface BingoClubLiveVisualizerProps {
  snapshot: DrawSnapshot;
  connectionStatus: ConnectionStatus;
  serverClock: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onBackToLobby?: () => void;
  onSimulateReconnect?: () => void;
  isSimulatingReconnect?: boolean;
  onOperatorEmitNext?: () => void;
  isOperatorOrAdmin?: boolean;
  playerCardsCount?: number;
  onBuyCards?: () => void;
  className?: string;
}

const B75_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

// Colores oficiales del prompt maestro para BINGO_75
const B75_LETTER_COLORS: Record<string, { bg: string; text: string; hex: string; border: string }> = {
  B: { bg: 'bg-[#FF5252]', text: 'text-white', hex: '#FF5252', border: 'border-[#FF5252]/40' },
  I: { bg: 'bg-[#FFB300]', text: 'text-slate-950', hex: '#FFB300', border: 'border-[#FFB300]/40' },
  N: { bg: 'bg-[#00E5FF]', text: 'text-slate-950', hex: '#00E5FF', border: 'border-[#00E5FF]/40' },
  G: { bg: 'bg-[#00E676]', text: 'text-slate-950', hex: '#00E676', border: 'border-[#00E676]/40' },
  O: { bg: 'bg-[#E040FB]', text: 'text-white', hex: '#E040FB', border: 'border-[#E040FB]/40' },
};

export const BingoClubLiveVisualizer: React.FC<BingoClubLiveVisualizerProps> = ({
  snapshot,
  connectionStatus,
  serverClock,
  isMuted,
  onToggleMute,
  onBackToLobby,
  onSimulateReconnect,
  isSimulatingReconnect = false,
  onOperatorEmitNext,
  isOperatorOrAdmin = false,
  playerCardsCount = 0,
  onBuyCards,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullBoardMobile, setShowFullBoardMobile] = useState(false);
  const [shockwaveActive, setShockwaveActive] = useState(false);
  const prevBallRef = useRef<number | null>(snapshot.current_ball);

  // Garantizar reproducción continua del video en segundo plano sin bloqueos
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay silencioso tolerante si el navegador requiere interacción inicial
        });
      }
    }
  }, []);

  // Detección de nueva balota recibida del servidor autoritativo
  useEffect(() => {
    if (snapshot.current_ball !== null && snapshot.current_ball !== prevBallRef.current) {
      prevBallRef.current = snapshot.current_ball;
      setShockwaveActive(true);
      const timer = setTimeout(() => {
        setShockwaveActive(false);
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [snapshot.current_ball]);

  // Manejador del modo Cinema y Fullscreen API
  const handleToggleCinema = async () => {
    playClickSound();
    if (!isCinemaMode) {
      setIsCinemaMode(true);
      if (containerRef.current && document.fullscreenEnabled) {
        try {
          await containerRef.current.requestFullscreen();
        } catch {
          // Si el navegador bloquea fullscreen, el modo Cinema CSS actúa como fallback
        }
      }
    } else {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
      setIsCinemaMode(false);
    }
  };

  // Sincronización con eventos nativos del navegador (ESC / fullscreenchange)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && !document.fullscreenElement && isCinemaMode) {
        // El usuario pulsó ESC en modo nativo
        setIsCinemaMode(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCinemaMode) {
        setIsCinemaMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCinemaMode]);

  const currentBallNum = snapshot.current_ball;
  const currentBallMeta = currentBallNum !== null ? getBallMetadata(snapshot.modality_id, currentBallNum) : null;

  const drawnSet = useMemo(() => new Set(snapshot.drawn_numbers), [snapshot.drawn_numbers]);

  // Rango oficial del pozo
  const poolNumbers = useMemo(
    () => Array.from({ length: snapshot.total_balls }, (_, i) => i + 1),
    [snapshot.total_balls]
  );

  // División por columnas oficiales para BINGO_75
  const b75Columns = useMemo(() => {
    if (snapshot.modality_id !== 'BINGO_75') return null;
    return {
      B: poolNumbers.filter((n) => n >= 1 && n <= 15),
      I: poolNumbers.filter((n) => n >= 16 && n <= 30),
      N: poolNumbers.filter((n) => n >= 31 && n <= 45),
      G: poolNumbers.filter((n) => n >= 46 && n <= 60),
      O: poolNumbers.filter((n) => n >= 61 && n <= 75),
    };
  }, [snapshot.modality_id, poolNumbers]);

  // Estimación del pozo acumulado del sorteo
  const jackpotDisplay = useMemo(() => {
    const customJackpot = (snapshot as unknown as { jackpot_amount?: number }).jackpot_amount;
    const amount = customJackpot || (snapshot.modality_id === 'BINGO_75' ? 2500 : 1800);
    return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [snapshot]);

  // Barra de progreso matemática
  const progressRatio = Math.min(1, Math.max(0, snapshot.drawn_numbers.length / (snapshot.total_balls || 75)));
  const progressPercent = Math.round(progressRatio * 100);

  // Color de esfera según letra o modalidad
  const getBallSphereClass = (letter?: string) => {
    if (letter === 'B') return 'ball-3d-b text-white';
    if (letter === 'I') return 'ball-3d-i text-white';
    if (letter === 'N') return 'ball-3d-n text-slate-950';
    if (letter === 'G') return 'ball-3d-g text-white';
    if (letter === 'O') return 'ball-3d-o text-white';
    if (snapshot.modality_id === 'BINGO_90') return 'ball-sphere-navy text-white';
    if (snapshot.modality_id === 'ANIMALITOS' || snapshot.modality_id === 'CHAPITAS') return 'ball-sphere-criollo text-slate-950';
    return 'ball-sphere-gold text-slate-950';
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden transition-all duration-300 ${
        isCinemaMode
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#070B14] flex flex-col'
          : `rounded-3xl border border-slate-700/70 bg-[#070B14] shadow-2xl ${className}`
      }`}
    >
      {/* ==================================================================== */}
      {/* CAPA 1: ATMÓSFERA (VIDEO FONDO.MP4 + AURORAS AMBIENTALES)             */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
        {/* Video oficial de atmósfera con reproducción asistida y fallback silencioso */}
        <video
          ref={videoRef}
          src="/fondo.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-30 sm:opacity-35 transition-opacity duration-700"
          onError={(e) => {
            (e.currentTarget as HTMLVideoElement).style.display = 'none';
          }}
        />

        {/* Gradiente de integración cinematográfica para garantizar legibilidad de balotas y números */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/80 via-transparent to-[#070B14]/90 pointer-events-none" />

        {/* Resplandores ambientales (Navy, Oro, Cian, Púrpura) */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-indigo-600/25 via-sky-500/15 to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-amber-500/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 -right-32 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#070B14] to-transparent opacity-95" />
      </div>

      {/* ==================================================================== */}
      {/* CAPA 2: ATMÓSFERA Y RESPLANDOR AMBIENTAL (Z-0)                        */}
      {/* ==================================================================== */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
        {/* Halo resplandeciente suave en el fondo general */}
        <div className="w-80 h-80 sm:w-96 sm:h-96 md:w-[480px] md:h-[480px] rounded-full bg-gradient-to-tr from-amber-500/10 via-yellow-400/10 to-indigo-600/10 blur-[100px]" />
      </div>

      {/* Onda de choque al cantar una nueva balota */}
      {shockwaveActive && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center" aria-hidden="true">
          <div className="w-96 h-96 rounded-full border-2 border-amber-400/60 animate-ping opacity-60" />
        </div>
      )}

      {/* ==================================================================== */}
      {/* CAPA 3: INFORMACIÓN Y ESCENARIO CENTRAL DEL SORTEO (Z-20)            */}
      {/* ==================================================================== */}
      <div className="relative z-20 flex flex-col h-full flex-1 p-4 sm:p-6 lg:p-7 justify-between">
        
        {/* ------------------------------------------------------------------ */}
        {/* 1. TOPBAR DEL VISUALIZADOR                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-700/60 bg-slate-950/60 backdrop-blur-md rounded-2xl px-4 py-2.5">
          {/* Lado Izquierdo: Volver al Lobby + Identidad y Sala */}
          <div className="flex items-center gap-3">
            {onBackToLobby && (
              <button
                onClick={() => { playClickSound(); onBackToLobby(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 border border-slate-700/80 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                title="Volver al Lobby de Salas"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Lobby</span>
              </button>
            )}
            <img
              src="/bingoclub.png"
              alt="Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 object-contain drop-shadow-md rounded-lg"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm sm:text-base text-white tracking-wider flex items-center gap-1">
                  BINGO CLUB <span className="gold-text-gradient font-black">VNZLA</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/30">
                  {snapshot.modality_id}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-medium truncate max-w-xs sm:max-w-md">
                {snapshot.title}
              </span>
            </div>
          </div>

          {/* Centro: Estado en Vivo, Conexión y Reloj del Servidor */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Estado de Transmisión */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-sm font-bold ${
                snapshot.status === 'ACTIVE'
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                  : snapshot.status === 'PAUSED'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                  : snapshot.status === 'READY'
                  ? 'bg-sky-950/60 text-sky-300 border-sky-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  snapshot.status === 'ACTIVE' ? 'bg-rose-400' : 'bg-amber-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  snapshot.status === 'ACTIVE' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
              </span>
              <span>
                {snapshot.status === 'ACTIVE'
                  ? 'EN VIVO'
                  : snapshot.status === 'PAUSED'
                  ? 'PAUSADO'
                  : snapshot.status === 'READY'
                  ? 'EN ESPERA'
                  : snapshot.status}
              </span>
            </div>

            {/* Estado de Conexión Realtime */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${
              connectionStatus === 'EN_VIVO'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : connectionStatus === 'SINCRONIZANDO'
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                : connectionStatus === 'RECONEXION'
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            }`}>
              {connectionStatus === 'EN_VIVO' && <Radio className="h-3 w-3 animate-pulse" />}
              {connectionStatus === 'SINCRONIZANDO' && <RefreshCw className="h-3 w-3 animate-spin" />}
              {connectionStatus === 'RECONEXION' && <WifiOff className="h-3 w-3 animate-bounce" />}
              {connectionStatus === 'DESCONECTADO' && <WifiOff className="h-3 w-3" />}
              <span>{connectionStatus}</span>
            </div>

            {/* Hora Servidor */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{serverClock}</span>
            </div>
          </div>

          {/* Lado Derecho: Pozo, Audio, Reconnect y Botón Cinema */}
          <div className="flex items-center gap-2">
            {/* Simular Reconexión opcional */}
            {onSimulateReconnect && (
              <button
                onClick={onSimulateReconnect}
                disabled={isSimulatingReconnect}
                title="Sincronizar / Reconectar Sorteo"
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-amber-300 hover:bg-slate-800 text-[11px] font-mono transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isSimulatingReconnect ? 'animate-spin text-amber-400' : ''}`} />
                <span>Sync</span>
              </button>
            )}
            {/* Pozo Oficial */}
            <div className="hidden md:flex flex-col items-end px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                POZO OFICIAL
              </span>
              <span className="font-mono font-black text-xs text-amber-300">
                {jackpotDisplay}
              </span>
            </div>

            {/* Conectados */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
              <Users className="h-3.5 w-3.5 text-sky-400" />
              <span>{snapshot.players_connected}</span>
            </div>

            {/* Voz Locutor TTS */}
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Activar voz del locutor' : 'Silenciar voz'}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isMuted
                  ? 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Botón Cinema / Fullscreen */}
            <button
              onClick={handleToggleCinema}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                isCinemaMode
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'btn-gaming-gold shine-sweep text-slate-950'
              }`}
              title={isCinemaMode ? 'Cerrar Modo Cinema (ESC)' : 'Ampliar Sorteo (Cinema Mode)'}
            >
              {isCinemaMode ? (
                <>
                  <X className="h-4 w-4" />
                  <span>Cerrar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  <span>Ampliar Sorteo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 2. ESCENARIO CENTRAL BROADCAST (LAYOUT 3 PANELES PROFESIONAL)      */}
        {/* ------------------------------------------------------------------ */}
        <div className="my-auto py-2 sm:py-4 flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6 relative z-10 w-full min-h-[440px] lg:min-h-[480px]">
          
          {/* PANEL IZQUIERDO: INFORMACIÓN DEL SORTEO & CONTROLES */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col justify-between gap-3 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-3.5 shadow-xl order-2 lg:order-1">
            {/* Cabecera Info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                Control de Sala
              </span>
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/30">
                #{snapshot.public_code || snapshot.draw_id?.slice(0, 6)}
              </span>
            </div>

            {/* Pozo Oficial */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-slate-900 border border-amber-500/35 shadow-inner">
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Pozo Acumulado
              </span>
              <span className="text-lg sm:text-xl font-mono font-black text-amber-300 block mt-1 tracking-tight">
                {jackpotDisplay}
              </span>
            </div>

            {/* Métricas de Sorteo */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase">Extracciones</span>
                <span className="text-sm font-black text-white">{snapshot.drawn_numbers.length} / {snapshot.total_balls}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase">Jugadores</span>
                <span className="text-sm font-black text-white flex items-center gap-1">
                  <Users className="h-3 w-3 text-sky-400" />
                  {snapshot.players_connected}
                </span>
              </div>
            </div>

            {/* Última Balota Registrada */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Última Balota</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {snapshot.current_ball !== null ? (
                    <span className="text-amber-300 font-black">
                      {currentBallMeta?.letter ? `${currentBallMeta.letter}-` : ''}{snapshot.current_ball}
                    </span>
                  ) : (
                    'En espera'
                  )}
                </span>
              </div>
              {currentBallNum !== null && (
                <button
                  onClick={() => speakBallTTS(snapshot.modality_id, currentBallNum, true)}
                  title="Repetir locución oficial"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer transition-colors"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Control opcional de operador */}
            {isOperatorOrAdmin && onOperatorEmitNext && snapshot.status === 'ACTIVE' && (
              <button
                onClick={onOperatorEmitNext}
                className="w-full py-2 px-3 rounded-xl btn-gaming-gold shine-sweep text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Flame className="h-4 w-4" />
                <span>Emitir Siguiente Balota</span>
              </button>
            )}
          </div>

          {/* PANEL CENTRAL: ELEMENTO PRINCIPAL DEL SORTEO (CÍRCULO EXACTAMENTE DEL MISMO TAMAÑO DEL LOGO Y ENCIMA DEL LOGO) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center relative z-20 order-1 lg:order-2 my-2 sm:my-0 min-w-0">
            {/* CONTENEDOR MAESTRO CENTRAL: TAMAÑO EXACTO Y CO-LOCALIZADO */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-[360px] lg:h-[360px] xl:w-[390px] xl:h-[390px] flex items-center justify-center transition-all duration-500">
              
              {/* CAPA BASE DEL ELEMENTO CENTRAL: EL LOGO OFICIAL BINGOCLUB.PNG */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                {/* Halo dorado detrás del emblema central */}
                <div className="absolute w-[92%] h-[92%] rounded-full bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-indigo-600/20 blur-2xl animate-pulse" />
                <img
                  src="/bingoclub.png"
                  alt="Bingo Club VNZLA"
                  className="w-[86%] h-[86%] object-contain filter drop-shadow-[0_0_35px_rgba(245,158,11,0.5)] transition-all duration-700 select-none"
                />
              </div>

              {currentBallNum !== null && currentBallMeta ? (
                /* ESTADO DE BALOTA CANTADA: CÍRCULO EXACTAMENTE ENCIMA DEL LOGO Y DEL MISMO TAMAÑO */
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center rounded-full border-4 border-amber-300/90 shadow-2xl transition-all duration-500 z-10 ${getBallSphereClass(currentBallMeta.letter)} ${
                    shockwaveActive ? 'scale-105 shadow-amber-400/80 ring-8 ring-amber-300/50' : 'hover:scale-[1.02]'
                  }`}
                >
                  {/* Lente translúcido de cristal de alta fidelidad: deja ver el logo por debajo con nitidez y contrasta los resultados encima */}
                  <div className="w-[84%] h-[84%] rounded-full bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center border-2 border-white/50 shadow-2xl p-3 relative overflow-hidden">
                    {/* Resplandor radial interno */}
                    <div className="absolute inset-0 bg-radial from-amber-400/15 via-transparent to-transparent pointer-events-none" />

                    {/* Letra Oficial BINGO (B, I, N, G, O) */}
                    {currentBallMeta.letter && (
                      <span className="text-xl sm:text-2xl md:text-3xl font-mono font-black text-amber-300 leading-none mb-1 tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                        {currentBallMeta.letter}
                      </span>
                    )}

                    {/* Número Principal Gigante */}
                    <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-extrabold text-white leading-none tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)]">
                      {currentBallNum}
                    </span>

                    {/* Subtítulo criollo o nombre de balota */}
                    <div className="mt-2 flex items-center gap-1.5 max-w-[85%] text-center">
                      <span className="text-xs sm:text-sm md:text-base font-display font-black text-amber-200 tracking-tight truncate drop-shadow-md">
                        {currentBallMeta.subtext || currentBallMeta.displayLabel}
                      </span>
                      <button
                        onClick={() => speakBallTTS(snapshot.modality_id, currentBallNum, true)}
                        title="Repetir locución oficial"
                        className="p-1 rounded-md bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-slate-700/80 cursor-pointer shrink-0 transition-colors"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Contador de extracción oficial */}
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400/90 mt-1">
                      #{snapshot.drawn_numbers.length} / {snapshot.total_balls}
                    </span>
                  </div>
                </div>
              ) : (
                /* ESTADO EN ESPERA (SORTEO PREPARADO): ARO Y ENMARCADO DEL MISMO TAMAÑO DEL LOGO */
                <div className="absolute inset-0 rounded-full border-3 border-dashed border-amber-400/60 flex flex-col items-center justify-between p-6 sm:p-7 bg-slate-950/30 backdrop-blur-[2px] shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-pulse z-10 pointer-events-none">
                  {/* Badge Superior */}
                  <div className="px-3.5 py-1 rounded-full bg-slate-950/85 border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest shadow-md flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>{snapshot.status === 'READY' ? 'Sorteo Preparado' : 'En Espera de Balota'}</span>
                  </div>

                  {/* Centro: Espacio libre para que el logo brille nítidamente */}
                  <div className="my-auto pointer-events-none select-none text-center">
                    <span className="text-[11px] font-mono tracking-widest text-amber-300/80 uppercase font-black drop-shadow-md">
                      TÓMBOLA OFICIAL EN VIVO
                    </span>
                  </div>

                  {/* Mensaje Inferior */}
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-[10px] sm:text-[11px] text-slate-300 font-mono text-center max-w-[280px] leading-tight shadow-md">
                    El servidor emitirá la siguiente balota al iniciar la extracción oficial.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PANEL DERECHO: TABLERO DE CONTROL OFICIAL EN VERTICAL */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800/90 p-3 shadow-2xl order-3">
            {/* Cabecera del Tablero */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Grid3X3 className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-display font-black text-white uppercase tracking-wider">
                  Tablero Oficial ({snapshot.modality_id})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                  {snapshot.drawn_numbers.length}/{snapshot.total_balls}
                </span>
                {/* Botón expandir en móvil */}
                <button
                  onClick={() => setShowFullBoardMobile(!showFullBoardMobile)}
                  className="lg:hidden p-1 text-slate-400 hover:text-white"
                  title="Colapsar / Expandir tablero"
                >
                  {showFullBoardMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* TABLERO VERTICAL BINGO_75 CON 5 COLUMNAS VERTICALES (B-I-N-G-O) */}
            {snapshot.modality_id === 'BINGO_75' && b75Columns ? (
              <div className={`grid grid-cols-5 gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800/80 ${showFullBoardMobile ? 'grid' : 'hidden lg:grid'}`}>
                {B75_LETTERS.map((letter) => {
                  const numbers = b75Columns[letter];
                  const colorConfig = B75_LETTER_COLORS[letter];

                  return (
                    <div key={letter} className="flex flex-col gap-1 items-center">
                      {/* Cabecera vertical de la letra */}
                      <div
                        className={`w-full py-0.5 rounded flex items-center justify-center font-display font-black text-xs shadow-xs ${colorConfig.bg} ${colorConfig.text}`}
                      >
                        {letter}
                      </div>

                      {/* 15 números apilados verticalmente */}
                      <div className="flex flex-col gap-0.5 sm:gap-1 w-full">
                        {numbers.map((num) => {
                          const isDrawn = drawnSet.has(num);
                          const isCurrent = num === currentBallNum;

                          return (
                            <div
                              key={num}
                              className={`w-full h-5 sm:h-5.5 rounded flex items-center justify-center font-mono font-bold text-[9px] sm:text-[10px] transition-all ${
                                isCurrent
                                  ? 'bg-amber-300 text-slate-950 scale-105 z-10 shadow-md shadow-amber-400/60 ring-1.5 ring-white font-black animate-pulse'
                                  : isDrawn
                                  ? `${colorConfig.bg} ${colorConfig.text} font-black shadow-2xs`
                                  : 'bg-slate-900/90 text-slate-500 border border-slate-800/70 hover:border-slate-700'
                              }`}
                              title={`Balota ${letter}-${num}`}
                            >
                              {num}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLERO VERTICAL BINGO_90 O MODALIDADES NUMÉRICAS */
              <div
                className={`grid grid-cols-5 sm:grid-cols-9 gap-1 max-h-[380px] overflow-y-auto p-1 bg-slate-950/90 rounded-xl border border-slate-800/80 ${
                  showFullBoardMobile ? 'grid' : 'hidden lg:grid'
                }`}
              >
                {poolNumbers.map((num) => {
                  const isDrawn = drawnSet.has(num);
                  const isCurrent = num === currentBallNum;

                  return (
                    <div
                      key={num}
                      className={`h-5.5 sm:h-6 rounded flex items-center justify-center font-mono font-bold text-[9px] sm:text-[10px] transition-all ${
                        isCurrent
                          ? 'btn-gaming-gold text-slate-950 scale-105 z-10 shadow-md ring-1.5 ring-amber-300 font-black'
                          : isDrawn
                          ? 'dauber-marked-gold text-slate-950 font-black shadow-2xs'
                          : 'bg-slate-900/90 text-slate-500 border border-slate-800/70'
                      }`}
                      title={`Balota ${num}`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 3. HISTORIAL, PREMIOS Y BARRA DE PROGRESO INFERIOR                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="pt-3 border-t border-slate-700/60 flex flex-col gap-3 bg-slate-950/60 backdrop-blur-md rounded-2xl p-3.5 mt-2">
          
          {/* Fila: Historial de Últimas Balotas + Premios */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Riel de Balotas Recientes */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Recientes:
              </span>

              {snapshot.drawn_numbers.length === 0 ? (
                <span className="text-xs text-slate-500 font-mono italic">Aún sin extracciones</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  {snapshot.drawn_numbers.slice(-7).reverse().map((num, i) => {
                    const m = getBallMetadata(snapshot.modality_id, num);
                    const isLatest = i === 0;

                    return (
                      <div
                        key={num}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all ${
                          isLatest
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-105 shadow-md'
                            : 'bg-slate-900 border border-slate-800 text-slate-300'
                        }`}
                      >
                        {m.letter && <span className="opacity-75">{m.letter}</span>}
                        <span>{num}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reglas de Premios Oficiales */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-slate-300">
                  {snapshot.modality_id === 'BINGO_75'
                    ? 'Línea 25% · Cartón Lleno 75%'
                    : snapshot.modality_id === 'BINGO_90'
                    ? 'Quiniela / Cartón Lleno'
                    : 'Premio Oficial Modalidad'}
                </span>
              </div>

              {/* CTA Adquirir Cartones */}
              {onBuyCards && (
                <button
                  onClick={onBuyCards}
                  className="px-3.5 py-1.5 rounded-xl btn-gaming-gold shine-sweep text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Adquirir Cartones
                </button>
              )}
            </div>
          </div>

          {/* Barra de Progreso Matemática */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Progreso Oficial del Sorteo: {snapshot.drawn_numbers.length} de {snapshot.total_balls} balotas
              </span>
              <span className="font-bold text-amber-400">{progressPercent}%</span>
            </div>

            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
