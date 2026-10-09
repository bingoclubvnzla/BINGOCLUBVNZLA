// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SERVICIO FINANCIERO Y MONETIZACIÓN AUTORITATIVO
// Gestión de cotizaciones, liquidaciones de sorteos, libros mayores,
// reconciliación automática, rentabilidad y transparencia económica.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  FinancialConfig,
  PurchaseQuote,
  DrawFinancialSettlement,
  PlatformRevenueEntry,
  JackpotPoolEntry,
  FinancialReconciliation,
  FinancialException,
  Wallet,
  WalletTransaction
} from '../types/database';

export type {
  FinancialConfig,
  PurchaseQuote,
  DrawFinancialSettlement,
  PlatformRevenueEntry,
  JackpotPoolEntry,
  FinancialReconciliation,
  FinancialException,
  Wallet,
  WalletTransaction
};

export interface MonetizationOverview {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  grossSalesTotal: number;
  prizePayoutTotal: number;
  jackpotPoolTotal: number;
  platformRevenueTotal: number;
  operationalCostsTotal: number;
  pendingWithdrawalsTotal: number;
  refundsTotal: number;
  netOperatingResult: number;
}

/**
 * Obtiene la configuración económica activa del sistema
 */
export async function getActiveFinancialConfig(): Promise<FinancialConfig | null> {
  if (!isSupabaseConfigured) {
    // Configuración estándar oficial por defecto (70% Premios, 15% Plataforma, 10% Jackpot, 5% Ops = 100%)
    return {
      id: '00000000-0000-0000-0000-000000000001',
      version: 1,
      name: 'Configuración Económica Estándar v1',
      description: 'Modelo oficial: 70% Premios, 15% Plataforma, 10% Jackpot, 5% Operativo',
      is_active: true,
      prize_pool_percent: 70.0,
      platform_revenue_percent: 15.0,
      jackpot_pool_percent: 10.0,
      operational_fee_percent: 5.0,
      withdrawal_fee_percent: 2.0,
      withdrawal_fixed_fee: 5.0,
      min_withdrawal_amount: 50.0,
      max_withdrawal_amount: 5000.0,
      min_card_purchase: 1,
      max_cards_per_player: 20,
      effective_from: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await supabase
      .from('financial_configs')
      .select('*')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn('Notice fetching financial config:', error?.message);
      return null;
    }

    return data as FinancialConfig;
  } catch (err: any) {
    console.warn('Error fetching financial config:', err?.message);
    return null;
  }
}

/**
 * Solicita cotización temporal autoritativa para compra de cartones (TTL: 60s)
 */
export async function getPurchaseQuote(
  drawId: string,
  quantity: number
): Promise<{ success: boolean; quote?: PurchaseQuote; error?: string }> {
  if (quantity < 1 || quantity > 20) {
    return { success: false, error: 'Cantidad inválida: Entre 1 y 20 cartones permitidos.' };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_purchase_quote', {
        p_draw_id: drawId,
        p_quantity: quantity,
      });

      if (!error && data) {
        return { success: true, quote: data as PurchaseQuote };
      }

      if (error) {
        if (
          error.code === 'PGRST202' ||
          error.code === '42501' ||
          error.message?.includes('Could not find') ||
          error.message?.includes('permission denied') ||
          error.message?.includes('schema cache')
        ) {
          // Remote RPC no accesible sin sesión autenticada o esquema pendiente; continuar a cotización determinista
        } else {
          return { success: false, error: error.message };
        }
      }
    } catch (err: any) {
      console.warn('RPC get_purchase_quote notice:', err?.message);
    }
  }

  // Fallback determinista con reglas canónicas
  const unitPrice = 50.0;
  const subtotal = unitPrice * quantity;
  const prizePoolAlloc = Number((subtotal * 0.7).toFixed(2));
  const platformAlloc = Number((subtotal * 0.15).toFixed(2));
  const jackpotAlloc = Number((subtotal * 0.1).toFixed(2));

  return {
    success: true,
    quote: {
      quote_id: crypto.randomUUID(),
      draw_id: drawId,
      modality_id: 'BINGO_75',
      quantity,
      unit_price: unitPrice,
      subtotal,
      total_amount: subtotal,
      currency: 'VES',
      config_version: 1,
      distribution: {
        prize_pool_percent: 70.0,
        prize_pool_amount: prizePoolAlloc,
        platform_percent: 15.0,
        platform_amount: platformAlloc,
        jackpot_percent: 10.0,
        jackpot_amount: jackpotAlloc,
        operational_percent: 5.0,
      },
      expires_at: new Date(Date.now() + 60000).toISOString(),
      ttl_seconds: 60,
    },
  };
}

/**
 * Obtiene la liquidación y balance contable de un sorteo
 */
export async function getDrawFinancialSettlement(
  drawId: string
): Promise<DrawFinancialSettlement | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('draw_financial_settlements')
      .select('*')
      .eq('draw_id', drawId)
      .maybeSingle();

    if (error || !data) return null;
    return data as DrawFinancialSettlement;
  } catch {
    return null;
  }
}

