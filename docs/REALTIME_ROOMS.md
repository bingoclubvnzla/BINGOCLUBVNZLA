# Arquitectura de Salas en Tiempo Real (Realtime Rooms) — Bingo Club VNZLA Online

## 1. Topología de Canales WebSocket

```
  Canales Supabase Realtime
  ├── draw:{draw_id}         [Broadcast de Sorteo]  --> Escuchan todos los jugadores; emite SOLO el servidor
  ├── player:{user_id}       [Canal Privado]        --> Cartones del usuario y premios personales
  ├── operator:{operator_id} [Canal Privado RBAC]   --> Alertas de sala e incidencias
  └── admin:control          [Canal Privado RBAC]   --> Control maestro de gobernanza
```

---

## 2. Constantes de Eventos Oficiales
Todos los eventos utilizan constantes declaradas en `src/types/realtimeEvents.ts`:
- `DRAW_CREATED`: Creación de sala/sorteo en estado DRAFT.
- `DRAW_READY`: Sorteo listo para admisión de público.
- `DRAW_STARTED`: Sorteo iniciado oficialmente por el servidor.
- `BALL_DRAWN`: Emisión autoritativa de una balota o figura.
- `DRAW_PAUSED`: Notificación de suspensión temporal del sorteo.
- `DRAW_RESUMED`: Reanudación del sorteo en la siguiente posición.
- `DRAW_FINISHED`: Conclusión oficial del sorteo con resultado final sellado.
- `DRAW_CANCELLED`: Cancelación justificada bajo auditoría.
- `SNAPSHOT_AVAILABLE`: Notificación de nuevo snapshot disponible para clientes desfasados.

---

## 3. Seguridad de Emisión (Broadcast Security)
- **Recepción Exclusiva para Jugadores**: Los clientes tienen suscripción de solo lectura (`read-only`).
- Las políticas de seguridad en Supabase Realtime bloquean cualquier intento del navegador de inyectar mensajes `BALL_DRAWN` o `DRAW_STARTED`.

---

## 4. Estados de Conexión en Sala (`/play/:drawCode`)

| Estado Visual | Descripción Técnica | Indicador en Interfaz |
| :--- | :--- | :--- |
| **`EN_VIVO`** | Conexión WebSocket activa, ping recibido $< 1500\text{ms}$. | Punto verde pulsante con telemetría en directo. |
| **`SINCRONIZANDO`** | Descarga del snapshot de estado oficial en curso. | Ícono de recarga giratorio color celeste. |
| **`RECONEXION`** | Conexión interrumpida; reintento con backoff exponencial. | Ícono ámbar con advertencia de reintento. |
| **`DESCONECTADO`** | Canal caído; no se inventan balotas localmente. | Alerta roja indicando reconexión requerida. |

---

## 5. Prevención de Fugas de Memoria
El componente `LivePlayRoom.tsx` implementa un ciclo de limpieza riguroso (`cleanup function` en `useEffect`):
```typescript
return () => {
  channel.unsubscribe();
  clearInterval(heartbeatTimer);
};
```
Esto garantiza que al salir de la sala no queden timers huérfanos ni suscripciones duplicadas consumiendo recursos en el dispositivo del usuario.
