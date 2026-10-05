import React from 'react';
import { ShieldCheck, Lock, Award, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3">
            <span className="font-serif text-lg font-bold text-white tracking-tight">
              Bingo Club Vnzla
            </span>
            <p className="text-slate-400 leading-relaxed">
              Plataforma digital de entretenimiento de sorteos y bingo tradicional venezolano en tiempo real.
            </p>
            <div className="pt-1 flex items-center gap-2 text-slate-500">
              <span>Fundación Fase 1</span>
              <span aria-hidden="true">·</span>
              <span>Modo Pruebas</span>
              <span aria-hidden="true">·</span>
              <span>v1.0.0</span>
            </div>
          </div>

          {/* Modalidades */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Modalidades de Juego
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>Bingo 75 Balotas (5x5)</li>
              <li>Bingo 90 Balotas (3x9)</li>
              <li>Animalitos Tradicionales (5x5)</li>
              <li>Objetos y Figuras (5x5)</li>
              <li>Chapitas Populares (3x5)</li>
            </ul>
          </div>

          {/* Seguridad y Legal */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Seguridad & Privacidad
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>Arquitectura Server-Authoritative</li>
              <li>Row Level Security (RLS) PostgreSQL</li>
              <li>Identificador Anónimo BCV</li>
              <li>Auditoría Criptográfica</li>
              <li>Términos y Condiciones</li>
            </ul>
          </div>

          {/* Compromiso Responsable */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Juego Responsable (+18)
            </h4>
            <p className="text-slate-400 leading-relaxed mb-3">
              Plataforma diseñada exclusivamente para mayores de edad. Promovemos el entretenimiento sano, consciente y controlado.
            </p>
            <div className="flex items-center gap-2 text-amber-400/90 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sistemas de autoexclusión y límites preventivos en desarrollo.</span>
            </div>
          </div>
        </div>

        {/* Disclaimer de Fase 1 */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80 mb-8 text-slate-400 leading-relaxed text-xs">
          <p>
            <strong className="text-slate-200">Aviso Oficial de Fase 1:</strong> Esta plataforma se encuentra en fase de pruebas técnicas y de seguridad de software. Las funciones de transacciones financieras, recargas bancarias con Pago Móvil, Binance Pay y apuestas con dinero real <strong>NO están activas</strong> en esta etapa. No se comercializan cartones por dinero fiat ni criptoactivo alguno.
          </p>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} Bingo Club Venezuela Online. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-medium">Hecho con ingeniería venezolana</span>
            <span aria-hidden="true">·</span>
            <span>Caracas, Venezuela</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
