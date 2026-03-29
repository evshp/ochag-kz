#!/bin/bash
# Get real SSL certificate from Let's Encrypt.
# Run ONCE on the EC2 server after first deploy:
#   cd /home/ubuntu/ochag-kz && ./deploy/init-ssl.sh your@email.com
#
# Nginx is already running (with self-signed cert from entrypoint).
# This script replaces it with a real Let's Encrypt certificate.

set -e

DOMAIN="ochagi-kaminy.kz"
EMAIL="${1:?Usage: ./deploy/init-ssl.sh your@email.com}"

echo "=== Requesting certificate from Let's Encrypt ==="

docker compose -f docker-compose.prod.yml run --rm certbot \
  certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal

echo "=== Restarting nginx with real certificate ==="

docker compose -f docker-compose.prod.yml restart nginx

echo ""
echo "=== Done! HTTPS is live at https://$DOMAIN ==="
echo ""
echo "Certbot container will auto-renew every 12 hours."
