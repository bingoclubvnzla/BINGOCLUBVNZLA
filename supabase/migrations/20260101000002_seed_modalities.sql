-- =============================================================================
-- BINGO CLUB VNZLA ONLINE - FASE 1: FUNDACIÓN
-- Migration: 20260101000002_seed_modalities.sql
-- Description: Seed Roles, Permissions, Game Modalities and Initial Settings
-- Author: Bingo Club Vnzla Core Engineering Team
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED ROLES
-- -----------------------------------------------------------------------------

INSERT INTO public.roles (name, description, hierarchy_level) VALUES
    ('PLAYER', 'Jugador regular con acceso a salas, compra de cartones y seguimiento de sorteos.', 1),
    ('OPERATOR', 'Operador de mesa y soporte; verifica recargas y atiende incidencias en salas.', 2),
    ('SUPERVISOR', 'Supervisor de turno; audita operaciones de operadores y salas activas.', 3),
    ('ADMIN', 'Administrador general; gestión de usuarios, salas, modalidades y parámetros.', 4),
    ('SUPER_ADMIN', 'Super Administrador con control total del sistema, auditoría y seguridad.', 5)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    hierarchy_level = EXCLUDED.hierarchy_level;

-- -----------------------------------------------------------------------------
-- 2. SEED PERMISSIONS
-- -----------------------------------------------------------------------------

INSERT INTO public.permissions (id, module, action, description) VALUES
    -- Profile
    ('profile:read:own', 'profile', 'read_own', 'Leer perfil propio y código público'),
    ('profile:update:own', 'profile', 'update_own', 'Actualizar nombre y teléfono propio'),
    ('profile:read:all', 'profile', 'read_all', 'Consultar perfiles de jugadores'),
    ('profile:manage', 'profile', 'manage', 'Suspender o reactivar cuentas de jugadores'),
    -- Games & Draws
    ('draw:read', 'game', 'read', 'Consultar salas y sorteos públicos'),
    ('draw:create', 'game', 'create', 'Programar nuevos sorteos'),
    ('draw:operate', 'game', 'operate', 'Operar cantada de balotas y cambio de estados'),
    ('draw:cancel', 'game', 'cancel', 'Cancelar sorteo por fuerza mayor'),
    -- Cards
    ('card:buy', 'game', 'buy_card', 'Comprar cartones para sorteos futuros'),
    ('card:view:own', 'game', 'view_own_card', 'Ver cartones asignados propios'),
    ('card:audit', 'game', 'audit_card', 'Verificar cartones de cualquier jugador para auditoría'),
    -- Finance (Phase 1 structure, to be enabled in Phase 2)
    ('wallet:view:own', 'finance', 'view_own', 'Consultar estado de billetera propia'),
    ('payment:request', 'finance', 'request', 'Generar solicitud de recarga'),
    ('payment:verify', 'finance', 'verify', 'Verificar y aprobar solicitudes de pago'),
    ('wallet:adjust', 'finance', 'adjust', 'Ajuste manual de saldo auditado por supervisor'),
    -- Audit & Security
    ('audit:read', 'audit', 'read', 'Consultar bitácora de auditoría inmutable'),
    ('system:config', 'system', 'config', 'Modificar configuraciones globales del sistema')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. MAP ROLE PERMISSIONS
-- -----------------------------------------------------------------------------

-- PLAYER
INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('PLAYER', 'profile:read:own'),
    ('PLAYER', 'profile:update:own'),
    ('PLAYER', 'draw:read'),
    ('PLAYER', 'card:buy'),
    ('PLAYER', 'card:view:own'),
    ('PLAYER', 'wallet:view:own'),
    ('PLAYER', 'payment:request')
ON CONFLICT DO NOTHING;

-- OPERATOR
INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('OPERATOR', 'profile:read:own'),
    ('OPERATOR', 'profile:read:all'),
    ('OPERATOR', 'draw:read'),
    ('OPERATOR', 'draw:operate'),
    ('OPERATOR', 'card:audit'),
    ('OPERATOR', 'payment:verify')
ON CONFLICT DO NOTHING;

-- SUPERVISOR
INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('SUPERVISOR', 'profile:read:all'),
    ('SUPERVISOR', 'draw:create'),
    ('SUPERVISOR', 'draw:operate'),
    ('SUPERVISOR', 'draw:cancel'),
    ('SUPERVISOR', 'card:audit'),
    ('SUPERVISOR', 'payment:verify'),
    ('SUPERVISOR', 'audit:read')
ON CONFLICT DO NOTHING;

