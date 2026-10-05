import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#050912] border-t border-slate-800 text-slate-400 text-xs py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-bold text-[#070D18] font-['Outfit']">
                B
              </div>
              <span className="text-lg font-bold text-white font-['Outfit'] tracking-tight">
                BINGO CLUB VNZLA ONLINE
              </span>
            </div>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              Plataforma digital venezolana de bingo en tiempo real. Construida bajo estándares de alta seguridad, modelos relacionales auditados y arquitectura server-authoritative.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-amber-400/90 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>FASE 1: FUNDACIÓN Y AUDITORÍA · MODO DE PRUEBAS</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 font-['Outfit']">
              Navegación
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#como-funciona" className="hover:text-amber-400 transition-colors">
                  Cómo Funciona
                </a>
              </li>
              <li>
                <a href="#modalidades" className="hover:text-amber-400 transition-colors">
                  5 Modalidades de Juego
                </a>
              </li>
              <li>
                <a href="#seguridad" className="hover:text-amber-400 transition-colors">
                  Seguridad y RLS
                </a>
              </li>
              <li>
                <a href="#juego-responsable" className="hover:text-amber-400 transition-colors">
                  Juego Responsable (+18)
                </a>
              </li>
            </ul>
          </div>

          {/* Institutional */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 font-['Outfit']">
              Seguridad & Legal
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>Identidad Pública BCV-XXXXXX</li>
              <li>Row Level Security en PostgreSQL</li>
              <li>Claves de Idempotencia UUID</li>
              <li>Sin intermediación de dinero real en Fase 1</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>
            &copy; 2026 Bingo Club Vnzla Online. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span>Solo mayores de 18 años (+18)</span>
            <span aria-hidden="true">·</span>
            <span>Juegue con responsabilidad</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
