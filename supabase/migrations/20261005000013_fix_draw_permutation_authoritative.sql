-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN CORRECTIVA FASE FINAL (REMEDIACIÓN P1 / P2)
-- 20261005000013_fix_draw_permutation_authoritative.sql
-- 
-- 1. CORRECCIÓN P1-01: Invocación de generate_draw_permutation(v_total_balls, 1)
--    Elimina el timestamp epoch pasado erróneamente como p_min_val.
-- 2. CORRECCIÓN P2-01: Revocación de permisos de ejecución en schema private a authenticated.
--    Principio de mínimo privilegio: solo postgres y service_role tienen acceso directo a private.
-- 3. CORRECCIÓN P2-03: Función server-authoritative claim_bingo_authoritative.
--    Validación atómica transaccional (FOR UPDATE) de patrones de ganadores en PostgreSQL.
-- 4. POLÍTICAS RLS ROBUSTAS: Separación de políticas anon y authenticated para draws y modalities.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SECCIÓN 1: CORRECCIÓN P1-01 — GENERADOR DE PERMUTACIÓN CSPRNG (1..N)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_draw_permutation(
    p_total_balls INTEGER,
    p_min_val INTEGER DEFAULT 1
)
RETURNS INTEGER[] AS $$
DECLARE
    arr INTEGER[];
