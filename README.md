# Template-GYM

Digitalización del registro, accesos y suscripciones de un gimnasio.

## Estructura

- [`apps/mobile`](apps/mobile) — App móvil (Expo + React Native + TypeScript) con vista de **cliente** (QR de acceso, rutina, ajustes) y vista de **entrenador** (clientes asignados, asignación de rutinas).
- [`apps/web`](apps/web) — Dashboard web del gym (miembros, pagos, accesos, inventario, staff), a cargo del resto del equipo.
- [`apps/api`](apps/api) — Backend (Python, FastAPI + SQLAlchemy + PostgreSQL), en construcción por fases.
- [`infra/`](infra) — Stack de la API self-hosted (Docker Compose) para correr en la Raspberry Pi del equipo.
- [`supabase/schema.sql`](supabase/schema.sql) — Esquema histórico de cuando el backend era Supabase (ya no se usa). Se deja como referencia del modelo de dominio original mientras se termina de traducir a `apps/api`.

## Estado actual

`apps/mobile` y `apps/web` corren en **modo mock** (datos locales en memoria, sin backend real) mientras se construye `apps/api`. Ambas apps tienen la misma forma de datos que va a exponer la API real, así que conectarlas es cuestión de reemplazar la capa de datos, no de rediseñar pantallas.

## Cómo arrancar la app móvil

```
npm install
npm run mobile
```
Abre el proyecto con Expo Go o un emulador. Cuentas de prueba (modo mock): `cliente@test.com` / `entrenador@test.com`, contraseña `123456`.

## Cómo arrancar el dashboard web

```
npm run web
```
Corre en `http://localhost:3000`. Login de prueba (modo demo): `admin@americanfitness.mx` / `admin123`.

## Backend (`apps/api`)

Ver [`apps/api/README.md`](apps/api/README.md) para desarrollo local, y [`infra/README.md`](infra/README.md) para desplegarlo en la Raspberry Pi.
