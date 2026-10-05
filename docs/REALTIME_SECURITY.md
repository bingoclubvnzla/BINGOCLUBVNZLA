# Seguridad de Canales Realtime (WebSockets) — Bingo Club VNZLA Online

## 1. Principio Fundamental
Los canales WebSocket **NO** son públicos por defecto. Un jugador no puede conectarse arbitrariamente a canales privados de otros jugadores, eventos de pago ni canales de control de operadores o administradores.

---

## 2. Topología y Reglas de Autorización de Canales

| Canal | Tipo de Autorización | Destinatarios Permitidos | Carga Útil Permitida | Protección contra Espionaje |
| :--- | :--- | :--- | :--- | :--- |
| `draw:{draw_id}` | Broadcast Público (Autenticado) | Jugadores activos en la sala | Números cantados, cambios de estado del sorteo, ganadores confirmados | No contiene datos financieros ni cartones de otros usuarios. |
| `player:{user_id}` | Privado / RLS Token Match | Únicamente el usuario cuyo `auth.uid()` coincida con `{user_id}` | Confirmación de cartones comprados, premios personales, alertas de cuenta | Supabase Realtime Row Level Security rechaza la suscripción si `token.sub != user_id`. |
| `operator:{operator_id}` | Privado / RBAC Match | Operadores y Supervisores en turno (`role IN ('OPERATOR', 'SUPERVISOR', 'ADMIN')`) | Alertas de disputas, incidencias técnicas, solicitudes de validación de pago | Rechazo de suscripción para usuarios con rol `PLAYER`. |
| `admin:control` | Privado / RBAC Match | Administradores (`role IN ('ADMIN', 'SUPER_ADMIN')`) | Métricas del sistema en vivo, anomalías de concurrencia, balance global | Cifrado y validación de claims de token en servidor. |

---

## 3. Prevención de Ataques en Tiempo Real

### 3.1 Prevención de Escucha Arbitraria (Eavesdropping)
- El cliente no puede escuchar eventos de `player:{user_id}` ajenos. Las políticas de canales de Supabase Realtime verifican que el `jwt.claims.sub` sea idéntico al parámetro del canal.

### 3.2 Prevención de Inyección de Balotas o Ganadores (Broadcast Spoofing)
- Los eventos críticos (`ball:drawn`, `winner:confirmed`, `draw:state_change`) son **exclusivamente emitidos desde el servidor** mediante la API de Supabase con permisos de servicio (`service_role` en Edge Functions / Background Worker).
- Los clientes frontend tienen permiso exclusivo de recepción (`read-only broadcast`). Ningún cliente puede emitir un evento `ball:drawn` en el canal `draw:{draw_id}`.
