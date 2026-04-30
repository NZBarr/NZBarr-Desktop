# Troubleshooting

This page collects common NZBarr setup problems and practical fixes.

## NZBarr Does Not Start

Try:

```bash
npm install
npm start
```

If dependencies fail to install, check that Node.js 18 or newer is installed.

## TMDB Matching Does Not Work

Check:

- `Settings > API Keys` has a TMDB key.
- Settings were saved.
- The computer has internet access.
- The filename includes a clear title and year.
- The filename includes `[imdb-tt...]` or `[tmdb-...]` for ambiguous titles.

Restart NZBarr after adding or changing the key.

## Artwork Does Not Show

Check:

- TMDB key is configured.
- The item has a TMDB ID.
- The app can access the internet.
- The local image cache path is writable.

Try fetching TMDB data again from the edit/detail tools.

## Import Creates Duplicates

Duplicates usually mean NZBarr already imported that NZB or a release with the same identity.

Check the `duplicates` folder inside your preparation folder. If you intended to import a different version, make sure the filename includes different technical metadata or a clearly different release name.

## Files Go To needs-imdb

`needs-imdb` means NZBarr could not confidently identify a movie.

Fix by adding an IMDb ID:

```text
Movie Title (2024) [1080P-WEB-DL-H.264-GROUP-mkv] [imdb-tt1234567].nzb
```

Then move the file back to the preparation folder and try again.

## SABnzbd Test Fails

Check:

- SABnzbd is running.
- Host and port are correct.
- API key is correct.
- SSL is off unless SABnzbd uses HTTPS.
- Username/password are filled only if SABnzbd requires login.

Try opening SABnzbd in a browser from the same computer running NZBarr.

## NZBGet Test Fails

Check:

- NZBGet is running.
- Host and port are correct.
- Username/password are correct.
- SSL is off unless NZBGet uses HTTPS.

Try opening NZBGet in a browser from the same computer running NZBarr.

## Path Not Found

NZBarr needs paths as seen by the computer running NZBarr.

If SABnzbd runs on another computer, this path will not work:

```text
/downloads/complete
```

unless that exact path exists locally too.

Mount or map the remote folder first:

```text
macOS:   /Volumes/SABnzbd/Downloads/complete
Windows: Z:\SABnzbd\Downloads\complete
Linux:   /mnt/sabnzbd/downloads/complete
```

## Drag And Drop Import Gives Poor Results

Drag and drop is best for clean filenames. For messy filenames, use Smart Preparation first.

Recommended:

1. Put files in the movie or TV preparation folder.
2. Run `Prepare + Import`.
3. Check results in `Library` and `Browse`.

## Auto Refresh Fails

Auto Refresh needs more setup than normal importing.

Check:

- SABnzbd works from `Download Clients`.
- `Refresh Category Setup` points to the correct completed refresh folder.
- `NNTP Setup` has upload settings if reposting.
- ngPost is installed or `ngPost Executable Path` is configured.
- MediaInfo, unrar, and 7z are installed.
- `Newsgroup for Re-upload` is filled.
- `Archive Password` is filled if your workflow requires it.

Use `Keep both` while testing Auto Refresh.
