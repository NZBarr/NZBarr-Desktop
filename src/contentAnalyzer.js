// NZBarr Desktop - Content Analyzer (Full Implementation)
const { exec, execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const fs = require('fs');
const path = require('path');
const appPaths = require('./appPaths');
const nzbFileUtils = require('./nzbFileUtils');
const nntpClient = require('./nntpClient');
const filenameParser = require('./filenameParser');

class ContentAnalyzer {
  constructor() {
    this.mediainfoPath = this.resolveBinaryPath(
      ['mediainfo'],
      [
        '/opt/homebrew/bin/mediainfo',
        '/usr/local/bin/mediainfo',
        '/usr/bin/mediainfo'
      ]
    );
    this.unrarPath = this.resolveBinaryPath(
      ['unrar'],
      [
        '/opt/homebrew/bin/unrar',
        '/usr/local/bin/unrar',
        '/usr/bin/unrar',
        'C:\\Program Files\\WinRAR\\UnRAR.exe',
        'C:\\Program Files (x86)\\WinRAR\\UnRAR.exe'
      ]
    );
    this.unzipPath = this.resolveBinaryPath(
      ['unzip'],
      [
        '/usr/bin/unzip',
        '/opt/homebrew/bin/unzip',
        '/usr/local/bin/unzip'
      ]
    );
    this.sevenZipPath = this.resolveBinaryPath(
      ['7z', '7za', '7zr'],
      [
        '/opt/homebrew/bin/7z',
        '/usr/local/bin/7z',
        '/usr/bin/7z',
        'C:\\Program Files\\7-Zip\\7z.exe',
        'C:\\Program Files (x86)\\7-Zip\\7z.exe'
      ]
    );
    this.tempDir = path.join(appPaths.getTempDir(), 'analysis');
  }

  /**
   * Initialize temp directory
   */
  init() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clean up all temp files
   */
  createWorkspaceDir() {
    const workspaceDir = path.join(
      this.tempDir,
      `run-${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2, 8)}`
    );
    fs.mkdirSync(workspaceDir, { recursive: true });
    return workspaceDir;
  }

  /**
   * Clean up a workspace tree
   */
  cleanup(workspaceDir = null) {
    const targetDir = workspaceDir || this.tempDir;
    if (fs.existsSync(targetDir)) {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  /**
   * Full content analysis for a release
  */
  async analyzeRelease(nzbFilePath, nzbData, settings, onProgress) {
    this.init();
    const workspaceDir = this.createWorkspaceDir();
    const sampleDownloadLimitBytes = this.getSampleDownloadLimitBytes(settings?.reanalyze_download_mb);
    const preferredArchivePassword = (settings?.release_password || '').trim() || null;
    
    const result = {
      password: null,
      nfoText: null,
      mediainfoRaw: null,
      resolution: null,
      videoCodec: null,
      audioCodec: null,
      audioChannels: null,
      format: null,
      subtitles: null
    };

    try {
      // Step 1: Extract password from NZB XML
      result.password = this.extractPasswordFromNZB(nzbFilePath);

      // Step 2: Connect to NNTP
      await nntpClient.connect({
        server: settings.nntp_server,
        port: parseInt(settings.nntp_port),
        username: settings.nntp_username,
        password: settings.nntp_password,
        ssl: settings.nntp_ssl === '1'
      });

      // Step 3: Try to find and download NFO file
      console.log('  Searching for NFO file...');
      result.nfoText = await this.extractNFO(nzbData, onProgress);

      // Step 4: Find video/audio/ebook file and analyze
      console.log('  Analyzing content...');
      const mediaType = this.detectMediaType(nzbData);
      
      if (mediaType === 'video') {
        await this.analyzeVideo(nzbData, result, onProgress, sampleDownloadLimitBytes, preferredArchivePassword, settings, workspaceDir);
      } else if (mediaType === 'audio') {
        await this.analyzeAudio(nzbData, result, onProgress, sampleDownloadLimitBytes, preferredArchivePassword, settings, workspaceDir);
      } else if (mediaType === 'ebook') {
        await this.analyzeEbook(nzbData, result, onProgress);
      } else if (mediaType === 'game') {
        await this.analyzeGame(nzbData, result, onProgress);
      }

      // Step 5: Check for password protection if no password found
      if (!result.password && mediaType !== 'ebook') {
        result.password = await this.checkPasswordProtection(nzbData, workspaceDir);
      }

      this.applyFilenameFallback(result, nzbFilePath);

      nntpClient.disconnect();

      console.log(`  ✓ Analysis complete`);
      console.log(`    Resolution: ${result.resolution || 'N/A'}`);
      console.log(`    Video: ${result.videoCodec || 'N/A'}`);
      console.log(`    Audio: ${result.audioCodec || 'N/A'} ${result.audioChannels || ''}`);
      console.log(`    Password: ${result.password || 'None'}`);
      console.log(`    NFO: ${result.nfoText ? 'Found' : 'Not found'}`);

    } catch (error) {
      console.error(`  Analysis error: ${error.message}`);
      try { nntpClient.disconnect(); } catch (e) {}
    } finally {
      // Clean up only this run's workspace
      this.cleanup(workspaceDir);
    }

    return result;
  }

  /**
   * Detect media type from NZB files
   */
  detectMediaType(nzbData) {
    const files = Array.isArray(nzbData.files) ? nzbData.files : [];

    // Check for video files
    if (files.some(f => this.isVideoTaggedFile(f))) {
      return 'video';
    }
    
    // Check for archive files
    if (files.some(f => this.isArchiveTaggedFile(f))) {
      // Archives usually contain video
      return 'video';
    }
    
    // Check for audio files
    if (files.some(f => this.isAudioTaggedFile(f))) {
      return 'audio';
    }
    
    // Check for ebook files
    if (files.some(f => /\.(epub|mobi|azw3|pdf|cbz|cbr|fb2)$/i.test(this.getFileSearchText(f)))) {
      return 'ebook';
    }
    
    // Check for game/software
    if (files.some(f => /\.(iso|dmg|exe|msi|app|pkg)$/i.test(this.getFileSearchText(f)))) {
      return 'game';
    }
    
    // Default to video
    return 'video';
  }

  /**
   * Extract NFO file from Usenet
   */
  async extractNFO(nzbData, onProgress) {
    try {
      // Find .nfo files in NZB
      const nfoFiles = nzbData.files.filter(f => {
        const name = (f.name || f.$.subject || '').toLowerCase();
        return name.endsWith('.nfo');
      });

      if (nfoFiles.length === 0) {
        console.log('  No NFO files found in NZB');
        return null;
      }

      console.log(`  Found ${nfoFiles.length} NFO file(s)`);

      // Download first NFO file
      const nfoFile = nfoFiles[0];
      const segments = nfoFile.segments;
      
      const downloaded = [];
      for (const segment of segments) {
        try {
          const data = await nntpClient.fetchArticle(segment.messageId);
          if (data) {
            downloaded.push(data);
          }
        } catch (error) {
          console.log(`  ⚠ Failed to download NFO segment: ${error.message}`);
        }
      }

      if (downloaded.length > 0) {
        let nfoText = Buffer.concat(downloaded).toString('utf8');
        
        // Convert CP437 (DOS) to UTF-8
        try {
          const iconv = require('iconv-lite');
          nfoText = iconv.decode(Buffer.from(nfoText, 'binary'), 'cp437');
        } catch (e) {
          // Keep as-is if iconv-lite not available
        }
        
        // Clean up control characters but preserve formatting
        nfoText = nfoText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        
        console.log(`  ✓ NFO extracted (${nfoText.length} chars)`);
        return nfoText;
      }
    } catch (error) {
      console.log(`  ⚠ NFO extraction failed: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Analyze video content (direct or from archive)
   */
  async analyzeVideo(nzbData, result, onProgress, sampleDownloadLimitBytes = null, preferredArchivePassword = null, settings = null, workspaceDir = null) {
    try {
      // Find video or archive files
      const videoFiles = this.findFiles(nzbData, (file) => this.isVideoTaggedFile(file));
      const archiveFiles = this.findFiles(nzbData, (file) => this.isArchiveTaggedFile(file));

      if (videoFiles.length > 0) {
        // Direct video file - download and analyze
        console.log(`  Found ${videoFiles.length} direct video file(s)`);
        const selectedVideoFile = this.findPrimaryContentFile(nzbData) || videoFiles[0];

        if (selectedVideoFile) {
          console.log(`  Selected video file: ${selectedVideoFile.name || selectedVideoFile.subject || 'unknown'} (${this.getFileSegmentCount(selectedVideoFile)} segments)`);
          await this.analyzeFileFromUsenet(selectedVideoFile, 'video', result, onProgress, sampleDownloadLimitBytes, settings, workspaceDir);
        }
      } else if (archiveFiles.length > 0) {
        // Archive - download, extract, analyze first video inside
        console.log(`  Found ${archiveFiles.length} archive file(s)`);
        await this.analyzeArchive(archiveFiles, result, onProgress, sampleDownloadLimitBytes, preferredArchivePassword, settings, workspaceDir);
      } else {
        const fallbackFile = this.findLargestFile(nzbData);
        if (fallbackFile) {
          console.log(`  No explicit video/archive tags found, falling back to largest file`);
          await this.analyzeFileFromUsenet(fallbackFile, 'video', result, onProgress, sampleDownloadLimitBytes, settings, workspaceDir);
        }
      }
    } catch (error) {
      console.log(`  ⚠ Video analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze audio files
   */
  async analyzeAudio(nzbData, result, onProgress, sampleDownloadLimitBytes = null, preferredArchivePassword = null, settings = null, workspaceDir = null) {
    try {
      const audioFiles = this.findFiles(nzbData, (file) => this.isAudioTaggedFile(file));
      if (audioFiles.length > 0) {
        const selectedAudioFile = this.findPrimaryContentFile(nzbData) || audioFiles[0];

        if (selectedAudioFile) {
          console.log(`  Selected audio file: ${selectedAudioFile.name || selectedAudioFile.subject || 'unknown'} (${this.getFileSegmentCount(selectedAudioFile)} segments)`);
          await this.analyzeFileFromUsenet(selectedAudioFile, 'audio', result, onProgress, sampleDownloadLimitBytes, settings, workspaceDir);
        }
      } else {
        const fallbackFile = this.findLargestFile(nzbData);
        if (fallbackFile) {
          console.log(`  No explicit audio tags found, falling back to largest file`);
          await this.analyzeFileFromUsenet(fallbackFile, 'audio', result, onProgress, sampleDownloadLimitBytes, settings, workspaceDir);
        }
      }
    } catch (error) {
      console.log(`  ⚠ Audio analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze ebook files
   */
  async analyzeEbook(nzbData, result, onProgress) {
    try {
      const ebookFiles = this.findFiles(nzbData, (file) => /\.(epub|mobi|azw3|pdf|cbz|cbr)$/i.test(this.getFileSearchText(file)));
      if (ebookFiles.length > 0) {
        result.format = path.extname(ebookFiles[0].name).toUpperCase().substring(1);
        // Basic info only - no MediaInfo for ebooks
      }
    } catch (error) {
      console.log(`  ⚠ Ebook analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze game/software files
   */
  async analyzeGame(nzbData, result, onProgress) {
    try {
      const gameFiles = this.findFiles(nzbData, (file) => /\.(iso|dmg|exe|msi)$/i.test(this.getFileSearchText(file)));
      if (gameFiles.length > 0) {
        result.format = path.extname(gameFiles[0].name).toUpperCase().substring(1);
      }
    } catch (error) {
      console.log(`  ⚠ Game analysis failed: ${error.message}`);
    }
  }

  /**
   * Download and analyze a single file from Usenet (SAMPLE ONLY - ~10-50MB)
   */
  async analyzeFileFromUsenet(fileEntry, type, result, onProgress, sampleDownloadLimitBytes = null, settings = null, workspaceDir = null) {
    // Download only enough segments to hit the configured sample cap.
    // MediaInfo usually only needs the beginning of the file to extract metadata.
    const segmentsToDownload = this.selectSampleSegments(
      fileEntry.segments,
      sampleDownloadLimitBytes,
      10
    );
    
    const tempPath = path.join(workspaceDir || this.tempDir, `${Date.now()}-sample`);
    
    console.log(`  Downloading sample (${segmentsToDownload.length}/${fileEntry.segments.length} segments)...`);
    
    await this.downloadSegmentsWithConnections(segmentsToDownload, tempPath, onProgress, 'sample', settings, 40);
    
    if (fs.existsSync(tempPath)) {
      const size = fs.statSync(tempPath).size;
      console.log(`  Sample size: ${(size / 1024 / 1024).toFixed(1)} MB`);
      
      if (type === 'video') {
        await this.runMediaInfo(tempPath, result);
      } else if (type === 'audio') {
        await this.runMediaInfo(tempPath, result);
      }
    }
  }

  /**
   * Download archive sample, detect type/password (SAMPLE ONLY - ~5MB)
   */
  async analyzeArchive(archiveFiles, result, onProgress, sampleDownloadLimitBytes = null, preferredArchivePassword = null, settings = null, workspaceDir = null) {
    const orderedArchiveFiles = this.sortArchiveFiles(archiveFiles);
    const selectedArchiveFiles = [];
    let downloadedBytes = 0;
    const limitBytes = Number(sampleDownloadLimitBytes);
    const effectiveLimitBytes = Number.isFinite(limitBytes) && limitBytes > 0 ? limitBytes : null;

    for (const file of orderedArchiveFiles) {
      if (!file) continue;
      const fileBytes = this.getFileSegmentBytes(file);
      if (effectiveLimitBytes && selectedArchiveFiles.length > 0 && (downloadedBytes + fileBytes) > effectiveLimitBytes) {
        break;
      }
      selectedArchiveFiles.push(file);
      downloadedBytes += fileBytes;
      if (effectiveLimitBytes && downloadedBytes >= effectiveLimitBytes) {
        break;
      }
    }

    if (selectedArchiveFiles.length === 0 && orderedArchiveFiles.length > 0) {
      // Always download at least the first volume so we have a chance to extract.
      selectedArchiveFiles.push(orderedArchiveFiles[0]);
      downloadedBytes = this.getFileSegmentBytes(orderedArchiveFiles[0]);
    }

    if (selectedArchiveFiles.length === 0) return;

    console.log(`  Downloading archive set (${selectedArchiveFiles.length}/${orderedArchiveFiles.length} volume(s), ${this.formatBytes(downloadedBytes)} planned)...`);

    const archiveDir = path.join(workspaceDir || this.tempDir, `archive-sample-${Date.now()}`);
    fs.mkdirSync(archiveDir, { recursive: true });

    let firstArchivePath = null;
    let actualDownloadedBytes = 0;

    for (let i = 0; i < selectedArchiveFiles.length; i++) {
      const archiveFile = selectedArchiveFiles[i];
      const archiveName = this.getArchiveOutputName(archiveFile, i);
      const archivePath = path.join(archiveDir, archiveName);
      if (!firstArchivePath) firstArchivePath = archivePath;

      const fileBytes = this.getFileSegmentBytes(archiveFile);
      console.log(`  Downloading archive volume ${i + 1}/${selectedArchiveFiles.length}: ${archiveName} (${this.formatBytes(fileBytes)})`);

      await this.downloadSegmentsWithConnections(archiveFile.segments, archivePath, onProgress, 'archive_sample', settings, 40);

      if (fs.existsSync(archivePath)) {
        actualDownloadedBytes += fs.statSync(archivePath).size;
      }
    }

    if (!firstArchivePath || !fs.existsSync(firstArchivePath)) return;

    // Check file signature. Some releases are .7z/.zip even when the sample filename
    // is just the generated temp name, so we also fall back to the NZB file extension.
    const header = fs.readFileSync(firstArchivePath);
    const archiveType = this.detectArchiveType(header, selectedArchiveFiles[0]);

    if (!archiveType) {
      console.log('  Sample is not a recognized archive');
      return;
    }

    console.log(`  Archive detected: ${archiveType.toUpperCase()}`);
    console.log(`  Archive sample size: ${this.formatBytes(actualDownloadedBytes)}`);

    // Prefer the password stored on the release record, then fall back to NZB metadata.
    result.password = preferredArchivePassword || result.password;
    if (!result.password) {
      result.password = await this.checkArchivePassword(archivePath, result.password);
    }
    console.log(`  Password: ${result.password || 'None detected'}`);

    // Try to extract contents and analyze video
    const extractDir = path.join(archiveDir, 'extracted');
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      console.log(`  Extracting archive sample...`);
      if (archiveType === 'rar') {
        if (this.unrarPath) {
          const args = ['x', '-y', '-o+'];
          args.push(result.password ? `-p${result.password}` : '-p-');
          args.push(firstArchivePath, `${extractDir}/`);
          await execFileAsync(this.unrarPath, args, { timeout: 60000 });
        } else if (this.sevenZipPath) {
          const args = ['x', '-y'];
          if (result.password) args.push(`-p${result.password}`);
          args.push(`-o${extractDir}`, firstArchivePath);
          await execFileAsync(this.sevenZipPath, args, { timeout: 60000 });
        }
      } else if (archiveType === 'zip') {
        if (this.unzipPath && path.basename(this.unzipPath).toLowerCase().includes('unzip')) {
          const args = result.password ? ['-P', result.password, '-o', firstArchivePath, '-d', extractDir] : ['-o', firstArchivePath, '-d', extractDir];
          await execFileAsync(this.unzipPath, args, { timeout: 60000 });
        } else if (this.sevenZipPath) {
          const args = ['x', '-y'];
          if (result.password) args.push(`-p${result.password}`);
          args.push(`-o${extractDir}`, firstArchivePath);
          await execFileAsync(this.sevenZipPath, args, { timeout: 60000 });
        }
      } else if (archiveType === '7z' && this.sevenZipPath) {
        const args = ['x', '-y'];
        if (result.password) args.push(`-p${result.password}`);
        args.push(`-o${extractDir}`, firstArchivePath);
        await execFileAsync(this.sevenZipPath, args, { timeout: 60000 });
      } else {
        console.log(`  ⚠ No extractor configured for ${archiveType.toUpperCase()} archives`);
      }
    } catch (error) {
      console.log(`  ⚠ Extraction note: ${error.message}`);
    }

    // Find video files in extracted contents (even partial files)
    const videoFiles = this.findExtractedVideos(extractDir);
    if (videoFiles.length > 0) {
      console.log(`  Found ${videoFiles.length} video file(s) in archive sample`);
      const selectedVideoFile = [...videoFiles].sort((a, b) => {
        const sizeA = this.getFileSizeSafe(a);
        const sizeB = this.getFileSizeSafe(b);
        return sizeB - sizeA;
      })[0];
      console.log(`  Selected extracted video: ${path.basename(selectedVideoFile)} (${this.formatBytes(this.getFileSizeSafe(selectedVideoFile))})`);
      await this.runMediaInfo(selectedVideoFile, result);
    } else {
      console.log(`  No video files found in extracted sample`);
    }
  }

  sortArchiveFiles(archiveFiles) {
    return [...(Array.isArray(archiveFiles) ? archiveFiles : [])].sort((a, b) => {
      const orderA = this.getArchiveVolumeOrder(a);
      const orderB = this.getArchiveVolumeOrder(b);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const countA = this.getFileSegmentCount(a);
      const countB = this.getFileSegmentCount(b);
      if (countB !== countA) return countB - countA;
      return this.getFileSegmentBytes(b) - this.getFileSegmentBytes(a);
    });
  }

  getArchiveVolumeOrder(file) {
    const text = this.getFileSearchText(file);
    const patterns = [
      /(?:^|[._\-\s])part\s*0*(\d+)(?:[._\-\s]|$)/i,
      /(?:^|[._\-\s])vol(?:ume)?\s*0*(\d+)(?:[._\-\s]|$)/i,
      /(?:^|[._\-\s])v\s*0*(\d+)(?:[._\-\s]|$)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1], 10) || 0;
      }
    }

    return 0;
  }

  getArchiveOutputName(file, index) {
    const raw = String(file?.name || file?.subject || `archive-${index + 1}.rar`);
    const name = raw.trim().replace(/[<>:"/\\|?*]+/g, '_');
    return path.basename(name) || `archive-${index + 1}.rar`;
  }

  formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 * 1024) {
      return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }
    if (value >= 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${value} B`;
  }

  /**
   * Detect archive type from file signature or filename.
   */
  detectArchiveType(buffer, archiveFile = null) {
    if (!buffer || buffer.length < 4) {
      return this.detectArchiveTypeFromName(archiveFile);
    }

    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x61 &&
      buffer[2] === 0x72 &&
      buffer[3] === 0x21
    ) {
      return 'rar';
    }

    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return 'zip';
    }

    if (
      buffer[0] === 0x37 &&
      buffer[1] === 0x7A &&
      buffer[2] === 0xBC &&
      buffer[3] === 0xAF &&
      buffer[4] === 0x27 &&
      buffer[5] === 0x1C
    ) {
      return '7z';
    }

    return this.detectArchiveTypeFromName(archiveFile);
  }

  detectArchiveTypeFromName(archiveFile = null) {
    const name = (archiveFile?.name || archiveFile?.subject || '').toLowerCase();
    if (/\.rar$/i.test(name)) return 'rar';
    if (/\.zip$/i.test(name)) return 'zip';
    if (/\.7z$/i.test(name)) return '7z';
    return null;
  }

  resolveBinaryPath(commandNames, absoluteCandidates) {
    const candidates = [
      ...(absoluteCandidates || []),
      ...(commandNames || [])
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (path.isAbsolute(candidate) && fs.existsSync(candidate)) {
        return candidate;
      }

      const resolved = this.findCommandOnPath(candidate);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  findCommandOnPath(command) {
    if (!command || path.isAbsolute(command)) {
      return null;
    }

    try {
      const locator = process.platform === 'win32' ? 'where' : 'which';
      const output = execFileSync(locator, [command], { encoding: 'utf8' });
      const resolved = output.split(/\r?\n/).find(Boolean);
      return resolved ? resolved.trim() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert a MB cap into bytes.
   */
  getSampleDownloadLimitBytes(sampleDownloadMb) {
    const parsed = Number(sampleDownloadMb);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return Math.max(1, Math.round(parsed * 1024 * 1024));
  }

  /**
   * Select a prefix of segments whose cumulative size stays near the cap.
   */
  selectSampleSegments(segments, sampleDownloadLimitBytes, fallbackCount) {
    const safeSegments = Array.isArray(segments) ? segments : [];
    if (safeSegments.length === 0) return [];

    const limitBytes = Number(sampleDownloadLimitBytes);
    const effectiveLimitBytes = Number.isFinite(limitBytes) && limitBytes > 0 ? limitBytes : null;
    if (!effectiveLimitBytes) {
      return safeSegments.slice(0, fallbackCount);
    }

    const selected = [];
    let totalBytes = 0;

    for (const segment of safeSegments) {
      if (!segment) continue;
      selected.push(segment);
      const segmentBytes = this.getSegmentBytes(segment);
      totalBytes += segmentBytes;

      if (totalBytes >= effectiveLimitBytes) {
        break;
      }
    }

    if (selected.length === 0) {
      return safeSegments.slice(0, fallbackCount);
    }

    return selected;
  }

  getFileSearchText(file) {
    if (!file) return '';
    return String(file.subject || file.name || file.$?.subject || '').toLowerCase();
  }

  getFileNameText(file) {
    if (!file) return '';
    return String(file.name || this.extractNameFromSubject(file.subject || file.$?.subject || '') || '').toLowerCase();
  }

  extractNameFromSubject(subject) {
    if (!subject) return '';
    const quotedMatch = String(subject).match(/"([^"]+)"/);
    if (quotedMatch?.[1]) return quotedMatch[1].trim();
    const singleQuotedMatch = String(subject).match(/'([^']+)'/);
    if (singleQuotedMatch?.[1]) return singleQuotedMatch[1].trim();
    return '';
  }

  isVideoTaggedFile(file) {
    const lower = this.getFileNameText(file) || this.getFileSearchText(file);
    if (/\.(mkv|mp4|avi|mov|wmv|ts|m2ts|mpg|mpeg|vob|iso)$/i.test(lower)) return true;

    const meta = filenameParser.parseFilename(path.basename(lower.replace(/\.nzb\.gz$/i, '').replace(/\.(nzb|rar|zip|7z)$/i, '')));
    return Boolean(
      meta.resolution ||
      meta.videoCodec ||
      meta.audioCodec ||
      meta.source ||
      ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'ts', 'm2ts', 'mpg', 'mpeg', 'vob', 'iso'].includes(String(meta.format || '').toLowerCase())
    );
  }

  isAudioTaggedFile(file) {
    const lower = this.getFileNameText(file) || this.getFileSearchText(file);
    if (/\.(flac|mp3|wav|ogg|m4a|wma|aac|opus)$/i.test(lower)) return true;

    const meta = filenameParser.parseFilename(path.basename(lower.replace(/\.nzb\.gz$/i, '').replace(/\.(nzb|rar|zip|7z)$/i, '')));
    return Boolean(
      meta.audioCodec ||
      meta.audioChannels ||
      ['flac', 'mp3', 'wav', 'ogg', 'm4a', 'wma', 'aac', 'opus'].includes(String(meta.format || '').toLowerCase())
    );
  }

  isArchiveTaggedFile(file) {
    const lower = this.getFileNameText(file) || this.getFileSearchText(file);
    return /\.(rar|zip|7z)$/i.test(lower);
  }

  isSampleLikeFile(file) {
    const lower = this.getFileSearchText(file);
    return /(?:^|[._\- ])sample(?:[._\- ]|$)|\/sample\//i.test(lower) ||
      /(?:^|[._\- ])trailer(?:[._\- ]|$)/i.test(lower) ||
      /(?:^|[._\- ])proof(?:[._\- ]|$)/i.test(lower) ||
      /(?:^|[._\- ])screens?(?:[._\- ]|$)/i.test(lower);
  }

  isNfoLikeFile(file) {
    const lower = this.getFileSearchText(file);
    return /(?:^|[._\- ])nfo(?:[._\- ]|$)|\.nfo$/i.test(lower);
  }

  getFileSegmentCount(file) {
    return Array.isArray(file?.segments) ? file.segments.length : 0;
  }

  findPrimaryContentFile(nzbData, matcher = null) {
    const files = Array.isArray(nzbData?.files) ? nzbData.files : [];
    if (!files.length) return null;

    const candidates = files.filter(file => {
      if (!file) return false;
      if (this.isSampleLikeFile(file) || this.isNfoLikeFile(file)) return false;
      return typeof matcher === 'function' ? matcher(file) : true;
    });

    const pool = candidates.length > 0
      ? candidates
      : files.filter(file => file && !this.isSampleLikeFile(file) && !this.isNfoLikeFile(file));

    return [...pool].sort((a, b) => {
      const countA = this.getFileSegmentCount(a);
      const countB = this.getFileSegmentCount(b);
      if (countB !== countA) return countB - countA;
      const sizeA = this.getFileSegmentBytes(a);
      const sizeB = this.getFileSegmentBytes(b);
      return sizeB - sizeA;
    })[0] || null;
  }

  findLargestFile(nzbData) {
    const files = Array.isArray(nzbData?.files) ? nzbData.files : [];
    if (files.length === 0) return null;

    return [...files].sort((a, b) => {
      const sizeA = this.getFileSegmentBytes(a);
      const sizeB = this.getFileSegmentBytes(b);
      return sizeB - sizeA;
    })[0];
  }

  getFileSegmentBytes(file) {
    const segments = Array.isArray(file?.segments) ? file.segments : [];
    return segments.reduce((sum, segment) => sum + this.getSegmentBytes(segment), 0);
  }

  getSegmentBytes(segment) {
    if (!segment) return 0;
    return parseInt(segment.bytes || segment.$?.bytes || segment.$?.size || 0, 10) || 0;
  }

  getFileSizeSafe(filePath) {
    try {
      return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    } catch (error) {
      return 0;
    }
  }

  applyFilenameFallback(result, nzbFilePath) {
    if (!result || !nzbFilePath) return result;

    const parsed = filenameParser.parseFilename(path.basename(nzbFilePath));

    if (!result.resolution && parsed.resolution) {
      result.resolution = parsed.resolution;
    }
    if (!result.videoCodec && parsed.videoCodec) {
      result.videoCodec = parsed.videoCodec;
    }
    if (!result.audioCodec && parsed.audioCodec) {
      result.audioCodec = parsed.audioCodec;
    }
    if (!result.audioChannels && parsed.audioChannels) {
      result.audioChannels = parsed.audioChannels;
    }
    if (!result.format && parsed.format) {
      result.format = parsed.format;
    }
    if (!result.subtitles && parsed.subtitles) {
      result.subtitles = parsed.languages?.length ? parsed.languages.join(',') : 'Yes';
    }
    if (!result.hdrFormat && parsed.hdrFormat) {
      result.hdrFormat = parsed.hdrFormat;
    }

    return result;
  }

  async downloadSegmentsWithConnections(segments, outputPath, onProgress, progressType, settings = null, connectionCount = 40) {
    const safeSegments = Array.isArray(segments) ? segments : [];
    if (safeSegments.length === 0) {
      throw new Error('No segments available for download');
    }

    const normalizedSegments = safeSegments.map(segment => nntpClient.normalizeSegment(segment));
    const workerCount = Math.max(1, Math.min(connectionCount, normalizedSegments.length));

    if (workerCount <= 1) {
      return nntpClient.downloadFile(normalizedSegments, outputPath, (progress) => {
        if (onProgress) onProgress({ type: progressType, ...progress });
      });
    }

    const chunkSize = Math.max(1, Math.ceil(normalizedSegments.length / workerCount));
    const chunks = [];
    for (let i = 0; i < normalizedSegments.length; i += chunkSize) {
      chunks.push(normalizedSegments.slice(i, i + chunkSize));
    }

    const results = await Promise.all(chunks.map(chunk => this.downloadChunk(chunk, onProgress, progressType, settings)));
    const fileData = Buffer.concat(results.filter(Boolean));

    if (!fileData.length) {
      throw new Error('No segments could be downloaded for this file');
    }

    fs.writeFileSync(outputPath, fileData);
    return {
      data: fileData,
      size: fileData.length,
      outputPath
    };
  }

  async downloadChunk(segments, onProgress, progressType, settings = null) {
    const client = new nntpClient.NntpClient();
    await client.connect({
      server: settings?.nntp_server,
      port: parseInt(settings?.nntp_port, 10),
      username: settings?.nntp_username,
      password: settings?.nntp_password,
      ssl: settings?.nntp_ssl === '1'
    });

    try {
      const buffers = [];
      let downloadedBytes = 0;
      for (let i = 0; i < segments.length; i++) {
        const segment = client.normalizeSegment(segments[i]);
        if (!segment.messageId) continue;
        const data = await client.fetchArticle(segment.messageId);
        if (data?.length) {
          buffers.push(data);
          downloadedBytes += data.length;
          if (onProgress) {
            onProgress({
              type: progressType,
              segment: i + 1,
              total: segments.length,
              downloadedBytes
            });
          }
        }
      }

      return Buffer.concat(buffers);
    } finally {
      client.disconnect();
    }
  }

  /**
   * Find video files in extracted directory (recursive)
   */
  findExtractedVideos(dir) {
    const videoFiles = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && /\.(mkv|mp4|avi|mov|wmv|ts|m2ts|mpg|mpeg)$/i.test(entry.name)) {
          videoFiles.push(fullPath);
        } else if (entry.isDirectory()) {
          videoFiles.push(...this.findExtractedVideos(fullPath));
        }
      }
    } catch (e) {}
    return videoFiles;
  }

  /**
   * Run MediaInfo on a file
   */
  async runMediaInfo(filePath, result) {
    try {
      const { stdout } = await execAsync(`"${this.mediainfoPath}" --Language=Text --Full "${filePath}"`, {
        timeout: 30000
      });

      const sanitizedRaw = this.sanitizeMediaInfoRaw(stdout.trim());
      result.mediainfoRaw = sanitizedRaw;
      const parsed = this.parseMediaInfoOutput(sanitizedRaw);
      
      Object.assign(result, parsed);
    } catch (error) {
      console.log(`  ⚠ MediaInfo failed: ${error.message}`);
    }
  }

  sanitizeMediaInfoRaw(rawText) {
    if (!rawText) return '';

    return rawText
      .replace(/^(Complete name\s*:\s*)(.+)$/gim, (_, prefix, fullPath) => {
        const normalized = String(fullPath).trim().replace(/[\\/]+$/, '');
        const fileName = normalized.split(/[\\/]/).pop() || normalized;
        return `${prefix}${fileName}`;
      })
      .replace(/^(Folder name\s*:\s*)(.+)$/gim, (_, prefix, fullPath) => {
        const normalized = String(fullPath).trim().replace(/[\\/]+$/, '');
        const folderName = normalized.split(/[\\/]/).pop() || normalized;
        return `${prefix}${folderName}`;
      });
  }

  classifyResolution(width, height) {
    const numericWidth = Number(width) || 0;
    const numericHeight = Number(height) || 0;

    if (numericHeight >= 2000 || numericWidth >= 3500) {
      return '2160P';
    }

    // Treat cropped Blu-ray / scope encodes like 1920x1038 as 1080P.
    if (numericHeight >= 1000 || numericWidth >= 1800) {
      return '1080P';
    }

    if (numericHeight >= 680 || numericWidth >= 1200) {
      return '720P';
    }

    if (numericHeight > 0) {
      return `${numericHeight}P`;
    }

    return null;
  }

  /**
   * Parse MediaInfo text output
   * Handles --Language=Text --Full output which lists ALL fields with variations
   */
  parseMediaInfoOutput(raw) {
    const result = {};

    try {
      // Split raw output into sections (General, Video, Audio, Text, etc.)
      // Each section starts with a known header like "Video", "Audio", "Text"
      const sections = this.splitIntoSections(raw);

      // --- GENERAL SECTION ---
      const general = sections.general || {};

      // File size (from General section, look for the byte value)
      if (general.raw) {
        const fileSizeMatch = general.raw.match(/File size\s*:\s*([\d]+)\s*$/m);
        if (fileSizeMatch) {
          result.fileSize = parseInt(fileSizeMatch[1]);
        }

        // Overall bitrate
        const overallBitrateMatch = general.raw.match(/Overall bit rate\s*:\s*([\d\s]+)\s*([KM]?b\/s)/m);
        if (overallBitrateMatch) {
          result.overallBitrate = this.parseBitrateToBps(overallBitrateMatch[1].trim(), overallBitrateMatch[2].trim());
        }

        // Duration
        const durationMatch = general.raw.match(/Duration\s*:\s*([\d]+)\s*$/m);
        if (durationMatch) {
          result.durationMs = parseInt(durationMatch[1]);
        }
      }

      // --- VIDEO SECTION ---
      const video = sections.video || {};

      let parsedWidth = null;
      let parsedHeight = null;

      // Resolution (height) - MediaInfo often formats this as "1 080 pixels"
      const heightMatch = video.raw?.match(/Height\s*:\s*([\d\s,]+)(?:\s*pixels)?/i);
      if (heightMatch) {
        parsedHeight = parseInt(heightMatch[1].replace(/[\s,]/g, ''), 10);
      }

      // Width (for reference)
      const widthMatch = video.raw?.match(/Width\s*:\s*([\d\s,]+)(?:\s*pixels)?/i);
      if (widthMatch) {
        parsedWidth = parseInt(widthMatch[1].replace(/[\s,]/g, ''), 10);
        result.width = parsedWidth;
      }

      if (parsedHeight) {
        result.resolution = this.classifyResolution(parsedWidth, parsedHeight);
      }

      // Fallback for outputs that only expose combined frame size
      if (!result.resolution) {
        const frameSizeMatch = video.raw?.match(/Frame size\s*:\s*([\d\s,]+)x([\d\s,]+)/i);
        if (frameSizeMatch) {
          const frameWidth = parseInt(frameSizeMatch[1].replace(/[\s,]/g, ''), 10);
          const frameHeight = parseInt(frameSizeMatch[2].replace(/[\s,]/g, ''), 10);
          result.resolution = this.classifyResolution(frameWidth, frameHeight);
        }
      }

      // Aspect Ratio
      const darMatch = video.raw?.match(/Display aspect ratio\s*:\s*([^\n\r]+)/i);
      if (darMatch) {
        result.aspectRatio = darMatch[1].trim();
      }

      // Frame Rate
      const frameRateMatch = video.raw?.match(/Frame rate\s*:\s*([^\n\r]+)/i);
      if (frameRateMatch) {
        result.frameRate = frameRateMatch[1].trim();
      }

      // Video codec
      const videoFormatMatch = video.raw?.match(/Format\s*:\s*([^\n\r]+)/i);
      if (videoFormatMatch) {
        result.videoCodec = this.normalizeVideoCodecLabel(videoFormatMatch[1]);
      }

      // Video Profile
      const profileMatch = video.raw?.match(/Format profile\s*:\s*([^\n\r]+)/i);
      if (profileMatch) {
        result.videoProfile = profileMatch[1].trim();
      }

      // Bit Depth
      const bitDepthMatch = video.raw?.match(/Bit depth\s*:\s*([^\n\r]+)/i);
      if (bitDepthMatch) {
        result.bitDepth = bitDepthMatch[1].trim();
      }

      // HDR Format
      const hdrMatch = video.raw?.match(/HDR format\s*:\s*([^\n\r]+)/i);
      if (hdrMatch) {
        const hdrRaw = hdrMatch[1].trim().toUpperCase();
        if (hdrRaw.includes('DOLBY VISION') || hdrRaw.includes('DV')) result.hdrFormat = 'Dolby Vision';
        else if (hdrRaw.includes('HDR10+')) result.hdrFormat = 'HDR10+';
        else if (hdrRaw.includes('HDR10')) result.hdrFormat = 'HDR10';
        else if (hdrRaw.includes('HLG')) result.hdrFormat = 'HLG';
        else result.hdrFormat = 'None';
      } else {
        result.hdrFormat = 'None';
      }

      // Video Bitrate
      const videoBitrateMatch = video.raw?.match(/Bit rate\s*:\s*([\d\s]+)\s*([KM]?b\/s)/m);
      if (videoBitrateMatch) {
        result.videoBitrate = this.parseBitrateToBps(videoBitrateMatch[1].trim(), videoBitrateMatch[2].trim());
      }

      // Scan Type (Progressive, Interlaced)
      const scanTypeMatch = video.raw?.match(/Scan type\s*:\s*([^\n\r]+)/i);
      if (scanTypeMatch) {
        result.scanType = scanTypeMatch[1].trim();
      }

      // Chroma Subsampling
      const chromaMatch = video.raw?.match(/Chroma subsampling\s*:\s*([^\n\r]+)/i);
      if (chromaMatch) {
        result.chromaSubsampling = chromaMatch[1].trim();
      }

      // Color primaries
      const colorPrimariesMatch = video.raw?.match(/Color primaries\s*:\s*([^\n\r]+)/i);
      if (colorPrimariesMatch) {
        result.colorPrimaries = colorPrimariesMatch[1].trim();
      }

      // --- AUDIO SECTION ---
      const audio = sections.audio || {};

      // Audio codec
      const audioCodecMatch = audio.raw?.match(/Format\s*:\s*([^\n\r]+)/i);
      if (audioCodecMatch) {
        result.audioCodec = this.normalizeAudioCodecLabel(audioCodecMatch[1]);
      }

      // Audio channels
      const channelsMatch = audio.raw?.match(/Channel\(s\)\s*:\s*([^\n\r]+)/i);
      if (channelsMatch) {
        const channels = channelsMatch[1].trim();
        if (channels.includes('8') || channels.includes('7.1')) result.audioChannels = '7.1';
        else if (channels.includes('6') || channels.includes('5.1')) result.audioChannels = '5.1';
        else if (channels.includes('2')) result.audioChannels = '2.0';
      }

      // Audio Bitrate
      const audioBitrateMatch = audio.raw?.match(/Bit rate\s*:\s*([\d\s]+)\s*([KM]?b\/s)/m);
      if (audioBitrateMatch) {
        result.audioBitrate = this.parseBitrateToBps(audioBitrateMatch[1].trim(), audioBitrateMatch[2].trim());
      }

      // Audio Sample Rate
      const sampleRateMatch = audio.raw?.match(/Sampling rate\s*:\s*([^\n\r]+)/i);
      if (sampleRateMatch) {
        const srStr = sampleRateMatch[1].trim().toUpperCase();
        const srNumMatch = srStr.replace(/\s/g, '').match(/([\d.]+)\s*([KMG]?)HZ/);
        if (srNumMatch) {
          let sampleRate = parseFloat(srNumMatch[1]);
          if (srNumMatch[2] === 'K') sampleRate *= 1000;
          else if (srNumMatch[2] === 'M') sampleRate *= 1000000;
          result.audioSampleRate = Math.round(sampleRate);
        }
      }

      // --- FORMAT (CONTAINER) - from General section ---
      const formatMatch = general.raw?.match(/Format\s*:\s*([^\n\r]+)/i);
      if (formatMatch) {
        const fmt = formatMatch[1].trim();
        if (fmt === 'Matroska') result.format = 'MKV';
        else if (fmt === 'MPEG-4') result.format = 'MP4';
        else if (fmt === 'AVI') result.format = 'AVI';
        else if (fmt === 'QuickTime') result.format = 'MOV';
        else if (fmt === 'DivX') result.format = 'AVI';
        else if (fmt === 'XviD') result.format = 'AVI';
        else if (fmt === 'Wave') result.format = 'WAV';
        else if (fmt === 'FLAC') result.format = 'FLAC';
        else if (fmt === 'MPEG Audio') result.format = 'MP3';
      }

      // --- SUBTITLES - from all Text sections ---
      const textSections = Object.entries(sections)
        .filter(([key]) => key.startsWith('text'));
      const subtitles = [];
      for (const [, section] of textSections) {
        const langMatch = section.raw?.match(/Language\s*:\s*([A-Za-z]+)\s*$/m);
        if (langMatch) {
          const lang = langMatch[1].trim();
          if (lang && !subtitles.includes(lang)) subtitles.push(lang);
        }
      }
      if (subtitles.length > 0) result.subtitles = subtitles.join(',');

    } catch (error) {
      console.error('Error parsing MediaInfo:', error.message);
    }

    return result;
  }

  /**
   * Split raw mediainfo output into named sections
   */
  splitIntoSections(raw) {
    const sections = {};

    // Split by section boundaries. In --Full output, sections are separated by blank lines
    // and each starts with a type label (General, Video, Audio, Text, Menu)
    const sectionRegex = /^(General|Video|Audio|Text|Menu)/gm;
    const matches = [];
    let match;
    while ((match = sectionRegex.exec(raw)) !== null) {
      matches.push({ type: match[1], index: match.index });
    }

    if (matches.length === 0) {
      // Fallback: no sections found, put everything in "general"
      sections.general = { raw };
      return sections;
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const sectionContent = next
        ? raw.substring(current.index, next.index)
        : raw.substring(current.index);

      const key = current.type.toLowerCase() + (current.type === 'Text' ? `_${i}` : '');

      // Track if we already have a text section for numbering
      if (current.type === 'Text') {
        const textCount = Object.keys(sections).filter(k => k.startsWith('text')).length;
        sections[`text_${textCount}`] = { raw: sectionContent };
      } else {
        sections[key] = { raw: sectionContent };
      }
    }

    return sections;
  }

  /**
   * Parse a bitrate string like "2 555 kb/s" or "132 kb/s" to bps
   */
  parseBitrateToBps(value, unit) {
    const numStr = value.replace(/[\s,]/g, '');
    const num = parseFloat(numStr);
    if (isNaN(num)) return null;

    const unitUpper = unit.toUpperCase();
    if (unitUpper === 'KB/S' || unitUpper === 'KBIT/S') return Math.round(num * 1000);
    if (unitUpper === 'MB/S' || unitUpper === 'MBIT/S') return Math.round(num * 1000000);
    if (unitUpper === 'GB/S') return Math.round(num * 1000000000);
    // b/s
    return Math.round(num);
  }

  /**
   * Normalize MediaInfo video codec labels to the app's display values.
   */
  normalizeVideoCodecLabel(label) {
    const info = String(label || '').trim().toUpperCase();
    if (!info) return null;

    if (info.includes('HEVC') || info.includes('H265') || info.includes('H.265') || info.includes('V_MPEGH')) return 'H.265';
    if (info.includes('AVC') || info.includes('H264') || info.includes('H.264') || info.includes('V_MPEG4/ISO/AVC') || info.includes('AVC1')) return 'H.264';
    if (info.includes('AV1')) return 'AV1';
    if (info.includes('VP9')) return 'VP9';
    if (info.includes('MPEG-4 VISUAL') || info.includes('MPEG4 VISUAL') || info.includes('XVID') || info.includes('DIVX')) return 'MPEG-4 Visual';
    if (info.includes('MPEG-2') || info.includes('MPEG2')) return 'MPEG-2';
    if (info.includes('MPEG-1') || info.includes('MPEG1')) return 'MPEG-1';
    return null;
  }

  /**
   * Normalize MediaInfo audio codec labels to the app's display values.
   */
  normalizeAudioCodecLabel(label) {
    const info = String(label || '').trim().toUpperCase();
    if (!info) return null;

    if (info.includes('TRUEHD')) return 'TrueHD';
    if (info.includes('DTS-HD MA') || info.includes('DTS-HD MASTER') || info.includes('DTS-HD')) return 'DTS-HD MA';
    if (info.includes('DTS')) return 'DTS';
    if (info.includes('E-AC-3') || info.includes('EAC3') || info.includes('DD+')) return 'DD+';
    if (info.includes('AC-3') || info.includes('AC3')) return 'AC3';
    if (info.includes('AAC')) return 'AAC';
    if (info.includes('FLAC')) return 'FLAC';
    if (info.includes('OPUS')) return 'Opus';
    if (info.includes('MP3') || info.includes('MPEG AUDIO') || info.includes('MPEG-1 AUDIO') || info.includes('MPEG AUDIO LAYER 3')) return 'MP3';
    if (info.includes('MPEG-2 AUDIO')) return 'MP2';
    return null;
  }

  /**
   * Extract password from NZB XML
   */
  extractPasswordFromNZB(nzbFilePath) {
    try {
      const content = nzbFileUtils.readNZBContent(nzbFilePath);
      const match = content.match(/<meta[^>]*type="password"[^>]*>([^<]+)<\/meta>/i);
      return match ? match[1].trim() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check archive for password
   */
  async checkArchivePassword(filePath, existingPassword) {
    if (existingPassword) return existingPassword;

    try {
      const { stdout } = await execAsync(`"${this.unrarPath}" l -p- "${filePath}" 2>&1`);
      if (/encrypted|password/i.test(stdout)) {
        return 'UNKNOWN';
      }
    } catch (error) {
      // Ignore
    }
    return null;
  }

  /**
   * Check password protection
   */
  async checkPasswordProtection(nzbData, workspaceDir = null) {
    // Try checking the first archive file
    const archiveFiles = this.findFiles(nzbData, /\.(rar|zip|7z)$/i);
    if (archiveFiles.length > 0) {
      const archivePath = path.join(workspaceDir || this.tempDir, `pwcheck-${Date.now()}.rar`);
      try {
        // Download just the first segment to check headers
        const firstSegment = archiveFiles[0].segments[0];
        const data = await nntpClient.fetchArticle(firstSegment.messageId);
        if (data && data.length > 4) {
          // Check RAR signature
          if (data[0] === 0x52 && data[1] === 0x61 && data[2] === 0x72 && data[3] === 0x21) {
            // It's a RAR file - we already checked password in analyzeArchive
          }
        }
      } catch (e) {}
    }
    return null;
  }

  /**
   * Find files matching pattern in NZB
   */
  findFiles(nzbData, pattern) {
    const matcher = typeof pattern === 'function'
      ? pattern
      : (file) => pattern.test(this.getFileSearchText(file));

    return (Array.isArray(nzbData?.files) ? nzbData.files : []).filter(f => {
      return matcher(f);
    }).sort((a, b) => {
      // Sort by size (prefer larger files - likely main content)
      const sizeA = this.getFileSegmentBytes(a);
      const sizeB = this.getFileSegmentBytes(b);
      return sizeB - sizeA;
    });
  }
}

module.exports = new ContentAnalyzer();
