// ==============================================================================
// BINGO CLUB VNZLA ONLINE — TARJETA DE MODALIDAD
// Cumple con la constitución de diseño: Zero-pill discipline, contrastes nítidos
// ==============================================================================

import React from 'react';
import type { GameModality } from '../types/database';
import { Grid3X3, Dices, Sparkles, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { playClickSound } from '../lib/soundFx';

interface ModalityCardProps {
  modality: GameModality;
  onSelect?: (modality: GameModality) => void;
  onPlay?: (modalityId: string) => void;
}

export const ModalityCard: React.FC<ModalityCardProps> = ({ modality, onSelect, onPlay }) => {
  const getThemeConfig = () => {
    switch (modality.id) {
      case 'BINGO_75':
        return {
          icon: <Grid3X3 className="h-5 w-5 text-amber-400" />,
          accentBorder: 'hover:border-amber-500/50',
          accentGlow: 'hover:shadow-amber-500/10',
          iconBg: 'bg-amber-950/60 border-amber-500/30 text-amber-400',
          tagline: '5x5 Centro Libre · 75 Balotas',
          prizesRule: 'Línea 25% · Cartón Lleno 75%',
          badgeColor: 'text-amber-400',
        };
      case 'BINGO_90':
        return {
          icon: <Dices className="h-5 w-5 text-sky-400" />,
          accentBorder: 'hover:border-sky-500/50',
          accentGlow: 'hover:shadow-sky-500/10',
          iconBg: 'bg-sky-950/60 border-sky-500/30 text-sky-400',
          tagline: '3x9 · 15 Números · 90 Balotas',
          prizesRule: 'Sin Línea · Quiniela / Cartón Lleno',
          badgeColor: 'text-sky-400',
        };
      case 'ANIMALITOS':
        return {
          icon: <Sparkles className="h-5 w-5 text-emerald-400" />,
          accentBorder: 'hover:border-emerald-500/50',
          accentGlow: 'hover:shadow-emerald-500/10',
          iconBg: 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400',
          tagline: '5x5 Centro Libre · 75 Animalitos',
          prizesRule: 'Catálogo Oficial de los 75 Animalitos',
          badgeColor: 'text-emerald-400',
        };
      case 'OBJETOS':
        return {
          icon: <Layers className="h-5 w-5 text-amber-300" />,
          accentBorder: 'hover:border-amber-400/50',
          accentGlow: 'hover:shadow-amber-400/10',
          iconBg: 'bg-amber-950/70 border-amber-400/30 text-amber-300',
          tagline: '5x5 Centro Libre · 75 Iconos Criollos',
          prizesRule: 'Símbolos Tradicionales de Venezolanidad',
          badgeColor: 'text-amber-300',
        };
      case 'CHAPITAS':
        return {
          icon: <Dices className="h-5 w-5 text-rose-400" />,
          accentBorder: 'hover:border-rose-500/50',
          accentGlow: 'hover:shadow-rose-500/10',
          iconBg: 'bg-rose-950/60 border-rose-500/30 text-rose-400',
          tagline: '3x9 · 90 Posiciones (45+45)',
          prizesRule: '45 Animalitos + 45 Objetos Oficiales',
          badgeColor: 'text-rose-400',
        };
      default:
        return {
          icon: <Grid3X3 className="h-5 w-5 text-amber-400" />,
          accentBorder: 'hover:border-amber-500/50',
          accentGlow: 'hover:shadow-amber-500/10',
          iconBg: 'bg-slate-800 border-slate-700 text-amber-400',
          tagline: `${modality.grid_rows}x${modality.grid_cols} · ${modality.total_balls || 75} Balotas`,
          prizesRule: 'Reglas oficiales de la modalidad',
          badgeColor: 'text-amber-400',
        };
    }
  };

  const theme = getThemeConfig();

  const handleCardClick = () => {
    playClickSound();
    if (onSelect) {
      onSelect(modality);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    if (onPlay) {
      onPlay(modality.id);
    } else if (onSelect) {
      onSelect(modality);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 transition-all duration-300 ${theme.accentBorder} hover:shadow-xl ${theme.accentGlow} hover:-translate-y-0.5 cursor-pointer`}
    >
      {/* Sutil acento superior de color casino criollo */}
      <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent group-hover:via-amber-400/60 transition-all" />

      <div>
        <div className="flex items-start justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${theme.iconBg} shadow-inner`}>
            {theme.icon}
          </div>

          {/* Zero-pill: Clean unboxed metadata with subtle typographic separators */}
          <div className="text-right text-xs text-slate-400 font-mono tracking-tight">
            <span>{modality.grid_rows}x{modality.grid_cols}</span>
            <span className="mx-1.5 opacity-40" aria-hidden="true">·</span>
            <span className="text-slate-300 font-semibold">{modality.total_balls || 75} balotas</span>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors font-display tracking-tight">
            {modality.name}
          </h3>
          <p className="mt-1 text-xs font-medium text-amber-400/80 font-mono">
            {theme.tagline}
          </p>
          <p className="mt-2.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
            {modality.description}
          </p>
        </div>
      </div>

      {/* Reglas oficiales y características técnicas */}
      <div className="mt-5 pt-3.5 border-t border-slate-850">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-[11px] font-medium text-slate-300">
            {theme.prizesRule}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {modality.has_free_center ? 'Centro Libre' : 'Sin libre'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onPlay && (
            <button
              onClick={handlePlayClick}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 py-2.5 px-3 text-xs font-bold text-slate-950 transition-all shadow-md shadow-amber-500/10 cursor-pointer active:scale-[0.98]"
            >
              <span>JUGAR SALA</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {onSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-850 hover:bg-slate-800 py-2.5 px-3 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              Detalles
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

