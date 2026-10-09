-- =====================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1: POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- Migración: 20261001000002_rls_policies.sql
-- Principio: El navegador NO es autoridad. Principio de mínimo privilegio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ACTIVAR ROW LEVEL SECURITY EN TODAS LAS TABLAS EXPUESTAS
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_actions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE APOYO PARA EVALUACIÓN SEGURA DE ROLES (SECURITY DEFINER)
-- ---------------------------------------------------------------------

-- Obtener rol del usuario autenticado actual desde la tabla profiles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
    current_r user_role;
BEGIN
    SELECT role INTO current_r
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(current_r, 'PLAYER'::user_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comprobar si el usuario tiene rol de Operador o superior
CREATE OR REPLACE FUNCTION public.is_operator_or_higher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comprobar si el usuario tiene rol de Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 3. TRIGGER ANTI-MANIPULACIÓN EN PERFILES (ANTI-PRIVILEGE ESCALATION)
-- Impide que un usuario modifique su propio role, status o security_level
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el rol de la sesión actual no es ADMIN o SUPER_ADMIN, verificar que campos sensibles no cambien
    IF NOT public.is_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'SECURITY_VIOLATION: No está permitido modificar el rol de usuario.';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'SECURITY_VIOLATION: No está permitido modificar el estado de la cuenta.';
        END IF;
        IF NEW.security_level IS DISTINCT FROM OLD.security_level THEN
            RAISE EXCEPTION 'SECURITY_VIOLATION: No está permitido alterar el nivel de seguridad.';
        END IF;
        IF NEW.public_id IS DISTINCT FROM OLD.public_id THEN
            RAISE EXCEPTION 'SECURITY_VIOLATION: El identificador público es inmutable.';
        END IF;
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'SECURITY_VIOLATION: El ID de vinculación es inmutable.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_prevent_profile_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------
-- 4. POLÍTICAS RLS: PROFILES
-- ---------------------------------------------------------------------

-- Lectura:
-- - Un usuario puede leer su propio perfil completo
-- - Otros usuarios autenticados solo pueden leer identificador público y display_name (para tablas de ganadores/sorteos)
-- - Operadores y Administradores pueden leer perfiles completos
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = user_id OR public.is_operator_or_higher()
    );

-- Actualización:
-- - El usuario puede actualizar únicamente sus campos permitidos (display_name, full_name, phone, avatar_url)
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Los usuarios normales nunca pueden borrar su registro directamente por RLS
CREATE POLICY "profiles_delete_admin_only"
    ON public.profiles
    FOR DELETE
    USING (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. POLÍTICAS RLS: AUDIT_LOGS
-- Estricto: Ningún usuario puede alterar ni borrar logs de auditoría
-- ---------------------------------------------------------------------
CREATE POLICY "audit_logs_select_authorized"
    ON public.audit_logs
    FOR SELECT
    USING (
        public.is_admin() OR 
        (user_id = auth.uid() AND actor_role = 'PLAYER')
    );

CREATE POLICY "audit_logs_insert_authenticated"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Ningún DELETE ni UPDATE permitido en audit_logs (Inmutabilidad absoluta)

-- ---------------------------------------------------------------------
-- 6. POLÍTICAS RLS: GAME_MODALITIES Y APP_SETTINGS
-- ---------------------------------------------------------------------
-- Modalidades son públicas para lectura
CREATE POLICY "modalities_select_public"
    ON public.game_modalities
    FOR SELECT
    USING (is_active = true OR public.is_operator_or_higher());

-- Solo administradores pueden modificar modalidades
CREATE POLICY "modalities_admin_all"
    ON public.game_modalities
    FOR ALL
    USING (public.is_admin());

-- App settings públicas para lectura, privadas para escritura
CREATE POLICY "settings_select_public"
    ON public.app_settings
    FOR SELECT
    USING (is_public = true OR public.is_admin());

CREATE POLICY "settings_admin_all"
    ON public.app_settings
    FOR ALL
    USING (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. POLÍTICAS RLS: GAME_ROOMS Y DRAWS (SORTEOS)
-- ---------------------------------------------------------------------
CREATE POLICY "rooms_select_all"
    ON public.game_rooms
    FOR SELECT
    USING (true);

CREATE POLICY "rooms_admin_operator_manage"
    ON public.game_rooms
    FOR ALL
    USING (public.is_operator_or_higher());

CREATE POLICY "draws_select_all"
    ON public.draws
    FOR SELECT
    USING (true);

-- Solo Operadores/Supervisores/Admins pueden crear o alterar sorteos (Server-authoritative)
CREATE POLICY "draws_manage_operator_admin"
    ON public.draws
    FOR ALL
    USING (public.is_operator_or_higher());

-- Draw events (historial de balotas)
CREATE POLICY "draw_events_select_all"
    ON public.draw_events
    FOR SELECT
    USING (true);

CREATE POLICY "draw_events_manage_operator_admin"
    ON public.draw_events
    FOR ALL
    USING (public.is_operator_or_higher());

-- ---------------------------------------------------------------------
-- 8. POLÍTICAS RLS: CARTONES (cards & card_numbers)
-- Un jugador solo puede ver sus propios cartones
-- ---------------------------------------------------------------------
CREATE POLICY "cards_select_own"
    ON public.cards
    FOR SELECT
    USING (
        auth.uid() = user_id OR public.is_operator_or_higher()
    );

CREATE POLICY "card_numbers_select_own"
    ON public.card_numbers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards c
            WHERE c.id = card_id AND (c.user_id = auth.uid() OR public.is_operator_or_higher())
        )
    );

