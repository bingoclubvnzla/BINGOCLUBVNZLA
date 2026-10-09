-- ============================================================================
-- MIGRACIÓN 20260101000000_create_core_schema.sql — DEFENSIVA (NO-OP)
-- El esquema canónico ya fue creado por las migraciones timestamped.
-- Este archivo definía un esquema alternativo con profiles.user_id que
-- NO coincide con el esquema real de producción (profiles.id).
-- Se convierte en no-op para evitar reemplazar funciones canónicas con
-- versiones rotas y crear índices/políticas sobre columnas inexistentes.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '20260101000000_create_core_schema: no-op defensivo. Esquema canónico preservado.';
END $$;
