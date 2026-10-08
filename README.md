# 🇻🇪 Bingo Club VNZLA Online

> **Bingo venezolano en tiempo real, desde cualquier dispositivo.**

🌐 **Web oficial:** https://bingoclubvnzla.vercel.app

Bingo Club VNZLA Online es una plataforma web de entretenimiento que permite participar en diferentes modalidades de bingo y juegos de números desde el navegador, con una experiencia adaptada a dispositivos móviles, tablets y computadoras.

La plataforma utiliza una arquitectura en tiempo real donde el servidor mantiene la autoridad sobre los sorteos y el estado de las partidas.

---

## 🎮 Cómo jugar

### 1. Entra a la plataforma

Accede desde tu navegador:

**https://bingoclubvnzla.vercel.app**

La aplicación está diseñada para funcionar directamente desde el navegador, sin necesidad de instalar un programa adicional.

---

### 2. Regístrate o inicia sesión

Crea tu cuenta o inicia sesión para acceder al área de jugador.

Una vez dentro podrás acceder al lobby y consultar las modalidades disponibles.

---

### 3. Elige una modalidad

Actualmente el sistema contempla las siguientes modalidades:

| Modalidad         | Cartón | Bolas |
| ----------------- | ------ | ----: |
| 🎱 **Bingo 75**   | 5 × 5  |    75 |
| 🎱 **Bingo 90**   | 3 × 9  |    90 |
| 🐾 **Animalitos** | 5 × 5  |    75 |
| 🎯 **Objetos**    | 5 × 5  |    75 |
| 🔴 **Chapitas**   | 3 × 9  |    90 |

La disponibilidad de cada modalidad depende de las partidas habilitadas por la plataforma.

---

### 4. Selecciona tus cartones

Antes de comenzar el sorteo puedes seleccionar los cartones disponibles para la partida.

Los cartones digitales son identificados individualmente por el sistema y quedan vinculados a la partida correspondiente.

Una vez iniciado el sorteo, los cartones quedan bloqueados para evitar modificaciones durante la partida.

---

### 5. Sigue el sorteo en tiempo real

Durante la partida podrás observar los números que van siendo anunciados y el progreso de tus cartones.

El estado de la partida es distribuido en tiempo real desde el servidor.

**No es necesario actualizar manualmente la página.**

---

### 6. Completa el objetivo de la modalidad

Cada modalidad tiene sus propias reglas.

#### 🎱 Bingo 75

* Cartón de **5 × 5**.
* 75 bolas disponibles.
* Casilla central gratuita.
* **Línea:** corresponde al 25%.
* **Cartón Lleno:** corresponde al 75%.

#### 🎱 Bingo 90

* Cartón de **3 × 9**.
* 90 bolas disponibles.
* 15 números por cartón.
* Modalidad de **Quiniela** y **Cartón Lleno**.
* No utiliza la regla de Línea del Bingo 75.

#### 🐾 Animalitos

* Utiliza un catálogo de **75 animalitos**.
* Cartón basado en formato 5 × 5.
* El resultado del sorteo se relaciona con el catálogo oficial de animales.

#### 🎯 Objetos

* Utiliza un catálogo de **75 objetos**.
* Cartón basado en formato 5 × 5.
* El resultado se identifica mediante el catálogo correspondiente.

#### 🔴 Chapitas

* Utiliza un conjunto de **90 resultados**.
* Formato de cartón **3 × 9**.
* Combina elementos del catálogo de animales y objetos.

---

### 7. Reclama cuando completes el objetivo

Cuando tu cartón cumpla las condiciones necesarias para obtener un premio, utiliza la opción de reclamación disponible en la partida.

La validación se realiza en el servidor.

El navegador **no determina por sí mismo** si un jugador ganó.

---

## 🏆 Ganadores

Cuando existen varios ganadores válidos para el mismo resultado, el sistema puede distribuir el premio correspondiente entre los ganadores de acuerdo con las reglas de la partida.

La validación y confirmación del resultado corresponden al servidor.

---

## 💰 Estado de las funciones financieras

> ⚠️ **Actualmente la plataforma se encuentra en fase de pruebas.**

Las funciones relacionadas con dinero real, depósitos, retiros y apuestas **no están habilitadas para operaciones reales en esta fase**.

La infraestructura necesaria para futuras funciones financieras se mantiene separada de la experiencia actual y deberá activarse progresivamente después de las correspondientes validaciones técnicas, operativas y legales.

---

## 🔐 Seguridad

