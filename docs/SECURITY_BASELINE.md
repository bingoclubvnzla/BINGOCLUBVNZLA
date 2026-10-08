# BASELINE DE SEGURIDAD OFICIAL — BINGO CLUB VNZLA ONLINE
## LÍNEA BASE CERTIFICADA Y CONTRATO DE PROTECCIÓN CONTRA REGRESIONES

**Estado Oficial:** 🟢 **SECURITY STATUS = CERTIFIED**  
**Fecha de Certificación:** 8 de Octubre de 2026  
**Dominio Oficial Permanente e Inmutable:** `https://bingoclubvnzla.vercel.app`  
**Supabase Project ID:** `lfmavupbxfkxuzncfzzs`  
**Supabase Project URL:** `https://lfmavupbxfkxuzncfzzs.supabase.co`  
**Migración de Hardening de Cierre:** `supabase/migrations/20261005000015_security_advisor_0029_hardening.sql`  
**Script Consolidado para SQL Editor:** `scripts/consolidated_migration_15.sql`  

---

## 1. INVENTARIO OFICIAL DE PRUEBAS DE REGRESIÓN (BASELINE)

* **Vitest Test Suites:** **40 suites de prueba** (100% PASS)
* **Vitest Tests:** **503 pruebas automatizadas** (100% PASS)
* **Playwright E2E Tests:** **7 pruebas end-to-end** (100% PASS)
* **TypeScript Compiler:** **0 errores** (`tsc --noEmit`)
* **Vite Production Build:** **PASS** (1.16s, Assets optimizados, cabeceras CSP y redirección 308)
* **Secret Scanning:** **0 secretos privados expuestos** (Cero keys `service_role` o secrets en cliente o bundles)
* **Dominio Canónico:** Consolidado exclusivamente en `https://bingoclubvnzla.vercel.app` con bloqueo de aliases en cliente y redirect HTTP 308 en edge (`vercel.json`).
* **Baseline Drift Detection:** **29/29 verificaciones aprobadas** (`npm run verify:drift`)

---

## 2. EVALUACIÓN FORENSE DE SEGURIDAD (RESUMEN DE VULNERABILIDADES)

* **P0 (Compromiso Crítico):** `0`
* **P1 (Bypass de Autorización/Integridad):** `0`
* **P2 (Debilidad sin Explotación Inmediata):** `0`
* **P3 (Hardening Preventivo Aplicado):** `4`
  1. *Step-Up 4-Way Binding:* Validación simultánea de `user_id = v_user_id`, `action_type`, `risk_level` y `resource_id` para eliminar riesgo de reuso en autorizaciones cacheadas.
  2. *Auditoría `log_auth_event`:* Restricción a lista blanca de eventos del cliente y bloqueo de falsificación de eventos privilegiados.
  3. *MFA Lockdown:* Prohibición de desactivación de TOTP para cuentas de personal operativo y administrativo.
  4. *Default Privileges:* `ALTER DEFAULT PRIVILEGES` aplicado en `public` y `private` contra degradación en futuras migraciones.

---

## 3. TABLA DE ESTADOS POR COMPONENTE

| Componente | Estado Certificado | Mecanismo de Defensa e Invariante |
|---|:---:|---|
| **Security Advisor 0029** | 🟢 **PASS** | Las 17 funciones `SECURITY DEFINER` en `public` tienen justificación técnica de autoridad server-side y ejecutan gatekeepers de RBAC u ownership checks en su primera instrucción. |
| **Search Path 0011** | 🟢 **PASS** | Todas las funciones `SECURITY DEFINER` poseen `SET search_path = public, extensions, pg_temp` o `SET search_path = ''` inmutable. |
| **Anonymous RPC 0028** | 🟢 **PASS** | `REVOKE EXECUTE FROM PUBLIC, anon` verificado. 100% de llamadas anónimas a RPCs protegidas devuelven rechazo HTTP 401 / código PostgreSQL `42501`. |
| **RLS (Row Level Security)** | 🟢 **PASS** | Activo en 100% de las tablas sensibles con políticas segregadas para `anon` y `authenticated`. |
| **RBAC** | 🟢 **PASS** | Jerarquía congelada: `SUPER_ADMIN (50) > ADMIN (40) > SUPERVISOR (30) > OPERATOR (20) > PLAYER (10)`. Prohibida la auto-modificación de roles. |
| **Step-Up Authorization** | 🟢 **PASS** | Tokens temporales (TTL 5m) con anti-replay (`is_used`), binding estricto de identidad, acción y recurso. |
| **Draw Engine** | 🟢 **PASS** | Motor server-authoritative con CSPRNG (`private.draw_permutations`) y secuencia monótona con bloqueo `FOR UPDATE`. |
| **Sistema Financiero** | 🟢 **PASS** | Separación estricta: `PLAYER` solicita retiro; `OPERATOR+` confirma recarga; `SUPERVISOR+` aprueba retiro. Bloqueos `FOR UPDATE` en billeteras. |
| **Claim Bingo** | 🟢 **PASS** | `claim_bingo_authoritative` con verificación matemática de balotas cantadas, validación de cartón propio e índice único `(draw_id, card_id)`. |
| **Supabase Realtime** | 🟢 **PASS** | Canal de distribución unidireccional; los clientes reciben eventos y snapshots sin capacidad de mutación directa. |
| **Auth & Leaked Passwords** | 🟢 **PASS** | Turnstile anti-bot activo, Google OAuth restringido a dominio canónico y protección contra contraseñas filtradas (k-Anonymity) documentada. |
| **Secret Scanning** | 🟢 **PASS** | Pipeline de verificación automatizado en `tests/security_baseline_regression_guard.test.ts`. |

