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

  return (
    <div
      className={`rounded-2xl border transition-all relative overflow-hidden flex flex-col ${
        isWon
          ? 'border-amber-400/80 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 shadow-xl shadow-amber-500/10'
          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
      } ${className}`}
    >
      {/* CABECERA DEL CARTÓN */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-amber-400">
            #{card.card_serial || card.id.slice(0, 8)}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            {cleanModality}
          </span>
        </div>

        {/* Estatus oficial del cartón */}
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
              isWon
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : card.status === 'PLAYING'
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                : card.status === 'CANCELLED'
                ? 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {card.status}
          </span>
          {isWon && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
        </div>
      </div>

      {/* LETRAS B-I-N-G-O PARA BINGO_75 */}
      {cleanModality === 'BINGO_75' && grid.length === 5 && (
        <div className="grid grid-cols-5 bg-gradient-to-r from-amber-500/15 via-amber-400/15 to-amber-500/15 border-b border-amber-500/20 text-center py-1.5">
          {BINGO_75_LETTERS.map((letter) => (
            <span
              key={letter}
              className="text-xs font-black text-amber-400 font-display tracking-wider"
            >
              {letter}
            </span>
          ))}
        </div>
      )}

      {/* MATRIZ DEL CARTÓN */}
      <div className="p-3 flex-1 flex flex-col justify-center">
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
                      className="h-10 sm:h-12 rounded-lg bg-slate-950/50 border border-slate-900 flex items-center justify-center opacity-40"
                    />
                  );
                }

                if (cleanModality === 'CHAPITAS') {
                  return (
                    <div
                      key={`chapita-${rIdx}-${cIdx}`}
                      className={`h-10 sm:h-12 rounded-full border transition-all flex flex-col items-center justify-center p-0.5 relative text-center ${
                        isMarked
                          ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 text-slate-950 border-amber-300 font-bold shadow-md shadow-amber-500/20 scale-102 z-10'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}
                      title={item ? `${cellNum}: ${item.name}` : `Balota ${cellNum}`}
                    >
                      <span className="text-[11px] sm:text-xs font-black font-mono leading-none">
                        {cellNum}
                      </span>
                      {item && (
                        <span
                          className={`text-[8px] sm:text-[9px] truncate max-w-full leading-tight font-medium ${
                            isMarked ? 'text-slate-950 font-bold' : 'text-slate-400'
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
                    className={`h-10 sm:h-12 rounded-lg border transition-all flex items-center justify-center font-mono font-bold text-xs sm:text-sm ${
                      isMarked
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm scale-102 z-10'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
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
                      className="h-12 sm:h-14 rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-300 flex flex-col items-center justify-center font-bold font-display text-[10px] sm:text-xs"
                      title="Casilla Central Libre"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400 mb-0.5" />
                      <span>LIBRE</span>
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
                    className={`h-12 sm:h-14 rounded-xl border transition-all flex flex-col items-center justify-center p-1 relative text-center ${
                      isMarked
                        ? 'bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-200 text-slate-950 border-amber-200 font-bold shadow-md shadow-amber-500/20 scale-102 z-10'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                    title={item ? `#${cellNum} ${item.name}` : `Balota ${cellNum}`}
                  >
                    <span className="text-xs sm:text-sm font-black font-mono leading-none">
                      {cellNum}
                    </span>
                    {item && (
                      <span
                        className={`text-[9px] sm:text-[10px] truncate max-w-full leading-tight font-medium mt-0.5 ${
                          isMarked ? 'text-slate-950 font-bold' : 'text-slate-400'
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
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <button
            onClick={handleClaim}
            disabled={claimLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {claimLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verificando con Servidor...</span>
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 text-slate-950" />
                <span>¡Cantar Bingo!</span>
              </>
            )}
          </button>

          {claimFeedback && (
            <div
              className={`mt-2 flex items-center gap-2 p-2 rounded-lg text-xs font-mono border ${
                claimFeedback.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {claimFeedback.success ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              )}
              <span className="truncate">{claimFeedback.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
