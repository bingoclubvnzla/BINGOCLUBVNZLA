import React, { useState } from 'react';
import {
  User as UserIcon,
  Ticket,
  Calendar,
  History,
  Shield,
  Lock,
  LogOut,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Wallet as WalletIcon,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PlayerDashboard: React.FC = () => {
  const { user, profile, role, signOut, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'sorteos' | 'cartones' | 'historial' | 'perfil' | 'seguridad'>('sorteos');

  const [copiedCode, setCopiedCode] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const copyPublicCode = () => {
    if (profile?.public_code) {
      navigator.clipboard.writeText(profile.public_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!displayName || displayName.trim().length < 3) {
      setProfileMsg({ type: 'error', text: 'El nombre de jugador debe tener al menos 3 caracteres.' });
      return;
    }

    setSaving(true);
    const res = await updateProfile({
      displayName: displayName.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
    });
    setSaving(false);

    if (res.success) {
      setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente.' });
      setEditingProfile(false);
    } else {
      setProfileMsg({ type: 'error', text: res.error || 'Error al guardar cambios.' });
    }
  };

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Profile Summary Bar */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-2xl">
              {profile?.display_name?.charAt(0).toUpperCase() || 'J'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white">{profile?.display_name || 'Jugador'}</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {profile?.status || 'ACTIVE'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 font-mono">
                <span>Código Público:</span>
                <span className="font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {profile?.public_code || 'BCV-000000'}
                </span>
                <button
                  onClick={copyPublicCode}
                  className="p-1 hover:text-white transition-colors"
                  title="Copiar código público"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
              <span>•</span>
              <span>Rol: <strong className="text-white">{role}</strong></span>
            </div>
          </div>
        </div>

        {/* Financial Status Box - Strict Rule 18 & 27 Compliance */}
        <div className="w-full md:w-auto p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <WalletIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Billetera Digital
            </span>
            <span className="text-xs font-bold text-amber-400 block">
              Función financiera próximamente disponible.
            </span>
            <span className="text-[10px] text-slate-500 block">
              Fase 1: Modo de Pruebas (Sin dinero real)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4 mb-6">
        <button
          onClick={() => setActiveTab('sorteos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sorteos'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Mis Sorteos</span>
        </button>

        <button
          onClick={() => setActiveTab('cartones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'cartones'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Mis Cartones</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'historial'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'perfil'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Perfil</span>
        </button>

        <button
          onClick={() => setActiveTab('seguridad')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'seguridad'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Seguridad</span>
        </button>

        <button
          onClick={signOut}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Tab 1: Mis Sorteos */}
      {activeTab === 'sorteos' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Sorteos Programados de Demostración</h3>
                <p className="text-xs text-slate-400">Salas de juego activas bajo máquina de estados server-authoritative</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono">
                Máquina de Estados: ACTIVA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      SALA-CARACAS-01
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      SCHEDULED
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Bingo Tradicional 75</h4>
                  <p className="text-xs text-slate-400 mt-1">Sorteo Estelar Diario (5x5 centro libre)</p>
                  <div className="mt-3 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Inicio programado: 20:00 VET</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                  Transmisión de balotas vía Supabase Realtime
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      SALA-MARACAIBO-02
                    </span>
                    <span className="text-[11px] font-bold text-blue-400">
                      READY
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Bingo Animalitos Vnzla</h4>
                  <p className="text-xs text-slate-400 mt-1">Edición especial con figuras populares</p>
                  <div className="mt-3 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Inicio programado: 21:00 VET</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                  Validación matemática atómica en PostgreSQL
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      SALA-VALENCIA-03
                    </span>
                    <span className="text-[11px] font-bold text-purple-400">
                      DRAFT
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">Chapitas Rápido (3x5)</h4>
                  <p className="text-xs text-slate-400 mt-1">Modalidad express de 15 números</p>
                  <div className="mt-3 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Próxima apertura</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                  Configuración de sala en revisión por operador
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Mis Cartones */}
      {activeTab === 'cartones' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Mis Cartones Registrados</h3>
              <p className="text-xs text-slate-400">
                Cartones generados por el servidor y asignados exclusivamente a tu identificador {profile?.public_code}
              </p>
            </div>
          </div>

          <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800/80 max-w-lg mx-auto">
            <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="font-bold text-white text-sm">Sin cartones activos en este momento</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              En esta Fase 1, la adquisición y reserva de cartones con pasarela financiera se encuentra protegida. Los cartones de prueba estarán disponibles al aperturar las salas piloto en Fase 2.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Historial */}
      {activeTab === 'historial' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="mb-6">
            <h3 className="text-base font-bold text-white">Historial de Actividad</h3>
            <p className="text-xs text-slate-400">
              Registro trazable de eventos y participaciones de tu cuenta
            </p>
          </div>

          <div className="divide-y divide-slate-800">
            <div className="py-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-white">Registro e Identidad Asignada</p>
                  <p className="text-[11px] text-slate-400">Asignación de código {profile?.public_code}</p>
                </div>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Hoy'}
              </span>
            </div>

            <div className="py-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <p className="font-bold text-white">Sesión Autenticada Segura</p>
                  <p className="text-[11px] text-slate-400">Supabase Auth JWT verificado</p>
                </div>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">En curso</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Perfil */}
      {activeTab === 'perfil' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Perfil de Jugador</h3>
              <p className="text-xs text-slate-400">
                Información de tu cuenta. Tu correo y datos sensibles no se exponen públicamente.
              </p>
            </div>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors"
              >
                Editar Perfil
              </button>
            )}
          </div>

          {profileMsg && (
            <div
              className={`p-3 rounded-xl mb-4 flex items-center gap-2 text-xs ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {editingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre o Apodo de Jugador</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo (Privado)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Teléfono Móvil (Privado)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+58 412 1234567"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Código Público:</span>
                <span className="font-mono font-bold text-amber-400">{profile?.public_code}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Nombre de Jugador:</span>
                <span className="font-bold text-white">{profile?.display_name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Correo Registrado:</span>
                <span className="font-mono text-slate-300">{user?.email || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Nombre Completo:</span>
                <span className="text-white">{profile?.full_name || 'No configurado'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Teléfono:</span>
                <span className="text-white">{profile?.phone || 'No configurado'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Rol del Sistema:</span>
                <span className="font-bold text-amber-400">{profile?.role}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Seguridad */}
      {activeTab === 'seguridad' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-2xl space-y-4">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Parámetros de Seguridad de la Cuenta</h3>
            <p className="text-xs text-slate-400">
              Gobernanza de accesos, protección de identidad y auditoría
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-white">Protección Inmutable de Privilegios</h4>
              <p className="text-slate-400 mt-1">
                Tu rol de usuario está protegido en PostgreSQL mediante triggers de seguridad. Ningún usuario puede elevar sus propios privilegios a través de la interfaz.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-white">Identidad Anónima Protegida</h4>
              <p className="text-slate-400 mt-1">
                Tu identificador público <strong className="text-amber-400 font-mono">{profile?.public_code}</strong> previene que tu correo sea conocido por otros jugadores durante las partidas.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-white">Sesión Autenticada</h4>
              <p className="text-slate-400 mt-1">
                La sesión activa expira automáticamente y cuenta con refresco criptográfico seguro.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
