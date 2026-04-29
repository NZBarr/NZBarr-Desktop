// NZBarr Desktop - Data Access Layer
const db = require('./database');
const releases = require('./repositories/releaseRepository');
const downloads = require('./repositories/downloadRepository');
const settings = require('./repositories/settingsRepository');
const nzbImport = require('./nzbImportService');
const tmdb = require('./tmdbService');
const contentAnalyzer = require('./contentAnalyzer');
const movieInfo = require('./repositories/movieInfoRepository');
const collections = require('./repositories/collectionRepository');
const tvInfo = require('./repositories/tvInfoRepository');
const actorCache = require('./repositories/actorCacheRepository');
const releaseRefresh = require('./releaseRefreshService');
const downloadDispatch = require('./downloadDispatchService');
const importPreparation = require('./importPreparationService');
const streamLibrary = require('./streamLibraryService');

module.exports = {
  db,
  releases,
  downloads,
  settings,
  nzbImport,
  tmdb,
  contentAnalyzer,
  movieInfo,
  collections,
  tvInfo,
  actorCache,
  releaseRefresh,
  downloadDispatch,
  importPreparation,
  streamLibrary
};
