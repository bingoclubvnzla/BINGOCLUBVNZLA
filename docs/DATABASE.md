# Arquitectura de Base de Datos — PostgreSQL / Supabase

## 1. Tablas del Sistema (Fase 1)

### `profiles`
Contiene la información de usuario sincronizada con `auth.users`.
- `id` (UUID, PK) -> referencias `auth.users(id)` ON DELETE CASCADE
- `public_id` (VARCHAR(16), UNIQUE) -> Código seguro `BCV-XXXXXX`
- `full_name` (TEXT)
- `display_name` (TEXT)
- `phone` (TEXT)
- `avatar_url` (TEXT)
- `role` (user_role ENUM: 'PLAYER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN') DEFAULT 'PLAYER'
- `status` (user_status ENUM: 'ACTIVE', 'SUSPENDED', 'BLOCKED') DEFAULT 'ACTIVE'
- `security_level` (INTEGER) DEFAULT 1
- `created_at` (TIMESTAMPTZ) DEFAULT NOW()
- `updated_at` (TIMESTAMPTZ) DEFAULT NOW()

### `audit_logs`
Bitácora forense de operaciones.
- `id` (BIGSERIAL, PK)
- `user_id` (UUID) -> referencias `auth.users(id)`
- `actor_role` (VARCHAR(32))
- `action` (VARCHAR(64))
- `entity_type` (VARCHAR(64))
- `entity_id` (TEXT)
- `ip_hash` (VARCHAR(64))
- `user_agent_hash` (VARCHAR(64))
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ) DEFAULT NOW()

### `app_settings`
Configuraciones globales controladas por administradores.
- `key` (VARCHAR(64), PK)
- `value` (JSONB)
- `description` (TEXT)
- `updated_by` (UUID)
- `updated_at` (TIMESTAMPTZ)

### `game_modalities`
Catálogo oficial de modalidades de juego de bingo:
1. `BINGO_75`: Matriz 5x5 americana, 75 balotas (1 al 75), centro libre ("FREE"), patrones por defecto: Línea y Cartón lleno.
2. `BINGO_90`: Matriz 3x9 europea (15 números por cartón en 3 filas), rango 1 al 90.
3. `ANIMALITOS`: Matriz 5x5 con centro libre, exactamente 75 figuras oficiales de la suerte en rango 1 al 75.
4. `OBJETOS`: Matriz 5x5 con centro libre, exactamente 75 objetos criollos, símbolos patrios e iconos en rango 1 al 75.
5. `CHAPITAS`: Matriz 3x9 tradicional con exactamente 90 números oficiales conformados por 45 referencias a Animalitos y 45 referencias a Objetos Criollos (rango 1 al 90).

### `modality_catalogs`
Catálogo relacional oficial de figuras, objetos y locución Text-to-Speech (TTS):
- `id` (VARCHAR(64), PK): Identificador inmutable (`ani-1` a `ani-75`, `obj-1` a `obj-75`).
- `modality_id` (VARCHAR(32), FK): Referencia a `game_modalities(id)`.
- `number_value` (INTEGER, NOT NULL): Número oficial sorteado por el Draw Engine (1..75).
- `name` (VARCHAR(128)): Nombre oficial legible del animal u objeto criollo.
- `tts_name` (VARCHAR(128)): Nombre fonéticamente normalizado para la locución por voz del cantador.
- `asset_key` (VARCHAR(128)): Clave de recurso gráfico/icono.
- `is_active` (BOOLEAN DEFAULT true).
- `metadata` (JSONB).

### `chapitas_mappings` & `v_chapitas_catalog`
Estructura relacional canónica para la modalidad CHAPITAS (90 números):
- `chapitas_number` (INTEGER, PK): Número en el bombo de Chapitas (1 a 90).
- `source_type` (VARCHAR(16)): 'ANIMAL' (para 1..45) u 'OBJECT' (para 46..90).
- `source_catalog_id` (VARCHAR(64), FK): Referencia estricta a `modality_catalogs(id)`. Reutilización pura sin duplicación.
- `source_number` (INTEGER): Número original en el catálogo de origen (1..75).
- `v_chapitas_catalog`: Vista canónica para resolver número, tipo, nombre, TTS y asset gráfico.
- `validate_chapitas_catalog_integrity()`: Procedimiento almacenado que verifica la integridad exacta de 45 animales + 45 objetos = 90 total.

### `game_rooms`
Salas de juego activas o programadas.

### `draws`
Instancias de sorteos con máquina de estados estricta y control de concurrencia optimista:
`DRAFT` -> `SCHEDULED` -> `READY` -> `ACTIVE` -> `PAUSED` -> `FINISHED` | `CANCELLED` | `ARCHIVED`
- `version` (INTEGER NOT NULL DEFAULT 1): Token de concurrencia optimista para evitar condiciones de carrera entre operadores.
- Transiciones efectuadas atómicamente mediante `public.transition_draw_state_atomic()`.

### `draw_events`
Eventos atómicos de un sorteo (números cantados, pausas, validaciones). Secuencia monotónica estricta `sequence_number` por sorteo.

### `cards` & `card_numbers`
Estructura de cartones emitidos y números asignados por sorteo.
- Trigger `trg_enforce_card_lock`: Bloquea de forma inmutable el serial, layout, usuario y sorteo una vez que el cartón entra en estado `PLAYING`, `WON` o `CANCELLED`.

### `wallets`, `wallet_transactions`, `payment_requests`
Estructura de billetera preparada con constraints y RLS, sin dinero real activo en Fase 1.
- `wallet_transactions.previous_hash` (VARCHAR(64)): Hash SHA-256 de la transacción contable previa para verificación en cadena.
- `wallet_transactions.transaction_hash` (VARCHAR(64)): Hash criptográfico inalterable del asiento contable.
- Constraints de balance: `CHECK (balance_available >= 0)` y `CHECK (balance_locked >= 0)`.

### `operator_actions`
Registro de resoluciones y validaciones efectuadas por operadores.

### `winners` & `prizes`
Estructura autoritativa para el cómputo seguro de premios.

