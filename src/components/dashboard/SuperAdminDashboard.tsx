// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PANEL SUPER_ADMIN DEDICADO (FASE 2.9)
// Identidad oficial: v19629049@gmail.com — Máxima Jerarquía y Control de Roles
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldAlert,
  Users,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  Sliders,
  FileText,
  Activity,
  UserX,
  UserCheck
} from 'lucide-react';
import type { UserProfile, UserRole, UserStatus, AuditLogEntry } from '../../types/database';
import {
  OFFICIAL_ADMIN_IDENTITIES,
  hasSufficientRole,
  canRoleAssignTargetRole
} from '../../lib/adminIdentities';
import {
  syncOfficialAdminIdentities,
  fetchAllUsers,
  fetchFullAuditLogs,
  executeAdminChangeRole,
  executeAdminToggleStatus,
  type OfficialIdentityReport
} from '../../services/adminService';
import { StepUpAuthModal } from '../mfa/StepUpAuthModal';
import type { StepUpAuthorizationToken } from '../../types/mfa';

interface SuperAdminDashboardProps {
  onEnterLiveRoom?: (modalityId: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = () => {
  const { user, profile, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'identities' | 'audit' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Datos
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [identityReport, setIdentityReport] = useState<OfficialIdentityReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Step-Up Modal para acciones críticas
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpAction, setStepUpAction] = useState<any>('CHANGE_USER_ROLE');
  const [pendingCallback, setPendingCallback] = useState<((token: StepUpAuthorizationToken) => Promise<void>) | null>(null);

  // Formulario de asignación de roles
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>('PLAYER');

  const loadData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [identitiesRes, usersRes, auditRes] = await Promise.all([
        syncOfficialAdminIdentities(),
        fetchAllUsers(50),
        fetchFullAuditLogs(50),
      ]);

      if (identitiesRes.success && identitiesRes.report) {
        setIdentityReport(identitiesRes.report);
      }
      if (usersRes.success) {
        setUsers(usersRes.users);
      }
      if (auditRes.success) {
        setAuditLogs(auditRes.logs);
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error al sincronizar datos administrativos con Supabase.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerCriticalAction = (
    actionName: any,
    callback: (token: StepUpAuthorizationToken) => Promise<void>
  ) => {
    setStepUpAction(actionName);
    setPendingCallback(() => callback);
    setStepUpOpen(true);
  };

  const handleStepUpSuccess = async (token: StepUpAuthorizationToken) => {
    setStepUpOpen(false);
    if (pendingCallback) {
      try {
        setLoading(true);
        await pendingCallback(token);
        await loadData();
      } catch (err: any) {
        setFeedback({ type: 'error', text: err?.message || 'Error al ejecutar acción crítica.' });
      } finally {
        setLoading(false);
        setPendingCallback(null);
      }
    }
  };

  const handleChangeRoleSubmit = (targetUser: UserProfile, newRole: UserRole) => {
    if (targetUser.id === user?.id) {
      alert('Violación de seguridad: No puede alterar su propio rol.');
      return;
    }
    if (!canRoleAssignTargetRole(role, newRole)) {
      alert(`Privilegios insuficientes: El rol ${role} no puede otorgar ${newRole}.`);
      return;
    }

    triggerCriticalAction('CHANGE_USER_ROLE', async (token) => {
      const res = await executeAdminChangeRole(token.authorization_id, targetUser.id, newRole);
      if (res.success) {
        setFeedback({ type: 'success', text: `Rol de usuario ${targetUser.public_id} modificado a ${newRole} exitosamente.` });
        setSelectedUser(null);
      } else {
        setFeedback({ type: 'error', text: res.error || 'Error al modificar rol.' });
      }
    });
  };

  const handleToggleUserStatus = (targetUser: UserProfile, newStatus: UserStatus) => {
    if (targetUser.id === user?.id) {
      alert('Violación de seguridad: No puede bloquear su propia cuenta.');
      return;
    }

    triggerCriticalAction('UPDATE_FINANCIAL_SETTINGS', async (token) => {
      const res = await executeAdminToggleStatus(
        token.authorization_id,
        targetUser.id,
        newStatus,
        `Acción ejecutada por SUPER_ADMIN (${user?.email})`
      );
      if (res.success) {
        setFeedback({ type: 'success', text: `Estado del usuario ${targetUser.public_id} actualizado a ${newStatus}.` });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Error al modificar estado.' });
      }
    });
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      (u.public_id && u.public_id.toLowerCase().includes(term)) ||
      (u.display_name && u.display_name.toLowerCase().includes(term)) ||
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ENCABEZADO SUPER_ADMIN */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <ShieldAlert className="h-4 w-4" />
              <span>Consola Suprema de Seguridad & RBAC (Fase 2.9)</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white font-display">
              Panel de SUPER_ADMIN
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <span>Operador Oficial: <strong className="text-rose-400">{user?.email || OFFICIAL_ADMIN_IDENTITIES.SUPER_ADMIN}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Nivel Jerárquico: <strong className="text-white">SUPER_ADMIN (Nivel 50)</strong></span>
              <span aria-hidden="true">·</span>
              <span>Protección Server-Side: <strong className="text-emerald-400">ENFORCED</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />}
            <div>{feedback.text}</div>
          </div>
        )}

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Dashboard General', icon: Activity },
            { id: 'identities', label: 'Identidades Oficiales', icon: ShieldCheck },
            { id: 'users', label: 'Gestión de Usuarios & Roles', icon: Users },
            { id: 'audit', label: 'Auditoría Forense Inmutable', icon: FileText },
            { id: 'settings', label: 'Configuración del Sistema', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  active
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Total Usuarios Registrados</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">{users.length}</div>
                <div className="text-[11px] text-emerald-400 mt-1">Con perfiles en PostgreSQL</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Identidades Oficiales</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">3 Cuentas</div>
                <div className="text-[11px] text-slate-500 mt-1">SUPER_ADMIN, ADMIN, OPERATOR</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Registros de Auditoría</div>
                <div className="text-2xl font-bold font-mono text-sky-400 mt-1">{auditLogs.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">Bitácora forense inmutable</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Motor de Seguridad</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">AAL2 + MFA</div>
                <div className="text-[11px] text-slate-500 mt-1">Step-Up RFC 6238 Server-Side</div>
              </div>
            </div>

            {/* MONITOREO DE IDENTIDADES OFICIALES */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
                <span>Estado de las Identidades Administrativas Canónicas</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Estas cuentas reciben y protegen de forma exclusiva los roles operativos de la plataforma.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* SUPER_ADMIN */}
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-400 font-mono">SUPER_ADMIN</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                      Nivel 50
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white break-all">{OFFICIAL_ADMIN_IDENTITIES.SUPER_ADMIN}</div>
                  <div className="mt-3 text-[11px] font-mono flex items-center gap-1.5 text-slate-400">
                    <span>Estado:</span>
                    <span className={identityReport?.SUPER_ADMIN?.status === 'ACTIVE' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {identityReport?.SUPER_ADMIN?.status || 'VERIFICANDO...'}
                    </span>
                  </div>
                </div>

                {/* ADMIN */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400 font-mono">ADMIN</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      Nivel 40
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white break-all">{OFFICIAL_ADMIN_IDENTITIES.ADMIN}</div>
                  <div className="mt-3 text-[11px] font-mono flex items-center gap-1.5 text-slate-400">
                    <span>Estado:</span>
                    <span className={identityReport?.ADMIN?.status === 'ACTIVE' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {identityReport?.ADMIN?.status || 'VERIFICANDO...'}
                    </span>
                  </div>
                </div>

                {/* OPERATOR */}
                <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-400 font-mono">OPERATOR</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                      Nivel 20
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white break-all">{OFFICIAL_ADMIN_IDENTITIES.OPERATOR}</div>
                  <div className="mt-3 text-[11px] font-mono flex items-center gap-1.5 text-slate-400">
                    <span>Estado:</span>
                    <span className={identityReport?.OPERATOR?.status === 'ACTIVE' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {identityReport?.OPERATOR?.status || 'VERIFICANDO...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IDENTIDADES OFICIALES DETALLADAS */}
        {activeTab === 'identities' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
            <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              <span>Matriz Canónica de Identidades y Cuentas Oficiales</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              De acuerdo a la especificación de la Fase 2.9, estas cuentas están blindadas por código y migraciones de PostgreSQL.
              El servidor rechaza cualquier intento de auto-elevación o creación de administradores adicionales sin Step-Up de SUPER_ADMIN.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4">Correo Canónico</th>
                    <th className="py-3 px-4">Jerarquía</th>
                    <th className="py-3 px-4">Estado en Supabase Auth</th>
                    <th className="py-3 px-4">Protección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-rose-400">SUPER_ADMIN</td>
                    <td className="py-3.5 px-4 text-white font-sans">{OFFICIAL_ADMIN_IDENTITIES.SUPER_ADMIN}</td>
                    <td className="py-3.5 px-4 text-slate-300">Nivel 50 (Máxima)</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        identityReport?.SUPER_ADMIN?.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      }`}>
                        {identityReport?.SUPER_ADMIN?.status || 'ADMIN_IDENTITY_PENDING'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400">Inmutable</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-amber-400">ADMIN</td>
                    <td className="py-3.5 px-4 text-white font-sans">{OFFICIAL_ADMIN_IDENTITIES.ADMIN}</td>
                    <td className="py-3.5 px-4 text-slate-300">Nivel 40</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        identityReport?.ADMIN?.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      }`}>
                        {identityReport?.ADMIN?.status || 'ADMIN_IDENTITY_PENDING'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">MFA Obligatorio</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-sky-400">OPERATOR</td>
                    <td className="py-3.5 px-4 text-white font-sans">{OFFICIAL_ADMIN_IDENTITIES.OPERATOR}</td>
                    <td className="py-3.5 px-4 text-slate-300">Nivel 20</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        identityReport?.OPERATOR?.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      }`}>
                        {identityReport?.OPERATOR?.status || 'ADMIN_IDENTITY_PENDING'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">MFA Obligatorio</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: GESTIÓN DE USUARIOS Y ROLES */}
        {activeTab === 'users' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  <span>Control RBAC y Gestión de Usuarios</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Asignación autoritativa de roles y modificación de estado con confirmación Step-Up (CRITICAL).
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por ID, nombre o rol..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* TABLA DE USUARIOS */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ID Público</th>
                    <th className="py-3 px-4">Nombre / Alias</th>
                    <th className="py-3 px-4">Rol RBAC</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Seguridad</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredUsers.map((u) => {
                    const isSuper = u.role === 'SUPER_ADMIN';
                    return (
                      <tr key={u.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-amber-400">{u.public_id}</td>
                        <td className="py-3 px-4 font-sans text-slate-200">
                          {u.display_name || u.full_name || 'Sin nombre'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                              : u.role === 'ADMIN'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : u.role === 'OPERATOR'
                              ? 'bg-sky-950/60 text-sky-400 border border-sky-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          Nivel {u.security_level || 1}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isSuper && u.id !== user?.id ? (
                            <div className="flex items-center justify-end gap-2">
                              {/* Asignar Rol */}
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setTargetRole(u.role);
                                }}
                                className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                              >
                                Asignar Rol
                              </button>
                              {/* Bloquear / Desbloquear */}
                              {u.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleToggleUserStatus(u, 'BLOCKED')}
                                  className="p-1 rounded text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  title="Bloquear usuario"
                                >
                                  <UserX className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserStatus(u, 'ACTIVE')}
                                  className="p-1 rounded text-emerald-400 hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                  title="Desbloquear usuario"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Inmutable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MODAL / FORMULARIO FLOTANTE DE CAMBIO DE ROL */}
            {selectedUser && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    <span>Modificar Rol de {selectedUser.public_id} ({selectedUser.display_name})</span>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as UserRole)}
                    className="rounded-lg border border-slate-700 bg-slate-900 py-2 px-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="PLAYER">PLAYER (Jugador Estándar)</option>
                    <option value="OPERATOR">OPERATOR (Operador de Sorteos)</option>
                    <option value="SUPERVISOR">SUPERVISOR (Supervisor de Operaciones)</option>
                    <option value="ADMIN">ADMIN (Administrador Operativo)</option>
                  </select>

                  <button
                    onClick={() => handleChangeRoleSubmit(selectedUser, targetRole)}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
                  >
                    CONFIRMAR CON STEP-UP
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDITORÍA INMUTABLE */}
        {activeTab === 'audit' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              <span>Bitácora Forense Inmutable (audit_logs)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Registros protegidos contra alteración y borrado conforme a las reglas de PostgreSQL.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Actor Rol</th>
                    <th className="py-3 px-4">Entidad</th>
                    <th className="py-3 px-4">Metadatos Sanitizados</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-4 text-slate-500">#{log.id}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{log.action}</td>
                      <td className="py-2.5 px-4">
                        <span className="text-amber-400">{log.actor_role}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{log.entity_type}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-mono max-w-xs truncate">
                        {JSON.stringify(log.metadata)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CONFIGURACIÓN DEL SISTEMA */}
        {activeTab === 'settings' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
            <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-400" />
              <span>Parámetros Operativos del Sistema</span>
            </h3>
            <p className="text-xs text-slate-400">
              Configuraciones activas en PostgreSQL bajo la tabla `public.app_settings`.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="text-amber-400 font-bold">DRAW ENGINE SERVER-AUTHORITATIVE</div>
                <div className="text-slate-400 text-[11px]">Algoritmo Permutación Fisher-Yates CSPRNG</div>
                <div className="text-emerald-400">ESTADO: ACTIVO & OPERATIVO</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="text-amber-400 font-bold">MFA STEP-UP CONFIGURATION</div>
                <div className="text-slate-400 text-[11px]">Estándar RFC 6238 TOTP (TTL 300s)</div>
                <div className="text-emerald-400">ESTADO: OBLIGATORIO PARA OPERADOR/ADMIN/SUPER_ADMIN</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL STEP-UP PARA ACCIONES CRÍTICAS DE SUPER_ADMIN */}
      <StepUpAuthModal
        isOpen={stepUpOpen}
        onClose={() => {
          setStepUpOpen(false);
          setPendingCallback(null);
        }}
        actionType={stepUpAction}
        onSuccess={handleStepUpSuccess}
      />
    </div>
  );
};
