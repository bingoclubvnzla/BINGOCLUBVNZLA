import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  CreditCard, 
  Calendar, 
  History, 
  ShieldCheck, 
  LogOut, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

export const PlayerDashboard: React.FC = () => {
  const { user, profile, role, effectiveRole, logout, updateProfile, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'sorteos' | 'cartones' | 'historial' | 'perfil' | 'seguridad'>('sorteos');

  // Formulario de edición de perfil
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await updateProfile({
      displayName,
      fullName: fullName || undefined,
      phone: phone || undefined,
    });
    if (res.success) {
      setFeedback({ type: 'success', text: res.message || 'Perfil actualizado exitosamente.' });
    } else {
      setFeedback({ type: 'error', text: res.message || 'Error al actualizar perfil.' });
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-blue-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl font-serif">
              {profile?.display_name?.[0]?.toUpperCase() || 'J'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {profile?.display_name || 'Jugador'}
                </h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  {effectiveRole}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>ID Público: <strong className="text-amber-300 font-bold">{profile?.public_id || 'BCV-USER'}</strong></span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">Cuenta Activa</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-red-400 bg-slate-950 border border-slate-800 hover:border-red-500/30 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Financial wallet banner (Section 18: NO MOCK NUMBERS) */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-4 rounded-xl bg-slate-950/70 border border-amber-500/20 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-amber-300 block mb-0.5">
                Billetera & Saldo en Cuenta
              </span>
              <p className="text-slate-400 leading-relaxed">
                <strong>Función financiera próximamente disponible.</strong> En esta Fase 1 las operaciones monetarias no están activas. No se muestran saldos ficticios ni simulados para preservar la integridad contable.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-center text-xs">
            <span className="text-slate-500 text-[11px] block">Estado de Billetera</span>
            <span className="font-mono text-slate-300 font-semibold mt-0.5">Fase 1: En Certificación</span>
            <span className="text-[11px] text-slate-500 mt-1">Próximamente Pago Móvil & Binance Pay</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('sorteos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'sorteos'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Mis Sorteos</span>
        </button>

        <button
          onClick={() => setActiveTab('cartones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'cartones'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Mis Cartones</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'historial'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'perfil'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Perfil</span>
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
          <span>Seguridad</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'sorteos' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Salas de Sorteo en Vivo</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Las salas de sorteo en tiempo real para las 5 modalidades estarán disponibles para emisión en la siguiente etapa una vez activado el cronómetro de partidas.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span className="p-2 rounded bg-slate-950 border border-slate-800">Bingo 75 (5x5)</span>
            <span className="p-2 rounded bg-slate-950 border border-slate-800">Bingo 90 (3x9)</span>
            <span className="p-2 rounded bg-slate-950 border border-slate-800">Animalitos (5x5)</span>
            <span className="p-2 rounded bg-slate-950 border border-slate-800">Objetos (5x5)</span>
            <span className="p-2 rounded bg-slate-950 border border-slate-800">Chapitas (3x5)</span>
          </div>
        </div>
      )}

      {activeTab === 'cartones' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Mis Cartones Digitales</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No tienes cartones asignados actualmente. La adquisición de cartones estará habilitada para las salas activas en Fase 2.
          </p>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Historial de Actividad</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Sin transacciones previas. Tu historial reflejará de forma inmutable todas las partidas jugadas y compras verificadas.
          </p>
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl">
          <div className="mb-6">
            <h3 className="text-base font-bold text-white">Editar Perfil de Jugador</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Campos editables autorizados por la política RLS. Los datos críticos de rol y estatus son inmutables.
            </p>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border mb-5 text-xs flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-red-950/30 border-red-500/30 text-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Readonly immutable fields notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Identificador Público</span>
                <span className="font-mono font-bold text-amber-400">{profile?.public_id || 'BCV-USER'}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">(Inmutable)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Rol Asignado</span>
                <span className="font-mono font-bold text-slate-300">{effectiveRole}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">(Controlado por PostgreSQL)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alias / Nombre de Jugador
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre Completo (Opcional)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Para verificación de identidad en Fase 2"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
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
                placeholder="Ej. +58 412 1234567"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>{isLoading ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
            </button>
          </form>
        </div>
      )}

      {activeTab === 'seguridad' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-white">Privacidad y Seguridad de la Cuenta</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tu cuenta está protegida mediante el estándar Supabase Auth con tokens JWT encriptados. Las políticas RLS de PostgreSQL impiden que otros usuarios puedan consultar tu información privada.
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Correo Electrónico:</span>
              <span className="font-mono text-slate-200">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Nivel de Seguridad:</span>
              <span className="text-emerald-400 font-semibold">Nivel 1 (Autenticación Básica)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Filtro Anti-Doxxing:</span>
              <span className="text-amber-400 font-semibold">Activo (Identificador BCV)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
