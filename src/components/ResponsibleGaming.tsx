// ============================================================================
// BINGO CLUB VNZLA ONLINE — JUEGO RESPONSABLE
// ============================================================================

import React from 'react';
import { HeartHandshake, Ban, Clock, Scale } from 'lucide-react';

export const ResponsibleGaming: React.FC = () => {
  return (
    <section id="juego-responsable" className="py-20 sm:py-24 border-b border-slate-800/60 bg-slate-900/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
            Compromiso Social y Ético
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl" style={{ textWrap: 'balance' }}>
            Juego Responsable y Protección al Jugador
          </h2>
          <p className="mt-3 text-base text-slate-400">
            El bingo es una actividad recreativa y comunitaria de tradición venezolana. Promovemos un entorno sano, controlado y transparente.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-4">
              <Ban className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Mayores de 18 Años (+18)</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              El acceso a la plataforma está estrictamente reservado a personas mayores de edad conforme a la legislación vigente.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 mb-4">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Límites de Tiempo y Sesión</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Diseño de sesión con recordatorios automáticos de permanencia para evitar jornadas prolongadas de juego sin descanso.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 mb-4">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Autoexclusión Voluntaria</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Todo jugador podrá suspender temporal o definitivamente su acceso a las salas cuando considere oportuno un receso.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 mb-4">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Orientación y Ayuda</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Disponibilidad de enlaces a organizaciones especializadas y soporte al jugador ante signos de ludopatía o juego compulsivo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
