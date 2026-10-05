# Hoja de Ruta Oficial — Bingo Club VNZLA Online

## Fase 1 — Fundación Profesional, Segura y Real
- [x] Configuración de React 19 + TypeScript estricto + Vite + Tailwind CSS.
- [x] Arquitectura RBAC (PLAYER, OPERATOR, SUPERVISOR, ADMIN, SUPER_ADMIN).
- [x] Integración de cliente Supabase con autenticación real, gestión de sesiones y protección de rutas.
- [x] Identidad pública `BCV-XXXXXX` que oculta el correo electrónico.
- [x] Esquema relacional completo de PostgreSQL con constraints, triggers y máquina de estados.
- [x] Políticas estrictas de Row Level Security (RLS) en el 100% de tablas públicas.
- [x] Tablas de auditoría forense (`audit_logs`) con hashing no sensible de IP y User-Agent.
- [x] Catálogo de modalidades: BINGO_75, BINGO_90, ANIMALITOS, OBJETOS, CHAPITAS.
- [x] Landing page oficial venezolana en modo pruebas con visuales de alta fidelidad.
- [x] Dashboards dedicados para PLAYER, OPERATOR y ADMIN sin simulación de saldos ficticios.
- [x] Suite de pruebas automatizadas unitarias y de seguridad con Vitest.
- [x] Pipeline de Integración Continua (GitHub Actions) y configuración de despliegue en Vercel.

## Fase 1.1 — Hardening, Auditoría Profunda y Certificación (COMPLETADA)
- [x] Blindaje de funciones `SECURITY DEFINER` con `search_path = public, pg_temp` contra inyección de esquemas.
- [x] Inmutabilidad estricta de `audit_logs` con trigger que bloquea `UPDATE` y `DELETE`.
- [x] Control de concurrencia optimista en sorteos (`draws.version`) para prevenir condiciones de carrera entre operadores.
- [x] Bloqueo inmutable de cartones en juego mediante disparador `trg_enforce_card_lock`.
- [x] Diseño de ledger contable con hash chaining (`previous_hash`, `transaction_hash`).
- [x] Reglas estrictas de moneda: `Bs.` pronunciado obligatoriamente como *"bolívares"* en audio/TTS.
- [x] Matriz de autorización formal en `docs/AUTHORIZATION_MATRIX.md`.
- [x] Especificación de idempotencia en `docs/IDEMPOTENCY.md`.
- [x] Arquitectura de seguridad en canales WebSockets en `docs/REALTIME_SECURITY.md`.
- [x] Suite de pruebas ampliada a **46 pruebas unitarias y de seguridad negativas PASS**.
- [x] Auditoría de dependencias (`npm audit`) con 0 vulnerabilidades.

## Fase 2 — Motor de Sorteos Autoritativo y Realtime (COMPLETADA)
- [x] Generador de permutación criptográfica seguro (CSPRNG con Fisher-Yates) para las 5 modalidades oficiales.
- [x] Implementación del motor de sorteos Server-Authoritative (`src/lib/drawEngine.ts`).
- [x] Catálogos oficiales completos: 38 Animalitos, 50 Objetos Criollos, 60 Chapitas, Bingo 75 y 90 (`src/lib/catalogs.ts`).
- [x] Transiciones atómicas y control de concurrencia optimista (`draws.version` + `transition_draw_state_atomic`).
- [x] Secuencia monotónica de eventos en `draw_events` con encadenamiento criptográfico (`previous_event_hash` + `event_hash`).
- [x] Resiliencia ante desconexión y refresco (F5) mediante reconstrucción fidedigna por Snapshot.
- [x] Sala en vivo accesible `/play/:drawCode` con telemetría en tiempo real y balota destacada accesible (`LivePlayRoom.tsx`).
- [x] Documentación exhaustiva en `docs/DRAW_ENGINE.md`, `docs/DRAW_STATE_MACHINE.md`, `docs/DRAW_EVENTS.md`, `docs/REALTIME_ROOMS.md`, `docs/DRAW_SECURITY.md`.

