// NZBarr Desktop - Main Electron Process
const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const appPaths = require('../src/appPaths');
const nzbFileUtils = require('../src/nzbFileUtils');

// Local server for serving trailer pages and proxied stream playback.
let trailerServer = null;
let trailerServerPort = 0;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function proxyStreamRequest(req, res, streamId) {
  try {
    const streamUrl = await dataAccess.streamLibrary.getPlaybackUrl(streamId);
    if (!streamUrl) {
      res.writeHead(404);
      res.end('Stream not found');
      return;
    }

    const parsed = new URL(streamUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    if (req.headers['user-agent']) headers['User-Agent'] = req.headers['user-agent'];

    const upstream = client.request(parsed, { method: 'GET', headers }, upstreamRes => {
      const responseHeaders = { ...upstreamRes.headers };
      delete responseHeaders['set-cookie'];
      responseHeaders['Access-Control-Allow-Origin'] = '*';
      responseHeaders['Accept-Ranges'] = responseHeaders['accept-ranges'] || 'bytes';
      res.writeHead(upstreamRes.statusCode || 200, responseHeaders);
      upstreamRes.pipe(res);
    });

    upstream.on('error', error => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end(`Stream proxy failed: ${error.message}`);
    });

    req.on('close', () => upstream.destroy());
    upstream.end();
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Stream proxy failed');
  }
}

function startTrailerServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${trailerServerPort}`);
      if (url.pathname === '/trailer') {
        const videoId = String(url.searchParams.get('id') || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const title = escapeHtml(url.searchParams.get('title') || 'Trailer');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
          <html style="margin:0;padding:0;height:100%;background:#000;">
          <head><meta charset="utf-8"><title>${title}</title>
            <style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#000;}
            .embed-container{position:relative;width:100%;height:100%;}
            .embed-container iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;}</style>
          </head>
          <body><div class="embed-container">
            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=1"
              allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
              allowfullscreen></iframe>
          </div></body></html>`);
      } else if (url.pathname === '/stream') {
        const streamId = parseInt(url.searchParams.get('id') || '', 10);
        if (!Number.isFinite(streamId)) {
          res.writeHead(400);
          res.end('Invalid stream id');
          return;
        }
        proxyStreamRequest(req, res, streamId);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, '127.0.0.1', () => {
      trailerServerPort = server.address().port;
      console.log(`[Trailer] Local server started on http://127.0.0.1:${trailerServerPort}`);
      resolve();
    });

    trailerServer = server;
  });
}

const dataAccess = require('../src/index');
const { dialog } = require('electron');
const autoRefreshScheduler = require('../src/autoRefreshScheduler');
const fanartService = require('../src/fanartService');
const LicenseService = require('../src/licenseService');
const licenseService = new LicenseService(dataAccess.settings);

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

function readNZBForExport(nzbPath) {
  return nzbFileUtils.readNZBBuffer(nzbPath);
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

let mainWindow;
let collectionSyncScheduled = false;
let isForceQuitting = false;
let quitPromptInProgress = false;

// Expose mainWindow globally for IPC handlers and services that need to send events
global.mainWindow = null;

function sendOwnedRefreshProgress(releaseId, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('releases:ownedRefreshProgress', {
    releaseId,
    timestamp: new Date().toISOString(),
    ...payload
  });
}

function getPremiumFeatureError(feature) {
  const labels = {
    send_to_downloader: 'Sending releases to a downloader requires a Premium license.',
    bulk_actions: 'Batch selection and batch downloading require a Premium license.',
    auto_refresh: 'Auto Refresh requires a Premium license.',
    owned_refresh: 'Refreshing owned releases requires a Premium license.',
    edit_media_info: 'Editing movie and TV info requires a Premium license.',
    custom_artwork_upload: 'Uploading custom artwork requires a Premium license.',
    fanart_artwork: 'Fanart artwork selection requires a Premium license.',
    smart_preparation: 'Smart Preparation requires a Premium license.'
  };
  return labels[feature] || 'This feature requires a Premium license.';
}

async function enforceLicensedFeature(feature) {
  const status = await licenseService.getStatus();
  if (licenseService.canUseFeature(status, feature)) {
    return null;
  }

  return {
    success: false,
    error: getPremiumFeatureError(feature)
  };
}

async function enforcePremiumAccess(feature = 'premium') {
  const status = await licenseService.getStatus();
  if (status.status === 'active' || status.status === 'grace') {
    return null;
  }

  return {
    success: false,
    error: getPremiumFeatureError(feature)
  };
}

function sanitizeAssetFilename(filename) {
  const safeBase = path.basename(String(filename || ''))
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return safeBase || `asset-${Date.now()}.jpg`;
}

function resolveSafeMediaCachePath(subdir, mediaType, filename) {
  const allowedSubdirs = new Set(['covers', 'backdrops', 'logos']);
  const typeSubdir = String(subdir || '').toLowerCase();
  if (!allowedSubdirs.has(typeSubdir)) {
    throw new Error('Invalid image asset type');
  }

  const mediaSubdir = String(mediaType || '').toLowerCase() === 'tv' ? 'tv' : 'movies';
  const safeFilename = sanitizeAssetFilename(filename);
  const cacheRoot = appPaths.getImageCacheDir();
  const targetDir = path.resolve(cacheRoot, typeSubdir, mediaSubdir);
  const finalPath = path.resolve(targetDir, safeFilename);

  const relative = path.relative(targetDir, finalPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid image filename');
  }

  return { targetDir, finalPath };
}

function replaceReleaseNameIdTags(searchName, updates = {}) {
  let nextName = String(searchName || '');

  if (Object.prototype.hasOwnProperty.call(updates, 'imdb_id') && updates.imdb_id) {
    const imdbId = String(updates.imdb_id).trim();
    nextName = nextName.replace(/imdb-tt\d{7,9}/gi, `imdb-${imdbId}`);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'tmdb_id') && updates.tmdb_id) {
    const tmdbId = String(updates.tmdb_id).trim();
    nextName = nextName.replace(/tmdb-\d+/gi, `tmdb-${tmdbId}`);
  }

  return nextName;
}

function applyReleaseNameIdTagUpdates(release, fields = {}) {
  const baseSearchName = Object.prototype.hasOwnProperty.call(fields, 'search_name')
    ? fields.search_name
    : release?.search_name;

  if (!baseSearchName) {
    return {};
  }

  if (!Object.prototype.hasOwnProperty.call(fields, 'imdb_id')
    && !Object.prototype.hasOwnProperty.call(fields, 'tmdb_id')) {
    return {};
  }

  const updatedSearchName = replaceReleaseNameIdTags(baseSearchName, fields);
  return updatedSearchName !== baseSearchName
    ? { search_name: updatedSearchName }
    : {};
}

function assertPathInImageCache(targetPath) {
  const cacheRoot = path.resolve(appPaths.getImageCacheDir());
  const finalPath = path.resolve(String(targetPath || ''));
  const relative = path.relative(cacheRoot, finalPath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Destination path must stay inside image cache');
  }

  const allowedAssetRoots = ['covers', 'backdrops', 'logos'].map(part => path.join(cacheRoot, part));
  const allowed = allowedAssetRoots.some(root => {
    const rel = path.relative(root, finalPath);
    return !(rel.startsWith('..') || path.isAbsolute(rel));
  });
  if (!allowed) {
    throw new Error('Destination path is not in an allowed image asset folder');
  }
}

async function saveCollectionFromTMDB(collectionMeta) {
  if (!collectionMeta?.id) {
    return null;
  }

  const tmdbService = require('../src/tmdbService');
  const settings = await dataAccess.settings.getAll();
  if (!settings.api_tmdb_key) {
    return null;
  }

  const cacheDir = appPaths.getImageCacheDir();
  tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);

  let details = collectionMeta;
  try {
    details = await tmdbService.getPreferredCollectionData(collectionMeta.id);
  } catch (error) {
    console.warn(`[Collections] Falling back to partial TMDB collection data for ${collectionMeta.id}: ${error.message}`);
  }

  let posterPath = null;
  let backdropPath = null;

  if (details.preferred_poster_path) {
    const posterUrl = `${tmdbService.imageBaseUrl}w500${details.preferred_poster_path}`;
    const posterDest = appPaths.getCoverPath('collections', details.id, 'jpg');
    posterPath = await tmdbService.downloadCover(posterUrl, posterDest, 'jpg');
  }

  if (details.preferred_backdrop_path) {
    const backdropUrl = `${tmdbService.imageBaseUrl}w1280${details.preferred_backdrop_path}`;
    const backdropDest = appPaths.getBackdropPath('collections', details.id, 'jpg');
    backdropPath = await tmdbService.downloadCover(backdropUrl, backdropDest, 'jpg');
  }

  await dataAccess.collections.createOrUpdate({
    tmdb_id: details.id,
    name: details.name || collectionMeta.name || '',
    overview: details.overview || null,
    has_poster: !!posterPath,
    has_backdrop: !!backdropPath,
    has_logo: 0,
    poster_path: posterPath,
    backdrop_path: backdropPath,
    logo_path: null,
    raw_json: JSON.stringify(details)
  });

  return details.id;
}

async function initializeApp() {
  console.log('Initializing database...');
  await dataAccess.db.initialize();
  console.log('Database initialized successfully');
  setTimeout(async () => {
    try {
      const stats = await dataAccess.db.getStats();
      console.log('Database stats:', stats);
    } catch (error) {
      console.warn(`Database stats unavailable: ${error.message}`);
    }
  }, 1000);
}

