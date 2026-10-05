import React from 'react';
import { AlertTriangle, Clock, ShieldCheck, Heart } from 'lucide-react';

export const ResponsibleGaming: React.FC = () => {
  return (
    <section id="juego-responsable" className="py-20 bg-slate-900/30 border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest block mb-2">
            Compromiso Social
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Juego Responsable (+18)
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            El bingo es una actividad de recreación, esparcimiento y tradición comunitaria. Promovemos hábitos conscientes y entornos seguros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <span className="font-bold text-sm">+18</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Exclusivo Mayores de Edad</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Queda estrictamente prohibido el acceso a menores de 18 años. El sistema requerirá verificación de identidad fehaciente en la etapa de transacciones.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Control de Tiempo y Límites</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              La plataforma incorpora mecanismos de advertencia periódica de tiempo en pantalla y descansos programados para evitar sesiones prolongadas compulsivas.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Autoexclusión y Asistencia</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cualquier jugador puede solicitar en cualquier momento el bloqueo temporal o definitivo de su cuenta. Se proveen canales directos de orientación preventiva.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
