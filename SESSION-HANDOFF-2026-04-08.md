# NZBarr Desktop - Session Handoff
# Date: 2026-04-08

## PROJECT
`/Users/hermansteijn/NZBarr-Desktop` - Electron desktop app for Usenet media library management.
Database: `~/Library/Application Support/nzbarr-desktop/nzbarr.db`
Image cache: `~/NZBarr-Desktop/data/cache/` (dev) / `~/Library/Application Support/nzbarr-desktop/cache/` (production)

---

## WHAT WAS FIXED TODAY

### 1. Upload Flow - All Fields Now Populated
**Problem:** When uploading movies/TV, many release fields were empty (imdb_id, tmdb_id, cover_image, backdrop_path, logo_path, video_codec, audio_codec, source, format).

**Fixes:**
- **`main-process/upload-handler.js`** - Post-import TMDB lookup now builds a complete lookup object with all available identifiers (media_type, tmdb_id, imdb_id, clean_name, nzb_guid). Now updates backdrop_path and logo_path alongside cover_image.
- **`src/repositories/releaseRepository.js`** - Added `backdrop_path` and `logo_path` to `create()` INSERT statement and `update()` allowedFields. Added `category_id` to allowedFields.
- **`src/tmdbService.js`** - `findAndDownloadCover()` now returns `imdbId` from TMDB's `external_ids` endpoint.
- **`src/nzbImportService.js`** - Now uses TMDB-resolved IMDB ID to update both the release AND movie_info/tv_info records. Also now passes `backdrop_path` and `logo_path` during release creation.
- **`src/filenameParser.js`** - Fixed multi-bracket parsing. TV filenames like `Blue Bloods [S01E02] (2010) [1080p-...]` now extract resolution/codecs from the CORRECT bracket (the one containing metadata, not the SxxEyy bracket).

### 2. IMDB ID Auto-Resolution
**Problem:** When a filename didn't contain an IMDB ID, the `imdb_id` field stayed empty — breaking the release ↔ movie_info link.

**Fix:** When TMDB resolves a movie/TV by TMDB ID, the IMDB ID from `external_ids` is now:
1. Updated on the release record
2. Stored in movie_info / tv_info
3. `getRecentlyAdded()` enrichment now falls back to tmdb_id lookup if imdb_id is missing

**Backfill:** Ran `backfill-imdb-ids.js` and `backfill-tv-imdb-ids.js` to populate existing records. All movie and TV releases now have IMDB IDs.

### 3. Image Cache Location - Moved Inside App
**Problem:** Images were saved to `~/Downloads/NZBarr/cache/` — outside the app directory. Need images inside app for distribution with demo content.

**Fix:** Changed cache path to `<app_data>/cache/`:
- **Dev:** `NZBarr-Desktop/data/cache/`
- **Production:** `~/Library/Application Support/nzbarr-desktop/cache/`
- All existing images moved and DB paths updated
- `nzbImportService.getBaseDataPath()` now checks if `data/` dir exists first (works regardless of NODE_ENV)
- `upload-handler.js` `getCacheDir()` same pattern

### 4. Full-Width Slider and Carousels
- `.app-content` — removed all padding
- `#page-categories` — no side padding (for full-width slider)
- Other pages (browse, library, settings, uploads, downloads) — have their own 24px padding
- Hero slider and `.home-sections` use viewport-relative centering (`width: 100vw; margin-left: calc(-50vw + 50%)`)
- Slider uses original fade transition (slide attempts failed due to Electron renderer caching)

### 5. App Window Size at Startup
Window now opens at 50% screen width × 95% screen height (based on `screen.getPrimaryDisplay().workAreaSize`)

### 6. Drag & Drop NZB Import
Users can drop NZB files anywhere on the app window:
- **`preload.js`** — catches `drop` events (where `File.path` is accessible)
- **`renderer/js/app.js`** — reads dropped NZB content via `FileReader.readAsText()`, sends to main
- **`main-process/main.js`** — writes to temp file, runs full `nzbImportService.importNZB()`, cleans up
- **macOS dock drop** — handled via `app.on('open-file')`
- Temp file uses original filename (cleaned), so parser gets correct `search_name`

### 7. Empty State Visibility
Home page empty state (📦 "Your library is empty") now hides when there IS content.

### 8. Logo Language Preference
TMDB logo selection now prefers English (`en`/`en-US`), then no-language (`null`), rejects non-English logos.

### 9. Edit Release Modal
Added edit form accessible from release detail modal (✏️ Edit Release button):
- Editable fields: IMDB ID, TMDB ID, media type, category ID, season, episode, resolution, video codec, audio codec, audio channels, source, format, password
- "Fetch TMDB Data" button auto-fills IMDB ID from TMDB
- Saves to DB, refreshes detail view and home page

---

## CURRENT STATE

### Working:
- ✅ Movie upload (full pipeline: parse → TMDB → cover/backdrop/logo → movie_info)
- ✅ TV upload (same pipeline with tv_info)
- ✅ IMDB ID auto-resolved from TMDB for all releases
- ✅ Full-width hero slider and carousels on home page
- ✅ Drag & drop NZB import
- ✅ Edit release modal with all key fields
- ✅ Proper app window sizing (50% width, 95% height)
- ✅ Images saved inside app data/cache folder
- ✅ Empty state hidden when content exists
- ✅ English-only logo selection

### Not Yet Implemented (Known Gaps):
- ❌ Music upload system (deleted from codebase yesterday, needs re-implementation)
- ❌ Download manager (button exists but no engine)
- ❌ NNTP browsing (shows local releases only)
- ❌ Built-in video player
- ❌ Comments, thanks, follow, notifications features
- ❌ Category auto-assignment based on resolution (Movies HD/UHD/SD)
- ❌ Movie/TV detail page edit (can edit individual releases, but not the parent movie_info/tv_info records)
- ❌ Re-analyze button fully working (needs NNTP connection for MediaInfo)

### Edit Form Needs Perfecting:
- Can edit individual release fields
- Cannot edit parent movie_info/tv_info records yet
- No option to delete/re-download images from edit form
- No bulk edit (multiple releases at once)

---

## KEY ARCHITECTURE NOTES

### Image Path Resolution
- `nzbImportService.getBaseDataPath()` checks `fs.existsSync(__dirname/../data)` first → if exists, uses it (dev). Falls back to `app.getPath('userData')` (production).
- This avoids NODE_ENV dependency for path selection.

### Data Flow for Upload
```
Frontend (upload page) → upload:importNZB IPC → upload-handler.js → nzbImportService.importNZB()
  → parse NZB XML → parse filename → create release → TMDB lookup → download images → create movie_info/tv_info
```

### Data Flow for Drag & Drop
```
User drops NZB → preload.js catches drop → renderer reads file content → IPC to main → writes temp file → nzbImportService → same pipeline
```

---

## TOMORROW'S PRIORITIES (Suggested)
1. Fix edit form — need ability to edit movie_info/tv_info records too
2. Category auto-assignment (Movies HD/UHD/SD, TV HD/UHD/SD based on resolution)
3. Music upload system (re-implement from scratch)
4. Polish detail pages (ensure all data displays correctly)

## LESSONS
1. Electron caches renderer HARD — always `pkill -9 Electron` before restart
2. `File.path` is NOT available in renderer with contextIsolation — use FileReader or handle in preload/main
3. Keep design/UI changes simple and stable — complex CSS transitions in Electron's renderer are fragile
4. Always verify DB changes with `sqlite3` directly
