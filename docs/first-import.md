# First Import Walkthrough

This walkthrough is for a first small test import. Start with only a few NZB files so it is easy to understand what NZBarr does.

## Before You Start

You need:

- NZBarr installed and running.
- A few `.nzb` or `.nzb.gz` files.
- A TMDB API key, strongly recommended.

You do not need SABnzbd or NZBGet for the first import. Download clients are only needed when you want to send NZBs to a downloader.

## Step 1: Add Your TMDB Key

1. Open `Settings`.
2. Open `API Keys`.
3. Paste your `TMDB API Key`.
4. Click `Save Settings`.

TMDB helps NZBarr match titles and fetch artwork.

## Step 2: Create Preparation Folders

Create two folders on your computer:

```text
NZBarr Import/Movies
NZBarr Import/TV
```

Example paths:

```text
macOS:   /Users/username/Downloads/NZBarr Import/Movies
Windows: C:\Users\username\Downloads\NZBarr Import\Movies
Linux:   /home/username/Downloads/NZBarr Import/Movies
```

Put movie NZBs in the movie folder and TV NZBs in the TV folder.

## Step 3: Configure Smart Preparation

1. Open `Settings`.
2. Open `Smart Preparation`.
3. Set `Movies Preparation Folder`.
4. Set `TV Preparation Folder`.
5. Leave `NZB Storage Directory` empty unless you want a custom storage location.
6. Click `Save Settings`.

Leaving `NZB Storage Directory` empty lets NZBarr use its normal app data folder.

## Step 4: Run Prepare + Import

Click `Prepare + Import`.

NZBarr will:

- Scan the configured preparation folders.
- Parse titles, years, seasons, episodes, and technical tags.
- Use TMDB where possible.
- Rename NZBs into the NZBarr pattern.
- Import them into the local SQLite library.

## Step 5: Check The Results

Open:

- `Library`: grouped movie and TV entries.
- `Browse`: all imported releases.

If the result looks wrong, use a smaller test set and check the filenames.

## What Happens To Files After Import

After a successful import, NZBarr moves files into folders inside the preparation folder:

- `.nzbarr-imported`: files imported successfully.
- `duplicates`: files that were already imported.
- `needs-imdb`: movie files that need a clearer IMDb ID.

This keeps the preparation folder clean for the next import.

## If Matching Is Wrong

Try one of these:

- Add the year to the filename.
- Add `[imdb-tt1234567]`.
- Add `[tmdb-12345]`.
- Use `Import & Link` to manually link NZBs to a movie or TV show.

## Next Steps

After the first import works:

- Configure SABnzbd or NZBGet in [Downloader Setup](downloaders.md).
- Read [Smart Preparation Manual](smart-preparation.md) for larger imports.
- Read [Filename Guide](filename-patterns.md) for the best naming patterns.
