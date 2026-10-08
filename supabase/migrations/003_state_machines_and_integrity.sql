-- ============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 003: MÁQUINA DE ESTADOS E INTEGRIDAD
-- FASE 1: DISPARADORES DE SEGURIDAD, PREVENCIÓN DE ESCALADA Y GENERADOR BCV
-- ============================================================================

-- ============================================================================
-- 1. GENERADOR DE IDENTIFICADOR PÚBLICO BCV-XXXXXX
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_bcv_public_id()
RETURNS VARCHAR(16)
LANGUAGE plpgsql
AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sin caracteres ambiguos (0/O, 1/I)
    v_result VARCHAR(16);
    v_exists BOOLEAN;
    v_i INTEGER;
BEGIN
    LOOP
        v_result := 'BCV-';
        FOR v_i IN 1..6 LOOP
            v_result := v_result || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = v_result) INTO v_exists;
        IF NOT v_exists THEN
            RETURN v_result;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- 2. DISPARADOR DE PROTECCIÓN CONTRA ESCALADA DE PRIVILEGIOS
-- Un usuario normal NO PUEDE modificar su propio role, status ni security_level
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role user_role_type;
BEGIN
    -- Si no hay cambio en columnas sensibles, permitir
    IF (OLD.role = NEW.role AND OLD.status = NEW.status AND OLD.security_level = NEW.security_level) THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- Obtener rol del invocador
    SELECT role INTO v_caller_role FROM public.profiles WHERE user_id = auth.uid();
    
    -- Solo ADMIN o SUPER_ADMIN pueden alterar role, status o security_level
    IF v_caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'VIOLACIÓN DE SEGURIDAD: Los jugadores no tienen autorización para modificar su rol o estado de seguridad.';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_escalation ON public.profiles;
CREATE TRIGGER trg_protect_profile_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privilege_escalation();

-- ============================================================================
-- 3. MÁQUINA DE ESTADOS PARA SORTEOS (DRAWS) — SERVER AUTHORITATIVE
-- Previene transiciones ilegales o saltos arbitrarios
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_draw_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si el estado no cambió, continuar
    IF OLD.status = NEW.status THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- Validar transiciones legales
    CASE OLD.status
        WHEN 'DRAFT' THEN
            IF NEW.status NOT IN ('SCHEDULED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida: Desde DRAFT solo se permite SCHEDULED o CANCELLED.';
            END IF;
            
        WHEN 'SCHEDULED' THEN
            IF NEW.status NOT IN ('READY', 'CANCELLED', 'DRAFT') THEN
                RAISE EXCEPTION 'Transición inválida: Desde SCHEDULED solo se permite READY, CANCELLED o volver a DRAFT.';
            END IF;
            
        WHEN 'READY' THEN
            IF NEW.status NOT IN ('ACTIVE', 'PAUSED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida: Desde READY solo se permite ACTIVE, PAUSED o CANCELLED.';
            END IF;
            IF NEW.status = 'ACTIVE' AND NEW.started_at IS NULL THEN
                NEW.started_at := timezone('utc'::text, now());
            END IF;

        WHEN 'ACTIVE' THEN
            IF NEW.status NOT IN ('PAUSED', 'FINISHED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida: Desde ACTIVE solo se permite PAUSED, FINISHED o CANCELLED.';
            END IF;
            IF NEW.status = 'FINISHED' AND NEW.finished_at IS NULL THEN
                NEW.finished_at := timezone('utc'::text, now());
            END IF;

        WHEN 'PAUSED' THEN
            IF NEW.status NOT IN ('ACTIVE', 'CANCELLED') THEN
                RAISE EXCEPTION 'Transición inválida: Desde PAUSED solo se permite ACTIVE o CANCELLED.';
            END IF;

        WHEN 'FINISHED' THEN
            IF NEW.status NOT IN ('ARCHIVED') THEN
                RAISE EXCEPTION 'Transición inválida: Un sorteo FINISHED solo puede transicionar a ARCHIVED.';
            END IF;

        WHEN 'CANCELLED' THEN
            IF NEW.status NOT IN ('ARCHIVED') THEN
                RAISE EXCEPTION 'Transición inválida: Un sorteo CANCELLED solo puede transicionar a ARCHIVED.';
            END IF;

        WHEN 'ARCHIVED' THEN
            RAISE EXCEPTION 'Transición inválida: Un sorteo ARCHIVED es inmutable y no puede cambiar de estado.';
            
        ELSE
            RAISE EXCEPTION 'Estado de sorteo desconocido.';
    END CASE;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_draw_state ON public.draws;
CREATE TRIGGER trg_validate_draw_state
BEFORE UPDATE OF status ON public.draws
FOR EACH ROW
EXECUTE FUNCTION public.validate_draw_state_transition();

-- ============================================================================
-- 4. MANEJADOR AUTOMÁTICO DE NUEVOS USUARIOS (AUTH HOOK)
-- Crea perfil con public_id (BCV-XXXXXX) y billetera inicial
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_public_id VARCHAR(16);
    v_display_name VARCHAR(50);
    v_full_name VARCHAR(100);
    v_phone VARCHAR(20);
BEGIN
    v_public_id := public.generate_bcv_public_id();
    v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', 'Jugador_' || substr(NEW.id::text, 1, 6));
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Jugador Oficial');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '+584120000000');

    -- Insertar perfil
    INSERT INTO public.profiles (
        user_id,
        public_id,
        display_name,
        full_name,
        phone,
        role,
        status,
        security_level
    ) VALUES (
        NEW.id,
        v_public_id,
        v_display_name,
        v_full_name,
        v_phone,
        'PLAYER',
        'ACTIVE',
        1
    );

    -- Crear registro de billetera
    INSERT INTO public.wallets (
        user_id,
        balance,
        currency,
        is_locked
    ) VALUES (
        NEW.id,
        0.00,
        'VES',
        false
    );

    -- Registro en bitácora de auditoría
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
        'AUTH_REGISTER_SUCCESS',
        'PROFILE',
        v_public_id,
        jsonb_build_object('provider', NEW.raw_app_meta_data->>'provider')
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();
