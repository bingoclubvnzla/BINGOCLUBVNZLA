import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { canAccessAdminPanel, isValidDrawTransition } from '../lib/state-machine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StatusBadge } from '../components/StatusBadge';
import { UserProfile, UserRole, AuditLogEntry } from '../types/auth.types';
import { GameModality, Draw, DrawStatus } from '../types/game.types';
import { recordAuditLog } from '../lib/audit';
import {
  ShieldAlert,
  Users,
  Shield,
  Layers,
  Calendar,
  FileText,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { role, user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'users' | 'roles' | 'modalities' | 'draws' | 'audit' | 'settings' | 'security'
  >('users');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [modalitiesList, setModalitiesList] = useState<GameModality[]>([]);
  const [drawsList, setDrawsList] = useState<Draw[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isAdmin = canAccessAdminPanel(role);

  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured) return;
    loadAdminData();
  }, [isAdmin, activeTab]);


  const loadAdminData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      if (activeTab === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
        if (data) setUsersList(data as UserProfile[]);
      } else if (activeTab === 'modalities') {
        const { data } = await supabase.from('game_modalities').select('*').order('name');
        if (data) setModalitiesList(data as GameModality[]);
      } else if (activeTab === 'draws') {
        const { data } = await supabase.from('draws').select('*').order('created_at', { ascending: false }).limit(50);
        if (data) setDrawsList(data as Draw[]);
      } else if (activeTab === 'audit') {
        const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
        if (data) setAuditLogs(data as AuditLogEntry[]);
      }
    } catch (err: any) {
      console.warn('Admin load notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: UserRole) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId);

      if (error) {
        setFeedback(`Error al actualizar rol: ${error.message}`);
        return;
      }

      await recordAuditLog({
        userId: user.id,
        actorRole: role,
        action: 'ADMIN_ROLE_UPDATED',
        entityType: 'PROFILE',
        entityId: targetUserId,
        metadata: { new_role: newRole },
      });

      setFeedback(`Rol actualizado exitosamente a ${newRole}`);
      loadAdminData();
    } catch (err: any) {
      setFeedback(`Excepción: ${err.message}`);
    }
  };

  const handleCreateTestDraw = async () => {
    if (!user) return;
    try {
      // Find BINGO_75 modality
      const { data: mod } = await supabase.from('game_modalities').select('id').eq('code', 'BINGO_75').single();
      const modalityId = mod?.id;

      // Find or create room
      let roomId = '';
      const { data: existingRoom } = await supabase.from('game_rooms').select('id').limit(1).maybeSingle();
      if (existingRoom) {
        roomId = existingRoom.id;
      } else if (modalityId) {
        const { data: newRoom } = await supabase.from('game_rooms').insert({
          slug: `sala-principal-${Date.now()}`,
          name: 'Sala Oficial de Pruebas',
          modality_id: modalityId,
        }).select('id').single();
        roomId = newRoom?.id || '';
      }

      if (!roomId || !modalityId) {
        setFeedback('Se requiere configurar primero la sala y modalidad en la base de datos.');
        return;
      }

      const drawCode = `DRW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { error } = await supabase.from('draws').insert({
        room_id: roomId,
        modality_id: modalityId,
        draw_code: drawCode,
        title: `Sorteo de Pruebas ${drawCode}`,
        status: 'SCHEDULED',
        scheduled_for: new Date(Date.now() + 3600000).toISOString(),
        created_by: user.id,
      });

      if (error) {
        setFeedback(`Error creando sorteo: ${error.message}`);
      } else {
        setFeedback(`Sorteo ${drawCode} programado con éxito.`);
        loadAdminData();
      }
    } catch (err: any) {
      setFeedback(`Excepción: ${err.message}`);
    }
  };

  const handleTransitionDraw = async (drawId: string, currentStatus: DrawStatus, targetStatus: DrawStatus) => {
    if (!isValidDrawTransition(currentStatus, targetStatus)) {
      setFeedback(`Transición inválida: No está permitido pasar de ${currentStatus} a ${targetStatus}.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('draws')
        .update({ status: targetStatus })
        .eq('id', drawId);

      if (error) {
        setFeedback(`Error en transición: ${error.message}`);
      } else {
        setFeedback(`Estado cambiado a ${targetStatus}.`);
        loadAdminData();
      }
    } catch (err: any) {
      setFeedback(`Excepción: ${err.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md p-6 bg-slate-900 border border-red-500/30 rounded-2xl text-center text-slate-200">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Acceso Restringido a Administradores</h2>
          <p className="text-xs text-slate-400 mt-2">
            Este panel requiere rol de ADMIN o SUPER_ADMIN. Su rol actual es <strong>{role}</strong>.
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

  const tabs = [
    { id: 'users', label: 'Usuarios & Perfiles', icon: Users },
    { id: 'roles', label: 'Matriz RBAC', icon: Shield },
    { id: 'modalities', label: 'Modalidades de Juego', icon: Layers },
    { id: 'draws', label: 'Sorteos & Máquina de Estados', icon: Calendar },
    { id: 'audit', label: 'Bitácora de Auditoría', icon: FileText },
    { id: 'settings', label: 'Configuración Global', icon: Sliders },
    { id: 'security', label: 'Auditoría de Seguridad RLS', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-white">Panel de Administración Central</h1>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Control de gobernanza, seguridad, perfiles y trazabilidad de Bingo Club Vnzla.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {feedback && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-bold ml-2">
              ×
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          {/* USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Perfiles de Usuarios Registrados</h3>
                <span className="text-xs text-slate-400">Total listados: {usersList.length}</span>
              </div>

              {usersList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No se encontraron usuarios en la tabla `profiles` o Supabase está pendiente de conexión.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-800 rounded-xl">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">ID Público</th>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Rol Actual</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Registrado</th>
                        <th className="p-3 text-right">Asignar Rol (Admin)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-amber-400 font-bold">{u.public_id}</td>
                          <td className="p-3 text-slate-200">{u.full_name}</td>
                          <td className="p-3">
                            <StatusBadge type="role" value={u.role} />
                          </td>
                          <td className="p-3">
                            <StatusBadge type="user_status" value={u.status} />
                          </td>
                          <td className="p-3 text-slate-400">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                              disabled={u.id === user?.id && role !== 'SUPER_ADMIN'}
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-amber-400"
                            >
                              <option value="PLAYER">PLAYER</option>
                              <option value="OPERATOR">OPERATOR</option>
                              <option value="SUPERVISOR">SUPERVISOR</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ROLES MATRIX */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Matriz de Roles y Control de Acceso (RBAC)</h3>
              <p className="text-xs text-slate-400">
                La jerarquía es evaluada por PostgreSQL y reglas de seguridad del sistema.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                {[
                  {
                    name: 'PLAYER',
                    level: 1,
                    desc: 'Participante en salas, consulta sus propios cartones, perfil e historial.',
                    color: 'border-blue-500/30',
                  },
                  {
                    name: 'OPERATOR',
                    level: 2,
                    desc: 'Supervisión de salas en vivo, monitoreo de estados de jugadores e incidencias.',
                    color: 'border-emerald-500/30',
                  },
                  {
                    name: 'SUPERVISOR',
                    level: 3,
                    desc: 'Auditoría de acciones operativas, lectura de logs de auditoría.',
                    color: 'border-purple-500/30',
                  },
                  {
                    name: 'ADMIN',
                    level: 4,
                    desc: 'Gestión de roles de usuarios, configuración de modalidades y creación de sorteos.',
                    color: 'border-amber-500/30',
                  },
                  {
                    name: 'SUPER_ADMIN',
                    level: 5,
                    desc: 'Control integral de gobernanza, políticas RLS y arquitectura crítica.',
                    color: 'border-red-500/30',
                  },
                ].map((r) => (
                  <div key={r.name} className={`p-4 rounded-xl bg-slate-950 border ${r.color} flex flex-col justify-between`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">{r.name}</span>
                        <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          Nvl {r.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODALITIES */}
          {activeTab === 'modalities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Modalidades Oficiales de Juego</h3>
                  <p className="text-xs text-slate-400">Registradas en la tabla `game_modalities`</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modalitiesList.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-amber-400 font-bold">{m.code}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Activo</span>
                    </div>
                    <h5 className="font-bold text-white text-sm mb-1">{m.name}</h5>
                    <p className="text-xs text-slate-400 mb-3">{m.description}</p>
                    <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-2 flex justify-between">
                      <span>Cuadrícula: {m.grid_rows}x{m.grid_cols}</span>
                      <span>Centro libre: {m.free_center ? 'SÍ' : 'NO'}</span>
                      <span>Rango: {m.number_min}-{m.number_max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DRAWS & STATE MACHINE */}
          {activeTab === 'draws' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Sorteos y Máquina de Estados</h3>
                  <p className="text-xs text-slate-400">
                    Transiciones controladas: DRAFT → SCHEDULED → READY → ACTIVE → PAUSED → FINISHED → ARCHIVED
                  </p>
                </div>
                <button
                  onClick={handleCreateTestDraw}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-lg text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Sorteo de Prueba</span>
                </button>
              </div>

              {drawsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No hay sorteos creados. Haz clic en &quot;Crear Sorteo de Prueba&quot; para registrar uno.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-800 rounded-xl">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Código</th>
                        <th className="p-3">Título</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Versión</th>
                        <th className="p-3 text-right">Transición de Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {drawsList.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-amber-400 font-bold">{d.draw_code}</td>
                          <td className="p-3 text-slate-200">{d.title}</td>
                          <td className="p-3">
                            <StatusBadge type="draw_status" value={d.status} />
                          </td>
                          <td className="p-3 text-slate-400 font-mono">v{d.version}</td>
                          <td className="p-3 text-right space-x-1">
                            {d.status === 'SCHEDULED' && (
                              <button
                                onClick={() => handleTransitionDraw(d.id, d.status, 'READY')}
                                className="px-2 py-1 bg-cyan-950 text-cyan-300 border border-cyan-700/50 rounded font-semibold text-[11px]"
                              >
                                Pasar a READY
                              </button>
                            )}
                            {d.status === 'READY' && (
                              <button
                                onClick={() => handleTransitionDraw(d.id, d.status, 'ACTIVE')}
                                className="px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded text-[11px]"
                              >
                                INICIAR (ACTIVE)
                              </button>
                            )}
                            {d.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleTransitionDraw(d.id, d.status, 'FINISHED')}
                                className="px-2 py-1 bg-purple-950 text-purple-300 border border-purple-700/50 rounded font-semibold text-[11px]"
                              >
                                Finalizar
                              </button>
                            )}
                            {['SCHEDULED', 'READY', 'ACTIVE'].includes(d.status) && (
                              <button
                                onClick={() => handleTransitionDraw(d.id, d.status, 'CANCELLED')}
                                className="px-2 py-1 bg-red-950 text-red-300 border border-red-700/50 rounded text-[11px]"
                              >
                                Cancelar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Bitácora Inmutable de Auditoría</h3>
              <p className="text-xs text-slate-400">
                Registros de seguridad almacenados en la tabla `audit_logs`
              </p>

              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No hay registros de auditoría aún.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-800 rounded-xl">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Fecha UTC</th>
                        <th className="p-3">Acción</th>
                        <th className="p-3">Rol Actor</th>
                        <th className="p-3">Entidad</th>
                        <th className="p-3">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/60">
                          <td className="p-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-3 text-amber-400 font-bold">{log.action}</td>
                          <td className="p-3 text-slate-300">{log.actor_role}</td>
                          <td className="p-3 text-slate-400">{log.entity_type}</td>
                          <td className="p-3 text-slate-500 truncate max-w-xs">
                            {JSON.stringify(log.metadata || {})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Configuración del Sistema (app_settings)</h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="font-bold">PLATFORM_PHASE</span>
                  <span className="text-amber-400">FASE 1: FUNDACIÓN PROFESIONAL</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="font-bold">FINANCIALS_ENABLED</span>
                  <span className="text-red-400 font-bold">FALSE (Sin Dinero Real)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="font-bold">SERVER_AUTHORITATIVE</span>
                  <span className="text-emerald-400 font-bold">TRUE</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-bold">MAX_CARDS_DEFAULT</span>
                  <span className="text-slate-200">10 por jugador</span>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY AUDIT */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Auditoría de Políticas de Seguridad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="font-bold text-emerald-400 mb-2 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Row Level Security (RLS) Activo
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Todas las tablas sensibles (`profiles`, `wallets`, `cards`, `audit_logs`) tienen RLS habilitado.
                    Un jugador ordinario no puede consultar ni modificar datos de terceros.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="font-bold text-emerald-400 mb-2 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Protección Contra Escalada de Privilegios
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Trigger `protect_profile_updates` en PostgreSQL bloquea cualquier intento de alterar `role`, `status` o `security_level` directamente desde la API pública.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
