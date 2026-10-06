// ==============================================================================
// BINGO CLUB VNZLA ONLINE — COMPONENTE CLOUDFLARE TURNSTILE (FASE 2.4 / FASE FINAL)
// Protección anti-bot real con integración nativa Supabase Auth.
// Ciclo de vida estable, idempotente y máquina de estados formal:
// NO_VERIFICADO | VERIFICANDO | VERIFICADO | EXPIRADO | ERROR
// ==============================================================================

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';
import { isTurnstileRequired } from '../lib/security';

export type TurnstileStatus =
  | 'NO_VERIFICADO'
  | 'VERIFICANDO'
  | 'VERIFICADO'
  | 'EXPIRADO'
  | 'ERROR';

export interface TurnstileRef {
  reset: () => void;
  getToken: () => string | null;
  getStatus: () => TurnstileStatus;
  isVerified: () => boolean;
  isFailClosed: () => boolean;
}

export interface CloudflareTurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (isBlocked: boolean) => void;
  onVerificationChange?: (status: TurnstileStatus, token: string | null) => void;
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
  (
    {
      onVerify,
      onExpire,
      onError,
      onStatusChange,
      onVerificationChange,
      action = 'login',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isRenderingRef = useRef(false);

    // Callbacks estabilizados mediante refs para evitar ciclos y re-renderizados del widget
    const onVerifyRef = useRef(onVerify);
    onVerifyRef.current = onVerify;
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    const onStatusChangeRef = useRef(onStatusChange);
    onStatusChangeRef.current = onStatusChange;
    const onVerificationChangeRef = useRef(onVerificationChange);
    onVerificationChangeRef.current = onVerificationChange;

    const [token, setToken] = useState<string | null>(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const [status, setStatus] = useState<TurnstileStatus>('NO_VERIFICADO');

    // Clave de sitio pública de Turnstile oficial o variable de entorno
    const defaultTurnstileSiteKey = '0x4AAAAAAFOjgftMybjD3w5c';
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || defaultTurnstileSiteKey;
    const isConfigured = Boolean(siteKey && siteKey.length > 5);

    // En PREVIEW y PRODUCTION, Turnstile es estrictamente requerido (Fail-Closed)
    const failClosed = isTurnstileRequired() && !isConfigured;

    // Notificar si está bloqueado por Fail-Closed
    useEffect(() => {
      if (onStatusChangeRef.current) {
        onStatusChangeRef.current(failClosed);
      }
    }, [failClosed]);

    // Función de reseteo estable
    const reset = useCallback(() => {
      setToken(null);
      setStatus('VERIFICANDO');
      onStatusChangeRef.current?.(true);
      onVerificationChangeRef.current?.('VERIFICANDO', null);

      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // Fallback seguro si el widget ya fue destruido
        }
      }
    }, []);

    // Exponer métodos imperativos estables
    useImperativeHandle(ref, () => ({
      reset,
      getToken: () => token,
      getStatus: () => status,
      isVerified: () => status === 'VERIFICADO' && Boolean(token),
      isFailClosed: () => failClosed,
    }), [reset, token, status, failClosed]);

    // 1. Carga única y asíncrona del script oficial de Cloudflare Turnstile
    useEffect(() => {
      if (!isConfigured) return;

      const scriptId = 'cloudflare-turnstile-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (window.turnstile) {
        setIsScriptLoaded(true);
        return;
      }

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => setIsScriptLoaded(true);
        script.onerror = () => {
          setStatus('ERROR');
          onErrorRef.current?.('No se pudo cargar el script de Cloudflare Turnstile.');
          onStatusChangeRef.current?.(true);
          onVerificationChangeRef.current?.('ERROR', null);
        };
        document.head.appendChild(script);
      } else {
        const handleScriptLoad = () => setIsScriptLoaded(true);
        script.addEventListener('load', handleScriptLoad);
        return () => {
          script?.removeEventListener('load', handleScriptLoad);
        };
      }
    }, [isConfigured]);

    // 2. Renderizar el widget Turnstile EXACTAMENTE UNA VEZ por montaje de contenedor
    useEffect(() => {
      if (!isConfigured || !isScriptLoaded || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current || isRenderingRef.current) return;

      isRenderingRef.current = true;
      setStatus('VERIFICANDO');
      onStatusChangeRef.current?.(true);
      onVerificationChangeRef.current?.('VERIFICANDO', null);

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'dark',
          callback: (receivedToken: string) => {
            if (!receivedToken || !receivedToken.trim()) {
              setToken(null);
              setStatus('ERROR');
              onStatusChangeRef.current?.(true);
              onVerificationChangeRef.current?.('ERROR', null);
              return;
            }
            setToken(receivedToken);
            setStatus('VERIFICADO');
            onVerifyRef.current?.(receivedToken);
            onStatusChangeRef.current?.(false);
            onVerificationChangeRef.current?.('VERIFICADO', receivedToken);
          },
          'expired-callback': () => {
            setToken(null);
            setStatus('EXPIRADO');
            onExpireRef.current?.();
            onStatusChangeRef.current?.(true);
            onVerificationChangeRef.current?.('EXPIRADO', null);
          },
          'error-callback': (err: string) => {
            setToken(null);
            setStatus('ERROR');
            onErrorRef.current?.(err || 'Error en validación Cloudflare Turnstile.');
            onStatusChangeRef.current?.(true);
            onVerificationChangeRef.current?.('ERROR', null);
          },
        });

        widgetIdRef.current = id;
      } catch (e: unknown) {
        setStatus('ERROR');
        onErrorRef.current?.('Fallo al inicializar widget Turnstile.');
        onStatusChangeRef.current?.(true);
        onVerificationChangeRef.current?.('ERROR', null);
      } finally {
        isRenderingRef.current = false;
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Cleanup defensivo
          }
          widgetIdRef.current = null;
        }
      };
    }, [isConfigured, isScriptLoaded, siteKey, action]);

    // CASO 1: Turnstile Real Configurado (Widget Oficial)
    if (isConfigured) {
      return (
        <div className="my-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ShieldCheck className="h-4 w-4 text-sky-400 shrink-0" />
              <span>Verificación Humana Cloudflare Turnstile</span>
            </div>

            {status === 'VERIFICADO' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                VERIFICADO
              </span>
            )}
            {status === 'VERIFICANDO' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20">
                <RefreshCw className="h-3 w-3 animate-spin" />
                VERIFICANDO
              </span>
            )}
            {status === 'NO_VERIFICADO' && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                NO VERIFICADO
              </span>
            )}
            {status === 'EXPIRADO' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                <AlertTriangle className="h-3 w-3" />
                EXPIRADO
              </span>
            )}
            {status === 'ERROR' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                <XCircle className="h-3 w-3" />
                ERROR
              </span>
            )}
          </div>

          <div
            ref={containerRef}
            className="min-h-[65px] flex items-center justify-center my-1 rounded bg-slate-900/40"
          />

          {status === 'VERIFICADO' && (
            <p className="mt-1.5 text-[11px] text-emerald-400/90 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Verificación de seguridad Turnstile exitosa. Métodos habilitados.</span>
            </p>
          )}

          {status === 'EXPIRADO' && (
            <div className="mt-2 flex items-center justify-between text-xs text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-800/40">
              <span className="text-[11px]">La verificación ha expirado.</span>
              <button
                type="button"
                onClick={reset}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                Reintentar desafío
              </button>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="mt-2 flex items-center justify-between text-xs text-rose-300 bg-rose-950/30 p-2 rounded border border-rose-800/40">
              <span className="text-[11px]">No se pudo completar la verificación anti-bot.</span>
              <button
                type="button"
                onClick={reset}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
              >
                Reintentar
              </button>
            </div>
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

