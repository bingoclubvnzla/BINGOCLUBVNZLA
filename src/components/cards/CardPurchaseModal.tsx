// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MODAL OFICIAL: ADQUIRIR CARTONES DIGITALES
// Arquitectura Server-Authoritative, Mobile-First, Trazabilidad e Integridad Criptográfica.
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Lock,
  Wallet,
  Grid3X3,
  RefreshCw,
  Trophy,
  Info,
  Check,
  QrCode,
  Hash
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { purchaseCardsAuthoritative } from '../../services/cardService';
import { getPurchaseQuote } from '../../services/financeService';
import { fetchActiveDraws } from '../../lib/supabase';
import type { Draw, Card, ModalityCode } from '../../types/database';
import { playClickSound, playWinSound } from '../../lib/soundFx';

export interface CardPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDrawId?: string | null;
  initialModality?: ModalityCode | string;
  onPurchaseSuccess?: (cards: Card[]) => void;
  onOpenAuthModal?: () => void;
  onNavigateToLiveRoom?: (modality: string) => void;
}

const MODALITY_CONFIGS: Record<
  string,
  {
    name: string;
    description: string;
    matrixFormat: string;
    balls: number;
    badgeColor: string;
    prizeScheme: string;
    rules: string[];
  }
> = {
  BINGO_75: {
    name: 'Bingo Tradicional 75',
    description: 'Matriz 5x5 americana con columnas B-I-N-G-O y centro LIBRE oficial.',
    matrixFormat: '5 × 5 (24 números + 1 FREE)',
    balls: 75,
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    prizeScheme: 'Línea 25% · Cartón Lleno 75%',
    rules: ['Rangos por columna B:1-15, I:16-30, N:31-45, G:46-60, O:61-75', 'Casilla central pre-marcada (FREE)', 'Múltiples figuras de premiación autoritativa'],
  },
  BINGO_90: {
    name: 'Bingo 90 Bolas',
    description: 'Cartón europeo tradicional de 3 filas y 9 columnas con 15 números.',
    matrixFormat: '3 × 9 (15 números · 5 por fila)',
    balls: 90,
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    prizeScheme: 'Quiniela Oficial / Cartón Lleno 100%',
    rules: ['5 números y 4 casillas en blanco por cada fila', 'Columnas distribuidas por decenas 1 a 90', 'Extracción continua de alta rotación'],
  },
  ANIMALITOS: {
    name: 'Animalitos Vnzla',
    description: 'Edición temática tradicional venezolana basada en el catálogo de 75 figuras autóctonas.',
    matrixFormat: '5 × 5 (24 figuras + 1 centro)',
    balls: 75,
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    prizeScheme: 'Premio Oficial Modalidad Animalitos',
    rules: ['Valores 1-75 correspondientes a la ruleta clásica', 'Locución y TTS con nombres autóctonos oficiales', 'Casilla central de cortesía garantizada'],
  },
  OBJETOS: {
    name: 'Bingo de Objetos',
    description: 'Variante visual folclórica venezolana con símbolos cotidianos y emblemáticos.',
    matrixFormat: '5 × 5 (24 objetos + 1 centro)',
    balls: 75,
    badgeColor: 'border-violet-500/40 text-violet-300 bg-violet-500/10',
    prizeScheme: 'Línea & Bingo Pleno de Objetos',
    rules: ['Catálogo oficial de símbolos nacionales', 'Matriz 5x5 con centro libre', 'Asignación matemática server-side'],
  },
  CHAPITAS: {
    name: 'Chapitas Rápido',
    description: 'Modalidad comunitaria express inspirada en el formato de chapitas circulares.',
    matrixFormat: '3 × 9 (15 chapitas activas)',
    balls: 90,
    badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
    prizeScheme: 'Chapita Plena 100%',
    rules: ['Formato dinámico de 15 posiciones en cuadrícula 3x9', 'Numeración oficial mapeada 1 a 90', 'Partidas ágiles y entretenidas'],
  },
};

