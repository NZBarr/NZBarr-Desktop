/**
 * NgsotUploader - Post files to Usenet using ngPost CLI
 * 
 * ngPost is a proven, reliable Usenet poster. Instead of implementing
 * our own yEnc/NNTP pipeline, we delegate to ngPost via its CLI.
 * 
 * Usage:
 *   /Applications/ngPost.app/Contents/MacOS/ngPost \
 *     -h <host> -P <port> -u <user> -p <pass> -n <connections> \
 *     -f <poster> -g <newsgroup> -a <article_size> -z <msg_id_sig> \
 *     -i <file_path> -o <output_nzb_path>
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const appPaths = require('./appPaths');
const nzbFileUtils = require('./nzbFileUtils');
const { formatNewsgroupsHeader } = require('./newsgroupUtils');
const importPreparationService = require('./importPreparationService');

class NgsotUploader {
  constructor() {
    this.defaultNgPostPath = '/Applications/ngPost.app/Contents/MacOS/ngPost';
    this.refreshReleaseGroup = 'SWISHER';
  }

  getSearchNameFromNZBPath(nzbPath) {
    return nzbFileUtils.stripStoredGUIDPrefix(
      nzbFileUtils.stripNZBExtension(path.basename(String(nzbPath || '')))
    );
  }

  /**
   * Post a file to Usenet using ngPost CLI
   *
   * @param {object} options
   * @param {string} options.filePath - Path to the file to upload
   * @param {object} options.release - Release object (for naming)
   * @param {object} options.settings - App settings (NNTP + upload config)
   * @param {string} options.mode - 'replace' or 'keep_both'
   * @param {function} options.onProgress - Progress callback
   * @returns {Promise<{success: boolean, nzbPath: string, messageIds: string[]}>}
   */
  async uploadFileToUsenet(options, onProgress) {
    const { filePath, release, settings, mode = 'keep_both', filenameMeta = null } = options;
    const ngPostPath = this.resolveNgPostExecutablePath(settings);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (!ngPostPath) {
      throw new Error('ngPost executable not found. Set the ngPost Path in Settings > NZB Auto Refresh or install ngPost.');
    }

    // Resolve upload NNTP settings
    const useDownload = settings.upload_nntp_same_as_download === '1';
    const host = useDownload ? settings.nntp_server : (settings.upload_nntp_server || settings.nntp_server);
    const port = useDownload ? (settings.nntp_port || '563') : (settings.upload_nntp_port || settings.nntp_port || '563');
    const user = useDownload ? settings.nntp_username : (settings.upload_nntp_username || settings.nntp_username);
    const pass = useDownload ? settings.nntp_password : (settings.upload_nntp_password || settings.nntp_password);
    const ssl = useDownload ? (settings.nntp_ssl === '1') : ((settings.upload_nntp_ssl || settings.nntp_ssl) === '1');
    const connections = useDownload ? (settings.nntp_connections || '5') : (settings.upload_nntp_connections || settings.nntp_connections || '5');

    if (!host || !user || !pass) {
      throw new Error('Upload NNTP credentials not configured. Set Upload NNTP server/user/password in settings.');
    }

    const fileName = path.basename(filePath);
    const newsgroup = formatNewsgroupsHeader(settings.auto_refresh_newsgroup);
    const poster = (settings.auto_refresh_poster || `NZBarr Refresh <${user}>`).trim();
    const articleSize = parseInt(settings.upload_article_size || '716800', 10);
    const msgIdSig = 'ngPost'; // Use ngPost's default domain for compatibility
    const archivePassword = (settings.archive_password || release.password || '').trim();

    if (!archivePassword) {
      throw new Error('Archive password not configured. Set Archive Password in Settings > Owned Media Archive.');
    }

    // Write replace-mode uploads to a temporary sibling path first.
    // That lets us keep the original NZB intact until the replacement exists.
    const nzbOutputPath = this.getNgPostOutputPath(release, fileName, mode, filenameMeta, settings);
    const nzbDir = path.dirname(nzbOutputPath);
    if (!fs.existsSync(nzbDir)) {
      fs.mkdirSync(nzbDir, { recursive: true });
    }

    const tempConfigPath = this.createNgPostRefreshConfig(settings);

    // Build ngPost CLI arguments
    const args = [
      '-c', tempConfigPath,
      '-h', host,
      '-P', port.toString(),
      '-u', user,
      '-p', pass,
      '-n', connections.toString(),
      '-f', poster,
      '-g', newsgroup,
      '-a', articleSize.toString(),
      '-z', msgIdSig,
      '--compress',
      '--gen_name',
      '--rar_pass', archivePassword,
      '--rar_size', '99',
      '--par2_pct', '1',
      '--rar_no_root_folder',
      '-x',
      '-i', filePath,
      '-o', nzbOutputPath,
    ];

    if (ssl) {
      args.push('-s');
    }

    console.log(`[ngPost] Posting ${fileName} to ${newsgroup}...`);
    console.log(`[ngPost] Command: ${ngPostPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // ngPost outputs progress to stdout. We'll capture it.
      const child = execFile(ngPostPath, args, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log(`[ngPost] ${data.toString().trim()}`);
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.error(`[ngPost ERR] ${data.toString().trim()}`);
      });

      child.on('close', async (code) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (code !== 0) {
          console.error(`[ngPost] Failed with exit code ${code} after ${elapsed}s`);
          console.error(`[ngPost] stderr: ${stderr}`);
          try { fs.unlinkSync(tempConfigPath); } catch (e) {}
          reject(new Error(`ngPost failed with exit code ${code}: ${stderr}`));
          return;
        }

        console.log(`[ngPost] Posted ${fileName} successfully in ${elapsed}s`);
        console.log(`[ngPost] NZB saved to: ${nzbOutputPath}`);

        const actualNzbPath = this.resolveActualNZBPath(nzbOutputPath);

        // Verify NZB was created
        if (!actualNzbPath) {
          try { fs.unlinkSync(tempConfigPath); } catch (e) {}
          reject(new Error(`ngPost completed but NZB file not found at ${nzbOutputPath}`));
          return;
        }

        if (actualNzbPath !== nzbOutputPath) {
          console.log(`[ngPost] Using actual NZB output path: ${path.basename(actualNzbPath)}`);
        }

        this.stripPasswordMetaFromNZB(actualNzbPath);

        // Extract message IDs from the generated NZB
        const nzbContent = fs.readFileSync(actualNzbPath, 'utf8');
        const messageIds = [];
        const segRegex = /<segment[^>]+>([^<]+)<\/segment>/g;
        let match;
        while ((match = segRegex.exec(nzbContent)) !== null) {
          messageIds.push(match[1]);
        }
        const sortedMessageIds = [...messageIds].filter(Boolean).sort();
        const identifierSource = sortedMessageIds.join('|||');
        const nzbHash = identifierSource
          ? crypto.createHash('md5').update(identifierSource).digest('hex')
          : null;
        const nzbGuid = identifierSource
          ? crypto.createHash('sha256').update(identifierSource).digest('hex').substring(0, 32)
          : null;

        // Determine the final NZB path
        let finalNzbPath;
        if (mode === 'replace') {
          finalNzbPath = this.getNZBStoragePath(release, fileName, mode, filenameMeta, settings, nzbGuid);
          this.installReplacementNZB(actualNzbPath, finalNzbPath);
          this.removeObsoleteOriginalNZB(release.nzb_file_path, finalNzbPath);
          console.log(`[ngPost] Replace mode: installed new NZB at ${path.basename(finalNzbPath)}`);
        } else {
          finalNzbPath = this.getNZBStoragePath(release, fileName, mode, filenameMeta, settings, nzbGuid);

          if (actualNzbPath !== finalNzbPath) {
            const finalDir = path.dirname(finalNzbPath);
            if (!fs.existsSync(finalDir)) {
              fs.mkdirSync(finalDir, { recursive: true });
            }
            nzbFileUtils.writeCompressedNZB(finalNzbPath, nzbFileUtils.readNZBBuffer(actualNzbPath));
            fs.unlinkSync(actualNzbPath);
            console.log(`[ngPost] Renamed NZB to: ${path.basename(finalNzbPath)}`);
          }
        }

        // Handle based on mode
        let importResult = null;

        if (mode === 'replace') {
          // REPLACE MODE: Skip import, just update the existing release's NZB file path
          // The NZB replaces the original one on disk
          const db = require('./database');
          db.run(`
            UPDATE releases SET
              search_name = ?,
              nzb_guid = COALESCE(?, nzb_guid),
              nzb_hash = COALESCE(?, nzb_hash),
              nzb_file_path = ?,
              password = ?,
              release_group = ?,
              post_date = CURRENT_TIMESTAMP,
              add_date = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            this.getSearchNameFromNZBPath(finalNzbPath),
            nzbGuid,
            nzbHash,
            finalNzbPath,
            archivePassword,
            this.refreshReleaseGroup,
            release.id
          ]);
          console.log(`[ngPost] Replace mode: updated release #${release.id} with new NZB path: ${path.basename(finalNzbPath)}`);
          importResult = { success: true, mode: 'replace', nzbPath: finalNzbPath, nzbGuid, nzbHash };
        } else {
          // KEEP BOTH MODE: Import the new NZB as a fresh release
          try {
            const nzbImport = require('./nzbImportService');
            await nzbImport.initialize();
            importResult = await nzbImport.importNZB(finalNzbPath);

            // After import, update the release to match the original release's names AND metadata
            // This ensures the imported release appears with the same name and is linked to the same show/movie
            if (importResult.success) {
              const db = require('./database');
              db.run(`
                UPDATE releases SET
                  search_name = ?,
                  clean_name = ?,
                  media_type = ?,
                  category_id = ?,
                  imdb_id = ?,
                  tmdb_id = ?,
                  season = ?,
                  episode = ?,
                  password = ?,
                  resolution = COALESCE(resolution, ?),
                  video_codec = COALESCE(video_codec, ?),
                  audio_codec = COALESCE(audio_codec, ?),
                  audio_channels = COALESCE(audio_channels, ?),
                  release_group = ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [
                release.search_name,
                release.clean_name,
                release.media_type,
                release.category_id,
                release.imdb_id,
                release.tmdb_id,
                release.season,
                release.episode,
                archivePassword,
                release.resolution,
                release.video_codec,
                release.audio_codec,
                release.audio_channels,
                this.refreshReleaseGroup,
                importResult.releaseId
              ]);
              console.log(`[ngPost] Updated imported release #${importResult.releaseId} to match original: ${release.clean_name} (media_type=${release.media_type})`);
            }
          } catch (importError) {
            console.warn(`[ngPost] NZB import warning: ${importError.message}`);
            // Still resolve as success even if import fails (posting succeeded)
            importResult = { success: false, error: importError.message };
          }
        }

        resolve({
          success: true,
          nzbPath: finalNzbPath,
          nzbGuid,
          nzbHash,
          messageIds,
          nzbContent,
          method: 'ngPost',
          importResult
        });

        try { fs.unlinkSync(tempConfigPath); } catch (e) {}
      });

      child.on('error', (err) => {
        try { fs.unlinkSync(tempConfigPath); } catch (e) {}
        reject(new Error(`ngPost process error: ${err.message}`));
      });
    });
  }

  resolveNgPostExecutablePath(settings = {}) {
    const configured = this.normalizeNgPostExecutablePath(settings.ngpost_path || settings.ngPost_path || '');
    const candidates = [];

    if (configured) {
      candidates.push(configured);
    }

    candidates.push(this.defaultNgPostPath);

    if (process.platform === 'win32') {
      candidates.push(
        'C:\\Program Files\\ngPost\\ngPost.exe',
        'C:\\Program Files (x86)\\ngPost\\ngPost.exe'
      );
    } else if (process.platform === 'linux') {
      candidates.push('/usr/bin/ngPost', '/usr/local/bin/ngPost');
    }

    const fromPath = this.findExecutableOnPath(process.platform === 'win32'
      ? ['ngPost.exe', 'ngPost.cmd', 'ngPost.bat', 'ngPost']
      : ['ngPost', 'ngpost']);
    if (fromPath) {
      candidates.push(fromPath);
    }

    for (const candidate of candidates) {
      const normalized = this.normalizeNgPostExecutablePath(candidate);
      if (normalized && fs.existsSync(normalized)) {
        return normalized;
      }
    }

    return null;
  }

  normalizeNgPostExecutablePath(input) {
    const raw = String(input || '').trim();
    if (!raw) {
      return null;
    }

    const expanded = raw.startsWith('~')
      ? path.join(os.homedir(), raw.slice(1).replace(/^[/\\]/, ''))
      : raw;

    let candidate = path.resolve(expanded);
    if (/\.app$/i.test(candidate)) {
      candidate = path.join(candidate, 'Contents', 'MacOS', 'ngPost');
    }
    return candidate;
  }

  findExecutableOnPath(names) {
    const pathEntries = String(process.env.PATH || '')
      .split(path.delimiter)
      .filter(Boolean);

    for (const dir of pathEntries) {
      for (const name of names) {
        const candidate = path.join(dir, name);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  createNgPostRefreshConfig(settings) {
    const tempDir = settings.archive_work_path || appPaths.getTempDir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const archiveBinaryPath = this.resolveArchiveBinaryPath();
    const configPath = path.join(tempDir, `ngpost-refresh-${Date.now()}-${process.pid}.conf`);
    const configLines = [
      `TMP_DIR = ${tempDir}`,
      `RAR_PATH = ${archiveBinaryPath}`
    ];

    if (archiveBinaryPath.endsWith('/7z')) {
      configLines.push('RAR_EXTRA = -mx0 -mhe=on');
    }

    fs.writeFileSync(configPath, `${configLines.join('\n')}\n`, 'utf8');
    return configPath;
  }

  resolveArchiveBinaryPath() {
    const candidates = [
      '/opt/homebrew/bin/7z',
      '/usr/local/bin/7z',
      '/opt/homebrew/bin/rar',
      '/usr/local/bin/rar'
    ];

    const archiveBinaryPath = candidates.find(candidate => fs.existsSync(candidate));
    if (!archiveBinaryPath) {
      throw new Error('No archive binary found for ngPost compression. Install 7z or rar first.');
    }

    return archiveBinaryPath;
  }

  stripPasswordMetaFromNZB(nzbPath) {
    if (!nzbPath || !fs.existsSync(nzbPath)) {
      return;
    }

    const nzbContent = nzbFileUtils.readNZBContent(nzbPath);
    const sanitizedContent = nzbContent.replace(/\s*<meta[^>]*type="password"[^>]*>[\s\S]*?<\/meta>\s*/gi, '\n');

    if (sanitizedContent !== nzbContent) {
      if (nzbFileUtils.isGzipPath(nzbPath)) {
        nzbFileUtils.writeCompressedNZB(nzbPath, sanitizedContent);
      } else {
        fs.writeFileSync(nzbPath, sanitizedContent, 'utf8');
      }
      console.log(`[ngPost] Removed password metadata from NZB: ${path.basename(nzbPath)}`);
    }
  }

  resolveActualNZBPath(expectedPath) {
    if (!expectedPath) {
      return null;
    }

    if (fs.existsSync(expectedPath)) {
      return expectedPath;
    }

    return null;
  }

  /**
   * Determine where to save the new NZB file.
   * New and renamed refresh outputs are stored compressed as .nzb.gz.
   */
  getNZBStoragePath(release, fileName, mode, filenameMeta = null, settings = {}, nzbGuid = null) {
    const originalPath = release.nzb_file_path;
    const baseName = this.buildTaggedBaseName(release, filenameMeta, mode, originalPath ? path.basename(originalPath) : '');
    const guidedBaseName = this.prependNZBGuidToBaseName(baseName, nzbGuid);
    const ext = '.nzb.gz';

    if (!originalPath) {
      const shardDir = appPaths.getShardedNZBDirectory(guidedBaseName, settings);
      if (!fs.existsSync(shardDir)) {
        fs.mkdirSync(shardDir, { recursive: true });
      }
      return path.join(shardDir, `${guidedBaseName}${ext}`);
    }

    const shardDir = appPaths.getShardedNZBDirectory(guidedBaseName, settings);
    if (!fs.existsSync(shardDir)) {
      fs.mkdirSync(shardDir, { recursive: true });
    }

    return path.join(shardDir, `${guidedBaseName}${ext}`);
  }

  getNgPostOutputPath(release, fileName, mode, filenameMeta = null, settings = {}) {
    const finalPath = this.getNZBStoragePath(release, fileName, mode, filenameMeta, settings);
    const suffix = `.uploading-${Date.now()}-${process.pid}`;
    if (finalPath.endsWith('.nzb.gz')) {
      return finalPath.replace(/\.nzb\.gz$/, `${suffix}.nzb`);
    }

    if (finalPath.endsWith('.nzb')) {
      return finalPath.replace(/\.nzb$/, `${suffix}.nzb`);
    }

    return `${finalPath}${suffix}`;
  }

  generateNZBFileName(release, fileName, mode, filenameMeta = null) {
    const base = this.buildTaggedBaseName(release, filenameMeta, mode);
    return `${base}.nzb.gz`;
  }

  sanitizeNZBGuidForFileName(value) {
    return String(value || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .trim();
  }

  prependNZBGuidToBaseName(baseName, nzbGuid = null) {
    const safeBase = this.sanitizeFileStem(baseName).replace(/^[a-f0-9]{32}-/i, '');
    const safeGuid = this.sanitizeNZBGuidForFileName(nzbGuid);

    if (!safeGuid) {
      return safeBase;
    }

    return safeBase.toLowerCase().startsWith(`${safeGuid.toLowerCase()}-`)
      ? safeBase
      : `${safeGuid}-${safeBase}`;
  }

  buildTaggedBaseName(release, filenameMeta = null, mode = 'keep_both', originalName = '') {
    const preparedName = this.buildPreparedPatternBaseName(release, filenameMeta, mode, originalName);
    if (preparedName) {
      return preparedName;
    }

    const originalBase = originalName
      ? originalName.replace(/\.nzb\.gz$/i, '').replace(/\.nzb$/i, '')
      : '';
    const seedBase = this.stripRefreshSuffix(originalBase)
      || this.stripRefreshSuffix(release.clean_name)
      || this.stripRefreshSuffix(release.search_name)
      || 'unknown';
    const safeBase = this.sanitizeFileStem(seedBase);
    const tags = this.collectFilenameTags(safeBase, release, filenameMeta);
    const taggedBase = tags.length > 0 ? `${safeBase}.${tags.join('.')}` : safeBase;
    const markedBase = this.addRefreshFilenameMarker(taggedBase);
    return mode === 'keep_both' ? `${markedBase}_refreshed` : markedBase;
  }

  buildPreparedPatternBaseName(release, filenameMeta = null, mode = 'keep_both', originalName = '') {
    try {
      const preparedFileName = importPreparationService.buildRefreshFilename({
        release,
        filenameMeta,
        originalName,
        ext: '.nzb',
        mode
      });

      if (!preparedFileName) {
        return null;
      }

      return preparedFileName.replace(/\.nzb$/i, '');
    } catch (error) {
      console.warn(`[ngPost] Smart Preparation filename pattern unavailable, using fallback: ${error.message}`);
      return null;
    }
  }

  collectFilenameTags(baseName, release, filenameMeta = null) {
    const merged = {
      resolution: filenameMeta?.resolution || release.resolution || null,
      hdrFormat: filenameMeta?.hdrFormat || release.hdr_format || null,
      videoCodec: filenameMeta?.videoCodec || release.video_codec || null,
      audioCodec: filenameMeta?.audioCodec || release.audio_codec || null,
      audioChannels: filenameMeta?.audioChannels || release.audio_channels || null
    };

    const candidates = [
      { type: 'resolution', value: this.normalizeFilenameTag('resolution', merged.resolution) },
      { type: 'hdr', value: this.normalizeFilenameTag('hdr', merged.hdrFormat) },
      { type: 'video', value: this.normalizeFilenameTag('video', merged.videoCodec) },
      { type: 'audio', value: this.normalizeFilenameTag('audio', merged.audioCodec) },
      { type: 'channels', value: this.normalizeFilenameTag('channels', merged.audioChannels) }
    ];

    const tags = [];
    for (const candidate of candidates) {
      if (!candidate.value) {
        continue;
      }
      if (this.baseNameAlreadyHasTag(baseName, candidate.type, candidate.value)) {
        continue;
      }
      if (tags.includes(candidate.value)) {
        continue;
      }
      tags.push(candidate.value);
    }

    return tags;
  }

  normalizeFilenameTag(type, value) {
    if (!value) {
      return null;
    }

    const raw = String(value).trim();
    if (!raw) {
      return null;
    }

    switch (type) {
      case 'resolution': {
        const upper = raw.toUpperCase();
        if (['2160P', '1080P', '720P', '576P', '480P', 'SD'].includes(upper)) return upper;
        return upper.replace(/\s+/g, '');
      }
      case 'hdr': {
        const upper = raw.toUpperCase();
        if (upper === 'NONE') return null;
        if (upper.includes('DOLBY VISION')) return 'DV';
        if (upper.includes('HDR10+')) return 'HDR10+';
        if (upper.includes('HDR10')) return 'HDR10';
        if (upper.includes('HLG')) return 'HLG';
        return this.sanitizeTag(raw);
      }
      case 'video': {
        const upper = raw.toUpperCase();
        if (upper.includes('H.265') || upper.includes('H265') || upper.includes('HEVC')) return 'HEVC';
        if (upper.includes('H.264') || upper.includes('H264') || upper.includes('AVC')) return 'H264';
        if (upper.includes('AV1')) return 'AV1';
        if (upper.includes('VP9')) return 'VP9';
        return this.sanitizeTag(raw);
      }
      case 'audio': {
        const upper = raw.toUpperCase();
        if (upper.includes('TRUEHD')) return 'TrueHD';
        if (upper.includes('DTS-HD')) return 'DTSHD.MA';
        if (upper === 'DTS' || upper.includes(' DTS')) return 'DTS';
        if (upper.includes('DD+') || upper.includes('E-AC-3')) return 'DDP';
        if (upper.includes('AC3') || upper.includes('AC-3')) return 'AC3';
        if (upper.includes('AAC')) return 'AAC';
        if (upper.includes('FLAC')) return 'FLAC';
        if (upper.includes('OPUS')) return 'Opus';
        return this.sanitizeTag(raw);
      }
      case 'channels':
        return raw.match(/^\d\.\d$/) ? raw : this.sanitizeTag(raw);
      default:
        return this.sanitizeTag(raw);
    }
  }

  baseNameAlreadyHasTag(baseName, type, value) {
    const stem = String(baseName || '');
    switch (type) {
      case 'resolution':
        return /\b(2160p|1080p|720p|576p|480p|4k|uhd|sd)\b/i.test(stem);
      case 'hdr':
        if (value === 'DV') return /\b(dv|dolby[ ._-]?vision)\b/i.test(stem);
        if (value === 'HDR10+') return /\bhdr10\+\b/i.test(stem);
        if (value === 'HDR10') return /\bhdr10\b/i.test(stem);
        if (value === 'HLG') return /\bhlg\b/i.test(stem);
        return this.normalizedStem(stem).includes(this.normalizedStem(value));
      case 'video':
        if (value === 'HEVC') return /\b(hevc|x265|h[ ._-]?265)\b/i.test(stem);
        if (value === 'H264') return /\b(x264|avc|h[ ._-]?264)\b/i.test(stem);
        return this.normalizedStem(stem).includes(this.normalizedStem(value));
      case 'audio':
        if (value === 'DTSHD.MA') return /\b(dts[ ._-]?hd(?:[ ._-]?ma)?)\b/i.test(stem);
        if (value === 'DDP') return /\b(ddp|eac3|e-?ac-?3)\b/i.test(stem);
        return this.normalizedStem(stem).includes(this.normalizedStem(value));
      case 'channels':
        return stem.includes(value);
      default:
        return this.normalizedStem(stem).includes(this.normalizedStem(value));
    }
  }

  stripRefreshSuffix(value) {
    return String(value || '').replace(/_refreshed$/i, '').trim();
  }

  addRefreshFilenameMarker(baseName) {
    const marker = '[SWISHER]';
    const value = String(baseName || '').trim();
    if (!value) return marker;
    if (value.toLowerCase().includes(marker.toLowerCase())) return value;
    return `${value}.${marker}`;
  }

  sanitizeFileStem(value) {
    return String(value || 'unknown')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/^[.\s_]+|[.\s_]+$/g, '') || 'unknown';
  }

  sanitizeTag(value) {
    return String(value || '')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
      .replace(/\s+/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/^[.\s_]+|[.\s_]+$/g, '');
  }

  normalizedStem(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Update the release with the new NZB path in the database
   */
  updateReleaseNZBPath(releaseId, newNzbPath, nzbData = {}) {
    const db = require('./database');
    try {
      db.run(`
        UPDATE releases SET
          nzb_file_path = ?,
          nzb_guid = COALESCE(?, nzb_guid),
          size = COALESCE(?, size),
          parts = COALESCE(?, parts),
          release_group = COALESCE(?, release_group),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        newNzbPath,
        nzbData.guid || null,
        nzbData.totalSize || null,
        nzbData.totalParts || null,
        nzbData.releaseGroup || this.refreshReleaseGroup || null,
        releaseId
      ]);

      console.log(`[ngPost] Updated release ${releaseId} with new NZB path: ${newNzbPath}`);
    } catch (error) {
      console.error(`[ngPost] Error updating release ${releaseId}:`, error);
    }
  }

  renameExistingNZBToPreparedPattern(release, filenameMeta = null, mode = 'replace') {
    const originalPath = release?.nzb_file_path;
    const actualPath = this.resolveActualNZBPath(originalPath) || originalPath;
    if (!originalPath || !fs.existsSync(actualPath)) {
      return originalPath || null;
    }

    const originalName = path.basename(actualPath);
    const ext = '.nzb';
    const nextName = importPreparationService.buildRefreshFilename({
      release,
      filenameMeta,
      originalName,
      ext,
      mode
    });

    if (!nextName) {
      return actualPath;
    }

    const nextBaseName = nextName.replace(/\.nzb$/i, '');
    const guidedBaseName = this.prependNZBGuidToBaseName(nextBaseName, release?.nzb_guid);
    const dir = appPaths.getShardedNZBDirectory(guidedBaseName, {});
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const desiredPath = path.join(dir, `${guidedBaseName}.nzb.gz`);
    const finalPath = desiredPath === actualPath
      ? actualPath
      : importPreparationService.getUniquePath(desiredPath);

    if (finalPath === actualPath) {
      return actualPath;
    }

    nzbFileUtils.writeCompressedNZB(finalPath, nzbFileUtils.readNZBBuffer(actualPath));
    fs.unlinkSync(actualPath);
    console.log(`[ngPost] Renamed existing NZB to Smart Preparation pattern: ${path.basename(finalPath)}`);
    return finalPath;
  }

  /**
   * Backup the original NZB before replacing it
   */
  backupOriginalNZB(originalPath) {
    if (!originalPath || !fs.existsSync(originalPath)) {
      return null;
    }

    const dir = path.dirname(originalPath);
    const base = path.basename(originalPath, '.gz');
    const backupPath = path.join(dir, `${base}.backup.nzb`);

    try {
      fs.copyFileSync(originalPath, backupPath);
      console.log(`[ngPost] Backed up original NZB to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error(`[ngPost] Failed to backup NZB:`, error);
      return null;
    }
  }

  installReplacementNZB(tempPath, finalPath) {
    if (!tempPath || !fs.existsSync(tempPath)) {
      throw new Error(`Replacement NZB not found at ${tempPath}`);
    }

    if (tempPath === finalPath) {
      return finalPath;
    }

    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const backupPath = `${finalPath}.backup-${Date.now()}-${process.pid}`;

    try {
      if (fs.existsSync(finalPath)) {
        fs.renameSync(finalPath, backupPath);
      }

      nzbFileUtils.writeCompressedNZB(finalPath, nzbFileUtils.readNZBBuffer(tempPath));
      fs.unlinkSync(tempPath);

      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      return finalPath;
    } catch (error) {
      try {
        if (fs.existsSync(backupPath) && !fs.existsSync(finalPath)) {
          fs.renameSync(backupPath, finalPath);
        }
      } catch (restoreError) {
        console.error('[ngPost] Failed to restore original NZB after replacement error:', restoreError);
      }

      throw error;
    }
  }

  removeObsoleteOriginalNZB(originalPath, finalPath) {
    if (!originalPath || !finalPath || originalPath === finalPath) {
      return;
    }

    if (!fs.existsSync(originalPath)) {
      return;
    }

    try {
      fs.unlinkSync(originalPath);
      console.log(`[ngPost] Removed obsolete NZB after rename: ${path.basename(originalPath)}`);
    } catch (error) {
      console.warn(`[ngPost] Failed to remove obsolete NZB ${originalPath}: ${error.message}`);
    }
  }
}

// Export singleton
module.exports = new NgsotUploader();
