# NZBarr Desktop - Preparation Pipeline + Security Handoff
# Date: 2026-04-16
# Status: Native in-app preparation/import pipeline is now working at a very strong level for both movies and TV. Security planning is documented and ready for implementation next session.

## WHAT HAPPENED TODAY

Today focused on turning the external filename-prep pipeline into a real native NZBarr Desktop feature.

The work ended up being much larger than expected, but the result is strong:

- native in-app preparation was added
- `Prepare Only` and `Prepare + Import` now work
- movie and TV filename normalization improved massively
- direct IMDb and TMDB matching was added where available
- actor image caching on import now works
- duplicate and "needs IMDb" workflows were added
- large real-world batch tests were run successfully

The user also requested a security plan for the next phase. That has been written to:

- `docs/security-hardening-plan.md`

## NEW USER-FACING FEATURE ADDED

### Smart Preparation

Added a native in-app preparation pipeline in Settings.

User can set:
- Movies preparation folder
- TV preparation folder

User can run:
- `Prepare Folders`
- `Prepare + Import`

Current behavior:
- scans configured folders for `.nzb` / `.nzb.gz`
- prepares filenames natively inside the app
- resolves TMDB / IMDb IDs when possible
- imports only prepared items when `Prepare + Import` is used
- archives successful imports
- separates duplicates
- separates movie files that likely just need an IMDb ID

## FILES ADDED / UPDATED TODAY

### New
- `src/importPreparationService.js`
- `docs/security-hardening-plan.md`

### Updated earlier today during this session
- `renderer/index.html`
- `renderer/js/app.js`
- `renderer/css/style.css`
- `main-process/main.js`
- `main-process/preload.js`
- `main-process/upload-handler.js`
- `src/database.js`
- `src/repositories/settingsRepository.js`
- `src/index.js`
- `src/nzbImportService.js`

## CURRENT PREPARATION PIPELINE BEHAVIOR

### Folder outputs

Inside the configured import folder, these subfolders may now appear:

- `.nzbarr-imported`
  - successful imports are moved here

- `duplicates`
  - files that were prepared but rejected by import as duplicates are moved here

- `needs-imdb`
  - movie files that could not be matched and do not already contain an IMDb tag are moved here

This is now a much better operational workflow than leaving everything mixed in one folder.

## MAJOR MATCHING IMPROVEMENTS MADE

### 1. Raw scene filename cleanup

The first native version was too weak for scene-style names like:

- `Wanted.2008.1080p.BluRay.x264-OFT.nzb`
- `Letterkenny.2013.S01.WEBRip.EAC3.5.1.1080p.x265-SiQ.nzb`

This was fixed by adding prep-specific extraction logic instead of relying too much on the generic filename parser.

### 2. Direct IMDb-based movie matching

Very important fix:

If a movie filename contains an IMDb ID, the prep service now resolves TMDB directly from IMDb first.

This dramatically improved results for large movie batches.

### 3. Direct TMDB-based TV matching

Very important fix:

If a TV filename contains `tmdb-<id>`, the prep service now resolves the show directly from TMDB first.

This fixed a large TV batch where prepared files with embedded TMDB IDs were still being skipped because noisy episode titles were being searched instead of using the provided TMDB ID.

### 4. Movie title boundary rule

Major rule added:

For movie files, the first valid year is now treated as the title boundary.

This fixed cases like:
- `Worldbreaker-2025-...`
- `Mission-Impossible-The-Final-Reckoning-2025-...`
- `A-Man-and-a-Woman-1966-...`

### 5. TV title boundary rule

Major rule added:

For TV files, the title is now taken from the text before the season/episode marker.

This fixed cases like:
- `Tracker-2024-S03E13-Breakaway-...`

The app was previously searching for noisy titles like `Tracker Breakaway ...` instead of just `Tracker`.

### 6. Preserve technical metadata

The prep service now preserves important release details in the metadata block, for example:

- resolution
- source
- HDR / DV
- codec
- audio
- release group
- container where relevant

This was especially important for TV files that initially lost too much technical detail.

### 7. Preserve source-language title when appropriate

Important commercial-quality fix:

If a filename uses a foreign-language or alternate title and matching succeeds through IMDb/TMDB, the app can now preserve the source title in the final filename instead of always forcing the English/canonical TMDB title.

Example verified:

```text
Ein Mann und eine Frau (1966) [German-AC3D-DL-1080P-CC-BluRay-x264-paranoid06] (imdb-tt0061138) (tmdb-160).nzb
```

This keeps release identity truthful while still linking correctly.

### 8. Idempotent reruns

