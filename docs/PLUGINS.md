# Plugins and safe upgrades

The entity implementation lives in `core_sipl/src/Plugins.sipl` and `core/Plugins.php`. PHP keeps the existing SDK class names in that same entity file, following the pattern in `Entity.php`. Installed native handler adapters refresh automatically when upgrading from the earlier split host; plugins do not need reinstalling.

Plugins extend the existing `install.json` format. Existing `components` and unknown metadata are retained; the old entity installer was a no-op and remains so. Legacy `info.conf` files, packages without a manifest, `scripts/*.js` and `styles/*.css` remain valid. Existing installed frontend plugins stay enabled until explicitly disabled for a tenant. No backend code is inferred from a directory name or an `info.conf` field.

The optional directories are `html`, `js`, `css`, `php`, `sipl`, and `sql`. A ZIP contains these paths and `install.json` at its root, without an enclosing plugin folder. Its ZIP basename must match the manifest `id`. Filenames use letters, numbers, dashes, underscores, dots and directory separators; traversal, absolute/hidden paths and duplicate case-insensitive names are rejected. PHP rejects archive links/devices; SIPL copies entry bytes into regular files and never restores archive links or modes. Install only trusted administrator-supplied code: handlers have the service account's OS permissions.

The complete example is [Contact's manifest](../plugin-packages/contact/install.json):

```json
{
  "id": "example",
  "version": "1.0.0",
  "backend": {"required": true, "php": "php/example.php", "sipl": "sipl/example.sipl"},
  "permissions": {"submit": ["Guest"], "manage": ["Admin"]},
  "actions": {"submit": {"permission": "submit"}},
  "pages": [{"key": "form", "path": "example", "title": "Example", "html": "html/form.html", "style": "css/form.css", "script": "js/form.js"}],
  "migrations": [{"id": "001-schema", "sql": "sql/001-schema.sql"}]
}
```

`backend.required` or a nonempty `actions` object requires a compatible handler. PHP loads only `backend.php`, and SIPL only `backend.sipl`; neither invokes the other language. Missing required entries reject activation with `PLUGIN_REQUIRES_PHP_HANDLER` or `PLUGIN_REQUIRES_SIPL_HANDLER`. PHP checks handler syntax and that it returns a callable. SIPL compiles its native adapter before publishing the installation. Frontend-only packages need no backend entry. Role names refer to existing CMS roles; `Guest` grants an operation to everyone. Unknown or undeclared action permissions fail closed. An Admin page declares both `"admin": true` and a permission such as `"permission": "manage"`.

## Registration and storage

Send JSON to the existing `/delegate.php` endpoint:

```js
fetch('/delegate.php', {
  method: 'POST', credentials: 'same-origin',
  headers: {'Content-Type': 'application/json', 'X-SI-CSRF': SI.CSRF.Token},
  body: JSON.stringify({KEY: 'PluginAction', plugin: 'example', action: 'submit', message: 'Hello'})
});
```

The public delegate returns an array containing the handler's response, preserving its existing convention. `/delegate-admin.php` also accepts `PluginAction` and retains its Admin gate and object response. Both use existing authentication refresh, roles and CSRF checks. No plugin-specific dispatcher changes are needed. A handler may return the reserved `__httpStatus` key with 400, 403, 404, 409, 429, 500 or 503; the generic transport applies it and removes the key from JSON. Disabled or uninstalled actions and pages are inaccessible, including requests from sessions opened before deactivation. Admin navigation links appear in **Tools → Plugins → Local Plugins**, based on manifest pages and the current user's roles.

PHP entry files return `function ($storage, $action, $post): array`. SIPL entry modules export `fn handle(storage: Map, action: String, post: Map) -> Map`. The storage SDK exposes `put(collection, id, value)`, `list(collection)` and `delete(collection, id)`; SIPL invokes these callbacks as `storage["put"](...)`, etc. Records accept JSON values. Keys use 1–64 letters, digits, dashes or underscores. Lists return the latest 200 records with `id`, decoded `value` and `created_at`. Ownership is bound to the actual tenant's blocks entity ID and plugin ID; request bodies cannot select another tenant or plugin. The host also supplies `get(collection,id)`, `page(collection,offset,limit)`, `count(collection,seconds,field,value)` and `atomic(name,callback)`. Pages allow 1–200 rows and offsets 0–100000. Counts may filter records newer than 1–86400 seconds and a validated JSON field/value; use 0 and an empty field for no filter. PHP supplies defaults; SIPL callbacks take all shown arguments. `atomic` combines a database transaction with a tenant/plugin/name-scoped advisory lock shared by both runtimes. Failed callbacks roll back their writes. Large binary objects need a separate storage API.

The tested executable is SIPL 0.4.0, security revision 2, with native ZIP/regular-file writes, shell-free process execution, MySQL/TLS, bcrypt and parameterized SQL. It lacks a multipart upload API and runtime module imports. SIPL 0.4 resolves modules at compile time. Its host generates a private native adapter and uses shell-free `system.exec` with the current SIPL executable for each action. The adapter receives a random private request-file path, never database credentials in process arguments. The request file is removed after completion. Both entry code and its adapter remain under the blocked `core/` tree. Run PHP and SIPL under service accounts that can read the same private package tree when switching backends against a shared installation. This host requires an installed SIPL interpreter; a standalone compiled application cannot relaunch itself as the interpreter.

## Installation, updates and migrations

Sign in as Admin, enter Dev, and use **Tools → Plugins** to upload/download and install. Installed plugin checkboxes enable/disable; separate buttons update from the downloaded ZIP or uninstall while retaining data. The generic lifecycle keys are `InstallPlugin`, `UpdatePlugin`, `EnablePlugin`, `DisablePlugin` and `UninstallPlugin`, with `plugin` as the package ID. PHP keeps its existing multipart upload. SIPL uses JSON/base64 upload because the actual runtime has no multipart API; its 1 MiB HTTP body cap limits browser ZIP uploads to roughly 750 KiB. Larger packages can be placed by an operator in private `plugins/downloaded/<id>.zip` before installation.

New packages install under immutable private `core/plugin-packages/<id>/<revision>` directories. Tenant state selects a revision only after validation, migrations and SQL page changes succeed. A database advisory lock serializes lifecycle changes across PHP and SIPL. Failed updates keep the previous revision selected. Version downgrades are rejected. Old package revisions are retained for inspection/recovery; uninstall does not erase source trees or data.

The additive shared schema is `core/plugin-schema.sql`; it is created on the first explicit lifecycle action, not on ordinary page loads. Both backends use `si_plugin_installations`, `si_plugin_data`, `si_plugin_pages` and `si_plugin_migrations`. Each SQL migration file contains one statement. Its ID and SHA-256 of trimmed SQL are recorded for that tenant/plugin. The same migration is not repeated when changing backends or reinstalling. Changing applied SQL fails with `MIGRATION_CHECKSUM_CHANGED`. Use new migration IDs for changes.

MySQL DDL cannot be rolled back. A migration is recorded as `pending` before execution and `applied` after success. Failed/interrupted migrations retain `pending` and block retries with `MIGRATION_REPAIR_REQUIRED`; inspect the database and the SQL locally, repair the operation, then mark that exact ledger row applied only after verifying its effect. Earlier successful migrations may remain after a later failure. Do not erase the ledger or run a destructive fresh installer as an upgrade. Migrations are trusted SQL and must themselves be additive and data-preserving.

Page sources seed the existing SQL blocks and page/block relations. All four deployment levels receive `dev-html`/`test-html`/`live-html`/`rollback-html`, corresponding `*-style`, and singular `*-script` columns. Updates compare each current column with its previously installed source: unchanged columns receive the update; CMS-edited columns stay intact and are returned in `PLUGINCONFLICTS`. Existing page paths, options, layouts, page relations and renamed blocks are retained. An existing unrelated page at the requested path rejects the installation. Removing a declaration leaves the stored block/page intact but blocks its plugin route.

JS and CSS continue through `/scripts/plugins.js` and `/style/plugins.css`; new and legacy folders are included, with development/minified variants selected by deployment. Asset versions account for enabled plugin files. Use the confined `/plugin-asset.php?plugin=<id>&file=<relative-path>` endpoint for inert images/fonts. Backend and SQL source are never public; PHP Apache rules and SIPL route gates block them. New packages are private regardless of extension. CMS page scripts/styles are editable SQL sources and participate in normal deployment promotion.

Uninstall disables registration and preserves plugin records, migrations, CMS blocks/pages, configuration, media and legacy tables. There is intentionally no automatic purge action; a database administrator can perform a separate, reviewed data deletion if required.

## Contact form and Admin inbox

Build its dual-backend package:

```sh
php packaging/Package.php contact --output dist/contact.zip
# SIPL edition: sipl run packaging/Package.sipl contact --output dist/contact.zip
```

Plugins are distributed separately from the CMS installer. Build `dist/contact.zip` and publish it beside `swiper.zip` on the plugin server. Its `info.conf` uses the same six colon-separated fields as Swiper: name, version, author, type, shortdesc and longdesc. Merge the Contact entry from `plugin-packages/index.json` into the server catalog to make it discoverable. Upload or download `contact.zip`, then install it from Local Plugins. Version 1.1 adapts the actual form and Admin inbox from the `superintutitive.com` website source, with matching native PHP and SIPL handlers. It requires the updated plugin host in this repository. See [the plugin guide](../plugin-packages/contact/README.md) for source provenance, request fields, limits and compatibility.

The public form is **`/contact-form`**; **`/admin/contact`** is the Admin inbox. The starter CMS already has `/contact`, so the plugin preserves that page. Sign in through the existing login, then open the **Contact inbox** link in Local Plugins. The inbox shows twenty messages per page with Load more, Refresh, counts and read/unread controls. Topics, duplicate-safe tokens, a honeypot, and persistent three-per-email/twenty-per-tenant five-minute limits match the source workflow. Existing v1 messages and custom CMS sources remain intact. Messages are stored locally, with email reply links and no SMTP dependency.

The existing generic non-Admin action cap remains an additional limit (60 requests per five minutes). Contact's limits count new submissions; the generic host cap counts requests, including retries.

## Offline CMS upgrade

The [Editor Demo plugin](../plugin-packages/editor-demo/README.md) is another separate dual-backend package. Build it with "php packaging/Package.php plugin editor-demo" or "sipl run packaging/Package.sipl plugin editor-demo". It owns its separate-origin listener and sandbox behavior, and uses normal registered pages/actions. It is excluded from both CMS installers; CMS upgrades preserve its package, private service configuration, tenant settings and edited Blocks.

Build/review a release ZIP using the existing packaging tools. Against a stopped target installation, preview the upgrade first:

```sh
php packaging/Package.php upgrade SuperIntuitive-php.zip --target /path/to/SuperIntuitive
php packaging/Package.php upgrade SuperIntuitive-php.zip --target /path/to/SuperIntuitive --apply
# SIPL edition:
sipl run packaging/Package.sipl upgrade SuperIntuitive-sipl.zip --target /path/to/SuperIntuitive
sipl run packaging/Package.sipl upgrade SuperIntuitive-sipl.zip --target /path/to/SuperIntuitive --apply
```

The upgrader verifies release hashes and paths and writes only code files listed in `PACKAGE.json`. It preserves credential classes, private configuration, media/domains, installed/downloaded plugins, logs, database files, installation locks and existing server configuration. Changed code is backed up under `core/upgrade-backups`; filesystem replacement failures restore already-written files. No database or installer is invoked. Review/merge new server configuration separately when updating an existing custom `.htaccess`/Docker deployment. Package hashes verify integrity, not publisher authenticity. The upgrade tool is offline and does not stop, restart or deploy a site itself.

## Verification

```sh
php tests/package.php
sipl run tests/package.sipl
php tests/Fixture.php --both --browser --runtime /path/to/sipl
node tests/sipl_package_plugins.cjs --fixture --browser --runtime /path/to/sipl
```

The fixture uses only disposable database/web containers and a separate ephemeral native listener, with generated credentials. It exercises real PHP and SIPL handlers, shared migrations and storage, actual HTTP authentication/CSRF/authorization, source isolation, deployment-specific SQL sources, CMS conflict preservation, disable/enable/uninstall/reinstall, frontend compatibility, invalid handlers/archives, failed migration recovery, source contact behavior, concurrent PHP/SIPL retries and real Chrome form/inbox flows. The fixture never reads the site's credentials or writes to its database. Its code-only fixture is automatically removed after shutdown; it never copies site configuration, media or installed plugins.
