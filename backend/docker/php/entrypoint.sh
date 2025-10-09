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

echo "[php] Starting php-fpm..."
exec php-fpm -F
