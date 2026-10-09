-- =====================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1: FUNDACIÓN DE BASE DE DATOS
-- Migración: 20261001000001_initial_schema.sql
-- Descripción: Esquema relacional base, tipos, tablas, restricciones,
--              índices y triggers de auditoría e integridad.
-- =====================================================================

-- Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS DEL SISTEMA
-- ---------------------------------------------------------------------

-- Roles de usuario (RBAC)
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

-- Estados de perfil de usuario
DO $$ BEGIN
    CREATE TYPE profile_status AS ENUM (
        'ACTIVE',
        'SUSPENDED',
        'BLOCKED',
        'PENDING_VERIFICATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Estados controlados de sorteo (Máquina de estados estricta)
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

-- Códigos de modalidades soportadas
DO $$ BEGIN
    CREATE TYPE modality_code AS ENUM (
        'BINGO_75',
        'BINGO_90',
        'ANIMALITOS',
        'OBJETOS',
        'CHAPITAS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tipos de transacciones del ledger
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'DEPOSIT',
        'WITHDRAWAL',
        'CARD_PURCHASE',
        'PRIZE_PAYOUT',
        'ADJUSTMENT',
        'ROLLBACK'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Estados de solicitud de pago (Pago Móvil / Binance)
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'PENDING',
        'PROCESSING',
        'APPROVED',
        'REJECTED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Validación de premios
DO $$ BEGIN
    CREATE TYPE winner_validation_status AS ENUM (
        'PENDING_VERIFICATION',
        'VALIDATED',
        'INVALIDATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------
-- 2. TABLA DE PERFILES (profiles)
-- Vinculada estrictamente a auth.users con identificador público BCV-XXXXXX
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    public_id VARCHAR(16) NOT NULL UNIQUE,
    display_name VARCHAR(60) NOT NULL,
    full_name VARCHAR(120),
    phone VARCHAR(30),
    avatar_url TEXT,
    status profile_status NOT NULL DEFAULT 'ACTIVE',
    role user_role NOT NULL DEFAULT 'PLAYER',
    security_level INTEGER NOT NULL DEFAULT 1 CHECK (security_level >= 1 AND security_level <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ---------------------------------------------------------------------
-- 3. PERMISOS Y RBAC (roles & permissions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(role, permission_id)
);

-- ---------------------------------------------------------------------
-- 4. REGISTRO DE AUDITORÍA (audit_logs)
-- Registra eventos críticos de seguridad sin almacenar credenciales ni secretos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role user_role NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100),
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ---------------------------------------------------------------------
-- 5. CONFIGURACIÓN DEL SISTEMA (app_settings)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 6. MODALIDADES DE JUEGO (game_modalities)
-- Configuración técnica de cartones y reglas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_modalities (
    code modality_code PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    subtitle VARCHAR(100),
    description TEXT NOT NULL,
    grid_rows INTEGER NOT NULL CHECK (grid_rows > 0),
    grid_cols INTEGER NOT NULL CHECK (grid_cols > 0),
    has_free_center BOOLEAN NOT NULL DEFAULT false,
    total_elements INTEGER NOT NULL CHECK (total_elements > 0),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 7. SALAS DE JUEGO (game_rooms)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    modality_code modality_code NOT NULL REFERENCES public.game_modalities(code),
    is_private BOOLEAN NOT NULL DEFAULT false,
    max_players INTEGER NOT NULL DEFAULT 500 CHECK (max_players > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 8. SORTEOS (draws)
-- Server-authoritative: números sorteados y estados
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    modality_code modality_code NOT NULL REFERENCES public.game_modalities(code),
    draw_number VARCHAR(32) NOT NULL UNIQUE,
    status draw_status NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    server_seed_hash VARCHAR(64),
    drawn_numbers INTEGER[] NOT NULL DEFAULT '{}',
    current_ball INTEGER,
    total_balls_called INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_room ON public.draws(room_id);

-- ---------------------------------------------------------------------
-- 9. EVENTOS DEL SORTEO (draw_events)
-- Event-sourcing para auditoría y retransmisión realtime
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.draw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    ball_value INTEGER,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(draw_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_draw_events_draw_seq ON public.draw_events(draw_id, sequence_number);

-- ---------------------------------------------------------------------
-- 10. CARTONES DIGITALES (cards & card_numbers)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_serial VARCHAR(32) NOT NULL UNIQUE,
    matrix_data JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cards_user_draw ON public.cards(user_id, draw_id);

CREATE TABLE IF NOT EXISTS public.card_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    number_value INTEGER NOT NULL,
    row_idx INTEGER NOT NULL,
    col_idx INTEGER NOT NULL,
    is_marked BOOLEAN NOT NULL DEFAULT false,
    marked_at TIMESTAMPTZ,
    UNIQUE(card_id, row_idx, col_idx)
);

CREATE INDEX IF NOT EXISTS idx_card_numbers_val ON public.card_numbers(card_id, number_value);

-- ---------------------------------------------------------------------
-- 11. BILLETERAS Y LEDGER TRANSACCIONAL (wallets & wallet_transactions)
-- Inactivos para dinero real en Fase 1, preparados arquitectónicamente
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL DEFAULT 'VES',
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    locked_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0),
    is_active BOOLEAN NOT NULL DEFAULT false, -- Inactivo en Fase 1 por política de seguridad
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount <> 0),
    balance_after NUMERIC(14, 2) NOT NULL CHECK (balance_after >= 0),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    reference_id VARCHAR(64),
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.wallet_transactions(idempotency_key);

-- ---------------------------------------------------------------------
-- 12. SOLICITUDES DE PAGO (payment_requests: Pago Móvil / Binance)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('PAGO_MOVIL', 'BINANCE_PAY', 'BANK_TRANSFER')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'VES',
    reference_number VARCHAR(64) NOT NULL,
    phone_origin VARCHAR(30),
    bank_code VARCHAR(10),
    binance_tx_id VARCHAR(128),
    status payment_status NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    idempotency_hash VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_requests(status);

-- ---------------------------------------------------------------------
-- 13. PREMIOS Y GANADORES (prizes & winners)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    prize_name VARCHAR(100) NOT NULL,
    prize_pattern VARCHAR(50) NOT NULL CHECK (prize_pattern IN ('LINEA', 'CUATRO_ESQUINAS', 'CARTON_LLENO', 'LETRA_X', 'CRUZ')),
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    validation_status winner_validation_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    winning_ball INTEGER NOT NULL,
    balls_count INTEGER NOT NULL,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(draw_id, prize_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_winners_draw ON public.winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user ON public.winners(user_id);

-- ---------------------------------------------------------------------
-- 14. ACCIONES DE OPERADORES (operator_actions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type VARCHAR(60) NOT NULL,
    reason TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 15. FUNCIONES Y TRIGGERS DE SEGURIDAD
-- ---------------------------------------------------------------------

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_draws_updated_at
    BEFORE UPDATE ON public.draws
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Función generadora de ID público no sensible (BCV-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_unique_bcv_id()
RETURNS VARCHAR(16) AS $$
DECLARE
    new_id VARCHAR(16);
    exists_check BOOLEAN;
BEGIN
    LOOP
        new_id := 'BCV-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0');
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = new_id) INTO exists_check;
        IF NOT exists_check THEN
            RETURN new_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger para aprovisionar automáticamente el perfil y la billetera cuando se registra un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_public_id VARCHAR(16);
    raw_display_name VARCHAR(60);
BEGIN
    gen_public_id := public.generate_unique_bcv_id();
    
    -- Extraer display_name del metadata si está disponible
    raw_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1),
        'Jugador'
    );

    -- Crear perfil con rol estrictamente PLAYER
    INSERT INTO public.profiles (
        user_id,
        public_id,
        display_name,
        full_name,
        avatar_url,
        status,
        role,
        security_level
    ) VALUES (
        NEW.id,
        gen_public_id,
        raw_display_name,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'ACTIVE',
        'PLAYER',
        1
    );

    -- Inicializar billetera (desactivada en Fase 1)
    INSERT INTO public.wallets (
        user_id,
        currency,
        balance,
        locked_balance,
        is_active
    ) VALUES (
        NEW.id,
        'VES',
        0.00,
        0.00,
        false
    );

    -- Registrar auditoría de registro
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
        gen_public_id,
        jsonb_build_object(
            'registration_source', 'supabase_auth',
            'public_id', gen_public_id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enlazar trigger a auth.users si existe
DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
EXCEPTION
    WHEN undefined_table THEN null;
END $$;
