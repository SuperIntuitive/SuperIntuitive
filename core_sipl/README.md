# Super Intuitive: parallel SIPL backend

This is a native SIPL port beside the existing PHP backend. It uses the existing MySQL schema and mirrors the website's endpoint URLs. It does not execute or proxy PHP. **It is a validation preview, not ready for cutover.** See [the migration and runtime gap report](MIGRATION_REPORT.md).

The current Windows build includes native MySQL/MariaDB and PHP-compatible bcrypt. Verification covers real TLS database queries, bidirectional PHP/SIPL password compatibility, Chrome editing, and native first-time installation. The local executable matches `C:\Users\bobta\Repos\sipl\build\sipl.exe`; details are recorded in the ignored local `validation.json` report.

## First-time native installation

Install a SIPL runtime with native MySQL/MariaDB and bcrypt support separately and make `sipl.exe` available on PATH (or set `SI_SIPL_RUNTIME` to its full path for the launcher). The ZIP contains application files only.

A fresh SIPL package opens the six-step wizard at `http://localhost:8092` when no database connection is configured. Run `start-sipl.bat` in the extracted distribution, or `sipl.exe run core_sipl/main.sipl` in its root. Startup creates a private `core/setup.token` unless `SI_SETUP_TOKEN` is configured. Read the file locally and enter the key once; later steps preserve authorization using the session and CSRF token.

Use an empty MySQL/MariaDB database and user, or choose creation of a new database and user with a privileged account. Existing schemas and domain folders are rejected without replacement. The administrator password remains 10–72 bytes. Submitted seed values use parameters; the server's account DDL requires a literal for the generated database password, which is checked against the runtime's URL-safe token alphabet before use.

The installer writes native private configuration, scoped installation markers and a permanent `core/install.lock`; it never writes `DbCreds.php`. Administrator authentication takes over afterward. `core/setup.lock` journals the operation. Restart verifies the matching database installation ID and starter media before finalizing a committed install. Earlier DDL failures stay locked for administrator repair, preserving tables; MySQL schema creation cannot be rolled back like seed data. Keep the pending configuration private.

To connect an already installed database, configure `core_sipl/config.local.json` before starting. This opens the installed site and blocks installer actions. Configuration and site data are excluded from distribution ZIPs.

## Run the preview

