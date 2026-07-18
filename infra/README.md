# Infraestructura self-hosted (API en FastAPI, Docker)

Stack de la API de Template-GYM: Postgres + la API en FastAPI (`apps/api`), pensado para correr en **cualquier servidor Linux con Docker** (no depende de la Raspberry Pi del equipo — este documento es la guía para levantarlo en el servidor nuevo). Reemplaza el stack anterior de Supabase self-hosted (7 contenedores) por solo 2 — FastAPI hace de gateway, autenticación y capa de datos a la vez, así que ya no hacen falta Kong/GoTrue/PostgREST/Storage/postgres-meta/Studio.

Requisitos del servidor: Docker + Docker Compose v2 (`docker compose version`), y opcionalmente Node.js solo para el script de generación de secretos (hay alternativa con `openssl` si no está instalado, ver abajo).

## 1. Clonar el repo y ubicarse en `infra/`

```
git clone <url-del-repo>
cd Template-GYM/infra
```

## 2. Antes de arrancar (una sola vez)

1. **Genera los secretos**:
   ```
   cp .env.example .env
   node scripts/generate-secrets.js --write
   ```
   Esto escribe `POSTGRES_PASSWORD`, `JWT_SECRET` y `QR_SECRET` directo en tu `.env`. **Nunca subas `.env` a git** (ya está en `.gitignore`).

   Si el servidor no tiene Node instalado, genera los mismos 3 valores a mano y pégalos en `.env`:
   ```
   openssl rand -hex 24    # -> POSTGRES_PASSWORD
   openssl rand -base64 32 # -> JWT_SECRET
   openssl rand -base64 32 # -> QR_SECRET (nunca el mismo valor que JWT_SECRET)
   ```

2. Completa a mano en `.env`:
   - `CORS_ORIGINS` → los dominios reales del dashboard cuando estén listos (en dev local: `http://localhost:3000,http://localhost:8081`).
   - `API_PORT`/`DB_PORT` → revisa qué puertos ya están en uso en el servidor antes de arrancar (`docker ps -a`, `sudo lsof -i :8000`) — el servidor puede compartir host con otros proyectos del equipo. Confirma/actualiza el puerto asignado en [`docs/PORTS.md`](../docs/PORTS.md) **antes** de desplegar, para no repetir un conflicto de puertos como ya pasó una vez.
   - `ADMIN_PANEL_SERVICE_KEY` → coordina el valor real con el equipo de `admin-panel-j2ec-backend` (es un secreto compartido entre los dos backends, nunca se inventa de este lado). Si todavía no lo tienen, déjalo vacío — el resto del backend funciona igual, solo la integración de aprovisionamiento automático queda inactiva hasta que se configure (ver sección de abajo).

3. **Arranca el stack**:
   ```
   docker compose up -d --build
   docker compose ps        # db y api deben terminar "healthy"
   ```
   Al arrancar, la API corre `alembic upgrade head` automáticamente antes de levantar el servidor — las migraciones de `apps/api/alembic/versions/` se aplican solas, no hay que correr nada a mano.

   **Nota de paciencia**: la primera vez que se construye la imagen de `api`, el `apt-get install` de dependencias del sistema puede tardar varios minutos según la velocidad del mirror de Debian del servidor — no es que esté colgado, va imprimiendo `Get:N ...` línea por línea. Deja que termine.

## 3. Acceso

- **API pública** (la que usan la app móvil y el dashboard web): el puerto `API_PORT` (por defecto 8000), expuesto a través de su túnel/dominio.
- **Postgres**: solo accesible desde el propio servidor (`127.0.0.1:5432`), nunca expuesto públicamente.
- Docs interactivos de la API (Swagger): `http://<servidor>:8000/docs` — útiles para probar endpoints a mano mientras no hay dominio/túnel.

## 4. Primer arranque: crear la primera sucursal + el primer admin

Los endpoints de creación (`POST /gyms`, `POST /users`) requieren estar autenticado como `platform_admin` — pero para crear el primero no hay todavía ninguna cuenta. Por eso existe un script aparte que inserta directo en la base:

```
docker compose exec api python -m scripts.seed_first_admin
```

Te va a pedir el nombre de la sucursal, el correo/contraseña del primer `platform_admin`, etc. Después de esto, todo lo demás (más sucursales, staff, entrenadores) se crea vía la API normal, autenticado con ese usuario — o vía el consumo automático de aprovisionamiento (siguiente sección) si ya está configurado.

