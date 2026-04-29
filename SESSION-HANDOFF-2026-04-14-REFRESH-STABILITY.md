# NZBarr Desktop - Refresh Stability Handoff
# Date: 2026-04-14
# Status: Refresh pipeline working again after regression fix. One known follow-up remains: refreshed `post_date` timezone/display mismatch.

## WHAT HAPPENED TODAY

Work focused on the **manual/auto refresh pipeline**, especially the replace flow.

There were two real bugs in the refresh uploader:

1. **Wrong NZB path saved after refresh**
   - `ngPost` sometimes writes a plain `.nzb` even when the app expected `.nzb.gz`
   - the app stored the expected `.nzb.gz` path in `releases.nzb_file_path`
   - result: detail page showed no usable NZB, and download failed with “nzb file not on disk”

2. **Wrong poster + password metadata handling**
   - refreshed NZBs were still using the NNTP username as poster instead of the `Poster Name/Email` setting
   - refreshed NZBs could still contain `<meta type="password">...`
   - detail page could show blank password because the refreshed row was not updated correctly

Then a regression was discovered in the refresh scheduler:

3. **Packed releases failed with `No playable media file found`**
   - the scheduler was only checking for a direct `.mkv/.mp4` in the SAB folder
   - it was not using the archive-aware extraction path consistently
   - result: packed releases could fail refresh even though the working extraction logic still existed in `releaseRefreshService`

This regression has now been fixed.

## CURRENT WORKING STATE

After a **full app quit/start**, refresh is working again.

Confirmed by user on a new test:
- NZB header no longer contains password metadata
- `poster="someone@usenet.org"` is now correct
- refresh no longer shows the broken old poster/password behavior
- packed release refresh path appears restored

Example of good NZB top after restart:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nzb PUBLIC "-//newzBin//DTD NZB 1.1//EN" "http://www.newzbin.com/DTD/nzb/nzb-1.1.dtd">
<nzb xmlns="http://www.newzbin.com/DTD/2003/nzb">
  <head>
</head>

  <file poster="someone@usenet.org" date="1776196684" subject="[1/1] - &quot;dZoFuKVSz538Rl9hy.7z&quot; yEnc ...">
```

## CODE CHANGES MADE TODAY

### `src/ngPostUploader.js`

Fixed refresh upload output handling:
- added `resolveActualNZBPath()` to use the real file `ngPost` created
- sanitize the actual NZB file, not just the expected path
- in replace mode, save the actual NZB path back to `releases.nzb_file_path`
- persist `password` on the refreshed row
- use `settings.auto_refresh_poster` for `-f` instead of hardcoding `NZBarr Refresh <${user}>`

This file was syntax-checked with:

```bash
node --check src/ngPostUploader.js
```

### `src/autoRefreshScheduler.js`

Restored safe refresh behavior:
- `runMediaInfoOnDownload()` now collects all downloaded files recursively
- it now calls the archive-aware `releaseRefreshService.resolvePlayableMedia(...)`
- if no playable media can be resolved, refresh now fails instead of pretending to complete
- if re-upload fails, refresh now fails instead of being marked complete

This file was syntax-checked with:

```bash
node --check src/autoRefreshScheduler.js
```

## IMPORTANT DISCOVERY: THIS WAS NOT PHP

User suspected old `analyze_releases.php` behavior because the terminal output looked similar.

Verified:
- there are **no PHP files** in this app repo currently
- refresh/analyze still goes through:
  - `src/autoRefreshScheduler.js`
  - `src/releaseRefreshService.js`
  - `src/contentAnalyzer.js`

So the issue was **not** a fallback to PHP.

## ONE KNOWN FOLLOW-UP BUG

### Refreshed “posted ago” time can be wrong by about 2 hours

Example:
- NZB `<file date="1776196684">` converts to `2026-04-14 21:58:04 CEST`
- app UI showed it as about `2 hours ago`

Root cause:
- replace refresh currently writes:
  - `post_date = CURRENT_TIMESTAMP`
- SQLite `CURRENT_TIMESTAMP` is UTC
- renderer parses that DB string with `new Date(dateStr)`
- because the stored string has no timezone marker, it gets interpreted as local time
- result: refreshed post time appears older than it really is

Current evidence:
- DB row for refreshed Diamonds had `post_date` inconsistent with the new NZB timestamp
- renderer list uses:
  - `formatRelativeTime(r.post_date || r.add_date)` in `renderer/js/app.js`

### Recommended fix tomorrow

Best fix:
- after `ngPost` finishes, parse the generated NZB’s first `<file date="...">`
- convert that Unix timestamp to a real ISO datetime with timezone
- store **that actual post date** in `releases.post_date`

Do **not** rely on `CURRENT_TIMESTAMP` for refreshed `post_date`.

## CURRENT USER PRIORITY / RISK LEVEL

This refresh pipeline is considered **critical**.

User explicitly said:
- if refresh breaks again, restore it to the last known-good state immediately
- stability matters more than new changes in this area

So for future refresh work:
- be surgical
- avoid broad refactors
- if a test fails, restore working behavior first

## IF RESUMING TOMORROW

1. Read this handoff first
2. Do **not** change refresh flow broadly
3. Focus only on the `post_date` mismatch
4. Prefer fixing `src/ngPostUploader.js` replace-mode `post_date` persistence
5. Re-test with one refreshed release after a full app restart

## RELEVANT FILES

- `src/ngPostUploader.js`
- `src/autoRefreshScheduler.js`
- `src/releaseRefreshService.js`
- `renderer/js/app.js`

## FINAL NOTE

The last user test indicates the refresh output itself is back in good shape. The remaining issue is not the upload/archive pipeline anymore; it is the DB/UI timestamp handling for refreshed releases. But it has to do with timezone. app is timezone europe, usenet timezone differs 2 hours. So that is solved.
