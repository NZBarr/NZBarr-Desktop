// NZBarr Desktop - NNTP Client (Fixed)
const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

class NntpClient {
  constructor() {
    this.connected = false;
    this.socket = null;
    this.config = {};
    this.timeoutMs = 120000;
  }

  normalizeSegment(segment) {
    if (!segment) return { messageId: null, bytes: 0 };
    return {
      messageId: segment.messageId || segment._ || null,
      bytes: segment.bytes || segment.$?.bytes || 0
    };
  }

  sanitizeCommandForLogs(command) {
    if (!command) return '';
    if (command.toUpperCase().startsWith('AUTHINFO PASS ')) {
      return 'AUTHINFO PASS [REDACTED]';
    }
    return command;
  }

  isMultilineResponseCode(code) {
    return new Set([100, 101, 211, 215, 220, 221, 222, 224, 225, 230, 231]).has(code);
  }

  /**
   * Connect to NNTP server
   */
  async connect(config) {
    this.config = config;

    return new Promise((resolve, reject) => {
      try {
        const connectFn = config.ssl ? tls.connect : net.connect;

        this.socket = connectFn({
          host: config.server,
          port: config.port || (config.ssl ? 563 : 119),
          rejectUnauthorized: false
        });

        this.socket.setTimeout(300000); // 5 min socket idle timeout
        this.socket.setEncoding('latin1');

        let greetingBuffer = '';
        const dataHandler = (data) => {
          greetingBuffer += data;
          const code = parseInt(greetingBuffer.substring(0, 3));

          if (!isNaN(code) && code >= 100) {
            this.socket.removeListener('data', dataHandler);

            if (code === 200 || code === 201) {
              this.connected = true;
              resolve();
            } else {
              reject(new Error(`Server error: ${greetingBuffer}`));
              this.socket.destroy();
            }
          }
        };

        this.socket.on('data', dataHandler);
        this.socket.on('error', (err) => {
          reject(new Error(`NNTP connection error: ${err.message}`));
        });
        this.socket.on('timeout', () => {
          reject(new Error('NNTP connection timeout'));
          this.socket.destroy();
        });
      } catch (error) {
        reject(error);
      }
    }).then(() => this.authenticate());
  }

  /**
   * Authenticate with NNTP server
   */
  async authenticate() {
    return new Promise((resolve, reject) => {
      const { username, password } = this.config;

      this.sendCommand(`AUTHINFO USER ${username}`)
        .then(response => {
          if (response.code === 381) {
            return this.sendCommand(`AUTHINFO PASS ${password}`);
          }
          return response;
        })
        .then(response => {
          if (response.code === 281 || response.code === 200 || response.code === 201) {
            console.log('  ✓ NNTP authenticated');
            resolve();
          } else {
            reject(new Error(`Authentication failed: ${response.message}`));
          }
        })
        .catch(reject);
    });
  }

  /**
   * Send NNTP command and get response
   * For multi-line responses (22x, 33x), reads line-by-line until ".\r\n" terminator
   */
  sendCommand(command, maxLines = null) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let headerCode = null;
      let lineCount = 0;
      let settled = false;
      const safeCommand = this.sanitizeCommandForLogs(command);
      const messageLines = [];

