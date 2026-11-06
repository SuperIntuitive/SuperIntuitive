# PHP → SIPL migration report

The parallel backend is implemented under `core_sipl`. Its initial port preserved PHP against the migration baseline. The subsequent plugin consolidation intentionally updates the PHP host and shared editor; the reviewed baseline now includes those changes in the main repository. The MySQL architecture and Docker ports remain unchanged. This is an executable port with explicit gaps, **not a completed cutover or a claim of full PHP parity**.

## Current executable: verified support and blockers

Tested against the Windows SIPL 0.4.0 / security revision 2 build at `C:\Users\bobta\Repos\sipl\build\sipl.exe`. The root `SuperIntuitive/sipl.exe` matches it exactly: SHA-256 `b3088cb85c34df529d24fd9868c16f89068874bf0b5e49c7bf541c6f0b464038`. The previous driver-unavailable Windows artifact has been replaced. The newer build links the MariaDB connector statically and runs without a separate MariaDB DLL.

The Windows connector passed **19 live MariaDB integration checks over TLS** against an isolated `mariadb:11.4` container. Those checks cover native named/positional values, repeated markers, JSON bytes/types, Unicode/quotes, invalid parameter rejection, commit/rollback, binary GUIDs, MySQL JSON validation and an active TLS cipher (`TLS_AES_256_GCM_SHA384`). Server secure transport was required; client verification remained enabled. See the ignored local `mysql-validation.json` report for the executable identity and result. No production database was contacted.

The first test against the old, non-TLS MariaDB 10.11 fixture failed because the new connector requires TLS. The fixture was updated to MariaDB 11.4's [zero-configuration TLS](https://mariadb.com/docs/server/security/encryption/data-in-transit-encryption/zero-configuration-ssl); production transport security was not weakened. The application schema and existing Docker ports remain unchanged.

**Bcrypt compatibility is now verified.** `auth.passwordVerify` accepts PHP `$2y$` hashes; password creation and resets explicitly call `auth.bcryptHash` at its default cost 12 to produce PHP-compatible `$2b$` hashes. `auth.passwordHash` remains PBKDF2 and is not used for CMS password writes. The 10–72-byte application password policy remains unchanged. Four PHP-generated fixture hashes verify in SIPL and four SIPL-generated fixture hashes verify in PHP; UTF-8 limits, malformed hashes, random salts and wrong-password rejection are covered by 32 checks in the ignored local `password-validation.json` report.

The previous hardcoded password/hash pair in the capability probe was invalid even in PHP. It has been replaced with a valid PHP-generated pair and a native bcrypt round trip. The capabilities endpoint now reports both bcrypt functions as available.

**Installed-site testing now passes:** 32 HTTP workflows and 29 Chrome workflows against the original SQL schema seeded into a disposable TLS database. Tests cover PHP administrator sign-in, new user creation, password resets, session/CSRF rotation, role revocation, block/page creation, JSON saves/promotions, popup editing, drag/drop previews, widgets, role tabs, block import, save/reload and phase switching, with no browser exceptions. See the ignored local `site-validation.json` report.

The existing real database settings were imported into `core_sipl/config.local.json` without exposing credentials or changing PHP. A read-only connection/tenant check and GET requests for the real page and native assets all passed. The updated preview was started on loopback port 8092; PHP remains on 8090. No production CMS records were modified during verification.

The status endpoint and launcher report capabilities explicitly. A failed SIPL operation never silently executes through PHP. Exact regression results are in the ignored local `validation.json` report.

## What SIPL needs

