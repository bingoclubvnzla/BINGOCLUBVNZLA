# Arquitectura de Autenticación Blindada (Auth Hardening) — Fase 2.4

> **BINGO CLUB VNZLA ONLINE**  
> *Autenticación Server-Authoritative, Google OAuth, Cloudflare Turnstile y Verificación de Correo*

---

## 1. Principio Fundamental: Zero-Trust Frontend

El navegador web del usuario es considerado un entorno no confiable. Por directriz de seguridad estricta:
1. **Supabase Auth** es la única autoridad de identidad y emisión de credenciales de sesión.
2. Nunca se generan tokens JWT propietarios ni se almacenan contraseñas o hashes manuales en tablas personalizadas.
3. La clave privada `service_role` de Supabase jamás se expone al cliente del navegador.
4. Toda creación de perfiles y asignación de roles es ejecutada en el motor PostgreSQL mediante funciones `SECURITY DEFINER` con `search_path = public, pg_temp` (`handle_new_user()`).
5. Los nuevos usuarios reciben estrictamente el rol inmutable **`PLAYER`**, con nivel de seguridad 1 y billetera bloqueada (`DISABLED_PHASE_1`).

---

## 2. Flujo de Autenticación con Google OAuth

La integración con Google OAuth se realiza exclusivamente a través de Supabase Auth Provider, delegando la validación criptográfica del proveedor a los servidores de Supabase.

### 2.1 Diagrama de Secuencia
```text
Usuario (Navegador)               Supabase Auth                     Google Accounts
       │                                │                                  │
       ├─── Clic "Continuar con Google" ┼──────────────────────────────────┤
       │    (signInWithOAuth)           │                                  │
       ├───────────────────────────────►│                                  │
       │                                ├── Redirige a Google OAuth ──────►│
       │                                │                                  │
       │◄───────────────────────────────┴── Pantalla de consentimiento ────┤
       │                                                                   │
       ├── Aprueba permisos ──────────────────────────────────────────────►│
       │                                                                   │
       │                                │◄── Código de autorización OIDC ──┤
       │                                │                                  │
       │                                ├── Intercambia tokens en servidor │
       │                                ├── Ejecuta handle_new_user()      │
       │                                └── Genera sesión autoritativa     │
       │◄── Redirección segura con hash ─┘
       │
       ├── onAuthStateChange(SIGNED_IN)
       ├── Carga perfil PLAYER (BCV-XXXXXX)
       └── Registro inmutable en audit_logs (GOOGLE_OAUTH_SUCCESS)
```

### 2.2 Configuración del Proveedor Google
* **Google Cloud Console**:
  * Tipo de aplicación: Aplicación web.
  * URI de redireccionamiento autorizados: `https://<supabase-project-id>.supabase.co/auth/v1/callback`
  * Orígenes de JavaScript autorizados: `https://bingoclub.com.ve`, dominios de vista previa y `http://localhost:3000`.
* **Supabase Dashboard**:
  * Proveedor Google habilitado en `Authentication > Providers > Google`.
  * Client ID y Client Secret registrados en el backend de Supabase (nunca en el frontend).

---

## 3. Prevención Estricta de Open Redirects (`isAllowedRedirectUrl`)

Para mitigar ataques de redirección abierta o secuestro de tokens, la función `isAllowedRedirectUrl` evalúa exhaustivamente toda URL de retorno:
1. **Rechazo de esquemas maliciosos**: `javascript:`, `data:`, `vbscript:`, `file:`, `about:`.
2. **Rechazo de protocolo relativo**: URLs que inicien con `//` (ej. `//malicious-domain.com`).
3. **Rechazo de inyección de cabeceras CRLF**: Presencia de `\r`, `\n` o `\t`.
4. **Lista blanca estricta de dominios autorizados**:
   - `https://bingoclub.com.ve` y `https://www.bingoclub.com.ve`.
   - Subdominios oficiales de vista previa: `*.run.app` y `*.vercel.app`.
   - Entornos de desarrollo local: `localhost` y `127.0.0.1`.
   - Rutas relativas seguras locales (ej. `/dashboard`, `/reset-password`).

---

## 4. Protección Anti-Bot con Cloudflare Turnstile

