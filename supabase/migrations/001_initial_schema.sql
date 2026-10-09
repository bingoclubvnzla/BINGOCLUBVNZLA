-- ============================================================================
-- MIGRACIÓN 001 (DEFENSIVA / NO-OP)
-- El esquema canónico fue creado por las migraciones con timestamp:
--   20260101000000_create_core_schema.sql
--   20260101000000_initial_schema.sql
--   20260101000001_security_and_rls.sql
--   20261005000001_initial_schema.sql
-- Este archivo asegura que las extensiones básicas estén activas sin modificar
-- tablas existentes ni generar conflictos de tipos o columnas.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    RAISE NOTICE '001_initial_schema: Verificación de extensiones completada.';
END $$;
