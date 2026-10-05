-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 02: SECURITY HARDENING Y PROTECCIÓN CONCURRENTE
-- Fase 1.1: Prevención de búsqueda arbitraria (search_path), inmutabilidad de auditoría,
-- bloqueo de cartones (card lock) y control optimista de concurrencia (draws versioning).
-- ==============================================================================

-- ==============================================================================
-- 1. HARDENING DE FUNCIONES SECURITY DEFINER: SET search_path = public, pg_temp
-- ==============================================================================

-- 1.1 current_user_role()
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 1.2 is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 1.3 is_operator_or_higher()
CREATE OR REPLACE FUNCTION public.is_operator_or_higher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 1.4 generate_public_id()
CREATE OR REPLACE FUNCTION public.generate_public_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        new_id := 'BCV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = new_id) INTO exists_check;
        EXIT WHEN NOT exists_check;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- 1.5 handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_id TEXT;
BEGIN
    gen_id := public.generate_public_id();

    INSERT INTO public.profiles (
        id,
        public_id,
        full_name,
        display_name,
        role,
        status,
        security_level,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        gen_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'display_name', gen_id),
        'PLAYER',
        'ACTIVE',
        1,
        now(),
        now()
    );

    -- Billetera inicial bloqueada para Fase 1
    INSERT INTO public.wallets (
        user_id,
        currency,
        balance_available,
        balance_locked,
        status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'VES',
        0.00,
        0.00,
        'DISABLED_PHASE_1',
        now(),
        now()
    );

    -- Auditoría inicial inmutable
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        NEW.id,
        'PLAYER',
        'USER_REGISTERED',
        'profiles',
        NEW.id::text,
        jsonb_build_object('public_id', gen_id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 1.6 protect_profile_mutations()
CREATE OR REPLACE FUNCTION public.protect_profile_mutations()
RETURNS TRIGGER AS $$
DECLARE
    caller_role user_role;
BEGIN
    -- Validar si se intenta alterar rol, estado o nivel de seguridad
    IF (NEW.role IS DISTINCT FROM OLD.role) OR
       (NEW.status IS DISTINCT FROM OLD.status) OR
       (NEW.security_level IS DISTINCT FROM OLD.security_level) THEN
        
        SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

        IF caller_role IS NULL OR caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden modificar roles o niveles de seguridad.';
        END IF;

        IF NEW.role = 'SUPER_ADMIN' AND caller_role != 'SUPER_ADMIN' THEN
            RAISE EXCEPTION 'Acceso denegado: Solo SUPER_ADMIN puede otorgar el rol SUPER_ADMIN.';
        END IF;

        INSERT INTO public.audit_logs (
            user_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            metadata
        ) VALUES (
            auth.uid(),
            caller_role::text,
            'ROLE_OR_STATUS_CHANGED',
            'profiles',
            NEW.id::text,
            jsonb_build_object(
                'old_role', OLD.role, 'new_role', NEW.role,
                'old_status', OLD.status, 'new_status', NEW.status
            )
        );
    END IF;

    -- Impedir alteración de public_id una vez emitido
    IF NEW.public_id IS DISTINCT FROM OLD.public_id THEN
        RAISE EXCEPTION 'Acceso denegado: El identificador público BCV es inmutable.';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 2. INMUTABILIDAD TOTAL DE AUDIT_LOGS (PREVENCIÓN DE MANIPULACIÓN HISTÓRICA)
-- ==============================================================================

-- Trigger que rechaza cualquier UPDATE o DELETE en audit_logs a nivel de base de datos
CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Acceso denegado: La bitácora audit_logs es de solo adición (append-only) y no puede ser modificada ni eliminada.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- Reemplazo de política de inserción: prohibir inserciones falsificadas desde el cliente
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_hardened" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        actor_role = (SELECT role::text FROM public.profiles WHERE id = auth.uid())
    );

-- ==============================================================================
-- 3. BLOQUEO DE CARTONES (CARDS LOCK TRG)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.enforce_card_lock()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el cartón ya está en juego o finalizado, es inmutable
    IF OLD.status IN ('PLAYING', 'WON', 'CANCELLED') THEN
        IF (NEW.draw_id IS DISTINCT FROM OLD.draw_id) OR
           (NEW.user_id IS DISTINCT FROM OLD.user_id) OR
           (NEW.card_serial IS DISTINCT FROM OLD.card_serial) OR
           (NEW.grid_layout IS DISTINCT FROM OLD.grid_layout) THEN
            RAISE EXCEPTION 'Acceso denegado: Los cartones en estado % están bloqueados criptográficamente.', OLD.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_card_lock ON public.cards;
CREATE TRIGGER trg_enforce_card_lock
    BEFORE UPDATE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION public.enforce_card_lock();

-- ==============================================================================
-- 4. CONCURRENCIA Y CONTROL OPTIMISTA EN SORTEOS (DRAWS VERSIONING)
-- ==============================================================================
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.transition_draw_state_atomic(
    p_draw_id UUID,
    p_expected_version INTEGER,
    p_new_state draw_status
) RETURNS JSONB AS $$
DECLARE
    current_rec RECORD;
    is_valid_transition BOOLEAN;
BEGIN
    -- Bloqueo pesimista de fila para prevenir transiciones simultáneas concurrentes
    SELECT id, status, version INTO current_rec
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado con id %', p_draw_id;
    END IF;

    -- Validar control optimista de concurrencia
    IF current_rec.version != p_expected_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia: El sorteo se encuentra en versión %, esperado %.', current_rec.version, p_expected_version;
    END IF;

    -- Validar máquina de estados autoritativa
    is_valid_transition := public.validate_draw_state_transition(current_rec.status, p_new_state);
    IF NOT is_valid_transition THEN
        RAISE EXCEPTION 'Transición inválida de estado: de % a %.', current_rec.status, p_new_state;
    END IF;

    -- Aplicar transición atómica y avanzar versión
    UPDATE public.draws
    SET status = p_new_state,
        version = current_rec.version + 1,
        updated_at = now()
    WHERE id = p_draw_id;

    -- Registrar evento en auditoría
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        auth.uid(),
        COALESCE((SELECT role::text FROM public.profiles WHERE id = auth.uid()), 'SYSTEM'),
        'DRAW_STATE_TRANSITION',
        'draws',
        p_draw_id::text,
        jsonb_build_object(
            'previous_state', current_rec.status,
            'new_state', p_new_state,
            'new_version', current_rec.version + 1
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'previous_state', current_rec.status,
        'new_state', p_new_state,
        'version', current_rec.version + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 5. LEDGER CRIPTOGRÁFICO EN WALLET_TRANSACTIONS
-- ==============================================================================
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_hashes ON public.wallet_transactions(previous_hash, transaction_hash);
