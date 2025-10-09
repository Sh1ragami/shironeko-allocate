FROM php:8.3-fpm-alpine

# System deps
RUN apk add --no-cache git unzip icu-dev oniguruma-dev libzip-dev bash shadow

# PHP extensions
RUN docker-php-ext-configure intl \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql bcmath mbstring intl zip

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

