const fs = require('fs');
const path = require('path');
const filenameParser = require('./filenameParser');
const settingsRepository = require('./repositories/settingsRepository');
const tmdbService = require('./tmdbService');
const appPaths = require('./appPaths');
const nzbImportService = require('./nzbImportService');

class ImportPreparationService {
  constructor() {
    this.settings = null;
    this.batchPauseEvery = 2000; // pause after processing this many NZB files to avoid overwhelming TMDB API
    this.batchPauseMs = 30 * 1000;
    this.maxReturnedLogLines = 5000;
  }

  async initialize() {
    this.settings = await settingsRepository.getAll();

    if (this.settings.api_tmdb_key) {
      tmdbService.initialize(this.settings.api_tmdb_key, appPaths.getImageCacheDir());
    }
  }

  async runConfigured({ importAfterPrepare = false } = {}) {
    await this.initialize();

    const folders = [
      { mediaType: 'movie', label: 'Movies', folderPath: (this.settings.pipeline_movies_folder || '').trim() },
      { mediaType: 'tv', label: 'TV', folderPath: (this.settings.pipeline_tv_folder || '').trim() }
    ].filter(folder => folder.folderPath);

    if (folders.length === 0) {
      throw new Error('Set at least one preparation folder in Settings first');
    }

    const result = {
      success: true,
      importAfterPrepare,
      summary: {
        foldersProcessed: 0,
        filesScanned: 0,
        prepared: 0,
        renamed: 0,
        imported: 0,
        skipped: 0,
        failed: 0,
        duplicates: 0,
        needsImdb: 0
      },
      folders: [],
      logLines: []
    };

    if (!this.settings.api_tmdb_key) {
      result.logLines.push('[Prep] TMDB API key not configured, running in limited mode');
    }

    const throttleState = {
      processed: 0,
      total: this.countNzbFilesInFolders(folders)
    };

    for (const folder of folders) {
      const folderResult = await this.processFolder(folder, { importAfterPrepare, throttleState });
      result.folders.push(folderResult);
      result.summary.foldersProcessed += 1;
      result.summary.filesScanned += folderResult.scanned;
      result.summary.prepared += folderResult.prepared;
      result.summary.renamed += folderResult.renamed;
      result.summary.imported += folderResult.imported;
      result.summary.skipped += folderResult.skipped;
      result.summary.failed += folderResult.failed;
      result.summary.duplicates += folderResult.duplicates || 0;
      result.summary.needsImdb += folderResult.needsImdb || 0;
      this.appendLogLines(result.logLines, folderResult.logLines);
    }

    this.finalizeLogLines(result.logLines);
    return result;
  }

  appendLogLines(target, lines = []) {
    if (!Array.isArray(target) || !Array.isArray(lines) || lines.length === 0) {
      return;
    }

    const maxLines = Math.max(1, Number(this.maxReturnedLogLines) || 5000);
    const existingLimitMarkerIndex = target.findIndex(line => typeof line === 'string' && line.startsWith('[Prep] Log truncated'));
    if (existingLimitMarkerIndex >= 0) {
      return;
    }

    for (const line of lines) {
      if (target.length < maxLines) {
        target.push(line);
        continue;
      }

      target.push(`[Prep] Log truncated after ${maxLines} lines. Summary counts above still reflect the full run.`);
      break;
    }
  }

  finalizeLogLines(logLines) {
    if (!Array.isArray(logLines) || logLines.length === 0) {
      return;
    }

    const maxLines = Math.max(1, Number(this.maxReturnedLogLines) || 5000);
    if (logLines.length > maxLines + 1) {
      logLines.length = maxLines + 1;
    }
  }