export const CardPurchaseModal: React.FC<CardPurchaseModalProps> = ({
  isOpen,
  onClose,
  initialDrawId,
  initialModality = 'BINGO_75',
  onPurchaseSuccess,
  onOpenAuthModal,
  onNavigateToLiveRoom,
}) => {
  const { user, profile } = useAuth();

  // Estados del flujo de compra
  const [activeDraws, setActiveDraws] = useState<Draw[]>([]);
  const [loadingDraws, setLoadingDraws] = useState<boolean>(false);
  const [selectedDrawId, setSelectedDrawId] = useState<string>(initialDrawId || '');
  const [selectedModality, setSelectedModality] = useState<string>(initialModality);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'PAGO_MOVIL' | 'BINANCE_PAY' | 'PROMO'>('BALANCE');

  // Estados de ejecución transaccional
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuedCards, setIssuedCards] = useState<Card[] | null>(null);
  const [purchaseSummary, setPurchaseSummary] = useState<{
    purchaseId: string;
    totalAmount: number;
    unitPrice: number;
    quantity: number;
  } | null>(null);

  // Sincronizar modalidad si cambia externamente
  useEffect(() => {
    if (initialModality) {
      setSelectedModality(initialModality);
    }
  }, [initialModality]);

  // Cargar sorteos activos desde Supabase
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadDraws() {
      setLoadingDraws(true);
      const res = await fetchActiveDraws();
      if (isMounted) {
        setActiveDraws(res.data);
        if (!selectedDrawId && res.data.length > 0) {
          // Si vino un initialDrawId, buscarlo; sino seleccionar el primero afín
          const matching = initialDrawId ? res.data.find(d => d.id === initialDrawId) : null;
          setSelectedDrawId(matching ? matching.id : res.data[0].id);
        }
        setLoadingDraws(false);
      }
    }

    loadDraws();
    return () => { isMounted = false; };
  }, [isOpen, initialDrawId]);

  // Sorteo actualmente seleccionado
  const currentDraw = useMemo(() => {
    return activeDraws.find((d) => d.id === selectedDrawId) || activeDraws[0] || null;
  }, [activeDraws, selectedDrawId]);

  // Modalidad efectiva: la del sorteo seleccionado o la manual
  const effectiveModality = useMemo(() => {
    if (currentDraw?.modality_id) {
      return currentDraw.modality_id.toUpperCase();
    }
    return (selectedModality || 'BINGO_75').toUpperCase();
  }, [currentDraw, selectedModality]);

  // Configuración de la modalidad
  const modalityConfig = useMemo(() => {
    return MODALITY_CONFIGS[effectiveModality] || MODALITY_CONFIGS.BINGO_75;
  }, [effectiveModality]);

  // Precios y totales autoritativos
  const unitPrice = currentDraw?.card_price || 50.0;
  const subtotal = unitPrice * quantity;
  const commission = 0.0;
  const totalAmount = subtotal + commission;

  // Disponibilidad y límites
  const maxAllowed = currentDraw?.max_cards_per_player || 20;
  const totalAvailable = currentDraw?.total_cards_available || 500;
  const totalSold = currentDraw?.total_cards_sold || 0;
  const remainingCards = Math.max(0, totalAvailable - totalSold);
  const isDrawClosed = currentDraw ? !['DRAFT', 'SCHEDULED', 'READY'].includes(currentDraw.status) : false;

  const handleQuantityChange = (delta: number) => {
    playClickSound();
    setQuantity((prev) => Math.min(maxAllowed, Math.max(1, prev + delta)));
  };

  const handleDirectQuantity = (q: number) => {
    playClickSound();
    setQuantity(Math.min(maxAllowed, Math.max(1, q)));
  };

  const handleConfirmPurchase = async () => {
    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!currentDraw) {
      setErrorMessage('Selecciona un sorteo oficial para continuar.');
      return;
    }

    if (isDrawClosed) {
      setErrorMessage('VENTA CERRADA: El sorteo ya no acepta compras de cartones.');
      return;
    }

    if (remainingCards < quantity) {
      setErrorMessage(`SIN DISPONIBILIDAD: Solo quedan ${remainingCards} cartones disponibles para este sorteo.`);
      return;
    }

    playClickSound();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await purchaseCardsAuthoritative({
        drawId: currentDraw.id,
        quantity,
        paymentMethod,
        idempotencyKey,
      });

      if (res.success && res.cards && res.cards.length > 0) {
        playWinSound();
        setIssuedCards(res.cards);
        setPurchaseSummary({
          purchaseId: res.purchaseId || idempotencyKey,
          totalAmount: res.totalAmount || totalAmount,
          unitPrice: res.unitPrice || unitPrice,
          quantity,
        });

        if (onPurchaseSuccess) {
          onPurchaseSuccess(res.cards);
        }
      } else {
        setErrorMessage(res.error || 'No se pudo completar la operación de compra.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de comunicación con el servidor al procesar la compra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewPurchase = () => {
    setIssuedCards(null);
    setPurchaseSummary(null);
    setErrorMessage(null);
    setQuantity(1);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-purchase-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* ==================================================================== */}
        {/* CABECERA DEL MODAL                                                   */}
        {/* ==================================================================== */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Grid3X3 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="card-purchase-modal-title" className="text-base sm:text-lg font-black text-white font-display tracking-tight flex items-center gap-2">
                <span>ADQUIRIR CARTONES DIGITALES</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                  OFICIAL
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                BINGO CLUB VNZLA · Emisión Criptográfica y Serial Único
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal de adquisición de cartones"
            className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ==================================================================== */}
        {/* CUERPO DEL MODAL (PANTALLA DE COMPRA O PANTALLA DE ÉXITO)             */}
        {/* ==================================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* PANTALLA 1: COMPRA CONFIRMADA EXITOSA CON SERIALES REALES */}
          {issuedCards && purchaseSummary ? (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-500/30 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-white font-display">
                  ¡COMPRA CONFIRMADA EXITOSAMENTE!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  Se han generado e imputado <strong className="text-amber-400">{issuedCards.length} cartón(es) oficiales</strong> a tu cuenta de jugador en PostgreSQL.
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
                  <span>Orden: <strong className="text-slate-200">{purchaseSummary.purchaseId.slice(0, 8)}</strong></span>
                  <span>·</span>
                  <span>Total Pagado: <strong className="text-emerald-400 font-bold">Bs. {purchaseSummary.totalAmount.toFixed(2)}</strong></span>
                  <span>·</span>
                  <span>Modalidad: <strong className="text-amber-300">{effectiveModality}</strong></span>
                </div>
              </div>

              {/* LISTA DE CARTONES EMITIDOS CON SERIALES Y HASH */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="font-bold text-slate-200">Cartones Asignados Oficialmente:</span>
                  <span>Total: {issuedCards.length}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {issuedCards.map((c, idx) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/30 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          <span>Cartón #{idx + 1}</span>
                        </span>
                        <span className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {c.status}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-200 font-bold truncate">
                        {c.card_serial}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-900">
                        <span>Emisión: #{c.card_number || '10001'}</span>
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <ShieldCheck className="h-3 w-3" />
                          <span>SHA-256 Verificado</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACCIONES POST-COMPRA */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToLiveRoom) {
                      onNavigateToLiveRoom(effectiveModality);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl btn-gaming-gold shine-sweep text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Trophy className="h-4 w-4" />
                  <span>JUGAR EN LA SALA EN VIVO</span>
                </button>

                <button
                  onClick={handleResetForNewPurchase}
                  className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                >
                  Adquirir más cartones
                </button>
              </div>
            </div>
          ) : (
            /* PANTALLA 2: FORMULARIO REAL DE ADQUISICIÓN DE CARTONES */
            <div className="space-y-6">
              
              {/* ALERTA DE AUTENTICACIÓN SI NO TIENE SESIÓN */}
              {!user && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-amber-300">Inicia sesión requerida</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Para adquirir cartones oficiales vinculados a tu ID inmutable de jugador, debes iniciar sesión con tu cuenta oficial.
                    </p>
                    <button
                      onClick={onOpenAuthModal}
                      className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Iniciar Sesión / Registrarse
                    </button>
                  </div>
                </div>
              )}

              {/* 1. SELECCIÓN DE SORTEO REAL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>1. SORTEO PROGRAMADO:</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {loadingDraws ? 'Consultando sorteos...' : `${activeDraws.length} sorteo(s) activos`}
                  </span>
                </label>

                {activeDraws.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeDraws.map((d) => {
                      const isSelected = d.id === selectedDrawId;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setSelectedDrawId(d.id);
                            if (d.modality_id) setSelectedModality(d.modality_id);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-mono font-bold text-amber-400">
                              #{d.draw_number || d.id.slice(0, 6)}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold">
                              {d.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {d.title || `Sorteo de ${d.modality_id}`}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                            <span>Mod: <strong className="text-slate-300">{d.modality_id}</strong></span>
                            <span>Bs. {Number(d.card_price || 50).toFixed(2)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Sorteo oficial abierto para la modalidad seleccionada ({effectiveModality})</span>
                  </div>
                )}
              </div>

              {/* 2. SELECTOR DE MODALIDADES OFICIALES */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  2. MODALIDAD DE BINGO:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.keys(MODALITY_CONFIGS).map((modKey) => {
                    const isSelected = effectiveModality === modKey;
                    return (
                      <button
                        key={modKey}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedModality(modKey);
                        }}
                        className={`py-2 px-2 rounded-xl text-center font-bold text-xs transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {modKey.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DETALLES DE LA MODALIDAD Y REGLAS */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>{modalityConfig.name}</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${modalityConfig.badgeColor}`}>
                    {modalityConfig.matrixFormat}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {modalityConfig.description}
                </p>
                <div className="pt-2 border-t border-slate-900 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                  <span className="text-amber-300 font-semibold">Esquema: {modalityConfig.prizeScheme}</span>
                </div>
              </div>

              {/* 3. SELECCIÓN DE CANTIDAD DE CARTONES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>3. CANTIDAD DE CARTONES:</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Máximo: {maxAllowed} cartones por jugador
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || isSubmitting}
                    className="h-11 w-11 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black text-lg flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                  >
                    -
                  </button>

                  <div className="flex-1 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-black text-xl text-amber-400">
                    {quantity}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= maxAllowed || isSubmitting}
                    className="h-11 w-11 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black text-lg flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                  >
                    +
                  </button>
                </div>

                {/* Accesos rápidos de cantidad */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">Rápido:</span>
                  {[1, 2, 5, 10, 20].filter(q => q <= maxAllowed).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleDirectQuantity(q)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                        quantity === q
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. MÉTODO DE PAGO */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  4. MÉTODO DE PAGO:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'BALANCE', label: 'Billetera Oficial', sub: 'Saldo VES' },
                    { id: 'PAGO_MOVIL', label: 'Pago Móvil', sub: 'VES Inmediato' },
                    { id: 'BINANCE_PAY', label: 'Binance Pay', sub: 'USDT Cripto' },
                    { id: 'PROMO', label: 'Crédito Oficial', sub: 'Fase Recreativa' },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setPaymentMethod(m.id as any);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 shadow-sm'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{m.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RESUMEN FINANCIERO ATÓMICO (SUBTOTAL, COMISIÓN, TOTAL Y DISTRIBUCIÓN) */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Precio Unitario Oficial:</span>
                    <span className="font-mono font-bold text-slate-200">Bs. {unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cantidad de Cartones:</span>
                    <span className="font-mono font-bold text-slate-200">{quantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Comisión de Emisión:</span>
                    <span className="font-mono text-emerald-400">Bs. 0.00 (Exonerada)</span>
                  </div>
                </div>

                {/* Transparencia Económica: Distribución de Fondos */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span>Distribución Económica Oficial:</span>
                    <span className="text-emerald-400">100% Auditable</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-400 pt-1">
                    <div>Premios (70%): <strong className="text-amber-300">Bs. {(totalAmount * 0.7).toFixed(2)}</strong></div>
                    <div>Jackpot (10%): <strong className="text-emerald-300">Bs. {(totalAmount * 0.1).toFixed(2)}</strong></div>
                    <div>Club (15%): <strong className="text-sky-300">Bs. {(totalAmount * 0.15).toFixed(2)}</strong></div>
                    <div>Operativo (5%): <strong className="text-purple-300">Bs. {(totalAmount * 0.05).toFixed(2)}</strong></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">TOTAL A PAGAR:</span>
                  <span className="text-lg font-mono font-black text-amber-400">
                    Bs. {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* MENSAJE DE ERROR SI OCURRE */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2 animate-shake">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* BOTÓN DE ACCIÓN: CONFIRMAR COMPRA */}
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={isSubmitting || isDrawClosed || !user}
                className="w-full py-4 px-6 rounded-2xl btn-gaming-gold shine-sweep text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>EMITIENDO CARTONES Y REGISTRANDO EN POSTGRESQL...</span>
                  </>
                ) : isDrawClosed ? (
                  <span>VENTA CERRADA PARA ESTE SORTEO</span>
                ) : !user ? (
                  <span>INICIA SESIÓN PARA ADQUIRIR CARTONES</span>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>CONFIRMAR Y ADQUIRIR ({quantity} CARTÓN{quantity > 1 ? 'ES' : ''})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
