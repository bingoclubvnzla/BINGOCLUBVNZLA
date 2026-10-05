# Estructura de Eventos y Cadena de Integridad (Draw Events) — Bingo Club VNZLA

## 1. Esquema del Evento de Sorteo
Cada emisión y cambio de estado genera un registro inmutable en `draw_events`:

```typescript
interface DrawEvent {
  id: string; // BIGSERIAL / UUID del evento
  draw_id: string; // FK a public.draws(id)
  sequence_number: number; // Secuencia estrictamente monotónica (1, 2, 3...)
  event_type: DrawRealtimeEventType;
  ball_number?: number; // Número de la balota emitida
  payload: Record<string, any>; // Metadatos (letra, nombre de animalito/objeto)
  previous_event_hash: string; // Hash del evento N-1
  event_hash: string; // Hash SHA-256 de este evento
  created_at: string; // Timestamp oficial del servidor
  created_by: 'SERVER_AUTHORITY';
}
```

---

## 2. Secuencia Monotónica Estricta
- El primer evento (`DRAW_STARTED`) tiene `sequence_number = 1`.
- Cada balota cantada (`BALL_DRAWN`) incrementa en exactamente $+1$.
- Se prohíben brechas (ej. $1 \to 3$) o regresiones ($5 \to 4$).
- Un índice de base de datos único `uq_draw_sequence UNIQUE (draw_id, sequence_number)` previene físicamente la existencia de eventos con números duplicados.

---

## 3. Cadena de Integridad Criptográfica (Event Hash Chaining)
Cada evento se vincula criptográficamente al precedente:
$$\text{event\_hash}_N = \text{SHA256}(\text{draw\_id} \parallel \text{seq}_N \parallel \text{type} \parallel \text{payload} \parallel \text{event\_hash}_{N-1} \parallel \text{timestamp})$$

- **Propósito**: Detección de alteración histórica. Si un operador malicioso modificara retroactivamente una balota cantada, todos los hashes subsiguientes se invalidarían de forma demostrable.

---

## 4. Snapshots y Recuperación ante Reconexión y Refresco (F5)
Para garantizar que los jugadores con conexiones móviles inestables no sufran desincronizaciones:
1. Al unirse o reconectarse a una sala, el cliente no requiere recibir todos los eventos pasados individualmente.
2. Invoca `get_draw_snapshot()` que empaqueta:
   - `drawn_numbers`: Arreglo ordenado de todos los números ya cantados.
   - `current_ball`: Última balota emitida.
   - `current_sequence`: Cantidad de balotas cantadas.
   - `status`: Estado actual (`ACTIVE`, `PAUSED`, etc.).
   - `server_time`: Hora oficial sincronizada.
   - `players_connected` y `players_registered`.
3. El motor en cliente (`rebuildFromSnapshot`) deduplica eventos repetidos por `sequence_number` e identifica brechas de red solicitando un resincronizado inmediato si se detecta pérdida de paquetes.
