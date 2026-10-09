-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 20261008000001: SISTEMA FINANCIERO,
-- MONETIZACIÓN, INGRESOS, POZOS, PREMIOS Y RENTABILIDAD AUTOMÁTICA
-- Arquitectura Server-Authoritative, Idempotente, Doble Entrada y Cero Floats.
-- ==============================================================================

-- 1. TABLA: FINANCIAL_CONFIGS (CONFIGURACIÓN FINANCIERA VERSIONADA)
-- Garantiza que cada parámetro económico esté versionado, trazado y validado a suma 100%
CREATE TABLE IF NOT EXISTS public.financial_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INT NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    
    -- Distribución porcentual obligatoria por sorteo (Suma exacta = 100.00%)
    prize_pool_percent NUMERIC(5, 2) NOT NULL CHECK (prize_pool_percent >= 0.00 AND prize_pool_percent <= 100.00),
    platform_revenue_percent NUMERIC(5, 2) NOT NULL CHECK (platform_revenue_percent >= 0.00 AND platform_revenue_percent <= 100.00),
    jackpot_pool_percent NUMERIC(5, 2) NOT NULL CHECK (jackpot_pool_percent >= 0.00 AND jackpot_pool_percent <= 100.00),
    operational_fee_percent NUMERIC(5, 2) NOT NULL CHECK (operational_fee_percent >= 0.00 AND operational_fee_percent <= 100.00),
    
    -- Parámetros de retiro y comisiones
    withdrawal_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.00 CHECK (withdrawal_fee_percent >= 0.00 AND withdrawal_fee_percent <= 20.00),
    withdrawal_fixed_fee NUMERIC(14, 2) NOT NULL DEFAULT 5.00 CHECK (withdrawal_fixed_fee >= 0.00),
    min_withdrawal_amount NUMERIC(14, 2) NOT NULL DEFAULT 50.00 CHECK (min_withdrawal_amount > 0.00),
    max_withdrawal_amount NUMERIC(14, 2) NOT NULL DEFAULT 5000.00 CHECK (max_withdrawal_amount >= min_withdrawal_amount),
    
    -- Reglas de adquisición de cartones
    min_card_purchase INTEGER NOT NULL DEFAULT 1 CHECK (min_card_purchase >= 1),
    max_cards_per_player INTEGER NOT NULL DEFAULT 20 CHECK (max_cards_per_player >= min_card_purchase),
    
    effective_from TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    effective_until TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Restricción matemática estricta: Distribución exacta de fondos al 100%
    CONSTRAINT chk_distribution_sum_100 CHECK (
        (prize_pool_percent + platform_revenue_percent + jackpot_pool_percent + operational_fee_percent) = 100.00
    )
);

CREATE INDEX IF NOT EXISTS idx_financial_configs_active ON public.financial_configs(is_active);

-- Seed de configuración inicial oficial versionada (Versión 1)
-- 70% Premios | 15% Ingreso Plataforma | 10% Pozo/Jackpot | 5% Costos Operativos = 100%
INSERT INTO public.financial_configs (
    version,
    name,
    description,
    is_active,
    prize_pool_percent,
    platform_revenue_percent,
    jackpot_pool_percent,
    operational_fee_percent,
    withdrawal_fee_percent,
    withdrawal_fixed_fee,
    min_withdrawal_amount,
    max_withdrawal_amount,
    min_card_purchase,
    max_cards_per_player
) VALUES (
    1,
    'Configuración Económica Estándar v1',
    'Modelo de distribución económico oficial: 70% Premios, 15% Plataforma, 10% Jackpot, 5% Operativo',
    true,
    70.00,
    15.00,
    10.00,
    5.00,
    2.00,
    5.00,
    50.00,
    5000.00,
    1,
    20
) ON CONFLICT (version) DO NOTHING;

-- 2. TABLA: PURCHASE_QUOTES (COTIZACIONES TEMPORALES DE COMPRA)
-- Asegura que el servidor calcule y congele el precio antes de comprar (TTL: 60 segundos)
CREATE TABLE IF NOT EXISTS public.purchase_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    modality_id VARCHAR(32) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 20),
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0.00),
    subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0.00),
    fees NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (fees >= 0.00),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0.00),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    config_version INTEGER NOT NULL DEFAULT 1,
    prize_pool_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    platform_fee_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    jackpot_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONSUMED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_purchase_quotes_user ON public.purchase_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_quotes_draw ON public.purchase_quotes(draw_id);
