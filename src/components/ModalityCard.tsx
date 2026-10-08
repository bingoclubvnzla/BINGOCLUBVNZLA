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
      className={`group relative flex flex-col justify-between rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-[#060919] p-6 transition-all duration-300 ${theme.accentBorder} hover:shadow-2xl ${theme.accentGlow} hover:-translate-y-1 cursor-pointer overflow-hidden`}
    >
      {/* Sutil acento superior de color casino criollo con animación de brillo */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent group-hover:via-amber-300 transition-all opacity-70 group-hover:opacity-100" />

      <div>
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${theme.iconBg} shadow-lg transition-transform group-hover:scale-110`}>
            {theme.icon}
          </div>

          {/* Metadata de cuadrícula y balotas */}
          <div className="text-right text-xs font-mono font-bold tracking-tight">
            <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">{modality.grid_rows}x{modality.grid_cols}</span>
            <span className="mx-1.5 opacity-40 text-slate-500" aria-hidden="true">·</span>
            <span className="text-slate-200">{modality.total_balls || 75} balotas</span>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors font-display tracking-tight">
            {modality.name}
          </h3>
          <p className="mt-1 text-xs font-bold text-amber-400 font-mono">
            {theme.tagline}
          </p>
          <p className="mt-2.5 text-xs text-slate-300 leading-relaxed line-clamp-3">
            {modality.description}
          </p>
        </div>
      </div>

      {/* Reglas oficiales y características técnicas */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs mb-3.5">
          <span className="text-[11px] font-bold text-slate-300">
            {theme.prizesRule}
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
            {modality.has_free_center ? '⭐ Centro Libre' : 'Sin libre'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onPlay && (
            <button
              onClick={handlePlayClick}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl btn-gaming-gold shine-sweep py-2.5 px-3 text-xs font-black text-slate-950 transition-all shadow-lg cursor-pointer"
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
              className="rounded-xl border border-slate-700 hover:border-amber-400/50 bg-slate-800/90 hover:bg-slate-750 py-2.5 px-3.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              Detalles
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