Bingo Club VNZLA Online utiliza una arquitectura **Server-Authoritative**.

Entre sus principales controles se encuentran:

* Autenticación de usuarios.
* Control de acceso por roles.
* Row Level Security (RLS).
* Validación de operaciones en servidor.
* Protección contra modificaciones de estado realizadas desde el cliente.
* Auditoría de operaciones sensibles.
* Validación de sorteos desde el servidor.
* Protección de funciones privilegiadas.
* Controles contra reutilización de autorizaciones sensibles.
* Protección de secretos y credenciales.
* Comunicación de eventos en tiempo real.

La interfaz web funciona como cliente de la plataforma; las operaciones críticas no dependen exclusivamente de la lógica ejecutada en el navegador.

---

## 📱 Compatible con

La plataforma está diseñada para utilizarse desde:

* 📱 Teléfonos móviles
* 📲 Tablets
* 💻 Computadoras portátiles
* 🖥️ Computadoras de escritorio

Se recomienda utilizar una conexión a Internet estable durante las partidas en tiempo real.

---

## ⚡ Tecnología

Bingo Club VNZLA Online está construido utilizando:

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **Supabase**
* **PostgreSQL**
* **Supabase Auth**
* **Supabase Realtime**
* **Supabase Edge Functions**
* **Vitest**
* **Playwright**
* **GitHub Actions**
* **Vercel**

---

## 📂 Estructura principal

```text
├── src/
│   ├── components/       # Componentes de la aplicación
│   ├── contexts/         # Estado y contexto de la aplicación
│   ├── lib/              # Configuración y servicios
│   ├── types/            # Tipos del dominio
│   └── test/             # Pruebas automatizadas
│
├── supabase/
│   ├── migrations/       # Migraciones de base de datos
│   ├── seed/             # Datos iniciales
│   └── functions/        # Edge Functions
│
├── docs/                 # Documentación técnica
├── .github/
│   └── workflows/        # Automatización CI/CD
│
├── vercel.json
├── package.json
└── README.md
```

La documentación técnica, de seguridad, arquitectura y despliegue se mantiene dentro de `docs/` para evitar sobrecargar la página principal del proyecto.

---

## 🧪 Estado del proyecto

El proyecto cuenta actualmente con validaciones automatizadas de frontend, backend y experiencia E2E.

**Estado actual:**

* ✅ Aplicación web funcional
* ✅ Comunicación en tiempo real
* ✅ Autenticación
* ✅ Control de acceso
* ✅ Arquitectura Server-Authoritative
* ✅ Protección RLS
* ✅ Pruebas automatizadas
* ✅ Pruebas E2E
* ✅ Build de producción
* ✅ Despliegue en Vercel

Los informes técnicos y de certificación detallados se encuentran en `docs/`.

---

## 🚀 Desarrollo local

### Requisitos

* Node.js
* npm
* Una instancia de Supabase configurada

### Instalación

```bash
git clone https://github.com/bingoclubvnzla/BINGOCLUBVNZLA.git

cd BINGOCLUBVNZLA

npm install
```

### Variables de entorno

Crea un archivo `.env` a partir de `.env.example`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-clave-publica
```

**Nunca coloques claves privadas, `service_role keys` ni otros secretos en variables `VITE_*`.**

### Ejecutar en desarrollo

```bash
npm run dev
```

### Validar el proyecto

```bash
npm run typecheck
npm run test
npm run build
```

---

## 📚 Documentación técnica

La documentación especializada se encuentra en:

* `docs/ARCHITECTURE.md` — Arquitectura del sistema.
* `docs/SECURITY.md` — Seguridad y permisos.
* `docs/DATABASE.md` — Modelo de datos.
* `docs/REALTIME.md` — Comunicación en tiempo real.
* `docs/DEPLOYMENT.md` — Despliegue.
* `docs/ROADMAP.md` — Evolución del proyecto.

Los informes internos de auditoría y certificación también permanecen dentro de `docs/` y no forman parte de la experiencia principal del README.

---

## 📄 Licencia

Este proyecto se distribuye bajo los términos de la licencia **MIT**.

Consulta [`LICENSE`](LICENSE) para conocer las condiciones completas.

---

## 🇻🇪 Bingo Club VNZLA

**Juega. Participa. Vive el bingo venezolano en tiempo real.**

🌐 **https://bingoclubvnzla.vercel.app**

📦 **GitHub:** https://github.com/bingoclubvnzla/BINGOCLUBVNZLA
