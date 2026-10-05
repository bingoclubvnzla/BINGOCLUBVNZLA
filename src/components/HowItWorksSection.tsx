import React from 'react';
import { UserCheck, Grid3X3, Radio, Trophy } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Registro e Identidad Protegida',
      description: 'Crea tu cuenta con correo electrónico seguro. El sistema te asigna un identificador público alfanumérico BCV-XXXXXX que protege tu privacidad en todas las salas.',
      icon: UserCheck,
    },
    {
      number: '02',
      title: 'Selección de Modalidad de Juego',
      description: 'Elige entre Bingo 75, Bingo 90, Animalitos Criollos, Objetos Dinámicos o Chapitas. Cada modalidad cuenta con reglas y matrices certificadas.',
      icon: Grid3X3,
    },
    {
      number: '03',
      title: 'Sorteo en Tiempo Real',
      description: 'Extracción aleatoria ejecutada exclusivamente en el servidor con hash de integridad SHA-256 por cada balota cantada. Cero manipulación del cliente.',
      icon: Radio,
    },
    {
      number: '04',
      title: 'Validación Oficial de Premios',
      description: 'Cuando un cartón completa la figura ganadora (Línea, Diagonal o Bingo), el motor valida la autenticidad matemática en milisegundos de forma auditada.',
      icon: Trophy,
    },
  ];

  return (
    <section id="como-funciona" className="py-20 bg-[#0A111E] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-14">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
            <span>ARQUITECTURA DE JUEGO</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">PASO A PASO</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Cómo Funciona la Plataforma
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Un flujo diseñado para garantizar total transparencia técnica, sincronización instantánea y certeza de resultados.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-['Outfit'] font-black text-2xl text-amber-400/80">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-['Outfit']">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
