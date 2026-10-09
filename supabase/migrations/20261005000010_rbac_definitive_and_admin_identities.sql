-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 10: RBAC DEFINITIVO & IDENTIDADES OFICIALES
-- Fase 2.9: Jerarquía de Roles, Cuentas Administrativas Oficiales y Protección Server-Side
-- ==============================================================================

-- 1. REGISTRO EN APP_SETTINGS DE LAS IDENTIDADES ADMINISTRATIVAS OFICIALES
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'OFFICIAL_ADMIN_IDENTITIES',
    jsonb_build_object(
        'SUPER_ADMIN', 'v19629049@gmail.com',
        'ADMIN', 'bingoclubvnzla@gmail.com',
        'OPERATOR', 'bingobingovnz@gmail.com',
        'hierarchy', jsonb_build_array('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERATOR', 'PLAYER'),
        'configured_at', now()
    ),
    'Identidades oficiales de administración y jerarquía RBAC definitiva'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- 2. JERARQUÍA NUMÉRICA RBAC OFICIAL
CREATE OR REPLACE FUNCTION public.get_role_hierarchy_level(p_role user_role)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_role
        WHEN 'SUPER_ADMIN' THEN 50
        WHEN 'ADMIN'       THEN 40
        WHEN 'SUPERVISOR'  THEN 30
        WHEN 'OPERATOR'    THEN 20
        WHEN 'PLAYER'      THEN 10
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. ACTUALIZACIÓN DE handle_new_user() CON ASIGNACIÓN AUTOMÁTICA SERVER-SIDE DE IDENTIDADES OFICIALES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_id TEXT;
    v_full_name TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
    v_target_role user_role := 'PLAYER';
    v_email_normalized TEXT;
