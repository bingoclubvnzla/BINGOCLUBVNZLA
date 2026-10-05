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
-- 12. TRIGGERS Y FUNCIONES DE IDENTIDAD Y SEGURIDAD
-- ==============================================================================

-- Generador de Identificador Público (BCV-XXXXXX)
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
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger para nuevo usuario en auth.users -> creación automática de perfil y wallet
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

    -- Creación de billetera bloqueada para Fase 1
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

    -- Registro en auditoría
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
        jsonb_build_object('public_id', gen_id, 'email_domain', split_part(NEW.email, '@', 2))
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger de protección de perfil: un PLAYER/OPERATOR jamás puede auto-promover su rol o estatus
CREATE OR REPLACE FUNCTION public.protect_profile_mutations()
RETURNS TRIGGER AS $$
DECLARE
    caller_role user_role;
BEGIN
    -- Si el rol, estatus o nivel de seguridad cambian:
    IF (NEW.role IS DISTINCT FROM OLD.role) OR
       (NEW.status IS DISTINCT FROM OLD.status) OR
       (NEW.security_level IS DISTINCT FROM OLD.security_level) THEN
        
        -- Obtener el rol del usuario que ejecuta la consulta
        SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

        IF caller_role IS NULL OR caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden modificar roles o niveles de seguridad.';
        END IF;

        -- Un ADMIN no puede auto-promoverse a SUPER_ADMIN
        IF NEW.role = 'SUPER_ADMIN' AND caller_role != 'SUPER_ADMIN' THEN
            RAISE EXCEPTION 'Acceso denegado: Solo SUPER_ADMIN puede otorgar el rol SUPER_ADMIN.';
        END IF;

        -- Registrar cambio en auditoría
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

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
