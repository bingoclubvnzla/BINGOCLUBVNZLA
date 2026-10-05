# Matriz de Autorización Exhaustiva (RBAC & RLS) — Bingo Club VNZLA Online

## 1. Principio Fundamental
**El navegador NO es una autoridad.** Ninguna decisión de acceso se toma exclusivamente en JavaScript. Toda restricción está respaldada por políticas PostgreSQL Row Level Security (RLS) y funciones `SECURITY DEFINER` con `search_path` protegido.

---

## 2. Matriz de Operaciones por Tabla y Rol

| Tabla Pública | Operación | PLAYER | OPERATOR | SUPERVISOR | ADMIN | SUPER_ADMIN | Justificación de Seguridad |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`profiles`** | SELECT | Propio | Sí | Sí | Sí | Sí | Aislamiento de privacidad. Jugadores no leen otros perfiles. |
| | INSERT | Auto (Trg) | Denegado | Denegado | Sí | Sí | Generación automática vinculada a `auth.users`. |
| | UPDATE | Parcial (Info) | Denegado | Denegado | Sí | Sí | Triggers prohíben cambiar `role`, `status` o `public_id`. |
| | DELETE | Denegado | Denegado | Denegado | Denegado | Sí | Borrado solo bajo auditoría formal de SUPER_ADMIN. |
| **`audit_logs`** | SELECT | Denegado | Denegado | Sí | Sí | Sí | Bitácora confidencial para fiscalización. |
| | INSERT | Autenticado* | Autenticado* | Sí | Sí | Sí | *Solo eventos propios verificados por trigger (`append-only`). |
| | UPDATE | Denegado | Denegado | Denegado | Denegado | Denegado | **Inmutabilidad absoluta**. Disparador rechaza mutaciones. |
| | DELETE | Denegado | Denegado | Denegado | Denegado | Denegado | **Inmutabilidad absoluta**. Disparador rechaza eliminación. |
| **`app_settings`** | SELECT | Sí (Público) | Sí | Sí | Sí | Sí | Parámetros globales y advertencias de fase. |
| | INSERT/UPDATE/DELETE | Denegado | Denegado | Denegado | Sí | Sí | Control maestro exclusivo de administradores. |
| **`game_modalities`** | SELECT | Sí (Activas) | Sí | Sí | Sí | Sí | Catálogo normativo oficial (BINGO_75, 90, etc.). |
| | INSERT/UPDATE/DELETE | Denegado | Denegado | Denegado | Sí | Sí | Catálogo protegido contra adulteración. |
| **`game_rooms`** | SELECT | Activas | Sí | Sí | Sí | Sí | Salas visibles para jugadores autenticados. |
| | INSERT/UPDATE/DELETE | Denegado | Denegado | Denegado | Sí | Sí | Apertura de salas autorizada por administración. |
| **`draws`** | SELECT | Activos | Sí | Sí | Sí | Sí | Sorteos visibles tras salir de borrador (`DRAFT`). |
| | INSERT | Denegado | Denegado | Denegado | Sí | Sí | Creación de sorteos en servidor. |
| | UPDATE (Estado) | Denegado | Sí (Controlado) | Sí | Sí | Sí | Ejecutado vía función atómica `transition_draw_state_atomic`. |
| | DELETE | Denegado | Denegado | Denegado | Denegado | Sí | Solo archivado lógico (`ARCHIVED`), nunca borrado físico. |
| **`draw_events`** | SELECT | Sí | Sí | Sí | Sí | Sí | Secuencia monotónica de balotas cantadas en tiempo real. |
| | INSERT | Denegado | Sí (Turno) | Sí | Sí | Sí | Solo el motor o el operador autorizado emite eventos. |
| | UPDATE/DELETE | Denegado | Denegado | Denegado | Denegado | Denegado | Los eventos de tómbola son inmutables. |
| **`cards`** | SELECT | Propios | Sí (Revisión) | Sí | Sí | Sí | Un jugador jamás ve cartones de otros jugadores. |
| | INSERT | Motor / Propio | Denegado | Denegado | Sí | Sí | Emisión controlada por cuota y sorteo activo. |
| | UPDATE | Denegado | Denegado | Denegado | Denegado | Denegado | Bloqueados tras entrar en estado `PLAYING`. |
| | DELETE | Denegado | Denegado | Denegado | Denegado | Denegado | Prohibida la eliminación de cartones en sorteos. |
| **`card_numbers`** | SELECT | Propios | Sí | Sí | Sí | Sí | Números de celdas por cartón. |
| | INSERT/UPDATE/DELETE | Denegado* | Denegado | Denegado | Motor | Motor | *Marcado validado por motor del sorteo. |
| **`wallets`** | SELECT | Propia | Denegado | Denegado | Sí | Sí | Confidencialidad financiera estricta. |
| | INSERT/UPDATE/DELETE | Denegado | Denegado | Denegado | Denegado | Denegado | **Solo funciones atómicas SECURITY DEFINER**. |
| **`wallet_transactions`** | SELECT | Propias | Denegado | Denegado | Sí | Sí | Ledger inmutable de movimientos. |
| | INSERT/UPDATE/DELETE | Denegado | Denegado | Denegado | Denegado | Denegado | **Cliente NUNCA inserta transacciones**. Solo el ledger. |
| **`payment_requests`** | SELECT | Propios | Sí (Revisión) | Sí | Sí | Sí | Solicitudes de recarga / retiro. |
| | INSERT | Propios | Denegado | Denegado | Denegado | Denegado | Jugador crea solicitud con idempotency_key. |
| | UPDATE | Denegado | Sí (Conciliar) | Sí | Sí | Sí | Operador aprueba o rechaza con registro en auditoría. |
| | DELETE | Denegado | Denegado | Denegado | Denegado | Denegado | Prohibido borrar comprobantes. |
| **`prizes` & `winners`** | SELECT | Sí | Sí | Sí | Sí | Sí | Transparencia pública de ganadores oficiales. |
| | INSERT/UPDATE/DELETE | Denegado | Denegado | Denegado | Motor/Admin | Motor/Admin | Declaración exclusiva del motor validador en servidor. |
| **`operator_actions`** | SELECT | Denegado | Sí | Sí | Sí | Sí | Bitácora de resoluciones de soporte. |
| | INSERT | Denegado | Sí (Propio) | Sí | Sí | Sí | Requiere firma de identidad del operador. |
