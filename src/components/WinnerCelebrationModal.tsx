// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PANTALLA OFICIAL DE CELEBRACIÓN DE GANADOR
// Modal / Overlay visual profesional con Foto Google, Nombre, Cartón y Premio
// ==============================================================================

import React, { useEffect } from 'react';
import { Trophy, Sparkles, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { playWinnerFanfare } from '../lib/soundFx';

export interface ConfirmedWinnerData {
  winnerId: string;
  drawId: string;
  cardId: string;
  cardSerial: string;
  playerName: string;
  avatarUrl: string | null;
  modality: string;
  prizeAmount: number;
  confirmedAt: string;
  pattern: string;
}

interface WinnerCelebrationModalProps {
  winner: ConfirmedWinnerData | null;
  onClose: () => void;
}

export const WinnerCelebrationModal: React.FC<WinnerCelebrationModalProps> = ({
  winner,
  onClose,
}) => {
  useEffect(() => {
    if (winner) {
      playWinnerFanfare();
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20 overflow-hidden">
        {/* EFECTO RADIAL DE FONDO */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* TROFEO Y ENCABEZADO */}
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 animate-bounce">
          <Trophy className="h-8 w-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
          <Sparkles className="h-3 w-3 text-amber-400" />
          ¡TENEMOS GANADOR AUTORIZADO!
        </span>

        {/* FOTO DEL JUGADOR */}
        <div className="mt-4 mb-3 flex justify-center">
          <div className="relative">
            {winner.avatarUrl ? (
              <img
                src={winner.avatarUrl}
                alt={winner.playerName}
                className="h-20 w-20 rounded-full object-cover border-2 border-amber-400 shadow-xl shadow-amber-400/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-bold text-2xl shadow-xl shadow-amber-400/20">
                {winner.playerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border-2 border-slate-900">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* NOMBRE */}
        <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-wide">
          {winner.playerName}
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          Cartón Ganador: <strong className="text-amber-400">#{winner.cardSerial}</strong>
        </p>

        {/* DETALLE DEL PREMIO */}
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            Premio Oficial Asignado ({winner.pattern})
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-amber-300 font-mono">
            Bs. {winner.prizeAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Asentado en Billetera / Reclamo Aprobado
          </span>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
        >
          CONTINUAR AL JUEGO
        </button>
      </div>
    </div>
  );
};
