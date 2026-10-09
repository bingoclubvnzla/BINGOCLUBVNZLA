-- ====================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN FUNDACIONAL (FASE 1)
-- Arquitectura Server-Authoritative con RLS, RBAC y Auditoría
-- ====================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE draw_status_enum AS ENUM ('DRAFT', 'SCHEDULED', 'READY', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE card_status_enum AS ENUM ('RESERVED', 'PURCHASED', 'PLAYED', 'WINNER', 'VOID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA DE ROLES Y PERMISOS (RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
    name VARCHAR(32) PRIMARY KEY,
    description TEXT NOT NULL,
    hierarchy_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(64) PRIMARY KEY,
    description TEXT NOT NULL,
    category VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_name VARCHAR(32) NOT NULL REFERENCES public.roles(name) ON DELETE CASCADE,
    permission_id VARCHAR(64) NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_id)
);

-- 4. FUNCIÓN GENERADORA DE IDENTIFICADOR PÚBLICO (BCV-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_unique_bcv_code()
RETURNS VARCHAR(16)
LANGUAGE plpgsql
AS $$
DECLARE
    new_code VARCHAR(16);
    exists_already BOOLEAN;
BEGIN
    LOOP
        new_code := 'BCV-' || lpad((floor(random() * 900000 + 100000))::text, 6, '0');
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_code = new_code) INTO exists_already;
        EXIT WHEN NOT exists_already;
    END LOOP;
    RETURN new_code;
END;
$$;

-- 5. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    public_code VARCHAR(16) NOT NULL UNIQUE DEFAULT public.generate_unique_bcv_code(),
    display_name VARCHAR(64) NOT NULL,
    full_name VARCHAR(128),
    phone VARCHAR(32),
    avatar_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BLOCKED')),
    role VARCHAR(32) NOT NULL DEFAULT 'PLAYER' REFERENCES public.roles(name),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTA FORENSE: 'id' es PRIMARY KEY (1:1 auth.users). idx_profiles_user_id era incompatible y redundante con profiles_pkey.
CREATE INDEX IF NOT EXISTS idx_profiles_public_code ON public.profiles(public_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 6. AUDITORÍA (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'ANONYMOUS',
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 7. PARÁMETROS GLOBALES (APP_SETTINGS)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. MODALIDADES DE JUEGO (GAME_MODALITIES)
CREATE TABLE IF NOT EXISTS public.game_modalities (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    grid_rows INT NOT NULL,
    grid_cols INT NOT NULL,
    has_free_center BOOLEAN NOT NULL DEFAULT false,
    max_ball_number INT NOT NULL,
    card_numbers_count INT NOT NULL,
    pattern_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SALAS DE JUEGO (GAME_ROOMS)
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    max_players INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. SORTEOS (DRAWS) CON MÁQUINA DE ESTADOS
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE RESTRICT,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    title VARCHAR(128) NOT NULL,
    draw_number BIGSERIAL UNIQUE,
    status draw_status_enum NOT NULL DEFAULT 'DRAFT',
    drawn_numbers INT[] NOT NULL DEFAULT '{}',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_room ON public.draws(room_id);

-- 11. EVENTOS DE SORTEO (DRAW_EVENTS)
CREATE TABLE IF NOT EXISTS public.draw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (draw_id, sequence_number)
);

-- 12. CARTONES Y NÚMEROS (CARDS & CARD_NUMBERS)
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_code VARCHAR(32) NOT NULL UNIQUE,
    status card_status_enum NOT NULL DEFAULT 'PURCHASED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_user_draw ON public.cards(user_id, draw_id);

CREATE TABLE IF NOT EXISTS public.card_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    row_idx INT NOT NULL,
    col_idx INT NOT NULL,
    value INT,
    is_free_space BOOLEAN NOT NULL DEFAULT false,
    marked_at TIMESTAMPTZ,
    UNIQUE (card_id, row_idx, col_idx)
);

-- 13. BILLETERAS Y TRANSACCIONES (WALLETS & TRANSACTIONS — BASE PREPARADA)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
    locked_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (locked_balance >= 0),
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 4) NOT NULL,
    type VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    reference_id VARCHAR(128),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. SOLICITUDES DE PAGO (PAYMENT_REQUESTS)
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method VARCHAR(32) NOT NULL,
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    reference_number VARCHAR(64) NOT NULL,
    status payment_status_enum NOT NULL DEFAULT 'PENDING',
    operator_id UUID REFERENCES auth.users(id),
    verification_notes TEXT,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. ACCIONES DE OPERADOR (OPERATOR_ACTIONS)
