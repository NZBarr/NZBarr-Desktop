# Standalone ngPost GUI Handoff

Date: 2026-04-25

## Goal

Build a standalone, personal GUI wrapper around the ngPost CLI. This should not be an NZBarr feature and should not be integrated into NZBarr. It is just for Herman's own manual posting workflow.

## Why

ngPost is a good CLI engine, but the GUI is confusing and some settings do not behave as expected. A custom GUI can provide safer, clearer workflows while still using ngPost underneath.

## Desired Workflow

- Select a source folder containing episode files.
- Group files by shared basename into one NZB per episode.
  - Example:
    - `test1.mkv`
    - `test1.jpg`
    - `test1.srt`
    - should become one `test1.nzb`.
  - `-thumb.jpg` files should be grouped with the matching episode, not posted separately.
- Preview all planned NZBs before posting.
- Post selected/all groups using ngPost CLI.
- Output NZBs to a chosen folder.
- Keep the archive password out of generated NZB files.

## Proven Script

Current proof-of-concept script:

`/Users/hermansteijn/NZBarr-Desktop/testngpost.sh`

Important behavior already added:

- Defaults to dry-run mode:
  - `./testngpost.sh`
- Posts one test group:
  - `DRY_RUN=0 MAX_GROUPS=1 ./testngpost.sh`
- Posts all groups:
  - `DRY_RUN=0 ./testngpost.sh`
- Uses a separate temp folder, not the output folder.
- Normalizes `-thumb` suffix into the same episode group.
- Strips ngPost password metadata from NZB files after posting.

Password stripping command used:

```bash
perl -0pi -e 's/\s*<meta[^>]*type="password"[^>]*>.*?<\/meta>\s*/\n/gis' "$nzb"
```

## ngPost Settings That Worked

ngPost CLI should be used as the engine.

Useful CLI options:

```bash
--compress
--gen_name
--rar_pass "$PASS"
--rar_size 99
--par2_pct 1
--rar_no_root_folder
--obfuscate
```

Notes:

- `--compress` is needed for archive/file-name obfuscation.
- `--gen_name` creates random archive names.
- `--obfuscate` / `-x` obfuscates article subjects.
- `--rar_no_root_folder` avoids preserving the temporary grouping folder name inside the archive.
- For 7-Zip, `RAR_EXTRA = -mx0 -mhe=on` means store/no compression and encrypt headers.
- Herman only uses 7z, so RAR-specific behavior is not important.

## Important Findings

- ngPost GUI checkboxes are confusing.
- File-name obfuscation appears to behave differently in the GUI and can produce extensionless downloaded files.
- CLI behavior is more predictable.
- The generated NZB can include password metadata if `--rar_pass` is used.
- NZBarr already strips that metadata; the standalone tool should do the same.

## Standalone GUI Ideas

Possible implementation paths:

- Small Electron app
- Tauri app
- Simple local web UI plus Node backend
- Native macOS shell/script wrapper is possible, but less nice

Suggested first version:

- Source folder picker
- Output folder picker
- Temp folder picker or auto temp
- ngPost executable path
- Newsgroups input
- Archive password input
- RAR/7z volume size
- PAR2 percentage
- Checkboxes:
  - compress/package with 7z
  - random archive name
  - obfuscate article subject
  - strip password metadata from NZB
  - group `-thumb` files with episodes
- Preview table:
  - NZB name
  - files included
  - size
  - status
- Start/pause/cancel queue
- Live log per post

## Safety Defaults

- Dry run / preview before posting.
- Never delete source files.
- Never use output folder as temp folder.
- Redact passwords in logs.
- Strip password metadata from generated NZBs by default.
- Use 7z store mode for video files.

## Next Step

Tomorrow, start by turning `testngpost.sh` into a minimal standalone GUI prototype. Keep NZBarr untouched except using this folder as a workspace if convenient.
