-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 20261008000000: SISTEMA AUTORITATIVO DE CARTONES
-- Fase 2.10: Emisión, Inventario, Venta, Serialización Única, Hashes de Integridad
-- y Máquina de Estados de Cartones Digitales.
-- ==============================================================================

-- Previene deadlocks entre migraciones concurrentes
SET lock_timeout = '30s';
SET statement_timeout = '5min';

-- Adquiere locks en orden determinista antes de modificar
LOCK TABLE public.cards IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.draws IN SHARE ROW EXCLUSIVE MODE;

-- 1. EXTENSIÓN Y REFUERZO DE LA TABLA CARDS (SCHEMA REAL)
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS card_number BIGINT,
ADD COLUMN IF NOT EXISTS integrity_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS modality_id VARCHAR(32),
ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) NOT NULL DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS purchase_id UUID,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Secuencia atómica para numeración de emisión global y trazabilidad
CREATE SEQUENCE IF NOT EXISTS public.seq_card_emission_number START WITH 10001;

-- Índice único global para card_serial (garantía de unicidad absoluta)
CREATE UNIQUE INDEX IF NOT EXISTS uq_cards_card_serial_global ON public.cards(card_serial);
CREATE INDEX IF NOT EXISTS idx_cards_user_draw_status ON public.cards(user_id, draw_id, status);
CREATE INDEX IF NOT EXISTS idx_cards_modality ON public.cards(modality_id);

-- 2. EXTENSIÓN DE LA TABLA DRAWS CON REGLAS DE INVENTARIO Y PRECIOS
ALTER TABLE public.draws
ADD COLUMN IF NOT EXISTS card_price NUMERIC(14,2) NOT NULL DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS max_cards_per_player INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS total_cards_available INTEGER NOT NULL DEFAULT 500,
ADD COLUMN IF NOT EXISTS total_cards_sold INTEGER NOT NULL DEFAULT 0;

-- 3. TABLA: CARD_PURCHASES (REGISTRO IDEMPOTENTE DE COMPRAS Y AUDITORÍA FINANCIERA)
CREATE TABLE IF NOT EXISTS public.card_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    modality_id VARCHAR(32) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 20),
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    payment_method VARCHAR(32) NOT NULL DEFAULT 'BALANCE',
    status VARCHAR(24) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    idempotency_key UUID NOT NULL UNIQUE,
    card_ids UUID[] NOT NULL DEFAULT '{}',
    card_serials TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_card_purchases_user ON public.card_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_draw ON public.card_purchases(draw_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_idempotency ON public.card_purchases(idempotency_key);

ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_purchases_select_own" ON public.card_purchases;
CREATE POLICY "card_purchases_select_own" ON public.card_purchases
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_operator_or_higher());

-- 4. FUNCIÓN AUXILIAR PRIVADA: GENERADOR MATEMÁTICO AUTORITATIVO DE MATRICES POR MODALIDAD
CREATE OR REPLACE FUNCTION public.internal_generate_card_matrix(
    p_modality TEXT
) RETURNS JSONB AS $$
DECLARE
    v_clean_mod TEXT;
    v_grid JSONB;
    v_b INT[];
    v_i INT[];
    v_n INT[];
    v_g INT[];
    v_o INT[];
    v_pool INT[];
    v_shuffled INT[];
    v_row INT;
    v_col INT;
    v_r INT;
    v_c INT;
    v_matrix INT[][];
    v_rows_json JSONB[] := ARRAY[]::JSONB[];
    v_row_json JSONB;
