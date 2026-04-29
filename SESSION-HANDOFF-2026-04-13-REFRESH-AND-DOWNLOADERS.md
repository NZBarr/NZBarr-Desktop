# NZBarr Desktop - Auto Refresh Complete Handoff
# Date: 2026-04-13
# Status: Core pipeline working. Next: Replace mode + polish

## WHAT WORKS NOW

The full automated NZB refresh pipeline is **functional** end-to-end:

1. **Settings UI** — All configuration fields in place:
   - Upload NNTP Server (separate from download NNTP, e.g., `post.eweka.nl` vs `news.eweka.nl`)
   - Upload performance settings (article size, retry count, thread count)
   - Refresh Category Setup (SABnzbd category + completed folder path)
   - Auto Refresh settings (enable, age threshold, interval, mode, newsgroup, poster, notify)

2. **Download Pipeline** — SABnzbd-based:
   - NZB sent to SABnzbd with custom `nzbarr-refresh` category
   - API polling for completion (uses full API key)
   - Resolves remote SABnzbd path to local network mount
   - mediainfo extraction on downloaded files

3. **Upload Pipeline** — ngPost CLI delegation:
   - Delegates to ngPost (`/Applications/ngPost.app/Contents/MacOS/ngPost`)
   - ngPost handles yEnc encoding, article posting, NZB generation
   - Generated NZB has proper `@ngPost` message IDs (downloadable by any client)
   - NZB renamed to match original filename before import

4. **Database Import** — Imported as new release:
   - ngPost creates new NZB with new message IDs → different `nzb_hash` → no duplicate
   - NZB renamed to original filename for proper parsing
   - After import, release metadata updated to match original (name, media_type, category_id, tmdb_id, imdb_id, season, episode, codecs, etc.)
   - **Keep both mode works** — new release appears alongside original

5. **Background Scheduler** — Auto-refresh on schedule:
   - Checks for NZBs older than configured threshold (default: 1 year for testing)
   - Prevents duplicate refreshes within 30 days
   - Runs on configurable interval (daily/weekly/monthly)
   - Progress events sent to renderer

## KEY ARCHITECTURAL DECISIONS

### ngPost instead of custom NNTP posting
After multiple failed attempts to build a working yEnc encoder + NNTP poster:
- Custom yEnc encoding corrupted bytes on the wire (UTF-8 vs latin1 socket encoding issues)
- Custom Message-IDs (`@news.nzbarr.local`) were not downloadable by clients
- ngPost is proven, reliable, handles all edge cases

**Files:** `src/ngPostUploader.js`, `src/autoRefreshScheduler.js`

### Category-based folder routing
Like Sonarr/Radarr: SABnzbd routes refresh jobs to a specific category (`nzbarr-refresh`) which maps to a dedicated folder. NZBarr polls that folder for completion.

**User must configure in SABnzbd:** Settings → Categories → Add `nzbarr-refresh` → folder: `complete/nzbarr-refresh`

### Replace mode vs Keep both mode
- **Keep both** (current default for testing): Imported as new release with same name and metadata as original
- **Replace**: Just swaps the NZB file on the existing release. Simpler — no import needed.

## FILES ADDED TODAY

| File | Purpose |
|------|---------|
| `src/autoRefreshScheduler.js` | Background scheduler + full refresh pipeline orchestration |
| `src/ngPostUploader.js` | ngPost CLI wrapper — posts files and imports NZB into DB |
| `src/yencEncoder.js` | yEnc encoder (memory-efficient, streaming) — kept for reference |
| `src/nzbGenerator.js` | NZB XML generator — kept for reference |
| `src/contentUploadService.js` | Custom upload service — **replaced by ngPostUploader** |

## FILES MODIFIED TODAY

