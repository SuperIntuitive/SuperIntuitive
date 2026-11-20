FROM php:8.2-apache

RUN a2enmod rewrite headers \
    && docker-php-ext-install pdo_mysql

COPY docker/apache-site.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/superintuitive.ini
COPY docker/entrypoint.sh /usr/local/bin/superintuitive-entrypoint

RUN chmod +x /usr/local/bin/superintuitive-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["superintuitive-entrypoint"]
CMD ["apache2-foreground"]