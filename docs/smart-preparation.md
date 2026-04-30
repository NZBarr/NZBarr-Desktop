# Smart Preparation Manual

Smart Preparation is the recommended way to import NZB files into NZBarr. It prepares filenames before import so matching is more reliable.

## What Smart Preparation Does

Smart Preparation can:

- Scan movie and TV preparation folders.
- Read `.nzb` and `.nzb.gz` files.
- Parse titles, years, seasons, episodes, codecs, resolution, source, format, and release groups.
- Use TMDB to improve movie and TV matching.
- Add IMDb and TMDB IDs when possible.
- Rename files into a consistent NZBarr pattern.
- Import prepared files into the library.

## Preparation Folders

Use separate folders for movies and TV:

```text
NZBarr Import/Movies
NZBarr Import/TV
```

Do not point Smart Preparation at a huge download folder with unrelated files. Use a dedicated folder so results are predictable.

## Buttons

`Prepare Folders` prepares and renames files, but does not import them.

Use this when you want to inspect the renamed NZBs before adding them to the library.

`Prepare + Import` prepares the files and then imports them into NZBarr.

Use this for the normal workflow after you trust your setup.

## Recommended Workflow

1. Configure your TMDB API key.
2. Add a few test NZBs to the preparation folders.
3. Run `Prepare Folders`.
4. Check the filenames.
5. Run `Prepare + Import`.
6. Check `Library` and `Browse`.

After that, use `Prepare + Import` for normal importing.

## Output Folders

Smart Preparation may create these folders:

- `.nzbarr-imported`: imported successfully.
- `duplicates`: already exists in the library.
- `needs-imdb`: could not match a movie confidently.

If files land in `needs-imdb`, add an IMDb ID to the filename and try again.

## Best Filename Ingredients

Smart Preparation works best when filenames include:

- Title.
- Year.
- Season or episode for TV.
- Resolution.
- Source.
- Video and audio codec.
- Release group.
- IMDb ID.
- TMDB ID.

IDs are the most reliable part. If a title is ambiguous, IDs usually solve it.

## NZB Storage Directory

`NZB Storage Directory` is optional.

Leave it empty unless you want NZBarr to store imported NZB files somewhere outside the normal app data folder.

Default app data locations:

```text
macOS:   ~/Library/Application Support/NZBarr-GIT
Windows: %APPDATA%\NZBarr-GIT
Linux:   ~/.config/NZBarr-GIT
```

## Common Mistakes

- Mixing movies and TV in the same preparation folder.
- Importing hundreds of files before testing with a few.
- Dragging messy raw filenames directly into the app.
- Forgetting to save settings after choosing preparation folders.
- Using a folder path that NZBarr cannot read.

## Recovery Tips

If something looks wrong:

1. Stop importing more files.
2. Check the preparation folders.
3. Look for `.nzbarr-imported`, `duplicates`, and `needs-imdb`.
4. Fix filenames by adding year, IMDb ID, or TMDB ID.
5. Test again with one file.
