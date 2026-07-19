# Puertos — Template-GYM

Registro de puertos usados por este proyecto en cada servidor donde corre. Actualiza esta tabla **antes** de desplegar o cambiar un puerto — el servidor puede compartir host con otros proyectos del equipo J2EC (`admin-panel-j2ec`, etc.), y ya tuvimos un conflicto real por no documentar esto a tiempo.

## Producción — servidor `forge02`

Desplegado con `apps/api/docker-compose.prod.yml` y `apps/web/docker-compose.prod.yml` (uno por servicio, no el `infra/docker-compose.yml` genérico — ver nota abajo).

| Servicio | Contenedor | Puerto host | Puerto interno | Notas |
|---|---|---|---|---|
| API (FastAPI, gunicorn) | `j2ec-gym-backend-prod` | `127.0.0.1:8020` | `8000` | Dominio previsto: `api-gym.j2ec-nodes.com` (pendiente de activar en `CORS_ORIGINS`, ver `apps/api/.env.prod.example`). |
| Dashboard web (Next.js) | `j2ec-gym-frontend-prod` | `127.0.0.1:3020` | `3000` | Dominio previsto: `gym.j2ec-nodes.com`. |
| Postgres | `j2ec-gym-db-prod` | (sin publicar a host, solo red interna del compose) | `5432` | Solo accesible desde el contenedor `backend`. |

## Servidor de desarrollo/staging genérico (`infra/`)

`infra/docker-compose.yml` es un stack alternativo (Postgres + API, self-hosted) pensado para un servidor de desarrollo/staging separado de `forge02` — no se usa en la ruta de producción actual, que vive en los `docker-compose.prod.yml` de cada app. Si se despliega en algún servidor, completar aquí:

| Servicio | Puerto (host) | Variable en `.env` | Notas |
|---|---|---|---|
| API (FastAPI) | `8000` (default, confirmar/ajustar al desplegar) | `API_PORT` | |
| Postgres | `5432` (default, confirmar/ajustar al desplegar) | `DB_PORT` | Solo `127.0.0.1` — nunca expuesto a internet. |

**Antes de correr `docker compose up` en un servidor nuevo o compartido**: revisa qué puertos ya están ocupados con `docker ps -a` y `sudo lsof -i :PUERTO`, y ajusta la variable correspondiente en el `.env` si hace falta. Actualiza esta tabla con el valor real que quedó asignado.

## Otros proyectos J2EC conocidos en servidores compartidos

| Proyecto | Puerto(s) conocidos |
|---|---|
| `admin-panel-j2ec-backend` | Coordinar con ese equipo — no asumir un valor por defecto. |
| Otros stacks self-hosted del equipo (ej. Supabase de otro proyecto) | Revisar `docker ps -a` en el servidor antes de desplegar. |
