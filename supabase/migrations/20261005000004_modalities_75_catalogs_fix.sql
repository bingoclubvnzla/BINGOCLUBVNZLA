-- ==============================================================================
-- BINGO CLUB VNZLA ONLINE — MIGRACIÓN 04: CORRECCIÓN QUIRÚRGICA DE MODALIDADES Y CATÁLOGOS
-- Fase 2.2: Rango 1-75 para ANIMALITOS y OBJETOS, tabla modality_catalogs y TTS
-- ==============================================================================

-- 1. CREACIÓN DE TABLA: MODALITY_CATALOGS
CREATE TABLE IF NOT EXISTS public.modality_catalogs (
    id VARCHAR(64) PRIMARY KEY,
    modality_id VARCHAR(32) NOT NULL REFERENCES public.game_modalities(id) ON DELETE CASCADE,
    number_value INTEGER NOT NULL CHECK (number_value > 0),
    name VARCHAR(128) NOT NULL,
    tts_name VARCHAR(128) NOT NULL,
    asset_key VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_modality_catalog_number UNIQUE (modality_id, number_value)
);

CREATE INDEX IF NOT EXISTS idx_modality_catalogs_modality ON public.modality_catalogs(modality_id);
CREATE INDEX IF NOT EXISTS idx_modality_catalogs_num ON public.modality_catalogs(modality_id, number_value);

-- RLS: Lectura pública sin permisos de mutación en cliente
ALTER TABLE public.modality_catalogs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read-only modality catalogs" ON public.modality_catalogs
        FOR SELECT TO anon, authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ACTUALIZACIÓN QUIRÚRGICA DE GAME_MODALITIES (ESPECIFICACIÓN OFICIAL 75 ELEMENTOS)
UPDATE public.game_modalities
SET 
    total_balls = 75,
    description = 'Modalidad tradicional de 75 balotas con cartón de 5x5 y casilla central libre.',
    config = jsonb_build_object(
        'column_ranges', jsonb_build_object(
            'B', jsonb_build_array(1, 15),
            'I', jsonb_build_array(16, 30),
            'N', jsonb_build_array(31, 45),
            'G', jsonb_build_array(46, 60),
            'O', jsonb_build_array(61, 75)
        ),
        'winning_patterns', jsonb_build_array('LINE', 'FULL_HOUSE')
    )
WHERE id = 'BINGO_75';

UPDATE public.game_modalities
SET 
    total_balls = 75,
    description = 'Modalidad venezolana oficial basada en los 75 animalitos de la suerte tradicionales. Matriz 5x5 con casilla libre central y rango 1-75.',
    config = jsonb_build_object(
        'theme', 'ANIMALITOS_VENEZUELA',
        'winning_patterns', jsonb_build_array('LINE', 'FULL_HOUSE')
    )
WHERE id = 'ANIMALITOS';

UPDATE public.game_modalities
SET 
    total_balls = 75,
    description = 'Modalidad temática con 75 objetos criollos, símbolos patrios e iconos populares de Venezuela. Matriz 5x5 con centro libre y rango 1-75.',
    config = jsonb_build_object(
        'theme', 'CRIOLLO_VNZLA',
        'winning_patterns', jsonb_build_array('LINE', 'FULL_HOUSE')
    )
WHERE id = 'OBJETOS';

UPDATE public.game_modalities
SET 
    total_balls = 60,
    config = jsonb_build_object(
        'theme', 'CHAPITAS',
        'winning_patterns', jsonb_build_array('LINE', 'FULL_HOUSE')
    )
WHERE id = 'CHAPITAS';

UPDATE public.game_modalities
SET 
    total_balls = 90,
    config = jsonb_build_object(
        'numbers_per_card', 15,
        'numbers_per_row', 5,
        'winning_patterns', jsonb_build_array('ONE_LINE', 'TWO_LINES', 'BINGO')
    )
WHERE id = 'BINGO_90';

