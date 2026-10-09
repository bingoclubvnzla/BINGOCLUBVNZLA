-- ============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN INICIAL COMPLETA (FASE 1)
-- Principio: Servidor Autoritativo, RLS en todas las tablas, RBAC Estricto
-- ============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'BANNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE draw_status AS ENUM ('DRAFT', 'SCHEDULED', 'READY', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CARD_PURCHASE', 'PRIZE_PAYOUT', 'REFUND', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('PAGO_MOVIL', 'BINANCE_PAY', 'TRANSFERENCIA_BANCARIA', 'EFECTIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA DE ROLES Y PERMISOS (RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id VARCHAR(32) REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(64) REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. FUNCIÓN GENERADORA DE IDENTIFICADOR PÚBLICO ANÓNIMO (BCV-XXXXXX)
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS VARCHAR(32) AS $$
DECLARE
    new_id VARCHAR(32);
    done BOOLEAN := false;
BEGIN
    WHILE NOT done LOOP
        new_id := 'BCV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE public_id = new_id) THEN
            done := true;
        END IF;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 5. TABLA DE PERFILES (VINCULADA A auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    public_id VARCHAR(32) NOT NULL UNIQUE DEFAULT generate_public_id(),
    display_name VARCHAR(64) NOT NULL,
    full_name VARCHAR(128),
    phone VARCHAR(32),
    avatar_url TEXT,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    role app_role NOT NULL DEFAULT 'PLAYER',
    security_level INT NOT NULL DEFAULT 1 CHECK (security_level >= 1 AND security_level <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABLA DE AUDITORÍA INMUTABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role app_role NOT NULL DEFAULT 'PLAYER',
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABLA DE CONFIGURACIONES GENERALES DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.app_settings (
    id VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 8. TABLA DE MODALIDADES DE JUEGO (BINGO_75, BINGO_90, ANIMALITOS, OBJETOS, CHAPITAS)
CREATE TABLE IF NOT EXISTS public.game_modalities (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    grid_rows INT NOT NULL CHECK (grid_rows > 0),
    grid_cols INT NOT NULL CHECK (grid_cols > 0),
    free_center BOOLEAN NOT NULL DEFAULT false,
    total_balls INT NOT NULL CHECK (total_balls > 0),
    layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TABLA DE SALAS DE JUEGO
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    min_players INT NOT NULL DEFAULT 2 CHECK (min_players >= 1),
    max_players INT NOT NULL DEFAULT 1000 CHECK (max_players >= min_players),
    is_private BOOLEAN NOT NULL DEFAULT false,
    access_code VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TABLA DE SORTEOS (MÁQUINA DE ESTADOS SERVER-AUTHORITATIVE)
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE RESTRICT,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id),
    draw_number BIGSERIAL UNIQUE,
    status draw_status NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    ball_sequence INT[] NOT NULL DEFAULT '{}',
    server_seed_hash VARCHAR(128),
    total_cards_sold INT NOT NULL DEFAULT 0 CHECK (total_cards_sold >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. EVENTOS AUTORITATIVOS DEL SORTEO
CREATE TABLE IF NOT EXISTS public.draw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    sequence_index INT NOT NULL CHECK (sequence_index >= 0),
    ball_number INT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(draw_id, sequence_index)
);

-- 12. TABLA DE CARTONES DIGITALES
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    serial_number VARCHAR(32) NOT NULL UNIQUE,
    matrix JSONB NOT NULL,
    purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. NÚMEROS DE CARTONES (INDEXADOS PARA AUDITORÍA RÁPIDA)
CREATE TABLE IF NOT EXISTS public.card_numbers (
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    number_value INT NOT NULL,
    row_idx INT NOT NULL CHECK (row_idx >= 0),
    col_idx INT NOT NULL CHECK (col_idx >= 0),
    is_marked BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (card_id, row_idx, col_idx)
);

-- 14. BILLETERAS DE JUGADORES (PREPARADAS PARA FASE 2, CONSTRAINTS ESTRICTOS)
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance_ves NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance_ves >= 0.00),
    balance_usdt NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance_usdt >= 0.00),
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. TRANSACCIONES DE BILLETERA (LEDGER INMUTABLE CON IDEMPOTENCY)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL CHECK (currency IN ('VES', 'USDT')),
    balance_before NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    reference_id VARCHAR(128),
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. SOLICITUDES DE PAGO / RECARGA (PAGO MÓVIL / BINANCE)
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(64) NOT NULL UNIQUE,
    method payment_method NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL CHECK (currency IN ('VES', 'USDT')),
    bank_origin VARCHAR(64),
    bank_destination VARCHAR(64),
    reference_number VARCHAR(64) NOT NULL,
    proof_url TEXT,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. ACCIONES DE OPERADORES (AUDITORÍA DE CONTROL HUMANO)
CREATE TABLE IF NOT EXISTS public.operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action_type VARCHAR(64) NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_entity VARCHAR(64) NOT NULL,
    target_id VARCHAR(128),
    rationale TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. PREMIOS CONFIGURADOS POR SORTEO
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    win_pattern VARCHAR(64) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'VES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. GANADORES AUTORITATIVOS
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE RESTRICT,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE RESTRICT,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    verified_by_server BOOLEAN NOT NULL DEFAULT true,
    winning_ball_index INT NOT NULL CHECK (winning_ball_index >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (draw_id, prize_id, card_id)
);

-- ============================================================================
-- 20. ÍNDICES DE RENDIMIENTO Y SEGURIDAD
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_room_id ON public.draws(room_id);
CREATE INDEX IF NOT EXISTS idx_cards_draw_id ON public.cards(draw_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON public.winners(draw_id);

-- ============================================================================
-- 21. FUNCIONES Y DISPARADORES DE SEGURIDAD
-- ============================================================================

-- Helper para obtener el rol del usuario autenticado en queries
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS app_role AS $$
    SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper para comprobar privilegios administrativos
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper para comprobar privilegios de operador o superior
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Trigger: Creación automática de Perfil y Billetera en registro de auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    clean_display VARCHAR(64);
BEGIN
    clean_display := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        SPLIT_PART(NEW.email, '@', 1),
        'Jugador'
    );

    INSERT INTO public.profiles (user_id, display_name, role, status)
    VALUES (NEW.id, clean_display, 'PLAYER', 'ACTIVE')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.wallets (user_id, balance_ves, balance_usdt, is_frozen)
    VALUES (NEW.id, 0.00, 0.00, false)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.audit_logs (user_id, actor_role, action, entity_type, entity_id, metadata)
    VALUES (NEW.id, 'PLAYER', 'USER_REGISTERED', 'profile', NEW.id::text, jsonb_build_object('provider', NEW.raw_app_meta_data->>'provider'));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Proteger rol, status y security_level contra automodificación
CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si no es ADMIN o SUPER_ADMIN, no puede modificar su rol, status o security_level
    IF NOT public.is_admin() THEN
        IF NEW.role <> OLD.role THEN
            RAISE EXCEPTION 'Acción denegada: Un usuario no puede alterar su propio rol en el sistema.';
        END IF;
        IF NEW.status <> OLD.status THEN
            RAISE EXCEPTION 'Acción denegada: Un usuario no puede alterar su estado de cuenta.';
        END IF;
        IF NEW.security_level <> OLD.security_level THEN
            RAISE EXCEPTION 'Acción denegada: Nivel de seguridad inmutable por el usuario.';
        END IF;
        IF NEW.public_id <> OLD.public_id THEN
            RAISE EXCEPTION 'Acción denegada: El identificador público no puede ser modificado.';
        END IF;
    END IF;

    -- Un OPERATOR no puede auto-elevarse a ADMIN ni asignar roles superiores
    IF public.current_user_role() = 'OPERATOR' AND NEW.role IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Acción denegada: Un operador no puede otorgar privilegios de administrador.';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_escalation();

-- Trigger: Máquina de estados formal para sorteos (Transiciones estrictas)
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
                RAISE EXCEPTION 'Transición ilegal de sorteo: DRAFT solo puede pasar a SCHEDULED o CANCELLED';
            END IF;
        WHEN 'SCHEDULED' THEN
            IF NEW.status NOT IN ('READY', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición ilegal de sorteo: SCHEDULED solo puede pasar a READY o CANCELLED';
            END IF;
        WHEN 'READY' THEN
            IF NEW.status NOT IN ('ACTIVE', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición ilegal de sorteo: READY solo puede pasar a ACTIVE o CANCELLED';
            END IF;
        WHEN 'ACTIVE' THEN
            IF NEW.status NOT IN ('PAUSED', 'FINISHED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición ilegal de sorteo: ACTIVE solo puede pasar a PAUSED, FINISHED o CANCELLED';
            END IF;
        WHEN 'PAUSED' THEN
            IF NEW.status NOT IN ('ACTIVE', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición ilegal de sorteo: PAUSED solo puede pasar a ACTIVE o CANCELLED';
            END IF;
        WHEN 'FINISHED' THEN
            IF NEW.status NOT IN ('ARCHIVED') THEN
                RAISE EXCEPTION 'Transición ilegal de sorteo: FINISHED solo puede pasar a ARCHIVED';
            END IF;
        WHEN 'CANCELLED' THEN
            IF NEW.status NOT IN ('ARCHIVED') THEN
                RAISE EXCEPTION 'Transición ilegal de sorteo: CANCELLED solo puede pasar a ARCHIVED';
            END IF;
        WHEN 'ARCHIVED' THEN
            RAISE EXCEPTION 'Transición ilegal de sorteo: El estado ARCHIVED es terminal';
        ELSE
            RAISE EXCEPTION 'Estado de sorteo desconocido: %', OLD.status;
    END CASE;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_draw_transition ON public.draws;
CREATE TRIGGER trg_validate_draw_transition
    BEFORE UPDATE OF status ON public.draws
    FOR EACH ROW EXECUTE FUNCTION public.validate_draw_state_transition();

-- ============================================================================
-- 22. POLÍTICAS DE ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ============================================================================

-- Habilitar RLS en cada tabla sin excepción
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

-- 22.1 Roles y Permisos: Lectura pública autenticada, escritura solo SUPER_ADMIN
CREATE POLICY "roles_read_auth" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_read_auth" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_read_auth" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- 22.2 Profiles:
-- Jugador lee su propio perfil completo
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_staff());

-- Jugador actualiza solo campos seguros de su perfil (trigger valida que no cambie rol)
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Inserción solo a través de triggers del sistema
CREATE POLICY "profiles_insert_system" ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 22.3 Audit Logs: Solo lectura del propio usuario o administradores. Inserción solo autenticada
CREATE POLICY "audit_logs_select_own" ON public.audit_logs FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_staff());

-- 22.4 App Settings: Lectura autenticada, mutación solo administradores
CREATE POLICY "app_settings_select" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings_modify" ON public.app_settings FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 22.5 Game Modalities: Lectura para todos, mutación solo administradores
CREATE POLICY "game_modalities_select" ON public.game_modalities FOR SELECT TO authenticated USING (true);
CREATE POLICY "game_modalities_modify" ON public.game_modalities FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 22.6 Game Rooms: Lectura autenticada, creación/modificación solo Staff
CREATE POLICY "game_rooms_select" ON public.game_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "game_rooms_modify" ON public.game_rooms FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 22.7 Draws: Lectura para todos, gestión solo Staff
CREATE POLICY "draws_select" ON public.draws FOR SELECT TO authenticated USING (true);
CREATE POLICY "draws_modify" ON public.draws FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 22.8 Draw Events: Lectura para todos (eventos públicos del sorteo), inserción solo Staff / Server
CREATE POLICY "draw_events_select" ON public.draw_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "draw_events_insert" ON public.draw_events FOR INSERT TO authenticated
    WITH CHECK (public.is_staff());

-- 22.9 Cards: Un jugador SOLO puede leer sus propios cartones. Nadie lee cartones ajenos salvo Staff
CREATE POLICY "cards_select_own" ON public.cards FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_staff());

CREATE POLICY "cards_insert_own" ON public.cards FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_staff());

-- 22.10 Card Numbers: Vinculado a la pertenencia del cartón
CREATE POLICY "card_numbers_select_own" ON public.card_numbers FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cards 
            WHERE cards.id = card_numbers.card_id 
              AND (cards.user_id = auth.uid() OR public.is_staff())
        )
    );

