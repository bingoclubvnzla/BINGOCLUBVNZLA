// =====================================================================
// BINGO CLUB VNZLA ONLINE - EXPLORADOR DE MODALIDADES VENEZOLANAS
// Inspección técnica de cuadrículas, reglas y elementos oficiales
// =====================================================================

import React, { useState } from 'react';
import {
  OFFICIAL_MODALITIES,
  VENEZUELAN_ANIMALITOS_ROSTER,
  VENEZUELAN_OBJETOS_ROSTER,
} from '../lib/modalities';
import type { ModalityCode } from '../types/database';
import { Layers, ArrowLeft, CheckCircle, Info } from 'lucide-react';

interface ModalitiesExplorerProps {
  onBack: () => void;
}

export const ModalitiesExplorer: React.FC<ModalitiesExplorerProps> = ({ onBack }) => {
  const [selectedCode, setSelectedCode] = useState<ModalityCode>('BINGO_75');
  const modality = OFFICIAL_MODALITIES[selectedCode];

  // Renderizador de cuadrícula de demostración técnica (sin simulación falsa de sorteo)
  const renderSampleGrid = () => {
    if (selectedCode === 'BINGO_75') {
      const columns = ['B', 'I', 'N', 'G', 'O'];
      const sampleNumbers = [
        [7, 22, 38, 51, 68],
        [12, 19, 44, 59, 72],
        [3, 27, 'LIBRE', 48, 63],
        [15, 30, 31, 55, 70],
        [9, 16, 42, 53, 75],
      ];

      return (
        <div className="max-w-md mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl">
          <div className="grid grid-cols-5 gap-2 text-center font-bold text-amber-400 font-mono text-sm pb-2 border-b border-slate-800">
            {columns.map((c) => (
              <div key={c} className="py-1 bg-amber-950/60 rounded border border-amber-500/30">
                {c}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 pt-3">
            {sampleNumbers.map((row, rIdx) =>
              row.map((val, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`h-12 flex items-center justify-center rounded-xl font-mono text-xs font-bold border transition-colors ${
                    val === 'LIBRE'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 text-[10px]'
                      : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}
                >
                  {val}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (selectedCode === 'BINGO_90') {
      const sample90 = [
        [4, 18, 42, 67, 85],
        [11, 29, 53, 71, 89],
        [7, 33, 49, 62, 90],
      ];

      return (
        <div className="max-w-lg mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl">
          <div className="text-center text-xs font-bold text-amber-400 pb-2 border-b border-slate-800 font-mono">
            FORMATO ESPAÑOL 3x5 (15 NÚMEROS / 1-90)
          </div>
          <div className="grid grid-rows-3 gap-2.5 pt-3">
            {sample90.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-5 gap-2">
                {row.map((num, cIdx) => (
                  <div
                    key={cIdx}
                    className="h-12 flex items-center justify-center rounded-xl bg-slate-950 text-white font-mono text-sm font-bold border border-slate-800"
                  >
                    {num}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (selectedCode === 'ANIMALITOS') {
      const sampleAnimals = [
        ['🐬 Delfín (0)', '🦁 León (5)', '🐅 Tigre (10)', '🦜 Perico (7)', '🐸 Rana (6)'],
        ['🐂 Toro (2)', '🦅 Águila (9)', '🐴 Caballo (12)', '🐱 Gato (11)', '🐛 Ciempiés (3)'],
        ['🐏 Carnero (1)', '🦂 Alacrán (4)', '★ LIBRE ★', '🐒 Mono (13)', '🕊️ Paloma (14)'],
        ['🦊 Zorro (15)', '🐻 Oso (16)', '🦃 Pavo (17)', '🫏 Burro (18)', '🐐 Chivo (19)'],
        ['🐋 Ballena (00)', '🐷 Cochino (20)', '🐓 Gallo (21)', '🐪 Camello (22)', '🦓 Cebra (23)'],
      ];

      return (
        <div className="max-w-xl mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl">
          <div className="text-center text-xs font-bold text-amber-400 pb-2 border-b border-slate-800 font-mono">
            LOTERÍA DE ANIMALITOS CRIOLLOS (5x5 / 36 FIGURAS)
          </div>
          <div className="grid grid-cols-5 gap-2 pt-3">
            {sampleAnimals.map((row, rIdx) =>
              row.map((animal, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`p-1.5 h-14 flex items-center justify-center text-center rounded-xl text-[10px] font-bold border transition-colors ${
                    animal.includes('LIBRE')
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}
                >
                  {animal}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (selectedCode === 'OBJETOS') {
      const sampleObj = [
        ['Cuatro', 'Maracas', 'Arpa', 'Papagayo', 'Arepa'],
        ['Pabellón', 'Chinchorro', 'Sombrero', 'Alpargatas', 'Tinaja'],
        ['Pilón', 'Molinillo', '★ LIBRE ★', 'Budare', 'Trompo'],
        ['Metras', 'Perinola', 'Gurrufío', 'Ávila', 'Salto Ángel'],
        ['Orquídea', 'Turpial', 'Araguaney', 'Encava', 'Por Puesto'],
      ];

      return (
        <div className="max-w-xl mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl">
          <div className="text-center text-xs font-bold text-amber-400 pb-2 border-b border-slate-800 font-mono">
            OBJETOS TÍPICOS VENEZOLANOS (5x5 / 50 SÍMBOLOS)
          </div>
          <div className="grid grid-cols-5 gap-2 pt-3">
            {sampleObj.map((row, rIdx) =>
              row.map((obj, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`p-1.5 h-14 flex items-center justify-center text-center rounded-xl text-[11px] font-bold border transition-colors ${
                    obj.includes('LIBRE')
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}
                >
                  {obj}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // CHAPITAS
    const sampleChapitas = [
      ['Chapa #12', 'Chapa #05', 'Chapa #44', 'Chapa #23', 'Chapa #58'],
      ['Chapa #19', 'Chapa #31', 'Chapa #08', 'Chapa #50', 'Chapa #37'],
      ['Chapa #02', 'Chapa #27', 'Chapa #49', 'Chapa #15', 'Chapa #60'],
    ];

    return (
      <div className="max-w-lg mx-auto bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl">
        <div className="text-center text-xs font-bold text-amber-400 pb-2 border-b border-slate-800 font-mono">
          CHAPITAS CRIOLLAS (3x5 DINÁMICO / 60 ELEMENTOS)
        </div>
        <div className="grid grid-rows-3 gap-2.5 pt-3">
          {sampleChapitas.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-5 gap-2">
              {row.map((num, cIdx) => (
                <div
                  key={cIdx}
                  className="h-12 flex items-center justify-center rounded-xl bg-slate-950 text-amber-300 font-mono text-xs font-bold border border-slate-800"
                >
                  {num}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Inicio</span>
          </button>
          <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-md">
            MODALIDADES REGISTRADAS EN POSTGRESQL
          </span>
        </div>

        {/* Selector de Modalidades */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.values(OFFICIAL_MODALITIES).map((m) => (
            <button
              key={m.code}
              onClick={() => setSelectedCode(m.code)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedCode === m.code
                  ? 'border-amber-400 bg-amber-950/30 shadow-md shadow-amber-500/10'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <p className={`text-xs font-bold ${selectedCode === m.code ? 'text-amber-400' : 'text-white'}`}>
                {m.name}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{m.grid_rows}x{m.grid_cols}</p>
            </button>
          ))}
        </div>

        {/* Detalle Técnico de la Modalidad */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B1528] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="font-['Outfit'] text-2xl font-extrabold text-white">
                {modality.name}
              </h2>
              <p className="text-xs text-amber-400 font-mono mt-0.5">{modality.subtitle}</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <div>
                <span className="text-slate-500">Matriz:</span>{' '}
                <strong className="text-white">{modality.grid_rows} filas x {modality.grid_cols} cols</strong>
              </div>
              <div>
                <span className="text-slate-500">Universo:</span>{' '}
                <strong className="text-white">{modality.total_elements} elementos</strong>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            {modality.description}
          </p>

          {/* Cuadrícula técnica representativa */}
          <div className="pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">
              Estructura Oficial del Cartón Digital
            </h3>
            {renderSampleGrid()}
          </div>

          {/* Reglas de Ganancia */}
          <div className="pt-6 border-t border-slate-800 flex items-start gap-3 rounded-xl bg-slate-950/60 p-4 border border-slate-800 text-xs">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">Patrones Ganadores Oficiales</p>
              <p className="text-slate-400 text-[11px]">
                Validación Server-Authoritative mediante la función <code>verify-winner</code>: Línea Horizontal, Cuatro Esquinas y Bingo Cartón Lleno.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
