# SIPL plugins

`package.bat` builds the checked-in SIPL backend into `dist/SuperIntuitive-sipl.zip`. The build rejects the old installation placeholder and missing plugin modules. Plugins are downloaded separately; none are included in the installer.

In an extracted SIPL edition, sign in as Admin and switch to Dev. Open **Tools → Plugins → Plugins Repo** to discover/download packages from `https://plugins.superintuitive.net/`, then install them from **Local Plugins**. **Upload Zip** is also supported (JSON/base64, up to 750 KB in the browser). The native host never runs PHP handlers.

The Contact plugin remains a separate ZIP. Its manifest registers the public `/contact-form` page and Admin-only `/admin/contact` inbox. No plugin-specific dispatcher changes are needed. Required PHP-only packages are rejected on SIPL; frontend-only legacy plugins remain supported.

The generic Admin delegate keys are `GetMorePlugins`, `DownloadPlugin`, `GetLocalPlugins`, `UploadPluginPackage`, `InstallPlugin`, `UpdatePlugin`, `EnablePlugin`, `DisablePlugin` and `UninstallPlugin`. Existing login, Admin/Dev and CSRF requirements apply. Plugin actions use `PluginAction` and the manifest's role permissions.

Packages install privately under `core/plugin-packages`. The additive schema in `core/plugin-schema.sql` shares tenant state, storage and migration tracking with the PHP plugin host. Updates preserve edited SQL `*-html`, `*-style` and singular `*-script` columns. Uninstall keeps data by default. Backend and SQL source are blocked from public requests.

Verify the actual release, using a separately supplied Contact ZIP:

```sh
node tests/sipl_package_plugins.cjs --fixture --browser --contact /path/to/contact.zip
```

The test extracts `dist/SuperIntuitive-sipl.zip`, uses its native installer to seed a disposable database, checks remote catalog discovery/download, and installs Contact through the packaged native editor. No PHP backend, live configuration, website data or running service is used.
