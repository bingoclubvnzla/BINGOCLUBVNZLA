-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN INICIAL COMPLETA (FASE 1)
-- Versión: 20261005000001_initial_schema.sql
-- Descripción: Creación de tipos ENUM, tablas base, triggers de integridad,
--              generador de identificador público BCV-XXXXXX, RLS y máquina de estados.
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUM
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE profile_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
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
    CREATE TYPE card_status AS ENUM ('RESERVED', 'PURCHASED', 'PLAYED', 'WINNER', 'VOID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TICKET_PURCHASE', 'PRIZE_PAYOUT', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA DE CONFIGURACIÓN DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE PERFILES (VINCULADA A auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    public_id VARCHAR(16) NOT NULL UNIQUE,
    display_name VARCHAR(60) NOT NULL,
    full_name VARCHAR(120),
    phone VARCHAR(25),
    avatar_url TEXT,
    status profile_status NOT NULL DEFAULT 'ACTIVE',
    role app_role NOT NULL DEFAULT 'PLAYER',
    security_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE ROLES Y PERMISOS (RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
    id app_role PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(64) PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role app_role NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(64) NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_id)
);

-- 6. TABLA DE AUDITORÍA INMUTABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'ANONYMOUS',
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLA DE MODALIDADES DE JUEGO
CREATE TABLE IF NOT EXISTS public.game_modalities (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    grid_rows INT NOT NULL CHECK (grid_rows > 0),
    grid_cols INT NOT NULL CHECK (grid_cols > 0),
    free_center BOOLEAN NOT NULL DEFAULT FALSE,
    number_range_min INT NOT NULL CHECK (number_range_min >= 0),
    number_range_max INT NOT NULL CHECK (number_range_max > number_range_min),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALAS DE JUEGO (GAME ROOMS)
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    code VARCHAR(24) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    max_players INT NOT NULL DEFAULT 500 CHECK (max_players > 0),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SORTEOS (DRAWS) — SERVER AUTHORITATIVE
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id),
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    draw_number BIGSERIAL UNIQUE,
    status draw_status NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    ticket_price NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (ticket_price >= 0),
    currency VARCHAR(6) NOT NULL DEFAULT 'VES',
    drawn_numbers INT[] NOT NULL DEFAULT '{}',
    current_ball INT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. EVENTOS DEL SORTEO (HISTORIAL DE BALOTAS CANTADAS CON HASH DE INTEGRIDAD)
CREATE TABLE IF NOT EXISTS public.draw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    sequence INT NOT NULL CHECK (sequence > 0),
    event_type VARCHAR(32) NOT NULL,
    ball_number INT,
    integrity_hash VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (draw_id, sequence)
);

-- 11. CARTONES DIGITALES
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    card_serial VARCHAR(32) NOT NULL UNIQUE,
    status card_status NOT NULL DEFAULT 'PURCHASED',
    idempotency_key UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. NÚMEROS DEL CARTÓN (MATRIZ)
CREATE TABLE IF NOT EXISTS public.card_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    row_index INT NOT NULL CHECK (row_index >= 0),
    col_index INT NOT NULL CHECK (col_index >= 0),
    value INT NOT NULL,
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (card_id, row_index, col_index)
);

-- 13. PREMIOS CONFIGURADOS POR SORTEO
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(32) NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(6) NOT NULL DEFAULT 'VES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. GANADORES CONFIRMADOS
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    prize_id UUID NOT NULL REFERENCES public.prizes(id),
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validation_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. BILLETERA (LEDGER — INACTIVA EN FASE 1)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    currency VARCHAR(6) NOT NULL DEFAULT 'VES',
    balance NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    locked_balance NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0),
    is_active BOOLEAN NOT NULL DEFAULT FALSE, -- Desactivada en Fase 1
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. TRANSACCIONES DE BILLETERA (INMUTABLES)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    balance_before NUMERIC(18,2) NOT NULL,
    balance_after NUMERIC(18,2) NOT NULL,
    reference_id VARCHAR(64),
    idempotency_key UUID NOT NULL UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. SOLICITUDES DE PAGO / RECARGA (PREPARACIÓN PARA FASE 3)
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    payment_method VARCHAR(32) NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(6) NOT NULL DEFAULT 'VES',
    reference_number VARCHAR(64) NOT NULL,
    status payment_request_status NOT NULL DEFAULT 'PENDING',
    operator_notes TEXT,
    assigned_operator_id UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    idempotency_key UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. ACCIONES DE OPERADOR (TRAZABILIDAD EXPLICITA)
