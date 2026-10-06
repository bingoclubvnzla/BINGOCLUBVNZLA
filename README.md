# Bingo Club VNZLA Online

> **Bingo digital venezolano en tiempo real**  
> *Fase Final — Validación Remota, Turnstile y Certificación E2E*  
> **Estado:** 🟡 PRODUCCIÓN FUNCIONAL — PRE-CERTIFICADA (374/374 Vitest PASS, 7/7 Playwright PASS)

---

## 📊 Estado de Certificación y Auditoría
- **Informe Forense de Cierre:** [`docs/CERTIFICACION_FASE_FINAL_CIERRE.md`](docs/CERTIFICACION_FASE_FINAL_CIERRE.md)
- **Script Consolidado de Despliegue SQL:** [`supabase/PHASE_FINAL_MIGRATION_DEPLOY.sql`](supabase/PHASE_FINAL_MIGRATION_DEPLOY.sql)
- **Suite de Pruebas Unitarias:** 374/374 tests pasando en Vitest (35 archivos)
- **Suite de Pruebas E2E:** 7/7 tests pasando en Playwright Chromium
- **Auditoría Remota de Sondas:** `node scripts/verify-phase-final-remote.mjs`

---

## 🇻🇪 Acerca del Proyecto
**Bingo Club VNZLA Online** es la plataforma tecnológica de bingo y lotería digital orientada a la comunidad venezolana. Diseñada con una arquitectura **Server-Authoritative**, garantiza que ningún cliente ni navegador web pueda manipular saldos, números sorteados, cartones ni ganadores.

> ⚠️ **Aviso de Fase 1 (Modo de Pruebas)**: En esta primera etapa no se realizan transacciones con dinero real ni apuestas. Las funciones financieras se encuentran deshabilitadas y preparadas a nivel de esquema para una activación progresiva y auditada en las siguientes fases.

---

## 🛠️ Stack Tecnológico
- **Frontend**: React 19, TypeScript estricto, Vite, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend & Base de Datos**: Supabase (PostgreSQL 15+, Supabase Auth, Supabase Realtime, Edge Functions).
- **Seguridad**: Row Level Security (RLS) en el 100% de tablas, RBAC multinivel, Auditoría continua (`audit_logs`), hashes de IP y User-Agent.
- **Testing & CI**: Vitest, TypeScript compiler (`tsc --noEmit`), GitHub Actions.
- **Hosting**: Preparado para Vercel con reglas de seguridad y redirección SPA.

---

## 📦 Estructura del Repositorio
```
├── .github/
│   └── workflows/ci.yml         # Pipeline automatizado (lint, typecheck, test, build)
├── docs/
│   ├── ARCHITECTURE.md          # Arquitectura técnica y diseño del sistema
│   ├── SECURITY.md              # Matriz de permisos y políticas RLS
│   ├── DATABASE.md              # Especificación del esquema de PostgreSQL
│   ├── REALTIME.md              # Arquitectura de canales WebSocket
│   ├── DEPLOYMENT.md            # Guía de despliegue en Vercel y Supabase
│   └── ROADMAP.md               # Hoja de ruta para las siguientes fases
├── supabase/
│   ├── migrations/              # Migraciones SQL reproducibles con RLS
│   ├── seed/                    # Datos iniciales (modalidades, configuraciones)
│   └── functions/               # Supabase Edge Functions preparadas
├── src/
│   ├── components/              # Componentes visuales organizados
│   ├── lib/                     # Cliente Supabase, configuración y utilidades
│   ├── types/                   # Tipos TypeScript estrictos del dominio
│   ├── test/                    # Suite de pruebas automatizadas
│   └── App.tsx                  # Enrutador principal y control de sesión
├── vercel.json                  # Configuración de despliegue y headers HTTP
└── .env.example                 # Variables de entorno públicas de ejemplo
```

---

## 🚀 Inicio Rápido en Desarrollo Local

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo y coloca tus credenciales anónimas de Supabase:
```bash
cp .env.example .env
```
Edita `.env`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key-publica
```
*(Nota: Si no configuras las variables inmediatamente, la aplicación incluye una guía de conexión y verificación interactiva que valida la conectividad con Supabase).*

### 3. Ejecutar Servidor de Desarrollo
```bash
npm run dev
```

### 4. Ejecutar Validación y Pruebas
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 🔒 Roles y Seguridad (RBAC)
- **`PLAYER`**: Acceso al lobby, modalidades, sus cartones y perfil personal.
- **`OPERATOR`**: Panel de monitoreo de salas e incidencias de usuarios.
- **`SUPERVISOR`**: Supervisión de actividad de salas y auditoría operativa.
- **`ADMIN`**: Control global de modalidades, parámetros y registros de auditoría.
- **`SUPER_ADMIN`**: Máxima autoridad de gobernanza del sistema.

---

## 📄 Licencia
Este proyecto está licenciado bajo los términos de la licencia [MIT](LICENSE).
