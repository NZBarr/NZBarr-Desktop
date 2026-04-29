// NZBarr Desktop - NZB Import Service
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const appPaths = require('./appPaths');
const nzbFileUtils = require('./nzbFileUtils');
const nzbParser = require('./nzbParser');
const filenameParser = require('./filenameParser');
const contentAnalyzer = require('./contentAnalyzer');
const tmdbService = require('./tmdbService');
const musicMetadataService = require('./musicMetadataService');
const releaseRepository = require('./repositories/releaseRepository');
const movieInfoRepository = require('./repositories/movieInfoRepository');
const collectionRepository = require('./repositories/collectionRepository');
const settingsRepository = require('./repositories/settingsRepository');

class NZBImportService {
  constructor() {
    this.nzbStoragePath = null;
    this.settings = null;
  }

  sanitizeNZBFileStem(value) {
    return String(value || 'unknown')
      .replace(/[\/\\:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'unknown';
  }

  sanitizeNZBGuidForFileName(value) {
    return String(value || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .trim();
  }

  buildNZBStorageStem(fileStem, nzbGuid = null) {
    const safeStem = this.sanitizeNZBFileStem(fileStem).replace(/^[a-f0-9]{32}-/i, '');
    const safeGuid = this.sanitizeNZBGuidForFileName(nzbGuid);

    if (!safeGuid) {
      return safeStem;
    }

    return safeStem.toLowerCase().startsWith(`${safeGuid.toLowerCase()}-`)
      ? safeStem
      : `${safeGuid}-${safeStem}`;
  }

  getUniqueNZBStoragePath(fileStem, nzbGuid = null) {
    const safeStem = this.buildNZBStorageStem(fileStem, nzbGuid);
    const shardDir = appPaths.getShardedNZBDirectory(safeStem, this.settings || {});

    if (!fs.existsSync(shardDir)) {
      fs.mkdirSync(shardDir, { recursive: true });
    }

    const basePath = path.join(shardDir, `${safeStem}.nzb.gz`);
    if (!fs.existsSync(basePath)) {
      return basePath;
    }

    let counter = 2;
    while (true) {
      const candidate = path.join(shardDir, `${safeStem} (${counter}).nzb.gz`);
      if (!fs.existsSync(candidate)) {
        return candidate;
      }
      counter += 1;
    }
  }

  calculateContentHash(nzbData, filePath) {
    if (nzbData?.files?.length > 0) {
      const messageIds = [];
      for (const file of nzbData.files) {
        if (!file?.segments) continue;
        for (const seg of file.segments) {
          const messageId = seg.messageId || seg._ || '';
          if (messageId) messageIds.push(messageId);
        }
      }

      if (messageIds.length > 0) {
        messageIds.sort();
        const hashContent = messageIds.join('|||');
        return crypto.createHash('md5').update(hashContent).digest('hex');
      }
    }

    const fileBuffer = nzbFileUtils.readNZBBuffer(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }

  async repairReleaseNZBIdentity(release) {
    if (!release?.id || !release.nzb_file_path || !fs.existsSync(release.nzb_file_path)) {
      return false;
    }

    try {
      const parsed = await nzbParser.parseNZBFile(release.nzb_file_path);
      const actualHash = this.calculateContentHash(parsed, release.nzb_file_path);
      const actualGuid = parsed.nzbGuid || null;
      const needsUpdate = release.nzb_hash !== actualHash || release.nzb_guid !== actualGuid;

      if (!needsUpdate) {
        return false;
      }

      await releaseRepository.update(release.id, {
        nzb_hash: actualHash,
        nzb_guid: actualGuid
      });

      console.log(`  🔧 Repaired NZB identity for release #${release.id} (guid/hash refreshed from current file)`);
      return true;
    } catch (error) {
      console.warn(`  ⚠ Failed to repair NZB identity for release #${release.id}: ${error.message}`);
      return false;
    }
  }

  async resolveDuplicateCandidate(candidate, expectedHash, expectedGuid) {
    if (!candidate) {
      return null;
    }

    const repaired = await this.repairReleaseNZBIdentity(candidate);
    if (!repaired) {
      return candidate;
    }

    const refreshedByHash = expectedHash
      ? await releaseRepository.getByNzbHash(expectedHash)
      : null;
    if (refreshedByHash) {
      return refreshedByHash;
    }

    const refreshedByGuid = expectedGuid
      ? await releaseRepository.getByGuid(expectedGuid)
      : null;
    if (refreshedByGuid) {
      return refreshedByGuid;
    }

    return null;
  }

  /**
   * Initialize services
   */
  async initialize() {
    // Always reload settings so newly saved API keys/settings are picked up
    this.settings = await settingsRepository.getAll();

    // Setup NZB storage path using centralized paths manager once
    this.nzbStoragePath = appPaths.getResolvedNZBStoragePath(this.settings);

    // Initialize TMDB service with cache directory
    if (this.settings.api_tmdb_key) {
      const cacheDir = appPaths.getImageCacheDir();
      tmdbService.initialize(this.settings.api_tmdb_key, cacheDir);
      console.log(`[NZBImportService] TMDB cache dir: ${tmdbService.cacheDir}`);
    }
  }

  async cacheActorsFromCredits(cast = []) {
    if (!Array.isArray(cast) || cast.length === 0) {
      return;
    }

    const actorCache = require('./repositories/actorCacheRepository');
    const limitedCast = cast.slice(0, 10);

    for (const actor of limitedCast) {
      if (!actor?.id || !actor?.name) {
        continue;
      }

      try {
        const existing = actorCache.getByTMDB(actor.id);
        let profilePath = existing?.profile_path || null;
        let hasProfileImage = existing?.has_profile_image ? 1 : 0;

        if (actor.profile_path && !hasProfileImage) {
          const actorDir = appPaths.getActorCacheDir();
          const imageUrl = `${tmdbService.imageBaseUrl}w185${actor.profile_path}`;
          const ext = actor.profile_path.endsWith('.png') ? 'png' : 'jpg';
          profilePath = path.join(actorDir, `${actor.id}-profile.${ext}`);

          if (!fs.existsSync(actorDir)) {
            fs.mkdirSync(actorDir, { recursive: true });
          }

          if (!fs.existsSync(profilePath)) {
            profilePath = await tmdbService.downloadCover(imageUrl, profilePath, ext);
            if (profilePath) {
              hasProfileImage = 1;
            }
          } else {
            hasProfileImage = 1;
          }
        }

        if (!existing || !existing.has_profile_image || hasProfileImage) {
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
      } catch (error) {
        console.error(`  ⚠ Failed to cache actor ${actor.name}: ${error.message}`);
      }
    }
  }

  /**
   * Import a single NZB file - Full NZBarr2.0 style
   */
  async importNZB(filePath) {
    try {
      // Step 1: Parse NZB XML
      const nzbData = await nzbParser.parseNZBFile(filePath);

      // Calculate content hash for duplicate detection based on Usenet message IDs
      // This ignores filename, GUID, and timestamp differences in the NZB XML
      const contentHash = this.calculateContentHash(nzbData, filePath);
      console.log(`  📐 NZB content hash: ${contentHash} (${nzbData.files?.reduce((sum, file) => sum + (file.segments?.length || 0), 0) || 0} segments from ${nzbData.files?.length || 0} files)`);

      // Check if this exact content already exists
      const existingByHash = await this.resolveDuplicateCandidate(
        await releaseRepository.getByNzbHash(contentHash),
        contentHash,
        nzbData.nzbGuid
      );
      if (existingByHash) {
        throw new Error(`Duplicate NZB detected — same content as release #${existingByHash.id}`);
      }

      // Check if already exists by GUID
      const existing = await this.resolveDuplicateCandidate(
        await releaseRepository.getByGuid(nzbData.nzbGuid),
        contentHash,
        nzbData.nzbGuid
      );
      if (existing) {
        throw new Error('This NZB file has already been imported');
      }

      // Step 2: Parse filename for metadata
      const filenameMeta = filenameParser.parseFilename(path.basename(filePath));
      const mediaType = filenameParser.detectMediaType(filenameMeta);

      // Step 2b: Override release group with custom groups if found (always fresh settings)
      const customGroup = await this.findCustomReleaseGroup(path.basename(filePath));
      if (customGroup) {
        filenameMeta.releaseGroup = customGroup;
        console.log(`  Release Group: ${customGroup} (custom)`);
      }
      
      // Build clean name with year like NZBarr2.0
      const cleanName = filenameMeta.year 
        ? `${filenameMeta.title} (${filenameMeta.year})`
        : filenameMeta.title;
      
      console.log(`\n📦 Importing: ${cleanName}`);
      console.log(`  Type: ${mediaType}`);
      console.log(`  Resolution: ${filenameMeta.resolution || 'unknown'}`);
      console.log(`  Video: ${filenameMeta.videoCodec || 'unknown'}`);
      console.log(`  Audio: ${filenameMeta.audioCodec || 'unknown'}`);

      // Step 3: Determine category based on media type AND resolution
      const categoryId = filenameMeta.category_id
        ? parseInt(filenameMeta.category_id)
        : this.guessCategoryIdByResolution(mediaType, filenameMeta.resolution);

      // Step 4: Copy NZB to local storage using the content GUID first.
      // The GUID keeps refreshed releases unique even when their prepared names match.
      const nzbDestPath = this.getUniqueNZBStoragePath(nzbData.searchName, nzbData.nzbGuid);

      // Store NZBs compressed on disk. Readers/exporters transparently unpack them.
      const nzbContent = nzbFileUtils.readNZBBuffer(filePath);
      nzbFileUtils.writeCompressedNZB(nzbDestPath, nzbContent);

      // Step 5: Create initial release record
      const releaseData = {
        search_name: nzbData.searchName,
        clean_name: cleanName,
        imdb_id: filenameMeta.imdbId,
        tmdb_id: filenameMeta.tmdbId,
        nzb_guid: nzbData.nzbGuid,
        nzb_file_path: nzbDestPath,
        nzb_hash: contentHash,
        size: nzbData.size,
        parts: nzbData.parts,
        password: nzbData.password,
        post_date: nzbData.postDate,
        category_id: categoryId,
        media_type: mediaType,
        season: filenameMeta.season,
        episode: filenameMeta.episode,
        resolution: filenameMeta.resolution,
        video_codec: filenameMeta.videoCodec,
        audio_codec: filenameMeta.audioCodec,
        audio_channels: filenameMeta.audioChannels,
        source: filenameMeta.source,
        subtitles: filenameMeta.subtitles ? (filenameMeta.languages?.join(',') || 'Yes') : null,
        language: filenameMeta.languages?.join(','),
        format: filenameMeta.format,
        release_group: filenameMeta.releaseGroup,
        status: 'available'
      };

      const releaseId = await releaseRepository.create(releaseData);
      console.log(`  ✓ Added to database (ID: ${releaseId})`);

      // Step 6: Quick content analysis (NFO only - fast)
      // Full MediaInfo analysis is available via "Re-analyze" button on demand
      let analysisResult = { nfoText: null };
      try {
        const nntpSettings = {
          nntp_server: this.settings.nntp_server,
          nntp_port: this.settings.nntp_port,
          nntp_username: this.settings.nntp_username,
          nntp_password: this.settings.nntp_password,
          nntp_ssl: this.settings.nntp_ssl
        };

        if (nntpSettings.nntp_server && nntpSettings.nntp_username) {
          console.log('\n📡 Quick analysis (NFO extraction)...');
          // Only extract NFO - fast, tiny downloads
          const nfoResult = await contentAnalyzer.extractNFO(nzbData);
          analysisResult.nfoText = nfoResult;

          if (nfoResult) {
            console.log(`  ✓ NFO extracted (${nfoResult.length} chars)`);
          } else {
            console.log('  No NFO file found in release');
          }
        }
      } catch (error) {
        console.log(`  ⚠ Quick analysis skipped: ${error.message}`);
      }

      // Update release with quick analysis results
      if (analysisResult.nfoText) {
        await releaseRepository.update(releaseId, { nfo_text: analysisResult.nfoText });
      }

      // Step 7: Fetch cover image from TMDB
      let coverPath = null;
      let backdropPath = null;
      let logoPath = null;
      try {
        if (this.settings.api_tmdb_key) {
          // Use IMDB ID or TMDB ID from filename - same movie = same images
          const coverId = filenameMeta.imdbId || filenameMeta.tmdbId?.toString() || nzbData.nzbGuid;
          
          const releaseForCover = { 
            id: releaseId,
            media_type: mediaType,
            tmdb_id: filenameMeta.tmdbId,
            imdb_id: filenameMeta.imdbId,
            clean_name: cleanName,
            nzb_guid: coverId
          };
          
          const coverResult = await tmdbService.findAndDownloadCover(releaseForCover);

          if (coverResult && coverResult.coverPath) {
            coverPath = coverResult.coverPath;
            const updates = {
              cover_image: coverPath,
              tmdb_id: coverResult.tmdbId || filenameMeta.tmdbId
            };
            // Update IMDB ID from TMDB external_ids if we got one
            if (coverResult.imdbId) updates.imdb_id = coverResult.imdbId;
            if (coverResult.backdropPath) {
              updates.backdrop_path = coverResult.backdropPath;
              backdropPath = coverResult.backdropPath;
            }
            if (coverResult.logoPath) {
              updates.logo_path = coverResult.logoPath;
              logoPath = coverResult.logoPath;
            }

            await releaseRepository.update(releaseId, updates);
            console.log(`  ✓ Cover image downloaded`);
            if (coverResult.imdbId) console.log(`  ✓ IMDB ID resolved: ${coverResult.imdbId}`);
            if (coverResult.backdropPath) console.log(`  ✓ Backdrop downloaded`);
            if (coverResult.logoPath) console.log(`  ✓ Logo downloaded`);

            // Use IMDB ID from TMDB if filename didn't have one
            const resolvedImdbId = filenameMeta.imdbId || coverResult.imdbId;

            // Save movie info to movie_info table
            if (coverResult.metaData && mediaType === 'movie') {
              const meta = coverResult.metaData;
              await this.saveMovieCollection(meta.belongs_to_collection);
              await movieInfoRepository.createOrUpdate({
                imdb_id: resolvedImdbId,
                tmdb_id: coverResult.tmdbId,
                title: meta.title || cleanName,
                original_title: meta.original_title,
                plot: meta.overview,
                tagline: meta.tagline,
                release_date: meta.release_date,
                runtime: meta.runtime,
                rating: meta.vote_average,
                genres: meta.genres?.map(g => g.name).join(','),
                actors: meta.credits?.cast?.slice(0, 10) ? JSON.stringify(meta.credits.cast.slice(0, 10)) : null,
                director: meta.credits?.crew?.find(c => c.job === 'Director')?.name,
                language: meta.original_language,
                country: meta.production_countries?.[0]?.name,
                youtube_trailer: meta.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key ||
                                 meta.videos?.results?.find(v => v.site === 'YouTube')?.key || null,
                collection_id: meta.belongs_to_collection?.id || null,
                has_cover: !!coverPath,
                has_backdrop: !!coverResult.backdropPath,
                has_logo: !!coverResult.logoPath,
                cover_path: coverPath,
                backdrop_path: coverResult.backdropPath,
                logo_path: coverResult.logoPath,
                raw_json: JSON.stringify(meta)
              });
              console.log(`  ✓ Movie info saved to database`);

              if (meta.credits?.cast?.length) {
                await this.cacheActorsFromCredits(meta.credits.cast);
              }
            }

            // Save TV info to tv_info table
            if (coverResult.metaData && mediaType === 'tv') {
              const meta = coverResult.metaData;
              const resolvedTvImdbId = filenameMeta.imdbId || coverResult.imdbId;
              const tvInfoRepository = require('./repositories/tvInfoRepository');
              await tvInfoRepository.createOrUpdate({
                tmdb_id: coverResult.tmdbId || filenameMeta.tmdbId,
                imdb_id: resolvedTvImdbId,
                title: meta.title || meta.name || cleanName,
                original_name: meta.original_name || meta.original_title,
                plot: meta.overview,
                tagline: meta.tagline,
                first_air_date: meta.first_air_date,
                last_air_date: meta.last_air_date,
                runtime: meta.episode_run_time?.[0] || meta.runtime,
                number_of_seasons: meta.number_of_seasons,
                number_of_episodes: meta.number_of_episodes,
                rating: meta.vote_average,
                genres: meta.genres?.map(g => g.name).join(','),
                actors: meta.credits?.cast?.slice(0, 10) ? JSON.stringify(meta.credits.cast.slice(0, 10)) : null,
                director: meta.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name).join(', ') ||
                          meta.credits?.crew?.find(c => c.job === 'Executive Producer')?.name,
                language: meta.original_language,
                country: meta.production_countries?.[0]?.iso_3166_1,
                status: meta.status,
                youtube_trailer: meta.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key ||
                                 meta.videos?.results?.find(v => v.site === 'YouTube')?.key || null,
                has_cover: !!coverPath,
                has_backdrop: !!coverResult.backdropPath,
                has_logo: !!coverResult.logoPath,
                cover_path: coverPath,
                backdrop_path: coverResult.backdropPath,
                logo_path: coverResult.logoPath,
                raw_json: JSON.stringify(meta)
              });
              console.log(`  ✓ TV info saved to database`);

              if (meta.credits?.cast?.length) {
                await this.cacheActorsFromCredits(meta.credits.cast);
              }
            }

            // Save music info if media type is music
            if (mediaType === 'music' && coverResult.metaData) {
              const meta = coverResult.metaData;
              const musicInfoRepository = require('./repositories/musicInfoRepository');
              await musicInfoRepository.createOrUpdate({
                artist: meta.artist || cleanName,
                album_title: meta.album_title || meta.title || cleanName,
                release_date: meta.release_date || null,
                genre: meta.genre || null,
                cover_path: coverPath,
                has_cover: !!coverPath,
                raw_json: JSON.stringify(meta)
              });
              console.log(`  ✓ Music info saved to database`);
            }
          } else {
            console.log(`  ⚠ No cover found on TMDB`);

            // Fallback: search local movie/TV info tables by clean name
            const matchedLocal = await this._findLocalInfoByTitle(cleanName, mediaType);
            if (matchedLocal) {
              console.log(`  ✓ Found manual entry: "${matchedLocal.title}" (IMDB: ${matchedLocal.imdb_id}, TMDB: ${matchedLocal.tmdb_id})`);
              const updates = {};
              if (matchedLocal.imdb_id && !filenameMeta.imdbId) updates.imdb_id = matchedLocal.imdb_id;
              if (matchedLocal.tmdb_id && !filenameMeta.tmdbId) updates.tmdb_id = matchedLocal.tmdb_id;
              if (matchedLocal.cover_path) updates.cover_image = matchedLocal.cover_path;
              if (matchedLocal.backdrop_path) updates.backdrop_path = matchedLocal.backdrop_path;
              if (matchedLocal.logo_path) updates.logo_path = matchedLocal.logo_path;

              if (Object.keys(updates).length > 0) {
                await releaseRepository.update(releaseId, updates);
              }
            }
          }
        } else {
          console.log(`  ⚠ TMDB API key not configured`);
        }
      } catch (error) {
        console.log(`  ⚠ Could not fetch cover: ${error.message}`);
      }

      // Music metadata fallback (TheAudioDB/MusicBrainz)
      if (mediaType === 'music' && !coverPath) {
        try {
          console.log('  Fetching music metadata from TheAudioDB/MusicBrainz...');
          musicMetadataService.initialize(this.settings, appPaths.getBaseDataPath());
          const musicResult = await musicMetadataService.fetchMusicMetadata(releaseId, path.basename(filePath), filenameMeta);
          if (musicResult && musicResult.coverPath) {
            coverPath = musicResult.coverPath;
            await releaseRepository.update(releaseId, { cover_image: coverPath });
            console.log(`  ✓ Music cover downloaded`);
          }
        } catch (error) {
          console.log(`  ⚠ Music metadata fetch failed: ${error.message}`);
        }
      }

      console.log(`\n✅ Import complete!\n`);

      return {
        success: true,
        releaseId: releaseId,
        release: {
          id: releaseId,
          ...releaseData,
          cover_image: coverPath,
          ...analysisResult
        }
      };
    } catch (error) {
      console.error('❌ Failed to import NZB:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async saveMovieCollection(collectionMeta) {
    if (!collectionMeta?.id) {
      return null;
    }

    if (!this.settings?.api_tmdb_key) {
      return null;
    }

    let details = collectionMeta;

    try {
      details = await tmdbService.getPreferredCollectionData(collectionMeta.id);
    } catch (error) {
      console.warn(`  ⚠ Failed to fetch full collection details for ${collectionMeta.id}: ${error.message}`);
    }

    let posterPath = null;
    let backdropPath = null;

    if (details.preferred_poster_path) {
      const posterUrl = `${tmdbService.imageBaseUrl}w500${details.preferred_poster_path}`;
      const posterDest = tmdbService.getCoverPath('collection', details.id, 'cover', 'jpg');
      posterPath = await tmdbService.downloadCover(posterUrl, posterDest, 'jpg');
    }

    if (details.preferred_backdrop_path) {
      const backdropUrl = `${tmdbService.imageBaseUrl}w1280${details.preferred_backdrop_path}`;
      const backdropDest = tmdbService.getCoverPath('collection', details.id, 'backdrop', 'jpg');
      backdropPath = await tmdbService.downloadCover(backdropUrl, backdropDest, 'jpg');
    }

    await collectionRepository.createOrUpdate({
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

  /**
   * Import multiple NZB files
   */
  async importMultiple(filePaths) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      releases: []
    };

    for (const filePath of filePaths) {
      const result = await this.importNZB(filePath);
      
      if (result.success) {
        results.success++;
        results.releases.push(result.release);
      } else {
        results.failed++;
        results.errors.push({
          file: path.basename(filePath),
          error: result.error
        });
      }
    }

    return results;
  }

  /**
   * Guess category ID based on media type AND resolution
   * Maps: Movies HD/UHD/SD, TV HD/UHD/SD, etc.
   */
  guessCategoryIdByResolution(mediaType, resolution) {
    const res = (resolution || '').toUpperCase();

    // Movie subcategories
    if (mediaType === 'movie') {
      if (res === '2160P' || res === '4K') return 1030;  // Movies 4K
      if (res === '1080P' || res === '720P') return 1010;  // Movies HD
      if (res === '480P' || res === 'SD') return 1020;     // Movies SD
      return 1010;  // Default: Movies HD
    }

    // TV subcategories
    if (mediaType === 'tv') {
      if (res === '2160P' || res === '4K') return 2030;  // TV 4K
      if (res === '1080P' || res === '720P') return 2010;  // TV HD
      if (res === '480P' || res === 'SD') return 2020;     // TV SD
      return 2010;  // Default: TV HD
    }

    // Music subcategories
    if (mediaType === 'music') return 3020;  // Music FLAC

    // Books
    if (mediaType === 'book') return 5010;  // Ebooks

    // Console
    if (mediaType === 'console') return 4010;  // Games

    // Fallback
    return 1;
  }

  /**
   * Check filename against custom release groups list (always fetches fresh settings)
   * Returns the matched group name or null
   */
  async findCustomReleaseGroup(filename) {
    try {
      const settings = await settingsRepository.getAll();
      const groupsStr = settings.release_groups || '';
      console.log(`  [CustomGroups] Raw setting: "${groupsStr}"`);
      if (!groupsStr.trim()) return null;

      const groups = groupsStr.split('\n')
        .map(g => g.trim())
        .filter(g => g.length > 0);

      console.log(`  [CustomGroups] Parsed groups:`, groups);

      if (groups.length === 0) return null;

      const lowerFilename = filename.toLowerCase();
      for (const group of groups) {
        if (lowerFilename.includes(group.toLowerCase())) {
          console.log(`  [CustomGroups] Matched: "${group}"`);
          return group;
        }
      }
      console.log(`  [CustomGroups] No match found`);
    } catch (e) {
      console.error('Error checking custom release groups:', e.message);
    }
    return null;
  }

  /**
   * Search local movie_info/tv_info tables by title similarity.
   * Used as fallback when TMDB returns no results (for manually-created entries).
   */
  async _findLocalInfoByTitle(cleanName, mediaType) {
    try {
      const db = require('./database');

      // Normalize the clean name for matching
      const normalized = cleanName.toLowerCase()
        .replace(/[.\-_]/g, ' ')
        .replace(/\b(1080p|720p|2160p|480p|h264|h265|x264|x265|bluray|webrip|hdtv|dvdrip|brrip|web-dl)\b/gi, '')
        // Remove season/episode patterns: S01E01, s01e01, S01, Season.1, E01, etc.
        .replace(/\bs\d{1,2}\s*e\d{1,2}\b/gi, '')
        .replace(/\bseason\s*\d{1,2}\b/gi, '')
        .replace(/\bs\d{1,2}\b/gi, '')
        .replace(/\be\d{1,2,3}\b/gi, '')
        // Remove anything after --- or -- (episode title separator)
        .replace(/\s*[-]{2,}.*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (normalized.length < 3) return null;

      // Extract key words from normalized name
      const keywords = normalized.split(' ').filter(w => w.length > 2);
      if (keywords.length === 0) return null;

      if (mediaType === 'movie') {
        // Build LIKE query with keywords
        const conditions = keywords.map(() => 'LOWER(title) LIKE ?').join(' AND ');
        const params = keywords.map(k => `%${k}%`);
        const movies = db.all(`SELECT * FROM movie_info WHERE ${conditions}`, params);
        // Return best match (longest title match)
        if (movies.length > 0) {
          movies.sort((a, b) => (b.title || '').length - (a.title || '').length);
          return movies[0];
        }
      } else if (mediaType === 'tv') {
        const conditions = keywords.map(() => 'LOWER(title) LIKE ?').join(' AND ');
        const params = keywords.map(k => `%${k}%`);
        const shows = db.all(`SELECT * FROM tv_info WHERE ${conditions}`, params);
        if (shows.length > 0) {
          shows.sort((a, b) => (b.title || '').length - (a.title || '').length);
          return shows[0];
        }
      }
    } catch (e) {
      console.error(`  ⚠ Local info search failed: ${e.message}`);
    }
    return null;
  }
}

module.exports = new NZBImportService();
