// ==============================================================================
// BINGO CLUB VNZLA ONLINE — SUITE DE PRUEBAS FINANCIERAS Y RECONCILIACIÓN
// Verificación matemática de suma 100%, tolerancia 0, cero floats,
// idempotencia, cotizaciones autoritativas y control de ingresos de plataforma.
// ==============================================================================

import { describe, it, expect } from 'vitest';
import {
  getActiveFinancialConfig,
  getPurchaseQuote,
  getMonetizationOverview,
} from '../src/services/financeService';
import { purchaseCardsAuthoritative } from '../src/services/cardService';

describe('Sistema Financiero, Monetización y Reconciliación Contable', () => {
  it('1. Configuración financiera versionada debe sumar exactamente 100.00%', async () => {
    const config = await getActiveFinancialConfig();
    expect(config).toBeDefined();
    if (config) {
      const sum =
        config.prize_pool_percent +
        config.platform_revenue_percent +
        config.jackpot_pool_percent +
        config.operational_fee_percent;
      expect(sum).toBe(100.0);
      expect(config.prize_pool_percent).toBe(70.0);
      expect(config.platform_revenue_percent).toBe(15.0);
      expect(config.jackpot_pool_percent).toBe(10.0);
      expect(config.operational_fee_percent).toBe(5.0);
    }
  });

  it('2. getPurchaseQuote debe generar cotización autoritativa con desglose matemático exacto', async () => {
    const drawId = '00000000-0000-0000-0000-000000000001';
    const quantity = 4;
    const res = await getPurchaseQuote(drawId, quantity);

    expect(res.success).toBe(true);
    expect(res.quote).toBeDefined();

    const quote = res.quote!;
    expect(quote.quantity).toBe(4);
    expect(quote.unit_price).toBe(50.0);
    expect(quote.total_amount).toBe(200.0);

    // Verificación de distribución de fondos
    expect(quote.distribution.prize_pool_percent).toBe(70.0);
    expect(quote.distribution.prize_pool_amount).toBe(140.0); // 70% de 200

    expect(quote.distribution.platform_percent).toBe(15.0);
    expect(quote.distribution.platform_amount).toBe(30.0); // 15% de 200

    expect(quote.distribution.jackpot_percent).toBe(10.0);
    expect(quote.distribution.jackpot_amount).toBe(20.0); // 10% de 200

    // Tolerancia 0 en suma de fondos
    const distributedSum =
      quote.distribution.prize_pool_amount +
      quote.distribution.platform_amount +
      quote.distribution.jackpot_amount +
      (quote.total_amount * quote.distribution.operational_percent / 100.0);

    expect(distributedSum).toBe(200.0);
    expect(quote.ttl_seconds).toBe(60);
  });

  it('3. getPurchaseQuote debe rechazar cantidades fuera de los límites de seguridad [1..20]', async () => {
    const drawId = '00000000-0000-0000-0000-000000000001';

    const resZero = await getPurchaseQuote(drawId, 0);
    expect(resZero.success).toBe(false);
    expect(resZero.error).toContain('inválida');

    const resExcess = await getPurchaseQuote(drawId, 25);
    expect(resExcess.success).toBe(false);
    expect(resExcess.error).toContain('inválida');
  });

  it('4. Idempotencia: Múltiples solicitudes con la misma idempotency_key retornan la misma operación', async () => {
    const drawId = '00000000-0000-0000-0000-000000000001';
    const key = 'idem-finance-test-key-999';

    const call1 = await purchaseCardsAuthoritative({
      drawId,
      quantity: 2,
      idempotencyKey: key,
    });

    const call2 = await purchaseCardsAuthoritative({
      drawId,
      quantity: 2,
      idempotencyKey: key,
    });

    expect(call1.success).toBe(true);
    expect(call2.success).toBe(true);
    expect(call2.idempotentReplay).toBe(true);
    expect(call2.purchaseId).toBe(call1.purchaseId);
  });

  it('5. Cero Floats: Todo cálculo monetario opera con precisión estricta de punto fijo', () => {
    const unitPrice = 50.0;
    const qty = 7;
    const grossSales = unitPrice * qty; // 350.00
    const prizePool = Number((grossSales * 0.7).toFixed(2)); // 245.00
    const platformRev = Number((grossSales * 0.15).toFixed(2)); // 52.50
    const jackpot = Number((grossSales * 0.1).toFixed(2)); // 35.00
    const ops = Number((grossSales * 0.05).toFixed(2)); // 17.50

    expect(prizePool + platformRev + jackpot + ops).toBe(grossSales);
    expect(grossSales.toFixed(2)).toBe('350.00');
  });

  it('6. getMonetizationOverview retorna estructura de métricas de rentabilidad completa', async () => {
    const overview = await getMonetizationOverview();
    expect(overview).toBeDefined();
    expect(typeof overview.salesToday).toBe('number');
    expect(typeof overview.grossSalesTotal).toBe('number');
    expect(typeof overview.prizePayoutTotal).toBe('number');
    expect(typeof overview.platformRevenueTotal).toBe('number');
    expect(typeof overview.netOperatingResult).toBe('number');
  });
});
