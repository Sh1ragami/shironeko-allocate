## Multi-stage Dockerfile to serve Laravel API + built Vite frontend on Render

# 1) Build frontend assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
# Use npm install because package-lock.json is not committed
RUN npm install --no-audit --no-fund
COPY frontend/ .
RUN npm run build

# 2) Install PHP dependencies (no dev)
FROM composer:2 AS composer-builder
WORKDIR /app
COPY backend/app/composer.json backend/app/composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader

# 3) Final runtime: PHP-FPM + Nginx
FROM php:8.2-fpm-bullseye

ENV APP_DIR=/var/www/html \
    PHP_OPCACHE_VALIDATE_TIMESTAMPS=0

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor curl ca-certificates git unzip \
    libzip-dev libpng-dev libonig-dev libxml2-dev libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions commonly needed by Laravel + Socialite
RUN docker-php-ext-install pdo pdo_mysql opcache mbstring tokenizer xml pcntl bcmath zip curl

# Copy Laravel app
WORKDIR ${APP_DIR}
COPY backend/app/ ${APP_DIR}/

# Copy vendor from composer stage
COPY --from=composer-builder /app/vendor ${APP_DIR}/vendor

# Copy built frontend into public directory
COPY --from=frontend-builder /app/dist ${APP_DIR}/public

# Nginx + Supervisor configs and startup script
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/start.sh /start.sh
RUN chmod +x /start.sh \
    && mkdir -p /run/nginx \
    && chown -R www-data:www-data ${APP_DIR}

# Remove any committed .env to ensure only runtime env vars are used
RUN rm -f ${APP_DIR}/.env || true

# Expose Render web port
EXPOSE 10000

# Default healthcheck (hits Laravel API health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:10000/api/health || exit 1

CMD ["/start.sh"]
