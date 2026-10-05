import React, { useState } from 'react';
import type { ModalityCode } from '../../types/database.types';

interface ModalityItem {
  code: ModalityCode;
  name: string;
  gridText: string;
  centerText: string;
  totalNumbers: number;
  origin: string;
  description: string;
  previewType: '75' | '90' | 'animalitos' | 'objetos' | 'chapitas';
}

export const ModalitiesSection: React.FC = () => {
  const [selectedCode, setSelectedCode] = useState<ModalityCode>('BINGO_75');

  const modalities: ModalityItem[] = [
    {
      code: 'BINGO_75',
      name: 'Bingo 75 Balotas',
      gridText: '5x5 Cuadrícula',
      centerText: 'Centro Libre',
      totalNumbers: 75,
      origin: 'Tradicional B-I-N-G-O',
      description: 'El clásico internacional adoptado en Venezuela. Las columnas se organizan en rangos de 15 números (B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75) con casilla central comodín.',
      previewType: '75',
    },
    {
      code: 'BINGO_90',
      name: 'Bingo 90 Balotas',
      gridText: '3x9 Cuadrícula',
      centerText: 'Sin centro libre',
      totalNumbers: 90,
      origin: 'Estilo Europeo / Club',
      description: 'Cartón panorámico de 3 filas y 9 columnas. Cada fila contiene exactamente 5 números y 4 espacios vacíos, sumando 15 números por cartón con premios para Línea y Bingo.',
      previewType: '90',
    },
    {
      code: 'ANIMALITOS',
      name: 'Bingo de Animalitos',
      gridText: '5x5 Cuadrícula',
      centerText: 'Centro Libre',
      totalNumbers: 38,
      origin: 'Tradición Popular Venezolana',
      description: 'Inspirado en la cultura popular de loterías de animalitos (Delfín, Ballena, León, Águila, Perro, etc.). Cada casilla representa una figura icónica con centro libre.',
      previewType: 'animalitos',
    },
    {
      code: 'OBJETOS',
      name: 'Bingo de Figuras y Objetos',
      gridText: '5x5 Cuadrícula',
      centerText: 'Centro Libre',
      totalNumbers: 75,
      origin: 'Dinámica Visual y Educativa',
      description: 'Modalidad visual enriquecida con símbolos, instrumentos y emblemas culturales venezolanos (Cuatro, Maracas, Orquídea, Salto Ángel, Turpial) con centro libre.',
      previewType: 'objetos',
    },
    {
      code: 'CHAPITAS',
      name: 'Bingo de Chapitas',
      gridText: '3x5 Cuadrícula',
      centerText: 'Sin centro libre',
      totalNumbers: 30,
      origin: 'Formato Rápido Callejero',
      description: 'Inspirado en el clásico juego callejero venezolano. Formato compacto de 3 filas por 5 columnas y 30 fichas rápidas, diseñado para partidas dinámicas de alta rotación.',
      previewType: 'chapitas',
    },
  ];

  const current = modalities.find((m) => m.code === selectedCode) || modalities[0];

  return (
    <section id="modalidades" className="py-20 bg-slate-900/40 border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest block mb-2">
            Catálogo Oficial de Fase 1
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            5 Modalidades de Juego
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Estructuras preconfiguradas en el esquema de base de datos PostgreSQL, listas para albergar sorteos autoritativos.
          </p>
        </div>

        {/* Segmented filter controls */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl mb-8 max-w-fit">
          {modalities.map((item) => (
            <button
              key={item.code}
              onClick={() => setSelectedCode(item.code)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCode === item.code
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.name.replace('Bingo ', '')}
            </button>
          ))}
        </div>

        {/* Selected Modality Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-amber-400 font-semibold">{current.code}</span>
              <span aria-hidden="true">·</span>
              <span>{current.origin}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-mono">{current.totalNumbers} fichas totales</span>
            </div>

            <h3 className="text-2xl font-bold text-white font-serif">
              {current.name}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              {current.description}
            </p>

            {/* Specifications list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-500 block text-[11px]">Dimensiones</span>
                <span className="font-semibold text-slate-200">{current.gridText}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-500 block text-[11px]">Casilla Central</span>
                <span className="font-semibold text-slate-200">{current.centerText}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[11px]">Universo de Balotas</span>
                <span className="font-semibold text-amber-400 font-mono tabular-nums">{current.totalNumbers} unidades</span>
              </div>
            </div>
          </div>

          {/* Interactive Matrix Representation */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center">
            <div className="text-xs text-slate-400 mb-3 flex items-center justify-between w-full font-mono text-[11px]">
              <span>Representación Gráfica</span>
              <span className="text-amber-400">{current.gridText}</span>
            </div>

            {/* Grid preview according to modality */}
            {current.previewType === '75' && (
              <div className="grid grid-cols-5 gap-1.5 w-full max-w-[280px]">
                {['B', 'I', 'N', 'G', 'O'].map((l) => (
                  <div key={l} className="text-center font-bold text-xs py-1 text-amber-400 bg-slate-950 rounded">
                    {l}
                  </div>
                ))}
                {Array.from({ length: 25 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square flex items-center justify-center rounded text-[11px] font-mono font-medium ${
                      idx === 12
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {idx === 12 ? '★' : (idx * 3 + 1)}
                  </div>
                ))}
              </div>
            )}

            {current.previewType === '90' && (
              <div className="grid grid-cols-9 gap-1 w-full max-w-[320px]">
                {Array.from({ length: 27 }).map((_, idx) => {
                  const isBlank = (idx % 2 === 1 && idx % 3 !== 0) || idx === 8 || idx === 17;
                  return (
                    <div
                      key={idx}
                      className={`h-7 flex items-center justify-center rounded text-[10px] font-mono font-medium ${
                        isBlank
                          ? 'bg-slate-950/40 text-slate-700 border border-slate-900'
                          : 'bg-slate-950 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {isBlank ? '·' : (idx * 3 + 2)}
                    </div>
                  );
                })}
              </div>
            )}

            {current.previewType === 'animalitos' && (
              <div className="grid grid-cols-5 gap-1.5 w-full max-w-[280px]">
                {['🐬', '🦁', '🦅', '🐴', '🐅', '🐶', '🐘', '🐵', '🐍', '🐮', '🐰', '🦊', '★', '🐻', '🐼', '🐸', '🐨', '🐯', '🐺', '🐗', '🐢', '🦓', '🦘', '🦙', '🦒'].map((icon, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square flex items-center justify-center rounded text-sm ${
                      idx === 12
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-200 border border-slate-800'
                    }`}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            )}

            {current.previewType === 'objetos' && (
              <div className="grid grid-cols-5 gap-1.5 w-full max-w-[280px]">
                {['🪕', '🌸', '🪘', '🦜', '☀️', '🪙', '🎺', '👒', '⚓', '🔔', '🏺', '🗝️', '★', '🛶', '🎪', '🏹', '💎', '🕯️', '🎡', '🧭', '🎭', '🪞', '📻', '🎸', '📜'].map((icon, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square flex items-center justify-center rounded text-sm ${
                      idx === 12
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-200 border border-slate-800'
                    }`}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            )}

            {current.previewType === 'chapitas' && (
              <div className="grid grid-cols-5 gap-2 w-full max-w-[260px]">
                {Array.from({ length: 15 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-gradient-to-br from-amber-500/20 to-slate-950 text-amber-300 border border-amber-500/40"
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
