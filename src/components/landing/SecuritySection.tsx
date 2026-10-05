import React from 'react';
import { ShieldAlert, Server, Database, Key, Fingerprint, Lock, CheckCircle2 } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPillars = [
    {
      title: 'El Navegador no es una Autoridad',
      tag: 'Server-Authoritative',
      description: 'El cliente web jamás decide números sorteados, ganadores, saldo, transacciones ni roles. Toda lógica sensible se ejecuta en backend aislado.',
      icon: Server,
    },
    {
      title: 'Row Level Security (RLS) Obligatorio',
      tag: 'PostgreSQL Nativo',
      description: 'Cada tabla cuenta con políticas RLS activas. Un jugador solo puede consultar su propio perfil y cartones. Nadie puede leer wallets ni transacciones ajenas.',
      icon: Database,
    },
    {
      title: 'Identidad Pública Anónima (BCV-XXXXXX)',
      tag: 'Anti-Doxxing & Privacidad',
      description: 'Los correos electrónicos y teléfonos nunca se exponen en salas de juego ni listados públicos. Solo se muestra el código único de jugador.',
      icon: Fingerprint,
    },
    {
      title: 'Auditoría Criptográfica e Idempotencia',
      tag: 'Audit Logs & Ledger',
      description: 'Trazas inmutables en audit_logs con hash de IP y agente de usuario. Llaves de idempotencia únicas que previenen el doble gasto o transacciones repetidas.',
      icon: Key,
    },
  ];

  return (
    <section id="seguridad" className="py-20 bg-slate-950 border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest block mb-2">
            Arquitectura de Confianza
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Seguridad Antifraude & Transparencia
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Diseñado bajo los principios de defensa en profundidad y mínimo privilegio desde la primera línea de código.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {pillar.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>{pillar.tag}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400">Verificado</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security quote */}
        <div className="mt-8 p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <p>
            <strong className="text-slate-200">Garantía de Integridad:</strong> Los roles <code className="text-amber-400 font-mono">PLAYER</code>, <code className="text-amber-400 font-mono">OPERATOR</code>, <code className="text-amber-400 font-mono">SUPERVISOR</code>, <code className="text-amber-400 font-mono">ADMIN</code> y <code className="text-amber-400 font-mono">SUPER_ADMIN</code> se evalúan directamente en PostgreSQL mediante triggers inmutables. Ninguna modificación del cliente en JavaScript puede burlar los permisos del servidor.
          </p>
        </div>
      </div>
    </section>
  );
};
