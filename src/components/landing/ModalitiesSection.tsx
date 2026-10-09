// ====================================================================
// BINGO CLUB VNZLA ONLINE — SECCIÓN DE MODALIDADES DE JUEGO
// Presentación interactiva de las 5 modalidades oficiales configuradas
// ====================================================================

import React, { useState } from 'react';
import type { ModalityCode } from '../../types/database';
import { Sparkles, Check, Grid, Flame } from 'lucide-react';

export interface ModalityPresentation {
  id: string;
  code: ModalityCode;
  name: string;
  grid_rows: number;
  grid_cols: number;
  has_free_center: boolean;
  total_numbers: number;
  description: string;
  rules_config: { format: string; pattern: string };
  is_active: boolean;
}

const INITIAL_MODALITIES: ModalityPresentation[] = [
  {
    id: 'm-b75',
    code: 'BINGO_75',
    name: 'Bingo Tradicional 75 Bolas',
    grid_rows: 5,
    grid_cols: 5,
    has_free_center: true,
    total_numbers: 75,
    description: 'Cuadrícula 5x5 con casilla central libre. Números del 1 al 75 organizados en las clásicas columnas B-I-N-G-O.',
    rules_config: { format: '5x5 Americano', pattern: 'Línea / Cuatro Esquinas / Cartón Lleno' },
    is_active: true,
  },
  {
    id: 'm-b90',
    code: 'BINGO_90',
    name: 'Bingo Clásico 90 Bolas',
    grid_rows: 3,
    grid_cols: 5,
    has_free_center: false,
    total_numbers: 90,
    description: 'Tradicional formato de 3 filas con 5 números por fila (15 números por cartón). Rango del 1 al 90.',
    rules_config: { format: '3x5 Clásico Europeo/Latino', pattern: 'Línea 1 / Línea 2 / Bingo Completo' },
    is_active: true,
  },
  {
    id: 'm-ani',
    code: 'ANIMALITOS',
    name: 'Lotto Animalitos Venezolanos',
    grid_rows: 5,
    grid_cols: 5,
    has_free_center: true,
    total_numbers: 38,
    description: 'La modalidad más popular venezolana adaptada a bingo con las 38 figuras tradicionales (Delfín, Ballena, León, Toro, etc.) y centro libre.',
    rules_config: { format: '5x5 Folclórico', pattern: 'Línea de Animalitos / Diagonal / Lleno' },
    is_active: true,
  },
  {
    id: 'm-obj',
    code: 'OBJETOS',
    name: 'Bingo de Objetos e Iconos',
    grid_rows: 5,
    grid_cols: 5,
    has_free_center: true,
    total_numbers: 50,
    description: 'Iconografía visual de objetos y símbolos venezolanos coleccionables en cuadrícula 5x5 con casilla libre.',
    rules_config: { format: '5x5 Temático', pattern: 'Cruz / Marco / Tablero Lleno' },
    is_active: true,
  },
  {
    id: 'm-cha',
    code: 'CHAPITAS',
    name: 'Bingo Rápido Chapitas 3x5',
    grid_rows: 3,
    grid_cols: 5,
    has_free_center: false,
    total_numbers: 30,
    description: 'Modalidad de acción express: 15 casillas por cartón sobre 30 chapitas numeradas con dinámica de ronda ultrarrápida.',
    rules_config: { format: '3x5 Express', pattern: 'Chapita Lleno Rápido' },
    is_active: true,
  },
];

export const ModalitiesSection: React.FC = () => {
  const [selectedModality, setSelectedModality] = useState<ModalityCode>('BINGO_75');

  const current = INITIAL_MODALITIES.find((m) => m.code === selectedModality) || INITIAL_MODALITIES[0];

  // Helper para generar una vista previa del cartón
  const renderCardPreview = (modality: ModalityPresentation) => {
    const rows = modality.grid_rows;
    const cols = modality.grid_cols;

    return (
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center">
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Cartón Oficial {modality.code.replace('_', ' ')}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {rows}x{cols} {modality.has_free_center ? '· Centro Libre' : ''}
          </span>
        </div>

        {/* Grid del cartón */}
        <div
          className="grid gap-1.5 w-full max-w-[280px]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows * cols }).map((_, index) => {
            const rowIndex = Math.floor(index / cols);
            const colIndex = index % cols;
            const isCenter = modality.has_free_center && rowIndex === 2 && colIndex === 2;

            return (
              <div
                key={index}
                className={`h-10 sm:h-11 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm font-mono border transition ${
                  isCenter
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-inner'
                    : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isCenter ? (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                ) : modality.code === 'ANIMALITOS' ? (
                  <span>{((index * 3) % 38) + 1}</span>
                ) : (
                  <span>{((index * 5 + 3) % modality.total_numbers) + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-400">
          <span>Total en bombo: <strong className="text-white">{modality.total_numbers}</strong></span>
          <span className="text-emerald-400 font-medium">Esquema Validado</span>
        </div>
      </div>
    );
  };

  return (
    <section id="modalities" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Configuración en Base de Datos
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-white mt-2">
          5 Modalidades de Juego Oficiales
        </h2>
        <p className="text-sm text-slate-400 mt-3">
          Desde el tradicional 75 hasta los icónicos Animalitos y Chapitas de la cultura venezolana.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Selector de Modalidades */}
        <div className="lg:col-span-5 space-y-2.5">
          {INITIAL_MODALITIES.map((mod) => {
            const isSelected = mod.code === selectedModality;
            return (
              <button
                key={mod.code}
                onClick={() => setSelectedModality(mod.code)}
                className={`w-full p-4 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-amber-400/60 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm border ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {mod.code.startsWith('BINGO') ? mod.total_numbers : mod.code.substring(0, 3)}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {mod.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {mod.grid_rows}x{mod.grid_cols} {mod.has_free_center ? '· Libre' : ''} · {mod.total_numbers} balotas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detalle y Vista Previa de la Modalidad */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {current.code}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Cuadrícula {current.grid_rows} x {current.grid_cols}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{current.name}</h3>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Esquema SQL Migrado</span>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            {current.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Vista previa matemática */}
            {renderCardPreview(current)}

            {/* Ficha técnica de la modalidad */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400">Dimensiones de Cuadrícula:</p>
                <p className="font-semibold text-white mt-0.5">
                  {current.grid_rows} Filas x {current.grid_cols} Columnas
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400">Casilla Central:</p>
                <p className="font-semibold text-white mt-0.5">
                  {current.has_free_center ? 'Casilla Libre Activa (Automarcada)' : 'Sin casilla libre'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400">Universo de Bolas:</p>
                <p className="font-semibold text-white mt-0.5">
                  {current.total_numbers} números o figuras registradas
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400">Patrones Ganadores Oficiales:</p>
                <p className="font-semibold text-amber-300 mt-0.5">
                  {(current.rules_config as { pattern?: string })?.pattern || 'Línea y Bingo'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
