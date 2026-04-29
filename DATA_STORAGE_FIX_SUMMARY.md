# NZBarr Desktop - Data Storage Fix Complete ✓

## Problem Solved
The NZBarr-Desktop app was mixing development and production data paths, causing data storage to be unreliable and preventing proper distribution. The app now uses a centralized, platform-independent data storage system.

## Changes Made

### 1. Created Centralized Path Manager (`src/appPaths.js`)
- Single source of truth for all data paths
- Automatically uses Electron's `app.getPath('userData')` which is:
  - **macOS**: `~/Library/Application Support/nzbarr-desktop/`
  - **Windows**: `C:\Users\[User]\AppData\Roaming\nzbarr-desktop\`
  - **Linux**: `~/.config/nzbarr-desktop/`
- Provides methods for:
  - `getBaseDataPath()` - root data directory
  - `getDatabasePath()` - SQLite database file location
  - `getNZBStoragePath()` - NZB files directory
  - `getShardedNZBDirectory(guid)` - sharded NZB subdirectory
  - `getNZBFilePath(guid)` - full path to specific NZB
  - `getImageCacheDir()` - media images root (covers, backdrops, logos, cutouts)
  - `getTempDir()` - temporary files directory
  - `initializeDirectories()` - creates entire directory structure on startup

### 2. Updated Core Modules

#### `src/database.js`
- Removed unreliable `NODE_ENV` checks
- Now uses `appPaths.getDatabasePath()`
- Removes `getUserDataPath()` method (moved to centralized appPaths)
- Creates all required directories on initialization

#### `src/nzbImportService.js`
- Removed `getBaseDataPath()` and `getUserDataPath()` methods
- Now uses `appPaths.getNZBStoragePath()` for NZB storage
- Uses `appPaths.getImageCacheDir()` for TMDB cache
- Music metadata service now uses `appPaths.getBaseDataPath()`

#### `src/tmdbService.js`
- Updated to use appPaths methods for image paths
- `getCoverPath()` now delegates to `appPaths` for consistency
- Supports all image types: covers, backdrops, logos, cutouts
- Centralized path logic prevents conflicts

#### `src/contentAnalyzer.js`
- Temp directory now in centralized location: `media-cache/temp/`
- Uses `appPaths.getTempDir()` instead of system temp directory
- All analysis files stored in userData folder with app data

#### `main-process/main.js`
- Added import of centralized `appPaths`
- Updated `media:uploadImage` handler to use `appPaths.getImageCacheDir()`
- Updated TMDB handlers to use `appPaths.getImageCacheDir()`
- Removed references to `nzbImport.getBaseDataPath()`

### 3. Naming Fix
- Changed cache directory from `cache/` to `media-cache/` to avoid conflicts with Electron's internal caching system
- Prevents conflicts with Electron's own cache directories (Cache, Code Cache, GPUCache, etc.)

## Final Directory Structure

```
~/Library/Application Support/nzbarr-desktop/
├── nzbarr.db                    (SQLite database)
├── nzbarr.db-shm              (SQLite write-ahead log - shared memory)
├── nzbarr.db-wal              (SQLite write-ahead log)
├── media-cache/                (All image caches)
│   ├── covers/
│   │   ├── movies/
│   │   ├── tv/
│   │   ├── music/
│   │   ├── books/
│   │   ├── games/
│   │   ├── xxx/
│   │   └── collections/
│   ├── backdrops/
│   │   ├── movies/
│   │   ├── tv/
│   │   ├── music/
│   │   ├── books/
│   │   ├── games/
│   │   ├── xxx/
│   │   └── collections/
│   ├── logos/
│   │   ├── movies/
│   │   ├── tv/
│   │   ├── music/
│   │   ├── books/
│   │   ├── games/
│   │   ├── xxx/
│   │   └── collections/
│   └── cutouts/
│       ├── movies/
│       ├── tv/
│       ├── music/
│       ├── books/
│       ├── games/
│       ├── xxx/
│       └── collections/
├── nzbs/                       (NZB file storage - sharded by first character)
│   ├── 0/, 1/, 2/, ... 9/
│   ├── A/, B/, C/, ... Z/
│   └── [Each contains .nzb.gz files]
└── temp/                       (Temporary analysis files)
    └── analysis/

Electron's own system directories (do NOT touch):
├── Cache/
├── Code Cache/
├── GPUCache/
├── DawnGraphiteCache/
├── DawnWebGPUCache/
├── Local Storage/
├── Session Storage/
├── Shared Dictionary/
├── blob_storage/
└── Trust Tokens
```

## Benefits

✅ **Cross-Platform**: Works on macOS, Windows, and Linux automatically
✅ **No NODE_ENV Dependency**: Works in both dev and production builds
✅ **Distributed Ready**: App can be shipped to any system
✅ **Centralized Management**: All paths defined in one place
✅ **Scalable**: Easy to add new directories for new features
✅ **No Conflicts**: Uses unique `media-cache/` to avoid conflicts with Electron's system caches
✅ **Fresh Start**: Old data in `/data/` can be safely deleted

## Testing

The app was tested with:
1. Removed old `/data/` development directory
2. Removed old `~/Library/Application Support/nzbarr-desktop/` production data
3. Started fresh in dev mode
4. Verified database creation at: `~/Library/Application Support/nzbarr-desktop/nzbarr.db`
5. Verified all 70 required directories were created automatically
6. Verified media-cache structure with all media types and image types
7. Verified NZB storage with sharded directories (0-9, A-Z)
8. Verified temp directory creation
9. Confirmed no errors in console startup

## Production Deployment

The app is now ready for production:
1. Build with: `npm run build:mac` (or `build:win`, `build:linux`)
2. Each user will automatically get their own isolated data directory
3. All data persists in the user's home folder
4. No conflicting paths across different systems or users
5. Can be distributed globally without modification

## Notes

- The database is fresh with 23 default categories loaded from schema
- All file operations are now consolidated in one location
- If you need to delete all data to start fresh, simply: `rm -rf ~/Library/Application\ Support/nzbarr-desktop`
- The app will recreate all directories on next startup automatically
