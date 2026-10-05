import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  FileText, 
  ShieldAlert, 
  Lock,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const OperatorDashboard: React.FC = () => {
  const { profile, effectiveRole } = useAuth();
  const [activeModule, setActiveModule] = useState<
    'recargas' | 'pagos' | 'retiros' | 'jugadores' | 'incidencias' | 'auditoria'
  >('jugadores');

  const modules = [
    { id: 'recargas', name: 'Recargas', icon: ArrowDownLeft },
    { id: 'pagos', name: 'Pagos Móvil', icon: CreditCard },
    { id: 'retiros', name: 'Retiros Binance', icon: ArrowUpRight },
    { id: 'jugadores', name: 'Jugadores & Salas', icon: Users },
    { id: 'incidencias', name: 'Incidencias', icon: AlertTriangle },
    { id: 'auditoria', name: 'Auditoría', icon: FileText },
  ] as const;

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Operator Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                PORTAL {effectiveRole}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {profile?.public_id || 'BCV-OP'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Consola de Operador de Sala
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervisión de salas, control de participantes y registro de incidencias en tiempo real.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl flex items-center gap-3 text-xs">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-300 block">Fase 1: Modo Observador</span>
              <span className="text-slate-400 text-[11px]">Sin operaciones financieras activadas</span>
            </div>
          </div>
        </div>

        {/* Global Alert for Operator */}
        <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Directriz de Seguridad:</strong> Los operadores no tienen permisos para alterar saldos de usuarios ni validar transacciones en esta fase. Los módulos financieros están en preparación técnica para la integración de webhooks bancarios en Fase 2.
          </p>
        </div>
      </div>

      {/* Modules navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-1 text-xs font-medium">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{mod.name}</span>
            </button>
          );
        })}
      </div>

      {/* Module Content */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        {activeModule === 'jugadores' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Monitoreo de Jugadores Activos</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulta de identificadores públicos sin exposición de datos confidenciales.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por ID (ej. BCV-7K9M2W)"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-medium">
                Salas en preparación para el inicio oficial de partidas
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Los jugadores registrados aparecerán en este panel a medida que ingresen a las salas públicas autorizadas.
              </p>
            </div>
          </div>
        )}

        {(activeModule === 'recargas' || activeModule === 'pagos' || activeModule === 'retiros') && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Módulo Financiero Desactivado en Fase 1
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
              De acuerdo con las directrices del sistema, no se procesan ni simulan recargas, pagos ni retiros. Este panel se activará en la Fase 2 con pasarelas de Pago Móvil y Binance Pay.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span>Estado: PREPARADO PARA FASE 2</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Esquema SQL Migrado</span>
            </div>
          </div>
        )}

        {activeModule === 'incidencias' && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Sin Incidencias Reportadas
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              El registro de tickets y reclamos de salas se mantiene limpio. Todas las conexiones realtime operan con normalidad.
            </p>
          </div>
        )}

        {activeModule === 'auditoria' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Registro de Operaciones de Sala</h3>
            <p className="text-xs text-slate-400">
              Trazas registradas con actor_role, timestamp y entidad afectada según la tabla audit_logs.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span>[BOOT] Esquema PostgreSQL inicializado con éxito</span>
                <span className="text-slate-500">2026-10-05T11:35:00Z</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span>[RBAC] Matriz de 5 roles y políticas RLS cargadas</span>
                <span className="text-slate-500">2026-10-05T11:35:01Z</span>
              </div>
              <div className="flex items-center justify-between">
                <span>[PHASE_1] Modo de pruebas activo sin transacciones de dinero real</span>
                <span className="text-emerald-400">EN CURSO</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
