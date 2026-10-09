// ====================================================================
// BINGO CLUB VNZLA ONLINE — SECCIÓN DE SEGURIDAD Y RLS
// Detalle de arquitectura antifraude y autoridad del servidor
// ====================================================================

import React from 'react';
import { ShieldCheck, Lock, EyeOff, Server, Terminal, CheckCircle } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-20 bg-slate-900/30 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Principio Fundamental: El Navegador NO es Autoridad</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Seguridad Antifraude y Row Level Security
          </h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Toda decisión crítica (números extraídos, validez de cartones, estados de usuario y transacciones) es resuelta por PostgreSQL y Supabase Edge Functions con políticas RLS de mínimo privilegio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 border border-blue-700/40 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Server-Authoritative Realtime</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              El cliente web únicamente solicita, recibe y renderiza. El bombo digital y la secuenciación de eventos corren 100% en el servidor.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-700/40 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Políticas RLS en 18 Tablas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Un jugador sólo puede leer su propio perfil, billetera y cartones. La base de datos rechaza automáticamente cualquier intento de consulta no autorizada.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 border border-rose-700/40 flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Privacidad: ID Público BCV</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Los jugadores se identifican públicamente mediante un código formato <code className="text-amber-400 font-mono">BCV-XXXXXX</code>, sin exponer jamás correos electrónicos ni teléfonos.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 border border-purple-700/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Jerarquía RBAC Inmutable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              5 niveles de permisos (Player, Operator, Supervisor, Admin, Super Admin). Ningún usuario puede auto-escalar su rango ni alterar tablas sensibles.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-700/40 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Idempotencia Criptográfica</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cada transacción y solicitud posee una clave de idempotencia única para garantizar que ninguna operación se ejecute dos veces por error.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950 text-sky-400 border border-sky-700/40 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Bitácora Inmutable de Auditoría</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tabla <code className="text-slate-300 font-mono">audit_logs</code> registra acciones con actor, rol, timestamp y metadata para trazabilidad forense completa.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