-- ADMIN & SUPER_ADMIN (All permissions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'ADMIN'::public.user_role, id FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'SUPER_ADMIN'::public.user_role, id FROM public.permissions
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. SEED GAME MODALITIES
-- -----------------------------------------------------------------------------

INSERT INTO public.game_modalities (
    code,
    name,
    description,
    grid_rows,
    grid_cols,
    has_free_center,
    total_numbers,
    rules,
    is_active
) VALUES
(
    'BINGO_75',
    'Bingo 75 Clásico',
    'El tradicional bingo americano de 75 balotas. Cuadrícula de 5x5 con el espacio central libre marcado como BCV.',
    5,
    5,
    TRUE,
    75,
    '{
        "columns": {
            "B": [1, 15],
            "I": [16, 30],
            "N": [31, 45],
            "G": [46, 60],
            "O": [61, 75]
        },
        "free_center_position": [2, 2],
        "winning_patterns": ["LINEA_HORIZONTAL", "LINEA_VERTICAL", "DIAGONAL", "CUATRO_ESQUINAS", "CARTON_LLENO"],
        "max_balls": 75
    }'::jsonb,
    TRUE
),
(
    'BINGO_90',
    'Bingo 90 Español',
    'Modalidad europea tradicional de 90 balotas. Cartón rectangular de 3 filas y 9 columnas, con 5 números y 4 espacios vacíos por fila (15 números en total).',
    3,
    9,
    FALSE,
    90,
    '{
        "rows": 3,
        "cols": 9,
        "numbers_per_row": 5,
        "total_numbers_on_card": 15,
        "winning_patterns": ["LINEA", "DOBLE_LINEA", "BINGO_PLENO"],
        "max_balls": 90
    }'::jsonb,
    TRUE
),
(
    'ANIMALITOS',
    'Bingo Animalitos Vnzla',
    'Modalidad venezolana inspirada en la tradicional ruleta de 38 animalitos (Delfín 0, Ballena 00, Carnero 1, Toro 2, Ciempiés 3, Alacrán 4... hasta Chivo 36). Cuadrícula 5x5 con centro libre.',
    5,
    5,
    TRUE,
    38,
    '{
        "theme": "ANIMALITOS_VENEZUELA",
        "total_animals": 38,
        "animals": [
            {"num": 0, "name": "Delfín", "emoji": "🐬"},
            {"num": "00", "name": "Ballena", "emoji": "🐋"},
            {"num": 1, "name": "Carnero", "emoji": "🐏"},
            {"num": 2, "name": "Toro", "emoji": "🐂"},
            {"num": 3, "name": "Ciempiés", "emoji": "🐛"},
            {"num": 4, "name": "Alacrán", "emoji": "🦂"},
            {"num": 5, "name": "León", "emoji": "🦁"},
            {"num": 6, "name": "Rana", "emoji": "🐸"},
            {"num": 7, "name": "Perico", "emoji": "🦜"},
            {"num": 8, "name": "Ratón", "emoji": "🐭"},
            {"num": 9, "name": "Águila", "emoji": "🦅"},
            {"num": 10, "name": "Tigre", "emoji": "🐅"},
            {"num": 11, "name": "Gato", "emoji": "🐱"},
            {"num": 12, "name": "Caballo", "emoji": "🐎"},
            {"num": 13, "name": "Mono", "emoji": "🐒"},
            {"num": 14, "name": "Paloma", "emoji": "🕊️"},
            {"num": 15, "name": "Zorro", "emoji": "🦊"},
            {"num": 16, "name": "Oso", "emoji": "🐻"},
            {"num": 17, "name": "Pavo", "emoji": "🦃"},
            {"num": 18, "name": "Burro", "emoji": "🫏"},
            {"num": 19, "name": "Chivo", "emoji": "🐐"},
            {"num": 20, "name": "Cochino", "emoji": "🐷"},
            {"num": 21, "name": "Gallo", "emoji": "🐓"},
            {"num": 22, "name": "Camello", "emoji": "🐫"},
            {"num": 23, "name": "Cebra", "emoji": "🦓"},
            {"num": 24, "name": "Iguana", "emoji": "🦎"},
            {"num": 25, "name": "Gallina", "emoji": "🐔"},
            {"num": 26, "name": "Vaca", "emoji": "🐄"},
            {"num": 27, "name": "Perro", "emoji": "🐕"},
            {"num": 28, "name": "Zamuro", "emoji": "🦅"},
            {"num": 29, "name": "Elefante", "emoji": "🐘"},
            {"num": 30, "name": "Caimán", "emoji": "🐊"},
            {"num": 31, "name": "Lapa", "emoji": "🐹"},
            {"num": 32, "name": "Ardilla", "emoji": "🐿️"},
            {"num": 33, "name": "Pescado", "emoji": "🐟"},
            {"num": 34, "name": "Venado", "emoji": "🦌"},
            {"num": 35, "name": "Jirafa", "emoji": "🦒"},
            {"num": 36, "name": "Culebra", "emoji": "🐍"}
        ],
        "winning_patterns": ["LINEA", "CRUZ", "ESQUINAS", "TABLA_LLENA"]
    }'::jsonb,
    TRUE
),
(
    'OBJETOS',
    'Bingo Objetos Populares',
    'Bingo criollo con símbolos icónicos venezolanos (Arepa, Cuatro, Arpa, Chinchorro, Ávila, Salto Ángel, Orquídea, Turpial, etc.). Cuadrícula de 5x5 con centro libre.',
    5,
    5,
    TRUE,
    40,
    '{
        "theme": "CULTURA_VENEZUELA",
        "total_items": 40,
        "items": [
            {"id": 1, "name": "Arepa", "emoji": "🫓"},
            {"id": 2, "name": "Cuatro Criollo", "emoji": "🎸"},
            {"id": 3, "name": "Arpa Llanera", "emoji": "🎼"},
            {"id": 4, "name": "Maracas", "emoji": "🪇"},
            {"id": 5, "name": "Turpial", "emoji": "🐦"},
            {"id": 6, "name": "Orquídea", "emoji": "🌸"},
            {"id": 7, "name": "Araguaney", "emoji": "🌳"},
            {"id": 8, "name": "El Ávila", "emoji": "⛰️"},
            {"id": 9, "name": "Salto Ángel", "emoji": "🌊"},
            {"id": 10, "name": "Chinchorro", "emoji": "🛋️"},
            {"id": 11, "name": "Papelón con Limón", "emoji": "🥤"},
            {"id": 12, "name": "Hallaca", "emoji": "🫔"},
            {"id": 13, "name": "Cachapa", "emoji": "🥞"},
            {"id": 14, "name": "Queso Telita", "emoji": "🧀"},
            {"id": 15, "name": "Guarura", "emoji": "🐚"},
            {"id": 16, "name": "Sombrero de Cogollo", "emoji": "👒"}
        ],
        "winning_patterns": ["LINEA", "DIAGONAL", "CARTON_LLENO"]
    }'::jsonb,
    TRUE
),
(
    'CHAPITAS',
    'Bingo Chapitas Callejero',
    'Homenaje al popular juego criollo de chapitas. Formato rápido 3x5 (15 números) con dinámicas veloces de cantada.',
    3,
    5,
    FALSE,
    45,
    '{
        "theme": "CHAPITAS",
        "rows": 3,
        "cols": 5,
        "total_numbers_on_card": 15,
        "max_balls": 45,
        "winning_patterns": ["LINEA", "CHAPITA_PLENA"]
    }'::jsonb,
    TRUE
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    grid_rows = EXCLUDED.grid_rows,
    grid_cols = EXCLUDED.grid_cols,
    has_free_center = EXCLUDED.has_free_center,
    total_numbers = EXCLUDED.total_numbers,
    rules = EXCLUDED.rules,
    is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- 5. SEED INITIAL APP SETTINGS (FASE 1 FOUNDATION)
