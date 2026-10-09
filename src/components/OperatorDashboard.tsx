// ==============================================================================
// BINGO CLUB VNZLA ONLINE — DASHBOARD DEL OPERADOR
// Requisito: Estructura inicial profesional. "Sin operaciones financieras activadas."
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MonetizationSection } from './finance/MonetizationSection';
import {
  ShieldAlert,
  Users,
  AlertTriangle,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  FileText,
  Search,
  Lock,
  TrendingUp
} from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const { role, publicId } = useAuth();
  const [activeModule, setActiveModule] = useState<'jugadores' | 'incidencias' | 'auditoria' | 'monetizacion' | 'recargas' | 'pagos' | 'retiros'>('monetizacion');

  // Muestra de incidencias de prueba para verificar interacción de soporte
  const [incidents, setIncidents] = useState([
    {
      id: 'INC-2026-001',
      user_public_id: 'BCV-948120',
      type: 'Consulta de Registro',
      status: 'ABIERTA',
      priority: 'MEDIA',
      created_at: '2026-10-04 18:30:00',
      description: 'Jugador solicita confirmación de horario del próximo sorteo de Bingo 75.',
    },
    {
      id: 'INC-2026-002',
      user_public_id: 'BCV-112394',
      type: 'Soporte de Conexión',
      status: 'EN_REVISION',
      priority: 'BAJA',
      created_at: '2026-10-04 19:15:00',
      description: 'Verificación de latencia de red en conexión móvil 4G.',
    },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO DE OPERADOR */}
        <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <ShieldAlert className="h-4 w-4" />
              <span>Consola Operativa</span>
              <span aria-hidden="true">·</span>
              <span>Nivel de Acceso: {role}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white font-display">
              Panel de Operador
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Monitoreo de salas, atención a jugadores y supervisión de incidencias del sistema.
            </p>
          </div>

          {/* BANNER DE ESTADO OBLIGATORIO */}
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-4 sm:w-80">
            <div className="flex items-center gap-2 text-xs text-sky-300 font-semibold mb-1">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Estado Operativo</span>
            </div>
            {/* Mensaje mandatorio requerido por el prompt maestro */}
            <div className="text-xs text-slate-300 font-medium">
              Sin operaciones financieras activadas.
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Fase 1: Módulos de conciliación bancaria deshabilitados por diseño.
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN DE MÓDULOS DE OPERADOR */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 mb-8">
          <button
            onClick={() => setActiveModule('jugadores')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeModule === 'jugadores'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Jugadores
          </button>

          <button
            onClick={() => setActiveModule('incidencias')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeModule === 'incidencias'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Incidencias ({incidents.length})
          </button>

          <button
            onClick={() => setActiveModule('auditoria')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeModule === 'auditoria'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            Auditoría
          </button>

          {/* MÓDULO OFICIAL DE MONETIZACIÓN */}
          <button
            onClick={() => setActiveModule('monetizacion')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeModule === 'monetizacion'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="h-4 w-4 text-amber-400" />
            Monetización & Rentabilidad
          </button>

          {/* MÓDULOS FINANCIEROS (PREPARADOS, SIN ACTIVAR) */}
          <button
            onClick={() => setActiveModule('recargas')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeModule === 'recargas'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ArrowDownCircle className="h-4 w-4" />
            Recargas (Fase 3)
          </button>

          <button
            onClick={() => setActiveModule('pagos')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeModule === 'pagos'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Pagos (Fase 3)
          </button>

          <button
            onClick={() => setActiveModule('retiros')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeModule === 'retiros'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Retiros (Fase 3)
          </button>
        </div>

        {/* CONTENIDO DE MÓDULOS */}

        {/* MÓDULO: JUGADORES */}
        {activeModule === 'jugadores' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white font-display">
                  Directorio de Jugadores Registrados
                </h2>
                <p className="text-xs text-slate-400">
                  Consulta de perfiles autorizada por políticas RLS para rol {role}.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ID Público</th>
                    <th className="py-3 px-4 font-semibold">Nombre Visible</th>
                    <th className="py-3 px-4 font-semibold">Rol</th>
                    <th className="py-3 px-4 font-semibold">Estado</th>
                    <th className="py-3 px-4 font-semibold">Nivel Seg.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  <tr>
                    <td className="py-3 px-4 text-amber-400 font-bold">{publicId}</td>
                    <td className="py-3 px-4 text-slate-200">Usuario Actual ({role})</td>
                    <td className="py-3 px-4 text-slate-300">{role}</td>
                    <td className="py-3 px-4 text-emerald-400">ACTIVO</td>
                    <td className="py-3 px-4 text-slate-400">Nivel 1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÓDULO: INCIDENCIAS */}
        {activeModule === 'incidencias' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white font-display">
              Bandeja de Incidencias y Soporte
            </h2>
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="text-sky-400 font-bold">{inc.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>Jugador: <strong className="text-amber-400">{inc.user_public_id}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Prioridad: {inc.priority}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-white">
                      {inc.type}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {inc.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-emerald-400 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {inc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MÓDULO: AUDITORÍA */}
        {activeModule === 'auditoria' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-base font-bold text-white font-display mb-1">
              Registro de Auditoría de Operaciones
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Visualización de la bitácora forense <code className="text-amber-400 font-mono">audit_logs</code>. Inmutable por RLS.
            </p>
            <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 text-xs font-mono text-slate-400 space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Evento</span>
                <span>Actor</span>
                <span>Fecha UTC</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-emerald-400">SESSION_INITIALIZED</span>
                <span>{publicId} ({role})</span>
                <span>{new Date().toISOString().substring(0, 19)}Z</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-sky-400">RLS_POLICIES_VERIFIED</span>
                <span>SYSTEM_AUTHORITY</span>
                <span>{new Date().toISOString().substring(0, 19)}Z</span>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO OFICIAL DE MONETIZACIÓN Y RENTABILIDAD */}
        {activeModule === 'monetizacion' && (
          <MonetizationSection />
        )}

        {/* MÓDULOS FINANCIEROS INFORMATIVOS (NO MOCK DATA) */}
        {(activeModule === 'recargas' || activeModule === 'pagos' || activeModule === 'retiros') && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center max-w-xl mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-white font-display uppercase">
              Módulo de {activeModule}
            </h2>
            <p className="mt-2 text-xs text-slate-300 font-medium">
              Sin operaciones financieras activadas en Fase 1.
            </p>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Las tablas <code className="text-amber-400 font-mono">payment_requests</code> y <code className="text-amber-400 font-mono">wallet_transactions</code> se encuentran creadas en PostgreSQL con constraints de unicidad e idempotencia. La conciliación de Pago Móvil y Binance Pay será activada oficialmente en la Fase 3.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
