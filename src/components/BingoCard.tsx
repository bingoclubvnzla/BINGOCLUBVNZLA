// ==============================================================================
// BINGO CLUB VNZLA ONLINE — COMPONENTE AUTORITATIVO DE CARTÓN (BINGOCARD)
// Principio: Cero reconstrucción o números aleatorios. Renderiza estrictamente card.grid_layout
// y marca casillas ÚNICAMENTE si el número existe en drawn_numbers.
// ==============================================================================

import React, { useState, useMemo } from 'react';
import type { Card } from '../types/database';
import { useModalityCatalog } from '../hooks/useModalityCatalog';
import { Trophy, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { playClickSound } from '../lib/soundFx';

interface BingoCardProps {
  card: Card;
  drawnNumbers?: number[];
  modalityId?: string;
  onClaimBingo?: (cardId: string, pattern?: string) => Promise<{ success: boolean; message?: string }>;
  isDrawActive?: boolean;
  disabled?: boolean;
  className?: string;
}

const BINGO_75_LETTERS = ['B', 'I', 'N', 'G', 'O'];

export const BingoCard: React.FC<BingoCardProps> = ({
  card,
  drawnNumbers = [],
  modalityId = 'BINGO_75',
  onClaimBingo,
  isDrawActive = false,
  disabled = false,
  className = '',
}) => {
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const cleanModality = (modalityId || 'BINGO_75').toUpperCase();
  const { resolveItem } = useModalityCatalog(cleanModality);

  // drawnSet O(1) para verificar si un número fue realmente cantado por el servidor
  const drawnSet = useMemo(() => new Set(drawnNumbers), [drawnNumbers]);

  const handleClaim = async () => {
    if (!onClaimBingo || claimLoading || card.status === 'WON' || !isDrawActive) return;

    playClickSound();
    setClaimLoading(true);
    setClaimFeedback(null);

    try {
      const res = await onClaimBingo(card.id, 'CARTON_LLENO');
      if (res.success) {
        setClaimFeedback({
          success: true,
          text: res.message || '¡Reclamo enviado y validado exitosamente!',
        });
      } else {
        setClaimFeedback({
          success: false,
          text: res.message || 'El servidor no validó el patrón de bingo.',
        });
      }
    } catch (err: any) {
      setClaimFeedback({
        success: false,
        text: err?.message || 'Error al conectar con el servidor para validar el premio.',
      });
    } finally {
      setClaimLoading(false);
    }
  };

  // Normalizar grid_layout para asegurar matriz bidimensional
  const grid: (number | string | null)[][] = Array.isArray(card.grid_layout)
    ? card.grid_layout
    : [];

  const isWon = card.status === 'WON';
  const isPlaying = card.status === 'PLAYING' || card.status === 'ISSUED';
  const canClaim = isPlaying && isDrawActive && Boolean(onClaimBingo) && !disabled;

  // Contador de aciertos marcados en este cartón
  const markedCount = useMemo(() => {
    let count = 0;
    grid.forEach((row) => {
      row.forEach((cell) => {
        const num = typeof cell === 'number' ? cell : cell ? Number(cell) : 0;
        if (num > 0 && drawnSet.has(num)) {
          count++;
        }
      });
    });
    return count;
  }, [grid, drawnSet]);

  const B75_HEADER_CLASSES = [
    'b75-header-b',
    'b75-header-i',
    'b75-header-n',
    'b75-header-g',
    'b75-header-o',
  ];

  return (
    <div
      className={`rounded-3xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col shadow-2xl ${
        isWon
          ? 'bingo-card-frame-won border-amber-400'
          : 'bingo-card-frame hover:border-amber-400/60'
      } ${className}`}
    >
      {/* Sutil acento superior de tarjeta con brillo tricolor venezolano */}
      <div className={`h-1.5 w-full ${isWon ? 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 animate-pulse' : 'criollo-accent-bar'}`} />

      {/* CABECERA DEL CARTÓN */}
      <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-700/60 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 shadow-xs">
            #{card.card_serial || card.id.slice(0, 8)}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-[11px] font-mono font-extrabold text-sky-300 uppercase tracking-wider">
            {cleanModality}
          </span>
        </div>

        {/* Estatus oficial y aciertos */}
        <div className="flex items-center gap-2">
          {markedCount > 0 && (
            <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40">
              {markedCount} {markedCount === 1 ? 'acierto' : 'aciertos'}
            </span>
          )}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm ${
              isWon
                ? 'bg-amber-500/30 text-amber-200 border-amber-400 animate-pulse'
                : card.status === 'PLAYING'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : card.status === 'CANCELLED'
                ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {card.status}
          </span>
          {isWon && <Trophy className="h-4 w-4 text-amber-400 animate-bounce" />}
        </div>
      </div>

      {/* LETRAS B-I-N-G-O PARA BINGO_75 CON ESTILO FÍSICO DE CASINO */}
      {cleanModality === 'BINGO_75' && grid.length === 5 && (
        <div className="grid grid-cols-5 border-b border-slate-700/60 text-center shadow-md">
          {BINGO_75_LETTERS.map((letter, idx) => (
            <div
              key={letter}
              className={`py-2 text-sm sm:text-base font-black font-display tracking-widest ${B75_HEADER_CLASSES[idx]}`}
            >
              {letter}
            </div>
          ))}
        </div>
      )}

      {/* MATRIZ DEL CARTÓN */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-center bg-slate-950/40">
        {cleanModality === 'BINGO_90' || cleanModality === 'CHAPITAS' ? (
          // FORMATO 3x9
          <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const cellNum = typeof cell === 'number' ? cell : cell ? Number(cell) : null;
                const isEmpty = cellNum === null || cellNum === 0 || isNaN(cellNum);
                const isMarked = !isEmpty && drawnSet.has(cellNum);
                const item = !isEmpty && cleanModality === 'CHAPITAS' ? resolveItem(cellNum) : null;

                if (isEmpty) {
                  return (
                    <div
                      key={`empty-${rIdx}-${cIdx}`}
                      className="h-10 sm:h-12 rounded-xl bg-slate-950/60 border border-slate-800/40 flex items-center justify-center opacity-25"
                    />
                  );
                }

                if (cleanModality === 'CHAPITAS') {
                  return (
                    <div
                      key={`chapita-${rIdx}-${cIdx}`}
                      className={`h-10 sm:h-12 rounded-full border-2 transition-all flex flex-col items-center justify-center p-0.5 relative text-center chapita-disk cursor-default ${
                        isMarked
                          ? 'dauber-marked-gold text-slate-950 border-amber-200 font-black scale-105 z-10 shadow-lg'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-amber-400/50 hover:bg-slate-800'
                      }`}
                      title={item ? `${cellNum}: ${item.name}` : `Balota ${cellNum}`}
                    >
                      <span className="text-[11px] sm:text-xs font-black font-mono leading-none drop-shadow-xs">
                        {cellNum}
                      </span>
                      {item && (
                        <span
                          className={`text-[8px] sm:text-[9px] truncate max-w-full leading-tight font-semibold ${
                            isMarked ? 'text-slate-950 font-black' : 'text-slate-400'
                          }`}
                        >
                          {item.name}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={`b90-${rIdx}-${cIdx}`}
                    className={`h-10 sm:h-12 rounded-xl border-2 transition-all flex items-center justify-center font-mono font-bold text-xs sm:text-sm cursor-default ${
                      isMarked
                        ? 'dauber-chip-ruby text-white border-rose-200 font-black scale-105 z-10 shadow-lg drop-shadow-md'
                        : 'bg-slate-900/90 border-slate-700/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {cellNum}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // FORMATO 5x5 (BINGO_75, ANIMALITOS, OBJETOS)
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isCenter = rIdx === 2 && cIdx === 2;
                const isFree =
                  isCenter &&
                  (cell === 'FREE' ||
                    cell === 'LIBRE' ||
                    cell === 0 ||
                    cell === null ||
                    typeof cell === 'string');

                if (isFree) {
                  return (
                    <div
                      key={`center-${rIdx}-${cIdx}`}
                      className="h-12 sm:h-14 rounded-2xl bingo-cell-free text-amber-300 flex flex-col items-center justify-center font-black font-display text-[10px] sm:text-xs relative overflow-hidden group cursor-default"
                      title="Casilla Central Libre"
                    >
                      <Sparkles className="h-4 w-4 text-amber-300 mb-0.5 animate-spin-slow group-hover:scale-125 transition-transform" />
                      <span className="gold-text-gradient font-black tracking-wider drop-shadow-xs">LIBRE</span>
                    </div>
                  );
                }

                const cellNum = typeof cell === 'number' ? cell : cell ? Number(cell) : 0;
                const isMarked = cellNum > 0 && drawnSet.has(cellNum);
                const item =
                  cellNum > 0 && (cleanModality === 'ANIMALITOS' || cleanModality === 'OBJETOS')
                    ? resolveItem(cellNum)
                    : null;

                return (
                  <div
                    key={`cell-${rIdx}-${cIdx}`}
                    className={`h-12 sm:h-14 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center p-1 relative text-center cursor-default ${
                      isMarked
                        ? 'dauber-marked-gold text-slate-950 border-amber-200 font-black scale-105 z-10 shadow-xl'
                        : 'bingo-grid-cell text-white'
                    }`}
                    title={item ? `#${cellNum} ${item.name}` : `Balota ${cellNum}`}
                  >
                    <span className={`text-sm sm:text-base font-extrabold font-mono leading-none ${isMarked ? 'text-slate-950 drop-shadow-xs' : 'text-slate-100'}`}>
                      {cellNum}
                    </span>
                    {item && (
                      <span
                        className={`text-[9px] sm:text-[10px] truncate max-w-full leading-tight font-bold mt-0.5 ${
                          isMarked ? 'text-slate-950' : 'text-amber-300/80'
                        }`}
                      >
                        {item.name}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* BOTÓN Y FEEDBACK DE "CANTAR BINGO" */}
      {canClaim && (
        <div className="p-3 sm:p-3.5 border-t border-slate-700/60 bg-slate-950/90 backdrop-blur-md">
          <button
            onClick={handleClaim}
            disabled={claimLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl btn-gaming-gold shine-sweep text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            {claimLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>Verificando con Servidor...</span>
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 text-slate-950 animate-bounce" />
                <span>¡Cantar Bingo en Vivo!</span>
              </>
            )}
          </button>

          {claimFeedback && (
            <div
              className={`mt-2.5 flex items-center gap-2 p-2.5 rounded-xl text-xs font-mono border ${
                claimFeedback.success
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              }`}
            >
              {claimFeedback.success ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span className="truncate">{claimFeedback.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
