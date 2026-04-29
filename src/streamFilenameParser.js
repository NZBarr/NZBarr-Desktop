const path = require('path');

const VIDEO_EXTENSIONS = new Set(['mkv', 'mp4', 'avi', 'mov', 'm4v', 'webm', 'ts', 'm2ts']);
const QUALITY_PATTERN = /\b(2160p|1080p|720p|576p|480p|4k|uhd)\b/i;
const SOURCE_PATTERN = /\b(web[-_. ]?dl|webrip|web|bluray|blu[-_. ]?ray|bdrip|hdtv|hdrip|dvd)\b/i;
const CODEC_PATTERN = /\b(x264|h264|h\.264|avc|x265|h265|h\.265|hevc|av1)\b/i;

function cleanTitle(value) {
  return String(value || '')
    .replace(/\[(?:film|movie|tv|serie|series)\]/gi, ' ')
    .replace(/[._]+/g, ' ')
    .replace(/\b(HQ|VOX|VOST|MULTI|DUBBED|SUBBED)\b/gi, ' ')
    .replace(/\s*-\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSource(value) {
  const compact = String(value || '').replace(/[._\s-]/g, '').toLowerCase();
  if (compact === 'webdl' || compact === 'web' || compact === 'webrip') return 'WEB-DL';
  if (compact === 'bluray' || compact === 'bluray' || compact === 'bdrip') return 'BluRay';
  if (compact === 'hdtv') return 'HDTV';
  if (compact === 'hdrip') return 'HDRip';
  if (compact === 'dvd') return 'DVD';
  return value || null;
}

function normalizeCodec(value) {
  const lower = String(value || '').toLowerCase();
  if (/(x265|h265|h\.265|hevc)/.test(lower)) return 'H.265';
  if (/(x264|h264|h\.264|avc)/.test(lower)) return 'H.264';
  if (/av1/.test(lower)) return 'AV1';
  return value || null;
}

function getFilenameFromUrl(input) {
  try {
    const parsed = new URL(String(input).trim());
    const pathname = decodeURIComponent(parsed.pathname || '');
    return path.basename(pathname);
  } catch (error) {
    return path.basename(String(input || '').trim());
  }
}

function parseStreamFilename(input) {
  const filename = getFilenameFromUrl(input);
  const extension = path.extname(filename).replace('.', '').toLowerCase();
  const withoutExtension = filename.replace(/\.[^.]+$/, '');
  const name = withoutExtension.trim();

  const result = {
    originalFilename: filename || String(input || '').trim(),
    mediaType: 'movie',
    title: cleanTitle(name),
    year: null,
    seasonNumber: null,
    episodeNumber: null,
    resolution: null,
    source: null,
    videoCodec: null,
    releaseGroup: null,
    container: extension || null,
    isVideo: !extension || VIDEO_EXTENSIONS.has(extension)
  };

  const seasonEpisode = name.match(/(?:^|[ ._-])S(\d{1,2})E(\d{1,3})(?:[ ._-]|$)/i)
    || name.match(/(?:^|[ ._-])S(\d{1,2})[ ._-]*A(\d{1,3})(?:[ ._-]|$)/i)
    || name.match(/(?:^|[ ._-])(\d{1,2})x(\d{1,3})(?:[ ._-]|$)/i);

  if (seasonEpisode) {
    result.mediaType = 'tv';
    result.seasonNumber = parseInt(seasonEpisode[1], 10);
    result.episodeNumber = parseInt(seasonEpisode[2], 10);
    result.title = cleanTitle(name.slice(0, seasonEpisode.index));
  } else {
    const yearMatch = name.match(/(?:^|[ ._(\[-])((?:19|20)\d{2})(?:[ ._)\]-]|$)/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
      result.title = cleanTitle(name.slice(0, yearMatch.index));
    }
  }

  const qualityMatch = name.match(QUALITY_PATTERN);
  if (qualityMatch) {
    const quality = qualityMatch[1].toUpperCase();
    result.resolution = quality === '4K' || quality === 'UHD' ? '2160P' : quality;
  }

  const sourceMatch = name.match(SOURCE_PATTERN);
  if (sourceMatch) {
    result.source = normalizeSource(sourceMatch[1]);
  }

  const codecMatch = name.match(CODEC_PATTERN);
  if (codecMatch) {
    result.videoCodec = normalizeCodec(codecMatch[1]);
  }

  const groupMatch = name.match(/-([A-Za-z0-9]+)$/);
  if (groupMatch) {
    result.releaseGroup = groupMatch[1];
  }

  if (!result.title) {
    result.title = cleanTitle(name);
  }

  return result;
}

module.exports = {
  parseStreamFilename,
  maskStreamUrl(url) {
    try {
      const parsed = new URL(String(url || ''));
      if (parsed.username || parsed.password) {
        parsed.username = parsed.username ? '***' : '';
        parsed.password = parsed.password ? '***' : '';
      }
      return parsed.toString();
    } catch (error) {
      return String(url || '').replace(/\/\/([^/@\s:]+):([^/@\s]+)@/g, '//***:***@');
    }
  }
};
