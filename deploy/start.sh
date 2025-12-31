#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/html
PORT_VALUE=${PORT:-10000}

echo "[start] Using PORT=${PORT_VALUE}"

# Inject Render PORT into nginx config
sed -i "s/__PORT__/${PORT_VALUE}/g" /etc/nginx/conf.d/default.conf

cd "$APP_DIR"

# Cache config/routes/views if possible; ignore failures in first boot
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Run migrations if DB is configured
if [[ -n "${DB_CONNECTION:-}" ]]; then
  php artisan migrate --force || true
fi

# Ensure storage is writable
chown -R www-data:www-data storage bootstrap/cache || true

echo "[start] Launching supervisord (php-fpm + nginx)"
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