async function syncExistingMovieCollections() {
  try {
    const settings = await dataAccess.settings.getAll();
    if (!settings.api_tmdb_key) {
      return;
    }

    const movies = await dataAccess.movieInfo.getAll();
    if (!movies || movies.length === 0) {
      return;
    }

    const processedCollectionIds = new Set();
    let updatedMovies = 0;
    let upsertedCollections = 0;

    for (const movie of movies) {
      if (!movie.raw_json) continue;

      let parsed;
      try {
        parsed = JSON.parse(movie.raw_json);
      } catch (error) {
        continue;
      }

      const collection = parsed?.belongs_to_collection;
      if (!collection?.id) continue;

      if (!movie.collection_id) {
        await dataAccess.movieInfo.update(movie.id, { collection_id: collection.id });
        updatedMovies++;
      }

      if (!processedCollectionIds.has(collection.id)) {
        const existingCollection = await dataAccess.collections.getByTMDB(collection.id);
        const beforeExists = !!existingCollection;
        await saveCollectionFromTMDB(collection);
        processedCollectionIds.add(collection.id);
        if (!beforeExists) {
          upsertedCollections++;
        }
      }
    }

    if (updatedMovies || upsertedCollections) {
      console.log(`[Collections] Backfilled ${updatedMovies} movie links and ${upsertedCollections} collection records from stored TMDB metadata`);
    }
  } catch (error) {
    console.warn(`[Collections] Backfill skipped: ${error.message}`);
  }
}

function scheduleCollectionSync() {
  if (collectionSyncScheduled) {
    return;
  }

  collectionSyncScheduled = true;
  setTimeout(async () => {
    console.log('[Collections] Starting background collection sync...');
    try {
      await syncExistingMovieCollections();
    } catch (error) {
      console.warn(`[Collections] Background sync failed: ${error.message}`);
    }
  }, 30000);
}

function createWindow() {
  console.log('Creating window...');
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = Math.round(screenWidth * 0.5);
  const windowHeight = Math.round(screenHeight * 0.95);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    title: 'NZBarr',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set the global reference
  global.mainWindow = mainWindow;

  // Disable caching only while actively developing. In normal use, cached artwork makes
  // startup much faster because covers and backdrops do not need to be re-read every time.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' } });
    });
  }

  mainWindow.loadFile('renderer/index.html');

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());

  mainWindow.on('closed', () => {
    console.log('Window closed event');
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

console.log('App starting...');

app.whenReady().then(async () => {
  console.log('App is ready');
  startTrailerServer().catch(error => {
    console.warn(`[Trailer] Local server failed to start: ${error.message}`);
  });
  await initializeApp();

  // Ensure actor cache directory exists
  const actorDir = appPaths.getActorCacheDir();
  if (!fs.existsSync(actorDir)) {
    fs.mkdirSync(actorDir, { recursive: true });
  }

  createWindow();
  scheduleCollectionSync();

  // Start the auto-refresh scheduler after a short delay to let the app settle
  setTimeout(async () => {
    const licenseError = await enforceLicensedFeature('auto_refresh');
    if (licenseError) {
      console.log('[AutoRefresh] Scheduler not started: premium license required');
      return;
    }

    console.log('[AutoRefresh] Starting scheduler...');
    autoRefreshScheduler.start();
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // macOS: handle files dropped onto the dock icon or opened via Finder
  app.on('open-file', async (event, filePath) => {
    event.preventDefault();
    if (filePath && mainWindow) {
      const nzbImportService = require('../src/nzbImportService');
      await nzbImportService.initialize();
      const result = await nzbImportService.importNZB(filePath);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:import-complete', {
          imported: result.success ? 1 : 0,
          failed: result.success ? 0 : 1,
          errors: result.success ? [] : [result.error]
        });
      }
    }
  });
});

app.on('will-quit', async () => {
  console.log('App shutting down, stopping scheduler and closing database...');
  autoRefreshScheduler.stop();
  await dataAccess.db.close();
});

app.on('before-quit', async (event) => {
  if (isForceQuitting) {
    return;
  }

  const activeJobs = autoRefreshScheduler.getActiveJobs();
  if (activeJobs.length === 0) {
    return;
  }

  event.preventDefault();

  if (quitPromptInProgress) {
    return;
  }

  quitPromptInProgress = true;
  try {
    const jobCount = activeJobs.length;
    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Cancel', 'Quit and discard refreshes'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      title: 'Auto Refresh in Progress',
      message: `Auto Refresh is still processing ${jobCount} release${jobCount !== 1 ? 's' : ''}.`,
      detail: 'Quitting now will stop tracking those refresh jobs and remove their temporary download files. NZBarr will try them again on the next start.'
    });

    if (result.response === 1) {
      isForceQuitting = true;
      await autoRefreshScheduler.abortActiveJobsAndCleanup();
      app.quit();
    }
  } catch (error) {
    console.error('Failed to handle quit prompt:', error);
  } finally {
    quitPromptInProgress = false;
  }
});

app.on('window-all-closed', () => {
  console.log('All windows closed - quitting');
  app.quit();
});

