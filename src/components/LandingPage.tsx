// ==============================================================================
// BINGO CLUB VNZLA ONLINE — LANDING PAGE OFICIAL
// ==============================================================================

import React, { useState } from 'react';
import { ModalityCard } from './ModalityCard';
import { getFallbackModalities } from '../lib/supabase';
import type { GameModality } from '../types/database';
import {
  ShieldCheck,
  Cpu,
  Lock,
  Radio,
  FileCheck,
  ChevronDown,
  HelpCircle,
  Mail,
  Smartphone,
  Sparkles,
  AlertTriangle,
  Scale,
  Award,
  ArrowRight,
  Database
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onExplorePlayer: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onExplorePlayer }) => {
  const modalities = getFallbackModalities();
  const [selectedModality, setSelectedModality] = useState<GameModality | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: '¿Qué es Bingo Club Venezuela Online en esta Fase 1?',
      a: 'Es la primera etapa de la plataforma digital oficial de bingo venezolano. En esta fase se implementa la arquitectura técnica autoritativa, la gestión de usuarios con Supabase Auth, las políticas de seguridad Row Level Security (RLS) en PostgreSQL y el catálogo normativo de modalidades. Las operaciones con dinero real permanecen desactivadas en modo de pruebas.',
    },
    {
      q: '¿Por qué no hay dinero real ni apuestas en esta versión?',
      a: 'Por rigurosa disciplina de ingeniería y seguridad. Primero se audita y valida la infraestructura del servidor, el control de roles (RBAC) y la sincronización criptográfica de balotas. Las pasarelas de pago (Pago Móvil y Binance Pay) se incorporarán de forma supervisada en las siguientes fases.',
    },
    {
      q: '¿Qué significa que el sistema sea "Server-Authoritative"?',
      a: 'Significa que el navegador web del jugador nunca decide números extraídos, ganadores ni saldos. Toda la lógica crítica se procesa y valida exclusivamente en la base de datos PostgreSQL y Edge Functions protegidas con privilegios de servidor.',
    },
    {
      q: '¿Cómo se protege mi identidad y privacidad como jugador?',
      a: 'A cada usuario registrado se le asigna un código público inmutable con formato BCV-XXXXXX. Tu correo electrónico y datos privados jamás se revelan en las salas de juego ni a otros participantes.',
    },
    {
      q: '¿Cuáles modalidades de bingo estarán disponibles?',
      a: 'El catálogo oficial comprende: Bingo 75 Clásico (5x5 con centro libre), Bingo 90 Bolas (3x9, 15 números), Bingo de los Animalitos (con 75 figuras oficiales de la suerte), Bingo Objetos Criollos (75 objetos) y Bingo Chapitas Tradicional (90 números conformados por 45 animales y 45 objetos).',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* AVISO OFICIAL: MODO DE PRUEBAS / FASE 1 */}
      <aside aria-label="Aviso de fase técnica" className="w-full bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-600/30 px-4 py-2.5 text-center text-xs text-amber-200">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <p>
            <strong className="font-bold text-amber-400">FASE 1 — MODO DE PRUEBAS Y FUNDACIÓN:</strong>{' '}
            Operaciones financieras desactivadas. Arquitectura autoritativa, seguridad RBAC y perfiles activos.
          </p>
        </div>
      </aside>

      {/* HERO PRINCIPAL */}
      <section className="relative overflow-hidden border-b border-slate-850 pt-16 pb-20 lg:pt-24 lg:pb-32">
        {/* Fondo sutil con imagen y gradiente de contraste */}
        <div className="absolute inset-0 z-0 opacity-25">
          <img
            src="/src/assets/images/hero_bingo_luxury_vnzla_1791177748948.jpg"
            alt="Bingo Club Venezuela Lounge"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Kicker editorial */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4">
              <span>Venezuela</span>
              <span aria-hidden="true">·</span>
              <span>Plataforma Digital Oficial</span>
              <span aria-hidden="true">·</span>
              <span>Server-Authoritative</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl font-display text-balance">
              BINGO CLUB VNZLA
            </h1>

            <p className="mt-4 text-xl sm:text-2xl font-medium text-slate-300">
              Bingo digital venezolano en tiempo real.
            </p>

            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
              La primera plataforma de bingo en línea concebida con ingeniería de seguridad bancaria, Row Level Security estricto en PostgreSQL y sorteos auditables sin manipulación de clientes.
            </p>

            {/* Acciones principales */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onOpenAuth('register')}
                className="rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-500 transition-all cursor-pointer whitespace-nowrap"
              >
                REGISTRARME
              </button>

              <button
                onClick={() => onOpenAuth('login')}
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer whitespace-nowrap"
              >
                INICIAR SESIÓN
              </button>

              <button
                onClick={onExplorePlayer}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors ml-2"
              >
                <span>Explorar panel de jugador</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Metadatos limpios sin etiquetas píldora */}
            <div className="mt-10 flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-6 border-t border-slate-800/80">
              <div>
                <span className="font-semibold text-slate-200">PostgreSQL 15+</span> con RLS
              </div>
              <span aria-hidden="true">·</span>
              <div>
                <span className="font-semibold text-slate-200">Supabase Auth</span> y RBAC
              </div>
              <span aria-hidden="true">·</span>
              <div>
                <span className="font-semibold text-slate-200">CERO Dinero Falso</span>
              </div>
              <span aria-hidden="true">·</span>
              <div>
                <span className="font-semibold text-slate-200">Auditoría Criptográfica</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 1: CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-20 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Arquitectura de Transparencia
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
              Cómo Funciona Bingo Club Venezuela
            </h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Diseñado desde cero para erradicar las vulnerabilidades tradicionales de los juegos web. La verdad reside en el servidor.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-5">
                <Radio className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white font-display">
                01. Sorteos Server-Authoritative
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Cada bolita extraída es generada de forma determinista y segura en el motor del servidor. El navegador únicamente recibe y renderiza la transmisión en tiempo real sin posibilidad de manipulación.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-5">
                <FileCheck className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white font-display">
                02. Cartones con Identificador Único
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Los cartones se emiten con número de serie único, cuadrícula inmutable y firma asociada al identificador público BCV del usuario. Solo el titular puede consultar sus números.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-5">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white font-display">
                03. Verificación Automática de Premios
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Al cantarse Bingo o Línea, el motor de la base de datos valida automáticamente la matriz de marcaje contra la secuencia oficial de bolos cantados antes de declarar al ganador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: MODALIDADES OFICIALES */}
      <section id="modalidades" className="py-20 bg-slate-950/60 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Catálogo Normativo
              </h2>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
                Modalidades de Juego Disponibles
              </h3>
              <p className="mt-3 text-sm text-slate-400 max-w-xl">
                Cinco modalidades tradicionales y venezolanas configuradas en el esquema de PostgreSQL con reglas estandarizadas.
              </p>
            </div>
            <div className="mt-4 md:mt-0 text-xs text-slate-400 font-mono">
              Fase 1 · Especificación de Reglas
            </div>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-lg font-bold text-white font-display">
                    {selectedModality.name}
                  </h4>
                  <button
                    onClick={() => setSelectedModality(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-300">
                  <p className="text-slate-400 leading-relaxed">
                    {selectedModality.description}
                  </p>
                  <div className="rounded-lg bg-slate-950 p-3 font-mono space-y-1.5 border border-slate-800 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Código Oficial:</span>
                      <span className="text-amber-400 font-bold">{selectedModality.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dimensiones de Matriz:</span>
                      <span className="text-slate-200">{selectedModality.grid_rows} filas × {selectedModality.grid_cols} columnas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total de Balotas:</span>
                      <span className="text-slate-200">{selectedModality.total_balls} números</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Casilla Central Libre:</span>
                      <span className="text-slate-200">{selectedModality.has_free_center ? 'Sí (FREE)' : 'No'}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-300/80 italic pt-2">
                    En Fase 1, la generación de matrices de cartón sigue las especificaciones registradas en la tabla game_modalities.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedModality(null)}
                  className="mt-6 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Cerrar Especificación
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 3: SEGURIDAD Y RLS */}
      <section id="seguridad" className="py-20 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Cero Confianza en el Navegador
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
              Seguridad Antifraude y Row Level Security
            </h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Implementamos un modelo de defensa en profundidad donde cada interacción es validada por roles y restricciones de base de datos.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <ShieldCheck className="h-6 w-6 text-amber-400 mb-3" />
              <h4 className="text-sm font-bold text-white">RLS en 100% de Tablas</h4>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Ningún jugador puede leer cartones, transacciones ni billeteras de otros usuarios.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <Lock className="h-6 w-6 text-sky-400 mb-3" />
              <h4 className="text-sm font-bold text-white">RBAC Server-Side</h4>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Roles PLAYER, OPERATOR, SUPERVISOR y ADMIN validados estrictamente en PostgreSQL mediante triggers.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <Database className="h-6 w-6 text-emerald-400 mb-3" />
              <h4 className="text-sm font-bold text-white">Auditoría Inmutable</h4>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Cada evento crítico genera una entrada inalterable en audit_logs con hashes no sensibles.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <Scale className="h-6 w-6 text-rose-400 mb-3" />
              <h4 className="text-sm font-bold text-white">Idempotencia Total</h4>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Claves únicas de idempotencia para prevenir duplicación accidental de operaciones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4: JUEGO RESPONSABLE */}
      <section className="py-16 bg-slate-950 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-600/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-8 sm:p-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                <Award className="h-4 w-4" />
                <span>Compromiso Ético y Legal</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white font-display">
                Juego Responsable y Transparente
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                En Bingo Club Venezuela Online promovemos el entretenimiento recreativo seguro y la prevención del fraude. La plataforma está concebida exclusivamente para mayores de 18 años, con herramientas de autoexclusión, límites de cartones por sorteo y monitoreo de actividad inusual.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">+18 Años Solamente</span>
                <span aria-hidden="true">·</span>
                <span>Límite de Cartones Programable</span>
                <span aria-hidden="true">·</span>
                <span>Trazabilidad de Sesiones</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 5: PREGUNTAS FRECUENTES */}
      <section id="faq" className="py-20 border-b border-slate-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Resolución de Dudas
            </h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-display">
              Preguntas Frecuentes
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden"
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
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 6: CONTACTO */}
      <section id="contacto" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 rounded-xl border border-slate-800 bg-slate-900/40 p-8">
            <div>
              <h3 className="text-xl font-bold text-white font-display">
                ¿Preguntas sobre la plataforma o auditoría?
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                El equipo técnico y de seguridad está a disposición de reguladores y operadores autorizados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="h-4 w-4 text-amber-400" />
                <span>contacto@bingoclub.com.ve</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>security@bingoclub.com.ve</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER OFICIAL */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-slate-300">BINGO CLUB VNZLA</span>
            <span aria-hidden="true">·</span>
            <span>Venezuela Online</span>
          </div>
          <div>
            Fase 1: Fundación y Seguridad Autorizada © 2026. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};