BEGIN
    gen_id := public.generate_public_id();
    v_email_normalized := lower(trim(COALESCE(NEW.email, '')));

    -- Extraer nombres y metadatos tanto de registro tradicional como de Google OAuth
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
    );

    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        gen_id
    );

    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        null
    );

    -- Asignación autoritativa de identidades oficiales server-side
    IF v_email_normalized = 'v19629049@gmail.com' THEN
        v_target_role := 'SUPER_ADMIN';
    ELSIF v_email_normalized = 'bingoclubvnzla@gmail.com' THEN
        v_target_role := 'ADMIN';
    ELSIF v_email_normalized = 'bingobingovnz@gmail.com' THEN
        v_target_role := 'OPERATOR';
    ELSE
        v_target_role := 'PLAYER';
    END IF;

    -- Inserción segura en profiles
    INSERT INTO public.profiles (
        id,
        public_id,
        full_name,
        display_name,
        avatar_url,
        role,
        status,
        security_level,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        gen_id,
        v_full_name,
        v_display_name,
        v_avatar_url,
        v_target_role,
        'ACTIVE',
        CASE WHEN v_target_role = 'SUPER_ADMIN' THEN 5
             WHEN v_target_role = 'ADMIN' THEN 4
             WHEN v_target_role = 'OPERATOR' THEN 2
             ELSE 1 END,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = CASE 
            WHEN v_email_normalized = 'v19629049@gmail.com' THEN 'SUPER_ADMIN'
            WHEN v_email_normalized = 'bingoclubvnzla@gmail.com' THEN 'ADMIN'
            WHEN v_email_normalized = 'bingobingovnz@gmail.com' THEN 'OPERATOR'
            ELSE profiles.role
        END,
        updated_at = now();

    -- Registrar auditoría si se asignó un rol administrativo oficial
    IF v_target_role <> 'PLAYER' THEN
        INSERT INTO public.audit_logs (
            user_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            metadata
        ) VALUES (
            NEW.id,
            v_target_role::text,
            'ADMIN_CREATED',
            'user_role',
            NEW.id::text,
            jsonb_build_object(
                'email', v_email_normalized,
                'role', v_target_role,
                'event', 'OFFICIAL_IDENTITY_BOOTSTRAP'
            )
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. PROCEDIMIENTO SERVER-SIDE: SINCRONIZACIÓN Y BOOTSTRAP DE IDENTIDADES OFICIALES
CREATE OR REPLACE FUNCTION public.sync_official_admin_identities()
RETURNS JSONB AS $$
DECLARE
    v_super_admin_user RECORD;
    v_admin_user RECORD;
    v_operator_user RECORD;
    v_result JSONB := '{}'::jsonb;
BEGIN
    -- 1. Reconciliar SUPER_ADMIN (v19629049@gmail.com)
    SELECT id, email INTO v_super_admin_user
    FROM auth.users
    WHERE lower(trim(email)) = 'v19629049@gmail.com'
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.profiles
        SET role = 'SUPER_ADMIN',
            security_level = 5,
            updated_at = now()
        WHERE id = v_super_admin_user.id;

        INSERT INTO public.audit_logs (user_id, actor_role, action, entity_type, entity_id, metadata)
        VALUES (v_super_admin_user.id, 'SUPER_ADMIN', 'ROLE_ASSIGNED', 'profile', v_super_admin_user.id::text,
                jsonb_build_object('role', 'SUPER_ADMIN', 'email', 'v19629049@gmail.com'));

        v_result := jsonb_set(v_result, '{SUPER_ADMIN}', jsonb_build_object('status', 'ACTIVE', 'user_id', v_super_admin_user.id));
    ELSE
        v_result := jsonb_set(v_result, '{SUPER_ADMIN}', jsonb_build_object('status', 'ADMIN_IDENTITY_PENDING', 'email', 'v19629049@gmail.com'));
    END IF;

    -- 2. Reconciliar ADMIN (bingoclubvnzla@gmail.com)
    SELECT id, email INTO v_admin_user
    FROM auth.users
    WHERE lower(trim(email)) = 'bingoclubvnzla@gmail.com'
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.profiles
        SET role = 'ADMIN',
            security_level = 4,
            updated_at = now()
        WHERE id = v_admin_user.id;

        INSERT INTO public.audit_logs (user_id, actor_role, action, entity_type, entity_id, metadata)
        VALUES (v_admin_user.id, 'ADMIN', 'ROLE_ASSIGNED', 'profile', v_admin_user.id::text,
                jsonb_build_object('role', 'ADMIN', 'email', 'bingoclubvnzla@gmail.com'));

        v_result := jsonb_set(v_result, '{ADMIN}', jsonb_build_object('status', 'ACTIVE', 'user_id', v_admin_user.id));
    ELSE
        v_result := jsonb_set(v_result, '{ADMIN}', jsonb_build_object('status', 'ADMIN_IDENTITY_PENDING', 'email', 'bingoclubvnzla@gmail.com'));
    END IF;

    -- 3. Reconciliar OPERATOR (bingobingovnz@gmail.com)
    SELECT id, email INTO v_operator_user
    FROM auth.users
    WHERE lower(trim(email)) = 'bingobingovnz@gmail.com'
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.profiles
        SET role = 'OPERATOR',
            security_level = 2,
            updated_at = now()
        WHERE id = v_operator_user.id;

        INSERT INTO public.audit_logs (user_id, actor_role, action, entity_type, entity_id, metadata)
        VALUES (v_operator_user.id, 'OPERATOR', 'ROLE_ASSIGNED', 'profile', v_operator_user.id::text,
                jsonb_build_object('role', 'OPERATOR', 'email', 'bingobingovnz@gmail.com'));

        v_result := jsonb_set(v_result, '{OPERATOR}', jsonb_build_object('status', 'ACTIVE', 'user_id', v_operator_user.id));
    ELSE
        v_result := jsonb_set(v_result, '{OPERATOR}', jsonb_build_object('status', 'ADMIN_IDENTITY_PENDING', 'email', 'bingobingovnz@gmail.com'));
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. PROCEDIMIENTO SEGURO: GESTIÓN DE ROLES CON STEP-UP OBLIGATORIO
CREATE OR REPLACE FUNCTION public.execute_admin_change_role(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_role user_role,
    p_idempotency_key UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_target_current_role user_role;
    v_target_email TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    -- Consumir Step-Up Authorization de nivel CRITICAL
    PERFORM public.internal_consume_step_up(p_auth_id, 'CHANGE_USER_ROLE');

    -- Obtener rol del llamador
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Acceso Denegado (403): Solo administradores pueden gestionar roles.';
    END IF;

    -- Comprobar que no se intente modificar a sí mismo (anti-self-lockout / anti-self-elevation)
    IF v_caller_id = p_target_user_id THEN
        RAISE EXCEPTION 'Violación de Seguridad: No puede modificar su propio rol.';
    END IF;

    -- Obtener rol actual del usuario destino
    SELECT role INTO v_target_current_role
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario destino no encontrado.';
    END IF;

    -- Si el llamador es ADMIN (no SUPER_ADMIN):
    IF v_caller_role = 'ADMIN' THEN
        -- No puede asignar roles ADMIN ni SUPER_ADMIN
        IF p_new_role IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Privilegios Insuficientes: Un ADMIN no puede otorgar roles ADMIN ni SUPER_ADMIN.';
        END IF;
        -- Tampoco puede modificar a un usuario que ya sea ADMIN o SUPER_ADMIN
        IF v_target_current_role IN ('ADMIN', 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'Privilegios Insuficientes: Un ADMIN no puede alterar a otros administradores.';
        END IF;
    END IF;

    -- Protección estricta de la identidad SUPER_ADMIN
    IF v_target_current_role = 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Protección de Identidad Canónica: El rol SUPER_ADMIN es inmutable.';
    END IF;

    -- Actualizar rol del perfil
    UPDATE public.profiles
    SET role = p_new_role,
        security_level = CASE 
            WHEN p_new_role = 'SUPER_ADMIN' THEN 5
            WHEN p_new_role = 'ADMIN' THEN 4
            WHEN p_new_role = 'SUPERVISOR' THEN 3
            WHEN p_new_role = 'OPERATOR' THEN 2
            ELSE 1 END,
        updated_at = now()
    WHERE id = p_target_user_id;

    -- Auditoría inmutable de roles
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_caller_id,
        v_caller_role::text,
        'ROLE_CHANGED',
        'user_role',
        p_target_user_id::text,
        jsonb_build_object(
            'actor_id', v_caller_id,
            'target_id', p_target_user_id,
            'previous_role', v_target_current_role,
            'new_role', p_new_role
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_id', p_target_user_id,
        'new_role', p_new_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. PROCEDIMIENTO SEGURO: BLOQUEO Y DESBLOQUEO DE USUARIOS
CREATE OR REPLACE FUNCTION public.execute_admin_toggle_user_status(
    p_auth_id UUID,
    p_target_user_id UUID,
    p_new_status user_status,
    p_reason TEXT DEFAULT 'Modificación por administración',
    p_idempotency_key UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role;
    v_target_role user_role;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'No autenticado.';
    END IF;

    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Acceso Denegado: Se requiere rol de administrador.';
    END IF;

    SELECT role INTO v_target_role
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario destino no encontrado.';
    END IF;

    IF v_target_role = 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'No es posible modificar el estado de la cuenta SUPER_ADMIN.';
    END IF;

    UPDATE public.profiles
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_target_user_id;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_caller_id,
        v_caller_role::text,
        CASE WHEN p_new_status = 'BLOCKED' OR p_new_status = 'SUSPENDED' THEN 'USER_BLOCKED' ELSE 'USER_UNBLOCKED' END,
        'user_profile',
        p_target_user_id::text,
        jsonb_build_object(
            'target_id', p_target_user_id,
            'new_status', p_new_status,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. RESTRICCIÓN DE PERMISOS EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_official_admin_identities FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_admin_change_role FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_admin_toggle_user_status FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_role_hierarchy_level TO PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_official_admin_identities TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_admin_change_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_admin_toggle_user_status TO authenticated;
