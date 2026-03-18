#!/bin/bash
set -euo pipefail

# ==============================================
# Бэкап PostgreSQL: дамп на диск + копия в S3
# Cron: 0 3 * * * /home/ubuntu/ochag-kz/deploy/backup.sh
# ==============================================

APP_DIR="/home/ubuntu/ochag-kz"
BACKUP_DIR="/home/ubuntu/backups"
S3_BUCKET="s3://ochag-kz-backups"
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="ochag_${DATE}.sql.gz"
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начинаю бэкап..."

# --- Уровень 2: Дамп на диск ---
# Читаем DB_USER и DB_PASSWORD из .env
source "$APP_DIR/.env"

docker exec ochag-kz-db-1 pg_dump \
  -U "$DB_USER" \
  -d ochag \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_DIR/$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "[$(date)] Дамп создан: $BACKUP_FILE ($SIZE)"

# --- Уровень 3: Копия в S3 ---
if command -v aws &> /dev/null; then
  aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "$S3_BUCKET/$BACKUP_FILE" --quiet
  # Также сохраняем как latest для удобства миграции
  aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "$S3_BUCKET/latest.sql.gz" --quiet
  echo "[$(date)] Загружено в S3: $S3_BUCKET/$BACKUP_FILE"
else
  echo "[$(date)] ВНИМАНИЕ: AWS CLI не установлен, S3-бэкап пропущен"
fi

# --- Ротация: удалить старые бэкапы ---
find "$BACKUP_DIR" -name "ochag_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Ротация: удалены бэкапы старше $KEEP_DAYS дней"

echo "[$(date)] Бэкап завершён"
