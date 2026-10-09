// ====================================================================
// BINGO CLUB VNZLA ONLINE — JUEGO RESPONSABLE
// ====================================================================

import React from 'react';
import { HeartHandshake, AlertTriangle, Clock, Shield } from 'lucide-react';

export const ResponsibleGamingSection: React.FC = () => {
  return (
    <section id="responsible" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-8 sm:p-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Compromiso Ético y Protección al Jugador</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
            Juego Responsable y Entretenimiento Sano
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-8">
            En Bingo Club Vnzla promovemos el juego como una actividad de recreación y compartir familiar. El entretenimiento digital debe mantenerse siempre dentro de límites saludables y bajo estricto control voluntario.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs">
                  +18
                </span>
                <span>Mayoría de Edad</span>
              </div>
              <p className="text-xs text-slate-400">
                Acceso restringido exclusivamente a mayores de 18 años mediante verificación obligatoria.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Control de Tiempo</span>
              </div>
              <p className="text-xs text-slate-400">
                Herramientas para monitorear horas de sesión y pausas activas programadas.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <span>Autoexclusión Voluntaria</span>
              </div>
              <p className="text-xs text-slate-400">
                Posibilidad de pausar o congelar la cuenta de forma autónoma en cualquier momento desde el perfil.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
