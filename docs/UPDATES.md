# Safe, easy SuperIntuitive CMS updates

**Status: design proposal, not implemented.**  
**Scope:** a Settings tool upgrade button for both PHP and SIPL editions.  
**Reviewed:** November 10, 2026.

## 1. The recommendation

**Self-host signed, versioned release packages on a separate static HTTPS
update site, and install them through a small, supervised,
installation-scoped updater. Do not run `git pull` from the CMS.**

The preferred update address is `https://updates.superintuitive.com`, served by
the existing Nginx server independently of the CMS. GitHub, Microsoft services,
a Git hosting platform and a new database are not required. Git can remain a
source-development tool without being involved in update delivery.

Each installation downloads an explicitly approved release, verifies it,
prepares recovery, applies it during a short maintenance window, and checks
the real website before declaring success.

For the administrator, the experience should be:

1. Open **Settings -> CMS Updates**.
2. See the installed version, available stable version and release notes.
3. Click **Upgrade safely**, review the checks, and confirm once.
4. Watch progress while backup, installation and verification happen.
5. Receive either **Upgrade complete** or a specific recovery result.

No update system can promise that every future release will be bug-free.
The achievable promise is: **never apply an untrusted or incompatible package,
preserve the site's data, and make failures recoverable without guesswork.**

## 2. What already exists

There is a useful foundation; this does not need to start from scratch.

