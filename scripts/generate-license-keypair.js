#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const secretsDir = path.join(projectRoot, '.local-secrets', 'license-signing');
const privateKeyPath = path.join(secretsDir, 'license-private-key.pem');
const publicKeyPath = path.join(secretsDir, 'license-public-key.pem');
const configPath = path.join(projectRoot, 'config', 'license-public-keys.json');

const args = process.argv.slice(2);
const force = args.includes('--force');
const keyIdArg = args.find(arg => arg.startsWith('--key-id='));
const keyId = keyIdArg ? keyIdArg.slice('--key-id='.length).trim() : '';
const finalKeyId = keyId || `prod-${new Date().toISOString().slice(0, 10)}`;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFileSafe(filePath, content) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`Refusing to overwrite existing file without --force: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  if (filePath.endsWith('.pem')) {
    fs.chmodSync(filePath, 0o600);
  }
}

function loadExistingKeys() {
  if (!fs.existsSync(configPath)) {
    return [];
  }

  const raw = fs.readFileSync(configPath, 'utf8').trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function savePublicKeyEntry(publicKeyPem) {
  const existing = loadExistingKeys();
  const next = existing.filter(entry => String(entry?.keyId || '') !== finalKeyId);
  next.push({
    keyId: finalKeyId,
    publicKeyPem
  });
  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

function main() {
  ensureDir(secretsDir);

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

  writeFileSafe(privateKeyPath, privatePem);
  writeFileSafe(publicKeyPath, publicPem);
  savePublicKeyEntry(publicPem);

  console.log('License signing keys generated.');
  console.log(`Key ID: ${finalKeyId}`);
  console.log(`Private key (server only): ${privateKeyPath}`);
  console.log(`Public key: ${publicKeyPath}`);
  console.log(`NZBarr trusted keys updated: ${configPath}`);
}

try {
  main();
} catch (error) {
  console.error(`Key generation failed: ${error.message}`);
  process.exit(1);
}
