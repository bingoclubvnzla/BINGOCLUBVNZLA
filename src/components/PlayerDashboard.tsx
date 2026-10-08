// ==============================================================================
// BINGO CLUB VNZLA ONLINE — DASHBOARD & LOBBY DEL JUGADOR (PLAYER)
// Principio: Experiencia de club de bingo en vivo, 100% Server Authoritative.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFallbackModalities, fetchRecentAuditLogs, fetchActiveDraws, fetchUserCards } from '../lib/supabase';
import type { GameModality, AuditLogEntry, Draw, Card } from '../types/database';
import type { MfaFactorInfo, StepUpActionType, StepUpAuthorizationToken } from '../types/mfa';
import {
  isMfaMandatoryForRole,
  canRoleDisableMfa,
  isValidVenezuelanPhone,
  maskPhone
} from '../lib/mfaSecurity';
import {
  listUserMfaFactors,
  unenrollTotpFactor,
  executeChangePagoMovil,
  executeRequestWithdrawal,
  executeAccountDeletion
} from '../services/mfaService';
import { MfaEnrollmentModal } from './mfa/MfaEnrollmentModal';
import { StepUpAuthModal } from './mfa/StepUpAuthModal';
import { BingoCard } from './BingoCard';
import { playClickSound } from '../lib/soundFx';
import {
  Wallet,
  Grid3X3,
  History,
  User,
  Shield,
  LogOut,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Layers,
  Dices,
  ExternalLink,
  Smartphone,
  KeyRound,
  AlertTriangle,
  Trash2,
  ArrowRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
  Radio,
  Play,
  Trophy,
  Copy
} from 'lucide-react';

