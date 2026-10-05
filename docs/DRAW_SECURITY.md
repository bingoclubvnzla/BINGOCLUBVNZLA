# Seguridad Integral del Motor de Sorteos (Draw Security) — Bingo Club VNZLA Online

## 1. Modelo de Amenazas del Sorteo

| Amenaza Potencial | Vector de Ataque | Mitigación Arquitectónica Implementada |
| :--- | :--- | :--- |
| **Manipulación de Números por Cliente** | Inyección de paquetes `ball_number` en el socket o API. | **Cero Autoridad del Cliente**: El cliente solo recibe balotas. La función `emit_next_ball` extrae el valor de la permutación interna sellada en base de datos. |
| **Elección de Balota por Operador Corrupto** | Un operador intenta elegir qué número sale a continuación. | **Imposibilidad Técnica**: El comando `emit_next_ball` no recibe parámetro `ball_number`. El servidor toma deterministamente la siguiente posición de la secuencia CSPRNG generada al inicio. |
| **Balota Duplicada** | Error de software o ataque emite el mismo número dos veces. | **Restricción de Unicidad**: Índice único `uq_draw_ball_number_idx ON draw_events(draw_id, ball_number)` a nivel de esquema de PostgreSQL más chequeo en memoria. |
| **Desfase o Duplicación de Secuencia** | Paquetes de red reordenados o duplicados. | **Monotonicidad y Deduplicación**: `sequence_number` estrictamente creciente ($1, 2, 3...$) con índice único `uq_draw_sequence`. Deduplicación en cliente por `sequence_number`. |
| **Ataque de Concurrencia (Doble Inicio)** | Dos operadores presionan "INICIAR" simultáneamente. | **Bloqueo Pesimista y Versión**: `SELECT ... FOR UPDATE` sobre la fila del sorteo con control de versión `draws.version`. El segundo intento falla por conflicto de versión. |
| **Ataque de Replay** | Reenvío malicioso del mismo comando HTTP previo. | **Idempotencia y Estado**: La máquina de estados rechaza transiciones repetidas (ej. `startDraw` sobre un sorteo ya en estado `ACTIVE` arroja excepción de transición ilegal). |
| **Adulteración Histórica de Balotas** | Modificación directa en la base de datos de números anteriores. | **Hash Chaining**: Cada evento almacena `event_hash = SHA256(...)` encadenado con `previous_event_hash`. Cualquier modificación en una balota previa rompe la cadena verificable. |
| **Cancelación Arbitraria** | Operador intenta cancelar un sorteo con ganadores. | **Regla Terminal**: No se permite transición de `FINISHED` o `ARCHIVED` a `CANCELLED`. |
