// BINGO CLUB VNZLA ONLINE — JUEGO RESPONSABLE
// FASE 1: POLÍTICAS DE PROTECCIÓN AL JUGADOR (18+)

import React from 'react';
import { HeartHandshake, ShieldCheck, AlertCircle, Ban, Clock } from 'lucide-react';

export const ResponsibleGamingSection: React.FC = () => {
  return (
    <section className="py-16 bg-slate-900/40 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/60 p-8 sm:p-12 border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-red-300 text-xs font-bold mb-3">
                <Ban className="w-3.5 h-3.5" />
                Solo Mayores de 18 Años (+18)
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white">
                Compromiso de Juego Responsable
              </h2>
              <p className="mt-2 text-slate-400 text-xs sm:text-sm max-w-xl">
                El bingo es una actividad recreativa y social tradicional. Fomentamos prácticas saludables y herramientas de autoexclusión.
              </p>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-2xl">
                +18
              </div>
              <div className="text-xs text-slate-400">
                <p className="font-bold text-white">Prohibido a menores</p>
                <p>Verificación obligatoria de edad en registro</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            <div className="flex gap-4">
              <Clock className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-sm font-bold text-white">Límites de Tiempo</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Alertas periódicas de duración de sesión para evitar juego compulsivo.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-sm font-bold text-white">Límites de Cartones</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Tope máximo de cartones por sorteo configurado en la base de datos para preservar la equidad.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <HeartHandshake className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-sm font-bold text-white">Autoexclusión Voluntaria</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Facilidad para congelar o suspender temporalmente la cuenta en cualquier momento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
