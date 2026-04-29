# NZBarr Desktop - Complete Project Handoff Document
# Date: 2026-04-07
# Project: NZBarr Desktop Electron App
# Source: /Users/hermansteijn/NZBarr-Desktop

---

## PROJECT OVERVIEW

"Like Infuse, but for NZB files" - Browse Usenet, import NZBs, download on-demand, play content.

This is an **Electron desktop app** that wraps a single-page HTML/CSS/JS frontend with an IPC bridge to Node.js backend services. It uses **better-sqlite3** for local database storage.

**Reference project:** NZBarr 2.0 web version at `/Users/Shared/NZBarr2.0/` — this is the source of truth for how everything should work. The desktop app should match its behavior exactly.

---

## DIRECTORY STRUCTURE

```
/Users/hermansteijn/NZBarr-Desktop/
├── main-process/
│   ├── main.js              # Electron entry point - IPC handlers, window creation
│   ├── preload.js           # contextBridge for renderer <-> main process
│   └── upload-handler.js    # Upload page IPC handlers (search, import)
├── renderer/
│   ├── index.html           # SPA - all pages inline
│   ├── css/style.css        # All styles (~2100 lines)
│   └── js/app.js            # Frontend app logic (~1500 lines)
├── src/
│   ├── index.js             # Data access aggregator
│   ├── database.js          # better-sqlite3 singleton
│   ├── nzbParser.js         # NZB XML parser
│   ├── nzbImportService.js  # Full import pipeline
│   ├── contentAnalyzer.js   # NFO extraction, MediaInfo
│   ├── tmdbService.js       # TMDB API client
│   ├── musicMetadataService.js  # MusicBrainz/TheAudioDB client
│   ├── filenameParser.js    # NZB filename parser
│   ├── nntpClient.js        # NNTP client (not fully working)
│   └── repositories/
│       ├── releaseRepository.js
│       ├── movieInfoRepository.js
│       ├── tvInfoRepository.js
│       ├── musicInfoRepository.js
│       ├── settingsRepository.js
│       └── downloadRepository.js
├── docs/database-schema.sql
├── package.json
├── launch.sh
└── start.sh
```

---

## DATABASE

SQLite at `~/Library/Application Support/nzbarr-desktop/nzbarr.db`

### Core Tables

**releases** - id, search_name, clean_name, imdb_id, tmdb_id, media_id, media_type, cover_image, category_id, nzb_guid, nzb_file_path, size, add_date, post_date, season, episode, parts, grabs, resolution, video_codec, audio_codec, audio_channels, source, subtitles, language, format, password, nfo_text, mediainfo_raw, release_group, status, local_file_path, backdrop_path, logo_path

**movie_info** - id, imdb_id, tmdb_id, title, plot, release_date, rating, genres, actors, director, youtube_trailer, cover_path, backdrop_path, logo_path

**tv_info** - id, tmdb_id, imdb_id, title, plot, first_air_date, rating, genres, actors, status, youtube_trailer, cover_path, backdrop_path, logo_path

**music_info** - id, musicbrainz_id, artist, album_title, release_date, genre, track_list, cover_path, artist_logo_path, has_cover

**categories** - Hierarchical (parent_id). Movies(1) → HD(1010), SD(1020), 4K(1030). TV(2) → HD(2010), etc. Music(3), Games(4), Books(5)

**settings** - Key-value store

**downloads** - Download queue

---

## WHAT WORKS

### Homepage (Categories Page)
- Hero slider with backdrop, poster, logo, plot, rating, year (movies only)
- Movies carousel with hover popout cards (backdrop, logo, plot)
- TV and Music carousel sections (structure exists, need data)
- Release grids per type with tabs (Movies/TV/Music)
- Trust signals bar (total counts)
- Empty state when no content

### Browse Page
- Full releases list with search, sort (date, name, size, category), and category filter
- Release names show `search_name` (full NZB filename)

### Library Page
- Grid of unique movies grouped by IMDB/TMDB ID
- Cover images, resolution badges
- Delete functionality

### Detail Pages
- Movie/TV detail page with backdrop, cover, logo, plot, rating, genres
- Releases table listing all releases for that title
- TV shows show Season/Episode column
- Click release row → release detail modal
- Release detail modal with specs grid, NFO viewer, MediaInfo viewer, analysis log

### Upload Page (NEW - partially working)
- Media type selector (Movie, TV, Music, Other)
- TMDB search for movies/TV
- MusicBrainz search for music (with cover images in results)
- Manual entry form (title, year, IMDb ID, TMDB ID, season/episode)
- NZB file picker via dialog
- Submit uploads NZB and imports

### NZB Import Pipeline
- Parse NZB XML → extract filename metadata
- Sharded local storage (guid-based)
- Release DB record creation
- Cover download from TMDB
- Movie info creation in movie_info table
- Music metadata fetch via TheAudioDB/MusicBrainz (NEW, needs testing)
- TV info creation in tv_info (works when TV released via upload)

