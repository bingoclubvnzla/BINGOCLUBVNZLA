-- ============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 001: ESQUEMA INICIAL DE BASE DE DATOS
-- FASE 1: FUNDACIÓN, RBAC, INTEGRIDAD Y AUDITORÍA
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS DEL SISTEMA
-- ============================================================================

-- Roles RBAC
CREATE TYPE user_role_type AS ENUM (
    'PLAYER',
    'OPERATOR',
    'SUPERVISOR',
    'ADMIN',
    'SUPER_ADMIN'
);

-- Estado de Usuario
CREATE TYPE user_status_type AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'BANNED',
    'PENDING_VERIFICATION'
);

-- Estado de Sorteo (Máquina de Estados)
CREATE TYPE draw_status_type AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'READY',
    'ACTIVE',
    'PAUSED',
    'FINISHED',
    'CANCELLED',
    'ARCHIVED'
);

-- Modalidades de Juego
CREATE TYPE modality_code_type AS ENUM (
    'BINGO_75',
    'BINGO_90',
    'ANIMALITOS',
    'OBJETOS',
    'CHAPITAS'
);

-- Tipo de Transacción de Billetera (Estructura preparada para Fase 2)
CREATE TYPE wallet_tx_type AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'BUY_CARD',
    'PRIZE_PAYOUT',
    'REFUND',
    'ADJUSTMENT'
);

-- Estado de Transacción
CREATE TYPE tx_status_type AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REJECTED',
    'CANCELLED'
);

-- ============================================================================
-- 2. TABLA DE PERFILES (VINCULADA A auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    public_id VARCHAR(16) NOT NULL UNIQUE, -- Identificador público no sensible: BCV-XXXXXX
    display_name VARCHAR(50) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    avatar_url TEXT,
    role user_role_type NOT NULL DEFAULT 'PLAYER',
    status user_status_type NOT NULL DEFAULT 'ACTIVE',
    security_level INTEGER NOT NULL DEFAULT 1 CHECK (security_level >= 1 AND security_level <= 5),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT chk_public_id_format CHECK (public_id ~ '^BCV-[A-Z0-9]{6}$')
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_public_id ON public.profiles(public_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ============================================================================
-- 3. PERMISOS RBAC Y MATRIZ
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role user_role_type NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_id)
);

-- ============================================================================
-- 4. CONFIGURACIÓN DEL SISTEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 5. MODALIDADES DE JUEGO (GAME MODALITIES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code modality_code_type NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    grid_rows INTEGER NOT NULL,
    grid_cols INTEGER NOT NULL,
    has_free_center BOOLEAN NOT NULL DEFAULT false,
    total_elements INTEGER NOT NULL,
    elements_pool JSONB NOT NULL, -- Catálogo de balotas/animalitos/objetos/números
    is_active BOOLEAN NOT NULL DEFAULT true,
    rules_summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 6. SALAS DE JUEGO (GAME ROOMS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    modality_id UUID NOT NULL REFERENCES public.game_modalities(id),
    is_private BOOLEAN NOT NULL DEFAULT false,
    access_code VARCHAR(32), -- Código de acceso para salas privadas
    max_players INTEGER NOT NULL DEFAULT 500,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 7. SORTEOS (DRAWS) — SERVER AUTHORITATIVE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_number BIGSERIAL UNIQUE,
    room_id UUID NOT NULL REFERENCES public.game_rooms(id),
    modality_id UUID NOT NULL REFERENCES public.game_modalities(id),
    status draw_status_type NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    card_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Fase 1: 0.00 (Modo pruebas)
    currency VARCHAR(10) NOT NULL DEFAULT 'VES_TEST',
    drawn_numbers INTEGER[] NOT NULL DEFAULT '{}',
    total_cards_sold INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    operator_in_charge UUID REFERENCES public.profiles(id),
    idempotency_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_draws_status ON public.draws(status);
CREATE INDEX idx_draws_scheduled_at ON public.draws(scheduled_at);

-- Eventos de Sorteo (Extracción de cada balota/número)
CREATE TABLE IF NOT EXISTS public.draw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    extracted_value INTEGER NOT NULL,
    extracted_label VARCHAR(32) NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    integrity_hash VARCHAR(64) NOT NULL, -- SHA256 (draw_id + seq + value + prev_hash)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT uq_draw_sequence UNIQUE (draw_id, sequence_order),
    CONSTRAINT uq_draw_extracted_value UNIQUE (draw_id, extracted_value)
);

CREATE INDEX idx_draw_events_draw_id ON public.draw_events(draw_id);

-- ============================================================================
-- 8. CARTONES DIGITALES (CARDS & CARD NUMBERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    card_serial VARCHAR(32) NOT NULL UNIQUE,
    grid_matrix JSONB NOT NULL, -- Estructura fija 5x5 o 3x5 generada en servidor
    is_winner BOOLEAN NOT NULL DEFAULT false,
    winning_pattern VARCHAR(32),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT uq_user_draw_card UNIQUE (draw_id, card_serial)
);

CREATE INDEX idx_cards_draw_id ON public.cards(draw_id);
CREATE INDEX idx_cards_user_id ON public.cards(user_id);

CREATE TABLE IF NOT EXISTS public.card_numbers (
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    row_idx INTEGER NOT NULL,
    col_idx INTEGER NOT NULL,
    value INTEGER,
    label VARCHAR(32) NOT NULL,
    is_free_center BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (card_id, row_idx, col_idx)
);

-- ============================================================================
-- 9. PREMIOS Y GANADORES (PRIZES & WINNERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    pattern_type VARCHAR(40) NOT NULL, -- LINEA_1, LINEA_2, CARTON_LLENO, ESQUINAS, etc.
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_awarded BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    winning_ball_sequence INTEGER NOT NULL,
    verified_by_server BOOLEAN NOT NULL DEFAULT true,
    server_verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT uq_prize_winner UNIQUE (prize_id, card_id)
);

-- ============================================================================
-- 10. BILLETERA Y TRANSACCIONES (ESTRUCTURA DE SEGURIDAD PARA FASE 2)
-- NOTA: EN FASE 1 LAS OPERACIONES FINANCIERAS ESTÁN DESACTIVADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    locked_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'VES',
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    tx_type wallet_tx_type NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    status tx_status_type NOT NULL DEFAULT 'PENDING',
    reference VARCHAR(64) UNIQUE,
    idempotency_key UUID NOT NULL UNIQUE,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_wallet_tx_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_reference ON public.wallet_transactions(reference);

-- Solicitudes de Pago (Pago Móvil / Binance / Transferencia)
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL, -- PAGO_MOVIL, BINANCE_PAY, TRANSFERENCIA
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    reference_number VARCHAR(80) NOT NULL UNIQUE,
    proof_image_url TEXT,
    status tx_status_type NOT NULL DEFAULT 'PENDING',
    operator_id UUID REFERENCES public.profiles(id),
    rejection_reason TEXT,
    idempotency_key UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ
);

-- ============================================================================
-- 11. ACCIONES DE OPERADOR (OPERATOR AUDIT & ACTIONS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.profiles(id),
    target_user_id UUID REFERENCES public.profiles(id),
    action_type VARCHAR(64) NOT NULL,
    notes TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 12. TABLA DE AUDITORÍA (AUDIT LOGS)
-- Inmutable, protegida, sin secretos ni contraseñas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    actor_role user_role_type NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(64),
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
