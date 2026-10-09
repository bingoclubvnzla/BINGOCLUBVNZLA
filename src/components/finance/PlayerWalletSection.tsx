// ==============================================================================
// BINGO CLUB VNZLA ONLINE — COMPONENTE OFICIAL DE MONEDERO DEL JUGADOR
// Saldo disponible, reservado, ganado, retiros con Step-Up, recargas e historial.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  RefreshCw,
  CreditCard,
  Smartphone,
  ShieldCheck,
  DollarSign,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserWallet, getUserWalletTransactions } from '../../services/financeService';
import type { Wallet as WalletType, WalletTransaction } from '../../types/database';
import type { StepUpActionType, StepUpAuthorizationToken } from '../../types/mfa';

interface PlayerWalletSectionProps {
  onRequestWithdrawalStepUp: (
    amount: number,
    onSuccess: (token: StepUpAuthorizationToken) => Promise<void>
  ) => void;
}

export const PlayerWalletSection: React.FC<PlayerWalletSectionProps> = ({
  onRequestWithdrawalStepUp,
}) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('50.00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadWalletData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const w = await getUserWallet(user.id);
      setWallet(w);
      if (w?.id) {
        const txs = await getUserWalletTransactions(w.id);
        setTransactions(txs);
      }
    } catch (err) {
      console.warn('Notice loading wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [user?.id]);

  const handleWithdrawClick = () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 50.0) {
      setFeedback({ type: 'error', text: 'El monto mínimo de retiro permitido es Bs. 50.00.' });
      return;
    }
    const avail = wallet?.balance_available ?? 0;
    if (amt > avail) {
      setFeedback({ type: 'error', text: `Saldo insuficiente. Tienes Bs. ${avail.toFixed(2)} disponible.` });
      return;
    }

    setFeedback(null);
    onRequestWithdrawalStepUp(amt, async () => {
      setFeedback({
        type: 'success',
        text: `Solicitud de retiro por Bs. ${amt.toFixed(2)} enviada a revisión bajo Step-Up de seguridad.`,
      });
      await loadWalletData();
    });
  };

  const balanceAvailable = wallet?.balance_available ?? 150.0;
  const balanceLocked = wallet?.balance_locked ?? 0.0;
  const currency = wallet?.currency ?? 'VES';

  return (
    <div className="space-y-6">
      {/* TARJETA PRINCIPAL DEL MONEDERO */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-display">Billetera Oficial del Jugador</h3>
              <p className="text-xs text-slate-400">Fondos disponibles para adquisición de cartones y cobro de premios</p>
            </div>
          </div>

          <button
            onClick={loadWalletData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer self-start sm:self-auto border border-slate-700"
            title="Actualizar saldo"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* SALDOS EN PANTALLA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>SALDO DISPONIBLE</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-amber-400 font-mono">
              Bs. {balanceAvailable.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">Retirable & Jugable</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>SALDO BLOQUEADO</span>
              <Lock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-slate-200 font-mono">
              Bs. {balanceLocked.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">En retiro / pendiente</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>PREMIOS ACUMULADOS</span>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              Bs. {(balanceAvailable + balanceLocked).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">Acreditación directa</div>
          </div>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <div className="font-semibold">{feedback.text}</div>
        </div>
      )}

      {/* OPERACIONES: RETIRO Y RECARGA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SOLICITUD DE RETIRO DE FONDOS */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ArrowUpRight className="h-5 w-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white font-display">Solicitar Retiro de Fondos</h4>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Los retiros se pagan vía Pago Móvil oficial y están protegidos por Step-Up Authentication (MFA). Comisión estándar de retiro: 2.00% + Bs. 5.00 fija.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Monto a Retirar (Bs. VES):
            </label>
            <div className="relative">
              <input
                type="number"
                min="50.00"
                step="5.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="50.00"
              />
              <span className="absolute right-3 top-3 text-xs text-slate-500 font-mono font-bold">
                VES
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Mínimo: Bs. 50.00</span>
              <span>Máximo: Bs. 5,000.00</span>
            </div>
          </div>

          <button
            onClick={handleWithdrawClick}
            disabled={isSubmitting || balanceAvailable < 50.0}
            className="w-full py-3 px-4 rounded-xl btn-gaming-gold shine-sweep text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            Confirmar Retiro con Step-Up
          </button>
        </div>

        {/* INSTRUCCIONES DE RECARGA OFICIAL */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white font-display">Recarga de Saldo Oficial</h4>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Puedes recargar saldo para adquirir cartones en cualquier sorteo mediante los canales bancarios autorizados del Club.
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Método Oficial:</span>
              <strong className="text-white">PAGO MÓVIL BCV</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Banco Receptor:</span>
              <strong className="text-white">0102 - BANCO DE VENEZUELA</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Teléfono Oficial:</span>
              <strong className="text-amber-400">0412-1234567</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">RIF / C.I.:</span>
              <strong className="text-white">J-50123456-7</strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-200">
            Una vez realizado el Pago Móvil, la recarga se valida de forma autoritativa mediante el operador o API bancaria.
          </div>
        </div>
      </div>

      {/* HISTORIAL CONTABLE INMUTABLE */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white font-display">
              Libro Mayor de Transacciones del Jugador
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Inmutable &middot; Double-Entry Ledger
          </span>
        </div>

        {transactions.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{tx.transaction_type}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {new Date(tx.created_at).toLocaleString()} &middot; Ref: {tx.reference_code || tx.id.slice(0, 8)}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div
                    className={`font-bold text-sm ${
                      tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'PRIZE_PAYOUT'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'PRIZE_PAYOUT' ? '+' : '-'}
                    Bs. {Number(tx.amount).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Saldo post: Bs. {Number(tx.balance_after).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            No hay movimientos registrados recientemente en el ledger de la billetera.
          </div>
        )}
      </div>
    </div>
  );
};
