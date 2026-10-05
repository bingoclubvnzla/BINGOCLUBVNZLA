# Matriz de Seguridad y Políticas RLS — Bingo Club VNZLA Online

## 1. Principio Fundamental
**El navegador NO es una autoridad.**
Bajo ningún concepto el cliente frontend puede dictaminar o computar:
- Creación o extracción de números de bolos
- Saldo o balances disponibles
- Ganadores de sorteos
- Asignación de cartones
- Modificación de roles o estados de cuenta

## 2. Matriz de Permisos por Rol (RBAC)

| Entidad / Tabla | PLAYER | OPERATOR | SUPERVISOR | ADMIN | SUPER_ADMIN |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` (Propio) | SELECT, UPDATE (nombre/teléfono) | SELECT, UPDATE | SELECT | SELECT | SELECT |
| `profiles` (Ajenos) | DENEGADO | SELECT (básico) | SELECT | SELECT, UPDATE | SELECT, UPDATE |
| `profiles.role` | DENEGADO | DENEGADO | DENEGADO | UPDATE | UPDATE |
| `wallets` (Propia) | SELECT | DENEGADO | DENEGADO | SELECT | SELECT |
| `wallets` (Ajenas) | DENEGADO | DENEGADO | DENEGADO | SELECT | SELECT |
| `game_modalities` | SELECT (público) | SELECT | SELECT | SELECT, UPDATE | ALL |
| `draws` (Sorteos) | SELECT (activos/públicos) | SELECT | SELECT | ALL | ALL |
| `cards` (Cartones) | SELECT (propios) | SELECT (validación) | SELECT | ALL | ALL |
| `audit_logs` | DENEGADO | DENEGADO | SELECT | SELECT | SELECT, INSERT |

## 3. Claves de Idempotencia y Prevención de Replay
En mutaciones críticas (generación de cartones, transacciones financieras en fases posteriores, cambios de estado en sorteos), se requerirá un encabezado o columna `idempotency_key` con índice único para garantizar que peticiones repetidas por desconexión no dupliquen operaciones.

## 4. Auditoría Inmutable (Append-Only)
La tabla `audit_logs` almacena:
- `user_id` (identificador UUID de auth.users)
- `actor_role` (rol al momento de la acción)
- `action` (e.g., `USER_LOGIN`, `PROFILE_UPDATED`, `ROLE_CHANGED`)
- `entity_type` (tabla o recurso afectado)
- `entity_id` (identificador del registro afectado)
- `ip_hash` (resumen criptográfico unidireccional SHA-256 de la IP)
- `user_agent_hash` (resumen criptográfico del navegador)
- `metadata` (JSONB con cambios antes/después, excluyendo secretos)
- `created_at` (marca de tiempo inmutable del servidor)

**Protección contra alteración**: El disparador `trg_audit_logs_immutable` bloquea y rechaza cualquier sentencia `UPDATE` o `DELETE` a nivel de motor de PostgreSQL.

## 5. Blindaje de Funciones SECURITY DEFINER (Search Path Hijacking)
Todas las funciones PostgreSQL con privilegios elevados (`handle_new_user`, `protect_profile_mutations`, `current_user_role`, `is_admin`, `is_operator_or_higher`, `transition_draw_state_atomic`) declaran obligatoriamente:
```sql
SET search_path = public, pg_temp;
```
Esto previene escalamiento de privilegios por inyección de esquemas maliciosos en la sesión del invocador.

## 6. Supabase Storage: Política de Comprobantes de Pago
- **Bucket**: `payment-receipts` (Privado, `public = false`).
- **Restricciones MIME**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- **Tamaño Máximo de Archivo**: 5 MB por archivo.
- **Políticas RLS en Storage**:
  - `storage.objects SELECT`: El titular del comprobante (`owner = auth.uid()`) o usuarios con rol `OPERATOR`, `SUPERVISOR`, `ADMIN`.
  - `storage.objects INSERT`: El titular autenticado con ruta prefijada `receipts/{auth.uid()}/{random_uuid}.{ext}`.
  - `storage.objects UPDATE / DELETE`: Denegado. Los comprobantes consignados no pueden ser borrados por el jugador.

## 7. Políticas de Rate Limiting y Protección DoS
- **Autenticación (Login / Registro / Reset)**: Máximo 5 solicitudes por minuto por IP/cuenta (restringido por Supabase Auth).
- **Emisión de Solicitudes de Pago**: Máximo 3 solicitudes pendientes simultáneas por usuario.
- **Reclamo de Cartones en Sorteo**: Validación de un reclamo por cartón cada 3 segundos para evitar saturación de Edge Functions.
