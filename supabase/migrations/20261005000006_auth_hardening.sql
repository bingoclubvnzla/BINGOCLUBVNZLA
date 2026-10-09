-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 06: AUTH HARDENING (FASE 2.4)
-- Google OAuth + Cloudflare Turnstile + Perfiles PLAYER Seguros + Auditoría de Auth
-- ==============================================================================

-- 1. FUNCIÓN Y TRIGGER ROBUSTO: HANDLE_NEW_USER() (COMPATIBLE CON GOOGLE OAUTH Y EMAIL)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_id TEXT;
    v_full_name TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    gen_id := public.generate_public_id();

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

    -- Creación segura de perfil: Estrictamente asigna rol PLAYER.
    -- ON CONFLICT (id) DO NOTHING previene duplicidad de perfiles si un usuario
    -- enlaza identidades o reingresa con el mismo correo.
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
        'PLAYER',
        'ACTIVE',
        1,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Billetera inicial bloqueada para Fase 1 / Fase 2 (Sin dinero real)
    INSERT INTO public.wallets (
        user_id,
        currency,
        balance_available,
        balance_locked,
        status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'VES',
        0.00,
        0.00,
        'DISABLED_PHASE_1',
        now(),
        now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Auditoría inicial inmutable de registro
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
        'SIGNUP',
        'profiles',
        NEW.id::text,
        jsonb_build_object(
            'public_id', gen_id,
            'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Asegurar vinculación del trigger sobre auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. FUNCIÓN RPC SEGURA PARA REGISTRO DE EVENTOS DE AUDITORÍA DE AUTENTICACIÓN
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT role::text INTO v_role FROM public.profiles WHERE id = v_user_id;
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        COALESCE(v_role, 'ANON'),
        p_action,
        'auth',
        COALESCE(v_user_id::text, 'anon'),
        p_metadata
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Otorgar ejecución a usuarios anon y authenticated
GRANT EXECUTE ON FUNCTION public.log_auth_event(TEXT, JSONB) TO anon, authenticated;

-- 3. ACTUALIZACIÓN DE CONTROL DE FASE EN APP_SETTINGS
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
    'PLATFORM_PHASE',
    jsonb_build_object(
        'phase', 2.4,
        'phase_name', 'AUTH_HARDENING',
        'financial_operations_active', false,
        'mode', 'TEST_MODE',
        'message', 'Fase 2.4: Google OAuth + Cloudflare Turnstile + Verificación de correo electrónico y protección anti-bot activas.'
    ),
    'Estado actual de fases y control operativo del sistema'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();