| Priority | Runtime/build capability | Required behavior and affected features |
| --- | --- | --- |
| Resolved | Native Windows MySQL/MariaDB connector | The selected Windows build passed 19 live TLS/binding/JSON/GUID/transaction checks. No SQL interpolation workaround or production SQLite conversion is needed. |
| Resolved | PHP-compatible bcrypt verification and hashing | `auth.bcryptHash` and `auth.passwordVerify` pass bidirectional PHP/SIPL tests. Existing account sign-in, user creation, password reset and session invalidation are verified against real MySQL. |
| Next | Larger/streaming HTTP bodies and multipart parsing | The native server caps requests and dynamic responses at 1 MiB; PHP accepts 24 MiB uploads within a 32 MiB body. Need bounded binary-safe multipart fields/files, filenames, size limits, MIME validation hooks, and streaming responses. Current uploads return an explicit gap. Large native dynamic assets return a named capability error. |
| Next | Confined filesystem operations | Need root-relative, no-follow/reparse-safe reads/copy/move/delete and atomic publication of a staged directory. Preserve confinement across every path component and concurrent changes. Needed for media promotion/recycle and whole-plugin publication. Lexical traversal checks alone cannot replace the PHP filesystem safeguards. |
| Next | Headers on confined/streamed media responses | Need to set CSP sandbox and `nosniff` while retaining the native server's confined file reads, especially for uploaded SVG/documents. These formats are blocked in the preview; inert image/font/audio/video formats use the confined static reader. |
| Later | SMTP delivery | Needed for forgotten-password notification. Do not spawn PHP or a shell mail command to simulate native parity. |
| Later | Request peer address | Expose the socket peer address in handler requests. Login/setup currently use conservative process-wide/account limits; do not trust arbitrary forwarded headers as the client address. |
| Later | Remember-token compatibility | Need a supported cryptographic SHA-256 digest primitive and an explicit native-handler cookie/multiple-`Set-Cookie` contract compatible with PHP's remember-token lifecycle. Constant-time equality and secure random tokens already exist. Remember-me is blocked until this path is implemented and tested. |

The updated Windows build vendors Connector/C and links it statically. The updated local reference documents native bcrypt; the selected Windows artifact links Connector/C statically and does not require a MariaDB DLL. Linux/macOS builds can use Connector/C headers/libraries with `make SIPL_MYSQL=1`. The DSN currently exposes no TLS verification options; add an explicit TLS/CA/server-verification contract for secure remote database deployments.

**Already present; no runtime addition requested:** positional/named parameters, repeated named markers, transactions, CSPRNG tokens, constant-time byte equality, JSON Map/List distinctions, native sessions/rotation/CSRF building blocks, HTTPS, binary file reads, and ZIP reading/staged extraction. ZIP itself is not missing; safely publishing an entire installed package is the unresolved filesystem contract. Separate PHP and SIPL sessions do not require PHP-session decoding.

## Implemented scope and parity limits

The implemented editor/authentication workflows below have passed native HTTP/MySQL and real Chrome tests. Full cutover still requires the remaining installer, archive, media and plugin work; tested coverage is not a claim that every PHP feature is complete.