### Settings Page
- NNTP server config, API keys, download path, player selection
- Save/load to database

### Navigation
- Home, Browse, Library, Upload, Downloads, Settings tabs

### Delete Refresh
- After deleting from release detail, current page refreshes

### Filename Parser
- Detects [SxxEyy], [Sxx], Season X, TV patterns
- Detects music patterns (Artist - Album, mp3, flac keywords)
- Extracts IMDB IDs (ttXXXXXXX) and TMDB IDs (tmdb-XXXXX)

---

## CRITICAL KNOWN ISSUES / BUGS

### 1. MUSIC UPLOAD BROKEN
Music releases upload successfully but:
- Cover image NOT downloaded/saved
- music_info record NOT created (or not linked)
- media_id NOT set on release
- No cover shows in carousel
- No cover/logo on detail page
- The upload-handler.js downloads cover via HTTPS from Cover Art Archive — works for download but the music_info linkage may fail
- **Needs debugging with actual upload console output**

### 2. TV UPLOAD - UNTESTED
- upload-handler.js has no TV-specific handling (no tv_info creation)
- Only basic fields updated on release (media_type, tmdb_id)
- Need to add tv_info creation similar to music_info flow

### 3. MOVIE UPLOAD - PARTIAL
- Creates movie_info when TMDB ID provided
- Downloads cover from TMDB
- Does NOT download backdrop or logo from TMDB images endpoint

### 4. NO DOWNLOAD MANAGER
- Download button in release modal has no event listener
- downloadRepository exists but no engine
- This is the highest priority missing feature

### 5. BROWSE PAGE - No NNTP Integration
- Shows local releases only
- No actual Usenet search/XOVER commands
- No remote NNTP results

### 6. DOWNLOADS PAGE
- Static "No active downloads" placeholder
- No IPC handler, no download engine

### 7. VIDEO PLAYER
- HTML video element exists
- No logic to load/play files
- External player spawn not implemented

### 8. NNTP Client
- Single-connection, no connection pooling
- Basic article fetching
- No download orchestration

### 9. Search (Home Page Search Bar)
- Library search works (client-side filter)
- No TMDB search from UI

### 10. No Comments, Thanks, Follow, Notifications
- All exist in web version, not implemented here

### 11. No Forum, Reports, Admin Panel
- Not needed for desktop (single user)

---

## ARCHITECTURE PATTERNS

### IPC Flow
```
Renderer (js/app.js) → window.electron.function() → preload.js → ipcRenderer.invoke() → main.js → dataAccess.repository.method()
```

### Data Enrichment (getRecentlyAdded)
The `releaseRepository.getRecentlyAdded()` method enriches releases with movie_info/tv_info/music_info data for backdrops, logos, plots. This is critical for the homepage.

### Cover Storage
- Movies: `~/Downloads/NZBarr/cache/covers/movies/{imdb_id}-cover.jpg`
- TV: `~/Downloads/NZBarr/cache/covers/tv/{tmdb_id}-cover.jpg`
- Music: `~/Downloads/NZBarr/cache/covers/music/{musicbrainz_id}-cover.jpg`
- Backdrops: `~/Downloads/NZBarr/cache/backdrops/movies/{imdb_id}-backdrop.jpg`
- Logos: `~/Downloads/NZBarr/cache/logos/movies/{imdb_id}-logo.jpg`

### Image URLs
Covers/backdrops/logos stored as **absolute file paths** in DB, served directly via `<img src="file:///path...">`.

### Release Display Names
All release listings show `search_name` (full NZB filename), not `clean_name`.

---

## KEY FILES AND WHAT THEY DO

### main-process/main.js
- Electron app lifecycle
- Window creation (1400x900, hidden title bar, devTools auto-open)
- IPC handlers for: releases, movie_info, tv_info, music_info, settings, NZB import, TMDB
- Upload handlers delegated to upload-handler.js

### main-process/upload-handler.js
- `upload:selectNZBFile` - file picker dialog
- `upload:searchTMDB` - TMDB search
- `upload:searchMusicBrainz` - MusicBrainz search with Cover Art Archive URLs
- `upload:importNZB` - Full import: calls nzbImportService, creates info records, saves covers

### renderer/js/app.js (~1500 lines)
NZBarrApp class with:
- Navigation, page switching
- Home carousel loading and rendering
- Hero slider with auto-advance
- Media rows with popout cards
- Release grids
- Upload page (search, manual entry, submit)
- Browse page (search, sort, filter)
- Library grid
- Movie/TV detail page
- Release detail modal
- Settings form
- NZB import
- Notifications

