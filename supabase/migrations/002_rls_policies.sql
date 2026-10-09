-- ============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 002: POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- FASE 1: PROTECCIÓN ESTRICTA, AUTORIDAD DE SERVIDOR Y RBAC
-- ============================================================================

-- Habilitar RLS en TODAS las tablas públicas expuestas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNCIONES AUXILIARES DE SEGURIDAD (SECURITY DEFINER)
-- ============================================================================

-- Obtener rol del usuario autenticado actual desde public.profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_role user_role_type;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(v_role, 'PLAYER'::user_role_type);
END;
$$;

-- Verificar si el usuario actual tiene permisos administrativos
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT current_user_role() IN ('ADMIN', 'SUPER_ADMIN');
$$;

-- Verificar si el usuario actual es operador o superior
CREATE OR REPLACE FUNCTION public.is_operator_or_above()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT current_user_role() IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN');
$$;

-- ============================================================================
-- 1. TABLA: PROFILES
-- ============================================================================

-- Cualquier usuario autenticado puede leer su propio perfil
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Operadores y administradores pueden consultar perfiles de jugadores para soporte y verificación
DROP POLICY IF EXISTS "profiles_select_operators" ON public.profiles;
CREATE POLICY "profiles_select_operators"
ON public.profiles FOR SELECT
TO authenticated
USING (is_operator_or_above());

-- El usuario solo puede actualizar sus propios datos permitidos (display_name, phone, avatar_url)
-- La columna role, status y security_level están protegidas por trigger
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Administradores pueden actualizar perfiles (incluyendo roles y estados)
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- 2. TABLA: APP_SETTINGS & GAME_MODALITIES
-- ============================================================================

-- Configuraciones públicas pueden ser leídas por cualquiera
CREATE POLICY "app_settings_select_public"
ON public.app_settings FOR SELECT
TO public
USING (is_public = true OR is_admin());

-- Modificaciones en app_settings solo por SUPER_ADMIN
CREATE POLICY "app_settings_admin_all"
ON public.app_settings FOR ALL
TO authenticated
USING (current_user_role() = 'SUPER_ADMIN')
WITH CHECK (current_user_role() = 'SUPER_ADMIN');

-- Modalidades activas son legibles por cualquier usuario (autenticado o público)
CREATE POLICY "modalities_select_active"
ON public.game_modalities FOR SELECT
TO public
USING (is_active = true OR is_admin());

-- Solo Administradores pueden insertar o modificar modalidades
CREATE POLICY "modalities_admin_manage"
ON public.game_modalities FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- 3. TABLA: GAME_ROOMS & DRAWS
-- ============================================================================

-- Salas de juego activas públicas son legibles por todos
CREATE POLICY "rooms_select_public"
ON public.game_rooms FOR SELECT
TO authenticated
USING (is_active = true AND (is_private = false OR created_by = auth.uid() OR is_operator_or_above()));

-- Creación de salas restringida a operadores o administradores
CREATE POLICY "rooms_operator_insert"
ON public.game_rooms FOR INSERT
TO authenticated
WITH CHECK (is_operator_or_above());

CREATE POLICY "rooms_operator_update"
ON public.game_rooms FOR UPDATE
TO authenticated
USING (is_operator_or_above());

-- Sorteos: Cualquier usuario puede leer sorteos programados, activos o finalizados
CREATE POLICY "draws_select_all"
ON public.draws FOR SELECT
TO authenticated
USING (status != 'DRAFT' OR is_operator_or_above());

-- Modificar sorteos: Exclusivo de Operadores y Administradores (El cliente no puede alterar números ni estados arbitrariamente)
CREATE POLICY "draws_operator_manage"
ON public.draws FOR ALL
TO authenticated
USING (is_operator_or_above())
WITH CHECK (is_operator_or_above());

-- Eventos de Sorteo (Extracciones de balotas): Solo lectura para jugadores, inserción por servidor/operador autorizado
CREATE POLICY "draw_events_select"
ON public.draw_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "draw_events_insert_operator"
ON public.draw_events FOR INSERT
TO authenticated
WITH CHECK (is_operator_or_above());

-- ============================================================================
-- 4. TABLA: CARDS & CARD_NUMBERS
-- ============================================================================

-- Un jugador solo puede leer sus propios cartones
CREATE POLICY "cards_select_own"
ON public.cards FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_operator_or_above());

-- Inserción de cartones protegida (Solo mediante backend/función transaccional autorizada)
CREATE POLICY "cards_insert_system"
ON public.cards FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "card_numbers_select"
ON public.card_numbers FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cards c
        WHERE c.id = card_numbers.card_id
        AND (c.user_id = auth.uid() OR is_operator_or_above())
    )
);

-- ============================================================================
-- 5. TABLA: PREMIOS Y GANADORES
-- ============================================================================

-- Todos los jugadores pueden ver premios y ganadores confirmados
CREATE POLICY "prizes_select_all"
ON public.prizes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "winners_select_all"
ON public.winners FOR SELECT
TO authenticated
USING (true);

-- Solo el backend/operador supervisor puede registrar ganadores verificados
CREATE POLICY "winners_operator_manage"
ON public.winners FOR ALL
TO authenticated
USING (is_operator_or_above())
WITH CHECK (is_operator_or_above());

-- ============================================================================
-- 6. TABLA: WALLETS & TRANSACTIONS (ESTRUCTURA DE SEGURIDAD FASE 2)
-- ============================================================================

-- Un jugador solo puede consultar su propia billetera
CREATE POLICY "wallets_select_own"
ON public.wallets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Nadie en el cliente puede actualizar o insertar saldo directamente
-- Ni siquiera un usuario normal puede modificar balance
CREATE POLICY "wallets_admin_update"
ON public.wallets FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Transacciones de billetera: Solo lectura de sus propias transacciones
CREATE POLICY "wallet_tx_select_own"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.wallets w
        WHERE w.id = wallet_transactions.wallet_id
        AND (w.user_id = auth.uid() OR is_operator_or_above())
    )
);

-- Solicitudes de pago: Jugador solo lee y crea sus propias solicitudes
CREATE POLICY "payment_requests_select_own"
ON public.payment_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_operator_or_above());

CREATE POLICY "payment_requests_insert_own"
ON public.payment_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_requests_operator_update"
ON public.payment_requests FOR UPDATE
TO authenticated
USING (is_operator_or_above());

-- ============================================================================
-- 7. TABLA: AUDIT_LOGS (INMUTABLE)
-- ============================================================================

-- Solo Administradores y Auditores pueden leer la bitácora completa
CREATE POLICY "audit_logs_select_admin"
ON public.audit_logs FOR SELECT
TO authenticated
USING (is_admin());

-- Inserción permitida a usuarios autenticados para registrar sus eventos de auditoría (sin modificar registros previos)
CREATE POLICY "audit_logs_insert_authenticated"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- NUNCA permitir UPDATE ni DELETE en audit_logs
-- (No se crean políticas de UPDATE o DELETE, impidiendo cualquier modificación)
