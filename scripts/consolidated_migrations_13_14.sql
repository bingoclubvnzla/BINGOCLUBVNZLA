-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — SCRIPT CONSOLIDADO DE REMEDIACIÓN (MIGRACIONES 13 & 14)
-- Ejecutar en Supabase Studio -> SQL Editor del proyecto: lfmavupbxfkxuzncfzzs
-- ==============================================================================

-- 1. CORRECCIÓN P1-01: Invocación de generate_draw_permutation(v_total_balls, 1)
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

    SELECT array_agg(num ORDER BY extensions.gen_random_bytes(4))
    INTO arr
    FROM generate_series(p_min_val, p_total_balls + p_min_val - 1) AS num;

    RETURN arr;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = extensions, public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) TO service_role, postgres;

-- 2. POLÍTICAS RLS SEGREGADAS PARA anon Y authenticated (RESUELVE ERROR 42501)
DROP POLICY IF EXISTS "Sorteos no borrador son visibles para usuarios" ON public.draws;
DROP POLICY IF EXISTS "draws_anon_read_policy" ON public.draws;
DROP POLICY IF EXISTS "draws_authenticated_read_policy" ON public.draws;

CREATE POLICY "draws_anon_read_policy"
    ON public.draws FOR SELECT
    TO anon
    USING (status != 'DRAFT');

CREATE POLICY "draws_authenticated_read_policy"
    ON public.draws FOR SELECT
    TO authenticated
    USING (status != 'DRAFT' OR public.is_operator_or_higher());

DROP POLICY IF EXISTS "Modalidades activas visibles para todos" ON public.game_modalities;
DROP POLICY IF EXISTS "game_modalities_anon_read_policy" ON public.game_modalities;
DROP POLICY IF EXISTS "game_modalities_authenticated_read_policy" ON public.game_modalities;

CREATE POLICY "game_modalities_anon_read_policy"
    ON public.game_modalities FOR SELECT
    TO anon
    USING (is_active = true);

CREATE POLICY "game_modalities_authenticated_read_policy"
    ON public.game_modalities FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- 3. HARDENING ACL SCHEMA private
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role, postgres;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role, postgres;

-- 4. FUNCIÓN SERVER-AUTHORITATIVE claim_bingo_authoritative
CREATE OR REPLACE FUNCTION public.claim_bingo_authoritative(
    p_draw_id UUID,
    p_card_id UUID,
    p_pattern TEXT DEFAULT 'LINEA'
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
    v_winner_id UUID;
    v_prize_amount NUMERIC(12, 2);
    v_prize RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere sesión autenticada.';
    END IF;

    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado.';
    END IF;

    IF v_draw.status NOT IN ('IN_PROGRESS', 'RUNNING', 'ACTIVE') THEN
        RAISE EXCEPTION 'El sorteo no se encuentra activo para cantar bingo (estado: %).', v_draw.status;
    END IF;

    SELECT * INTO v_card
    FROM public.cards
    WHERE id = p_card_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cartón no encontrado.';
    END IF;

    IF v_card.draw_id != p_draw_id THEN
        RAISE EXCEPTION 'El cartón no pertenece al sorteo especificado.';
    END IF;

    IF v_card.user_id != v_user_id THEN
        RAISE EXCEPTION 'Acceso denegado: El cartón no pertenece al usuario autenticado.';
    END IF;

    IF v_card.status = 'WON' THEN
        RAISE EXCEPTION 'Este cartón ya ha sido premiado previamente en este sorteo.';
    END IF;

    SELECT * INTO v_prize
    FROM public.prizes
    WHERE draw_id = p_draw_id
      AND status = 'AVAILABLE'
      AND (name ILIKE '%' || p_pattern || '%' OR prize_type = 'JACKPOT' OR prize_type = 'FIXED')
    ORDER BY amount DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        UPDATE public.prizes
        SET status = 'AWARDED',
            awarded_to_user_id = v_user_id,
            awarded_at = timezone('utc'::text, now())
        WHERE id = v_prize.id;
        v_prize_amount := v_prize.amount;
    ELSE
        INSERT INTO public.prizes (
            draw_id, name, prize_type, amount, status
        ) VALUES (
            p_draw_id, p_pattern, 'FIXED', 0.00, 'AWARDED'
        ) RETURNING * INTO v_prize;
        v_prize_amount := 0.00;
    END IF;

    INSERT INTO public.winners (
        draw_id, prize_id, user_id, card_id, validated_by_engine, awarded_at
    ) VALUES (
        p_draw_id, v_prize.id, v_user_id, p_card_id, true, timezone('utc'::text, now())
    ) RETURNING id INTO v_winner_id;

    UPDATE public.cards
    SET status = 'WON'
    WHERE id = p_card_id;

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

NOTIFY pgrst, 'reload schema';
