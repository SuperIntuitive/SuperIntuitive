SuperIntuitive - SIPL edition (Windows preview)
=============================================

The ZIP includes the native backend, generated templates and shared editor
assets. Install the SIPL runtime separately, with native MySQL/MariaDB and
bcrypt support, and make sipl.exe available on PATH. MySQL/MariaDB remains
the database; it is not bundled. The current SIPL backend is a validation
preview. Its native installer works; uploads and other features remain pending.
See core_sipl/MIGRATION_REPORT.md for the complete status.

First-time installation
-----------------------
1. Extract into a separate location from your PHP deployment.
2. With SIPL installed, double-click start-sipl.bat. Keep its window open.
3. Open http://localhost:8092. A fresh package opens the six-step installer.
4. Read the new key locally in a separate PowerShell window:
   Get-Content .\core\setup.token
5. Enter that key once in Step 1. You can instead set SI_SETUP_TOKEN in the
   server environment before startup; it must contain at least 32 characters.
6. Choose an empty MySQL/MariaDB database and its user, or provide an account
   allowed to create a new database and user. Existing tables and domain folders
   are not overwritten. The database server is separate from this package.
7. Choose locale settings and your administrator account (password: 10 to 72
   bytes), review, then install. The site opens when setup completes.

Setup writes private core_sipl/config.local.json and a permanent core/install.lock.
The installation key cannot reopen it. Sign in with your new administrator.
Stop the server with Ctrl+C; answer Y to close the batch prompt if asked.

Connect an existing installation
--------------------------------
To reuse an installed SuperIntuitive database, copy core_sipl/config.example.json
to core_sipl/config.local.json before startup and enter its dsn, dbUser,
dbPassword, domain and subdomain. The configured site opens without running
setup. Prefer a cloned database for write testing. The ZIP contains no personal
database content, credentials, uploaded media or installed plugins.

To check the runtime without contacting your site's database:
  sipl.exe run core_sipl/tools/runtime_probe.sipl

To check the configured database using SELECT queries only:
  sipl.exe run core_sipl/tools/connection_check.sipl

You can instead run the server from a terminal in the extracted folder:
  sipl.exe run core_sipl/main.sipl

The launcher uses the installed sipl.exe from PATH. If it is installed elsewhere,
set SI_SIPL_RUNTIME to its full path before running the launcher, for example
in PowerShell:
  $env:SI_SIPL_RUNTIME = 'C:\Program Files\SIPL\sipl.exe'
  .\start-sipl.bat

Using an existing site
----------------------
Database content and administrator accounts live in MySQL, not in this ZIP.
Copy your own site's domains/<domain>/media and any installed plugins separately
if needed, then restart the server. Do not share credentials, installation keys
or database backups.
If PHP and SIPL point to the same database, edits affect both backends, although
their login sessions are separate. Each process needs its own configuration.
This archive does not convert or copy your PHP installation automatically.

Keep config.local.json private. Do not expose the extracted folder as an
unrestricted static website: the SIPL server handles its own private paths.
For public testing, configure HTTPS and secure cookies as described in the
migration report.

Interrupted installation
-----------------------
core/setup.lock records progress. Restarting verifies an installation-specific
database marker and finishes publishing a committed installation. If schema
creation failed earlier, the installer stays locked and leaves existing tables
intact for administrator repair. Do not delete tables or the journal to force a
retry. Keep setup-config.pending.json private: it contains database credentials.

PACKAGE.json records application file hashes. LICENSE is SuperIntuitive's license.
