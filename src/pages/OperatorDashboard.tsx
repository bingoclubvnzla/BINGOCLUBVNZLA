import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { canAccessOperatorPanel } from '../lib/state-machine';
import {
  ShieldAlert,
  Users,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  FileText,
  Lock,
  CheckCircle,
} from 'lucide-react';

interface OperatorDashboardProps {
  onNavigate: (view: string) => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ onNavigate }) => {
  const { role, profile } = useAuth();
  const [activeModule, setActiveModule] = useState<
    'overview' | 'recharges' | 'payouts' | 'withdrawals' | 'players' | 'incidents' | 'audit'
  >('overview');

  if (!canAccessOperatorPanel(role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md p-6 bg-slate-900 border border-red-500/30 rounded-2xl text-center text-slate-200">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Acceso Denegado</h2>
          <p className="text-xs text-slate-400 mt-2">
            Este panel requiere privilegios de OPERATOR, SUPERVISOR o ADMIN. Su rol actual es <strong>{role}</strong>.
          </p>
          <button
            onClick={() => onNavigate('landing')}
            className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white"
          >
            Regresar al Inicio
          </button>
        </div>
      </div>
    );
  }

  const modules = [
    { id: 'overview', label: 'Resumen Operativo', icon: CheckCircle },
    { id: 'recharges', label: 'Recargas (Pago Móvil / Binance)', icon: ArrowDownCircle },
    { id: 'payouts', label: 'Pagos de Premios', icon: CreditCard },
    { id: 'withdrawals', label: 'Retiros', icon: ArrowUpCircle },
    { id: 'players', label: 'Gestión de Jugadores', icon: Users },
    { id: 'incidents', label: 'Incidencias & Soporte', icon: AlertCircle },
    { id: 'audit', label: 'Acciones de Operador', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-white">Panel de Operador</h1>
              <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-600/40 px-2.5 py-0.5 rounded-full font-bold">
                OPERATIONS DESK
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Operador conectado: <strong className="text-slate-200">{profile?.full_name}</strong> ({profile?.public_id})
            </p>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Fase 1: Sin operaciones financieras activadas</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors ${
                  activeModule === m.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          {activeModule === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white">Estado General de Operación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Módulo Financiero</span>
                  <span className="text-sm font-bold text-amber-400">DESHABILITADO (FASE 1)</span>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Las tablas `payment_requests` y `wallets` están bloqueadas por diseño.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Canales Realtime</span>
                  <span className="text-sm font-bold text-emerald-400">CONFIGURADOS</span>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Estructura `operator:{`{operatorId}`} activa para alertas de salas.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Auditoría Operativa</span>
                  <span className="text-sm font-bold text-blue-400">ENLACE ACTIVO</span>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Toda acción de operador se registra en PostgreSQL con hash criptográfico.
                  </p>
                </div>
              </div>
            </div>
          )}

          {['recharges', 'payouts', 'withdrawals'].includes(activeModule) && (
            <div className="py-12 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Módulo Financiero Restringido en Fase 1</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                De acuerdo con el mandato de seguridad de la Fase 1, no se simulan ni procesan operaciones financieras (recargas por Pago Móvil, Binance Pay o retiros). 
                La arquitectura del libro mayor (<em>ledger</em>) en la tabla <code className="text-amber-400">wallet_transactions</code> se encuentra en modo estrictamente protegido.
              </p>
              <span className="inline-block mt-4 text-[11px] text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                Disponibilidad programada: Fase 2
              </span>
            </div>
          )}

          {activeModule === 'players' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Monitoreo de Jugadores</h3>
              <p className="text-xs text-slate-400">
                Visualización de perfiles según permisos de operador. No se exponen correos ni contraseñas.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                Consulta protegida por Row Level Security (RLS) en tabla `profiles`.
              </div>
            </div>
          )}

          {activeModule === 'incidents' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Registro de Incidencias Operativas</h3>
              <p className="text-xs text-slate-400">
                Canal para reportar irregularidades de red o sincronización en sorteos.
              </p>
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                Sin incidencias activas en el sistema.
              </div>
            </div>
          )}

          {activeModule === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Bitácora de Acciones de Operador</h3>
              <p className="text-xs text-slate-400">
                Registro inmutable de actividades en tabla `operator_actions`.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                Toda intervención manual sobre salas o jugadores queda firmada con el ID del operador.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
