#!/bin/sh
set -eu

php -r 'require "/usr/local/lib/superintuitive/PhpRuntime.php"; \SuperIntuitive\PhpRuntime::RequirePatched();'

for path in \
    /var/www/html/domains \
    /var/www/html/logs \
    /var/www/html/plugins \
    /var/www/html/plugins/downloaded \
    /var/www/html/plugins/installed \
    /var/www/html/sql/backups \
    /var/www/html/sql/installer
do
    mkdir -p "$path"
    chown www-data:www-data "$path"
    chmod 0755 "$path"
done

ln -sfn /var/www/html /var/www/SuperIntuitive

if [ ! -f /var/www/html/core/DbCreds.php ] || [ ! -s /var/www/html/core/DbCreds.php ]; then
    cat <<'PHP' > /var/www/html/core/DbCreds.php
<?php
namespace SuperIntuitive;
class DbCreds { }
PHP
fi

chown www-data:www-data /var/www/html/core /var/www/html/core/DbCreds.php
chmod 0755 /var/www/html/core
chmod 0640 /var/www/html/core/DbCreds.php

# Establish installer ownership without publishing a secret in source or logs.
if [ ! -e /var/www/html/core/setup.token ] && [ ! -e /var/www/html/core/install.lock ]; then
    (umask 077; php -r 'file_put_contents("/var/www/html/core/setup.token", bin2hex(random_bytes(32)).PHP_EOL, LOCK_EX);')
fi
if [ -f /var/www/html/core/setup.token ]; then
    chown www-data:www-data /var/www/html/core/setup.token
    chmod 0640 /var/www/html/core/setup.token
fi

exec "$@"
