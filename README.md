# superintuitive

Drag and drop, point and click, website builder. 

## Project layout

| Location | Purpose |
| --- | --- |
| Root PHP entry points | Existing public endpoints; keep their filenames and URLs stable. |
| `core/` | PHP entities, installer, default theme and starter media. |
| `core_sipl/` | Native SIPL backend, edition guide, source, public launcher and generated runtime inputs. |
| `editor/`, `scripts/`, `style/` | Shared editor, widgets and browser assets, including bundled vendor code. |
| `packaging/`, `package.bat` | Offline build, plugin packaging and data-preserving upgrade tools. |
| `plugin-packages/` | Separately distributed plugin source, not installed plugins or CMS installer contents. |
| `tests/` | Project-wide, PHP, packaging and cross-edition integration/browser regressions. |
| `core_sipl/tests/`, `core_sipl/tools/` | SIPL-specific regression cases and native verification/connection tools. |
| `docs/` | Shared plugin guide, [historical security review](docs/SECURITY_REVIEW.md), [SIPL reference](docs/sipl-reference.html) and [acknowledgements](docs/ACKNOWLEDGEMENTS.txt). |

The old singular `test/` directory was a standalone Flash demo, not a test suite, and has been retired along with unused scratch copies. Keep the two current test locations: they serve different scopes and their imports and fixture runners use those paths.

Site content, uploads, credentials, installed plugins, logs and release output are local state, not framework source. Keep their existing locations and ignore rules; repository cleanup must not delete them or update a running deployment.

## Scripter blocks and JavaScript

Open **Scripter** and choose a CMS block. The visual **Blocks** workspace opens by default, with **Code** unchecked. Check **Code** when you explicitly want the source editor; uncheck it to return to Blocks. Functions, callbacks, loops, branches, classes and exception handlers expose their bodies as insertion lanes. Select a card to edit its bindings, expressions or parameters in the inspector; **Full JavaScript** edits any construct directly. The Build library inserts templates into the body selected with **+**. Drag handles move blocks between bodies; arrow buttons provide keyboard-accessible reordering. Undo and redo track block edits.

**Styler** also opens in its visual workspace with **Code** unchecked. Choose a stylesheet, edit its selector tokens and property controls, and use **Save** to include the latest visual edits. Checking **Code** explicitly opens the source editor; clearing it reloads the current stylesheet into visual controls. Opening these tools does not itself save or execute changes.

The source text remains authoritative. Switching between Code and Blocks retains untouched text, comments, strings, regular expressions and formatting. Changes are parsed in the surrounding program before they are committed; syntax errors retain the last valid blocks and keep the draft editable. Save includes pending inspector edits and uses the existing CMS block-save permissions and CSRF protection. Parsing and rearranging do not execute the script; explicit Save keeps the CMS's existing page-script preview behavior. Widget JavaScript also opens and saves here. Plugin scripts can be opened for reference.

