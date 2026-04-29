# NZBarr Session Handoff
# Date: 2026-04-20

## Current Focus
The desktop app is largely in place, and today’s work focused on the public site for `nzbarr.com` plus the production license server at `license.nzbarr.com`.

## What Is Working
- `license.nzbarr.com` is live and serving the license server
- The license endpoint validates requests and returns signed JSON
- The production database schema is imported and working
- License refresh from NZBarr now succeeds
- A protected admin panel exists for manual license creation, revocation, and expiry changes
- The public NZBarr website now exists as a multi-page static site

## Public Site Files
- `website/index.html`
- `website/how-it-works.html`
- `website/manuals.html`
- `website/faq.html`
- `website/download.html`
- `website/styles.css`
- `website/robots.txt`
- `website/.htaccess`

## Site Notes
- The home page now acts as a menu hub rather than one long brochure
- Typography was toned down so it feels closer to the desktop app
- The visual direction now matches NZBarr better:
  - dark background
  - champagne / gold accents
  - compact glass-panel styling
- Search engine indexing was intentionally blocked as much as practical for a public static site:
  - `robots.txt` disallow all
  - `noindex` / `nofollow` meta tags
  - `X-Robots-Tag` headers in `.htaccess`

## License Server Files
- `license-server/README.md`
- `license-server/deployment-namecheap.md`
- `license-server/index.php`
- `license-server/admin/index.php`
- `license-server/lib/admin.php`
- `license-server/lib/license-validator.php`
- `license-server/database/production-schema.sql`
- `license-server/database/README.md`

## Production Status
- Database connection issues were resolved by using the correct Namecheap-prefixed database and user names
- A manual production license row was created and validated successfully
- NZBarr was confirmed to refresh the license successfully
- Admin credentials are configured in live `config.php`
- The private Ed25519 `.pem` key is uploaded on the server outside the web root

## Important Implementation Details
- License responses are signed with Ed25519 when signing is enabled
- The desktop app expects the matching public key in `config/license-public-keys.json`
- The license server keeps the private key server-side only
- The admin panel uses HTTP basic auth and is intentionally simple

## Follow-Up Ideas
- Replace placeholder `mailto:` purchase links with real checkout URLs
- Add richer manuals content and possibly subpages for each guide
- Add a cleaner menu/header treatment across all website pages
- Optionally add a protected license search/filter UI in the admin panel later

## Practical Notes
- The site still uses relative/static HTML and CSS only
- If the hosted site appears stale, a hard refresh may be needed after upload
- The pages should not be indexed by normal search engines if the host honors robots directives and headers

---

# NZBarr Session Handoff
# Date: 2026-04-21

## Current Focus
Tomorrow’s main thread is tester troubleshooting for SABnzbd setup inside NZBarr. A tester can use the SAB++ Chrome extension successfully on the same machine, but NZBarr does not work for that tester yet. We paused because the tester went to sleep.

## Important SABnzbd Investigation Notes
- Tester runs SABnzbd and NZBarr on the same machine.
- If both apps are on the same machine, SABnzbd external access should not be required.
- Expected local host values are usually `127.0.0.1` or `localhost`.
- Tester reports SAB++ Chrome extension works.
- SAB++ working suggests SABnzbd is running and reachable locally, but does not prove NZBarr has identical settings.
- We discussed likely differences:
  - HTTP vs HTTPS mismatch
  - wrong port
  - wrong host value
  - SABnzbd API Key vs NZB Key confusion
  - URL base/base path mismatch
  - local firewall/security allowing Chrome but blocking NZBarr
  - copied whitespace or wrong key in NZBarr
- We tested locally with SABnzbd username/password enabled and disabled. Both worked here, so missing SAB username/password alone is probably not the issue.
- Tomorrow compare tester’s SAB++ settings exactly against NZBarr:
  - protocol
  - host
  - port
  - API key used
  - URL base/path
  - whether HTTPS is enabled in SABnzbd

## Relevant SABnzbd Code
- `src/downloaderClients/sabnzbdClient.js`
- `src/downloadDispatchService.js`
- `renderer/js/app.js`
- `main-process/main.js`