BEGIN
    v_clean_mod := upper(trim(p_modality));

    -- MODALIDAD 1: BINGO_75 (5x5, B:1-15, I:16-30, N:31-45 con centro 0, G:46-60, O:61-75)
    IF v_clean_mod IN ('BINGO_75', 'BINGO75', '75') THEN
        -- Columna B (1..15)
        SELECT array_agg(num) INTO v_b FROM (
            SELECT generate_series(1, 15) AS num ORDER BY gen_random_uuid() LIMIT 5
        ) s;
        -- Columna I (16..30)
        SELECT array_agg(num) INTO v_i FROM (
            SELECT generate_series(16, 30) AS num ORDER BY gen_random_uuid() LIMIT 5
        ) s;
        -- Columna N (31..45, centro es 0 = FREE)
        SELECT array_agg(num) INTO v_n FROM (
            SELECT generate_series(31, 45) AS num ORDER BY gen_random_uuid() LIMIT 4
        ) s;
        -- Columna G (46..60)
        SELECT array_agg(num) INTO v_g FROM (
            SELECT generate_series(46, 60) AS num ORDER BY gen_random_uuid() LIMIT 5
        ) s;
        -- Columna O (61..75)
        SELECT array_agg(num) INTO v_o FROM (
            SELECT generate_series(61, 75) AS num ORDER BY gen_random_uuid() LIMIT 5
        ) s;

        -- Construir matriz 5x5: fila 2, col 2 tiene 0 (FREE)
        v_grid := jsonb_build_array(
            jsonb_build_array(v_b[1], v_i[1], v_n[1], v_g[1], v_o[1]),
            jsonb_build_array(v_b[2], v_i[2], v_n[2], v_g[2], v_o[2]),
            jsonb_build_array(v_b[3], v_i[3], 0,      v_g[3], v_o[3]),
            jsonb_build_array(v_b[4], v_i[4], v_n[3], v_g[4], v_o[4]),
            jsonb_build_array(v_b[5], v_i[5], v_n[4], v_g[5], v_o[5])
        );
        RETURN v_grid;

    -- MODALIDADES 2 & 3: ANIMALITOS & OBJETOS (5x5, 24 balotas del catálogo 1..75, centro 0)
    ELSIF v_clean_mod IN ('ANIMALITOS', 'OBJETOS') THEN
        SELECT array_agg(num) INTO v_shuffled FROM (
            SELECT generate_series(1, 75) AS num ORDER BY gen_random_uuid() LIMIT 24
        ) s;

        v_grid := jsonb_build_array(
            jsonb_build_array(v_shuffled[1],  v_shuffled[2],  v_shuffled[3],  v_shuffled[4],  v_shuffled[5]),
            jsonb_build_array(v_shuffled[6],  v_shuffled[7],  v_shuffled[8],  v_shuffled[9],  v_shuffled[10]),
            jsonb_build_array(v_shuffled[11], v_shuffled[12], 0,              v_shuffled[13], v_shuffled[14]),
            jsonb_build_array(v_shuffled[15], v_shuffled[16], v_shuffled[17], v_shuffled[18], v_shuffled[19]),
            jsonb_build_array(v_shuffled[20], v_shuffled[21], v_shuffled[22], v_shuffled[23], v_shuffled[24])
        );
        RETURN v_grid;

    -- MODALIDADES 4 & 5: BINGO_90 & CHAPITAS (3x9, 15 números, 5 por fila, 4 espacios)
    ELSE
        -- Generar 3 filas de 9 columnas según reglas oficiales de Bingo 90
        -- Columnas: 1-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80-90
        -- Cada fila tiene exactamente 5 posiciones activas elegidas aleatoriamente
        DECLARE
            v_col_nums INT[];
            v_c0 INT[]; v_c1 INT[]; v_c2 INT[]; v_c3 INT[]; v_c4 INT[];
            v_c5 INT[]; v_c6 INT[]; v_c7 INT[]; v_c8 INT[];
            v_r0 INT[] := ARRAY[0,0,0,0,0,0,0,0,0];
            v_r1 INT[] := ARRAY[0,0,0,0,0,0,0,0,0];
            v_r2 INT[] := ARRAY[0,0,0,0,0,0,0,0,0];
            v_active_cols INT[];
        BEGIN
            SELECT array_agg(num ORDER BY num) INTO v_c0 FROM (SELECT generate_series(1, 9) AS num ORDER BY gen_random_uuid() LIMIT 2) s;
            SELECT array_agg(num ORDER BY num) INTO v_c1 FROM (SELECT generate_series(10, 19) AS num ORDER BY gen_random_uuid() LIMIT 2) s;
            SELECT array_agg(num ORDER BY num) INTO v_c2 FROM (SELECT generate_series(20, 29) AS num ORDER BY gen_random_uuid() LIMIT 2) s;
            SELECT array_agg(num ORDER BY num) INTO v_c3 FROM (SELECT generate_series(30, 39) AS num ORDER BY gen_random_uuid() LIMIT 2) s;
            SELECT array_agg(num ORDER BY num) INTO v_c4 FROM (SELECT generate_series(40, 49) AS num ORDER BY gen_random_uuid() LIMIT 2) s;
            SELECT array_agg(num ORDER BY num) INTO v_c5 FROM (SELECT generate_series(50, 59) AS num ORDER BY gen_random_uuid() LIMIT 2) s;
            SELECT array_agg(num ORDER BY num) INTO v_c6 FROM (SELECT generate_series(60, 69) AS num ORDER BY gen_random_uuid() LIMIT 1) s;
            SELECT array_agg(num ORDER BY num) INTO v_c7 FROM (SELECT generate_series(70, 79) AS num ORDER BY gen_random_uuid() LIMIT 1) s;
            SELECT array_agg(num ORDER BY num) INTO v_c8 FROM (SELECT generate_series(80, 90) AS num ORDER BY gen_random_uuid() LIMIT 1) s;

            -- Distribuir ordenadamente en 3 filas asegurando exactamente 5 números por fila
            v_r0[1] := v_c0[1]; v_r1[1] := v_c0[2]; v_r2[1] := 0;
            v_r0[2] := v_c1[1]; v_r1[2] := 0;       v_r2[2] := v_c1[2];
            v_r0[3] := 0;       v_r1[3] := v_c2[1]; v_r2[3] := v_c2[2];
            v_r0[4] := v_c3[1]; v_r1[4] := v_c3[2]; v_r2[4] := 0;
            v_r0[5] := 0;       v_r1[5] := v_c4[1]; v_r2[5] := v_c4[2];
            v_r0[6] := v_c5[1]; v_r1[6] := 0;       v_r2[6] := v_c5[2];
            v_r0[7] := v_c6[1]; v_r1[7] := 0;       v_r2[7] := 0;
            v_r0[8] := 0;       v_r1[8] := v_c7[1]; v_r2[8] := 0;
            v_r0[9] := 0;       v_r1[9] := 0;       v_r2[9] := v_c8[1];

            v_grid := jsonb_build_array(
                to_jsonb(v_r0),
                to_jsonb(v_r1),
                to_jsonb(v_r2)
            );
            RETURN v_grid;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