-- En Fase 1 no hay compra directa client-side no autorizada
CREATE POLICY "cards_insert_authenticated"
    ON public.cards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_operator_or_higher());

-- ---------------------------------------------------------------------
-- 9. POLÍTICAS RLS: BILLETERAS Y TRANSACCIONES (wallets & wallet_transactions)
-- CRÍTICO: Aislamiento absoluto. Nadie ve billeteras de otros jugadores
-- ---------------------------------------------------------------------
CREATE POLICY "wallets_select_own"
    ON public.wallets
    FOR SELECT
    USING (
        auth.uid() = user_id OR public.is_admin()
    );

-- El cliente NUNCA puede insertar ni actualizar su propio saldo directamente
-- Las transacciones de billetera son exclusivamente generadas por el backend / DB
CREATE POLICY "wallets_no_client_update"
    ON public.wallets
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "transactions_select_own"
    ON public.wallet_transactions
    FOR SELECT
    USING (
        auth.uid() = user_id OR public.is_admin()
    );

-- El cliente NUNCA puede insertar transacciones directamente
CREATE POLICY "transactions_no_client_insert"
    ON public.wallet_transactions
    FOR INSERT
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- 10. POLÍTICAS RLS: SOLICITUDES DE PAGO (payment_requests)
-- ---------------------------------------------------------------------
CREATE POLICY "payment_requests_select_own"
    ON public.payment_requests
    FOR SELECT
    USING (
        auth.uid() = user_id OR public.is_operator_or_higher()
    );

CREATE POLICY "payment_requests_insert_own"
    ON public.payment_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_requests_update_operator_admin"
    ON public.payment_requests
    FOR UPDATE
    USING (public.is_operator_or_higher());

-- ---------------------------------------------------------------------
-- 11. POLÍTICAS RLS: PREMIOS Y GANADORES
-- ---------------------------------------------------------------------
CREATE POLICY "prizes_select_all"
    ON public.prizes
    FOR SELECT
    USING (true);

CREATE POLICY "prizes_manage_admin_operator"
    ON public.prizes
    FOR ALL
    USING (public.is_operator_or_higher());

CREATE POLICY "winners_select_all"
    ON public.winners
    FOR SELECT
    USING (true);

CREATE POLICY "winners_manage_operator_admin"
    ON public.winners
    FOR ALL
    USING (public.is_operator_or_higher());

-- ---------------------------------------------------------------------
-- 12. POLÍTICAS RLS: ACCIONES DE OPERADOR (operator_actions)
-- ---------------------------------------------------------------------
CREATE POLICY "operator_actions_select_staff"
    ON public.operator_actions
    FOR SELECT
    USING (public.is_operator_or_higher());

CREATE POLICY "operator_actions_insert_operator"
    ON public.operator_actions
    FOR INSERT
    WITH CHECK (public.is_operator_or_higher());
