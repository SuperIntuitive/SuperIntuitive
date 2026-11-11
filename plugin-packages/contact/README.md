# Contact system 1.1.1 — PHP and SIPL

This plugin adapts the working contact system in the local `superintutitive.com` repository (the superintuitive.com website). The source is `core_sipl/src/Contact.sipl`; its form/inbox assets are stored in `sql/contact-page.sql`. [Source fingerprints](reference/source.json) record the files inspected. The PHP handler is a native port of the same behavior; SIPL never executes PHP.

Features:

- Name, email, product/topic and message fields with the source site's design.
- Topics: General, SuperIntuitive CMS, Gameatude and SIPL.
- Trimming, lowercase email, required fields, a honeypot, and server validation. Actual source/runtime limits are 100/254/5000 UTF-8 bytes for name/email/message.
- Random 32-hex submission tokens. Identical retries return the same receipt; changed messages reusing a received token return HTTP 409.
- Persistent five-minute limits: three new messages per normalized email and twenty per tenant. Retries do not consume another message. PHP and SIPL share these limits and the same records.
- Admin-only inbox: twenty messages per page, Load more, Refresh, total/unread counts, read/unread controls and email reply links. Sender text is rendered using text nodes.

## Install

Use the updated plugin host in the main SuperIntuitive repository; 1.1 needs its additive `get`, `page`, `count` and `atomic` storage APIs and generic error-status support. Installing this ZIP alone on the original CMS or the earlier host does not add those APIs. The same host builds both CMS editions; Contact is distributed as a separate ZIP.

Sign in as Admin, enter Dev, upload **contact.zip** in **Tools → Plugins**, then install it. Both backend entries are inside the same ZIP. Use **Update from downloaded ZIP** for an existing Contact installation.

- Public form: **`/contact-form`**.
- Private inbox: **`/admin/contact`**, linked from Local Plugins.

These retain the earlier plugin's routes and avoid overwriting the starter CMS's `/contact` page. The source website uses `/contact` and `/admin/messages`. A new package can change manifest paths before installation if those paths are free. Existing installed page paths are preserved during updates.

The plugin does not copy the source site's configuration, publish its SQL, change shared headers or import its existing messages. New messages live in tenant-scoped `si_plugin_data`. There is no SMTP notification service: administrators read the inbox and reply from their email application.

## Preserve data and CMS changes

The existing `001-contact` migration remains byte-for-byte unchanged. There is no destructive data migration. Existing v1 messages, subjects and read flags remain available. The v1 `subject` submission API and edited v1 form/inbox markup remain supported. The new form always supplies topic and submission token. `delete` remains an Admin-only API for older clients; the new inbox follows the source site's read/unread workflow.

Install/update/enable/disable/uninstall use the generic plugin manager. Uninstall keeps messages by default. Page HTML, CSS and JavaScript seed deployment-specific SQL block columns; updates retain CMS-edited columns and report conflicts. To adopt a newer interface in a deliberately edited block, review and merge the matching `html`, `css` or `js` source through the CMS rather than overwriting the edits.

## API

Use the standard `PluginAction` request with `plugin: "contact"` and a valid `X-SI-CSRF` token.

| Action | Endpoint | Data | Permission |
| --- | --- | --- | --- |
| `submit` | `/delegate.php` | `name`, `email`, `topic`, `message`, `website: ""`, `submission` | Public, CSRF required |
| `inbox` | `/delegate-admin.php` | `offset` (0–100000; default 0) | Admin |
| `update` | `/delegate-admin.php` | `id`, `state: "read"` or `"unread"` | Admin |

`submit` returns `CONTACTSENT: {id}`. `inbox` returns `CONTACTMESSAGES` containing `messages`, `hasMore`, `offset`, `total` and `unread`. `update` returns `CONTACTMESSAGEUPDATED` with `id`, `state`, `total` and `unread`. The general delegate retains its array response envelope; the Admin delegate returns an object.

Validation errors return HTTP 400 and `CONTACT_VALIDATION_FAILED`, with a field when applicable. Token conflicts return 409; spam limits return 429. Authentication, authorization and CSRF stay in the existing CMS endpoints.

## Build and test

```sh
php packaging/Package.php contact --output dist/contact.zip
# SIPL edition: sipl run packaging/Package.sipl contact --output dist/contact.zip
php tests/Fixture.php --both --browser --runtime /path/to/sipl
node tests/sipl_package_plugins.cjs --fixture --browser --runtime /path/to/sipl
```

The fixture runs PHP and SIPL against a disposable MariaDB, checks both real HTTP backends and Chrome interfaces, and submits the same token simultaneously from PHP and SIPL. It does not use the source website's configuration or database. Chrome screenshots contain synthetic test messages only.
