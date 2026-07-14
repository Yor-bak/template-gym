# Infraestructura self-hosted (API en FastAPI, Docker)

Stack de la API de Template-GYM para correr en la Raspberry Pi del equipo: Postgres + la API en FastAPI (`apps/api`). Reemplaza el stack anterior de Supabase self-hosted (7 contenedores) por solo 2 — FastAPI hace de gateway, autenticación y capa de datos a la vez, así que ya no hacen falta Kong/GoTrue/PostgREST/Storage/postgres-meta/Studio.

## Antes de arrancar (una sola vez)

1. **Genera los secretos**:
   ```
   cd infra
   cp .env.example .env
   node scripts/generate-secrets.js --write
   ```
   Esto escribe `POSTGRES_PASSWORD` y `JWT_SECRET` directo en tu `.env`. **Nunca subas `.env` a git** (ya está en `.gitignore`).

2. Completa a mano en `.env`:
   - `CORS_ORIGINS` → los dominios reales del dashboard/túnel cuando estén listos (en dev local: `http://localhost:3000,http://localhost:8081`).

3. **Arranca el stack**:
   ```
   docker compose up -d --build
   docker compose ps        # db y api deben terminar "healthy"
   ```
   Al arrancar, la API corre `alembic upgrade head` automáticamente antes de levantar el servidor — las migraciones de `apps/api/alembic/versions/` se aplican solas.

## Acceso

- **API pública** (la que usan la app móvil y el dashboard web): el puerto `API_PORT` (por defecto 8000), expuesto a través de su túnel/dominio.
- **Postgres**: solo accesible desde el propio Pi (`127.0.0.1:5432`), nunca expuesto públicamente.
- Docs interactivos de la API (Swagger): `http://<pi>:8000/docs` — útiles para probar endpoints a mano mientras no hay túnel.

## Primer arranque: crear la primera sucursal + el primer admin

Los endpoints de creación (`POST /gyms`, `POST /users`) requieren estar autenticado como `platform_admin` — pero para crear el primero no hay todavía ninguna cuenta. Por eso existe un script aparte que inserta directo en la base:

```
docker compose exec api python -m scripts.seed_first_admin
```

Te va a pedir el nombre de la sucursal, el correo/contraseña del primer `platform_admin`, etc. Después de esto, todo lo demás (más sucursales, staff, entrenadores) se crea vía la API normal, autenticado con ese usuario.

## Apuntar la app móvil / dashboard aquí

En `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://api.tu-dominio.com
```

En `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

(Estas variables se conectan cuando se retiren los mocks de cada app — ver plan de fases del backend.)

## Backups

```
sh scripts/backup.sh
```
Genera un dump comprimido en `infra/backups/` (ignorado por git) y borra los de más de 14 días. Prográmalo por cron en el Pi:
```
0 3 * * * /ruta/al/repo/infra/scripts/backup.sh >> /var/log/gym-backup.log 2>&1
```
**Importante**: además copien estos dumps fuera del Pi periódicamente (USB aparte, otra máquina, un storage cloud barato). Un backup que vive en el mismo disco que puede fallar no protege de nada.

## Migrar la data a un SSD por USB (cuando lo tengan)

Los datos de Postgres son un bind mount controlado por `GYM_DATA_PATH` en `.env` (por defecto `./data`). Para moverlos:

```
docker compose down
# monta el SSD, ej. en /mnt/ssd
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

## Checklist de seguridad antes de exponer esto a internet

- [ ] Cambiaste todos los valores de `.env` (nada de defaults de ejemplo)
- [ ] `restart: always` está en ambos servicios (ya viene así en `docker-compose.yml`)
- [ ] Postgres sigue expuesto solo en `127.0.0.1` (nunca lo publiques directo a internet)
- [ ] Backups corriendo por cron + copiados fuera del Pi
- [ ] UPS conectado al Pi y al router
