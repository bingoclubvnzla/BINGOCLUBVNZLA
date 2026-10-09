import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'recovery';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { signIn, signUp, resetPassword, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>(initialMode);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [localValidation, setLocalValidation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);
    clearError();

    if (!email || !email.includes('@')) {
      setLocalValidation('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (mode === 'recovery') {
      setSubmitting(true);
      const res = await resetPassword(email);
      setSubmitting(false);
      if (res.success) {
        setRecoverySuccess(true);
      }
      return;
    }

    if (!password || password.length < 6) {
      setLocalValidation('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setLocalValidation('Las contraseñas no coinciden.');
        return;
      }
      if (!displayName || displayName.trim().length < 3) {
        setLocalValidation('El apodo o nombre de usuario debe tener al menos 3 caracteres.');
        return;
      }

      setSubmitting(true);
      const res = await signUp(email, password, fullName.trim() || displayName.trim());
      setSubmitting(false);
      if (res.success) {
        onClose();
      }
    } else {
      // Login
      setSubmitting(true);
      const res = await signIn(email, password);
      setSubmitting(false);
      if (res.success) {
        onClose();
      }
    }
  };

  const handleModeChange = (newMode: 'login' | 'register' | 'recovery') => {
    setMode(newMode);
    setLocalValidation(null);
    clearError();
    setRecoverySuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-slate-800/80 to-transparent border-b border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {mode === 'login' && 'Iniciar Sesión'}
                  {mode === 'register' && 'Crear Cuenta Segura'}
                  {mode === 'recovery' && 'Recuperar Contraseña'}
                </h3>
                <p className="text-xs text-slate-400">Bingo Club Vnzla Online</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          {mode !== 'recovery' && (
            <div className="flex p-1 mt-4 bg-slate-950/70 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Registrarme
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(localValidation || error) && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{localValidation || error}</span>
            </div>
          )}

          {recoverySuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                Se han enviado las instrucciones de recuperación a tu correo electrónico. Por favor verifica tu bandeja.
              </span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Apodo o Nombre de Jugador <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej. ElLlanero77"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Se te asignará automáticamente un código público único (ej. BCV-123456).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nombre Completo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre real"
                    className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Teléfono Móvil (Opcional)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+58 412 1234567"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Electrónico <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@ejemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tu correo nunca será visible para otros jugadores en las salas.
            </p>
          </div>

          {mode !== 'recovery' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Contraseña <span className="text-amber-400">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('recovery')}
                    className="text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirmar Contraseña <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          {mode === 'recovery' && (
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingresa el correo asociado a tu cuenta y te enviaremos un enlace seguro para restablecer tu clave de acceso.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Entrar a Bingo Club'}
                  {mode === 'register' && 'Crear Mi Cuenta Segura'}
                  {mode === 'recovery' && 'Enviar Instrucciones'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {mode === 'recovery' && (
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2"
            >
              Volver al inicio de sesión
            </button>
          )}
        </form>

        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Fase 1: Modo de Pruebas. Tus credenciales están protegidas mediante Supabase Auth y RLS.
          </p>
        </div>
      </div>
    </div>
  );
};
