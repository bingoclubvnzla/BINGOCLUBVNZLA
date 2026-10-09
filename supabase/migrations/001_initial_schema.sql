-- ============================================================================
-- MIGRACIÓN 001 (DEFENSIVA / NO-OP)
-- El esquema canónico fue creado por las migraciones con timestamp.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    RAISE NOTICE '001_initial_schema: Verificación de extensiones completada.';
END $$;
