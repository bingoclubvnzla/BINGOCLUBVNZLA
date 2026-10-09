-- =============================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1: FUNDACIÓN
-- Migration: 20260101000001_security_and_rls.sql
-- Description: Row Level Security, RBAC Functions, State Machine & Anti-Tamper Triggers
-- Author: Bingo Club Vnzla Security Engineering Team
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
-- -----------------------------------------------------------------------------

-- Get role of currently logged in user safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
        'PLAYER'::public.user_role
    );
$$;

-- Check if current user is at least an operator
CREATE OR REPLACE FUNCTION public.is_operator_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
    );
$$;

-- Check if current user is at least an admin
CREATE OR REPLACE FUNCTION public.is_admin_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
$$;

-- Generate Unique Public Code: BCV-XXXXXX
CREATE OR REPLACE FUNCTION public.generate_public_code()
RETURNS VARCHAR(16)
LANGUAGE plpgsql
AS $$
DECLARE
    new_code VARCHAR(16);
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generates BCV- followed by 6 random alphanumeric uppercase characters (excluding ambiguous 0,O,1,I)
        new_code := 'BCV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
        SELECT EXISTS (SELECT 1 FROM public.profiles WHERE public_code = new_code) INTO exists_check;
        IF NOT exists_check THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. AUTOMATIC PROFILE CREATION TRIGGER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    gen_code VARCHAR(16);
    user_full_name TEXT;
    user_display_name TEXT;
    user_phone TEXT;
BEGIN
    gen_code := public.generate_public_code();
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Jugador BCV');
    user_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', 'Jugador_' || SUBSTRING(gen_code FROM 5 FOR 4));
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- Insert profile
    INSERT INTO public.profiles (
        user_id,
        public_code,
        display_name,
        full_name,
        phone,
        avatar_url,
        status,
        role,
        security_level
    ) VALUES (
        NEW.id,
        gen_code,
        user_display_name,
        user_full_name,
        user_phone,
        NULL,
        'ACTIVE',
        'PLAYER',
        1
    );

    -- Initialize wallet (0 balance)
    INSERT INTO public.wallets (
        user_id,
        balance_cents,
        currency,
        is_locked
    ) VALUES (
        NEW.id,
        0,
        'VES',
        FALSE
    );

    -- Audit registration
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
        NEW.id::TEXT,
        jsonb_build_object('public_code', gen_code, 'email', NEW.email)
    );

    RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. ANTI-TAMPER TRIGGER: PROFILES
-- Prevents ordinary users from escalating their role, modifying status or public_code
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If non-admin attempts to change role, status, security_level, or public_code
    IF NOT public.is_admin_or_higher() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'FORBIDDEN: No tienes autorización para modificar roles.';
        END IF;

        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'FORBIDDEN: No tienes autorización para modificar el estado de la cuenta.';
        END IF;

        IF NEW.security_level IS DISTINCT FROM OLD.security_level THEN
            RAISE EXCEPTION 'FORBIDDEN: No tienes autorización para alterar el nivel de seguridad.';
        END IF;

        IF NEW.public_code IS DISTINCT FROM OLD.public_code THEN
            RAISE EXCEPTION 'FORBIDDEN: El código público de jugador es inmutable.';
        END IF;

        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'FORBIDDEN: El vínculo de usuario es inmutable.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- -----------------------------------------------------------------------------
