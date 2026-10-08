import React from 'react';
import { ShieldCheck, Lock, HeartHandshake, FileText, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-xs">
      {/* Integrity strip */}
      <div className="max-w-7xl mx-auto px-4 py-8 border-b border-slate-900/60 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-600/30 text-blue-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Server-Authoritative</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              El cliente web no determina números, saldos ni ganadores. Toda la lógica de integridad reside en PostgreSQL y Supabase.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-600/30 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Seguridad RLS & RBAC</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Políticas de Row Level Security estrictas. Aislamiento total de perfiles y trazabilidad en bitácoras inmutables.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-600/30 text-emerald-400">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Juego Responsable</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Plataforma orientada al entretenimiento ético y seguro. Modo de pruebas activo en Fase 1 sin dinero real.
            </p>
          </div>
        </div>
      </div>

      {/* Main footer navigation */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm text-white">BINGO CLUB VNZLA</span>
            <span className="text-amber-400 font-semibold text-xs">• Bingo Club Venezuela Online</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Plataforma de bingo digital en tiempo real. Edición Fundación Profesional Fase 1.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <button
            onClick={() => onNavigate('landing')}
            className="hover:text-amber-400 transition-colors"
          >
            Inicio
          </button>
          <button
            onClick={() => onNavigate('modalities')}
            className="hover:text-amber-400 transition-colors"
          >
            Modalidades de Juego
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className="hover:text-amber-400 transition-colors"
          >
            Seguridad & Perfil
          </button>
          <a
            href="#faq"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('landing');
              setTimeout(() => {
                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="hover:text-amber-400 transition-colors"
          >
            Preguntas Frecuentes
          </a>
        </div>
      </div>

      {/* Bottom Legal / Phase notice */}
      <div className="bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-[11px] text-slate-500">
        <p>
          © {new Date().getFullYear()} BINGO CLUB VNZLA. Todos los derechos reservados.
          Esta plataforma opera en modo de pruebas técnicas preliminares. Las funciones financieras se habilitarán en la Fase 2 bajo certificación regulatoria.
        </p>
      </div>
    </footer>
  );
};