      const finishResolve = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        this.socket.removeListener('data', dataHandler);
        this.socket.removeListener('end', endHandler);
        this.socket.removeListener('close', closeHandler);
        this.socket.removeListener('error', errorHandler);
        resolve(value);
      };

      const finishReject = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        this.socket.removeListener('data', dataHandler);
        this.socket.removeListener('end', endHandler);
        this.socket.removeListener('close', closeHandler);
        this.socket.removeListener('error', errorHandler);
        reject(error);
      };

      const endHandler = () => {
        finishReject(new Error(`NNTP connection ended while waiting for response to: ${safeCommand}`));
      };

      const closeHandler = () => {
        finishReject(new Error(`NNTP connection closed while waiting for response to: ${safeCommand}`));
      };

      const errorHandler = (error) => {
        finishReject(new Error(`NNTP socket error during command ${safeCommand}: ${error.message}`));
      };

      const dataHandler = (data) => {
        buffer += data;

        // Process line by line
        while (true) {
          const nlIdx = buffer.indexOf('\n');
          if (nlIdx === -1) break;

          const line = buffer.substring(0, nlIdx);
          buffer = buffer.substring(nlIdx + 1);
          lineCount++;

          if (maxLines && lineCount > maxLines) {
            finishResolve({ code: headerCode, message: 'Max lines reached', truncated: true });
            return;
          }

          if (headerCode === null) {
            // First line - get status code
            headerCode = parseInt(line.substring(0, 3));
            if (isNaN(headerCode)) {
              finishReject(new Error(`Invalid NNTP response: ${line}`));
              return;
            }

            // Most NNTP responses are single-line. Only a small set are multi-line.
            if (!this.isMultilineResponseCode(headerCode)) {
              finishResolve({ code: headerCode, message: line.trim() });
              return;
            }
            // Multi-line response - continue reading
          }

          // Check for multi-line terminator: line containing only "."
          if (line === '.' || line === '.\r') {
            finishResolve({ code: headerCode, message: messageLines.join('\n') });
            return;
          }

          // Handle NNTP byte-stuffing: ".." -> "."
          let content = line;
          if (content.endsWith('\r')) content = content.slice(0, -1);
          if (content.startsWith('..')) content = content.substring(1);
          messageLines.push(content);
        }
      };

      this.socket.on('data', dataHandler);
      this.socket.once('end', endHandler);
      this.socket.once('close', closeHandler);
      this.socket.once('error', errorHandler);
      this.socket.write(command + '\r\n');

      // Timeout
      const timeoutHandle = setTimeout(() => {
        finishReject(new Error(`Command timeout after ${this.timeoutMs}ms: ${safeCommand.substring(0, 80)}`));
      }, this.timeoutMs);
    });
  }

  /**
   * Fetch article by Message-ID and decode yEnc
   */
  async fetchArticle(messageId) {
    // Ensure messageId has < >
    const id = messageId.startsWith('<') ? messageId : `<${messageId}>`;
    const response = await this.sendCommand(`ARTICLE ${id}`);

    if (response.code !== 220 && response.code !== 222) {
      throw new Error(`Failed to fetch article: ${response.message?.substring(0, 100)}`);
    }

    return this.yDecode(response.message);
  }

  /**
   * Download complete file from Usenet by segments
   */
  async downloadFile(segments, outputPath, onProgress) {
    const downloaded = [];
    let totalBytes = 0;
    let downloadedBytes = 0;
    const normalizedSegments = segments.map(segment => this.normalizeSegment(segment));
    let successfulSegments = 0;

    for (let i = 0; i < normalizedSegments.length; i++) {
      const segment = normalizedSegments[i];
      try {
        if (!segment.messageId) {
          throw new Error('Segment missing message ID');
        }
        const data = await this.fetchArticle(segment.messageId);
        if (data) {
          downloaded.push(data);
          totalBytes += data.length;
          downloadedBytes += parseInt(segment.bytes) || 0;
          successfulSegments += 1;
        }

        if (onProgress) {
          onProgress({
            segment: i + 1,
            total: normalizedSegments.length,
            downloadedBytes,
            totalBytes: normalizedSegments.reduce((sum, s) => sum + (parseInt(s.bytes) || 0), 0)
          });
        }
      } catch (error) {
        console.log(`  ⚠ Failed to download segment ${i + 1}: ${error.message}`);
      }
    }

    // Concatenate all data
    const fileData = Buffer.concat(downloaded);

    if (successfulSegments === 0 || fileData.length === 0) {
      throw new Error('No segments could be downloaded for this file');
    }

    // Write to output path
    if (outputPath) {
      fs.writeFileSync(outputPath, fileData);
    }

    return {
      data: fileData,
      size: fileData.length,
      outputPath
    };
  }

  /**
   * Download article with byte limit (for partial downloads)
   */
  async fetchArticlePartial(messageId, maxBytes) {
    const id = messageId.startsWith('<') ? messageId : `<${messageId}>`;

    return new Promise((resolve, reject) => {
      let buffer = '';
      let headerCode = null;
      let dataStart = false;
      let dataBuffer = '';
      let totalBytes = 0;

      const dataHandler = (data) => {
        buffer += data;

        while (true) {
          const nlIdx = buffer.indexOf('\n');
          if (nlIdx === -1) break;

          const line = buffer.substring(0, nlIdx);
          buffer = buffer.substring(nlIdx + 1);

          if (headerCode === null) {
            headerCode = parseInt(line.substring(0, 3));
            if (isNaN(headerCode)) {
              this.socket.removeListener('data', dataHandler);
              reject(new Error(`Invalid NNTP response`));
              return;
            }
            if (headerCode === 220 || headerCode === 222) {
              dataStart = true;
            } else {
              this.socket.removeListener('data', dataHandler);
              resolve(null);
              return;
            }
            continue;
          }

          if (!dataStart) continue;

          // Check for terminator
          if (line === '.' || line === '.\r') {
            this.socket.removeListener('data', dataHandler);
            resolve(Buffer.from(dataBuffer, 'latin1'));
            return;
          }

          // Accumulate data (with byte-stuffing removal)
          let content = line;
          if (content.endsWith('\r')) content = content.slice(0, -1);
          if (content.startsWith('.') && content.length > 1 && content[1] === '.') {
            content = content.substring(1);
          }

          dataBuffer += content + '\n';
          totalBytes += content.length + 1;

          if (maxBytes && totalBytes >= maxBytes) {
            this.socket.removeListener('data', dataHandler);
            resolve(Buffer.from(dataBuffer, 'latin1'));
            return;
          }
        }
      };

      this.socket.on('data', dataHandler);
      this.socket.write(`ARTICLE ${id}\r\n`);

      setTimeout(() => {
        this.socket.removeListener('data', dataHandler);
        if (dataBuffer.length > 0) {
          resolve(Buffer.from(dataBuffer, 'latin1'));
        } else {
          reject(new Error('Partial article timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Post an article to Usenet
   * 
   * @param {object} options
   * @param {string} options.subject - Article subject
   * @param {string} options.from - Poster name/email
   * @param {string} options.newsgroups - Comma-separated newsgroups
   * @param {string} options.body - Article body (can include yEnc encoded data)
   * @param {string} options.messageId - Optional custom message ID
   * @returns {Promise<{success: boolean, messageId: string}>}
   */
  async postArticle(options) {
    const {
      subject,
      from,
      newsgroups,
      body,
      messageId: customMessageId
    } = options;

    if (!this.connected) {
      throw new Error('Not connected to NNTP server');
    }

    // Generate a unique Message-ID if not provided
    const messageId = customMessageId || this._generateMessageId(options.partNumber, options.totalParts);

    // Build article headers as Buffer
    const now = new Date().toUTCString().replace('GMT', '');
    let headers = `Path: !not-for-mail\r\n`;
    headers += `From: ${from}\r\n`;
    headers += `Subject: ${subject}\r\n`;
    headers += `Newsgroups: ${newsgroups}\r\n`;
    headers += `Message-ID: <${messageId}>\r\n`;
    headers += `Date: ${now}\r\n`;
    headers += `User-Agent: NZBarr/1.0\r\n`;
    headers += `X-Newsreader: NZBarr Desktop\r\n`;
    headers += `\r\n`; // Blank line separates headers from body
    const headerBuffer = Buffer.from(headers, 'utf8');

    // The yEnc body is already a string from _encodeBody()
    // Convert it to latin1 buffer to preserve raw bytes
    const bodyBuffer = Buffer.from(body, 'latin1');

    // Combine header + body
    let article = Buffer.concat([headerBuffer, bodyBuffer]);

    // Dot-stuff: escape lines starting with .
    // We need to work with the string representation for dot-stuffing
    const articleStr = article.toString('latin1');
    const stuffedArticle = articleStr.replace(/^\./gm, '..');
    const terminator = stuffedArticle + '\r\n.\r\n';

    // Send POST command
    const postResponse = await this.sendCommand('POST');

    if (postResponse.code !== 340) {
      throw new Error(`POST command rejected: ${postResponse.message}`);
    }

    // Code 340 means "send article to be posted"
    // Write the article as latin1 to preserve raw bytes
    const sendResponse = await this._writeArticle(terminator);

    if (sendResponse.code !== 240) {
      throw new Error(`Article posting failed: ${sendResponse.message}`);
    }

    console.log(`[NNTP] Posted article: ${messageId}`);

    return {
      success: true,
      messageId
    };
  }

  /**
   * Post a file in multiple parts to Usenet
   * 
   * Streams from disk on-demand — each part is read, encoded, and posted
   * individually. Avoids loading the entire file into memory.
   * 
   * @param {object} options
   * @param {string} options.filePath - Path to the file on disk
   * @param {string} options.filename - Name of the file (defaults to basename)
   * @param {string} options.from - Poster name/email
   * @param {string} options.newsgroups - Target newsgroups
   * @param {number} options.maxPartSize - Maximum part size in bytes (default: 1MB)
   * @param {string} options.password - Optional password (included in subject)
   * @param {function} onProgress - Optional progress callback
   * @returns {Promise<{success: boolean, messageIds: string[], nzbData: object}>}
   */
  async postFileInParts(options, onProgress) {
    const {
      filePath,
      filename: givenFilename,
      from,
      newsgroups,
      maxPartSize = 716800, // ~700KB per article (ngpost default)
      password = null,
      retryCount = 10,
      threadCount = 8
    } = options;

    if (!this.connected) {
      throw new Error('Not connected to NNTP server');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const yenc = require('./yencEncoder');
    const path = require('path');
    const filename = givenFilename || path.basename(filePath);

    // Create streaming multipart descriptor (reads from disk on-demand)
    const fileParts = yenc.splitFileIntoParts(filePath, { filename, maxPartSize });
    const totalParts = fileParts.totalParts;
    const messageIds = [];
    const segments = [];

    // Build subject line with optional password
    let subject = `"${filename}"`;
    if (password) {
      subject += ` "${password}"`;
    }
    subject += ` (${totalParts} parts)`;

    console.log(`[NNTP] Posting ${filename} (${(fileParts.fileSize / (1024*1024)).toFixed(1)} MB) in ${totalParts} part(s) to ${newsgroups}`);
    console.log(`[NNTP] Settings: articleSize=${maxPartSize}, retries=${retryCount}, threads=${threadCount}`);

    // Post parts with retry support and optional threading
    if (threadCount <= 1) {
      // Simple serial posting (reliable, one NNTP connection)
      for (let i = 0; i < totalParts; i++) {
        const messageId = await this._postPartWithRetry(
          fileParts, i, { subject, from, newsgroups, password }, retryCount
        );
        messageIds.push(messageId);
        const partInfo = fileParts.getPart(i);
        segments.push({ messageId, bytes: partInfo.data.length, number: partInfo.partNumber });

        if (onProgress) {
          onProgress({ part: i + 1, totalParts, messageId, bytesPosted: partInfo.partEnd, totalSize: fileParts.fileSize });
        }
      }
    } else {
      // Parallel posting with multiple NNTP connections (one per thread)
      await this._postPartsInParallel(fileParts, { subject, from, newsgroups, password, retryCount, threadCount, onProgress }, messageIds, segments);
    }

    console.log(`[NNTP] Successfully posted all ${totalParts} parts of ${filename}`);

    return {
      success: true,
      messageIds,
      nzbData: {
        filename,
        subject,
        from,
        newsgroups,
        totalSize: fileParts.fileSize,
        totalParts,
        segments
      }
    };
  }

  /**
   * Post a single part with retries
   */
  async _postPartWithRetry(fileParts, partIndex, options, retryCount) {
    const { subject, from, newsgroups, password } = options;
    const totalParts = fileParts.totalParts;
    const i = partIndex;
    const partSubject = i === 0 ? subject : `"${fileParts.filename}" (${i + 1}/${totalParts})`;

    let lastError = null;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[NNTP] Retry ${attempt}/${retryCount} for part ${i + 1}/${totalParts}`);
          await this.sleep(1000 * attempt); // Exponential backoff
        }

        const encoded = fileParts.encodePart(i);
        const result = await this.postArticle({
          subject: partSubject, from, newsgroups, body: encoded,
          partNumber: i + 1, totalParts
        });
        return result.messageId; // Success
      } catch (error) {
        lastError = error;
        console.warn(`[NNTP] Part ${i + 1}/${totalParts} attempt ${attempt + 1} failed: ${error.message}`);
      }
    }

    throw new Error(`Failed to post part ${i + 1}/${totalParts} after ${retryCount + 1} attempts: ${lastError.message}`);
  }

  /**
   * Post parts in parallel using multiple NNTP connections
   */
  async _postPartsInParallel(fileParts, options, messageIds, segments) {
    const { subject, from, newsgroups, password, retryCount, threadCount, onProgress } = options;
    const totalParts = fileParts.totalParts;
    const nntpSettings = this.config;

    // Work queue (list of part indices)
    let nextIndex = 0;

    // Worker function for a single thread
    const worker = async (threadNum) => {
      // Create a new NNTP connection for this worker
      const workerClient = new (require('./nntpClient').NntpClient)();
      try {
        await workerClient.connect(nntpSettings);

        while (true) {
          const partIndex = nextIndex++;
          if (partIndex >= totalParts) break;

          const messageId = await this._postPartWithRetry.call(workerClient, fileParts, partIndex, { subject, from, newsgroups, password }, retryCount);
          messageIds[partIndex] = messageId;
          const partInfo = fileParts.getPart(partIndex);
          segments[partIndex] = { messageId, bytes: partInfo.data.length, number: partInfo.partNumber };

          if (onProgress) {
            onProgress({ part: partIndex + 1, totalParts, messageId, bytesPosted: partInfo.partEnd, totalSize: fileParts.fileSize });
          }
        }
      } finally {
        workerClient.disconnect();
      }
    };

    // Launch workers in parallel (cap at totalParts)
    const workers = [];
    for (let t = 0; t < Math.min(threadCount, totalParts); t++) {
      workers.push(worker(t));
    }

    await Promise.all(workers);
  }

  /**
   * Send a raw command to the NNTP server (for multi-line article data)
   * @param {string} data - Raw data to send
   * @returns {Promise<{code: number, message: string}>}
   */
  async sendCommandRaw(data) {
    return new Promise((resolve, reject) => {
      let responseBuffer = '';
      const dataHandler = (data) => {
        responseBuffer += data;
        
        // Check if we have a complete response
        const lines = responseBuffer.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          // Terminal dot indicates end of multi-line response
          if (line === '.') {
            const code = parseInt(responseBuffer.substring(0, 3));
            resolve({ code, message: responseBuffer });
            this.socket.removeListener('data', dataHandler);
            return;
          }
          // Single-line response
          if (!isNaN(parseInt(line.substring(0, 3)))) {
            const code = parseInt(line.substring(0, 3));
            if (code < 400) {
              resolve({ code, message: responseBuffer });
              this.socket.removeListener('data', dataHandler);
              return;
            }
          }
        }
      };

      this.socket.on('data', dataHandler);
      
      const timeoutHandle = setTimeout(() => {
        this.socket.removeListener('data', dataHandler);
        reject(new Error('Command timeout'));
      }, this.timeoutMs);

      this.socket.once('close', () => {
        clearTimeout(timeoutHandle);
        this.socket.removeListener('data', dataHandler);
        reject(new Error('Connection closed'));
      });

      this.socket.write(data, 'latin1');
    });
  }

  /**
   * Write article data to the NNTP socket using latin1 encoding
   * to preserve raw bytes in the yEnc encoded body.
   */
  async _writeArticle(articleStr) {
    return new Promise((resolve, reject) => {
      let responseBuffer = '';
      const dataHandler = (data) => {
        responseBuffer += data;

        // Check if we have a complete response
        const lines = responseBuffer.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          // Terminal dot indicates end of multi-line response
          if (line === '.') {
            const code = parseInt(responseBuffer.substring(0, 3));
            resolve({ code, message: responseBuffer });
            this.socket.removeListener('data', dataHandler);
            return;
          }
          // Single-line response
          if (!isNaN(parseInt(line.substring(0, 3)))) {
            const code = parseInt(line.substring(0, 3));
            if (code < 400) {
              resolve({ code, message: responseBuffer });
              this.socket.removeListener('data', dataHandler);
              return;
            }
          }
        }
      };

      this.socket.on('data', dataHandler);

      const timeoutHandle = setTimeout(() => {
        this.socket.removeListener('data', dataHandler);
        reject(new Error('Article write timeout'));
      }, this.timeoutMs);

      this.socket.once('close', () => {
        clearTimeout(timeoutHandle);
        this.socket.removeListener('data', dataHandler);
        reject(new Error('Connection closed during article write'));
      });

      // Write with latin1 encoding to preserve raw bytes in yEnc body
      this.socket.write(articleStr, 'latin1');
    });
  }

  /**
   * Generate a unique message ID in ngPost-compatible format
   * Format: part{N}of{total}.{randomhash}@nzbarr
   */
  _generateMessageId(partNum, totalParts) {
    const crypto = require('crypto');
    const hash = crypto.randomBytes(16).toString('hex');
    const part = partNum !== undefined ? `part${partNum}of${totalParts}` : `msg`;
    return `${part}.${hash}@nzbarr`;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Decode yEnc encoded article
   */
  yDecode(articleText) {
    if (!articleText) return null;
    let text = articleText;

    const headerStart = text.indexOf('\r\n\r\n');
    if (headerStart !== -1) {
      text = text.substring(headerStart + 4);
    } else {
      const altHeaderStart = text.indexOf('\n\n');
      if (altHeaderStart !== -1) {
        text = text.substring(altHeaderStart + 2);
      }
    }

    let dataStart = 0;
    const yPartPos = text.indexOf('=ypart ');
    const yBeginPos = text.indexOf('=ybegin ');
    if (yPartPos !== -1) {
      dataStart = text.indexOf('\n', yPartPos) + 1;
    } else if (yBeginPos !== -1) {
      dataStart = text.indexOf('\n', yBeginPos) + 1;
    }

    let dataEnd = text.length;
    const yEndPos = text.indexOf('\n=yend');
    const yEndPosCRLF = text.indexOf('\r\n=yend');
    if (yEndPos !== -1) {
      dataEnd = yEndPos;
    } else if (yEndPosCRLF !== -1) {
      dataEnd = yEndPosCRLF;
    }

    let body = text.substring(dataStart, dataEnd);
    body = body.replace(/\r/g, '').replace(/\n/g, '');

    const unescaped = [];
    for (let i = 0; i < body.length; i++) {
      if (body[i] === '=' && i + 1 < body.length) {
        unescaped.push(String.fromCharCode((body.charCodeAt(i + 1) - 64 + 256) % 256));
        i += 1;
      } else {
        unescaped.push(body[i]);
      }
    }

    const decoded = Buffer.alloc(unescaped.length);
    for (let i = 0; i < unescaped.length; i++) {
      decoded[i] = (unescaped[i].charCodeAt(0) - 42 + 256) % 256;
    }

    return decoded;
  }

  /**
   * Set timeout
   */
  setTimeout(ms) {
    this.timeoutMs = ms;
  }

  /**
   * Disconnect from NNTP server
   */
  disconnect() {
    if (this.socket) {
      try {
        this.socket.write('QUIT\r\n');
        this.socket.end();
      } catch (e) {}
      this.connected = false;
    }
  }
}

const instance = new NntpClient();
instance.NntpClient = NntpClient;

module.exports = instance;
