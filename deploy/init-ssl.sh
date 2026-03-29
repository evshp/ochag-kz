#!/bin/bash
# First-time SSL certificate setup for ochagi-kaminy.kz
# Run this ONCE on the EC2 server: ./init-ssl.sh

set -e

DOMAIN="ochagi-kaminy.kz"
EMAIL="${1:?Usage: ./init-ssl.sh your@email.com}"

echo "=== Step 1: Starting nginx without SSL (for ACME challenge) ==="

# Temporarily replace nginx config with HTTP-only version for initial cert
cat > /tmp/nginx-init.conf <<'INITCONF'
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name ochagi-kaminy.kz www.ochagi-kaminy.kz;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'Waiting for SSL setup...'; add_header Content-Type text/plain; }
  }
}
INITCONF

docker compose -f docker-compose.prod.yml up -d nginx
# Override nginx config temporarily
docker cp /tmp/nginx-init.conf "$(docker compose -f docker-compose.prod.yml ps -q nginx)":/etc/nginx/nginx.conf
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "=== Step 2: Requesting certificate from Let's Encrypt ==="

docker compose -f docker-compose.prod.yml run --rm certbot \
  certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal

echo "=== Step 3: Restarting with full SSL config ==="

docker compose -f docker-compose.prod.yml restart nginx

echo ""
echo "=== Done! HTTPS is live at https://$DOMAIN ==="
echo ""
echo "Certbot container will auto-renew every 12 hours."
rm -f /tmp/nginx-init.conf
