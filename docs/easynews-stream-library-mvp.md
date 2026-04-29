# Easynews Stream Library MVP

NZBarr can support an Infuse-style stream library as a local metadata layer over direct Easynews media URLs. This feature is not a downloader: it stores stream URLs, parsed filenames, artwork links, metadata, and watch state only.

## Project Structure

- `src/streamFilenameParser.js` parses direct media URL filenames into movie/TV metadata.
- `src/repositories/streamLibraryRepository.js` owns SQLite reads/writes for imported streams.
- `src/streamLibraryService.js` validates imports, masks credential-bearing URLs, optionally matches TMDb metadata, and handles playback.
- `main-process/main.js` exposes secure IPC handlers for import, library reads, updates, and playback.
- `main-process/preload.js` exposes a minimal renderer API.
- `renderer/index.html`, `renderer/js/app.js`, and `renderer/css/style.css` provide the MVP UI.

## MVP Plan

1. Create SQLite tables for stream items and cached TMDb metadata.
2. Import one or more pasted URLs, plus text files containing URLs.
3. Parse filenames for title, type, year, season, episode, resolution, source, codec, and release group.
4. Use TMDb automatically when an API key is configured; otherwise keep parsed metadata.
5. Render Movies, TV, Episodes, Recently Added, Favorites, Watched/Unwatched, and search.
6. Open streams directly in the browser or configured external player without downloading media.
7. Mask credential-bearing URLs in UI and error messages.
8. Add manual metadata correction and optional `.strm` export after the core import/library flow is stable.
