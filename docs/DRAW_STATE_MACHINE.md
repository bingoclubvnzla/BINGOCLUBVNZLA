# Máquina de Estados de Sorteos y Control de Concurrencia — Bingo Club VNZLA Online

## 1. Diagrama de Transición de Estados

```
            ┌─────────┐
            │  DRAFT  │
            └────┬────┘
                 │
                 ▼
          ┌─────────────┐
          │  SCHEDULED  │
          └──────┬──────┘
                 │
                 ▼
            ┌─────────┐
            │  READY  │
            └────┬────┘
                 │
                 ▼
            ┌─────────┐  Pausar   ┌──────────┐
            │ ACTIVE  │ ────────> │  PAUSED  │
            └────┬────┘ <──────── └──────────┘
                 │       Reanudar
                 ▼
           ┌───────────┐
           │ FINISHED  │
           └─────┬─────┘
                 │
                 ▼
           ┌───────────┐
           │ ARCHIVED  │ (Terminal)
           └───────────┘
```

*Nota sobre Cancelación*: El estado `CANCELLED` es admisible únicamente desde `DRAFT`, `SCHEDULED`, `READY`, `PAUSED` o `ACTIVE` mediante justificación de auditoría. Está **estrictamente prohibido** cancelar un sorteo en estado `FINISHED` o `ARCHIVED`.

---

## 2. Matriz de Transiciones Legales e Ilegales

| Estado Origen | Estado Destino Válido | Transiciones Ilegales Bloqueadas |
| :--- | :--- | :--- |
| **`DRAFT`** | `SCHEDULED`, `CANCELLED` | `ACTIVE`, `READY`, `FINISHED`, `ARCHIVED` |
| **`SCHEDULED`** | `READY`, `CANCELLED` | `ACTIVE`, `FINISHED`, `ARCHIVED` |
| **`READY`** | `ACTIVE`, `CANCELLED`, `PAUSED` | `FINISHED`, `ARCHIVED` |
| **`ACTIVE`** | `PAUSED`, `FINISHED`, `CANCELLED` | `DRAFT`, `SCHEDULED`, `ARCHIVED` |
| **`PAUSED`** | `ACTIVE`, `FINISHED`, `CANCELLED` | `DRAFT`, `SCHEDULED`, `ARCHIVED` |
| **`FINISHED`** | `ARCHIVED` | `DRAFT`, `SCHEDULED`, `READY`, `ACTIVE`, `CANCELLED` |
| **`CANCELLED`** | `ARCHIVED` | `DRAFT`, `READY`, `ACTIVE`, `FINISHED` |
| **`ARCHIVED`** | *Ninguno (Terminal)* | Todas |

---

## 3. Control de Concurrencia Optimista (`draws.version`)

Para prevenir que dos operadores actúen simultáneamente sobre el mismo sorteo:
1. Cada registro de `draws` contiene un entero monotónico `version`.
2. Toda llamada a `transition_draw_state_atomic()` requiere especificar `p_expected_version`.
3. Escenario de Conflicto:
   - **Operador A**: Envía comando con versión esperada `v4`.
   - **Operador B**: Envía comando con versión esperada `v4`.
   - El primer comando bloquea la fila mediante `SELECT ... FOR UPDATE`, avanza el estado y eleva la versión a `v5`.
   - El segundo comando se ejecuta sobre la versión ya actualizada (`v5`), detecta el desfase contra `v4` y aborta inmediatamente con la excepción:
     ```text
     Conflicto de concurrencia: El sorteo se encuentra en versión 5, esperado 4.
     ```
   - Ninguna sobreescritura silenciosa es permitida.
