/**
 * NZB Generator - Creates valid NZB XML files from file metadata and segments
 * 
 * An NZB file is an XML document that describes which Usenet articles to download
 * to reconstruct a file or set of files. This module generates valid NZB files.
 * 
 * NZB XML structure:
 * <?xml version="1.0" encoding="ISO-8859-1" ?>
 * <!DOCTYPE nzb PUBLIC "-//newzBin//DTD NZB 1.0//EN" "http://www.newzbin.com/DTD/nzb-1.0.dtd">
 * <nzb xmlns="http://www.newzbin.com/DTD/2003/nzb">
 *   <head>
 *     <meta type="password">optional</meta>
 *   </head>
 *   <file poster="..." date="..." subject="...">
 *     <groups>
 *       <group>alt.binaries.multimedia</group>
 *     </groups>
 *     <segments>
 *       <segment bytes="12345" number="1">&lt;message-id-1@news&gt;</segment>
 *       <segment bytes="12346" number="2">&lt;message-id-2@news&gt;</segment>
 *     </segments>
 *   </file>
 * </nzb>
 */

const crypto = require('crypto');
const fs = require('fs');
const { formatNewsgroups } = require('./newsgroupUtils');

/**
 * Generate an NZB XML string from file and segment data
 * 
 * @param {object} options
 * @param {string} options.title - NZB title (used for display)
 * @param {string} options.poster - Poster name/email
 * @param {string|string[]} options.newsgroup - Target newsgroup(s)
 * @param {string} options.password - Optional password
 * @param {Date} options.postDate - Post date (defaults to now)
 * @param {Array<object>} options.files - Array of file objects
 * @returns {string} NZB XML content
 */
function generateNZB(options) {
  const {
    title = 'Untitled',
    poster = 'NZBarr <user@example.com>',
    newsgroup = 'alt.binaries.multimedia',
    password = null,
    postDate = new Date(),
    files = []
  } = options;

  const newsgroups = formatNewsgroups(newsgroup);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE nzb PUBLIC "-//newzBin//DTD NZB 1.1//EN" "http://www.newzbin.com/DTD/nzb-1.1.dtd">\n';
  xml += '<nzb xmlns="http://www.newzbin.com/DTD/2003/nzb" xmlns:newzbin="http://www.newzbin.com/XML/1.0/">\n';

  // Head section with optional password
  if (password || files.some(f => f.password)) {
    const pw = password || files.find(f => f.password)?.password;
    xml += '<head>\n';
    xml += `  <meta type="password">${escapeXml(pw)}</meta>\n`;
    xml += '</head>\n';
  }

  // Generate file entries
  for (const file of files) {
    const fileSubject = file.subject || `"${file.name}" <${poster}>`;
    const fileDate = file.postDate ? Math.floor(file.postDate.getTime() / 1000) : Math.floor(postDate.getTime() / 1000);
    const messageId = file.messageId || generateMessageId();

    xml += `<file poster="${escapeXml(poster)}" date="${fileDate}" subject="${escapeXml(fileSubject)}">\n`;
    xml += '  <groups>\n';
    for (const group of newsgroups) {
      xml += `    <group>${escapeXml(group)}</group>\n`;
    }
    xml += '  </groups>\n';
    xml += '  <segments>\n';

    for (const segment of file.segments) {
      // NZB format: message ID without angle brackets
      const rawId = segment.messageId.replace(/^<|>$/g, '');
      // Use the message ID as-is (e.g., "part1of10.abc123@NZBarr")
      const segId = rawId || `part${segment.number}of${file.segments.length}.${crypto.randomBytes(8).toString('hex')}@NZBarr`;
      xml += `    <segment bytes="${segment.bytes}" number="${segment.number}">${escapeXml(segId)}</segment>\n`;
    }

    xml += '  </segments>\n';
    xml += '</file>\n';
  }

  xml += '</nzb>\n';

  return xml;
}

/**
 * Generate an NZB from a single file split into segments
 * Convenience wrapper for posting a single file
 * 
 * @param {object} options
 * @param {string} options.filename - File name
 * @param {string} options.subject - Usenet subject line
 * @param {string} options.poster - Poster name/email
 * @param {string} options.newsgroup - Target newsgroup
 * @param {string} options.password - Optional password
 * @param {Array<{messageId: string, bytes: number, number: number}>} options.segments - Segment metadata
 * @returns {string} NZB XML content
 */
function generateNZBFromSegments(options) {
  return generateNZB({
    title: options.filename,
    poster: options.poster || 'NZBarr <user@example.com>',
    newsgroup: options.newsgroup || 'alt.binaries.multimedia',
    password: options.password,
    files: [{
      name: options.filename,
      subject: options.subject || `"${options.filename}" <${options.poster || 'NZBarr <user@example.com>'}>`,
      segments: options.segments
    }]
  });
}

/**
 * Generate an NZB file for multiple files, each with their segments
 * 
 * @param {object} options
 * @param {string} options.title - NZB collection title
 * @param {string} options.poster - Poster name/email
 * @param {string} options.newsgroup - Target newsgroup
 * @param {string} options.password - Optional password
 * @param {Array<{name: string, subject?: string, segments: Array<{messageId: string, bytes: number, number: number}>}>} options.files
 * @returns {string} NZB XML content
 */
function generateNZBFromFiles(options) {
  return generateNZB({
    title: options.title || 'NZBarr Collection',
    poster: options.poster || 'NZBarr <user@example.com>',
    newsgroup: options.newsgroup || 'alt.binaries.multimedia',
    password: options.password,
    files: options.files.map(f => ({
      name: f.name,
      subject: f.subject || `"${f.name}" <${options.poster || 'NZBarr <user@example.com>'}>`,
      segments: f.segments
    }))
  });
}

/**
 * Save NZB content to a file (plain XML)
 * 
 * @param {string} filePath - Output file path
 * @param {string} nzbContent - NZB XML content
 * @returns {string} The saved file path
 */
function saveNZBToFile(filePath, nzbContent) {
  fs.writeFileSync(filePath, nzbContent, 'utf8');
  return filePath;
}

/**
 * Generate a unique message ID for a posted article
 * 
 * @param {string} prefix - Optional prefix (default: random hash)
 * @param {string} domain - Optional domain (default: news.nzbarr.local)
 * @returns {string} Message ID like "<hash@news.nzbarr.local>"
 */
function generateMessageId(prefix, domain) {
  const hash = prefix || crypto.randomBytes(16).toString('hex');
  const d = domain || 'news.nzbarr.local';
  return `<${hash}@${d}>`;
}

/**
 * Escape special XML characters
 * @param {string} str 
 * @returns {string}
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a GUID for the NZB (used for tracking)
 * @param {string} filename 
 * @returns {string} 32-character SHA-256 hash
 */
function generateNZBGuid(filename) {
  return crypto.createHash('sha256').update(filename).digest('hex').substring(0, 32);
}

module.exports = {
  generateNZB,
  generateNZBFromSegments,
  generateNZBFromFiles,
  saveNZBToFile,
  generateMessageId,
  generateNZBGuid,
  escapeXml
};
