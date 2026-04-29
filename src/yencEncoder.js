/**
 * yEnc Encoder - Memory-efficient yEnc encoding for Usenet posting
 *
 * yEnc is a binary-to-text encoding scheme used for posting binary files
 * to Usenet. It's more efficient than uuencode or base64 (~30% overhead).
 *
 * Key design: lazy/deferred encoding of parts to avoid loading
 * multi-gigabyte encoded strings into memory.
 */

const fs = require('fs');
const crypto = require('crypto');

/**
 * CRC32 lookup table (lazy-initialized, cached)
 */
let _crcTable = null;

function _getCrcTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    _crcTable[i] = crc >>> 0;
  }
  return _crcTable;
}

/**
 * CRC32 of a buffer (uses Uint32 for performance)
 * @param {Buffer} data
 * @returns {number} Unsigned 32-bit CRC
 */
function crc32(data) {
  const table = _getCrcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    const index = (crc ^ data[i]) & 0xFF;
    crc = (crc >>> 8) ^ table[index];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Encode a Buffer body into a string (memory-efficient, chunk-based)
 *
 * Uses Uint8Array directly and builds output in chunks to avoid
 * massive string concatenation overhead.
 *
 * @param {Buffer} data
 * @param {number} lineLength
 * @returns {string}
 */
function _encodeBody(data, lineLength) {
  // Pre-allocate a rough estimate: each byte becomes ~1.4 chars (128 data + CRLF every 128 bytes)
  // Plus ~2% of bytes need escaping (adds one '=' char each)
  const estimatedSize = Math.ceil(data.length * 1.5);
  
  // We build the result in chunks of ~64KB to avoid massive string reallocation
  const chunkSize = 64 * 1024;
  let chunk = '';
  let result = '';
  let linePos = 0;

  for (let i = 0; i < data.length; i++) {
    let byte = (data[i] - 42) & 0xFF;
    const needsEscape = byte === 0x3D || byte === 0x00 || byte === 0x0A || byte === 0x0D;

    if (needsEscape) {
      chunk += '=';
      byte = (byte + 64) & 0xFF;
    }

    chunk += String.fromCharCode(byte);
    linePos++;

    if (linePos >= lineLength) {
      chunk += '\r\n';
      linePos = 0;
    }

    // Flush chunk when it gets large enough
    if (chunk.length > chunkSize) {
      result += chunk;
      chunk = '';
    }
  }

  // Append remaining chunk
  if (chunk.length > 0) {
    result += chunk;
  }

  return result;
}

/**
 * yEnc encode a buffer and return the encoded string with headers
 *
 * @param {Buffer} data - Binary data to encode
 * @param {object} options - Encoding options
 * @param {string} options.filename - Name of the file
 * @param {number} options.partNumber - Part number (for multipart, 1-based)
 * @param {number} options.totalParts - Total number of parts
 * @param {number} options.fileSize - Total file size in bytes (for multipart)
 * @param {number} options.partBegin - Start byte offset of this part (for multipart)
 * @param {number} options.partEnd - End byte offset of this part (for multipart)
 * @param {number} options.lineLength - Line wrap length (default: 128)
 * @returns {string} yEnc-encoded string with headers
 */
function yEncode(data, options = {}) {
  const {
    filename = 'unknown.bin',
    partNumber = 1,
    totalParts = 1,
    fileSize = data.length,
    partBegin = 0,
    partEnd = data.length,
    lineLength = 128
  } = options;

  let result = '';

  // =ybegin header
  result += `=ybegin line=${lineLength} size=${fileSize} name=${filename}\n`;

  // =ypart header (only for multipart)
  if (totalParts > 1) {
    result += `=ypart part=${partNumber} begin=${partBegin + 1} end=${partEnd}\n`;
  }

  // Encode the data body
  result += _encodeBody(data, lineLength);

  // Calculate CRC32
  const crc = crc32(data);

  // =yend header
  result += `\n=yend size=${data.length} part=${partNumber} crc=${crc.toString(16).toUpperCase().padStart(8, '0')}\n`;

  return result;
}

/**
 * File-based multipart posting with lazy encoding
 * 
 * Instead of loading the entire file into memory, this reads chunks
 * from disk, encodes them on-the-fly, and returns only the metadata
 * needed for posting. Each part is encoded just before posting.
 *
 * @param {string} filePath - Path to the file to encode
 * @param {object} options
 * @param {string} options.filename - File name (optional, defaults to basename)
 * @param {number} options.maxPartSize - Maximum part size in bytes (default: 1MB)
 * @param {number} options.lineLength - yEnc line length (default: 128)
 * @returns {object} Multipart descriptor with file info and part metadata
 */
function splitFileIntoParts(filePath, options = {}) {
  const {
    filename = null,
    maxPartSize = 1024 * 1024, // 1MB per part
    lineLength = 128
  } = options;

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const actualFilename = filename || require('path').basename(filePath);
  const totalParts = Math.ceil(fileSize / maxPartSize);

  return {
    filePath,
    filename: actualFilename,
    fileSize,
    totalParts,
    maxPartSize,
    lineLength,
    /**
     * Get part metadata (byte range, CRC, etc.) without encoding
     * @param {number} partIndex - 0-based part index
     * @returns {{partNumber: number, totalParts: number, data: Buffer, partBegin: number, partEnd: number, crc: number}}
     */
    getPart(partIndex) {
      if (partIndex < 0 || partIndex >= totalParts) {
        throw new Error(`Part index ${partIndex} out of range (0-${totalParts - 1})`);
      }

      const partBegin = partIndex * maxPartSize;
      const partEnd = Math.min(partBegin + maxPartSize, fileSize);
      const partSize = partEnd - partBegin;

      // Read only this chunk from disk
      const buffer = Buffer.alloc(partSize);
      const fd = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd, buffer, 0, partSize, partBegin);
      } finally {
        fs.closeSync(fd);
      }

      const crc = crc32(buffer);

      return {
        partNumber: partIndex + 1,
        totalParts,
        data: buffer,
        partBegin,
        partEnd,
        crc
      };
    },
    /**
     * Get the yEnc-encoded string for a specific part
     * @param {number} partIndex - 0-based part index
     * @returns {string} yEnc-encoded part with headers
     */
    encodePart(partIndex) {
      const part = this.getPart(partIndex);
      return yEncode(part.data, {
        filename: this.filename,
        partNumber: part.partNumber,
        totalParts: this.totalParts,
        fileSize: this.fileSize,
        partBegin: part.partBegin,
        partEnd: part.partEnd,
        lineLength: this.lineLength
      });
    }
  };
}