-- 3. POBLACIÓN DEL CATÁLOGO OFICIAL: 75 ANIMALITOS (RANGO 1-75)
INSERT INTO public.modality_catalogs (id, modality_id, number_value, name, tts_name, asset_key) VALUES
('ani-1', 'ANIMALITOS', 1, 'Delfín', 'Delfín', 'delfin'),
('ani-2', 'ANIMALITOS', 2, 'Carnero', 'Carnero', 'carnero'),
('ani-3', 'ANIMALITOS', 3, 'Toro', 'Toro', 'toro'),
('ani-4', 'ANIMALITOS', 4, 'Ciempiés', 'Ciempiés', 'ciempies'),
('ani-5', 'ANIMALITOS', 5, 'Alacrán', 'Alacrán', 'alacran'),
('ani-6', 'ANIMALITOS', 6, 'León', 'León', 'leon'),
('ani-7', 'ANIMALITOS', 7, 'Rana', 'Rana', 'rana'),
('ani-8', 'ANIMALITOS', 8, 'Perico', 'Perico', 'perico'),
('ani-9', 'ANIMALITOS', 9, 'Ratón', 'Ratón', 'raton'),
('ani-10', 'ANIMALITOS', 10, 'Águila', 'Águila', 'aguila'),
('ani-11', 'ANIMALITOS', 11, 'Tigre', 'Tigre', 'tigre'),
('ani-12', 'ANIMALITOS', 12, 'Gato', 'Gato', 'gato'),
('ani-13', 'ANIMALITOS', 13, 'Caballo', 'Caballo', 'caballo'),
('ani-14', 'ANIMALITOS', 14, 'Mono', 'Mono', 'mono'),
('ani-15', 'ANIMALITOS', 15, 'Paloma', 'Paloma', 'paloma'),
('ani-16', 'ANIMALITOS', 16, 'Zorro', 'Zorro', 'zorro'),
('ani-17', 'ANIMALITOS', 17, 'Oso', 'Oso', 'oso'),
('ani-18', 'ANIMALITOS', 18, 'Pavo', 'Pavo', 'pavo'),
('ani-19', 'ANIMALITOS', 19, 'Burro', 'Burro', 'burro'),
('ani-20', 'ANIMALITOS', 20, 'Chivo', 'Chivo', 'chivo'),
('ani-21', 'ANIMALITOS', 21, 'Cochino', 'Cochino', 'cochino'),
('ani-22', 'ANIMALITOS', 22, 'Gallo', 'Gallo', 'gallo'),
('ani-23', 'ANIMALITOS', 23, 'Camello', 'Camello', 'camello'),
('ani-24', 'ANIMALITOS', 24, 'Cebra', 'Cebra', 'cebra'),
('ani-25', 'ANIMALITOS', 25, 'Iguana', 'Iguana', 'iguana'),
('ani-26', 'ANIMALITOS', 26, 'Gallina', 'Gallina', 'gallina'),
('ani-27', 'ANIMALITOS', 27, 'Vaca', 'Vaca', 'vaca'),
('ani-28', 'ANIMALITOS', 28, 'Perro', 'Perro', 'perro'),
('ani-29', 'ANIMALITOS', 29, 'Zamuro', 'Zamuro', 'zamuro'),
('ani-30', 'ANIMALITOS', 30, 'Elefante', 'Elefante', 'elefante'),
('ani-31', 'ANIMALITOS', 31, 'Caimán', 'Caimán', 'caiman'),
('ani-32', 'ANIMALITOS', 32, 'Lapa', 'Lapa', 'lapa'),
('ani-33', 'ANIMALITOS', 33, 'Ardilla', 'Ardilla', 'ardilla'),
('ani-34', 'ANIMALITOS', 34, 'Pescado', 'Pescado', 'pescado'),
('ani-35', 'ANIMALITOS', 35, 'Venado', 'Venado', 'venado'),
('ani-36', 'ANIMALITOS', 36, 'Jirafa', 'Jirafa', 'jirafa'),
('ani-37', 'ANIMALITOS', 37, 'Culebra', 'Culebra', 'culebra'),
('ani-38', 'ANIMALITOS', 38, 'Ballena', 'Ballena', 'ballena'),
('ani-39', 'ANIMALITOS', 39, 'Chigüire', 'Chigüire', 'chiguire'),
('ani-40', 'ANIMALITOS', 40, 'Cunaguaro', 'Cunaguaro', 'cunaguaro'),
('ani-41', 'ANIMALITOS', 41, 'Guacamaya', 'Guacamaya', 'guacamaya'),
('ani-42', 'ANIMALITOS', 42, 'Turpial', 'Turpial', 'turpial'),
('ani-43', 'ANIMALITOS', 43, 'Oso Frontino', 'Oso Frontino', 'oso_frontino'),
('ani-44', 'ANIMALITOS', 44, 'Morrocoy', 'Morrocoy', 'morrocoy'),
('ani-45', 'ANIMALITOS', 45, 'Cachicamo', 'Cachicamo', 'cachicamo'),
('ani-46', 'ANIMALITOS', 46, 'Puma', 'Puma', 'puma'),
('ani-47', 'ANIMALITOS', 47, 'Guacharaca', 'Guacharaca', 'guacharaca'),
('ani-48', 'ANIMALITOS', 48, 'Garza Blanca', 'Garza Blanca', 'garza_blanca'),
('ani-49', 'ANIMALITOS', 49, 'Colibrí', 'Colibrí', 'colibri'),
('ani-50', 'ANIMALITOS', 50, 'Puercoespín', 'Puercoespín', 'puercoespin'),
('ani-51', 'ANIMALITOS', 51, 'Tonina', 'Tonina', 'tonina'),
('ani-52', 'ANIMALITOS', 52, 'Babo', 'Babo', 'babo'),
('ani-53', 'ANIMALITOS', 53, 'Chupacabras', 'Chupacabras', 'chupacabras'),
('ani-54', 'ANIMALITOS', 54, 'Rabipelado', 'Rabipelado', 'rabipelado'),
('ani-55', 'ANIMALITOS', 55, 'Perezoso', 'Perezoso', 'perezoso'),
('ani-56', 'ANIMALITOS', 56, 'Tucán', 'Tucán', 'tucan'),
('ani-57', 'ANIMALITOS', 57, 'Picaflor', 'Picaflor', 'picaflor'),
('ani-58', 'ANIMALITOS', 58, 'Araguato', 'Araguato', 'araguato'),
('ani-59', 'ANIMALITOS', 59, 'Manatí', 'Manatí', 'manati'),
('ani-60', 'ANIMALITOS', 60, 'Pavón', 'Pavón', 'pavon'),
('ani-61', 'ANIMALITOS', 61, 'Bagre', 'Bagre', 'bagre'),
('ani-62', 'ANIMALITOS', 62, 'Pavita', 'Pavita', 'pavita'),
('ani-63', 'ANIMALITOS', 63, 'Picure', 'Picure', 'picure'),
('ani-64', 'ANIMALITOS', 64, 'Guabina', 'Guabina', 'guabina'),
('ani-65', 'ANIMALITOS', 65, 'Gavilán', 'Gavilán', 'gavilan'),
('ani-66', 'ANIMALITOS', 66, 'Koala', 'Koala', 'koala'),
('ani-67', 'ANIMALITOS', 67, 'Canguro', 'Canguro', 'canguro'),
('ani-68', 'ANIMALITOS', 68, 'Lobo', 'Lobo', 'lobo'),
('ani-69', 'ANIMALITOS', 69, 'Rinoceronte', 'Rinoceronte', 'rinoceronte'),
('ani-70', 'ANIMALITOS', 70, 'Hipopótamo', 'Hipopótamo', 'hipopotamo'),
('ani-71', 'ANIMALITOS', 71, 'Foca', 'Foca', 'foca'),
('ani-72', 'ANIMALITOS', 72, 'Pingüino', 'Pingüino', 'pinguino'),
('ani-73', 'ANIMALITOS', 73, 'Cernícalo', 'Cernícalo', 'cernicalo'),
('ani-74', 'ANIMALITOS', 74, 'Flamenco', 'Flamenco', 'flamenco'),
('ani-75', 'ANIMALITOS', 75, 'Jaguar', 'Jaguar', 'jaguar')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tts_name = EXCLUDED.tts_name,
    asset_key = EXCLUDED.asset_key,
    number_value = EXCLUDED.number_value;

