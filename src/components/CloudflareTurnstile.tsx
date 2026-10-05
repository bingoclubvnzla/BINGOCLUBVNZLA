// ==============================================================================
// BINGO CLUB VNZLA ONLINE — COMPONENTE CLOUDFLARE TURNSTILE (FASE 2.4)
// Protección anti-bot real con integración nativa Supabase Auth.
// Maneja estados: CONFIGURED (Widget Real) y NOT_CONFIGURED (Aviso Informativo).
// ==============================================================================

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { isTurnstileRequired, getAppEnvironment } from '../lib/security';

export interface TurnstileRef {
  reset: () => void;
  getToken: () => string | null;
  isFailClosed: () => boolean;
}

interface CloudflareTurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (isBlocked: boolean) => void;
  action?: 'login' | 'signup' | 'recovery' | 'resend';
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (err: string) => void;
          theme?: 'light' | 'dark' | 'auto';
          action?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export const CloudflareTurnstile = forwardRef<TurnstileRef, CloudflareTurnstileProps>(
  ({ onVerify, onExpire, onError, onStatusChange, action = 'login' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'VERIFIED' | 'EXPIRED' | 'ERROR'>('IDLE');

    // Clave de sitio pública de Turnstile desde variables de entorno
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';
    const isConfigured = Boolean(siteKey && siteKey.length > 5);

    // En PREVIEW y PRODUCTION, Turnstile es estrictamente requerido (Fail-Closed)
    const failClosed = isTurnstileRequired() && !isConfigured;

    useEffect(() => {
      if (onStatusChange) {
        onStatusChange(failClosed);
      }
    }, [failClosed, onStatusChange]);

    // Exponer reset, getToken y isFailClosed mediante useImperativeHandle
    useImperativeHandle(ref, () => ({
      reset: () => {
        setToken(null);
        setStatus('IDLE');
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            // Widget reset seguro
          }
        }
      },
      getToken: () => token,
      isFailClosed: () => failClosed,
    }));

    // Carga asíncrona del script oficial de Cloudflare Turnstile
    useEffect(() => {
      if (!isConfigured) return;

      const scriptId = 'cloudflare-turnstile-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => {
          setStatus('ERROR');
          if (onError) onError('No se pudo cargar el script de Cloudflare Turnstile.');
        };
        document.head.appendChild(script);
      } else if (window.turnstile) {
        setIsLoaded(true);
      } else {
        script.addEventListener('load', () => setIsLoaded(true));
      }
    }, [isConfigured, onError]);

    // Renderizar el widget cuando el script y el contenedor estén listos
    useEffect(() => {
      if (!isConfigured || !isLoaded || !containerRef.current || !window.turnstile) return;

      // Limpiar render previos en el mismo contenedor
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignorar error de limpieza
        }
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'dark',
          callback: (receivedToken: string) => {
            setToken(receivedToken);
            setStatus('VERIFIED');
            onVerify(receivedToken);
          },
          'expired-callback': () => {
            setToken(null);
            setStatus('EXPIRED');
            if (onExpire) onExpire();
          },
          'error-callback': (err: string) => {
            setToken(null);
            setStatus('ERROR');
            if (onError) onError(err || 'Error en validación Cloudflare Turnstile.');
          },
        });
        widgetIdRef.current = id;
      } catch (e: unknown) {
        setStatus('ERROR');
        if (onError) onError('Fallo al inicializar widget Turnstile.');
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Cleanup seguro
          }
        }
      };
    }, [isConfigured, isLoaded, siteKey, action, onVerify, onExpire, onError]);

    // CASO 1: Turnstile Real Configurado (Widget Oficial)
    if (isConfigured) {
      return (
        <div className="my-3 flex flex-col items-center justify-center">
          <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
          {status === 'VERIFIED' && (
            <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Verificación de seguridad Turnstile exitosa</span>
            </p>
          )}
          {status === 'EXPIRED' && (
            <p className="mt-1 text-[11px] text-amber-400 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Verificación expirada. Generando nuevo token...</span>
            </p>
          )}
        </div>
      );
    }

    // CASO 2: Entornos Producción/Preview sin Turnstile -> FAIL-CLOSED ESTRICTO
    if (failClosed) {
      return (
        <div className="my-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs shadow-inner">
          <div className="flex items-center justify-between text-rose-300">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span>Protección Anti-Bot Requerida</span>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold uppercase">
              FAIL_CLOSED
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-rose-200/90 leading-tight">
            El servicio de verificación de seguridad no está activo en este entorno. Por protección contra abuso automatizado, las operaciones de autenticación están temporalmente restringidas.
          </p>
        </div>
      );
    }

    // CASO 3: Modo Local / Desarrollo con Clave de Sitio Pendiente (Estado Transparente NOT_CONFIGURED)
    return (
      <div className="my-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">Cloudflare Turnstile</span>
          </div>
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 border border-slate-800 text-sky-400 font-bold">
            NOT_CONFIGURED
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 leading-tight">
          Protección anti-bot lista para producción. Active <code className="text-amber-300 font-mono">VITE_TURNSTILE_SITE_KEY</code> en su entorno para desplegar el desafío en vivo.
        </p>
      </div>
    );
  }
);

CloudflareTurnstile.displayName = 'CloudflareTurnstile';
