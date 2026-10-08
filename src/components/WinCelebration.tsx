// ==============================================================================
// BINGO CLUB VNZLA ONLINE — CELEBRACIÓN DE GANADOR (WINCELEBRATION)
// Satisface: Celebración puramente visual disparada EXCLUSIVAMENTE por evento WINNER_AWARDED real.
// Idempotente, respeta accesibilidad (role="dialog", aria-modal, Esc, prefers-reduced-motion) y SFX.
// ==============================================================================

import React, { useEffect, useRef } from 'react';
import { Trophy, Sparkles, X, CheckCircle2, ShieldCheck, Flame } from 'lucide-react';
import { playWinnerFanfare } from '../lib/soundFx';

export interface WinCelebrationData {
  winner_id: string;
  draw_id: string;
  card_id: string;
  user_id?: string;
  pattern: string;
  prize_amount: number;
  event_hash?: string;
  sequence_number?: number;
  timestamp?: string;
  isCurrentPlayer?: boolean;
}

interface WinCelebrationProps {
  data: WinCelebrationData | null;
  onClose: () => void;
  autoCloseMs?: number;
}

export const WinCelebration: React.FC<WinCelebrationProps> = ({
  data,
  onClose,
  autoCloseMs = 8000,
}) => {
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const celebratedIdRef = useRef<string | null>(null);

  // Comprobar preferencia de movimiento reducido
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!data) return;

    // Ejecutar fanfarria solo una vez por evento único de ganador
    const uniqueKey = data.event_hash || data.winner_id;
    if (celebratedIdRef.current !== uniqueKey) {
      celebratedIdRef.current = uniqueKey;
      playWinnerFanfare();
    }

    // Configurar autocierre limpio
    if (autoCloseMs > 0) {
      autoCloseTimerRef.current = setTimeout(() => {
        onClose();
      }, autoCloseMs);
    }

    // Manejar tecla ESC para cierre accesible
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [data, onClose, autoCloseMs]);

  if (!data) return null;

  const displayPattern =
    data.pattern === 'CARTON_LLENO' || data.pattern === 'FULL_HOUSE'
      ? '¡CARTÓN LLENO!'
      : data.pattern === 'LINEA' || data.pattern === 'ONE_LINE'
      ? '¡LÍNEA VALIDADA!'
      : `¡${data.pattern.replace(/_/g, ' ')}!`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label="Celebración de Ganador Oficial"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-opacity"
    >
      {/* Fondo sutil con resplandor dorado */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-yellow-400/10 rounded-full blur-[80px]" />
      </div>

      {/* Tarjeta modal de celebración */}
      <div
        className={`relative w-full max-w-lg rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20 overflow-hidden ${
          prefersReducedMotion ? 'opacity-100' : 'animate-in fade-in zoom-in-95 duration-300'
        }`}
      >
          {/* Cinta superior tricolor venezolana de acento sutil */}
          <div className="absolute top-0 inset-x-0 h-1.5 criollo-accent-bar" />

          {/* Botón de cierre accesible */}
          <button
            onClick={onClose}
            aria-label="Cerrar celebración"
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Trofeo dorado central */}
          <div className="mx-auto my-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30">
            <Trophy className="h-10 w-10 text-slate-950" />
          </div>

          {/* Título de Victoria */}
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Sorteo Oficial Autorizado
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight pt-2">
              {displayPattern}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {data.isCurrentPlayer
                ? '¡Felicidades! Tu cartón ha sido certificado como ganador por el servidor autoritativo.'
                : '¡Se ha registrado y certificado un cartón ganador en la sala oficial!'}
            </p>
          </div>

          {/* Información verificada del evento */}
          <div className="my-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Cartón Ganador:</span>
              <span className="font-bold text-amber-400">
                #{data.card_id ? data.card_id.slice(0, 8) : 'OFICIAL'}
              </span>
            </div>

            {data.prize_amount > 0 && (
              <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Premio Certificado:</span>
                <span className="font-bold text-emerald-400">
                  Bs. {Number(data.prize_amount).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Patrón Validado:</span>
              <span className="font-semibold text-white">
                {data.pattern}
              </span>
            </div>

            {/* Hash Forense Oficial (Solo si viene del backend real) */}
            {data.event_hash && (
              <div className="pt-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                  Hash Forense del Evento:
                </span>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 break-all select-all">
                  {data.event_hash}
                </div>
              </div>
            )}
          </div>

          {/* Footer de Validación Forense */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Validado Atómicamente por Winner Engine (PostgreSQL)</span>
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
            >
              Continuar en la Sala
            </button>
          </div>
        </div>
      </div>
  );
};
