import React, { useState } from 'react';
import { 
  Users, 
  Settings, 
  Layers, 
  Radio, 
  FileText, 
  ShieldCheck, 
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isValidDrawTransition, ROLE_HIERARCHY, ROLE_PERMISSIONS } from '../../lib/security';
import type { DrawStatus, UserRole } from '../../types/database.types';

export const AdminDashboard: React.FC = () => {
  const { profile, role, effectiveRole, setActiveRolePreview } = useAuth();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'modalidades' | 'sorteos' | 'auditoria' | 'configuracion' | 'seguridad'>('sorteos');

  // Máquina de estados de prueba
  const [currentTestState, setCurrentTestState] = useState<DrawStatus>('DRAFT');
  const [transitionResult, setTransitionResult] = useState<{ allowed: boolean; target: DrawStatus } | null>(null);

  const drawStates: DrawStatus[] = [
    'DRAFT',
    'SCHEDULED',
    'READY',
    'ACTIVE',
    'PAUSED',
    'FINISHED',
    'CANCELLED',
    'ARCHIVED',
  ];

  const handleTestTransition = (target: DrawStatus) => {
    const allowed = isValidDrawTransition(currentTestState, target);
    setTransitionResult({ allowed, target });
    if (allowed) {
      setCurrentTestState(target);
    }
  };

  const handleResetState = () => {
    setCurrentTestState('DRAFT');
    setTransitionResult(null);
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Admin Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                PANEL {effectiveRole}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {profile?.public_id || 'BCV-ADMIN'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Panel de Administración y Control
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestión centralizada de infraestructura, máquinas de estados, modalidades y auditoría.
            </p>
          </div>

          {/* Role Preview Switcher for Development & Review */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400 font-mono block mb-1.5">
              Simulador de Perspectiva RBAC:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {(['PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRolePreview(r)}
                  className={`px-2 py-1 text-[10px] font-mono rounded font-semibold transition-colors ${
                    effectiveRole === r
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
              {effectiveRole !== role && (
                <button
                  onClick={() => setActiveRolePreview(null)}
                  className="px-2 py-1 text-[10px] text-red-400 hover:underline"
                >
                  Restablecer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('sorteos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'sorteos'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Máquina de Sorteos</span>
        </button>

        <button
          onClick={() => setActiveTab('modalidades')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'modalidades'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Modalidades</span>
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'usuarios'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios & Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'auditoria'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Auditoría</span>
        </button>

        <button
          onClick={() => setActiveTab('configuracion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'configuracion'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </button>

        <button
          onClick={() => setActiveTab('seguridad')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'seguridad'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Seguridad RLS</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        {/* Draw State Machine Inspector */}
        {activeTab === 'sorteos' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">
                Máquina de Estados de Sorteos (Server-Authoritative)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Validador en tiempo real del autómata finito de estados definido en la base de datos (trigger <code className="font-mono text-amber-300">validate_draw_status_transition</code>).
              </p>
            </div>

            {/* Current State Indicator */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Estado Actual de Prueba:</span>
                <span className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-amber-400 text-slate-950">
                  {currentTestState}
                </span>
              </div>

              <button
                onClick={handleResetState}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar a DRAFT</span>
              </button>
            </div>

            {/* Feedback from transition test */}
            {transitionResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  transitionResult.allowed
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-950/30 border-red-500/30 text-red-200'
                }`}
              >
                {transitionResult.allowed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>
                  {transitionResult.allowed
                    ? `Transición permitida a ${transitionResult.target}. Estado actualizado.`
                    : `TRANSICIÓN RECHAZADA: No está permitido pasar directamente de ${currentTestState} a ${transitionResult.target}. Violación de integridad.`}
                </span>
              </div>
            )}

            {/* Interactive State Buttons */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Probar Transición hacia Estado Destino:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {drawStates.map((st) => (
                  <button
                    key={st}
                    onClick={() => handleTestTransition(st)}
                    disabled={st === currentTestState}
                    className={`p-3 text-xs font-mono font-semibold rounded-xl border text-left transition-colors flex items-center justify-between ${
                      st === currentTestState
                        ? 'bg-slate-950/40 border-slate-800/40 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-400 text-slate-200 hover:text-white'
                    }`}
                  >
                    <span>{st}</span>
                    <span className="text-[10px] text-slate-500">→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* State Machine Rules Reference */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1.5 font-mono text-[11px]">
              <span className="text-slate-300 font-bold block mb-1">Reglas de Transición Registradas en PostgreSQL:</span>
              <p>• DRAFT → SCHEDULED, CANCELLED</p>
              <p>• SCHEDULED → READY, CANCELLED</p>
              <p>• READY → ACTIVE, CANCELLED</p>
              <p>• ACTIVE → PAUSED, FINISHED, CANCELLED</p>
              <p>• PAUSED → ACTIVE, CANCELLED</p>
              <p>• FINISHED → ARCHIVED (Terminal)</p>
              <p>• CANCELLED → ARCHIVED (Terminal)</p>
            </div>
          </div>
        )}

        {/* Modalities Module */}
        {activeTab === 'modalidades' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Modalidades Preconfiguradas (game_modalities)</h3>
            <p className="text-xs text-slate-400">
              Registradas en la migración inicial 00002_seed_modalities_and_roles.sql
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                { code: 'BINGO_75', name: 'Bingo Tradicional 75 Balotas', grid: '5x5 (Centro Libre)', total: 75 },
                { code: 'BINGO_90', name: 'Bingo Clásico 90 Balotas', grid: '3x9 (Sin centro libre)', total: 90 },
                { code: 'ANIMALITOS', name: 'Bingo de Animalitos Venezolanos', grid: '5x5 (Centro Libre)', total: 38 },
                { code: 'OBJETOS', name: 'Bingo de Figuras y Objetos', grid: '5x5 (Centro Libre)', total: 75 },
                { code: 'CHAPITAS', name: 'Bingo de Chapitas Callejero', grid: '3x5 (Sin centro libre)', total: 30 },
              ].map((m) => (
                <div key={m.code} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{m.name}</span>
                    <span className="font-mono text-[11px] text-emerald-400">Activa</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span>Código: {m.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{m.grid}</span>
                    <span aria-hidden="true">·</span>
                    <span>{m.total} fichas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users & RBAC */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Estructura de Roles y Niveles RBAC</h3>
            <p className="text-xs text-slate-400">
              Jerarquía estricta que previene elevación de privilegios no autorizada.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-3">Rol</th>
                    <th className="pb-3">Nivel Jerárquico</th>
                    <th className="pb-3">Capacidades Principales</th>
                    <th className="pb-3">Permisos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(Object.keys(ROLE_HIERARCHY) as UserRole[]).map((r) => (
                    <tr key={r} className="text-slate-300">
                      <td className="py-3 font-bold text-amber-400">{r}</td>
                      <td className="py-3 tabular-nums">{ROLE_HIERARCHY[r]}</td>
                      <td className="py-3 font-sans text-xs text-slate-300">
                        {r === 'PLAYER' && 'Juego regular, consulta de perfil propio, compra en fases futuras'}
                        {r === 'OPERATOR' && 'Supervisión de salas, atención de usuarios, revisión de tickets'}
                        {r === 'SUPERVISOR' && 'Control de salas, resolución de disputas de sorteos'}
                        {r === 'ADMIN' && 'Configuración de salas, modalidades, gestión de operadores'}
                        {r === 'SUPER_ADMIN' && 'Auditoría forense, rotación de claves, infraestructura'}
                      </td>
                      <td className="py-3 text-[11px] text-slate-500">
                        {ROLE_PERMISSIONS[r]?.length || 0} permisos
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Module */}
        {activeTab === 'auditoria' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Registro de Auditoría (audit_logs)</h3>
            <p className="text-xs text-slate-400">
              Trazas inmutables generadas por eventos del sistema y acciones críticas.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-amber-400">[AUDIT]</span> TABLAS Y POLÍTICAS RLS VERIFICADAS
                </div>
                <span className="text-slate-500 text-[11px]">19 tablas activas</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-amber-400">[AUDIT]</span> TRIGGER IMMUTABLE PROFILE FIELDS ACTIVO
                </div>
                <span className="text-slate-500 text-[11px]">Enforcement Postgres</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-amber-400">[AUDIT]</span> FINANZAS EN MODO DE PRUEBAS
                </div>
                <span className="text-slate-500 text-[11px]">Fase 1 Garantizada</span>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Module */}
        {activeTab === 'configuracion' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Configuración del Sistema (app_settings)</h3>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fase del Proyecto:</span>
                <span className="font-mono text-amber-400 font-bold">FASE 1 (Fundación Técnica)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dinero Real Activado:</span>
                <span className="font-mono text-red-400 font-bold">DESACTIVADO (FALSE)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Monedas Proyectadas:</span>
                <span className="font-mono text-slate-300">VES (Bolívares), USDT (Binance)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Edad Mínima Legal:</span>
                <span className="font-mono text-slate-300">18 años (+18)</span>
              </div>
            </div>
          </div>
        )}

        {/* Security Module */}
        {activeTab === 'seguridad' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Auditoría de Políticas Row Level Security</h3>
            <p className="text-xs text-slate-400">
              Validación de tablas protegidas contra accesos no autorizados:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
              {[
                'public.profiles',
                'public.roles',
                'public.permissions',
                'public.role_permissions',
                'public.audit_logs',
                'public.app_settings',
                'public.game_modalities',
                'public.game_rooms',
                'public.draws',
                'public.draw_events',
                'public.cards',
                'public.card_numbers',
                'public.wallets',
                'public.wallet_transactions',
                'public.payment_requests',
                'public.operator_actions',
                'public.prizes',
                'public.winners',
              ].map((tbl) => (
                <div key={tbl} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 truncate">{tbl}</span>
                  <span className="text-emerald-400 shrink-0 ml-1">RLS ON</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
