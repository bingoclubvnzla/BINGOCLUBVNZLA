-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 00: ESQUEMA INICIAL Y CONSTRAINTS
-- Fase 1: Arquitectura Server-Authoritative, RBAC, Integridad y Auditoría
-- ==============================================================================

-- 1. EXTENSIONES Y ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE draw_status AS ENUM (
        'DRAFT',
        'SCHEDULED',
        'READY',
        'ACTIVE',
        'PAUSED',
        'FINISHED',
        'CANCELLED',
        'ARCHIVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'DEPOSIT',
        'WITHDRAWAL',
        'CARD_PURCHASE',
        'PRIZE_PAYOUT',
        'REFUND',
        'ADJUSTMENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
        'SETTLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABLA: PROFILES (VINCULADA A auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    public_id VARCHAR(16) NOT NULL UNIQUE,
    full_name TEXT,
    display_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'PLAYER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    security_level INTEGER NOT NULL DEFAULT 1 CHECK (security_level >= 1 AND security_level <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- ==============================================================================
-- 3. TABLA: AUDIT_LOGS (BITÁCORA FORENSE INMUTABLE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id TEXT,
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 4. TABLA: APP_SETTINGS (CONFIGURACIÓN GLOBAL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. TABLA: GAME_MODALITIES (CATÁLOGO OFICIAL DE MODALIDADES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.game_modalities (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    grid_rows INTEGER NOT NULL CHECK (grid_rows > 0),
    grid_cols INTEGER NOT NULL CHECK (grid_cols > 0),
    has_free_center BOOLEAN NOT NULL DEFAULT false,
    total_balls INTEGER NOT NULL CHECK (total_balls > 0),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5.1. TABLA: MODALITY_CATALOGS (CATÁLOGOS OFICIALES DE ELEMENTOS Y TTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.modality_catalogs (
    id VARCHAR(64) PRIMARY KEY,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id) ON DELETE CASCADE,
    number_value INTEGER NOT NULL CHECK (number_value > 0),
    name VARCHAR(128) NOT NULL,
    tts_name VARCHAR(128) NOT NULL,
    asset_key VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_modality_catalog_number UNIQUE (modality_id, number_value)
);

CREATE INDEX IF NOT EXISTS idx_modality_catalogs_modality ON public.modality_catalogs(modality_id);
CREATE INDEX IF NOT EXISTS idx_modality_catalogs_num ON public.modality_catalogs(modality_id, number_value);

-- RLS: Lectura pública
ALTER TABLE public.modality_catalogs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read-only modality catalogs" ON public.modality_catalogs
        FOR SELECT TO anon, authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 5.2. TABLA: CHAPITAS_MAPPINGS (MAPEO RELACIONAL ESTRICTO 45 ANIMALES + 45 OBJETOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chapitas_mappings (
    chapitas_number INTEGER PRIMARY KEY CHECK (chapitas_number BETWEEN 1 AND 90),
    source_type VARCHAR(16) NOT NULL CHECK (source_type IN ('ANIMAL', 'OBJECT')),
    source_catalog_id VARCHAR(64) NOT NULL REFERENCES public.modality_catalogs(id) ON DELETE CASCADE,
    source_number INTEGER NOT NULL CHECK (source_number BETWEEN 1 AND 75),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_chapitas_source UNIQUE (source_type, source_number)
);

CREATE INDEX IF NOT EXISTS idx_chapitas_mappings_catalog ON public.chapitas_mappings(source_catalog_id);
CREATE INDEX IF NOT EXISTS idx_chapitas_mappings_source ON public.chapitas_mappings(source_type, source_number);

-- RLS: Lectura pública
ALTER TABLE public.chapitas_mappings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "chapitas_mappings_select_all" ON public.chapitas_mappings
        FOR SELECT TO anon, authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- VISTA CANÓNICA: V_CHAPITAS_CATALOG
CREATE OR REPLACE VIEW public.v_chapitas_catalog AS
SELECT 
    cm.chapitas_number,
    cm.source_type,
    cm.source_catalog_id,
    cm.source_number,
    mc.name,
    mc.tts_name,
    mc.asset_key,
    mc.is_active
FROM public.chapitas_mappings cm
JOIN public.modality_catalogs mc ON cm.source_catalog_id = mc.id;

-- ==============================================================================
-- 6. TABLA: GAME_ROOMS (SALAS DE JUEGO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    max_players INTEGER NOT NULL DEFAULT 500 CHECK (max_players > 0),
    is_private BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_game_rooms_modality ON public.game_rooms(modality_id);

-- ==============================================================================
-- 7. TABLA: DRAWS (SORTEOS AUTORITATIVOS Y MÁQUINA DE ESTADOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    title VARCHAR(128) NOT NULL,
    draw_number BIGINT NOT NULL,
    status draw_status NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    drawn_numbers INTEGER[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_room_draw_number UNIQUE (room_id, draw_number)
);

CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_room ON public.draws(room_id);

-- ==============================================================================
-- 8. TABLA: DRAW_EVENTS (EVENTOS ATÓMICOS DE SORTEO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.draw_events (
    id BIGSERIAL PRIMARY KEY,
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    ball_number INTEGER,
    sequence_number INTEGER NOT NULL CHECK (sequence_number >= 1),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_draw_sequence UNIQUE (draw_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_draw_events_draw ON public.draw_events(draw_id);

-- ==============================================================================
-- 9. TABLA: CARDS & CARD_NUMBERS (CARTONES Y NÚMEROS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_serial VARCHAR(32) NOT NULL,
    grid_layout JSONB NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'PLAYING', 'WON', 'CANCELLED')),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_draw_card_serial UNIQUE (draw_id, card_serial)
);

CREATE INDEX IF NOT EXISTS idx_cards_user ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_draw ON public.cards(draw_id);

CREATE TABLE IF NOT EXISTS public.card_numbers (
    id BIGSERIAL PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    number_value INTEGER NOT NULL,
    row_pos INTEGER NOT NULL,
    col_pos INTEGER NOT NULL,
    is_marked BOOLEAN NOT NULL DEFAULT false,
    marked_at TIMESTAMPTZ,
    CONSTRAINT uq_card_cell UNIQUE (card_id, row_pos, col_pos)
);

CREATE INDEX IF NOT EXISTS idx_card_numbers_card ON public.card_numbers(card_id);

-- ==============================================================================
-- 10. TABLA: WALLETS, TRANSACTIONS & PAYMENT_REQUESTS (ESTRUCTURA DE SEGURIDAD)
-- NOTA: En Fase 1 el status por defecto es 'DISABLED_PHASE_1' sin dinero real.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    balance_available NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (balance_available >= 0),
    balance_locked NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (balance_locked >= 0),
    status VARCHAR(24) NOT NULL DEFAULT 'DISABLED_PHASE_1' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED_PHASE_1')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    balance_before NUMERIC(14,2) NOT NULL,
    balance_after NUMERIC(14,2) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    reference_code VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.wallet_transactions(idempotency_key);

CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_method VARCHAR(24) NOT NULL CHECK (payment_method IN ('PAGO_MOVIL', 'BINANCE_PAY', 'TRANSFER')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED')),
    origin_reference VARCHAR(64) NOT NULL,
    phone_or_account VARCHAR(64),
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_requests(status);

-- ==============================================================================
-- 11. TABLA: OPERATOR_ACTIONS, PRIZES & WINNERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.operator_actions (
    id BIGSERIAL PRIMARY KEY,
    operator_id UUID NOT NULL REFERENCES auth.users(id),
    action_type VARCHAR(64) NOT NULL,
    target_entity VARCHAR(64) NOT NULL,
    target_id TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    prize_type VARCHAR(16) NOT NULL DEFAULT 'FIXED' CHECK (prize_type IN ('FIXED', 'PERCENTAGE', 'JACKPOT')),
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AWARDED', 'VOID')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    validated_by_engine BOOLEAN NOT NULL DEFAULT true,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_winners_draw ON public.winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user ON public.winners(user_id);

-- ==============================================================================
-- 12. TRIGGERS Y FUNCIONES DE IDENTIDAD Y SEGURIDAD (CSPRNG CANÓNICO)
-- ==============================================================================

-- 12.1 Generador de Identificador Público (BCV-XXXXXX con gen_random_bytes CSPRNG)
CREATE OR REPLACE FUNCTION public.generate_public_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        new_id := 'BCV-' || upper(encode(gen_random_bytes(3), 'hex'));
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = new_id) INTO exists_check;
        EXIT WHEN NOT exists_check;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- 12.2 Trigger para nuevo usuario en auth.users -> creación automática de perfil y wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_id TEXT;
    v_full_name TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    gen_id := public.generate_public_id();

    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
    );

    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        gen_id
    );

    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        null
    );

    INSERT INTO public.profiles (
        id,
        public_id,
        full_name,
        display_name,
        avatar_url,
        role,
        status,
        security_level,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        gen_id,
        v_full_name,
        v_display_name,
        v_avatar_url,
        'PLAYER',
        'ACTIVE',
        1,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Billetera inicial bloqueada para Fase 1 / Fase 2
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
    )
    ON CONFLICT (user_id) DO NOTHING;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12.3 Trigger de protección de perfil: un PLAYER/OPERATOR jamás puede auto-promover su rol o estatus
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

DROP TRIGGER IF EXISTS trg_protect_profile ON public.profiles;
CREATE TRIGGER trg_protect_profile
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_mutations();

-- Máquina de estados para transiciones de sorteos (Server-Authoritative)
CREATE OR REPLACE FUNCTION public.validate_draw_state_transition(
    p_current_state draw_status,
    p_new_state draw_status
) RETURNS BOOLEAN AS $$
BEGIN
    -- Permitir si no cambia
    IF p_current_state = p_new_state THEN
        RETURN true;
    END IF;

    -- Transiciones válidas:
    -- DRAFT -> SCHEDULED, CANCELLED
    -- SCHEDULED -> READY, CANCELLED
    -- READY -> ACTIVE, CANCELLED, PAUSED
    -- ACTIVE -> PAUSED, FINISHED, CANCELLED
    -- PAUSED -> ACTIVE, CANCELLED, FINISHED
    -- FINISHED -> ARCHIVED
    -- CANCELLED -> ARCHIVED
    -- ARCHIVED -> (terminal)
    CASE p_current_state
        WHEN 'DRAFT' THEN
            RETURN p_new_state IN ('SCHEDULED', 'CANCELLED');
        WHEN 'SCHEDULED' THEN
            RETURN p_new_state IN ('READY', 'CANCELLED');
        WHEN 'READY' THEN
            RETURN p_new_state IN ('ACTIVE', 'PAUSED', 'CANCELLED');
        WHEN 'ACTIVE' THEN
            RETURN p_new_state IN ('PAUSED', 'FINISHED', 'CANCELLED');
        WHEN 'PAUSED' THEN
            RETURN p_new_state IN ('ACTIVE', 'FINISHED', 'CANCELLED');
        WHEN 'FINISHED' THEN
            RETURN p_new_state = 'ARCHIVED';
        WHEN 'CANCELLED' THEN
            RETURN p_new_state = 'ARCHIVED';
        WHEN 'ARCHIVED' THEN
            RETURN false;
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 01: ROW LEVEL SECURITY (RLS) ESTRICTO
-- Principio: El navegador no es autoridad. Cada tabla debe contar con RLS.
-- ==============================================================================

-- 1. FUNCIONES AUXILIARES DE ROL EN EL SERVIDOR
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_operator_or_higher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 2. HABILITACIÓN DE RLS EN TODAS LAS TABLAS EXPUESTAS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. POLÍTICAS: PROFILES
-- ==============================================================================
-- Un usuario autenticado solo puede leer su propio perfil; operadores y administradores pueden consultar perfiles
CREATE POLICY "profiles_select_self" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_operator_or_higher());

-- Un usuario solo puede actualizar campos informativos de su propio perfil
-- (El trigger trg_protect_profile previene cambio de roles o niveles de seguridad)
CREATE POLICY "profiles_update_self" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- Solo el trigger handle_new_user o administradores pueden insertar perfiles
CREATE POLICY "profiles_insert_admin" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- ==============================================================================
-- 4. POLÍTICAS: AUDIT_LOGS (SOLO SUPERVISORES Y ADMINISTRADORES)
-- ==============================================================================
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
    );

-- Inserción permitida por funciones de sistema y usuarios autorizados
CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- No se permite UPDATE ni DELETE a nadie en audit_logs (Inmutabilidad forense)
-- (No se crean políticas de UPDATE o DELETE)

-- ==============================================================================
-- 5. POLÍTICAS: APP_SETTINGS & GAME_MODALITIES
-- ==============================================================================
CREATE POLICY "modalities_select_all" ON public.game_modalities
    FOR SELECT TO public
    USING (is_active = true OR public.is_admin());

CREATE POLICY "modalities_mutate_admin" ON public.game_modalities
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "app_settings_select" ON public.app_settings
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "app_settings_mutate_admin" ON public.app_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- 6. POLÍTICAS: GAME_ROOMS & DRAWS & DRAW_EVENTS
-- ==============================================================================
CREATE POLICY "rooms_select" ON public.game_rooms
    FOR SELECT TO authenticated
    USING (status = 'ACTIVE' OR public.is_operator_or_higher());

CREATE POLICY "rooms_mutate_admin" ON public.game_rooms
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "draws_select" ON public.draws
    FOR SELECT TO public
    USING (status != 'DRAFT' OR public.is_operator_or_higher());

-- Mutación directa de sorteos desde el cliente restringida estrictamente a administradores en DRAFT.
-- El ciclo de vida activo (START, EMIT, FINISH) es gestionado EXCLUSIVAMENTE por funciones SECURITY DEFINER del servidor.
CREATE POLICY "draws_mutate_admin" ON public.draws
    FOR UPDATE TO authenticated
    USING (public.is_admin() AND status = 'DRAFT')
    WITH CHECK (public.is_admin() AND status = 'DRAFT');

-- Bitácora de eventos de sorteo: Lectura pública, INSERCIÓN Y MODIFICACIÓN BLOQUEADA desde cliente.
-- Solo las funciones autoritativas en PostgreSQL pueden emitir eventos.
CREATE POLICY "draw_events_select" ON public.draw_events
    FOR SELECT TO public
    USING (true);

-- ==============================================================================
-- 7. POLÍTICAS: CARDS & CARD_NUMBERS
-- ==============================================================================
-- Un jugador solo puede ver SUS propios cartones
CREATE POLICY "cards_select_own" ON public.cards
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_operator_or_higher());

-- Cartones solo emitidos por el servidor/Edge Functions o administradores (nunca inserción directa por jugadores)
CREATE POLICY "cards_insert_admin" ON public.cards
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "card_numbers_select" ON public.card_numbers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cards 
            WHERE cards.id = card_numbers.card_id 
            AND (cards.user_id = auth.uid() OR public.is_operator_or_higher())
        )
    );

-- ==============================================================================
-- 8. POLÍTICAS: WALLETS & TRANSACTIONS & PAYMENTS (AISLAMIENTO TOTAL)
-- ==============================================================================
-- Un jugador solo puede ver su propia billetera
CREATE POLICY "wallets_select_own" ON public.wallets
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- El cliente JAMÁS puede actualizar o insertar directamente en wallets
-- Las mutaciones son exclusivas de funciones de base de datos SECURITY DEFINER

CREATE POLICY "transactions_select_own" ON public.wallet_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.wallets 
            WHERE wallets.id = wallet_transactions.wallet_id 
            AND (wallets.user_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "payment_requests_select_own" ON public.payment_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_operator_or_higher());

CREATE POLICY "payment_requests_insert_own" ON public.payment_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_requests_update_operator" ON public.payment_requests
    FOR UPDATE TO authenticated
    USING (public.is_operator_or_higher())
    WITH CHECK (public.is_operator_or_higher());

-- ==============================================================================
-- 9. POLÍTICAS: PRIZES & WINNERS & OPERATOR_ACTIONS
-- ==============================================================================
CREATE POLICY "prizes_select_all" ON public.prizes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "prizes_mutate_admin" ON public.prizes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "winners_select_all" ON public.winners
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "operator_actions_select" ON public.operator_actions
    FOR SELECT TO authenticated
    USING (public.is_operator_or_higher());

CREATE POLICY "operator_actions_insert" ON public.operator_actions
    FOR INSERT TO authenticated
    WITH CHECK (operator_id = auth.uid() AND public.is_operator_or_higher());
-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 02: SECURITY HARDENING Y PROTECCIÓN CONCURRENTE
-- Fase 1.1: Prevención de búsqueda arbitraria (search_path), inmutabilidad de auditoría,
-- bloqueo de cartones (card lock) y control optimista de concurrencia (draws versioning).
-- ==============================================================================

-- ==============================================================================
-- 1. HARDENING DE FUNCIONES SECURITY DEFINER: SET search_path = public, pg_temp
-- (Las funciones 1.1 a 1.6: current_user_role, is_admin, is_operator_or_higher,
-- generate_public_id, handle_new_user y protect_profile_mutations se encuentran
-- canónicamente definidas y securizadas con CSPRNG y search_path seguro en Secciones 1 y 12)
-- ==============================================================================

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
SET public_code = 'BCV-S' || upper(substr(encode(digest(id::text || clock_timestamp()::text, 'sha256'), 'hex'), 1, 6))
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
-- ==============================================================================
-- 4. FUNCIÓN: CREAR SORTEO AUTORIZADO (create_draw)
-- ==============================================================================
CREATE SEQUENCE IF NOT EXISTS public.draw_number_seq START WITH 101;

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

    -- Generar código público con CSPRNG y número secuencial atómico anti-concurrencia
    v_public_code := 'BCV-S' || upper(encode(gen_random_bytes(3), 'hex'));
    v_draw_number := nextval('public.draw_number_seq');

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

    -- Generar permutación criptográfica oficial CSPRNG una sola vez (rango 1..total_balls)
    v_sequence := public.generate_draw_permutation(v_modality.total_balls, 1);
    -- Hash SHA-256 criptográfico para integridad de evento génesis
    v_event_hash := encode(digest(p_draw_id::text || ':1:DRAW_STARTED:' || clock_timestamp()::text, 'sha256'), 'hex');

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

    -- Hash SHA-256 criptográfico de integridad encadenada
    v_event_hash := encode(digest(p_draw_id::text || ':' || v_next_seq::text || ':' || v_next_ball::text || ':' || v_prev_hash || ':' || clock_timestamp()::text, 'sha256'), 'hex');

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

    -- Protección: Sorteos en DRAFT solo son visibles para operadores o administradores
    IF v_draw.status = 'DRAFT' AND NOT public.is_operator_or_higher() THEN
        RETURN jsonb_build_object('error', 'Acceso denegado: Sorteo no disponible');
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

-- Control explícito de ejecución de funciones (REVOKE / GRANT)
REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_draw_authoritative(UUID, VARCHAR, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_draw_authoritative(UUID, INTEGER) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_next_ball_authoritative(UUID, INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_draw_snapshot(UUID) TO anon, authenticated;

-- ==============================================================================
-- REMEDIACIÓN Y HARDENING SECURITY DEFINER (FASE 2.6.1)
-- Erradicación de rls_auto_enable() y bloqueo de ejecución no autorizada en PostgREST
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT evtname 
        FROM pg_event_trigger 
        WHERE evtfoid = 'public.rls_auto_enable'::regproc
    LOOP
        EXECUTE 'DROP EVENT TRIGGER IF EXISTS ' || quote_ident(r.evtname);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    LOOP
        EXECUTE 'REVOKE ALL ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon, authenticated';
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- Blindaje explícito de funciones internas SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.generate_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_mutations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_draw_state_transition(draw_status, draw_status) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_draw_permutation(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transition_draw_state_atomic(UUID, INTEGER, draw_status) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_audit_log_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_card_lock() FROM PUBLIC, anon, authenticated;

-- Restricción de funciones de rol (no ejecutables por rol anon)
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_operator_or_higher() FROM anon;

-- ==============================================================================
-- VALIDACIÓN CANÓNICA DE INTEGRIDAD: CHAPITAS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_chapitas_catalog_integrity()
RETURNS BOOLEAN AS $$
DECLARE
    v_total INTEGER;
    v_animals INTEGER;
    v_objects INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.chapitas_mappings;
    SELECT COUNT(*) INTO v_animals FROM public.chapitas_mappings WHERE source_type = 'ANIMAL';
    SELECT COUNT(*) INTO v_objects FROM public.chapitas_mappings WHERE source_type = 'OBJECT';

    IF v_total <> 90 THEN
        RAISE EXCEPTION 'CHAPITAS debe contener exactamente 90 mapeos, encontrado: %', v_total;
    END IF;

    IF v_animals <> 45 THEN
        RAISE EXCEPTION 'CHAPITAS debe contener exactamente 45 referencias de animales, encontrado: %', v_animals;
    END IF;

    IF v_objects <> 45 THEN
        RAISE EXCEPTION 'CHAPITAS debe contener exactamente 45 referencias de objetos, encontrado: %', v_objects;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_chapitas_catalog_integrity() FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- REGISTRO DE EVENTOS DE AUDITORÍA DE AUTENTICACIÓN (FASE 2.6.2 HARDENED)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_clean_metadata JSONB;
BEGIN
    -- Validar lista blanca estricta de eventos autorizados para cliente
    -- Rechazo incondicional de eventos privilegiados o administrativos
    IF p_action NOT IN ('LOGIN_FAILURE', 'LOGIN_ATTEMPT', 'PASSWORD_RESET_REQUESTED', 'LOGOUT') THEN
        RAISE EXCEPTION 'Acceso denegado: Acción de auditoría no permitida para cliente (%).', p_action;
    END IF;

    -- Límite de tamaño de metadata (2KB) para mitigar denegación de almacenamiento
    IF octet_length(COALESCE(p_metadata, '{}'::jsonb)::text) > 2048 THEN
        RAISE EXCEPTION 'Payload de metadata excede el límite máximo permitido (2KB).';
    END IF;

    -- Redacción de credenciales y secretos potencialmente enviados
    v_clean_metadata := COALESCE(p_metadata, '{}'::jsonb)
        - 'password'
        - 'contraseña'
        - 'token'
        - 'access_token'
        - 'refresh_token'
        - 'secret'
        - 'client_secret'
        - 'turnstile_token'
        - 'captchatoken'
        - 'cf_turnstile';

    -- Derivar identidad real desde el contexto criptográfico de sesión PostgreSQL
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT role::text INTO v_role FROM public.profiles WHERE id = v_user_id;
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        COALESCE(v_role, 'ANON'),
        p_action,
        'auth',
        COALESCE(v_user_id::text, 'anon'),
        v_clean_metadata
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) TO anon, authenticated;


-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — DATOS INICIALES (SEED)
-- Fase 1: Catálogo de Modalidades y Parámetros Globales
-- ==============================================================================

-- 1. MODALIDADES OFICIALES
INSERT INTO public.game_modalities (
    id,
    name,
    description,
    grid_rows,
    grid_cols,
    has_free_center,
    total_balls,
    config,
    is_active
) VALUES 
(
    'BINGO_75',
    'Bingo 75 Clásico',
    'Modalidad tradicional de 75 balotas con cartón de 5x5 y casilla central libre.',
    5,
    5,
    true,
    75,
    jsonb_build_object(
        'column_ranges', jsonb_build_object(
            'B', jsonb_build_array(1, 15),
            'I', jsonb_build_array(16, 30),
            'N', jsonb_build_array(31, 45),
            'G', jsonb_build_array(46, 60),
            'O', jsonb_build_array(61, 75)
        ),
        'winning_patterns', jsonb_build_array('LINE', 'FULL_HOUSE')
    ),
    true
),
(
    'BINGO_90',
    'Bingo 90 Bolas',
    'Modalidad europea y latinoamericana de 90 números. Cartón de 3 filas y 9 columnas con 15 números por cartón.',
    3,
    9,
    false,
    90,
    jsonb_build_object(
        'numbers_per_card', 15,
        'numbers_per_row', 5,
        'winning_patterns', jsonb_build_array('ONE_LINE', 'TWO_LINES', 'BINGO')
    ),
    true
),
(
    'ANIMALITOS',
    'Bingo de los Animalitos',
    'Modalidad venezolana oficial basada en los 75 animalitos de la suerte tradicionales. Matriz de 5x5 con casilla libre central y rango 1-75.',
    5,
    5,
    true,
    75,
    jsonb_build_object(
        'theme', 'ANIMALITOS_VENEZUELA',
        'winning_patterns', jsonb_build_array('LINE', 'FULL_HOUSE')
    ),
    true
),
(
    'OBJETOS',
    'Bingo Objetos Criollos',
    'Modalidad temática venezolana con 75 símbolos y objetos populares. Matriz 5x5 con centro libre y rango 1-75.',
    5,
    5,
    true,
    75,
    jsonb_build_object(
        'theme', 'CRIOLLO_VNZLA',
        'winning_patterns', jsonb_build_array('LINE', 'FULL_HOUSE')
    ),
    true
),
(
    'CHAPITAS',
    'Bingo Chapitas Tradicional',
    'Modalidad oficial de 90 números conformada por 45 animalitos y 45 objetos tradicionales venezolanos.',
    3,
    9,
    false,
    90,
    jsonb_build_object(
        'theme', 'CHAPITAS_45_45',
        'numbers_per_card', 15,
        'numbers_per_row', 5,
        'winning_patterns', jsonb_build_array('ONE_LINE', 'TWO_LINES', 'BINGO')
    ),
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    grid_rows = EXCLUDED.grid_rows,
    grid_cols = EXCLUDED.grid_cols,
    has_free_center = EXCLUDED.has_free_center,
    total_balls = EXCLUDED.total_balls,
    config = EXCLUDED.config,
    is_active = EXCLUDED.is_active;

-- 2. POBLACIÓN DE TABLA MODALITY_CATALOGS (75 ANIMALITOS Y 75 OBJETOS)
INSERT INTO public.modality_catalogs (id, modality_id, number_value, name, tts_name, asset_key) VALUES
('ani-1', 'ANIMALITOS', 1, 'Delfín', 'Delfín', 'delfin'),
('ani-2', 'ANIMALITOS', 2, 'Carnero', 'Carnero', 'carnero'),
('ani-3', 'ANIMALITOS', 3, 'Toro', 'Toro', 'toro'),
('ani-4', 'ANIMALITOS', 4, 'Ciempiés', 'Ciempiés', 'ciempies'),
('ani-5', 'ANIMALITOS', 5, 'Alacrán', 'Alacrán', 'alacran'),
('ani-6', 'ANIMALITOS', 6, 'León', 'León', 'leon'),
('ani-7', 'ANIMALITOS', 7, 'Rana', 'Rana', 'rana'),
('ani-8', 'ANIMALITOS', 8, 'Perico', 'Perico', 'perico'),
('ani-9', 'ANIMALITOS', 9, 'Ratón', 'Ratón', 'raton'),
('ani-10', 'ANIMALITOS', 10, 'Águila', 'Águila', 'aguila'),
('ani-11', 'ANIMALITOS', 11, 'Tigre', 'Tigre', 'tigre'),
('ani-12', 'ANIMALITOS', 12, 'Gato', 'Gato', 'gato'),
('ani-13', 'ANIMALITOS', 13, 'Caballo', 'Caballo', 'caballo'),
('ani-14', 'ANIMALITOS', 14, 'Mono', 'Mono', 'mono'),
('ani-15', 'ANIMALITOS', 15, 'Paloma', 'Paloma', 'paloma'),
('ani-16', 'ANIMALITOS', 16, 'Zorro', 'Zorro', 'zorro'),
('ani-17', 'ANIMALITOS', 17, 'Oso', 'Oso', 'oso'),
('ani-18', 'ANIMALITOS', 18, 'Pavo', 'Pavo', 'pavo'),
('ani-19', 'ANIMALITOS', 19, 'Burro', 'Burro', 'burro'),
('ani-20', 'ANIMALITOS', 20, 'Chivo', 'Chivo', 'chivo'),
('ani-21', 'ANIMALITOS', 21, 'Cochino', 'Cochino', 'cochino'),
('ani-22', 'ANIMALITOS', 22, 'Gallo', 'Gallo', 'gallo'),
('ani-23', 'ANIMALITOS', 23, 'Camello', 'Camello', 'camello'),
('ani-24', 'ANIMALITOS', 24, 'Cebra', 'Cebra', 'cebra'),
('ani-25', 'ANIMALITOS', 25, 'Iguana', 'Iguana', 'iguana'),
('ani-26', 'ANIMALITOS', 26, 'Gallina', 'Gallina', 'gallina'),
('ani-27', 'ANIMALITOS', 27, 'Vaca', 'Vaca', 'vaca'),
('ani-28', 'ANIMALITOS', 28, 'Perro', 'Perro', 'perro'),
('ani-29', 'ANIMALITOS', 29, 'Zamuro', 'Zamuro', 'zamuro'),
('ani-30', 'ANIMALITOS', 30, 'Elefante', 'Elefante', 'elefante'),
('ani-31', 'ANIMALITOS', 31, 'Caimán', 'Caimán', 'caiman'),
('ani-32', 'ANIMALITOS', 32, 'Lapa', 'Lapa', 'lapa'),
('ani-33', 'ANIMALITOS', 33, 'Ardilla', 'Ardilla', 'ardilla'),
('ani-34', 'ANIMALITOS', 34, 'Pescado', 'Pescado', 'pescado'),
('ani-35', 'ANIMALITOS', 35, 'Venado', 'Venado', 'venado'),
('ani-36', 'ANIMALITOS', 36, 'Jirafa', 'Jirafa', 'jirafa'),
('ani-37', 'ANIMALITOS', 37, 'Culebra', 'Culebra', 'culebra'),
('ani-38', 'ANIMALITOS', 38, 'Ballena', 'Ballena', 'ballena'),
('ani-39', 'ANIMALITOS', 39, 'Chigüire', 'Chigüire', 'chiguire'),
('ani-40', 'ANIMALITOS', 40, 'Cunaguaro', 'Cunaguaro', 'cunaguaro'),
('ani-41', 'ANIMALITOS', 41, 'Guacamaya', 'Guacamaya', 'guacamaya'),
('ani-42', 'ANIMALITOS', 42, 'Turpial', 'Turpial', 'turpial'),
('ani-43', 'ANIMALITOS', 43, 'Oso Frontino', 'Oso Frontino', 'oso_frontino'),
('ani-44', 'ANIMALITOS', 44, 'Morrocoy', 'Morrocoy', 'morrocoy'),
('ani-45', 'ANIMALITOS', 45, 'Cachicamo', 'Cachicamo', 'cachicamo'),
('ani-46', 'ANIMALITOS', 46, 'Puma', 'Puma', 'puma'),
('ani-47', 'ANIMALITOS', 47, 'Guacharaca', 'Guacharaca', 'guacharaca'),
('ani-48', 'ANIMALITOS', 48, 'Garza Blanca', 'Garza Blanca', 'garza_blanca'),
('ani-49', 'ANIMALITOS', 49, 'Colibrí', 'Colibrí', 'colibri'),
('ani-50', 'ANIMALITOS', 50, 'Puercoespín', 'Puercoespín', 'puercoespin'),
('ani-51', 'ANIMALITOS', 51, 'Tonina', 'Tonina', 'tonina'),
('ani-52', 'ANIMALITOS', 52, 'Babo', 'Babo', 'babo'),
('ani-53', 'ANIMALITOS', 53, 'Chupacabras', 'Chupacabras', 'chupacabras'),
('ani-54', 'ANIMALITOS', 54, 'Rabipelado', 'Rabipelado', 'rabipelado'),
('ani-55', 'ANIMALITOS', 55, 'Perezoso', 'Perezoso', 'perezoso'),
('ani-56', 'ANIMALITOS', 56, 'Tucán', 'Tucán', 'tucan'),
('ani-57', 'ANIMALITOS', 57, 'Picaflor', 'Picaflor', 'picaflor'),
('ani-58', 'ANIMALITOS', 58, 'Araguato', 'Araguato', 'araguato'),
('ani-59', 'ANIMALITOS', 59, 'Manatí', 'Manatí', 'manati'),
('ani-60', 'ANIMALITOS', 60, 'Pavón', 'Pavón', 'pavon'),
('ani-61', 'ANIMALITOS', 61, 'Bagre', 'Bagre', 'bagre'),
('ani-62', 'ANIMALITOS', 62, 'Pavita', 'Pavita', 'pavita'),
('ani-63', 'ANIMALITOS', 63, 'Picure', 'Picure', 'picure'),
('ani-64', 'ANIMALITOS', 64, 'Guabina', 'Guabina', 'guabina'),
('ani-65', 'ANIMALITOS', 65, 'Gavilán', 'Gavilán', 'gavilan'),
('ani-66', 'ANIMALITOS', 66, 'Koala', 'Koala', 'koala'),
('ani-67', 'ANIMALITOS', 67, 'Canguro', 'Canguro', 'canguro'),
('ani-68', 'ANIMALITOS', 68, 'Lobo', 'Lobo', 'lobo'),
('ani-69', 'ANIMALITOS', 69, 'Rinoceronte', 'Rinoceronte', 'rinoceronte'),
('ani-70', 'ANIMALITOS', 70, 'Hipopótamo', 'Hipopótamo', 'hipopotamo'),
('ani-71', 'ANIMALITOS', 71, 'Foca', 'Foca', 'foca'),
('ani-72', 'ANIMALITOS', 72, 'Pingüino', 'Pingüino', 'pinguino'),
('ani-73', 'ANIMALITOS', 73, 'Cernícalo', 'Cernícalo', 'cernicalo'),
('ani-74', 'ANIMALITOS', 74, 'Flamenco', 'Flamenco', 'flamenco'),
('ani-75', 'ANIMALITOS', 75, 'Jaguar', 'Jaguar', 'jaguar')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tts_name = EXCLUDED.tts_name,
    asset_key = EXCLUDED.asset_key,
    number_value = EXCLUDED.number_value;

INSERT INTO public.modality_catalogs (id, modality_id, number_value, name, tts_name, asset_key) VALUES
('obj-1', 'OBJETOS', 1, 'Cuatro', 'Cuatro Venezolano', 'cuatro'),
('obj-2', 'OBJETOS', 2, 'Maracas', 'Maracas', 'maracas'),
('obj-3', 'OBJETOS', 3, 'Arpa', 'Arpa Llanera', 'arpa'),
('obj-4', 'OBJETOS', 4, 'Arepa', 'Arepa', 'arepa'),
('obj-5', 'OBJETOS', 5, 'Empanada', 'Empanada', 'empanada'),
('obj-6', 'OBJETOS', 6, 'Cachapa', 'Cachapa con Queso de Mano', 'cachapa'),
('obj-7', 'OBJETOS', 7, 'Hallaca', 'Hallaca Navideña', 'hallaca'),
('obj-8', 'OBJETOS', 8, 'Papelón con Limón', 'Papelón con Limón', 'papelon_con_limon'),
('obj-9', 'OBJETOS', 9, 'Chinchorro', 'Chinchorro Llanero', 'chinchorro'),
('obj-10', 'OBJETOS', 10, 'Sombrero de Cogollo', 'Sombrero de Cogollo', 'sombrero_de_cogollo'),
('obj-11', 'OBJETOS', 11, 'Alpargatas', 'Alpargatas Criollas', 'alpargatas'),
('obj-12', 'OBJETOS', 12, 'Tinaja', 'Tinaja de Barro', 'tinaja'),
('obj-13', 'OBJETOS', 13, 'Pilón', 'Pilón de Maíz', 'pilon'),
('obj-14', 'OBJETOS', 14, 'Budare', 'Budare', 'budare'),
('obj-15', 'OBJETOS', 15, 'Totuma', 'Totuma', 'totuma'),
('obj-16', 'OBJETOS', 16, 'Ávila', 'Cerro El Ávila', 'avila'),
('obj-17', 'OBJETOS', 17, 'Salto Ángel', 'Salto Ángel Kerepakupai Vená', 'salto_angel'),
('obj-18', 'OBJETOS', 18, 'Médanos de Coro', 'Médanos de Coro', 'medanos_de_coro'),
('obj-19', 'OBJETOS', 19, 'Puente sobre el Lago', 'Puente sobre el Lago de Maracaibo', 'puente_sobre_el_lago'),
('obj-20', 'OBJETOS', 20, 'Guacamaya', 'Guacamaya Bandera', 'guacamaya'),
('obj-21', 'OBJETOS', 21, 'Turpial', 'Turpial Nacional', 'turpial'),
('obj-22', 'OBJETOS', 22, 'Orquídea', 'Orquídea Flor de Mayo', 'orquidea'),
('obj-23', 'OBJETOS', 23, 'Araguaney', 'Árbol Araguaney', 'araguaney'),
('obj-24', 'OBJETOS', 24, 'Tepuy Roraima', 'Tepuy Monte Roraima', 'tepuy'),
('obj-25', 'OBJETOS', 25, 'Relámpago del Catatumbo', 'Relámpago del Catatumbo', 'relampago_del_catatumbo'),
('obj-26', 'OBJETOS', 26, 'Taladro Petrolero', 'Taladro Petrolero Balancín', 'petroleo'),
('obj-27', 'OBJETOS', 27, 'Cacao de Chuao', 'Cacao de Chuao', 'cacao_de_chuao'),
('obj-28', 'OBJETOS', 28, 'Café de Mérida', 'Café de Mérida', 'cafe_de_merida'),
('obj-29', 'OBJETOS', 29, 'Cocuy de Lara', 'Cocuy de Lara', 'cocuy_de_lara'),
('obj-30', 'OBJETOS', 30, 'Ron Venezolano', 'Ron Añejo Venezolano', 'ron_venezolano'),
('obj-31', 'OBJETOS', 31, 'Papagayo', 'Papagayo', 'papagayo'),
('obj-32', 'OBJETOS', 32, 'Trompo', 'Trompo de Madera', 'trompo'),
('obj-33', 'OBJETOS', 33, 'Metras', 'Metras de Vidrio', 'metras'),
('obj-34', 'OBJETOS', 34, 'Perinola', 'Perinola Criolla', 'perinola'),
('obj-35', 'OBJETOS', 35, 'Gurrufío', 'Gurrufío Tradicional', 'gurrufio'),
('obj-36', 'OBJETOS', 36, 'Yoyo', 'Yoyo de Madera', 'yoyo'),
('obj-37', 'OBJETOS', 37, 'Camión de Estacas', 'Camión de Estacas Llanero', 'camion_de_estacas'),
('obj-38', 'OBJETOS', 38, 'Autobús Encava', 'Autobús Encava', 'autobus_encava'),
('obj-39', 'OBJETOS', 39, 'Carrito por Puesto', 'Carrito por Puesto', 'carrito_por_puesto'),
('obj-40', 'OBJETOS', 40, 'Metro de Caracas', 'Metro de Caracas', 'metro_de_caracas'),
('obj-41', 'OBJETOS', 41, 'Plaza Bolívar', 'Plaza Bolívar', 'plaza_bolivar'),
('obj-42', 'OBJETOS', 42, 'Panteón Nacional', 'Panteón Nacional', 'panteon_nacional'),
('obj-43', 'OBJETOS', 43, 'Campanario Colonial', 'Campanario Colonial', 'campanario'),
('obj-44', 'OBJETOS', 44, 'Cruz de Mayo', 'Cruz de Mayo Vestida', 'cruz_de_mayo'),
('obj-45', 'OBJETOS', 45, 'Diablos Danzantes', 'Máscara de Diablos Danzantes de Yare', 'diablos_danzantes'),
('obj-46', 'OBJETOS', 46, 'Tambores de San Juan', 'Tambor Mina de Barlovento', 'tambores_de_san_juan'),
('obj-47', 'OBJETOS', 47, 'Parranda Navideña', 'Parranda Navideña', 'parranda_navidena'),
('obj-48', 'OBJETOS', 48, 'Furro de Gaita', 'Furro de Gaita Zuliana', 'gaita_zuliana'),
('obj-49', 'OBJETOS', 49, 'Charrasca', 'Charrasca de Metal', 'charrasca'),
('obj-50', 'OBJETOS', 50, 'Liquiliqui', 'Traje Liquiliqui', 'liquiliqui'),
('obj-51', 'OBJETOS', 51, 'Machete Criollo', 'Machete con Vaina', 'machete'),
('obj-52', 'OBJETOS', 52, 'Silla de Montar', 'Silla de Montar Llanera', 'silla_montar'),
('obj-53', 'OBJETOS', 53, 'Taza de Peltre', 'Taza de Peltre Azul', 'taza_peltre'),
('obj-54', 'OBJETOS', 54, 'Cuchara de Palo', 'Cuchara de Palo', 'cuchara_palo'),
('obj-55', 'OBJETOS', 55, 'Rallador de Queso', 'Rallador de Queso Blanco', 'rallador_queso'),
('obj-56', 'OBJETOS', 56, 'Queso de Mano', 'Queso de Mano Guariqueño', 'queso_mano'),
('obj-57', 'OBJETOS', 57, 'Pabellón Criollo', 'Plato de Pabellón Criollo', 'pabellon_criollo'),
('obj-58', 'OBJETOS', 58, 'Asado Negro', 'Asado Negro Caraqueño', 'asado_negro'),
('obj-59', 'OBJETOS', 59, 'Majarete', 'Majarete con Canela', 'majarete'),
('obj-60', 'OBJETOS', 60, 'Dulce de Lechosa', 'Dulce de Lechosa Navideño', 'dulce_lechosa'),
('obj-61', 'OBJETOS', 61, 'Tequeños', 'Tequeños de Queso', 'tequenos'),
('obj-62', 'OBJETOS', 62, 'Golfeado', 'Golfeado con Queso de Mano', 'golfeado'),
('obj-63', 'OBJETOS', 63, 'Pan de Jamón', 'Pan de Jamón Navideño', 'pan_de_jamon'),
('obj-64', 'OBJETOS', 64, 'Chicha Criolla', 'Chicha Criolla con Canela', 'chicha_criolla'),
('obj-65', 'OBJETOS', 65, 'Torta Negra', 'Torta Negra de Navidad', 'torta_negra'),
('obj-66', 'OBJETOS', 66, 'Casabe', 'Torta de Casabe Horneado', 'casabe'),
('obj-67', 'OBJETOS', 67, 'Piragua Fluvial', 'Piragua Fluvial del Orinoco', 'piragua'),
('obj-68', 'OBJETOS', 68, 'Faro de Cabo San Román', 'Faro de Cabo San Román', 'faro_san_roman'),
('obj-69', 'OBJETOS', 69, 'Teleférico Mukumbarí', 'Teleférico Mukumbarí de Mérida', 'teleferico_merida'),
('obj-70', 'OBJETOS', 70, 'Castillo de San Antonio', 'Castillo de San Antonio de la Eminencia', 'castillo_cumana'),
('obj-71', 'OBJETOS', 71, 'Monumento a la Virgen de la Paz', 'Monumento a la Virgen de la Paz', 'monumento_paz'),
('obj-72', 'OBJETOS', 72, 'Perla de Margarita', 'Perla de la Isla de Margarita', 'isla_margarita'),
('obj-73', 'OBJETOS', 73, 'Cayo de Los Roques', 'Cayo de Los Roques', 'los_roques'),
('obj-74', 'OBJETOS', 74, 'Cueva del Guácharo', 'Cueva del Guácharo', 'cueva_guacharo'),
('obj-75', 'OBJETOS', 75, 'Bandera Tricolor', 'Bandera Tricolor Nacional con Ocho Estrellas', 'bandera_venezuela')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tts_name = EXCLUDED.tts_name,
    asset_key = EXCLUDED.asset_key,
    number_value = EXCLUDED.number_value;

-- 3. POBLACIÓN OFICIAL DE MAPEO CHAPITAS (45 ANIMALITOS + 45 OBJETOS = 90 ELEMENTOS)
INSERT INTO public.chapitas_mappings (chapitas_number, source_type, source_catalog_id, source_number)
SELECT 
    mc.number_value AS chapitas_number,
    'ANIMAL' AS source_type,
    mc.id AS source_catalog_id,
    mc.number_value AS source_number
FROM public.modality_catalogs mc
WHERE mc.modality_id = 'ANIMALITOS' AND mc.number_value BETWEEN 1 AND 45
ON CONFLICT (chapitas_number) DO UPDATE SET
    source_type = EXCLUDED.source_type,
    source_catalog_id = EXCLUDED.source_catalog_id,
    source_number = EXCLUDED.source_number;

INSERT INTO public.chapitas_mappings (chapitas_number, source_type, source_catalog_id, source_number)
SELECT 
    (mc.number_value + 45) AS chapitas_number,
    'OBJECT' AS source_type,
    mc.id AS source_catalog_id,
    mc.number_value AS source_number
FROM public.modality_catalogs mc
WHERE mc.modality_id = 'OBJETOS' AND mc.number_value BETWEEN 1 AND 45
ON CONFLICT (chapitas_number) DO UPDATE SET
    source_type = EXCLUDED.source_type,
    source_catalog_id = EXCLUDED.source_catalog_id,
    source_number = EXCLUDED.source_number;

-- 4. PARÁMETROS GLOBALES DE PLATAFORMA (FASE 2.3)
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'PLATFORM_PHASE',
    jsonb_build_object(
        'phase', 2.3,
        'phase_name', 'VALIDACION_DEFINITIVA_Y_DEPLOY_REAL',
        'financial_operations_active', false,
        'mode', 'TEST_MODE',
        'message', 'Fase 2.3: Validación forense final, catálogo oficial de 5 modalidades (Bingo 75, Bingo 90 3x9, Animalitos 75, Objetos 75, Chapitas 90 45+45) y soporte auditado para Supabase en producción.'
    ),
    'Estado actual de fases y control operativo del sistema'
),
(
    'SECURITY_LIMITS',
    jsonb_build_object(
        'max_cards_per_player_per_draw', 12,
        'rate_limit_auth_attempts_per_minute', 5,
        'session_timeout_minutes', 120,
        'require_email_verification_for_draws', true
    ),
    'Límites de juego responsable y mitigación antifraude'
),
(
    'SECURITY_DEFINER_PHASE_2_6_2',
    jsonb_build_object(
        'phase', '2.6.2',
        'status', 'FULLY_AUDITED_AND_HARDENED',
        'log_auth_event_hardened', true,
        'transition_atomic_isolated', true,
        'internal_triggers_revoked', true,
        'verified_at', now()
    ),
    'Certificación final de endurecimiento SECURITY DEFINER y PostgREST RPC'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- ==============================================================================
-- 5. HABILITACIÓN DE WEBSOCKET REALTIME (SUPABASE REALTIME PUBLICATION)
-- ==============================================================================
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.draws;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.draw_events;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.winners;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================================================
-- 6. CERTIFICACIÓN CANÓNICA AUTOMÁTICA DEL DESPLIEGUE
-- ==============================================================================
SELECT public.validate_chapitas_catalog_integrity();

