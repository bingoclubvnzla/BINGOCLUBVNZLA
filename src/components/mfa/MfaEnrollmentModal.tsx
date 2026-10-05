// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MODAL DE ENROLAMIENTO TOTP (FASE 2.8)
// Compatible con Google Authenticator, Microsoft Authenticator, Authy y RFC 6238
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, QrCode, Copy, Check, AlertTriangle, X, Loader2, Key, Smartphone } from 'lucide-react';
import { enrollTotpFactor, verifyTotpEnrollment } from '../../services/mfaService';

interface MfaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentSuccess: () => void;
}

export const MfaEnrollmentModal: React.FC<MfaEnrollmentModalProps> = ({
  isOpen,
  onClose,
  onEnrollmentSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFactorId(null);
      setQrCode(null);
      setSecret(null);
      setCode('');
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);

    enrollTotpFactor().then((res) => {
      if (!isMounted) return;
      setLoading(false);
      if (res.success && res.factorId) {
        setFactorId(res.factorId);
        setQrCode(res.qrCode || null);
        setSecret(res.secret || null);
      } else {
        setErrorMessage(res.error || 'No se pudo iniciar el enrolamiento.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMessage('Ingrese los 6 dígitos generados por su aplicación.');
      return;
    }

    setVerifyLoading(true);
    setErrorMessage(null);

    const res = await verifyTotpEnrollment(factorId, cleanCode);
    setVerifyLoading(false);

    if (res.success) {
      onEnrollmentSuccess();
      onClose();
    } else {
      setErrorMessage(res.error || 'Código incorrecto. Intente nuevamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          disabled={verifyLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ENCABEZADO */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-display">
              Activar Autenticación en Dos Pasos (MFA / TOTP)
            </h3>
            <p className="text-xs text-slate-400">
              Compatible con Google Authenticator, Microsoft Authenticator o Authy
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 text-amber-400 animate-spin mb-3" />
            <p className="text-xs text-slate-400">Generando secreto criptográfico seguro en Supabase Auth...</p>
          </div>
        ) : errorMessage && !factorId ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-rose-400 mx-auto mb-2" />
            <p className="text-xs text-rose-300 font-semibold mb-3">{errorMessage}</p>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* PASO 1: ESCANEAR QR */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px]">1</span>
                <span>Escanea el código QR</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Abre tu app autenticadora en tu teléfono (Google Authenticator) y escanea la siguiente imagen:
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                {qrCode ? (
                  <div className="p-2 bg-white rounded-lg shrink-0">
                    <img
                      src={qrCode}
                      alt="Código QR de autenticación TOTP"
                      className="h-32 w-32 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-32 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                    <QrCode className="h-10 w-10" />
                  </div>
                )}

                <div className="text-xs space-y-2 w-full">
                  <div className="text-slate-400 font-medium">¿No puedes escanear el QR?</div>
                  <div className="text-[11px] text-slate-500">
                    Ingresa manualmente la siguiente clave secreta en tu aplicación:
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="block flex-1 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded text-[11px] font-mono text-amber-400 break-all select-all">
                      {secret || 'GENERANDO...'}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
                      title="Copiar clave secreta"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PASO 2: VERIFICAR CÓDIGO */}
            <form onSubmit={handleVerify} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px]">2</span>
                <span>Introduce el código de 6 dígitos</span>
              </div>
              <p className="text-xs text-slate-400">
                Escribe el código temporal que muestra tu aplicación para certificar la vinculación:
              </p>

              {errorMessage && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-2.5 flex items-center gap-2 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.4em] font-mono font-bold text-lg rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={verifyLoading || code.length !== 6}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-5 text-xs transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
                >
                  {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>ACTIVAR MFA</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
