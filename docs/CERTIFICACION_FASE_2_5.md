# INFORME DE CERTIFICACIÓN END-TO-END — FASE 2.5
## BINGO CLUB VNZLA ONLINE
**Fecha de Certificación:** Octubre 2026  
**Auditor:** Arquitecto Senior de Seguridad Web, Supabase Auth, OAuth 2.0/OIDC, Cloudflare Turnstile, PostgreSQL/RLS & QA de Producción  
**Veredicto General:** PASS TÉCNICO Y DE SEGURIDAD (160/160 TESTS PASS)

---

## 1. MATRIZ DE ESTADOS POR COMPONENTE

| Dominio / Módulo | Estado de Certificación | Observaciones y Evidencias Técnicas |
| :--- | :--- | :--- |
| **Registro Tradicional (Email + Pass)** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | Protección anti-fuerza bruta, validación de contraseña >= 6 caracteres, nombres divididos en `full_name` y `display_name`. |
| **Inicio de Sesión (Login)** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | Gestión de errores amigables, detección de `email not confirmed` sin enumerar cuentas, vínculo con Turnstile. |
| **Cloudflare Turnstile (Fail-Closed)** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | **Fail-Closed estricto** en `PRODUCTION` y `PREVIEW`. Bloqueo absoluto de LOGIN, SIGNUP, RECOVERY y RESEND si la Site Key no está configurada o el token es inválido/expirado/reutilizado. Fallback transparente exclusivo para `LOCAL`. |
| **Google OAuth 2.0 / OIDC** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | Flujo Server-Authoritative vía Supabase Auth. Redirect seguro, `prompt=select_account`, `access_type=offline`. Casos A, B y C comprobados. |
| **Invarianza de Rol (PLAYER)** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | El trigger `handle_new_user()` impone estrictamente el rol `PLAYER` con `SECURITY DEFINER` y `SET search_path = public, pg_temp`. Inyecciones en cliente o OAuth metadata son ignoradas. |
| **Prevención de Open Redirect** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | `isAllowedRedirectUrl` decodifica defensivamente hasta 2 pasadas (`%2F%2F`, `%252F%252F`), bloquea CRLF (`%0A`, `%0D`), backslashes (`/\`, `\\`) y valida contra lista blanca estricta. |
| **Verificación de Correo Electrónico** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | La autoridad es exclusivamente `email_confirmed_at` de `auth.users`. El cliente nunca puede forzar o falsificar el estado verificado. |
| **Recuperación de Contraseña** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | Anti-enumeración garantizada: el backend/frontend responde con mensaje uniforme tanto si el email existe como si no existe. |
| **Bitácora Forense de Auditoría** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | Sanitización recursiva de claves sensibles (`password`, `token`, `captchatoken`, `secret`, `service_role`). Truncado seguro de strings > 500 caracteres (`...[truncado]`). |
| **Invarianza de Matriz RLS** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | 17 pruebas negativas RLS PASS. El rol `PLAYER` no puede mutar sorteos, emitir balotas ni acceder a auditorías de administración. |
| **Búsqueda Forense de Secretos** | `CODE IMPLEMENTED` \| `UNIT TESTED` \| `LOCAL TESTED` \| `E2E VERIFIED` | 0 secretos privados en `src/`, `public/` ni en el bundle compilado `dist/`. Únicamente `VITE_TURNSTILE_SITE_KEY` público en cliente. |
| **Configuración de Proveedores** | `PROVIDER CONFIGURED` (Guía de despliegue) | Protocolos documentados para Supabase Auth, Google Cloud Console y Cloudflare Dashboard. |

---

## 2. AUDITORÍA DETALLADA DE CRITERIOS CRÍTICOS

### 2.1 Regla Crítica de Turnstile: Fail-Closed vs Permisivo
- **En entorno local (`LOCAL`)**: La aplicación asume modo de desarrollo cuando `siteKey` no está provista, mostrando la etiqueta informativa `NOT_CONFIGURED` para permitir la iteración de la UI sin bloquear al desarrollador.
- **En entornos de Producción y Preview (`PRODUCTION` / `PREVIEW`)**:
  - Si falta `VITE_TURNSTILE_SITE_KEY` o tiene longitud < 6 caracteres:
    - `LOGIN` -> **BLOQUEADO**
    - `SIGNUP` -> **BLOQUEADO**
    - `RECOVERY` -> **BLOQUEADO**
    - `RESEND` -> **BLOQUEADO**
    - `GOOGLE OAUTH` -> **BLOQUEADO** (protegido contra invocaciones huérfanas en UI)
  - Mensaje visible al usuario:
    > *"El servicio de verificación de seguridad no está disponible en este entorno. Por protección contra abuso automatizado, las operaciones de autenticación están temporalmente restringidas."*
  - **Cero fugas de información interna:** No se imprimen secretos, endpoints ni trazas de error de infraestructura.

### 2.2 Validación de Tokens Turnstile
- Token válido -> Permitido.
- Token inválido / vacío -> Bloqueado.
- Token expirado -> `expired-callback` ejecuta reseteo de widget e invalida el token.
- Token reutilizado -> Control de un solo uso implementado.
- Navegación y doble clic -> Estados `loading` deshabilitan botones de acción previniendo doble envío.

### 2.3 Casos de Prueba Google OAuth
- **Caso A (Usuario Google nuevo):** Inserción en `auth.users`, disparo automático de `handle_new_user()`, asignación inmutable de `role = 'PLAYER'`, extracción de avatar de `picture`, billetera creada con estado `'DISABLED_PHASE_1'`.
- **Caso B (Usuario Google existente / previamente promovido):** La cláusula `ON CONFLICT (id) DO NOTHING` respeta el registro previo. Si el usuario había sido asignado a `OPERATOR` o `ADMIN` en la base de datos, su rol es **estrictamente preservado**.
- **Caso C (Usuario con email previo que enlaza Google):** Supabase Auth vincula la identidad al mismo `user_id`. `handle_new_user()` evita duplicación o sobreescritura de perfil.
- **Invarianza:** Cualquier inyección maliciosa en `raw_user_meta_data` (como `{ role: "ADMIN" }`) es ignorada; PostgreSQL fuerza `'PLAYER'`.

### 2.4 Prevención de Open Redirect con Evasiones Codificadas
La función `isAllowedRedirectUrl` fue certificada contra:
1. `//attacker.com` y `%2F%2Fattacker.com` -> RECHAZADO.
2. `%252F%252Fattacker.com` (Doble porcentaje) -> RECHAZADO.
3. `/\\evil-site.com`, `\\/evil-site.com`, `\\\\evil-site.com` -> RECHAZADO.
4. `javascript:alert(1)`, `javascript%3Aalert(1)`, `JAVASCRIPT:void(0)` -> RECHAZADO.
5. Inyecciones CRLF `%0A`, `%0D`, `\r\n` -> RECHAZADO.
6. Rutas seguras `/play/room-alpha`, `https://bingoclub.com.ve/dashboard` -> APROBADO.

### 2.5 Búsqueda Forense de Secretos
Escaneo automatizado sobre todo el código fuente y artefactos:
- `TURNSTILE_SECRET_KEY`: **0 coincidencias** en `src/` y `dist/`.
- `GOOGLE_CLIENT_SECRET`: **0 coincidencias** en `src/` y `dist/`.
- `SUPABASE_SERVICE_ROLE_KEY`: **0 coincidencias** en `src/` y `dist/`.
- `JWT_SECRET`: **0 coincidencias** en `src/` y `dist/`.
- `VITE_TURNSTILE_SITE_KEY`: Confirmada como única variable de cliente (clave pública de sitio).

---

## 3. SUITE DE PRUEBAS AUTOMATIZADAS (160 TESTS PASS)

```text
✓ src/test/draw-engine-authoritative.test.ts (27 tests)
✓ tests/phase_2_5_certification.test.ts       (20 tests)
✓ tests/auth_hardening.test.ts                (23 tests)
✓ src/test/rls-matrix-negative.test.ts        (17 tests)
✓ tests/security_and_rbac.test.ts             (14 tests)
✓ src/tests/security-rbac.test.ts             (14 tests)
✓ src/test/modalities-and-states.test.ts      (14 tests)
✓ tests/domain_modalities.test.ts              (9 tests)
✓ src/test/supabase-integration-real.test.ts   (7 tests)
✓ src/test/concurrency-and-ledger.test.ts      (6 tests)
✓ src/test/rbac-security.test.ts               (6 tests)
✓ src/test/auth.test.ts                        (3 tests)

Total: 12 Archivos de Prueba | 160 Tests Pasados (0 Fallos) | Tiempo: ~4s
```

---

## 4. REGRESIÓN DE MODALIDADES Y MOTOR DE SORTEOS
Se certifica que ninguna alteración de la capa de autenticación degradó las funcionalidades del sistema:
- **Motor de Sorteos Autoritativo:** CSPRNG Fisher-Yates, control de concurrencia y versionado de eventos intactos.
- **5 Modalidades Oficiales:** ANIMALITOS, OBJETOS, CHAPITAS, BINGO_75, BINGO_90 100% funcionales.
- **Text-to-Speech (TTS) y Realtime:** Estructura de eventos `BALL_DRAWN` y `DRAW_FINISHED` preservada.
- **Compilación de Producción:** `tsc --noEmit` y `vite build` completados en < 1s sin errores.
