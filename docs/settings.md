# Settings Guide

This page explains every section of the NZBarr Settings page. You do not need to configure everything before using the app. Start with the sections that match the features you want to use.

For normal NZB library use, the most important sections are:

1. `API Keys`
2. `Smart Preparation`
3. `Download Clients`

For Auto Refresh and reposting, you also need:

1. `NNTP Setup`
2. `Refresh Category Setup`
3. `NZB Auto Refresh`

## Paths On Different Operating Systems

NZBarr can run on macOS, Windows, and Linux, so path examples in the docs are only examples. Always use the path as it exists on the computer running NZBarr.

Common examples:

```text
macOS download folder:   /Users/username/Downloads
Windows download folder: C:\Users\username\Downloads
Linux download folder:   /home/username/Downloads
```

Network or downloader folders also differ by platform:

```text
macOS mounted share:   /Volumes/SABnzbd/Downloads/complete
Windows mapped drive:  Z:\SABnzbd\Downloads\complete
Linux mounted share:   /mnt/sabnzbd/downloads/complete
```

For any folder setting, NZBarr needs a path that the local computer can read. If SABnzbd or NZBGet runs on another machine, mount or map that remote folder first, then enter the mounted path in NZBarr.

## NNTP Setup

The NNTP Setup section is for Usenet server details. It has two parts: download NNTP and upload NNTP.

### Download NNTP Setup

Use this for reading/downloading articles from your Usenet provider.

- `Server`: your provider's news server, for example `news.example.com`.
- `Port`: usually `563` for SSL or `119` for non-SSL.
- `Username`: your Usenet username.
- `Password`: your Usenet password.
- `Connections`: how many parallel connections NZBarr may use.
- `Use SSL`: keep this enabled when your provider supports SSL.

Most users should start with port `563`, SSL enabled, and a modest connection count such as `5`.

### Upload NNTP Setup

Use this only if you use NZBarr's refresh/repost workflow. Upload settings are for posting refreshed content back to Usenet.

- `Server`: your provider's posting server, for example `post.example.com`.
- `Port`: usually `563` for SSL.
- `Username`: your upload/posting username.
- `Password`: your upload/posting password.
- `Connections`: parallel upload connections.
- `Use SSL`: keep enabled when supported.
- `Same credentials as Download NNTP`: use this if your provider uses the same server login for download and upload.
- `Article Size (bytes)`: size of each Usenet article. The default `716800` is a safe starting point.
- `Retry Count`: how many times NZBarr retries a failed article post.
- `Upload Threads`: parallel upload workers. Start with `4` to `8`.

Higher upload values can be faster, but they can also cause provider limits or posting failures. Increase them slowly.

## Download Clients

This section connects NZBarr to SABnzbd or NZBGet. It is used when you send NZBs from the library to a downloader.

### Preferred Downloader

Choose the downloader NZBarr should use by default:

- `SABnzbd`
- `NZBGet`

### SABnzbd

Fields:

- `SABnzbd Host`: host name or full URL. Examples: `localhost` or `http://localhost:8080/sabnzbd`.
- `SABnzbd Port`: usually `8080`.
- `SABnzbd Base Path`: only needed when SABnzbd runs under a path such as `/sabnzbd`.
- `SABnzbd NZB Key`: preferred for send-only access.
- `SABnzbd Full API Key`: needed for queue/status checks and some refresh workflows.
- `SABnzbd Username`: optional, only if SABnzbd requires login.
- `SABnzbd Password`: optional, only if SABnzbd requires login.
- `SABnzbd Category`: optional category for normal downloads.
- `SABnzbd Priority`: priority sent with NZBs.
- `Use SSL for SABnzbd`: enable only when your SABnzbd web interface uses HTTPS.
- `Completed Downloads Path`: local or mounted path where this computer can see SABnzbd's completed downloads.

Completed downloads path examples:

```text
macOS:   /Volumes/SABnzbd/Downloads/complete
Windows: Z:\SABnzbd\Downloads\complete
Linux:   /mnt/sabnzbd/downloads/complete
```

