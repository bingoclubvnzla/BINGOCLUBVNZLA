import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Zap,
  Lock,
  Gamepad2,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  Server,
  KeyRound,
  FileCheck,
  HelpCircle,
  Mail,
  AlertCircle,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const modalitiesList = [
    {
      code: 'BINGO_75',
      name: 'Bingo 75 Tradicional',
      format: 'Matriz 5x5 • Centro Libre',
      range: '1 al 75 (B-I-N-G-O)',
      desc: 'El clásico formato de salón con balotera sincronizada en vivo y premios por líneas, diagonales, cuatro esquinas y cartón lleno.',
      color: 'border-blue-500/30 bg-blue-950/20 text-blue-400',
    },
    {
      code: 'BINGO_90',
      name: 'Bingo 90 Bolas',
      format: '3 Filas x 9 Columnas (3x5 ocupadas)',
      range: '1 al 90',
      desc: 'Popular modalidad europea y latinoamericana con dinámicas de dos premios: línea y bingo.',
      color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
    },
    {
      code: 'ANIMALITOS',
      name: 'Bingo Animalitos Vnzla',
      format: 'Matriz 5x5 • Centro Libre',
      range: '38 Tradicionales (Delfín, León, Ballena...)',
      desc: 'Inspirado en la cultura popular venezolana con iconografía de los 38 animalitos favoritos.',
      color: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    },
    {
      code: 'OBJETOS',
      name: 'Bingo Objetos Criollos',
      format: 'Matriz 5x5 • Centro Libre',
      range: '50 Iconos Culturales',
      desc: 'Temática nacional con objetos icónicos: el cuatro, las maracas, la arepa, el sombrero de cogollo y el chinchorro.',
      color: 'border-red-500/30 bg-red-950/20 text-red-400',
    },
    {
      code: 'CHAPITAS',
      name: 'Bingo Chapitas Callejero',
      format: 'Matriz 3x5 Rápida',
      range: '1 al 45',
      desc: 'Ritmo ágil y dinámico para partidas exprés de alta frecuencia inspiradas en las chapitas de barriada.',
      color: 'border-purple-500/30 bg-purple-950/20 text-purple-400',
    },
  ];

  const faqs = [
    {
      q: '¿Qué es BINGO CLUB VNZLA y en qué consiste la Fase 1?',
      a: 'BINGO CLUB VNZLA es la plataforma moderna de bingo digital en tiempo real para Venezuela. La Fase 1 implementa la arquitectura fundacional de alta seguridad: registro de usuarios, perfiles protegidos (BCV-ID), control de acceso por roles (RBAC) y modelos de datos en PostgreSQL con Row Level Security. En esta fase NO se maneja dinero real.',
    },
    {
      q: '¿Por qué no puedo recargar saldo ni apostar dinero real en esta fase?',
      a: 'Por diseño riguroso de ingeniería y seguridad. La plataforma se construye por fases incrementales. La Fase 1 garantiza la estabilidad de la red, la inmutabilidad de los sorteos y la protección de datos antes de abrir los módulos de pago (Pago Móvil y Binance Pay en Fase 2).',
    },
    {
      q: '¿Cómo garantiza la plataforma que los sorteos no estén manipulados?',
      a: 'La arquitectura es Server-Authoritative. El navegador del jugador no genera balotas ni decide victorias; solo las visualiza. Los números se generan en el servidor con marcas temporales criptográficas y cada cartón posee un checksum verificable en PostgreSQL.',
    },
    {
      q: '¿Qué es mi Identificador Público (BCV-XXXXXX)?',
      a: 'Para preservar tu privacidad, tu correo electrónico y teléfono nunca se exponen a otros jugadores ni en salas públicas. Tu identidad en la plataforma se representa mediante un identificador único seguro como BCV-9A8B7C.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 border-b border-slate-900">
        {/* Subtle decorative background gradient (Azul marino + acentos dorados discretos) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(229,169,60,0.15),rgba(10,25,47,0))]" />
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Phase 1 Pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>FASE 1: MODO DE PRUEBAS & FUNDACIÓN SEGURA</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6">
            BINGO CLUB <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">VNZLA</span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 font-light max-w-3xl mx-auto mb-4">
            Bingo digital venezolano en tiempo real.
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Plataforma con arquitectura de alta disponibilidad, seguridad criptográfica en base de datos PostgreSQL,
            perfiles con identificación protegida e integración con Supabase.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {user ? (
              <button
                onClick={() => onNavigate('player-dashboard')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 hover:scale-105 transition-all flex items-center justify-center space-x-2"
              >
                <span>IR A MI PANEL DE JUGADOR</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('register')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 hover:scale-105 transition-all flex items-center justify-center space-x-2"
                >
                  <span>REGISTRARME</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-base transition-colors"
                >
                  INICIAR SESIÓN
                </button>
              </>
            )}
          </div>

          {/* Financial Phase Disclosure */}
          <div className="mt-8 flex items-center justify-center space-x-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-amber-500/80" />
            <span>Las operaciones financieras con dinero real estarán disponibles en la siguiente fase de lanzamiento.</span>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-20 bg-slate-900/30 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">Fundamentos de la Plataforma</h2>
            <h3 className="text-3xl font-extrabold text-white">¿Cómo Funciona Bingo Club Vnzla?</h3>
            <p className="text-sm text-slate-400 mt-2">
              Diseñado desde cero bajo principios de ingeniería transparente y robustez matemática.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative group hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-600/40 text-blue-400 flex items-center justify-center font-black text-lg mb-4">
                1
              </div>
              <h4 className="font-bold text-lg text-white mb-2">Registro & Perfil BCV</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Crea tu cuenta con autenticación segura. Se genera un identificador público único (<code className="text-amber-400">BCV-XXXXXX</code>) para proteger tus datos personales.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative group hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-600/40 text-amber-400 flex items-center justify-center font-black text-lg mb-4">
                2
              </div>
              <h4 className="font-bold text-lg text-white mb-2">Salas & Cartones</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecciona la modalidad de juego. Cada cartón cuenta con un número de serie único y checksum criptográfico almacenado en PostgreSQL.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative group hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-600/40 text-emerald-400 flex items-center justify-center font-black text-lg mb-4">
                3
              </div>
              <h4 className="font-bold text-lg text-white mb-2">Sorteo en Tiempo Real</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Las balotas se extraen de forma <em>server-authoritative</em> en el servidor. Canales Realtime transmiten la secuencia sincronizada a todos los jugadores.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative group hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-600/40 text-purple-400 flex items-center justify-center font-black text-lg mb-4">
                4
              </div>
              <h4 className="font-bold text-lg text-white mb-2">Validación Inviolable</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Al formarse una línea o bingo completo, el motor del servidor audita el patrón matemáticamente antes de proclamar al ganador.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MODALIDADES */}
      <section id="modalities" className="py-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">Catálogo Oficial</h2>
              <h3 className="text-3xl font-extrabold text-white">Modalidades de Bingo Soportadas</h3>
              <p className="text-sm text-slate-400 mt-1">
                Estructura de tableros configurada en el esquema PostgreSQL de la Fase 1.
              </p>
            </div>
            <button
              onClick={() => onNavigate('modalities')}
              className="mt-4 md:mt-0 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
            >
              <span>Ver especificaciones técnicas completas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modalitiesList.map((m) => (
              <div
                key={m.code}
                className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">{m.code}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${m.color}`}>
                      {m.format}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">{m.name}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{m.desc}</p>
                </div>
                <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Rango: {m.range}</span>
                  <span className="text-emerald-400 font-medium">Esquema Activo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEGURIDAD & ARQUITECTURA */}
      <section className="py-20 bg-slate-900/40 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-xs font-semibold mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>PRINCIPIO FUNDAMENTAL DE SEGURIDAD</span>
              </div>
              <h3 className="text-3xl font-extrabold text-white mb-4">
                El Navegador Jamás es una Autoridad
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                En <strong>BINGO CLUB VNZLA</strong> el cliente web no tiene permiso para decidir premios, números de balotas,
                saldos ni ganadores. Toda acción sensible es procesada exclusivamente por PostgreSQL y Supabase mediante:
              </p>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Row Level Security (RLS) en el 100% de tablas</h5>
                    <p className="text-slate-400 mt-0.5">
                      Los jugadores solo pueden leer sus propios cartones y perfil público. Ningún usuario puede alterar su propio rol o estado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400 mt-0.5">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Arquitectura RBAC Multi-Nivel</h5>
                    <p className="text-slate-400 mt-0.5">
                      Separación estricta entre PLAYER, OPERATOR, SUPERVISOR, ADMIN y SUPER_ADMIN verificada en servidor.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400 mt-0.5">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Bitácora Inmutable de Auditoría</h5>
                    <p className="text-slate-400 mt-0.5">
                      Registro de cada inicio de sesión, cambio de estado de sorteo y acción administrativa con marcas de tiempo UTC protegidas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code / Architecture visual badge */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl font-mono text-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-slate-300 ml-2 font-bold">PostgreSQL Security Trigger</span>
                </div>
                <span className="text-[11px] text-amber-400 font-sans font-bold">FASE 1</span>
              </div>
              <pre className="text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
{`-- Prevención estricta de escalada de privilegios
CREATE OR REPLACE FUNCTION public.protect_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role) THEN
    IF current_user_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
      RAISE EXCEPTION 'Acceso denegado: rol inmutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
              </pre>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Estado: Compilado & Verificado</span>
                <span className="text-emerald-400 font-sans font-semibold">100% Protegido</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className="py-20 border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">Transparencia Total</h2>
            <h3 className="text-3xl font-extrabold text-white">Preguntas Frecuentes</h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="font-bold text-white text-sm mb-2 flex items-center">
                  <HelpCircle className="w-4 h-4 mr-2 text-amber-400 shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / CONTACTO */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
            Comienza a Explorar la Fundación de Bingo Club Vnzla
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-xl mx-auto">
            Registra tu cuenta de jugador para obtener tu identificador público y conocer los tableros oficiales.
          </p>

          {!user && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-lg hover:scale-105 transition-transform"
              >
                CREAR CUENTA AHORA
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-6 py-3 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold text-sm rounded-xl transition-colors"
              >
                INGRESAR AL SISTEMA
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
