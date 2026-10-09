import React, { useState } from 'react';
import {
  Users,
  Shield,
  Layers,
  Calendar,
  FileText,
  Settings,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  XCircle,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { DrawStatus, UserRole } from '../../types/database.types';

// Validador de máquina de estados para sorteos (Server-Authoritative logic preview)
const VALID_DRAW_TRANSITIONS: Record<DrawStatus, DrawStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['READY', 'CANCELLED'],
  READY: ['ACTIVE', 'SCHEDULED', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'FINISHED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  FINISHED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const AdminDashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const [activeModule, setActiveModule] = useState<
    'usuarios' | 'roles' | 'modalidades' | 'sorteos' | 'auditoria' | 'configuracion' | 'seguridad'
  >('sorteos');

  // Estado de sorteos de demostración administrados
  const [draws, setDraws] = useState<
    { id: string; code: string; title: string; modality: string; status: DrawStatus; ballCount: number }[]
  >([
    {
      id: 'd-1',
      code: 'DRW-001',
      title: 'Sorteo Estelar Caracas',
      modality: 'BINGO_75',
      status: 'SCHEDULED',
      ballCount: 0,
    },
    {
      id: 'd-2',
      code: 'DRW-002',
      title: 'Tarde de Animalitos Llaneros',
      modality: 'ANIMALITOS',
      status: 'READY',
      ballCount: 0,
    },
    {
      id: 'd-3',
      code: 'DRW-003',
      title: 'Bingo 90 Bolas Express',
      modality: 'BINGO_90',
      status: 'DRAFT',
      ballCount: 0,
    },
  ]);

  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  const handleTransition = (drawId: string, targetStatus: DrawStatus) => {
    setDraws((prev) =>
      prev.map((d) => {
        if (d.id !== drawId) return d;
        const allowed = VALID_DRAW_TRANSITIONS[d.status];
        if (!allowed.includes(targetStatus)) {
          setTransitionMsg(`Transición rechazada por la máquina de estados: De ${d.status} a ${targetStatus} no es válida.`);
          return d;
        }
        setTransitionMsg(`Estado actualizado exitosamente de ${d.status} a ${targetStatus}.`);
        return { ...d, status: targetStatus };
      })
    );
  };

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/10 text-red-400 border border-red-500/30">
              ADMINISTRACIÓN CENTRAL
            </span>
            <span className="text-slate-400 text-xs">| Privilegios: {role}</span>
          </div>
          <h1 className="text-2xl font-black text-white">Panel de Administración</h1>
          <p className="text-xs text-slate-400">
            Control de máquina de estados, modalidades, RBAC y auditoría forense
          </p>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Autoridad del Sistema</span>
          <span className="text-xs font-mono font-bold text-emerald-400">SERVER-AUTHORITATIVE ON</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4 mb-6">
        {[
          { id: 'sorteos', label: 'Sorteos & Salas', icon: Calendar },
          { id: 'modalidades', label: 'Modalidades', icon: Layers },
          { id: 'usuarios', label: 'Usuarios', icon: Users },
          { id: 'roles', label: 'Roles & RBAC', icon: Shield },
          { id: 'auditoria', label: 'Auditoría', icon: FileText },
          { id: 'seguridad', label: 'Seguridad', icon: Lock },
          { id: 'configuracion', label: 'Configuración', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveModule(tab.id as typeof activeModule);
                setTransitionMsg(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {transitionMsg && (
        <div className="p-3 mb-6 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{transitionMsg}</span>
          <button onClick={() => setTransitionMsg(null)} className="text-slate-400 hover:text-white text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* Module 1: Sorteos & Máquina de Estados */}
      {activeModule === 'sorteos' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Máquina de Estados de Sorteos</h3>
              <p className="text-xs text-slate-400">
                Estados controlados unidireccionales: DRAFT → SCHEDULED → READY → ACTIVE ⇄ PAUSED → FINISHED → ARCHIVED
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Check constraint: <span className="text-amber-400">draw_status_enum</span>
            </div>
          </div>

          <div className="space-y-4">
            {draws.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-amber-400">{d.code}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400 font-semibold">{d.modality}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{d.title}</h4>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Estado actual:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                        d.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse'
                          : d.status === 'READY'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : d.status === 'SCHEDULED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : d.status === 'PAUSED'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                          : d.status === 'FINISHED'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>

                {/* State Machine Transition Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                  {d.status === 'DRAFT' && (
                    <button
                      onClick={() => handleTransition(d.id, 'SCHEDULED')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                    >
                      Programar (SCHEDULED)
                    </button>
                  )}
                  {d.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleTransition(d.id, 'READY')}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg text-xs transition-colors"
                    >
                      Aperturar (READY)
                    </button>
                  )}
                  {d.status === 'READY' && (
                    <button
                      onClick={() => handleTransition(d.id, 'ACTIVE')}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> Iniciar (ACTIVE)
                    </button>
                  )}
                  {d.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleTransition(d.id, 'PAUSED')}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pausar
                      </button>
                      <button
                        onClick={() => handleTransition(d.id, 'FINISHED')}
                        className="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-lg text-xs transition-colors"
                      >
                        Finalizar
                      </button>
                    </>
                  )}
                  {d.status === 'PAUSED' && (
                    <button
                      onClick={() => handleTransition(d.id, 'ACTIVE')}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                    >
                      Reanudar
                    </button>
                  )}
                  {['DRAFT', 'SCHEDULED', 'READY', 'ACTIVE', 'PAUSED'].includes(d.status) && (
                    <button
                      onClick={() => handleTransition(d.id, 'CANCELLED')}
                      className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancelar
                    </button>
                  )}
                  {['FINISHED', 'CANCELLED'].includes(d.status) && (
                    <button
                      onClick={() => handleTransition(d.id, 'ARCHIVED')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module 2: Modalidades */}
      {activeModule === 'modalidades' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Configuración de Modalidades Oficiales</h3>
            <p className="text-xs text-slate-400">
              Reglas de cuadrícula y límites de extracción registrados en la tabla game_modalities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">BINGO_75</span>
                <span className="text-amber-400 font-mono">5x5 (Centro Libre)</span>
              </div>
              <p className="text-slate-400">75 balotas. 24 números por cartón. Casilla central libre.</p>
              <div className="pt-2 text-[11px] text-slate-500">Patrones: Líneas, Diagonales, Esquinas, Pleno.</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">BINGO_90</span>
                <span className="text-amber-400 font-mono">3x5 (15 números)</span>
              </div>
              <p className="text-slate-400">90 balotas. Formato europeo y latinoamericano dinámico.</p>
              <div className="pt-2 text-[11px] text-slate-500">Patrones: Una línea, Dos líneas, Bingo completo.</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">ANIMALITOS</span>
                <span className="text-amber-400 font-mono">5x5 (Centro Libre)</span>
              </div>
              <p className="text-slate-400">Ruleta tradicional venezolana de figuras autóctonas.</p>
              <div className="pt-2 text-[11px] text-slate-500">Patrones: Línea, Cruz, Cuatro esquinas, Tablita llena.</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">CHAPITAS</span>
                <span className="text-amber-400 font-mono">3x5 (Dinámica Rápida)</span>
              </div>
              <p className="text-slate-400">60 balotas. Rotación veloz comunitaria.</p>
              <div className="pt-2 text-[11px] text-slate-500">Patrones: Línea express, Chapita plena.</div>
            </div>
          </div>
        </div>
      )}

      {/* Module 3: Usuarios */}
      {activeModule === 'usuarios' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Administración de Cuentas</h3>
            <p className="text-xs text-slate-400">
              Supervisión de perfiles y estados de aislamiento
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-white">Regla de Seguridad:</p>
            <p className="text-slate-400">
              Los jugadores (PLAYER) tienen revocado el permiso de UPDATE sobre las columnas <span className="font-mono text-amber-400">role</span> y <span className="font-mono text-amber-400">status</span> en PostgreSQL mediante el trigger de seguridad <span className="font-mono text-amber-400">check_profile_security</span>.
            </p>
          </div>
        </div>
      )}

      {/* Module 4: Roles & RBAC */}
      {activeModule === 'roles' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Matriz RBAC (Role-Based Access Control)</h3>
            <p className="text-xs text-slate-400">
              Jerarquía de privilegios de 5 niveles verificada exclusivamente en el servidor
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Rol</th>
                  <th className="py-2.5 px-3">Nivel</th>
                  <th className="py-2.5 px-3">Alcance</th>
                  <th className="py-2.5 px-3">Acceso a Caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">PLAYER</td>
                  <td className="py-2.5 px-3 font-mono">1</td>
                  <td className="py-2.5 px-3 text-slate-300">Juego en salas, cartones propios, perfil no sensible.</td>
                  <td className="py-2.5 px-3 text-red-400 font-bold">DENEGADO</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-amber-400">OPERATOR</td>
                  <td className="py-2.5 px-3 font-mono">2</td>
                  <td className="py-2.5 px-3 text-slate-300">Asistencia, verificación técnica de cartón, incidencias.</td>
                  <td className="py-2.5 px-3 text-red-400 font-bold">DENEGADO (Fase 1)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-blue-400">SUPERVISOR</td>
                  <td className="py-2.5 px-3 font-mono">3</td>
                  <td className="py-2.5 px-3 text-slate-300">Control operativo de salas y lectura de auditorías.</td>
                  <td className="py-2.5 px-3 text-red-400 font-bold">DENEGADO (Fase 1)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-red-400">ADMIN</td>
                  <td className="py-2.5 px-3 font-mono">4</td>
                  <td className="py-2.5 px-3 text-slate-300">Gestión de salas, modalidades y máquina de estados.</td>
                  <td className="py-2.5 px-3 text-red-400 font-bold">DENEGADO (Fase 1)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-purple-400">SUPER_ADMIN</td>
                  <td className="py-2.5 px-3 font-mono">5</td>
                  <td className="py-2.5 px-3 text-slate-300">Control maestro, asignación de roles y parámetros críticos.</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">AUDITORÍA EXCLUSIVA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Module 5: Auditoría */}
      {activeModule === 'auditoria' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Bitácora Forense (audit_logs)</h3>
            <p className="text-xs text-slate-400">
              Registro inmutable en PostgreSQL. Prohibido UPDATE y DELETE mediante RLS.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-amber-400 font-bold">AUTH_SESSION_VERIFIED</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Actor: {role} • Entidad: auth.users</p>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">Inmutable</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-blue-400 font-bold">SCHEMA_VALIDATION_PASSED</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Actor: SYSTEM • RLS 100% verificado</p>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">Inmutable</span>
            </div>
          </div>
        </div>
      )}

      {/* Module 6: Seguridad */}
      {activeModule === 'seguridad' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Políticas de Seguridad Activas</h3>
            <p className="text-xs text-slate-400">Controles de integridad del motor</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="font-bold text-amber-400">✓ Protección Anti-Elevación</span>
              <p className="text-slate-400">
                Trigger PostgreSQL previene que un atacante altere su columna de rol mediante inyección en el payload REST.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="font-bold text-amber-400">✓ Idempotencia Forzada</span>
              <p className="text-slate-400">
                Constraint UNIQUE en idempotency_key de transacciones para prevenir replay de peticiones en red.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Module 7: Configuración */}
      {activeModule === 'configuracion' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Parámetros Globales (app_settings)</h3>
            <p className="text-xs text-slate-400">
              Metadatos del sistema y estado de fase
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
            <p>&quot;platform_name&quot;: &quot;Bingo Club Vnzla Online&quot;</p>
            <p>&quot;phase&quot;: &quot;1 - FUNDACION_PROFESIONAL&quot;</p>
            <p>&quot;real_money_active&quot;: false</p>
            <p>&quot;server_authoritative&quot;: true</p>
          </div>
        </div>
      )}
    </div>
  );
};
