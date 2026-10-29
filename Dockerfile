FROM php:8.2.35-apache

COPY core/PhpRuntime.php /usr/local/lib/superintuitive/PhpRuntime.php
RUN php -r 'require "/usr/local/lib/superintuitive/PhpRuntime.php"; \SuperIntuitive\PhpRuntime::RequirePatched();'

RUN apt-get update \
    && apt-get install -y --no-install-recommends libzip-dev \
    && a2enmod rewrite headers \
    && docker-php-ext-install pdo_mysql zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY docker/apache-site.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/superintuitive.ini
COPY docker/entrypoint.sh /usr/local/bin/superintuitive-entrypoint

RUN chmod +x /usr/local/bin/superintuitive-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["superintuitive-entrypoint"]
CMD ["apache2-foreground"]
