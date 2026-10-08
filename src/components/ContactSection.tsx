// BINGO CLUB VNZLA ONLINE — SECCIÓN DE CONTACTO Y SOPORTE OFICIAL
// FASE 1: CANALES INSTITUCIONALES

import React from 'react';
import { Mail, Clock, ShieldCheck, MapPin } from 'lucide-react';

export const ContactSection: React.FC = () => {
  return (
    <section className="py-20 bg-slate-900/20 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-8 sm:p-12">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Canales Oficiales
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white">
              Contacto y Mesa de Ayuda Técnica
            </h2>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed">
              Para auditorías técnicas, reportes de seguridad, consultas sobre la fase de pruebas o alianzas operativas:
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <Mail className="w-6 h-6 text-amber-400 mb-3" />
              <h4 className="text-sm font-bold text-white">Correo Oficial</h4>
              <p className="text-xs font-mono text-amber-300 mt-1">bingoclubvnzla@gmail.com</p>
              <p className="text-[11px] text-slate-500 mt-2">Atención a auditorías y usuarios</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <Clock className="w-6 h-6 text-blue-400 mb-3" />
              <h4 className="text-sm font-bold text-white">Horario de Soporte</h4>
              <p className="text-xs text-slate-300 mt-1">Lunes a Domingo</p>
              <p className="text-[11px] text-slate-500 mt-2">08:00 AM – 10:00 PM (Hora de Venezuela VET / UTC-4)</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="text-sm font-bold text-white">Respuesta a Incidentes</h4>
              <p className="text-xs text-slate-300 mt-1">Protocolo Máximo 24h</p>
              <p className="text-[11px] text-slate-500 mt-2">Monitoreo activo de bitácoras de seguridad</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