Use `Test SABnzbd Connection` after entering the settings. The diagnostics card shows which endpoint and API key NZBarr is trying.

### NZBGet

Fields:

- `NZBGet Host`: host name, for example `localhost`.
- `NZBGet Port`: usually `6789`.
- `NZBGet Username`: NZBGet web/API username.
- `NZBGet Password`: NZBGet web/API password.
- `NZBGet Category`: optional category for normal downloads.
- `NZBGet Priority`: priority sent with NZBs.
- `Use SSL for NZBGet`: enable only when NZBGet uses HTTPS.

Use `Test NZBGet Connection` after entering the settings.

## Refresh Category Setup

This section is only needed for the Auto Refresh workflow. NZBarr sends refresh downloads to a dedicated SABnzbd category so it can find the completed files later.

- `SABnzbd Category for Refresh Jobs`: category name sent to SABnzbd. The default is `nzbarr-refresh`.
- `Completed Refresh Folder Path`: the folder where SABnzbd places completed refresh downloads. This must be visible to the machine running NZBarr.
- `After Successful Refresh`: choose whether NZBarr deletes the completed refresh download or moves it somewhere else after reposting.
- `Move Destination`: folder used when `Move downloaded refresh file` is selected.

Completed refresh folder examples:

```text
macOS:   /Volumes/SABnzbd/Downloads/complete/nzbarr-refresh
Windows: Z:\SABnzbd\Downloads\complete\nzbarr-refresh
Linux:   /mnt/sabnzbd/downloads/complete/nzbarr-refresh
```

One-time SABnzbd setup:

1. Open SABnzbd settings.
2. Go to Categories.
3. Add a category named `nzbarr-refresh`.
4. Set its folder to something like `complete/nzbarr-refresh`.
5. In NZBarr, set `Completed Refresh Folder Path` to that same folder as seen from your computer.

## API Keys

API keys improve matching, metadata, and artwork.

- `TMDB API Key`: strongly recommended. Used for movie and TV matching, metadata, and Smart Preparation.
- `Fanart API Key`: optional. Used for extra artwork from Fanart.tv.

Smart Preparation works best with a TMDB API key. Without it, NZBarr has less information and matching can be less reliable.

## Easynews Streams

This section is for imported Easynews stream URLs.

- `Easynews Username`: your Easynews username.
- `Easynews Password`: your Easynews password.

NZBarr can add these credentials to imported `members.easynews.com` stream URLs in the main process. Stream URLs are masked in the UI and credentials are not logged.

Only use this if you use the stream library with Easynews URLs.

## Downloads

This section controls local download behavior inside NZBarr.

- `Download Location`: folder where NZBarr should place downloaded files when it downloads directly.
- `Max Concurrent Downloads`: maximum number of simultaneous downloads.

Download location examples:

```text
macOS:   /Users/username/Downloads
Windows: C:\Users\username\Downloads
Linux:   /home/username/Downloads
```

This is separate from SABnzbd/NZBGet settings.

## Player

This section controls playback.

- `External Player`: choose `VLC`, `IINA`, `MPV`, or leave it as `None (use built-in)`.

Choose an external player if you prefer playing files outside NZBarr or if the built-in player does not support a format well.

## Release Groups

This section helps NZBarr recognize release group names during import.

Add one release group per line, for example:

```text
FLUX
NTb
AMCON
```

When NZBarr sees one of these names in an NZB filename, it can fill the Group column automatically.

## Import & Link

This section is for manual library management.

- `Add Media to Library`: manually add a movie or TV show when it cannot be found automatically.
- `Link NZBs to Media`: manually connect imported NZB files to an existing movie or TV show.

Drag and drop import is available, but it should mainly be used for files that are already named correctly. For normal importing, use Smart Preparation first.

## Smart Preparation

Smart Preparation is the recommended way to import NZBs.

It scans configured folders, prepares NZB filenames, resolves TMDB/IMDb IDs where possible, and can import the files immediately.

Fields:

- `Movies Preparation Folder`: folder containing movie NZBs.
- `TV Preparation Folder`: folder containing TV NZBs.
- `NZB Storage Directory`: optional override for where NZBarr stores imported NZB files. Leave empty to use the default app data location.

