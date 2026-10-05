import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [localFeedback, setLocalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { login, register, resetPassword, isLoading, error: authError, clearError } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalFeedback(null);
    clearError();

    if (mode === 'login') {
      const res = await login({ email, password });
      if (res.success) {
        onClose();
      }
    } else if (mode === 'register') {
      if (!displayName.trim()) {
        setLocalFeedback({ type: 'error', text: 'Por favor ingrese un alias o nombre de jugador.' });
        return;
      }
      const res = await register({
        email,
        password,
        displayName: displayName.trim(),
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (res.success) {
        setLocalFeedback({
          type: 'success',
          text: res.message || 'Registro completado con éxito. Ahora puede acceder a su cuenta.',
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } else if (mode === 'forgot') {
      const res = await resetPassword(email);
      if (res.success) {
        setLocalFeedback({
          type: 'success',
          text: (res as any).message || 'Instrucciones enviadas a su correo si existe una cuenta asociada.',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
            Bingo Club Venezuela
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            {mode === 'login' && 'Iniciar Sesión'}
            {mode === 'register' && 'Crear Cuenta de Jugador'}
            {mode === 'forgot' && 'Recuperar Contraseña'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Acceda a su perfil y salas de juego de forma segura.'}
            {mode === 'register' && 'Regístrese para obtener su identificador oficial BCV.'}
            {mode === 'forgot' && 'Le enviaremos un enlace seguro para restablecer su clave.'}
          </p>
        </div>

        {/* Feedback Messages */}
        {(localFeedback || authError) && (
          <div
            className={`p-3 rounded-lg border mb-5 text-xs flex items-start gap-2.5 ${
              localFeedback?.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/30 border-red-500/30 text-red-200'
            }`}
          >
            {localFeedback?.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">
              {localFeedback?.text || authError}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alias o Nombre de Jugador <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. JuanSorteo23"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo <span className="text-slate-500 text-[11px]">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Teléfono Móvil <span className="text-slate-500 text-[11px]">(Opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="Ej. +58 412 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Correo Electrónico <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Contraseña <span className="text-amber-400">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setLocalFeedback(null);
                    }}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    ¿Olvidó su clave?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 mt-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>
              {isLoading
                ? 'Procesando...'
                : mode === 'login'
                ? 'Ingresar a la Plataforma'
                : mode === 'register'
                ? 'Confirmar Registro'
                : 'Enviar Enlace de Recuperación'}
            </span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Footer switchers */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {mode === 'login' && (
            <p>
              ¿Aún no tiene cuenta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setLocalFeedback(null);
                }}
                className="text-amber-400 font-semibold hover:underline ml-1"
              >
                Regístrese aquí
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p>
              ¿Ya tiene una cuenta registrada?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLocalFeedback(null);
                }}
                className="text-amber-400 font-semibold hover:underline ml-1"
              >
                Inicie sesión
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalFeedback(null);
              }}
              className="text-slate-300 hover:text-white underline text-xs"
            >
              Volver a Iniciar Sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
