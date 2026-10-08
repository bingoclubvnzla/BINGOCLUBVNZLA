// BINGO CLUB VNZLA ONLINE — SECCIÓN DE SEGURIDAD Y AUDITORÍA
// FASE 1: ARQUITECTURA DE CONFIANZA CERO (ZERO TRUST)

import React from 'react';
import { ShieldAlert, KeyRound, Database, FileText, Check, Lock } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityFeatures = [
    {
      title: 'El Navegador NO es Autoridad',
      description: 'El cliente web no puede decidir saldos, números cantados, cartones ni ganadores. Toda la lógica crítica se procesa y valida en PostgreSQL y Edge Functions protegidas.',
      icon: Lock,
    },
    {
      title: 'Row Level Security (RLS) Integral',
      description: 'Cada fila de base de datos está protegida a nivel de motor de PostgreSQL. Un jugador solo puede acceder a sus propios cartones y transacciones.',
      icon: Database,
    },
    {
      title: 'Identidad Pública Anónima (BCV-XXXXXX)',
      description: 'Los correos electrónicos y teléfonos nunca se comparten en salas públicas ni chats. Cada usuario interactúa mediante un identificador aleatorio certificado.',
      icon: KeyRound,
    },
    {
      title: 'Bitácora Inmutable (Audit Logs)',
      description: 'Cada acción sensible queda registrada en un registro append-only sin permisos de modificación ni eliminación, impidiendo cualquier alteración histórica.',
      icon: FileText,
    },
  ];

  return (
    <section id="seguridad" className="py-20 bg-slate-950 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Arquitectura Antifraude
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Seguridad Sin Concesiones
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
              En los juegos de azar digitales tradicionales, muchas plataformas delegan validaciones en el navegador, permitiendo trampas e inyecciones de datos. En <strong>Bingo Club Vnzla Online</strong> aplicamos el estándar bancario de cero confianza.
            </p>

            <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm">
              <strong className="block font-bold text-amber-200 mb-1">Principio Fundamental:</strong>
              Cualquier solicitud de modificación de rol por un usuario común es bloqueada a nivel de trigger de base de datos antes de que se ejecute.
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800/80 flex items-center justify-center text-amber-400 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
