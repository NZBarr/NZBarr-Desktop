// NZBarr Desktop - NZB Filename Parser
// Parses release filenames like:
// Cinderella (2021) [2160p-MA-WEB-DL-DTS-HD-MA-DV-HDR-265-FLUX-mkv] (imdb-tt1661199).nzb

class FilenameParser {
  /**
   * Parse a release filename and extract all metadata
   */
  parseFilename(filename) {
    const result = {
      title: '',
      year: null,
      resolution: null,
      videoCodec: null,
      audioCodec: null,
      audioChannels: null,
      source: null,
      format: null,
      releaseGroup: null,
      imdbId: null,
      tmdbId: null,
      season: null,
      episode: null,
      languages: [],
      subtitles: false,
      is3D: false,
      isHDR: false,
      hdrFormat: null
    };

    // Remove .nzb/.nzb.gz extension
    let name = filename
      .replace(/\.nzb\.gz$/i, '')
      .replace(/\.nzb$/i, '')
      .replace(/^[a-f0-9]{32}-/i, '')
      .trim();

    // Extract IMDb ID: (imdb-tt1234567)
    const imdbMatch = name.match(/(?:imdb-)?(tt\d{7,8})/i);
    if (imdbMatch) {
      result.imdbId = imdbMatch[1];
      name = name.replace(imdbMatch[0], '');
    }

    // Extract TMDB ID: (tmdb-12345)
    const tmdbMatch = name.match(/tmdb-(\d+)/i);
    if (tmdbMatch) {
      result.tmdbId = parseInt(tmdbMatch[1]);
      name = name.replace(tmdbMatch[0], '');
    }

    // Extract year: (2021) or [2021]
    const yearMatch = name.match(/[\[(](\d{4})[\])]/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1]);
    }

    // Extract season/episode: [S01E02], S01E02, 1x02, Season.1.Ep.2, Seizoen.1.Aflevering.2
    const seMatch = name.match(/[\[(]S(\d{1,2})E(\d{1,3})[\])]/i) ||
                   name.match(/S(\d{1,2})E(\d{1,3})/i) ||
                   name.match(/(\d{1,2})x(\d{1,3})/i) ||
                   name.match(/(?:Season|Seizoen)[\s._-]*(\d{1,2})(?:[._\s-]*(?:Episode|Aflevering)[\s._-]*(\d{1,3}))?/i);
    if (seMatch) {
      result.season = parseInt(seMatch[1]);
      result.episode = seMatch[2] ? parseInt(seMatch[2]) : 0;
    }

    // Extract complete season: [S01], [S02], Season 1, Seizoen 1
    if (!result.season) {
      const seasonMatch = name.match(/[\[(]S(\d{1,2})[\])]/i) ||
                          name.match(/(?:Season|Seizoen)[\s._-]*(\d{1,2})/i);
      if (seasonMatch) {
        result.season = parseInt(seasonMatch[1]);
        // Keep season as-is: S00=Specials, S99=Complete Series, others=numbered seasons
        result.episode = 0; // Complete season/series = episode 0
      }
    }

    // Extract from bracketed metadata: [2160p-MA-WEB-DL-DTS-HD-MA-DV-HDR-265-FLUX-mkv]
    // Find the bracket that contains resolution or codec keywords (not [SxxExx] or [Sxx] brackets)
    const allBrackets = name.matchAll(/\[([^\]]+)\]/g);
    let metadataBracket = null;
    for (const match of allBrackets) {
      const content = match[1];
      // Skip brackets that are purely season/episode patterns
      if (/^S\d{1,2}(E\d{1,3})?$/i.test(content.trim())) continue;
      if (/^S\d{1,2}$/i.test(content.trim())) continue;
      // Check if this bracket has resolution/codec keywords
      if (/\d{3,4}[pi]|4K|UHD|WEB|BluRay|HDTV|x264|x265|h264|h265|HEVC|AVC|DTS|DD|AC3|AAC|FLAC|mkv|mp4|avi/i.test(content)) {
        metadataBracket = content;
        break;
      }
    }

    if (metadataBracket) {
      const parts = metadataBracket.split(/[-_.\s]+/);

      for (const part of parts) {
        const upper = part.toUpperCase();

        // Resolution
        if (/^(\d{3,4})[PI]$/i.test(part)) {
          result.resolution = part.toUpperCase();
        } else if (upper === '4K' || upper === 'UHD') {
          result.resolution = '2160P';
        }

        // Video codec
        if (['HEVC', 'H265', 'X265', 'H.265'].includes(upper)) {
          result.videoCodec = 'H.265';
        } else if (['AVC', 'H264', 'X264', 'H.264'].includes(upper)) {
          result.videoCodec = 'H.264';
        } else if (upper === 'AV1') {
          result.videoCodec = 'AV1';
        } else if (upper === 'VP9') {
          result.videoCodec = 'VP9';
        } else if (/^265$/i.test(part)) {
          result.videoCodec = 'H.265';
        } else if (/^264$/i.test(part)) {
          result.videoCodec = 'H.264';
        }

        // Audio codec
        if (upper === 'DTS') {
          result.audioCodec = 'DTS';
        } else if (upper === 'DTSHDMA' || upper === 'DTSHD') {
          result.audioCodec = 'DTS-HD MA';
        } else if (upper === 'DTSHDHR' || upper === 'DTSXHR') {
          result.audioCodec = 'DTS-HD HR';
        } else if (upper === 'DTSES' || upper === 'DTS-ES') {
          result.audioCodec = 'DTS-ES';
        } else if (upper === 'DTSX' || upper === 'DTS-X') {
          result.audioCodec = 'DTS:X';
        } else if (upper === 'TRUEHD' || upper === 'THD') {
          result.audioCodec = 'TrueHD';
        } else if (upper === 'ATMOS') {
          result.audioCodec = 'Dolby Atmos';
        } else if (upper === 'DDP' || upper === 'EAC3' || upper === 'DDP51' || upper === 'EAC351') {
          result.audioCodec = 'DD+';
        } else if (upper === 'DD' || upper === 'AC3' || upper === 'AC351') {
          result.audioCodec = 'AC3';
        } else if (upper === 'AAC' || upper === 'AAC20' || upper === 'AAC51') {
          result.audioCodec = 'AAC';
        } else if (upper === 'FLAC' || upper === 'FLAC20') {
          result.audioCodec = 'FLAC';
        } else if (upper === 'OPUS') {
          result.audioCodec = 'Opus';
        } else if (upper === 'MA') {
          // Master Audio - usually DTS-HD MA
          if (!result.audioCodec) result.audioCodec = 'DTS-HD MA';
        }

        // Audio channels
        if (['7.1', '71'].includes(part)) {
          result.audioChannels = '7.1';
        } else if (['5.1', '51'].includes(part)) {
          result.audioChannels = '5.1';
        } else if (['2.0', '20', 'STEREO'].includes(upper)) {
          result.audioChannels = '2.0';
        } else if (['1.0', '10', 'MONO'].includes(upper)) {
          result.audioChannels = '1.0';
        }

        // Source
        if (upper === 'WEBDL' || upper === 'WEB' || upper === 'WEBRIP') {
          result.source = 'WEB-DL';
        } else if (upper === 'BLURAY' || upper === 'BLURIP' || upper === 'BDRIP' || upper === 'BD') {
          result.source = 'BluRay';
        } else if (upper === 'HDTV') {
          result.source = 'HDTV';
        } else if (upper === 'DVD' || upper === 'DVD5' || upper === 'DVD9') {
          result.source = 'DVD';
        } else if (upper === 'CAM' || upper === 'CAMRIP') {
          result.source = 'CAM';
        } else if (upper === 'HDRIP') {
          result.source = 'HDRip';
        }

        // HDR/DV
        if (upper === 'DV' || upper === 'DOLBYVISION' || upper === 'DOVI') {
          result.isHDR = true;
          result.hdrFormat = 'Dolby Vision';
        } else if (upper === 'HDR' || upper === 'HDR10' || upper === 'HDR10+') {
          result.isHDR = true;
          result.hdrFormat = part;
        } else if (upper === 'HLG') {
          result.isHDR = true;
          result.hdrFormat = 'HLG';
        }

        // 3D
        if (upper === '3D' || upper === 'HSBS' || upper === 'SBS' || upper === 'OU') {
          result.is3D = true;
        }

        // Subtitles
        if (upper === 'SUB' || upper === 'SUBS' || upper === 'SUBBED' || upper === 'SUBTITLED') {
          result.subtitles = true;
        }

        // Format/container
        if (['MKV', 'MP4', 'AVI', 'TS', 'M2TS'].includes(upper)) {
          result.format = part.toUpperCase();
        }
      }
    }

    // Fallback: inspect the full release name when the useful tags are not inside brackets.
    const looseName = name.replace(/\[[^\]]+\]/g, ' ').replace(/\([^\)]*\)/g, ' ');

    if (!result.resolution) {
      const resolutionMatch = looseName.match(/\b(2160p|1080p|720p|576p|480p|4k|uhd)\b/i);
      if (resolutionMatch) {
        const value = resolutionMatch[1].toUpperCase();
        result.resolution = value === '4K' || value === 'UHD' ? '2160P' : value;
      }
    }

    if (!result.videoCodec) {
      if (/\b(hevc|h265|x265|265)\b/i.test(looseName)) {
        result.videoCodec = 'H.265';
      } else if (/\b(avc|h264|x264|264)\b/i.test(looseName)) {
        result.videoCodec = 'H.264';
      } else if (/\b(av1)\b/i.test(looseName)) {
        result.videoCodec = 'AV1';
      } else if (/\b(vp9)\b/i.test(looseName)) {
        result.videoCodec = 'VP9';
      }
    }

    if (!result.audioCodec) {
      if (/\b(dts-hd-ma|dtshdma|dts-hd|dts)\b/i.test(looseName)) {
        result.audioCodec = /dts-hd/i.test(looseName) ? 'DTS-HD MA' : 'DTS';
      } else if (/\b(eac3|ddp|dd\+)\b/i.test(looseName)) {
        result.audioCodec = 'DD+';
      } else if (/\b(ac3|dd)\b/i.test(looseName)) {
        result.audioCodec = 'AC3';
      } else if (/\b(aac)\b/i.test(looseName)) {
        result.audioCodec = 'AAC';
      } else if (/\b(flac)\b/i.test(looseName)) {
        result.audioCodec = 'FLAC';
      } else if (/\b(opus)\b/i.test(looseName)) {
        result.audioCodec = 'Opus';
      } else if (/\b(mp3)\b/i.test(looseName)) {
        result.audioCodec = 'MP3';
      }
    }

    if (!result.audioChannels) {
      if (/\b7[.\s]?1\b/i.test(looseName)) {
        result.audioChannels = '7.1';
      } else if (/\b5[.\s]?1\b/i.test(looseName)) {
        result.audioChannels = '5.1';
      } else if (/\b2[.\s]?0\b/i.test(looseName)) {
        result.audioChannels = '2.0';
      } else if (/\b1[.\s]?0\b/i.test(looseName)) {
        result.audioChannels = '1.0';
      }
    }

    if (!result.source) {
      if (/\b(web[-\s]?dl|webrip|web)\b/i.test(looseName)) {
        result.source = 'WEB-DL';
      } else if (/\b(blu[-\s]?ray|bdrip|bluray)\b/i.test(looseName)) {
        result.source = 'BluRay';
      } else if (/\b(hdtv)\b/i.test(looseName)) {
        result.source = 'HDTV';
      } else if (/\b(dvdrip|dvd9?|dvd5?)\b/i.test(looseName)) {
        result.source = 'DVD';
      }
    }

    if (!result.hdrFormat) {
      if (/\b(dv|dovi|dolby[\s.-]?vision)\b/i.test(looseName)) {
        result.hdrFormat = 'Dolby Vision';
        result.isHDR = true;
      } else if (/\b(hdr10\+?|hdr|hlg)\b/i.test(looseName)) {
        result.hdrFormat = 'HDR';
        result.isHDR = true;
      }
    }

    if (!result.subtitles && /\b(subs?|subbed|subtitled|nl subs?|eng subs?)\b/i.test(looseName)) {
      result.subtitles = true;
    }

    // Extract release group: -GROUP at end
    const groupMatch = name.match(/[-_]([A-Z0-9]{2,20})$/i);
    if (groupMatch && !['MKV', 'MP4', 'AVI', 'NFO', 'RAR', 'ZIP'].includes(groupMatch[1].toUpperCase())) {
      result.releaseGroup = groupMatch[1];
    }

    // Extract languages: -NL, -EN, -DE, etc.
    const langPattern = /[-_](NL|EN|DE|FR|ES|IT|PT|RU|SV|DA|NO|FI|PL|CZ|HU|RO|TR|GR|JP|KR|CN)/gi;
    let langMatch;
    while ((langMatch = langPattern.exec(name)) !== null) {
      result.languages.push(langMatch[1].toUpperCase());
    }

    // Clean title - preserve unknown descriptive blocks, strip only metadata blocks
    let title = name.replace(/\[([^\]]+)\]|\(([^\)]+)\)/g, (full, square, round) => {
      const content = String(square || round || '').trim();
      if (!content) return ' ';
      if (this.isMetadataContainer(content)) return ' ';
      return ` ${content} `;
    })
      .replace(/\.[a-z]{2,4}$/i, '')  // Remove extension
      .replace(/[-_.]+/g, ' ')  // Replace separators with spaces
      .replace(/\s*\(\s*\)/g, '')  // Remove empty ()
      .replace(/\b(BluRay|WEB.DL|HDTV|HDRip|CAMRip|DVDRip|BRRip|WEBRip|REMUX|Internal|PROPER|REPACK)\b/gi, ' ')  // Remove source tags
      .replace(/\b(2160p|1080p|720p|480p|576p|4K|UHD|SD)\b/gi, ' ')  // Remove resolution
      .replace(/\b(x264|x265|h264|h265|HEVC|AVC|AV1|VP9|Xvid|DivX)\b/gi, ' ')  // Remove video codec
      .replace(/\b(DDP|DD|DTS|AC3|AAC|FLAC|Opus|MP3|TrueHD|Atmos|DTS-HD|E-AC3|5.1|7.1|2.0|1.0|DTS:X)\b/gi, ' ')  // Remove audio tags
      .replace(/\b(NL|EN|DE|FR|ES|IT|PT|RU|SV|DA|NO|FI|PL|CZ|HU|RO|TR|GR|JP|KR|CN)\b/g, ' ')  // Remove uppercase language codes
      .replace(/\b(DV|HDR|HDR10|HDR10\+|HLG|Dolby.Vision|Dolby.Vision|Atmos)\b/gi, ' ')  // Remove HDR tags
      .replace(/\b(Retail|Sub|Subs|Subbed|Multi|Dual|Complete)\b/gi, ' ')  // Remove misc tags
      .replace(/\b(kaPPa|FraMeSToR|RandH|FLUX|NOGRP|NoGrp)\b/gi, ' ')  // Remove release group
      .replace(/\s+/g, ' ')  // Collapse spaces
      .trim();

    result.title = title;

    return result;
  }

  isMetadataContainer(content) {
    const text = String(content || '').trim();
    if (!text) return false;
    if (/^(?:imdb-)?tt\d{7,8}$/i.test(text)) return true;
    if (/^tmdb-\d+$/i.test(text)) return true;
    if (/^S\d{1,2}(?:E\d{1,3})?$/i.test(text)) return true;
    if (/^\d{4}$/.test(text) && !/^(?:2160|1080|720|576|480)$/.test(text)) return true;
    if (/\d{3,4}[pi]|4K|UHD|WEB|BluRay|HDTV|x264|x265|h264|h265|HEVC|AVC|DTS|DD|AC3|AAC|FLAC|mkv|mp4|avi/i.test(text)) return true;
    if (/^(?:(?:Season|Seizoen)[\s._-]*\d{1,2}|(?:Episode|Aflevering)[\s._-]*\d{1,3})$/i.test(text)) return true;
    return false;
  }

  /**
   * Detect media type from parsed data
   */
  detectMediaType(parsed) {
    // TV: has season (even without episode), or S99/Season/Seizoen patterns
    if (parsed.season !== null && parsed.season !== undefined) {
      return 'tv';
    }

    // Check title for TV indicators
    const title = parsed.title?.toLowerCase() || '';
    if (/s\d+e\d+|season|seizoen|episode|aflevering|series/i.test(title)) {
      return 'tv';
    }

    // Default to movie if year is present
    if (parsed.year) {
      return 'movie';
    }

    // Music: title contains " - " pattern (Artist - Album) or common music keywords
    if (/ - |mp3|flac|album|disc|tracks/i.test(title)) {
      return 'music';
    }

    return 'other';
  }
}

module.exports = new FilenameParser();

// Helper to guess category ID from media type
FilenameParser.prototype.guessCategoryId = function(mediaType) {
  const categoryMap = {
    'movie': 1010,    // Movies HD
    'tv': 2010,       // TV HD
    'music': 3020,    // Music FLAC
    'book': 5010,     // Ebooks
    'console': 4010,  // Games
    'other': 1
  };

  return categoryMap[mediaType] || 1;
};
