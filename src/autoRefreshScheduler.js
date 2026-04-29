/**
 * AutoRefreshScheduler - Background scheduler for automatic NZB refresh
 * 
 * Periodically checks for NZBs older than the configured threshold,
 * queues them for refresh, and orchestrates the full refresh pipeline:
 * 1. Send NZB to SABnzbd for download
 * 2. Poll for download completion
 * 3. Locate downloaded files
 * 4. Run mediainfo and update DB metadata
 * 5. Create new NZB from downloaded content
 * 6. Re-upload content to Usenet
 * 7. Replace or keep alongside the original NZB
 */

const db = require('./database');
const settingsRepository = require('./repositories/settingsRepository');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const downloadDispatch = require('./downloadDispatchService');
const releaseRefreshService = require('./releaseRefreshService');
const ngPostUploader = require('./ngPostUploader');
const releaseRepository = require('./repositories/releaseRepository');
const appPaths = require('./appPaths');

class AutoRefreshScheduler {
  constructor() {
    this.schedulerInterval = null;
    this.activeRefreshJobs = new Map(); // releaseId -> job state
    this.isRunning = false;
    this.shutdownRequested = false;
    this.isProcessingRefreshQueue = false;
  }

  isTerminalJobStatus(status) {
    return ['complete', 'failed', 'cancelled'].includes(String(status || '').toLowerCase());
  }

  /**
   * Start the background scheduler
   */
  start() {
    if (this.schedulerInterval) {
      this.stop();
    }

    console.log('[AutoRefresh] Scheduler starting...');
    this.isRunning = true;
    this.runAutoRefreshCheck()
      .catch((error) => {
        console.error('[AutoRefresh] Initial auto-refresh check failed:', error);
      })
      .finally(() => {
        if (!this.isRunning) {
          return;
        }

        this.scheduleNextCheck().catch((error) => {
          console.error('[AutoRefresh] Failed to schedule next check:', error);
        });
      });
  }

