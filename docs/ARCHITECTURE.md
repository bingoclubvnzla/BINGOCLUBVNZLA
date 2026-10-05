# Arquitectura del Sistema — Bingo Club Venezuela Online

## 1. Visión General de la Arquitectura
Bingo Club VNZLA Online es una plataforma digital de lotería y bingo estructurada bajo el principio arquitectónico **Server-Authoritative**.

El frontend opera como un cliente visual desacoplado (Single Page Application con React, Vite y Tailwind CSS) que consume servicios autoritativos de Supabase (PostgreSQL 15+, Auth, Realtime WebSockets y Edge Functions).

```
 ┌──────────────────────────────────────────────────────────┐
 │               CLIENTE REACT / TS / VITE                  │
 │   - Landing Oficial         - Dashboard Jugador (PLAYER) │
 │   - Panel Operador          - Panel de Control ADMIN     │
 │   - Supabase Client (Anon)  - Audio/Visual Rendering     │
 └─────────────┬──────────────────────────────▲─────────────┘
               │ HTTPS (Rest / RPC)           │ WebSockets (Realtime)
               ▼                              │
 ┌────────────────────────────────────────────┴─────────────┐
 │                   SUPABASE PLATFORM                      │
 │ ┌──────────────────┐ ┌──────────────────┐ ┌────────────┐ │
 │ │  SUPABASE AUTH   │ │  REALTIME ENGINE │ │  STORAGE   │ │
 │ │  JWT / Sessions  │ │  Presencia/Event │ │  Auditoría │ │
 │ └─────────┬────────┘ └────────▲─────────┘ └────────────┘ │
 │           │                   │                          │
 │ ┌─────────▼───────────────────┴────────────────────────┐ │
 │ │            POSTGRESQL (AUTHORITATIVE CORE)           │ │
 │ │ - Row Level Security (RLS) en todas las tablas       │ │
 │ │ - Triggers de perfiles e identidad pública (BCV-XXXX)│ │
 │ │ - Control de Estados de Sorteos (State Machine)      │ │
 │ │ - RBAC con jerarquía de roles inmutable por cliente  │ │
 │ │ - Registro inmutable de auditoría (audit_logs)       │ │
 │ └──────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────┘
```

## 2. Roles del Sistema (RBAC)
1. **PLAYER**: Jugador registrado. Solo puede consultar su propio perfil, cartones adquiridos y sorteos programados. No tiene acceso a mutaciones de sorteos ni balances ajenos.
2. **OPERATOR**: Operador de soporte e incidencias. Gestionará validación de solicitudes en fases operativas. No puede promoverse a sí mismo a supervisor ni administrador.
3. **SUPERVISOR**: Monitoreo de actividad de salas y auditoría operativa.
4. **ADMIN**: Administrador de la plataforma. Configuración de salas, modalidades y visualización de registros de auditoría.
5. **SUPER_ADMIN**: Rol de máximo nivel con facultades de configuración estructural y auditoría forense.

## 3. Identificador Público Único
Cada jugador recibe un identificador público con formato:
`BCV-XXXXXX` (ejemplo: `BCV-784291`), generado automáticamente al insertarse el registro en `profiles` mediante trigger PostgreSQL.
El correo electrónico del usuario nunca se expone en salas de juego ni listados públicos.
