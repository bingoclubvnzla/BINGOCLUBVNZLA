import React from 'react';
import { HeartHandshake, ShieldAlert, Clock, Ban } from 'lucide-react';

export const ResponsibleGamingSection: React.FC = () => {
  const policies = [
    {
      title: 'Acceso Exclusivo para Mayores de 18 Años',
      desc: 'El registro y participación en Bingo Club Vnzla está estrictamente prohibido para menores de edad. Verificación mediante documento de identidad en fases operativas.',
      icon: Ban,
    },
    {
      title: 'Límites de Tiempo y Conciencia',
      desc: 'El entretenimiento digital debe disfrutarse con moderación. Fomentamos pausas regulares y recordatorios de sesión.',
      icon: Clock,
    },
    {
      title: 'Autoexclusión Preventiva',
      desc: 'Cualquier usuario podrá solicitar la suspensión temporal o definitiva de su cuenta a través de su panel de seguridad sin objeción.',
      icon: ShieldAlert,
    },
    {
      title: 'Entretenimiento Seguro',
      desc: 'El bingo es un pasatiempo social y de destreza tradicional. Nunca debe verse como una vía de ingresos ni recuperación de pérdidas.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section id="juego-responsable" className="py-20 bg-[#070D18]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
            <span>COMPROMISO ÉTICO</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">JUEGO SEGURO</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Política de Juego Responsable
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Fomentamos una comunidad sana, transparente y protegida. El juego digital debe ser siempre una experiencia divertida y controlada.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {policies.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 font-['Outfit']">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {p.desc}
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
