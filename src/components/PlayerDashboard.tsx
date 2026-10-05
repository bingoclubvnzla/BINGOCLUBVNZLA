// ==============================================================================
// BINGO CLUB VNZLA ONLINE — DASHBOARD DEL JUGADOR (PLAYER)
// Principio: NO mostrar saldo ficticio. "Función financiera próximamente disponible."
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFallbackModalities } from '../lib/supabase';
import type { GameModality } from '../types/database';
import {
  Wallet,
  Grid3X3,
  History,
  User,
  Shield,
  LogOut,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Layers,
  Dices,
  ExternalLink
} from 'lucide-react';

interface PlayerDashboardProps {
  onEnterLiveRoom?: (modalityId: string) => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ onEnterLiveRoom }) => {
  const { user, profile, publicId, role, signOut, updateProfileDetails, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'sorteos' | 'cartones' | 'historial' | 'perfil' | 'seguridad'>('sorteos');

  // Formulario de edición de perfil
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const modalities = getFallbackModalities();

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setFeedbackMsg(null);

    const res = await updateProfileDetails({
      full_name: fullName.trim(),
      display_name: displayName.trim(),
      phone: phone.trim(),
    });

    setSaveLoading(false);
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: 'Perfil actualizado exitosamente en el servidor.' });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Error al actualizar perfil.' });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSaveLoading(true);
    const res = await resetPassword(user.email);
    setSaveLoading(false);
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: `Correo de restablecimiento enviado a ${user.email}` });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Error al solicitar cambio de clave.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO DEL JUGADOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <span>Panel de Jugador</span>
              <span aria-hidden="true">·</span>
              <span>Bingo Club Venezuela</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white font-display">
              Bienvenido, {profile?.display_name || 'Jugador'}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>ID Público: <strong className="text-amber-400 font-semibold">{publicId}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Rol: <strong className="text-slate-200">{role}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Estado: <span className="text-emerald-400">Activo</span></span>
            </div>
          </div>

          {/* MÓDULO DE BILLETERA (REQUISITO: NO MOSTRAR SALDO FICTICIO) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:w-80 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Wallet className="h-4 w-4 text-amber-400" />
                Billetera Digital
              </span>
              <span className="text-[11px] text-amber-500 font-mono">Fase 1</span>
            </div>
            {/* Mensaje obligatorio requerido por el prompt maestro */}
            <div className="mt-2 py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="text-amber-300/90 font-medium block">
                Función financiera próximamente disponible.
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Recargas vía Pago Móvil y Binance Pay en Fase 3.
              </span>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 mb-8">
          <button
            onClick={() => setActiveTab('sorteos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'sorteos'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Mis Sorteos
          </button>

          <button
            onClick={() => setActiveTab('cartones')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'cartones'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            Mis Cartones
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <History className="h-4 w-4" />
            Historial
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'perfil'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            Perfil
          </button>

          <button
            onClick={() => setActiveTab('seguridad')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'seguridad'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="h-4 w-4" />
            Seguridad
          </button>

          <div className="ml-auto">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/60 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO DE PESTAÑAS */}

        {/* TAB: MIS SORTEOS */}
        {activeTab === 'sorteos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white font-display">
                  Sorteos Programados y Salas Oficiales
                </h2>
                <p className="text-xs text-slate-400">
                  Salas autorizadas preparadas para el motor de balotas en tiempo real (Fase 2).
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {modalities.length} modalidades activas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modalities.map((mod) => (
                <div key={mod.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                      <span>Sorteo #{mod.id === 'BINGO_75' ? '101' : '102'}</span>
                      <span className="text-amber-400">PROGRAMADO</span>
                    </div>
                    <h3 className="text-base font-bold text-white font-display">
                      {mod.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {mod.description}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono space-y-1">
                      <div className="flex justify-between">
                        <span>Matriz:</span>
                        <span className="text-slate-200">{mod.grid_rows}x{mod.grid_cols}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balotas:</span>
                        <span className="text-slate-200">{mod.total_balls} números</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                    {onEnterLiveRoom && (
                      <button
                        onClick={() => onEnterLiveRoom(mod.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Entrar a Sala en Vivo (/play)</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400 block text-center italic">
                      Adquisición de cartones disponible al activar fase de juego.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: MIS CARTONES */}
        {activeTab === 'cartones' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center max-w-2xl mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
              <Grid3X3 className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-white font-display">
              Cartones Digitales de Jugador
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              En esta Fase 1 (Fundación y Pruebas), no hay cartones emitidos con apuestas financieras. La tabla <code className="text-amber-400 font-mono">cards</code> y la estructura de marcaje por celdas <code className="text-amber-400 font-mono">card_numbers</code> se encuentran creadas y protegidas con RLS para su emisión en Fase 2.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-400 font-mono">
              <span>Estado:</span>
              <span className="text-emerald-400 font-semibold">Esquema RLS Listo</span>
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {activeTab === 'historial' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center max-w-2xl mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-4">
              <History className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-white font-display">
              Historial de Actividad
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Sin registros de apuestas previas. Su cuenta está vinculada al identificador <strong className="text-amber-400 font-mono">{publicId}</strong>. Toda participación futura quedará registrada de forma inmutable en el ledger de auditoría.
            </p>
          </div>
        )}

        {/* TAB: PERFIL */}
        {activeTab === 'perfil' && (
          <div className="max-w-2xl mx-auto rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white font-display mb-1">
              Datos del Perfil
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Información del usuario vinculada a su cuenta de Supabase Auth. Su rol y estatus son inmutables por el cliente.
            </p>

            {feedbackMsg && (
              <div className={`mb-6 flex items-center gap-2 rounded-lg p-3 text-xs border ${
                feedbackMsg.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}>
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Identificador Público (Inmutable)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={publicId}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-xs font-mono text-amber-400 font-bold opacity-80 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Rol Asignado (Controlado por Servidor)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={role}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 px-3 text-xs font-mono text-slate-300 font-semibold opacity-80 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Público / Apodo
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nombre visible para otros jugadores"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Teléfono de Contacto (Opcional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+58 412 1234567"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 py-2.5 px-5 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
                >
                  {saveLoading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: SEGURIDAD */}
        {activeTab === 'seguridad' && (
          <div className="max-w-2xl mx-auto rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white font-display mb-1">
              Seguridad de la Cuenta
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Controles de acceso y protección criptográfica de su sesión.
            </p>

            <div className="space-y-6">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-400" />
                  Cambio de Contraseña
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Enviará un correo electrónico seguro con el enlace para restablecer su contraseña.
                </p>
                <button
                  onClick={handlePasswordReset}
                  disabled={saveLoading}
                  className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Solicitar restablecimiento de contraseña
                </button>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Protección RLS:</span>
                  <span className="text-emerald-400">ACTIVA</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Autoridad del Navegador:</span>
                  <span className="text-rose-400">DENEGADA (Server Only)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Identidad Pública:</span>
                  <span className="text-amber-400 font-bold">{publicId}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