## Fase 2.1 — Blindaje de Catálogos Oficiales 1–75 (COMPLETADA)
- [x] Catálogo estricto de 75 Animalitos venezolanos tradicionales con refranes y apodos populares.
- [x] Catálogo estricto de 75 Objetos Criollos venezolanos con significado folklórico y cultural.
- [x] Pruebas de integridad de dominios y rangos en `tests/domain_modalities.test.ts`.

## Fase 2.2 — Modalidad Híbrida Chapitas 1–90 (COMPLETADA)
- [x] Mapeo canónico exacto 1–90: 1–45 Animalitos (números impares/pares) + 46–90 Objetos Criollos.
- [x] Migración SQL `20261005000005_chapitas_90_mapping.sql` con constraints de unicidad y vista relacional.
- [x] Pronunciación TTS adaptada con nombres criollos venezolanos y formato de locutor tradicional.

## Fase 2.3 — Integración Realtime Server-Authoritative y WebSockets (COMPLETADA)
- [x] Canales públicos y privados Supabase Realtime con suscripción de baja latencia.
- [x] Difusión segura de eventos `BALL_DRAWN`, `DRAW_STARTED`, `DRAW_FINISHED`.
- [x] 103/103 pruebas automatizadas aprobadas sin fallos.

## Fase 2.4 — Auth Hardening, Google OAuth & Cloudflare Turnstile (COMPLETADA)
- [x] Flujo de autenticación oficial con Google OAuth vía Supabase Auth (`signInWithOAuth`).
- [x] Integración de Cloudflare Turnstile real para protección anti-bot con fallback transparente (`NOT_CONFIGURED`).
- [x] Registro y Login tradicional con validación de longitud mínima de clave y confirmación de contraseñas.
- [x] Flujo de verificación de correo electrónico (`resendVerificationEmail`) con protección contra spam.
- [x] Recuperación de contraseña protegida con respuesta uniforme anti-enumeración de cuentas.
- [x] Gestor seguro de redirecciones (`isAllowedRedirectUrl`) con bloqueo total de vectores Open Redirect (`javascript:`, `data:`, `//attacker.com`).
- [x] Creación segura de perfiles en PostgreSQL (`handle_new_user`) con rol invariante `PLAYER` y billetera inicial bloqueada.
- [x] Bitácora forense de auditoría (`audit_logs`) con sanitización estricta de contraseñas, tokens y claves secretas.
- [x] Suite de pruebas automatizadas ampliada a **140 pruebas PASS** en 11 archivos de prueba.
- [x] Documentación exhaustiva en `docs/AUTH_HARDENING.md`.

## Fase 2.5 — Activación Real y Certificación End-to-End (COMPLETADA)
- [x] Implementación estricta de política **Fail-Closed** para Cloudflare Turnstile en entornos `PRODUCTION` y `PREVIEW`.
- [x] Bloqueo incondicional de LOGIN, SIGNUP, RECOVERY y RESEND si Turnstile está ausente en entornos protegidos.
- [x] Fallback transparente activo exclusivamente para desarrollo local (`LOCAL`).
- [x] Blindaje multicapa de redirecciones contra bypasses codificados (`%2F%2F`, `%252F%252F`, `%0A`, `%0D`, backslashes `/\`, `\\`).
- [x] Certificación formal de casos de uso Google OAuth (Casos A, B y C) garantizando rol invariante `PLAYER`.
- [x] Prevención verificada de duplicidad de identidades en cuenta linking (`ON CONFLICT (id) DO NOTHING`).
- [x] Auditoría forense automatizada en bundle (`dist/`) con 0 secretos privados expuestos.
- [x] Suite de pruebas automatizadas ampliada a **156 pruebas PASS** en 12 archivos de prueba (0 fallos).
- [x] Verificación de compilación de producción (`vite build`) y comprobación de tipos (`tsc --noEmit`).

## Fase 3 — Billetera Digital y Medios de Pago Venezolanos
- [ ] Activación de billetera digital con ledger contable de doble entrada.
- [ ] Integración de módulos para reporte y conciliación de Pago Móvil (C2P y P2P).
- [ ] Conciliación de Binance Pay (USDT) vía webhooks con firma criptográfica.
- [ ] Módulo de control de riesgos y límites diarios de recarga/retiro (KYC / AML).
