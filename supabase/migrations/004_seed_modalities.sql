-- ============================================================================
-- MIGRACIÓN 004 — DEFENSIVA (SEED SOLO SI LA TABLA ESTÁ VACÍA)
-- Alineada con el esquema real: id, name, description, grid_rows, grid_cols,
-- has_free_center, total_balls, config, is_active.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.game_modalities LIMIT 1) THEN
        INSERT INTO public.game_modalities (id, name, description, grid_rows, grid_cols, has_free_center, total_balls, config, is_active)
        VALUES
        (
            'BINGO_75',
            'Bingo Tradicional 75 Balotas',
            'Modalidad clásica de 75 números con cuadrícula 5x5 y casilla central libre (FREE).',
            5, 5, true, 75,
            jsonb_build_object(
                'type', 'NUMERIC',
                'range_start', 1,
                'range_end', 75,
                'columns', jsonb_build_object(
                    'B', jsonb_build_object('min', 1,  'max', 15),
                    'I', jsonb_build_object('min', 16, 'max', 30),
                    'N', jsonb_build_object('min', 31, 'max', 45, 'has_free_center', true),
                    'G', jsonb_build_object('min', 46, 'max', 60),
                    'O', jsonb_build_object('min', 61, 'max', 75)
                )
            ),
            true
        ),
        (
            'BINGO_90',
            'Bingo 90 Balotas Español',
            'Modalidad tradicional de 90 números. Cartón 3x9 con 15 números activos.',
            3, 5, false, 90,
            jsonb_build_object(
                'type', 'NUMERIC',
                'range_start', 1,
                'range_end', 90,
                'active_numbers_per_card', 15,
                'numbers_per_row', 5
            ),
            true
        ),
        (
            'ANIMALITOS',
            'Lotto Animalitos Vnzla',
            'Modalidad con 38 figuras faunísticas venezolanas en cuadrícula 5x5.',
            5, 5, true, 38,
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
            true
        ),
        (
            'OBJETOS',
            'Bingo de Objetos Criollos',
            'Modalidad cultural venezolana con 50 objetos emblemáticos en cuadrícula 5x5.',
            5, 5, true, 50,
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
            true
        ),
        (
            'CHAPITAS',
            'Bingo Chapitas Callejero',
            'Clásico venezolano con chapitas numeradas del 1 al 60 en formato 3x5.',
            3, 5, false, 60,
            jsonb_build_object(
                'type', 'CHAPITAS_BOTTLECAPS',
                'range_start', 1,
                'range_end', 60,
                'style', 'RETRO_CROWNCAP'
            ),
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            grid_rows = EXCLUDED.grid_rows,
            grid_cols = EXCLUDED.grid_cols,
            has_free_center = EXCLUDED.has_free_center,
            total_balls = EXCLUDED.total_balls,
            config = EXCLUDED.config,
            is_active = EXCLUDED.is_active;
    END IF;
END $$;
