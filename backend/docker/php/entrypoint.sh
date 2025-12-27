#!/usr/bin/env sh
set -euo pipefail

APP_DIR=/var/www/html

if [ ! -f "$APP_DIR/artisan" ]; then
  echo "[php] Laravel app not found in $APP_DIR"

  # If the directory only has .gitkeep, remove it so create-project can proceed
  ONLY_GITKEEP=$(find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' | head -n1 | wc -l)
  if [ "$ONLY_GITKEEP" -eq 0 ] && [ -f "$APP_DIR/.gitkeep" ]; then
    echo "[php] Removing lone .gitkeep"
    rm -f "$APP_DIR/.gitkeep"
  fi

  # Bootstrap only when directory is empty
  if [ -z "$(ls -A "$APP_DIR")" ]; then
    echo "[php] Bootstrapping Laravel into $APP_DIR ..."
    composer create-project --prefer-dist laravel/laravel "$APP_DIR"
  else
    echo "[php] $APP_DIR is not empty. Skipping automatic bootstrap."
  fi

  if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  fi

  # Configure .env using container env vars (with defaults)
  sed -i "s|^APP_URL=.*|APP_URL=${APP_URL:-http://localhost:8080}|" "$APP_DIR/.env"
  sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=${DB_CONNECTION:-mysql}|" "$APP_DIR/.env"
  sed -i "s|^DB_HOST=.*|DB_HOST=${DB_HOST:-db}|" "$APP_DIR/.env"
  sed -i "s|^DB_PORT=.*|DB_PORT=${DB_PORT:-3306}|" "$APP_DIR/.env"
  sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE:-app}|" "$APP_DIR/.env"
  sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME:-app}|" "$APP_DIR/.env"
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD:-app}|" "$APP_DIR/.env"

  php "$APP_DIR/artisan" key:generate --force

  # Add a simple /api/health route if absent
  if ! grep -q "/health" "$APP_DIR/routes/api.php" 2>/dev/null; then
    cat >> "$APP_DIR/routes/api.php" <<'PHP'
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'time' => now()->toIso8601String(),
    ]);
});
PHP
  fi

  chown -R www-data:www-data "$APP_DIR"
fi

# Ensure vendor is installed (in case the mapped volume lacks it)
if [ -f "$APP_DIR/composer.json" ] && [ ! -d "$APP_DIR/vendor" ]; then
  echo "[php] Installing composer dependencies..."
  composer install --no-interaction --prefer-dist --optimize-autoloader || true
fi

# Run migrations automatically when DB is configured (dev docker-compose)
if [ -f "$APP_DIR/artisan" ]; then
  if [ -n "${DB_CONNECTION:-}" ]; then
    echo "[php] Running database migrations (connection=${DB_CONNECTION})..."
    php "$APP_DIR/artisan" migrate --force || true
  fi
  # Ensure storage/cache are writable
  chown -R www-data:www-data "$APP_DIR/storage" "$APP_DIR/bootstrap/cache" || true
fi

echo "[php] Starting php-fpm..."
exec php-fpm -F
