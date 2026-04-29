const fs = require('fs');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const appPaths = require('./appPaths');
const nzbParser = require('./nzbParser');
const nntpClient = require('./nntpClient');
const NntpClient = nntpClient.NntpClient;

const execFileAsync = promisify(execFile);

class ReleaseRefreshService {
  constructor() {
    this.mediaInfoPath = '/usr/local/bin/mediainfo';
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
  }

  async refreshOwnedRelease(release, settings, onProgress) {
    const workspaceRoot = settings.archive_work_path || appPaths.getTempDir();
    const workspace = path.join(workspaceRoot, `refresh-${release.id}-${Date.now()}`);
    const downloadDir = path.join(workspace, 'download');
    const extractDir = path.join(workspace, 'extract');

    fs.mkdirSync(downloadDir, { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      onProgress?.({ step: 'prepare', message: 'Parsing NZB and preparing workspace' });
      console.log(`[Refresh ${release.id}] workspace: ${workspace}`);
      const nzbContent = nzbParser.readNZBContent(release.nzb_file_path);
      const nzbData = await nzbParser.parseNZBFile(release.nzb_file_path);

      onProgress?.({ step: 'connect', message: 'Connecting to Usenet provider' });
      await nntpClient.connect({
        server: settings.nntp_server,
        port: parseInt(settings.nntp_port, 10),
        username: settings.nntp_username,
        password: settings.nntp_password,
        ssl: settings.nntp_ssl === '1'
      });

      const downloadedFiles = [];
      for (let i = 0; i < nzbData.files.length; i++) {
        const fileEntry = nzbData.files[i];
        const safeName = this.makeSafeFileName(fileEntry.name || `part-${i + 1}.bin`, i);
        const outputPath = path.join(downloadDir, safeName);
        const segments = nzbParser.extractSegmentsBySubject(nzbContent, fileEntry.subject || fileEntry.name);

        onProgress?.({
          step: 'download',
          message: `Downloading ${i + 1}/${nzbData.files.length}: ${safeName}`
        });

        await this.downloadFileWithConnections(
          segments.length > 0 ? segments : fileEntry.segments,
          outputPath,
          settings,
          onProgress,
          safeName
        );
        downloadedFiles.push(outputPath);
      }

      this.normalizeMultipartArchiveSet(downloadedFiles);

      onProgress?.({ step: 'analyze', message: 'Locating playable media' });
      const mediaFile = await this.resolvePlayableMedia(downloadedFiles, extractDir, release.password || settings.archive_password);
      if (!mediaFile) {
        throw new Error('No playable media file found after download');
      }

      onProgress?.({ step: 'mediainfo', message: 'Extracting detailed MediaInfo' });
      const mediaInfo = await this.runMediaInfo(mediaFile.path);

      return {
        success: true,
        mediaFile,
        workspace,
        mediaInfo
      };
    } finally {
      try {
        nntpClient.disconnect();
      } catch (error) {}

      if (settings.archive_keep_temp_files !== '1' && fs.existsSync(workspace)) {
        fs.rmSync(workspace, { recursive: true, force: true });
      }
    }
  }

  makeSafeFileName(name, index) {
    const baseName = path.basename(name || `file-${index + 1}`);
    const sanitized = baseName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
    return sanitized || `file-${index + 1}.bin`;
  }

  async downloadFileWithConnections(segments, outputPath, settings, onProgress, label) {
    const connectionCount = Math.max(1, Math.min(parseInt(settings.nntp_connections, 10) || 1, 50));
    if (connectionCount <= 1 || segments.length <= 1) {
      return nntpClient.downloadFile(segments, outputPath);
    }

    onProgress?.({
      step: 'download',
      message: `Using ${connectionCount} connections for ${label}`
    });

    const normalizedSegments = segments.map(segment => nntpClient.normalizeSegment(segment));
    const chunkSize = Math.max(1, Math.ceil(normalizedSegments.length / connectionCount));
    const chunks = [];
    for (let i = 0; i < normalizedSegments.length; i += chunkSize) {
      chunks.push(normalizedSegments.slice(i, i + chunkSize));
    }

    const chunkBuffers = await Promise.all(
      chunks.map(chunk => this.downloadChunk(chunk, settings))
    );

    const fileData = Buffer.concat(chunkBuffers);
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

  async downloadChunk(segments, settings) {
    const client = new NntpClient();
    await client.connect({
      server: settings.nntp_server,
      port: parseInt(settings.nntp_port, 10),
      username: settings.nntp_username,
      password: settings.nntp_password,
      ssl: settings.nntp_ssl === '1'
    });

    try {
      const buffers = [];
      for (const segment of segments) {
        const normalized = client.normalizeSegment(segment);
        if (!normalized.messageId) continue;
        const data = await client.fetchArticle(normalized.messageId);
        if (data?.length) {
          buffers.push(data);
        }
      }

      return Buffer.concat(buffers);
    } finally {
      client.disconnect();
    }
  }

  async resolvePlayableMedia(downloadedFiles, extractDir, password) {
    const directMedia = downloadedFiles.find(file => this.isPlayableMedia(file));
    if (directMedia) {
      return { path: directMedia, isDirectory: false };
    }

    const rarCandidates = downloadedFiles.filter(file => /\.r\d{2}$|\.part\d+\.rar$|\.rar$/i.test(file));
    if (rarCandidates.length > 0 && (this.unrarPath || this.sevenZipPath)) {
      const firstArchive = this.findPrimaryRarArchive(rarCandidates);
      if (this.unrarPath) {
        const args = ['x', '-y', '-o+'];
        args.push(password ? `-p${password}` : '-p-');
        args.push(firstArchive, `${extractDir}/`);
        await execFileAsync(this.unrarPath, args, { timeout: 30 * 60 * 1000 });
      } else {
        const args = ['x', '-y'];
        if (password) args.push(`-p${password}`);
        args.push(`-o${extractDir}`, firstArchive);
        await execFileAsync(this.sevenZipPath, args, { timeout: 30 * 60 * 1000 });
      }

      const extractedMedia = this.findPlayableMedia(extractDir);
      if (extractedMedia) {
        return extractedMedia;
      }
    }

    const sevenZipCandidates = downloadedFiles.filter(file =>
      /\.7z(?:\.\d{3})?$/i.test(file) || /\.zip(?:\.\d{3})?$/i.test(file)
    );
    if (sevenZipCandidates.length > 0 && (this.unzipPath || this.sevenZipPath)) {
      const firstArchive = this.findPrimaryMultipartArchive(sevenZipCandidates);
      if (this.unzipPath && path.basename(this.unzipPath).toLowerCase().includes('unzip')) {
        const args = password ? ['-P', password, '-o', firstArchive, '-d', extractDir] : ['-o', firstArchive, '-d', extractDir];
        await execFileAsync(this.unzipPath, args, { timeout: 30 * 60 * 1000 });
      } else if (this.sevenZipPath) {
        const args = ['x', '-y'];
        if (password) args.push(`-p${password}`);
        args.push(`-o${extractDir}`, firstArchive);
        await execFileAsync(this.sevenZipPath, args, { timeout: 30 * 60 * 1000 });
      }

      const extractedMedia = this.findPlayableMedia(extractDir);
      if (extractedMedia) {
        return extractedMedia;
      }
    }

    return null;
  }

  findPrimaryMultipartArchive(files) {
    const sorted = [...files].sort();
    const numbered = sorted.find(file => /\.(7z|zip)\.001$/i.test(file));
    if (numbered) return numbered;
    return sorted[0];
  }

  findPrimaryRarArchive(files) {
    const sorted = [...files].sort();
    const partOne = sorted.find(file => /\.part0*1\.rar$/i.test(file));
    if (partOne) return partOne;

    const plainRar = sorted.find(file => /\.rar$/i.test(file) && !/\.part\d+\.rar$/i.test(file));
    if (plainRar) return plainRar;

    return sorted[0];
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
      const resolved = String(output).split(/\r?\n/).find(Boolean);
      return resolved ? resolved.trim() : null;
    } catch (error) {
      return null;
    }
  }

  normalizeMultipartArchiveSet(files) {
    const rarFiles = files.filter(file => /\.part\d+\.rar$/i.test(file));
    if (rarFiles.length < 2) return;

    const primary = this.findPrimaryRarArchive(rarFiles);
    if (!primary) return;

    const dir = path.dirname(primary);
    const baseName = path.basename(primary).replace(/\.part0*1\.rar$/i, '');
    const indexedFiles = [...rarFiles].sort((a, b) => this.getMultipartIndex(a) - this.getMultipartIndex(b));

    for (const file of indexedFiles) {
      const index = this.getMultipartIndex(file);
      if (!index) continue;

      const expectedName = `${baseName}.part${String(index).padStart(1, '0')}.rar`;
      const expectedPath = path.join(dir, expectedName);
      if (file !== expectedPath && !fs.existsSync(expectedPath)) {
        fs.renameSync(file, expectedPath);
      }
    }
  }

  getMultipartIndex(filePath) {
    const match = path.basename(filePath).match(/\.part(\d+)\.rar$/i);
    return match ? parseInt(match[1], 10) : null;
  }

  isPlayableMedia(filePath) {
    return /\.(mkv|mp4|avi|mov|wmv|ts|m2ts|mpg|mpeg|vob|ifo)$/i.test(filePath);
  }

  findPlayableMedia(rootDir) {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    
    // Check for VIDEO_TS folder (DVD structure)
    const videoTsDir = entries.find(e => e.isDirectory() && e.name.toUpperCase() === 'VIDEO_TS');
    if (videoTsDir) {
      const videoTsPath = path.join(rootDir, videoTsDir.name);
      // Return the VIDEO_TS folder itself for upload (not just a single VOB)
      return { path: videoTsPath, isDirectory: true };
    }
    
    // Check for BDMV folder (Blu-ray structure)
    const bdmvDir = entries.find(e => e.isDirectory() && e.name.toUpperCase() === 'BDMV');
    if (bdmvDir) {
      const bdmvPath = path.join(rootDir, bdmvDir.name);
      return { path: bdmvPath, isDirectory: true };
    }
    
    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isFile() && this.isPlayableMedia(fullPath)) {
        return { path: fullPath, isDirectory: false };
      }
      if (entry.isDirectory()) {
        const nested = this.findPlayableMedia(fullPath);
        if (nested) return nested;
      }
    }
    return null;
  }

  async runMediaInfo(filePath) {
    // If it's a VIDEO_TS or BDMV folder, find a VOB/M2TS file to analyze
    let analyzePath = filePath;
    if (fs.statSync(filePath).isDirectory()) {
      const entries = fs.readdirSync(filePath, { withFileTypes: true });
      
      // For VIDEO_TS, find the largest VOB file (usually the main feature)
      if (path.basename(filePath).toUpperCase() === 'VIDEO_TS') {
        const vobFiles = entries.filter(e => e.isFile() && /\.vob$/i.test(e.name));
        if (vobFiles.length > 0) {
          vobFiles.sort((a, b) => {
            const statA = fs.statSync(path.join(filePath, a.name));
            const statB = fs.statSync(path.join(filePath, b.name));
            return statB.size - statA.size;
          });
          analyzePath = path.join(filePath, vobFiles[0].name);
        }
      }
      
      // For BDMV, find the main M2TS file
      if (path.basename(filePath).toUpperCase() === 'BDMV') {
        const streamDir = path.join(filePath, 'STREAM');
        if (fs.existsSync(streamDir)) {
          const m2tsFiles = fs.readdirSync(streamDir).filter(f => /\.m2ts$/i.test(f));
          if (m2tsFiles.length > 0) {
            m2tsFiles.sort((a, b) => {
              const statA = fs.statSync(path.join(streamDir, a));
              const statB = fs.statSync(path.join(streamDir, b));
              return statB.size - statA.size;
            });
            analyzePath = path.join(streamDir, m2tsFiles[0]);
          }
        }
      }
    }

    const { stdout } = await execFileAsync(this.mediaInfoPath, ['--Language=Text', '--Full', analyzePath], {
      timeout: 60 * 1000
    });

    const contentAnalyzer = require('./contentAnalyzer');
    const raw = contentAnalyzer.sanitizeMediaInfoRaw(stdout.trim());
    const parsed = contentAnalyzer.parseMediaInfoOutput(raw);

    return {
      mediainfoRaw: raw,
      ...parsed
    };
  }
}

module.exports = new ReleaseRefreshService();
