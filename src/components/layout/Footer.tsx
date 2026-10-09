import React from 'react';
import { Shield, Lock, HeartHandshake, FileText, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs">
      {/* Upper banner: Responsible Gaming & Compliance */}
      <div className="border-b border-slate-900 bg-slate-900/50 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold flex items-center justify-center text-xs">
              +18
            </span>
            <div className="text-left">
              <p className="font-semibold text-slate-200">Juego Responsable y Ético</p>
              <p className="text-[11px] text-slate-400">
                La plataforma fomenta el entretenimiento controlado. Prohibido para menores de edad.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Cifrado TLS 1.3
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              PostgreSQL Row Level Security
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Server-Authoritative
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-sm">
              BCV
            </div>
            <div>
              <p className="font-extrabold text-white text-sm tracking-tight">BINGO CLUB VNZLA</p>
              <p className="text-[10px] text-amber-400 font-medium">Bingo Club Venezuela Online</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Plataforma digital de sorteos de bingo en tiempo real con arquitectura protegida por el servidor, verificación criptográfica y gobernanza RBAC.
          </p>
          <div className="pt-1">
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
              FASE 1: FUNDACIÓN PROFESIONAL
            </span>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Modalidades</h4>
          <ul className="space-y-2 text-[11px]">
            <li className="hover:text-amber-400 transition-colors">Bingo Tradicional 75 (5x5)</li>
            <li className="hover:text-amber-400 transition-colors">Bingo 90 Bolas (3x5)</li>
            <li className="hover:text-amber-400 transition-colors">Bingo Animalitos Vnzla (5x5)</li>
            <li className="hover:text-amber-400 transition-colors">Bingo de Objetos Tradicionales</li>
            <li className="hover:text-amber-400 transition-colors">Chapitas Rápido (3x5)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Seguridad & Auditoría</h4>
          <ul className="space-y-2 text-[11px]">
            <li className="hover:text-amber-400 transition-colors">Autoridad Exclusiva del Servidor</li>
            <li className="hover:text-amber-400 transition-colors">Row Level Security (RLS)</li>
            <li className="hover:text-amber-400 transition-colors">Identidad Protegida BCV-XXXXXX</li>
            <li className="hover:text-amber-400 transition-colors">Bitácora Forense Audit Logs</li>
            <li className="hover:text-amber-400 transition-colors">Control de Idempotencia Anti-Replay</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Contacto & Soporte</h4>
          <ul className="space-y-2 text-[11px]">
            <li>Email: <span className="text-slate-300">soporte@bingoclubvnzla.com</span></li>
            <li>Seguridad: <span className="text-slate-300">seguridad@bingoclubvnzla.com</span></li>
            <li>Canal Telegram: <span className="text-slate-300">@bingoclubvnzla_bot</span></li>
            <li className="pt-2 text-[10px] text-slate-500">
              Horario de atención operativa: 08:00 AM - 10:00 PM VET
            </li>
          </ul>
        </div>
      </div>

      {/* Legal & Notice */}
      <div className="border-t border-slate-900 py-6 px-4 text-center bg-slate-950">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="text-[11px] text-slate-500">
            Aviso de Fase 1: Plataforma en modo de evaluación y pruebas técnicas de arquitectura. En esta etapa no se realizan transacciones con dinero real ni se aceptan apuestas vinculantes.
          </p>
          <p className="text-[11px] text-slate-600">
            &copy; 2026 Bingo Club Vnzla Online. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