| PHP entrypoint or area | SIPL implementation | Status |
| --- | --- | --- |
| `index.php`, `core/Page.php` rendering | `Server`, `Render`, `Page`, `Content` | Page lookup, tenant ownership, redirects, role restrictions, block markup, head/body options, scoped multilingual substitutions, date/setting constants, page settings, and deployment controls implemented. |
| PHP-bearing frontend assets | `Assets`, `Editor`, `generated/` | Native `editor/editor.js`, `scripts/page.js`, `style/page.css`, plugin bundles, library CSS, and browser bootstrap. The shared Page tool now reads body style declarations through CSSOM, supporting both PHP and SIPL without brittle string-to-JSON parsing. Editor template contains no PHP. |
| `delegate.php` | `Dispatcher.general`, `Accounts`, `Deployment` | Login/logout, phase switching, own password change, forgotten-password action recognized. PHP bcrypt login, logout, phase switching, user creation and password changes are enabled and verified. Remember-me/SMTP still return explicit runtime gaps. |
| `delegate-admin.php`: blocks/pages/relations | `Block`, `Page`, `Relations` | Create/save/relate/remove, page redirect removal, and relation creation implemented with tenant-scoped bound SQL. Block content/layout save is transactional. |
| `delegate-admin.php`: settings/localtext | `Setting`, `Localtext`, `Content` | Settings CRUD, language-column addition, localtext create/update and read substitution implemented. Localtext token shape matches the existing 20-capital-letter PHP markers. |
| `delegate-admin.php`: users/roles | `User`, `Security`, `Accounts`, `Editor` | Role assignment/removal/deletion, user deletion and refresh implemented. Response maps and user-table GUID positions match existing callbacks. Native bcrypt password writes and PHP verification are tested. |
| `api.v1.php`, `core/Entity.php` | `Entity`, `Database` | Scoped schema-backed CRUD, protected ownership fields, bound data values, GUID conversion, protected built-in role deletion, and existing response envelopes implemented. |
| `core/Deployment.php` | `Deployment` | Actual available source/destination columns validated. Promotion uses exact SQL column assignment inside a transaction; object JSON validated without re-encoding. Missing rollback columns fail rather than inventing schema. Local media preview rewriting avoids external URLs and repeated prefixes. |
| `core/Database.php`, `Guid`, `Attribute` utilities | `Database`, `Entity`, `Tools` | Native MySQL connections, INFORMATION_SCHEMA metadata, random GUIDs, typed attribute maps and SQL transactions implemented. No production SQLite path. |
| `core/Login`, `Security`, `Sessions`, `RateLimit`, `Cookies` | `Accounts`, `Security`, `Sessions`, `RateLimit` | Opaque native sessions, separate cookie, CSRF, privilege-boundary rotation, role/account/password refresh, tenant namespaces, throttling and logout replay rejection implemented. Persistent/distributed sessions and PHP remember-cookie parity remain outside this preview. |
| `core/SetupAuthorization`, `Setup`, `core/setup/installer.php` | `SetupAuthorization`, `Setup` | Ownership authorization retained across subsequent setup calls; CSRF/session rotation and install-lock enforcement implemented. Domain/connection checks recognized. Native wizard, schema/seed import, starter media, private configuration, permanent locking and journal-verified restart finalization are implemented. Existing schemas/folders are preserved; partial DDL stays locked for repair. |
| `filehandeler.php`, media mutations | `Media`, `Server.post` | Recognized and blocked with specific multipart/confinement gaps. Existing media browsing and inert files supported. |
| Plugin operations | `Plugins`, `Assets` | Installed plugin enumeration, editor source data, JS/CSS bundles and relative CSS asset rebasing implemented. Native manifest actions/pages, tenant storage, shared migration tracking and private immutable package installation are wired into the checked-in dispatcher. Plugins are supplied separately through the remote repository or uploads; JSON upload, enable/disable/update/uninstall are supported. See `PLUGINS.md` and `packaged-plugin-validation.json`. |
| New entity DDL | `Admin` | Explicit `PORT_FEATURE_PENDING`, with no DDL side effects. Full field/default/lookup/global-entity handling, tenant registration and recovery across MySQL implicit DDL commits need porting and live tests. Creating a partial orphan table is not treated as success. |
| Backup/installer export | `Admin` | Explicit `PORT_FEATURE_PENDING`. SQL export, credential exclusion, archive publication and downloadable/streamed response parity remain port work; ZIP support already exists. |
| `MiscData`, `Datatable`, `Library`, `Scripts` | Generated lookups, `Editor`, `Library`, `Assets` | Static definitions, user table and page asset bundles implemented. Generic legacy helper APIs are not independently exposed. Empty/template/debug scaffolding and PHP-specific diagnostics are not presented as native feature parity. |

The original dynamic `Function` method invocation in `delegate-admin.php` is not exposed; native operations use the explicit allowlist in `Dispatcher`. Unrecognized operations fail.

Further port work after the verified editor/browser workflows: block-template inventory/import parity, remaining legacy helper semantics, complete metadata/custom entity behavior, and archive recovery. Do not confuse these application tasks with missing SIPL primitives.

## SQL and JSON behavior

- User values are passed through native bindings. Schema-backed identifiers are separately validated; identifiers are never treated as bind parameters.
- Tenant entity ownership remains part of reads/writes and relation joins. Inactive tenants, accounts and role links do not grant access.
- Options must be a JSON object. Already-encoded object JSON retains its bytes; a JSON string containing encoded JSON, arrays and malformed data are rejected. `{}`, `[]`, null, false, quotes, backslashes and Unicode retain their distinctions.
- Promotion copies a database column directly, avoiding encode/decode cycles. Paired block/relation updates commit or roll back together.
- Only columns actually present in the existing schema are used. No database architecture, schema conversion, production database/user creation, or Docker port change was made.

## Verification and changes

