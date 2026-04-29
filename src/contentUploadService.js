/**
 * ContentUploadService - Handles re-uploading refreshed content to Usenet
 * 
 * This service:
 * 1. Locates the downloaded media file
 * 2. Reads the file data
 * 3. Posts it to Usenet via NNTP (multipart)
 * 4. Generates a new NZB file from the posted segments
 * 5. Saves the NZB (replacing or alongside the original)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nntpClient = require('./nntpClient');
const nzbGenerator = require('./nzbGenerator');
const nzbFileUtils = require('./nzbFileUtils');
const db = require('./database');
const appPaths = require('./appPaths');
const { formatNewsgroups, formatNewsgroupsHeader } = require('./newsgroupUtils');

class ContentUploadService {
  constructor() {
    this.refreshReleaseGroup = 'SWISHER';
  }

  /**
   * Upload a media file to Usenet and generate a new NZB
   * 
   * @param {object} options
   * @param {object} options.release - Release object from DB
   * @param {string} options.filePath - Path to the media file to upload
   * @param {object} options.settings - App settings (NNTP + auto-refresh config)
   * @param {function} options.onProgress - Optional progress callback
   * @returns {Promise<{success: boolean, nzbPath: string, messageIds: string[]}>}
   */
  async uploadFileToUsenet(options, onProgress) {
    const {
      release,
      filePath,
      settings
    } = options;

    // Resolve upload NNTP settings
    // If "same as download" is checked, use download NNTP settings
    // Otherwise, use the dedicated upload NNTP settings
    const useDownloadForUpload = settings.upload_nntp_same_as_download === '1';
    
    const nntpSettings = {
      server: useDownloadForUpload ? settings.nntp_server : (settings.upload_nntp_server || settings.nntp_server),
      port: parseInt(useDownloadForUpload ? (settings.nntp_port || '563') : (settings.upload_nntp_port || settings.nntp_port || '563'), 10),
      username: useDownloadForUpload ? settings.nntp_username : (settings.upload_nntp_username || settings.nntp_username),
      password: useDownloadForUpload ? settings.nntp_password : (settings.upload_nntp_password || settings.nntp_password),
      ssl: useDownloadForUpload ? (settings.nntp_ssl === '1') : ((settings.upload_nntp_ssl !== undefined ? settings.upload_nntp_ssl : settings.nntp_ssl) === '1'),
      connections: parseInt(useDownloadForUpload ? (settings.nntp_connections || '5') : (settings.upload_nntp_connections || settings.nntp_connections || '5'), 10)
    };

    const serverLabel = useDownloadForUpload ? 'Download NNTP' : 'Upload NNTP';
    if (!nntpSettings.server) {
      throw new Error(`${serverLabel} server not configured. Set upload_nntp_server in Settings > Upload NNTP Server.`);
    }

    // Get file info (don't read entire file into memory — stream from disk)
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStat = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileSize = fileStat.size;

    console.log(`[Upload] Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(1)} MB) to Usenet...`);

    // Get auto-refresh settings
    const newsgroups = formatNewsgroups(settings.auto_refresh_newsgroup);
    const newsgroupHeader = formatNewsgroupsHeader(newsgroups);
    const poster = settings.auto_refresh_poster || `NZBarr Refresh <${nntpSettings.username || 'user@example.com'}>`;
    const password = release.password || settings.archive_password || null;
    const refreshMode = settings.auto_refresh_mode || 'replace';

    // Connect to NNTP
    console.log(`[Upload] Connecting to NNTP (${serverLabel}): ${nntpSettings.server}:${nntpSettings.port}`);
    await nntpClient.connect(nntpSettings);

    try {
      // Post the file in parts (streams from disk — doesn't load entire file)
      const postResult = await nntpClient.postFileInParts({
        filePath,
        filename: fileName,
        from: poster,
        newsgroups: newsgroupHeader,
        maxPartSize: parseInt(settings.upload_article_size || '716800', 10),
        retryCount: parseInt(settings.upload_retry_count || '10', 10),
        threadCount: parseInt(settings.upload_thread_count || '8', 10),
        password
      }, (progress) => {
        if (onProgress) {
          const mbPosted = (progress.bytesPosted / (1024 * 1024)).toFixed(1);
          const mbTotal = (progress.totalSize / (1024 * 1024)).toFixed(1);
          onProgress({
            step: 'uploading',
            message: `Uploading part ${progress.part}/${progress.totalParts} (${mbPosted}/${mbTotal} MB)`,
            progress: 85 + (progress.part / progress.totalParts) * 10
          });
        }
      });

      console.log(`[Upload] Successfully posted ${fileName} in ${postResult.messageIds.length} parts`);
      const nzbGuid = this.calculateNZBGuid(postResult.messageIds);

      // Generate NZB from the posted segments
      const nzbContent = nzbGenerator.generateNZBFromSegments({
        filename: fileName,
        subject: postResult.nzbData.subject,
        poster,
        newsgroup: newsgroups,
        password,
        segments: postResult.nzbData.segments
      });

      // Always save as a NEW file alongside the original (never overwrite)
      // This way we preserve the original NZB and the user can compare
      const nzbPath = this.getNZBStoragePath(release, fileName, 'keep_both', settings, nzbGuid);
      this.saveNZB(nzbPath, nzbContent);

      console.log(`[Upload] NZB saved to: ${nzbPath} (original preserved)`);

      return {
        success: true,
        nzbPath,
        nzbGuid,
        messageIds: postResult.messageIds,
        nzbContent
      };
    } finally {
      // Disconnect from NNTP
      nntpClient.disconnect();
    }
  }

  /**
   * Determine where to save the new NZB file
   * 
   * @param {object} release - Release object
   * @param {string} fileName - Media file name
   * @param {string} mode - 'replace' or 'keep_both'
   * @returns {string} NZB file path
   */
  getNZBStoragePath(release, fileName, mode, settings = {}, nzbGuid = null) {
    const originalPath = release.nzb_file_path;
    const baseName = originalPath
      ? path.basename(originalPath, '.gz').replace(/\.nzb$/i, '')
      : release.clean_name || release.search_name || path.basename(fileName, path.extname(fileName)) || 'unknown';
    const markedBaseName = this.addRefreshFilenameMarker(baseName);
    const guidedBaseName = this.prependNZBGuidToBaseName(
      mode === 'keep_both' ? `${markedBaseName}_refreshed` : markedBaseName,
      nzbGuid || release?.nzb_guid
    );
    const shardDir = appPaths.getShardedNZBDirectory(guidedBaseName, settings);

    if (!fs.existsSync(shardDir)) {
      fs.mkdirSync(shardDir, { recursive: true });
    }

    return path.join(shardDir, `${guidedBaseName}.nzb.gz`);
  }

  /**
   * Generate a file name for the NZB
   */
  generateNZBFileName(release, fileName, mode) {
    const base = release.clean_name || release.search_name || 'unknown';
    const markedBase = this.addRefreshFilenameMarker(base);
    const suffix = mode === 'keep_both' ? '_refreshed' : '';
    return `${markedBase}${suffix}.nzb`;
  }

  addRefreshFilenameMarker(baseName) {
    const marker = '[SWISHER]';
    const value = String(baseName || '').trim();
    if (!value) return marker;
    if (value.toLowerCase().includes(marker.toLowerCase())) return value;
    return `${value}.${marker}`;
  }

  calculateNZBGuid(messageIds = []) {
    const identifierSource = [...messageIds].filter(Boolean).sort().join('|||');
    return identifierSource
      ? crypto.createHash('sha256').update(identifierSource).digest('hex').substring(0, 32)
      : null;
  }

  sanitizeFileStem(value) {
    return String(value || 'unknown')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/^[.\s_]+|[.\s_]+$/g, '') || 'unknown';
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

  /**
   * Save NZB content compressed on disk
   * 
   * @param {string} filePath - Output path
   * @param {string} nzbContent - NZB XML
   */
  saveNZB(filePath, nzbContent) {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    nzbFileUtils.writeCompressedNZB(filePath, nzbContent);
  }

  /**
   * Update the release with the new NZB path in the database
   * 
   * @param {number} releaseId - Release ID
   * @param {string} newNzbPath - New NZB file path
   * @param {object} nzbData - NZB metadata (guid, size, parts, etc.)
   */
  updateReleaseNZBPath(releaseId, newNzbPath, nzbData = {}) {
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

      console.log(`[Upload] Updated release ${releaseId} with new NZB path: ${newNzbPath}`);
    } catch (error) {
      console.error(`[Upload] Error updating release ${releaseId}:`, error);
    }
  }

  /**
   * Backup the original NZB before replacing it
   * 
   * @param {string} originalPath - Original NZB path
   * @returns {string|null} Backup path, or null if no backup needed
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
      console.log(`[Upload] Backed up original NZB to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error(`[Upload] Failed to backup NZB:`, error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new ContentUploadService();
