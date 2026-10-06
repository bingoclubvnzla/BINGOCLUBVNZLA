-- =============================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1: FUNDACIÓN
-- Migration: 20260101000000_initial_schema.sql
-- Description: Core Schema, Custom Types, Tables, Constraints & Indexes
-- Author: Bingo Club Vnzla Core Engineering Team
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'PLAYER',
        'OPERATOR',
        'SUPERVISOR',
        'ADMIN',
        'SUPER_ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM (
        'ACTIVE',
        'SUSPENDED',
        'BANNED',
        'PENDING_VERIFICATION'
    );
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
        'SYSTEM_ADJUSTMENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE card_status AS ENUM (
        'AVAILABLE',
        'RESERVED',
        'PURCHASED',
        'VOID'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_gateway AS ENUM (
        'PAGO_MOVIL',
        'BINANCE_PAY',
        'BANK_TRANSFER',
        'MANUAL_OPERATOR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 2. CORE IDENTITY & PROFILES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    public_code VARCHAR(16) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    role user_role NOT NULL DEFAULT 'PLAYER',
    security_level SMALLINT NOT NULL DEFAULT 1 CHECK (security_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_public_code ON public.profiles(public_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- -----------------------------------------------------------------------------
-- 3. RBAC: ROLES & PERMISSIONS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.roles (
    name user_role PRIMARY KEY,
    description TEXT NOT NULL,
    hierarchy_level SMALLINT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(64) PRIMARY KEY,
    module VARCHAR(32) NOT NULL,
    action VARCHAR(32) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role user_role NOT NULL REFERENCES public.roles(name) ON DELETE CASCADE,
    permission_id VARCHAR(64) NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_id)
);

-- -----------------------------------------------------------------------------
-- 4. SYSTEM AUDIT LOGS (IMMUTABLE LEDGER)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role user_role NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. APP SETTINGS & CONFIGURATION
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 6. GAME MODALITIES & ROOMS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.game_modalities (
    code VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    grid_rows SMALLINT NOT NULL CHECK (grid_rows > 0),
    grid_cols SMALLINT NOT NULL CHECK (grid_cols > 0),
    has_free_center BOOLEAN NOT NULL DEFAULT FALSE,
    total_numbers SMALLINT NOT NULL CHECK (total_numbers > 0),
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modality_code VARCHAR(32) NOT NULL REFERENCES public.game_modalities(code),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    card_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (card_price_cents >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    min_players SMALLINT NOT NULL DEFAULT 2 CHECK (min_players >= 2),
    max_players INTEGER NOT NULL DEFAULT 1000 CHECK (max_players >= min_players),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_rooms_modality ON public.game_rooms(modality_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_active ON public.game_rooms(is_active);

-- -----------------------------------------------------------------------------
-- 7. DRAWS & SERVER-AUTHORITATIVE EVENTS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE RESTRICT,
    modality_code VARCHAR(32) NOT NULL REFERENCES public.game_modalities(code),
    draw_number BIGINT NOT NULL UNIQUE,
    status draw_status NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    draw_seed VARCHAR(128),
    total_cards_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_cards_sold >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_room ON public.draws(room_id);
CREATE INDEX IF NOT EXISTS idx_draws_scheduled ON public.draws(scheduled_at);

CREATE TABLE IF NOT EXISTS public.draw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    event_type VARCHAR(32) NOT NULL,
    ball_number SMALLINT,
    ball_name VARCHAR(64),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (draw_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_draw_events_draw_seq ON public.draw_events(draw_id, sequence_number);

-- -----------------------------------------------------------------------------
-- 8. CARDS & CARD NUMBERS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE RESTRICT,
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    card_serial VARCHAR(32) NOT NULL,
    status card_status NOT NULL DEFAULT 'RESERVED',
    price_cents BIGINT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (draw_id, card_serial)
);

CREATE INDEX IF NOT EXISTS idx_cards_draw_id ON public.cards(draw_id);
CREATE INDEX IF NOT EXISTS idx_cards_player_id ON public.cards(player_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);

CREATE TABLE IF NOT EXISTS public.card_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    row_idx SMALLINT NOT NULL CHECK (row_idx >= 0),
    col_idx SMALLINT NOT NULL CHECK (col_idx >= 0),
    number_value SMALLINT,
    symbol_name VARCHAR(64),
    is_free_space BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (card_id, row_idx, col_idx)
);

CREATE INDEX IF NOT EXISTS idx_card_numbers_card ON public.card_numbers(card_id);

-- -----------------------------------------------------------------------------
-- 9. WALLETS & TRANSACTIONS (FOUNDATION FOR PHASE 2)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
    balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    amount_cents BIGINT NOT NULL CHECK (amount_cents != 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    reference_code VARCHAR(64) NOT NULL UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.wallet_transactions(idempotency_key);

-- -----------------------------------------------------------------------------
-- 10. PAYMENT REQUESTS (PAGO MÓVIL, BINANCE)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    gateway payment_gateway NOT NULL,
    reference_number VARCHAR(64) NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    sender_phone VARCHAR(20),
    sender_bank_code VARCHAR(8),
    sender_id_doc VARCHAR(20),
    status transaction_status NOT NULL DEFAULT 'PENDING',
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operator_notes TEXT,
    idempotency_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_ref ON public.payment_requests(reference_number);

-- -----------------------------------------------------------------------------
-- 11. OPERATOR ACTIONS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action_type VARCHAR(64) NOT NULL,
    target_entity_type VARCHAR(64) NOT NULL,
    target_entity_id VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_actions_op ON public.operator_actions(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_actions_target ON public.operator_actions(target_entity_type, target_entity_id);

-- -----------------------------------------------------------------------------
-- 12. PRIZES & WINNERS (SERVER VERIFIED)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    pattern_type VARCHAR(32) NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prizes_draw ON public.prizes(draw_id);

CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE RESTRICT,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE RESTRICT,
    player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,
    winning_ball_sequence INTEGER NOT NULL,
    verification_hash VARCHAR(128) NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (draw_id, prize_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_winners_draw ON public.winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_player ON public.winners(player_id);