## 5. Aprovisionamiento automático (integración con admin-panel-j2ec)

Cuando `admin-panel-j2ec` activa un cliente de tipo `gym`, deja una fila pendiente en su cola de aprovisionamiento (`client_provisioning_requests`, `target_system = 'gym'`). Este backend la consume mediante `app/integrations/provisioning_service.py` — revisa ese archivo para el mecanismo exacto (endpoint manual disparado vs. job periódico, según cómo se haya dejado configurado en el código al momento de desplegar). Requiere `ADMIN_PANEL_SERVICE_KEY` configurado en `.env` (paso 2) — mientras no esté, la integración falla explícitamente en vez de fallar en silencio, pero no bloquea el resto del backend.

**No hay acceso SQL directo entre `j2ec_admin` y esta base de datos en ningún caso** — toda comunicación pasa por la API HTTP interna de admin-panel-j2ec, autenticada con `X-Service-Key`, nunca con un JWT humano.

## 6. Apuntar la app móvil / dashboard aquí

En `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://api.tu-dominio.com
```

En `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

(Mientras no haya dominio/túnel configurado, usa la IP del servidor + `API_PORT` directamente para pruebas.)

## 7. Backups

```
sh scripts/backup.sh
```
Genera un dump comprimido en `infra/backups/` (ignorado por git) y borra los de más de 14 días. Prográmalo por cron en el servidor:
```
0 3 * * * /ruta/al/repo/infra/scripts/backup.sh >> /var/log/gym-backup.log 2>&1
```
**Importante**: además copien estos dumps fuera del servidor periódicamente (otra máquina, un storage cloud barato). Un backup que vive en el mismo disco que puede fallar no protege de nada.

## 8. Migrar la data a otro disco (ej. un SSD por USB)

Los datos de Postgres son un bind mount controlado por `GYM_DATA_PATH` en `.env` (por defecto `./data`). Para moverlos:

```
docker compose down
# monta el disco nuevo, ej. en /mnt/ssd
rsync -a ./data/ /mnt/ssd/gym-data/
```
Luego en `.env`:
```
GYM_DATA_PATH=/mnt/ssd/gym-data
```
```
docker compose up -d
```
Cero pérdida de datos, cero reinstalación.

## 9. Actualizar el backend con cambios nuevos (nunca editar en el servidor)

Todo cambio de código pasa por commit local → push → `git pull` en el servidor — nunca se edita directo en producción (ver [`CONTRIBUTING.md`](../CONTRIBUTING.md) en la raíz del repo). Para aplicar una actualización ya pusheada:

```
git pull
docker compose up -d --build
```
Si la actualización incluye una migración de Alembic nueva, se aplica sola al arrancar el contenedor `api` (mismo mecanismo del paso 2).

## 10. Troubleshooting común

- **Conflicto de puerto al arrancar** (`port is already allocated`): el servidor probablemente ya corre otro proyecto del equipo usando 5432/8000. Cambia `DB_PORT`/`API_PORT` en `.env` y actualiza [`docs/PORTS.md`](../docs/PORTS.md) con el puerto real que quedó asignado.
- **`docker compose exec api python -m scripts.seed_first_admin` falla con error de conexión a la base**: espera a que `docker compose ps` muestre `db` como `healthy` antes de correr el script — el healthcheck existe justo para esto.
- **Multi-línea pegada en una terminal SSH se corta a mitad**: pega los comandos uno a la vez en vez de bloques de varias líneas si la sesión SSH los está partiendo mal.

## 11. Checklist de seguridad antes de exponer esto a internet

- [ ] Cambiaste todos los valores de `.env` (nada de defaults de ejemplo — incluye `QR_SECRET`, que es fácil de olvidar por ser el más nuevo)
- [ ] `restart: always` está en ambos servicios (ya viene así en `docker-compose.yml`)
- [ ] Postgres sigue expuesto solo en `127.0.0.1` (nunca lo publiques directo a internet)
- [ ] `ADMIN_PANEL_SERVICE_KEY` es un valor propio coordinado con el equipo de `admin-panel-j2ec`, nunca reutilizado de otro entorno
- [ ] Backups corriendo por cron + copiados fuera del servidor
- [ ] El puerto real asignado quedó documentado en `docs/PORTS.md`