BEGIN
    IF p_total_balls IS NULL OR p_total_balls <= 0 THEN
        RAISE EXCEPTION 'El número total de balotas debe ser estrictamente positivo (%).', p_total_balls;
    END IF;

    IF p_min_val IS NULL OR p_min_val < 1 THEN
        RAISE EXCEPTION 'El valor mínimo inicial no puede ser inferior a 1 (%).', p_min_val;
    END IF;

    -- CSPRNG mediante extensions.gen_random_bytes(4)
    SELECT array_agg(num ORDER BY extensions.gen_random_bytes(4))
    INTO arr
    FROM generate_series(p_min_val, p_total_balls + p_min_val - 1) AS num;

    RETURN arr;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = extensions, public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) TO service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 2: CORRECCIÓN P1-01 — private.create_draw_authoritative
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.create_draw_authoritative(
    p_room_id UUID,
    p_modality_id VARCHAR,
    p_title TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_temp
AS $$
DECLARE
    v_draw_id UUID;
    v_draw_number BIGINT;
    v_public_code VARCHAR(16);
    v_total_balls INTEGER;
    v_permutation INTEGER[];
BEGIN
    v_draw_number := nextval('public.draw_number_seq');

    -- CSPRNG oficial para código público (BCV-SXXXXXX)
    v_public_code := 'BCV-S' || upper(substr(encode(sha256((gen_random_uuid()::text || clock_timestamp()::text)::bytea), 'hex'), 1, 6));

    SELECT total_balls INTO v_total_balls
    FROM public.game_modalities
    WHERE id = p_modality_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Modalidad no encontrada o inactiva: %', p_modality_id;
    END IF;

    -- P1-01 FIX: Invocación estricta con p_min_val = 1 (Genera 1..total_balls)
    v_permutation := public.generate_draw_permutation(v_total_balls, 1);

    INSERT INTO public.draws (
        room_id,
        modality_id,
        title,
        draw_number,
        public_code,
        status,
        version,
        permutation,
        drawn_numbers,
        current_sequence,
        metadata
    ) VALUES (
        p_room_id,
        p_modality_id,
        COALESCE(p_title, 'Sorteo #' || v_draw_number || ' (' || p_modality_id || ')'),
        v_draw_number,
        v_public_code,
        'DRAFT',
        1,
        v_permutation,
        '{}'::integer[],
        0,
        jsonb_build_object(
            'created_by', auth.uid(),
            'total_balls', v_total_balls,
            'source', 'private_authoritative_engine'
        )
    ) RETURNING id INTO v_draw_id;

    INSERT INTO public.draw_events (
        draw_id,
        sequence_number,
        event_type,
        event_hash,
        payload
    ) VALUES (
        v_draw_id,
        1,
        'DRAW_CREATED',
        encode(sha256((v_draw_id::text || ':1:DRAW_CREATED')::bytea), 'hex'),
        jsonb_build_object(
            'draw_id', v_draw_id,
            'draw_number', v_draw_number,
            'public_code', v_public_code,
            'modality_id', p_modality_id,
            'total_balls', v_total_balls
        )
    );

    RETURN jsonb_build_object(
        'draw_id', v_draw_id,
        'draw_number', v_draw_number,
        'public_code', v_public_code,
        'status', 'DRAFT',
        'version', 1
    );
END;
$$;

-- Wrapper público de create_draw_authoritative con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_draw_authoritative(
    p_room_id UUID,
    p_modality_id VARCHAR,
    p_title TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol OPERATOR o superior.';
    END IF;
    RETURN private.create_draw_authoritative(p_room_id, p_modality_id, p_title);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) TO authenticated, service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 3: CORRECCIÓN P2-01 — ACL DE SCHEMA private (MÍNIMO PRIVILEGIO)
-- ------------------------------------------------------------------------------
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role, postgres;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 4: CORRECCIÓN P2-03 — claim_bingo_authoritative (MOTOR AUTORITATIVO DE GANADORES)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_bingo_authoritative(
    p_draw_id UUID,
    p_card_id UUID,
    p_pattern TEXT DEFAULT 'CARTON_LLENO'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_draw RECORD;
    v_card RECORD;
    v_drawn_count INTEGER;
    v_all_drawn BOOLEAN;
    v_line_completed BOOLEAN := false;
    v_prize RECORD;
    v_existing_winner UUID;
    v_winner_id UUID;
    v_prize_amount NUMERIC(14,2) := 0.00;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado: Se requiere una sesión activa para reclamar premios.';
    END IF;

    -- 1. Bloqueo transaccional del sorteo (FOR UPDATE)
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado.';
    END IF;

    IF v_draw.status NOT IN ('ACTIVE', 'PLAYING', 'IN_PROGRESS', 'READY') THEN
        RAISE EXCEPTION 'El sorteo no está en juego (Estado actual: %).', v_draw.status;
    END IF;

    -- 2. Bloqueo transaccional del cartón (FOR UPDATE)
    SELECT * INTO v_card
    FROM public.cards
    WHERE id = p_card_id AND draw_id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cartón no registrado en este sorteo.';
    END IF;

    IF v_card.user_id <> v_user_id THEN
        RAISE EXCEPTION 'Violación de Propiedad: El cartón no pertenece al usuario autenticado.';
    END IF;

    IF v_card.status NOT IN ('ISSUED', 'PLAYING') THEN
        RAISE EXCEPTION 'El cartón no es elegible para reclamos (Estado: %).', v_card.status;
    END IF;

    -- 3. Verificación de Idempotencia: No duplicar premio para el mismo cartón y patrón
    SELECT id INTO v_existing_winner
    FROM public.winners
    WHERE draw_id = p_draw_id AND card_id = p_card_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_claimed', true,
            'winner_id', v_existing_winner,
            'message', 'El cartón ya fue validado y registrado como ganador previamente.'
        );
    END IF;

    -- 4. Verificación matemática del patrón sobre las balotas efectivamente cantadas
    IF p_pattern IN ('CARTON_LLENO', 'FULL_HOUSE') THEN
        -- Todas las posiciones con número > 0 deben estar presentes en v_draw.drawn_numbers
        SELECT COALESCE(bool_and(cn.number_value = ANY(v_draw.drawn_numbers)), false)
        INTO v_all_drawn
        FROM public.card_numbers cn
        WHERE cn.card_id = p_card_id AND cn.number_value > 0;

        IF NOT v_all_drawn THEN
            RAISE EXCEPTION 'Validación fallida: El cartón contiene números que aún no han sido cantados en el sorteo.';
        END IF;

    ELSIF p_pattern IN ('LINEA', 'LINE') THEN
        -- Verificar si alguna fila completa (5x5) está cantada
        SELECT EXISTS (
            SELECT 1
            FROM generate_series(0, 4) AS r(row_idx)
            WHERE (
                SELECT bool_and(cn.number_value = ANY(v_draw.drawn_numbers))
                FROM public.card_numbers cn
                WHERE cn.card_id = p_card_id AND cn.row_pos = r.row_idx AND cn.number_value > 0
            ) = true
        ) INTO v_line_completed;

        IF NOT v_line_completed THEN
            -- Verificar si alguna columna completa (5x5) está cantada
            SELECT EXISTS (
                SELECT 1
                FROM generate_series(0, 4) AS c(col_idx)
                WHERE (
                    SELECT bool_and(cn.number_value = ANY(v_draw.drawn_numbers))
                    FROM public.card_numbers cn
                    WHERE cn.card_id = p_card_id AND cn.col_pos = c.col_idx AND cn.number_value > 0
                ) = true
            ) INTO v_line_completed;
        END IF;

        IF NOT v_line_completed THEN
            RAISE EXCEPTION 'Validación fallida: El cartón no cumple con ninguna línea completa cantada.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Patrón de reclamo no reconocido: %', p_pattern;
    END IF;

    -- 5. Asignación atómica de Premio
    SELECT * INTO v_prize
    FROM public.prizes
    WHERE draw_id = p_draw_id AND (name = p_pattern OR name ILIKE '%' || p_pattern || '%')
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        v_prize_amount := v_prize.amount;
        UPDATE public.prizes SET status = 'AWARDED' WHERE id = v_prize.id;
    ELSE
        -- Premio simbólico / base si no fue preconfigurado en la tabla prizes
        INSERT INTO public.prizes (
            draw_id,
            name,
            prize_type,
            amount,
            status
        ) VALUES (
            p_draw_id,
            p_pattern,
            'FIXED',
            0.00,
            'AWARDED'
        ) RETURNING * INTO v_prize;
    END IF;

    -- 6. Inserción atómica en tabla de ganadores
    INSERT INTO public.winners (
        draw_id,
        prize_id,
        user_id,
        card_id,
        validated_by_engine,
        awarded_at
    ) VALUES (
        p_draw_id,
        v_prize.id,
        v_user_id,
        p_card_id,
        true,
        timezone('utc'::text, now())
    ) RETURNING id INTO v_winner_id;

    -- 7. Actualización del estado del cartón
    UPDATE public.cards
    SET status = 'WON'
    WHERE id = p_card_id;

    -- 8. Registro de evento de auditoría en draw_events
    INSERT INTO public.draw_events (
        draw_id,
        sequence_number,
        event_type,
        event_hash,
        payload
    ) VALUES (
        p_draw_id,
        COALESCE((SELECT MAX(sequence_number) + 1 FROM public.draw_events WHERE draw_id = p_draw_id), 1),
        'WINNER_AWARDED',
        encode(sha256((p_draw_id::text || ':' || v_winner_id::text || ':WINNER_AWARDED')::bytea), 'hex'),
        jsonb_build_object(
            'winner_id', v_winner_id,
            'card_id', p_card_id,
            'user_id', v_user_id,
            'pattern', p_pattern,
            'prize_amount', v_prize_amount
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner_id,
        'draw_id', p_draw_id,
        'card_id', p_card_id,
        'pattern', p_pattern,
        'prize_amount', v_prize_amount,
        'message', '¡Premio validado y otorgado exitosamente por el servidor autoritativo!'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_bingo_authoritative(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_bingo_authoritative(UUID, UUID, TEXT) TO authenticated, service_role, postgres;

-- ------------------------------------------------------------------------------
-- SECCIÓN 5: POLÍTICAS RLS SEGREGADAS PARA anon Y authenticated (EVITA 42501)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Sorteos no borrador son visibles para usuarios" ON public.draws;

CREATE POLICY "draws_anon_read_policy"
    ON public.draws FOR SELECT
    TO anon
    USING (status != 'DRAFT');

CREATE POLICY "draws_authenticated_read_policy"
    ON public.draws FOR SELECT
    TO authenticated
    USING (status != 'DRAFT' OR public.is_operator_or_higher());

DROP POLICY IF EXISTS "Modalidades activas visibles para todos" ON public.game_modalities;

CREATE POLICY "game_modalities_anon_read_policy"
    ON public.game_modalities FOR SELECT
    TO anon
    USING (is_active = true);

CREATE POLICY "game_modalities_authenticated_read_policy"
    ON public.game_modalities FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());
