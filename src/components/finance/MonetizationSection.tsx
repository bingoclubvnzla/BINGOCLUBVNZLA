// ==============================================================================
// BINGO CLUB VNZLA ONLINE — MÓDULO OFICIAL DE MONETIZACIÓN Y RENTABILIDAD
// Operador / Administrador: Métricas financieras autoritativas, ingresos brutos,
// premios liquidados, comisiones, pozos acumulados y resultado operativo neto.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Trophy,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  PieChart,
  Calendar,
  Lock
} from 'lucide-react';
import {
  getMonetizationOverview,
  runFinancialReconciliation,
  getJackpotPoolBalance,
  type MonetizationOverview
} from '../../services/financeService';

export const MonetizationSection: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<MonetizationOverview | null>(null);
  const [jackpotBalance, setJackpotBalance] = useState<number>(2500);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [reconcileResult, setReconcileResult] = useState<{
    success: boolean;
    isBalanced?: boolean;
    exceptionsCount?: number;
    message?: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovData, jpData] = await Promise.all([
        getMonetizationOverview(),
        getJackpotPoolBalance(),
      ]);
      setOverview(ovData);
      setJackpotBalance(jpData);
    } catch (err) {
      console.warn('Notice loading monetization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunReconciliation = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await runFinancialReconciliation();
      setReconcileResult({
        success: res.success,
        isBalanced: res.isBalanced,
        exceptionsCount: res.exceptionsCount,
        message: res.isBalanced
          ? 'Auditoría Contable Exitosa: Balance cuadrado con tolerancia 0.'
          : `Atención: Se detectaron ${res.exceptionsCount} excepciones contables para revisión.`,
      });
      await loadData();
    } catch (err: any) {
      setReconcileResult({
        success: false,
        message: err?.message || 'Error al ejecutar reconciliación.',
      });
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO DE SECCIÓN CON ACCIONES */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
            <TrendingUp className="h-4 w-4" />
            <span>SISTEMA OFICIAL DE MONETIZACIÓN & RENTABILIDAD</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-1">
            Métricas Financieras del Club
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Trazabilidad de ventas brutas, distribución autoritativa de fondos, pozos acumulados, liquidación de premios e ingresos netos de plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
            title="Refrescar métricas"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-50"
          >
            <FileCheck className="h-4 w-4" />
            <span>{reconciling ? 'Auditando...' : 'Reconciliación Contable'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE RECONCILIACIÓN */}
      {reconcileResult && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
            reconcileResult.isBalanced
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {reconcileResult.isBalanced ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          )}
          <div className="flex-1 font-mono font-semibold">{reconcileResult.message}</div>
        </div>
      )}

      {/* KPI GRID 1: VENTAS TEMPORALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">VENTAS HOY</span>
            <Clock className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            Bs. {(overview?.salesToday || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Últimas 24 horas</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">VENTAS SEMANA</span>
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            Bs. {(overview?.salesWeek || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Últimos 7 días</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">VENTAS DEL MES</span>
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            Bs. {(overview?.salesMonth || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Últimos 30 días</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">INGRESOS BRUTOS TOTALES</span>
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            Bs. {(overview?.grossSalesTotal || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Gross Merchandise Value</div>
        </div>
      </div>

      {/* KPI GRID 2: DISTRIBUCIÓN ECONÓMICA Y POZOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* POZO DE PREMIOS */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Fondo de Premios (70%)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold">
              Jugadores
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            Bs. {(overview?.prizePayoutTotal || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Fondos asignados a premios de cartón lleno, líneas y figuras. Los premios pagados provienen de esta bolsa protegida.
          </div>
        </div>

        {/* JACKPOT / POZO ACUMULADO */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Pozo Acumulado / Jackpot (10%)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold">
              Acumulable
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            Bs. {jackpotBalance.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Fondo especial de pozos semanales e incentivos mayores. Crece de forma determinista con cada cartón emitido.
          </div>
        </div>

        {/* INGRESO DE LA PLATAFORMA */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-200">Ingreso Plataforma (15%)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-bold">
              Club
            </span>
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">
            Bs. {(overview?.platformRevenueTotal || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Comisión neta de servicio del club (Rake oficial) asentada en el libro mayor de ingresos de la plataforma.
          </div>
        </div>
      </div>

      {/* RESULTADO OPERATIVO NETO & CONTROL DE COSTOS */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-display">
              Estado de Resultados Operativos (P&L del Club)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Regla: Ingreso Plataforma - Costos Operativos = Resultado Neto
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Ingreso Bruto de Plataforma:</span>
            <span className="text-lg font-bold text-sky-400 font-mono">
              + Bs. {(overview?.platformRevenueTotal || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Costos Operativos / Gastos:</span>
            <span className="text-lg font-bold text-rose-400 font-mono">
              - Bs. {(overview?.operationalCostsTotal || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Retiros Pendientes de Aprobación:</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              Bs. {(overview?.pendingWithdrawalsTotal || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 bg-amber-500/5">
            <span className="text-xs text-slate-300 font-bold block mb-1">Resultado Operativo Neto:</span>
            <span className="text-xl font-black text-amber-400 font-mono">
              Bs. {(overview?.netOperatingResult || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <span>Tolerancia de Reconciliación: <strong>0.00 VES</strong></span>
          <span>Modelo Monetario: <strong>NUMERIC(14,2) Exacto</strong></span>
          <span>Autoridad: <strong>PostgreSQL Double-Entry Ledger</strong></span>
        </div>
      </div>
    </div>
  );
};
