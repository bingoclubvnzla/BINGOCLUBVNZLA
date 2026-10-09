// =====================================================================
// BINGO CLUB VNZLA ONLINE - PÁGINA PRINCIPAL (LANDING PAGE)
// Estética: Azul Marino, Oro/Dorado, Rojo Carmín sutil y Blanco
// =====================================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  Layers,
  ChevronRight,
  Lock,
  Radio,
  FileCheck2,
  Clock,
  HelpCircle,
  Mail,
  Send,
  Sparkles,
  Users
} from 'lucide-react';
import { OFFICIAL_MODALITIES } from '../lib/modalities';

interface LandingViewProps {
  onOpenAuth: (initialTab?: 'login' | 'register') => void;
  onNavigateModalities: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenAuth,
  onNavigateModalities,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState<string | null>(null);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.email || !contactForm.message) return;
    setContactStatus('Mensaje recibido exitosamente. Nuestro equipo técnico responderá a la brevedad.');
    setContactForm({ name: '', email: '', message: '' });
    setTimeout(() => setContactStatus(null), 6000);
  };

  const faqs = [
    {
      q: '¿Qué significa que el sistema esté en "MODO DE PRUEBAS" en esta Fase 1?',
      a: 'En esta primera fase arquitectónica se implementan los cimientos técnicos reales: autenticación de usuarios, modelos de base de datos relacionales, políticas de seguridad RLS, especificación de modalidades venezolanas y auditoría. Por directriz de seguridad estricta, NO se aceptan depósitos ni pagos con dinero real hasta que las fases financieras sean certificadas.',
    },
    {
      q: '¿Por qué el navegador no puede decidir los números sorteados ni los ganadores?',
      a: 'Para prevenir cualquier forma de fraude o manipulación, la plataforma implementa una arquitectura Server-Authoritative. Los números se generan criptográficamente en el servidor y la validación de cartones frente al patrón ganador ocurre en backend (Edge Functions), nunca en el código JavaScript del navegador.',
    },
    {
      q: '¿Cómo protege la plataforma la identidad y privacidad de los jugadores?',
      a: 'A cada jugador se le asigna de forma automática un identificador público único no sensible (formato BCV-XXXXXX). El correo electrónico del usuario nunca se muestra públicamente en salas, cartones o tablas de ganadores.',
    },
    {
      q: '¿Cuáles son las modalidades de bingo venezolanas disponibles?',
      a: 'Soportamos 5 modalidades autóctonas: Bingo 75 Clásico (5x5 con centro libre), Bingo 90 Español (3x5), Bingo de Animalitos (36 figuras tradicionales como Delfín, León y Toro), Bingo de Objetos Criollos (Arepa, Cuatro, Maracas) y Bingo Chapitas (rápido de 60 números).',
    },
    {
      q: '¿Qué métodos de pago se incorporarán en las fases posteriores?',
      a: 'La arquitectura de base de datos ya está estructurada para recibir Pago Móvil venezolano (banca nacional con referencia y teléfono) y Binance Pay (criptoactivos con verificación de hash de transacción) con protección estricta de idempotencia.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Banner de Aviso Oficial: Modo de Pruebas */}
      <div className="w-full bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-950 border-b border-amber-600/30 px-4 py-2.5 text-center text-xs text-amber-200">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 font-medium">
          <span className="font-bold tracking-wider uppercase text-amber-400 bg-amber-950 border border-amber-500/40 px-2 py-0.5 rounded text-[11px]">
            MODO DE PRUEBAS
          </span>
          <span>
            Fase 1 de Fundación Técnica: funciones financieras de dinero real temporalmente inactivas por política de seguridad.
          </span>
        </div>
      </div>

      {/* Hero Principal */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-900 bg-gradient-to-b from-slate-950 via-[#0B1528] to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Columna de Texto */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                <span>Bingo Club Venezuela Online · Plataforma Oficial</span>
              </div>

              <h1 className="font-['Outfit'] text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight text-balance">
                BINGO CLUB <span className="text-amber-400">VNZLA</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed">
                Bingo digital venezolano en tiempo real. Fundación profesional, arquitectura server-authoritative y máxima seguridad antifraude.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onOpenAuth('register')}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] whitespace-nowrap"
                >
                  REGISTRARME
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 hover:border-slate-600 transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  INICIAR SESIÓN
                </button>
                <button
                  onClick={onNavigateModalities}
                  className="px-4 py-3 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Explorar modalidades</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Badges de Integridad */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
                <div>
                  <p className="font-bold text-white text-sm">Server-Authoritative</p>
                  <p className="text-[11px] text-slate-400">El cliente jamás decide sorteos</p>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">PostgreSQL RLS</p>
                  <p className="text-[11px] text-slate-400">Aislamiento total de datos</p>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Identidad BCV</p>
                  <p className="text-[11px] text-slate-400">Privacidad y resguardo público</p>
                </div>
              </div>
            </div>

            {/* Columna Visual del Hero (Imagen generada de alta fidelidad) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl shadow-amber-500/10 bg-slate-900">
                <img
                  src="/src/assets/images/bingo_hero_visual_1791504147198.jpg"
                  alt="Salón oficial de Bingo Club Venezuela Online"
                  referrerPolicy="no-referrer"
                  className="w-full h-[360px] sm:h-[420px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white tracking-wide">GRAN SALÓN CARACAS</span>
                    <span className="font-mono text-amber-400">SALAS EN VIVO</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Transmisión de sorteos en tiempo real con motor de balotas criptográfico.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Sección 1: Cómo Funciona */}
      <section id="como-funciona" className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-['Outfit'] text-3xl font-extrabold text-white tracking-tight">
              Cómo Funciona la Plataforma
            </h2>
            <p className="text-sm text-slate-400">
              Arquitectura transparente diseñada con los más altos estándares de auditoría y juego limpio.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-[#0F1B2F]/60 border border-slate-800 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-white">Registro Seguro</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Creación de cuenta mediante Supabase Auth con generación automática de identificador anónimo <strong className="text-slate-300">BCV-XXXXXX</strong>. Tus datos privados nunca se exponen.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0F1B2F]/60 border border-slate-800 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-white">Salas y Modalidades</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecciona entre 5 modalidades venezolanas adaptadas a todas las preferencias: Bingo 75, Bingo 90, Animalitos criollos, Objetos y Chapitas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0F1B2F]/60 border border-slate-800 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-white">Cartones Digitales</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cartones con número de serie único y matrices protegidas por Row Level Security. Solo tú puedes visualizar y marcar tus cartones en juego.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0F1B2F]/60 border border-slate-800 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                04
              </div>
              <h3 className="text-base font-bold text-white">Sorteo Autoritativo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Las balotas se extraen en servidor mediante generador de números aleatorios criptográfico. La acreditación de ganadores se calcula 100% en backend.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Sección 2: Modalidades */}
      <section className="py-20 bg-gradient-to-b from-[#0B1528] to-slate-950 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Tradición Lúdica Venezolana
              </span>
              <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-extrabold text-white mt-1">
                Modalidades de Juego Disponibles
              </h2>
            </div>
            <button
              onClick={onNavigateModalities}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
            >
              <span>Ver especificaciones técnicas completas</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Grilla de modalidades */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-amber-500/20 shadow-xl bg-slate-900">
                <img
                  src="/src/assets/images/bingo_modalities_showcase_1791504156881.jpg"
                  alt="Piezas tradicionales de bingo y animalitos venezolanos"
                  referrerPolicy="no-referrer"
                  className="w-full h-[320px] object-cover"
                />
                <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
                  Composición artesanal de balotas doradas, fichas de animalitos criollos y cartones de chapitas venezolanas.
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {Object.values(OFFICIAL_MODALITIES).map((mod) => (
                <div
                  key={mod.code}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-bold text-white">{mod.name}</h4>
                      <span className="text-[11px] text-amber-400 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/30">
                        {mod.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{mod.description}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3 text-xs">
                    <span className="text-slate-400 font-mono">
                      {mod.grid_rows}x{mod.grid_cols} {mod.has_free_center ? '· Centro Libre' : ''}
                    </span>
                    <button
                      onClick={onNavigateModalities}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      Inspeccionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sección 3: Seguridad y Antifraude */}
      <section id="seguridad" className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-['Outfit'] text-3xl font-extrabold text-white tracking-tight">
              Seguridad Antifraude & Principios de Arquitectura
            </h2>
            <p className="text-sm text-slate-400">
              Cada interacción está protegida por políticas criptográficas y de base de datos a nivel de fila.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#0B1528] border border-slate-800 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Navegador Cero Autoridad</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                El cliente JavaScript nunca toma decisiones de saldo, validación de cartones ganadores o balotas cantadas. Todo cómputo crítico reside en PostgreSQL y Supabase Edge Functions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B1528] border border-slate-800 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Row Level Security (RLS)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ningún jugador puede leer billeteras ajenas, ver cartones confidenciales de otros participantes ni modificar sorteos. Las políticas RLS están activas en el 100% de las tablas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B1528] border border-slate-800 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Audit Logs Inmutables</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada evento de autenticación, extracción de balotas o reclamo de premio genera un registro con marca de tiempo UTC y hash de identidad, sin almacenar contraseñas ni secretos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 4: Juego Responsable */}
      <section id="responsable" className="py-16 bg-[#091120] border-b border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-8 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Clock className="h-4 w-4" />
                  <span>Compromiso con la Transparencia y el Juego Responsable</span>
                </div>
                <h3 className="font-['Outfit'] text-2xl font-bold text-white">
                  Plataforma Exclusiva para Mayores de 18 Años
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  BINGO CLUB VNZLA ONLINE promueve el entretenimiento sano y ético. En fases futuras, los usuarios dispondrán de herramientas de autoexclusión, límites de recarga diarios y auditorías periódicas de sesiones. El juego debe ser siempre una actividad recreativa, no un medio financiero.
                </p>
              </div>
              <div className="md:col-span-4 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-8 text-center">
                <div className="h-16 w-16 rounded-full border-2 border-amber-500/40 flex items-center justify-center font-bold text-2xl text-amber-400">
                  +18
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Mayoría de Edad Obligatoria</p>
                <p className="text-[11px] text-slate-500">Venezuela & Estándares Internacionales</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 5: Preguntas Frecuentes (FAQ) */}
      <section className="py-20 bg-slate-950 border-b border-slate-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="font-['Outfit'] text-3xl font-extrabold text-white tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-sm text-slate-400">
              Respuestas directas sobre la arquitectura y alcance de la Fase 1.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  <HelpCircle className={`h-4 w-4 shrink-0 transition-transform ${activeFaq === idx ? 'text-amber-400 rotate-180' : 'text-slate-500'}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección 6: Contacto y Soporte */}
      <section className="py-20 bg-[#0B1528] border-b border-slate-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-10">
            <h2 className="font-['Outfit'] text-3xl font-extrabold text-white tracking-tight">
              Contacto y Mesa Técnica
            </h2>
            <p className="text-sm text-slate-400">
              ¿Dudas sobre la plataforma o auditoría técnica? Nuestro equipo está a tu disposición.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-4 bg-slate-950 p-8 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre o Apodo</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Tu nombre"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="tu@correo.com"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Mensaje o Consulta</label>
              <textarea
                required
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="Escribe tu mensaje..."
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {contactStatus && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
                {contactStatus}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span>ENVIAR MENSAJE A SOPORTE</span>
            </button>
          </form>
        </div>
      </section>

    </div>
  );
};
