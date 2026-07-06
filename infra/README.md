# Infraestructura self-hosted (Supabase en Docker)

Stack de Supabase recortado para correr en la Raspberry Pi del equipo: Postgres, Auth (GoTrue), PostgREST, Storage, Meta y Studio, detrás de Kong como API gateway. Se dejaron fuera Realtime, Edge Functions, imgproxy, Analytics y Supavisor (no los usa la app todavía y son pesados para un Pi) — se pueden agregar después si hacen falta.

## Antes de arrancar (una sola vez)

1. **Genera los secretos**:
   ```
   cd infra
   cp .env.example .env
   node scripts/generate-secrets.js --write
   ```
   Esto escribe `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DASHBOARD_PASSWORD` y `PG_META_CRYPTO_KEY` directo en tu `.env`. **Nunca subas `.env` a git** (ya está en `.gitignore`).

2. Completa a mano en `.env`:
   - `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL` → tu dominio real detrás del túnel (ej. `https://api.tudominio.com`, `https://tudominio.com`)
   - `SMTP_*` → si quieren confirmación de correo real. Mientras no lo tengan, dejen `ENABLE_EMAIL_AUTOCONFIRM=true` para poder probar sin enviar correos.
   - `DASHBOARD_USERNAME` → cámbialo del default.

3. **Arranca el stack**:
   ```
   docker compose up -d
   docker compose ps        # todos deben terminar "healthy"
   ```

4. El esquema del gym (`../supabase/schema.sql`) se aplica solo, automáticamente, la primera vez que se crea la base de datos (vía `docker-entrypoint-initdb.d`). Si el volumen de datos ya existía de una corrida anterior, Postgres **no** vuelve a correr los scripts de init — en ese caso aplícalo a mano con `psql` o desde el SQL Editor de Studio.

## Acceso

- **API pública** (la que usan la app móvil y el dashboard web): el puerto `KONG_HTTP_PORT` (por defecto 8000), expuesto a través de su túnel/dominio.
- **Supabase Studio (admin)**: **no** se expone públicamente a propósito. Se conecta solo desde el propio Pi o vía túnel SSH:
  ```
  ssh -L 3000:localhost:3000 pi@<host-del-pi>
  ```
  y luego abre `http://localhost:3000` en tu máquina.

## Apuntar la app móvil aquí

En `apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://api.tudominio.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=<el ANON_KEY de infra/.env>
```

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

Los datos de Postgres y Storage son bind mounts controlados por `GYM_DATA_PATH` en `.env` (por defecto `./data`). Para moverlos:

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
- [ ] Studio **no** está expuesto por el túnel (verifica que `https://tudominio.com/` a través de Kong no devuelva el dashboard — con este `kong.yml` recortado no hay ruta catch-all hacia Studio, así que debe dar 404)
- [ ] `restart: always` está en todos los servicios (ya viene así en `docker-compose.yml`)
- [ ] Backups corriendo por cron + copiados fuera del Pi
- [ ] UPS conectado al Pi y al router
