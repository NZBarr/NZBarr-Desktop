# NZBarr License Server

This is a small PHP/MySQL license server intended to validate NZBarr desktop activations.

It provides:
- `POST /api/licenses/validate`
- machine activation tracking
- active / expired / revoked / invalid responses
- seeded test licenses
- a protected admin panel for manual license management

## Local Development In MAMP

Point a MAMP host document root to this folder:

- `/Users/hermansteijn/NZBarr-Desktop/license-server`

Example local URL:

- `http://nzbarr-license.local`

The desktop app can use either:

- `http://nzbarr-license.local`
- or `http://nzbarr-license.local/api/licenses/validate`

If you enter the base URL, the app will append `/api/licenses/validate`.

## Database Setup

1. Create a MySQL database, for example:
- `nzbarr_license_test`

2. Import:
- [database/schema.sql](./database/schema.sql)
- [database/seed.sql](./database/seed.sql)

## Config

1. Copy:
- `config.sample.php` -> `config.php`

2. Update your MAMP database credentials.
3. Keep signing enabled and point `signing.private_key_path` to your server-only private key.

For your local test URL:
- `http://nzbarr-license.local:8888`

For production:
- host the public site on `https://nzbarr.com`
- host the license API on a dedicated subdomain such as `https://license.nzbarr.com`
- keep the private key only on the server
- use [`database/production-schema.sql`](./database/production-schema.sql) for the live database
- set admin credentials in `config.php` for the protected admin panel

## Admin Panel

The admin panel lives at:

- `https://license.nzbarr.com/admin/`

It uses HTTP basic auth and supports:

- creating licenses
- revoking licenses
- extending license expiry
- viewing recent activations

## Test Keys

Seed data includes:

- `NZBARR-TEST-ACTIVE-2026`
- `NZBARR-TEST-GRACE-2026`
- `NZBARR-TEST-EXPIRED-2025`
- `NZBARR-TEST-REVOKED-2026`

## Response Shape

Successful validation returns:

```json
{
  "valid": true,
  "status": "active",
  "plan": "premium_yearly",
  "expires_at": "2027-04-15T00:00:00Z",
  "grace_until": "2027-04-29T00:00:00Z",
  "customer_email": "user@example.com",
  "features": [
    "send_to_downloader",
    "edit_media_info",
    "custom_artwork_upload",
    "fanart_artwork",
    "collections_page",
    "grand_vault",
    "auto_refresh",
    "owned_refresh",
    "bulk_actions",
    "advanced_settings"
  ],
  "message": "License active"
}
```

When signing is enabled, responses also include:

```json
{
  "signed_payload": "<base64url-encoded-json-payload>",
  "signature": "<base64url-signature>",
  "key_id": "prod-2026-01",
  "alg": "ed25519"
}
```

## Request Body

```json
{
  "license_key": "NZBARR-TEST-ACTIVE-2026",
  "machine_id": "desktop-machine-id",
  "app_version": "0.1.0",
  "platform": "darwin"
}
```

## Notes

- This is a test server, not the final production licensing backend.
- Keep `license-private-key.pem` server-side only. Never commit it to git and never ship it in the app.