Known behavior in `sabnzbdClient.js`:
- Basic Auth is only added if both `sabnzbd_username` and `sabnzbd_password` are present.
- Send API key preference is `sabnzbd_nzb_key || sabnzbd_api_key || sabnzbd_full_api_key`.
- Full API key preference is `sabnzbd_full_api_key || sabnzbd_api_key`.
- API base path probing exists, but base path/default path behavior should be checked during tester debugging.

## Local Dev Native Module Fix
After cross-platform packaging, local `node_modules/better-sqlite3/build/Release/better_sqlite3.node` had become a Windows DLL. `bash start.sh` failed with:

`slice is not valid mach-o file`

Fixed by restoring the macOS ARM64 Electron prebuild:

```bash
cd /Users/hermansteijn/NZBarr-Desktop/node_modules/better-sqlite3
/usr/local/bin/node ../prebuild-install/bin.js --platform=darwin --arch=arm64 --target=33.4.11 --runtime=electron --verbose --force
```

After that, `npm run start` worked with the production database:
- releases: `67664`
- movies: `8730`
- tvShows: `3459`

If local dev breaks again after Windows/Linux builds, rerun the command above or add a helper script.

## Build / Packaging Status
- macOS Apple Silicon DMG build works.
- macOS Intel DMG build works.
- Windows x64 installer and portable builds work.
- Linux intentionally skipped for now.
- Clean website downloads are linked from `website/download.html`.
- Place build artifacts in `website/downloads/` with these exact names:
  - `NZBarr-0.1.0-arm64.dmg`
  - `NZBarr-0.1.0.dmg`
  - `NZBarr Setup 0.1.0.exe`
  - `NZBarr 0.1.0.exe`

## App Packaging Fixes Made Today
- `package.json` now includes `docs/database-schema.sql` in packaged builds.
- `src/database.js` now handles an empty first-run database and validates core schema tables before migrations.
- This fixed the DMG first-run issue where a clean install created an empty `nzbarr.db` and never showed the window.
- Rebuilt Apple Silicon DMG was tested from scratch:
  - Free Lounge opened
  - license activation worked against server

## Website / Payment Status
The website now has:
- platform download section
- PayPal hosted buttons for Yearly and Lifetime
- PayPal return page for manual license fulfillment
- contact page
- terms/disclaimer page

Important files:
- `website/download.html`
- `website/payment-complete.html`
- `website/contact.html`
- `website/terms.html`
- `website/assets/js/site.js`
- `website/styles.css`

PayPal hosted button IDs:
- Yearly `$14.99`: `82KM4734ZXAFJ`
- Lifetime `$89.99`: `GPTDXQGG9K6HE`

PayPal return URL should be:

```text
https://nzbarr.com/payment-complete.html
```

The return page currently uses manual fulfillment:
- buyer fills details
- page prepares an email to `license@nzbarr.com`
- buyer must send it from their mail app
- fallback button appears if the browser does not open mail automatically

## Email Addresses
Configured and used on the website:
- `info@nzbarr.com` for general questions and early access
- `license@nzbarr.com` for PayPal/payment/license delivery
- `support@nzbarr.com` for setup, app issues, and tester reports

Apple Mail setup was fixed by the user. Webmail receives license emails.

## Website Legal / Disclaimer
Added `website/terms.html` with practical disclaimer wording:
- use at own risk
- no warranty
- user responsibility
- third-party services
- backups/data responsibility
- limitation of liability
- license/payment notes
- changes

Footer links to `Terms` were added across public pages. Pricing section on `download.html` links to the disclaimer.

## Bugfix Backlog
Created `BUGFIX-BACKLOG.md`.

Open issue recorded:
- Reanalysis sample can miss audio/format metadata.
- Reproduced with a sample around `42.3 MB`.
- MediaInfo only returned General stream data.
- Resolution/video codec detected, but audio was `N/A` and format was `null`.
- User chose to park it for later.

## Tomorrow Suggested Start
1. Open `src/downloaderClients/sabnzbdClient.js`.
2. Ask tester for screenshots/values from SAB++ and SABnzbd Config > General.
3. Compare NZBarr fields exactly:
   - host

---

# NZBarr Session Handoff
# Date: 2026-04-23

## Current Focus
We spent today tightening the Smart Preparation pipeline so it can handle very large folders without hammering TMDB unnecessarily. The main theme was: if a release is already prepared correctly, NZBarr should trust the filename and skip the API call.

