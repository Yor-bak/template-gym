# Puertos — Template-GYM

Registro de puertos usados por este proyecto en cada servidor donde corre. Actualiza esta tabla **antes** de desplegar o cambiar un puerto — el servidor puede compartir host con otros proyectos del equipo J2EC (`admin-panel-j2ec`, etc.), y ya tuvimos un conflicto real por no documentar esto a tiempo.

## Servidor de despliegue (a completar por quien lo despliegue)

| Servicio | Puerto (host) | Variable en `.env` | Notas |
|---|---|---|---|
| API (FastAPI) | `8000` (default, confirmar/ajustar al desplegar) | `API_PORT` | Único puerto que se expone públicamente (vía túnel/dominio). |
| Postgres | `5432` (default, confirmar/ajustar al desplegar) | `DB_PORT` | Solo `127.0.0.1` — nunca expuesto a internet. |

**Antes de correr `docker compose up` en un servidor nuevo o compartido**: revisa qué puertos ya están ocupados con `docker ps -a` y `sudo lsof -i :8000` / `sudo lsof -i :5432` (o los que vayas a usar), y ajusta `API_PORT`/`DB_PORT` en `infra/.env` si hace falta. Actualiza esta tabla con el valor real que quedó asignado.

## Otros proyectos J2EC conocidos en servidores compartidos

Completar según lo que el equipo tenga corriendo en el mismo servidor (coordinar con el resto de J2EC antes de asumir un puerto libre):

| Proyecto | Puerto(s) conocidos |
|---|---|
| `admin-panel-j2ec-backend` | Coordinar con ese equipo — no asumir un valor por defecto. |
| Otros stacks self-hosted del equipo (ej. Supabase de otro proyecto) | Revisar `docker ps -a` en el servidor antes de desplegar. |