The ignored local `validation.json` report records the exact checks and runtime probe. The native parameter tests use disposable SQLite memory strictly to exercise SIPL's common parameter parser; they do not validate the MySQL driver. The opt-in MySQL test uses connection-local temporary tables. It passed 19 checks with the current Windows executable against TLS-enabled MariaDB 11.4. A separate earlier Linux run passed 18 non-TLS checks; it is not used as proof of Windows support. No live CMS records were changed during this work.

The combined suite passes **360 checks**, including 179 unit/SQL-contract, 16 native parameter, 42 HTTP/session/launcher, 11 Apache isolation, 32 bcrypt, 19 TLS MySQL, and 61 installed-site HTTP/browser checks. The hash guard covers 50 readable PHP files and PHP-containing assets from the migration start. `core/DbCreds.php` was read through the Windows literal importer to produce ignored private JSON, and was not modified. Credentials were not printed. The importer performs no PHP evaluation. Pre-existing uncommitted changes outside this migration were retained.

Migration additions are under `core_sipl/`: native modules, generated assets, launcher, example/private configuration convention, Apache access rules, preservation manifest, tests, runner, and these documents. The test runner now prints the tested executable path and SHA-256, and `tests/mysql_disposable.py` can validate a selected build without production credentials. Existing-file migration edits are private config/runtime exclusions in `.dockerignore`, the shared `editor/objects/pages.js` CSSOM fix, and the requested runtime/reference copies. All earlier PHP/editor/Docker edits were preserved. Earlier PHP/editor/Docker changes shown by Git predate this migration.

Before cutover, retain the passing native bcrypt/MySQL/editor regressions, finish broader cross-backend parity, finish blocked operations or keep them explicitly unavailable, and prove installer lock/recovery and archive/media safety. PHP remains the usable implementation meanwhile.


## Frontend fixes made during installed-site verification

- Shared `scripts/tools.js` contains a literal PHP opening tag inside a JS string. Native serving now escapes that known literal without exposing real PHP source; the shared source is unchanged.
- `style/widgets.css` has a commented PHP wrapper. The generator emits a verified PHP-free CSS asset; the PHP-bearing source is unchanged.
- The Page tool parsed the body stylesheet by replacing punctuation to manufacture JSON. It now reads CSSOM declarations, so valid CSS formatting, quotes, colons and empty styles cannot abort window initialization.
- Native metadata hooks match the existing Page tool; missing optional library tables return an empty bundle.
- Disposable fixtures discard inherited native database/setup environment overrides. Their mutable workflows stay on the generated test database even when production overrides are present.


## Header visibility after login

Admin sign-in opens Dev. The existing home page had Dev ranks `Menu=0`, `Login=1`, `Header=2`, so its top bar rendered below the main content. Header HTML, CSS and script were identical across Live/Test/Dev.

The shared Page tool called `Blocks.Reorder()` on mouse entry, silently replacing stored ranks with consecutive UI indices. Saving just one block could then move it ahead of the header. That automatic handler was removed. A browser regression now uses valid sparse Dev ranks and verifies that hover preserves them, block saves retain the visible header, preview switching keeps the header visible, and logout preserves it.

The affected home-page Dev ranks were repaired transactionally to match the published order: Header 0, Menu 1, Login 2, Footer 3. A local backup was written under ignored `core_sipl/runtime/backups/` before updating three relation rows. Block content and scripts were not changed by this repair. This targeted repair is separate from the disposable migration verification described above.

## Login layout and editing while signed in

The stored Login CSS fixed its inner panels at 400px while the Header CSS limited the popup to 340px. Its content-box inputs also added padding and borders beyond their declared width. Login now owns its responsive popup styles in `core/setup/default-theme/login.css`; the duplicate rules were removed from the Header theme. Inner panels and input boxes fit the available content width. The theme builder writes these styles and `login.js` to the Login seed block across all four deployment stages.

Administrators in the editor can open **Account → Edit login form** without signing out. This displays the guest form for selection and editing while suppressing login submission and remember-cookie changes. The temporary control is excluded from element editing and saved HTML. Reload restores the normal account view. Existing Login HTML is retained, including compatibility with its legacy `Login.RememberMe` handler.

