#!/bin/bash
set -euo pipefail

# ==============================================
# Первоначальная настройка EC2 для ochag-kz
# Запускать один раз на свежем Ubuntu 24.04
# Usage: bash deploy/setup.sh
# ==============================================

REPO_URL="https://github.com/evshp/ochag-kz.git"
APP_DIR="/home/ubuntu/ochag-kz"
BACKUP_DIR="/home/ubuntu/backups"
S3_BUCKET="ochag-kz-backups"

echo "=== 1. Обновление системы ==="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "=== 2. Установка Docker ==="
sudo apt-get install -y docker.io docker-compose-v2 unzip
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

echo "=== 3. Установка AWS CLI ==="
if ! command -v aws &> /dev/null; then
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
  unzip -q /tmp/awscliv2.zip -d /tmp
  sudo /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi

echo "=== 4. Клонирование репозитория ==="
if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "Репозиторий уже есть, обновляю..."
  cd "$APP_DIR" && git pull origin main
fi

echo "=== 5. Генерация .env ==="
cd "$APP_DIR"
if [ ! -f .env ]; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  JWT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 48)

  cat > .env << EOF
DB_USER=ochag_user
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
EOF

  echo ".env создан с рандомными паролями"
  echo "DB_PASSWORD: ${DB_PASSWORD}"
  echo "JWT_SECRET: ${JWT_SECRET}"
  echo ""
  echo "!!! СОХРАНИТЕ ЭТИ ЗНАЧЕНИЯ В НАДЁЖНОЕ МЕСТО !!!"
else
  echo ".env уже существует, пропускаю"
fi

echo "=== 6. Запуск Docker Compose ==="
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d --build

echo "=== 7. Настройка бэкапов ==="
mkdir -p "$BACKUP_DIR"

# Добавить cron для ежедневного бэкапа в 3:00
CRON_JOB="0 3 * * * /home/ubuntu/ochag-kz/deploy/backup.sh >> /home/ubuntu/backups/backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_JOB") | crontab -

echo "=== 8. Проверка ==="
sleep 10
echo "Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Health check:"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost/api/products && echo " - OK" || echo " - FAILED"

echo ""
echo "=== ГОТОВО ==="
echo "Сервер: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "Следующие шаги:"
echo "1. Настроить AWS CLI: aws configure (для бэкапов в S3)"
echo "2. Настроить DNS в Cloudflare: A-запись → $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "3. Добавить GitHub Secrets: EC2_HOST и EC2_SSH_KEY"
