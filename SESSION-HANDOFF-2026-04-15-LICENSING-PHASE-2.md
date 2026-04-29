# NZBarr Desktop - Licensing Phase 2 Handoff
# Date: 2026-04-15
# Status: Licensing foundation and first real premium gating pass are working end-to-end against the local MAMP test server.

## WHAT HAPPENED TODAY

Work focused on building the first **real commercial licensing flow** for the desktop app.

This was done in two stages:

1. **Phase 1 foundation**
   - desktop app can store license state
   - desktop app can talk to a license server
   - MAMP-friendly PHP/MySQL test license server scaffold was created
   - user successfully activated a test license from local server

2. **Phase 2 first premium gating pass**
   - free mode vs premium mode now changes actual app behavior
   - premium features are disabled in the UI when no valid license is active
   - protected backend IPC actions are also blocked server-side in Electron main process
   - reactivation correctly restores premium features

User explicitly tested:
- clear license -> premium actions disappeared / were disabled
- reactivate license -> premium actions worked again

That test succeeded.

## CURRENT WORKING STATE

Licensing is now doing real work, not just showing status.

Confirmed working:
- `License Server URL` can be entered in Settings
- license activation works against local MAMP server
- machine ID is generated and stored
- plan / expiry / customer / last-validated info round-trip correctly
- header pill switches between free and premium state
- premium actions disable correctly in free mode
- premium actions re-enable correctly after valid activation
- main-process protection prevents bypassing premium actions through IPC

## TEST SERVER STATUS

User test server URL:

```text
http://nzbarr-license.local:8888
```

Seeded test keys:

```text
NZBARR-TEST-ACTIVE-2026
NZBARR-TEST-GRACE-2026
NZBARR-TEST-EXPIRED-2025
NZBARR-TEST-REVOKED-2026
```

Known working activation example:
- key: `NZBARR-TEST-ACTIVE-2026`
- plan: `premium_yearly`
- customer: `active@example.com`

## DESKTOP APP CHANGES MADE

### License foundation

Added / updated:
- `src/licenseService.js`
- `src/database.js`
- `src/repositories/settingsRepository.js`
- `main-process/main.js`
- `main-process/preload.js`
- `renderer/index.html`
- `renderer/css/style.css`
- `renderer/js/app.js`

App now stores:
- `license_key`
- `license_server_url`
- `license_status`
- `license_plan`
- `license_expires_at`
- `license_last_validated_at`
- `license_grace_until`
- `license_machine_id`
- `license_features_json`
- `license_customer_email`
- `license_message`

IPC added:
- `license:getStatus`
- `license:activate`
- `license:refresh`
- `license:clear`

Settings UI added:
- license server URL field
- license key field
- activate / refresh / clear buttons
- status display

### Premium gating pass

Renderer-side gate logic added in:
- `renderer/js/app.js`

Main additions:
- `canUseLicensedFeature(feature)`
- `getLicensedFeatureMessage(feature)`
- `requireLicensedFeature(feature)`
- `setLockedElementState(...)`
- `applyLicenseFeatureState()`

Main-process safety added in:
- `main-process/main.js`

Main additions:
- `getPremiumFeatureError(feature)`
- `enforceLicensedFeature(feature)`

## FEATURES CURRENTLY GATED

These are now treated as premium:

### `send_to_downloader`
- release detail `Send to SABnzbd`
- release detail `Send to NZBGet`
- browse batch send
- browse row send
- details-table / TV-table batch send
- details-table / TV-table row send
- backend `releases:sendToDownloader`

### `edit_media_info`
- `Edit Info` button
- edit info modal save / fetch TMDB / TMDB search / delete flows

### `custom_artwork_upload`
- upload cover
- upload backdrop
- upload logo

### `fanart_artwork`
- Fanart.tv cover picker
- Fanart.tv backdrop picker
- Fanart.tv logo picker

### `owned_refresh`
- release detail refresh button
- manual refresh trigger path
- backend `autoRefresh:triggerManual`
- backend `releases:refreshOwned`

### `auto_refresh`
- auto refresh settings controls
- scheduler start / stop IPC
- scheduler startup on app launch now checks license first

## IMPORTANT BEHAVIOR DECISIONS

