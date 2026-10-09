-- =====================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1: SEED DE MODALIDADES Y RBAC
-- Migración: 20261001000003_seed_modalities.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SEED DE MODALIDADES DE JUEGO VENEZOLANAS
-- ---------------------------------------------------------------------

INSERT INTO public.game_modalities (
    code,
    name,
    subtitle,
    description,
    grid_rows,
    grid_cols,
    has_free_center,
    total_elements,
    config,
    is_active
) VALUES
(
    'BINGO_75',
    'Bingo 75 Clásico',
    '5x5 con Centro Libre',
    'Modalidad tradicional americana de 75 balotas numeradas. Matriz 5x5 dividida en columnas B (1-15), I (16-30), N (31-45), G (46-60), O (61-75) con casilla central libre.',
    5,
    5,
    true,
    75,
    jsonb_build_object(
        'columns', jsonb_build_object(
            'B', jsonb_build_object('min', 1, 'max', 15),
            'I', jsonb_build_object('min', 16, 'max', 30),
            'N', jsonb_build_object('min', 31, 'max', 45),
            'G', jsonb_build_object('min', 46, 'max', 60),
            'O', jsonb_build_object('min', 61, 'max', 75)
        ),
        'winning_patterns', jsonb_build_array('LINEA', 'CUATRO_ESQUINAS', 'CARTON_LLENO', 'LETRA_X')
    ),
    true
),
(
    'BINGO_90',
    'Bingo 90 Español',
    '3x5 por Línea',
    'Modalidad europea/española de 90 balotas. Cartón de 3 filas y 9 columnas con 5 números por fila (15 números por cartón en total). Premiación por Línea y Bingo Cartón Lleno.',
    3,
    5,
    false,
    90,
    jsonb_build_object(
        'numbers_per_row', 5,
        'total_numbers', 15,
        'number_range', jsonb_build_object('min', 1, 'max', 90),
        'winning_patterns', jsonb_build_array('LINEA', 'CARTON_LLENO')
    ),
    true
),
(
    'ANIMALITOS',
    'Bingo de Animalitos',
    '5x5 Tradición Venezolana',
    'Inspirado en la cultura popular venezolana de lotería de animalitos (Delfín, León, Toro, Ballena, Ciempiés, etc.). Matriz de 5x5 con casilla libre central y 36 figuras icónicas.',
    5,
    5,
    true,
    36,
    jsonb_build_object(
        'roster_size', 36,
        'elements', jsonb_build_array(
            'Delfín (0)', 'Ballena (00)', 'Carnero (1)', 'Toro (2)', 'Ciempiés (3)',
            'Alacrán (4)', 'León (5)', 'Rana (6)', 'Perico (7)', 'Ratón (8)',
            'Águila (9)', 'Tigre (10)', 'Gato (11)', 'Caballo (12)', 'Mono (13)',
            'Paloma (14)', 'Zorro (15)', 'Oso (16)', 'Pavo (17)', 'Burro (18)',
            'Chivo (19)', 'Cochino (20)', 'Gallo (21)', 'Camello (22)', 'Cebra (23)',
            'Iguana (24)', 'Gallina (25)', 'Vaca (26)', 'Perro (27)', 'Zamuro (28)',
            'Elefante (29)', 'Caimán (30)', 'Lapa (31)', 'Ardilla (32)', 'Pescado (33)',
            'Venado (34)'
        ),
        'winning_patterns', jsonb_build_array('LINEA', 'CUATRO_ESQUINAS', 'CARTON_LLENO')
    ),
    true
),
(
    'OBJETOS',
    'Bingo de Objetos Criollos',
    '5x5 Objetos Típicos',
    'Modalidad folclórica venezolana con símbolos representativos como el Cuatro, Las Maracas, El Papagayo, La Arepa, El Sombrero Pelo e Guama y El Chinchorro.',
    5,
    5,
    true,
    50,
    jsonb_build_object(
        'roster_size', 50,
        'winning_patterns', jsonb_build_array('LINEA', 'CRUZ', 'CARTON_LLENO')
    ),
    true
),
(
    'CHAPITAS',
    'Bingo Chapitas Criollo',
    '3x5 Dinámico Venezolano',
    'Clásica modalidad venezolana inspirada en las chapas de botellas tradicionales. 60 elementos en formato dinámico de 3 filas y 5 columnas, ideal para rondas relámpago.',
    3,
    5,
    false,
    60,
    jsonb_build_object(
        'numbers_per_row', 5,
        'total_numbers', 15,
        'number_range', jsonb_build_object('min', 1, 'max', 60),
        'winning_patterns', jsonb_build_array('LINEA', 'CARTON_LLENO')
    ),
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    grid_rows = EXCLUDED.grid_rows,
    grid_cols = EXCLUDED.grid_cols,
    has_free_center = EXCLUDED.has_free_center,
    total_elements = EXCLUDED.total_elements,
    config = EXCLUDED.config,
    is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------
-- 2. SEED DE PERMISOS RBAC DEL SISTEMA
-- ---------------------------------------------------------------------

INSERT INTO public.permissions (code, name, description, category) VALUES
('draw.view', 'Ver Sorteos', 'Permiso para observar salas y sorteos en vivo', 'DRAWS'),
('draw.play', 'Jugar en Sorteos', 'Permiso para comprar cartones y participar', 'DRAWS'),
('draw.manage', 'Gestionar Sorteos', 'Crear, pausar, y controlar flujo de sorteos', 'DRAWS'),
('cards.view_own', 'Ver Cartones Propios', 'Acceso a sus propios cartones comprados', 'CARDS'),
('cards.audit', 'Auditar Cartones', 'Supervisión técnica de cartones en sala', 'CARDS'),
('wallet.view_own', 'Ver Billetera Propia', 'Acceso al saldo y transacciones personales', 'FINANCE'),
('payments.request', 'Solicitar Recargas/Retiros', 'Generar solicitudes vía Pago Móvil / Binance', 'FINANCE'),
('payments.approve', 'Aprobar Pagos', 'Validar y acreditar pagos reportados', 'FINANCE'),
('users.manage', 'Gestionar Usuarios', 'Suspender, verificar o auditar jugadores', 'ADMIN'),
('roles.assign', 'Asignar Roles', 'Modificar privilegios de usuarios', 'ADMIN'),
('audit.view', 'Ver Registros de Auditoría', 'Inspección de logs del sistema', 'SECURITY')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. ASIGNACIÓN MATRIZ ROLES-PERMISOS
-- ---------------------------------------------------------------------

-- PLAYER
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'PLAYER', id FROM public.permissions 
WHERE code IN ('draw.view', 'draw.play', 'cards.view_own', 'wallet.view_own', 'payments.request')
ON CONFLICT DO NOTHING;

-- OPERATOR
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'OPERATOR', id FROM public.permissions 
WHERE code IN ('draw.view', 'draw.play', 'draw.manage', 'cards.view_own', 'cards.audit', 'payments.approve')
ON CONFLICT DO NOTHING;

-- SUPERVISOR
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'SUPERVISOR', id FROM public.permissions 
WHERE code IN ('draw.view', 'draw.manage', 'cards.audit', 'payments.approve', 'users.manage', 'audit.view')
ON CONFLICT DO NOTHING;

-- ADMIN
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM public.permissions 
WHERE code IN ('draw.view', 'draw.manage', 'cards.audit', 'payments.approve', 'users.manage', 'audit.view', 'roles.assign')
ON CONFLICT DO NOTHING;

-- SUPER_ADMIN
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'SUPER_ADMIN', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. CONFIGURACIÓN BASE DE LA PLATAFORMA (app_settings)
-- ---------------------------------------------------------------------
INSERT INTO public.app_settings (key, value, description, is_public) VALUES
(
    'platform_info',
    jsonb_build_object(
        'name', 'BINGO CLUB VNZLA ONLINE',
        'subtitle', 'Bingo Club Venezuela Online',
        'version', '1.0.0-phase1',
        'stage', 'PHASE_1_FOUNDATION',
        'financial_operations_enabled', false,
        'mode', 'TEST_MODE'
    ),
    'Información general de la plataforma y bandera de Fase 1',
    true
),
(
    'responsible_gaming',
    jsonb_build_object(
        'min_age', 18,
        'cooling_off_days', 30,
        'support_helpline', 'soporte@bingoclubvnzla.com'
    ),
    'Directrices obligatorias de juego responsable para mayores de edad',
    true
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    is_public = EXCLUDED.is_public;
