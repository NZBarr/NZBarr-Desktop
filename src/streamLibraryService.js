const fs = require('fs');
const { shell } = require('electron');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const db = require('./database');
const repository = require('./repositories/streamLibraryRepository');
const settingsRepository = require('./repositories/settingsRepository');
const tmdbService = require('./tmdbService');
const appPaths = require('./appPaths');
const { parseStreamFilename, maskStreamUrl } = require('./streamFilenameParser');

const MEDIA_URL_PATTERN = /^https?:\/\//i;
const EASYNEWS_HOSTS = new Set(['members.easynews.com']);
const EASYNEWS_SEARCH_URL = 'https://members.easynews.com/2.0/search/solr-search/advanced';

function normalizeUrl(value) {
  return String(value || '').trim();
}

function extractUrls(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function validateStreamUrl(url) {
  const normalized = normalizeUrl(url);
  if (!MEDIA_URL_PATTERN.test(normalized)) {
    throw new Error('Only http and https stream URLs are supported');
  }
  return normalized;
}

function isEasynewsUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    return EASYNEWS_HOSTS.has(parsed.hostname.toLowerCase());
  } catch (error) {
    return false;
  }
}

function addEasynewsCredentials(url, settings = {}) {
  if (!isEasynewsUrl(url)) {
    return url;
  }

  const username = String(settings.easynews_username || '').trim();
  const password = String(settings.easynews_password || '').trim();
  if (!username || !password) {
    return url;
  }

  const parsed = new URL(url);
  parsed.username = username;
  parsed.password = password;
  return parsed.toString();
}