| Existing component | Verified current behavior |
|---|---|
| [Settings tool](../editor/objects/settings.js) | Contains administrative tools, including installer creation. It does not currently expose a CMS update workflow. |
| [PHP packaging/upgrader](../packaging/Package.php) | Builds and verifies PHP packages; previews or applies framework replacements, backs up changed files and attempts to restore replacements on a handled failure. |
| [SIPL packaging/upgrader](../packaging/Package.sipl) | Provides the equivalent native workflow, with release/path checks, backups and handled-failure rollback. |
| [Package inventory](../packaging/files.json) | Selects framework-owned release files separately from installation state. |
| `PACKAGE.json` in generated ZIPs | Records the edition, build timestamp, file sizes and SHA-256 hashes. It does not currently establish a CMS semantic version or authenticate its publisher. |
| [Existing upgrade documentation](../README.md#updating-an-installed-site) | Describes an offline preview/apply process, with operator-managed backup and restart. |
| [Preservation rules](PLUGINS.md#offline-cms-upgrade) | Protect configuration, credentials, site data, media, installed plugins and other local state. |

Important boundaries:

- Hashes inside a downloaded ZIP detect mismatches, **not who published it**.
  An attacker could replace both the files and their recorded hashes.
- The current upgraders replace files individually. Their in-memory rollback
  handling and end-of-operation journal are not a complete power-loss or
  killed-process recovery protocol.
- They do not perform a coordinated CMS database migration, manage maintenance,
  restart the running installation, or verify its public health.
- Existing core modifications can be overwritten by the current offline upgrade.
  A button must detect and explain those conflicts before changing anything.
- The Settings screenshot is not evidence that these missing pieces exist.
  Creating an installer is not the same operation as upgrading an installed site.

## 3. GitHub versus the alternatives

| Approach | Decision |
|---|---|
| `git pull` in the live directory | **Do not use for the product's update button.** Branch movement, merge conflicts, local changes, partially updated files and missing database/runtime coordination make it the wrong deployment contract. It also requires Git and potentially credentials on every server. |
| Separate static HTTPS site on our server | **Preferred for this project.** Reuses existing Nginx and release ZIPs without handing distribution to another company. We operate availability, storage, bandwidth and publishing controls. |
| Versioned GitHub Release assets | Optional alternative, not a dependency. Provides release notes and immutable releases if we later choose third-party distribution. |
| S3/CloudFront or another object-store/CDN | A good compatible delivery option or later mirror. Use the same signed packages and metadata; changing the download host must not change trust or installation behavior. |
| A download endpoint inside the CMS being updated | Avoid as the sole update infrastructure. The update service should remain available when that CMS is broken or under maintenance. |
| OS packages or container images | Useful for installations already managed that way, especially runtimes. Do not require Docker, a distribution-specific package manager, or a new hosting model just to update CMS core. |

### Recommended self-hosted distribution

- Build release assets locally from a reviewed, tagged source commit, using the
  existing root `package.bat`. An independently managed build worker can be
  added later; it is not necessary to start.
- Publish versioned PHP and SIPL assets, not an automatically generated branch
  source ZIP or artifacts copied from a developer's dirty working directory.
- Sign approved release metadata on the controlled build/signing machine.
  Keep the private signing key off the download server.
- Transfer packages into a private staging directory using the established
  authenticated FileZilla/SSH workflow. Staging must not be publicly served.
- Verify the uploaded assets against the approved signed metadata before
  publication. Uploading a file is not sufficient to mark it released.
- Publish each release under a unique version directory, with separate PHP and
  SIPL packages, signed metadata and release notes. Refuse reuse or replacement
  of an already published version; corrections get a new version.
- Give Nginx read-only access to published artifacts. Neither the CMS service
  account nor an ordinary upload account should be able to rewrite published
  releases. Publishing should use a narrowly scoped operator command/account.
- Publish complete version directories first, then atomically replace the
  signed stable-channel feed. Never overwrite a ZIP while clients download it
  or announce an asset that has not finished publishing.
- Serve only static update content through the separate Nginx virtual host.
  Do not execute uploaded PHP/SIPL files or route this host through CMS code.
- Use HTTPS with certificate renewal, cacheable metadata and versioned artifact
  caching. Installations should not need Git, a GitHub account or a vendor token
  for public packages.

This distribution service is just static files plus controlled publishing.
Gitea, GitLab, Docker, a custom web application and another MariaDB instance
would add unnecessary work for the initial version.

For paid/private releases, an authenticated download service can be added
separately with installation-scoped credentials. Keep credentials out of
browser JavaScript; public CMS updates do not need that additional service.

### Availability, security and cost

The existing server can host this with no GitHub subscription. Costs are our
existing server resources, storage, bandwidth and any applicable DNS/hosting
charges. A subdomain under the existing domain does not require buying another
domain. Do not promise unlimited free bandwidth or storage.

A separate Nginx site survives a CMS process restart, but it does not survive
failure of the entire shared server. Keep release archives, signed metadata and
publishing records backed up independently. If availability later warrants it,
add a second self-controlled host or a mirror serving the same verified files.

Read-only permissions and a no-overwrite publishing rule are operational
protections, not a guarantee against a compromised root account. Keeping the
signing key elsewhere means a compromised download server cannot create an
authorized replacement release, although it can cause an outage or attempt to
serve old content. Expiry and replay protections remain necessary.

### If GitHub is ever used as an optional mirror

Enable immutable GitHub Releases, upload all assets while the release is a draft,
and publish only when complete. Immutable assets and provenance attestations
are useful additional protections, not substitutes for the CMS's verification
policy. GitHub's editable "latest" marker must not determine installability;
the verified channel metadata must do that.

## 4. Authenticity and release identity

The updater must verify trust **before executing anything from a new package**.
It must not run a downloaded updater merely to ask whether that download is safe.

Use an installation-pinned public verification key and a standard detached
signature over an exact metadata payload. Ed25519 is a good candidate, subject
to proving interoperability in both native backends before implementation.
Signatures must use maintained cryptographic libraries, not hand-written crypto.
Keep payload and signature in one verifiable envelope so CDN caching cannot
accidentally pair a new payload with an old signature.

The signed metadata should bind:

- Product, CMS version, immutable release ID and source commit.
- Edition: PHP or SIPL; updates must not silently switch editions.
- Channel, publication/expiry times and a monotonic metadata revision.
- The exact artifact location, byte size and SHA-256 digest.
- Supported upgrade-from versions and required database schema version.
- PHP/SIPL version, required extensions and any platform/architecture constraints.
- Plugin/API compatibility and required operator actions.
- Whether a database migration is needed and what rollback compatibility exists.

Verify the archive digest, then its complete path/file inventory. Keep the
existing traversal, linked-path and case-collision protections; add explicit
archive size, expansion, entry-count and download limits where needed. Reject
unexpected links, unlisted executable content and unsupported package formats.
Do not accept an arbitrary download URL, directory, service name or command from
the browser.

Persist accepted metadata revisions and installed release identity privately.
Reject expired feeds, replayed older metadata and unsolicited downgrades.
An intentional recovery to an already verified local release is a separate,
owner-authorized operation, not a way for a remote feed to bypass downgrade
protection.

Signing keys stay out of repositories, release archives and installed websites.
Use protected release approvals and controlled signing credentials, with a
documented rotation/revocation and emergency recovery process. A replacement
public key must be authorized by existing trust, not downloaded and trusted
because it arrived over HTTPS.

**Current implementation gap:** the inspected SIPL native API exposes JWT
verification but not a general detached-signature verification operation.
Do not assume the release-signing primitive exists, repurpose login JWTs as a
shortcut, or require PHP to verify a SIPL update. Any missing native capability
belongs in the SIPL runtime; PHP should use its own supported native library.

TUF is the established reference for stronger update-metadata and key-compromise
protection. The small signed-feed design above must not be advertised as
TUF-compliant. If we need that resilience, adopt a reviewed TUF implementation
and its trust model rather than gradually inventing our own equivalent.

## 5. The button must not be the installer process

The browser requests and observes an update. A trusted local worker performs it.

```text
Settings -> authenticated upgrade request -> installation update worker
                                                |
                               verify -> stage -> back up
                                                |
                         maintain -> apply -> restart -> health
                                                |
                                  commit or recover
```

The worker runs independently of the PHP request or SIPL web process being
updated. Closing a tab, expiring a request, or restarting the CMS must not leave
a half-finished operation with no owner.

Requirements:

- One durable job and exclusive update lock per installation, not per tab,
  tenant, domain or deployment stage.
- Fixed installation identity, canonical paths and approved restart target.
- Private progress, backups and recovery journal outside the served tree.
- A durable recovery record written before destructive changes, with safe
  recovery after a worker crash or power interruption.
- Status/recovery access that still works while the main CMS is stopped, with
  job-scoped authorization. Never expose a public shell or unauthenticated
  repair endpoint.
- An operator CLI recovery path if the browser or main application is unusable.

For managed Linux hosting, install a narrowly scoped worker/service during
initial setup. It may update and restart **that CMS installation only**.
The public web process must not gain root, broad `sudo`, or general write access
to every application.

PHP uses PHP tooling; SIPL uses SIPL tooling. Reuse the packaging/upgrader
functions rather than duplicate their logic in JavaScript or a website fork.
Keep new behavior in the shared CMS repository, following its existing
entity/dispatcher structure. No Python dependency is needed.

Windows needs an equivalent supervised task/service and file-locking/restart
tests. Shared hosting may require an owner-configured CLI/cron worker. If the
host cannot provide the required capabilities, explain that in Settings and
offer a verified manual package; do not silently make core files world-writable
or pretend every hosting plan supports one-click installation.

## 6. The actual upgrade sequence

### A. Check and prepare while the site is still running

1. Authenticate the installation owner and verify CSRF.
2. Resolve a signed release matching the installed edition and supported path.
3. Check runtimes, extensions, plugin compatibility, private storage permissions
   and enough space for download, extraction, backups and recovery.
4. Compare installed framework hashes against the last installed baseline.
   Report local changes; block automatic overwriting until reviewed.
5. Validate any required server configuration change. Do not report a release
   fully installed while silently skipping a mandatory protected configuration.
6. Download and verify the release into a private staging directory.
7. Run the existing preview and compile/syntax checks against the staged files.
8. Present the exact version, migration impact, conflicts and maintenance plan.
   Warn about unsaved editor changes before the owner confirms.

For legacy installations without trustworthy version metadata, identify and
bootstrap a baseline explicitly. Do not infer the installed version from
timestamps or label an unrecognized installation "up to date."

### B. Enter a controlled maintenance window

9. Acquire/revalidate the update lock and the prepared installation baseline.
   If anything relevant changed after preview, require a new plan.
10. Block new CMS writes, drain in-flight requests and pause this installation's
    background writers. Keep an independent maintenance/status response working.
11. Create and verify recovery material: old code, permissions, private
    configuration and a consistent backup of the **configured CMS database**.
    Preserve media/plugin state; use an appropriate existing snapshot or
    incremental backup strategy rather than copying terabytes unnecessarily.
12. Record the recovery checkpoint durably before applying changes.

A backup must have a successful completion result and integrity record, not
just a nonempty filename. Test restoration regularly and during release
validation. Protect backups as secrets and retain an off-host recovery copy.
Never dump or restore unrelated application databases as part of a CMS upgrade.

### C. Apply, verify and commit

13. Apply only framework-owned changes and explicitly versioned migrations.
    Obsolete-file deletion must be signed, confined to previously managed files,
    checked for local modifications, and recoverable.
14. Start/reload only the affected CMS instance. Handle PHP opcode caches and
    long-running SIPL processes so they cannot keep serving the previous code.
15. Verify the actual configured origin, with correct Host/SNI and valid TLS:
    a public page, protected-route behavior, database access and correct release
    identity. Add authenticated editor/API smoke checks without creating or
    changing customer content.
16. Use bounded readiness checks for asynchronous startup/reload. A service
    reporting "active" is not sufficient. Never bypass TLS or turn an error into
    a success-shaped response.
17. Commit the installed-version ledger and reopen writes only after checks pass.
    Keep the previous verified release and recovery records under a documented,
    bounded retention policy.

### File publication: practical first release versus long-term layout

For the current flat installation layout, the first implementation can reuse
the existing upgraders **after** adding durable recovery and a real maintenance/
request-draining barrier. Individual replacements are not an atomic site-wide
deployment; the old CMS must not keep processing requests through a mixed tree.

Versioned, immutable code directories with a single active-release switch are
the stronger long-term layout where the host supports them. Mutable
configuration, media, plugins and data stay separate. Switching code back is
then straightforward, but database compatibility still has to be proved.

This layout is not a drop-in symlink trick: the current upgraders deliberately
reject linked targets/parents, and CMS paths assume existing installation
locations. A later layout migration must explicitly handle canonical roots,
trusted state bindings, PHP opcode caches and Windows semantics without
weakening confinement. Do not make a whole filesystem redesign a prerequisite
for the first safe button.

## 7. Database, plugin and runtime rules

**Never run the fresh-site installer against an existing site.** Do not import
starter Blocks, themes or database dumps as an upgrade. Preserve accounts,
credentials, messages, translations, Dev/Test/Live/Rollback content and local
widget/source overrides. Report compatibility concerns with overrides instead
of overwriting them.

Track database schema version independently of CMS version, using ordered,
tested migrations with an execution journal. Prefer expand/contract changes
that keep the previous release compatible. Do not assume MariaDB DDL rolls back
like ordinary transactional row updates; many statements cause implicit commits.

Recovery must distinguish:

| Failure point | Safe response |
|---|---|
| Download, trust or preflight failure | Leave the running installation untouched; show the actual error. |
| Apply/startup failure with no schema change | Restore the previous verified code and restart/check it. |
| Compatible additive migration | Roll back code only when declared and tested compatible with the new schema. |
| Destructive or incompatible migration | Do not offer blind automatic code rollback. Keep maintenance active and follow the verified database recovery plan. |
| Failure after writes reopened | Do not restore an old database automatically: that would discard new customer data. Require forward repair or an explicitly approved recovery preserving later writes. |
| Recovery itself fails | Remain in maintenance, retain the evidence and backups, and expose an explicit operator recovery action. |

Disallow destructive schema changes from the initial automatic-update scope.
Start with code-only, backward-compatible releases. Add migrations only after
the backup/restore and failure-injection tests are established.

Plugins remain separately installed packages. Check declared CMS/API
compatibility before upgrade; unknown or incompatible plugins need owner review,
not silent removal, replacement or disabling. A CMS update must not overwrite
their files, private settings or stored content.

CMS ZIPs currently exclude runtimes. If PHP or SIPL is too old, report a runtime
prerequisite rather than replacing a machine-wide runtime used by unrelated
apps. A future pinned per-installation runtime can participate in the same
staging/recovery process. Do not reinstall MariaDB, move databases, or restart
other SIPL apps as a side effect of a CMS update.

## 8. Settings UX and authorization

Add a distinct **CMS Updates** section to the existing Settings tool:

- Installed version/edition, stable channel and last successful check.
- Available version, release notes, compatibility and required manual actions.
- **Check for updates** and **Upgrade safely**.
- Progress: preparing, backup, maintenance, installation, verification, complete
  or recovery required.
- A clear recovery/log action, with secrets removed from browser-visible output.

Use existing editor localization catalogs and both backend dispatchers. Keep
database content deployment controls separate: switching Dev/Test/Live does not
isolate a framework update, which affects every site sharing that installation.

Ordinary tenant `Admin` access must not automatically grant installation-wide
code execution. Define an installation-owner update capability, managed outside
tenant-editable settings. Require it server-side for preparation, application,
recovery and protected logs; hiding the button is not authorization. Retain CSRF,
same-origin checks and appropriate recent-login confirmation.

Automatically checking for a stable update is reasonable. **Automatically
installing updates is off by default.** Do not silently run major upgrades,
runtime switches, migrations or plugin changes.

## 9. Delivery order and release gates

1. Establish semantic versions, supported upgrade paths, signed distribution,
   native verification and an explicit legacy-bootstrap procedure.
2. Harden existing offline upgraders: local-modification detection, complete
   recovery inventory, durable journal, safe removals and interrupted-job repair.
3. Add the supervised worker and prove its maintenance/restart/recovery behavior
   on managed hosting, without adding the button yet.
4. Add Settings UI and equivalent PHP/SIPL authorization/progress behavior.
5. Pilot code-only updates on disposable sites, then an explicitly approved
   development installation, then selected production sites.
6. Extend to backward-compatible migrations and additional hosting layouts only
   after restore drills and platform tests pass.

Release gates must cover both **actual packaged editions**, not just source:

- Preservation of configuration, accounts, content, translations, media, plugins
  and edited widget sources.
- Good signature versus altered metadata, wrong key, expired/replayed feed,
  altered ZIP, wrong edition and unsupported runtime/schema.
- Traversal, symlink, duplicate/case-colliding paths, oversized archives and
  locally modified or obsolete managed files.
- Two simultaneous update requests, a closed browser, disk-full, permission
  failure, process termination and interruption during every destructive stage.
- Migration/rollback compatibility, failed backup, failed startup, failed health
  check and failed recovery, with no silent success.
- PHP opcode-cache refresh, SIPL process replacement and Windows file locks.
- Installation-owner versus tenant/guest access, CSRF, maintenance write
  rejection, and no secret leakage.
- Upgrade from each supported prior version, with repeat/recovery behavior
  exercised and restores checked in a disposable database.

Reuse the existing package and fixture suites
([PHP](../tests/package.php), [SIPL](../tests/package.sipl),
[packaged integration](../tests/Fixture.php)); extend them rather than creating
a disconnected updater test system.

## Bottom line

**We can host the complete update-distribution system ourselves. GitHub is
optional, and Git is not the right live-site updater.**

The best practical path is a static `updates.superintuitive.com` release site
plus our existing data-preserving package upgrader, wrapped with signed releases,
a narrowly scoped independent worker, verified backups, explicit maintenance/
recovery and real health checks. That creates an easy button without pretending
that copying files alone makes an upgrade safe.

### References

- [GitHub: immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [GitHub: artifact attestations and their verification](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- [The Update Framework: update threats and trust metadata](https://theupdateframework.io/docs/overview/)
