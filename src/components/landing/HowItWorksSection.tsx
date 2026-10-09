// ====================================================================
// BINGO CLUB VNZLA ONLINE — SECCIÓN CÓMO FUNCIONA
// ====================================================================

import React from 'react';
import { UserCheck, Grid3X3, Radio, CheckCheck } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: UserCheck,
      title: 'Registro e Identidad BCV',
      desc: 'Crea tu cuenta de jugador. El sistema genera automáticamente tu identificador público único (ej. BCV-7K2P9Q) protegiendo tus datos personales y correo.',
    },
    {
      num: '02',
      icon: Grid3X3,
      title: 'Selección de Modalidad',
      desc: 'Elige tu formato preferido entre las modalidades tradicionales registradas en base de datos: Bingo 75, Bingo 90, Animalitos, Objetos y Chapitas.',
    },
    {
      num: '03',
      icon: Radio,
      title: 'Sorteo en Vivo Servidor-Autoritativo',
      desc: 'Las bolitas son extraídas por el motor del servidor central con semillas auditables y transmitidas en tiempo real. El cliente solo visualiza.',
    },
    {
      num: '04',
      icon: CheckCheck,
      title: 'Verificación Criptográfica',
      desc: 'Al cantarse una línea o bingo, el servidor evalúa la matriz del cartón contra su checksum original y la lista oficial de bolas extraídas.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-900/40 border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Arquitectura y Dinámica
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-2">
            ¿Cómo Funciona Bingo Club Vnzla?
          </h2>
          <p className="text-sm text-slate-400 mt-3">
            Un diseño transparente de 4 etapas donde la seguridad y la autoridad de cada sorteo están respaldadas por el servidor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-600/30 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="font-mono text-xl font-bold text-slate-600 group-hover:text-amber-400/60 transition">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