On October 29, the existing site's Login CSS/script and duplicate Header CSS were updated transactionally, with original rows backed up to ignored `core_sipl/runtime/backups/login-layout-1793272107.json`. Updates required exact matches against a prior snapshot; no HTML, credentials, or PHP source were changed. The latest focused installed-site run passes **32 HTTP and 33 browser checks**, including guest/admin layouts at 1440px, 390px, and 320px, editing without login submission, and saving/reloading without editor controls leaking into content. The PHP hash guard still passes all 50 files. See `site-validation.json` for this run; the earlier combined-suite total above describes its earlier run.

## Distributions and native installation

`package.bat` builds separate PHP and Windows SIPL ZIPs through Windows PowerShell and an explicit file-selection manifest. It includes hidden Apache handler files, an empty PHP credentials bootstrap, and generated native assets. Language runtimes and runtime installers are supplied separately; the SIPL launcher uses PATH or an explicit `SI_SIPL_RUNTIME` path. Credentials, environment files, installation state, domain content, plugins, logs and backups are excluded. `PACKAGE.json` records every payload file and hash; missing inputs fail before either previous ZIP is replaced. Compiled installer input hashes detect stale SQL/template/media assets.

A fresh SIPL distribution now serves the six-step wizard and generates a private ownership token. Session/CSRF authorization survives all steps; completion destroys setup authorization, persists private native configuration and locks setup. The full original MySQL schema is imported with fresh GUIDs and PHP-compatible bcrypt. Submitted seed values use parameters. Account DDL does not accept a password marker in the tested MariaDB server; its generated URL-safe password is validated before constructing the required literal. The importer preserves the valid scoped Admin assignment, removes only the obsolete sample links to absent users, and verifies that the new administrator has exactly one Admin assignment. Native installation does not invoke or rewrite PHP source.

Native workspace operations confine text writes and directory creation; exclusive claims prevent concurrent setup, native ZIP extraction publishes pristine starter files, and file publication uses `fs.move`. These narrower primitives cover fresh installation; plugins now publish an immutable private package by committing a SQL reference; broader media mutation remains a separate gap. An unconfigured server initially has no domain static root, so the trusted starter-media ZIP supplies the initial installation's assets until restart. Existing installed sites continue using the native confined static reader.

The journal and matching database `InstallationId` permit restart to finalize only a committed installation with verified starter media. Missing/mismatched markers or incomplete DDL leave setup locked; no existing tables or files are dropped to force a retry. Tests use extracted ZIPs and disposable TLS MariaDB, including real Chrome setup, both database modes, a 10-character password, scoped administrator access, refusal of populated databases/folders, permanent locking and interrupted completion. Results are recorded in `installer-validation.json`; packaging regressions also inject fake secrets and missing application entry points.

## Website framework reconciliation — November 2026

The website installation was used only as a read-only reference. Reusable CMS fixes for page asset identity and editor behavior now belong to this repository and its normal release selection. Website-specific public demo code, routes, assets and settings remain the responsibility of the website project and are not included in either CMS edition. Website Blocks, company content, credentials and deployment configuration were not copied or changed.

The public editor demo is now supplied as the separate Editor Demo plugin. Its PHP/SIPL listener, public model and sandbox policy live under plugin-packages/editor-demo, with usage documented in that plugin's README. It uses existing registered pages/actions and requires SELECT-only service credentials. Neither CMS installer contains the plugin or demo-specific core routing. The disposable plugin fixture verifies both listeners before and after a CMS update, including preserved settings and edited published Blocks.

Both backends resolve page CSS, JavaScript, library CSS and editor Blocks from an explicit page path with tenant, active page-role and plugin access checks. The library routes check page access even when the optional libraries table is absent. Scripter preserves the page query when refreshing its preview script. The main repository's newer Styler, Elements and Scripter work was retained, together with the reusable empty-media guard. Rate-limit buckets retain their own expiry; SQL reconnects occur at request boundaries before work, without replaying writes.

`tests/Fixture.php --framework --runtime PATH/TO/sipl.exe` uses both actual release ZIPs, temporary listeners and disposable MariaDB data. It checks page assets/access, simultaneous browser tabs, normal administrator editing and optional libraries. It runs both offline updaters against an installed fixture containing older native and PHP core files, verifies protected configuration/media/plugin hashes and an unchanged complete database dump, starts only those updated fixture servers, and repeats the access/editing checks. The root README contains update instructions. No website update or restart was performed.
