SuperIntuitive - PHP edition
===========================

This is a clean application distribution, not a backup of a running site.
Your database, uploaded media, plugins, credentials and installation keys are
not included. The packaged core/DbCreds.php is an empty bootstrap class.

Quick start with Docker
----------------------
1. Extract the ZIP. Open a terminal in the extracted SuperIntuitive folder.
2. Install Docker with Compose if it is not already available.
3. Run: docker compose up --build -d
4. Open http://localhost:8090
5. Retrieve your new installation key in your own terminal:
   docker compose exec web cat /var/www/html/core/setup.token
6. Complete the installer. For the bundled local database select:
   - Existing database and user
   - Server: db; port: 3306
   - Database: super_intuitive; user: super_intuitive
   - Password: super_intuitive
   Choose your own administrator password (10 to 72 bytes).

These database passwords are local development defaults. For a deployment,
set SI_DB_PASSWORD and SI_DB_ROOT_PASSWORD through your environment or a new
private .env before starting Compose. A new installation key is generated
automatically unless you provide SI_SETUP_TOKEN. The ports bind to loopback.

Existing installation
---------------------
Back up your deployment first. This ZIP has no site-specific state; do not
replace an existing core/DbCreds.php, install.lock, domains, plugins or data
with the clean files from this package. Use the normal installer for a new
installation. Do not rerun setup against an installed database.

Other PHP hosting
-----------------
Use Apache with rewrite/headers and PHP PDO MySQL and ZIP support. Keep the
extracted directory named SuperIntuitive (the PHP entry points use that name).
Preserve the .htaccess files, including the ones in editor, scripts and style:
some shared JavaScript/CSS assets are rendered through PHP. Make core, domains,
logs, plugins and sql writable by the server as needed. Set SI_SETUP_TOKEN in
the server environment to a random secret of at least 32 characters; .env is
loaded by Docker Compose, not by PHP itself. See core/PhpRuntime.php and the
Dockerfile for the supported PHP versions; the app checks the runtime.

The ZIP contains PACKAGE.json with SHA-256 hashes of its files. The original
PHP source is copied unchanged. SuperIntuitive's license is in LICENSE.