Both editions use the same browser editor and the locally bundled [Acorn](https://github.com/acornjs/acorn) 8.19.0 parser at `editor/vendor/acorn.js`. Its MIT license is included in that file. No CDN, npm installation or additional server runtime is required. Standard JavaScript script and module syntax are supported; advanced constructs remain fully editable through their JavaScript source rather than being translated into a smaller language. Run `node tests/editor_browser.cjs --scripter` for the isolated browser regression. `--styler` checks the CSS editor.

## Widgets

Open **Widgets → Widget Editor** and choose a type: a working instance appears in the canvas. Drag tags or widgets from **Add** into it, including nested containers. Double-click an element, then use **Edit selected** to open the existing element controls. **Edit JavaScript** opens Scripter (Code or Blocks); **Edit CSS** opens Styler (Code or GUI). **New widget** creates a named definition based on Template. The Instances tab manages widgets already placed on the page.

**Save design** saves the working canvas in Dev without changing page blocks. **Place on page** copies the current design; save that page block to retain the instance and its edits. JavaScript changes run after reload. CSS targets `[data-si-widget="YourWidget"]`; use `!important` when overriding a constructor's inline styles. Canvas designs retain existing controls and their event handlers, and nested widgets are rebuilt as live controls.

Definition edits require an administrator in Dev and a valid CSRF token. **To Test** copies Dev; **To Live** publishes the tested definition. Guests receive only Live definitions. Overrides are tenant-scoped in `si_widget_sources`, shared between PHP and SIPL; unedited widgets continue to use the shipped files. CMS updates preserve that table. Legacy page instances retain their existing HTML. No Python, source-file writes, or separate widget editor service is required. Run `php tests/Fixture.php --widgets --runtime PATH_TO_SIPL` with ZIP enabled for both packaged editions in a disposable database and installation.

Each saved source is limited to 512 KiB; the active widget source catalog is limited to 900 KiB to fit both backends' response limits. Oversized writes are rejected before replacing the saved definition.

## Running tests

From PowerShell in the repository root, run `.\test.bat` for the maintained PHP/SIPL/Node suites. Use `.\test.bat --quick` for compile, unit, parameter, security, packaging/upgrade and native HTTP checks without browser or database integration suites. `.\test.bat --list` lists the selected steps without running them; `.\test.bat --help` shows options.

Both modes require PHP CLI with ZIP, Docker Desktop using Linux containers, Node.js 22+ and a current SIPL runtime. Full runs also need Chrome. Neither mode looks for or executes Python. The launcher enables an existing Windows PHP ZIP DLL when needed; it installs no dependencies.

Runtime selection follows the build launcher: `--runtime PATH`, `SI_SIPL_RUNTIME`, the sibling SIPL development build, `sipl` on PATH, then an optional local executable. For example:

```powershell
.\test.bat
# Or explicitly select the sibling development build:
.\test.bat --runtime "..\sipl\build\sipl.exe"
```

The runner builds the isolated PHP test image and both release ZIPs before testing; full runs also build separate plugin ZIPs. It uses disposable fixtures, not a running site's configuration or database, and does not deploy or restart your site. Logs stream to the console. Independent suites continue after failures; the final summary and exit code report failure. A failed bootstrap stops the run instead of testing stale artifacts.

The historical PHP preservation guard runs last so a stale migration baseline cannot prevent other suites from running. It currently has pre-existing mismatches and will make the overall run fail until those are separately reviewed; the runner never renews baseline hashes.

Historical Python-only test scripts are outside this runner. Their remaining installer, recovery, connector and deployment checks have not all been ported; the native run must not be interpreted as evidence that those historical cases ran. They are retained rather than deleting unique regression coverage.

The editor context-menu regression runs without credentials or a CMS installation: `node .\tests\editor_browser.cjs --context-menu`. It checks repeated right-clicks, recovering off-screen menus, native text-field menus, and widget-preview selection.

## Build distribution ZIPs

On Windows, run `package.bat` from the repository root. It creates `dist/SuperIntuitive-php.zip` and `dist/SuperIntuitive-sipl.zip`, each with its own `SuperIntuitive` folder, setup instructions and a `PACKAGE.json` file containing SHA-256 hashes. Each edition uses its own language: PHP CLI with its zip extension for PHP, and the SIPL runtime for SIPL. Python is not required. Build just one edition with `package.bat php` or `package.bat sipl`. An optional output directory is supported: `package.bat -OutputDirectory "D:\Releases"`.

The build uses `packaging/files.json` to select application files. It excludes local database credentials, `.env`, installation keys/locks, domain content, uploaded files, installed plugins, logs, backups and development artifacts. The PHP edition gets an empty credentials bootstrap; the SIPL edition contains no PHP files. Both editions require their language runtime to be installed separately; `sipl.exe` and runtime installers are excluded. These ZIPs are clean application distributions, not backups or database exports.

The portable entry points are `php packaging/Package.php` and `sipl run packaging/Package.sipl`. Both support `build`, `contact`, `theme`, `verify`, and data-preserving `upgrade` commands. Run `php tests/package.php` and `sipl run tests/package.sipl` for packaging and upgrade regressions. Rebuild the native installer/editor inputs with `sipl run packaging/Package.sipl assets`; it parses shared source files without executing PHP.

The SIPL tools require native `fs.sha256`, `fs.stat`, and `fs.chmod`, plus correct drive-root handling in `path.dirname` on Windows. Runtime selection uses `-SiplRuntime`, then `SI_SIPL_RUNTIME`, then the sibling development build at `../sipl/build/sipl.exe`, then `sipl` on PATH, and finally a local `sipl.exe`. The launcher prints the selected path and validates it before building either ZIP. To select another interpreter, pass `package.bat -SiplRuntime "C:\path\to\sipl.exe"`. The launcher does not copy, replace or restart an installed website runtime.

## Repository hygiene

Git ignores local credentials and environment files, private keys, installation state, site data and uploads, downloaded/installed plugins, logs, backups, local runtime binaries, validation reports and distribution ZIPs. Keep real passwords, tokens and keys out of source files and configuration examples; the ignore files contain filename patterns only, never credential values.

Keep application source, tests, documentation, build tools, plugin source, bundled editor dependencies, `core_sipl/generated/` and `core_sipl/php-baseline.json` in Git. These generated SIPL assets and the preservation baseline are required inputs, not disposable test results. Sanitized `.env.example`, `.env.sample` and `.env.template` files may be committed.

Ignore rules do not remove previously committed secrets from Git history or make them safe. If a real credential was committed, revoke or rotate it and clean the history separately. Ignored files remain on disk; ignoring them is not access control.

## Docker setup

This repo runs in Docker with patched PHP 8.2.35, Apache, and MariaDB. The installer and application reject PHP releases below 8.2.35, 8.3.36, 8.4.27, or 8.5.12 in their respective branches, as well as unsupported branches and prereleases. These minimums address the [October 21, 2026 PHP security advisory](https://www.php.net/archive/2026.php).

After updating this repository, rebuild and recreate the web service to replace an older PHP runtime:

```bash
docker compose build --pull web
docker compose up -d --no-deps web
```

The version check cannot protect a vulnerable PHP process before application code runs. Rebuilding and restarting PHP is required. See [the security review](docs/SECURITY_REVIEW.md) for findings and deployment considerations.

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

The default page uses the navy palette, typography, and sidebar navigation from [the SIPL reference](docs/sipl-reference.html). Its editable source files are in `core/setup/default-theme/`.

After changing those files, regenerate the installer blocks and standalone preview:

```bash
php packaging/Package.php theme
# SIPL edition: sipl run packaging/Package.sipl theme
```

Open `/default-page-preview.html` on the local web server to review the page before installing. New installations receive the theme in development, test, and live. Existing site content stays in the database and can be edited through the CMS.

The Login block owns its popup and field styles in `login.css`, with behavior in `login.js`. To edit the guest form while signed in as an administrator, open **Account → Edit login form**, then select and edit its elements as usual. **Done editing login form** restores the account controls. Saving excludes this temporary editor button, and previewing the form does not submit a login or change the administrator session.

After signing in as an administrator, right-click an element to select it and open **Add / Edit / Tools**. While that menu is open, right-click opens the browser menu for actions such as Inspect; drag the editor menu to move it. Double-click selects another element. Closing the editor menu with X clears both element and block selection. **Add** has searchable Tags and Widgets: drag an item onto a page block to see a translucent placement preview and its destination before dropping. You can also click an item, then click a position on the page. Escape cancels placement; an invalid drop leaves the page unchanged.

Use **Edit** to change the selection's content, attributes, or styles. Text fields support paste, and style values can be typed directly or chosen from their controls. **Save block** (or Ctrl/Cmd+S) saves the selected block to development; **Tools → Page** also has block save controls. The selection shows when changes are unsaved. Arrow keys move positioned elements by 1 pixel, or 10 with Shift, and Delete asks before removing the selection. These shortcuts leave text editing alone.

The Security tool shows one permission form per role tab. Switching tabs preserves unsaved checkbox changes; New Role opens a new tab. Role navigation and Save/Delete controls remain accessible while permissions scroll.

In **Users**, **Password** opens the existing Window and Field widgets with a masked password input. Save uses the authenticated Admin endpoint; Cancel, Escape and closing the window clear the input. Password entry does not require browser-native prompts.

The Page tool uses larger, high-contrast vector action icons. Import Block opens a resizable form with a full-width block picker, excludes blocks already on the page, and reports loading or import failures.

Tool windows share the menu palette and control styles in `editor/editor.css`. The window and tab builders add reusable structural classes; editor-owned windows use the `si-editor-tool-window` class. Runtime positioning, resizing, and visibility stay in JavaScript.

### Security regression checks

The PHP CLI checks can run directly with `php tests/security.php`. On Windows, use the isolated Linux container below: the installer checks deliberately include a dangling symlink. Packaging regressions run with `php tests/package.php` (ZIP enabled) and `sipl run tests/package.sipl`.

```bash
docker build -t superintuitive-security-check .
docker run --rm --network none --entrypoint php -v "$PWD:/workspace:ro" superintuitive-security-check /workspace/tests/security.php
```

Run `.\test.bat` from PowerShell for the maintained native HTTP, browser and packaged integration checks. They use Docker to create and remove isolated fixtures and databases. Existing site data and running services are preserved.

The Python HTTP driver is retained for installer and deployment cases that have not all moved to the native fixtures. It is not required by either application backend or the release build. Do not remove a legacy test solely because a newer fixture exists; retain it until its specific checks have a verified replacement.

The optional `--browser` checks require Node.js 22+ and Chrome. They verify administrator login, right-click editing, search, native tag/widget drag previews, cancellation, placement in scrolled containers, moving elements, text and style editing, all standalone widget constructors, saving content and widget settings across a reload, Security role tabs, Page action icons, and importing existing blocks in desktop and narrow windows. Set `SI_NODE_BIN` or `CHROME` if the executables are not detected.

### Deployment behavior

The preview selector changes only your session: administrators can view Dev, Test, and Live; testers can view Test and Live; guests see Live. Switching with unsaved editor changes asks before discarding them.

The green promotion action copies saved Dev data to Test; yellow copies Test to Live. The red action saves the current Live value to an existing rollback column. It is a snapshot action, not a restore action. Page options and block layout options/order currently have no rollback columns, so their red controls are disabled with an explanation. No schema migration is applied.

Options must be JSON objects. Native objects are encoded once; already encoded objects are validated. Empty objects and arrays, nulls, booleans, Unicode, quotes, and backslashes retain their types. Promotion copies the stored SQL value directly and reports success only after committing. Block content and its page-specific JSON options save in one transaction.

Media follows Dev → Test → Live, with atomic file replacement. The Live media action saves a rollback file. Preview URL rewriting preserves existing deployment prefixes and external media URLs.

The maintained deployment-related checks run through `.\test.bat`. Additional historical deployment and JSON SQL cases in the legacy HTTP driver remain unmigrated and are not run by this launcher.

### Useful commands

```bash
docker compose down
docker compose down -v
```

`docker compose down -v` removes the MariaDB data volume and gives you a clean install.

## Plugins

The repository root is the main source for both PHP and SIPL. Run `package.bat` here to rebuild both CMS editions in `dist`. Plugin code, shared storage and safe upgrades are documented in [docs/PLUGINS.md](docs/PLUGINS.md). Contact is a separate package: use `php packaging/Package.php contact` or `sipl run packaging/Package.sipl contact` to build `dist/contact.zip`. It is not bundled with either installer.

## Page assets and upgrades

The public editor demo is available as a [separate plugin](plugin-packages/editor-demo/README.md). It is not bundled with either CMS installer and does not add demo routing to CMS core.

Both editions include the page path in CSS, JavaScript, library CSS and editor requests. Each request resolves that page in the current tenant and checks its active page roles and plugin access. Opening another tab cannot replace the first tab's asset source. Old links without a page parameter retain the session-page fallback.

Normal administrator editing uses the existing authentication, authorization and CSRF checks.

### Updating an installed site

Back up the installation and database first. Extract the new release to a temporary directory and run its updater against the existing installation. For SIPL:

```powershell
sipl run C:\Temp\SuperIntuitive\packaging\Package.sipl upgrade C:\Downloads\SuperIntuitive-sipl.zip --target C:\Sites\MySite
sipl run C:\Temp\SuperIntuitive\packaging\Package.sipl upgrade C:\Downloads\SuperIntuitive-sipl.zip --target C:\Sites\MySite --apply
```

PHP uses the equivalent `php packaging/Package.php upgrade ZIP --target DIRECTORY [--apply]` command from the extracted PHP release and requires PHP's ZIP extension. Preview first, then apply during your chosen maintenance window. The updater creates a backup, replaces framework files (including previously patched core files), and preserves credentials, private configuration, domain media, installed plugins and database data. It does not run the installer or replace database Blocks. Restart a native deployment yourself after the update when appropriate.

Run the package integration and update regression in an isolated Docker database with the current SIPL runtime:

```powershell
php -d extension=zip tests/Fixture.php --framework --runtime C:\Users\bobta\Repos\sipl\build\sipl.exe
```

This uses the actual ZIPs in `dist`, temporary servers, Chrome and disposable data. It checks page access and multiple tabs, administrator saves, optional library handling, and both native updaters. It verifies data/configuration/media/plugin preservation and repeats editor checks on the updated fixture. It never connects to an installed website.