-- 5. RPC MAESTRA: COMPRA Y EMISIÓN AUTORITATIVA DE CARTONES
-- Server-Authoritative, Idempotente, Transaccional, Trazable y Criptográficamente Asegurada.
CREATE OR REPLACE FUNCTION public.purchase_cards_authoritative(
    p_draw_id UUID,
    p_quantity INTEGER,
    p_idempotency_key UUID,
    p_payment_method TEXT DEFAULT 'BALANCE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_draw RECORD;
    v_existing_purchase RECORD;
    v_existing_cards_count INT;
    v_unit_price NUMERIC(14,2);
    v_total_amount NUMERIC(14,2);
    v_purchase_id UUID;
    v_card_ids UUID[] := ARRAY[]::UUID[];
    v_card_serials TEXT[] := ARRAY[]::TEXT[];
    v_cards_result JSONB[] := ARRAY[]::JSONB[];
    v_i INT;
    v_card_id UUID;
    v_seq_num BIGINT;
    v_mod_code TEXT;
    v_serial TEXT;
    v_grid JSONB;
    v_canonical_payload TEXT;
    v_hash TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_row_idx INT;
    v_col_idx INT;
    v_cell_val INT;
    v_wallet RECORD;
BEGIN
    -- 1. Autenticación estricta: Derivar identidad exclusivamente de auth.uid()
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado: Inicia sesión para adquirir cartones.';
    END IF;

    -- 2. Validación de cantidad solicitada (Regla de negocio: 1 <= cantidad <= 20)
    IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
        RAISE EXCEPTION 'Cantidad inválida: Solo puedes adquirir entre 1 y 20 cartones por operación.';
    END IF;

    -- 3. Idempotencia Financiera Estricta
    -- Si esta clave ya fue procesada, retornar el resultado previo sin duplicar emisión ni cargo
    SELECT * INTO v_existing_purchase
    FROM public.card_purchases
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        -- Reconstruir y retornar cartones ya emitidos
        SELECT array_agg(to_jsonb(c.*)) INTO v_cards_result
        FROM public.cards c
        WHERE c.id = ANY(v_existing_purchase.card_ids);

        RETURN jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'purchase_id', v_existing_purchase.id,
            'draw_id', v_existing_purchase.draw_id,
            'modality_id', v_existing_purchase.modality_id,
            'quantity', v_existing_purchase.quantity,
            'unit_price', v_existing_purchase.unit_price,
            'total_amount', v_existing_purchase.total_amount,
            'card_serials', v_existing_purchase.card_serials,
            'cards', COALESCE(to_jsonb(v_cards_result), '[]'::jsonb),
            'message', 'Operación idempotente: compra previamente confirmada.'
        );
    END IF;

    -- 4. Bloqueo Pesimista del Sorteo (FOR UPDATE)
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado con identificador %', p_draw_id;
    END IF;

    -- 5. Control de Ventas del Sorteo
    -- Las ventas solo están abiertas en estados preliminares (DRAFT, SCHEDULED, READY)
    IF v_draw.status NOT IN ('DRAFT', 'SCHEDULED', 'READY') THEN
        RAISE EXCEPTION 'VENTA CERRADA: El sorteo ya no acepta compras de cartones (Estado actual: %).', v_draw.status;
    END IF;

    -- 6. Límite de Cartones por Jugador
    SELECT count(*) INTO v_existing_cards_count
    FROM public.cards
    WHERE draw_id = p_draw_id AND user_id = v_user_id AND status <> 'CANCELLED';

    IF (v_existing_cards_count + p_quantity) > v_draw.max_cards_per_player THEN
        RAISE EXCEPTION 'LÍMITE EXCEDIDO: Ya posees % cartones. El máximo permitido por jugador en este sorteo es %.',
            v_existing_cards_count, v_draw.max_cards_per_player;
    END IF;

    -- 7. Control de Inventario del Sorteo
    IF (v_draw.total_cards_sold + p_quantity) > v_draw.total_cards_available THEN
        RAISE EXCEPTION 'SIN DISPONIBILIDAD: El sorteo ha alcanzado su cupo máximo de cartones disponibles (%/%).',
            v_draw.total_cards_sold, v_draw.total_cards_available;
    END IF;

    -- 8. Precio Server-Authoritative
    v_unit_price := COALESCE(v_draw.card_price, 50.00);
    v_total_amount := v_unit_price * p_quantity;

    -- 9. Validación de Pago / Débito en Billetera
    IF p_payment_method = 'BALANCE' THEN
        SELECT * INTO v_wallet
        FROM public.wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF FOUND AND v_wallet.status = 'ACTIVE' THEN
            IF v_wallet.balance_available < v_total_amount THEN
                RAISE EXCEPTION 'SALDO INSUFICIENTE: Tu balance disponible es Bs. % y la compra requiere Bs. %.',
                    v_wallet.balance_available, v_total_amount;
            END IF;

            -- Débito atómico en billetera
            UPDATE public.wallets
            SET balance_available = balance_available - v_total_amount,
                updated_at = v_now
            WHERE id = v_wallet.id;

            -- Registro en ledger de transacciones
            INSERT INTO public.wallet_transactions (
                wallet_id,
                idempotency_key,
                transaction_type,
                amount,
                balance_before,
                balance_after,
                status,
                reference_code,
                metadata,
                created_at
            ) VALUES (
                v_wallet.id,
                p_idempotency_key::text,
                'CARD_PURCHASE',
                v_total_amount,
                v_wallet.balance_available,
                v_wallet.balance_available - v_total_amount,
                'SETTLED',
                'BUY-' || p_draw_id::text || '-' || p_quantity::text,
                jsonb_build_object('draw_id', p_draw_id, 'quantity', p_quantity, 'unit_price', v_unit_price),
                v_now
            );
        END IF;
    END IF;

    -- 10. Crear Registro de Compra (Maestro)
    v_purchase_id := gen_random_uuid();
    v_mod_code := CASE
        WHEN v_draw.modality_id ILIKE '%75%' THEN 'B75'
        WHEN v_draw.modality_id ILIKE '%90%' THEN 'B90'
        WHEN v_draw.modality_id ILIKE '%ANIM%' THEN 'ANI'
        WHEN v_draw.modality_id ILIKE '%OBJ%' THEN 'OBJ'
        WHEN v_draw.modality_id ILIKE '%CHAP%' THEN 'CHP'
        ELSE 'BCV'
    END;

    -- 11. Emisión de Cada Cartón Individual con Cero Duplicidad
    FOR v_i IN 1..p_quantity LOOP
        v_card_id := gen_random_uuid();
        v_seq_num := nextval('public.seq_card_emission_number');
        
        -- Formato oficial de serial: BCV-<MOD>-<YYYYMMDD>-<EMISSION>-<RAND4>
        v_serial := 'BCV-' || v_mod_code || '-' || to_char(v_now, 'YYYYMMDD') || '-' ||
                    lpad(v_seq_num::text, 6, '0') || '-' ||
                    upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 4));

        -- Generar matriz válida autoritativa
        v_grid := public.internal_generate_card_matrix(v_draw.modality_id);

        -- Huella criptográfica de integridad inmutable
        v_canonical_payload := 'CARD:' || v_card_id::text ||
                               '|DRAW:' || p_draw_id::text ||
                               '|USER:' || v_user_id::text ||
                               '|SERIAL:' || v_serial ||
                               '|MOD:' || v_draw.modality_id ||
                               '|GRID:' || v_grid::text ||
                               '|SEQ:' || v_seq_num::text ||
                               '|ISSUED_AT:' || v_now::text;
        v_hash := encode(digest(v_canonical_payload, 'sha256'), 'hex');

        -- Insertar en public.cards
        INSERT INTO public.cards (
            id,
            draw_id,
            user_id,
            card_serial,
            card_number,
            grid_layout,
            modality_id,
            price,
            purchase_id,
            status,
            integrity_hash,
            purchased_at
        ) VALUES (
            v_card_id,
            p_draw_id,
            v_user_id,
            v_serial,
            v_seq_num,
            v_grid,
            v_draw.modality_id,
            v_unit_price,
            v_purchase_id,
            'ISSUED',
            v_hash,
            v_now
        );

        -- Insertar celdas numéricas en public.card_numbers para indexación de aciertos
        FOR v_row_idx IN 0..(jsonb_array_length(v_grid) - 1) LOOP
            FOR v_col_idx IN 0..(jsonb_array_length(v_grid->v_row_idx) - 1) LOOP
                v_cell_val := (v_grid->v_row_idx->v_col_idx)::text::int;
                IF v_cell_val IS NOT NULL THEN
                    INSERT INTO public.card_numbers (
                        card_id,
                        number_value,
                        row_pos,
                        col_pos,
                        is_marked,
                        marked_at
                    ) VALUES (
                        v_card_id,
                        v_cell_val,
                        v_row_idx,
                        v_col_idx,
                        (v_cell_val = 0), -- Casilla FREE (0) pre-marcada
                        CASE WHEN v_cell_val = 0 THEN v_now ELSE NULL END
                    );
                END IF;
            END LOOP;
        END LOOP;

        v_card_ids := array_append(v_card_ids, v_card_id);
        v_card_serials := array_append(v_card_serials, v_serial);

        v_cards_result := array_append(v_cards_result, jsonb_build_object(
            'id', v_card_id,
            'card_serial', v_serial,
            'card_number', v_seq_num,
            'grid_layout', v_grid,
            'draw_id', p_draw_id,
            'user_id', v_user_id,
            'modality_id', v_draw.modality_id,
            'price', v_unit_price,
            'status', 'ISSUED',
            'integrity_hash', v_hash,
            'purchased_at', v_now
        ));
    END LOOP;

    -- 12. Persistir registro de compra
    INSERT INTO public.card_purchases (
        id,
        user_id,
        draw_id,
        modality_id,
        quantity,
        unit_price,
        total_amount,
        currency,
        payment_method,
        status,
        idempotency_key,
        card_ids,
        card_serials,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        v_purchase_id,
        v_user_id,
        p_draw_id,
        v_draw.modality_id,
        p_quantity,
        v_unit_price,
        v_total_amount,
        'VES',
        p_payment_method,
        'COMPLETED',
        p_idempotency_key,
        v_card_ids,
        v_card_serials,
        jsonb_build_object('draw_title', v_draw.title, 'cards_count', p_quantity),
        v_now,
        v_now
    );

    -- 13. Actualizar Inventario Vendido en Sorteo
    UPDATE public.draws
    SET total_cards_sold = total_cards_sold + p_quantity,
        updated_at = v_now
    WHERE id = p_draw_id;

    -- 14. Bitácora Forense Inmutable
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
    ) VALUES (
        v_user_id,
        'PLAYER',
        'CARD_PURCHASE_CONFIRMED',
        'card_purchases',
        v_purchase_id::text,
        jsonb_build_object(
            'draw_id', p_draw_id,
            'modality_id', v_draw.modality_id,
            'quantity', p_quantity,
            'unit_price', v_unit_price,
            'total_amount', v_total_amount,
            'serials', v_card_serials
        ),
        v_now
    );

    -- 15. Respuesta Oficial Autorizada
    RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'purchase_id', v_purchase_id,
        'draw_id', p_draw_id,
        'modality_id', v_draw.modality_id,
        'quantity', p_quantity,
        'unit_price', v_unit_price,
        'total_amount', v_total_amount,
        'card_serials', v_card_serials,
        'cards', to_jsonb(v_cards_result),
        'message', 'Compra exitosa: ' || p_quantity::text || ' cartón(es) emitido(s) y asignado(s) oficialmente.'
    );
END;
$$;

-- 6. PERMISOS Y PRIVILEGIOS MÍNIMOS ESTRICTOS
REVOKE EXECUTE ON FUNCTION public.purchase_cards_authoritative(UUID, INTEGER, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purchase_cards_authoritative(UUID, INTEGER, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_cards_authoritative(UUID, INTEGER, UUID, TEXT) TO authenticated, service_role;