## What Changed Today
- Added a refresh cleanup setting so completed refresh downloads can be `delete`d or `move`d to a chosen folder.
- Fixed the quit prompt so completed refresh jobs are no longer treated as active.
- Added `[SWISHER]` to refreshed NZB filenames.
- Updated refreshed release metadata so `release_group` is set to `SWISHER`.
- Added a 30-second pause after every batch of 1000 prepared files.
- Added Dutch TV season support: `Seizoen` and `Aflevering`.
- Added a fast path in Smart Preparation so already-prepared files with a properly wrapped TMDB tag can skip TMDB lookups.
- Tightened the fast path so only wrapped TMDB tags count:
  - ` (tmdb-123) ` or `[tmdb-123]` can be normalized locally
  - bare `tmdb-123` does not qualify
- Changed Smart Preparation naming to use square brackets for IMDb and TMDB tags:
  - `[imdb-tt1234567]`
  - `[tmdb-123456]`

## Important Behavior Notes
- Smart Preparation still processes already-prepared files, but if the filename is already in canonical shape it now renames locally instead of making a TMDB call.
- If a file does not have a properly wrapped TMDB tag, Smart Preparation still falls back to the normal TMDB-backed path.
- Prepare + Import now scales much better on large folders because it no longer burns an API call for every already-correct NZB.

## Files Touched Today
- `src/importPreparationService.js`
- `src/filenameParser.js`
- `src/ngPostUploader.js`
- `src/contentUploadService.js`
- `src/autoRefreshScheduler.js`
- `src/repositories/settingsRepository.js`
- `src/database.js`
- `docs/database-schema.sql`
- `renderer/index.html`
- `renderer/js/app.js`

## Tomorrow Suggested Start
1. Test Smart Preparation on a mixed folder with already-prepared files and malformed TMDB tags.
2. Confirm the no-TMDB fast path is behaving exactly as intended on real data.
3. Keep an eye on the large-folder run and any UI beachballing during the pause points.
   - port
   - SSL
   - base path
   - API key vs NZB key
4. If still unclear, add better diagnostics to the SAB test button:
   - show attempted URL/protocol/port/base path
   - distinguish auth failure, 404 base path issue, non-JSON response, connection refused, TLS error
   - never expose full API keys in UI/logs

---

# NZBarr Session Handoff
# Date: 2026-04-22

## Current Focus
Today focused on making the NZB refresh workflow safer and more scalable before the user reimports a large library from scratch. The user started a refresh queue and decided not to restart NZBarr until tomorrow, because a running queue is active now.

## Important Runtime Note
- The latest UI/preload changes require an Electron restart or full reload to appear.
- User intentionally did not restart tonight because a refresh queue is running.
- Tomorrow, after restart, check `Settings -> NZB Auto Refresh -> Refresh Queue`.
- Queued refreshes are persisted in the DB as `refresh_status = 'queued'`, so waiting items should survive restart.

## NZB Storage Changes
- Stored NZB files now include the NZB GUID in the saved filename to avoid collisions.
- Stored NZBs are gzip-compressed as `.nzb.gz`.
- User-facing downloads should be decompressed and saved as plain `.nzb`.
- GUID is placed at the beginning of the stored filename.
- NZB folder sharding uses the first letter/character of the GUID.
- This applies across drag/drop import, Smart Preparation import, and refresh-generated NZBs.

Important files:
- `src/nzbFileUtils.js`
- `src/nzbParser.js`
- `src/nzbImportService.js`
- `src/ngPostUploader.js`
- `src/contentUploadService.js`
- `main-process/main.js`
- downloader clients
- `renderer/js/app.js`

## Refresh Queue
Implemented a manual refresh queue separate from the scheduler.

Behavior:
- `Refresh Release` still attempts an immediate refresh.
- `Queue Refresh` marks a release with `refresh_status = 'queued'`.
- A queue worker processes queued releases one at a time.
- If another refresh is active, the queue waits instead of starting another SABnzbd job.
- When a queued item starts, it becomes `refresh_status = 'running'`.
- Success sets `refresh_status = 'refreshed'`.
- Failures set `failed` or delete the release/NZB when the terminal SABnzbd cleanup path applies.

UI added:
- Release detail: `Queue Refresh`
- Browse batch bar: `Queue Refresh`
- Movie/TV release tables: `Queue Refresh`
- Settings -> NZB Auto Refresh: `Refresh Queue` panel showing active job and queued items