/**
 * Liquida financieramente un sorteo (Server-Authoritative)
 */
export async function settleDrawFinancialsAuthoritative(
  drawId: string
): Promise<{ success: boolean; settlement?: any; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado.' };
  }

  try {
    const { data, error } = await supabase.rpc('settle_draw_financials_authoritative', {
      p_draw_id: drawId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, settlement: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error en liquidación.' };
  }
}

/**
 * Obtiene la billetera activa del usuario con balance disponible y bloqueado
 */
export async function getUserWallet(userId: string): Promise<Wallet | null> {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as Wallet;
  } catch {
    return null;
  }
}

/**
 * Obtiene el historial de movimientos de billetera
 */
export async function getUserWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
  if (!isSupabaseConfigured || !walletId) return [];

  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data as WalletTransaction[];
  } catch {
    return [];
  }
}

/**
 * Recopila la analítica financiera y resumen de monetización global para Operador / Admin
 */
export async function getMonetizationOverview(): Promise<MonetizationOverview> {
  const defaultOverview: MonetizationOverview = {
    salesToday: 0,
    salesWeek: 0,
    salesMonth: 0,
    grossSalesTotal: 0,
    prizePayoutTotal: 0,
    jackpotPoolTotal: 0,
    platformRevenueTotal: 0,
    operationalCostsTotal: 0,
    pendingWithdrawalsTotal: 0,
    refundsTotal: 0,
    netOperatingResult: 0,
  };

  if (!isSupabaseConfigured) return defaultOverview;

  try {
    // 1. Obtener sumatorias de liquidaciones de sorteos
    const { data: settlements } = await supabase
      .from('draw_financial_settlements')
      .select('gross_sales, prize_pool_allocated, platform_revenue_allocated, jackpot_pool_allocated, operational_costs_allocated, prizes_paid_amount, created_at');

    if (settlements && settlements.length > 0) {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let grossSales = 0;
      let salesToday = 0;
      let salesWeek = 0;
      let salesMonth = 0;
      let prizePayout = 0;
      let jackpotPool = 0;
      let platformRevenue = 0;
      let operationalCosts = 0;

      settlements.forEach((s) => {
        const itemGross = Number(s.gross_sales || 0);
        grossSales += itemGross;
        prizePayout += Number(s.prizes_paid_amount || s.prize_pool_allocated || 0);
        jackpotPool += Number(s.jackpot_pool_allocated || 0);
        platformRevenue += Number(s.platform_revenue_allocated || 0);
        operationalCosts += Number(s.operational_costs_allocated || 0);

        const createdAt = new Date(s.created_at);
        if (s.created_at.startsWith(todayStr)) {
          salesToday += itemGross;
        }
        if (createdAt >= oneWeekAgo) {
          salesWeek += itemGross;
        }
        if (createdAt >= oneMonthAgo) {
          salesMonth += itemGross;
        }
      });

      // 2. Retiros pendientes
      const { data: withdrawals } = await supabase
        .from('payment_requests')
        .select('amount')
        .eq('request_type', 'WITHDRAWAL')
        .eq('status', 'PENDING_APPROVAL');

      const pendingWithdrawals = withdrawals?.reduce((sum, w) => sum + Number(w.amount || 0), 0) || 0;

      return {
        salesToday,
        salesWeek,
        salesMonth,
        grossSalesTotal: grossSales,
        prizePayoutTotal: prizePayout,
        jackpotPoolTotal: jackpotPool,
        platformRevenueTotal: platformRevenue,
        operationalCostsTotal: operationalCosts,
        pendingWithdrawalsTotal: pendingWithdrawals,
        refundsTotal: 0,
        netOperatingResult: platformRevenue - operationalCosts,
      };
    }

    return defaultOverview;
  } catch (err: any) {
    console.warn('Error fetching monetization overview:', err?.message);
    return defaultOverview;
  }
}

/**
 * Ejecuta una auditoría de reconciliación contable (Supervisor/Admin)
 */
export async function runFinancialReconciliation(): Promise<{
  success: boolean;
  isBalanced?: boolean;
  exceptionsCount?: number;
  totalSales?: number;
  totalRevenue?: number;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase no configurado.' };
  }

  try {
    const { data, error } = await supabase.rpc('run_financial_reconciliation');
    if (error) {
      return { success: false, error: error.message };
    }
    return {
      success: true,
      isBalanced: Boolean(data?.is_balanced),
      exceptionsCount: data?.exceptions_count || 0,
      totalSales: data?.total_sales || 0,
      totalRevenue: data?.total_revenue || 0,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Obtiene el balance total acumulado en el pozo / jackpot
 */
export async function getJackpotPoolBalance(): Promise<number> {
  if (!isSupabaseConfigured) return 2500.0; // Fondo de demostración/seed

  try {
    const { data, error } = await supabase
      .from('jackpot_pool_ledger')
      .select('balance_after')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return 2500.0;
    return Number(data.balance_after || 0);
  } catch {
    return 2500.0;
  }
}
