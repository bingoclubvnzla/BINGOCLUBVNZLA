-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 05: MAPEO OFICIAL CHAPITAS (90 ELEMENTOS)
-- Fase 2.3: 45 Animalitos (1-45) + 45 Objetos (46-90), Vista y Validación de Integridad
-- ==============================================================================

-- 1. ACTUALIZAR CONFIGURACIÓN DE MODALIDADES EN GAME_MODALITIES
UPDATE public.game_modalities
SET 
    grid_rows = 3,
    grid_cols = 9,
    total_balls = 90,
    description = 'Modalidad europea y latinoamericana de 90 números. Cartón de 3 filas y 9 columnas con 15 números por cartón.',
    config = jsonb_build_object(
        'numbers_per_card', 15,
        'numbers_per_row', 5,
        'winning_patterns', jsonb_build_array('ONE_LINE', 'TWO_LINES', 'BINGO')
    )
WHERE id = 'BINGO_90';

UPDATE public.game_modalities
SET 
    grid_rows = 3,
    grid_cols = 9,
    total_balls = 90,
    description = 'Modalidad oficial de 90 números conformada por 45 animalitos y 45 objetos tradicionales venezolanos.',
    config = jsonb_build_object(
        'theme', 'CHAPITAS_45_45',
        'numbers_per_card', 15,
        'numbers_per_row', 5,
        'winning_patterns', jsonb_build_array('ONE_LINE', 'TWO_LINES', 'BINGO')
    )
WHERE id = 'CHAPITAS';

-- 2. TABLA RELACIONAL DE MAPEO PARA CHAPITAS (REUTILIZACIÓN PURA SIN DUPLICACIÓN)
CREATE TABLE IF NOT EXISTS public.chapitas_mappings (
    chapitas_number INTEGER PRIMARY KEY CHECK (chapitas_number BETWEEN 1 AND 90),
    source_type VARCHAR(16) NOT NULL CHECK (source_type IN ('ANIMAL', 'OBJECT')),
    source_catalog_id VARCHAR(64) NOT NULL REFERENCES public.modality_catalogs(id) ON DELETE CASCADE,
    source_number INTEGER NOT NULL CHECK (source_number BETWEEN 1 AND 75),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_chapitas_source UNIQUE (source_type, source_number)
);

CREATE INDEX IF NOT EXISTS idx_chapitas_mappings_catalog ON public.chapitas_mappings(source_catalog_id);
CREATE INDEX IF NOT EXISTS idx_chapitas_mappings_source ON public.chapitas_mappings(source_type, source_number);

-- RLS: Lectura pública protegida
ALTER TABLE public.chapitas_mappings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "chapitas_mappings_select_all" ON public.chapitas_mappings
        FOR SELECT TO anon, authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. VISTA CANÓNICA RESOLUTIVA: V_CHAPITAS_CATALOG
CREATE OR REPLACE VIEW public.v_chapitas_catalog AS
SELECT 
    cm.chapitas_number,
    cm.source_type,
    cm.source_catalog_id,
    cm.source_number,
    mc.name,
    mc.tts_name,
    mc.asset_key,
    mc.is_active
FROM public.chapitas_mappings cm
JOIN public.modality_catalogs mc ON cm.source_catalog_id = mc.id;

-- 4. POBLACIÓN DETERMINISTA Y AUDITABLE DE LOS 45 + 45 DE CHAPITAS
-- 45 animales oficiales (1 al 45 de ANIMALITOS)
INSERT INTO public.chapitas_mappings (chapitas_number, source_type, source_catalog_id, source_number)
SELECT 
    mc.number_value AS chapitas_number,
    'ANIMAL' AS source_type,
    mc.id AS source_catalog_id,
    mc.number_value AS source_number
FROM public.modality_catalogs mc
WHERE mc.modality_id = 'ANIMALITOS' AND mc.number_value BETWEEN 1 AND 45
ON CONFLICT (chapitas_number) DO UPDATE SET
    source_type = EXCLUDED.source_type,
    source_catalog_id = EXCLUDED.source_catalog_id,
    source_number = EXCLUDED.source_number;

-- 45 objetos criollos oficiales (1 al 45 de OBJETOS mapeados a chapitas 46 al 90)
INSERT INTO public.chapitas_mappings (chapitas_number, source_type, source_catalog_id, source_number)
SELECT 
    (mc.number_value + 45) AS chapitas_number,
    'OBJECT' AS source_type,
    mc.id AS source_catalog_id,
    mc.number_value AS source_number
FROM public.modality_catalogs mc
WHERE mc.modality_id = 'OBJETOS' AND mc.number_value BETWEEN 1 AND 45
ON CONFLICT (chapitas_number) DO UPDATE SET
    source_type = EXCLUDED.source_type,
    source_catalog_id = EXCLUDED.source_catalog_id,
    source_number = EXCLUDED.source_number;

-- 5. FUNCIÓN DE INTEGRIDAD CANÓNICA DE CHAPITAS
CREATE OR REPLACE FUNCTION public.validate_chapitas_catalog_integrity()
RETURNS BOOLEAN AS $$
DECLARE
    v_total INTEGER;
    v_animals INTEGER;
    v_objects INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.chapitas_mappings;
    SELECT COUNT(*) INTO v_animals FROM public.chapitas_mappings WHERE source_type = 'ANIMAL';
    SELECT COUNT(*) INTO v_objects FROM public.chapitas_mappings WHERE source_type = 'OBJECT';

    IF v_total <> 90 THEN
        RAISE EXCEPTION 'CHAPITAS debe contener exactamente 90 mapeos, encontrado: %', v_total;
    END IF;

    IF v_animals <> 45 THEN
        RAISE EXCEPTION 'CHAPITAS debe contener exactamente 45 referencias de animales, encontrado: %', v_animals;
    END IF;

    IF v_objects <> 45 THEN
        RAISE EXCEPTION 'CHAPITAS debe contener exactamente 45 referencias de objetos, encontrado: %', v_objects;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
