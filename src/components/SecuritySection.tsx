import React from 'react';
import { ShieldCheck, Lock, Database, FileCheck2, AlertTriangle, KeyRound } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPillars = [
    {
      title: 'El Navegador NO es una Autoridad',
      description: 'El cliente web no puede decidir saldos, ganadores ni números de sorteos. Toda mutación crítica pasa por PostgreSQL con Row Level Security y Edge Functions autorizadas.',
      icon: Lock,
    },
    {
      title: 'Auditoría Inmutable (audit_logs)',
      description: 'Cada acción crítica (registros, modificaciones de perfil, inicios de sorteos) se almacena con hashes de integridad, roles y metadatos no manipulables.',
      icon: FileCheck2,
    },
    {
      title: 'Claves de Idempotencia (Anti-Duplicidad)',
      description: 'Protección contra peticiones dobles o fallos de conexión mediante UUIDs únicos en compras de cartones y transacciones contables.',
      icon: KeyRound,
    },
    {
      title: 'Control de Roles RBAC Restricto',
      description: '5 roles jerárquicos: PLAYER, OPERATOR, SUPERVISOR, ADMIN y SUPER_ADMIN. Triggers de base de datos impiden la auto-elevación de privilegios.',
      icon: Database,
    },
  ];

  return (
    <section id="seguridad" className="py-24 bg-[#0A101C] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>SEGURIDAD Y PROTECCIÓN ANTIFRAUDE</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">FASE 1</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
              Ingeniería de Seguridad de Grado Financiero
            </h2>
            <p className="mt-3 text-base text-slate-300 leading-relaxed">
              Diseñada desde su concepción bajo el principio de <strong>Cero Confianza en el Cliente (Zero-Trust Client)</strong>. La integridad matemática de cada jugada está blindada a nivel de base de datos.
            </p>
          </div>

          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <div className="w-36 h-36 rounded-3xl overflow-hidden border border-amber-500/30 p-1 bg-gradient-to-br from-amber-400/20 to-transparent">
              <img
                src="/src/assets/images/security_shield_insignia_1791180097622.jpg"
                alt="Emblema de seguridad Bingo Club Vnzla"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-[20px]"
              />
            </div>
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityPillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 p-7 rounded-2xl hover:border-slate-700 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-['Outfit'] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Audit Callout Banner */}
        <div className="mt-10 p-6 bg-slate-900/40 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">Declaración Oficial de Fase 1</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                En esta fase fundacional, el módulo financiero permanece inactivo. No se aceptan depósitos ni se procesan retiros reales hasta la certificación de Fase 3.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300 px-3 py-1.5 bg-amber-400/10 rounded-lg whitespace-nowrap">
            LEDGER STATUS: LOCKED
          </span>
        </div>

      </div>
    </section>
  );
};
