-- ============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 004: SEMILLA DE MODALIDADES DE JUEGO
-- FASE 1: 5 MODALIDADES OFICIALES CON ESPECIFICACIÓN TÉCNICA
-- ============================================================================

INSERT INTO public.game_modalities (
    code,
    name,
    description,
    grid_rows,
    grid_cols,
    has_free_center,
    total_elements,
    elements_pool,
    is_active,
    rules_summary
) VALUES 
(
    'BINGO_75',
    'Bingo Tradicional 75 Balotas',
    'Modalidad clásica de 75 números con cuadrícula 5x5 y casilla central libre (FREE). Cartones estructurados bajo las letras B-I-N-G-O.',
    5,
    5,
    true,
    75,
    jsonb_build_object(
        'type', 'NUMERIC',
        'range_start', 1,
        'range_end', 75,
        'columns', jsonb_build_object(
            'B', jsonb_build_object('min', 1, 'max', 15),
            'I', jsonb_build_object('min', 16, 'max', 30),
            'N', jsonb_build_object('min', 31, 'max', 45, 'has_free_center', true),
            'G', jsonb_build_object('min', 46, 'max', 60),
            'O', jsonb_build_object('min', 61, 'max', 75)
        )
    ),
    true,
    'Cuadrícula 5x5 con centro libre. Gana la primera persona en completar la modalidad cantada (Línea Horizontal, Vertical, Diagonal, 4 Esquinas o Cartón Lleno).'
),
(
    'BINGO_90',
    'Bingo 90 Balotas Español',
    'Modalidad tradicional de 90 números. Cartón de 3 filas por 9 columnas (3x5 números activos por cartón con espacios en blanco intercalados).',
    3,
    5,
    false,
    90,
    jsonb_build_object(
        'type', 'NUMERIC',
        'range_start', 1,
        'range_end', 90,
        'active_numbers_per_card', 15,
        'numbers_per_row', 5
    ),
    true,
    'Cuadrícula 3x5 de números activos por tira. Premios escalonados por Línea (5 números en una fila) y Bingo (los 15 números del cartón).'
),
(
    'ANIMALITOS',
    'Lotto Animalitos Vnzla',
    'Modalidad inspirada en la tradición venezolana con 38 figuras faunísticas icónicas (Delfín, Ballena, Carnero, Toro, Caimán, etc.) en cuadrícula 5x5 con centro libre.',
    5,
    5,
    true,
    38,
    jsonb_build_object(
        'type', 'ANIMAL_ICONS',
        'total_animals', 38,
        'catalog', jsonb_build_array(
            '00-Delfín', '0-Ballena', '1-Carnero', '2-Toro', '3-Ciempiés',
            '4-Alacrán', '5-León', '6-Rana', '7-Perico', '8-Ratón',
            '9-Águila', '10-Tigre', '11-Gato', '12-Caballo', '13-Mono',
            '14-Paloma', '15-Zorro', '16-Oso', '17-Pavo', '18-Burro',
            '19-Chivo', '20-Cochino', '21-Gallo', '22-Camello', '23-Cebra',
            '24-Iguana', '25-Gallina', '26-Vaca', '27-Perro', '28-Zamuro',
            '29-Elefante', '30-Caimán', '31-Lapa', '32-Ardilla', '33-Pescado',
            '34-Venado', '35-Jirafa', '36-Culebra'
        )
    ),
    true,
    'Cuadrícula 5x5 con casilla libre central. Extracción en tiempo real de ruleta de animalitos. Gana por línea o cartón completo con figuras coincidentes.'
),
(
    'OBJETOS',
    'Bingo de Objetos Criollos',
    'Modalidad cultural venezolana con 50 objetos emblemáticos de la cotidianidad (Cuatro, Maracas, Arepa, Chinchorro, Alpargata, Sombrero, Tinaja) en cuadrícula 5x5 con centro libre.',
    5,
    5,
    true,
    50,
    jsonb_build_object(
        'type', 'OBJECT_ICONS',
        'total_objects', 50,
        'catalog', jsonb_build_array(
            'Arepa', 'Cuatro', 'Maracas', 'Chinchorro', 'Alpargatas',
            'Sombrero Cogollo', 'Tinaja', 'Pilón', 'Cocorote', 'Buda',
            'Mata de Plátano', 'Pabellón', 'Papelón con Limón', 'Hallaca',
            'Arpa', 'Tambor Chimbánguele', 'Budare', 'Totuma', 'Canoa'
        )
    ),
    true,
    'Cuadrícula 5x5 con casilla libre de identidad criolla. Fácil reconocimiento visual para juego familiar y partidas rápidas.'
),
(
    'CHAPITAS',
    'Bingo Chapitas Callejero',
    'Inspirado en el clásico juego callejero venezolano de chapitas de refresco/malta numeradas del 1 al 60 en formato dinámico y compacto de 3x5 casillas sin centro libre.',
    3,
    5,
    false,
    60,
    jsonb_build_object(
        'type', 'CHAPITAS_BOTTLECAPS',
        'range_start', 1,
        'range_end', 60,
        'style', 'RETRO_CROWNCAP'
    ),
    true,
    'Cuadrícula compacta 3x5 de 15 chapitas. Modalidad rápida y trepidante de alta frecuencia de extracción. Premios por Fila de Chapas y Llena Total.'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    grid_rows = EXCLUDED.grid_rows,
    grid_cols = EXCLUDED.grid_cols,
    has_free_center = EXCLUDED.has_free_center,
    total_elements = EXCLUDED.total_elements,
    elements_pool = EXCLUDED.elements_pool,
    rules_summary = EXCLUDED.rules_summary,
    is_active = EXCLUDED.is_active;
