#!/bin/sh
# Backup diario de la base de datos. Pensado para correr por cron en el Pi:
#   0 3 * * * /ruta/al/repo/infra/scripts/backup.sh >> /var/log/gym-backup.log 2>&1
#
# Genera un dump comprimido con fecha y borra los de más de 14 días.
# IMPORTANTE: esto solo resuelve la mitad del problema (backup local). Además
# hay que copiar estos dumps fuera del Pi (USB aparte, otro equipo, un bucket
# cloud barato, etc.) para que un fallo físico del Pi no se lleve también los
# backups.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$INFRA_DIR/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Lee POSTGRES_USER/POSTGRES_DB de infra/.env (mismos valores que usa docker-compose.yml).
# shellcheck disable=SC1091
. "$INFRA_DIR/.env"

docker exec gym-db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/gym-db-$TIMESTAMP.sql.gz"

# Conserva solo los últimos 14 días de backups locales
find "$BACKUP_DIR" -name "gym-db-*.sql.gz" -mtime +14 -delete

echo "Backup guardado en $BACKUP_DIR/gym-db-$TIMESTAMP.sql.gz"
