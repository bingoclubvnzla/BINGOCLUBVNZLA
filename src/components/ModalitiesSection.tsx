// BINGO CLUB VNZLA ONLINE — SECCIÓN DE MODALIDADES DE JUEGO
// FASE 1: 5 MODALIDADES OFICIALES CON ESPECIFICACIÓN TÉCNICA

import React, { useState } from 'react';
import { ModalityCode } from '../types/database.types';
import {
  Grid,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ModalityData {
  code: ModalityCode;
  name: string;
  tagline: string;
  gridRows: number;
  gridCols: number;
  hasFreeCenter: boolean;
  totalElements: number;
  accentColor: string;
  badge: string;
  description: string;
  rules: string[];
  sampleItems: string[];
}

const MODALITIES: ModalityData[] = [
  {
    code: 'BINGO_75',
    name: 'Bingo Tradicional 75 Balotas',
    tagline: 'El clásico americano adaptado a Venezuela con cuadrícula 5x5 y casilla central libre.',
    gridRows: 5,
    gridCols: 5,
    hasFreeCenter: true,
    totalElements: 75,
    accentColor: 'from-blue-600 to-indigo-800',
    badge: '5x5 | Centro Libre',
    description: 'Los cartones se ordenan por las columnas B (1-15), I (16-30), N (31-45), G (46-60) y O (61-75). La casilla central N-3 es un comodín libre (FREE) pre-marcado.',
    rules: [
      'Gana por Línea Horizontal, Vertical o Diagonal',
      'Modalidad de 4 Esquinas disponible',
      'Cartón Lleno (Full House) para el premio mayor',
    ],
    sampleItems: ['B-7', 'I-22', 'N-FREE', 'G-54', 'O-68'],
  },
  {
    code: 'BINGO_90',
    name: 'Bingo 90 Balotas Español',
    tagline: 'La modalidad europea tradicional con cartón de 3 filas y 9 columnas.',
    gridRows: 3,
    gridCols: 5,
    hasFreeCenter: false,
    totalElements: 90,
    accentColor: 'from-amber-600 to-orange-800',
    badge: '3x5 | 90 Números',
    description: 'Cada cartón contiene 15 números distribuidos en 3 filas y 5 números por fila, con casillas en blanco intercaladas.',
    rules: [
      'Premio a la primera Línea de 5 números completada',
      'Premio al Bingo cuando se marcan los 15 números del cartón',
      'Extracción continua de balotas del 1 al 90',
    ],
    sampleItems: ['04', '18', '35', '62', '89'],
  },
  {
    code: 'ANIMALITOS',
    name: 'Lotto Animalitos Vnzla',
    tagline: 'La gran tradición popular venezolana de los 38 animalitos en formato bingo 5x5.',
    gridRows: 5,
    gridCols: 5,
    hasFreeCenter: true,
    totalElements: 38,
    accentColor: 'from-emerald-600 to-teal-800',
    badge: '5x5 | 38 Figuras Criollas',
    description: 'Inspirado en la histórica ruleta de figuras zoológicas venezolanas (Delfín, Ballena, Carnero, Toro, Tigre, Caimán, etc.) con casilla central libre.',
    rules: [
      '38 figuras oficiales de la cultura venezolana',
      'Cuadrícula 5x5 con el icono emblemático criollo en el centro',
      'Premios por Línea de Animalitos y Cuadrante completo',
    ],
    sampleItems: ['🐬 Delfín', '🐋 Ballena', '⭐ LIBRE', '🐅 Tigre', '🐊 Caimán'],
  },
  {
    code: 'OBJETOS',
    name: 'Bingo de Objetos Criollos',
    tagline: 'Identidad, folklore y gastronomía venezolana en un cartón 5x5 interactivo.',
    gridRows: 5,
    gridCols: 5,
    hasFreeCenter: true,
    totalElements: 50,
    accentColor: 'from-rose-600 to-red-800',
    badge: '5x5 | 50 Elementos Criollos',
    description: 'Cartones temáticos ilustrados con la arepa, el cuatro, las maracas, el chinchorro, las alpargatas, la tinaja y platos autóctonos.',
    rules: [
      '50 elementos de la venezolanidad',
      'Casilla central libre representada por el Sol o el Araguaney',
      'Fácil lectura visual para jugadores de todas las edades',
    ],
    sampleItems: ['🫓 Arepa', '🎸 Cuatro', '🌟 LIBRE', '🪇 Maracas', '🪵 Pilón'],
  },
  {
    code: 'CHAPITAS',
    name: 'Bingo Chapitas Callejero',
    tagline: 'El clásico pasatiempo barrial venezolano en un tablero veloz de 3x5 casillas.',
    gridRows: 3,
    gridCols: 5,
    hasFreeCenter: false,
    totalElements: 60,
    accentColor: 'from-cyan-600 to-blue-800',
    badge: '3x5 | 60 Chapitas',
    description: 'Formato dinámico de alta velocidad basado en chapas de refresco y malta numeradas del 1 al 60. Sin casillas libres, 15 números por cartón.',
    rules: [
      '60 chapitas en sorteo continuo y rápido',
      'Cuadrícula compacta 3x5 de 15 números directos',
      'Premios veloces: Fila de Chapas y Llena Total',
    ],
    sampleItems: ['🔘 Chapa 12', '🔘 Chapa 27', '🔘 Chapa 39', '🔘 Chapa 48', '🔘 Chapa 59'],
  },
];

export const ModalitiesSection: React.FC = () => {
  const [selectedCode, setSelectedCode] = useState<ModalityCode>('BINGO_75');
  const activeModality = MODALITIES.find((m) => m.code === selectedCode) || MODALITIES[0];

  return (
    <section id="modalidades" className="py-20 bg-slate-950/70 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5" />
            Configuración de Juego
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            5 Modalidades Oficiales
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            Arquitectura multiformato diseñada desde el motor de base de datos para respetar las reglas tradicionales venezolanas e internacionales.
          </p>
        </div>

        {/* Pestañas de Selección de Modalidad */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {MODALITIES.map((mod) => {
            const isSelected = mod.code === selectedCode;
            return (
              <button
                key={mod.code}
                onClick={() => setSelectedCode(mod.code)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 scale-105'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{mod.name.split(' ')[0]} {mod.name.split(' ')[1]}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {mod.gridRows}x{mod.gridCols}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ficha Detallada de la Modalidad Seleccionada */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/40 rounded-3xl p-6 sm:p-10 border border-slate-800/90">
          {/* Información Técnica */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
                {activeModality.badge}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Total Elementos: {activeModality.totalElements}
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white">
              {activeModality.name}
            </h3>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              {activeModality.tagline}
            </p>
            <p className="mt-3 text-slate-400 text-xs sm:text-sm">
              {activeModality.description}
            </p>

            {/* Reglas de la Modalidad */}
            <div className="mt-6 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
                Reglas y Condiciones de Victoria:
              </h4>
              {activeModality.rules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap gap-4 text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Filas / Columnas:</span>{' '}
                <strong className="text-slate-200">{activeModality.gridRows} filas × {activeModality.gridCols} cols</strong>
              </div>
              <div>
                <span className="text-slate-500">Centro Libre (FREE):</span>{' '}
                <strong className={activeModality.hasFreeCenter ? 'text-emerald-400' : 'text-slate-400'}>
                  {activeModality.hasFreeCenter ? 'SÍ (Activado)' : 'NO (Lleno Completo)'}
                </strong>
              </div>
            </div>
          </div>

          {/* Visualizador de Matriz de Cartón Representativo */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-5 border border-slate-700/80 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                  Cartón Digital Certificado
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  SERIAL: BCV-78419
                </span>
              </div>

              {/* Grid Matrix Visualizer */}
              <div
                className={`grid gap-2 ${
                  activeModality.gridCols === 5 ? 'grid-cols-5' : 'grid-cols-5'
                }`}
              >
                {Array.from({ length: activeModality.gridRows * activeModality.gridCols }).map((_, i) => {
                  const row = Math.floor(i / activeModality.gridCols);
                  const col = i % activeModality.gridCols;
                  const isCenter = activeModality.hasFreeCenter && row === 2 && col === 2;

                  let displayContent = `${(i + 1) * 3}`;
                  if (activeModality.code === 'ANIMALITOS') {
                    const animalSample = ['🐬', '🐋', '🐏', '🐂', '🐅', '🐊', '🦁', '🦉', '🦜', '🐪', '🐎', '🦓'];
                    displayContent = isCenter ? '⭐ FREE' : animalSample[i % animalSample.length];
                  } else if (activeModality.code === 'OBJETOS') {
                    const objSample = ['🫓', '🎸', '🪇', '🪵', '🧺', '☀️', '🍲', '☕', '🥁', '🌴', '🛖', '👒'];
                    displayContent = isCenter ? '⭐ CRIOLLO' : objSample[i % objSample.length];
                  } else if (activeModality.code === 'CHAPITAS') {
                    displayContent = `🔘 ${i * 4 + 1}`;
                  } else if (isCenter) {
                    displayContent = 'FREE';
                  }

                  return (
                    <div
                      key={i}
                      className={`h-12 sm:h-14 rounded-lg flex flex-col items-center justify-center font-bold text-xs sm:text-sm border transition-all ${
                        isCenter
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                      }`}
                    >
                      <span className="text-center truncate px-0.5">{displayContent}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
                <span className="text-[11px] text-slate-400">
                  Matriz inmutable generada por el servidor (Server Authoritative)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