/**
 * Legacy: Split a Buffer into parts (kept for compatibility with tests)
 *
 * NOTE: This loads all parts into memory. For large files, use
 * `splitFileIntoParts()` instead to read from disk on-demand.
 *
 * @param {Buffer} fileData - Complete file data
 * @param {object} options
 * @param {string} options.filename - File name
 * @param {number} options.maxPartSize - Maximum size per part in bytes (default: 1MB)
 * @returns {Array<{partNumber: number, totalParts: number, data: Buffer, encoded: string}>}
 * @deprecated Use splitFileIntoParts() for large files
 */
function splitIntoParts(fileData, options = {}) {
  const {
    filename = 'unknown.bin',
    maxPartSize = 1024 * 1024 // 1MB per part
  } = options;

  const fileSize = fileData.length;
  const totalParts = Math.ceil(fileSize / maxPartSize);
  const parts = [];

  for (let i = 0; i < totalParts; i++) {
    const partBegin = i * maxPartSize;
    const partEnd = Math.min(partBegin + maxPartSize, fileSize);
    const partData = Buffer.from(fileData.slice(partBegin, partEnd));

    parts.push({
      partNumber: i + 1,
      totalParts,
      data: partData,
      encoded: null, // Lazy — encode on demand
      partBegin,
      partEnd,
      crc: crc32(partData)
    });
  }

  return parts;
}

module.exports = {
  yEncode,
  splitIntoParts,
  splitFileIntoParts,
  crc32
};