  /**
   * Stop the background scheduler
   */
  stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    console.log('[AutoRefresh] Scheduler stopped');
  }

  /**
   * Cancel any active refresh jobs and remove their temporary download folders.
   * Used during app shutdown so in-flight work is not left behind on disk.
   */
  async abortActiveJobsAndCleanup() {
    this.shutdownRequested = true;
    this.stop();

    const activeJobs = Array.from(this.activeRefreshJobs.values());
    if (activeJobs.length === 0) {
      return { cleaned: 0 };
    }

    console.log(`[AutoRefresh] Cleaning up ${activeJobs.length} active refresh job(s) before quit`);

    let cleaned = 0;
    for (const job of activeJobs) {
      const cleanupTarget = job.downloadPath || job.completedPath || (job.mediaFile ? path.dirname(job.mediaFile) : null);
      if (!cleanupTarget) {
        continue;
      }

      try {
        if (fs.existsSync(cleanupTarget)) {
          const stats = fs.statSync(cleanupTarget);
          if (stats.isDirectory()) {
            fs.rmSync(cleanupTarget, { recursive: true, force: true });
          } else {
            fs.unlinkSync(cleanupTarget);
          }
          cleaned++;
          console.log(`[AutoRefresh] Removed in-progress refresh files for release ${job.release.id}: ${cleanupTarget}`);
        }
      } catch (error) {
        console.error(`[AutoRefresh] Failed to remove active refresh files for release ${job.release.id}:`, error);
      }
    }

    this.activeRefreshJobs.clear();
    return { cleaned };
  }

  /**
   * Schedule the next check based on configured interval
   */
  async scheduleNextCheck() {
    const settings = await settingsRepository.getAll();
    
    if (settings.auto_refresh_enabled !== '1') {
      console.log('[AutoRefresh] Auto-refresh disabled, not scheduling');
      return;
    }

    const intervalMs = this.getIntervalMs(settings.auto_refresh_interval || 'weekly');
    console.log(`[AutoRefresh] Next check in ${intervalMs / 1000 / 60} minutes (${settings.auto_refresh_interval})`);

    this.schedulerInterval = setTimeout(async () => {
      try {
        await this.runAutoRefreshCheck();
      } catch (error) {
        console.error('[AutoRefresh] Scheduled check failed:', error);
      } finally {
        if (this.isRunning) {
          await this.scheduleNextCheck();
        }
      }
    }, intervalMs);
  }

  /**
   * Convert interval string to milliseconds
   */
  getIntervalMs(interval) {
    switch (interval) {
      case 'daily':   return 24 * 60 * 60 * 1000;
      case 'weekly':  return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default:        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Run the auto-refresh check: find aged NZBs and queue for refresh
   */
  async runAutoRefreshCheck() {
    if (!this.isRunning) return;
    if (this.shutdownRequested) return;

    try {
      const settings = await settingsRepository.getAll();
      
      if (settings.auto_refresh_enabled !== '1') {
        console.log('[AutoRefresh] Auto-refresh disabled, skipping check');
        return;
      }

      const ageThresholdYears = parseInt(settings.auto_refresh_age_threshold || '1', 10);
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - ageThresholdYears);
      const cutoffTimestamp = cutoffDate.toISOString().replace('T', ' ').substring(0, 19);

      console.log(`[AutoRefresh] Checking for NZBs older than ${ageThresholdYears} years (before ${cutoffTimestamp})`);

      // Find releases older than threshold that haven't been refreshed recently
      const agedReleases = db.all(`
        SELECT id, search_name, clean_name, nzb_guid, nzb_file_path, post_date, 
               add_date, last_refresh_at, refresh_status, ownership_type, media_type
        FROM releases
        WHERE post_date < ?
          AND is_active_revision = 1
          AND nzb_file_path IS NOT NULL
          AND nzb_file_path != ''
        ORDER BY post_date ASC
      `, [cutoffTimestamp]);

      if (agedReleases.length === 0) {
        console.log(`[AutoRefresh] No NZBs found older than ${ageThresholdYears} years`);
        return;
      }

      console.log(`[AutoRefresh] Found ${agedReleases.length} aged NZB(s) eligible for refresh`);

      // Process each aged release (one at a time to avoid overwhelming SABnzbd)
      for (const release of agedReleases) {
        // Skip if already has an active refresh job
        const existingJob = this.activeRefreshJobs.get(release.id);
        if (existingJob && !this.isTerminalJobStatus(existingJob.status)) {
          console.log(`[AutoRefresh] Release ${release.id} already has active job, skipping`);
          continue;
        }

        // Skip if recently refreshed (within last 30 days)
        if (release.last_refresh_at) {
          const lastRefresh = new Date(release.last_refresh_at);
          const daysSinceRefresh = (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceRefresh < 30) {
            console.log(`[AutoRefresh] Release ${release.id} refreshed ${Math.round(daysSinceRefresh)} days ago, skipping`);
            continue;
          }
        }

        console.log(`[AutoRefresh] Queuing refresh for: ${release.clean_name} (posted: ${release.post_date})`);
        await this.queueReleaseForRefresh(release, settings);
      }
    } catch (error) {
      console.error('[AutoRefresh] Error during auto-refresh check:', error);
    }
  }

  /**
   * Queue a single release for the full refresh pipeline
   */
  async queueReleaseForRefresh(release, settings) {
    if (this.shutdownRequested) {
      return { success: false, cancelled: true, releaseId: release.id };
    }

    const jobId = release.id;
    const activeJob = Array.from(this.activeRefreshJobs.values())
      .find(job => !this.isTerminalJobStatus(job.status));

    if (activeJob) {
      const activeRelease = activeJob.release || {};
      return {
        success: false,
        releaseId: release.id,
        alreadyRunning: true,
        error: `Refresh is already running for ${activeRelease.clean_name || activeRelease.search_name || `release ${activeRelease.id || ''}`.trim()}. Please wait until this refresh is finished before starting another one.`
      };
    }
    
    this.activeRefreshJobs.set(jobId, {
      release,
      status: 'queued',
      startedAt: new Date().toISOString(),
      progress: 0,
      error: null
    });

    try {
      db.run(`
        UPDATE releases
        SET refresh_status = 'running',
            last_refresh_error = NULL
        WHERE id = ?
      `, [release.id]);

      // Step 1: Send to SABnzbd for download
      await this.updateJobStatus(jobId, 'downloading', 10, 'Sending NZB to SABnzbd...');
      const downloadResult = await this.sendToDownloader(release, settings);

      if (!downloadResult.success) {
        throw new Error(`Failed to send to downloader: ${downloadResult.error}`);
      }

      const nzoId = downloadResult.nzoId;
      if (!nzoId) {
        console.warn(`[AutoRefresh] No NZO ID returned from SABnzbd for: ${release.clean_name}`);
      }

      console.log(`[AutoRefresh] NZB sent to SABnzbd for: ${release.clean_name} (NZO: ${nzoId || 'unknown'})`);
      await this.updateJobStatus(jobId, 'waiting_download', 20, 'Waiting for SABnzbd download to complete...');

      // Step 2: Poll SABnzbd API for download completion
      const completedPath = await this.pollForCompletionViaAPI(nzoId, release, settings);
      if (this.shutdownRequested) {
        return { success: false, cancelled: true, releaseId: release.id };
      }

      const job = this.activeRefreshJobs.get(jobId);
      if (job) {
        job.downloadPath = completedPath;
        job.completedPath = completedPath;
      }

      await this.updateJobStatus(jobId, 'analyzing', 60, 'Download complete. Running mediainfo...');

      // Step 3: Run mediainfo for metadata extraction
      const mediaInfo = await this.runMediaInfoOnDownload(completedPath, release, settings);
      if (this.shutdownRequested) {
        return { success: false, cancelled: true, releaseId: release.id };
      }

      await this.updateJobStatus(jobId, 'updating_db', 80, 'Updating release metadata...');
      if (mediaInfo?.mediaInfo) {
        await this.updateReleaseMetadata(release, mediaInfo);
      }

      await this.updateJobStatus(jobId, 'cleaning_download', 82, 'Cleaning refresh folder before upload...');
      const pruneResult = await this.pruneRefreshDownloadToMainMediaFile(
        completedPath,
        mediaInfo?.mediaFile || null,
        release
      );
      if (pruneResult.skipped) {
        console.log(`[AutoRefresh] Refresh folder cleanup skipped for release ${release.id}: ${pruneResult.reason}`);
      } else {
        console.log(`[AutoRefresh] Refresh folder cleanup removed ${pruneResult.removedFiles} file(s) for release ${release.id}`);
      }

      // Step 4: Upload content back to Usenet and generate new NZB
      // Upload the ENTIRE download folder (SABnzbd-created folder with all content)
      await this.updateJobStatus(jobId, 'reuploading', 85, 'Uploading content to Usenet...');

      const refreshMode = settings.auto_refresh_mode || 'keep_both';
      const uploadResult = await this.uploadContentAndGenerateNZB(
        release,
        completedPath,
        settings,
        refreshMode,
        mediaInfo?.mediaInfo || null
      );
      if (this.shutdownRequested) {
        return { success: false, cancelled: true, releaseId: release.id };
      }

      if (!uploadResult?.success) {
        throw new Error(uploadResult?.error || `Re-upload failed for: ${release.clean_name}`);
      }

      await this.updateJobStatus(jobId, 'finalizing', 95, 'Saving new NZB and updating release...');

      // In replace mode, ngPostUploader already updated nzb_file_path, post_date, add_date
      // In keep_both mode, we need to update the original release with the new NZB info
      if (refreshMode === 'keep_both') {
        ngPostUploader.updateReleaseNZBPath(release.id, uploadResult.nzbPath, {
          guid: uploadResult.nzbGuid,
          totalSize: uploadResult.totalSize,
          totalParts: uploadResult.totalParts,
          releaseGroup: ngPostUploader.refreshReleaseGroup
        });
      }

      await this.updateJobStatus(jobId, 'cleanup_download', 98, 'Cleaning completed refresh download...');
      await this.cleanupSuccessfulRefreshDownload(completedPath, release, settings);

      await this.updateJobStatus(jobId, 'complete', 100, 'Refresh complete');

      // Update release refresh status in DB
      db.run(`
        UPDATE releases 
        SET refresh_status = 'refreshed',
            last_refresh_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [release.id]);

      // Send notification if enabled
      if (settings.auto_refresh_notify === '1') {
        this.sendNotification('refresh-complete', {
          releaseId: release.id,
          releaseName: release.clean_name,
          message: `Refreshed: ${release.clean_name}`
        });
      }

      return {
        success: true,
        releaseId: release.id
      };

    } catch (error) {
      if (this.shutdownRequested || error?.cancelled) {
        return {
          success: false,
          releaseId: release.id,
          cancelled: true
        };
      }

      console.error(`[AutoRefresh] Error refreshing release ${release.id}:`, error);
      
      const cleanupResult = await this.cleanupFailedRefresh(release, error);
      const failureMessage = cleanupResult.markedDeletePending
        ? `Error: ${error.message}. Release removed from NZBarr and NZB deleted from disk.`
        : `Error: ${error.message}`;

      await this.updateJobStatus(jobId, 'failed', 0, failureMessage);

      if (!cleanupResult.markedDeletePending) {
        db.run(`
          UPDATE releases 
          SET refresh_status = 'failed',
              last_refresh_error = ?,
              last_refresh_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [error.message, release.id]);
      }

      return {
        success: false,
        releaseId: release.id,
        error: error.message,
        markedDeletePending: cleanupResult.markedDeletePending,
        cleanupError: cleanupResult.cleanupError || null
      };
    } finally {
      if (this.shutdownRequested) {
        this.activeRefreshJobs.delete(jobId);
        return;
      }

      // Remove from active jobs after a delay
      setTimeout(() => {
        this.activeRefreshJobs.delete(jobId);
      }, 60 * 1000); // Keep job state for 1 minute after completion
    }
  }

  /**
   * Send release to configured downloader (SABnzbd) with refresh category
   */
  async sendToDownloader(release, settings) {
    try {
      // Create a settings copy with the refresh category
      const refreshSettings = {
        ...settings,
        sabnzbd_category: settings.refresh_sabnzbd_category || 'nzbarr-refresh'
      };

      const result = await downloadDispatch.sendRelease(release, refreshSettings, 'sabnzbd');
      console.log(`[AutoRefresh] SABnzbd response for ${release.clean_name}:`, JSON.stringify(result));
      return {
        success: true, 
        response: result,
        nzoId: result.nzoId || null  // Extract the NZO ID from SABnzbd response
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Poll SABnzbd API for download completion
   * Returns the path to the completed download folder (from the network-mounted path)
   */
  async pollForCompletionViaAPI(nzoId, release, settings) {
    if (!nzoId) {
      throw new Error('No NZO ID available for polling. Cannot track download progress.');
    }

    const pollIntervalMs = 10 * 1000; // Poll every 10 seconds (faster feedback)
    let pollCount = 0;

    // Get the completed downloads path from settings (refresh category folder)
    const completedPath = settings.refresh_completed_path;
    if (!completedPath) {
      throw new Error('Refresh Completed Folder Path not configured. Set refresh_completed_path in Settings > Refresh Category Setup.');
    }

    console.log(`[AutoRefresh] Poll settings: completedPath=${completedPath}, NZO=${nzoId}`);

    const sabClient = downloadDispatch.createClient(settings, 'sabnzbd');

    console.log(`[AutoRefresh] Polling SABnzbd API for NZO ${nzoId} completion...`);

    while (true) {
      pollCount++;

      try {
        // Query SABnzbd API for job status
        console.log(`[AutoRefresh] Poll ${pollCount}: Querying SABnzbd API for NZO ${nzoId}...`);
        const jobStatus = await sabClient.getJobStatus(nzoId);
        console.log(`[AutoRefresh] Poll ${pollCount}: jobStatus =`, JSON.stringify(jobStatus));

        if (!jobStatus) {
          // Job not found in queue or history - might have been deleted or already completed
          console.warn(`[AutoRefresh] Job ${nzoId} not found in SABnzbd queue or history`);
          await this.updateJobStatus(release.id, 'waiting_download', 20, `Job not found in SABnzbd - polling again...`);
        } else if (jobStatus.inQueue) {
          if (this.isTerminalSABQueueStatus(jobStatus)) {
            await this.deleteSABJob(sabClient, nzoId);
            const failureError = new Error(`SABnzbd download failed for: ${release.clean_name}. SABnzbd paused or stopped the job because it appears encrypted/password-protected and no password was available.`);
            failureError.isTerminalRefreshError = true;
            throw failureError;
          }

          // Still downloading
          const statusMsg = `Downloading: ${jobStatus.name} (${jobStatus.progress.toFixed(1)}%)`;
          await this.updateJobStatus(release.id, 'waiting_download', 20 + (jobStatus.progress * 0.4), statusMsg);
          console.log(`[AutoRefresh] Poll ${pollCount}: ${statusMsg}`);
        } else if (jobStatus.status === 'completed' || jobStatus.status === 'Completed') {
          // Download complete - get the path from SABnzbd
          const sabStoragePath = jobStatus.path;
          console.log(`[AutoRefresh] Download completed after ${pollCount} polls!`);
          console.log(`[AutoRefresh] SABnzbd storage path: ${sabStoragePath}`);

          // The files are on the remote SABnzbd machine
          // We need to access them via the network-mounted path
          // Try to find the folder in the mounted path
          const localPath = await this.resolveRemotePath(sabStoragePath, completedPath, release);
          
          if (localPath && fs.existsSync(localPath)) {
            console.log(`[AutoRefresh] Resolved to local path: ${localPath}`);
            return localPath;
          } else {
            // Fall back to looking for the release folder by name in completed path
            console.log(`[AutoRefresh] resolveRemotePath returned null, trying fallbacks...`);
            console.log(`[AutoRefresh] release.clean_name: ${release.clean_name}`);
            console.log(`[AutoRefresh] completedPath: ${completedPath}`);
            
            // Try exact match first
            const fallbackPath = path.join(completedPath, release.clean_name);
            if (fs.existsSync(fallbackPath)) {
              console.log(`[AutoRefresh] Found via exact fallback: ${fallbackPath}`);
              return fallbackPath;
            }
            
            // Try with common SABnzbd suffixes (.1, .2, etc.)
            for (let i = 1; i <= 5; i++) {
              const suffixedPath = `${fallbackPath}.${i}`;
              if (fs.existsSync(suffixedPath)) {
                console.log(`[AutoRefresh] Found via suffix: ${suffixedPath}`);
                return suffixedPath;
              }
            }
            
            // Try finding any folder containing the release name
            const foundPath = this.findFolderByName(completedPath, release.clean_name);
            if (foundPath) {
              console.log(`[AutoRefresh] Found by name search: ${foundPath}`);
              return foundPath;
            }
            
            // Last resort: return the first folder in completedPath
            const entries = fs.readdirSync(completedPath, { withFileTypes: true });
            const firstDir = entries.find(e => e.isDirectory());
            if (firstDir) {
              const firstDirPath = path.join(completedPath, firstDir.name);
              console.log(`[AutoRefresh] Using first available folder: ${firstDirPath}`);
              return firstDirPath;
            }
            
            throw new Error(`Completed download folder not found at: ${completedPath}`);
          }
        } else if (jobStatus.status === 'failed' || jobStatus.status === 'Failed') {
          const failMessage = jobStatus.failMessage ? ` ${jobStatus.failMessage}` : ' Check SABnzbd history for details.';
          const failureError = new Error(`SABnzbd download failed for: ${release.clean_name}.${failMessage}`);
          failureError.isTerminalRefreshError = true;
          throw failureError;
        } else {
          console.log(`[AutoRefresh] Poll ${pollCount}: Status=${jobStatus.status}, Progress=${jobStatus.progress}%`);
        }
      } catch (error) {
        if (error.isTerminalRefreshError) {
          throw error;
        }

        // Don't fail immediately on API errors - retry
        console.warn(`[AutoRefresh] Poll ${pollCount} error (retrying): ${error.message}`);
      }

      await this.sleep(pollIntervalMs);
    }
  }

  isTerminalSABQueueStatus(jobStatus) {
    const raw = jobStatus?.raw || {};
    const combined = [
      jobStatus?.status,
      jobStatus?.name,
      raw.status,
      raw.filename,
      raw.name,
      raw.fail_message,
      raw.fail_msg,
      raw.error,
      raw.status_details,
      raw.labels,
      raw.message
    ]
      .filter(value => value !== undefined && value !== null)
      .join(' ')
      .toLowerCase();

    const isPaused = /\b(paused|pause)\b/.test(combined);
    const mentionsPasswordProblem = /(encrypted|password|passwd|crc|unpack|repair failed|encrypted rar|requires a password)/i.test(combined);
    return isPaused && mentionsPasswordProblem;
  }

  async deleteSABJob(sabClient, nzoId) {
    try {
      await sabClient.deleteJob(nzoId);
      console.log(`[AutoRefresh] Deleted terminal SABnzbd job ${nzoId}`);
    } catch (error) {
      console.warn(`[AutoRefresh] Failed to delete terminal SABnzbd job ${nzoId}: ${error.message}`);
    }
  }

  /**
   * Resolve a SABnzbd storage path to a local network-mounted path
   */
  async resolveRemotePath(sabStoragePath, mountedPath, release) {
    if (!sabStoragePath) return null;

    // SABnzbd returns the full file path, e.g.:
    // /Volumes/MYBOOK/MEDIA-MyBook/temp/Sometimes A Great Notion (1970).../SOMETIMES_A_GREAT_NOTION/VIDEO_TS/VIDEO_TS.IFO
    // We need the TOP-LEVEL folder in the mountedPath (the SABnzbd-created folder)
    
    // Strategy: Find which folder in mountedPath contains the sabStoragePath
    const entries = fs.readdirSync(mountedPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidatePath = path.join(mountedPath, entry.name);
      // Check if sabStoragePath is within this folder
      if (sabStoragePath.startsWith(candidatePath)) {
        console.log(`[AutoRefresh] resolveRemotePath: Found top-level folder: ${entry.name}`);
        return candidatePath;
      }
    }

    // Fallback: Use the folder name that matches release.clean_name
    console.log(`[AutoRefresh] resolveRemotePath: No match found, returning null`);
    return null;
  }

  /**
   * Search for a folder by name within a directory tree
   */
  findFolderByName(rootPath, name) {
    if (!fs.existsSync(rootPath)) return null;

    // Clean the name for comparison
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      const entries = fs.readdirSync(rootPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const entryCleanName = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (entryCleanName === cleanName || entryCleanName.includes(cleanName) || cleanName.includes(entryCleanName)) {
            return path.join(rootPath, entry.name);
          }
        }
      }
    } catch (error) {
      console.error(`[AutoRefresh] Error searching for folder in ${rootPath}:`, error);
    }

    return null;
  }

  /**
   * Poll for download completion (legacy method, kept for reference)
   * @deprecated Use pollForCompletionViaAPI instead
   */
  async pollForCompletion(release, settings) {
    throw new Error('Deprecated: use pollForCompletionViaAPI instead');
  }

  /**
   * Run mediainfo on downloaded media folder/file (for metadata extraction only)
   */
  async runMediaInfoOnDownload(downloadPath, release, settings) {
    try {
      // Find a media file to analyze for metadata
      const mediaFile = this.findMainMediaFile(downloadPath);
      if (!mediaFile) {
        console.warn(`[AutoRefresh] No media file found for metadata in: ${downloadPath} (uploading folder anyway)`);
        return { mediaInfo: null, downloadPath };
      }

      console.log(`[AutoRefresh] Running mediainfo on: ${mediaFile}`);
      const mediaInfo = await releaseRefreshService.runMediaInfo(mediaFile);

      return {
        mediaFile,
        mediaInfo,
        downloadPath
      };
    } catch (error) {
      console.error(`[AutoRefresh] Error running mediainfo for ${release.clean_name}:`, error);
      return { mediaFile: null, mediaInfo: null, downloadPath };
    }
  }

  findMainMediaFile(rootPath) {
    if (!rootPath || !fs.existsSync(rootPath)) return null;

    const stats = fs.statSync(rootPath);
    if (stats.isFile() && this.isMediaFile(rootPath)) return rootPath;

    const mediaFiles = this.collectFilesRecursively(rootPath)
      .filter(filePath => this.isMediaFile(filePath))
      .map(filePath => ({
        path: filePath,
        size: fs.statSync(filePath).size
      }))
      .sort((a, b) => b.size - a.size);

    if (mediaFiles.length === 0) return null;
    return mediaFiles[0].path;
  }

  isMediaFile(filePath) {
    return /\.(mkv|mp4|avi|mov|wmv|ts|m2ts|mpg|mpeg|vob|iso)$/i.test(filePath);
  }

  collectFilesRecursively(rootPath) {
    if (!rootPath || !fs.existsSync(rootPath)) {
      return [];
    }

    const stats = fs.statSync(rootPath);
    if (stats.isFile()) {
      return [rootPath];
    }

    const files = [];
    const stack = [rootPath];

    while (stack.length > 0) {
      const currentPath = stack.pop();
      let entries = [];

      try {
        entries = fs.readdirSync(currentPath, { withFileTypes: true });
      } catch (error) {
        console.warn(`[AutoRefresh] Could not read refresh folder ${currentPath}: ${error.message}`);
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  async pruneRefreshDownloadToMainMediaFile(downloadPath, mainMediaFile, release) {
    if (!downloadPath || !fs.existsSync(downloadPath)) {
      return { skipped: true, reason: 'download path does not exist' };
    }

    if (!mainMediaFile || !fs.existsSync(mainMediaFile)) {
      return { skipped: true, reason: 'main media file was not found' };
    }

    const downloadStats = fs.statSync(downloadPath);
    if (downloadStats.isFile()) {
      return { skipped: true, reason: 'download path is already a single file' };
    }

    const mainResolved = path.resolve(mainMediaFile);
    const rootResolved = path.resolve(downloadPath);
    const relativeMain = path.relative(rootResolved, mainResolved);
    if (relativeMain.startsWith('..') || path.isAbsolute(relativeMain)) {
      return { skipped: true, reason: 'main media file is outside the download folder' };
    }

    const allFiles = this.collectFilesRecursively(downloadPath);
    const mediaFiles = allFiles
      .filter(filePath => this.isMediaFile(filePath))
      .map(filePath => ({
        path: filePath,
        size: fs.statSync(filePath).size
      }))
      .sort((a, b) => b.size - a.size);

    const largest = mediaFiles[0];
    const secondLargest = mediaFiles[1] || null;
    if (!largest || path.resolve(largest.path) !== mainResolved) {
      return { skipped: true, reason: 'main media file is not the largest video file' };
    }

    if (secondLargest && secondLargest.size > Math.max(100 * 1024 * 1024, largest.size * 0.25)) {
      return { skipped: true, reason: 'multiple large video files were found' };
    }

    let removedFiles = 0;
    let removedBytes = 0;

    for (const filePath of allFiles) {
      if (path.resolve(filePath) === mainResolved) {
        continue;
      }

      try {
        const stats = fs.statSync(filePath);
        fs.unlinkSync(filePath);
        removedFiles += 1;
        removedBytes += stats.size;
      } catch (error) {
        console.warn(`[AutoRefresh] Could not remove side file from refresh folder for release ${release.id}: ${filePath} (${error.message})`);
      }
    }

    this.removeEmptyDirectories(downloadPath);

    return {
      skipped: false,
      removedFiles,
      removedBytes,
      keptFile: mainMediaFile
    };
  }

  removeEmptyDirectories(rootPath) {
    if (!rootPath || !fs.existsSync(rootPath)) return;

    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        this.removeEmptyDirectories(fullPath);
      }
    }

    if (path.resolve(rootPath) === path.parse(path.resolve(rootPath)).root) {
      return;
    }

    try {
      const remaining = fs.readdirSync(rootPath);
      if (remaining.length === 0) {
        fs.rmdirSync(rootPath);
      }
    } catch (error) {
      console.warn(`[AutoRefresh] Could not remove empty refresh folder ${rootPath}: ${error.message}`);
    }
  }

  /**
   * Update release metadata in the database — overwrites existing with real mediainfo data
   */
  async updateReleaseMetadata(release, mediaInfoData) {
    const info = mediaInfoData?.mediaInfo || mediaInfoData;
    if (!info) {
      console.log('[AutoRefresh] No mediainfo data to update');
      return;
    }

    try {
      db.run(`
        UPDATE releases SET
          size = ?,
          resolution = ?,
          video_codec = ?,
          audio_codec = ?,
          audio_channels = ?,
          format = ?,
          bit_depth = ?,
          hdr_format = ?,
          frame_rate = ?,
          audio_bitrate = ?,
          audio_sample_rate = ?,
          aspect_ratio = ?,
          overall_bitrate = ?,
          video_bitrate = ?,
          video_profile = ?,
          scan_type = ?,
          chroma_subsampling = ?,
          duration_ms = ?,
          color_primaries = ?,
          subtitles = ?,
          mediainfo_raw = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        info.fileSize || release.size,
        info.resolution || release.resolution,
        info.videoCodec || release.video_codec,
        info.audioCodec || release.audio_codec,
        info.audioChannels || release.audio_channels,
        info.format || release.format,
        info.bitDepth || null,
        info.hdrFormat || null,
        info.frameRate || null,
        info.audioBitrate || null,
        info.audioSampleRate || null,
        info.aspectRatio || null,
        info.overallBitrate || null,
        info.videoBitrate || null,
        info.videoProfile || null,
        info.scanType || null,
        info.chromaSubsampling || null,
        info.durationMs || null,
        info.colorPrimaries || null,
        info.subtitles || release.subtitles,
        info.mediainfoRaw || release.mediainfoRaw,
        release.id
      ]);

      console.log(`[AutoRefresh] Updated metadata for release ${release.id}: resolution=${info.resolution}, codec=${info.videoCodec}, profile=${info.videoProfile}, audio=${info.audioCodec} ${info.audioChannels}, format=${info.format}, hdr=${info.hdrFormat}, bit_depth=${info.bitDepth}, frame_rate=${info.frameRate}, scan=${info.scanType}`);
    } catch (error) {
      console.error(`[AutoRefresh] Error updating metadata for release ${release.id}:`, error);
    }
  }

  /**
   * Update job status and send progress event
   */
  async updateJobStatus(jobId, status, progress, message) {
    const job = this.activeRefreshJobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.message = message;
    }

    // Send progress to renderer if available
    this.sendNotification('auto-refresh-progress', {
      releaseId: jobId,
      status,
      progress,
      message
    });

    console.log(`[AutoRefresh] Job ${jobId}: [${status}] ${progress}% - ${message}`);
  }

  /**
   * Send notification to renderer process
   */
  sendNotification(channel, data) {
    // This will be wired up via mainWindow.webContents.send in main.js
    if (global.mainWindow) {
      global.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanupFailedRefresh(release, error) {
    const cleanupResult = {
      markedDeletePending: false,
      cleanupError: null
    };

    const message = error?.message || '';
    const shouldDeleteRelease = /SABnzbd download failed/i.test(message);

    if (!shouldDeleteRelease) {
      return cleanupResult;
    }

    try {
      await releaseRepository.delete(release.id);
      cleanupResult.markedDeletePending = true;
      console.log(`[AutoRefresh] Deleted release ${release.id} and NZB after terminal SABnzbd failure`);
    } catch (cleanupError) {
      cleanupResult.cleanupError = cleanupError.message;
      console.error(`[AutoRefresh] Failed to delete release ${release.id} during cleanup:`, cleanupError);
    }

    return cleanupResult;
  }

  async cleanupSuccessfulRefreshDownload(downloadPath, release, settings = {}) {
    if (!downloadPath || !(await this.pathExists(downloadPath))) {
      return;
    }

    const cleanupAction = String(settings.refresh_cleanup_action || 'delete').toLowerCase();
    if (cleanupAction === 'move') {
      const movePath = String(settings.refresh_cleanup_move_path || '').trim();
      if (!movePath) {
        console.warn(`[AutoRefresh] Refresh cleanup is set to move, but no destination is configured. Keeping completed download for release ${release.id}: ${downloadPath}`);
        return;
      }

      try {
        const destination = await this.moveSuccessfulRefreshDownload(downloadPath, movePath);
        console.log(`[AutoRefresh] Moved completed refresh download for release ${release.id}: ${downloadPath} -> ${destination}`);
      } catch (error) {
        console.error(`[AutoRefresh] Failed to move completed refresh download for release ${release.id}:`, error);
      }
      return;
    }

    try {
      const stats = await fsp.stat(downloadPath);
      if (stats.isDirectory()) {
        await fsp.rm(downloadPath, { recursive: true, force: true });
        console.log(`[AutoRefresh] Deleted completed refresh folder for release ${release.id}: ${downloadPath}`);
      } else {
        await fsp.unlink(downloadPath);
        console.log(`[AutoRefresh] Deleted completed refresh file for release ${release.id}: ${downloadPath}`);
      }
    } catch (error) {
      console.error(`[AutoRefresh] Failed to clean completed refresh download for release ${release.id}:`, error);
    }
  }

  async moveSuccessfulRefreshDownload(downloadPath, destinationRoot) {
    const sourcePath = path.resolve(downloadPath);
    const targetRoot = path.resolve(destinationRoot);

    if (targetRoot === sourcePath || targetRoot.startsWith(`${sourcePath}${path.sep}`)) {
      throw new Error('Move destination cannot be inside the completed refresh download itself');
    }

    await fsp.mkdir(targetRoot, { recursive: true });

    const baseName = path.basename(sourcePath);
    let destination = path.join(targetRoot, baseName);
    destination = await this.getUniqueMoveDestination(destination);

    try {
      await fsp.rename(sourcePath, destination);
    } catch (error) {
      if (error.code !== 'EXDEV') {
        throw error;
      }

      const stats = await fsp.stat(sourcePath);
      if (stats.isDirectory()) {
        await fsp.cp(sourcePath, destination, { recursive: true, force: false });
        await fsp.rm(sourcePath, { recursive: true, force: true });
      } else {
        await fsp.copyFile(sourcePath, destination);
        await fsp.unlink(sourcePath);
      }
    }

    return destination;
  }

  async getUniqueMoveDestination(destination) {
    if (!(await this.pathExists(destination))) {
      return destination;
    }

    const dir = path.dirname(destination);
    const ext = path.extname(destination);
    const name = path.basename(destination, ext);

    let counter = 1;
    let candidate = destination;
    do {
      candidate = path.join(dir, `${name}-${counter}${ext}`);
      counter += 1;
    } while (await this.pathExists(candidate));

    return candidate;
  }

  async pathExists(targetPath) {
    try {
      await fsp.access(targetPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  /**
   * Upload content to Usenet and generate new NZB (via ngPost CLI)
   */
  async uploadContentAndGenerateNZB(release, mediaFile, settings, mode = 'keep_both', filenameMeta = null) {
    try {
      console.log(`[AutoRefresh] Starting ngPost upload for: ${release.clean_name} (mode: ${mode})`);
      console.log(`[AutoRefresh] Upload path: ${mediaFile}`);
      console.log(`[AutoRefresh] Path exists: ${require('fs').existsSync(mediaFile)}`);

      const result = await ngPostUploader.uploadFileToUsenet({
        release,
        filePath: mediaFile,
        settings,
        mode,
        filenameMeta
      }, (progress) => {
        this.updateJobStatus(release.id, progress.step, progress.progress, progress.message);
      });

      return result;
    } catch (error) {
      console.error(`[AutoRefresh] Upload failed for release ${release.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current job statuses
   */
  getActiveJobs() {
    return Array.from(this.activeRefreshJobs.entries())
      .filter(([, job]) => !this.isTerminalJobStatus(job.status))
      .map(([id, job]) => ({
        releaseId: id,
        releaseName: job.release.clean_name,
        status: job.status,
        progress: job.progress,
        message: job.message,
        startedAt: job.startedAt,
        error: job.error
      }));
  }

  getQueuedRefreshes(limit = 100) {
    return db.all(`
      SELECT id, search_name, clean_name, media_type, refresh_status, last_refresh_at, last_refresh_error
      FROM releases
      WHERE refresh_status = 'queued'
      ORDER BY id ASC
      LIMIT ?
    `, [limit]);
  }

  getQueuedRefreshCount() {
    const row = db.get(`
      SELECT COUNT(*) AS count
      FROM releases
      WHERE refresh_status = 'queued'
    `);
    return row?.count || 0;
  }

  markReleaseForRefreshQueue(releaseId) {
    const release = db.get('SELECT * FROM releases WHERE id = ?', [releaseId]);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    if (!release.nzb_file_path) {
      throw new Error(`Release has no NZB file: ${release.clean_name || release.search_name || releaseId}`);
    }

    db.run(`
      UPDATE releases
      SET refresh_status = 'queued',
          last_refresh_error = NULL
      WHERE id = ?
    `, [releaseId]);

    return release;
  }

  startQueuedRefreshes(settings = null) {
    if (this.shutdownRequested) {
      return { success: false, error: 'NZBarr is shutting down' };
    }

    if (this.isProcessingRefreshQueue) {
      return {
        success: true,
        alreadyRunning: true,
        queuedCount: this.getQueuedRefreshCount(),
        message: 'Refresh queue is already running.'
      };
    }

    this.processQueuedRefreshes(settings).catch((error) => {
      console.error('[AutoRefresh] Refresh queue worker failed:', error);
    });

    return {
      success: true,
      started: true,
      queuedCount: this.getQueuedRefreshCount()
    };
  }

  async processQueuedRefreshes(settings = null) {
    if (this.isProcessingRefreshQueue) {
      return { success: true, alreadyRunning: true };
    }

    this.isProcessingRefreshQueue = true;
    let processed = 0;

    try {
      const allSettings = settings || await settingsRepository.getAll();

      while (!this.shutdownRequested) {
        const queuedRelease = db.get(`
          SELECT *
          FROM releases
          WHERE refresh_status = 'queued'
            AND nzb_file_path IS NOT NULL
            AND nzb_file_path != ''
          ORDER BY id ASC
          LIMIT 1
        `);

        if (!queuedRelease) {
          break;
        }

        const activeJob = Array.from(this.activeRefreshJobs.values())
          .find(job => !this.isTerminalJobStatus(job.status));

        if (activeJob) {
          await this.sleep(5000);
          continue;
        }

        console.log(`[AutoRefresh] Running queued refresh for: ${queuedRelease.clean_name || queuedRelease.search_name}`);
        const result = await this.queueReleaseForRefresh(queuedRelease, allSettings);

        if (result?.alreadyRunning) {
          await this.sleep(5000);
          continue;
        }

        processed += 1;
      }

      return { success: true, processed, remaining: this.getQueuedRefreshCount() };
    } finally {
      this.isProcessingRefreshQueue = false;
    }
  }

  async queueManualRefresh(releaseId, settings = null) {
    const release = this.markReleaseForRefreshQueue(releaseId);
    const allSettings = settings || await settingsRepository.getAll();
    const queueResult = this.startQueuedRefreshes(allSettings);

    return {
      success: true,
      queued: true,
      releaseId: release.id,
      releaseName: release.clean_name || release.search_name,
      queueStarted: Boolean(queueResult.started),
      alreadyRunning: Boolean(queueResult.alreadyRunning),
      queuedCount: queueResult.queuedCount
    };
  }

  async queueManualRefreshBatch(releaseIds, settings = null) {
    const ids = Array.isArray(releaseIds)
      ? releaseIds.map(id => parseInt(id, 10)).filter(Number.isFinite)
      : [];

    if (ids.length === 0) {
      return { success: false, error: 'No releases selected' };
    }

    const errors = [];
    let queued = 0;

    for (const releaseId of ids) {
      try {
        this.markReleaseForRefreshQueue(releaseId);
        queued += 1;
      } catch (error) {
        errors.push({ releaseId, error: error.message });
      }
    }

    const allSettings = settings || await settingsRepository.getAll();
    const queueResult = queued > 0 ? this.startQueuedRefreshes(allSettings) : null;

    return {
      success: queued > 0,
      queued,
      errors,
      queueStarted: Boolean(queueResult?.started),
      alreadyRunning: Boolean(queueResult?.alreadyRunning),
      queuedCount: queueResult?.queuedCount || this.getQueuedRefreshCount(),
      error: queued === 0 ? 'No releases could be queued' : null
    };
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualRefresh(releaseId, settings = null) {
    const release = db.get('SELECT * FROM releases WHERE id = ?', [releaseId]);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    const allSettings = settings || await settingsRepository.getAll();
    return await this.queueReleaseForRefresh(release, allSettings);
  }
}

// Export singleton instance
module.exports = new AutoRefreshScheduler();
