-- ====================================================================
-- SEED DATA: MODALIDADES Y ROLES INICIALES
-- Bingo Club Vnzla Online (Fase 1)
-- ====================================================================

-- 1. ROLES DEL SISTEMA
INSERT INTO public.roles (name, description, hierarchy_level) VALUES
('PLAYER', 'Jugador estándar de la plataforma. Compra de cartones y participación en salas.', 1),
('OPERATOR', 'Operador de sala y soporte técnico. Verificación visual y asistencia.', 2),
('SUPERVISOR', 'Supervisor de turno. Monitoreo de salas, métricas y conciliación operativa.', 3),
('ADMIN', 'Administrador del sistema. Configuración de salas, modalidades y usuarios.', 4),
('SUPER_ADMIN', 'Super Administrador maestro con acceso integral a parámetros críticos.', 5)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, hierarchy_level = EXCLUDED.hierarchy_level;

-- 2. PERMISOS DEL SISTEMA
INSERT INTO public.permissions (id, description, category) VALUES
('room:view', 'Visualizar salas disponibles', 'ROOM'),
('room:join', 'Ingresar a una sala activa', 'ROOM'),
('room:manage', 'Crear y editar salas de juego', 'ROOM'),
('draw:view', 'Visualizar el estado del sorteo', 'DRAW'),
('draw:start', 'Iniciar un sorteo programado', 'DRAW'),
('draw:pause', 'Pausar temporalmente un sorteo activo', 'DRAW'),
('draw:cancel', 'Cancelar sorteo por incidencia', 'DRAW'),
('draw:extract_ball', 'Extraer balota del sorteo', 'DRAW'),
('card:purchase', 'Adquirir cartones para sorteo', 'CARD'),
('card:verify', 'Verificar cartón premiado', 'CARD'),
('user:view_profile', 'Consultar perfil propio', 'USER'),
('user:manage_roles', 'Modificar roles de usuarios', 'SECURITY'),
('audit:read', 'Consultar bitácora de auditoría forense', 'AUDIT'),
('settings:manage', 'Modificar parámetros de plataforma', 'SETTINGS')
ON CONFLICT (id) DO NOTHING;

-- 3. ASIGNACIÓN INICIAL DE PERMISOS A ROLES
INSERT INTO public.role_permissions (role_name, permission_id) VALUES
-- PLAYER
('PLAYER', 'room:view'),
('PLAYER', 'room:join'),
('PLAYER', 'draw:view'),
('PLAYER', 'card:purchase'),
('PLAYER', 'user:view_profile'),
-- OPERATOR
('OPERATOR', 'room:view'),
('OPERATOR', 'room:join'),
('OPERATOR', 'draw:view'),
('OPERATOR', 'card:verify'),
('OPERATOR', 'user:view_profile'),
-- SUPERVISOR
('SUPERVISOR', 'room:view'),
('SUPERVISOR', 'room:join'),
('SUPERVISOR', 'draw:view'),
('SUPERVISOR', 'card:verify'),
('SUPERVISOR', 'audit:read'),
-- ADMIN
('ADMIN', 'room:view'),
('ADMIN', 'room:join'),
('ADMIN', 'room:manage'),
('ADMIN', 'draw:view'),
('ADMIN', 'draw:start'),
('ADMIN', 'draw:pause'),
('ADMIN', 'draw:cancel'),
('ADMIN', 'draw:extract_ball'),
('ADMIN', 'card:verify'),
('ADMIN', 'audit:read'),
('ADMIN', 'settings:manage'),
-- SUPER_ADMIN
('SUPER_ADMIN', 'room:view'),
('SUPER_ADMIN', 'room:join'),
('SUPER_ADMIN', 'room:manage'),
('SUPER_ADMIN', 'draw:view'),
('SUPER_ADMIN', 'draw:start'),
('SUPER_ADMIN', 'draw:pause'),
('SUPER_ADMIN', 'draw:cancel'),
('SUPER_ADMIN', 'draw:extract_ball'),
('SUPER_ADMIN', 'card:verify'),
('SUPER_ADMIN', 'user:manage_roles'),
('SUPER_ADMIN', 'audit:read'),
('SUPER_ADMIN', 'settings:manage')
ON CONFLICT DO NOTHING;

-- 4. MODALIDADES DE JUEGO OFICIALES
INSERT INTO public.game_modalities (
    id,
    name,
    description,
    grid_rows,
    grid_cols,
    has_free_center,
    max_ball_number,
    card_numbers_count,
    pattern_rules,
    is_active
) VALUES
(
    'BINGO_75',
    'Bingo Tradicional 75',
    'Formato clásico internacional americano de 75 balotas con matriz 5x5 y casilla central libre.',
    5,
    5,
    true,
    75,
    24,
    '{"patterns": ["LINEA_HORIZONTAL", "LINEA_VERTICAL", "DIAGONAL", "CUATRO_ESQUINAS", "BINGO_LLENO"]}'::jsonb,
    true
),
(
    'BINGO_90',
    'Bingo 90 Bolas',
    'Formato europeo y latinoamericano dinámico con cartones de 3 filas y 5 números por fila (15 números por cartón) del 1 al 90.',
    3,
    5,
    false,
    90,
    15,
    '{"patterns": ["UNA_LINEA", "DOS_LINEAS", "BINGO_COMPLETO"]}'::jsonb,
    true
),
(
    'ANIMALITOS',
    'Bingo Animalitos Vnzla',
    'Edición temática venezolana inspirada en los animalitos populares (Delfín, Ballena, León, Caballo, etc.) en matriz 5x5 con centro libre.',
    5,
    5,
    true,
    38,
    24,
    '{"patterns": ["LINEA", "CRUZ", "CUATRO_ESQUINAS", "TABLITA_LLENA"]}'::jsonb,
    true
),
(
    'OBJETOS',
    'Bingo de Objetos',
    'Variante temática visual con símbolos tradicionales de festividades e iconografía venezolana en matriz 5x5 con centro libre.',
    5,
    5,
    true,
    50,
    24,
    '{"patterns": ["LINEA", "MARCO", "BINGO_LLENO"]}'::jsonb,
    true
),
(
    'CHAPITAS',
    'Chapitas Rápido',
    'Modalidad ágil comunitaria de 3x5 de alta velocidad inspirada en las tradicionales chapitas callejeras.',
    3,
    5,
    false,
    60,
    15,
    '{"patterns": ["LINEA_EXPRESS", "CHAPITA_PLENA"]}'::jsonb,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    grid_rows = EXCLUDED.grid_rows,
    grid_cols = EXCLUDED.grid_cols,
    has_free_center = EXCLUDED.has_free_center,
    max_ball_number = EXCLUDED.max_ball_number,
    card_numbers_count = EXCLUDED.card_numbers_count,
    pattern_rules = EXCLUDED.pattern_rules,
    is_active = EXCLUDED.is_active;

-- 5. PARÁMETROS GLOBALES
INSERT INTO public.app_settings (key, value, description, is_public) VALUES
('platform_name', '"Bingo Club Vnzla Online"'::jsonb, 'Nombre comercial oficial', true),
('phase', '{"current": 1, "phase_name": "FUNDACION_PROFESIONAL", "real_money_active": false}'::jsonb, 'Estado actual de la fase', true),
('support_contact', '{"email": "soporte@bingoclubvnzla.com", "telegram": "@bingoclubvnzla_bot"}'::jsonb, 'Canales de soporte', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
