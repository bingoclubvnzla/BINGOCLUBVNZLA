// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MODAL DE STEP-UP AUTHENTICATION (FASE 2.8)
// Experiencia requerida: "🔐 Seguridad adicional requerida. Esta operación modifica información sensible."
// ==============================================================================

import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, X, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { RISK_MATRIX } from '../../lib/mfaSecurity';
import { verifyTotpAndMintStepUpToken } from '../../services/mfaService';
import type { StepUpActionType, StepUpAuthorizationToken } from '../../types/mfa';

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: StepUpActionType;
  resourceId?: string | null;
  metadata?: Record<string, any>;
  onSuccess: (token: StepUpAuthorizationToken) => void;
  onRequireEnrollment?: () => void;
}

export const StepUpAuthModal: React.FC<StepUpAuthModalProps> = ({
  isOpen,
  onClose,
  actionType,
  resourceId,
  metadata,
  onSuccess,
  onRequireEnrollment,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  if (!isOpen) return null;

  const rule = RISK_MATRIX[actionType];
  const isCritical = rule?.riskLevel === 'CRITICAL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMessage('Por favor ingrese el código de 6 dígitos de su aplicación autenticadora.');
      return;
    }

    setLoading(true);

    try {
      const res = await verifyTotpAndMintStepUpToken(
        cleanCode,
        actionType,
        rule.riskLevel,
        resourceId,
        metadata
      );

      setLoading(false);

      if (res.success && res.token) {
        setCode('');
        onSuccess(res.token);
      } else {
        if (res.retryAfterSec) {
          setRetryAfter(res.retryAfterSec);
        }
        if (res.error?.includes('No tiene un factor TOTP activo')) {
          setErrorMessage(res.error);
          if (onRequireEnrollment) {
            setTimeout(() => {
              onClose();
              onRequireEnrollment();
            }, 1200);
          }
        } else {
          setErrorMessage(res.error || 'Código incorrecto o expirado.');
        }
      }
    } catch {
      setLoading(false);
      setErrorMessage('Error al verificar el código con el servidor de seguridad.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ENCABEZADO DE SEGURIDAD ESTRICTA */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl border ${
            isCritical
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
          }`}>
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              🔐 Seguridad adicional requerida
            </h3>
            <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
              isCritical
                ? 'bg-rose-950/50 border-rose-500/30 text-rose-400'
                : 'bg-amber-950/50 border-amber-500/30 text-amber-400'
            }`}>
              Nivel de Riesgo: {rule?.riskLevel || 'HIGH'}
            </span>
          </div>
        </div>

        {/* MENSAJE EXPLICATIVO */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 mb-5 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-white">
            Esta operación modifica información sensible: <span className="text-amber-400">{rule?.description || actionType}</span>.
          </p>
          <p className="text-slate-400 leading-relaxed">
            {rule?.userWarning || 'Para continuar debe confirmar su identidad introduciendo el código actual de su aplicación de autenticación.'}
          </p>
        </div>

        {/* ALERTA DE ERROR O RATE LIMIT */}
        {errorMessage && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 mb-4 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* FORMULARIO DE CÓDIGO TOTP */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Código Google Authenticator / TOTP</span>
              <span className="text-[11px] text-slate-500 font-normal">6 dígitos numéricos</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                disabled={loading || Boolean(retryAfter)}
                className="w-full text-center tracking-[0.5em] text-xl font-mono font-bold rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-white placeholder-slate-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              <KeyRound className="absolute right-3.5 top-3.5 h-5 w-5 text-slate-600 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 py-2.5 px-4 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6 || Boolean(retryAfter)}
              className={`flex-1 rounded-xl py-2.5 px-4 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isCritical
                  ? 'bg-rose-600 hover:bg-rose-500 text-white disabled:bg-rose-950 disabled:text-rose-400'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>AUTORIZAR ACCIÓN</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Validación criptográfica server-side (RFC 6238 / Anti-Replay)</span>
          </p>
        </div>
      </div>
    </div>
  );
};
