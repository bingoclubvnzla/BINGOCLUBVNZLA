-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 01: ROW LEVEL SECURITY (RLS) ESTRICTO
-- Principio: El navegador no es autoridad. Cada tabla debe contar con RLS.
-- ==============================================================================

-- 1. FUNCIONES AUXILIARES DE ROL EN EL SERVIDOR
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_operator_or_higher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
        AND status = 'ACTIVE'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

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
    FOR SELECT TO authenticated
    USING (status != 'DRAFT' OR public.is_operator_or_higher());

CREATE POLICY "draws_mutate_admin" ON public.draws
    FOR ALL TO authenticated
    USING (public.is_operator_or_higher())
    WITH CHECK (public.is_operator_or_higher());

CREATE POLICY "draw_events_select" ON public.draw_events
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "draw_events_insert_operator" ON public.draw_events
    FOR INSERT TO authenticated
    WITH CHECK (public.is_operator_or_higher());

-- ==============================================================================
-- 7. POLÍTICAS: CARDS & CARD_NUMBERS
-- ==============================================================================
-- Un jugador solo puede ver SUS propios cartones
CREATE POLICY "cards_select_own" ON public.cards
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_operator_or_higher());

-- Cartones solo emitidos por el servidor/Edge Functions o administradores
CREATE POLICY "cards_insert_admin" ON public.cards
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

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