### src/nzbImportService.js
1. Parse NZB XML
2. Extract filename metadata
3. Check for duplicates (SHA-256 hash)
4. Save NZB to sharded storage
5. Create release DB record
6. Quick analysis (NFO extraction)
7. Fetch cover from TMDB
8. Create movie_info record (if movie)
9. Fetch music metadata if music type (fallback)

### src/tmdbService.js
- Movie/TV search via TMDB API
- Cover/backdrop/logo download
- IMDb-to-TMDB lookup
- Image caching

### src/musicMetadataService.js
- TheAudioDB search for album metadata
- MusicBrainz search
- Cover, artist logo, cutout download
- Tracklist fetching

### src/repositories/musicInfoRepository.js
- createOrUpdate - checks existing by musicbrainz_id, then INSERT or UPDATE
- getByArtistAndAlbum - for linking releases
- getById, getAll

### src/filenameParser.js
- Parses NZB filenames for metadata
- Detects media type (movie/TV/music/other)
- Extracts IMDB ID, TMDB ID, season, episode, resolution, codecs

---

## DEPENDENCIES

**Installed:**
- better-sqlite3 (^12.8.0)
- xml2js (^0.6.2)
- electron (^33.4.11) [dev]
- electron-builder (^24.9.1) [dev]
- sharp (^0.34.5) [dev]

**Missing:**
- iconv-lite (used in contentAnalyzer.js for CP437 NFO decoding)

---

## COMMANDS

```bash
cd /Users/hermansteijn/NZBarr-Desktop
npm start          # Dev mode
./start.sh         # Same
npm run build      # Build macOS app
./launch.sh        # Launch built app
```

**IMPORTANT ENVIRONMENT ISSUE:**
`ELECTRON_RUN_AS_NODE=1` was set in the user's terminal environment, breaking Electron. Fixed by unsetting in launch.sh and npm start script.

---

## CURRENT DATA STATE

- 25+ movie releases with covers, backdrops, logos, movie_info records
- 3 TV releases (Going Dutch, Girl Taken, Blue Bloods) with covers
- Music releases exist but poorly linked (manual DB fix needed for Adele 25)
- 20 categories seeded
- 30 settings seeded

---

## WHAT THE NEXT AGENT NEEDS TO DO

### PRIORITY 1: Fix Music Upload
1. Test upload of "Adele - 25" with console logging
2. Verify cover downloads from Cover Art Archive
3. Verify music_info record created
4. Verify release.media_id linked
5. Verify cover shows in carousel and detail page
6. Fix whatever is broken in the pipeline

### PRIORITY 2: Fix TV Upload
1. Add tv_info creation to upload handler
2. Link release to tv_info via media_id
3. Verify TV shows appear in carousel with covers/backdrops/logos
4. Verify TV detail page shows releases grouped by season/episode

### PRIORITY 3: Download Manager
1. Design state machine (queued → downloading → complete/failed)
2. Use existing NNTP client for segment downloading
3. RAR/ZIP reassembly and extraction
4. IPC for progress, pause, resume, cancel
5. Wire up download button in release modal
6. Build Downloads page with real-time progress

### PRIORITY 4: Better Browse Page
1. Cover grid view mode (grouped by content)
2. Actor/genre filtering
3. Time filter (24h, 7d, 30d)

### PRIORITY 5: Licensing System
User wants a licensing system for app distribution. Details TBD.

---

## LESSONS LEARNED

1. **The user wants exact NZBarr 2.0 behavior** - Read the web version source code to understand patterns
2. **Cache is a major issue** - Electron caches renderer. Hard restart needed: `pkill -9 Electron && npm start`
3. **Debug via console.log AND terminal output** - Notifications were too fast (now 5s + console log)
4. **Check the actual database** - `sqlite3` directly to verify what was actually saved
5. **music_info table has no UNIQUE constraints** - ON CONFLICT clauses fail. Use manual check-then-insert/update
6. **Cover images from Cover Art Archive are HTTPS URLs**, not base64 data - need download handling
7. **The user gets very frustrated when things don't work repeatedly** - Always verify changes work before claiming they're done

---

## WEB VERSION REFERENCE

The NZBarr 2.0 web version at `/Users/Shared/NZBarr2.0/` is the single source of truth for:
- Upload forms per media type (see `templates/upload_*.twig`)
- Metadata fetching (see `helpers/MetadataHelper.php`)
- Homepage structure (see `templates/home.twig`, `controllers/HomeController.php`)
- Browse page (see `controllers/BrowseController.php`)
- Detail pages (see `templates/details_*.twig`)
- All API endpoints (see `router.php`)

---

## USER NOTES

- User's OS: macOS (darwin), Apple Silicon (arm64)
- External tools needed: mediainfo, unrar (at /usr/local/bin/)
- Cover cache location: ~/Downloads/NZBarr/cache/
- Database: ~/Library/Application Support/nzbarr-desktop/nzbarr.db
- User has existing NZB files to test with
- User runs app via `launchctl` normally but that was removed due to auto-restart issues
