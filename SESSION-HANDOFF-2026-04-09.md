# NZBarr Desktop - Session Handoff
# Date: 2026-04-09

---

## TODAY'S ACCOMPLISHMENTS

### 1. Edit Movie/TV Info Modal (Complete)
- **File:** `renderer/index.html` — Added new edit modal with all fields (IMDB ID, TMDB ID, title, plot, tagline, release date, runtime, rating, genres, director, language, country, trailer, TV-specific fields)
- **File:** `renderer/js/app.js` — Methods: `openEditMovieInfo()`, `closeEditMovieInfo()`, `saveEditMovieInfo()`, `fetchTMDBForEditMovieInfo()`, `deleteFullMovieInfo()`
- **File:** `src/repositories/movieInfoRepository.js` — Added `update()` method with allowed field filtering
- **File:** `src/repositories/tvInfoRepository.js` — Added `update()` method with allowed field filtering
- **File:** `main-process/main.js` — IPC handlers: `movieInfo:update`, `tvInfo:update`, `movieInfo:deleteFull`, `tvInfo:deleteFull`
- **File:** `main-process/preload.js` — Bindings: `updateMovieInfo`, `updateTVInfo`, `deleteMovieInfoFull`, `deleteTVInfoFull`
- Full delete button in edit modal — deletes releases, NZB files, cached images, and movie/tv_info records
- Duplicate `searchTMDB` key removed from preload.js

### 2. TMDB Fetch Fix for Edit Modal
- **Bug:** "Fetch TMDB Data" button in edit modal returned "Could not fetch TMDB data"
- **Fix:** CacheDir path in IPC handlers was using `.replace('/nzbs', '/cache')` hack. Changed to `path.join(nzbImport.getBaseDataPath(), 'cache')` — same pattern used by `nzbImportService.initialize()`

### 3. Import Metadata Completeness
- **TV import** was saving fewer fields than the edit modal fetches. Now includes: `number_of_seasons`, `number_of_episodes`, `director` (crew), `language` (`original_language`), `country` (`production_countries`), `youtube_trailer` (prefers "Trailer" type)
- **TMDB search fallback** was using truncated search results instead of full details. Now fetches full `getMovieDetails`/`getTVDetails` after finding TMDB ID by search
- **S99 (Complete Series)** was being converted to 0 in `filenameParser.js`, merging with Specials. Now S99 stays as 99.

### 4. Category Auto-Assignment by Resolution
- **File:** `src/nzbImportService.js` — New `guessCategoryIdByResolution(mediaType, resolution)` method replaces `filenameParser.guessCategoryId()`
- Mapping:
  - Movie: 2160P→1030 (4K), 1080P/720P→1010 (HD), 480P→1020 (SD)
  - TV: 2160P→2030 (4K), 1080P/720P→2010 (HD), 480P→2020 (SD)
  - Music→3020 (FLAC), Books→5010 (Ebooks), Console→4010 (Games)

### 5. Releases Table — Category Column + Download Button
- Added Category column between Source and Audio
- ⬇️ Download NZB button next to 🗑️ delete button
- `releases:downloadNZB` IPC handler opens save dialog
- `releases:downloadNZBBatch` IPC handler opens folder picker once, copies all selected files

### 6. TV Detail Page — Season Tabs (Major Overhaul)
- **Tab order:** Season 1, 2, 3... → Complete Series (S99) → Specials (S00)
- **Default tab:** Season 1 on page load
- **Count shown on hover** as tooltip (e.g. "31 releases") — no inline count
- **Season packs** (episode=0 for numbered seasons) shown in separate "📦 Complete Season Pack" section
- **Episodes sorted** by episode number, then quality desc within same episode
- **Collapsible episode rows** — click episode header to expand/collapse
- **Batch select/download** — checkbox column, select all, download selected to single folder
- **Table columns:** ☑️ | Release Name | Quality | Video | Audio | Source | Category | Group | ⬇️🗑️
- Movies use same table layout (no season tabs, just flat sorted list)

### 7. Movie/TV Detail Page — Full-Width Layout
- Header moved higher (`margin-top: -600px`)
- Releases table full-width with 40px side margins matching home carousels
- Hero-style meta classes: `.hero-year`, `.hero-rating`, `.hero-genre` for year/rating/genres
- Darker backdrop gradient: `linear-gradient(0deg, rgba(0,0,0,1) 0%, rgb(0 0 0 / 90%) 25%, #00000000 100%)`

### 8. Browse Page — Category Pill Buttons + Pagination
- Replaced dropdown with clickable category pills: 📂 All, 🎬 Movies (HD/SD/4K), 📺 TV (HD/SD/4K), 🎵 Music, 🎮 Games, 📚 Books, 🔞 XXX
- Server-side filtering via `getReleases({ category })` instead of loading 1000+ releases client-side
- Pagination with ← Prev / 1 2 3 ... N / Next → controls
- 50 items per page default

### 9. Settings Page — 2-Column Accordion
- 2-column grid layout (NNTP + API Keys span full width)
- Collapsible accordion sections — click header to expand/collapse
- Only first section expanded by default, state saved to DB
- Added "UI Settings" section with "Items per page (Browse)" dropdown (20/50/100/200/500)
- Release section for Release Groups textarea

### 10. Edit Release Modal — Missing Fields
- Added Release Name (full-width input)
- Added Release Group, Subtitles, Language fields
- Category dropdown shows names instead of ID numbers
- Save now refreshes visible detail page immediately