Preparation folder examples:

```text
macOS movies:   /Users/username/Downloads/NZB Movies
Windows movies: C:\Users\username\Downloads\NZB Movies
Linux movies:   /home/username/Downloads/NZB Movies
```

Default app data locations are usually:

```text
macOS:   ~/Library/Application Support/NZBarr-GIT
Windows: %APPDATA%\NZBarr-GIT
Linux:   ~/.config/NZBarr-GIT
```

Buttons:

- `Prepare Folders`: rename and prepare files, but do not import them.
- `Prepare + Import`: prepare files and import them into the library.

Recommended workflow:

1. Configure your TMDB API key.
2. Put movie NZBs in the movie preparation folder.
3. Put TV NZBs in the TV preparation folder.
4. Click `Prepare + Import`.

After import:

- Successfully imported NZBs are moved to `.nzbarr-imported`.
- Duplicate NZBs are moved to `duplicates`.
- Movie files that need an IMDb ID may be moved to `needs-imdb`.

## NZB Auto Refresh

Auto Refresh is an advanced workflow. It can re-download older NZBs, analyze them, create refreshed archives, repost them to Usenet, and update the library.

You should configure and test `NNTP Setup`, `Download Clients`, and `Refresh Category Setup` before enabling this.

Fields:

- `Enable automatic NZB refresh in background`: turns the background refresh check on.
- `Minimum NZB Age Before Refresh (years)`: only NZBs older than this are eligible.
- `Re-analyze Download Cap (MB)`: amount downloaded for MediaInfo analysis when re-analyzing a release.
- `Check Interval`: how often NZBarr checks for eligible NZBs.
- `Refresh Mode`: choose `Replace existing NZB` or `Keep both`.
- `Newsgroup for Re-upload`: up to 3 newsgroups for reposting, separated by commas or new lines.
- `Poster Name/Email`: From name used for posted articles.
- `ngPost Executable Path`: path to ngPost. Leave blank to let NZBarr try auto-detection.
- `Archive Password`: password used when NZBarr creates refreshed upload archives.
- `Show notification when a refresh completes`: enables completion notifications.
- `Refresh Queue`: shows queued and active refresh jobs.

Use `Keep both` while testing. Use `Replace existing NZB` only after you trust your refresh setup.

External tool paths depend on the operating system and how the tool was installed. Examples:

```text
macOS ngPost app: /Applications/ngPost.app/Contents/MacOS/ngPost
Windows ngPost:   C:\Program Files\ngPost\ngPost.exe
Linux ngPost:     /usr/bin/ngpost
```

The same idea applies to `MediaInfo`, `unrar`, and `7z`: install them for your operating system and make sure NZBarr can find them or that the configured path points to the executable.

## UI Settings

This section controls how the app looks and how many items it shows.

- `Cover Size (Library)`: small, medium, or large library covers.
- `Items per page (Browse)`: number of browse items per page.
- `Items per page (Library)`: number of library items per page.
- `Display welcome message on Main Page`: show or hide the welcome section.
- `Display hero slider on Main Page`: show or hide the large hero carousel.
- `Display featured movies on Main Page`: show or hide featured movies.
- `Display featured series on Main Page`: show or hide featured series.
- `Display Grand Vault on Main Page`: show or hide the Grand Vault section.
- `Display At A Glance on Main Page`: show or hide summary statistics.
- `Display Freshly Polished on Main Page`: show or hide recently refreshed titles.

## Saving Settings

Most sections are saved with the main `Save Settings` button at the bottom of the Settings page.

The `Download Clients` section also has its own `Save Downloader Settings` button so downloader settings can be saved and tested separately.

## Suggested First Setup

For a new user, configure settings in this order:

1. Add a `TMDB API Key`.
2. Set `Movies Preparation Folder` and `TV Preparation Folder`.
3. Use `Prepare + Import` on a small test folder.
4. Configure `Download Clients` if you want to send NZBs to SABnzbd or NZBGet.
5. Configure Auto Refresh only after the normal import and downloader workflow works.
