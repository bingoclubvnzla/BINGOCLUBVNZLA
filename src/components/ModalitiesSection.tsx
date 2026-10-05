import React, { useState } from 'react';
import { GameModality } from '../types/database';
import { Layers, Sparkles, CheckCircle2 } from 'lucide-react';

export const ModalitiesSection: React.FC = () => {
  const modalities: GameModality[] = [
    {
      id: 'BINGO_75',
      name: 'Bingo 75 Tradicional',
      description: 'Matriz clásica 5x5 americana con casilla central libre. Cantada con 75 balotas divididas en las letras B-I-N-G-O. Ideal para figuras y cartón lleno.',
      grid_rows: 5,
      grid_cols: 5,
      has_free_center: true,
      free_center: true,
      total_balls: 75,
      number_range_min: 1,
      number_range_max: 75,
      config: {
        winning_patterns: ['LINE', 'FULL_HOUSE'],
      },
      is_active: true,
      display_order: 1,
    },
    {
      id: 'BINGO_90',
      name: 'Bingo 90 Español',
      description: 'Modalidad clásica europea y latinoamericana. Matriz 3x9 con 5 números por fila (15 números por cartón) en un bombo oficial de 90 bolas.',
      grid_rows: 3,
      grid_cols: 9,
      has_free_center: false,
      free_center: false,
      total_balls: 90,
      number_range_min: 1,
      number_range_max: 90,
      config: {
        numbers_per_card: 15,
        numbers_per_row: 5,
        winning_patterns: ['ONE_LINE', 'TWO_LINES', 'BINGO'],
      },
      is_active: true,
      display_order: 2,
    },
    {
      id: 'ANIMALITOS',
      name: 'Bingo de Animalitos',
      description: 'Modalidad oficial inspirada en los 75 animalitos de la suerte tradicionales. Matriz 5x5 con centro libre y catálogo oficial de 75 figuras con voz y visuales.',
      grid_rows: 5,
      grid_cols: 5,
      has_free_center: true,
      free_center: true,
      total_balls: 75,
      number_range_min: 1,
      number_range_max: 75,
      config: {
        theme: 'ANIMALITOS_VENEZUELA',
        winning_patterns: ['LINE', 'FULL_HOUSE'],
      },
      is_active: true,
      display_order: 3,
    },
    {
      id: 'OBJETOS',
      name: 'Bingo de Objetos Criollos',
      description: 'Matriz temática 5x5 de centro libre con 75 objetos, símbolos patrios e iconos representativos de la cultura y tradición venezolana.',
      grid_rows: 5,
      grid_cols: 5,
      has_free_center: true,
      free_center: true,
      total_balls: 75,
      number_range_min: 1,
      number_range_max: 75,
      config: {
        theme: 'CRIOLLO_VNZLA',
        winning_patterns: ['LINE', 'FULL_HOUSE'],
      },
      is_active: true,
      display_order: 4,
    },
    {
      id: 'CHAPITAS',
      name: 'Bingo Chapitas Criollo',
      description: 'Modalidad oficial de 90 números conformada por 45 animalitos y 45 objetos criollos de Venezuela en matriz 3x9 con 15 números por cartón.',
      grid_rows: 3,
      grid_cols: 9,
      has_free_center: false,
      free_center: false,
      total_balls: 90,
      number_range_min: 1,
      number_range_max: 90,
      config: {
        theme: 'CHAPITAS_45_45',
        numbers_per_card: 15,
        numbers_per_row: 5,
        winning_patterns: ['ONE_LINE', 'TWO_LINES', 'BINGO'],
      },
      is_active: true,
      display_order: 5,
    },
  ];

  const [selectedModality, setSelectedModality] = useState<GameModality>(modalities[0]);

  // Generador de matriz de muestra para la visualización del cartón
  const generatePreviewMatrix = (mod: GameModality) => {
    const rows = mod.grid_rows;
    const cols = mod.grid_cols;
    const matrix: (string | number)[][] = [];

    const min = mod.number_range_min ?? 1;
    const max = mod.number_range_max ?? mod.total_balls ?? 75;
    const hasFree = mod.has_free_center ?? mod.free_center ?? false;

    let counter = min;
    for (let r = 0; r < rows; r++) {
      const row: (string | number)[] = [];
      for (let c = 0; c < cols; c++) {
        if (hasFree && r === Math.floor(rows / 2) && c === Math.floor(cols / 2)) {
          row.push('★ LIBRE');
        } else {
          row.push((counter % max) + 1);
          counter += Math.floor((max - min) / (rows * cols)) || 3;
        }
      }
      matrix.push(row);
    }
    return matrix;
  };

  const previewMatrix = generatePreviewMatrix(selectedModality);

  return (
    <section id="modalidades" className="py-24 bg-[#070D18] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>CONFIGURACIÓN DEL SISTEMA</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">SECCIÓN 11 PROMPT MAESTRO</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
              5 Modalidades de Juego Oficiales
            </h2>
            <p className="mt-3 text-base text-slate-400 max-w-2xl">
              Estructura registrada en base de datos PostgreSQL mediante la tabla <code className="text-amber-300 font-mono text-xs">game_modalities</code>.
            </p>
          </div>

          {/* Interactive Modality Tabs (Segmented Control) */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            {modalities.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setSelectedModality(mod)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  selectedModality.id === mod.id
                    ? 'bg-amber-400 text-[#070D18] shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {mod.name.split(' ')[0]} {mod.name.split(' ')[1] || ''}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Content Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Detailed Modality Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 p-8 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-amber-400">
                  ID: {selectedModality.id}
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Activa en BD
                </span>
              </div>

              <h3 className="text-2xl font-extrabold text-white font-['Outfit'] mb-3">
                {selectedModality.name}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {selectedModality.description}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 block">Estructura de Matriz:</span>
                  <span className="font-semibold text-white text-sm">
                    {selectedModality.grid_rows} x {selectedModality.grid_cols}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Casilla Central:</span>
                  <span className="font-semibold text-white text-sm">
                    {selectedModality.free_center ? 'Libre (Free Center)' : 'Numerada Regular'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Rango de Balotas:</span>
                  <span className="font-semibold text-amber-300 text-sm">
                    {selectedModality.number_range_min} al {selectedModality.number_range_max}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Autoridad de Sorteo:</span>
                  <span className="font-semibold text-blue-400 text-sm">
                    100% Server Authoritative
                  </span>
                </div>
              </div>
            </div>

            {/* Visual asset card */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 group h-44">
              <img
                src="/src/assets/images/modalities_bingo_card_1791180089281.jpg"
                alt="Cartones de juego"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070D18] via-[#070D18]/50 to-transparent p-4 flex items-end">
                <span className="text-xs font-semibold text-slate-200">
                  Cartones digitales con serial único e idempotencia criptográfica
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Card Matrix Preview */}
          <div className="lg:col-span-7">
            <div className="bg-gradient-to-b from-slate-900 to-[#0A1220] border-2 border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Simulación Visual de Cartón Digital
                  </span>
                  <h4 className="text-xl font-bold text-white font-['Outfit']">
                    {selectedModality.name}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-amber-400 font-bold block">SERIAL BCV-77492-X</span>
                  <span className="text-[11px] text-slate-500">Hash SHA-256 Verificado</span>
                </div>
              </div>

              {/* Grid Matrix Visualizer */}
              <div
                className="grid gap-2 sm:gap-3"
                style={{
                  gridTemplateColumns: `repeat(${selectedModality.grid_cols}, minmax(0, 1fr))`,
                }}
              >
                {previewMatrix.map((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    const isFree = cell === '★ LIBRE';
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`aspect-square flex items-center justify-center rounded-xl font-['Outfit'] font-extrabold text-sm sm:text-base border transition-all ${
                          isFree
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-[#070D18] border-amber-300 shadow-md shadow-amber-500/30'
                            : 'bg-slate-950/80 text-white border-slate-800 hover:border-amber-400/40'
                        }`}
                      >
                        {cell}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Generación respaldada por la tabla <span className="font-mono text-slate-300">card_numbers</span>
                </span>
                <span className="font-mono text-slate-500">IDEMPOTENCY: READY</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
