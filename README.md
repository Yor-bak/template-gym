# Template-GYM

Digitalización del registro, accesos y suscripciones de un gimnasio.

## Estructura

- [`apps/mobile`](apps/mobile) — App móvil (Expo + React Native + TypeScript) con vista de **cliente** (QR de acceso, rutina, entrenador asignado) y vista de **entrenador** (clientes asignados, asignación de rutinas).
- [`apps/web`](apps/web) — Dashboard web del gym (suscripciones, accesos), a cargo del resto del equipo.
- [`supabase/schema.sql`](supabase/schema.sql) — Esquema de base de datos compartido (Postgres), con RLS. Es la fuente de verdad del esquema, sin importar si el backend termina en Supabase Cloud o self-hosted.
- [`infra/`](infra) — Stack de Supabase self-hosted (Docker Compose) para correr su propio backend (ej. en su Raspberry Pi), en vez de usar Supabase Cloud.

## Backend: Supabase Cloud vs self-hosted

Tienen dos formas de levantar el backend (ambas comparten el mismo `supabase/schema.sql`):

- **Supabase Cloud** — más rápido para arrancar, cero mantenimiento. Ver pasos abajo.
- **Self-hosted (Docker en su propia infraestructura)** — ver [`infra/README.md`](infra/README.md) para el setup completo, generación de secretos, y checklist de seguridad antes de exponerlo a internet.

## Cómo arrancar la app móvil (con Supabase Cloud)

1. Crea un proyecto en [supabase.com](https://supabase.com) y corre [`supabase/schema.sql`](supabase/schema.sql) en su SQL Editor.
2. `cd apps/mobile && cp .env.example .env` y llena `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` con los valores de tu proyecto (Project Settings → API).
3. Desde la raíz del repo: `npm install`
4. `npm run mobile` (o `cd apps/mobile && npm start`) y abre el proyecto con Expo Go o un emulador.

Si en vez de Cloud usan el backend self-hosted de `infra/`, el paso 2 es el mismo pero usando la URL de su dominio y el `ANON_KEY` que genera `infra/scripts/generate-secrets.js`.
