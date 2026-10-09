import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  HelpCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  Flame,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Eye,
  FileCheck,
  Send,
} from 'lucide-react';
import type { GameModality } from '../../types/database.types';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const MODALITIES_CATALOG: GameModality[] = [
  {
    id: 'BINGO_75',
    name: 'Bingo Tradicional 75',
    description: 'El clásico formato americano de 75 balotas con matriz 5x5 y casilla central LIBRE. Múltiples figuras ganadoras: líneas, esquinas, diagonales y cartón lleno.',
    grid_rows: 5,
    grid_cols: 5,
    has_free_center: true,
    max_ball_number: 75,
    card_numbers_count: 24,
    pattern_rules: { patterns: ['Línea Horizontal', 'Línea Vertical', 'Diagonal', '4 Esquinas', 'Bingo Lleno'] },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'BINGO_90',
    name: 'Bingo 90 Bolas',
    description: 'Formato popular en Europa y América Latina con cartones de 3 filas y 5 números por fila (15 números en total). Dinámica veloz por línea, dos líneas y bingo completo.',
    grid_rows: 3,
    grid_cols: 5,
    has_free_center: false,
    max_ball_number: 90,
    card_numbers_count: 15,
    pattern_rules: { patterns: ['1 Línea', '2 Líneas', 'Bingo Completo'] },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ANIMALITOS',
    name: 'Bingo Animalitos Vnzla',
    description: 'Edición temática venezolana inspirada en la ruleta popular tradicional de los animalitos. Matriz 5x5 con centro libre y casillas ilustradas con figuras autóctonas.',
    grid_rows: 5,
    grid_cols: 5,
    has_free_center: true,
    max_ball_number: 38,
    card_numbers_count: 24,
    pattern_rules: { patterns: ['Línea', 'Cruz Llanera', '4 Esquinas', 'Tablita Llena'] },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'OBJETOS',
    name: 'Bingo de Objetos',
    description: 'Variante visual enriquecida con símbolos icónicos cotidianos y folclóricos venezolanos en cuadrícula 5x5 con casilla libre al medio.',
    grid_rows: 5,
    grid_cols: 5,
    has_free_center: true,
    max_ball_number: 50,
    card_numbers_count: 24,
    pattern_rules: { patterns: ['Línea', 'Marco', 'Bingo Pleno'] },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'CHAPITAS',
    name: 'Chapitas Rápido',
    description: 'Modalidad comunitaria express inspirada en el juego rápido de chapitas. Matriz de 3x5 de alta rotación para partidas ágiles y entretenidas.',
    grid_rows: 3,
    grid_cols: 5,
    has_free_center: false,
    max_ball_number: 60,
    card_numbers_count: 15,
    pattern_rules: { patterns: ['Línea Express', 'Chapita Plena'] },
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [selectedModality, setSelectedModality] = useState<GameModality>(MODALITIES_CATALOG[0]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  const faqs = [
    {
      q: '¿Qué es Bingo Club Vnzla Online?',
      a: 'Es la primera plataforma de bingo digital venezolano en tiempo real construida con arquitectura Server-Authoritative, seguridad PostgreSQL con Row Level Security y respeto estricto a las normas de transparencia.',
    },
    {
      q: '¿Se puede jugar con dinero real en esta Fase 1?',
      a: 'No. En esta Fase 1, la plataforma opera estrictamente en MODO DE PRUEBAS arquitectónicas. Las funciones financieras se encuentran bloqueadas con el aviso formal "Función financiera próximamente disponible". No hay saldos ficticios ni simulaciones engañosas.',
    },
    {
      q: '¿Cómo se protege mi identidad y privacidad?',
      a: 'Al registrarte, el sistema te asigna automáticamente un código público único (ej. BCV-784920). Tu correo electrónico y datos sensibles jamás se exponen en las salas ni a otros jugadores.',
    },
    {
      q: '¿Qué significa que el sistema sea "Server-Authoritative"?',
      a: 'Significa que el navegador de tu teléfono o computadora jamás decide números, ganadores ni saldos. Toda extracción de balotas y validación de cartones se ejecuta en el servidor seguro de forma inmutable, impidiendo cualquier intento de manipulación en el cliente.',
    },
    {
      q: '¿Cuáles modalidades de juego estarán disponibles?',
      a: 'Contamos con 5 modalidades diseñadas: Bingo Tradicional 75 (5x5 centro libre), Bingo 90 Bolas (3x5), Bingo Animalitos Vnzla (5x5 centro libre), Bingo de Objetos (5x5) y Chapitas Rápido (3x5).',
    },
    {
      q: '¿Qué métodos de pago soportará la plataforma en fases futuras?',
      a: 'En las fases siguientes se incorporará soporte nativo para Pago Móvil venezolano (conciliación por referencia bancaria) y Binance Pay (criptoactivos estables como USDT), garantizando idempotencia y cero doble gasto.',
    },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactForm.email && contactForm.message) {
      setContactSuccess(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactSuccess(false), 5000);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* 1. HERO PRINCIPAL */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Phase Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-8 shadow-inner shadow-amber-500/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>MODO DE PRUEBAS — FASE 1: FUNDACIÓN REAL</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            BINGO CLUB <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">VNZLA</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-xl sm:text-2xl text-slate-300 font-medium max-w-2xl mx-auto">
            Bingo digital venezolano en tiempo real.
          </p>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Plataforma profesional con arquitectura segura Server-Authoritative, Row Level Security en PostgreSQL y trazabilidad inmutable.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-extrabold bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>REGISTRARME</span>
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-4 h-4 text-amber-400" />
              <span>INICIAR SESIÓN</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-16 pt-8 border-t border-slate-900 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Server-Authoritative</span>
              </div>
              <p className="text-[11px] text-slate-400">El navegador no calcula números ni premios.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <Lock className="w-4 h-4" />
                <span>PostgreSQL RLS</span>
              </div>
              <p className="text-[11px] text-slate-400">Políticas estrictas de aislamiento por usuario.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <Eye className="w-4 h-4" />
                <span>Identidad BCV</span>
              </div>
              <p className="text-[11px] text-slate-400">Código público que protege tus datos personales.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cero Mocks</span>
              </div>
              <p className="text-[11px] text-slate-400">Sin dinero falso ni saldos simulados.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-20 bg-slate-900/50 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Transparencia y Proceso</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Cómo Funciona la Plataforma</p>
            <p className="mt-3 text-slate-400 text-sm">
              Cada fase del juego sigue reglas matemáticas verificables y auditoría en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="font-bold text-white text-base mb-2">Registro & Identidad</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Crea tu cuenta segura con correo y contraseña protegidos en Supabase Auth. Se te otorga un identificador público <span className="text-amber-400 font-mono">BCV-XXXXXX</span>.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="font-bold text-white text-base mb-2">Selección de Modalidad</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Escoge entre Bingo 75, 90, Animalitos Vnzla, Objetos o Chapitas. Cada modalidad cuenta con cartones estructurados por el servidor.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="font-bold text-white text-base mb-2">Sorteo en Tiempo Real</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                El motor del servidor extrae las balotas de manera secuencial y determinista, transmitidas por Supabase Realtime a todos los participantes sincronizados.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm mb-4">
                04
              </div>
              <h3 className="font-bold text-white text-base mb-2">Validación Server-Side</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                El servidor valida instantáneamente los patrones ganadores (línea, cruz, cartón lleno) sin confiar en reportes no verificados del navegador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MODALIDADES DE JUEGO */}
      <section id="modalidades" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Tradición y Variedad</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Modalidades de Bingo</p>
            <p className="mt-3 text-slate-400 text-sm">
              Estructuradas con especificaciones matemáticas reales para la cultura venezolana.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Modalities Selector List */}
            <div className="lg:col-span-5 space-y-3">
              {MODALITIES_CATALOG.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModality(mod)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                    selectedModality.id === mod.id
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{mod.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 font-mono text-amber-400">
                        {mod.grid_rows}x{mod.grid_cols}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-1">{mod.description}</p>
                  </div>
                  <div className="text-right pl-3">
                    <span className="text-[11px] text-slate-400">Max: {mod.max_ball_number}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Modality Detail Card & Interactive Grid Preview */}
            <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    Especificación Técnica
                  </span>
                  <h3 className="text-2xl font-black text-white">{selectedModality.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    Cuadrícula: {selectedModality.grid_rows} x {selectedModality.grid_cols}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    {selectedModality.has_free_center ? 'Centro Libre: SÍ' : 'Centro Libre: NO'}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {selectedModality.description}
              </p>

              {/* Grid Visual Representation */}
              <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                  <span>Proyección de Cartón Oficial ({selectedModality.card_numbers_count} casillas)</span>
                  <span className="font-mono text-amber-400">1 — {selectedModality.max_ball_number}</span>
                </div>

                <div
                  className="grid gap-2 max-w-sm mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${selectedModality.grid_cols}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: selectedModality.grid_rows * selectedModality.grid_cols }).map((_, idx) => {
                    const row = Math.floor(idx / selectedModality.grid_cols);
                    const col = idx % selectedModality.grid_cols;
                    const isCenter =
                      selectedModality.has_free_center &&
                      row === Math.floor(selectedModality.grid_rows / 2) &&
                      col === Math.floor(selectedModality.grid_cols / 2);

                    const maxVal = selectedModality.max_ball_number || 75;
                    const sampleNumber = ((col * 15) + (row * 3) + 1) % maxVal || 1;

                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm border transition-all ${
                          isCenter
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/40'
                        }`}
                      >
                        {isCenter ? '★ LIBRE' : sampleNumber}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Winning Patterns */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-400 mb-2">Patrones Ganadores Configurados:</p>
                <div className="flex flex-wrap gap-2">
                  {((selectedModality.pattern_rules as any)?.patterns || []).map((pat: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/80 text-[11px] font-medium text-amber-300"
                    >
                      {pat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SEGURIDAD ANTIFRAUDE */}
      <section id="seguridad" className="py-20 bg-slate-900/40 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Auditoría y Confianza</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Seguridad Antifraude Rigurosa</p>
            <p className="mt-3 text-slate-400 text-sm">
              Diseñado bajo la premisa irrevocable: <strong className="text-white">El navegador NO es una autoridad.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Row Level Security (RLS)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Todas las tablas de la base de datos cuentan con políticas RLS activadas. Un jugador jamás puede acceder a wallets de otros participantes ni alterar tablas maestras.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Auditoría Forense Inmutable</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                La tabla <span className="font-mono text-amber-300">audit_logs</span> registra cada acción crítica con hash criptográfico, rol del actor y metadatos. Los registros no pueden ser eliminados.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Control Anti-Replay & Idempotencia</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toda solicitud sensible requiere una <span className="font-mono text-amber-300">idempotency_key</span> única en PostgreSQL para evitar duplicación accidental o intencional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. JUEGO RESPONSABLE */}
      <section id="juego-responsable" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center font-extrabold text-lg">
                +18
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">Compromiso con el Juego Responsable</h2>
                <p className="text-xs text-slate-400">Protección del jugador y fomento del entretenimiento sano</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
              <div className="space-y-3">
                <p>
                  En <strong>Bingo Club Vnzla Online</strong> concebimos el bingo como una actividad recreativa, social y de entretenimiento tradicional venezolano.
                </p>
                <p>
                  No promovemos el endeudamiento ni consideramos el juego una vía de solución económica. Promovemos el autocontrol y límites personales estrictos.
                </p>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                  <h4 className="font-bold text-amber-400 text-xs mb-1">Aviso Oficial de Fase 1</h4>
                  <p className="text-[11px] text-slate-400">
                    Durante esta etapa fundacional no se aceptan apuestas vinculantes ni depósitos reales. Toda participación se realiza en entorno de validación técnica de arquitectura.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className="py-20 bg-slate-900/40 border-y border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Dudas Habituales</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Preguntas Frecuentes</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-sm font-bold text-white hover:text-amber-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CONTACTO */}
      <section id="contacto" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800">
            <div className="max-w-xl mx-auto text-center mb-8">
              <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Canal Institucional</h2>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">Contacto y Soporte</p>
              <p className="text-xs text-slate-400 mt-2">
                ¿Preguntas sobre la plataforma o auditoría técnica? Nuestro equipo responderá tus inquietudes.
              </p>
            </div>

            {contactSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 max-w-md mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">Mensaje Recibido</h4>
                <p className="text-xs text-emerald-300">
                  Gracias por comunicarte con Bingo Club Vnzla Online. Te responderemos a la brevedad.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="max-w-lg mx-auto space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre o Apodo</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mensaje o Consulta</label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Escribe tu consulta aquí..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Mensaje</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
