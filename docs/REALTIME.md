# Arquitectura Supabase Realtime — Bingo Club VNZLA

## 1. Topología de Canales WebSocket

Para garantizar aislamiento y seguridad, los canales de WebSocket se dividen por contexto y nivel de autorización:

```
  Topología de Canales Realtime
  ├── room:{room_id}         (Público autenticado / Presencia en sala)
  ├── draw:{draw_id}         (Público autenticado / Eventos de tómbola en directo)
  ├── player:{user_id}       (Privado / RLS: Notificaciones directas y cartones ganadores)
  └── operator:{operator_id} (Privado / RLS: Incidencias y alertas de validación)
```

## 2. Especificación de Canales

### `draw:{draw_id}`
- **Audiencia**: Todos los jugadores suscritos a un sorteo en curso.
- **Eventos emitidos (Server-Side Only)**:
  - `draw:state_change`: Notifica transición de estado (`READY`, `ACTIVE`, `PAUSED`, `FINISHED`).
  - `ball:drawn`: Notifica la extracción de una balota con índice secuencial, valor y hash de verificación.
  - `bingo:announced`: Notifica reclamo de bingo en validación por el motor del servidor.
  - `winner:confirmed`: Notifica ganador oficial confirmado por el servidor.

### `player:{user_id}`
- **Audiencia**: Exclusivamente el usuario autenticado con matching JWT UID.
- **Eventos**:
  - `card:purchased`: Confirmación de adquisición de cartón.
  - `prize:awarded`: Notificación confidencial de premio otorgado.
  - `security:alert`: Avisos de sesión simultánea o cambio de credenciales.

### `operator:{operator_id}`
- **Audiencia**: Operadores y supervisores en turno.
- **Eventos**:
  - `dispute:raised`: Incidencias reportadas por jugadores.
  - `draw:anomaly`: Alertas del motor de sorteo para revisión inmediata.
