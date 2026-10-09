-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 03: MOTOR DE SORTEOS AUTORITATIVO (FASE 2)
-- Servidor como única autoridad: CSPRNG, control de versión, secuencia monotónica
-- y prevención estricta de balotas duplicadas.
-- ==============================================================================

-- 1. EXTENSIÓN DE TABLA DRAWS
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS public_code VARCHAR(16) UNIQUE;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS sequence INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS current_sequence INTEGER NOT NULL DEFAULT 0;

-- Asignar códigos públicos predeterminados a sorteos existentes si hubiere
UPDATE public.draws 
SET public_code = 'BCV-S' || upper(substr(md5(id::text || clock_timestamp()::text), 1, 6))
WHERE public_code IS NULL;

ALTER TABLE public.draws ALTER COLUMN public_code SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_draws_public_code ON public.draws(public_code);

-- 2. EXTENSIÓN DE TABLA DRAW_EVENTS PARA INTEGRIDAD DE HASH
ALTER TABLE public.draw_events ADD COLUMN IF NOT EXISTS previous_event_hash VARCHAR(64);
ALTER TABLE public.draw_events ADD COLUMN IF NOT EXISTS event_hash VARCHAR(64);

-- Índice único condicional: Una misma balota no puede emitirse dos veces en el mismo sorteo
CREATE UNIQUE INDEX IF NOT EXISTS uq_draw_ball_number_idx 
    ON public.draw_events(draw_id, ball_number) 
    WHERE ball_number IS NOT NULL AND event_type = 'BALL_DRAWN';

-- ==============================================================================
-- 3. FUNCIÓN CRIPTOGRÁFICA SERVER-SIDE: GENERADOR DE PERMUTACIÓN CSPRNG
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_draw_permutation(p_total_balls INTEGER, p_min_val INTEGER DEFAULT 1)
RETURNS INTEGER[] AS $$
DECLARE
    arr INTEGER[];
BEGIN
    -- Generar arreglo [min_val .. total_balls + min_val - 1] desordenado mediante pgcrypto
    SELECT array_agg(num ORDER BY gen_random_bytes(4))
    INTO arr
    FROM generate_series(p_min_val, p_total_balls + p_min_val - 1) AS num;

    RETURN arr;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 4. FUNCIÓN: CREAR SORTEO AUTORIZADO (create_draw)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_draw_authoritative(
    p_room_id UUID,
    p_modality_id VARCHAR(32),
    p_title TEXT
) RETURNS JSONB AS $$
DECLARE
    v_draw_id UUID;
    v_public_code VARCHAR(16);
    v_draw_number BIGINT;