Cloudflare Turnstile sustituye captchas visuales invasivos con una prueba criptográfica transparente y privada.

### 4.1 Modos Operativos
* **Producción (`VITE_TURNSTILE_SITE_KEY` configurado)**:
  - Carga asíncrona del script oficial `challenges.cloudflare.com/turnstile/v0/api.js`.
  - Renderizado explícito en tema oscuro integrado a la interfaz.
  - Validación de token previo al envío del formulario (`signUp`, `signIn`, `resetPassword`, `resend`).
  - Auto-limpieza de instancias de widgets para prevenir fugas de memoria.
* **Desarrollo / Entorno Local (`NOT_CONFIGURED`)**:
  - Indicador visual informativo en la interfaz que certifica que el sistema está preparado para recibir la clave de producción sin bloquear el flujo de pruebas.

### 4.2 Taxonomía de Acciones Turnstile
- `login`: Inicio de sesión de usuarios.
- `signup`: Registro de nuevas cuentas.
- `recovery`: Solicitud de restablecimiento de contraseña.
- `resend`: Reenvío de correos de confirmación.

---

## 5. Verificación de Correo Electrónico y Anti-Enumeración

1. **Estado de Correo No Confirmado**:
   - Cuando Supabase Auth retorna `Email not confirmed`, la interfaz informa amigablemente al usuario y despliega el botón protegido para reenviar el correo de activación.
2. **Protección Anti-Enumeración de Cuentas**:
   - Al solicitar recuperación de contraseña, el sistema retorna **exactamente la misma respuesta de éxito** sin importar si la dirección de correo existe o no en la base de datos:
   > *"Si el correo electrónico está registrado, recibirás un enlace seguro para restablecer tu contraseña."*
   - Impide que atacantes utilicen el endpoint de recuperación para validar listas de correos de jugadores.

---

## 6. Auditoría Forense y Sanitización de Metadatos

La tabla `public.audit_logs` registra cada evento de autenticación. Para cumplir con normativas de privacidad y seguridad bancaria:

### 6.1 Sanitización de Secretos (`sanitizeAuditMetadata`)
Se remueven de manera recursiva antes de persistir cualquier registro:
* `password`, `contraseña`
* `token`, `access_token`, `refresh_token`
* `captchatoken`, `turnstile_token`, `cf_turnstile`
* `secret`, `client_secret`, `service_role`
* `auth_code`, `code`, `api_key`

### 6.2 Mitigación contra Ataques de Almacenamiento (DoS)
Toda cadena de texto superior a 500 caracteres es truncada a `...[truncado]` antes de su serialización en PostgreSQL.

### 6.3 Eventos Auditados
| Acción | Disparador | Rol |
| :--- | :--- | :--- |
| `SIGNUP` | Registro completado por correo o Google | `PLAYER` |
| `LOGIN_SUCCESS` | Inicio de sesión válido | `PLAYER` |
| `LOGIN_FAILURE` | Intento fallido de autenticación | `ANON` |
| `GOOGLE_OAUTH_SUCCESS` | Autenticación exitosa con Google OIDC | `PLAYER` |
| `EMAIL_VERIFIED` | Confirmación de correo completada | `PLAYER` |
| `PASSWORD_RESET_REQUESTED` | Solicitud de enlace de recuperación | `ANON` |
| `PASSWORD_CHANGED` | Contraseña actualizada exitosamente | `PLAYER` / Rol actual |
| `LOGOUT` | Cierre voluntario de sesión | Rol actual |

---

## 7. Certificación de Pruebas Automatizadas

La suite de pruebas automatizadas en `tests/auth_hardening.test.ts` valida formalmente:
- Longitud y complejidad de contraseñas.
- Validación sintáctica de correos electrónicos.
- Reenvío de confirmación de correos.
- Respuestas uniformes anti-enumeración.
- Detección y bloqueo del 100% de vectores de Open Redirect.
- Neutralización de scripts en URLs (`javascript:`, `data:`).
- Filtrado exhaustivo de secretos en la bitácora de auditoría.
- Invarianza del rol `PLAYER` frente a intentos de auto-escalación de privilegios en el registro.
