#!/bin/sh
set -eu

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
    chmod 0777 "$path" || true
done

ln -sfn /var/www/html /var/www/SuperIntuitive

if [ ! -f /var/www/html/core/DbCreds.php ] || [ ! -s /var/www/html/core/DbCreds.php ]; then
    cat <<'PHP' > /var/www/html/core/DbCreds.php
<?php
namespace SuperIntuitive;
class DbCreds { }
PHP
fi

chmod 0777 /var/www/html/core || true
chmod 0666 /var/www/html/core/DbCreds.php || true

exec "$@"