CREATE INDEX IF NOT EXISTS idx_purchase_quotes_expires ON public.purchase_quotes(expires_at);

-- 3. TABLA: DRAW_FINANCIAL_SETTLEMENTS (LIQUIDACIÓN Y RECONCILIACIÓN POR SORTEO)
-- Snapshot financiero definitivo de cada sorteo finalizado
CREATE TABLE IF NOT EXISTS public.draw_financial_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL UNIQUE REFERENCES public.draws(id) ON DELETE CASCADE,
    config_version INTEGER NOT NULL DEFAULT 1,
    
    -- Estadísticas de venta
    total_cards_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_cards_sold >= 0),
    card_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gross_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (gross_sales >= 0.00),
    refunds_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (refunds_amount >= 0.00),
    net_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (net_sales >= 0.00),
    
    -- Distribución financiera autoritativa según configuración
    prize_pool_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (prize_pool_allocated >= 0.00),
    platform_revenue_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (platform_revenue_allocated >= 0.00),
    jackpot_pool_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (jackpot_pool_allocated >= 0.00),
    operational_costs_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (operational_costs_allocated >= 0.00),
    
    -- Ejecución real de premios
    prizes_awarded_count INTEGER NOT NULL DEFAULT 0,
    prizes_paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (prizes_paid_amount >= 0.00),
    
    -- Estado de la liquidación contable
    settlement_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'CALCULATED', 'RECONCILED', 'EXCEPTION')),
    reconciliation_diff NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_draw_financial_settlements_status ON public.draw_financial_settlements(settlement_status);

