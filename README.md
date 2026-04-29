# NZBarr Desktop

Your personal Usenet media library - like Infuse, but for NZB files.

## Overview

NZBarr Desktop is a standalone desktop application that:
- Browses and indexes Usenet content
- Stores NZB files as your library (tiny storage)
- Downloads content on-demand when you want to watch
- Plays content locally in your preferred player
- Deletes downloaded content after watching (free up space)

NZBarr is free and open source software licensed under GPL-3.0-or-later.

## Tech Stack

- **Electron** - Desktop app framework
- **Node.js** - Backend logic
- **SQLite** - Local database
- **HTML/CSS/JavaScript** - Frontend

## Project Structure

```
NZBarr-Desktop/
├── electron/           # Electron main process
│   ├── main.js        # App entry point
│   └── preload.js     # Secure IPC bridge
├── renderer/          # Frontend UI
│   ├── index.html     # Main HTML
│   ├── css/           # Styles
│   └── js/            # Frontend JavaScript
├── src/               # App logic (NNTP, NZB parsing, etc.)
├── config/            # Configuration files
├── docs/              # Documentation
└── builds/            # Built applications files
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### System Requirements

- macOS Apple Silicon is the current primary test platform
- enough free disk space for the SQLite database, NZB library, image cache, and temporary refresh work files
- access to your Usenet provider and any downloader you want to connect to

### External Software for Full NZBarr Functionality

NZBarr can be used for basic library import and browsing on its own, but some features depend on external software that must already be installed on the same machine or be reachable over your network.

#### Core App

- No extra software required for basic NZB import, local library management, and browsing inside NZBarr

#### Send To Downloader

- `SABnzbd` or `NZBGet`
- required if you want to use `Send to Downloader`
- configure the downloader in `Settings > Downloaders`

#### Refresh / Repost Pipeline

- `SABnzbd`
- required for release refresh, because NZBarr sends the NZB to SABnzbd, waits for the completed download, then processes and reposts it
- you must also provide a local path that can access SABnzbd's completed downloads folder or refresh category folder

#### Posting to Usenet

- `ngPost`
- currently required for posting refreshed content back to Usenet
- current macOS path expected by NZBarr:
  - `/Applications/ngPost.app/Contents/MacOS/ngPost`
- this is not bundled with NZBarr at the moment and must be installed separately

#### Media Analysis

- `MediaInfo`
- used to gather detailed video/audio tags that NZBarr writes into metadata and refreshed release names
- current macOS path expected by NZBarr:
  - `/usr/local/bin/mediainfo`

#### Archive Extraction for Analysis and Refresh

- `unrar`
- used when inspected or refreshed content is packaged in RAR archives
- current macOS path expected by NZBarr:
  - `/usr/local/bin/unrar`

- `7z`
- used for `.7z` and multi-part archive handling, and also as an archive backend for the ngPost refresh workflow
- current macOS path expected by NZBarr:
  - `/opt/homebrew/bin/7z`

#### External Playback

- optional: `VLC`, `IINA`, or `MPV`
- only needed if you choose an external player in `Settings > Playback`
- otherwise NZBarr can use its built-in player where supported

### Recommended macOS Setup for Full Feature Use

If you want the full NZBarr workflow on macOS, install and configure:

- `SABnzbd`
- `ngPost`
- `MediaInfo`
- `unrar`
- `7z`
- optional: `VLC`, `IINA`, or `MPV`

### Important Notes

- Refresh currently depends on `SABnzbd`; `NZBGet` can be used as a downloader for send-to-downloader flows, but not as the current refresh pipeline backend
- the paths above reflect the app's current expectations in code
- if one of those tools is missing, the related NZBarr feature will fail even though the rest of the app may still work
- for distribution, these tools are currently external dependencies and are not bundled into the app

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build for Distribution

```bash
npm run build        # All platforms
npm run build:mac    # macOS only
npm run build:win    # Windows only
npm run build:linux  # Linux only
```

## Features to Implement

- [ ] NNTP connection and Usenet browsing
- [ ] NZB file parsing and generation
- [ ] SQLite database for library metadata
- [ ] Download manager
- [ ] Built-in video player
- [ ] External player integration
- [ ] Multilingual support (reuse translations)
- [ ] Beautiful library UI with posters

## Architecture

The app works like this:

1. **Browse** - Connect to Usenet NNTP servers, search for content
2. **Add to Library** - Save NZB file metadata to local SQLite
3. **Play** - Download from Usenet → Play → Delete when done
4. **Watch Again** - Redownload from Usenet (content lives there until expiry)

## License

NZBarr is free and open source software licensed under GPL-3.0-or-later. See [LICENSE](LICENSE).