function stripUrlCredentials(url) {
  try {
    const parsed = new URL(String(url || ''));
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch (error) {
    return String(url || '');
  }
}

function normalizeComparableTitle(value) {
  return replaceNumberWordsWithNumbers(replaceRomanNumeralsWithNumbers(String(value || '')))
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^\)]*\)/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/\bs\d{1,2}\s*[ea]\s*\d{1,3}\b/gi, ' ')
    .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
    .replace(/\b(2160p|1080p|720p|576p|480p|4k|uhd|web|webdl|web-dl|webrip|bluray|blu-ray|bdrip|hdtv|hdrip|dvd|x264|x265|h264|h265|hevc|avc|aac|ac3|dts|hq|vox|vost|multi|group)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getKeywords(value) {
  return normalizeComparableTitle(value)
    .split(' ')
    .filter(word => word.length > 2);
}

function scoreLocalMatch(candidate, parsed, mediaType) {
  const candidateTitle = normalizeComparableTitle(candidate.title || candidate.original_title || candidate.original_name || '');
  const parsedTitle = normalizeComparableTitle(parsed.title || '');
  if (!candidateTitle || !parsedTitle) return 0;

  let score = 0;
  if (candidateTitle === parsedTitle) score += 100;
  if (candidateTitle.includes(parsedTitle) || parsedTitle.includes(candidateTitle)) score += 45;

  const candidateWords = new Set(candidateTitle.split(' '));
  const parsedWords = parsedTitle.split(' ');
  const overlap = parsedWords.filter(word => candidateWords.has(word)).length;
  score += overlap * 12;

  if (parsed.year) {
    const date = mediaType === 'tv' ? candidate.first_air_date : candidate.release_date;
    const candidateYear = String(date || '').slice(0, 4);
    if (candidateYear && String(parsed.year) === candidateYear) score += 35;
  }

  return score;
}

function findLocalArtworkMatch(parsed) {
  const keywords = getKeywords(parsed.title);
  if (keywords.length === 0) return null;

  const table = parsed.mediaType === 'tv' ? 'tv_info' : 'movie_info';
  const conditions = keywords.slice(0, 5).map(() => 'LOWER(title) LIKE ?').join(' OR ');
  const params = keywords.slice(0, 5).map(keyword => `%${keyword}%`);
  const rows = db.all(`SELECT * FROM ${table} WHERE ${conditions}`, params);
  if (!rows.length) return null;

  const ranked = rows
    .map(row => ({ row, score: scoreLocalMatch(row, parsed, parsed.mediaType) }))
    .filter(match => match.score >= 24)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.row || null;
}

function metadataFromLocalMatch(match, parsed) {
  if (!match) return {};
  const releaseDate = parsed.mediaType === 'tv' ? match.first_air_date : match.release_date;
  const year = releaseDate ? parseInt(String(releaseDate).slice(0, 4), 10) : parsed.year;

  return {
    title: match.title || parsed.title,
    year: Number.isFinite(year) ? year : parsed.year,
    poster_path: match.cover_path || null,
    backdrop_path: match.backdrop_path || null,
    overview: match.plot || null,
    runtime: match.runtime || null,
    tmdb_id: match.tmdb_id || null,
    imdb_id: match.imdb_id || null,
    tmdb_cache_key: match.tmdb_id ? `${parsed.mediaType}:${match.tmdb_id}` : null
  };
}

function encodeBasicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

function buildEasynewsSearchQuery(media = {}) {
  const title = String(media.title || media.clean_name || '').trim();
  const year = media.year ? String(media.year).trim() : '';
  return [title, year].filter(Boolean).join(' ');
}

function sanitizeEasynewsSearchTitle(title) {
  return String(title || '')
    .replace(/&/g, ' and ')
    .replace(/[()[\]{}'"]/g, ' ')
    .replace(/[:._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function replaceRomanNumeralsWithNumbers(title) {
  return String(title || '').replace(/\b(viii|vii|vi|iv|v|iii|ii|ix|x)\b/gi, match => {
    const values = {
      ii: '2',
      iii: '3',
      iv: '4',
      v: '5',
      vi: '6',
      vii: '7',
      viii: '8',
      ix: '9',
      x: '10'
    };
    return values[match.toLowerCase()] || match;
  });
}

function replaceNumbersWithRomanNumerals(title) {
  return String(title || '').replace(/\b(2|3|4|5|6|7|8|9|10)\b/g, match => {
    const values = {
      2: 'II',
      3: 'III',
      4: 'IV',
      5: 'V',
      6: 'VI',
      7: 'VII',
      8: 'VIII',
      9: 'IX',
      10: 'X'
    };
    return values[match] || match;
  });
}

function replaceNumbersWithWords(title) {
  return String(title || '').replace(/\b(2|3|4|5|6|7|8|9|10)\b/g, match => {
    const values = {
      2: 'Two',
      3: 'Three',
      4: 'Four',
      5: 'Five',
      6: 'Six',
      7: 'Seven',
      8: 'Eight',
      9: 'Nine',
      10: 'Ten'
    };
    return values[match] || match;
  });
}

function replaceNumberWordsWithNumbers(title) {
  return String(title || '').replace(/\b(two|three|four|five|six|seven|eight|nine|ten)\b/gi, match => {
    const values = {
      two: '2',
      three: '3',
      four: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      nine: '9',
      ten: '10'
    };
    return values[match.toLowerCase()] || match;
  });
}

function buildEasynewsSearchQueries(media = {}) {
  const rawTitle = String(media.title || media.clean_name || '').trim();
  const normalizedTitle = sanitizeEasynewsSearchTitle(rawTitle);
  const numericTitle = sanitizeEasynewsSearchTitle(replaceNumberWordsWithNumbers(replaceRomanNumeralsWithNumbers(rawTitle)));
  const romanTitle = sanitizeEasynewsSearchTitle(replaceNumbersWithRomanNumerals(numericTitle));
  const wordTitle = sanitizeEasynewsSearchTitle(replaceNumbersWithWords(numericTitle));
  const subtitleParts = rawTitle
    .split(/\s*[:\-]\s*/)
    .map(part => sanitizeEasynewsSearchTitle(part))
    .filter(part => part.length > 2);
  const subtitleTitle = subtitleParts.length > 1 ? subtitleParts[subtitleParts.length - 1] : '';
  const year = media.year ? String(media.year).trim() : '';
  const queries = new Set();

  const add = (title, includeYear = true) => {
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return;
    queries.add([safeTitle, includeYear ? year : ''].filter(Boolean).join(' '));
  };

  add(rawTitle, true);
  add(normalizedTitle, true);
  add(numericTitle, true);
  add(romanTitle, true);
  add(wordTitle, true);
  add(subtitleTitle, true);
  add(rawTitle, false);
  add(normalizedTitle, false);
  add(numericTitle, false);
  add(romanTitle, false);
  add(wordTitle, false);
  add(subtitleTitle, false);

  // Easynews often behaves better with plain words for colon-heavy franchise names.
  if (/[:]/.test(rawTitle)) {
    add(rawTitle.replace(/:/g, ' '), true);
    add(rawTitle.replace(/:/g, ' '), false);
  }

  if (/mission\s*:?\s*impossible/i.test(rawTitle)) {
    const suffix = sanitizeEasynewsSearchTitle(rawTitle.replace(/mission\s*:?\s*impossible/i, ''));
    const numericSuffix = sanitizeEasynewsSearchTitle(replaceRomanNumeralsWithNumbers(suffix));
    const romanSuffix = sanitizeEasynewsSearchTitle(replaceNumbersWithRomanNumerals(numericSuffix));
    add(`MI ${numericSuffix}`.trim(), true);
    add(`MI ${romanSuffix}`.trim(), true);
    add(`M I ${numericSuffix}`.trim(), true);
    add(`MI ${numericSuffix}`.trim(), false);
    add(`MI ${romanSuffix}`.trim(), false);
    add(`M I ${numericSuffix}`.trim(), false);
  }

  return Array.from(queries).filter(Boolean).slice(0, 16);
}

function getEasynewsFileTitle(file = {}) {
  return String(file['10'] || file.filename || '').trim();
}

function getEasynewsFileExtension(file = {}) {
  return String(file['11'] || file['2'] || '').trim().toLowerCase();
}

function getEasynewsResolution(file = {}) {
  const title = getEasynewsFileTitle(file);
  const parsed = parseStreamFilename(title);
  if (parsed.resolution) return parsed.resolution;

  const height = parseInt(file.height || file['17'] || 0, 10);
  if (height >= 1000 && height <= 1200) return '1080P';
  if (height >= 650 && height <= 800) return '720P';
  return null;
}

function isRejectedDiscoveryTitle(title) {
  return /\b(sample|trailer|teaser|featurette|behind[ ._-]?the[ ._-]?scenes|extras?|clip|proof)\b/i.test(title);
}

function isLikelyTvEpisodeTitle(title) {
  return /\bS\d{1,2}\s*E\d{1,3}\b/i.test(title) ||
    /\bS\d{1,2}\s*A\d{1,3}\b/i.test(title) ||
    /\b\d{1,2}x\d{1,3}\b/i.test(title) ||
    /\bseason[ ._-]?\d{1,2}\b/i.test(title);
}

function isBadEasynewsVideo(file = {}) {
  const duration = String(file['14'] || '');
  return Boolean(
    file.passwd ||
    file.virus ||
    String(file.type || '').toUpperCase() !== 'VIDEO' ||
    /^\d+s/i.test(duration) ||
    /^[0-5]m/i.test(duration)
  );
}

function buildEasynewsSearchUrl(query, pageNr = 1, maxResults = 100) {
  const params = new URLSearchParams({
    st: 'adv',
    sb: '1',
    fex: 'mp4',
    'fty[]': 'VIDEO',
    spamf: '1',
    u: '1',
    gx: '1',
    pno: String(pageNr),
    sS: '3',
    s1: 'dsize',
    s1d: '-',
    s2: 'relevance',
    s2d: '-',
    s3: 'dtime',
    s3d: '-',
    pby: String(maxResults),
    safeO: '0',
    gps: query
  });

  return `${EASYNEWS_SEARCH_URL}?${params.toString()}`;
}

function buildEasynewsStreamUrl(response = {}, file = {}) {
  const downURL = String(response.downURL || 'https://members.easynews.com/dl').replace(/\/+$/, '');
  const dlFarm = response.dlFarm || 'fra';
  const dlPort = response.dlPort || 443;
  const postHash = file['0'];
  const title = getEasynewsFileTitle(file);
  const ext = getEasynewsFileExtension(file) || '.mp4';
  if (!postHash || !title) return null;

  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
  const titlePath = `${encodeURIComponent(title)}${cleanExt}`;
  const url = new URL(`${downURL}/${encodeURIComponent(dlFarm)}/${encodeURIComponent(String(dlPort))}/${encodeURIComponent(`${postHash}${cleanExt}`)}/${titlePath}`);
  if (response.sid) url.searchParams.set('sid', `${response.sid}:0`);
  if (file.sig) url.searchParams.set('sig', file.sig);
  return url.toString();
}

function scoreEasynewsCandidate(file, media, parsed) {
  let score = 0;
  const title = getEasynewsFileTitle(file);
  const normalizedCandidate = normalizeComparableTitle(title);
  const normalizedMedia = normalizeComparableTitle(media.title || media.clean_name || '');
  const mediaWords = normalizedMedia.split(' ').filter(word => word.length > 2);
  const candidateWords = new Set(normalizedCandidate.split(' '));

  if (normalizedCandidate.includes(normalizedMedia)) score += 45;
  const overlap = mediaWords.filter(word => candidateWords.has(word)).length;
  score += overlap * 10;
  if (media.year && normalizedCandidate.includes(String(media.year))) score += 30;
  if (parsed.resolution === '1080P') score += 12;
  if (parsed.resolution === '720P') score += 10;
  if (String(file['18'] || '').toUpperCase().includes('H264')) score += 8;
  if (String(file['12'] || '').toUpperCase().includes('H264')) score += 8;
  if (String(file['19'] || '').toUpperCase().includes('AAC')) score += 6;
  if (isLikelyTvEpisodeTitle(title)) score -= 60;

  return Math.max(0, Math.min(score, 100));
}

function publicItem(item) {
  if (!item) return item;
  const posterPath = item.poster_path && fs.existsSync(item.poster_path)
    ? pathToFileURL(item.poster_path).toString()
    : item.poster_path;
  const backdropPath = item.backdrop_path && fs.existsSync(item.backdrop_path)
    ? pathToFileURL(item.backdrop_path).toString()
    : item.backdrop_path;

  return {
    ...item,
    poster_path: posterPath,
    backdrop_path: backdropPath,
    stream_url_masked: maskStreamUrl(item.stream_url),
    stream_url: undefined
  };
}

function getExternalPlayerLaunch(player, streamUrl) {
  const value = String(player || '').trim();
  const lower = value.toLowerCase();

  if (process.platform === 'darwin') {
    if (lower === 'vlc') {
      return { command: 'open', args: ['-a', 'VLC', streamUrl] };
    }

    if (lower === 'iina') {
      return { command: 'open', args: ['-a', 'IINA', streamUrl] };
    }

    if (value.endsWith('.app')) {
      return { command: 'open', args: ['-a', value, streamUrl] };
    }
  }

  return { command: value, args: [streamUrl] };
}

function openWithExternalPlayer(player, streamUrl) {
  return new Promise((resolve, reject) => {
    const launch = getExternalPlayerLaunch(player, streamUrl);
    const child = spawn(launch.command, launch.args, {
      detached: true,
      stdio: 'ignore',
      shell: process.platform === 'win32'
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

async function openStreamWithFallback(player, streamUrl) {
  try {
    await openWithExternalPlayer(player, streamUrl);
    return { success: true, target: 'external' };
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }

    await shell.openExternal(streamUrl);
    return {
      success: true,
      target: 'browser',
      fallback: true,
      message: 'External player was not found, so the stream opened in the browser.'
    };
  }
}

async function matchTmdb(parsed) {
  const settings = await settingsRepository.getAll();
  if (!settings.api_tmdb_key) return {};

  tmdbService.initialize(settings.api_tmdb_key, appPaths.getImageCacheDir());
  const search = parsed.mediaType === 'tv'
    ? await tmdbService.searchTV(parsed.title)
    : await tmdbService.searchMovie(parsed.title, parsed.year);

  const match = search?.results?.[0];
  if (!match?.id) return {};

  const details = parsed.mediaType === 'tv'
    ? await tmdbService.getTVDetails(match.id)
    : await tmdbService.getMovieDetails(match.id);

  const releaseDate = details.release_date || details.first_air_date || '';
  const year = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : parsed.year;
  const posterUrl = details.poster_path ? `${tmdbService.imageBaseUrl}w500${details.poster_path}` : null;
  const backdropUrl = details.backdrop_path ? `${tmdbService.imageBaseUrl}w1280${details.backdrop_path}` : null;
  const cacheKey = `${parsed.mediaType}:${details.id}`;

  repository.upsertMetadataCache({
    cache_key: cacheKey,
    media_type: parsed.mediaType,
    tmdb_id: details.id,
    title: details.title || details.name || parsed.title,
    year: Number.isFinite(year) ? year : null,
    poster_url: posterUrl,
    backdrop_url: backdropUrl,
    overview: details.overview || null,
    runtime: details.runtime || (Array.isArray(details.episode_run_time) ? details.episode_run_time[0] : null),
    raw_json: JSON.stringify(details)
  });

  return {
    title: details.title || details.name || parsed.title,
    year: Number.isFinite(year) ? year : null,
    poster_url: posterUrl,
    backdrop_url: backdropUrl,
    overview: details.overview || null,
    runtime: details.runtime || (Array.isArray(details.episode_run_time) ? details.episode_run_time[0] : null),
    tmdb_id: details.id,
    imdb_id: details.external_ids?.imdb_id || null,
    tmdb_cache_key: cacheKey
  };
}

class StreamLibraryService {
  async importUrls(urls = []) {
    const imported = [];
    const skipped = [];
    const failed = [];
    const settings = await settingsRepository.getAll();

    for (const rawUrl of urls) {
      let url;
      try {
        const validatedUrl = validateStreamUrl(rawUrl);
        url = addEasynewsCredentials(validatedUrl, settings);
        const existing = repository.findByStreamUrl(url) || repository.findByStreamUrl(stripUrlCredentials(url));
        if (existing) {
          skipped.push({ reason: 'Already imported', url: maskStreamUrl(url), item: publicItem(existing) });
          continue;
        }

        const parsed = parseStreamFilename(url);
        if (!parsed.isVideo) {
          skipped.push({ reason: 'URL does not look like a playable media file', url: maskStreamUrl(url) });
          continue;
        }

        let metadata = metadataFromLocalMatch(findLocalArtworkMatch(parsed), parsed);
        try {
          if (!metadata.poster_path && !metadata.poster_url) {
            metadata = { ...metadata, ...(await matchTmdb(parsed)) };
          }
        } catch (error) {
          metadata = metadata || {};
        }

        const item = repository.create({
          title: metadata.title || parsed.title,
          original_filename: parsed.originalFilename,
          media_type: parsed.mediaType,
          year: metadata.year || parsed.year,
          season_number: parsed.seasonNumber,
          episode_number: parsed.episodeNumber,
          stream_url: url,
          poster_url: metadata.poster_url || null,
          poster_path: metadata.poster_path || null,
          backdrop_url: metadata.backdrop_url || null,
          backdrop_path: metadata.backdrop_path || null,
          overview: metadata.overview || null,
          runtime: metadata.runtime || null,
          resolution: parsed.resolution,
          source: parsed.source,
          video_codec: parsed.videoCodec,
          release_group: parsed.releaseGroup,
          file_size: null,
          tmdb_id: metadata.tmdb_id || null,
          imdb_id: metadata.imdb_id || null,
          tmdb_cache_key: metadata.tmdb_cache_key || null,
          watched: false,
          favorite: false
        });

        imported.push(publicItem(item));
      } catch (error) {
        failed.push({
          url: rawUrl ? maskStreamUrl(rawUrl) : '',
          error: error.message
        });
      }
    }

    return { success: failed.length === 0, imported, skipped, failed };
  }

  async importTextFile(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return this.importUrls(extractUrls(content));
  }

  list(options = {}) {
    return repository.list(options).map(publicItem);
  }

  getCounts() {
    const counts = repository.getCounts() || {};
    return {
      total: counts.total || 0,
      movies: counts.movies || 0,
      tv: counts.tv || 0,
      favorites: counts.favorites || 0,
      watched: counts.watched || 0
    };
  }

  updateFlags(id, fields) {
    return publicItem(repository.updateFlags(id, fields));
  }

  delete(id) {
    return repository.delete(id);
  }

  listForMedia(media = {}) {
    const mediaType = media.mediaType || media.media_type || 'movie';
    const tmdbId = media.tmdbId || media.tmdb_id || null;
    const imdbId = media.imdbId || media.imdb_id || null;
    const title = media.title || media.clean_name || '';
    const year = media.year || null;
    const normalizedTitle = normalizeComparableTitle(title);

    return repository.list({ mediaType, limit: 500 }).filter(item => {
      if (tmdbId && item.tmdb_id && String(item.tmdb_id) === String(tmdbId)) return true;
      if (imdbId && item.imdb_id && String(item.imdb_id) === String(imdbId)) return true;

      const itemTitle = normalizeComparableTitle(item.title || item.original_filename || '');
      const titleMatches = normalizedTitle && itemTitle && (itemTitle === normalizedTitle || itemTitle.includes(normalizedTitle) || normalizedTitle.includes(itemTitle));
      if (!titleMatches) return false;

      if (year && item.year) {
        return String(item.year) === String(year);
      }

      return true;
    }).map(publicItem);
  }

  async discoverEasynewsMovieStreams(media = {}) {
    const settings = await settingsRepository.getAll();
    const username = String(settings.easynews_username || '').trim();
    const password = String(settings.easynews_password || '').trim();

    if (!username || !password) {
      return {
        success: false,
        error: 'Easynews credentials are not configured in Settings.'
      };
    }

    const requestedPage = Math.max(1, parseInt(media.page || media.pageNr || 1, 10) || 1);
    const pagesPerQuery = Math.max(1, Math.min(parseInt(media.pagesPerQuery || 2, 10) || 2, 4));
    const maxResults = Math.max(25, Math.min(parseInt(media.maxResults || 100, 10) || 100, 250));
    const queries = buildEasynewsSearchQueries(media);
    if (queries.length === 0) {
      return { success: false, error: 'Movie title is required for Easynews discovery.' };
    }

    const existing = this.listForMedia({
      mediaType: 'movie',
      tmdbId: media.tmdbId || media.tmdb_id || null,
      imdbId: media.imdbId || media.imdb_id || null,
      title: media.title || media.clean_name || '',
      year: media.year || null
    });
    const existingUrlKeys = new Set(existing.map(item => stripUrlCredentials(item.stream_url_masked || '')));
    const seenHashes = new Set(Array.isArray(media.seenIds) ? media.seenIds.map(String) : []);
    const candidates = [];
    const searched = [];
    const stats = {
      raw: 0,
      nonMp4: 0,
      wrongResolution: 0,
      rejectedTitle: 0,
      badVideo: 0,
      tvLike: 0,
      duplicate: 0,
      lowScore: 0
    };
    let totalResults = 0;

    for (const query of queries) {
      searched.push(query);
      for (let pageOffset = 0; pageOffset < pagesPerQuery; pageOffset++) {
        const pageNr = ((requestedPage - 1) * pagesPerQuery) + pageOffset + 1;
        const url = buildEasynewsSearchUrl(query, pageNr, maxResults);
        const response = await fetch(url, {
          headers: {
            Authorization: encodeBasicAuth(username, password),
            Accept: 'application/json'
          },
          signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) {
          if (candidates.length > 0) break;
          return {
            success: false,
            error: `Easynews search failed: ${response.status} ${response.statusText}`
          };
        }

        const json = await response.json();
        const files = Array.isArray(json.data) ? json.data : [];
        stats.raw += files.length;
        totalResults += Number(json.results || files.length || 0);

        for (const file of files) {
          const hash = String(file['0'] || '');
          if (hash && seenHashes.has(hash)) {
            stats.duplicate++;
            continue;
          }
          if (hash) seenHashes.add(hash);

          const title = getEasynewsFileTitle(file);
          const ext = getEasynewsFileExtension(file);
          const resolution = getEasynewsResolution(file);
          if (ext !== '.mp4') {
            stats.nonMp4++;
            continue;
          }
          if (!['720P', '1080P'].includes(resolution)) {
            stats.wrongResolution++;
            continue;
          }
          if (!title || isRejectedDiscoveryTitle(title)) {
            stats.rejectedTitle++;
            continue;
          }
          if (isBadEasynewsVideo(file)) {
            stats.badVideo++;
            continue;
          }

          const parsed = parseStreamFilename(title);
          if (parsed.mediaType === 'tv' || isLikelyTvEpisodeTitle(title)) {
            stats.tvLike++;
            continue;
          }

          const streamUrl = buildEasynewsStreamUrl(json, file);
          if (!streamUrl) continue;
          if (existingUrlKeys.has(stripUrlCredentials(streamUrl))) {
            stats.duplicate++;
            continue;
          }

          const score = scoreEasynewsCandidate(file, media, { ...parsed, resolution });
          if (score < 20) {
            stats.lowScore++;
            continue;
          }

          candidates.push({
            id: String(file['0'] || candidates.length),
            title,
            stream_url: streamUrl,
            stream_url_masked: maskStreamUrl(streamUrl),
            resolution,
            extension: ext,
            video_codec: parsed.videoCodec || file['12'] || null,
            audio_codec: file['18'] || file['19'] || null,
            size: file.rawSize || file.size || null,
            size_label: file['4'] || null,
            duration: file['14'] || null,
            score,
            query,
            page: pageNr
          });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score || (b.size || 0) - (a.size || 0));

    return {
      success: true,
      query: searched.join(' | '),
      queries: searched,
      page: requestedPage,
      nextPage: requestedPage + 1,
      pagesPerQuery,
      totalResults,
      stats,
      hasMore: true,
      candidates: candidates.slice(0, 50)
    };
  }

  async refreshMetadata(id = null) {
    const items = id ? [repository.getById(id)].filter(Boolean) : repository.list({ limit: 500 });
    let updated = 0;

    for (const item of items) {
      const parsed = {
        ...parseStreamFilename(item.original_filename || item.stream_url),
      };
      parsed.mediaType = parsed.mediaType === 'tv' ? 'tv' : (item.media_type || 'movie');
      parsed.title = parsed.title || item.title || '';

      let metadata = metadataFromLocalMatch(findLocalArtworkMatch(parsed), parsed);
      try {
        if (!metadata.poster_path && !metadata.poster_url) {
          metadata = { ...metadata, ...(await matchTmdb(parsed)) };
        }
      } catch (error) {
        metadata = metadata || {};
      }

      const hasUsefulMetadata = metadata.poster_path || metadata.poster_url || metadata.title || metadata.overview || metadata.tmdb_id;
      if (!hasUsefulMetadata) continue;

      repository.updateMetadata(item.id, {
        media_type: parsed.mediaType,
        title: metadata.title || item.title,
        year: metadata.year || item.year,
        poster_url: metadata.poster_url || item.poster_url,
        poster_path: metadata.poster_path || item.poster_path,
        backdrop_url: metadata.backdrop_url || item.backdrop_url,
        backdrop_path: metadata.backdrop_path || item.backdrop_path,
        overview: metadata.overview || item.overview,
        runtime: metadata.runtime || item.runtime,
        tmdb_id: metadata.tmdb_id || item.tmdb_id,
        imdb_id: metadata.imdb_id || item.imdb_id,
        tmdb_cache_key: metadata.tmdb_cache_key || item.tmdb_cache_key
      });
      updated++;
    }

    return { success: true, updated };
  }

  async play(id) {
    const item = repository.getById(id);
    if (!item) {
      return { success: false, error: 'Stream not found' };
    }

    const settings = await settingsRepository.getAll();
    const customPlayerPath = String(settings.player_external_path || '').trim();
    const configuredPlayer = String(settings.player_external || '').trim();
    const streamUrl = addEasynewsCredentials(item.stream_url, settings);

    if (customPlayerPath) {
      return openStreamWithFallback(customPlayerPath, streamUrl);
    }

    if (configuredPlayer && configuredPlayer !== 'built-in') {
      return openStreamWithFallback(configuredPlayer, streamUrl);
    }

    await shell.openExternal(streamUrl);
    return { success: true, target: 'browser' };
  }

  async getPlaybackUrl(id) {
    const item = repository.getById(id);
    if (!item) {
      return null;
    }

    const settings = await settingsRepository.getAll();
    return addEasynewsCredentials(item.stream_url, settings);
  }
}

module.exports = new StreamLibraryService();