-- 22.11 Wallets: El jugador SOLO puede leer su propia billetera. Prohibida mutación directa desde cliente
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- NO se crean políticas de INSERT, UPDATE o DELETE para clientes en wallets.
-- Toda mutación de saldo DEBE ser realizada por funciones del servidor con SECURITY DEFINER.

-- 22.12 Wallet Transactions: El jugador solo lee sus transacciones. Jamás puede mutar el ledger
CREATE POLICY "wallet_transactions_select_own" ON public.wallet_transactions FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- NO hay política de INSERT/UPDATE para el cliente en wallet_transactions (Server-Authoritative Ledger).

-- 22.13 Payment Requests: El jugador puede leer las suyas y crear solicitudes. Operadores pueden gestionar
CREATE POLICY "payment_requests_select_own" ON public.payment_requests FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_staff());

CREATE POLICY "payment_requests_insert_own" ON public.payment_requests FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_requests_update_staff" ON public.payment_requests FOR UPDATE TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 22.14 Operator Actions: Solo Staff puede leer e insertar
CREATE POLICY "operator_actions_select" ON public.operator_actions FOR SELECT TO authenticated
    USING (public.is_staff());

CREATE POLICY "operator_actions_insert" ON public.operator_actions FOR INSERT TO authenticated
    WITH CHECK (public.is_staff() AND operator_id = auth.uid());

-- 22.15 Prizes y Winners: Lectura autenticada, escritura solo Staff
CREATE POLICY "prizes_select" ON public.prizes FOR SELECT TO authenticated USING (true);
CREATE POLICY "prizes_modify" ON public.prizes FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "winners_select" ON public.winners FOR SELECT TO authenticated USING (true);
CREATE POLICY "winners_modify" ON public.winners FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());
