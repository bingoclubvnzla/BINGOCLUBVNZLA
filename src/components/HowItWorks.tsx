// ============================================================================
// BINGO CLUB VNZLA ONLINE — CÓMO FUNCIONA
// ============================================================================

import React from 'react';
import { UserCheck, Grid3X3, Radio, Trophy } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Registro Seudónimo Seguro',
      description:
        'Crea tu cuenta con correo y contraseña. El sistema genera automáticamente tu identificador único anónimo (ej. BCV-7K9M2P). Tu correo nunca se expone públicamente en las salas de juego.',
      icon: UserCheck,
    },
    {
      step: '02',
      title: 'Selección de Modalidad Criolla',
      description:
        'Elige entre formatos tradicionales como Bingo 75, Bingo 90, o las modalidades emblemáticas venezolanas de Animalitos, Objetos y Chapitas, con configuraciones de matriz estandarizadas.',
      icon: Grid3X3,
    },
    {
      step: '03',
      title: 'Sorteo Server-Authoritative en Vivo',
      description:
        'Las balotas son extraídas por el servidor y difundidas a través de canales Supabase Realtime autorizados. El navegador solo muestra la animación; el backend mantiene la verdad oficial.',
      icon: Radio,
    },
    {
      step: '04',
      title: 'Verificación Criptográfica y Auditoría',
      description:
        'Al cantar Bingo, una Edge Function valida el cartón contra la secuencia exacta cantada en base de datos. Todo reclamo y evento queda registrado en el libro inmutable de auditoría.',
      icon: Trophy,
    },
  ];

  return (
    <section id="como-funciona" className="py-20 sm:py-24 border-b border-slate-800/60 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
            Transparencia y Juego Limpio
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl" style={{ textWrap: 'balance' }}>
            Cómo Funciona Bingo Club Vnzla
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Un flujo diseñado bajo estándares bancarios donde la suerte es matemáticamente auditable y el jugador mantiene su privacidad intacta.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-amber-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-2xl font-black text-slate-700">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
