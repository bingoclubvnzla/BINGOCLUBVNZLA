// ==============================================================================
// BINGO CLUB VNZLA ONLINE — TARJETA DE MODALIDAD
// Cumple con la constitución de diseño: Zero-pill discipline, contrastes nítidos
// ==============================================================================

import React from 'react';
import type { GameModality } from '../types/database';
import { Sparkles, Grid3X3, Dices, Layers, ShieldCheck } from 'lucide-react';

interface ModalityCardProps {
  modality: GameModality;
  onSelect?: (modality: GameModality) => void;
}

export const ModalityCard: React.FC<ModalityCardProps> = ({ modality, onSelect }) => {
  const getIcon = () => {
    switch (modality.id) {
      case 'BINGO_75':
        return <Grid3X3 className="h-5 w-5 text-amber-400" />;
      case 'BINGO_90':
        return <Dices className="h-5 w-5 text-sky-400" />;
      case 'ANIMALITOS':
        return <Sparkles className="h-5 w-5 text-emerald-400" />;
      case 'OBJETOS':
        return <Layers className="h-5 w-5 text-amber-400" />;
      case 'CHAPITAS':
        return <Dices className="h-5 w-5 text-rose-400" />;
      default:
        return <Grid3X3 className="h-5 w-5 text-amber-400" />;
    }
  };

  return (
    <div className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-amber-500/5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
          {getIcon()}
        </div>
        {/* Zero-pill: Clean unboxed metadata with subtle typographic separators */}
        <div className="text-right text-xs text-slate-400 font-mono">
          <span>{modality.grid_rows}x{modality.grid_cols}</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>{modality.total_balls} balotas</span>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors font-display">
          {modality.name}
        </h3>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-3">
          {modality.description}
        </p>
      </div>

      {/* Características técnicas sin etiquetas tipo píldora */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div>
          {modality.has_free_center ? (
            <span className="text-amber-400 font-medium">Centro Libre Incluido</span>
          ) : (
            <span className="text-slate-400">Sin casilla central libre</span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          ID: {modality.id}
        </div>
      </div>

      {onSelect && (
        <button
          onClick={() => onSelect(modality)}
          className="mt-4 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        >
          Ver Parámetros de Sorteo
        </button>
      )}
    </div>
  );
};