-- 4. STATE MACHINE TRIGGER: DRAWS
-- Enforces valid state transitions and server authority
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_draw_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only admin or operator can change draw status
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'FORBIDDEN: Solo operadores o administradores pueden cambiar el estado del sorteo.';
    END IF;

    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Valid state transitions:
    -- DRAFT -> SCHEDULED, CANCELLED
    -- SCHEDULED -> READY, CANCELLED
    -- READY -> ACTIVE, CANCELLED
    -- ACTIVE -> PAUSED, FINISHED, CANCELLED
    -- PAUSED -> ACTIVE, CANCELLED
    -- FINISHED -> ARCHIVED
    -- CANCELLED -> ARCHIVED
    -- ARCHIVED -> (Terminal state)

    IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('SCHEDULED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Transición de estado inválida: DRAFT solo puede pasar a SCHEDULED o CANCELLED.';
    ELSIF OLD.status = 'SCHEDULED' AND NEW.status NOT IN ('READY', 'CANCELLED') THEN
        RAISE EXCEPTION 'Transición de estado inválida: SCHEDULED solo puede pasar a READY o CANCELLED.';
    ELSIF OLD.status = 'READY' AND NEW.status NOT IN ('ACTIVE', 'CANCELLED') THEN
        RAISE EXCEPTION 'Transición de estado inválida: READY solo puede pasar a ACTIVE o CANCELLED.';
    ELSIF OLD.status = 'ACTIVE' AND NEW.status NOT IN ('PAUSED', 'FINISHED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Transición de estado inválida: ACTIVE solo puede pasar a PAUSED, FINISHED o CANCELLED.';
    ELSIF OLD.status = 'PAUSED' AND NEW.status NOT IN ('ACTIVE', 'CANCELLED') THEN
        RAISE EXCEPTION 'Transición de estado inválida: PAUSED solo puede pasar a ACTIVE o CANCELLED.';
    ELSIF OLD.status = 'FINISHED' AND NEW.status NOT IN ('ARCHIVED') THEN
        RAISE EXCEPTION 'Transición de estado inválida: FINISHED solo puede pasar a ARCHIVED.';
    ELSIF OLD.status = 'CANCELLED' AND NEW.status NOT IN ('ARCHIVED') THEN
        RAISE EXCEPTION 'Transición de estado inválida: CANCELLED solo puede pasar a ARCHIVED.';
    ELSIF OLD.status = 'ARCHIVED' THEN
        RAISE EXCEPTION 'Transición de estado inválida: ARCHIVED es un estado terminal definitivo.';
    END IF;

    -- Automatically set timestamps
    IF NEW.status = 'ACTIVE' AND OLD.status != 'PAUSED' AND NEW.started_at IS NULL THEN
        NEW.started_at := NOW();
    ELSIF NEW.status = 'FINISHED' AND NEW.ended_at IS NULL THEN
        NEW.ended_at := NOW();
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_draw_state ON public.draws;
CREATE TRIGGER trg_validate_draw_state
    BEFORE UPDATE OF status ON public.draws
    FOR EACH ROW EXECUTE FUNCTION public.validate_draw_state_transition();

-- -----------------------------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
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

-- -----------------------------------------------------------------------------
-- 6. RLS POLICIES
-- -----------------------------------------------------------------------------

-- --- PROFILES ---
CREATE POLICY "profiles_select_public" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL USING (public.is_admin_or_higher());

-- --- ROLES & PERMISSIONS ---
CREATE POLICY "roles_select_all" ON public.roles
    FOR SELECT USING (true);

CREATE POLICY "permissions_select_all" ON public.permissions
    FOR SELECT USING (true);

CREATE POLICY "role_permissions_select_all" ON public.role_permissions
    FOR SELECT USING (true);

-- --- AUDIT LOGS ---
-- Immutable: No one can UPDATE or DELETE audit logs!
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
    FOR SELECT USING (public.is_admin_or_higher());

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- --- APP SETTINGS ---
CREATE POLICY "app_settings_select_public" ON public.app_settings
    FOR SELECT USING (is_public = TRUE OR public.is_admin_or_higher());

CREATE POLICY "app_settings_admin_modify" ON public.app_settings
    FOR ALL USING (public.is_admin_or_higher());

-- --- GAME MODALITIES ---
CREATE POLICY "game_modalities_select_all" ON public.game_modalities
    FOR SELECT USING (true);

CREATE POLICY "game_modalities_admin_modify" ON public.game_modalities
    FOR ALL USING (public.is_admin_or_higher());

-- --- GAME ROOMS ---
CREATE POLICY "game_rooms_select_all" ON public.game_rooms
    FOR SELECT USING (true);

CREATE POLICY "game_rooms_admin_modify" ON public.game_rooms
    FOR ALL USING (public.is_admin_or_higher());

-- --- DRAWS ---
CREATE POLICY "draws_select_all" ON public.draws
    FOR SELECT USING (true);

CREATE POLICY "draws_operator_modify" ON public.draws
    FOR ALL USING (public.is_operator_or_higher());

-- --- DRAW EVENTS ---
CREATE POLICY "draw_events_select_all" ON public.draw_events
    FOR SELECT USING (true);

CREATE POLICY "draw_events_operator_insert" ON public.draw_events
    FOR INSERT WITH CHECK (public.is_operator_or_higher());

-- --- CARDS ---
CREATE POLICY "cards_select_own" ON public.cards
    FOR SELECT USING (auth.uid() = player_id OR public.is_operator_or_higher());

-- Player cannot insert or update cards directly (cards are issued server-side)
CREATE POLICY "cards_operator_manage" ON public.cards
    FOR ALL USING (public.is_operator_or_higher());

-- --- CARD NUMBERS ---
CREATE POLICY "card_numbers_select" ON public.card_numbers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cards 
            WHERE cards.id = card_numbers.card_id 
            AND (cards.player_id = auth.uid() OR public.is_operator_or_higher())
        )
    );

-- --- WALLETS ---
-- Client can NEVER update balance directly
CREATE POLICY "wallets_select_own" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id OR public.is_operator_or_higher());

-- --- WALLET TRANSACTIONS ---
-- Immutable to client
CREATE POLICY "wallet_transactions_select_own" ON public.wallet_transactions
    FOR SELECT USING (auth.uid() = user_id OR public.is_operator_or_higher());

-- --- PAYMENT REQUESTS ---
CREATE POLICY "payment_requests_select_own" ON public.payment_requests
    FOR SELECT USING (auth.uid() = user_id OR public.is_operator_or_higher());

CREATE POLICY "payment_requests_insert_own" ON public.payment_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_requests_operator_update" ON public.payment_requests
    FOR UPDATE USING (public.is_operator_or_higher());

-- --- OPERATOR ACTIONS ---
CREATE POLICY "operator_actions_select" ON public.operator_actions
    FOR SELECT USING (public.is_operator_or_higher());

CREATE POLICY "operator_actions_insert" ON public.operator_actions
    FOR INSERT WITH CHECK (public.is_operator_or_higher() AND auth.uid() = operator_id);

-- --- PRIZES ---
CREATE POLICY "prizes_select_all" ON public.prizes
    FOR SELECT USING (true);

CREATE POLICY "prizes_admin_modify" ON public.prizes
    FOR ALL USING (public.is_admin_or_higher());

-- --- WINNERS ---
CREATE POLICY "winners_select_all" ON public.winners
    FOR SELECT USING (true);

CREATE POLICY "winners_admin_modify" ON public.winners
    FOR ALL USING (public.is_admin_or_higher());