CREATE TABLE IF NOT EXISTS public.operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id),
    action_type VARCHAR(64) NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    target_entity VARCHAR(64),
    target_id VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. GANADORES Y PREMIOS (WINNERS & PRIZES)
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verification_hash VARCHAR(128) NOT NULL,
    UNIQUE (draw_id, prize_id, card_id)
);

-- ====================================================================
-- TRIGGERS Y FUNCIONES DE SEGURIDAD
-- ====================================================================

-- Trigger de creación automática de perfil al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        user_id,
        display_name,
        full_name,
        role,
        status,
        public_code
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        'PLAYER',
        'ACTIVE',
        public.generate_unique_bcv_code()
    );

    INSERT INTO public.wallets (
        user_id,
        balance,
        locked_balance,
        is_frozen
    )
    VALUES (
        new.id,
        0.0000,
        0.0000,
        false
    );

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger que previene que un usuario cambie su propio role, status o public_code
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role VARCHAR(32);
BEGIN
    SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();

    IF (OLD.role IS DISTINCT FROM NEW.role OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.public_code IS DISTINCT FROM NEW.public_code OR
        OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
        
        IF current_user_role IS NULL OR current_user_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Acceso denegado: No tiene privilegios para modificar roles, estados o identificadores de seguridad.';
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_profile_security ON public.profiles;
CREATE TRIGGER check_profile_security
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_fields();

-- ====================================================================
-- HABILITACIÓN DE ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ====================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
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

-- ====================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- 1. ROLES & PERMISOS
CREATE POLICY "Roles visibles para autenticados" ON public.roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permisos visibles para autenticados" ON public.permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Role permissions visibles para autenticados" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

-- 2. PROFILES
CREATE POLICY "Lectura de perfiles autenticados" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Actualización de perfil propio" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. AUDIT_LOGS
CREATE POLICY "Lectura de auditoría solo administradores" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
        )
    );

CREATE POLICY "Inserción de auditoría por usuarios autenticados" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 4. GAME_MODALITIES
CREATE POLICY "Modalidades activas visibles para todos" ON public.game_modalities
    FOR SELECT USING (is_active = true);

CREATE POLICY "Administración de modalidades" ON public.game_modalities
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- 5. GAME_ROOMS & DRAWS
CREATE POLICY "Salas activas visibles" ON public.game_rooms
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Sorteos visibles para autenticados" ON public.draws
    FOR SELECT TO authenticated
    USING (status != 'DRAFT' OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('OPERATOR', 'ADMIN', 'SUPER_ADMIN')
    ));

CREATE POLICY "Mutación de sorteos solo personal autorizado" ON public.draws
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('OPERATOR', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- 6. CARDS & CARD_NUMBERS
CREATE POLICY "Lectura de cartones propios" ON public.cards
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('OPERATOR', 'ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Lectura de números de cartones autorizados" ON public.card_numbers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_numbers.card_id
            AND (cards.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('OPERATOR', 'ADMIN', 'SUPER_ADMIN')
            ))
        )
    );

-- 7. WALLETS & TRANSACTIONS
CREATE POLICY "Lectura de billetera propia" ON public.wallets
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Lectura de transacciones propias" ON public.wallet_transactions
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- 8. PAYMENT_REQUESTS
CREATE POLICY "Lectura de solicitudes de pago propias" ON public.payment_requests
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Creación de solicitud de pago propia" ON public.payment_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 9. WINNERS & PRIZES
CREATE POLICY "Lectura de premios pública para autenticados" ON public.prizes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestión de solicitudes de pago por operadores" ON public.payment_requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Lectura de ganadores pública para autenticados" ON public.winners
    FOR SELECT TO authenticated USING (true);
