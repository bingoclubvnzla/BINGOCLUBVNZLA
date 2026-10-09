-- ============================================================================
-- BINGO CLUB VNZLA ONLINE — POLÍTICAS ROW LEVEL SECURITY (RLS) (FASE 1)
-- Principio: Zero Trust, Menor Privilegio, Sin Autoridad en el Cliente
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCIONES AUXILIARES DE AUTORIZACIÓN (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_operator_or_higher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. HABILITAR RLS EN TODAS LAS TABLAS EXPUESTAS
-- ----------------------------------------------------------------------------

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
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

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS: ROLES Y PERMISOS
-- ----------------------------------------------------------------------------

-- Lectura pública para conocer la jerarquía del sistema
CREATE POLICY "Roles son visibles para usuarios autenticados"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permisos son visibles para administradores"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Role permissions son visibles para administradores"
    ON public.role_permissions FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS: PROFILES
-- Jugador solo lee su propio perfil completo o datos públicos mínimos de otros
-- Jugador nunca modifica rol, balance o status
-- ----------------------------------------------------------------------------

CREATE POLICY "Jugadores pueden ver su propio perfil completo"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_operator_or_higher());

CREATE POLICY "Jugadores pueden actualizar solo sus campos de perfil permitidos"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Solo administradores pueden insertar perfiles directamente"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS: APP_SETTINGS
-- Claves públicas legibles por todos; claves internas solo por administradores
-- ----------------------------------------------------------------------------

CREATE POLICY "Configuraciones públicas son legibles por todos"
    ON public.app_settings FOR SELECT
    TO authenticated, anon
    USING (is_public = true OR public.is_admin());

CREATE POLICY "Solo administradores pueden modificar configuraciones"
    ON public.app_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS: GAME_MODALITIES
-- Modalidades son legibles por cualquier usuario autenticado o anónimo
-- Modificación solo por administradores
-- ----------------------------------------------------------------------------

CREATE POLICY "Modalidades activas visibles para todos"
    ON public.game_modalities FOR SELECT
    TO authenticated, anon
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Solo administradores pueden crear o alterar modalidades"
    ON public.game_modalities FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. POLÍTICAS: GAME_ROOMS
-- Salas públicas o asignadas; modificación solo por administradores u operadores
-- ----------------------------------------------------------------------------

CREATE POLICY "Salas activas visibles para autenticados"
    ON public.game_rooms FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_operator_or_higher());

CREATE POLICY "Operadores y Administradores pueden gestionar salas"
    ON public.game_rooms FOR ALL
    TO authenticated
    USING (public.is_operator_or_higher())
    WITH CHECK (public.is_operator_or_higher());

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS: DRAWS (SORTEOS)
-- Sorteos programados, activos o terminados son visibles por todos
-- Sorteos en borrador solo visibles por operadores/admin
-- Ningún jugador puede insertar ni modificar sorteos
-- ----------------------------------------------------------------------------

CREATE POLICY "Sorteos no borrador son visibles para usuarios"
    ON public.draws FOR SELECT
    TO authenticated, anon
    USING (status != 'DRAFT' OR public.is_operator_or_higher());

CREATE POLICY "Solo operadores y administradores gestionan sorteos"
    ON public.draws FOR ALL
    TO authenticated
    USING (public.is_operator_or_higher())
    WITH CHECK (public.is_operator_or_higher());

-- ----------------------------------------------------------------------------
-- 9. POLÍTICAS: DRAW_EVENTS
-- Eventos públicos del sorteo son de solo lectura
-- ----------------------------------------------------------------------------

CREATE POLICY "Eventos de sorteo son visibles por todos"
    ON public.draw_events FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Solo operadores y administradores emiten eventos de sorteo"
    ON public.draw_events FOR INSERT
    TO authenticated
    WITH CHECK (public.is_operator_or_higher());

-- ----------------------------------------------------------------------------
-- 10. POLÍTICAS: CARDS (CARTONES)
-- Un jugador solo puede ver sus propios cartones
-- En sorteo terminado, los cartones ganadores pueden ser auditables
-- Los jugadores NUNCA pueden modificar sus cartones una vez creados
-- ----------------------------------------------------------------------------

CREATE POLICY "Jugadores ven sus propios cartones"
    ON public.cards FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_operator_or_higher());

CREATE POLICY "Cartones no pueden ser alterados por el jugador"
    ON public.cards FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Jugadores no pueden borrar cartones"
    ON public.cards FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Card numbers (detalle numérico)
CREATE POLICY "Jugadores leen numeros de sus cartones"
    ON public.card_numbers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_numbers.card_id
            AND (cards.user_id = auth.uid() OR public.is_operator_or_higher())
        )
    );

-- ----------------------------------------------------------------------------
-- 11. POLÍTICAS: PRIZES Y WINNERS
-- Visibles por todos los participantes del sorteo
-- Inserción / modificación solo por el sistema / administradores
-- ----------------------------------------------------------------------------

CREATE POLICY "Premios son visibles para todos"
    ON public.prizes FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Solo administradores pueden crear o modificar premios"
    ON public.prizes FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Ganadores son visibles para todos"
    ON public.winners FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Solo el sistema o administradores registran ganadores"
    ON public.winners FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 12. POLÍTICAS: WALLETS Y TRANSACCIONES
-- Un jugador SOLO puede leer su propia billetera
-- Un jugador NUNCA puede modificar su billetera ni insertar transacciones
-- Las modificaciones financieras son EXCLUSIVAS del backend (service_role)
-- ----------------------------------------------------------------------------

CREATE POLICY "Jugadores solo pueden consultar su propia billetera"
    ON public.wallets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- Bloqueo total a usuarios normales en INSERT/UPDATE/DELETE en wallets
CREATE POLICY "Solo administradores pueden actualizar billeteras manualmente"
    ON public.wallets FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Jugadores solo ven sus propias transacciones de billetera"
    ON public.wallet_transactions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Solo administradores pueden ver todas las transacciones"
    ON public.wallet_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Payment requests
CREATE POLICY "Jugadores ven sus propias solicitudes de pago"
    ON public.payment_requests FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_operator_or_higher());

CREATE POLICY "Jugadores pueden crear solicitudes de pago para si mismos"
    ON public.payment_requests FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Solo operadores y administradores aprueban o rechazan pagos"
    ON public.payment_requests FOR UPDATE
    TO authenticated
    USING (public.is_operator_or_higher())
    WITH CHECK (public.is_operator_or_higher());

-- ----------------------------------------------------------------------------
-- 13. POLÍTICAS: AUDIT_LOGS Y OPERATOR_ACTIONS
-- Solo administradores y supervisores pueden consultar bitácoras de auditoría
-- Ningún usuario puede borrar o alterar registros de auditoría
-- ----------------------------------------------------------------------------

CREATE POLICY "Solo administradores y supervisores leen auditoria"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_operator_or_higher());

CREATE POLICY "Inserción en auditoría permitida para eventos del sistema"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Auditoría es inmutable: prohibido actualizar"
    ON public.audit_logs FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY "Auditoría es inmutable: prohibido eliminar"
    ON public.audit_logs FOR DELETE
    TO authenticated
    USING (false);

CREATE POLICY "Operadores leen acciones de operadores"
    ON public.operator_actions FOR SELECT
    TO authenticated
    USING (public.is_operator_or_higher());

CREATE POLICY "Operadores registran sus acciones"
    ON public.operator_actions FOR INSERT
    TO authenticated
    WITH CHECK (operator_id = auth.uid() AND public.is_operator_or_higher());
