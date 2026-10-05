# CERTIFICACIÓN DE SEGURIDAD Y REMEDIACIÓN SECURITY DEFINER
## BINGO CLUB VNZLA ONLINE — FASE 2.6.1
**Proyecto Supabase:** `lfmavupbxfkxuzncfzzs`  
**Endpoint:** `https://lfmavupbxfkxuzncfzzs.supabase.co`  
**Fecha:** Octubre 2026  
**Auditoría:** Arquitectura de Seguridad PostgreSQL & Supabase Database Linter

---

### 1. Diagnóstico del Hallazgo del Database Linter

El analizador estático de base de datos de Supabase (**Database Linter**) detectó dos vulnerabilidades de severidad alta:
1. `anon_security_definer_function_executable`: la función `public.rls_auto_enable()` posee contexto de ejecución `SECURITY DEFINER` y permisos de ejecución concedidos al rol `anon`.
2. `authenticated_security_definer_function_executable`: la función `public.rls_auto_enable()` posee permisos de ejecución concedidos al rol `authenticated`.

**Causa Raíz:**  
En PostgreSQL, cualquier función creada en el esquema `public` otorga por defecto permisos `GRANT EXECUTE TO PUBLIC`. Cuando dicha función está marcada como `SECURITY DEFINER`, PostgREST la expone automáticamente como un endpoint RPC en `/rest/v1/rpc/rls_auto_enable`, permitiendo que usuarios anónimos o clientes sin privilegios eleven privilegios o ejecuten lógica administrativa.

---

### 2. Análisis Forense de Dependencias

Se llevó a cabo una inspección exhaustiva de todo el repositorio:
- **Frontend (`src/`):** 0 referencias a `rls_auto_enable`. Ningún componente, hook o servicio invoca esta función.
- **Edge Functions / Server:** Ningún script de backend depende de esta función.
- **Mecanismo de Row Level Security:** Todas las tablas (17 tablas en total) cuentan con sentencias explícitas `ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;` distribuidas en las migraciones canónicas (`20261005000001_rls_policies.sql`, `20261005000004_modalities_75_catalogs_fix.sql`, `20261005000005_chapitas_90_mapping.sql`).
- **Conclusión:** `public.rls_auto_enable()` es un artefacto de migración huérfano e innecesario en tiempo de ejecución. Su exposición vía Data API viola el Principio de Mínimo Privilegio.

---

### 3. Matriz de Remediación Aplicada

| Objeto / Función | Privilegios Anteriores | Acción de Remediación | Rol Permitido Final | Estado |
|---|---|---|---|---|
| `public.rls_auto_enable()` | `PUBLIC`, `anon`, `authenticated` | `REVOKE ALL` + `DROP EVENT TRIGGER` + `DROP FUNCTION CASCADE` | *Ninguno (Eliminada)* | 🟢 RESUELTO |
| `public.generate_public_id()` | `PUBLIC` por omisión | `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;` | Solo interno (`handle_new_user`) | 🟢 BLINDADO |
| `public.protect_profile_mutations()` | `PUBLIC` por omisión | `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;` | Solo trigger interno | 🟢 BLINDADO |
| `public.validate_draw_state_transition()` | `PUBLIC` por omisión | `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;` | Solo Draw Engine interno | 🟢 BLINDADO |
| `public.generate_draw_permutation()` | `PUBLIC` por omisión | `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;` | Solo Draw Engine interno | 🟢 BLINDADO |
| `public.validate_chapitas_catalog_integrity()` | `PUBLIC` por omisión | `REVOKE EXECUTE ... FROM PUBLIC, anon;` | Administradores / Service Role | 🟢 BLINDADO |
| `public.create_draw_authoritative()` | `authenticated` (con verificación RBAC) | Mantener `REVOKE FROM PUBLIC, anon; GRANT TO authenticated;` | Operadores verificados | 🟢 CONFORME |
| `public.start_draw_authoritative()` | `authenticated` (con verificación RBAC) | Mantener `REVOKE FROM PUBLIC, anon; GRANT TO authenticated;` | Operadores verificados | 🟢 CONFORME |
| `public.emit_next_ball_authoritative()` | `authenticated` (con verificación RBAC) | Mantener `REVOKE FROM PUBLIC, anon; GRANT TO authenticated;` | Operadores verificados | 🟢 CONFORME |
| `public.get_draw_snapshot()` | `anon`, `authenticated` | Mantener lectura pública de estado de sorteo activo | Jugadores y público | 🟢 CONFORME |
| `public.log_auth_event()` | `anon`, `authenticated` | Mantener registro auditado de intentos de autenticación | Clientes web | 🟢 CONFORME |

---

### 4. Archivos Modificados e Incorporados

1. **`supabase/migrations/20261005000007_remediate_rls_auto_enable.sql`**  
   Migración oficial cronológica con desvinculación de triggers, revocación de privilegios, eliminación de la función y ratificación de RLS en las 17 tablas públicas.
2. **`supabase/FULL_SCHEMA_DEPLOY.sql`**  
   Script canónico consolidado para despliegue manual en SQL Editor, sincronizado con la misma lógica defensiva.
3. **`tests/rls_auto_enable_remediation.test.ts`**  
   Suite de pruebas unitarias automatizadas que garantiza la no-exposición de `rls_auto_enable` y la protección de los endpoints RPC.

---

### 5. Certificación de la Suite de Pruebas

- **Pruebas Automatizadas:** 165 tests PASS (0 fallos) en 13 archivos de prueba.
- **Typecheck TypeScript:** `tsc --noEmit` exitoso sin errores (código de salida 0).
- **Compilación Vite:** `vite build` completado exitosamente en 1.02s.
- **Invarianza Funcional:** Las 5 modalidades de juego (Bingo 75, Bingo 90, Animalitos 75, Objetos 75, Chapitas 90), el motor de sorteos Server-Authoritative, Google OAuth y Cloudflare Turnstile permanecen 100% operativos.
