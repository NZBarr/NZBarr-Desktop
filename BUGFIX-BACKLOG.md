# NZBarr Bugfix Backlog

## Reanalyze sample can miss audio/format metadata

- **Status:** Open
- **Found:** 2026-04-21
- **Area:** Reanalysis / MediaInfo / NZB segment selection
- **Priority:** Medium

### Symptom

Reanalyzing a release downloads a sample and runs MediaInfo, but the result can include only partial metadata:

- Resolution detected, for example `1080P`
- Video codec detected, for example `H.265`
- Audio codec is `N/A`
- Format is `null`
- NFO not found

Observed sample size: `42.3 MB`.

The MediaInfo output only reports a `General` stream for the sampled file, with no audio stream information. The update fields were limited to:

- `mediainfo_raw`
- `resolution`
- `video_codec`
- `hdr_format`
- `size`

### Notes

This behavior was reproduced both from a clean fresh DMG install and again after restoring the production Application Support folder, using the same release/file.

Earlier work attempted to make reanalysis download only segments from the main movie file in the NZB XML structure. This bug may mean that:

- the selected sample still does not contain enough complete media data for MediaInfo,
- the wrong file/segments are still being sampled for this NZB shape,
- the downloaded sample is partial in a way MediaInfo cannot parse beyond the container/general stream,
- or audio/format extraction needs a fallback path when MediaInfo returns only `General`.

### Desired Fix

Improve reanalysis so the downloaded sample reliably contains enough contiguous media data for MediaInfo to detect audio codec/channels and container format, while still avoiding unnecessary full downloads.

Suggested investigation points:

- Verify the NZB XML file selection chooses the largest/main movie payload, not sample/trailer/extra files.
- Check whether the sample is assembled from contiguous early segments of the selected payload.
- Consider increasing or repositioning the sample window when MediaInfo returns only `General`.
- Add a clear UI/log warning when reanalysis produces partial metadata because the sample was insufficient.

## DMG first-run database schema packaging

- **Status:** Fixed locally, verify in next full release build
- **Found:** 2026-04-21
- **Area:** Packaging / First-run database setup

Fresh DMG installs initially failed to show a window because the packaged app did not include `docs/database-schema.sql`, causing a fresh `nzbarr.db` to be created without schema tables.

Local fix:

- `package.json` now includes `docs/database-schema.sql` in packaged files.
- `src/database.js` now detects an empty first-run database before migrations and validates core schema tables.

Verified from rebuilt Apple Silicon DMG: fresh install starts in Free Lounge and license activation works.
