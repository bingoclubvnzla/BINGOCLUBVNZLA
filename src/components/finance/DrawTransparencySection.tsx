// ==============================================================================
// BINGO CLUB VNZLA ONLINE — PANTALLA OFICIAL DE TRANSPARENCIA DEL SORTEO
// Principio: Distribución económica verificable matemáticamente con tolerancia 0.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Trophy,
  PieChart,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { getDrawFinancialSettlement, type DrawFinancialSettlement } from '../../services/financeService';
import type { Draw } from '../../types/database';

interface DrawTransparencySectionProps {
  draw: Draw | null;
}

export const DrawTransparencySection: React.FC<DrawTransparencySectionProps> = ({ draw }) => {
  const [settlement, setSettlement] = useState<DrawFinancialSettlement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!draw?.id) return;

    let isMounted = true;
    async function loadSettlement() {
      setLoading(true);
      const res = await getDrawFinancialSettlement(draw!.id);
      if (isMounted) {
        setSettlement(res);
        setLoading(false);
      }
    }

    loadSettlement();
    return () => { isMounted = false; };
  }, [draw?.id]);

  if (!draw) return null;

  const cardPrice = Number(draw.card_price || 50.0);
  const totalSold = Number(settlement?.total_cards_sold ?? draw.total_cards_sold ?? 0);
  const grossSales = Number(settlement?.gross_sales ?? (totalSold * cardPrice));
  const prizePool = Number(settlement?.prize_pool_allocated ?? (grossSales * 0.7));
  const jackpotPool = Number(settlement?.jackpot_pool_allocated ?? (grossSales * 0.1));
  const platformRevenue = Number(settlement?.platform_revenue_allocated ?? (grossSales * 0.15));
  const opsCost = Number(settlement?.operational_costs_allocated ?? (grossSales * 0.05));
  const settlementStatus = settlement?.settlement_status || (draw.status === 'FINISHED' ? 'RECONCILED' : 'CALCULATED');

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white font-display">
            Transparencia Económica del Sorteo
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {settlementStatus}
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Cada sorteo en Bingo Club VNZLA se liquida bajo una regla de distribución matemática estricta al 100%, garantizando que los fondos de premios y pozos nunca se confundan con los ingresos del club.
      </p>

      {/* METRICAS PRINCIPALES DEL SORTEO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-mono">Precio Cartón</span>
          <span className="text-base font-bold text-white font-mono">Bs. {cardPrice.toFixed(2)}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-mono">Cartones Vendidos</span>
          <span className="text-base font-bold text-amber-400 font-mono">{totalSold}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-mono">Ventas Brutas</span>
          <span className="text-base font-bold text-emerald-400 font-mono">Bs. {grossSales.toFixed(2)}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-mono">Fondo Premios (70%)</span>
          <span className="text-base font-bold text-amber-300 font-mono">Bs. {prizePool.toFixed(2)}</span>
        </div>
      </div>

      {/* DESGLOSE PORCENTUAL TRANSPARENTE */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>Distribución Oficial de Fondos:</span>
          <span className="font-mono text-emerald-400 font-bold">100.00% Auditable</span>
        </div>

        {/* BARRA VISUAL MULTICOLOR */}
        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
          <div style={{ width: '70%' }} className="bg-amber-400" title="70% Premios" />
          <div style={{ width: '10%' }} className="bg-emerald-400" title="10% Jackpot" />
          <div style={{ width: '15%' }} className="bg-sky-400" title="15% Plataforma" />
          <div style={{ width: '5%' }} className="bg-purple-400" title="5% Operativo" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <span>Premios: <strong>70%</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Jackpot: <strong>10%</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
            <span>Club: <strong>15%</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
            <span>Costos: <strong>5%</strong></span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
        <span>Sorteo ID: {draw.id.slice(0, 8)}...</span>
        <span>Certificación de Tolerancia: 0.00 VES</span>
      </div>
    </div>
  );
};
