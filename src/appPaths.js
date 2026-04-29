// NZBarr Desktop - Centralized Application Paths Manager
const path = require('path');
const fs = require('fs');

class AppPaths {
  constructor() {
    this.baseDataPath = null;
  }

  /**
   * Get the base data directory for all app data
   * Always uses electron's userData path.
   * This is reliable across all platforms and build types (dev and production)
   */
  getBaseDataPath() {
    if (this.baseDataPath) {
      return this.baseDataPath;
    }

    try {
      const { app } = require('electron');
      this.baseDataPath = app.getPath('userData');
    } catch (error) {
      console.error('Failed to get userData path from electron:', error);
      // Fallback if electron is not available (shouldn't happen in production)
      const os = require('os');
      this.baseDataPath = path.join(os.homedir(), '.nzbarr-desktop');
    }

    // Ensure base directory exists
    if (!fs.existsSync(this.baseDataPath)) {
      fs.mkdirSync(this.baseDataPath, { recursive: true });
    }

    console.log(`[AppPaths] Base data directory: ${this.baseDataPath}`);
    return this.baseDataPath;
  }

  /**
   * Get database file path
   */
  getDatabasePath() {
    const basePath = this.getBaseDataPath();
    return path.join(basePath, 'nzbarr.db');
  }

  /**
   * Get NZB storage directory (sharded by first character)
   */
  getNZBStoragePath() {
    const basePath = this.getBaseDataPath();
    return path.join(basePath, 'nzbs');
  }

  /**
   * Resolve the NZB storage directory.
   * If a custom nzbStoragePath setting is provided, use it; otherwise use the default app storage.
   */
  getResolvedNZBStoragePath(settings = {}) {
    const customPath = String(settings?.nzbStoragePath || '').trim();
    const storagePath = customPath || this.getNZBStoragePath();

    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    try {
      fs.accessSync(storagePath, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`NZB storage directory is not writable: ${storagePath}`);
    }

    return storagePath;
  }

  /**
   * Get sharded NZB directory for a specific file
   * @param {string} guid - The NZB GUID or filename
   * @returns {string} Path to sharded directory (e.g., nzbs/A/)
   */
  getShardedNZBDirectory(guid, settings = {}) {
    const basePath = this.getResolvedNZBStoragePath(settings);
    const value = String(guid || '').trim();
    const firstChar = value.charAt(0).toUpperCase();
    const shard = /[A-Z0-9]/.test(firstChar) ? firstChar : '0';
    return path.join(basePath, shard);
  }

  /**
   * Get NZB file path for a specific GUID
   * @param {string} guid - The NZB GUID
   * @returns {string} Full path to the NZB file
   */
  getNZBFilePath(name, settings = {}) {
    const safeName = String(name || 'unknown').trim();
    const shardDir = this.getShardedNZBDirectory(safeName, settings);
    return path.join(shardDir, `${safeName}.nzb`);
  }

  /**
   * Get image cache directory
   */
  getImageCacheDir() {
    const basePath = this.getBaseDataPath();
    return path.join(basePath, 'media-cache');
  }

  /**
   * Get cover image path
   * @param {string} mediaType - 'movies', 'tv', 'music', 'books', 'games', 'xxx', 'collections'
   * @param {string} id - The metadata ID
   * @param {string} extension - File extension (default: 'jpg')
   */
  getCoverPath(mediaType, id, extension = 'jpg') {
    const cacheDir = this.getImageCacheDir();
    const folder = mediaType || 'movies';
    return path.join(cacheDir, 'covers', folder, `${id}-cover.${extension}`);
  }

  /**
   * Get backdrop image path
   */
  getBackdropPath(mediaType, id, extension = 'jpg') {
    const cacheDir = this.getImageCacheDir();
    const folder = mediaType || 'movies';
    return path.join(cacheDir, 'backdrops', folder, `${id}-backdrop.${extension}`);
  }

  /**
   * Get logo image path
   */
  getLogoPath(mediaType, id, extension = 'png') {
    const cacheDir = this.getImageCacheDir();
    const folder = mediaType || 'movies';
    return path.join(cacheDir, 'logos', folder, `${id}-logo.${extension}`);
  }

  /**
   * Get cutout image path
   */
  getCutoutPath(mediaType, id, extension = 'png') {
    const cacheDir = this.getImageCacheDir();
    const folder = mediaType || 'movies';
    return path.join(cacheDir, 'cutouts', folder, `${id}-cutout.${extension}`);
  }

  /**
   * Get actor profile image cache directory
   */
  getActorCacheDir() {
    const cacheDir = this.getImageCacheDir();
    return path.join(cacheDir, 'actors');
  }

  /**
   * Get temporary directory for analysis work
   */
  getTempDir() {
    const basePath = this.getBaseDataPath();
    const tempDir = path.join(basePath, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    return tempDir;
  }

  /**
   * Initialize all required directories
   */
  initializeDirectories() {
    const dirs = [
      this.getBaseDataPath(),
      this.getNZBStoragePath(),
      this.getImageCacheDir(),
      this.getActorCacheDir(),
      path.join(this.getImageCacheDir(), 'covers'),
      path.join(this.getImageCacheDir(), 'backdrops'),
      path.join(this.getImageCacheDir(), 'logos'),
      path.join(this.getImageCacheDir(), 'cutouts'),
      path.join(this.getImageCacheDir(), 'actors'),
      this.getTempDir(),
    ];

    // Create media type subdirectories
    const mediaTypes = ['movies', 'tv', 'music', 'books', 'games', 'xxx', 'collections'];
    const subDirs = ['covers', 'backdrops', 'logos', 'cutouts'];

    for (const subDir of subDirs) {
      for (const mediaType of mediaTypes) {
        dirs.push(path.join(this.getImageCacheDir(), subDir, mediaType));
      }
    }

    // Create all sharded directories for NZBs (0-9, A-Z)
    for (let i = 0; i < 10; i++) {
      dirs.push(path.join(this.getNZBStoragePath(), i.toString()));
    }
    for (let charCode = 65; charCode <= 90; charCode++) {
      dirs.push(path.join(this.getNZBStoragePath(), String.fromCharCode(charCode)));
    }

    let created = 0;
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          created++;
        } catch (error) {
          console.error(`Failed to create directory ${dir}:`, error);
        }
      }
    }

    console.log(`[AppPaths] Initialized directories (${created} new directories created)`);
    return true;
  }
}

// Create singleton instance
const appPaths = new AppPaths();

module.exports = appPaths;
