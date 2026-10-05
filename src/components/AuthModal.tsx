// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MODAL DE AUTENTICACIÓN HARDENED (FASE 2.4)
// Google OAuth + Correo/Contraseña + Cloudflare Turnstile + Verificación de Email
// ==============================================================================

import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CloudflareTurnstile, TurnstileRef } from './CloudflareTurnstile';
import {
  X,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Send,
  ArrowLeft
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'recovery';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    isConfigured,
    isFailClosed,
    isRecoveryMode,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'recovery' | 'update_password'>(
    isRecoveryMode ? 'update_password' : initialMode
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileBlocked, setTurnstileBlocked] = useState(false);

  const isEffectiveBlocked = isFailClosed || turnstileBlocked;

  const turnstileRef = useRef<TurnstileRef>(null);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnconfirmedEmail(null);
    setTurnstileToken(null);
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  };

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    setErrorMessage(null);
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken(null);
  };

  // 1. Google OAuth
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    setGoogleLoading(true);

    const res = await signInWithGoogle();
    setGoogleLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'No se pudo iniciar la autenticación con Google.');
    }
  };

  // 2. Reenviar confirmación de email
  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;

    setLoading(true);
    setErrorMessage(null);
    const res = await resendVerificationEmail(unconfirmedEmail, turnstileToken || undefined);
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Se ha enviado un nuevo enlace de confirmación a tu correo.');
      if (turnstileRef.current) turnstileRef.current.reset();
    } else {
      setErrorMessage(res.error || 'No se pudo reenviar el enlace.');
    }
  };

  // 3. Envío del Formulario Principal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Modo: Actualizar Contraseña (después de recovery link)
    if (mode === 'update_password') {
      if (password.length < 6) {
        setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Las contraseñas no coinciden.');
        return;
      }
      setLoading(true);
      const res = await updatePassword(password);
      setLoading(false);

      if (res.success) {
        setSuccessMessage('¡Contraseña actualizada exitosamente! Ya puedes usar tu nueva clave.');
        setTimeout(() => {
          setMode('login');
          resetFormState();
        }, 2000);
      } else {
        setErrorMessage(res.error || 'Error al actualizar la contraseña.');
      }
      return;
    }

    // Validación de Correo
    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor ingrese un correo electrónico válido.');
      return;
    }

    // Modo: Recuperación de Contraseña
    if (mode === 'recovery') {
      setLoading(true);
      const res = await resetPassword(email.trim(), turnstileToken || undefined);
      setLoading(false);

      if (turnstileRef.current) turnstileRef.current.reset();

      if (res.success) {
        // Mensaje uniforme anti-enumeración
        setSuccessMessage('Si el correo electrónico está registrado, recibirás un enlace seguro para restablecer tu contraseña.');
      } else {
        setErrorMessage(res.error || 'No se pudo procesar la solicitud de recuperación.');
      }
      return;
    }

    // Validación de longitud de contraseña
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // Modo: Registro
    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('Por favor ingrese su nombre y apellido.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Las contraseñas no coinciden.');
        return;
      }

      setLoading(true);
      const res = await signUp(email.trim(), password, fullName.trim(), turnstileToken || undefined);
      setLoading(false);

      if (turnstileRef.current) turnstileRef.current.reset();

      if (res.success) {
        if (res.requiresVerification) {
          setSuccessMessage('¡Registro completado! Se ha enviado un enlace de confirmación a tu correo. Por favor confírmalo antes de iniciar sesión.');
          setUnconfirmedEmail(email.trim());
        } else {
          setSuccessMessage('¡Registro exitoso! Bienvenido a Bingo Club VNZLA.');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1200);
        }
      } else {
        setErrorMessage(res.error || 'Error al completar el registro.');
      }
      return;
    }

    // Modo: Inicio de Sesión
    setLoading(true);
    const res = await signIn(email.trim(), password, turnstileToken || undefined);
    setLoading(false);

    if (turnstileRef.current) turnstileRef.current.reset();

    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      if (res.isUnconfirmed) {
        setUnconfirmedEmail(email.trim());
      }
      setErrorMessage(res.error || 'El correo electrónico o la contraseña no son correctos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display">
            {mode === 'login' && 'Iniciar Sesión'}
            {mode === 'register' && 'Crear Cuenta de Jugador'}
            {mode === 'recovery' && 'Recuperar Contraseña'}
            {mode === 'update_password' && 'Establecer Nueva Contraseña'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {mode === 'login' && 'Acceso seguro a Bingo Club VNZLA Online'}
            {mode === 'register' && 'Regístrate para jugar en las 5 modalidades oficiales'}
            {mode === 'recovery' && 'Ingresa tu correo para recibir el enlace de recuperación'}
            {mode === 'update_password' && 'Introduce tu nueva contraseña segura'}
          </p>
        </div>

        {/* Indicador de Servidor Supabase */}
        {!isConfigured && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Modo Desarrollo / Supabase Pendiente</p>
                <p className="mt-0.5 text-amber-200/80">
                  Las credenciales <code className="text-amber-300 font-mono">VITE_SUPABASE_URL</code> no están enlazadas en este entorno. Puedes explorar las salas y modalidades con los controles operativos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
              {unconfirmedEmail && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    <span>Reenviar enlace de confirmación</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mensaje de Éxito */}
        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Botón de Google OAuth (en Login y Registro) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading || isEffectiveBlocked}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {googleLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.1C3.26 21.4 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.1z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.1c.95-2.83 3.6-4.93 6.72-4.93z"
                  />
                </svg>
              )}
              <span>Continuar con Google</span>
            </button>

            {/* Separador elegante */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <span className="bg-slate-900 px-3">o con correo</span>
              </div>
            </div>
          </div>
        )}

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {mode !== 'update_password' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@ejemplo.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {mode !== 'recovery' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  {mode === 'update_password' ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recovery');
                      resetFormState();
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {(mode === 'register' || mode === 'update_password') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Protección Cloudflare Turnstile */}
          <CloudflareTurnstile
            ref={turnstileRef}
            onVerify={handleTurnstileVerify}
            onExpire={handleTurnstileExpire}
            onStatusChange={setTurnstileBlocked}
            action={mode === 'register' ? 'signup' : mode === 'recovery' ? 'recovery' : 'login'}
          />

          {/* Botón Principal de Acción */}
          <button
            type="submit"
            disabled={loading || (isEffectiveBlocked && mode !== 'update_password')}
            className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 px-4 text-xs font-bold text-slate-950 shadow-md hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Procesando...</span>
              </span>
            ) : (
              <>
                {mode === 'login' && 'INICIAR SESIÓN'}
                {mode === 'register' && 'CREAR CUENTA'}
                {mode === 'recovery' && 'ENVIAR ENLACE DE RECUPERACIÓN'}
                {mode === 'update_password' && 'ACTUALIZAR CONTRASEÑA'}
              </>
            )}
          </button>
        </form>

        {/* Alternar Modos */}
        <div className="mt-5 border-t border-slate-800 pt-3.5 text-center text-xs text-slate-400">
          {mode === 'login' && (
            <p>
              ¿No tienes cuenta aún?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  resetFormState();
                }}
                className="font-semibold text-amber-400 hover:text-amber-300"
              >
                Crear cuenta
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  resetFormState();
                }}
                className="font-semibold text-amber-400 hover:text-amber-300"
              >
                Inicia sesión aquí
              </button>
            </p>
          )}

          {(mode === 'recovery' || mode === 'update_password') && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                resetFormState();
              }}
              className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Volver al inicio de sesión</span>
            </button>
          )}
        </div>

        {/* Garantía de Seguridad */}
        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          <span>Autenticación oficial Supabase Auth con protección anti-bot Turnstile</span>
        </div>
      </div>
    </div>
  );
};