-- 4. POBLACIÓN DEL CATÁLOGO OFICIAL: 75 OBJETOS CRIOLLOS (RANGO 1-75)
INSERT INTO public.modality_catalogs (id, modality_id, number_value, name, tts_name, asset_key) VALUES
('obj-1', 'OBJETOS', 1, 'Cuatro', 'Cuatro Venezolano', 'cuatro'),
('obj-2', 'OBJETOS', 2, 'Maracas', 'Maracas', 'maracas'),
('obj-3', 'OBJETOS', 3, 'Arpa', 'Arpa Llanera', 'arpa'),
('obj-4', 'OBJETOS', 4, 'Arepa', 'Arepa', 'arepa'),
('obj-5', 'OBJETOS', 5, 'Empanada', 'Empanada', 'empanada'),
('obj-6', 'OBJETOS', 6, 'Cachapa', 'Cachapa con Queso de Mano', 'cachapa'),
('obj-7', 'OBJETOS', 7, 'Hallaca', 'Hallaca Navideña', 'hallaca'),
('obj-8', 'OBJETOS', 8, 'Papelón con Limón', 'Papelón con Limón', 'papelon_con_limon'),
('obj-9', 'OBJETOS', 9, 'Chinchorro', 'Chinchorro Llanero', 'chinchorro'),
('obj-10', 'OBJETOS', 10, 'Sombrero de Cogollo', 'Sombrero de Cogollo', 'sombrero_de_cogollo'),
('obj-11', 'OBJETOS', 11, 'Alpargatas', 'Alpargatas Criollas', 'alpargatas'),
('obj-12', 'OBJETOS', 12, 'Tinaja', 'Tinaja de Barro', 'tinaja'),
('obj-13', 'OBJETOS', 13, 'Pilón', 'Pilón de Maíz', 'pilon'),
('obj-14', 'OBJETOS', 14, 'Budare', 'Budare', 'budare'),
('obj-15', 'OBJETOS', 15, 'Totuma', 'Totuma', 'totuma'),
('obj-16', 'OBJETOS', 16, 'Ávila', 'Cerro El Ávila', 'avila'),
('obj-17', 'OBJETOS', 17, 'Salto Ángel', 'Salto Ángel Kerepakupai Vená', 'salto_angel'),
('obj-18', 'OBJETOS', 18, 'Médanos de Coro', 'Médanos de Coro', 'medanos_de_coro'),
('obj-19', 'OBJETOS', 19, 'Puente sobre el Lago', 'Puente sobre el Lago de Maracaibo', 'puente_sobre_el_lago'),
('obj-20', 'OBJETOS', 20, 'Guacamaya', 'Guacamaya Bandera', 'guacamaya'),
('obj-21', 'OBJETOS', 21, 'Turpial', 'Turpial Nacional', 'turpial'),
('obj-22', 'OBJETOS', 22, 'Orquídea', 'Orquídea Flor de Mayo', 'orquidea'),
('obj-23', 'OBJETOS', 23, 'Araguaney', 'Árbol Araguaney', 'araguaney'),
('obj-24', 'OBJETOS', 24, 'Tepuy Roraima', 'Tepuy Monte Roraima', 'tepuy'),
('obj-25', 'OBJETOS', 25, 'Relámpago del Catatumbo', 'Relámpago del Catatumbo', 'relampago_del_catatumbo'),
('obj-26', 'OBJETOS', 26, 'Taladro Petrolero', 'Taladro Petrolero Balancín', 'petroleo'),
('obj-27', 'OBJETOS', 27, 'Cacao de Chuao', 'Cacao de Chuao', 'cacao_de_chuao'),
('obj-28', 'OBJETOS', 28, 'Café de Mérida', 'Café de Mérida', 'cafe_de_merida'),
('obj-29', 'OBJETOS', 29, 'Cocuy de Lara', 'Cocuy de Lara', 'cocuy_de_lara'),
('obj-30', 'OBJETOS', 30, 'Ron Venezolano', 'Ron Añejo Venezolano', 'ron_venezolano'),
('obj-31', 'OBJETOS', 31, 'Papagayo', 'Papagayo', 'papagayo'),
('obj-32', 'OBJETOS', 32, 'Trompo', 'Trompo de Madera', 'trompo'),
('obj-33', 'OBJETOS', 33, 'Metras', 'Metras de Vidrio', 'metras'),
('obj-34', 'OBJETOS', 34, 'Perinola', 'Perinola Criolla', 'perinola'),
('obj-35', 'OBJETOS', 35, 'Gurrufío', 'Gurrufío Tradicional', 'gurrufio'),
('obj-36', 'OBJETOS', 36, 'Yoyo', 'Yoyo de Madera', 'yoyo'),
('obj-37', 'OBJETOS', 37, 'Camión de Estacas', 'Camión de Estacas Llanero', 'camion_de_estacas'),
('obj-38', 'OBJETOS', 38, 'Autobús Encava', 'Autobús Encava', 'autobus_encava'),
('obj-39', 'OBJETOS', 39, 'Carrito por Puesto', 'Carrito por Puesto', 'carrito_por_puesto'),
('obj-40', 'OBJETOS', 40, 'Metro de Caracas', 'Metro de Caracas', 'metro_de_caracas'),
('obj-41', 'OBJETOS', 41, 'Plaza Bolívar', 'Plaza Bolívar', 'plaza_bolivar'),
('obj-42', 'OBJETOS', 42, 'Panteón Nacional', 'Panteón Nacional', 'panteon_nacional'),
('obj-43', 'OBJETOS', 43, 'Campanario Colonial', 'Campanario Colonial', 'campanario'),
('obj-44', 'OBJETOS', 44, 'Cruz de Mayo', 'Cruz de Mayo Vestida', 'cruz_de_mayo'),
('obj-45', 'OBJETOS', 45, 'Diablos Danzantes', 'Máscara de Diablos Danzantes de Yare', 'diablos_danzantes'),
('obj-46', 'OBJETOS', 46, 'Tambores de San Juan', 'Tambor Mina de Barlovento', 'tambores_de_san_juan'),
('obj-47', 'OBJETOS', 47, 'Parranda Navideña', 'Parranda Navideña', 'parranda_navidena'),
('obj-48', 'OBJETOS', 48, 'Furro de Gaita', 'Furro de Gaita Zuliana', 'gaita_zuliana'),
('obj-49', 'OBJETOS', 49, 'Charrasca', 'Charrasca de Metal', 'charrasca'),
('obj-50', 'OBJETOS', 50, 'Liquiliqui', 'Traje Liquiliqui', 'liquiliqui'),
('obj-51', 'OBJETOS', 51, 'Machete Criollo', 'Machete con Vaina', 'machete'),
('obj-52', 'OBJETOS', 52, 'Silla de Montar', 'Silla de Montar Llanera', 'silla_montar'),
('obj-53', 'OBJETOS', 53, 'Taza de Peltre', 'Taza de Peltre Azul', 'taza_peltre'),
('obj-54', 'OBJETOS', 54, 'Cuchara de Palo', 'Cuchara de Palo', 'cuchara_palo'),
('obj-55', 'OBJETOS', 55, 'Rallador de Queso', 'Rallador de Queso Blanco', 'rallador_queso'),
('obj-56', 'OBJETOS', 56, 'Queso de Mano', 'Queso de Mano Guariqueño', 'queso_mano'),
('obj-57', 'OBJETOS', 57, 'Pabellón Criollo', 'Plato de Pabellón Criollo', 'pabellon_criollo'),
('obj-58', 'OBJETOS', 58, 'Asado Negro', 'Asado Negro Caraqueño', 'asado_negro'),
('obj-59', 'OBJETOS', 59, 'Majarete', 'Majarete con Canela', 'majarete'),
('obj-60', 'OBJETOS', 60, 'Dulce de Lechosa', 'Dulce de Lechosa Navideño', 'dulce_lechosa'),
('obj-61', 'OBJETOS', 61, 'Tequeños', 'Tequeños de Queso', 'tequenos'),
('obj-62', 'OBJETOS', 62, 'Golfeado', 'Golfeado con Queso de Mano', 'golfeado'),
('obj-63', 'OBJETOS', 63, 'Pan de Jamón', 'Pan de Jamón Navideño', 'pan_de_jamon'),
('obj-64', 'OBJETOS', 64, 'Chicha Criolla', 'Chicha Criolla con Canela', 'chicha_criolla'),
('obj-65', 'OBJETOS', 65, 'Torta Negra', 'Torta Negra de Navidad', 'torta_negra'),
('obj-66', 'OBJETOS', 66, 'Casabe', 'Torta de Casabe Horneado', 'casabe'),
('obj-67', 'OBJETOS', 67, 'Piragua Fluvial', 'Piragua Fluvial del Orinoco', 'piragua'),
('obj-68', 'OBJETOS', 68, 'Faro de Cabo San Román', 'Faro de Cabo San Román', 'faro_san_roman'),
('obj-69', 'OBJETOS', 69, 'Teleférico Mukumbarí', 'Teleférico Mukumbarí de Mérida', 'teleferico_merida'),
('obj-70', 'OBJETOS', 70, 'Castillo de San Antonio', 'Castillo de San Antonio de la Eminencia', 'castillo_cumana'),
('obj-71', 'OBJETOS', 71, 'Monumento a la Virgen de la Paz', 'Monumento a la Virgen de la Paz', 'monumento_paz'),
('obj-72', 'OBJETOS', 72, 'Perla de Margarita', 'Perla de la Isla de Margarita', 'isla_margarita'),
('obj-73', 'OBJETOS', 73, 'Cayo de Los Roques', 'Cayo de Los Roques', 'los_roques'),
('obj-74', 'OBJETOS', 74, 'Cueva del Guácharo', 'Cueva del Guácharo', 'cueva_guacharo'),
('obj-75', 'OBJETOS', 75, 'Bandera Tricolor', 'Bandera Tricolor Nacional con Ocho Estrellas', 'bandera_venezuela')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tts_name = EXCLUDED.tts_name,
    asset_key = EXCLUDED.asset_key,
    number_value = EXCLUDED.number_value;

