# Quick Reference: Data Storage System

## For Developers

### How to Access Paths in Your Code

Always use the centralized `appPaths` module:

```javascript
const appPaths = require('./appPaths');

// Get various paths
const dbPath = appPaths.getDatabasePath();
const nzbStoragePath = appPaths.getNZBStoragePath();
const mediaCacheDir = appPaths.getImageCacheDir();
const tempDir = appPaths.getTempDir();

// For specific media
const coverPath = appPaths.getCoverPath('movies', imdbId);
const backdropPath = appPaths.getBackdropPath('tv', tmdbId);
const logoPath = appPaths.getLogoPath('movies', imdbId, 'png');

// Get sharded NZB directory for a GUID
const nzbDir = appPaths.getShardedNZBDirectory(guid);  // Returns: nzbs/A/ for guid starting with 'A'
const nzbFile = appPaths.getNZBFilePath(guid);         // Full path: nzbs/A/guid.nzb.gz
```

### Adding New Data Directories

Edit `src/appPaths.js` and add methods like:

```javascript
getNewFeaturePath() {
  const basePath = this.getBaseDataPath();
  return path.join(basePath, 'new-feature');
}

// Then call in initializeDirectories()
initializeDirectories() {
  const dirs = [
    // ... existing dirs ...
    this.getNewFeaturePath(),
  ];
  // ...
}
```

### Database Path
- Location: `~/Library/Application Support/nzbarr-desktop/nzbarr.db`
- Files in use: `nzbarr.db`, `nzbarr.db-shm`, `nzbarr.db-wal`
- **Never delete these while app is running**

### NZB Storage
- Location: `~/Library/Application Support/nzbarr-desktop/nzbs/[A-Z0-9]/`
- Sharded by first character of NZB GUID
- Files: `{guid}.nzb.gz`

### Image Cache
- Location: `~/Library/Application Support/nzbarr-desktop/media-cache/`
- Structure: `{type}/{media_type}/{id}-{type}.{ext}`
- Types: covers, backdrops, logos, cutouts
- Media Types: movies, tv, music, books, games, xxx, collections

### Temp Directory
- Location: `~/Library/Application Support/nzbarr-desktop/temp/`
- Used for: temporary analysis files, downloads
- Safe to delete when app is not running

## User Guide

### Where is my data stored?

**macOS**: 
```
~/Library/Application Support/nzbarr-desktop/
```

**Windows**: 
```
C:\Users\[YourUsername]\AppData\Roaming\nzbarr-desktop\
```

**Linux**: 
```
~/.config/nzbarr-desktop/
```

### How do I reset/clear all data?

```bash
# macOS/Linux
rm -rf ~/Library/Application\ Support/nzbarr-desktop

# Windows (PowerShell)
Remove-Item -Recurse -Force $env:APPDATA\nzbarr-desktop

# Windows (Command Prompt)
rmdir /s /q %APPDATA%\nzbarr-desktop
```

Then restart the app - it will recreate everything fresh.

### How do I backup my data?

```bash
# macOS/Linux
cp -r ~/Library/Application\ Support/nzbarr-desktop ~/nzbarr-backup

# Then restore later:
rm -rf ~/Library/Application\ Support/nzbarr-desktop
cp -r ~/nzbarr-backup ~/Library/Application\ Support/nzbarr-desktop
```

### My data won't open. What do I do?

First, check if the data directory exists:

```bash
# macOS/Linux
ls ~/Library/Application\ Support/nzbarr-desktop/

# Windows
dir %APPDATA%\nzbarr-desktop\
```

If it doesn't exist, restart the app to recreate it. If it exists but is corrupted:

1. Backup: `cp -r ~/Library/Application\ Support/nzbarr-desktop ~/nzbarr-backup-corrupted`
2. Reset: `rm -rf ~/Library/Application\ Support/nzbarr-desktop`
3. Restart app

## Environment Variables

To override the default data path (advanced users only):

```javascript
// This will NOT be needed in production
process.env.NZBARR_DATA_PATH = '/custom/path';
```

But the app doesn't currently support this. If you need custom paths, modify `src/appPaths.js` and rebuild.

## Troubleshooting

**Problem**: Database is locked
- **Solution**: Make sure only one instance of NZBarr is running

**Problem**: Can't write to media-cache
- **Solution**: Check folder permissions: `chmod 755 ~/Library/Application\ Support/nzbarr-desktop`

**Problem**: NZB files are not being imported
- **Solution**: Verify `nzbs/` directory exists and is writable

**Problem**: Images aren't loading
- **Solution**: Check `media-cache/covers/`, `media-cache/backdrops/`, etc. directories exist

## File Sizes

Typical size of a fresh installation:

- Database: ~50KB (grows as you add releases)
- NZB files: Depends on imports (1-5MB per file typical)
- Media cache: Depends on how many covers you download (~200KB-2MB per image typically)
- Temp files: Cleaned up automatically (usually empty)

**Total for 1000 releases**: ~500MB - 2GB depending on cover image count