---

## 4. LAS 17 FUNCIONES CRÍTICAS CONGELADAS

Las siguientes funciones y todas sus firmas sobrecargadas quedan declaradas como componentes de seguridad críticos:

1. `public.claim_bingo_authoritative(uuid, uuid, text)`
2. `public.create_draw_authoritative(uuid, varchar, text)`
3. `public.start_draw_authoritative(uuid, integer)`
4. `public.emit_next_ball_authoritative(uuid, integer)`
5. `public.execute_confirm_recharge(uuid, uuid, uuid)`
6. `public.execute_approve_withdrawal(uuid, uuid, uuid)`
7. `public.execute_request_withdrawal(uuid, numeric, text, text, uuid)`
8. `public.execute_request_withdrawal(uuid, numeric, varchar, uuid)` *(Sobrecarga de compatibilidad)*
9. `public.execute_update_pago_movil(uuid, text, text, uuid)`
10. `public.execute_disable_mfa(uuid, text)`
11. `public.execute_disable_mfa(uuid, text, uuid)` *(Sobrecarga con idempotency_key)*
12. `public.execute_account_soft_deletion(uuid, text, uuid)`
13. `public.execute_admin_change_role(uuid, uuid, public.user_role, uuid)`
14. `public.execute_admin_toggle_user_status(uuid, uuid, public.user_status, text, uuid)`
15. `public.sync_official_admin_identities()`
16. `public.request_step_up_authorization(text, text, text, jsonb, uuid)`
17. `public.log_auth_event(text, jsonb)`

---

## 5. POLÍTICA DE GESTIÓN DE CAMBIOS QUIRÚRGICOS

Cualquier cambio futuro en el código o esquema de base de datos debe cumplir el siguiente protocolo:
1. **Verificación Previa:** Determinar si la modificación impacta Auth, RLS, RBAC, funciones `SECURITY DEFINER`, Draw Engine o el ledger financiero.
2. **Intervención Mínima:** Modificar exclusivamente el archivo o tabla requerida, sin refactorizaciones colaterales.
3. **No Reducción de Baseline:** La suite completa de Vitest (mínimo 503 tests) y Playwright (7 tests) debe ejecutarse y aprobar al 100%.
4. **Validación de Invariantes:** Las pruebas de `security_baseline_regression_guard.test.ts` deben pasar sin excepciones antes de autorizar cualquier despliegue.

---

## 6. PROTOCOLO SECURITY CI GATE

El pipeline de integración continua (`.github/workflows/ci.yml`) ejecuta de forma estricta e inmutable la siguiente compuerta de seguridad antes de cualquier despliegue:

1. **Pre-build Secret Scan:** Detección de claves privadas, `service_role` o archivos `.env` en el repositorio.
2. **TypeScript & Linter:** `npm run lint` y `npm run typecheck` (`tsc --noEmit`) con 0 errores tolerados.
3. **Unit & Integration Suite:** `npm run test` (503 tests en 40 suites al 100% PASS).
4. **Security Regression Guard:** `npm run test:security` con los 14 invariantes criptográficos, de RBAC, Step-Up y transaccionalidad.
5. **Baseline Drift Detection:** `npm run verify:drift` evaluando las 29 directivas de esquema, funciones, privilegios y dominio canónico.
6. **Production Build:** `npm run build` produciendo el bundle de producción optimizado.
7. **Post-Build Bundle Scan:** Escaneo del directorio `dist/` asegurando ausencia de secretos compilados.
8. **Post-Deploy Smoke Check:** `npm run verify:post-deploy` verificando el endpoint de producción `https://bingoclubvnzla.vercel.app`.

*Regla crítica:* Ningún paso crítico utiliza `continue-on-error`. Si cualquier verificación falla, el despliegue es abortado de forma inmediata (`NO DEPLOY`).

---

## 7. SISTEMA DE DETECCIÓN DE DERIVA (BASELINE DRIFT DETECTION)

El script `scripts/verify-baseline-drift.mjs` previene y alerta sobre modificaciones silenciosas en:
* Modificación no autorizada de las 17 funciones `SECURITY DEFINER` o sus firmas.
* Debilitamiento de `search_path` o reactivación de `pg_temp`.
* Inserción de privilegios `GRANT EXECUTE` a `anon` o `PUBLIC`.
* Alteración de la jerarquía numérica RBAC (SUPER_ADMIN 50, ADMIN 40, SUPERVISOR 30, OPERATOR 20, PLAYER 10).
* Discrepancia en la autoridad de dominio (`https://bingoclubvnzla.vercel.app`).
* Exposición accidental de claves secretas en frontend o assets.

---

## 8. POST-DEPLOY Y PRODUCCIÓN OFICIAL

* **Dominio Oficial Único:** `https://bingoclubvnzla.vercel.app`
* **Redirección Edge:** HTTP 308 permanente desde cualquier alias de deployment (`bingoclubvnzla-*.vercel.app`) hacia el dominio canónico oficial.
* **Prohibición de Redirecciones Secundarias:** Los subdominios de preview nunca son utilizados como autoridad de autenticación ni producción.