interface PlayerDashboardProps {
  onEnterLiveRoom?: (modalityId: string) => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ onEnterLiveRoom }) => {
  const { user, profile, publicId, role, signOut, updateProfileDetails, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'sorteos' | 'cartones' | 'historial' | 'perfil' | 'seguridad'>('sorteos');
  const [copiedId, setCopiedId] = useState(false);

  // Formulario de edición de perfil
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados de MFA y Step-Up (Fase 2.8)
  const [mfaFactors, setMfaFactors] = useState<MfaFactorInfo[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isStepUpModalOpen, setIsStepUpModalOpen] = useState(false);
  const [stepUpAction, setStepUpAction] = useState<StepUpActionType>('CHANGE_PAGO_MOVIL');
  const [stepUpMetadata, setStepUpMetadata] = useState<Record<string, any>>({});
  const [pendingActionCallback, setPendingActionCallback] = useState<((token: StepUpAuthorizationToken) => Promise<void>) | null>(null);

  // Formularios de operaciones sensibles
  const [pagoMovilPhone, setPagoMovilPhone] = useState((profile as any)?.pago_movil_phone || '');
  const [pagoMovilBank, setPagoMovilBank] = useState((profile as any)?.pago_movil_bank || '0102 - BANCO DE VENEZUELA');
  const [withdrawalAmount, setWithdrawalAmount] = useState('50.00');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [securityAuditLogs, setSecurityAuditLogs] = useState<AuditLogEntry[]>([]);

  // Sorteos reales y Cartones reales desde Supabase
  const [activeDraws, setActiveDraws] = useState<Draw[]>([]);
  const [drawsLoading, setDrawsLoading] = useState(false);
  const [userCards, setUserCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [demoModalityFilter, setDemoModalityFilter] = useState<string>('TODAS');

  const loadActiveDraws = async () => {
    setDrawsLoading(true);
    const res = await fetchActiveDraws();
    setActiveDraws(res.data);
    setDrawsLoading(false);
  };

  const loadUserCards = async () => {
    if (!user?.id) return;
    setCardsLoading(true);
    const res = await fetchUserCards(user.id);
    setUserCards(res.data);
    setCardsLoading(false);
  };

  useEffect(() => {
    loadActiveDraws();
  }, []);

  useEffect(() => {
    if (activeTab === 'cartones') {
      loadUserCards();
    }
  }, [activeTab, user?.id]);

  const isMfaMandatory = isMfaMandatoryForRole(role);
  const canDisable = canRoleDisableMfa(role);
  const isMfaActive = Boolean((profile as any)?.mfa_enabled || mfaFactors.some((f) => f.status === 'verified'));

  // Carga de factores MFA y bitácora de auditoría al ingresar a la pestaña de seguridad
  const refreshMfaState = async () => {
    setMfaLoading(true);
    const [factorsRes, auditRes] = await Promise.all([
      listUserMfaFactors(),
      fetchRecentAuditLogs(10),
    ]);
    if (factorsRes.success) {
      setMfaFactors(factorsRes.factors);
    }
    if (auditRes.data) {
      setSecurityAuditLogs(auditRes.data);
    }
    setMfaLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'seguridad') {
      refreshMfaState();
    }
  }, [activeTab]);

  // Manejador centralizado de Step-Up
  const triggerStepUpAction = (
    action: StepUpActionType,
    metadata: Record<string, any>,
    callback: (token: StepUpAuthorizationToken) => Promise<void>
  ) => {
    if (!isMfaActive) {
      setFeedbackMsg({
        type: 'error',
        text: 'Esta operación de alto riesgo requiere tener activo Google Authenticator (MFA / TOTP). Active su segundo factor a continuación.',
      });
      setIsEnrollmentModalOpen(true);
      return;
    }
    setStepUpAction(action);
    setStepUpMetadata(metadata);
    setPendingActionCallback(() => callback);
    setIsStepUpModalOpen(true);
  };

  const handleStepUpSuccess = async (token: StepUpAuthorizationToken) => {
    setIsStepUpModalOpen(false);
    if (pendingActionCallback) {
      try {
        setSaveLoading(true);
        await pendingActionCallback(token);
        await refreshMfaState();
      } catch (err: any) {
        setFeedbackMsg({ type: 'error', text: err.message || 'Error al ejecutar acción sensible.' });
      } finally {
        setSaveLoading(false);
        setPendingActionCallback(null);
      }
    }
  };

  // 1. Acción sensible: Cambio de Pago Móvil (HIGH)
  const handlePagoMovilSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidVenezuelanPhone(pagoMovilPhone)) {
      setFeedbackMsg({
        type: 'error',
        text: 'El número telefónico debe tener formato venezolano válido de 11 dígitos (0414, 0424, 0412, 0416, 0426).',
      });
      return;
    }

    triggerStepUpAction(
      'CHANGE_PAGO_MOVIL',
      { phone_masked: maskPhone(pagoMovilPhone), bank: pagoMovilBank },
      async (token) => {
        const res = await executeChangePagoMovil(token.authorization_id, pagoMovilPhone, pagoMovilBank);
        if (res.success) {
          setFeedbackMsg({
            type: 'success',
            text: 'Datos de Pago Móvil actualizados exitosamente en el servidor. Por política de seguridad, se activó un período de protección de 24 horas.',
          });
        } else {
          setFeedbackMsg({ type: 'error', text: res.error || 'Error al actualizar Pago Móvil.' });
        }
      }
    );
  };

  // 2. Acción sensible: Solicitud de Retiro (HIGH)
  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Ingrese un monto de retiro válido mayor a cero.' });
      return;
    }

    triggerStepUpAction(
      'REQUEST_WITHDRAWAL',
      { amount: amountNum, destination: pagoMovilPhone || 'PAGO_MOVIL' },
      async (token) => {
        const res = await executeRequestWithdrawal(token.authorization_id, amountNum, 'VES', pagoMovilPhone || '04140000000');
        if (res.success) {
          setFeedbackMsg({
            type: 'success',
            text: `Solicitud de retiro por Bs. ${amountNum.toFixed(2)} registrada exitosamente en estado PENDING_REVIEW.`,
          });
        } else {
          setFeedbackMsg({ type: 'error', text: res.error || 'No se pudo procesar la solicitud de retiro.' });
        }
      }
    );
  };

  // 3. Acción sensible: Eliminación de Cuenta (CRITICAL)
  const handleAccountDeletionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation.trim() !== 'ELIMINAR MI CUENTA DEFINITIVAMENTE') {
      setFeedbackMsg({
        type: 'error',
        text: 'Debe escribir exactamente la frase de confirmación: ELIMINAR MI CUENTA DEFINITIVAMENTE',
      });
      return;
    }

    triggerStepUpAction(
      'ACCOUNT_DELETION',
      { confirmation: true },
      async (token) => {
        const res = await executeAccountDeletion(token.authorization_id, deleteConfirmation);
        if (res.success) {
          alert('Su cuenta ha sido eliminada y sus datos anonimizados. Se cerrará su sesión.');
          await signOut();
        } else {
          setFeedbackMsg({ type: 'error', text: res.error || 'Error al eliminar cuenta.' });
        }
      }
    );
  };

  // 4. Desactivación de MFA
  const handleDisableMfa = (factorId: string) => {
    if (!canDisable) {
      alert(`Acceso denegado: El rol ${role} tiene política estricta de MFA obligatorio en el servidor.`);
      return;
    }

    triggerStepUpAction(
      'MFA_DISABLE',
      { factor_id: factorId },
      async () => {
        const res = await unenrollTotpFactor(factorId);
        if (res.success) {
          setFeedbackMsg({ type: 'success', text: 'Factor MFA desactivado correctamente.' });
          await refreshMfaState();
        } else {
          setFeedbackMsg({ type: 'error', text: res.error || 'Error al desactivar MFA.' });
        }
      }
    );
  };

  const modalities = getFallbackModalities();

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setFeedbackMsg(null);

    const res = await updateProfileDetails({
      full_name: fullName.trim(),
      display_name: displayName.trim(),
      phone: phone.trim(),
    });

    setSaveLoading(false);
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: 'Perfil actualizado exitosamente en el servidor.' });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Error al actualizar perfil.' });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSaveLoading(true);
    const res = await resetPassword(user.email);
    setSaveLoading(false);
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: `Correo de restablecimiento enviado a ${user.email}` });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Error al solicitar cambio de clave.' });
    }
  };

  const copyPublicId = () => {
    if (!publicId) return;
    navigator.clipboard?.writeText(publicId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-100 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 md:pb-12">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* ==================================================================== */}
        {/* HERO: VIP PLAYER CLUB PASS & GAMING ACTION                           */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card VIP del Jugador */}
          <div className="lg:col-span-8 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-amber-950/20 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Sutil acento superior tricolor */}
            <div className="absolute top-0 inset-x-0 h-1 criollo-accent-bar" />
            
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>CLUB VIP VENEZUELA · SOCIO OFICIAL</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyPublicId}
                    title="Copiar ID Público"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <span>ID: {publicId}</span>
                    {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                  </button>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ACTIVO
                  </span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white font-display tracking-tight">
                Bienvenido, <span className="gold-text-gradient">{profile?.display_name || 'Jugador Oficial'}</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Tu centro de entretenimiento de bingo venezolano en vivo. Sintoniza las salas oficiales, sigue las balotas cantadas en directo y administra tus cartones autorizados.
              </p>
            </div>

            {/* Fila de acceso rápido a sorteos en directo */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Dices className="h-4 w-4 text-amber-400" />
                  <span>5 Modalidades</span>
                </div>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <div className="flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-emerald-400" />
                  <span>Salas en Vivo 24/7</span>
                </div>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-sky-400" />
                  <span>Rol: <strong className="text-slate-200">{role}</strong></span>
                </div>
              </div>

              {onEnterLiveRoom && (
                <button
                  onClick={() => { playClickSound(); onEnterLiveRoom('BINGO_75'); }}
                  className="flex items-center gap-2 py-3 px-6 rounded-2xl btn-gaming-gold shine-sweep text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl cursor-pointer whitespace-nowrap"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Sintonizar Sala en Vivo</span>
                </button>
              )}
            </div>
          </div>

          {/* Módulo de Billetera Recreativa & Estado */}
          <div className="lg:col-span-4 rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-white font-display">Billetera Oficial</span>
                </div>
                <span className="text-[10px] font-mono font-black text-amber-400/90 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Modo Recreativo
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner">
                <div className="text-[11px] font-mono text-slate-400 font-semibold">Balance de Fichas Oficiales</div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1 flex items-center gap-2">
                  <span className="gold-text-gradient drop-shadow-sm">1,000</span>
                  <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">BCV FICHAS</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Créditos oficiales asignados para partidas del Club
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-slate-300 font-bold block mb-0.5">Operaciones Financieras:</span>
                Las transacciones con fondos reales se activarán de manera progresiva tras la certificación regulatoria correspondiente.
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px] font-bold">Seguridad 2FA / MFA:</span>
              <span className={isMfaActive ? 'text-emerald-400 font-extrabold flex items-center gap-1' : 'text-amber-400 font-bold'}>
                {isMfaActive ? '● Protegido' : 'Recomendado activar'}
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* NAVEGACIÓN DE PESTAÑAS GAMING                                        */}
        {/* ==================================================================== */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => { playClickSound(); setActiveTab('sorteos'); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs rounded-xl transition-all cursor-pointer ${
              activeTab === 'sorteos'
                ? 'btn-gaming-gold shine-sweep text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent font-bold'
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>Salas y Sorteos en Vivo</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab('cartones'); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs rounded-xl transition-all cursor-pointer ${
              activeTab === 'cartones'
                ? 'btn-gaming-gold shine-sweep text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent font-bold'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            <span>Mis Cartones</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab('historial'); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs rounded-xl transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'btn-gaming-gold shine-sweep text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent font-bold'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Historial</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab('perfil'); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs rounded-xl transition-all cursor-pointer ${
              activeTab === 'perfil'
                ? 'btn-gaming-gold shine-sweep text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent font-bold'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Perfil</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab('seguridad'); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs rounded-xl transition-all cursor-pointer ${
              activeTab === 'seguridad'
                ? 'btn-gaming-gold shine-sweep text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent font-bold'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Seguridad & MFA</span>
          </button>

          <div className="ml-auto">
            <button
              onClick={() => { playClickSound(); signOut(); }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-950/60 rounded-xl border border-rose-900/60 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PESTAÑA: SALAS Y SORTEOS EN VIVO                                     */}
        {/* ==================================================================== */}
        {activeTab === 'sorteos' && (
          <div className="space-y-8">
            {/* Sorteos programados reales desde base de datos si existen */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-white font-display">
                    Sorteos Programados con Transmisión Oficial
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sorteos autorizados transmitidos por Supabase Realtime con verificación criptográfica.
                  </p>
                </div>
                <button
                  onClick={loadActiveDraws}
                  disabled={drawsLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${drawsLoading ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>

              {activeDraws.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeDraws.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 flex flex-col justify-between shadow-xl hover:border-amber-500/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-3">
                          <span className="text-amber-400 font-bold">#{d.draw_number || d.id.slice(0, 8)}</span>
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {d.status}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white font-display">
                          {d.title || `Sorteo de ${d.modality_id}`}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400 font-mono">
                          Modalidad: <strong className="text-amber-300">{d.modality_id}</strong>
                        </p>

                        {d.scheduled_at && (
                          <div className="mt-4 text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            <span>{new Date(d.scheduled_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800/80">
                        {onEnterLiveRoom && (
                          <button
                            onClick={() => { playClickSound(); onEnterLiveRoom(d.modality_id); }}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-xs font-black text-slate-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-98"
                          >
                            <Radio className="h-3.5 w-3.5" />
                            <span>Entrar a la Sala en Vivo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-center max-w-xl mx-auto">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 mb-2.5">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white font-display">
                    Sorteos oficiales en preparación
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                    Los operadores programan partidas continuas. Puedes acceder de inmediato a cualquiera de las 5 salas fijas a continuación.
                  </p>
                </div>
              )}
            </div>

            {/* Catálogo de las 5 Salas Fijas Oficiales del Club */}
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Dices className="h-4 w-4 text-amber-400" />
                  <span>Salas Oficiales por Modalidad Venezolana</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ingresa a cualquier sala para sintonizar la extracción de balotas con locución oficial.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modalities.map((mod) => (
                  <div
                    key={mod.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-xl group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                        <span className="text-amber-400 font-bold">{mod.id}</span>
                        <span>{mod.grid_rows}x{mod.grid_cols} · {mod.total_balls} balotas</span>
                      </div>
                      <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors font-display">
                        {mod.name}
                      </h4>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {mod.description}
                      </p>

                      <div className="mt-4 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between">
                        <span>Casilla Central:</span>
                        <strong className="text-amber-300 font-mono">
                          {mod.has_free_center ? 'LIBRE (FREE)' : 'Con Número'}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-800/80">
                      {onEnterLiveRoom && (
                        <button
                          onClick={() => { playClickSound(); onEnterLiveRoom(mod.id); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-xs font-bold text-white transition-all cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Entrar a la Sala</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA: MIS CARTONES                                                */}
        {/* ==================================================================== */}
        {activeTab === 'cartones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white font-display">
                  Tus Cartones Certificados
                </h2>
                <p className="text-xs text-slate-400">
                  Cartones vinculados a tu ID de jugador. La validación matemática de aciertos es server-authoritative.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadUserCards}
                  disabled={cardsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Actualizar cartones"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cardsLoading ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {userCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userCards.map((c) => {
                  const matchingDraw = activeDraws.find((d) => d.id === c.draw_id);
                  return (
                    <BingoCard
                      key={c.id}
                      card={c}
                      drawnNumbers={matchingDraw?.drawn_numbers || []}
                      modalityId={matchingDraw?.modality_id || 'BINGO_75'}
                      isDrawActive={matchingDraw?.status === 'ACTIVE'}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Grid3X3 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">
                  Aún no tienes cartones emitidos en este sorteo
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                  Tus cartones adquiridos se vincularán automáticamente a tu ID <strong className="text-amber-400 font-mono">{publicId}</strong>. Puedes ingresar a cualquier sala para seguir la partida o consultar los sorteos activos.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('sorteos')}
                    className="px-6 py-3 rounded-2xl btn-gaming-gold shine-sweep text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                  >
                    EXPLORAR SALAS EN VIVO
                  </button>
                  {onEnterLiveRoom && (
                    <button
                      onClick={() => onEnterLiveRoom('BINGO_75')}
                      className="px-6 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                    >
                      IR A LA SALA PRINCIPAL
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA: HISTORIAL                                                   */}
        {/* ==================================================================== */}
        {activeTab === 'historial' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Registro de Partidas y Premios
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID de Jugador: <strong className="text-amber-400 font-mono">{publicId}</strong> · Trazabilidad Monotónica
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <p>
                  Todas las partidas concluidas, validaciones de bingo otorgadas y eventos de sorteo se almacenan de forma inmutable en PostgreSQL.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
                  <span>Modo: OFICIAL RECREATIVO</span>
                  <span aria-hidden="true">·</span>
                  <span>Auditoría Forense: ACTIVA</span>
                  <span aria-hidden="true">·</span>
                  <span>Server-Authoritative: SÍ</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA: PERFIL                                                      */}
        {/* ==================================================================== */}
        {activeTab === 'perfil' && (
          <div className="max-w-2xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-2xl">
            <h2 className="text-lg font-bold text-white font-display mb-1">
              Perfil del Jugador
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Tus datos de cuenta en Bingo Club Venezuela. Tu ID público es el único identificador visible para otros jugadores.
            </p>

            {feedbackMsg && (
              <div className={`mb-6 flex items-center gap-2 rounded-xl p-3.5 text-xs border ${
                feedbackMsg.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}>
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Identificador Público (Inmutable)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={publicId}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs font-mono text-amber-400 font-bold opacity-80 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Rol Asignado por el Servidor
                  </label>
                  <input
                    type="text"
                    disabled
                    value={role}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs font-mono text-slate-300 font-semibold opacity-80 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Público / Apodo en Salas
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nombre visible para otros jugadores"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
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
                  placeholder="+58 412 1234567"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 py-3 px-6 text-xs font-black text-slate-950 transition-all cursor-pointer shadow-md shadow-amber-500/10 active:scale-95"
                >
                  {saveLoading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA: SEGURIDAD & MFA (FASE 2.8 STEP-UP)                           */}
        {/* ==================================================================== */}
        {activeTab === 'seguridad' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 1. ESTADO GENERAL DE MFA */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${
                    isMfaActive
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                  }`}>
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                      <span>Autenticación de Dos Factores (MFA / TOTP)</span>
                      {isMfaActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          <Check className="h-3 w-3" /> ACTIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-700">
                          INACTIVO
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Protección estándar RFC 6238 compatible con Google Authenticator, Microsoft Authenticator y Authy.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshMfaState}
                    disabled={mfaLoading}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Actualizar estado de seguridad"
                  >
                    <RefreshCw className={`h-4 w-4 ${mfaLoading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                  {!isMfaActive ? (
                    <button
                      onClick={() => setIsEnrollmentModalOpen(true)}
                      className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>ACTIVAR AUTENTICADOR</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {isMfaMandatory && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 mb-5 flex items-start gap-2.5 text-xs text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Política Estricta de Seguridad:</strong> Como usuario con rol{' '}
                    <strong className="text-white">{role}</strong>, el segundo factor es <u>obligatorio</u> por arquitectura para ejecutar acciones operativas y administrativas.
                  </div>
                </div>
              )}

              {/* FACTORES ACTIVOS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Factores Registrados ({mfaFactors.length})
                </h3>

                {mfaFactors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                    No tiene ningún factor TOTP registrado actualmente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mfaFactors.map((factor) => (
                      <div
                        key={factor.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{factor.friendly_name || 'Google Authenticator'}</span>
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded font-mono">
                                VERIFICADO
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ID: {factor.id.substring(0, 12)}... · Enrolado: {new Date(factor.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {canDisable ? (
                          <button
                            onClick={() => handleDisableMfa(factor.id)}
                            className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-rose-950 hover:border-rose-700/50 hover:text-rose-400 px-3 py-1.5 text-xs text-slate-400 transition-colors self-start sm:self-auto cursor-pointer"
                          >
                            Desactivar Factor
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Obligatorio por Rol ({role})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. ACCIONES PROTEGIDAS POR STEP-UP (PAGO MÓVIL Y RETIROS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CAMBIO DE PAGO MÓVIL (HIGH RISK) */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  <Lock className="h-4 w-4" />
                  <span>Datos de Pago Móvil (Step-Up)</span>
                </div>
                <h3 className="text-base font-bold text-white font-display mb-1">
                  Modificar Cuenta Receptora
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Requiere validación de 2FA. Tras modificar sus datos, se activa un enfriamiento (cooldown) de 24 horas por seguridad.
                </p>

                <form onSubmit={handlePagoMovilSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Teléfono Registrado (11 dígitos)
                    </label>
                    <input
                      type="tel"
                      value={pagoMovilPhone}
                      onChange={(e) => setPagoMovilPhone(e.target.value)}
                      placeholder="04141234567"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Banco Receptor
                    </label>
                    <select
                      value={pagoMovilBank}
                      onChange={(e) => setPagoMovilBank(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="0102 - BANCO DE VENEZUELA">0102 - Banco de Venezuela</option>
                      <option value="0108 - BANCO PROVINCIAL">0108 - BBVA Provincial</option>
                      <option value="0134 - BANESCO">0134 - Banesco</option>
                      <option value="0105 - BANCO MERCANTIL">0105 - Banco Mercantil</option>
                      <option value="0114 - BANCARIBE">0114 - Bancaribe</option>
                      <option value="0163 - BANCO DEL TESORO">0163 - Banco del Tesoro</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="w-full mt-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    <span>ACTUALIZAR CON STEP-UP</span>
                  </button>
                </form>
              </div>

              {/* SOLICITUD DE RETIRO (HIGH RISK) */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  <Wallet className="h-4 w-4" />
                  <span>Retiro de Fondos (Step-Up)</span>
                </div>
                <h3 className="text-base font-bold text-white font-display mb-1">
                  Solicitud Segura de Retiro
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Requiere confirmación TOTP. La solicitud se registrará de forma inmutable para revisión del operador.
                </p>

                <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Monto a Retirar (VES)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="50.00"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none font-mono"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500">VES</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                    Destino: <strong className="text-white">{pagoMovilPhone ? maskPhone(pagoMovilPhone) : 'Pago Móvil registrado'}</strong> ({pagoMovilBank.split(' - ')[1] || 'Banco Principal'})
                  </div>

                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="w-full mt-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 py-2.5 text-xs font-bold text-amber-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    <span>SOLICITAR RETIRO CON TOTP</span>
                  </button>
                </form>
              </div>
            </div>

            {/* 3. CONTRASEÑA Y DETALLES DE SESIÓN */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                <span>Credenciales y Estado Criptográfico</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Protección criptográfica y comprobación de integridad forense.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950">
                <div>
                  <div className="text-xs font-bold text-white">Contraseña de Acceso</div>
                  <div className="text-[11px] text-slate-400">
                    Enlace de recuperación enviado por correo con cifrado asimétrico.
                  </div>
                </div>
                <button
                  onClick={handlePasswordReset}
                  disabled={saveLoading}
                  className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
                >
                  Cambiar Contraseña
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-slate-500 text-[10px]">PROTECCIÓN RLS</div>
                  <div className="text-emerald-400 font-bold mt-0.5">ACTIVA (100%)</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-slate-500 text-[10px]">AUTORIDAD CLIENTE</div>
                  <div className="text-rose-400 font-bold mt-0.5">DENEGADA (Server Only)</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-slate-500 text-[10px]">ID PÚBLICO</div>
                  <div className="text-amber-400 font-bold mt-0.5">{publicId}</div>
                </div>
              </div>
            </div>

            {/* 4. HISTORIAL DE AUDITORÍA RECIENTE */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h3 className="text-base font-bold text-white font-display mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>Historial de Seguridad y Auditoría (Últimos Eventos)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Bitácora forense inmutable registrada en PostgreSQL.
              </p>

              {securityAuditLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                  Sin eventos recientes de seguridad.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                  {securityAuditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
                        <div>
                          <strong className="text-white font-mono">{log.action}</strong>
                          <span className="text-[11px] text-slate-500 ml-2">Rol: {log.actor_role}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. ZONA CRÍTICA: ELIMINACIÓN DE CUENTA (CRITICAL RISK) */}
            <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-6 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Zona Crítica e Irreversible</span>
              </div>
              <h3 className="text-base font-bold text-white font-display mb-1">
                Eliminación Definitiva de Cuenta
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Esta acción es irreversible y requiere autenticación de dos pasos. Por cumplimiento normativo y fiscal, sus transacciones contables permanecerán en la bitácora inmutable, mientras que sus datos personales de perfil serán anonimizados.
              </p>

              <form onSubmit={handleAccountDeletionSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Escriba exactamente: <code className="text-rose-400 font-bold select-all">ELIMINAR MI CUENTA DEFINITIVAMENTE</code>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="ELIMINAR MI CUENTA DEFINITIVAMENTE"
                    className="w-full rounded-xl border border-rose-500/40 bg-slate-950 py-2.5 px-3 text-xs text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveLoading || deleteConfirmation.trim() !== 'ELIMINAR MI CUENTA DEFINITIVAMENTE'}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 py-2.5 px-4 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>ELIMINAR CUENTA CON STEP-UP TOTP</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* MODALES DE STEP-UP Y ENROLAMIENTO MFA (FASE 2.8) */}
      <MfaEnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        onEnrollmentSuccess={async () => {
          setFeedbackMsg({
            type: 'success',
            text: 'Google Authenticator (MFA / TOTP) ha sido activado y verificado exitosamente.',
          });
          await refreshMfaState();
        }}
      />

      <StepUpAuthModal
        isOpen={isStepUpModalOpen}
        onClose={() => {
          setIsStepUpModalOpen(false);
          setPendingActionCallback(null);
        }}
        actionType={stepUpAction}
        metadata={stepUpMetadata}
        onSuccess={handleStepUpSuccess}
        onRequireEnrollment={() => setIsEnrollmentModalOpen(true)}
      />
    </div>
  );
};
