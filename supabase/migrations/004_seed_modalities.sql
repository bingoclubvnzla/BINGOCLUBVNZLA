-- ============================================================================
-- MIGRACIÓN 004 — SEED DEFENSIVO DE MODALIDADES
-- Se ejecuta solo si la tabla está vacía. Idempotente.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.game_modalities LIMIT 1) THEN
        INSERT INTO public.game_modalities (id, name, description, grid_rows, grid_cols, has_free_center, total_balls, config, is_active)
        VALUES
        ('BINGO_75', 'Bingo Tradicional 75 Balotas', 'Modalidad clásica de 75 números con cuadrícula 5x5 y casilla central libre (FREE).', 5, 5, true, 75, jsonb_build_object('type', 'NUMERIC', 'range_start', 1, 'range_end', 75), true),
        ('BINGO_90', 'Bingo 90 Balotas Español', 'Modalidad tradicional de 90 números. Cartón 3x9 con 15 números activos.', 3, 5, false, 90, jsonb_build_object('type', 'NUMERIC', 'range_start', 1, 'range_end', 90), true),
        ('ANIMALITOS', 'Lotto Animalitos Vnzla', 'Modalidad con 38 figuras faunísticas venezolanas en cuadrícula 5x5.', 5, 5, true, 38, jsonb_build_object('type', 'ANIMAL_ICONS', 'total_animals', 38), true),
        ('OBJETOS', 'Bingo de Objetos Criollos', 'Modalidad cultural venezolana con 50 objetos emblemáticos en cuadrícula 5x5.', 5, 5, true, 50, jsonb_build_object('type', 'OBJECT_ICONS', 'total_objects', 50), true),
        ('CHAPITAS', 'Bingo Chapitas Callejero', 'Clásico venezolano con chapitas numeradas del 1 al 60 en formato 3x5.', 3, 5, false, 60, jsonb_build_object('type', 'CHAPITAS_BOTTLECAPS', 'range_start', 1, 'range_end', 60), true)
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
