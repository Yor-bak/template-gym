# Puertos — Template-GYM

Registro de puertos usados por este proyecto en cada servidor donde corre. Actualiza esta tabla **antes** de desplegar o cambiar un puerto — el servidor puede compartir host con otros proyectos del equipo J2EC (`admin-panel-j2ec`, etc.), y ya tuvimos un conflicto real por no documentar esto a tiempo.

## Producción — servidor `forge02`

Desplegado con `apps/api/docker-compose.prod.yml` y `apps/web/docker-compose.prod.yml` (uno por servicio, no el `infra/docker-compose.yml` genérico — ver nota abajo).

| Servicio | Contenedor | Puerto host | Puerto interno | Notas |
|---|---|---|---|---|
| API (FastAPI, gunicorn) | `j2ec-gym-backend-prod` | `127.0.0.1:8020` | `8000` | Dominio: `https://api-gym.j2ec-nodes.com` (confirmado activo, `/health` responde 200). |
| Dashboard web (Next.js) | `j2ec-gym-frontend-prod` | `127.0.0.1:3020` | `3000` | Dominio: `https://gym.j2ec-nodes.com` (confirmado activo). Apunta a `api-gym.j2ec-nodes.com` — **no** al backend del Pi (ver abajo), son bases de datos separadas. |
| Postgres | `j2ec-gym-db-prod` | (sin publicar a host, solo red interna del compose) | `5432` | Solo accesible desde el contenedor `backend`. |

## Servidor del Pi (dominio `j2ec.net` — distinto de `j2ec-nodes.com`)

Backend self-hosted vía `infra/docker-compose.yml`, expuesto por un túnel de Cloudflare (`nova-tunnel`, ya usado por otros proyectos del equipo en el mismo Pi — ver `~/.cloudflared/config.yml` y `/etc/cloudflared/config.yml` en el Pi).

| Servicio | Puerto (host) | Dominio | Notas |
|---|---|---|---|
| API (FastAPI) | `8010` (`API_PORT` en `infra/.env`) | `https://gym-api.j2ec.net` | Confirmado activo, incluye el módulo de rutinas (`routines`, `routine_exercises`, `workout_logs`) que **no existe** en el backend de forge02. |
| Postgres | `5433` (`DB_PORT`) | — | Solo `127.0.0.1`. |

**apps/mobile apunta aquí por defecto** (`EXPO_PUBLIC_API_URL` en `apps/mobile/.env`) — el dashboard web (forge02) y la app móvil (Pi) están en **backends distintos y sin datos compartidos** mientras no se reconstruya `apps/web` en forge02 apuntando a esta URL.

**Nota sobre `api.gym.j2ec.net` (dos niveles, no usarlo)**: se intentó primero ese hostname pero el certificado SSL Universal gratis de Cloudflare no cubre subdominios anidados de 2 niveles — solo `gym-api.j2ec.net` (un nivel) queda cubierto por el wildcard `*.j2ec.net` sin pagar Advanced Certificate Manager.

**Antes de correr `docker compose up` en un servidor nuevo o compartido**: revisa qué puertos ya están ocupados con `docker ps -a` y `sudo lsof -i :PUERTO`, y ajusta la variable correspondiente en el `.env` si hace falta. Actualiza esta tabla con el valor real que quedó asignado.

## Otros proyectos J2EC conocidos en servidores compartidos

| Proyecto | Puerto(s) conocidos |
|---|---|
| `admin-panel-j2ec-backend` | Coordinar con ese equipo — no asumir un valor por defecto. |
| Otros stacks self-hosted del equipo (ej. Supabase de otro proyecto) | Revisar `docker ps -a` en el servidor antes de desplegar. |
