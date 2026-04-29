// NZBarr Desktop - NZB File Parser
const path = require('path');
const xml2js = require('xml2js');
const nzbFileUtils = require('./nzbFileUtils');

class NZBParser {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: false,
      normalize: true
    });
  }

  /**
   * Parse an NZB file and extract metadata
   */
  async parseNZBFile(nzbPath) {
    try {
      const nzbContent = this.readNZBContent(nzbPath);
      
      const nzbFileName = nzbFileUtils.stripStoredGUIDPrefix(
        nzbFileUtils.stripNZBExtension(path.basename(nzbPath))
      );
      return await this.parseNZBContent(nzbContent, nzbFileName);
    } catch (error) {
      console.error('Failed to parse NZB file:', error.message);
      throw error;
    }
  }

  readNZBContent(nzbPath) {
    return nzbFileUtils.readNZBContent(nzbPath);
  }

  /**
   * Parse NZB XML content
   */
  async parseNZBContent(xmlContent, nzbFileName) {
    try {
      const result = await this.parser.parseStringPromise(xmlContent);
      
      if (!result.nzb || !result.nzb.file) {
        throw new Error('Invalid NZB file structure');
      }

      // NZB can have single file or array of files
      const files = Array.isArray(result.nzb.file) 
        ? result.nzb.file 
        : [result.nzb.file];

      // Use NZB filename as the primary name (like NZBarr2.0)
      const searchName = nzbFileName;
      const cleanName = this.cleanSubject(nzbFileName);

      // Calculate total size from all segments
      const totalSize = files.reduce((sum, file) => {
        const segments = Array.isArray(file.segments.segment)
          ? file.segments.segment
          : [file.segments.segment];
        
        return sum + segments.reduce((segSum, seg) => {
          return segSum + (parseInt(seg.$.bytes) || 0);
        }, 0);
      }, 0);

      // Extract password from NZB XML
      const password = this.extractPassword(result.nzb);

      // Get post date from first file
      const firstFile = files[0];
      const postDate = firstFile.$.date ? new Date(parseInt(firstFile.$.date) * 1000) : null;

      const normalizedFiles = files.map(f => ({
        name: this.extractFileNameFromSubject(f.$.subject || ''),
        subject: f.$.subject || '',
        segments: (Array.isArray(f.segments.segment)
          ? f.segments.segment
          : [f.segments.segment]).map(seg => ({
            number: parseInt(seg.$?.number) || null,
            bytes: parseInt(seg.$?.bytes) || 0,
            messageId: seg._ || ''
          }))
      }));

      const messageIds = normalizedFiles
        .flatMap(file => file.segments.map(segment => segment.messageId).filter(Boolean))
        .sort();

      // Prefer a content-based GUID so the same filename can still represent different NZB revisions.
      const guidSource = messageIds.length > 0
        ? messageIds.join('|||')
        : nzbFileName;
      const nzbGuid = require('crypto').createHash('sha256').update(guidSource).digest('hex').substring(0, 32);

      return {
        searchName: searchName,
        cleanName: cleanName,
        nzbGuid: nzbGuid,
        size: totalSize,
        parts: files.reduce((sum, f) => {
          const segs = Array.isArray(f.segments.segment)
            ? f.segments.segment
            : [f.segments.segment];
          return sum + segs.length;
        }, 0),
        password: password,
        postDate: postDate,
        subject: searchName,
        from: firstFile.$.poster || '',
        files: normalizedFiles,
        meta: {}
      };
    } catch (error) {
      console.error('Failed to parse NZB XML:', error.message);
      throw error;
    }
  }

  /**
   * Extract metadata from NZB file
   */
  extractMetadata(firstFile, fileName) {
    const subject = firstFile.$.subject || fileName;
    const guid = firstFile.$.id || '';
    const dateValue = firstFile.$.date ? parseInt(firstFile.$.date) : null;
    const postDate = dateValue ? new Date(dateValue * 1000) : null;

    // Clean up the subject to get a readable name
    const cleanName = this.cleanSubject(subject);

    // Try to extract metadata from NZB <meta> tags
    const meta = {};
    if (firstFile.meta) {
      const metas = Array.isArray(firstFile.meta)
        ? firstFile.meta
        : [firstFile.meta];
      
      metas.forEach(m => {
        if (m.$ && m.$.type && m._) {
          meta[m.$.type] = m._;
        }
      });
    }

    return {
      searchName: subject,
      cleanName: cleanName,
      guid: guid,
      postDate: postDate,
      subject: subject,
      from: firstFile.$.poster || '',
      meta: meta
    };
  }

  /**
   * Extract password from NZB metadata
   */
  extractPassword(nzbData) {
    const metaEntries = [];

    const appendMeta = (metaField) => {
      if (!metaField) return;
      const metas = Array.isArray(metaField) ? metaField : [metaField];
      metaEntries.push(...metas);
    };

    // Head metadata
    appendMeta(nzbData.head?.meta);
    // Root metadata
    appendMeta(nzbData.meta);

    // File-level metadata
    if (nzbData.file) {
      const files = Array.isArray(nzbData.file) ? nzbData.file : [nzbData.file];
      for (const file of files) {
        appendMeta(file.meta);
      }
    }

    for (const meta of metaEntries) {
      if (!meta) continue;
      const type = (meta.$?.type || '').toString().toLowerCase();
      if (type === 'password') {
        return meta._ || (typeof meta === 'string' ? meta : '') || '';
      }
    }

    return null;
  }

  /**
   * Clean up NZB subject to get readable name
   */
  cleanSubject(subject) {
    if (!subject) return 'Unknown';

    let cleaned = subject;

    // Remove file extension patterns
    cleaned = cleaned.replace(/\.\w{2,4}\s*$/i, '');

    // Remove common NZB patterns
    cleaned = cleaned.replace(/[\[\(].*?[\]\)]/g, ' ');

    // Replace dots and underscores with spaces
    cleaned = cleaned.replace(/[._]+/g, ' ');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Extract the actual file name from a Usenet subject line when possible.
   */
  extractFileNameFromSubject(subject) {
    if (!subject) return 'unknown.bin';

    const quotedMatch = subject.match(/"([^"]+)"/);
    if (quotedMatch?.[1]) {
      return quotedMatch[1].trim();
    }

    const singleQuotedMatch = subject.match(/'([^']+)'/);
    if (singleQuotedMatch?.[1]) {
      return singleQuotedMatch[1].trim();
    }

    return this.cleanSubject(subject) || 'unknown.bin';
  }

  extractSegmentsBySubject(nzbContent, subjectOrFilename) {
    if (!nzbContent || !subjectOrFilename) return [];

    const normalizedTarget = subjectOrFilename.replace(/&quot;/gi, '"');
    const candidates = [
      normalizedTarget,
      path.basename(normalizedTarget),
      this.extractFileNameFromSubject(normalizedTarget)
    ].filter(Boolean);

    let fileBlock = null;

    for (const candidate of candidates) {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`<file[^>]*subject="[^"]*${escaped}[^"]*"[^>]*>[\\s\\S]*?<\\/file>`, 'i');
      const match = nzbContent.match(pattern);
      if (match?.[0]) {
        fileBlock = match[0];
        break;
      }
    }

    if (!fileBlock) return [];

    const segments = [];
    const regex = /<segment[^>]*bytes="(\d+)"[^>]*number="(\d+)"[^>]*>([^<]+)<\/segment>/gi;
    let match;
    while ((match = regex.exec(fileBlock)) !== null) {
      segments.push({
        bytes: parseInt(match[1], 10) || 0,
        number: parseInt(match[2], 10) || null,
        messageId: (match[3] || '').trim()
      });
    }

    return segments;
  }

  /**
   * Detect media type from NZB name and metadata
   */
  detectMediaType(nzbData) {
    const name = (nzbData.cleanName + ' ' + nzbData.searchName).toLowerCase();
    const category = nzbData.meta?.category?.toLowerCase() || '';

    if (/\.movie|movie|film|bdrip|dvdrip|bluray|x264|x265|h264|h265|1080p|720p|480p|2160p|4k/i.test(name)) {
      return 'movie';
    }
    
    if (/\.s\d+e\d+|season|episode|tv|series|hdtv|web.?dl/i.test(name)) {
      return 'tv';
    }
    
    if (/flac|mp3|album|discography|soundtrack/i.test(name)) {
      return 'music';
    }
    
    if (/epub|mobi|pdf|azw3|book|novel/i.test(name)) {
      return 'book';
    }
    
    if (/game|software|app|\.exe|\.dmg|\.iso/i.test(name)) {
      return 'console';
    }

    return 'other';
  }

  /**
   * Guess category ID based on media type
   */
  guessCategoryId(mediaType) {
    const categoryMap = {
      'movie': 1010,    // Movies HD
      'tv': 2010,       // TV HD
      'music': 3020,    // Music FLAC
      'book': 5010,     // Ebooks
      'console': 4010,  // Games
      'other': 1
    };

    return categoryMap[mediaType] || 1;
  }
}

module.exports = new NZBParser();
