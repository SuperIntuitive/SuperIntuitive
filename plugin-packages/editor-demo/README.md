# Editor Demo plugin

This is a separate PHP/SIPL plugin, not part of either CMS installer. It owns its HTTP listener, sandbox policy, public editor model, request limits and temporary editing behavior. The CMS uses its existing plugin installer, pages, actions, authentication, authorization and CSRF protection. No demo-specific core dispatcher, renderer or configuration changes are required.

The demo reads the current installation's editor assets and published Blocks. It does not create another CMS copy. All twelve tools work in an opaque-origin iframe. Saving, publishing, uploads, external connections, forms and private resources are blocked. Reset reloads the published source and discards in-memory edits.
 
## Languages

Version 1.1.1 selects English, Spanish (`es`), Simplified Chinese (`zh`) or Tagalog
(`tl`) from `Accept-Language`, including regional preferences such as `tl-PH`.
Only the chosen editor dictionary is sent. The neutral packaged sample is also
translated, with one small AI-translation notice in non-English languages.
Custom published samples use the CMS's normal database multilingual bindings.
Only local-text records referenced by that sample are exposed to the editor;
the site's full language catalog remains private. Reset retains the selected
language, and the native listener partitions its short-lived cache by language.

This does not install languages or change CMS defaults. The shared editor's
optional `SI.EditorText` dictionary translates display text at its source, not by
rewriting the canvas DOM. Technical identifiers, tool keys, tab identities,
user-entered text, CSS and JavaScript stay unchanged. Version 1.1.1 shares the
CMS-owned dictionaries in `editor/locales/` with the real editor. Its own locale
files contain only sample HTML and demo-specific notices. Update the CMS to a
release containing these catalogs and editor locale helpers before installing
this plugin revision. Older installed demo revisions remain compatible with
the unchanged editor-template slot contract.

## Install and configure

1. Upload/download editor-demo.zip in **Tools → Plugins**, then install and enable it.
2. Open **Editor demo settings** from its Admin navigation link (/admin/editor-demo). Set an HTTPS demo origin on a different hostname, allowed parent origins, and the published source page. The default is editor-demo-source, installed with a neutral example Block. Edit/publish that Block to use your own company content. Existing website pages are not overwritten.
3. Create a separate database user with **SELECT permission only** on this installation's database. Both listeners verify its grants and reject write-capable accounts. Do not reuse the CMS account.
4. Copy demo.config.example.json to the private CMS/core/editor-demo.local.json. Set the CMS root, domain/subdomain, database DSN and reader credentials. Keep the file private. It is not part of a release or plugin ZIP update.
5. Run the listener belonging to your backend from the installed plugin folder shown on the settings page. Put an HTTPS reverse proxy in front of its loopback port, preserving the public Host header. Route **every path** on the demo hostname to this listener; never expose the installation as an unrestricted static document root.

PHP, in PowerShell:

    $env:SI_DEMO_CONFIG = 'C:\Sites\SuperIntuitive\core\editor-demo.local.json'
    php -d post_max_size=1M -S 127.0.0.1:8096 C:\Sites\SuperIntuitive\core\plugin-packages\editor-demo\REVISION\php\demo.php

SIPL:

    sipl run C:\Sites\SuperIntuitive\core\plugin-packages\editor-demo\REVISION\sipl\demo.sipl C:\Sites\SuperIntuitive\core\editor-demo.local.json

Each edition uses its own runtime only. PHP needs PDO MySQL; SIPL needs the CMS-supported interpreter with MySQL and native filesystem APIs. For local testing use http://demo.localhost:8096, a parent such as http://localhost:8090, and the loopback listener. Production requires HTTPS. The listener has no CMS session middleware and sends no account cookies or CSRF token.

Open /editor-demo to try it. A website's existing wrapper can instead embed:

    <iframe sandbox="allow-scripts" src="https://demo.example.net/cms/sample/canvas"></iframe>

Its response policy should restrict frame-src to that demo origin. The plugin's own wrapper adds this restriction automatically. Keep allow-same-origin absent. Reload the frame with ?reset= followed by a numeric timestamp to reset. Existing si-sample ready/blocked/notice messages and si-sample-host tool messages are retained.

The four limits in the private service configuration are global across visitors, independent of cookies or forwarded IP headers. They are checked before request database work. The PHP listener stores only rate counters in private core/plugin-requests; browser edits are never stored there. Normal CMS session audit records may still be written when opening the parent page.

The SIPL listener allows up to 128 connections from the loopback proxy, matching
the runtime's global connection cap. The default 32-per-IP limit is insufficient
when an HTTPS proxy fans out an HTTP/2 page load into separate asset connections.
Loopback binding, request limits, SELECT-only database grants and the opaque-origin
sandbox remain unchanged. This setting belongs to this private plugin, not the CMS
installer.

Restart only the plugin listener after changing its settings or plugin code. Disabling/uninstalling through the CMS immediately closes the service to new requests, even while the listener process is still running. Settings and published Blocks remain intact on uninstall.

## Updating the CMS independently

Use the normal offline CMS updater. It preserves this plugin's immutable installed package, tenant-scoped settings, edited database Blocks and core/editor-demo.local.json. Neither CMS installer contains the demo. Restart the plugin listener after a CMS update so its imported native helpers and current editor template are refreshed; it does not require a core patch or reinstall.

Shared editor assets are read from the current CMS installation and served without persistent browser caching, so updated templates and tool scripts stay together.

The plugin uses the CMS's current editor data/template contract and detects unsupported PHP template slots rather than evaluating privileged editor PHP. Its public model contains one published, Guest-accessible page and no users, role assignments, installed plugins, private media or site settings. It fails closed if source page permissions or installation state prohibit access.

Build this standalone ZIP in either language:

    php packaging/Package.php plugin editor-demo
    sipl run packaging/Package.sipl plugin editor-demo

Publish the ZIP separately on the plugin server and merge its entry from plugin-packages/index.json into the catalog.

Run packaged installation, browser isolation and CMS-update tests against disposable data:

    php -d extension=zip tests/Fixture.php --demo --runtime /path/to/sipl

The fixture uses temporary PHP/SIPL listeners, a SELECT-only database account, and disposable MariaDB. It verifies all twelve tools in all four languages, canonical tool-click identities, translated notices, language-preserving resets, temporary editing, cookie and private-data isolation, denied writes, disable/uninstall, and unchanged plugin/configuration/content across a CMS update. It does not deploy or restart an existing website.
