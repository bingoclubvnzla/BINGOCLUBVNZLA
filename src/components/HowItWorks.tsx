// BINGO CLUB VNZLA ONLINE — CÓMO FUNCIONA
// FASE 1: 4 PASOS TRANSPARENTES Y SEGUROS

import React from 'react';
import { UserCheck, LayoutGrid, Award, Zap } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Identidad y Privacidad Protegida',
      description: 'Regístrese con su correo y reciba automáticamente un identificador público confidencial (BCV-XXXXXX). Su correo nunca se expone a terceros.',
      icon: UserCheck,
      color: 'from-blue-600 to-indigo-700',
    },
    {
      step: '02',
      title: 'Selección de Modalidad Criolla',
      description: 'Elija entre Bingo 75, Bingo 90, Animalitos Vnzla, Objetos Criollos o Chapitas Callejeras según su preferencia y dinámica de juego.',
      icon: LayoutGrid,
      color: 'from-amber-500 to-yellow-600',
    },
    {
      step: '03',
      title: 'Cartones Digitales Certificados',
      description: 'Cada cartón digital es emitido por el servidor con una matriz matemática inmutable y serial criptográfico único para evitar falsificaciones.',
      icon: Award,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      step: '04',
      title: 'Sorteo en Tiempo Real (Server Authoritative)',
      description: 'Las balotas son extraídas con cadencia autorizada y sincronizadas por Supabase Realtime. El servidor valida al instante los ganadores legítimos.',
      icon: Zap,
      color: 'from-rose-500 to-red-600',
    },
  ];

  return (
    <section id="como-funciona" className="py-20 bg-slate-900/30 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            Flujo de Juego
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-black text-white tracking-tight">
            ¿Cómo Funciona la Plataforma?
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            Un sistema diseñado para brindar transparencia total, respeto a las reglas y diversión sin complicaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="relative rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-3xl font-black text-slate-700 group-hover:text-amber-400/60 transition-colors">
                      {item.step}
                    </span>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
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
