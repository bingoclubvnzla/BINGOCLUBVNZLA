-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — SCRIPT CONSOLIDADO DE REMEDIACIÓN MIGRACIÓN 15
-- Ejecutar en Supabase Studio -> SQL Editor del proyecto: lfmavupbxfkxuzncfzzs
-- ==============================================================================

-- 1. HELPER REGIONAL DE JERARQUÍA RBAC: is_supervisor_or_higher
CREATE OR REPLACE FUNCTION public.is_supervisor_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_supervisor_or_higher() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_supervisor_or_higher() TO authenticated, service_role, postgres;

-- 2. HARDENING DE STEP-UP AUTH (ANTI-CROSS-USER / ANTI-CROSS-RESOURCE)
CREATE OR REPLACE FUNCTION private.request_step_up_authorization(
    p_action_type TEXT,
    p_risk_level TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_idemp UUID;
    v_auth_record RECORD;
    v_expires_at TIMESTAMPTZ;
    v_clean_metadata JSONB;
    v_new_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación para solicitar Step-Up.';
    END IF;

    IF p_action_type NOT IN (
        'CHANGE_PAGO_MOVIL', 'REQUEST_WITHDRAWAL', 'ACCOUNT_DELETION',
        'CONFIRM_RECHARGE', 'APPROVE_WITHDRAWAL', 'CHANGE_USER_ROLE',
        'UPDATE_FINANCIAL_SETTINGS', 'MFA_DISABLE'
    ) THEN
        RAISE EXCEPTION 'Tipo de acción no reconocido para Step-Up: %', p_action_type;
    END IF;

    IF p_risk_level NOT IN ('HIGH', 'CRITICAL') THEN
        RAISE EXCEPTION 'Nivel de riesgo inválido: % (solo HIGH o CRITICAL permitidos)', p_risk_level;
    END IF;

    v_idemp := COALESCE(p_idempotency_key, gen_random_uuid());

    SELECT * INTO v_auth_record
    FROM public.step_up_authorizations
    WHERE idempotency_key = v_idemp
      AND user_id = v_user_id
      AND action_type = p_action_type
      AND risk_level = p_risk_level
      AND COALESCE(resource_id, '') = COALESCE(p_resource_id, '')
      AND is_used = false
      AND expires_at > timezone('utc'::text, now());

    IF FOUND THEN
        RETURN jsonb_build_object(
            'authorization_id', v_auth_record.id,
            'action_type', v_auth_record.action_type,
            'risk_level', v_auth_record.risk_level,
            'expires_at', v_auth_record.expires_at,
            'idempotency_key', v_auth_record.idempotency_key,
            'is_cached', true
        );
    END IF;

    v_expires_at := timezone('utc'::text, now()) + interval '5 minutes';

    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'password'
        - 'token'
        - 'totp_code'
        - 'secret'
        - 'turnstile_token';

    v_new_id := gen_random_uuid();

    INSERT INTO public.step_up_authorizations (
        id,
        user_id,
        action_type,
        risk_level,
        resource_id,
        idempotency_key,
        expires_at,
        metadata
    ) VALUES (
        v_new_id,
        v_user_id,
        p_action_type,
        p_risk_level,
        p_resource_id,
        v_idemp,
        v_expires_at,
        v_clean_metadata
    );

    RETURN jsonb_build_object(
        'authorization_id', v_new_id,
        'action_type', p_action_type,
        'risk_level', p_risk_level,
        'expires_at', v_expires_at,
        'idempotency_key', v_idemp,
        'is_cached', false
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_step_up_authorization(
    p_action_type TEXT,
    p_risk_level TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere autenticación.';
    END IF;
    RETURN private.request_step_up_authorization(p_action_type, p_risk_level, p_resource_id, p_metadata, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_step_up_authorization(TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_step_up_authorization(TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated, service_role, postgres;

-- 3. HARDENING DE log_auth_event
CREATE OR REPLACE FUNCTION private.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_clean_metadata JSONB;
    v_client_allowed_actions TEXT[] := ARRAY[
        'LOGIN_FAILURE',
        'LOGIN_ATTEMPT',
        'LOGIN_SUCCESS',
        'PASSWORD_RESET_REQUESTED',
        'LOGOUT',
        'MFA_ENROLLMENT_STARTED',
        'MFA_ENROLLMENT_VERIFIED',
        'MFA_ENROLLMENT_FAILED',
        'MFA_DISABLED',
        'MFA_CHALLENGE_CREATED',
        'MFA_VERIFICATION_SUCCESS',
        'MFA_VERIFICATION_FAILED',
        'MFA_RECOVERY_USED',
        'ROUTE_ACCESS_ATTEMPTED',
        'SECURITY_CHALLENGE_SOLVED'
    ];
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere sesión autenticada.';
    END IF;

    IF p_action != ALL(v_client_allowed_actions) THEN
        RAISE EXCEPTION 'Acceso denegado: Acción de auditoría no permitida para llamadas directas del cliente (%).', p_action;
    END IF;

    IF octet_length(COALESCE(p_metadata, '{}'::jsonb)::text) > 2048 THEN
        RAISE EXCEPTION 'Payload de metadata excede el límite máximo permitido (2KB).';
    END IF;

    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'password'
        - 'contraseña'
        - 'token'
        - 'access_token'
        - 'refresh_token'
        - 'turnstile_token'
        - 'turnstiletoken'
        - 'captchatoken'
        - 'secret'
        - 'client_secret';

    SELECT role::text INTO v_role FROM public.profiles WHERE id = v_user_id;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        COALESCE(v_role, 'PLAYER'),
        p_action,
        'AUTH_EVENT',
        v_user_id::text,
        v_clean_metadata
    );

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere sesión autenticada.';
    END IF;
    RETURN private.log_auth_event(p_action, p_metadata);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) TO authenticated, service_role, postgres;

-- 4. HARDENING DE CLAIM BINGO
CREATE UNIQUE INDEX IF NOT EXISTS uq_winners_draw_card ON public.winners(draw_id, card_id);

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

    IF p_pattern IN ('CARTON_LLENO', 'FULL_HOUSE') THEN
        SELECT COALESCE(bool_and(cn.number_value = ANY(v_draw.drawn_numbers)), false)
        INTO v_all_drawn
        FROM public.card_numbers cn
        WHERE cn.card_id = p_card_id
          AND cn.number_value > 0;

        IF NOT v_all_drawn THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Patrón CARTON_LLENO no completado. Faltan balotas requeridas en el sorteo.'
            );
        END IF;

    ELSIF p_pattern IN ('LINEA', 'LINEA_HORIZONTAL') THEN
        FOR v_drawn_count IN 0..4 LOOP
            SELECT COALESCE(bool_and(cn.number_value = ANY(v_draw.drawn_numbers)), false)
            INTO v_all_drawn
            FROM public.card_numbers cn
            WHERE cn.card_id = p_card_id
              AND cn.row_idx = v_drawn_count
              AND cn.number_value > 0;

            IF v_all_drawn THEN
                v_line_completed := true;
                EXIT;
            END IF;
        END LOOP;

        IF NOT v_line_completed THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Patrón LINEA no completado en ninguna fila horizontal.'
            );
        END IF;
    ELSE
        RAISE EXCEPTION 'Patrón de juego no soportado: %', p_pattern;
    END IF;

    SELECT * INTO v_prize
    FROM public.prizes
    WHERE draw_id = p_draw_id
      AND status = 'PENDING'
    ORDER BY amount DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        v_prize_amount := v_prize.amount;
        UPDATE public.prizes
        SET status = 'AWARDED',
            updated_at = timezone('utc'::text, now())
        WHERE id = v_prize.id;
    END IF;

    v_winner_id := gen_random_uuid();
    INSERT INTO public.winners (
        id,
        draw_id,
        prize_id,
        user_id,
        card_id,
        validated_by_engine,
        awarded_at
    ) VALUES (
        v_winner_id,
        p_draw_id,
        COALESCE(v_prize.id, p_draw_id),
        v_user_id,
        p_card_id,
        true,
        timezone('utc'::text, now())
    );

    UPDATE public.cards
    SET status = 'WON',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_card_id;

    UPDATE public.draws
    SET status = 'FINISHED',
        winner_count = COALESCE(winner_count, 0) + 1,
        finished_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_draw_id;

    IF v_prize_amount > 0 THEN
        UPDATE public.wallets
        SET balance = balance + v_prize_amount,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner_id,
        'draw_id', p_draw_id,
        'card_id', p_card_id,
        'pattern', p_pattern,
        'prize_awarded', v_prize_amount,
        'message', '¡BINGO AUTORITATIVO VALIDADO EXITOSAMENTE!'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_bingo_authoritative(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_bingo_authoritative(UUID, UUID, TEXT) TO authenticated, service_role, postgres;

-- 5. HARDENING DE APROBACIÓN DE RETIRO (EXCLUSIVO SUPERVISOR+)
CREATE OR REPLACE FUNCTION public.execute_approve_withdrawal(
    p_auth_id UUID,
    p_request_id UUID,
    p_idempotency_key UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_supervisor_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol SUPERVISOR o superior para aprobar retiros.';
    END IF;
    RETURN private.execute_approve_withdrawal(p_auth_id, p_request_id, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_approve_withdrawal(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_approve_withdrawal(UUID, UUID, UUID) TO authenticated, service_role, postgres;

-- 6. ALTER DEFAULT PRIVILEGES — BLINDAJE PARA MIGRACIONES FUTURAS
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