  countNzbFilesInFolders(folders) {
    return folders.reduce((total, folder) => {
      const folderPath = folder.folderPath;
      if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
        return total;
      }

      return total + fs.readdirSync(folderPath).filter(file => this.isNzbFile(file)).length;
    }, 0);
  }

  async processFolder(folder, { importAfterPrepare = false, throttleState = null } = {}) {
    const { folderPath, mediaType, label } = folder;

    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      return {
        mediaType,
        folderPath,
        scanned: 0,
        prepared: 0,
        renamed: 0,
        imported: 0,
        skipped: 0,
        failed: 1,
        logLines: [`[${label}] Folder not found: ${folderPath}`]
      };
    }

    const files = fs.readdirSync(folderPath)
      .filter(file => this.isNzbFile(file))
      .sort((a, b) => a.localeCompare(b));

    const folderResult = {
      mediaType,
      folderPath,
      scanned: files.length,
      prepared: 0,
      renamed: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
      needsImdb: 0,
      importedArchived: 0,
      suppressedPreparedLogs: 0,
      suppressedImportLogs: 0,
      logLines: [`[${label}] Scanning ${files.length} file(s) in ${folderPath}`]
    };

    for (const file of files) {
      const fullPath = path.join(folderPath, file);

      try {
        const prepared = await this.prepareFile(fullPath, mediaType);
        if (!prepared.success) {
          folderResult.skipped += 1;
          if (prepared.action === 'move-needs-imdb') {
            folderResult.needsImdb += 1;
            const needsImdbPath = this.movePreparedImportToNeedsImdb(fullPath);
            folderResult.logLines.push(`[${label}] Needs IMDb: ${file} -> ${prepared.reason}`);
            folderResult.logLines.push(`[${label}] Moved for IMDb tagging: ${path.basename(needsImdbPath)}`);
          } else {
            folderResult.logLines.push(`[${label}] Skipped: ${file} -> ${prepared.reason}`);
          }
          continue;
        }

        folderResult.prepared += 1;
        if (prepared.renamed) {
          folderResult.renamed += 1;
        }
        folderResult.suppressedPreparedLogs += 1;

        if (importAfterPrepare) {
          await nzbImportService.initialize();
          const importResult = await nzbImportService.importNZB(prepared.finalPath);
          if (importResult.success) {
            folderResult.imported += 1;
            const archivedPath = this.movePreparedImportToArchive(prepared.finalPath);
            if (archivedPath) {
              folderResult.importedArchived += 1;
            }
            folderResult.suppressedImportLogs += 1;
          } else if (this.isDuplicateImportError(importResult.error)) {
            folderResult.skipped += 1;
            folderResult.duplicates += 1;
            const duplicatePath = this.movePreparedImportToDuplicates(prepared.finalPath);
            folderResult.logLines.push(`[${label}] Duplicate: ${path.basename(prepared.finalPath)} -> ${importResult.error}`);
            folderResult.logLines.push(`[${label}] Moved duplicate: ${path.basename(duplicatePath)}`);
          } else {
            folderResult.failed += 1;
            folderResult.logLines.push(`[${label}] Import failed: ${path.basename(prepared.finalPath)} -> ${importResult.error}`);
          }
        }
      } catch (error) {
        folderResult.failed += 1;
        folderResult.logLines.push(`[${label}] Failed: ${file} -> ${error.message}`);
      } finally {
        await this.pauseBetweenBatchesIfNeeded(folderResult, label, throttleState);
      }
    }

    folderResult.logLines.push(this.buildFolderSummaryLine(folderResult, label, importAfterPrepare));
    return folderResult;
  }

  buildFolderSummaryLine(folderResult, label, importAfterPrepare) {
    const parts = [
      `[${label}] Summary: scanned ${folderResult.scanned}`,
      `prepared ${folderResult.prepared}`,
      `original titles kept ${folderResult.prepared}`,
      `renamed ${folderResult.renamed}`,
      `skipped ${folderResult.skipped}`,
      `failed ${folderResult.failed}`
    ];

    if (importAfterPrepare) {
      parts.push(`imported ${folderResult.imported}`);
      if (folderResult.importedArchived > 0) {
        parts.push(`archived ${folderResult.importedArchived}`);
      }
      if (folderResult.duplicates > 0) {
        parts.push(`duplicates ${folderResult.duplicates}`);
      }
    }

    if (folderResult.needsImdb > 0) {
      parts.push(`needs IMDb ${folderResult.needsImdb}`);
    }

    const suppressedDetails = [];
    if (folderResult.suppressedPreparedLogs > 0) {
      suppressedDetails.push(`${folderResult.suppressedPreparedLogs} prepare details`);
    }
    if (folderResult.suppressedImportLogs > 0) {
      suppressedDetails.push(`${folderResult.suppressedImportLogs} import success details`);
    }

    if (suppressedDetails.length > 0) {
      parts.push(`suppressed ${suppressedDetails.join(', ')}`);
    }

    return parts.join(' | ');
  }

  async pauseBetweenBatchesIfNeeded(folderResult, label, throttleState) {
    if (!throttleState) return;

    throttleState.processed += 1;
    const shouldPause = throttleState.processed > 0
      && throttleState.processed % this.batchPauseEvery === 0
      && throttleState.processed < throttleState.total;

    if (!shouldPause) return;

    const seconds = Math.round(this.batchPauseMs / 1000);
    folderResult.logLines.push(`[${label}] Pausing ${seconds}s after ${throttleState.processed} processed NZB file(s)`);
    await this.sleep(this.batchPauseMs);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isNzbFile(file) {
    const lower = file.toLowerCase();
    return lower.endsWith('.nzb') || lower.endsWith('.nzb.gz');
  }

  async prepareFile(filePath, mediaType) {
    const originalName = path.basename(filePath);
    const ext = originalName.toLowerCase().endsWith('.nzb.gz') ? '.nzb.gz' : '.nzb';
    const parsed = filenameParser.parseFilename(originalName);
    const candidate = this.extractSearchCandidate(originalName, mediaType, parsed);
    const preservedBlocks = this.extractPreservedBracketBlocks(originalName, parsed, mediaType);
    const enrichedParsed = {
      ...parsed,
      year: parsed.year || candidate.year || null,
      season: parsed.season ?? candidate.season ?? null,
      episode: parsed.episode ?? candidate.episode ?? null
    };
    const searchTitle = this.normalizeSearchTitle(candidate.searchTitle || candidate.title || parsed.title || path.basename(originalName, ext));

    if (!searchTitle) {
      return { success: false, reason: 'could not determine a clean title' };
    }

    const wrappedTmdbId = this.extractWrappedTmdbId(originalName);
    const canSkipTmdbLookup = this.shouldSkipTmdbLookup(originalName, mediaType, parsed, candidate, wrappedTmdbId);
    if (canSkipTmdbLookup) {
      const match = {
        tmdbId: wrappedTmdbId || parsed.tmdbId || null,
        imdbId: parsed.imdbId || null,
        title: candidate.title || parsed.title || searchTitle,
        year: candidate.year || parsed.year || null
      };

      const displayTitle = this.sanitizeFilenamePart(candidate.title || parsed.title || searchTitle);
      const metadataBlock = this.extractMetadataBlock(originalName, enrichedParsed, mediaType);
      const finalPreservedBlocks = this.mergePreservedBlocks(
        preservedBlocks,
        this.extractDroppedTitleBlocks(originalName, displayTitle, mediaType, candidate.year || parsed.year),
        this.extractUnrecognizedTrailingBlocks(originalName, mediaType, candidate.year || parsed.year)
      );
      const finalName = this.buildCanonicalFilename({
        mediaType,
        parsed: enrichedParsed,
        match,
        displayTitle,
        metadataBlock,
        preservedBlocks: finalPreservedBlocks,
        ext
      });

      const desiredPath = path.join(path.dirname(filePath), finalName);
      const finalPath = desiredPath === filePath ? filePath : this.getUniquePath(desiredPath);
      if (finalPath !== filePath) {
        fs.renameSync(filePath, finalPath);
      }

      return {
        success: true,
        renamed: finalPath !== filePath,
        finalPath,
        diagnostics: {
          searchTitle,
          searchVariants: this.buildSearchTitleVariants(searchTitle),
          matchedTitle: match.title,
          matchedYear: match.year,
          tmdbId: match.tmdbId,
          skippedTmdbLookup: true
        }
      };
    }

    const match = this.settings?.api_tmdb_key
      ? await this.resolveMatch({
          mediaType,
          title: searchTitle,
          year: candidate.year || parsed.year,
          season: candidate.season ?? parsed.season,
          imdbId: parsed.imdbId || null,
          tmdbId: parsed.tmdbId || null
        })
      : {
          tmdbId: null,
          imdbId: parsed.imdbId || null,
          title: candidate.title || parsed.title || searchTitle,
          year: candidate.year || parsed.year || null
        };

    if (!match) {
      return {
        success: false,
        reason: 'no confident TMDB match found',
        action: !parsed.imdbId && mediaType === 'movie' ? 'move-needs-imdb' : null
      };
    }

    const displayTitle = this.sanitizeFilenamePart(candidate.title || parsed.title || searchTitle);
    const metadataBlock = this.extractMetadataBlock(originalName, enrichedParsed, mediaType);
    const finalPreservedBlocks = this.mergePreservedBlocks(
      preservedBlocks,
      this.extractDroppedTitleBlocks(originalName, displayTitle, mediaType, candidate.year || parsed.year),
      this.extractUnrecognizedTrailingBlocks(originalName, mediaType, candidate.year || parsed.year)
    );
    const finalName = this.buildCanonicalFilename({
      mediaType,
      parsed: enrichedParsed,
      match,
      displayTitle,
      metadataBlock,
      preservedBlocks: finalPreservedBlocks,
      ext
    });

    const desiredPath = path.join(path.dirname(filePath), finalName);
    const finalPath = desiredPath === filePath ? filePath : this.getUniquePath(desiredPath);
    if (finalPath !== filePath) {
      fs.renameSync(filePath, finalPath);
    }

    return {
      success: true,
      renamed: finalPath !== filePath,
      finalPath,
      diagnostics: {
        searchTitle,
        searchVariants: this.buildSearchTitleVariants(searchTitle),
        matchedTitle: match.title,
        matchedYear: match.year,
        tmdbId: match.tmdbId
      }
    };
  }

  async resolveMatch({ mediaType, title, year, season, imdbId, tmdbId }) {
    if (mediaType === 'tv' && (season === null || season === undefined)) {
      return null;
    }

    if (tmdbId) {
      const details = mediaType === 'tv'
        ? await tmdbService.getTVDetails(tmdbId)
        : await tmdbService.getMovieDetails(tmdbId);

      if (details?.id) {
        return {
          tmdbId: details.id,
          imdbId: details.imdb_id || details.external_ids?.imdb_id || imdbId || null,
          title: mediaType === 'tv' ? (details.name || title) : (details.title || title),
          year: this.extractYear(mediaType === 'tv' ? details.first_air_date : details.release_date) || year || null
        };
      }
    }

    if (imdbId) {
      const tmdbId = await tmdbService.findTMDBByIMDB(imdbId, mediaType);
      if (tmdbId) {
        const details = mediaType === 'tv'
          ? await tmdbService.getTVDetails(tmdbId)
          : await tmdbService.getMovieDetails(tmdbId);

        if (details?.id) {
          return {
            tmdbId: details.id,
            imdbId: details.imdb_id || details.external_ids?.imdb_id || imdbId,
            title: mediaType === 'tv' ? (details.name || title) : (details.title || title),
            year: this.extractYear(mediaType === 'tv' ? details.first_air_date : details.release_date) || year || null
          };
        }
      }
    }

    const searchVariants = this.buildSearchTitleVariants(title);
    let bestChoice = null;
    let bestScore = -1;

    for (const variant of searchVariants) {
      const searchResults = mediaType === 'tv'
        ? await tmdbService.searchTV(variant)
        : await tmdbService.searchMovie(variant, year || null);

      if (!Array.isArray(searchResults?.results) || searchResults.results.length === 0) {
        continue;
      }

      const chosen = this.chooseBestTmdbResult(searchResults.results, variant, year);
      if (!chosen?.id) {
        continue;
      }

      const score = this.scoreTmdbResult(chosen, variant, year);
      if (score > bestScore) {
        bestChoice = chosen;
        bestScore = score;
      }
    }

    if (!bestChoice?.id) {
      return null;
    }

    const details = mediaType === 'tv'
      ? await tmdbService.getTVDetails(bestChoice.id)
      : await tmdbService.getMovieDetails(bestChoice.id);

    if (!details?.id) {
      return null;
    }

    return {
      tmdbId: details.id,
      imdbId: details.imdb_id || details.external_ids?.imdb_id || null,
      title: mediaType === 'tv' ? (details.name || bestChoice.name || title) : (details.title || bestChoice.title || title),
      year: this.extractYear(mediaType === 'tv' ? details.first_air_date : details.release_date) || year || null
    };
  }

  chooseBestTmdbResult(results, title, year) {
    const scored = results.map((result) => ({
      result,
      score: this.scoreTmdbResult(result, title, year)
    })).sort((a, b) => b.score - a.score);

    return scored[0]?.score >= 45 ? scored[0].result : null;
  }

  scoreTmdbResult(result, title, year, normalizedWanted = null, wantedYear = null) {
    const resultTitle = result.title || result.name || '';
    const normalizedResult = this.normalizeMatchText(resultTitle);
    const wanted = normalizedWanted || this.normalizeMatchText(title);
    const targetYear = wantedYear || (year ? String(year) : '');
    const resultYear = this.extractYear(result.release_date || result.first_air_date);
    let score = 0;

    if (normalizedResult === wanted) score += 100;
    else if (normalizedResult.startsWith(wanted) || wanted.startsWith(normalizedResult)) score += 70;
    else if (normalizedResult.includes(wanted) || wanted.includes(normalizedResult)) score += 45;

    if (targetYear && resultYear && targetYear === resultYear) score += 30;
    score += Math.min(Number(result.popularity || 0), 20);
    return score;
  }

  buildCanonicalFilename({ mediaType, parsed, match, displayTitle, metadataBlock, preservedBlocks = [], ext }) {
    const safeTitle = this.sanitizeFilenamePart(displayTitle || match.title);
    const parts = [safeTitle];

    if (mediaType === 'tv') {
      if (parsed.season !== null && parsed.season !== undefined) {
        if (parsed.episode && parsed.episode > 0) {
          parts.push(`[S${String(parsed.season).padStart(2, '0')}E${String(parsed.episode).padStart(2, '0')}]`);
        } else {
          parts.push(`[S${String(parsed.season).padStart(2, '0')}]`);
        }
      }
      if (match.year) {
        parts.push(`(${match.year})`);
      }
    } else if (match.year) {
      parts.push(`(${match.year})`);
    }

    if (metadataBlock) {
      parts.push(`[${metadataBlock}]`);
    }
    for (const block of preservedBlocks) {
      if (block) {
        parts.push(`[${block}]`);
      }
    }
    if (match.imdbId) {
      parts.push(`[imdb-${match.imdbId}]`);
    }
    parts.push(`[tmdb-${match.tmdbId}]`);

    return `${parts.join(' ')}${ext}`;
  }

  buildRefreshFilename({ release, filenameMeta = null, originalName = '', ext = '.nzb', mode = 'replace' }) {
    const mediaType = release?.media_type === 'tv' ? 'tv' : 'movie';
    const stem = String(originalName || '')
      .replace(/\.nzb\.gz$/i, '')
      .replace(/\.nzb$/i, '')
      .replace(/_refreshed$/i, '');

    const parsed = {
      season: release?.season ?? null,
      episode: release?.episode ?? null,
      resolution: filenameMeta?.resolution || release?.resolution || null,
      source: release?.source || null,
      audioCodec: filenameMeta?.audioCodec || release?.audio_codec || null,
      audioChannels: filenameMeta?.audioChannels || release?.audio_channels || null,
      hdrFormat: filenameMeta?.hdrFormat || release?.hdr_format || null,
      videoCodec: filenameMeta?.videoCodec || release?.video_codec || null,
      releaseGroup: release?.release_group || null,
      format: release?.format || null
    };

    const detectedYear = this.extractRawYear(stem)
      || this.extractRawYear(release?.clean_name)
      || this.extractRawYear(release?.search_name);
    const metadataBlock = this.buildRefreshMetadataBlock(parsed);
    const preservedBlocks = this.extractPreservedBracketBlocks(
      originalName || release?.search_name || release?.clean_name || stem,
      parsed,
      mediaType
    );
    const rawTitle = this.extractRefreshTitle(release, stem, mediaType, detectedYear);
    const displayTitle = this.chooseDisplayTitle(rawTitle, rawTitle);
    const match = {
      tmdbId: release?.tmdb_id || null,
      imdbId: release?.imdb_id || null,
      title: release?.clean_name || release?.search_name || stem,
      year: detectedYear || null
    };

    const canonical = this.buildRefreshCanonicalFilename({
      mediaType,
      parsed,
      match,
      displayTitle,
      metadataBlock,
      preservedBlocks,
      ext
    });

    const base = this.addRefreshFilenameMarker(canonical.slice(0, -ext.length));
    if (mode !== 'keep_both') {
      return `${base}${ext}`;
    }

    return `${base}_refreshed${ext}`;
  }

  addRefreshFilenameMarker(baseName) {
    const marker = '[SWISHER]';
    const value = String(baseName || '').trim();
    if (!value) return marker;
    if (value.toLowerCase().includes(marker.toLowerCase())) return value;
    return `${value} ${marker}`;
  }

  buildRefreshCanonicalFilename({ mediaType, parsed, match, displayTitle, metadataBlock, preservedBlocks = [], ext }) {
    const safeTitle = this.sanitizeFilenamePart(displayTitle || match.title);
    const parts = [safeTitle];

    if (mediaType === 'tv') {
      if (parsed.season !== null && parsed.season !== undefined) {
        if (parsed.episode && parsed.episode > 0) {
          parts.push(`[S${String(parsed.season).padStart(2, '0')}E${String(parsed.episode).padStart(2, '0')}]`);
        } else {
          parts.push(`[S${String(parsed.season).padStart(2, '0')}]`);
        }
      }
      if (match.year) {
        parts.push(`(${match.year})`);
      }
    } else if (match.year) {
      parts.push(`(${match.year})`);
    }

    if (metadataBlock) {
      parts.push(`[${metadataBlock}]`);
    }
    for (const block of preservedBlocks) {
      if (block) {
        parts.push(`[${block}]`);
      }
    }
    if (match.imdbId) {
      parts.push(`(imdb-${match.imdbId})`);
    }
    if (match.tmdbId) {
      parts.push(`(tmdb-${match.tmdbId})`);
    }

    return `${parts.join(' ')}${ext}`;
  }

  extractPreservedBracketBlocks(filename, parsed, mediaType) {
    const stem = String(filename || '').replace(/\.nzb\.gz$/i, '').replace(/\.nzb$/i, '');
    const brackets = [...stem.matchAll(/\[([^\]]+)\]/g)];
    const preserved = [];

    for (const match of brackets) {
      const content = String(match[1] || '').trim();
      if (!content) continue;
      if (/^S\d{1,2}(?:E\d{1,3})?$/i.test(content)) continue;
      if (/^S\d{1,2}$/i.test(content)) continue;
      if (/\b(imdb-)?tt\d{7,8}\b/i.test(content)) continue;
      if (/^tmdb-\d+$/i.test(content)) continue;
      if (this.isMetadataBlockContent(content)) continue;
      preserved.push(this.normalizePreservedBracketContent(content));
    }

    return [...new Set(preserved)].filter(Boolean);
  }

  isMetadataBlockContent(content) {
    return /\d{3,4}[pi]|4K|UHD|WEB|BluRay|HDTV|x264|x265|h264|h265|HEVC|AVC|DTS|DD|AC3|AAC|FLAC|mkv|mp4|avi|WEB-DL|WEBDL|WEBRIP|BRRip|BDRip|REMUX|HDR10|HDR|DV|DOVI|OPUS|MP3/i.test(String(content || ''));
  }

  normalizePreservedBracketContent(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([_/.-])\s*/g, '$1')
      .trim();
  }

  mergePreservedBlocks(...blockSets) {
    const merged = [];
    for (const blockSet of blockSets) {
      for (const block of blockSet || []) {
        const normalized = this.normalizePreservedBracketContent(block);
        if (normalized && !merged.includes(normalized)) {
          merged.push(normalized);
        }
      }
    }
    return merged;
  }

  extractDroppedTitleBlocks(filename, displayTitle, mediaType, year = null) {
    const originalTitle = this.extractOriginalTitlePortion(filename, mediaType, year);
    if (!originalTitle) {
      return [];
    }

    const originalTokens = this.tokenizeTitleForPreservation(originalTitle);
    const displayTokens = new Set(this.tokenizeTitleForPreservation(displayTitle).map(token => token.toLowerCase()));
    const dropped = originalTokens.filter(token => !displayTokens.has(token.toLowerCase()));

    return dropped.length > 0 ? [dropped.join(' ')] : [];
  }

  extractUnrecognizedTrailingBlocks(filename, mediaType, year = null) {
    const tokens = this.extractTrailingTokens(filename, mediaType, year);
    const unknown = [];

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];

      if (this.isYearToken(token) || this.isSeasonEpisodeToken(token)) {
        continue;
      }

      const expanded = this.expandRawMetadataToken(token, tokens[index + 1], tokens[index + 2]);
      if (expanded.parts.length > 0) {
        index += expanded.skip || 0;
        continue;
      }

      if (this.isPreparationBoundaryToken(token)) {
        continue;
      }

      unknown.push(token);
    }

    const block = this.normalizeExtraPreservedBlock(unknown.join(' '));
    return block ? [block] : [];
  }

  extractTrailingTokens(filename, mediaType, year = null) {
    const stem = String(filename || '')
      .replace(/\.nzb\.gz$/i, '')
      .replace(/\.nzb$/i, '')
      .replace(/\((?:imdb-)?tt\d{7,8}\)/ig, ' ')
      .replace(/\(tmdb-\d+\)/ig, ' ')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = stem.split(' ').map(token => token.trim()).filter(Boolean);
    if (tokens.length === 0) {
      return [];
    }

    let startIndex = -1;
    if (mediaType === 'tv') {
      startIndex = tokens.findIndex(token => this.isSeasonEpisodeToken(token));
    }

    if (startIndex === -1 && year) {
      startIndex = tokens.findIndex(token => token === String(year));
    }

    if (startIndex === -1) {
      startIndex = tokens.findIndex(token => this.isYearToken(token));
    }

    if (startIndex === -1) {
      startIndex = tokens.findIndex(token => this.isPreparationBoundaryToken(token));
      return startIndex >= 0 ? tokens.slice(startIndex) : [];
    }

    return tokens.slice(startIndex + 1);
  }

  normalizeExtraPreservedBlock(value) {
    return String(value || '')
      .split(/\s+/)
      .map(token => this.normalizePreservedExtraToken(token))
      .join(' ')
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}.+-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim();
  }

  normalizePreservedExtraToken(token) {
    const value = String(token || '').trim();
    if (!value) {
      return '';
    }

    if (/[A-Z]/.test(value.slice(1)) || /^[A-Z0-9]+$/.test(value)) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  extractOriginalTitlePortion(filename, mediaType, year = null) {
    const stem = String(filename || '')
      .replace(/\.nzb\.gz$/i, '')
      .replace(/\.nzb$/i, '')
      .replace(/\((?:imdb-)?tt\d{7,8}\)/ig, ' ')
      .replace(/\(tmdb-\d+\)/ig, ' ')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/[._]+/g, ' ')
      .replace(/\s+-\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (mediaType === 'tv') {
      return this.extractTvTitleBeforeSeason(stem, year);
    }

    return this.extractMovieTitleBeforeYear(stem, year);
  }

  tokenizeTitleForPreservation(value) {
    return String(value || '')
      .replace(/[()[\]{}]/g, ' ')
      .replace(/[._-]+/g, ' ')
      .replace(/[^\p{L}\p{N}'’]+/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);
  }

  buildRefreshMetadataBlock(parsed) {
    const parts = [];
    if (parsed.resolution) parts.push(parsed.resolution);
    if (parsed.source) parts.push(parsed.source);
    if (parsed.audioCodec) parts.push(parsed.audioCodec);
    if (parsed.audioChannels) parts.push(parsed.audioChannels);
    if (parsed.hdrFormat && String(parsed.hdrFormat).toLowerCase() !== 'none') parts.push(parsed.hdrFormat);
    if (parsed.videoCodec) parts.push(parsed.videoCodec);
    if (parsed.releaseGroup) parts.push(parsed.releaseGroup);
    if (parsed.format) parts.push(String(parsed.format).toLowerCase());

    return parts
      .map(part => this.normalizeMetadataBlock(part))
      .filter(Boolean)
      .filter((part, index, all) => all.indexOf(part) === index)
      .join('-');
  }

  extractRefreshTitle(release, stem, mediaType, year) {
    const source = release?.clean_name || release?.search_name || stem || '';
    const normalized = String(source)
      .replace(/[._]+/g, ' ')
      .replace(/\((19|20)\d{2}\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (mediaType === 'tv') {
      return this.cleanPreparationTitle(this.extractTvTitleBeforeSeason(normalized, year))
        || this.cleanPreparationTitle(normalized)
        || normalized;
    }

    return this.cleanPreparationTitle(this.extractMovieTitleBeforeYear(normalized, year))
      || this.cleanPreparationTitle(normalized)
      || normalized;
  }

  extractMetadataBlock(filename, parsed, mediaType) {
    const stem = filename.replace(/\.nzb\.gz$/i, '').replace(/\.nzb$/i, '');
    const bracketMatches = [...stem.matchAll(/\[([^\]]+)\]/g)];
    let fallbackBracket = null;
    for (const match of bracketMatches) {
      const content = match[1].trim();
      if (/^S\d{1,2}(E\d{1,3})?$/i.test(content)) continue;
      if (!fallbackBracket) {
        fallbackBracket = content;
      }
      if (/\d{3,4}[pi]|4K|UHD|WEB|BluRay|HDTV|x264|x265|h264|h265|HEVC|AVC|DTS|DD|AC3|AAC|FLAC|mkv|mp4|avi/i.test(content)) {
        return this.normalizeMetadataBlock(content);
      }
    }

    const parts = [];
    if (parsed.resolution) parts.push(parsed.resolution);
    if (parsed.source) parts.push(parsed.source);
    if (parsed.audioCodec) parts.push(parsed.audioCodec);
    if (parsed.audioChannels) parts.push(parsed.audioChannels);
    if (parsed.hdrFormat) parts.push(parsed.hdrFormat);
    if (parsed.videoCodec) parts.push(parsed.videoCodec);
    if (parsed.releaseGroup) parts.push(parsed.releaseGroup);
    if (parsed.format) parts.push(parsed.format.toLowerCase());

    const normalizedParts = parts
      .map(part => this.normalizeMetadataBlock(part))
      .filter(Boolean)
      .join('-');

    const rawDerived = this.extractMetadataBlockFromRaw(stem, parsed, mediaType);

    if (rawDerived && rawDerived.split('-').length > Math.max(1, normalizedParts ? normalizedParts.split('-').length : 0)) {
      return rawDerived;
    }

    if (normalizedParts) {
      return normalizedParts;
    }

    if (fallbackBracket) {
      return this.normalizeMetadataBlock(fallbackBracket);
    }

    return rawDerived;
  }

  extractMetadataBlockFromRaw(stem, parsed, mediaType) {
    const cleanedStem = String(stem || '')
      .replace(/\((?:imdb-)?tt\d{7,8}\)/ig, ' ')
      .replace(/\(tmdb-\d+\)/ig, ' ')
      .replace(/\[[^\]]+\]/g, ' ')
      .trim();

    const tokens = cleanedStem
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(token => token.trim())
      .filter(Boolean);

    const metadataParts = [];
    let collecting = false;

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const upper = token.toUpperCase();

      if (!collecting) {
        if (mediaType === 'tv' && this.isSeasonEpisodeToken(token)) {
          collecting = true;
          continue;
        }

        if (mediaType === 'movie' && this.isYearToken(token)) {
          collecting = true;
          continue;
        }

        if (this.isPreparationBoundaryToken(token)) {
          collecting = true;
        } else {
          continue;
        }
      }

      if (this.isYearToken(token) || this.isSeasonEpisodeToken(token)) {
        continue;
      }

      const expanded = this.expandRawMetadataToken(token, tokens[index + 1], tokens[index + 2]);
      if (expanded.skip) {
        index += expanded.skip;
      }

      for (const part of expanded.parts) {
        if (part) {
          metadataParts.push(part);
        }
      }
    }

    const deduped = [];
    for (const part of metadataParts) {
      const normalized = this.normalizeMetadataBlock(part);
      if (!normalized) continue;
      if (!deduped.includes(normalized)) {
        deduped.push(normalized);
      }
    }

    return deduped.join('-');
  }

  expandRawMetadataToken(token, nextToken, nextNextToken) {
    const value = String(token || '');
    const upper = value.toUpperCase();
    const next = String(nextToken || '');
    const nextUpper = next.toUpperCase();
    const nextNext = String(nextNextToken || '');
    const nextNextUpper = nextNext.toUpperCase();

    if (!upper) {
      return { parts: [], skip: 0 };
    }

    if (/^\d{3,4}P$/i.test(upper)) {
      return { parts: [upper], skip: 0 };
    }

    if (/^(WEB-DL|WEBDL)$/i.test(upper)) {
      return { parts: ['WEB-DL'], skip: 0 };
    }

    if (upper === 'WEB' && nextUpper === 'DL') {
      return { parts: ['WEB-DL'], skip: 1 };
    }

    if (upper === 'WEBRIP' || upper === 'WEB-RIP') {
      return { parts: ['WEBRip'], skip: 0 };
    }

    if (upper === 'BLURAY' || upper === 'BLU-RAY') {
      return { parts: ['BluRay'], skip: 0 };
    }

    if (upper === 'BRRIP') {
      return { parts: ['BRRip'], skip: 0 };
    }

    if (upper === 'BDRIP') {
      return { parts: ['BDRip'], skip: 0 };
    }

    if (upper === 'X265' || upper === 'H265') {
      return { parts: ['x265'], skip: 0 };
    }

    if (upper === 'X264' || upper === 'H264') {
      return { parts: ['x264'], skip: 0 };
    }

    if (upper === 'HEVC' || upper === 'AV1' || upper === 'AVC' || upper === 'VP9') {
      return { parts: [value], skip: 0 };
    }

    if (upper === 'HDR' || upper === 'HDR10' || upper === 'HDR10+' || upper === 'DV' || upper === 'DOVI') {
      return { parts: [value], skip: 0 };
    }

    if (upper === 'EAC3' || upper === 'AAC' || upper === 'AC3' || upper === 'OPUS' || upper === 'FLAC' || upper === 'TRUEHD' || upper === 'ATMOS') {
      return { parts: [value], skip: 0 };
    }

    if (upper === 'DTS' && nextUpper === 'HD' && nextNextUpper === 'MA') {
      return { parts: ['DTS-HD-MA'], skip: 2 };
    }

    if (upper === 'DTS' && nextUpper === 'HD') {
      return { parts: ['DTS-HD'], skip: 1 };
    }

    if ((upper === '5' || upper === '7' || upper === '2' || upper === '1') && nextUpper === '1') {
      return { parts: [`${upper}.1`], skip: 1 };
    }

    if ((upper === '5' || upper === '7' || upper === '2' || upper === '1') && nextUpper === '0') {
      return { parts: [`${upper}.0`], skip: 1 };
    }

    if (/^(RARBG|YTS|YIFY|OFT|BONE|SIQ|PAHE|AN0MAL1|NZBFORYOU|QXR|PSA|TGX|ION10|EVO|FGT|NTB|IVY|FRAMESTOR|R00T|NGP)$/i.test(upper)) {
      return { parts: [value], skip: 0 };
    }

    if (/^(AMZN|NF|DSNP|HMAX|ATVP)$/i.test(upper)) {
      return { parts: [value], skip: 0 };
    }

    if (/^(MKV|MP4|AVI|REMUX)$/i.test(upper)) {
      return { parts: [value], skip: 0 };
    }

    return { parts: [], skip: 0 };
  }

  normalizeMetadataBlock(value) {
    const normalizedValue = this.normalizeRefreshMetadataValue(value);
    return String(normalizedValue || '')
      .replace(/[\/\\:]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/[^\w.+-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  normalizeRefreshMetadataValue(value) {
    const raw = String(value || '').trim();
    const upper = raw.toUpperCase();

    if (!raw || upper === 'NONE') return '';
    if (upper === 'H.264' || upper === 'H264' || upper === 'AVC') return 'x264';
    if (upper === 'H.265' || upper === 'H265' || upper === 'HEVC') return 'x265';
    if (upper === 'DOLBY VISION') return 'DV';
    if (upper === 'E-AC-3' || upper === 'DD+' || upper === 'DDP') return 'DDP';
    if (upper === 'TRUEHD') return 'TrueHD';
    if (upper === 'DTS-HD MA' || upper === 'DTS-HD-MA') return 'DTS-HD-MA';
    return raw;
  }

  normalizeSearchTitle(title) {
    const original = String(title || '').trim();
    const leadingNumericTitle = original.match(/^((?:19|20)\d{2})(?=$|[ ._([{-])/);

    const cleaned = original
      .replace(/\b(19|20)\d{2}\b/g, ' ')
      .replace(/\b(complete|proper|repack|internal)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned) {
      return cleaned;
    }

    return leadingNumericTitle ? leadingNumericTitle[1] : '';
  }

  extractSearchCandidate(filename, mediaType, parsed) {
    const stem = String(filename || '')
      .replace(/\.nzb\.gz$/i, '')
      .replace(/\.nzb$/i, '')
      .replace(/\((?:imdb-)?tt\d{7,8}\)/ig, ' ')
      .replace(/\(tmdb-\d+\)/ig, ' ')
      .trim();

    const seasonEpisode = this.extractSeasonEpisodeFromRaw(stem);
    const year = parsed.year || this.extractRawYear(stem);

    const normalized = stem
      .replace(/[._]+/g, ' ')
      .replace(/\s+-\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (mediaType === 'movie') {
      const movieTitle = this.extractMovieTitleBeforeYear(normalized, year);
      const cleanedMovieTitle = this.cleanPreparationTitle(movieTitle);
      const preservedMovieTitle = this.cleanPreparationTitle(parsed.title || movieTitle || normalized);
      const fallbackMovieTitle = this.cleanPreparationTitle(parsed.title || normalized);

      return {
        title: cleanedMovieTitle || preservedMovieTitle || fallbackMovieTitle,
        searchTitle: cleanedMovieTitle || fallbackMovieTitle,
        year,
        season: null,
        episode: null
      };
    }

    if (mediaType === 'tv') {
      const tvTitle = this.extractTvTitleBeforeSeason(normalized, year);
      const cleanedTvTitle = this.cleanPreparationTitle(tvTitle);
      const preservedTvTitle = this.cleanPreparationTitle(parsed.title || tvTitle || normalized);
      const fallbackTvTitle = this.cleanPreparationTitle(parsed.title || normalized);

      return {
        title: cleanedTvTitle || preservedTvTitle || fallbackTvTitle,
        searchTitle: cleanedTvTitle || fallbackTvTitle,
        year,
        season: parsed.season ?? seasonEpisode.season ?? null,
        episode: parsed.episode ?? seasonEpisode.episode ?? null
      };
    }

    const rawTokens = normalized ? normalized.split(' ') : [];
    const titleTokens = [];

    for (const token of rawTokens) {
      if (!token) continue;

      if (this.isSeasonEpisodeToken(token)) {
        break;
      }

      if (this.isPreparationBoundaryToken(token)) {
        if (!year && this.isYearToken(token)) {
          titleTokens.push(token);
        }
        break;
      }

      if (this.isYearToken(token)) {
        break;
      }

      titleTokens.push(token);
    }

    const fallbackTitle = this.cleanPreparationTitle(parsed.title || normalized);
    const extractedTitle = this.cleanPreparationTitle(titleTokens.join(' '));

    return {
      title: fallbackTitle || extractedTitle,
      searchTitle: extractedTitle || fallbackTitle,
      year,
      season: parsed.season ?? seasonEpisode.season ?? null,
      episode: parsed.episode ?? seasonEpisode.episode ?? null
    };
  }

  extractWrappedTmdbId(filename) {
    const match = String(filename || '').match(/[\[(]tmdb-(\d+)[\])]$/i);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  shouldSkipTmdbLookup(originalName, mediaType, parsed, candidate, wrappedTmdbId) {
    if (!wrappedTmdbId) {
      return false;
    }

    const name = String(originalName || '');
    const hasMovieShape = /\(\d{4}\)/.test(name);
    const hasTvShape = /\[(?:S\d{1,2}(?:E\d{1,3})?|Season[\s._-]*\d{1,2}|Seizoen[\s._-]*\d{1,2})\]/i.test(name)
      || /\b(?:S\d{1,2}E\d{1,3}|S\d{1,2}|Season[\s._-]*\d{1,2}|Seizoen[\s._-]*\d{1,2})\b/i.test(name);
    const hasStructuredName = mediaType === 'tv' ? hasTvShape : hasMovieShape;
    const hasCleanTitle = Boolean((candidate?.title || parsed?.title || '').trim());

    return hasStructuredName && hasCleanTitle;
  }

  extractMovieTitleBeforeYear(normalized, year) {
    const text = String(normalized || '').trim();
    if (!text) {
      return '';
    }

    if (year) {
      const yearPattern = new RegExp(`^(.*?)\\b${String(year).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const match = text.match(yearPattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    const genericYearMatch = text.match(/^(.*?)\b(19|20)\d{2}\b/);
    if (genericYearMatch?.[1]) {
      return genericYearMatch[1].trim();
    }

    return text;
  }

  extractTvTitleBeforeSeason(normalized, year) {
    const text = String(normalized || '').trim();
    if (!text) {
      return '';
    }

    const seasonMarker = text.match(/^(.*?)\b(?:S\d{1,2}(?:E\d{1,3})?|Seizoen[\s._-]*\d{1,2}(?:[\s._-]*(?:Episode|Aflevering)[\s._-]*\d{1,3})?)\b/i);
    let candidate = seasonMarker?.[1] ? seasonMarker[1].trim() : text;

    if (year) {
      const yearPattern = new RegExp(`^(.*?)\\b${String(year).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const match = candidate.match(yearPattern);
      if (match?.[1]) {
        candidate = match[1].trim();
      }
    }

    // Preserve titles that are themselves 4-digit years, like "1923".
    if (/^(19|20)\d{2}$/.test(candidate)) {
      return candidate;
    }

    const genericYearMatch = candidate.match(/^(.*?)\b(19|20)\d{2}\b/);
    if (genericYearMatch?.[1]) {
      candidate = genericYearMatch[1].trim();
    }

    return candidate;
  }

  extractSeasonEpisodeFromRaw(value) {
    const text = String(value || '');

    const standard = text.match(/(?:^|[ ._-])S(\d{1,2})(?:E(\d{1,3}))?(?=$|[ ._-])/i);
    if (standard) {
      return {
        season: Number.parseInt(standard[1], 10),
        episode: standard[2] ? Number.parseInt(standard[2], 10) : 0
      };
    }

    const alt = text.match(/(?:^|[ ._-])(\d{1,2})x(\d{1,3})(?=$|[ ._-])/i);
    if (alt) {
      return {
        season: Number.parseInt(alt[1], 10),
        episode: Number.parseInt(alt[2], 10)
      };
    }

    const dutch = text.match(/(?:^|[ ._-])Seizoen[\s._-]*(\d{1,2})(?:[ ._-]*(?:Episode|Aflevering)[\s._-]*(\d{1,3}))?(?=$|[ ._-])/i);
    if (dutch) {
      return {
        season: Number.parseInt(dutch[1], 10),
        episode: dutch[2] ? Number.parseInt(dutch[2], 10) : 0
      };
    }

    return { season: null, episode: null };
  }

  extractRawYear(value) {
    const text = String(value || '');
    const matches = [...text.matchAll(/\b(19|20)\d{2}\b/g)];
    if (matches.length === 0) {
      return null;
    }

    for (const match of matches) {
      const year = match[0];
      if (!['2160', '1080', '720', '576', '480'].includes(year)) {
        return year;
      }
    }

    return null;
  }

  isYearToken(token) {
    return /\b(19|20)\d{2}\b/.test(String(token || '')) && !['2160', '1080', '720', '576', '480'].includes(String(token || ''));
  }

  isSeasonEpisodeToken(token) {
    return /^S\d{1,2}(?:E\d{1,3})?$/i.test(String(token || ''))
      || /^\d{1,2}x\d{1,3}$/i.test(String(token || ''))
      || /^Seizoen[\s._-]*\d{1,2}(?:[\s._-]*(?:Episode|Aflevering)[\s._-]*\d{1,3})?$/i.test(String(token || ''));
  }

  isPreparationBoundaryToken(token) {
    const upper = String(token || '').toUpperCase();

    if (!upper) {
      return false;
    }

    if (this.isYearToken(upper) || this.isSeasonEpisodeToken(upper)) {
      return true;
    }

    if (/^\d{3,4}P$/i.test(upper)) return true;
    if (/^(X|H)\.?26[45]$/i.test(upper)) return true;
    if (/^(HEVC|AVC|AV1|VP9|HDR|HDR10|HDR10\+|DV|DOVI|UHD|4K|MKV|MP4|AVI)$/i.test(upper)) return true;
    if (/^(WEB|WEB-DL|WEBDL|WEBRIP|BLURAY|BLU-RAY|BDRIP|BRRIP|REMUX|HDTV|DVDRIP|CAM|HDRIP)$/i.test(upper)) return true;
    if (/^(AAC|AC3|EAC3|DD|DDP|DTS|TRUEHD|ATMOS|OPUS|FLAC|MP3)$/i.test(upper)) return true;
    if (/^(RARBG|YTS|YIFY|OFT|BONE|SIQ|PAHE|AN0MAL1|NZBFORYOU|QXR|PSA|TGX|ION10|EVO|FGT|NTB|AMZN|NF|DSNP|HMAX|ATVP)$/i.test(upper)) return true;

    return false;
  }

  cleanPreparationTitle(value) {
    const original = String(value || '').trim();
    const leadingNumericTitle = original.match(/^((?:19|20)\d{2})(?=$|[ ._([{-])/);

    const cleaned = original
      .replace(/[._-]+/g, ' ')
      .replace(/[()[\]{}]+/g, ' ')
      .replace(/\b(19|20)\d{2}\b/g, ' ')
      .replace(/\bS\d{1,2}(?:E\d{1,3})?\b/gi, ' ')
      .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
      .replace(/\b(complete|proper|repack|internal|criterion)\b/gi, ' ')
      .replace(/\b(RARBG|YTS|YIFY|OFT|BONE|SIQ|PAHE|AN0MAL1|NZBFORYOU|QXR|PSA|TGX|ION10|EVO|FGT|NTB)\b/gi, ' ')
      .replace(/\b(2160p|1080p|720p|576p|480p|4k|uhd|web|web-dl|webrip|bluray|blu-ray|bdrip|brrip|remux|hdtv|dvdrip|cam|hdrip)\b/gi, ' ')
      .replace(/\b(x264|x265|h264|h265|hevc|avc|av1|vp9|aac|ac3|eac3|dd|ddp|dts|truehd|atmos|opus|flac|mp3)\b/gi, ' ')
      .replace(/\b(amzn|nf|dsnp|hmax|atvp)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned) {
      return cleaned;
    }

    // Preserve legitimate 4-digit titles like "1923" if generic cleanup strips everything else.
    return leadingNumericTitle ? leadingNumericTitle[1] : '';
  }

  normalizeMatchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/\s*&\s*/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildSearchTitleVariants(title) {
    const base = this.normalizeSearchTitle(title);
    const variants = [];
    const add = (value) => {
      const normalized = String(value || '').trim();
      if (normalized && !variants.includes(normalized)) {
        variants.push(normalized);
      }
    };

    add(base);
    add(base.replace(/\s*&\s*/g, ' and '));
    add(base.replace(/\band\b/gi, '&'));
    add(base.replace(/\b([A-Za-z]{3,})s(?=\s+[A-Z])/g, "$1's"));

    return variants;
  }

  chooseDisplayTitle(sourceTitle, canonicalTitle) {
    const cleanedSource = this.sanitizeFilenamePart(sourceTitle || '');
    const cleanedCanonical = this.sanitizeFilenamePart(canonicalTitle || '');

    if (!cleanedSource) {
      return cleanedCanonical;
    }

    if (!cleanedCanonical) {
      return cleanedSource;
    }

    const normalizedSource = this.normalizeMatchText(cleanedSource);
    const normalizedCanonical = this.normalizeMatchText(cleanedCanonical);

    if (!normalizedSource || normalizedSource === normalizedCanonical) {
      return cleanedCanonical;
    }

    if (normalizedSource.includes(normalizedCanonical) || normalizedCanonical.includes(normalizedSource)) {
      return cleanedCanonical;
    }

    return cleanedSource;
  }

  sanitizeFilenamePart(value) {
    return String(value || '')
      .replace(/[\/\\:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractYear(value) {
    if (!value || typeof value !== 'string') return null;
    const match = value.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : null;
  }

  getUniquePath(candidatePath) {
    if (!fs.existsSync(candidatePath)) {
      return candidatePath;
    }

    const dir = path.dirname(candidatePath);
    const parsedPath = path.parse(candidatePath);
    let stem = parsedPath.name;
    let ext = parsedPath.ext;

    if (ext === '.gz' && parsedPath.name.endsWith('.nzb')) {
      const nested = path.parse(parsedPath.name);
      stem = nested.name;
      ext = `${nested.ext}${ext}`;
    }

    let counter = 2;
    while (true) {
      const nextPath = path.join(dir, `${stem} (${counter})${ext}`);
      if (!fs.existsSync(nextPath)) {
        return nextPath;
      }
      counter += 1;
    }
  }

  movePreparedImportToArchive(filePath) {
    const archiveDir = path.join(path.dirname(filePath), '.nzbarr-imported');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const destination = this.getUniquePath(path.join(archiveDir, path.basename(filePath)));
    fs.renameSync(filePath, destination);
    return destination;
  }

  movePreparedImportToDuplicates(filePath) {
    const duplicatesDir = path.join(path.dirname(filePath), 'duplicates');
    if (!fs.existsSync(duplicatesDir)) {
      fs.mkdirSync(duplicatesDir, { recursive: true });
    }

    const destination = this.getUniquePath(path.join(duplicatesDir, path.basename(filePath)));
    fs.renameSync(filePath, destination);
    return destination;
  }

  movePreparedImportToNeedsImdb(filePath) {
    const needsImdbDir = path.join(path.dirname(filePath), 'needs-imdb');
    if (!fs.existsSync(needsImdbDir)) {
      fs.mkdirSync(needsImdbDir, { recursive: true });
    }

    const destination = this.getUniquePath(path.join(needsImdbDir, path.basename(filePath)));
    fs.renameSync(filePath, destination);
    return destination;
  }

  isDuplicateImportError(errorMessage) {
    const message = String(errorMessage || '').toLowerCase();
    return message.includes('duplicate nzb detected') || message.includes('already been imported');
  }
}

module.exports = new ImportPreparationService();