| File | What changed |
|------|-------------|
| `main-process/main.js` | Added auto-refresh scheduler init, IPC handlers, global mainWindow |
| `main-process/preload.js` | Exposed auto-refresh API methods |
| `renderer/index.html` | Added Upload NNTP section, Refresh Category Setup section, new form fields |
| `renderer/js/app.js` | saveSettings/loadSettings for all new fields, refresh button now uses new pipeline |
| `src/database.js` | Added default settings for upload NNTP, refresh category, auto refresh |
| `docs/database-schema.sql` | Same defaults in SQL schema |
| `src/downloaderClients/sabnzbdClient.js` | Added `getJobStatus()`, `getHistory()`, `getCompletedDownloadPath()`, NZO ID extraction |
| `src/nntpClient.js` | Added `postArticle()`, `postFileInParts()`, retry logic, parallel posting (not used — ngPost took over) |
| `start.sh` | Changed to foreground mode for visible logs |

## WHAT TO DO TOMORROW

### Priority 1: Replace mode testing
Currently tested with "keep both" mode. Need to test and implement **replace mode**:
- In `autoRefreshScheduler.js` line ~216, the replace block updates `nzb_file_path` and `post_date`
- Need to verify: original NZB backed up, new NZB replaces it, release still shows correctly in UI
- The ngPostUploader currently always imports as new release — for replace mode, **skip the import step** and just update the existing release

### Priority 2: Settings validation
- Warn if SABnzbd completed path is not accessible
- Warn if Upload NNTP credentials missing but auto-refresh enabled
- Test SABnzbd connection before starting scheduler

### Priority 3: Progress UI
- Release detail modal shows basic progress but could be better
- Add a dedicated auto-refresh status panel or notification system
- Handle the "beachball" issue — large uploads cause UI lag

### Priority 4: Error handling
- What happens if ngPost fails mid-upload?
- What happens if SABnzbd download fails?
- Retry failed refresh jobs?

### Priority 5: Settings polish
- "Same credentials as Download NNTP" checkbox should grey out upload fields (UI exists, may need CSS)
- Help text for SABnzbd category setup is inline — could be cleaner

## IMPORTANT PATHS / CONFIG

- SABnzbd: `192.168.178.172:8080/sabnzbd`, base path `/sabnzbd`, needs full API key
- Download NNTP: `news.eweka.nl:563` (SSL)
- Upload NNTP: `post.eweka.nl:563` (SSL), same credentials as download
- ngPost: `/Applications/ngPost.app/Contents/MacOS/ngPost`
- SABnzbd completed mount: `/Volumes/MYBOOK/MEDIA-MyBook/temp` (NOT `/Volumes/MEDIA-MyBook/temp`)
- Refresh category: `nzbarr-refresh`
- Article size: 716800 bytes (ngPost default)
- Retry count: 10
- Threads: 8

## KNOWN ISSUES / GOTCHAS

1. **Dual mount paths**: `/Volumes/MYBOOK/` vs `/Volumes/MEDIA-MyBook/` — SABnzbd reports files under `MYBOOK`, NZBarr must look there too
2. **File path vs folder**: SABnzbd returns full file path including filename, not just the folder — `path.dirname()` needed to extract folder
3. **No message ID in 240 response**: Eweka's NNTP server just returns "240 Article Posted" — no message ID. This is why we needed ngPost (it generates proper IDs)
4. **Custom NNTP pipeline dead**: `src/nntpClient.js` has posting methods but they are not used. The yEnc encoding via socket had byte corruption issues. Don't try to fix — ngPost works
5. **Database runs on initialize**: `nzbImportService.initialize()` must be called before `importNZB()`
6. **Start.sh is now foreground**: All logs visible in terminal. Use `bash start.sh` to run

## IPC CHANNELS

| Channel | Purpose |
|---------|---------|
| `autoRefresh:getStatus` | Get scheduler status + active jobs |
| `autoRefresh:start` | Start scheduler |
| `autoRefresh:stop` | Stop scheduler |
| `autoRefresh:triggerManual` | Manual refresh for a specific release ID |
| `autoRefresh:getActiveJobs` | Get all active refresh jobs |
| `auto-refresh-progress` | Progress events (main → renderer) |

## SESSION NOTES

- User has a working ngPost CLI installation
- User tested with multiple releases — all successful after ngPost integration
- Replace mode is NOT yet fully tested (only keep_both works)
- User was frustrated with multiple iterations — ngPost was the breakthrough
- Tomorrow should focus on replace mode, then polish
