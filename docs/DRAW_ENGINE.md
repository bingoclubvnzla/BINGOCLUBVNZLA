# Motor de Sorteos Autoritativo (Draw Engine) — Bingo Club VNZLA Online

## 1. Visión y Principio Fundamental
El **Bingo Club VNZLA Draw Engine** es el componente autoritativo central responsable de la ejecución de sorteos.
**Regla Absoluta**: El servidor es la **ÚNICA** autoridad con capacidad para:
- Iniciar un sorteo.
- Generar la permutación de resultados oficiales.
- Emitir balotas o figuras.
- Registrar eventos en la bitácora criptográfica.
- Pausar, reanudar y finalizar sorteos.
- Publicar eventos en canales WebSockets de Supabase Realtime.

El navegador del cliente jamás calcula resultados, ni ejecuta `Math.random()`, ni propone números al servidor.

---

## 2. Generación Criptográfica de Aleatoriedad (CSPRNG)
Para erradicar cualquier tipo de sesgo estadístico o predictibilidad:
1. No se utiliza `Math.random()`.
2. Se utiliza el algoritmo Fisher-Yates respaldado por una fuente de entropía criptográfica:
   - En PostgreSQL: `pgcrypto` (`gen_random_bytes(4)`).
   - En TypeScript / Node: `crypto.getRandomValues(new Uint32Array(poolSize))`.
3. La secuencia oficial completa se genera **una sola vez** al momento de iniciar el sorteo (`start_draw`).
4. La permutación oficial queda sellada en la columna `sequence` de la tabla `draws` y no puede ser alterada por ningún operador.

---

## 3. Catálogos Oficiales por Modalidad

| Modalidad | Rango / Pool | Matriz | Centro Libre | Elementos Totales | Reglas de Extracción |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **BINGO_75** | 1 a 75 | 5x5 | Sí (FREE) | 75 | Columnas: B (1-15), I (16-30), N (31-45), G (46-60), O (61-75). |
| **BINGO_90** | 1 a 90 | 3x5 | No | 90 | Rango estándar europeo/latinoamericano de 90 números. |
| **ANIMALITOS** | 0 a 37 | 5x5 | Sí (FREE) | 38 | Las 38 figuras oficiales de la suerte venezolana (0-Delfín, 00-Ballena, 1-Carnero... a 36-Culebra). |
| **OBJETOS** | 1 a 50 | 5x5 | Sí (FREE) | 50 | 50 símbolos de la cultura y geografía venezolana (Cuatro, Maracas, Arepa, Ávila, etc.). |
| **CHAPITAS** | 1 a 60 | 3x5 | No | 60 | 60 fichas y chapitas tradicionales venezolanas. |

---

## 4. Emisión Paso a Paso (`emit_next_ball`)
1. El operador autorizado solicita emitir la siguiente balota (`emit_next_ball`).
2. El servidor valida:
   - Que el usuario posea rol `OPERATOR`, `SUPERVISOR`, `ADMIN` o `SUPER_ADMIN`.
   - Que el sorteo esté en estado `ACTIVE`.
   - Que la versión enviada coincida con `draws.version` (bloqueo `FOR UPDATE`).
3. El servidor extrae la siguiente balota de `draws.sequence[current_sequence + 1]`.
4. El operador **NO PUEDE ELEGIR MANUALMENTE** qué balota sale. La balota es provista exclusivamente por el servidor.
5. Se inserta un evento monotónico en `draw_events` con su hash criptográfico.
6. Se incrementa `draws.version = draws.version + 1` y se agrega el número a `drawn_numbers`.
7. Si se alcanza el límite del pozo, el sorteo pasa automáticamente a `FINISHED`.
