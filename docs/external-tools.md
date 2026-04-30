# External Tools

NZBarr can import and browse NZB files without most external tools. Some features need extra software.

## Screenshot Placeholder

Add screenshots of external tool settings, downloader settings, and Auto Refresh tool paths here.

## Optional Downloaders

Use a downloader if you want NZBarr to send NZBs for downloading:

- SABnzbd
- NZBGet

See [Downloader Setup](downloaders.md).

## Optional Players

NZBarr can use external players:

- VLC
- IINA
- MPV

Open `Settings > Player` and choose the player you prefer. Leave it as `None` if you want to use the built-in playback behavior.

## Auto Refresh Tools

Auto Refresh can require:

- SABnzbd
- ngPost
- MediaInfo
- unrar
- 7z or rar

These tools are not needed for basic importing and browsing.

## macOS Notes

Common paths:

```text
/Applications/VLC.app
/Applications/IINA.app
/Applications/ngPost.app/Contents/MacOS/ngPost
/opt/homebrew/bin/mediainfo
/opt/homebrew/bin/7z
```

Homebrew can install some command line tools:

```bash
brew install mediainfo p7zip unrar
```

## Windows Notes

Common paths:

```text
C:\Program Files\VideoLAN\VLC\vlc.exe
C:\Program Files\ngPost\ngPost.exe
C:\Program Files\7-Zip\7z.exe
```

If a tool is installed but NZBarr cannot find it, paste the full executable path in the relevant setting.

## Linux Notes

Common paths:

```text
/usr/bin/vlc
/usr/bin/mpv
/usr/bin/ngpost
/usr/bin/mediainfo
/usr/bin/7z
```

Package names depend on the distribution.

## Remote Folders

If an external downloader runs on another computer, NZBarr still needs local access to completed files.

Mount or map the remote folder:

```text
macOS:   /Volumes/SABnzbd/Downloads/complete
Windows: Z:\SABnzbd\Downloads\complete
Linux:   /mnt/sabnzbd/downloads/complete
```

Then enter that mounted path in NZBarr.