-- 5. ACTUALIZACIÓN DE START_DRAW_AUTHORITATIVE (TODAS LAS MODALIDADES INICIAN EN 1)
CREATE OR REPLACE FUNCTION public.start_draw_authoritative(
    p_draw_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_draw RECORD;
    v_modality RECORD;
    v_sequence INTEGER[];
    v_event_hash VARCHAR(64);
BEGIN
    IF NOT public.is_operator_or_higher() THEN
        RAISE EXCEPTION 'Acceso denegado: Solo operadores o administradores pueden iniciar sorteos.';
    END IF;

    -- Bloqueo pesimista de fila
    SELECT * INTO v_draw
    FROM public.draws
    WHERE id = p_draw_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sorteo no encontrado: %', p_draw_id;
    END IF;

    IF v_draw.version != p_expected_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia: El sorteo está en versión %, esperado %', v_draw.version, p_expected_version;
    END IF;

    IF v_draw.status != 'READY' THEN
        RAISE EXCEPTION 'Transición inválida: El sorteo debe estar en estado READY para ser iniciado. Estado actual: %', v_draw.status;
    END IF;

    -- Consultar configuración de la modalidad
    SELECT * INTO v_modality FROM public.game_modalities WHERE id = v_draw.modality_id;

    -- Generar permutación criptográfica oficial CSPRNG una sola vez (rango 1..total_balls)
    v_sequence := public.generate_draw_permutation(v_modality.total_balls, 1);
    v_event_hash := md5(p_draw_id::text || ':1:DRAW_STARTED:' || clock_timestamp()::text);

    -- Actualizar sorteo atómicamente a ACTIVE
    UPDATE public.draws
    SET status = 'ACTIVE',
        version = v_draw.version + 1,
        sequence = v_sequence,
        current_sequence = 0,
        drawn_numbers = '{}',
        started_at = now(),
        updated_at = now()
    WHERE id = p_draw_id;

    -- Registrar evento en draw_events
    INSERT INTO public.draw_events (
        draw_id,
        event_type,
        sequence_number,
        payload,
        previous_event_hash,
        event_hash,
        created_at
    ) VALUES (
        p_draw_id,
        'DRAW_STARTED',
        1,
        jsonb_build_object('modality', v_draw.modality_id, 'total_balls', v_modality.total_balls),
        'GENESIS_DRAW_HASH',
        v_event_hash,
        now()
    );

    -- Registro en auditoría forense inmutable
    INSERT INTO public.audit_logs (
        user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        auth.uid(),
        (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
        'DRAW_STARTED',
        'draws',
        p_draw_id::text,
        jsonb_build_object('public_code', v_draw.public_code, 'version', v_draw.version + 1)
    );

    RETURN jsonb_build_object(
        'success', true,
        'draw_id', p_draw_id,
        'status', 'ACTIVE',
        'version', v_draw.version + 1,
        'total_balls', v_modality.total_balls
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
