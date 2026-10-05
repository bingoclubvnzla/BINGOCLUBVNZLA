# Guía de Despliegue — Bingo Club VNZLA Online

## 1. Despliegue en Vercel
1. Conecte el repositorio oficial de GitHub a su proyecto en [Vercel](https://vercel.com).
2. Configure el Framework Preset: `Vite`.
3. Verifique el directorio de salida: `dist`.
4. Configure las Variables de Entorno en el panel de Vercel:
   - `VITE_SUPABASE_URL`: La URL pública de su proyecto de Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: La clave anónima (`anon key`) pública de Supabase.
5. Los encabezados de seguridad y el reescrito SPA para React Router se encuentran preconfigurados en `vercel.json`.

## 2. Aplicación de Migraciones en Supabase
1. Instale la CLI de Supabase o ingrese al SQL Editor de su proyecto de Supabase.
2. Ejecute las migraciones en orden secuencial:
   - `supabase/migrations/20261005000000_initial_schema.sql`
   - `supabase/migrations/20261005000001_rls_policies.sql`
   - `supabase/migrations/20261005000002_security_hardening.sql`
   - `supabase/migrations/20261005000003_draw_engine.sql`
3. Ejecute el archivo de inicialización de catálogo:
   - `supabase/seed/seed.sql`
4. Verifique que Row Level Security (RLS) quede activo en todas las tablas mediante:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```
