# superintuitive

Drag and drop, point and click, website builder. 

## Build distribution ZIPs

On Windows, run `package.bat` from the repository root. It creates `dist/SuperIntuitive-php.zip` and `dist/SuperIntuitive-sipl.zip`, each with its own `SuperIntuitive` folder, setup instructions and a `PACKAGE.json` file containing SHA-256 hashes. Only Windows PowerShell is required to package the current application files. An optional output directory is supported: `package.bat -OutputDirectory "D:\Releases"`.

The build uses `packaging/files.json` to select application files. It excludes local database credentials, `.env`, installation keys/locks, domain content, uploaded files, installed plugins, logs, backups and development artifacts. The PHP edition gets an empty credentials bootstrap; the SIPL edition contains no PHP files. Both editions require their language runtime to be installed separately; `sipl.exe` and runtime installers are excluded. These ZIPs are clean application distributions, not backups or database exports.

Run `python tests/package_releases.py --negative` after building to check hashes, required files, credential exclusion, paths containing spaces and preservation of previous releases when a build fails. Installer source inputs can be rebuilt with `python core_sipl/tools/build_installer.py`; this compiles the existing SQL/template into native assets without running or modifying PHP.

## Docker setup

This repo runs in Docker with patched PHP 8.2.35, Apache, and MariaDB. The installer and application reject PHP releases below 8.2.35, 8.3.36, 8.4.27, or 8.5.12 in their respective branches, as well as unsupported branches and prereleases. These minimums address the [October 21, 2026 PHP security advisory](https://www.php.net/archive/2026.php).

After updating this repository, rebuild and recreate the web service to replace an older PHP runtime:

```bash
docker compose build --pull web
docker compose up -d --no-deps web
```

The version check cannot protect a vulnerable PHP process before application code runs. Rebuilding and restarting PHP is required. See [the security review](SECURITY_REVIEW.md) for findings and deployment considerations.

### Requirements

- Docker Desktop or Docker Engine with Compose

### Start the stack

```bash
docker compose up --build
```

The site will be available at `http://localhost:8080`.

The web and phpMyAdmin ports bind to loopback. Complete installation before exposing a deployment publicly, use HTTPS, and replace the development database passwords. Uploads default to 24 MB per file and 32 MB per request. Detailed PHP errors go to server logs; application debug dumps are disabled unless `SI_DEBUG_LOG=1` is explicitly set.

### Optional phpMyAdmin

phpMyAdmin is available as an optional debug service so it does not change the default stack.

Start it alongside the rest of the containers with:

```bash
docker compose --profile tools up --build
```

Or start only phpMyAdmin against an already-running stack with:

```bash
docker compose --profile tools up -d phpmyadmin
```

phpMyAdmin will be available at `http://localhost:8081` by default.

The optional service pulls its current image when started so an old cached PHP runtime is replaced.

Use the MariaDB credentials from the compose file:

- Server: `db`
- Username: `root`
- Password: `super_intuitive_root`

Or log in with the app user instead:

- Username: `super_intuitive`
- Password: `super_intuitive`

You can change the phpMyAdmin port with `SI_PHPMYADMIN_PORT`.

### Installer values

The first Docker startup generates a private installation key. Retrieve it from your own terminal and enter it in the installer's **Installation key** field:

```bash
docker compose exec web cat /var/www/html/core/setup.token
```

If `SI_SETUP_TOKEN` is set in `.env` or the server environment, enter that value instead of the generated file key. Compose loads `.env` when it creates the web container; after changing it, run `docker compose up -d --no-deps web` to apply the configuration. A container restart alone retains its existing environment. PHP does not read `.env` directly.

Step 1 validates the key with the server before opening the next step. Successful authorization rotates the PHP session ID and CSRF token, clears the key from the form, and preserves setup ownership in the server session. Database tests and installation then require the authorized session and CSRF token, without sending the installation key again. Reloading the wizard preserves authorization. Setup authorization expires after 30 idle minutes or 12 hours; reauthorization preserves other values still in the form.

Keep the key private. For other hosting, set `SI_SETUP_TOKEN` in the server environment to a cryptographically random secret of at least 32 characters. A successful installation must persist its lock and revokes setup authorization. The key cannot reopen the installer afterward; ongoing management uses administrator login.

On first load, use the browser installer and choose `Use existing user and database`.

- Database Type: `mysql`
- Server: `db`
- Port: `3306`
- Existing Database: `super_intuitive`
- Existing DB User: `super_intuitive`
- Existing DB Password: `super_intuitive`

The domain field should default to `localhost` even when you are using port `8080`.

Choose an administrator password of 10 to 72 bytes. Existing domain folders, databases, and users are never deleted by installation. Fresh setup can reuse an unchanged starter domain folder and fill missing template files; custom or modified files block setup. A failed partial database installation requires administrator repair before setup can run again.

Authenticated sessions expire after 30 idle minutes or 12 hours, and account, password, and role changes take effect on subsequent application requests. Login/password verification allows 10 attempts per peer IP per 5 minutes across browser sessions. Configure trusted proxy handling at the web server if hosting behind a reverse proxy. Media URLs are public; page permissions do not make attachments private.

### Default page theme

The default page uses the navy palette, typography, and sidebar navigation from `sipl-reference.html`. Its editable source files are in `core/setup/default-theme/`.

After changing those files, regenerate the installer blocks and standalone preview:

```bash
python3 scripts/build_default_theme.py
```

Open `/default-page-preview.html` on the local web server to review the page before installing. New installations receive the theme in development, test, and live. Existing site content stays in the database and can be edited through the CMS.

The Login block owns its popup and field styles in `login.css`, with behavior in `login.js`. To edit the guest form while signed in as an administrator, open **Account → Edit login form**, then select and edit its elements as usual. **Done editing login form** restores the account controls. Saving excludes this temporary editor button, and previewing the form does not submit a login or change the administrator session.

After signing in as an administrator, right-click an element to select it and open **Add / Edit / Tools**. Double-click also selects an element. Right-click the selected element again to clear selection. Closing the context menu with X clears both element and block selection. **Add** has searchable Tags and Widgets: drag an item onto a page block to see a translucent placement preview and its destination before dropping. You can also click an item, then click a position on the page. Escape cancels placement; an invalid drop leaves the page unchanged.

Use **Edit** to change the selection's content, attributes, or styles. Text fields support paste, and style values can be typed directly or chosen from their controls. **Save block** (or Ctrl/Cmd+S) saves the selected block to development; **Tools → Page** also has block save controls. The selection shows when changes are unsaved. Arrow keys move positioned elements by 1 pixel, or 10 with Shift, and Delete asks before removing the selection. These shortcuts leave text editing alone.

The Security tool shows one permission form per role tab. Switching tabs preserves unsaved checkbox changes; New Role opens a new tab. Role navigation and Save/Delete controls remain accessible while permissions scroll.

The Page tool uses larger, high-contrast vector action icons. Import Block opens a resizable form with a full-width block picker, excludes blocks already on the page, and reports loading or import failures.

Tool windows share the menu palette and control styles in `editor/editor.css`. The window and tab builders add reusable structural classes; editor-owned windows use the `si-editor-tool-window` class. Runtime positioning, resizing, and visibility stay in JavaScript.

### Security regression checks

```bash
docker build -t superintuitive-security-check .
docker run --rm --network none --entrypoint php -v "$PWD:/workspace:ro" superintuitive-security-check /workspace/tests/security.php
python3 tests/security_http.py
python3 tests/security_http.py --environment-key
python3 tests/security_http.py --environment-key --browser
python3 tests/security_http.py --privileged
```

The HTTP checks use Docker to create and remove an isolated site copy and database. Existing site data and running services are preserved.

The optional `--browser` checks require Node.js 22+ and Chrome. They verify administrator login, right-click editing, search, native tag/widget drag previews, cancellation, placement in scrolled containers, moving elements, text and style editing, all standalone widget constructors, saving content and widget settings across a reload, Security role tabs, Page action icons, and importing existing blocks in desktop and narrow windows. Set `SI_NODE_BIN` or `CHROME` if the executables are not detected.

### Deployment behavior

The preview selector changes only your session: administrators can view Dev, Test, and Live; testers can view Test and Live; guests see Live. Switching with unsaved editor changes asks before discarding them.

The green promotion action copies saved Dev data to Test; yellow copies Test to Live. The red action saves the current Live value to an existing rollback column. It is a snapshot action, not a restore action. Page options and block layout options/order currently have no rollback columns, so their red controls are disabled with an explanation. No schema migration is applied.

Options must be JSON objects. Native objects are encoded once; already encoded objects are validated. Empty objects and arrays, nulls, booleans, Unicode, quotes, and backslashes retain their types. Promotion copies the stored SQL value directly and reports success only after committing. Block content and its page-specific JSON options save in one transaction.

Media follows Dev → Test → Live, with atomic file replacement. The Live media action saves a rollback file. Preview URL rewriting preserves existing deployment prefixes and external media URLs.

Run the deployment and JSON SQL regressions with `python3 tests/security_http.py --deployment`. Add `--browser` to include real preview switching, cancellation of unsaved changes, and the circular deployment controls.

### Useful commands

```bash
docker compose down
docker compose down -v
```

`docker compose down -v` removes the MariaDB data volume and gives you a clean install.
