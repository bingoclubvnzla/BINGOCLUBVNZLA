// BINGO CLUB VNZLA ONLINE — CONTEXTO DE AUTENTICACIÓN Y ROLES (RBAC)
// FASE 1: GESTIÓN DE SESIÓN, PERFILES Y CONTROL DE ACCESO

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, UserRole } from '../types/database.types';
import { logAuditEvent } from './audit';
import { isValidVenezuelanPhone } from './permissions';
import { getSafeRedirectUrl } from './authRedirect';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    displayName: string;
  }) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  updateProfile: (updates: { displayName?: string; phone?: string; avatarUrl?: string }) => Promise<{ error?: string }>;
  switchAuditRole: (targetRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateBcvId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = 'BCV-';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

const LOCAL_SESSION_KEY = 'bcv_session_profile_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('PLAYER');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carga y verificación inicial de sesión
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (initialSession && isMounted) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchProfile(initialSession.user.id);
          }
        } catch (err) {
          console.warn('Error al verificar sesión en Supabase:', err);
        }

        // Listener de cambios de auth en Supabase
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (!isMounted) return;
            setSession(currentSession);
            setUser(currentSession?.user || null);

            if (currentSession?.user) {
              await fetchProfile(currentSession.user.id);
            } else {
              setProfile(null);
              setRole('PLAYER');
            }
          }
        );

        if (isMounted) setIsLoading(false);
        return () => {
          authListener?.subscription.unsubscribe();
        };
      } else {
        // Modo diagnóstico / sin variables de entorno configuradas aún
        const stored = localStorage.getItem(LOCAL_SESSION_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setProfile(parsed);
            setRole(parsed.role);
            setUser({
              id: parsed.user_id,
              email: parsed.metadata?.email || 'jugador@bingoclub.ve',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: parsed.created_at,
            } as User);
          } catch {
            localStorage.removeItem(LOCAL_SESSION_KEY);
          }
        }
        if (isMounted) setIsLoading(false);
      }
    }

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Si no existe perfil en la tabla pero el usuario está autenticado, intentar recuperarlo de metadata
        console.warn('Perfil no encontrado en base de datos. Creando perfil inicial...');
        const userRes = await supabase.auth.getUser();
        const u = userRes.data.user;
        if (u) {
          const pubId = generateBcvId();
          const fallbackProfile: UserProfile = {
            id: u.id,
            user_id: u.id,
            public_id: pubId,
            display_name: u.user_metadata?.display_name || `Jugador_${pubId.substring(4)}`,
            full_name: u.user_metadata?.full_name || 'Jugador Oficial',
            phone: u.user_metadata?.phone || '+584120000000',
            avatar_url: null,
            role: 'PLAYER',
            status: 'ACTIVE',
            security_level: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setProfile(fallbackProfile);
          setRole('PLAYER');
        }
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
        setRole(data.role as UserRole);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }

  // Registro de nuevo usuario
  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    displayName: string;
  }): Promise<{ error?: string; message?: string }> => {
    // Validaciones estrictas previas
    if (!params.email || !params.password || !params.fullName || !params.phone) {
      return { error: 'Por favor complete todos los campos obligatorios.' };
    }
    if (params.password.length < 8) {
      return { error: 'La contraseña debe contener al menos 8 caracteres para cumplir las políticas de seguridad.' };
    }
    if (!isValidVenezuelanPhone(params.phone)) {
      return { error: 'Ingrese un formato de teléfono venezolano válido (ej. 04121234567 o +584141234567).' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName,
              phone: params.phone,
              display_name: params.displayName || params.fullName.split(' ')[0],
            },
          },
        });

        if (error) {
          return { error: error.message };
        }

        if (data.user) {
          await logAuditEvent({
            userId: data.user.id,
            actorRole: 'PLAYER',
            action: 'AUTH_REGISTER_ATTEMPT_SUCCESS',
            entityType: 'AUTH_USER',
            entityId: data.user.id,
            metadata: { email_domain: params.email.split('@')[1] },
          });

          return {
            message: data.session
              ? 'Registro completado con éxito. ¡Bienvenido a Bingo Club Vnzla!'
              : 'Registro exitoso. Se ha enviado un enlace de confirmación a su correo.',
          };
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Error inesperado al registrar usuario.' };
      }
    }

    // Modo local / demostración segura
    const mockId = `usr-${Date.now()}`;
    const pubId = generateBcvId();
    const newProfile: UserProfile = {
      id: mockId,
      user_id: mockId,
      public_id: pubId,
      display_name: params.displayName || params.fullName.split(' ')[0],
      full_name: params.fullName,
      phone: params.phone,
      avatar_url: null,
      role: 'PLAYER',
      status: 'ACTIVE',
      security_level: 1,
      metadata: { email: params.email },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProfile(newProfile);
    setRole('PLAYER');
    setUser({
      id: mockId,
      email: params.email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: newProfile.created_at,
    } as User);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));

    await logAuditEvent({
      userId: mockId,
      actorRole: 'PLAYER',
      action: 'AUTH_REGISTER_DEMO_SUCCESS',
      entityType: 'PROFILE',
      entityId: pubId,
    });

    return { message: 'Cuenta creada exitosamente en modo fundación. ¡Bienvenido!' };
  };

  // Inicio de sesión
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!email || !password) {
      return { error: 'Ingrese correo y contraseña.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          await logAuditEvent({
            actorRole: 'PLAYER',
            action: 'AUTH_LOGIN_FAILED',
            entityType: 'AUTH',
            metadata: { reason: error.message },
          });
          return { error: error.message };
        }

        if (data.user) {
          await logAuditEvent({
            userId: data.user.id,
            actorRole: role,
            action: 'AUTH_LOGIN_SUCCESS',
            entityType: 'AUTH',
            entityId: data.user.id,
          });
          return {};
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Error al conectar con el servidor de autenticación.' };
      }
    }

    // Modo local: validar que tenga email
    const mockId = `usr-${Date.now()}`;
    const pubId = generateBcvId();
    const existing = localStorage.getItem(LOCAL_SESSION_KEY);
    let p: UserProfile;

    if (existing) {
      p = JSON.parse(existing);
    } else {
      p = {
        id: mockId,
        user_id: mockId,
        public_id: pubId,
        display_name: email.split('@')[0],
        full_name: 'Usuario Bingo Club',
        phone: '+584121234567',
        avatar_url: null,
        role: 'PLAYER',
        status: 'ACTIVE',
        security_level: 1,
        metadata: { email },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(p));
    }

    setProfile(p);
    setRole(p.role);
    setUser({
      id: p.user_id,
      email: email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: p.created_at,
    } as User);

    await logAuditEvent({
      userId: p.user_id,
      actorRole: p.role,
      action: 'AUTH_LOGIN_DEMO_SUCCESS',
      entityType: 'PROFILE',
      entityId: p.public_id,
    });

    return {};
  };

  // Cierre de sesión
  const signOut = async () => {
    if (user) {
      await logAuditEvent({
        userId: user.id,
        actorRole: role,
        action: 'AUTH_LOGOUT',
        entityType: 'AUTH',
        entityId: user.id,
      });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error al cerrar sesión en Supabase:', err);
      }
    }

    localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('PLAYER');
  };

  // Recuperación de contraseña
  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!email || !email.includes('@')) {
      return { error: 'Por favor ingrese una dirección de correo válida.' };
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getSafeRedirectUrl('/reset-password'),
      });
      if (error) return { error: error.message };
    }

    return {
      message: 'Si la cuenta existe, se ha enviado un correo con instrucciones para restablecer su contraseña.',
    };
  };

  // Actualización de perfil del jugador (solo campos permitidos)
  const updateProfile = async (updates: {
    displayName?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ error?: string }> => {
    if (!profile) return { error: 'No hay sesión de usuario activa.' };

    if (updates.phone && !isValidVenezuelanPhone(updates.phone)) {
      return { error: 'Formato de teléfono venezolano inválido.' };
    }

    const payload: Partial<UserProfile> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.displayName) payload.display_name = updates.displayName.trim();
    if (updates.phone) payload.phone = updates.phone.trim();
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', profile.user_id);

      if (error) return { error: error.message };
    }

    const updatedProfile: UserProfile = { ...profile, ...payload };
    setProfile(updatedProfile);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updatedProfile));

    await logAuditEvent({
      userId: profile.user_id,
      actorRole: role,
      action: 'PROFILE_UPDATED_BY_USER',
      entityType: 'PROFILE',
      entityId: profile.public_id,
    });

    return {};
  };

  // Conmutador de Rol para Auditoría y Verificación de Fase 1
  const switchAuditRole = (targetRole: UserRole) => {
    setRole(targetRole);
    if (profile) {
      const mod = { ...profile, role: targetRole };
      setProfile(mod);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(mod));
    }
    logAuditEvent({
      userId: profile?.user_id,
      actorRole: targetRole,
      action: 'AUDIT_ROLE_SWITCHED_IN_INSPECTION',
      entityType: 'RBAC_SECURITY',
      metadata: { target_role: targetRole },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
        switchAuditRole,
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
