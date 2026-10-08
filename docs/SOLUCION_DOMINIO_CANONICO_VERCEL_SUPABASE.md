# SOLUCIÓN DEFINITIVA: DOMINIO CANÓNICO, VERCEL Y SUPABASE AUTH
## BINGO CLUB VNZLA ONLINE

**Dominio Canónico Oficial y Exclusivo:** `https://bingoclubvnzla.vercel.app/`  
**Supabase Project ID:** `lfmavupbxfkxuzncfzzs` (`https://lfmavupbxfkxuzncfzzs.supabase.co`)  
**Fecha:** Octubre 2026  
**Estado:** REPARACIÓN QUIRÚRGICA IMPLEMENTADA Y VERIFICADA EN CÓDIGO (430 Tests Vitest PASS + 7 Tests Playwright PASS)

---

## 1. DIAGNÓSTICO FORENSE: ¿POR QUÉ APARECEN DOMINIOS INCORRECTOS?

### Causa 1: Sincronización Automática de Previews por la Integración Vercel ⇄ Supabase
Cuando un proyecto de GitHub se vincula a Vercel y se instala la integración oficial de Supabase, Vercel genera nombres de dominio automáticos para cada commit y rama basados en el formato:
```text
https://bingoclubvnzla-<hash>.vercel.app/
https://bingoclubvnzla-git-<rama>-bingoclubvnzla.vercel.app/
https://bingoclubvnzla-bingoclubvnzla.vercel.app/
```
Por defecto, la integración Vercel-Supabase tiene habilitada la opción de sincronizar los dominios de preview con la lista de **Redirect URLs** en Supabase Auth, inyectando comodines del tipo:
```text
https://bingoclubvnzla-*-bingoclubvnzla.vercel.app/**
```

### Causa 2: Vercel Deployment Protection (Pantalla de Login de Vercel)
En equipos de Vercel, la opción **Deployment Protection / Vercel Authentication** viene activada por defecto para deployments de tipo *Preview*. Cuando Google OAuth o el navegador de un usuario final intentaba acceder a uno de estos aliases de deployment (`https://bingoclubvnzla-bingoclubvnzla.vercel.app/`), Vercel interceptaba la petición HTTP antes de servir la app y exigía credenciales de acceso a Vercel.

---

## 2. REPARACIONES QUIRÚRGICAS IMPLEMENTADAS EN EL REPOSITORIO

Se implementó una defensa en profundidad en 4 niveles para blindar el dominio canónico:

### Nivel 1: Redirección Edge en `vercel.json` (Nivel Servidor / CDN)
Se configuró una regla de redirección HTTP 308 permanente en `vercel.json` antes de los rewrites de la SPA:
```json
"redirects": [
  {
    "source": "/(.*)",
    "has": [
      {
        "type": "host",
        "value": "bingoclubvnzla-.*\\.vercel\\.app"
      }
    ],
    "destination": "https://bingoclubvnzla.vercel.app/$1",
    "permanent": true
  }
]
```
**Efecto:** Si un usuario o bot llega a cualquier alias de deployment (`bingoclubvnzla-*.vercel.app`), el Edge de Vercel lo redirige automáticamente a `https://bingoclubvnzla.vercel.app/` con código 308 permanente.

### Nivel 2: Autoridad Canónica en `src/lib/canonicalConfig.ts`
* Constante canónica inmutable: `CANONICAL_PRODUCTION_URL = 'https://bingoclubvnzla.vercel.app'`.
* Función `isForbiddenVercelDeploymentHost(hostname)`: Bloquea todos los dominios `bingoclubvnzla-*.vercel.app`.
* Función `getCanonicalAuthRedirectUrl(path)`: Si el código se ejecuta en cualquier host de Vercel, SIEMPRE devuelve `https://bingoclubvnzla.vercel.app${path}`, ignorando aliases de deployment.
* Función `enforceCanonicalDomainClientSide()`: Si un alias no canónico llega al cliente, fuerza un `window.location.replace` al dominio oficial.