BEGIN
    -- Validar privilegios RBAC en servidor
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Solo operadores o administradores pueden crear sorteos.';
    END IF;

    -- Generar código público y número secuencial
    v_public_code := 'BCV-S' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT COALESCE(MAX(draw_number), 100) + 1 INTO v_draw_number FROM public.draws WHERE room_id = p_room_id;

    INSERT INTO public.draws (
        room_id,
        modality_id,
        title,
        draw_number,
        public_code,
        status,
        version,
        created_at,
        updated_at
    ) VALUES (
        p_room_id,
        p_modality_id,
        p_title,
        v_draw_number,
        v_public_code,
        'DRAFT',
        1,
        now(),
        now()
    ) RETURNING id INTO v_draw_id;

    -- Registro en auditoría
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        auth.uid(),
        (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
        'DRAW_CREATED',
        'draws',
        v_draw_id::text,
        jsonb_build_object('public_code', v_public_code, 'modality', p_modality_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'draw_id', v_draw_id,
        'public_code', v_public_code,
        'status', 'DRAFT',
        'version', 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 5. FUNCIÓN: INICIAR SORTEO AUTORITATIVO (start_draw)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.start_draw_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_draw RECORD;
    v_modality RECORD;
    v_sequence INTEGER[];
    v_event_hash VARCHAR(64);
    v_min_val INTEGER := 1;
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Solo operadores o administradores pueden iniciar sorteos.';
    END IF;

    -- Bloqueo pesimista de fila
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado: %', p_draw_id;
    END IF;

    IF v_draw.version != p_expected_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia: El sorteo está en versión %, esperado %', v_draw.version, p_expected_version;
    END IF;

    IF v_draw.status != 'READY' THEN
        RAISE EXCEPTION 'Transición inválida: El sorteo debe estar en estado READY para ser iniciado. Estado actual: %', v_draw.status;
    END IF;

    -- Consultar configuración de la modalidad
    SELECT * INTO v_modality FROM public.game_modalities WHERE id = v_draw.modality_id;
    IF v_draw.modality_id = 'ANIMALITOS' THEN
        v_min_val := 0;
    END IF;

    -- Generar permutación criptográfica oficial CSPRNG una sola vez
    v_sequence := public.generate_draw_permutation(v_modality.total_balls, v_min_val);
    v_event_hash := md5(p_draw_id::text || ':1:DRAW_STARTED:' || clock_timestamp()::text);

    -- Actualizar sorteo atómicamente a ACTIVE
    UPDATE public.draws
    SET status = 'ACTIVE',
        version = v_draw.version + 1,
        sequence = v_sequence,
        current_sequence = 0,
        drawn_numbers = '{}',
        started_at = now(),
        updated_at = now()
    WHERE id = p_draw_id;

    -- Registrar evento en draw_events
    INSERT INTO public.draw_events (
        draw_id,
        event_type,
        sequence_number,
        payload,
        previous_event_hash,
        event_hash,
        created_at
    ) VALUES (
        p_draw_id,
        'DRAW_STARTED',
        1,
        jsonb_build_object('modality', v_draw.modality_id, 'total_balls', v_modality.total_balls),
        'GENESIS_DRAW_HASH',
        v_event_hash,
        now()
    );

    -- Registro en auditoría
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        auth.uid(),
        (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
        'DRAW_STARTED',
        'draws',
        p_draw_id::text,
        jsonb_build_object('public_code', v_draw.public_code, 'version', v_draw.version + 1)
    );

    RETURN jsonb_build_object(
        'success', true,
        'draw_id', p_draw_id,
        'status', 'ACTIVE',
        'version', v_draw.version + 1,
        'total_balls', v_modality.total_balls
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 6. FUNCIÓN: EMITIR SIGUIENTE BALOTA OFICIAL (emit_next_ball)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.emit_next_ball_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_draw RECORD;
    v_next_ball INTEGER;
    v_next_seq INTEGER;
    v_event_hash VARCHAR(64);
    v_prev_hash VARCHAR(64);
    v_is_finished BOOLEAN := false;
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Solo operadores o administradores pueden solicitar emisión de balotas.';
    END IF;

    -- Bloqueo pesimista
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado: %', p_draw_id;
    END IF;

    IF v_draw.version != p_expected_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia: Sorteo en versión %, esperado %', v_draw.version, p_expected_version;
    END IF;

    IF v_draw.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'El sorteo no se encuentra en estado ACTIVE. Estado actual: %', v_draw.status;
    END IF;

    IF v_draw.current_sequence >= array_length(v_draw.sequence, 1) THEN
        RAISE EXCEPTION 'Todas las balotas del sorteo ya han sido emitidas.';
    END IF;

    -- Tomar la siguiente balota de la permutación oficial
    v_next_ball := v_draw.sequence[v_draw.current_sequence + 1];
    v_next_seq := v_draw.current_sequence + 1;

    -- Obtener último hash de evento para encadenamiento
    SELECT COALESCE(event_hash, 'GENESIS') INTO v_prev_hash
    FROM public.draw_events
    WHERE draw_id = p_draw_id
    ORDER BY sequence_number DESC
    LIMIT 1;

    v_event_hash := md5(p_draw_id::text || ':' || v_next_seq::text || ':' || v_next_ball::text || ':' || clock_timestamp()::text);

    IF v_next_seq >= array_length(v_draw.sequence, 1) THEN
        v_is_finished := true;
    END IF;

    -- Actualizar draws
    UPDATE public.draws
    SET current_sequence = v_next_seq,
        drawn_numbers = array_append(drawn_numbers, v_next_ball),
        status = CASE WHEN v_is_finished THEN 'FINISHED'::draw_status ELSE 'ACTIVE'::draw_status END,
        finished_at = CASE WHEN v_is_finished THEN now() ELSE finished_at END,
        version = v_draw.version + 1,
        updated_at = now()
    WHERE id = p_draw_id;

    -- Insertar evento monotónico
    INSERT INTO public.draw_events (
        draw_id,
        event_type,
        ball_number,
        sequence_number,
        payload,
        previous_event_hash,
        event_hash,
        created_at
    ) VALUES (
        p_draw_id,
        CASE WHEN v_is_finished THEN 'DRAW_FINISHED' ELSE 'BALL_DRAWN' END,
        v_next_ball,
        v_next_seq + 1, -- Monotónico (después de DRAW_STARTED)
        jsonb_build_object('ball_number', v_next_ball, 'sequence_index', v_next_seq),
        v_prev_hash,
        v_event_hash,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'draw_id', p_draw_id,
        'ball_number', v_next_ball,
        'sequence_number', v_next_seq,
        'status', CASE WHEN v_is_finished THEN 'FINISHED' ELSE 'ACTIVE' END,
        'version', v_draw.version + 1,
        'event_hash', v_event_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 7. FUNCIÓN: OBTENER SNAPSHOT OFICIAL
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_draw_snapshot(p_draw_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_draw RECORD;
    v_events JSONB;
BEGIN
    SELECT * INTO v_draw FROM public.draws WHERE id = p_draw_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Sorteo no encontrado');
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'sequence_number', sequence_number,
            'event_type', event_type,
            'ball_number', ball_number,
            'event_hash', event_hash,
            'created_at', created_at
        ) ORDER BY sequence_number ASC
    ) INTO v_events
    FROM public.draw_events
    WHERE draw_id = p_draw_id;

    RETURN jsonb_build_object(
        'draw_id', v_draw.id,
        'public_code', v_draw.public_code,
        'modality_id', v_draw.modality_id,
        'status', v_draw.status,
        'version', v_draw.version,
        'drawn_numbers', v_draw.drawn_numbers,
        'current_ball', CASE WHEN array_length(v_draw.drawn_numbers, 1) > 0 
                             THEN v_draw.drawn_numbers[array_length(v_draw.drawn_numbers, 1)] 
                             ELSE null END,
        'current_sequence', v_draw.current_sequence,
        'server_time', now(),
        'events', COALESCE(v_events, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
