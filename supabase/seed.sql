-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — SEED DE DATOS OFICIAL (FASE 1)
-- Modalidades oficiales venezolanas y configuración base
-- ==============================================================================

-- 1. MODALIDADES DE JUEGO
INSERT INTO public.game_modalities (
    code,
    name,
    description,
    grid_dimensions,
    has_free_center,
    total_elements,
    rules,
    is_active
) VALUES 
(
    'BINGO_75',
    'Bingo 75 Clásico',
    'Modalidad tradicional americana de 75 balotas con cuadrícula 5x5 y casilla central libre. Letras B-I-N-G-O correspondientes a rangos de 15 números.',
    '5x5',
    true,
    75,
    '{
        "columns": {
            "B": [1, 15],
            "I": [16, 30],
            "N": [31, 45],
            "G": [46, 60],
            "O": [61, 75]
        },
        "patterns_supported": ["LINEA_HORIZONTAL", "LINEA_VERTICAL", "DIAGONAL", "CUATRO_ESQUINAS", "CARTON_LLENO"],
        "free_center_position": [2, 2]
    }'::jsonb,
    true
),
(
    'BINGO_90',
    'Bingo 90 Internacional',
    'Formato de 90 balotas estructurado en cartones de 3 filas por 5 números activos (tiras de 9 columnas con espacios alternados).',
    '3x5',
    false,
    90,
    '{
        "rows": 3,
        "active_numbers_per_row": 5,
        "total_numbers_per_card": 15,
        "patterns_supported": ["UNA_LINEA", "DOS_LINEAS", "BINGO_PLENO"]
    }'::jsonb,
    true
),
(
    'ANIMALITOS',
    'Lotería de Animalitos Criollos',
    'El tradicional juego popular venezolano adaptado a bingo 5x5 con 36 figuras de la fauna nacional (Delfín, Ballena, Carnero, Toro, Tigre, etc.) y centro libre.',
    '5x5',
    true,
    36,
    '{
        "elements_type": "ANIMALITOS_SYMBOLS",
        "total_symbols": 36,
        "free_center_symbol": "CORAZÓN_LLANERO",
        "patterns_supported": ["CRUZ", "ESQUINAS", "TABLA_LLENA"]
    }'::jsonb,
    true
),
(
    'OBJETOS',
    'Bingo Objetos y Tradiciones Vnzla',
    'Cuadrícula 5x5 de iconos de la cultura venezolana (Cuatro, Maracas, Arepa, Orquídea, Turpial, Salto Ángel, Chinchorro) con casilla central libre.',
    '5x5',
    true,
    50,
    '{
        "elements_type": "CULTURAL_ITEMS",
        "total_symbols": 50,
        "free_center_symbol": "TRICOLOR",
        "patterns_supported": ["LINEA", "MARCO", "TABLA_LLENA"]
    }'::jsonb,
    true
),
(
    'CHAPITAS',
    'Chapitas Callejeras 3x5',
    'Dinámica rápida venezolana en matriz 3x5 inspirada en las chapitas populares, con 30 números rápidos y sorteos dinámicos.',
    '3x5',
    false,
    30,
    '{
        "rows": 3,
        "columns": 5,
        "total_numbers": 30,
        "patterns_supported": ["LINEA_RAPIDA", "CHAPITA_PLENA"]
    }'::jsonb,
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    rules = EXCLUDED.rules,
    is_active = EXCLUDED.is_active;

-- 2. CONFIGURACIÓN DEL SISTEMA (FASE 1)
INSERT INTO public.app_settings (key, value, description, is_public) VALUES
(
    'platform_phase',
    '{"phase": 1, "name": "Fundación Profesional y Segura", "real_money_enabled": false, "test_mode": true, "version": "1.0.0"}'::jsonb,
    'Estado operativo de la plataforma. En Fase 1 no hay dinero real activo.',
    true
),
(
    'responsible_gaming_limits',
    '{"min_age": 18, "max_cards_per_draw": 12, "daily_test_draw_limit": 50}'::jsonb,
    'Parámetros de juego responsable y límites de adquisición de cartones en pruebas.',
    true
),
(
    'contact_info',
    '{"support_email": "soporte@bingoclubvnzla.com", "official_domain": "bingoclubvnzla.com", "status_portal": "https://status.bingoclubvnzla.com"}'::jsonb,
    'Canales oficiales de soporte y verificación técnica.',
    true
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    is_public = EXCLUDED.is_public;