// IPC handlers
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:path', (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('app:copyToClipboard', async (event, text) => {
  try {
    clipboard.writeText(String(text || ''));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Database stats
ipcMain.handle('db:stats', async () => {
  return await dataAccess.db.getStats();
});

// Releases
ipcMain.handle('releases:getAll', async (event, options) => {
  return await dataAccess.releases.getAll(options);
});

ipcMain.handle('releases:getUniqueMovies', async (event, options) => {
  return await dataAccess.releases.getUniqueMovies(options);
});

ipcMain.handle('releases:getUniqueTV', async (event, options) => {
  return await dataAccess.releases.getUniqueTV(options);
});

// Library queries (enriched media items with metadata)
ipcMain.handle('library:getItems', async (event, options) => {
  return await dataAccess.releases.getLibrary(options || {});
});

ipcMain.handle('library:getGenres', async (event, mediaType) => {
  return await dataAccess.releases.getLibraryGenres(mediaType);
});

ipcMain.handle('library:getCounts', async () => {
  return await dataAccess.releases.getLibraryCounts();
});

ipcMain.handle('collections:getLibrary', async (event, options) => {
  return await dataAccess.collections.getLibraryCollections(options || {});
});

ipcMain.handle('collections:getByTMDB', async (event, tmdbId) => {
  return await dataAccess.collections.getCollectionDetail(tmdbId);
});

// Upload image file (base64) and save to cache
ipcMain.handle('media:uploadImage', async (event, imageData) => {
  try {
    const fs = require('fs');

    if (!imageData || !imageData.data || !imageData.type || !imageData.subdir || !imageData.filename) {
      return { success: false, error: 'Missing image data' };
    }

    const { targetDir, finalPath } = resolveSafeMediaCachePath(
      imageData.subdir,
      imageData.mediaType,
      imageData.filename
    );
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // Decode base64 and write file
    const base64Data = imageData.data.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(finalPath, Buffer.from(base64Data, 'base64'));

    return { success: true, path: finalPath };
  } catch (error) {
    console.error('Failed to upload image:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('media:downloadImageToPath', async (event, params) => {
  try {
    const licenseError = await enforceLicensedFeature('fanart_artwork');
    if (licenseError) {
      return licenseError;
    }

    const { url, destPath } = params || {};
    if (!url || !destPath) {
      return { success: false, error: 'Missing image URL or destination path' };
    }
    assertPathInImageCache(destPath);

    const tmdbService = require('../src/tmdbService');
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize('unused', cacheDir);

    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    const downloadedPath = await tmdbService.downloadImage(url, destPath);
    return { success: true, path: downloadedPath };
  } catch (error) {
    console.error('Failed to download image to path:', error);
    return { success: false, error: error.message };
  }
});

// Create movie info entry
ipcMain.handle('media:createMovie', async (event, movieData) => {
  try {
    await dataAccess.movieInfo.createOrUpdate(movieData);
    return { success: true };
  } catch (error) {
    console.error('Failed to create movie:', error);
    return { success: false, error: error.message };
  }
});

// Create TV info entry
ipcMain.handle('media:createTV', async (event, tvData) => {
  try {
    await dataAccess.tvInfo.createOrUpdate(tvData);
    return { success: true };
  } catch (error) {
    console.error('Failed to create TV:', error);
    return { success: false, error: error.message };
  }
});

// Get all library items (movies + TV) for dropdown
ipcMain.handle('library:getAllForDropdown', async () => {
  try {
    const db = require('../src/database');
    const movies = db.all("SELECT id, imdb_id, tmdb_id, title, release_date, 'movie' as media_type FROM movie_info WHERE imdb_id IS NOT NULL OR tmdb_id IS NOT NULL ORDER BY title");
    const tvShows = db.all("SELECT id, imdb_id, tmdb_id, title, first_air_date as release_date, 'tv' as media_type FROM tv_info WHERE imdb_id IS NOT NULL OR tmdb_id IS NOT NULL ORDER BY title");
    return { success: true, items: [...movies, ...tvShows] };
  } catch (error) {
    console.error('Failed to get library dropdown:', error);
    return { success: false, error: error.message, items: [] };
  }
});

ipcMain.handle('library:searchLinkedMedia', async (event, query, options = {}) => {
  try {
    const db = require('../src/database');
    const rawQuery = String(query || '').trim();
    if (!rawQuery) {
      return { success: true, items: [] };
    }

    const yearMatch = rawQuery.match(/\((\d{4})\)\s*$/);
    const year = options.year || (yearMatch ? yearMatch[1] : null);
    const mediaType = String(options.mediaType || '').toLowerCase();
    const titleQuery = rawQuery
      .replace(/\s*\(\d{4}\)\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizeTokens = (value) => String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);
    const normalizedExpr = (column) => `LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), ':', ' '), '.', ' '), '-', ' '), '_', ' '), '''', ' '), '&', ' and '))`;
    const buildSearch = (columns, params) => {
      const tokens = normalizeTokens(titleQuery);
      if (tokens.length === 0) return '1=1';
      return tokens.map(token => {
        const clause = columns.map(column => `${normalizedExpr(column)} LIKE ?`).join(' OR ');
        columns.forEach(() => params.push(`%${token}%`));
        return `(${clause})`;
      }).join(' AND ');
    };
    const searchMovies = mediaType !== 'tv';
    const searchTV = mediaType !== 'movie';
    const movieParams = [];
    const tvParams = [];
    const movieSearchClause = buildSearch(['title', 'original_title'], movieParams);
    const tvSearchClause = buildSearch(['title', 'original_name'], tvParams);

    const movieRows = searchMovies ? db.all(`
      SELECT
        id,
        imdb_id,
        tmdb_id,
        title,
        original_title,
        release_date,
        cover_path,
        backdrop_path,
        logo_path,
        'movie' as media_type
      FROM movie_info
      WHERE ${movieSearchClause}
        ${year ? 'AND SUBSTR(COALESCE(release_date, \'\'), 1, 4) = ?' : ''}
      ORDER BY
        CASE WHEN LOWER(title) = LOWER(?) THEN 0 ELSE 1 END,
        CASE WHEN LOWER(original_title) = LOWER(?) THEN 0 ELSE 1 END,
        CASE WHEN LOWER(title) LIKE LOWER(?) THEN 0 ELSE 1 END,
        title ASC
      LIMIT 20
    `, year ? [...movieParams, year, titleQuery, titleQuery, `%${titleQuery}%`] : [...movieParams, titleQuery, titleQuery, `%${titleQuery}%`]) : [];

    const tvRows = searchTV ? db.all(`
      SELECT
        id,
        imdb_id,
        tmdb_id,
        title,
        original_name,
        first_air_date as release_date,
        cover_path,
        backdrop_path,
        logo_path,
        'tv' as media_type
      FROM tv_info
      WHERE ${tvSearchClause}
        ${year ? 'AND SUBSTR(COALESCE(first_air_date, \'\'), 1, 4) = ?' : ''}
      ORDER BY
        CASE WHEN LOWER(title) = LOWER(?) THEN 0 ELSE 1 END,
        CASE WHEN LOWER(original_name) = LOWER(?) THEN 0 ELSE 1 END,
        CASE WHEN LOWER(title) LIKE LOWER(?) THEN 0 ELSE 1 END,
        title ASC
      LIMIT 20
    `, year ? [...tvParams, year, titleQuery, titleQuery, `%${titleQuery}%`] : [...tvParams, titleQuery, titleQuery, `%${titleQuery}%`]) : [];

    const items = [...movieRows, ...tvRows].map(item => ({
      ...item,
      cover_path: item.cover_path || null,
      backdrop_path: item.backdrop_path || null,
      logo_path: item.logo_path || null
    })).slice(0, 20);

    return { success: true, items };
  } catch (error) {
    console.error('Failed to search linked media:', error);
    return { success: false, error: error.message, items: [] };
  }
});

// Link NZB files to a specific media entry
ipcMain.handle('media:linkNZBs', async (event, mediaData) => {
  try {
    const fs = require('fs');
    const pathModule = require('path');
    const db = require('../src/database');

    const { imdbId, tmdbId, mediaType, nzbPaths } = mediaData;

    // Fetch cover/backdrop/logo from the media info tables
    let coverPath = null, backdropPath = null, logoPath = null;
    if (mediaType === 'movie' && imdbId) {
      const info = db.get('SELECT cover_path, backdrop_path, logo_path FROM movie_info WHERE imdb_id = ?', [imdbId]);
      if (info) {
        coverPath = info.cover_path;
        backdropPath = info.backdrop_path;
        logoPath = info.logo_path;
      }
    } else if (mediaType === 'tv' && tmdbId) {
      const info = db.get('SELECT cover_path, backdrop_path, logo_path FROM tv_info WHERE tmdb_id = ?', [tmdbId]);
      if (info) {
        coverPath = info.cover_path;
        backdropPath = info.backdrop_path;
        logoPath = info.logo_path;
      }
    } else if (mediaType === 'movie' && tmdbId) {
      const info = db.get('SELECT cover_path, backdrop_path, logo_path FROM movie_info WHERE tmdb_id = ?', [tmdbId]);
      if (info) {
        coverPath = info.cover_path;
        backdropPath = info.backdrop_path;
        logoPath = info.logo_path;
      }
    } else if (mediaType === 'tv' && imdbId) {
      const info = db.get('SELECT cover_path, backdrop_path, logo_path FROM tv_info WHERE imdb_id = ?', [imdbId]);
      if (info) {
        coverPath = info.cover_path;
        backdropPath = info.backdrop_path;
        logoPath = info.logo_path;
      }
    }

    await dataAccess.nzbImport.initialize();
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const nzbPath of nzbPaths) {
      try {
        const result = await dataAccess.nzbImport.importNZB(nzbPath);
        if (result?.success && result.releaseId) {
          // Update the release with the media IDs and cover images
          await dataAccess.releases.update(result.releaseId, {
            imdb_id: imdbId || null,
            tmdb_id: tmdbId ? parseInt(tmdbId) : null,
            media_type: mediaType,
            cover_image: coverPath,
            backdrop_path: backdropPath,
            logo_path: logoPath
          });

          imported++;
        } else {
          failed++;
          errors.push(`${pathModule.basename(nzbPath)}: ${result?.error || 'Unknown error'}`);
        }
      } catch (e) {
        const errorMsg = e.message || 'Unknown error';
        errors.push(`${pathModule.basename(nzbPath)}: ${errorMsg}`);
        failed++;
      }
    }

    return { success: true, imported, failed, errors };
  } catch (error) {
    console.error('Failed to link NZBs:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('releases:getRecentlyAdded', async (event, options) => {
  return await dataAccess.releases.getRecentlyAdded(options || {});
});

ipcMain.handle('releases:getRefreshHighlights', async (event, limit) => {
  return await dataAccess.releases.getRefreshHighlights(limit || 6);
});

ipcMain.handle('releases:getById', async (event, id) => {
  return await dataAccess.releases.getById(id);
});

ipcMain.handle('releases:getRecent', async (event, limit) => {
  return await dataAccess.releases.getRecent(limit || 20);
});

ipcMain.handle('releases:search', async (event, query, options) => {
  return await dataAccess.releases.search(query, options);
});

ipcMain.handle('releases:create', async (event, release) => {
  return await dataAccess.releases.create(release);
});

ipcMain.handle('releases:delete', async (event, id) => {
  return await dataAccess.releases.delete(id);
});

ipcMain.handle('streams:importUrls', async (event, urls) => {
  try {
    if (!Array.isArray(urls)) {
      return { success: false, error: 'Expected a list of stream URLs' };
    }
    return await dataAccess.streamLibrary.importUrls(urls);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streams:importUrlFile', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Stream URL Text File',
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'list', 'm3u', 'strm'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths?.length) {
      return { success: false, canceled: true };
    }

    return await dataAccess.streamLibrary.importTextFile(result.filePaths[0]);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streams:list', async (event, options) => {
  return dataAccess.streamLibrary.list(options || {});
});

ipcMain.handle('streams:getForMedia', async (event, media) => {
  try {
    return dataAccess.streamLibrary.listForMedia(media || {});
  } catch (error) {
    return [];
  }
});

ipcMain.handle('streams:discoverEasynewsMovie', async (event, media) => {
  try {
    return await dataAccess.streamLibrary.discoverEasynewsMovieStreams(media || {});
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streams:counts', async () => {
  return dataAccess.streamLibrary.getCounts();
});

ipcMain.handle('streams:updateFlags', async (event, id, fields) => {
  return dataAccess.streamLibrary.updateFlags(id, fields || {});
});

ipcMain.handle('streams:delete', async (event, id) => {
  try {
    return dataAccess.streamLibrary.delete(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streams:refreshMetadata', async (event, id = null) => {
  try {
    return await dataAccess.streamLibrary.refreshMetadata(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('streams:getInternalUrl', async (event, id) => {
  if (!trailerServerPort) {
    return { success: false, error: 'Local playback server is not ready' };
  }
  return {
    success: true,
    url: `http://127.0.0.1:${trailerServerPort}/stream?id=${encodeURIComponent(String(id))}`
  };
});

ipcMain.handle('streams:play', async (event, id) => {
  try {
    return await dataAccess.streamLibrary.play(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open URL in default browser (for trailers)
ipcMain.handle('app:openExternal', async (event, url) => {
  return await shell.openExternal(url);
});

// Select a folder (for download path setting)
ipcMain.handle('app:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Download Folder',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths?.length) return { canceled: true };
  return { canceled: false, path: result.filePaths[0] };
});

// Select an executable file (for tool path settings)
ipcMain.handle('app:selectExecutable', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Executable File',
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths?.length) return { canceled: true };
  return { canceled: false, path: result.filePaths[0] };
});

// Select multiple NZB files (for Link NZBs page)
ipcMain.handle('app:selectNZBFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select NZB Files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'NZB Files', extensions: ['nzb'] }]
  });
  return { canceled: result.canceled, filePaths: result.filePaths };
});

// Return a local trailer page URL for the renderer to show inside NZBarr.
ipcMain.handle('app:openTrailer', async (event, videoId, title) => {
  try {
    if (trailerServerPort === 0) {
      return { success: false, error: 'Trailer server not ready' };
    }

    const safeVideoId = String(videoId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeVideoId) {
      return { success: false, error: 'Invalid trailer id' };
    }

    const trailerUrl = `http://127.0.0.1:${trailerServerPort}/trailer?id=${safeVideoId}&title=${encodeURIComponent(title || 'Trailer')}`;
    return { success: true, url: trailerUrl };
  } catch (error) {
    console.error('Failed to prepare trailer:', error);
    return { success: false, error: error.message };
  }
});

// Download NZB file for a release
ipcMain.handle('releases:downloadNZB', async (event, id) => {
  try {
    const { dialog } = require('electron');
    const fs = require('fs');
    const pathModule = require('path');

    const release = await dataAccess.releases.getById(id);
    if (!release) return { success: false, error: 'Release not found' };
    if (!release.nzb_file_path || !fs.existsSync(release.nzb_file_path)) {
      return { success: false, error: 'NZB file not found on disk' };
    }

    const settings = await dataAccess.settings.getAll();
    const defaultPath = settings.download_path;
    const defaultName = release.search_name ? `${release.search_name}.nzb` : `${release.clean_name}.nzb`;

    if (defaultPath && fs.existsSync(defaultPath)) {
      const destPath = pathModule.join(defaultPath, defaultName);
      if (!fs.existsSync(destPath)) {
        fs.writeFileSync(destPath, readNZBForExport(release.nzb_file_path));
        return { success: true, path: destPath };
      } else {
        const { filePath: savePath } = await dialog.showSaveDialog(mainWindow, {
          title: 'Save NZB File',
          defaultPath: defaultName,
          filters: [{ name: 'NZB Files', extensions: ['nzb'] }]
        });
        if (!savePath) return { success: false, canceled: true };
        fs.writeFileSync(savePath, readNZBForExport(release.nzb_file_path));
        return { success: true, path: savePath };
      }
    } else {
      const { filePath: savePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save NZB File',
        defaultPath: defaultName,
        filters: [{ name: 'NZB Files', extensions: ['nzb'] }]
      });
      if (!savePath) return { success: false, canceled: true };
      fs.writeFileSync(savePath, readNZBForExport(release.nzb_file_path));
      return { success: true, path: savePath };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Batch download NZB files to a single folder
ipcMain.handle('releases:downloadNZBBatch', async (event, ids) => {
  try {
    const licenseError = await enforceLicensedFeature('bulk_actions');
    if (licenseError) {
      return licenseError;
    }

    const { dialog } = require('electron');
    const fs = require('fs');
    const pathModule = require('path');

    const { filePaths: folderPaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Destination Folder',
      properties: ['openDirectory']
    });

    if (!folderPaths || folderPaths.length === 0) return { success: false, canceled: true };

    const destFolder = folderPaths[0];
    let copied = 0;

    for (const id of ids) {
      const release = await dataAccess.releases.getById(id);
      if (!release || !release.nzb_file_path || !fs.existsSync(release.nzb_file_path)) continue;

      const safeName = (release.search_name || release.clean_name || `release_${id}`)
        .replace(/[^a-zA-Z0-9._\-\s\[\]()]/g, '_')
        .trim();
      const destPath = pathModule.join(destFolder, `${safeName}.nzb`);

      fs.writeFileSync(destPath, readNZBForExport(release.nzb_file_path));
      copied++;
    }

    return { success: true, count: copied, path: destFolder };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('releases:sendToDownloader', async (event, releaseId, requestedDownloader) => {
  try {
    const licenseError = await enforceLicensedFeature('send_to_downloader');
    if (licenseError) {
      return licenseError;
    }

    const release = await dataAccess.releases.getById(releaseId);
    if (!release) {
      return { success: false, error: 'Release not found' };
    }

    if (!release.nzb_file_path || !fs.existsSync(release.nzb_file_path)) {
      return { success: false, error: 'NZB file not found on disk' };
    }

    const settings = await dataAccess.settings.getAll();
    const result = await dataAccess.downloadDispatch.sendRelease(release, settings, requestedDownloader || 'preferred');

    return {
      success: true,
      downloader: result.downloader,
      response: result.response
    };
  } catch (error) {
    console.error('Failed to send release to downloader:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('downloader:testConnection', async (event, requestedDownloader, settingsOverride) => {
  try {
    const settings = {
      ...(await dataAccess.settings.getAll()),
      ...(settingsOverride || {})
    };
    const result = await dataAccess.downloadDispatch.testConnection(settings, requestedDownloader || 'preferred');
    return { success: true, ...result };
  } catch (error) {
    console.error('Downloader connection test failed:', error);
    return { success: false, error: error.message };
  }
});

// Auto Refresh IPC handlers
ipcMain.handle('autoRefresh:getStatus', async () => {
  const settings = await dataAccess.settings.getAll();
  return {
    enabled: settings.auto_refresh_enabled === '1',
    interval: settings.auto_refresh_interval || 'weekly',
    ageThreshold: parseInt(settings.auto_refresh_age_threshold || '1', 10),
    mode: settings.auto_refresh_mode || 'replace',
    activeJobs: autoRefreshScheduler.getActiveJobs()
  };
});

ipcMain.handle('autoRefresh:start', async () => {
  try {
    const licenseError = await enforceLicensedFeature('auto_refresh');
    if (licenseError) {
      return licenseError;
    }
    autoRefreshScheduler.start();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('autoRefresh:stop', async () => {
  try {
    const licenseError = await enforceLicensedFeature('auto_refresh');
    if (licenseError) {
      return licenseError;
    }
    autoRefreshScheduler.stop();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('autoRefresh:triggerManual', async (event, releaseId) => {
  try {
    const licenseError = await enforceLicensedFeature('owned_refresh');
    if (licenseError) {
      return licenseError;
    }
    const settings = await dataAccess.settings.getAll();
    const result = await autoRefreshScheduler.triggerManualRefresh(releaseId, settings);
    return result;
  } catch (error) {
    console.error('Manual auto-refresh failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('autoRefresh:queueManual', async (event, releaseId) => {
  try {
    const licenseError = await enforceLicensedFeature('owned_refresh');
    if (licenseError) {
      return licenseError;
    }
    const settings = await dataAccess.settings.getAll();
    return await autoRefreshScheduler.queueManualRefresh(releaseId, settings);
  } catch (error) {
    console.error('Failed to queue manual refresh:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('autoRefresh:queueManualBatch', async (event, releaseIds) => {
  try {
    const licenseError = await enforceLicensedFeature('owned_refresh');
    if (licenseError) {
      return licenseError;
    }
    const settings = await dataAccess.settings.getAll();
    return await autoRefreshScheduler.queueManualRefreshBatch(releaseIds, settings);
  } catch (error) {
    console.error('Failed to queue manual refresh batch:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('autoRefresh:runQueued', async () => {
  try {
    const licenseError = await enforceLicensedFeature('owned_refresh');
    if (licenseError) {
      return licenseError;
    }
    const settings = await dataAccess.settings.getAll();
    return autoRefreshScheduler.startQueuedRefreshes(settings);
  } catch (error) {
    console.error('Failed to start refresh queue:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('autoRefresh:getQueued', async () => {
  return {
    success: true,
    queued: autoRefreshScheduler.getQueuedRefreshes(),
    count: autoRefreshScheduler.getQueuedRefreshCount()
  };
});

ipcMain.handle('autoRefresh:getActiveJobs', async () => {
  return autoRefreshScheduler.getActiveJobs();
});

ipcMain.handle('releases:deleteAllForMovie', async (event, tmdbId, imdbId, mediaType = 'movie') => {
  try {
    // Get all releases for this movie
    const releases = await dataAccess.releases.getByMovieId(tmdbId, imdbId, mediaType);
    
    // Delete each release (this handles NZB files and images)
    for (const release of releases) {
      await dataAccess.releases.delete(release.id);
    }
    
    console.log(`  ✓ Deleted ${releases.length} releases for movie`);
    return { success: true, count: releases.length };
  } catch (error) {
    console.error('Failed to delete movie releases:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('releases:getByMovie', async (event, tmdbId, imdbId, mediaType = null) => {
  return await dataAccess.releases.getByMovieId(tmdbId, imdbId, mediaType);
});

// Settings
ipcMain.handle('settings:getAll', async () => {
  return await dataAccess.settings.getAll();
});

ipcMain.handle('settings:getNNTP', async () => {
  return await dataAccess.settings.getNNTPSettings();
});

ipcMain.handle('settings:saveNNTP', async (event, settings) => {
  return await dataAccess.settings.updateNNTPSettings(settings);
});

ipcMain.handle('settings:saveAll', async (event, settings) => {
  try {
    const result = await dataAccess.settings.setMany(settings);
    console.log('Settings saved successfully');
    return result;
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
});

ipcMain.handle('pipeline:run', async (event, options) => {
  try {
    const licenseError = await enforcePremiumAccess('smart_preparation');
    if (licenseError) {
      return licenseError;
    }
    return await dataAccess.importPreparation.runConfigured(options || {});
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('license:getStatus', async () => {
  return await licenseService.getStatus();
});

ipcMain.handle('support:getDiagnostics', async () => {
  try {
    const status = await licenseService.getStatus();
    const settings = await dataAccess.settings.getMany([
      'license_signature_verified',
      'license_response_key_id',
      'license_response_alg',
      'license_signed_payload'
    ]);

    let serverHost = '';
    try {
      serverHost = status.serverUrl ? new URL(status.serverUrl).host : '';
    } catch (error) {
      serverHost = status.serverUrl || '';
    }

    const key = status.key || '';
    const keyPreview = key.length > 8
      ? `${key.slice(0, 4)}...${key.slice(-4)}`
      : (key ? 'set' : 'not-set');

    return {
      success: true,
      diagnostics: {
        generatedAt: new Date().toISOString(),
        app: {
          name: 'NZBarr',
          version: app.getVersion(),
          platform: process.platform,
          arch: process.arch,
          osRelease: os.release()
        },
        license: {
          status: status.status || 'free',
          storedStatus: status.storedStatus || '',
          plan: status.plan || 'free',
          featureCount: Array.isArray(status.features) ? status.features.length : 0,
          hasKey: !!status.key,
          keyPreview,
          machineIdPreview: status.machineId ? `${status.machineId.slice(0, 8)}...` : '',
          serverHost,
          lastValidatedAt: status.lastValidatedAt || '',
          expiresAt: status.expiresAt || '',
          graceUntil: status.graceUntil || '',
          message: status.message || '',
          signature: {
            verified: settings.license_signature_verified === '1',
            keyId: settings.license_response_key_id || '',
            algorithm: settings.license_response_alg || '',
            hasSignedPayload: !!settings.license_signed_payload
          }
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('license:activate', async (event, params) => {
  try {
    return {
      success: true,
      status: await licenseService.activateLicense({
        key: params?.key,
        serverUrl: params?.serverUrl,
        appVersion: app.getVersion(),
        platform: process.platform
      })
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('license:refresh', async () => {
  try {
    return {
      success: true,
      status: await licenseService.refreshLicense({
        appVersion: app.getVersion(),
        platform: process.platform
      })
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('license:clear', async () => {
  try {
    return {
      success: true,
      status: await licenseService.clearLicense()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Re-analyze release
ipcMain.handle('releases:reanalyze', async (event, releaseId) => {
  try {
    // Get release info
    const release = await dataAccess.releases.getById(releaseId);
    if (!release || !release.nzb_file_path) {
      return { success: false, error: 'Release or NZB file not found' };
    }

    // Get NNTP settings
    const nntpSettings = await dataAccess.settings.getNNTPSettings();
    if (!nntpSettings.server || !nntpSettings.username) {
      return { success: false, error: 'NNTP server not configured. Go to Settings and configure your Usenet provider.' };
    }

    const allSettings = await dataAccess.settings.getAll();

    // Parse NZB file
    const nzbParser = require('../src/nzbParser');
    const nzbData = await nzbParser.parseNZBFile(release.nzb_file_path);

    // Run content analysis
    const contentAnalyzer = require('../src/contentAnalyzer');
    await dataAccess.nzbImport.initialize();

    try {
      const analysisResult = await contentAnalyzer.analyzeRelease(
        release.nzb_file_path,
        nzbData,
        {
          nntp_server: nntpSettings.server,
          nntp_port: String(nntpSettings.port),
          nntp_username: nntpSettings.username,
          nntp_password: nntpSettings.password,
          nntp_ssl: nntpSettings.ssl ? '1' : '0',
          reanalyze_download_mb: allSettings.reanalyze_download_mb,
          release_password: release.password || null
        },
        (progress) => {
          console.log(`  Analysis progress: ${progress.type} - ${progress.segment}/${progress.total}`);
        }
      );
      console.log('  Analysis result:', JSON.stringify(analysisResult, null, 2));

      // Update release with results — all mediainfo fields
      const updates = {};
      if (analysisResult.password) updates.password = analysisResult.password;
      if (analysisResult.nfoText) updates.nfo_text = analysisResult.nfoText;
      if (analysisResult.mediainfoRaw) updates.mediainfo_raw = analysisResult.mediainfoRaw;
      if (analysisResult.resolution) updates.resolution = analysisResult.resolution;
      if (analysisResult.videoCodec) updates.video_codec = analysisResult.videoCodec;
      if (analysisResult.audioCodec) updates.audio_codec = analysisResult.audioCodec;
      if (analysisResult.audioChannels) updates.audio_channels = analysisResult.audioChannels;
      if (analysisResult.format) updates.format = analysisResult.format;
      if (analysisResult.subtitles) updates.subtitles = analysisResult.subtitles;
      // New detailed fields
      if (analysisResult.bitDepth) updates.bit_depth = analysisResult.bitDepth;
      if (analysisResult.hdrFormat) updates.hdr_format = analysisResult.hdrFormat;
      if (analysisResult.frameRate) updates.frame_rate = analysisResult.frameRate;
      if (analysisResult.audioBitrate) updates.audio_bitrate = analysisResult.audioBitrate;
      if (analysisResult.audioSampleRate) updates.audio_sample_rate = analysisResult.audioSampleRate;
      if (analysisResult.aspectRatio) updates.aspect_ratio = analysisResult.aspectRatio;
      if (analysisResult.overallBitrate) updates.overall_bitrate = analysisResult.overallBitrate;
      if (analysisResult.videoBitrate) updates.video_bitrate = analysisResult.videoBitrate;
      if (analysisResult.videoProfile) updates.video_profile = analysisResult.videoProfile;
      if (analysisResult.scanType) updates.scan_type = analysisResult.scanType;
      if (analysisResult.chromaSubsampling) updates.chroma_subsampling = analysisResult.chromaSubsampling;
      if (analysisResult.colorPrimaries) updates.color_primaries = analysisResult.colorPrimaries;
      if (analysisResult.durationMs) updates.duration_ms = analysisResult.durationMs;
      if (analysisResult.fileSize) updates.size = analysisResult.fileSize;

      console.log('  Fields to update:', Object.keys(updates).length > 0 ? Object.keys(updates).join(', ') : 'NONE');

      if (Object.keys(updates).length > 0) {
        await dataAccess.releases.update(releaseId, updates);
        return { success: true, result: analysisResult, updated: Object.keys(updates).length };
      }

      return {
        success: true,
        result: analysisResult,
        updated: 0,
        message: 'Analysis completed but no new metadata was found.'
      };
    } catch (analysisError) {
      console.error('  Analysis error:', analysisError.message);
      return { success: false, error: analysisError.message };
    }
  } catch (error) {
    console.error('Re-analysis failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('releases:refreshOwned', async (event, releaseId) => {
  try {
    const licenseError = await enforceLicensedFeature('owned_refresh');
    if (licenseError) {
      return licenseError;
    }

    const release = await dataAccess.releases.getById(releaseId);
    if (!release) {
      return { success: false, error: 'Release not found' };
    }

    if (release.ownership_type !== 'owned') {
      return { success: false, error: 'Refresh is only available for releases marked as Owned Media' };
    }

    const allSettings = await dataAccess.settings.getAll();
    if (!allSettings.nntp_server || !allSettings.nntp_username || !allSettings.nntp_password) {
      return { success: false, error: 'NNTP server settings are incomplete' };
    }

    await dataAccess.releases.update(releaseId, {
      refresh_status: 'running',
      last_refresh_error: null
    });

    sendOwnedRefreshProgress(releaseId, {
      step: 'starting',
      message: 'Starting owned media refresh'
    });

    const result = await dataAccess.releaseRefresh.refreshOwnedRelease(release, allSettings, (progress) => {
      console.log(`[Refresh ${releaseId}] ${progress.step}: ${progress.message}`);
      sendOwnedRefreshProgress(releaseId, progress);
    });

    const ngPostUploader = require('../src/ngPostUploader');
    const refreshedRelease = {
      ...release,
      resolution: result.mediaInfo?.resolution || release.resolution,
      video_codec: result.mediaInfo?.videoCodec || release.video_codec,
      audio_codec: result.mediaInfo?.audioCodec || release.audio_codec,
      audio_channels: result.mediaInfo?.audioChannels || release.audio_channels,
      format: result.mediaInfo?.format || release.format,
      subtitles: result.mediaInfo?.subtitles || release.subtitles,
      hdr_format: result.mediaInfo?.hdrFormat || release.hdr_format
    };

    const renamedNzbPath = ngPostUploader.renameExistingNZBToPreparedPattern(refreshedRelease, result.mediaInfo, 'replace');

    const updates = {
      refresh_status: 'completed',
      last_refresh_at: new Date().toISOString(),
      last_refresh_error: null
    };

    if (result.mediaInfo?.mediainfoRaw) updates.mediainfo_raw = result.mediaInfo.mediainfoRaw;
    if (result.mediaInfo?.resolution) updates.resolution = result.mediaInfo.resolution;
    if (result.mediaInfo?.videoCodec) updates.video_codec = result.mediaInfo.videoCodec;
    if (result.mediaInfo?.audioCodec) updates.audio_codec = result.mediaInfo.audioCodec;
    if (result.mediaInfo?.audioChannels) updates.audio_channels = result.mediaInfo.audioChannels;
    if (result.mediaInfo?.format) updates.format = result.mediaInfo.format;
    if (result.mediaInfo?.subtitles) updates.subtitles = result.mediaInfo.subtitles;
    if (result.mediaInfo?.hdrFormat) updates.hdr_format = result.mediaInfo.hdrFormat;
    if (renamedNzbPath && renamedNzbPath !== release.nzb_file_path) {
      updates.nzb_file_path = renamedNzbPath;
      updates.search_name = nzbFileUtils.stripStoredGUIDPrefix(
        nzbFileUtils.stripNZBExtension(path.basename(renamedNzbPath))
      );
    }

    await dataAccess.releases.update(releaseId, updates);

    sendOwnedRefreshProgress(releaseId, {
      step: 'completed',
      message: 'Owned media refresh completed successfully'
    });

    return {
      success: true,
      mediaFile: result.mediaFile,
      updated: Object.keys(updates)
    };
  } catch (error) {
    console.error('Owned release refresh failed:', error);
    try {
      await dataAccess.releases.update(releaseId, {
        refresh_status: 'failed',
        last_refresh_error: error.message
      });
    } catch (updateError) {}
    sendOwnedRefreshProgress(releaseId, {
      step: 'failed',
      message: error.message
    });
    return { success: false, error: error.message };
  }
});

// NZB Import
ipcMain.handle('nzb:importFiles', async () => {
  try {
    // Initialize NZB import service
    await dataAccess.nzbImport.initialize();

    // Show file picker dialog
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Import NZB Files',
      buttonLabel: 'Import',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'NZB Files', extensions: ['nzb'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    // Import files
    const importResult = await dataAccess.nzbImport.importMultiple(result.filePaths);

    // Cache actors for all successfully imported releases
    if (importResult.success && importResult.releases && importResult.releases.length > 0) {
      for (const releaseId of importResult.releases) {
        await cacheActorsForRelease(releaseId);
      }
    }

    return importResult;
  } catch (error) {
    console.error('Failed to import NZB files:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('nzb:importPath', async (event, filePath) => {
  try {
    await dataAccess.nzbImport.initialize();
    const result = await dataAccess.nzbImport.importNZB(filePath);

    // Cache actors if import succeeded
    if (result.success && result.releaseId) {
      await cacheActorsForRelease(result.releaseId);
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// TMDB
ipcMain.handle('tmdb:findCover', async (event, release) => {
  try {
    await dataAccess.nzbImport.initialize();
    const result = await dataAccess.tmdb.findAndDownloadCover(release);
    return result;
  } catch (error) {
    console.error('TMDB cover search failed:', error.message);
    return null;
  }
});

ipcMain.handle('tmdb:downloadCover', async (event, url, fileName) => {
  try {
    await dataAccess.nzbImport.initialize();
    return await dataAccess.tmdb.downloadCover(url, fileName);
  } catch (error) {
    console.error('TMDB cover download failed:', error.message);
    return null;
  }
});

// Movie Info
ipcMain.handle('movieInfo:getByIMDB', async (event, imdbId) => {
  return await dataAccess.movieInfo.getByIMDB(imdbId);
});

ipcMain.handle('movieInfo:getByTMDB', async (event, tmdbId) => {
  return await dataAccess.movieInfo.getByTMDB(tmdbId);
});

ipcMain.handle('tvInfo:getByTMDB', async (event, tmdbId) => {
  const tvInfo = require('../src/repositories/tvInfoRepository');
  return await tvInfo.getByTMDB(tmdbId);
});

ipcMain.handle('tvInfo:getByIMDB', async (event, imdbId) => {
  const tvInfo = require('../src/repositories/tvInfoRepository');
  return await tvInfo.getByIMDB(imdbId);
});

ipcMain.handle('movieInfo:update', async (event, id, updates) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }
    await dataAccess.movieInfo.update(id, updates);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('movieInfo:upsert', async (event, info) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }
    await dataAccess.movieInfo.createOrUpdate(info);
    let saved = null;
    if (info.tmdb_id) saved = await dataAccess.movieInfo.getByTMDB(info.tmdb_id);
    if (!saved && info.imdb_id) saved = await dataAccess.movieInfo.getByIMDB(info.imdb_id);
    return saved;
  } catch (e) {
    console.error('Movie upsert failed:', e.message);
    throw e;
  }
});

ipcMain.handle('tvInfo:update', async (event, id, updates) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }
    const tvInfo = require('../src/repositories/tvInfoRepository');
    await tvInfo.update(id, updates);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('tvInfo:upsert', async (event, info) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }
    const tvInfo = require('../src/repositories/tvInfoRepository');
    await tvInfo.createOrUpdate(info);
    let saved = null;
    if (info.tmdb_id) saved = await tvInfo.getByTMDB(info.tmdb_id);
    if (!saved && info.imdb_id) saved = await tvInfo.getByIMDB(info.imdb_id);
    return saved;
  } catch (e) {
    console.error('TV upsert failed:', e.message);
    throw e;
  }
});

// Delete movie/TV info + all releases + cached images
ipcMain.handle('movieInfo:deleteFull', async (event, tmdbId, imdbId, mediaType) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }
    const fs = require('fs');
    const pathModule = require('path');
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();

    const folder = mediaType === 'tv' ? 'tv' : 'movies';
    const repo = mediaType === 'tv'
      ? require('../src/repositories/tvInfoRepository')
      : dataAccess.movieInfo;

    // Get the info record to find image paths
    let info = null;
    if (tmdbId) info = await repo.getByTMDB(tmdbId);
    if (!info && imdbId) info = await repo.getByIMDB(imdbId);
    if (!info) return { success: false, error: 'Record not found' };

    const imageId = imdbId || tmdbId?.toString() || info.id.toString();

    // Delete cached images (cover, backdrop, logo for each image type folder)
    const imageTypes = ['covers', 'backdrops', 'logos', 'cutouts'];
    for (const type of imageTypes) {
      const imgDir = pathModule.join(cacheDir, type, folder);
      if (fs.existsSync(imgDir)) {
        const files = fs.readdirSync(imgDir);
        for (const file of files) {
          // Match patterns like tt123456-cover.jpg, 12345-backdrop.jpg, etc.
          if (file.startsWith(`${imageId}-`)) {
            const fullPath = pathModule.join(imgDir, file);
            fs.unlinkSync(fullPath);
            console.log(`  ✓ Deleted cached image: ${fullPath}`);
          }
        }
      }
    }

    // Also delete images referenced in the info record itself
    const imageFields = ['cover_path', 'backdrop_path', 'logo_path'];
    for (const field of imageFields) {
      if (info[field] && fs.existsSync(info[field])) {
        fs.unlinkSync(info[field]);
        console.log(`  ✓ Deleted image from record: ${info[field]}`);
      }
    }

    // Delete all releases for this movie/TV (handles per-release NZB files and images)
    const releases = await dataAccess.releases.getByMovieId(tmdbId, imdbId, mediaType);
    for (const release of releases) {
      await dataAccess.releases.delete(release.id);
    }
    console.log(`  ✓ Deleted ${releases.length} releases`);

    // Delete the movie/TV info record
    await repo.delete(info.id);
    console.log(`  ✓ Deleted ${mediaType} info record`);

    return { success: true, deletedReleases: releases.length };
  } catch (e) {
    console.error('Full delete failed:', e.message);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('tvInfo:deleteFull', async (event, tmdbId, imdbId, mediaType) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }
    const fs = require('fs');
    const pathModule = require('path');
    const tvInfo = require('../src/repositories/tvInfoRepository');
    const cacheDir = appPaths.getImageCacheDir();

    let info = null;
    if (tmdbId) info = await tvInfo.getByTMDB(tmdbId);
    if (!info && imdbId) info = await tvInfo.getByIMDB(imdbId);
    if (!info) return { success: false, error: 'Record not found' };

    const imageId = imdbId || tmdbId?.toString() || info.id.toString();

    // Delete cached images
    const imageTypes = ['covers', 'backdrops', 'logos', 'cutouts'];
    for (const type of imageTypes) {
      const imgDir = pathModule.join(cacheDir, type, 'tv');
      if (fs.existsSync(imgDir)) {
        const files = fs.readdirSync(imgDir);
        for (const file of files) {
          if (file.startsWith(`${imageId}-`)) {
            fs.unlinkSync(pathModule.join(imgDir, file));
          }
        }
      }
    }

    // Delete images from record
    for (const field of ['cover_path', 'backdrop_path', 'logo_path']) {
      if (info[field] && fs.existsSync(info[field])) {
        fs.unlinkSync(info[field]);
      }
    }

    // Delete all releases
    const releases = await dataAccess.releases.getByMovieId(tmdbId, imdbId, 'tv');
    for (const release of releases) {
      await dataAccess.releases.delete(release.id);
    }

    // Delete TV info
    await tvInfo.delete(info.id);

    return { success: true, deletedReleases: releases.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('musicInfo:getById', async (event, id) => {
  const musicInfo = require('../src/repositories/musicInfoRepository');
  return await musicInfo.getById(id);
});
ipcMain.handle('musicInfo:delete', async (event, id) => {
  const musicInfo = require('../src/repositories/musicInfoRepository');
  return await musicInfo.delete(id);
});

// Upload handlers
const setupUploadHandlers = require('./upload-handler');
setupUploadHandlers(dataAccess);

/**
 * Cache actors for a specific release by fetching TMDB credits
 */
async function cacheActorsForRelease(releaseId) {
  try {
    const release = await dataAccess.releases.getById(releaseId);
    if (!release || !release.tmdb_id) return;

    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);

    // Fetch full details with credits
    let details = null;
    if (release.media_type === 'movie') {
      details = await tmdbService.getMovieDetails(release.tmdb_id);
    } else if (release.media_type === 'tv') {
      details = await tmdbService.getTVDetails(release.tmdb_id);
    }

    if (details && details.credits && details.credits.cast) {
      await saveActorsToCache(details.credits.cast, tmdbService);
    }
  } catch (e) {
    console.error(`Failed to cache actors for release ${releaseId}: ${e.message}`);
  }
}

// Import dropped NZB file (content received from renderer)
ipcMain.handle('nzb:importDropped', async (event, fileName, content) => {
  try {
    const fs = require('fs');
    const os = require('os');
    // Clean filename for temp path — keep original name for proper parsing
    const safeName = fileName.replace(/[^a-zA-Z0-9._\-\[\]()\s]/g, '_');
    const tmpDir = path.join(os.tmpdir(), 'nzbarr-drop');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, safeName);
    fs.writeFileSync(tmpPath, Buffer.from(content));

    const nzbImportService = require('../src/nzbImportService');
    await nzbImportService.initialize();
    console.log(`\n📦 Dropped NZB: ${fileName}`);
    console.log(`   NZB storage path: ${nzbImportService.nzbStoragePath}`);
    const result = await nzbImportService.importNZB(tmpPath);
    console.log(`   Import result:`, result.success ? 'SUCCESS' : result.error);

    // If import succeeded and has TMDB data, cache actors
    if (result.success && result.releaseId) {
      await cacheActorsForRelease(result.releaseId);
    }

    // Clean up temp file
    try { fs.unlinkSync(tmpPath); } catch (e) {}

    // Notify renderer to refresh
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:import-complete', {
        imported: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        errors: result.success ? [] : [result.error]
      });
    }

    return result;
  } catch (e) {
    console.error('Dropped NZB import failed:', e.message);
    return { success: false, error: e.message };
  }
});

// Update release fields
ipcMain.handle('releases:update', async (event, id, fields) => {
  try {
    const release = await dataAccess.releases.getById(id);
    const releaseNameUpdates = applyReleaseNameIdTagUpdates(release, fields);
    const updateFields = {
      ...fields,
      ...releaseNameUpdates
    };

    await dataAccess.releases.update(id, updateFields);
    // Update the local release object with the new search_name so the detail page shows it immediately
    if (updateFields.search_name) {
      // Force a fresh read of the release to reflect the update
      const updatedRelease = await dataAccess.releases.getById(id);
      return { success: true, release: updatedRelease };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('releases:batchUpdate', async (event, ids, fields) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: 'No releases selected' };
    }

    const updates = [];
    const normalize = (key, value) => {
      if (value == null) return '';
      if (['tmdb_id', 'category_id', 'season', 'episode'].includes(key)) {
        return String(value);
      }
      return String(value);
    };
    for (const id of ids) {
      const release = await dataAccess.releases.getById(id);
      if (!release) continue;

      const perReleaseFields = {};
      for (const [key, value] of Object.entries(fields || {})) {
        if (normalize(key, release[key]) !== normalize(key, value)) {
          perReleaseFields[key] = value;
        }
      }

      Object.assign(perReleaseFields, applyReleaseNameIdTagUpdates(release, perReleaseFields));

      if (Object.keys(perReleaseFields).length > 0) {
        await dataAccess.releases.update(id, perReleaseFields);
        updates.push(id);
      }
    }

    return {
      success: true,
      updated: updates.length,
      ids: updates
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// TMDB movie details (for edit form populate)
ipcMain.handle('tmdb:getMovieDetails', async (event, tmdbId) => {
  try {
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);
    return await tmdbService.getMovieDetails(tmdbId);
  } catch (e) {
    console.error('TMDB movie details failed:', e.message);
    return null;
  }
});

ipcMain.handle('tmdb:getTVDetails', async (event, tmdbId) => {
  try {
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);
    return await tmdbService.getTVDetails(tmdbId);
  } catch (e) {
    console.error('TMDB TV details failed:', e.message);
    return null;
  }
});

ipcMain.handle('tmdb:searchMovie', async (event, title) => {
  try {
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);
    return await tmdbService.searchMovie(title);
  } catch (e) {
    console.error('TMDB movie search failed:', e.message);
    return null;
  }
});

ipcMain.handle('tmdb:searchTV', async (event, title) => {
  try {
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);
    return await tmdbService.searchTV(title);
  } catch (e) {
    console.error('TMDB TV search failed:', e.message);
    return null;
  }
});

ipcMain.handle('fanart:getCoverOptions', async (event, params) => {
  try {
    const licenseError = await enforceLicensedFeature('fanart_artwork');
    if (licenseError) {
      return licenseError;
    }

    const settings = await dataAccess.settings.getAll();
    fanartService.initialize(settings.api_fanart_key || null);

    if (!settings.api_fanart_key) {
      return { success: false, error: 'Fanart.tv API key is not configured. Add it in Settings > API Keys.' };
    }

    const { mediaType, tmdbId, tvdbId } = params || {};
    let items = [];

    const assetType = params?.assetType || 'cover';

    if (mediaType === 'tv') {
      items = await fanartService.getTVArtworkOptions(tvdbId, assetType);
    } else {
      items = await fanartService.getMovieArtworkOptions(tmdbId, assetType);
    }

    return { success: true, items };
  } catch (error) {
    console.error('Fanart cover lookup failed:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Download actor profile images and save actor data to cache
 */
async function saveActorsToCache(cast, tmdbService) {
  if (!cast || cast.length === 0) return;
  const actorCache = require('../src/repositories/actorCacheRepository');
  const limitedCast = cast.slice(0, 10);

  for (const actor of limitedCast) {
    if (!actor.id || !actor.name) continue;

    try {
      // Check if already cached
      const existing = actorCache.getByTMDB(actor.id);

      let profilePath = null;
      let hasProfileImage = 0;

      // Download profile image if available
      if (actor.profile_path) {
        const actorDir = appPaths.getActorCacheDir();
        const imageUrl = `${tmdbService.imageBaseUrl}w185${actor.profile_path}`;
        const ext = actor.profile_path.endsWith('.png') ? 'png' : 'jpg';
        profilePath = path.join(actorDir, `${actor.id}-profile.${ext}`);

        // Ensure directory exists
        if (!fs.existsSync(actorDir)) {
          fs.mkdirSync(actorDir, { recursive: true });
        }

        // Download if not already cached
        if (!fs.existsSync(profilePath)) {
          profilePath = await tmdbService.downloadCover(imageUrl, profilePath, ext);
          if (profilePath) hasProfileImage = 1;
        } else {
          hasProfileImage = 1;
        }
      }

      // Only save if not already cached with image
      if (!existing || (existing && !existing.has_profile_image && hasProfileImage)) {
        await actorCache.saveOrUpdate({
          tmdb_person_id: actor.id,
          name: actor.name,
          profile_path: profilePath,
          has_profile_image: hasProfileImage,
          known_for_department: actor.known_for_department || 'Acting',
          gender: actor.gender || 0,
          popularity: actor.popularity || 0,
          raw_json: JSON.stringify(actor)
        });
        console.log(`  ✓ Actor cached: ${actor.name}${hasProfileImage ? ' (image saved)' : ''}`);
      }
    } catch (e) {
      console.error(`  ⚠ Failed to cache actor ${actor.name}: ${e.message}`);
    }
  }
}

// Save movie info from TMDB details to database
ipcMain.handle('movieInfo:saveFromTMDB', async (event, details) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }

    const movieInfoRepo = dataAccess.movieInfo;
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);

    // Download images
    let coverPath = null, backdropPath = null, logoPath = null;
    let hasCover = 0, hasBackdrop = 0, hasLogo = 0;

    if (details.poster_path) {
      const coverUrl = `${tmdbService.imageBaseUrl}w500${details.poster_path}`;
      const coverDest = appPaths.getCoverPath('movies', details.id, 'jpg');
      coverPath = await tmdbService.downloadCover(coverUrl, coverDest, 'jpg');
      if (coverPath) hasCover = 1;
    }
    if (details.backdrop_path) {
      const backdropUrl = `${tmdbService.imageBaseUrl}w1280${details.backdrop_path}`;
      const backdropDest = appPaths.getBackdropPath('movies', details.id, 'jpg');
      backdropPath = await tmdbService.downloadCover(backdropUrl, backdropDest, 'jpg');
      if (backdropPath) hasBackdrop = 1;
    }
    if (details.images && details.images.logos && details.images.logos.length > 0) {
      const logos = details.images.logos;
      const logo = logos.find(l => l.iso_639_1 === 'en-us') || logos.find(l => l.iso_639_1 === 'en-gb') || logos.find(l => l.iso_639_1 === 'en') || logos.find(l => l.iso_639_1 === null || l.iso_639_1 === 'xx') || logos[0];
      if (logo) {
        const logoUrl = `${tmdbService.imageBaseUrl}w500${logo.file_path}`;
        const logoDest = appPaths.getLogoPath('movies', details.id, 'png');
        logoPath = await tmdbService.downloadCover(logoUrl, logoDest, 'png');
        if (logoPath) hasLogo = 1;
      }
    }

    const infoData = {
      imdb_id: details.imdb_id || details.external_ids?.imdb_id || null,
      tmdb_id: details.id,
      title: details.title || '',
      original_title: details.original_title || null,
      plot: details.overview || null,
      tagline: details.tagline || null,
      release_date: details.release_date || null,
      runtime: details.runtime || null,
      rating: details.vote_average || null,
      genres: details.genres ? details.genres.map(g => g.name).join(', ') : null,
      director: details.credits?.crew ? details.credits.crew.filter(c => c.job === 'Director').map(d => d.name).join(', ') : null,
      actors: details.credits?.cast ? JSON.stringify(details.credits.cast.slice(0, 10)) : null,
      language: details.original_language || null,
      country: details.production_countries && details.production_countries.length > 0 ? details.production_countries[0].iso_3166_1 : null,
      youtube_trailer: details.videos?.results ? (details.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key || null) : null,
      collection_id: details.belongs_to_collection?.id || null,
      has_cover: hasCover,
      has_backdrop: hasBackdrop,
      has_logo: hasLogo,
      cover_path: coverPath,
      backdrop_path: backdropPath,
      logo_path: logoPath,
      raw_json: JSON.stringify(details)
    };

    await saveCollectionFromTMDB(details.belongs_to_collection);
    await movieInfoRepo.createOrUpdate(infoData);

    // Save actors to cache and download their profile images
    if (details.credits && details.credits.cast) {
      await saveActorsToCache(details.credits.cast, tmdbService);
    }

    // Return the saved record
    let saved = null;
    if (infoData.tmdb_id) saved = await movieInfoRepo.getByTMDB(infoData.tmdb_id);
    if (!saved && infoData.imdb_id) saved = await movieInfoRepo.getByIMDB(infoData.imdb_id);
    return saved;
  } catch (e) {
    console.error('Save movie info from TMDB failed:', e.message);
    throw e;
  }
});

// Save TV info from TMDB details to database
ipcMain.handle('tvInfo:saveFromTMDB', async (event, details) => {
  try {
    const licenseError = await enforceLicensedFeature('edit_media_info');
    if (licenseError) {
      return licenseError;
    }

    const tvInfoRepo = dataAccess.tvInfo;
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    const cacheDir = appPaths.getImageCacheDir();
    tmdbService.initialize(settings.api_tmdb_key || null, cacheDir);

    // Download images
    let coverPath = null, backdropPath = null, logoPath = null;
    let hasCover = 0, hasBackdrop = 0, hasLogo = 0;

    if (details.poster_path) {
      const coverUrl = `${tmdbService.imageBaseUrl}w500${details.poster_path}`;
      const coverDest = appPaths.getCoverPath('tv', details.id, 'jpg');
      coverPath = await tmdbService.downloadCover(coverUrl, coverDest, 'jpg');
      if (coverPath) hasCover = 1;
    }
    if (details.backdrop_path) {
      const backdropUrl = `${tmdbService.imageBaseUrl}w1280${details.backdrop_path}`;
      const backdropDest = appPaths.getBackdropPath('tv', details.id, 'jpg');
      backdropPath = await tmdbService.downloadCover(backdropUrl, backdropDest, 'jpg');
      if (backdropPath) hasBackdrop = 1;
    }
    if (details.images && details.images.logos && details.images.logos.length > 0) {
      const logos = details.images.logos;
      const logo = logos.find(l => l.iso_639_1 === 'en-us') || logos.find(l => l.iso_639_1 === 'en-gb') || logos.find(l => l.iso_639_1 === 'en') || logos.find(l => l.iso_639_1 === null || l.iso_639_1 === 'xx') || logos[0];
      if (logo) {
        const logoUrl = `${tmdbService.imageBaseUrl}w500${logo.file_path}`;
        const logoDest = appPaths.getLogoPath('tv', details.id, 'png');
        logoPath = await tmdbService.downloadCover(logoUrl, logoDest, 'png');
        if (logoPath) hasLogo = 1;
      }
    }

    const infoData = {
      tmdb_id: details.id,
      imdb_id: details.external_ids?.imdb_id || null,
      title: details.name || details.title || '',
      original_name: details.original_name || null,
      plot: details.overview || null,
      first_air_date: details.first_air_date || null,
      last_air_date: details.last_air_date || null,
      runtime: details.episode_run_time && details.episode_run_time.length > 0 ? details.episode_run_time[0] : null,
      number_of_seasons: details.number_of_seasons || null,
      number_of_episodes: details.number_of_episodes || null,
      rating: details.vote_average || null,
      genres: details.genres ? details.genres.map(g => g.name).join(', ') : null,
      actors: details.credits?.cast ? JSON.stringify(details.credits.cast.slice(0, 10)) : null,
      language: details.original_language || null,
      country: details.production_countries && details.production_countries.length > 0 ? details.production_countries[0].iso_3166_1 : null,
      status: details.status || null,
      youtube_trailer: details.videos?.results ? (details.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key || null) : null,
      has_cover: hasCover,
      has_backdrop: hasBackdrop,
      has_logo: hasLogo,
      cover_path: coverPath,
      backdrop_path: backdropPath,
      logo_path: logoPath,
      raw_json: JSON.stringify(details)
    };

    await tvInfoRepo.createOrUpdate(infoData);

    // Save actors to cache and download their profile images
    if (details.credits && details.credits.cast) {
      await saveActorsToCache(details.credits.cast, tmdbService);
    }

    // Return the saved record
    let saved = null;
    if (infoData.tmdb_id) saved = await tvInfoRepo.getByTMDB(infoData.tmdb_id);
    if (!saved && infoData.imdb_id) saved = await tvInfoRepo.getByIMDB(infoData.imdb_id);
    return saved;
  } catch (e) {
    console.error('Save TV info from TMDB failed:', e.message);
    throw e;
  }
});

// Get actor detail info
ipcMain.handle('actor:getDetail', async (event, tmdbId) => {
  try {
    const actorCache = require('../src/repositories/actorCacheRepository');
    return actorCache.getByTMDB(tmdbId);
  } catch (e) {
    console.error('Get actor detail failed:', e.message);
    return null;
  }
});

// Get all movies/TV shows in our DB featuring an actor
ipcMain.handle('actor:getReleases', async (event, tmdbId) => {
  try {
    const actorCache = require('../src/repositories/actorCacheRepository');
    const tmdbService = require('../src/tmdbService');
    const settings = await dataAccess.settings.getAll();
    tmdbService.initialize(settings.api_tmdb_key || null, appPaths.getImageCacheDir());

    let actor = actorCache.getByTMDB(tmdbId);

    // If actor not cached or missing bio, fetch from TMDB and save
    if (!actor || !actor.biography) {
      const tmdbPerson = await tmdbService.getPersonDetails(tmdbId);
      if (tmdbPerson) {
        // Download profile image if we don't have it
        let profilePath = actor?.profile_path || null;
        let hasProfileImage = actor?.has_profile_image || 0;

        if (tmdbPerson.profile_path && !hasProfileImage) {
          const actorDir = appPaths.getActorCacheDir();
          const imageUrl = `${tmdbService.imageBaseUrl}w185${tmdbPerson.profile_path}`;
          const ext = tmdbPerson.profile_path.endsWith('.png') ? 'png' : 'jpg';
          profilePath = path.join(actorDir, `${tmdbId}-profile.${ext}`);
          if (!fs.existsSync(actorDir)) fs.mkdirSync(actorDir, { recursive: true });
          if (!fs.existsSync(profilePath)) {
            profilePath = await tmdbService.downloadCover(imageUrl, profilePath, ext);
            if (profilePath) hasProfileImage = 1;
          } else {
            hasProfileImage = 1;
          }
        }

        await actorCache.saveOrUpdate({
          tmdb_person_id: tmdbId,
          name: tmdbPerson.name,
          biography: tmdbPerson.biography || null,
          birthday: tmdbPerson.birthday || null,
          deathday: tmdbPerson.deathday || null,
          place_of_birth: tmdbPerson.place_of_birth || null,
          known_for_department: tmdbPerson.known_for_department || 'Acting',
          popularity: tmdbPerson.popularity || 0,
          gender: tmdbPerson.gender || 0,
          profile_path: profilePath,
          has_profile_image: hasProfileImage,
          raw_json: JSON.stringify(tmdbPerson)
        });

        actor = actorCache.getByTMDB(tmdbId);
      }
    }

    if (!actor) return { actor: null, releases: [] };

    const actorReleases = [];

    const allMovies = dataAccess.db.all('SELECT * FROM movie_info ORDER BY title');
    if (allMovies && allMovies.length > 0) {
      for (const movie of allMovies) {
        if (movie.actors) {
          let matched = false;
          try {
            const actors = JSON.parse(movie.actors);
            matched = actors.some(a => a.id === tmdbId || a.name === actor.name);
          } catch (e) {
            matched = movie.actors.includes(actor.name);
          }
          if (matched) {
            actorReleases.push({
              id: movie.id,
              title: movie.title,
              year: movie.release_date ? movie.release_date.substring(0, 4) : '',
              media_type: 'movie',
              tmdb_id: movie.tmdb_id,
              imdb_id: movie.imdb_id,
              cover_image: movie.cover_path,
              rating: movie.rating
            });
          }
        }
      }
    }

    const allTV = dataAccess.db.all('SELECT * FROM tv_info ORDER BY title');
    if (allTV && allTV.length > 0) {
      for (const show of allTV) {
        if (show.actors) {
          let matched = false;
          try {
            const actors = JSON.parse(show.actors);
            matched = actors.some(a => a.id === tmdbId || a.name === actor.name);
          } catch (e) {
            matched = show.actors.includes(actor.name);
          }
          if (matched) {
            actorReleases.push({
              id: show.id,
              title: show.title,
              year: show.first_air_date ? show.first_air_date.substring(0, 4) : '',
              media_type: 'tv',
              tmdb_id: show.tmdb_id,
              imdb_id: show.imdb_id,
              cover_image: show.cover_path,
              rating: show.rating
            });
          }
        }
      }
    }

    return { actor, releases: actorReleases };
  } catch (e) {
    console.error('Get actor releases failed:', e.message);
    return { actor: null, releases: [] };
  }
});

// Get all cached actors
ipcMain.handle('actor:getAll', async (event) => {
  try {
    const actorCache = require('../src/repositories/actorCacheRepository');
    return actorCache.getAll();
  } catch (e) {
    console.error('Get all actors failed:', e.message);
    return [];
  }
});