### 11. Homepage Stats Fix
- `renderTrustSignals()` was defined but never called. Now called at end of `loadHomeCarousels()`.

### 12. Batch Download Fix
- Selecting multiple releases and clicking "Download Selected" now opens folder picker once, copies all NZB files with original names to chosen folder.

### 13. Delete "24" Series Bad Imports
- 31 malformed releases (tmdb-1973, year 1973) deleted from DB and NZB files removed from disk. User reimported 269 correct releases.

---

## CRITICAL CSS CHANGES

```css
/* .movie-details-content needs overflow: visible */
.movie-details-content { overflow: visible; }

/* Season tabs container needs visibility */
.season-tabs-container {
  display: block;
  visibility: visible;
  overflow: visible;
  z-index: 20;
  position: relative;
  margin: 0 40px 12px 40px;
}

/* Tab count on hover (CSS tooltip) */
.season-tabs .tab-btn::after {
  content: attr(title);
  position: absolute;
  bottom: calc(100% + 6px);
  /* ... tooltip styles */
}
```

**If tabs ever disappear again:** The `.season-tabs-container` must be inserted before `#releases-table` in the DOM, and `.movie-details-content` must have `overflow: visible`.

---

## FILE CHANGES SUMMARY

### Modified Files:
- `renderer/index.html` — Edit movie info modal, season tabs container, browse category pills, UI settings
- `renderer/js/app.js` — Major additions: season tabs, TV table, batch download, category pills, pagination, edit modal handlers, settings accordion
- `renderer/css/style.css` — Season tabs CSS, TV table CSS, batch bar CSS, category pills, pagination, settings accordion, browse page styles
- `main-process/main.js` — IPC: downloadNZB, downloadNZBBatch, movieInfo:update, tvInfo:update, movieInfo:deleteFull, tvInfo:deleteFull
- `main-process/preload.js` — Bindings for new IPC handlers, removed duplicate searchTMDB
- `src/nzbImportService.js` — `guessCategoryIdByResolution()`, `findCustomReleaseGroup()`
- `src/filenameParser.js` — S99 no longer converted to 0
- `src/tmdbService.js` — Search fallback now fetches full details
- `src/repositories/releaseRepository.js` — Added `search_name` to allowedFields
- `src/repositories/movieInfoRepository.js` — Added `update()`, `delete()`
- `src/repositories/tvInfoRepository.js` — Enhanced `update()` with field filtering, added `delete()`

### New script versions:
- `renderer/js/app.js?v=3` — bumped version number

---

## KNOWN ISSUES / UNFINISHED

### Release Group Detection (Custom Groups)
- Custom release groups in Settings → UI Settings work but only take effect after app restart
- `findCustomReleaseGroup()` fetches fresh settings from DB on each import but the `nzbImportService.initialize()` caches `this.settings` on first call
- **Fix needed:** Either reload settings before each import OR clear the cache when settings are saved

### Debug Logs Still in Code
- `[TV]`, `[TV-TABLE]`, `[DETAIL]` console.log statements in `renderTVSeasonTabs()` and `showDetailsPage()` — should be removed before distribution

---

## TOMORROW'S PRIORITIES

1. **Remove debug console.log statements** from `showDetailsPage()` and `renderTVSeasonTabs()`
2. **Fix custom release groups** — make them take effect without restart (reload settings in `nzbImportService` before import, or invalidate cache on save)
3. **Category auto-assignment for existing releases** — consider a migration script to recategorize old releases based on resolution
4. **Next features** (from original handoff):
   - Download manager (highest priority missing feature)
   - Music upload system (re-implement from scratch)
   - NNTP browsing
   - Built-in video player
   - Comments, thanks, follow, notifications

---

## LESSONS FROM TODAY

1. **`table.parentElement` was undefined in `renderTVSeasonTabs`** — `table` was a local variable in `renderReleasesTable` and not passed as a parameter to `renderTVSeasonTabs`. Always check scope!
2. **`const updateBatchBar` hoisting issue** — `const` declarations can't be accessed before initialization. The function was defined at the bottom but referenced in event listeners at the top. Move `updateBatchBar` to the top of `bindTVTableActions()`.
3. **`.movie-details-content` overflow: hidden** — was clipping the season tabs container. Changed to `overflow: visible`.
4. **CSS specificity wars** — `!important` on tab styles was needed to override general `td` overflow rules.
5. **WAL checkpoint** — Added `PRAGMA wal_checkpoint(TRUNCATE)` after updates to ensure subsequent reads see changes. May not be needed with better-sqlite3 (synchronous by default).
6. **User wants exact NZBarr 2.0 behavior** — Always reference `/Users/Shared/NZBarr2.0/templates/details_tv.twig` for layout patterns.
7. **Electron caches renderer HARD** — `pkill -9 Electron` before every restart. Also bump JS version (`app.js?v=3`) to bust cache.

---

## KEY COMMANDS

```bash
# Full restart
pkill -9 Electron && sleep 1 && cd /Users/hermansteijn/NZBarr-Desktop && bash start.sh

# Check DB
sqlite3 ~/Library/Application\ Support/nzbarr-desktop/nzbarr.db "SELECT COUNT(*) FROM releases;"

# Check logs
tail -50 /tmp/nzbarr.log

# Verify JS syntax
node -c renderer/js/app.js
node -c main-process/main.js
```
