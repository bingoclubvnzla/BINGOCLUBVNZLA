-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1
-- MIGRACIÓN 00002: Semillas Iniciales de Roles, Permisos y Modalidades de Juego
-- ==============================================================================

-- 1. REGISTRO DE ROLES OFICIALES
INSERT INTO public.roles (name, description, hierarchy_level) VALUES
    ('SUPER_ADMIN', 'Control total de la plataforma, infraestructura y seguridad', 100),
    ('ADMIN', 'Administrador de sistema, gestión de operadores, salas y auditoría', 80),
    ('SUPERVISOR', 'Supervisión de salas, resolución de disputas e incidencias de sorteos', 60),
    ('OPERATOR', 'Operador de atención, control de salas y validación de comprobantes', 40),
    ('PLAYER', 'Jugador regular de la plataforma Bingo Club Venezuela', 10)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level;

-- 2. REGISTRO DE PERMISOS DEL SISTEMA
INSERT INTO public.permissions (id, description, category) VALUES
    ('draws.view', 'Ver sorteos y estado de salas en vivo', 'DRAWS'),
    ('draws.participate', 'Comprar cartones y participar en sorteos', 'DRAWS'),
    ('draws.manage', 'Crear, pausar y archivar sorteos', 'DRAWS'),
    ('draws.execute_step', 'Disparar extracción de balota / figura autorizada', 'DRAWS'),
    ('users.view_own', 'Ver perfil personal y transacciones propias', 'USERS'),
    ('users.edit_own_profile', 'Modificar datos permitidos del perfil propio', 'USERS'),
    ('users.manage_all', 'Gestionar roles, bloqueos y estados de usuarios', 'USERS'),
    ('finance.view_own', 'Consultar balance e historial de su billetera', 'FINANCE'),
    ('finance.manage_requests', 'Revisar y verificar comprobantes de recarga/retiro', 'FINANCE'),
    ('audit.view_logs', 'Visualizar registros de auditoría y trazas de seguridad', 'AUDIT'),
    ('system.configure', 'Modificar configuraciones globales y parámetros de juego', 'SYSTEM')
ON CONFLICT (id) DO NOTHING;

-- 3. ASIGNACIÓN DE PERMISOS A ROLES (RBAC)
-- PLAYER
INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('PLAYER', 'draws.view'),
    ('PLAYER', 'draws.participate'),
    ('PLAYER', 'users.view_own'),
    ('PLAYER', 'users.edit_own_profile'),
    ('PLAYER', 'finance.view_own')
ON CONFLICT DO NOTHING;

-- OPERATOR
INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('OPERATOR', 'draws.view'),
    ('OPERATOR', 'users.view_own'),
    ('OPERATOR', 'users.edit_own_profile'),
    ('OPERATOR', 'finance.manage_requests')
ON CONFLICT DO NOTHING;

-- SUPERVISOR
INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('SUPERVISOR', 'draws.view'),
    ('SUPERVISOR', 'draws.manage'),
    ('SUPERVISOR', 'users.view_own'),
    ('SUPERVISOR', 'finance.manage_requests'),
    ('SUPERVISOR', 'audit.view_logs')
ON CONFLICT DO NOTHING;

-- ADMIN
INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('ADMIN', 'draws.view'),
    ('ADMIN', 'draws.manage'),
    ('ADMIN', 'draws.execute_step'),
    ('ADMIN', 'users.view_own'),
    ('ADMIN', 'users.manage_all'),
    ('ADMIN', 'finance.manage_requests'),
    ('ADMIN', 'audit.view_logs'),
    ('ADMIN', 'system.configure')
ON CONFLICT DO NOTHING;

-- SUPER_ADMIN (Todos los permisos)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'SUPER_ADMIN', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- 4. CONFIGURACIÓN DE LAS 5 MODALIDADES OBLIGATORIAS
-- BINGO_75: 5x5, centro libre
-- BINGO_90: 3x5
-- ANIMALITOS: 5x5, centro libre (Tradición venezolana con 36 o 38 animalitos)
-- OBJETOS: 5x5, centro libre
-- CHAPITAS: 3x5 (Tradición popular venezolana)

INSERT INTO public.game_modalities (code, name, grid_rows, grid_cols, has_free_center, total_numbers, description, is_active) VALUES
    (
        'BINGO_75',
        'Bingo Tradicional 75 Balotas',
        5,
        5,
        TRUE,
        75,
        'Formato americano clásico de 5 columnas (B-I-N-G-O) con 5 filas y casilla central libre.',
        TRUE
    ),
    (
        'BINGO_90',
        'Bingo Clásico 90 Balotas',
        3,
        9,
        FALSE,
        90,
        'Formato clásico de 3 filas y 9 columnas (5 números y 4 espacios vacíos por fila).',
        TRUE
    ),
    (
        'ANIMALITOS',
        'Bingo de Animalitos Venezolanos',
        5,
        5,
        TRUE,
        38,
        'Modalidad temática venezolana inspirada en la ruleta tradicional (Delfín, León, Toro, etc.) en cuadrícula 5x5 con centro libre.',
        TRUE
    ),
    (
        'OBJETOS',
        'Bingo de Figuras y Objetos',
        5,
        5,
        TRUE,
        75,
        'Modalidad didáctica e interactiva con iconos culturales y figuras emblemáticas sobre cuadrícula 5x5 con centro libre.',
        TRUE
    ),
    (
        'CHAPITAS',
        'Bingo de Chapitas Callejero',
        3,
        5,
        FALSE,
        30,
        'Formato rápido y dinámico inspirado en las clásicas chapitas coleccionables, en cuadrícula compacta 3x5.',
        TRUE
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    grid_rows = EXCLUDED.grid_rows,
    grid_cols = EXCLUDED.grid_cols,
    has_free_center = EXCLUDED.has_free_center,
    total_numbers = EXCLUDED.total_numbers,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 5. PARÁMETROS GLOBALES DE LA PLATAFORMA (app_settings)
INSERT INTO public.app_settings (key, value, description, is_public) VALUES
    ('platform_phase', '{"phase": 1, "status": "TEST_MODE", "real_money_enabled": false}'::jsonb, 'Estado actual del proyecto en Fase 1: Modo de pruebas sin dinero real', TRUE),
    ('supported_currencies', '["VES", "USD"]'::jsonb, 'Monedas proyectadas para fases financieras', TRUE),
    ('responsible_gaming_limits', '{"min_age": 18, "mandatory_self_exclusion": true}'::jsonb, 'Parámetros de cumplimiento y juego responsable', TRUE)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    is_public = EXCLUDED.is_public;
