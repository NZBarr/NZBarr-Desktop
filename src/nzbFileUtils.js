const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function isGzipBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function isGzipPath(filePath) {
  return /\.gz$/i.test(String(filePath || ''));
}

function readNZBBuffer(filePath) {
  const buffer = fs.readFileSync(filePath);
  return isGzipPath(filePath) || isGzipBuffer(buffer)
    ? zlib.gunzipSync(buffer)
    : buffer;
}

function readNZBContent(filePath) {
  return readNZBBuffer(filePath).toString('utf8');
}

function writeCompressedNZB(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content || ''), 'utf8');
  fs.writeFileSync(filePath, zlib.gzipSync(buffer, { level: 9 }));
}

function stripNZBExtension(fileName) {
  return String(fileName || '')
    .replace(/\.nzb\.gz$/i, '')
    .replace(/\.nzb$/i, '');
}

function stripStoredGUIDPrefix(fileName) {
  return String(fileName || '').replace(/^[a-f0-9]{32}-/i, '');
}

module.exports = {
  isGzipPath,
  readNZBBuffer,
  readNZBContent,
  writeCompressedNZB,
  stripNZBExtension,
  stripStoredGUIDPrefix
};
