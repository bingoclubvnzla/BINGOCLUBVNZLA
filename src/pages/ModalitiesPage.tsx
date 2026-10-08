import React, { useState } from 'react';
import { Gamepad2, Grid, CheckCircle, ShieldCheck, ArrowLeft, Star } from 'lucide-react';

interface ModalitiesPageProps {
  onNavigate: (view: string) => void;
}

export const ModalitiesPage: React.FC<ModalitiesPageProps> = ({ onNavigate }) => {
  const [selectedModality, setSelectedModality] = useState<string>('BINGO_75');

  const modalities = [
    {
      code: 'BINGO_75',
      name: 'Bingo 75 Tradicional',
      rows: 5,
      cols: 5,
      freeCenter: true,
      min: 1,
      max: 75,
      columns: [
        { letter: 'B', range: '1 - 15' },
        { letter: 'I', range: '16 - 30' },
        { letter: 'N', range: '31 - 45' },
        { letter: 'G', range: '46 - 60' },
        { letter: 'O', range: '61 - 75' },
      ],
      description:
        'El formato clásico internacional con cuadrícula 5x5. La casilla central (fila 3, columna 3) es una casilla libre con símbolo de estrella. Premios por línea horizontal, vertical, diagonal, 4 esquinas y cartón lleno.',
      rules: [
        'Total de números disponibles: 75 balotas.',
        '24 casillas numeradas + 1 casilla libre central automática.',
        'Extracción balota por balota con secuencia server-authoritative.',
        'Idempotencia en validación de cartones premiados.',
      ],
    },
    {
      code: 'BINGO_90',
      name: 'Bingo 90 Bolas (Estilo Español / Latino)',
      rows: 3,
      cols: 5,
      freeCenter: false,
      min: 1,
      max: 90,
      columns: [],
      description:
        'Modalidad de 90 números organizada en tiras de cartones de 3 filas. Cada fila contiene exactamente 5 números y 4 espacios vacíos (3x5 casillas ocupadas por cartón). Dinámica de premios escalonada: primera línea y bingo completo.',
      rules: [
        'Total de balotas: 90.',
        '15 números por cartón distribuidos en 3 filas de 5 casillas.',
        'Premio menor al completar la primera línea horizontal.',
        'Premio mayor acumulado al completar el cartón entero.',
      ],
    },
    {
      code: 'ANIMALITOS',
      name: 'Bingo Animalitos Vnzla',
      rows: 5,
      cols: 5,
      freeCenter: true,
      min: 1,
      max: 38,
      columns: [],
      description:
        'Adaptación criolla inspirada en la arraigada tradición venezolana de la ruleta de 38 animalitos (Delfín, Ballena, Toro, León, Mono, etc.). Matriz de 5x5 con casilla libre central y fichas de iconos ilustrados.',
      rules: [
        '38 figuras tradicionales numeradas del 0 al 36 + 00.',
        '24 figuras por cartón con estrella criolla central libre.',
        'Sorteo transmitido en tiempo real mediante balotas temáticas.',
        'Validación instantánea en base de datos PostgreSQL.',
      ],
    },
    {
      code: 'OBJETOS',
      name: 'Bingo Objetos Criollos',
      rows: 5,
      cols: 5,
      freeCenter: true,
      min: 1,
      max: 50,
      columns: [],
      description:
        'Modalidad cultural con 50 objetos representativos de la idiosincrasia venezolana: El Cuatro, Las Maracas, La Arepa, El Turpial, La Guacamaya, El Ávila, El Chinchorro, etc. Matriz 5x5 con centro libre.',
      rules: [
        '50 elementos de identidad cultural venezolana.',
        '24 elementos por cartón con centro libre.',
        'Sorteo amigable ideal para familias y eventos comunitarios.',
      ],
    },
    {
      code: 'CHAPITAS',
      name: 'Bingo Chapitas Callejero',
      rows: 3,
      cols: 5,
      freeCenter: false,
      min: 1,
      max: 45,
      columns: [],
      description:
        'Modalidad ágil y rápida de 3 filas x 5 columnas inspirada en el popular juego de chapitas de barriada. Sorteos exprés con intervalos de extracción rápidos (6 segundos por balota).',
      rules: [
        '45 números totales.',
        'Formato compacto 3x5 sin casilla libre.',
        'Ritmo acelerado para partidas de alta frecuencia.',
      ],
    },
  ];

  const current = modalities.find((m) => m.code === selectedModality) || modalities[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <button
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a la página principal
          </button>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-black text-white">Modalidades Oficiales de Juego</h1>
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
              ESPECIFICACIÓN TÉCNICA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Parámetros y cuadrículas modeladas en la tabla PostgreSQL `game_modalities` para la Fase 1.
          </p>
        </div>

        {/* Modality Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {modalities.map((m) => (
            <button
              key={m.code}
              onClick={() => setSelectedModality(m.code)}
              className={`p-4 rounded-xl text-left border transition-all ${
                selectedModality === m.code
                  ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="font-mono text-[10px] uppercase font-bold tracking-wider">{m.code}</div>
              <div className="font-bold text-xs text-white mt-1 truncate">{m.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {m.rows}x{m.cols} {m.freeCenter ? '• Centro Libre' : ''}
              </div>
            </button>
          ))}
        </div>

        {/* Modality Detail Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <span className="font-mono text-xs text-amber-400 font-bold">{current.code}</span>
              <h2 className="text-2xl font-black text-white mt-1">{current.name}</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{current.description}</p>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">
                Reglas y Parámetros del Motor Server-Authoritative
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {current.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {current.columns.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">
                  Distribución de Columnas (B-I-N-G-O)
                </h3>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {current.columns.map((c) => (
                    <div key={c.letter} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="font-black text-base text-amber-400">{c.letter}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.range}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Card Grid Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
              <Grid className="w-4 h-4 text-amber-400" />
              <span>Estructura de Cuadrícula ({current.rows}x{current.cols})</span>
            </div>

            <div
              className="grid gap-2 w-full max-w-[280px]"
              style={{
                gridTemplateColumns: `repeat(${current.cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: current.rows * current.cols }).map((_, index) => {
                const row = Math.floor(index / current.cols);
                const col = index % current.cols;
                const isCenter = current.freeCenter && row === 2 && col === 2;

                return (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg flex items-center justify-center font-bold text-xs border ${
                      isCenter
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {isCenter ? (
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <span className="font-mono text-[11px]">{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 text-center mt-4">
              {current.freeCenter
                ? 'Casilla central libre garantizada en generación de cartón.'
                : 'Todas las casillas contienen valores generados por el servidor.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
