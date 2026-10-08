// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PORTAL PRINCIPAL
// Experiencia oficial de juego, modalidades tradicionales y salas en vivo
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { ModalityCard } from './ModalityCard';
import { getFallbackModalities, fetchActiveDraws } from '../lib/supabase';
import type { GameModality, Draw } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { playClickSound } from '../lib/soundFx';
import {
  Play,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Award,
  Radio,
  Grid3X3,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  ArrowRight,
  ExternalLink,
  Lock,
  HeartHandshake,
  Dices,
  Flame,
  Volume2
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onExplorePlayer: () => void;
  onEnterLiveRoom?: (modalityId?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onExplorePlayer,
  onEnterLiveRoom,
}) => {
  const { isAuthenticated } = useAuth();
  const modalities = getFallbackModalities();
  const [selectedModality, setSelectedModality] = useState<GameModality | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeDraws, setActiveDraws] = useState<Draw[]>([]);
  const [loadingDraws, setLoadingDraws] = useState(true);

  // Consulta REAL de sorteos activos (REGLA DE ORO SOBRE DATOS: Nunca inventar)
  useEffect(() => {
    let isMounted = true;
    async function loadRealDraws() {
      try {
        const res = await fetchActiveDraws();
        if (isMounted && res.data) {
          setActiveDraws(res.data);
        }
      } catch {
        // En caso de desconexión, mantener lista vacía
      } finally {
        if (isMounted) setLoadingDraws(false);
      }
    }
    loadRealDraws();
    return () => { isMounted = false; };
  }, []);

  const handleCtaClick = () => {
    playClickSound();
    if (isAuthenticated) {
      onExplorePlayer();
    } else {
      onOpenAuth('login');
    }
  };

  const faqs = [
    {
      q: '¿Cómo participo en una partida de Bingo Club Venezuela?',
      a: 'Regístrate o inicia sesión con tu cuenta oficial. Desde tu panel de jugador podrás seleccionar la sala activa de tu modalidad favorita, adquirir tus cartones y seguir la extracción de balotas cantadas en vivo en tiempo real.',
    },
    {
      q: '¿Cuáles modalidades de bingo están disponibles?',
      a: 'Disponemos de las cinco modalidades oficiales venezolanas: Bingo 75 Clásico (5x5 con centro libre), Bingo 90 Bolas (3x9 con 15 números), Bingo de los Animalitos (75 figuras criollas tradicionales), Bingo Objetos Criollos (75 símbolos de venezolanidad) y Bingo Chapitas (90 números combinando 45 animalitos y 45 objetos).',
    },
    {
      q: '¿Cómo se verifica si un cartón es ganador?',
      a: 'Al completarse una línea o cartón lleno, el sistema del servidor comprueba automáticamente los números marcados en la matriz contra la secuencia oficial de balotas emitidas en el sorteo, garantizando total transparencia y validación inmediata.',
    },
    {
      q: '¿En qué dispositivos puedo jugar?',
      a: 'Bingo Club Venezuela está optimizado para funcionar directamente en navegadores de teléfonos móviles, tablets y computadoras, sin necesidad de descargar aplicaciones adicionales.',
    },
    {
      q: '¿Cómo se protege mi privacidad y mi cuenta?',
      a: 'A cada jugador se le asigna un identificador público exclusivo (BCV-XXXXXX). Tus datos personales y correo electrónico nunca se comparten con otros jugadores en las salas ni durante los sorteos.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#050b14] text-slate-100">
      {/* Sutil acento superior tricolor venezolano */}
      <div className="h-[3px] criollo-accent-bar w-full" />

      {/* HERO SECTION PRINCIPAL — LOBBY CASINO CRIOLLO */}
      <section className="relative overflow-hidden border-b border-slate-850/80 pt-16 pb-20 lg:pt-24 lg:pb-28">
        {/* Fondo visual con ambientación cinematográfica */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img
            src="/src/assets/images/hero_bingo_luxury_vnzla_1791177748948.jpg"
            alt="Bingo Club Venezuela Lounge"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-[#050b14]/90 to-transparent" />
        </div>

        {/* Resplandor ambiental cálido de casino */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 max-w-2xl">
              {/* Tagline / Distintivo venezolano */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300 mb-5 backdrop-blur-sm shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Lobby Oficial · Tradición y Tecnología Criolla</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-display text-balance leading-none">
                BINGO CLUB <span className="gold-text-gradient">VNZLA</span>
              </h1>

              <p className="mt-3.5 text-xl sm:text-2xl font-bold text-amber-400 font-display tracking-tight">
                Bingo venezolano en vivo
              </p>

              <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                Bienvenido al lobby de <strong className="text-white font-semibold">BINGO CLUB VNZLA</strong>. La plataforma digital oficial de sorteos en tiempo real con cinco modalidades tradicionales, locutor de tómbola y validación criptográfica instantánea.
              </p>

              {/* CTAs Principales */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleCtaClick}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/20 hover:from-amber-300 hover:to-amber-500 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>ENTRAR AL JUEGO</span>
                </button>

                <a
                  href="#modalidades"
                  onClick={() => playClickSound()}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>VER MODALIDADES</span>
                  <ChevronDown className="h-4 w-4 text-amber-400" />
                </a>

                {!isAuthenticated && (
                  <button
                    onClick={() => { playClickSound(); onOpenAuth('register'); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors ml-2 cursor-pointer"
                  >
                    <span>¿No tienes cuenta? Regístrate gratis</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Badges de confianza orientados al jugador */}
              <div className="mt-10 flex flex-wrap items-center gap-5 text-xs text-slate-300 pt-6 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400" />
                  <span>Sorteos en Directo</span>
                </div>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-amber-400" />
                  <span>5 Modalidades Oficiales</span>
                </div>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-400" />
                  <span>Validación Server-Side</span>
                </div>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-rose-400" />
                  <span>Identidad Privada BCV</span>
                </div>
              </div>
            </div>

            {/* Vitrina Visual Casino Criollo (Columna derecha) */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative rounded-3xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 shadow-2xl backdrop-blur-md">
                {/* Cabecera de la vitrina */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Tómbola Oficial</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400">En Directo</span>
                </div>

                {/* Demostración de balotas 3D criollas */}
                <div className="flex items-center justify-center gap-4 py-6">
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full ball-sphere-gold flex items-center justify-center font-display font-extrabold text-2xl text-slate-950">
                      75
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-2 font-semibold">Bingo 75</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="h-20 w-20 rounded-full ball-sphere-gold flex items-center justify-center font-display font-black text-3xl text-slate-950 ring-4 ring-amber-400/30">
                      B4
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 mt-2 font-bold">Cantada</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full ball-sphere-criollo flex items-center justify-center font-display font-extrabold text-2xl text-slate-950">
                      90
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-2 font-semibold">Bingo 90</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-center mt-2">
                  <p className="text-xs text-slate-300 font-medium">
                    Locución oficial en tiempo real con reglas venezolanas
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Animalitos, Objetos Criollos, Chapitas y Bingo Clásico
                  </p>
                </div>

                <button
                  onClick={() => { playClickSound(); onEnterLiveRoom?.('BINGO_75'); }}
                  className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Radio className="h-4 w-4" />
                  <span>SINTONIZAR SALA EN VIVO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN SORTEOS Y MESAS EN VIVO (DATOS REALES DE SUPABASE) */}
      <section className="py-14 border-b border-slate-850/60 bg-slate-950/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
                  Salas y Sorteos Oficiales
                </h2>
              </div>
              <p className="text-lg font-bold text-white font-display mt-0.5">
                Estado Actual de Sorteos en la Plataforma
              </p>
            </div>

            <button
              onClick={() => { playClickSound(); onEnterLiveRoom?.('BINGO_75'); }}
              className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <span>Acceder a la Sala Principal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Estado de sorteos reales: REGLA DE ORO SOBRE DATOS (Nunca inventar) */}
          {loadingDraws ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
              Consultando estado oficial de sorteos...
            </div>
          ) : activeDraws.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDraws.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5 flex items-center justify-between hover:border-amber-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-white font-display">
                        {d.title || `Sorteo #${d.draw_number}`}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 block mt-1">
                      {`BCV-${d.id.substring(0, 6)}`} · Estado: {d.status}
                    </span>
                  </div>
                  <button
                    onClick={() => { playClickSound(); onEnterLiveRoom?.(d.id); }}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Estado vacío elegante y honesto */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
              <div className="h-10 w-10 mx-auto mb-3 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-display">
                No hay sorteos activos en este momento
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                Los sorteos oficiales se transmiten de forma programada. Puedes explorar las 5 modalidades o ingresar a la sala para conocer el sistema de extracción.
              </p>
              <button
                onClick={() => { playClickSound(); onEnterLiveRoom?.('BINGO_75'); }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 transition-colors cursor-pointer"
              >
                Conocer la Sala en Vivo
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 1: MODALIDADES OFICIALES VENEZOLANAS */}
      <section id="modalidades" className="py-20 border-b border-slate-850/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
                Catálogo Oficial
              </h2>
              <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                Modalidades de Bingo Tradicional
              </h3>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                Cinco modalidades venezolanas diseñadas con reglas claras y balanceadas para garantizar transparencia y emoción.
              </p>
            </div>
            <button
              onClick={() => { playClickSound(); onEnterLiveRoom?.('BINGO_75'); }}
              className="mt-4 md:mt-0 flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <span>Ver sala en vivo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modalities.map((modality) => (
              <ModalityCard
                key={modality.id}
                modality={modality}
                onSelect={(m) => setSelectedModality(m)}
                onPlay={(id) => onEnterLiveRoom?.(id)}
              />
            ))}
          </div>

          {/* Modal de Detalle de Modalidad */}
          {selectedModality && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      {selectedModality.id}
                    </span>
                    <h4 className="text-lg font-bold text-white font-display">
                      {selectedModality.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => { playClickSound(); setSelectedModality(null); }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-5 space-y-4 text-xs text-slate-300">
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {selectedModality.description}
                  </p>
                  <div className="rounded-xl bg-slate-950 p-4 font-mono space-y-2 border border-slate-800/80 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Formato del Cartón:</span>
                      <span className="text-slate-200">{selectedModality.grid_rows} filas × {selectedModality.grid_cols} columnas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total de Balotas:</span>
                      <span className="text-amber-400 font-bold">{selectedModality.total_balls} balotas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Casilla Central:</span>
                      <span className="text-slate-200">{selectedModality.has_free_center ? 'Libre (FREE)' : 'Con número'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => {
                      playClickSound();
                      const id = selectedModality.id;
                      setSelectedModality(null);
                      onEnterLiveRoom?.(id);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-xs font-bold text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer text-center"
                  >
                    Entrar a Sala de esta Modalidad
                  </button>
                  <button
                    onClick={() => { playClickSound(); setSelectedModality(null); }}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 2: CÓMO JUGAR */}
      <section id="como-jugar" className="py-20 border-b border-slate-850/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
              Paso a Paso
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              Cómo Participar en Bingo Club
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Participar en nuestras salas es rápido, seguro y entretenido. Sigue estos tres pasos para comenzar.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7 relative hover:border-amber-500/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-5 font-bold font-display text-lg">
                1
              </div>
              <h4 className="text-base font-bold text-white font-display">
                Elige tu Modalidad
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Selecciona tu juego favorito: Bingo 75, Bingo 90, Animalitos, Objetos Criollos o Chapitas. Consulta el horario de la próxima partida e ingresa a la sala activa.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7 relative hover:border-sky-500/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-5 font-bold font-display text-lg">
                2
              </div>
              <h4 className="text-base font-bold text-white font-display">
                Obtén tus Cartones
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Cada cartón cuenta con numeración oficial y serie exclusiva vinculada a tu cuenta. Podrás consultar todos tus cartones directamente en tu panel antes de que inicie la partida.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7 relative hover:border-emerald-500/30 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-5 font-bold font-display text-lg">
                3
              </div>
              <h4 className="text-base font-bold text-white font-display">
                Canta Bingo en Vivo
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Sigue la extracción en tiempo real con locución del cantador y marcador automático. Si completas línea o bingo, el sistema verifica y anuncia al ganador al instante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: SEGURIDAD Y CONFIANZA */}
      <section id="seguridad" className="py-20 border-b border-slate-850/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
              Seguridad y Transparencia
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              Protección para Todos los Jugadores
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Sorteos verificables, cuentas protegidas y operaciones controladas por el servidor para tu tranquilidad.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-6 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Sorteos Verificables</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Cada extracción es oficial y sincronizada para todos los jugadores en la sala al mismo tiempo.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-855 bg-slate-900/40 p-6 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Cuentas Protegidas</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Tus credenciales y sesiones están protegidas con los más altos estándares de autenticación.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-855 bg-slate-900/40 p-6 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Identidad Privada</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Tu usuario cuenta con un identificador público seguro (BCV-XXXXXX) para mantener confidencial tu correo y datos.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-855 bg-slate-900/40 p-6 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Juego Responsable</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Plataforma concebida para entretenimiento de mayores de 18 años con prácticas de juego ético y transparente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4: COMPROMISO Y JUEGO RESPONSABLE */}
      <section className="py-16 border-b border-slate-850/80 bg-[#050b14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-600/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-8 sm:p-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 font-display">
                <Award className="h-4 w-4" />
                <span>Compromiso de Comunidad</span>
              </div>
              <h3 className="text-2xl font-bold text-white font-display">
                Juego Responsable y Recreativo
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                En Bingo Club Venezuela promovemos el entretenimiento recreativo entre amigos y familiares. El juego es exclusivo para mayores de 18 años. Juega con moderación y disfruta la tradición del bingo venezolano.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-slate-400">
                <span className="font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">+18 Años Solamente</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>Entretenimiento Familiar</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>Ambiente Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 5: PREGUNTAS FRECUENTES (AYUDA) */}
      <section id="ayuda" className="py-20 border-b border-slate-850/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-display">
              Centro de Ayuda
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              Preguntas Frecuentes
            </h3>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
              >
                <button
                  onClick={() => {
                    playClickSound();
                    setActiveFaq(activeFaq === idx ? null : idx);
                  }}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-white hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      activeFaq === idx ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER OFICIAL REAL */}
      <footer className="border-t border-slate-850/80 bg-[#050b14] py-12 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-850/80">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20">
                BCV
              </span>
              <div>
                <span className="font-display font-extrabold tracking-wider text-white text-base">
                  BINGO CLUB VNZLA
                </span>
                <span className="block text-[11px] text-amber-400/90 font-medium">
                  Bingo venezolano en vivo
                </span>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <button
                onClick={() => { playClickSound(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                Inicio
              </button>
              <a href="#modalidades" onClick={() => playClickSound()} className="hover:text-amber-400 transition-colors">
                Modalidades
              </a>
              <a href="#como-jugar" onClick={() => playClickSound()} className="hover:text-amber-400 transition-colors">
                Cómo jugar
              </a>
              <a href="#seguridad" onClick={() => playClickSound()} className="hover:text-amber-400 transition-colors">
                Seguridad
              </a>
              <a href="#ayuda" onClick={() => playClickSound()} className="hover:text-amber-400 transition-colors">
                Ayuda
              </a>
            </nav>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
            <div>
              © 2026 BINGO CLUB VNZLA. Todos los derechos reservados. Plataforma oficial de bingo digital.
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Términos y Condiciones</span>
              <span aria-hidden="true">·</span>
              <span>Política de Privacidad</span>
              <span aria-hidden="true">·</span>
              <span>Juego Responsable +18</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