The current UX choice is:
- premium features remain visible
- they are disabled in free mode
- tooltips/messages explain they require Premium

This was intentional so users can discover premium capabilities instead of wondering what exists.

## TEST LICENSE SERVER FILES CREATED

Created:
- `license-server/README.md`
- `license-server/config.sample.php`
- `license-server/.htaccess`
- `license-server/database/schema.sql`
- `license-server/database/seed.sql`
- `license-server/lib/bootstrap.php`
- `license-server/lib/db.php`
- `license-server/lib/license-validator.php`
- `license-server/api/licenses/validate.php`

Important note:
- `schema.sql` was adjusted for older MAMP MySQL/MariaDB compatibility
- `.htaccess` was added so `/api/licenses/validate` works without manually typing `.php`

## VERIFICATION COMPLETED TODAY

Syntax checks passed:

```bash
node --check renderer/js/app.js
node --check main-process/main.js
php -l license-server/api/licenses/validate.php
php -l license-server/lib/bootstrap.php
php -l license-server/lib/db.php
php -l license-server/lib/license-validator.php
```

User functional verification passed:
- clear license
- confirm premium actions disabled
- reactivate license
- confirm premium actions enabled again

## NEXT RECOMMENDED STEP TOMORROW

### Renewal / Expired-State UX pass

This is the next best step.

Reason:
- licensing is technically working now
- the next commercial-quality improvement is making expiry / grace / renewal feel polished
- currently the app is correct, but not yet fully “product-ready” in how it explains renewal state

Recommended tomorrow scope:

1. Improve expired / grace messaging in Settings
2. Add renewal-oriented copy when status is `expired`
3. Add clearer grace-period messaging when status is `grace`
4. Optionally add a renewal button / external link placeholder
5. Review which parts should say:
   - `Free`
   - `Premium Active`
   - `Premium Grace`
   - `Premium Expired`

## SUGGESTED UX FOR TOMORROW

When `active`:
- show expiry date clearly
- reassure user premium is active

When `grace`:
- explain server could not be reached
- show grace deadline
- explain premium remains temporarily available

When `expired`:
- explain app is now running in free mode
- show expiry date
- encourage renewal

When `revoked` / `invalid`:
- explain the license is not valid
- keep tone clear but not harsh

## IMPORTANT CAUTION

Do not broaden gating too aggressively tomorrow.

Today’s pass already covers the most important premium anchors:
- downloader send
- edit info
- artwork tools
- owned refresh
- auto refresh

Tomorrow should focus on **license state UX**, not a large new gating refactor.

## EXTRA UI FOLLOW-UP FOR TOMORROW

User reported one separate visual bug to remember tomorrow:

### Hero slider timeline bar does not run correctly

Current issue:
- the slider timeline/progress line stops at roughly `15%` of the viewport
- it is not visually traversing the full intended width

This is a separate UI polish issue from licensing.

Recommended tomorrow:
1. inspect hero timeline CSS and JS width/transform logic
2. verify whether the line is constrained by the slider container or another positioned parent
3. fix only after the licensing UX pass, unless the user wants it prioritized first

## IF RESUMING TOMORROW

1. Read this handoff first
2. Keep current gating behavior intact
3. Focus on expired / grace / renewal UX polish
4. Re-test with:
   - `NZBARR-TEST-ACTIVE-2026`
   - `NZBARR-TEST-EXPIRED-2025`
   - `NZBARR-TEST-REVOKED-2026`
5. Verify the Settings > License area communicates each state cleanly
6. Also inspect/fix the hero slider timeline bar width issue

## RELEVANT FILES

- `src/licenseService.js`
- `main-process/main.js`
- `main-process/preload.js`
- `renderer/js/app.js`
- `renderer/index.html`
- `renderer/css/style.css`
- `license-server/api/licenses/validate.php`
- `license-server/database/schema.sql`
- `license-server/database/seed.sql`

## FINAL NOTE

Today turned licensing from a concept into a working product foundation.

The local test server works.
The desktop app validates correctly.
Premium features now truly unlock and relock.

The next step is not “make licensing exist”.
It already exists.

The next step is to make the **expired / renewal experience feel polished and commercially ready**.