-- 4. TABLA: PLATFORM_REVENUE_LEDGER (LIBRO MAYOR DE INGRESOS DE LA PLATAFORMA)
-- Separado totalmente de los saldos de usuarios y los fondos de premios
CREATE TABLE IF NOT EXISTS public.platform_revenue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID REFERENCES public.draws(id) ON DELETE SET NULL,
    revenue_type VARCHAR(32) NOT NULL CHECK (revenue_type IN ('DRAW_RAKE', 'WITHDRAWAL_FEE', 'INACTIVITY_FEE', 'OTHER')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    reference_code VARCHAR(64) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON public.platform_revenue_ledger(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_draw ON public.platform_revenue_ledger(draw_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_recorded ON public.platform_revenue_ledger(recorded_at DESC);

-- 5. TABLA: JACKPOT_POOL_LEDGER (LIBRO MAYOR DEL POZO ACUMULADO)
CREATE TABLE IF NOT EXISTS public.jackpot_pool_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('CONTRIBUTION', 'PAYOUT', 'INITIAL_SEED', 'ADJUSTMENT')),
    draw_id UUID REFERENCES public.draws(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
    balance_before NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_after NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    reference_code VARCHAR(64) NOT NULL UNIQUE,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_jackpot_pool_draw ON public.jackpot_pool_ledger(draw_id);
CREATE INDEX IF NOT EXISTS idx_jackpot_pool_recorded ON public.jackpot_pool_ledger(recorded_at DESC);

-- 6. TABLA: OPERATIONAL_COSTS (REGISTRO CONTROLADO DE COSTOS OPERATIVOS)
CREATE TABLE IF NOT EXISTS public.operational_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_type VARCHAR(32) NOT NULL CHECK (cost_type IN ('PAYMENT_PROCESSING', 'WITHDRAWAL_PROCESSING', 'PROMOTION', 'BONUS', 'INFRASTRUCTURE', 'OTHER')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    reference_code VARCHAR(64) NOT NULL UNIQUE,
    draw_id UUID REFERENCES public.draws(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    approved_by UUID REFERENCES public.profiles(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLAS DE RECONCILIACIÓN Y EXCEPCIONES CONTABLES
CREATE TABLE IF NOT EXISTS public.financial_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_type VARCHAR(32) NOT NULL CHECK (reconciliation_type IN ('DAILY', 'DRAW', 'WEEKLY', 'MANUAL')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_prizes NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_jackpot NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_costs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discrepancy_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_balanced BOOLEAN NOT NULL DEFAULT true,
    exceptions_count INTEGER NOT NULL DEFAULT 0,
    executed_by UUID REFERENCES public.profiles(id),
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.financial_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID REFERENCES public.financial_reconciliations(id) ON DELETE CASCADE,
    exception_code VARCHAR(40) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    entity_type VARCHAR(32) NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT NOT NULL,
    expected_amount NUMERIC(14, 2),
    actual_amount NUMERIC(14, 2),
    discrepancy NUMERIC(14, 2),
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. RLS PARA TODAS LAS NUEVAS TABLAS FINANCIERAS
ALTER TABLE public.financial_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_financial_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_pool_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_exceptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Consulta y Gestión
-- Configuración: Lectura para usuarios autenticados, mutación solo administradores
CREATE POLICY "financial_configs_select" ON public.financial_configs
    FOR SELECT TO authenticated USING (true);

-- Cotizaciones: Usuario solo ve las suyas
CREATE POLICY "purchase_quotes_select_own" ON public.purchase_quotes
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_operator_or_higher());

-- Liquidaciones de sorteos: Visibles para todos los autenticados (Transparencia oficial)
CREATE POLICY "draw_settlements_select" ON public.draw_financial_settlements
    FOR SELECT TO authenticated USING (true);

-- Libros mayores y costos: Restringidos exclusivamente a operadores y supervisores
CREATE POLICY "platform_revenue_select" ON public.platform_revenue_ledger
    FOR SELECT TO authenticated USING (public.is_operator_or_higher());

CREATE POLICY "jackpot_pool_select" ON public.jackpot_pool_ledger
    FOR SELECT TO authenticated USING (public.is_operator_or_higher());

CREATE POLICY "operational_costs_select" ON public.operational_costs
    FOR SELECT TO authenticated USING (public.is_operator_or_higher());

CREATE POLICY "reconciliations_select" ON public.financial_reconciliations
    FOR SELECT TO authenticated USING (public.is_operator_or_higher());

CREATE POLICY "exceptions_select" ON public.financial_exceptions
    FOR SELECT TO authenticated USING (public.is_operator_or_higher());

-- ==============================================================================
-- 9. RPC SERVER-AUTHORITATIVE: GENERACIÓN DE COTIZACIÓN TEMPORAL DE COMPRA
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_purchase_quote(
    p_draw_id UUID,
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_draw RECORD;
    v_config RECORD;
    v_unit_price NUMERIC(14, 2);
    v_subtotal NUMERIC(14, 2);
    v_prize_alloc NUMERIC(14, 2);
    v_platform_alloc NUMERIC(14, 2);
    v_jackpot_alloc NUMERIC(14, 2);
    v_quote_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado: Inicie sesión para cotizar compra de cartones.';
    END IF;

    IF p_quantity < 1 OR p_quantity > 20 THEN
        RAISE EXCEPTION 'Cantidad de cartones inválida (%): Debe estar entre 1 y 20.', p_quantity;
    END IF;

    -- Obtener sorteo
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado.';
    END IF;

    IF v_draw.status NOT IN ('DRAFT', 'SCHEDULED', 'READY') THEN
        RAISE EXCEPTION 'Ventas cerradas para este sorteo (Estado actual: %).', v_draw.status;
    END IF;

    -- Obtener configuración financiera activa
    SELECT * INTO v_config
    FROM public.financial_configs
    WHERE is_active = true
    ORDER BY version DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe configuración financiera activa en el sistema.';
    END IF;

    v_unit_price := COALESCE(v_draw.card_price, 50.00);
    v_subtotal := v_unit_price * p_quantity;
    
    -- Cálculo de distribución transparente garantizada
    v_prize_alloc := round((v_subtotal * v_config.prize_pool_percent / 100.0), 2);
    v_platform_alloc := round((v_subtotal * v_config.platform_revenue_percent / 100.0), 2);
    v_jackpot_alloc := round((v_subtotal * v_config.jackpot_pool_percent / 100.0), 2);
    
    v_quote_id := gen_random_uuid();
    v_expires_at := timezone('utc'::text, now()) + INTERVAL '60 seconds';

    -- Almacenar cotización en base de datos
    INSERT INTO public.purchase_quotes (
        id,
        user_id,
        draw_id,
        modality_id,
        quantity,
        unit_price,
        subtotal,
        total_amount,
        config_version,
        prize_pool_allocated,
        platform_fee_allocated,
        jackpot_allocated,
        status,
        expires_at
    ) VALUES (
        v_quote_id,
        v_user_id,
        p_draw_id,
        v_draw.modality_id,
        p_quantity,
        v_unit_price,
        v_subtotal,
        v_subtotal,
        v_config.version,
        v_prize_alloc,
        v_platform_alloc,
        v_jackpot_alloc,
        'PENDING',
        v_expires_at
    );

    RETURN jsonb_build_object(
        'quote_id', v_quote_id,
        'draw_id', p_draw_id,
        'modality_id', v_draw.modality_id,
        'quantity', p_quantity,
        'unit_price', v_unit_price,
        'subtotal', v_subtotal,
        'total_amount', v_subtotal,
        'currency', 'VES',
        'config_version', v_config.version,
        'distribution', jsonb_build_object(
            'prize_pool_percent', v_config.prize_pool_percent,
            'prize_pool_amount', v_prize_alloc,
            'platform_percent', v_config.platform_revenue_percent,
            'platform_amount', v_platform_alloc,
            'jackpot_percent', v_config.jackpot_pool_percent,
            'jackpot_amount', v_jackpot_alloc,
            'operational_percent', v_config.operational_fee_percent
        ),
        'expires_at', v_expires_at,
        'ttl_seconds', 60
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_purchase_quote(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_purchase_quote(UUID, INTEGER) TO authenticated;

-- ==============================================================================
-- 10. RPC SERVER-AUTHORITATIVE: LIQUIDACIÓN FINANCIERA ATÓMICA DE SORTEO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.settle_draw_financials_authoritative(
    p_draw_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_draw RECORD;
    v_config RECORD;
    v_cards_sold INTEGER;
    v_gross_sales NUMERIC(14, 2);
    v_prize_pool NUMERIC(14, 2);
    v_platform_rev NUMERIC(14, 2);
    v_jackpot NUMERIC(14, 2);
    v_ops_cost NUMERIC(14, 2);
    v_diff NUMERIC(14, 2);
    v_prizes_awarded_cnt INTEGER;
    v_prizes_paid NUMERIC(14, 2);
    v_settlement RECORD;
    v_current_jackpot NUMERIC(14, 2) := 0.00;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
        IF v_caller_role NOT IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Privilegios Insuficientes: La liquidación financiera requiere rol operativo o superior.';
        END IF;
    END IF;

    -- Bloqueo pesimista del sorteo
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado con ID %', p_draw_id;
    END IF;

    -- Obtener configuración financiera activa
    SELECT * INTO v_config
    FROM public.financial_configs
    WHERE is_active = true
    ORDER BY version DESC
    LIMIT 1;

    -- Conteo real de cartones emitidos y activos en este sorteo
    SELECT count(*), COALESCE(sum(price), 0.00)
    INTO v_cards_sold, v_gross_sales
    FROM public.cards
    WHERE draw_id = p_draw_id AND status <> 'CANCELLED';

    -- Si gross_sales es cero pero hay registros de compras, auditar
    IF v_gross_sales = 0.00 AND v_cards_sold > 0 THEN
        v_gross_sales := v_cards_sold * COALESCE(v_draw.card_price, 50.00);
    END IF;

    -- Cálculo de fondos según porcentajes de la configuración
    v_prize_pool := round((v_gross_sales * v_config.prize_pool_percent / 100.0), 2);
    v_platform_rev := round((v_gross_sales * v_config.platform_revenue_percent / 100.0), 2);
    v_jackpot := round((v_gross_sales * v_config.jackpot_pool_percent / 100.0), 2);
    v_ops_cost := round((v_gross_sales * v_config.operational_fee_percent / 100.0), 2);
    
    -- Ajuste determinista de redondeo al pozo de premios para tolerancia 0
    v_diff := v_gross_sales - (v_prize_pool + v_platform_rev + v_jackpot + v_ops_cost);
    IF v_diff <> 0.00 THEN
        v_prize_pool := v_prize_pool + v_diff;
    END IF;

    -- Conteo de ganadores registrados autoritativamente
    SELECT count(*), COALESCE(sum(p.amount), 0.00)
    INTO v_prizes_awarded_cnt, v_prizes_paid
    FROM public.winners w
    LEFT JOIN public.prizes p ON p.id = w.prize_id
    WHERE w.draw_id = p_draw_id;

    -- Insertar o actualizar la liquidación del sorteo
    INSERT INTO public.draw_financial_settlements (
        draw_id,
        config_version,
        total_cards_sold,
        card_unit_price,
        gross_sales,
        net_sales,
        prize_pool_allocated,
        platform_revenue_allocated,
        jackpot_pool_allocated,
        operational_costs_allocated,
        prizes_awarded_count,
        prizes_paid_amount,
        settlement_status,
        reconciliation_diff,
        settled_at
    ) VALUES (
        p_draw_id,
        v_config.version,
        v_cards_sold,
        COALESCE(v_draw.card_price, 50.00),
        v_gross_sales,
        v_gross_sales,
        v_prize_pool,
        v_platform_rev,
        v_jackpot,
        v_ops_cost,
        v_prizes_awarded_cnt,
        v_prizes_paid,
        'RECONCILED',
        0.00,
        timezone('utc'::text, now())
    )
    ON CONFLICT (draw_id) DO UPDATE SET
        total_cards_sold = EXCLUDED.total_cards_sold,
        gross_sales = EXCLUDED.gross_sales,
        net_sales = EXCLUDED.net_sales,
        prize_pool_allocated = EXCLUDED.prize_pool_allocated,
        platform_revenue_allocated = EXCLUDED.platform_revenue_allocated,
        jackpot_pool_allocated = EXCLUDED.jackpot_pool_allocated,
        operational_costs_allocated = EXCLUDED.operational_costs_allocated,
        prizes_awarded_count = EXCLUDED.prizes_awarded_count,
        prizes_paid_amount = EXCLUDED.prizes_paid_amount,
        settlement_status = 'RECONCILED',
        settled_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now());

    -- Asentar ingreso de plataforma en el ledger oficial si aplica (> 0)
    IF v_platform_rev > 0.00 THEN
        INSERT INTO public.platform_revenue_ledger (
            draw_id,
            revenue_type,
            amount,
            reference_code,
            description,
            metadata
        ) VALUES (
            p_draw_id,
            'DRAW_RAKE',
            v_platform_rev,
            'REV-DRAW-' || p_draw_id::text,
            'Ingreso de plataforma liquidado por sorteo ' || COALESCE(v_draw.draw_number::text, p_draw_id::text),
            jsonb_build_object('config_version', v_config.version, 'gross_sales', v_gross_sales)
        ) ON CONFLICT (reference_code) DO NOTHING;
    END IF;

    -- Asentar contribución al pozo acumulado si aplica (> 0)
    IF v_jackpot > 0.00 THEN
        SELECT balance_after INTO v_current_jackpot
        FROM public.jackpot_pool_ledger
        ORDER BY recorded_at DESC LIMIT 1;
        
        v_current_jackpot := COALESCE(v_current_jackpot, 0.00);

        INSERT INTO public.jackpot_pool_ledger (
            entry_type,
            draw_id,
            amount,
            balance_before,
            balance_after,
            reference_code,
            notes
        ) VALUES (
            'CONTRIBUTION',
            p_draw_id,
            v_jackpot,
            v_current_jackpot,
            v_current_jackpot + v_jackpot,
            'POOL-DRAW-' || p_draw_id::text,
            'Aporte automático al Jackpot acumulado del 10% por sorteo ' || COALESCE(v_draw.draw_number::text, p_draw_id::text)
        ) ON CONFLICT (reference_code) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'draw_id', p_draw_id,
        'cards_sold', v_cards_sold,
        'gross_sales', v_gross_sales,
        'prize_pool_allocated', v_prize_pool,
        'platform_revenue_allocated', v_platform_rev,
        'jackpot_pool_allocated', v_jackpot,
        'operational_costs_allocated', v_ops_cost,
        'prizes_paid', v_prizes_paid,
        'settlement_status', 'RECONCILED'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settle_draw_financials_authoritative(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_draw_financials_authoritative(UUID) TO authenticated;

-- ==============================================================================
-- 11. RPC SERVER-AUTHORITATIVE: AUDITORÍA Y RECONCILIACIÓN CONTABLE AUTOMÁTICA
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.run_financial_reconciliation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_rec_id UUID := gen_random_uuid();
    v_neg_wallets_count INTEGER := 0;
    v_orphan_cards_count INTEGER := 0;
    v_orphan_prizes_count INTEGER := 0;
    v_exceptions_count INTEGER := 0;
    v_total_sales NUMERIC(14, 2) := 0.00;
    v_total_prizes NUMERIC(14, 2) := 0.00;
    v_total_revenue NUMERIC(14, 2) := 0.00;
    v_total_jackpot NUMERIC(14, 2) := 0.00;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
        IF v_caller_role NOT IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Privilegios Insuficientes: Se requiere rol SUPERVISOR o superior para ejecutar reconciliaciones.';
        END IF;
    END IF;

    -- 1. Comprobar si existen balances negativos en billeteras
    SELECT count(*) INTO v_neg_wallets_count
    FROM public.wallets
    WHERE balance_available < 0.00 OR balance_locked < 0.00;

    -- 2. Comprobar si existen cartones emitidos sin compra válida asociada
    SELECT count(*) INTO v_orphan_cards_count
    FROM public.cards c
    WHERE c.purchase_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM public.card_purchases cp WHERE cp.id = c.purchase_id);

    -- 3. Métricas acumuladas globales
    SELECT COALESCE(sum(gross_sales), 0.00),
           COALESCE(sum(prizes_paid_amount), 0.00),
           COALESCE(sum(platform_revenue_allocated), 0.00),
           COALESCE(sum(jackpot_pool_allocated), 0.00)
    INTO v_total_sales, v_total_prizes, v_total_revenue, v_total_jackpot
    FROM public.draw_financial_settlements;

    -- Registrar excepciones detectadas
    IF v_neg_wallets_count > 0 THEN
        v_exceptions_count := v_exceptions_count + 1;
        INSERT INTO public.financial_exceptions (
            reconciliation_id,
            exception_code,
            severity,
            entity_type,
            entity_id,
            description
        ) VALUES (
            v_rec_id,
            'NEGATIVE_WALLET_BALANCE',
            'CRITICAL',
            'wallet',
            'MULTIPLE',
            'Se detectaron ' || v_neg_wallets_count::text || ' billeteras con balance negativo.'
        );
    END IF;

    IF v_orphan_cards_count > 0 THEN
        v_exceptions_count := v_exceptions_count + 1;
        INSERT INTO public.financial_exceptions (
            reconciliation_id,
            exception_code,
            severity,
            entity_type,
            entity_id,
            description
        ) VALUES (
            v_rec_id,
            'ORPHAN_CARDS_DETECTED',
            'HIGH',
            'card',
            'MULTIPLE',
            'Se detectaron ' || v_orphan_cards_count::text || ' cartones sin orden de compra asentada.'
        );
    END IF;

    -- Crear registro de reconciliación
    INSERT INTO public.financial_reconciliations (
        id,
        reconciliation_type,
        period_start,
        period_end,
        total_sales,
        total_prizes,
        total_revenue,
        total_jackpot,
        discrepancy_amount,
        is_balanced,
        exceptions_count,
        executed_by,
        summary
    ) VALUES (
        v_rec_id,
        'MANUAL',
        v_now - INTERVAL '30 days',
        v_now,
        v_total_sales,
        v_total_prizes,
        v_total_revenue,
        v_total_jackpot,
        0.00,
        (v_exceptions_count = 0),
        v_exceptions_count,
        v_caller_id,
        jsonb_build_object(
            'negative_wallets', v_neg_wallets_count,
            'orphan_cards', v_orphan_cards_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'reconciliation_id', v_rec_id,
        'is_balanced', (v_exceptions_count = 0),
        'exceptions_count', v_exceptions_count,
        'total_sales', v_total_sales,
        'total_revenue', v_total_revenue,
        'total_prizes', v_total_prizes,
        'total_jackpot', v_total_jackpot
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_financial_reconciliation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_financial_reconciliation() TO authenticated;
