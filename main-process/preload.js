// Preload script - Secure bridge between renderer and main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getAppPath: (name) => ipcRenderer.invoke('app:path', name),
  copyToClipboard: (text) => ipcRenderer.invoke('app:copyToClipboard', text),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  openTrailer: (videoId, title) => ipcRenderer.invoke('app:openTrailer', videoId, title),
  selectNZBFiles: () => ipcRenderer.invoke('app:selectNZBFiles'),
  selectFolder: () => ipcRenderer.invoke('app:selectFolder'),
  selectExecutable: () => ipcRenderer.invoke('app:selectExecutable'),

  // Media creation
  uploadImage: (imageData) => ipcRenderer.invoke('media:uploadImage', imageData),
  createMovie: (movieData) => ipcRenderer.invoke('media:createMovie', movieData),
  createTV: (tvData) => ipcRenderer.invoke('media:createTV', tvData),

  // Link NZBs
  getLibraryDropdown: () => ipcRenderer.invoke('library:getAllForDropdown'),
  searchLinkedMedia: (query, options) => ipcRenderer.invoke('library:searchLinkedMedia', query, options),
  linkNZBs: (mediaData) => ipcRenderer.invoke('media:linkNZBs', mediaData),

  // Database
  getDbStats: () => ipcRenderer.invoke('db:stats'),

  // Releases
  getReleases: (options) => ipcRenderer.invoke('releases:getAll', options),
  getUniqueMovies: (options) => ipcRenderer.invoke('releases:getUniqueMovies', options),
  getUniqueTV: (options) => ipcRenderer.invoke('releases:getUniqueTV', options),

  // Library (enriched media items with metadata)
  getLibraryItems: (options) => ipcRenderer.invoke('library:getItems', options),
  getLibraryGenres: (mediaType) => ipcRenderer.invoke('library:getGenres', mediaType),
  getLibraryCounts: () => ipcRenderer.invoke('library:getCounts'),
  getLibraryCollections: (options) => ipcRenderer.invoke('collections:getLibrary', options),
  getCollectionByTMDB: (tmdbId) => ipcRenderer.invoke('collections:getByTMDB', tmdbId),

  getRecentlyAdded: (options) => ipcRenderer.invoke('releases:getRecentlyAdded', options),
  getRefreshHighlights: (limit) => ipcRenderer.invoke('releases:getRefreshHighlights', limit),
  getReleaseById: (id) => ipcRenderer.invoke('releases:getById', id),
  getRecentReleases: (limit) => ipcRenderer.invoke('releases:getRecent', limit),
  searchReleases: (query, options) => ipcRenderer.invoke('releases:search', query, options),
  createRelease: (release) => ipcRenderer.invoke('releases:create', release),
  deleteRelease: (id) => ipcRenderer.invoke('releases:delete', id),
  downloadNZB: (id) => ipcRenderer.invoke('releases:downloadNZB', id),
  downloadNZBBatch: (ids) => ipcRenderer.invoke('releases:downloadNZBBatch', ids),
  sendReleaseToDownloader: (id, downloader) => ipcRenderer.invoke('releases:sendToDownloader', id, downloader),
  testDownloaderConnection: (downloader, settingsOverride) => ipcRenderer.invoke('downloader:testConnection', downloader, settingsOverride),
  deleteAllForMovie: (tmdbId, imdbId, mediaType) => ipcRenderer.invoke('releases:deleteAllForMovie', tmdbId, imdbId, mediaType),
  reanalyzeRelease: (id) => ipcRenderer.invoke('releases:reanalyze', id),
  refreshOwnedRelease: (id) => ipcRenderer.invoke('releases:refreshOwned', id),
  getReleasesByMovie: (tmdbId, imdbId, mediaType) => ipcRenderer.invoke('releases:getByMovie', tmdbId, imdbId, mediaType),

  // Settings
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),
  getNNTPSettings: () => ipcRenderer.invoke('settings:getNNTP'),
  saveNNTPSettings: (settings) => ipcRenderer.invoke('settings:saveNNTP', settings),
  saveSettings: (settings) => ipcRenderer.invoke('settings:saveAll', settings),
  runPreparationPipeline: (options) => ipcRenderer.invoke('pipeline:run', options),
  getSupportDiagnostics: () => ipcRenderer.invoke('support:getDiagnostics'),

  // NZB Import
  importNZBFiles: () => ipcRenderer.invoke('nzb:importFiles'),
  importNZBPath: (filePath) => ipcRenderer.invoke('nzb:importPath', filePath),

  // TMDB
  findCover: (release) => ipcRenderer.invoke('tmdb:findCover', release),
  downloadCover: (url, fileName) => ipcRenderer.invoke('tmdb:downloadCover', url, fileName),

  // Movie Info
  getMovieInfoByIMDB: (imdbId) => ipcRenderer.invoke('movieInfo:getByIMDB', imdbId),
  getMovieInfoByTMDB: (tmdbId) => ipcRenderer.invoke('movieInfo:getByTMDB', tmdbId),
  updateMovieInfo: (id, updates) => ipcRenderer.invoke('movieInfo:update', id, updates),
  deleteMovieInfoFull: (tmdbId, imdbId, mediaType) => ipcRenderer.invoke('movieInfo:deleteFull', tmdbId, imdbId, mediaType),

  // TV Info
  getTVInfoByIMDB: (imdbId) => ipcRenderer.invoke('tvInfo:getByIMDB', imdbId),
  getTVInfoByTMDB: (tmdbId) => ipcRenderer.invoke('tvInfo:getByTMDB', tmdbId),
  updateTVInfo: (id, updates) => ipcRenderer.invoke('tvInfo:update', id, updates),
  deleteTVInfoFull: (tmdbId, imdbId, mediaType) => ipcRenderer.invoke('tvInfo:deleteFull', tmdbId, imdbId, mediaType),

  // Music Info
  getMusicInfoById: (id) => ipcRenderer.invoke('musicInfo:getById', id),
  deleteMusicInfo: (id) => ipcRenderer.invoke('musicInfo:delete', id),

  selectNZBFile: () => ipcRenderer.invoke('upload:selectNZBFile'),
  searchTMDB: (query, mediaType) => ipcRenderer.invoke('upload:searchTMDB', query, mediaType),

  importNZBPathWithData: (nzbPath, data) => ipcRenderer.invoke('upload:importNZB', nzbPath, data),
  importDroppedNZB: (fileName, content) => ipcRenderer.invoke('nzb:importDropped', fileName, content),
  onImportComplete: (callback) => ipcRenderer.on('app:import-complete', (event, data) => callback(data)),
  onOwnedRefreshProgress: (callback) => ipcRenderer.on('releases:ownedRefreshProgress', (event, data) => callback(data)),

  // Auto Refresh
  getAutoRefreshStatus: () => ipcRenderer.invoke('autoRefresh:getStatus'),
  startAutoRefresh: () => ipcRenderer.invoke('autoRefresh:start'),
  stopAutoRefresh: () => ipcRenderer.invoke('autoRefresh:stop'),
  triggerAutoRefreshManual: (releaseId) => ipcRenderer.invoke('autoRefresh:triggerManual', releaseId),
  queueAutoRefreshManual: (releaseId) => ipcRenderer.invoke('autoRefresh:queueManual', releaseId),
  queueAutoRefreshBatch: (releaseIds) => ipcRenderer.invoke('autoRefresh:queueManualBatch', releaseIds),
  runQueuedAutoRefreshes: () => ipcRenderer.invoke('autoRefresh:runQueued'),
  getQueuedAutoRefreshes: () => ipcRenderer.invoke('autoRefresh:getQueued'),
  getAutoRefreshActiveJobs: () => ipcRenderer.invoke('autoRefresh:getActiveJobs'),
  onAutoRefreshProgress: (callback) => ipcRenderer.on('auto-refresh-progress', (event, data) => callback(data)),
  onAutoRefreshComplete: (callback) => ipcRenderer.on('refresh-complete', (event, data) => callback(data)),

  updateRelease: (id, fields) => ipcRenderer.invoke('releases:update', id, fields),
  batchUpdateReleases: (ids, fields) => ipcRenderer.invoke('releases:batchUpdate', ids, fields),
  getMovieDetails: (tmdbId) => ipcRenderer.invoke('tmdb:getMovieDetails', tmdbId),
  getTVDetails: (tmdbId) => ipcRenderer.invoke('tmdb:getTVDetails', tmdbId),
  searchMovie: (title) => ipcRenderer.invoke('tmdb:searchMovie', title),
  searchTV: (title) => ipcRenderer.invoke('tmdb:searchTV', title),
  saveMovieInfoFromTMDB: (details) => ipcRenderer.invoke('movieInfo:saveFromTMDB', details),
  saveTVInfoFromTMDB: (details) => ipcRenderer.invoke('tvInfo:saveFromTMDB', details),
  upsertMovieInfo: (info) => ipcRenderer.invoke('movieInfo:upsert', info),
  upsertTVInfo: (info) => ipcRenderer.invoke('tvInfo:upsert', info),
  getFanartCoverOptions: (params) => ipcRenderer.invoke('fanart:getCoverOptions', params),
  downloadImageToPath: (params) => ipcRenderer.invoke('media:downloadImageToPath', params),
  getActorDetail: (tmdbId) => ipcRenderer.invoke('actor:getDetail', tmdbId),
  getActorReleases: (tmdbId) => ipcRenderer.invoke('actor:getReleases', tmdbId),
  getAllActors: () => ipcRenderer.invoke('actor:getAll'),

  // Direct stream media library
  importStreamUrls: (urls) => ipcRenderer.invoke('streams:importUrls', urls),
  importStreamUrlFile: () => ipcRenderer.invoke('streams:importUrlFile'),
  getStreamLibrary: (options) => ipcRenderer.invoke('streams:list', options),
  getStreamsForMedia: (media) => ipcRenderer.invoke('streams:getForMedia', media),
  discoverEasynewsMovieStreams: (media) => ipcRenderer.invoke('streams:discoverEasynewsMovie', media),
  getStreamCounts: () => ipcRenderer.invoke('streams:counts'),
  updateStreamFlags: (id, fields) => ipcRenderer.invoke('streams:updateFlags', id, fields),
  deleteStream: (id) => ipcRenderer.invoke('streams:delete', id),
  refreshStreamMetadata: (id) => ipcRenderer.invoke('streams:refreshMetadata', id),
  getInternalStreamUrl: (id) => ipcRenderer.invoke('streams:getInternalUrl', id),
  playStream: (id) => ipcRenderer.invoke('streams:play', id),
});
