# Arquitectura de Idempotencia y Mitigación de Duplicados — Bingo Club VNZLA Online

## 1. Objetivo y Principio
En entornos de red móviles (como las redes venezolanas 3G/4G/WiFi), las desconexiones temporales pueden provocar reintentos automáticos de peticiones HTTP.
**Principio**: Ninguna operación crítica que mute balances, emita cartones, declare premios o valide pagos puede ejecutarse dos veces por causa de un reintento accidental.

---

## 2. Componentes del Protocolo de Idempotencia

### 2.1 Encabezado y Clave de Idempotencia
- Todas las peticiones mutacionales deben incluir:
  ```http
  X-Idempotency-Key: <UUIDv4_or_deterministic_hash>
  ```
- Ejemplo de generación en cliente:
  ```typescript
  const idempotencyKey = crypto.randomUUID();
  ```

### 2.2 Ciclo de Vida de una Operación Idempotente
1. **Recepción**: El endpoint/RPC en PostgreSQL recibe la clave de idempotencia.
2. **Búsqueda Atómica**: Se consulta la existencia de la clave en la tabla correspondiente (`payment_requests`, `wallet_transactions`, `cards`).
3. **Casos**:
   - **No existe**: Se procesa la transacción dentro de un bloque `BEGIN ... COMMIT` y se persiste la clave con el resultado.
   - **Existe y está en estado `SETTLED` / `APPROVED`**: Se retorna inmediatamente la respuesta previa sin volver a debitar ni acreditar fondos (código HTTP 200 OK con encabezado `X-Idempotent-Replay: true`).
   - **Existe y está en estado `PENDING`**: Se rechaza la ejecución paralela (`409 Conflict: Operación en proceso`), evitando condiciones de carrera.

---

## 3. Matriz de Operaciones Protegidas con Idempotencia

| Operación Crítica | Tabla Afectada | Columna con Constraint UNIQUE | Estrategia de Idempotencia |
| :--- | :--- | :--- | :--- |
| **Solicitud de Recarga (Pago Móvil / Binance)** | `payment_requests` | `idempotency_key` | Unicidad por referencia bancaria + ID de usuario. |
| **Acreditación de Saldo (Ledger)** | `wallet_transactions` | `idempotency_key` | Inserción atómica en ledger con cálculo de hash anterior. |
| **Emisión de Cartón** | `cards` | `(draw_id, card_serial)` | Serial único por sorteo. Clave única de compra. |
| **Reclamo de Premio (Bingo / Línea)** | `winners` | `(draw_id, prize_id, card_id)` | Constraint único: un premio específico solo puede otorgarse una vez por cartón verificado. |
| **Retiro de Fondos** | `payment_requests` | `idempotency_key` | Bloqueo de fondos atómico (`balance_locked`) con deducción irrevocable solo al liquidarse. |
| **Acción Resolutiva de Operador** | `operator_actions` | `(operator_id, target_entity, target_id, action_type)` | Prevención de resolución duplicada de incidencias. |
