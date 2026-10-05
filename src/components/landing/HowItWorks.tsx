import React from 'react';
import { UserCheck, Grid3X3, Radio, Trophy } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Registro de Identidad Protegida',
      desc: 'Crea tu cuenta en segundos con Supabase Auth. El sistema genera de forma automática tu identificador público oficial (ej. BCV-7K9M2W), protegiendo tu correo e información confidencial.',
      icon: UserCheck,
    },
    {
      num: '02',
      title: 'Cartones Digitales Certificados',
      desc: 'Cada cartón digital es emitido por el servidor con una firma SHA-256 única. Ningún cliente o navegador puede alterar los números ni simular combinaciones premiadas.',
      icon: Grid3X3,
    },
    {
      num: '03',
      title: 'Sorteos en Vivo Multicanal',
      desc: 'Transmisión en tiempo real vía WebSockets autoritativos. Cada balota o figura es extraída por el motor del servidor y distribuida simultáneamente a todos los jugadores.',
      icon: Radio,
    },
    {
      num: '04',
      title: 'Verificación Instantánea y Auditoría',
      desc: 'Al cantar línea, 4 esquinas o bingo lleno, el backend comprueba matemáticamente el reclamo contra la secuencia de extracción registrada en los logs del sorteo.',
      icon: Trophy,
    },
  ];

  return (
    <section id="como-funciona" className="py-20 bg-slate-950 border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest block mb-2">
            Metodología del Sistema
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Cómo Funciona Bingo Club
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Flujo de operación transparente basado en el principio Server-Authoritative.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                      {step.num}.
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Server-Validated</span>
                  <span aria-hidden="true">·</span>
                  <span>Sin Mocks</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
