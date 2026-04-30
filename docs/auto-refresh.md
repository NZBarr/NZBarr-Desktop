# Auto Refresh Guide

Auto Refresh is an advanced workflow. It can download older NZBs, analyze the completed media, create refreshed archives, repost them, and update the NZBarr library.

Do not start with Auto Refresh. First make sure normal import and downloader setup work.

## Screenshot Placeholder

Add screenshots of `NZB Auto Refresh`, `Refresh Category Setup`, `NNTP Setup`, and the refresh queue here.

## What You Need

Auto Refresh can require:

- SABnzbd.
- A working SABnzbd API connection.
- A dedicated SABnzbd refresh category.
- A completed refresh folder visible to NZBarr.
- NNTP upload settings.
- ngPost.
- MediaInfo.
- unrar.
- 7z or rar.

## Recommended Setup Order

1. Configure `Download Clients`.
2. Test SABnzbd.
3. Configure `Refresh Category Setup`.
4. Configure `NNTP Setup`.
5. Install external tools.
6. Configure `NZB Auto Refresh`.
7. Test with `Keep both`.

## Refresh Category Setup

In SABnzbd:

1. Open SABnzbd settings.
2. Go to Categories.
3. Add a category named `nzbarr-refresh`.
4. Set its folder to something like `complete/nzbarr-refresh`.

In NZBarr:

1. Open `Settings > Refresh Category Setup`.
2. Set `SABnzbd Category for Refresh Jobs` to `nzbarr-refresh`.
3. Set `Completed Refresh Folder Path` to the same folder as seen by the computer running NZBarr.

Examples:

```text
macOS:   /Volumes/SABnzbd/Downloads/complete/nzbarr-refresh
Windows: Z:\SABnzbd\Downloads\complete\nzbarr-refresh
Linux:   /mnt/sabnzbd/downloads/complete/nzbarr-refresh
```

## NNTP Setup

Download NNTP is used for reading from your provider.

Upload NNTP is used for posting refreshed content. If your provider uses the same login for both, enable `Same credentials as Download NNTP`.

Start with modest values:

```text
Connections: 5
Article Size: 716800
Retry Count: 3
Upload Threads: 4
```

Increase only after the workflow is stable.

## NZB Auto Refresh Settings

Fields:

- `Enable automatic NZB refresh in background`: enables scheduled checks.
- `Minimum NZB Age Before Refresh`: only older NZBs are eligible.
- `Re-analyze Download Cap`: MB downloaded for metadata analysis.
- `Check Interval`: how often NZBarr checks.
- `Refresh Mode`: choose `Keep both` while testing.
- `Newsgroup for Re-upload`: one or more newsgroups.
- `Poster Name/Email`: poster identity for uploads.
- `ngPost Executable Path`: set this if auto-detection does not work.
- `Archive Password`: password for created archives.
- `Show notification when a refresh completes`: optional.

## External Tool Paths

Examples:

```text
macOS ngPost: /Applications/ngPost.app/Contents/MacOS/ngPost
Windows ngPost: C:\Program Files\ngPost\ngPost.exe
Linux ngPost: /usr/bin/ngpost
```

If NZBarr cannot find a tool automatically, configure the exact executable path.

## Testing Safely

Use `Keep both` for early tests. This keeps the old NZB and the refreshed NZB so you can inspect the result.

Use `Replace existing NZB` only after you understand and trust your setup.

## Cleanup After Refresh

In `Refresh Category Setup`, choose what NZBarr does with completed refresh downloads after successful reposting:

- Delete the completed refresh download.
- Move it to another folder.

If you choose move, set `Move Destination`.
