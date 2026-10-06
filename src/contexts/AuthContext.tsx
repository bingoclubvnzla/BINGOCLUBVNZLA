// ==============================================================================
// BINGO CLUB VNZLA ONLINE — CONTEXTO DE AUTENTICACIÓN Y ROLES HARDENED (FASE 2.4)
// Integra Supabase Auth, Google OAuth, Cloudflare Turnstile, Verificación de Correo,
// Anti-Enumeración, Redirecciones Seguras y Auditoría Forense.
// ==============================================================================

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, fetchUserProfile, updateUserProfile } from '../lib/supabase';
import { getSafeRedirectUrl } from '../lib/authRedirect';
import { recordAuthAudit } from '../lib/audit';
import { isTurnstileRequired } from '../lib/security';
import { getOfficialRoleForEmail } from '../lib/adminIdentities';
import type { UserProfile, UserRole } from '../types/database';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  publicId: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isEmailVerified: boolean;
  authProvider: 'email' | 'google' | null;
  isTurnstileConfigured: boolean;
  isFailClosed: boolean;
  isGoogleConfigured: boolean;
  authError: string | null;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    captchaToken?: string
  ) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  signIn: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{ success: boolean; error?: string; isUnconfirmed?: boolean }>;
  signInWithGoogle: (captchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (
    email: string,
    captchaToken?: string
  ) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (
    email: string,
    captchaToken?: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfileDetails: (updates: {
    full_name?: string;
    display_name?: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string | null }>;
  refreshProfile: () => Promise<void>;
  // Alternador de rol para auditoría de interfaz en modo desarrollo/pruebas
  activeTestRole: UserRole | null;
  setActiveTestRole: (role: UserRole | null) => void;
  // Aliases de compatibilidad para componentes de fases previas
  effectiveRole: UserRole;
  logout: () => Promise<void>;
  login: (emailOrPayload: string | { email: string; password: string }, maybePassword?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  register: (payload: { email: string; password: string; fullName?: string; displayName?: string; phone?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateProfile: (updates: { full_name?: string; display_name?: string; phone?: string; displayName?: string; fullName?: string }) => Promise<{ success: boolean; error?: string | null; message?: string }>;
  setActiveRolePreview: (role: UserRole | null) => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTestRole, setActiveTestRole] = useState<UserRole | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);

  const defaultTurnstileSiteKey = '0x4AAAAAAFOjgftMybjD3w5c';
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || defaultTurnstileSiteKey;
  const isTurnstileConfigured = Boolean(turnstileSiteKey && turnstileSiteKey.length > 5);
  // Turnstile fail-closed: En PREVIEW y PRODUCTION, si Turnstile no está configurado
  const isFailClosed = isTurnstileRequired() && !isTurnstileConfigured;
  // Google OAuth está habilitado si Supabase Auth está configurado en el proyecto
  const isGoogleConfigured = isSupabaseConfigured;

  // Carga defensiva del perfil del usuario (Server-Authoritative)
  const loadProfile = async (userId: string, currentUser?: User | null) => {
    try {
      const { data, error } = await fetchUserProfile(userId);
      const activeUser = currentUser || user;
      const officialRole = getOfficialRoleForEmail(activeUser?.email);

      if (error || !data) {
        // Fallback defensivo inicial: asigna rol oficial si es cuenta de administración o 'PLAYER'
        setProfile({
          id: userId,
          user_id: userId,
          public_id: `BCV-${userId.substring(0, 6).toUpperCase()}`,
          full_name: activeUser?.user_metadata?.full_name || activeUser?.user_metadata?.name || 'Jugador Registrado',
          display_name: activeUser?.user_metadata?.display_name || activeUser?.user_metadata?.name || 'Jugador',
          phone: null,
          avatar_url: activeUser?.user_metadata?.avatar_url || activeUser?.user_metadata?.picture || null,
          role: officialRole || 'PLAYER',
          status: 'ACTIVE',
          security_level: officialRole ? 5 : 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Si el correo es una cuenta administrativa oficial pero en la tabla no tiene el rol asignado, prevalece el rol oficial
        const resolvedRole = officialRole || data.role || 'PLAYER';
        setProfile({
          ...data,
          role: resolvedRole,
        });
      }
    } catch {
      // Manejo silencioso para no exponer detalles internos
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          setAuthError('No se pudo recuperar la sesión previa.');
        }

        if (mounted && initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await loadProfile(initialSession.user.id, initialSession.user);
        }
      } catch {
        if (mounted) setAuthError('Error de conexión con el servicio de autenticación.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Suscripción estricta al ciclo de eventos de Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      } else if (event === 'SIGNED_IN') {
        setIsRecoveryMode(false);
        if (currentUser) {
          const provider = currentUser.app_metadata?.provider;
          if (provider === 'google') {
            await recordAuthAudit({
              action: 'GOOGLE_OAUTH_SUCCESS',
              user_id: currentUser.id,
              actor_role: 'PLAYER',
              metadata: { provider: 'google', email_verified: Boolean(currentUser.email_confirmed_at) },
            });
          } else {
            await recordAuthAudit({
              action: 'LOGIN_SUCCESS',
              user_id: currentUser.id,
              actor_role: 'PLAYER',
              metadata: { provider: 'email' },
            });
          }
          await loadProfile(currentUser.id, currentUser);
        }
      } else if (event === 'USER_UPDATED') {
        if (currentUser?.email_confirmed_at) {
          await recordAuthAudit({
            action: 'EMAIL_VERIFIED',
            user_id: currentUser.id,
            actor_role: 'PLAYER',
            metadata: { email_confirmed_at: currentUser.email_confirmed_at },
          });
        }
        if (currentUser) {
          await loadProfile(currentUser.id, currentUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setActiveTestRole(null);
        setIsRecoveryMode(false);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Rol efectivo: Respeta RBAC autoritativo del perfil o el alternador de prueba
  const effectiveRole: UserRole = useMemo(() => {
    if (activeTestRole) return activeTestRole;
    return profile?.role || 'PLAYER';
  }, [activeTestRole, profile?.role]);

  const publicId = useMemo(() => {
    if (profile?.public_id) return profile.public_id;
    if (user?.id) return `BCV-${user.id.substring(0, 6).toUpperCase()}`;
    return 'BCV-INVITADO';
  }, [profile?.public_id, user?.id]);

  const isEmailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const authProvider: 'email' | 'google' | null = useMemo(() => {
    if (!user) return null;
    if (user.app_metadata?.provider === 'google') return 'google';
    return 'email';
  }, [user]);

  // 1. REGISTRO TRADICIONAL POR CORREO + CONTRASEÑA + TURNSTILE
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    captchaToken?: string
  ) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Servidor Supabase no configurado. Defina VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.',
      };
    }

    if (isFailClosed) {
      return {
        success: false,
        error: 'El servicio de verificación de seguridad no está disponible en este entorno. Las operaciones de registro están temporalmente restringidas.',
      };
    }

    if (isTurnstileConfigured && isTurnstileRequired() && (!captchaToken || !captchaToken.trim())) {
      return {
        success: false,
        error: 'Debe completar la verificación de seguridad anti-bot antes de continuar.',
      };
    }

    try {
      const redirectUrl = getSafeRedirectUrl();
      const optionsPayload: {
        data: { full_name: string; display_name: string };
        emailRedirectTo: string;
        captchaToken?: string;
      } = {
        data: {
          full_name: fullName.trim(),
          display_name: fullName.trim().split(' ')[0] || 'Jugador',
        },
        emailRedirectTo: redirectUrl,
      };

      if (captchaToken) {
        optionsPayload.captchaToken = captchaToken;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: optionsPayload,
      });

      if (error) {
        await recordAuthAudit({
          action: 'LOGIN_FAILURE',
          actor_role: 'ANON',
          metadata: { context: 'signup', error_code: error.status },
        });
        return { success: false, error: sanitizeErrorMessage(error.message) };
      }

      await recordAuthAudit({
        action: 'SIGNUP',
        user_id: data.user?.id || null,
        actor_role: 'PLAYER',
        metadata: { provider: 'email', has_session: Boolean(data.session) },
      });

      // Si data.session es null, el servidor Supabase requiere confirmación de email
      const requiresVerification = !data.session;

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id, data.user);
      }

      return {
        success: true,
        requiresVerification,
      };
    } catch {
      return { success: false, error: 'Ocurrió un error inesperado al procesar el registro.' };
    }
  };

  // 2. INICIO DE SESIÓN POR CORREO + CONTRASEÑA + TURNSTILE
  const signIn = async (email: string, password: string, captchaToken?: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Servidor Supabase no configurado. Ingrese credenciales de entorno en .env.',
      };
    }

    if (isFailClosed) {
      return {
        success: false,
        error: 'El servicio de verificación de seguridad no está disponible en este entorno. El inicio de sesión está temporalmente restringido.',
      };
    }

    if (isTurnstileConfigured && isTurnstileRequired() && (!captchaToken || !captchaToken.trim())) {
      return {
        success: false,
        error: 'Debe completar la verificación de seguridad anti-bot antes de continuar.',
      };
    }

    try {
      const optionsPayload = captchaToken ? { captchaToken } : undefined;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: optionsPayload,
      });

      if (error) {
        await recordAuthAudit({
          action: 'LOGIN_FAILURE',
          actor_role: 'ANON',
          metadata: { context: 'signin', error_code: error.status },
        });

        const isUnconfirmed = error.message.toLowerCase().includes('email not confirmed');
        return {
          success: false,
          isUnconfirmed,
          error: isUnconfirmed
            ? 'Tu correo electrónico no ha sido verificado aún. Por favor revisa tu bandeja de entrada o solicita un nuevo enlace.'
            : sanitizeErrorMessage(error.message),
        };
      }

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id, data.user);
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Error al intentar conectar con el servicio de autenticación.' };
    }
  };

  // 3. CONTINUAR CON GOOGLE (GOOGLE OAUTH VÍA SUPABASE AUTH)
  const signInWithGoogle = async (captchaToken?: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Servidor Supabase no configurado. Verifique las variables de entorno.',
      };
    }

    if (isFailClosed) {
      return {
        success: false,
        error: 'El servicio de verificación de seguridad no está disponible en este entorno. El acceso con Google está temporalmente restringido.',
      };
    }

    if (isTurnstileConfigured && isTurnstileRequired() && (!captchaToken || !captchaToken.trim())) {
      return {
        success: false,
        error: 'Debe completar la verificación de seguridad anti-bot antes de continuar con Google.',
      };
    }

    try {
      const redirectUrl = getSafeRedirectUrl();

      const optionsPayload: {
        redirectTo: string;
        queryParams: { access_type: string; prompt: string };
        captchaToken?: string;
      } = {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      };

      if (captchaToken) {
        optionsPayload.captchaToken = captchaToken;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: optionsPayload,
      });

      if (error) {
        await recordAuthAudit({
          action: 'LOGIN_FAILURE',
          actor_role: 'ANON',
          metadata: { provider: 'google', error_code: error.status },
        });
        return { success: false, error: sanitizeErrorMessage(error.message) };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Error al iniciar la conexión con Google OAuth.' };
    }
  };

  // 4. CIERRE DE SESIÓN
  const signOut = async () => {
    try {
      if (user) {
        await recordAuthAudit({
          action: 'LOGOUT',
          user_id: user.id,
          actor_role: effectiveRole,
        });
      }
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignorar error al cerrar sesión
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setActiveTestRole(null);
      setIsRecoveryMode(false);
    }
  };

  // 5. RECUPERACIÓN DE CONTRASEÑA PROTEGIDA POR TURNSTILE
  const resetPassword = async (email: string, captchaToken?: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Servicio de restablecimiento no disponible sin configuración de servidor.',
      };
    }

    if (isFailClosed) {
      return {
        success: false,
        error: 'El servicio de verificación de seguridad no está disponible en este entorno. La recuperación de contraseña está temporalmente restringida.',
      };
    }

    if (isTurnstileConfigured && isTurnstileRequired() && (!captchaToken || !captchaToken.trim())) {
      return {
        success: false,
        error: 'Debe completar la verificación de seguridad anti-bot antes de continuar.',
      };
    }

    try {
      const redirectUrl = getSafeRedirectUrl('/reset-password');
      const optionsPayload: { redirectTo: string; captchaToken?: string } = {
        redirectTo: redirectUrl,
      };
      if (captchaToken) {
        optionsPayload.captchaToken = captchaToken;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), optionsPayload);

      await recordAuthAudit({
        action: 'PASSWORD_RESET_REQUESTED',
        actor_role: 'ANON',
        metadata: { has_captcha: Boolean(captchaToken) },
      });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error.message) };
      }

      // Mensaje uniforme anti-enumeración
      return { success: true };
    } catch {
      return { success: false, error: 'No se pudo enviar el correo de recuperación.' };
    }
  };

  // 6. ACTUALIZAR CONTRASEÑA TRAS RECUPERACIÓN
  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Servidor no configurado.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error.message) };
      }

      if (user) {
        await recordAuthAudit({
          action: 'PASSWORD_CHANGED',
          user_id: user.id,
          actor_role: effectiveRole,
        });
      }

      setIsRecoveryMode(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Error al actualizar la contraseña.' };
    }
  };

  // 7. REENVIAR CORREO DE CONFIRMACIÓN
  const resendVerificationEmail = async (email: string, captchaToken?: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Servidor no configurado.' };
    }

    if (isFailClosed) {
      return {
        success: false,
        error: 'El servicio de verificación de seguridad no está disponible en este entorno. El reenvío de confirmación está temporalmente restringido.',
      };
    }

    if (isTurnstileConfigured && isTurnstileRequired() && (!captchaToken || !captchaToken.trim())) {
      return {
        success: false,
        error: 'Debe completar la verificación de seguridad anti-bot antes de continuar.',
      };
    }

    try {
      const optionsPayload = captchaToken ? { captchaToken } : undefined;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: optionsPayload,
      });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error.message) };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Error al reenviar el correo de confirmación.' };
    }
  };

  // 8. ACTUALIZAR PERFIL
  const updateProfileDetails = async (updates: { full_name?: string; display_name?: string; phone?: string }) => {
    if (!user) return { success: false, error: 'No hay usuario autenticado.' };
    const res = await updateUserProfile(user.id, updates);
    if (res.success) {
      await loadProfile(user.id, user);
    }
    return res;
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id, user);
    }
  };

  // Sanitizador estricto contra enumeración de cuentas y filtración de trazas internas
  function sanitizeErrorMessage(rawMessage: string): string {
    const lower = rawMessage.toLowerCase();
    if (
      lower.includes('invalid login credentials') ||
      lower.includes('invalid credentials') ||
      lower.includes('invalid email or password')
    ) {
      return 'El correo electrónico o la contraseña no son correctos.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Este correo electrónico ya se encuentra registrado en Bingo Club VNZLA.';
    }
    if (lower.includes('password should be at least') || lower.includes('password is too short')) {
      return 'La contraseña debe contener al menos 6 caracteres.';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'Demasiados intentos. Por favor espere unos momentos antes de reintentar.';
    }
    if (lower.includes('captcha') || lower.includes('turnstile')) {
      return 'Fallo en la verificación de seguridad anti-bot. Por favor intente nuevamente.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Debes verificar tu correo electrónico antes de continuar.';
    }
    if (lower.includes('jwt') || lower.includes('token') || lower.includes('session')) {
      return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
      return 'No fue posible conectar con el servidor. Intenta nuevamente.';
    }
    return 'No fue posible completar la solicitud. Verifique los datos ingresados.';
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: effectiveRole,
        publicId,
        isLoading,
        isAuthenticated: Boolean(user && session) || Boolean(activeTestRole),
        isConfigured: isSupabaseConfigured,
        isEmailVerified,
        authProvider,
        isTurnstileConfigured,
        isFailClosed,
        isGoogleConfigured,
        authError,
        isRecoveryMode,
        setIsRecoveryMode,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        resendVerificationEmail,
        updateProfileDetails,
        refreshProfile,
        activeTestRole,
        setActiveTestRole,
        effectiveRole,
        logout: signOut,
        login: async (emailOrPayload, maybePassword) => {
          const email = typeof emailOrPayload === 'string' ? emailOrPayload : emailOrPayload.email;
          const password = typeof emailOrPayload === 'string' ? maybePassword || '' : emailOrPayload.password;
          const res = await signIn(email, password);
          return { success: res.success, error: res.error, message: res.error };
        },
        register: async (p) => {
          const res = await signUp(p.email, p.password, p.fullName || p.displayName || 'Jugador');
          return { success: res.success, error: res.error, message: res.error };
        },
        updateProfile: async (updates) => {
          const mappedUpdates = {
            full_name: updates.full_name || updates.fullName,
            display_name: updates.display_name || updates.displayName,
            phone: updates.phone,
          };
          const res = await updateProfileDetails(mappedUpdates);
          return { success: res.success, error: res.error, message: res.error || (res.success ? 'Perfil actualizado' : 'Error') };
        },
        setActiveRolePreview: setActiveTestRole,
        error: authError,
        clearError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