Running `Prepare Only` repeatedly on already-prepared files is now stable:

- no duplicate IMDb/TMDB tags
- no unwanted stripping of metadata
- already prepared files remain `already normalized`

## IMPORT FLOW IMPROVEMENTS

### Actor images on import

Initially, `Prepare + Import` and normal import paths fetched show/movie artwork, but actor profile images were missing.

This was fixed by adding actor caching/profile download to the shared importer path:

- `src/nzbImportService.js`

This now covers:
- Smart Preparation `Prepare + Import`
- regular import
- drag-and-drop / dropped-file import path

After restart, user verified actor images were fetched correctly.

### Actor download cap

Actor image caching is now limited to the first 10 cast members across import paths.

This reduces:
- terminal noise
- unnecessary image fetches
- repeated cache checks

Updated:
- `src/nzbImportService.js`
- `main-process/main.js`
- `main-process/upload-handler.js`

## LARGE BATCH TEST RESULTS

### Movie batches

Multiple movie test sets were run successfully.

Highlights:

- earlier 50-movie batch initially failed badly until direct IMDb matching was added
- later 126-movie batch: strong result after fixes
- final large movie batch: **480 scanned**
  - `478 prepared`
  - `455 imported`
  - `25 skipped`
  - `0 failed`

This is a very strong result and suggests the movie prep pipeline is now production-viable.

### TV batches

TV also improved dramatically after direct TMDB-ID matching and TV title boundary fixes.

One important TV batch result after fixes:

- `269 scanned`
- `245 prepared`
- `234 imported`
- `35 skipped`
- `0 failed`

This is also strong, though TV still has more edge cases than movies.

## KNOWN EDGE CASES / LIMITS

### 1. TMDB coverage gap

Some titles exist on IMDb but not TMDB, or do not map correctly.

Example:
- `2020--2013---BluRay-720p-DTS-x264-MTeam---imdb-tt13377006-.nzb`

In this case:
- IMDb tag existed
- TMDB lookup from IMDb returned no TMDB movie
- app correctly refused to import rather than making a bad link

This is acceptable behavior.

### 2. Foreign-language titles without IDs

Files using alternate-language titles are still much more reliable when they contain an IMDb ID.

Without IMDb or TMDB ID:
- matching foreign-language titles is still imperfect

### 3. One unresolved TV-batch stability issue

During a very large TV import, the app appeared to stop partway through.

Observations:
- Electron stayed alive
- DB import timestamps stopped moving
- rerunning the batch exposed that many files were actually being skipped because direct TMDB-ID matching for TV had not been applied yet

After fixing TMDB-ID-first handling for TV, results improved significantly.

It is not fully proven whether there is still a real long-batch stall bug, or whether this was mostly a matching issue. Keep an eye on this.

## RECOMMENDED NEXT STEP FOR THE PIPELINE

Before doing new feature work here, the best next prep-pipeline follow-up would be:

1. Add better run-level diagnostics / progress logging
2. Optionally add in-memory metadata caching per batch so identical show/movie lookups are not repeated
3. Review remaining skipped TV edge cases

## SECURITY PLAN WRITTEN

Created:

- `docs/security-hardening-plan.md`

This plan covers:
- trust boundaries
- renderer vs main-process enforcement
- signed license payloads
- local DB tamper resistance
- machine binding
- IPC hardening
- Electron hardening
- build signing and tamper evidence
- observability and diagnostics

## WHAT TO START WITH TOMORROW

Recommended starting point:

1. Read `docs/security-hardening-plan.md`
2. Start with a Premium feature audit:
   - list all features still renderer-only
   - move enforcement into main process where missing
3. Then design signed license payloads between desktop app and license server

This is the best next security milestone.

## VERIFICATION COMPLETED TODAY

Syntax checks passed repeatedly during this session, including:

```bash
node --check src/importPreparationService.js
node --check src/nzbImportService.js
node --check main-process/main.js
node --check main-process/upload-handler.js
```

User functional verification passed for:
- `Prepare Only`
- `Prepare + Import`
- rerunning prepared files
- duplicate handling
- needs-imdb handling
- foreign-language title preservation
- actor image caching after importer restart
- large movie batch imports
- large TV batch improvement

## FINAL STATE AT END OF SESSION

NZBarr Desktop now has a serious native in-app preparation/import pipeline.

It is no longer a toy experiment.

Core outcome:
- users can point the app at movie/TV NZB folders
- the app prepares filenames natively
- imports confident matches
- preserves important release metadata
- separates duplicates
- separates files that likely just need IMDb tagging
- leaves low-confidence cases out instead of polluting the library

Security planning is also ready for the next session.