CREATE TABLE IF NOT EXISTS public.operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.profiles(id),
    action_type VARCHAR(64) NOT NULL,
    target_entity VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO Y CONSULTA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_scheduled ON public.draws(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_draw_events_draw_seq ON public.draw_events(draw_id, sequence);
CREATE INDEX IF NOT EXISTS idx_cards_draw_user ON public.cards(draw_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cards_serial ON public.cards(card_serial);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON public.payment_requests(user_id);

-- ==============================================================================
-- FUNCIONES DE NEGOCIO Y TRIGGERS DE SEGURIDAD
-- ==============================================================================

-- A. Función para generar ID público único estilo BCV-XXXXXX
CREATE OR REPLACE FUNCTION public.generate_bcv_id()
RETURNS VARCHAR(16) AS $$
DECLARE
    chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    result VARCHAR(16) := 'BCV-';
    i INT;
    candidate VARCHAR(16);
    exists_check BOOLEAN;
BEGIN
    LOOP
        candidate := 'BCV-';
        FOR i IN 1..6 LOOP
            candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = candidate) INTO exists_check;
        IF NOT exists_check THEN
            RETURN candidate;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- B. Trigger para creación automática de perfil al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_id VARCHAR(16);
    user_display VARCHAR(60);
    raw_name TEXT;
BEGIN
    gen_id := public.generate_bcv_id();
    raw_name := NEW.raw_user_meta_data->>'full_name';
    user_display := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

    INSERT INTO public.profiles (
        user_id,
        public_id,
        display_name,
        full_name,
        phone,
        status,
        role,
        security_level
    ) VALUES (
        NEW.id,
        gen_id,
        user_display,
        raw_name,
        NEW.raw_user_meta_data->>'phone',
        'ACTIVE',
        'PLAYER', -- Rol PLAYER por defecto de forma inviolable
        1
    );

    -- Creación de billetera asociada (inactiva en Fase 1)
    INSERT INTO public.wallets (
        user_id,
        currency,
        balance,
        locked_balance,
        is_active
    ) VALUES (
        (SELECT id FROM public.profiles WHERE user_id = NEW.id),
        'VES',
        0.00,
        0.00,
        FALSE
    );

    -- Auditoría del registro
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        (SELECT id FROM public.profiles WHERE user_id = NEW.id),
        'PLAYER',
        'USER_REGISTERED',
        'profiles',
        gen_id,
        jsonb_build_object('registration_method', 'email_password')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- C. Trigger de inmutabilidad de campos de seguridad en profiles
-- Impide que un usuario normal modifique su propio role, status o security_level
CREATE OR REPLACE FUNCTION public.check_profile_immutable_fields()
RETURNS TRIGGER AS $$
DECLARE
    current_actor_role app_role;
BEGIN
    -- Permitir si es una función interna del sistema
    IF current_user IN ('postgres', 'service_role') THEN
        RETURN NEW;
    END IF;

    -- Obtener rol del usuario autenticado
    SELECT role INTO current_actor_role FROM public.profiles WHERE user_id = auth.uid();

    -- Si alguien intenta cambiar su propio role, status o security_level sin ser ADMIN o SUPER_ADMIN
    IF (NEW.role IS DISTINCT FROM OLD.role) OR 
       (NEW.status IS DISTINCT FROM OLD.status) OR 
       (NEW.security_level IS DISTINCT FROM OLD.security_level) THEN
        IF current_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') OR current_actor_role IS NULL THEN
            RAISE EXCEPTION 'Acción denegada: No posee privilegios administrativos para modificar atributos de seguridad.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_profile_immutability ON public.profiles;
CREATE TRIGGER trg_check_profile_immutability
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_profile_immutable_fields();

-- D. Máquina de estados de Sorteos (Draws)
CREATE OR REPLACE FUNCTION public.validate_draw_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Validar transiciones legales
    CASE OLD.status
        WHEN 'DRAFT' THEN
            IF NEW.status NOT IN ('SCHEDULED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida desde DRAFT a %', NEW.status;
            END IF;
        WHEN 'SCHEDULED' THEN
            IF NEW.status NOT IN ('READY', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida desde SCHEDULED a %', NEW.status;
            END IF;
        WHEN 'READY' THEN
            IF NEW.status NOT IN ('ACTIVE', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida desde READY a %', NEW.status;
            END IF;
        WHEN 'ACTIVE' THEN
            IF NEW.status NOT IN ('PAUSED', 'FINISHED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida desde ACTIVE a %', NEW.status;
            END IF;
        WHEN 'PAUSED' THEN
            IF NEW.status NOT IN ('ACTIVE', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida desde PAUSED a %', NEW.status;
            END IF;
        WHEN 'FINISHED' THEN
            IF NEW.status NOT IN ('ARCHIVED') THEN
                RAISE EXCEPTION 'Transición inválida desde FINISHED a %', NEW.status;
            END IF;
        WHEN 'CANCELLED' THEN
            IF NEW.status NOT IN ('ARCHIVED') THEN
                RAISE EXCEPTION 'Transición inválida desde CANCELLED a %', NEW.status;
            END IF;
        WHEN 'ARCHIVED' THEN
            RAISE EXCEPTION 'Un sorteo en estado ARCHIVED no puede cambiar de estado';
    END CASE;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_draw_state ON public.draws;
CREATE TRIGGER trg_validate_draw_state
    BEFORE UPDATE OF status ON public.draws
    FOR EACH ROW EXECUTE FUNCTION public.validate_draw_state_transition();

-- ==============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_actions ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para profiles
CREATE POLICY "Profiles: Los usuarios pueden ver su propio perfil completo"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Profiles: Los usuarios pueden actualizar su display_name, phone y avatar"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Profiles: Admins y supervisores pueden ver todos los perfiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND role IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- 3. Políticas para game_modalities y game_rooms
CREATE POLICY "Modalities: Todos pueden consultar modalidades activas"
    ON public.game_modalities FOR SELECT
    TO authenticated, anon
    USING (is_active = TRUE);

CREATE POLICY "Rooms: Todos pueden consultar salas activas"
    ON public.game_rooms FOR SELECT
    TO authenticated, anon
    USING (is_active = TRUE);

-- 4. Políticas para draws y draw_events
CREATE POLICY "Draws: Consulta pública de sorteos programados o activos"
    ON public.draws FOR SELECT
    TO authenticated, anon
    USING (status != 'DRAFT');

CREATE POLICY "Draws: Solo administradores pueden gestionar sorteos"
    ON public.draws FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "DrawEvents: Lectura pública de balotas cantadas"
    ON public.draw_events FOR SELECT
    TO authenticated, anon
    USING (TRUE);

-- 5. Políticas para cards y card_numbers
CREATE POLICY "Cards: Jugador puede ver únicamente sus propios cartones"
    ON public.cards FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "CardNumbers: Jugador puede ver únicamente los números de sus propios cartones"
    ON public.card_numbers FOR SELECT
    TO authenticated
    USING (
        card_id IN (
            SELECT id FROM public.cards
            WHERE user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

-- 6. Políticas para wallets y transacciones
CREATE POLICY "Wallets: Jugador puede ver únicamente su propia billetera"
    ON public.wallets FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "WalletTransactions: Jugador ve solo sus transacciones"
    ON public.wallet_transactions FOR SELECT
    TO authenticated
    USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 7. Políticas para audit_logs
CREATE POLICY "AuditLogs: Solo supervisores y administradores pueden auditar"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND role IN ('SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- 8. Políticas para app_settings
CREATE POLICY "AppSettings: Lectura de configuraciones públicas"
    ON public.app_settings FOR SELECT
    TO authenticated, anon
    USING (is_public = TRUE);