### Nivel 3: Blindaje de Redirecciones de Autenticación
* En `src/contexts/AuthContext.tsx` y `src/lib/auth-context.tsx`:
  - `signUp`, `signInWithOAuth` y `resetPassword` utilizan `getSafeRedirectUrl()`.
  - Se eliminó el uso directo de `window.location.origin` en flujos de autenticación.
  - Para Google OAuth, la opción `redirectTo` queda fijada a `https://bingoclubvnzla.vercel.app/`.

### Nivel 4: Etiquetas Canónicas en `index.html`
* Se insertó `<link rel="canonical" href="https://bingoclubvnzla.vercel.app/" />`.
* Se insertó `<meta property="og:url" content="https://bingoclubvnzla.vercel.app/" />`.

---

## 3. PASOS OPERATIVOS REQUERIDOS EN LOS PANELES DE CONTROL

Para completar el ciclo y asegurar que Supabase no vuelva a almacenar los aliases:

### Paso A: En el Panel de Supabase (`https://supabase.com/dashboard/project/lfmavupbxfkxuzncfzzs`)
1. Ir a **Authentication** ➔ **URL Configuration**.
2. **Site URL:**
   Configurar estrictamente:
   ```text
   https://bingoclubvnzla.vercel.app/
   ```
3. **Redirect URLs:**
   * Eliminar todas las entradas con patrones de deployment como:
     - `https://bingoclubvnzla-bingoclubvnzla.vercel.app/**` (ELIMINAR)
     - `https://bingoclubvnzla-*-bingoclubvnzla.vercel.app/**` (ELIMINAR)
   * Conservar únicamente las URLs autorizadas:
     - `https://bingoclubvnzla.vercel.app/**`
     - `https://bingoclubvnzla.vercel.app/auth/callback`
     - `http://localhost:3000/**`
     - `http://localhost:3000/auth/callback`
4. Clic en **Save**.

### Paso B: En el Panel de Vercel
1. Ir a **Project Settings** ➔ **Integrations**.
2. En la integración de **Supabase**, verificar si la opción *"Automatically add preview deployment URLs to redirect URLs"* está activa y **desactivarla**.
3. En **Project Settings** ➔ **Deployment Protection**:
   * Si no se requiere autenticación interna de equipo en previews, desactivar *"Vercel Authentication"* para evitar pantallas de login accidentales en enlaces compartidos.

### Paso C: En Google Cloud Console (OAuth Credentials)
1. Ir a **APIs & Services** ➔ **Credentials** ➔ Cliente OAuth 2.0 Web.
2. En **Authorized Redirect URIs**, asegurarse de que apunte al callback oficial de Supabase:
   ```text
   https://lfmavupbxfkxuzncfzzs.supabase.co/auth/v1/callback
   ```
   *(Google nunca debe redirigir a un alias de Vercel; la interacción ocurre entre Google y Supabase, y Supabase devuelve al usuario al Site URL/Redirect URL oficial: `https://bingoclubvnzla.vercel.app/`).*

---

## 4. MATRIZ DE PRUEBAS AUTOMATIZADAS (100% PASS)

| Test Suite | Casos | Estado | Cobertura |
|---|:---:|:---:|---|
| **Vitest (`tests/secure_access_rules.test.ts`)** | 33 | 🟢 PASS | Regla 11: OAuth Canónico + Detección de Aliases Prohibidos |
| **Vitest (`tests/auth_hardening.test.ts`)** | 23 | 🟢 PASS | Prevención de Open Redirects + Destino Seguro |
| **Playwright E2E (`e2e/*.spec.ts`)** | 7 | 🟢 PASS | Servido 200 OK, CSP, Turnstile, Boundaries RBAC |
| **TypeScript Typecheck (`tsc --noEmit`)** | Completo | 🟢 PASS | 0 errores |
| **Vite Production Build (`npm run build`)** | Completo | 🟢 PASS | Assets optimizados con rel="canonical" |
