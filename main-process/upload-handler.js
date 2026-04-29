const { ipcMain, dialog, BrowserWindow } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const settingsRepository = require('../src/repositories/settingsRepository');
const tmdbService = require('../src/tmdbService');

async function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function formatCoverUrl(url) {
  return url ? url.replace(/^http:\/\//i, 'https://') : null;
}

function getCacheDir(settings) {
  // Try app's data/cache first (development)
  const appCacheDir = path.join(__dirname, '../data/cache');
  const fs = require('fs');
  if (fs.existsSync(path.join(__dirname, '../data'))) {
    return appCacheDir;
  }
  // Fall back to user data path (production)
  return path.join(process.env.HOME || process.env.USERPROFILE || '.', 'Library', 'Application Support', 'nzbarr-desktop', 'cache');
}

function initTMDBService(settings) {
  tmdbService.initialize(settings?.api_tmdb_key || null, getCacheDir(settings));
}

module.exports = function setupUploadHandlers(dataAccess) {
  ipcMain.handle('upload:selectNZBFile', async () => {
    const win = BrowserWindow.getFocusedWindow();
    return await dialog.showOpenDialog(win, {
      title: 'Select NZB File',
      buttonLabel: 'Select',
      properties: ['openFile'],
      filters: [{ name: 'NZB Files', extensions: ['nzb'] }]
    });
  });

  ipcMain.handle('upload:searchTMDB', async (event, query, mediaType) => {
    const settings = await settingsRepository.getAll();
    initTMDBService(settings);
    if (!tmdbService.apiKey) return { results: [] };
    try {
      if (mediaType === 'tv') return await tmdbService.searchTV(query);
      return await tmdbService.searchMovie(query);
    } catch (e) {
      console.error('TMDB search failed:', e.message);
      return { results: [] };
    }
  });
  ipcMain.handle('upload:importNZB', async (event, nzbPath, data) => {
    try {
      if (!nzbPath) {
        return { success: false, error: 'No NZB file selected' };
      }

      const settings = await settingsRepository.getAll();
      initTMDBService(settings);

      const nzbImportService = require('../src/nzbImportService');
      await nzbImportService.initialize();
      const result = await nzbImportService.importNZB(nzbPath);

      if (!result.success || !result.releaseId) {
        return result;
      }

      const releaseId = result.releaseId;
      const releaseRepository = require('../src/repositories/releaseRepository');

      // Build lookup object for TMDB - use all available identifiers
      const lookup = {
        id: releaseId,
        media_type: data?.mediaType || result.release?.media_type || 'movie',
        tmdb_id: data?.tmdbId || result.release?.tmdb_id || null,
        imdb_id: data?.imdbId || result.release?.imdb_id || null,
        clean_name: data?.title || result.release?.clean_name || '',
        nzb_guid: result.release?.nzb_guid || ''
      };

      // Download cover, backdrop, and logo from TMDB
      const coverResult = await tmdbService.findAndDownloadCover(lookup);
      if (coverResult) {
        const updates = {
          cover_image: coverResult.coverPath
        };
        if (coverResult.tmdbId) updates.tmdb_id = coverResult.tmdbId;
        if (coverResult.imdbId) updates.imdb_id = coverResult.imdbId;
        if (coverResult.backdropPath) updates.backdrop_path = coverResult.backdropPath;
        if (coverResult.logoPath) updates.logo_path = coverResult.logoPath;

        await releaseRepository.update(releaseId, updates);
        console.log(`  ✓ Cover, backdrop, logo updated for release ${releaseId}`);
        if (coverResult.imdbId) console.log(`  ✓ IMDB ID resolved: ${coverResult.imdbId}`);
      }

      // Cache actors from TMDB credits
      if (lookup.tmdb_id) {
        const tmdbDetails = lookup.media_type === 'tv'
          ? await tmdbService.getTVDetails(lookup.tmdb_id)
          : await tmdbService.getMovieDetails(lookup.tmdb_id);

        if (tmdbDetails && tmdbDetails.credits && tmdbDetails.credits.cast) {
          const actorCache = require('../src/repositories/actorCacheRepository');
          const appPaths = require('../src/appPaths');
          const limitedCast = tmdbDetails.credits.cast.slice(0, 10);

          for (const actor of limitedCast) {
            if (!actor.id || !actor.name) continue;
            try {
              const existing = actorCache.getByTMDB(actor.id);
              let profilePath = null;
              let hasProfileImage = 0;

              if (actor.profile_path) {
                const actorDir = appPaths.getActorCacheDir();
                const imageUrl = `${tmdbService.imageBaseUrl}w185${actor.profile_path}`;
                const ext = actor.profile_path.endsWith('.png') ? 'png' : 'jpg';
                profilePath = require('path').join(actorDir, `${actor.id}-profile.${ext}`);

                if (!require('fs').existsSync(actorDir)) {
                  require('fs').mkdirSync(actorDir, { recursive: true });
                }

                if (!require('fs').existsSync(profilePath)) {
                  profilePath = await tmdbService.downloadCover(imageUrl, profilePath, ext);
                  if (profilePath) hasProfileImage = 1;
                } else {
                  hasProfileImage = 1;
                }
              }

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
                console.log(`  ✓ Actor cached: ${actor.name}`);
              }
            } catch (e) {
              console.error(`  ⚠ Failed to cache actor ${actor.name}: ${e.message}`);
            }
          }
        }
      }

      // Return the full release data for the frontend
      const updatedRelease = await releaseRepository.getById(releaseId);
      return {
        success: true,
        releaseId: releaseId,
        release: updatedRelease
      };
    } catch (error) {
      console.error('Upload import failed:', error.message);
      return { success: false, error: error.message || 'Upload failed' };
    }
  });
};
