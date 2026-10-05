// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PORTAL PRINCIPAL
// Experiencia oficial de juego, modalidades tradicionales y salas en vivo
// ==============================================================================

import React, { useState } from 'react';
import { ModalityCard } from './ModalityCard';
import { getFallbackModalities } from '../lib/supabase';
import type { GameModality } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
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
  HeartHandshake
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

  const handleCtaClick = () => {
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
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* HERO SECTION PRINCIPAL */}
      <section className="relative overflow-hidden border-b border-slate-850 pt-16 pb-20 lg:pt-24 lg:pb-28">
        {/* Fondo visual con ambientación cinematográfica */}
        <div className="absolute inset-0 z-0 opacity-25">
          <img
            src="/src/assets/images/hero_bingo_luxury_vnzla_1791177748948.jpg"
            alt="Bingo Club Venezuela Lounge"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Tagline / Distintivo venezolano */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300 mb-5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Plataforma Oficial · Venezuela</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl font-display text-balance">
              BINGO CLUB VNZLA
            </h1>

            <p className="mt-3 text-xl sm:text-2xl font-semibold text-amber-400 font-display">
              Bingo venezolano en vivo
            </p>

            <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Juega bingo en línea en <strong className="text-white font-semibold">BINGO CLUB VNZLA</strong>. Disfruta nuestras modalidades de bingo venezolano en tiempo real, participa en salas activas y administra tus cartones desde un solo lugar.
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
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>VER MODALIDADES</span>
                <ChevronDown className="h-4 w-4 text-amber-400" />
              </a>

              {!isAuthenticated && (
                <button
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors ml-2 cursor-pointer"
                >
                  <span>¿No tienes cuenta? Regístrate gratis</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Badges de confianza orientados al jugador */}
            <div className="mt-10 flex flex-wrap items-center gap-5 text-xs text-slate-300 pt-6 border-t border-slate-850">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400" />
                <span>Sorteos en Directo</span>
              </div>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-amber-400" />
                <span>Cartones Oficiales</span>
              </div>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-400" />
                <span>Validación Inmediata</span>
              </div>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-400" />
                <span>Cuentas Protegidas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 1: CÓMO JUGAR */}
      <section id="como-jugar" className="py-20 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Paso a Paso
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
              Cómo Jugar en Bingo Club Venezuela
            </h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Participar en nuestras salas es rápido, seguro y entretenido. Sigue estos tres pasos sencillos para comenzar.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7 relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-5 font-bold font-display text-lg">
                1
              </div>
              <h4 className="text-base font-bold text-white font-display">
                Elige tu Modalidad y Sala
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Selecciona la modalidad de tu preferencia: Bingo 75, Bingo 90, Animalitos, Objetos Criollos o Chapitas. Consulta el horario de la próxima partida e ingresa a la sala activa.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7 relative">
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

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7 relative">
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

      {/* SECCIÓN 2: MODALIDADES OFICIALES */}
      <section id="modalidades" className="py-20 bg-slate-950/70 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Nuestras Modalidades
              </h2>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
                Modalidades de Juego Disponibles
              </h3>
              <p className="mt-3 text-sm text-slate-400 max-w-xl">
                Cinco modalidades venezolanas diseñadas con reglas claras y balanceadas para garantizar diversión en cada sorteo.
              </p>
            </div>
            <button
              onClick={() => onEnterLiveRoom?.('BINGO_75')}
              className="mt-4 md:mt-0 flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
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
                    onClick={() => setSelectedModality(null)}
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
                      setSelectedModality(null);
                      onEnterLiveRoom?.(selectedModality.id);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-xs font-bold text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer text-center"
                  >
                    Entrar a Sala de esta Modalidad
                  </button>
                  <button
                    onClick={() => setSelectedModality(null)}
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

      {/* SECCIÓN 3: SEGURIDAD Y CONFIANZA */}
      <section id="seguridad" className="py-20 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Confianza y Protección
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
              Seguridad para Todos los Jugadores
            </h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Sorteos verificables, cuentas protegidas y operaciones controladas para tu tranquilidad.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Sorteos Verificables</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Cada extracción es oficial y sincronizada para todos los jugadores en la sala al mismo tiempo.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Cuentas Protegidas</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Tus credenciales y sesiones están protegidas con los más altos estándares de autenticación.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Identidad Privada</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Tu usuario cuenta con un identificador público seguro (BCV-XXXXXX) para mantener confidencial tu correo y datos.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
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
      <section className="py-16 bg-slate-950 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-600/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-8 sm:p-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
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
      <section id="ayuda" className="py-20 border-b border-slate-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Centro de Ayuda
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
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
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
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
      <footer className="border-t border-slate-850 bg-slate-950 py-12 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-850">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs">
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
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-amber-400 transition-colors cursor-pointer">
                Inicio
              </button>
              <a href="#modalidades" className="hover:text-amber-400 transition-colors">
                Modalidades
              </a>
              <a href="#como-jugar" className="hover:text-amber-400 transition-colors">
                Cómo jugar
              </a>
              <a href="#seguridad" className="hover:text-amber-400 transition-colors">
                Seguridad
              </a>
              <a href="#ayuda" className="hover:text-amber-400 transition-colors">
                Ayuda
              </a>
              <a href="#contacto" className="hover:text-amber-400 transition-colors">
                Contacto
              </a>
            </nav>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <div>
              © 2026 BINGO CLUB VNZLA. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-4">
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