Your existing database settings have been imported into ignored private configuration, and the real site passed a read-only connection/page check. The preview is available at [http://localhost:8092](http://localhost:8092). Sign in using the same administrator account as PHP. Each backend keeps its own session; edits use the same underlying database.

To start or restart from PowerShell in the project root:

```powershell
sipl run core_sipl/main.sipl
```

`core_sipl/config.local.json` loads automatically. An explicit configuration path can override the default:

```powershell
sipl run core_sipl/main.sipl core_sipl/config.local.json
```

To reuse literal database settings from an existing PHP installation on another checkout:

```powershell
node core_sipl/tools/import_php_config.cjs
```

The importer does not execute PHP, modify it, print credentials, or overwrite existing private configuration. For a fresh configuration, use `config.example.json` only when no private configuration exists, then enter the database settings. Use a cloned database for write/parity testing.


The default SIPL listener is `http://localhost:8092`. PHP stays at `http://localhost:8090`; Docker configuration and ports were not changed. A configured connection is not required to open the switch launcher or inspect capabilities:

- [Switch backends](http://localhost:8090/core_sipl/switch.html), also served by SIPL at the same path.
- [SIPL runtime status](http://localhost:8092/__sipl/status).

Click **Check runtime** to see prerequisites, then choose PHP or SIPL. Switching navigates between origins and keeps separate sign-in sessions. Save edits first. The launcher is opened explicitly for development testing; website pages do not display a backend-switch control. Switching does not rewrite PHP source. An unconfigured root opens first-time setup; configured sites with missing prerequisites show an explanation and link back to the launcher.

Configuration precedence: defaults → private local JSON (or explicitly supplied JSON) → allowlisted environment variables. SIPL does **not** implicitly read the project's `.env` or PHP's `DbCreds.php`. Available environment overrides:

| Environment variable | JSON setting |
| --- | --- |
| `SI_SIPL_DSN` | `dsn` |
| `SI_SIPL_DB_USER` | `dbUser` |
| `SI_SIPL_DB_PASSWORD` | `dbPassword` |
| `SI_SIPL_PORT` | `port` |
| `SI_SIPL_DOMAIN` | `domain` |
| `SI_SETUP_TOKEN` | `setupToken` |

`root` optionally selects an absolute project directory; otherwise the working directory is used. `domain`/`subdomain` choose one tenant, rather than trusting the incoming Host to choose database ownership. Native credentials are ignored by Git and the Docker build context. Apache blocks the SIPL source/configuration tree, allowing only the launcher and its two browser assets.

The default listener is loopback HTTP for local testing. Public listeners require `secureCookies: true`; use a TLS reverse proxy or native `certFile`/`keyFile` settings. PHP and SIPL sessions are deliberately separate. Keep `allowNativePasswords: false`; its opt-in is retained only for synthetic PBKDF2 fixtures. Existing PHP accounts now authenticate through native bcrypt.

## Verify

From the repository root:

```powershell
sipl run core_sipl/tools/verify.sipl --http --browser --package
```

The runner is SIPL. `--http` adds the existing Node HTTP driver; `--browser` also uses installed Chrome (set `CHROME` if needed). `--package` verifies the release's complete file list and hashes. Omit these flags for native-only unit, parameter, packaging, upgrade and preservation checks. Python is not required.

The HTTP driver uses the runner's selected executable, not a required checked-in binary. Run it independently with `node core_sipl/tests/http.cjs --runtime C:\path\to\sipl.exe --browser`; standalone selection is `--runtime`, then `SI_SIPL_RUNTIME`, then an optional local `sipl.exe`, then `sipl` on PATH.

The runner starts and ends with the historical PHP preservation guard. Intentional PHP edits can make that baseline fail; do not renew unrelated hashes just to make a cleanup pass. The independent native checks are `sipl run core_sipl/tests/unit.sipl`, `sipl run core_sipl/tests/native_params.sipl` and `sipl run tests/package.sipl`. The baseline only drops entries for files deliberately retired from the source tree.

To test the configured database connection:

```powershell
sipl run core_sipl/tests/mysql.sipl /path/to/explicit-test-config.json
```

The live MySQL test creates and drops a uniquely named **connection-local temporary table only**. It checks native binding, JSON, binary GUIDs, commit, and rollback. It never imports a schema, creates a database/user, or writes CMS records. The account needs temporary-table permission. Native in-memory SQL tests exercise the shared parameter API only; they are not evidence of MySQL compatibility.

Verification reports are local output and are ignored by Git: `validation.json` records the Windows backend/session/browser/Apache run and the exact executable path/hash; `mysql-validation.json` records the successful live Windows connector run against a disposable TLS-enabled database. The installed-site fixture covers 32 HTTP workflows and 33 browser workflows. Password interoperability is recorded in `password-validation.json`; installed-site results are in `site-validation.json`. These reports are not included in a fresh checkout. Remaining features are listed in the migration report.

## Confirm the executable and connector

The tested Windows executable SHA-256 is `b3088cb85c34df529d24fd9868c16f89068874bf0b5e49c7bf541c6f0b464038`. The copy under `SuperIntuitive/` matches the selected `sipl/build/sipl.exe`. The newer Windows build links Connector/C statically; no separate MariaDB DLL is required for this tested build. Restart an already-running preview after updating the executable.

```powershell
sipl run core_sipl/tools/runtime_probe.sipl
```

A connection-refused error from the probe's deliberately unused loopback port means the driver ran; `MySQL driver unavailable` means it was not compiled in. The probe intentionally does not connect to your site database. Both `bcryptVerify` and `bcryptHash` should now be true. For a read-only check of your configured tenant, run `sipl.exe run core_sipl/tools/connection_check.sipl`.

To test a selected executable against a fresh disposable MariaDB container:

```powershell
node tests/sipl_package_plugins.cjs --fixture --runtime .\sipl.exe --browser
```

The fixture uses `mariadb:11.4` with secure transport required, seeds through the packaged native installer, and exercises plugin discovery, installation and Contact's native handler. It executes no PHP or Python. The older non-TLS 10.11 fixture was rejected by the new connector.

The test chooses temporary loopback ports and generated credentials, then removes its database container and extracted package. Existing Docker services and their port mappings are untouched.


## Structure and maintenance

- `main.sipl`, `src/`: native HTTP dispatch, database, security/session, content and editor services.
- `switch.html`, `public/`: shared launcher, backend badge, capability/error display.
- `generated/`: PHP-free editor template, widget CSS, static lookup tables, bootstrap fragments.
- `../packaging/Package.sipl`: native release, Contact ZIP, default-theme, installer/editor asset, verification and offline upgrade tools. Asset generation parses shared PHP source text without executing it.
- `tests/`: unit/SQL-contract checks, actual native parameter checks, native HTTP/session/Chrome tests, Apache isolation, and opt-in live MySQL test.
- `php-baseline.json`, `Package.sipl preservation`: hash guard for the reviewed PHP source and PHP-containing assets. The baseline was deliberately renewed after consolidating the dual-backend plugin host into the main repository. The credentials file was read by the opt-in literal importer to create private JSON; PHP files were never edited or executed by that importer.

When editor PHP or static lookup definitions change intentionally on the PHP side, regenerate the native template and review its diff. The preservation baseline intentionally fails if protected source changes; update it only as a separate, deliberate maintenance action after reviewing those PHP changes.

## Build and test distributions

Run `package.bat` on Windows to build `dist/SuperIntuitive-php.zip` and `dist/SuperIntuitive-sipl.zip`. The latter uses a separately installed SIPL runtime and contains no PHP files. Runtime executables and installers are excluded from both ZIPs. Both ZIPs exclude private deployment state and include file hashes and edition-specific instructions.

```powershell
sipl run packaging/Package.sipl assets
.\package.bat
php tests/package.php
sipl run tests/package.sipl
node tests/sipl_package_plugins.cjs --fixture --browser
```

The first two commands build the release files. PHP and SIPL each test their own packaging and upgrade code against synthetic state. The packaged fixture requires Docker, Node and Chrome, extracts the ZIP and uses a disposable TLS MariaDB. The server, database seeding, handlers and archive reader all run in SIPL.

## Plugin releases

`package.bat` uses the checked-in SIPL plugin host and produces `dist/SuperIntuitive-sipl.zip` with no bundled plugins. Admins in Dev can discover/download separate plugin ZIPs through Tools → Plugins → Plugins Repo, then install from Local Plugins. The build rejects the obsolete installation placeholder. See [the native plugin guide](PLUGINS.md).

Verify the delivered edition itself with `node tests/sipl_package_plugins.cjs --fixture --browser --contact /path/to/contact.zip`; this extracts the release, seeds a disposable database with its native installer, and tests the packaged server and editor. No PHP or Python backend is used. The running website and its data are not part of this test.
