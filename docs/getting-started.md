# Getting Started

This guide walks through a first NZBarr setup from source. NZBarr is a desktop library for NZB files. It does not include media, Usenet access, indexer access, or downloader software.

## Requirements

Install these first:

- Node.js 18 or newer.
- Git, if you are cloning the repository yourself.

Optional tools:

- SABnzbd or NZBGet, if you want NZBarr to send NZBs to a downloader.
- VLC, IINA, or MPV, if you want external playback.
- ngPost, MediaInfo, unrar, and 7z, only if you want to use the advanced Auto Refresh workflow.

## Install From Source

Clone the repository and install dependencies:

```bash
git clone https://github.com/NZBarr/NZBarr-Desktop.git
cd NZBarr-Desktop
npm install
```

Start the app:

```bash
bash start.sh
```

You can also run:

```bash
npm start
```

This checkout starts as `NZBarr-GIT` and uses a separate app data folder from the normal `NZBarr` app.

Common app data locations:

```text
macOS:   ~/Library/Application Support/NZBarr-GIT
Windows: %APPDATA%\NZBarr-GIT
Linux:   ~/.config/NZBarr-GIT
```

## First Settings

Open `Settings` and configure only the sections you need.

For most users, start with:

1. `API Keys`
2. `Smart Preparation`
3. `Download Clients`

### API Keys

Add a `TMDB API Key` if you want reliable movie and TV matching, metadata, posters, backdrops, and logos.

The Fanart API key is optional. It is only needed for extra artwork from Fanart.tv.

### Smart Preparation

Smart Preparation is the recommended import workflow.

Set one or both folders:

- `Movies Preparation Folder`: folder containing movie NZBs.
- `TV Preparation Folder`: folder containing TV episode or TV season NZBs.

Then click `Prepare + Import` to prepare filenames and import the NZBs into your library.

After import:

- Successfully imported NZBs are moved to `.nzbarr-imported`.
- Duplicate NZBs are moved to `duplicates`.
- Movie files that need an IMDb ID may be moved to `needs-imdb`.

### Download Clients

Configure SABnzbd or NZBGet if you want to send NZBs from NZBarr to a downloader.

Use the test button after entering your downloader settings. If your downloader runs on another machine, make sure any completed download folder path is mounted or mapped on the computer running NZBarr.

## Import Your First NZBs

The safest first import is a small test folder:

1. Put a few movie NZBs in your movie preparation folder.
2. Put a few TV NZBs in your TV preparation folder.
3. Open `Settings > Smart Preparation`.
4. Click `Prepare + Import`.
5. Check `Library` and `Browse` to confirm the results.

Drag and drop import is available, but it is best for NZB files that already follow the NZBarr filename pattern.

## Filename Pattern

NZBarr works best when filenames contain the title, year, technical metadata, and IDs.

Movie example:

```text
Movie Title (2024) [2160P-WEB-DL-DTS-HD-MA-H.265-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

TV episode example:

```text
Show Title [S01E02] (2024) [1080P-WEB-DL-DD5.1-H.264-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

Complete TV season example:

```text
Show Title [S01] (2024) [1080P-WEB-DL-DD5.1-H.264-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

IMDb and TMDB IDs are strongly recommended because titles can be ambiguous.

## Screenshots

The screenshots currently used for NZBarr documentation may show movie and TV artwork. NZBarr does not include TMDB artwork or a TMDB API key; artwork is loaded only when a user enters their own TMDB API key. This project is not endorsed, certified, or otherwise approved by TMDB.

## More Help

- [Settings Guide](settings.md): detailed explanation of each Settings page section.
- [Database Schema](database-schema.sql): technical database reference.
