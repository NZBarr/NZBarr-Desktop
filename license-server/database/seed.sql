DELETE FROM license_activations;
DELETE FROM licenses;

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
) VALUES
(
  'NZBARR-TEST-ACTIVE-2026',
  'active@example.com',
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
    'collections_page',
    'grand_vault',
    'auto_refresh',
    'owned_refresh',
    'bulk_actions',
    'advanced_settings'
  ),
  'Primary active test key'
),
(
  'NZBARR-TEST-GRACE-2026',
  'grace@example.com',
  'premium_yearly',
  'active',
  UTC_TIMESTAMP(),
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY),
  14,
  2,
  JSON_ARRAY(
    'send_to_downloader',
    'edit_media_info',
    'custom_artwork_upload',
    'fanart_artwork',
    'collections_page',
    'grand_vault',
    'auto_refresh',
    'owned_refresh',
    'bulk_actions',
    'advanced_settings'
  ),
  'Use this later to test grace mode by shutting down the server after a successful activation'
),
(
  'NZBARR-TEST-EXPIRED-2025',
  'expired@example.com',
  'premium_yearly',
  'active',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 400 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY),
  14,
  2,
  JSON_ARRAY(),
  'Expired test key'
),
(
  'NZBARR-TEST-REVOKED-2026',
  'revoked@example.com',
  'premium_yearly',
  'revoked',
  UTC_TIMESTAMP(),
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 365 DAY),
  14,
  2,
  JSON_ARRAY(),
  'Revoked test key'
);