-- -----------------------------------------------------------------------------

INSERT INTO public.app_settings (key, value, description, is_public) VALUES
    ('system_phase', '{"phase": 1, "name": "Fundación Profesional y Segura", "financial_operations_active": false, "mode": "MODO_DE_PRUEBAS"}'::jsonb, 'Estado actual del ciclo de despliegue.', TRUE),
    ('brand_info', '{"title": "BINGO CLUB VNZLA ONLINE", "subtitle": "Bingo Club Venezuela Online", "currency_primary": "VES", "currency_symbol": "Bs."}'::jsonb, 'Metadatos de marca y presentación.', TRUE),
    ('security_policy', '{"server_authoritative": true, "max_login_attempts": 5, "require_email_verification": false, "session_inactivity_minutes": 60}'::jsonb, 'Políticas de seguridad operativa.', FALSE),
    ('responsible_gaming', '{"min_age": 18, "enabled": true, "hotline": "0800-JUEGO-OK", "warning": "El juego es entretenimiento recreativo para mayores de 18 años."}'::jsonb, 'Parámetros de juego responsable.', TRUE)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    is_public = EXCLUDED.is_public;

-- -----------------------------------------------------------------------------
-- 6. SEED INITIAL DEMO ROOMS (ZERO REAL MONEY)
-- -----------------------------------------------------------------------------

INSERT INTO public.game_rooms (modality_code, name, description, card_price_cents, currency, min_players, max_players, is_active) VALUES
    ('BINGO_75', 'Sala Caracas 75 (Pruebas)', 'Sala de demostración en vivo para modalidad 75 bolas.', 0, 'VES', 2, 500, TRUE),
    ('BINGO_90', 'Sala Maracaibo 90 (Pruebas)', 'Sala de demostración en vivo para modalidad 90 bolas clásica.', 0, 'VES', 2, 500, TRUE),
    ('ANIMALITOS', 'Sala Ruleta Llanera (Pruebas)', 'Demostración de los 38 animalitos tradicionales venezolanos.', 0, 'VES', 2, 1000, TRUE),
    ('OBJETOS', 'Sala Criolla (Pruebas)', 'Demostración con objetos e iconografía venezolana.', 0, 'VES', 2, 300, TRUE),
    ('CHAPITAS', 'Sala Rápida Chapitas (Pruebas)', 'Partidas dinámicas 3x5 de alta velocidad.', 0, 'VES', 2, 200, TRUE)
ON CONFLICT DO NOTHING;
