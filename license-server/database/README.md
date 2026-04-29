# NZBarr License Database

This folder contains the MySQL schema for the production license server.

## Recommended Setup

1. Create a MySQL database for NZBarr, for example `nzbarr_license`.
2. Create a dedicated MySQL user with access only to that database.
3. Import [`production-schema.sql`](./production-schema.sql).
4. Import [`seed.sql`](./seed.sql) if you want the test licenses for local validation.

## Suggested Production Tables

- `licenses` keeps the canonical license record.
- `license_activations` tracks machine activations.
- `license_audit_log` stores validation attempts and support-friendly audit events.

## Operational Notes

- Keep database credentials out of version control.
- Use UTC for all timestamps.
- Back up the database regularly.
- If you add admin tooling later, keep it on a separate protected route or host.

## Creating A Real License Manually

For an initial production test, you can insert one license row by hand.

Example:

```sql
INSERT INTO licenses (
  license_key,
  customer_email,
  plan,
  status,
  issued_at,
  expires_at,
  grace_days,
  max_activations,
  features_json,
  notes
) VALUES (
  'NZBARR-LIVE-TEST-001',
  'you@example.com',
  'premium_yearly',
  'active',
  UTC_TIMESTAMP(),
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 365 DAY),
  14,
  2,
  JSON_ARRAY(
    'send_to_downloader',
    'edit_media_info',
    'custom_artwork_upload',
    'fanart_artwork',
    'auto_refresh',
    'owned_refresh',
    'bulk_actions'
  ),
  'Manual production test license'
);
```

You can run that after importing `production-schema.sql`.

## Later Admin Form

Yes, we can add a small protected admin form later for:

- creating licenses
- revoking licenses
- extending expirations
- viewing activation history

That should be a separate admin area, not part of the public site.