Important files:
- `src/autoRefreshScheduler.js`
- `main-process/main.js`
- `main-process/preload.js`
- `renderer/index.html`
- `renderer/js/app.js`
- `renderer/css/style.css`

Verification:
- `node --check src/autoRefreshScheduler.js`
- `node --check main-process/main.js`
- `node --check main-process/preload.js`
- `node --check renderer/js/app.js`

## Refresh Concurrency
Manual refresh now has a global single-flight guard:
- If one refresh is already running, another immediate refresh is refused with a clear message:
  `Refresh is already running for <title>. Please wait until this refresh is finished before starting another one.`
- The queue uses this model to avoid SABnzbd connection pressure.

## Refresh Cleanup Before Reupload
Refresh originally re-uploaded the entire completed SABnzbd folder. User wanted the new NZB to contain only the main video, while being careful not to delete the main video.

Implemented conservative pruning:
- Detect main media file as the largest video file.
- Run MediaInfo on that file.
- Before re-upload, delete side files from the completed refresh folder.
- Removes things like `.jpg`, `.txt`, `.nfo`, small samples, etc.
- Keeps the main video.
- Skips pruning if the folder appears risky, such as multiple large video files that may be multi-episode or disc-style content.

Important code:
- `findMainMediaFile`
- `pruneRefreshDownloadToMainMediaFile`
- `removeEmptyDirectories`
- all in `src/autoRefreshScheduler.js`

## SABnzbd Password/Encrypted Handling
Refresh polling now detects SABnzbd queue jobs that become paused/stopped due to encrypted/password-protected content without an available password.

Behavior:
- NZBarr attempts to delete/cancel the terminal SABnzbd job.
- Refresh fails with a terminal error.
- NZBarr deletes the release row and stored NZB from disk via release repository cleanup.

Important files:
- `src/downloaderClients/sabnzbdClient.js`
- `src/autoRefreshScheduler.js`

## TMDB Movie/TV ID Disambiguation
Fixed cases where a TMDB numeric ID could match both movie and TV records.

Changes:
- Movie queries require `r.media_type = 'movie'`.
- TV queries require `r.media_type = 'tv'`.
- Collection joins are movie-only.
- `getByMovieId(tmdbId, imdbId, mediaType)` supports media type filtering.

Important files:
- `src/repositories/releaseRepository.js`
- `src/repositories/collectionRepository.js`
- `main-process/main.js`
- `main-process/preload.js`
- `renderer/js/app.js`

## Smart Preparation Filename Preservation
Fixed a parser issue where title words like `No` were incorrectly removed as language codes, causing examples like `Dr. No` to become `Dr.`.

Behavior now:
- Title stays complete.
- Unknown/descriptive trailing tokens are preserved in canonical filename metadata instead of vanishing.
- Example target:
  `Dr. No (1962) [720P-BluRay-x264] [Theatrical-Cut-Qmax] (imdb-tt12345678) (tmdb-1342456).nzb`

Important files:
- `src/filenameParser.js`
- `src/importPreparationService.js`

## User Testing Status Tonight
User reported:
- Drag/drop import worked as expected.
- Manual refresh worked as expected.
- Smart Preparation looked good after the latest preservation fix.
- A refresh queue is currently running overnight.
- User will restart tomorrow to see the new Refresh Queue panel.

## Practical Tomorrow Checklist
1. Ask whether the overnight refresh queue finished cleanly.
2. Have user restart NZBarr.
3. Open `Settings -> NZB Auto Refresh -> Refresh Queue` and confirm the queue panel appears.
4. Confirm queued/running/refreshed statuses are displayed correctly.
5. Check whether folder pruning during refresh kept only the main video for a normal single-video release.
6. Watch for risky packs: multi-episode releases should skip pruning if multiple large videos are present.
7. If queue visibility is useful, consider adding:
   - cancel queued item
   - clear queue
   - move item up/down
   - queue status badge in release rows

## Known Caveats
- Local runtime smoke tests that require `better-sqlite3` may fail outside Electron if the native module was built for another Node/Electron target.
- Syntax checks passed, but the newest Refresh Queue panel still needs real UI verification after restart.
- No full automated integration test was run for the overnight queue.
