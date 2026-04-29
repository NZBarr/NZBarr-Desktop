const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const os = require('os');
const net = require('net');
const appPaths = require('./appPaths');

class LicenseService {
  constructor(settingsRepository) {
    this.settingsRepository = settingsRepository;
    this.validationFreshnessWindowMs = 7 * 24 * 60 * 60 * 1000;
    this.allowedFutureSkewMs = 5 * 60 * 1000;
    this.bundledKeyEntries = null;
  }

  getMachineIdPath() {
    return path.join(appPaths.getBaseDataPath(), 'license-machine-id');
  }

  async getMachineId() {
    const filePath = this.getMachineIdPath();
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }

    const machineId = crypto.randomUUID();
    fs.writeFileSync(filePath, machineId, 'utf8');
    return machineId;
  }

  async getStatus() {
    const settings = await this.settingsRepository.getMany([
      'license_key',
      'license_verified',
      'license_status',
      'license_plan',
      'license_expires_at',
      'license_last_validated_at',
      'license_grace_until',
      'license_machine_id',
      'license_features_json',
      'license_customer_email',
      'license_message',
      'license_server_url',
      'license_signed_payload',
      'license_response_signature',
      'license_response_key_id',
      'license_response_alg',
      'license_signature_verified',
      'license_public_key_pem',
      'license_public_keys_json'
    ]);

    const machineId = settings.license_machine_id || await this.getMachineId();
    if (!settings.license_machine_id) {
      await this.settingsRepository.set('license_machine_id', machineId);
    }

    const serverUrl = settings.license_server_url || '';
    const statusFromSettings = this.normalizeLicensePayload({
      valid: settings.license_verified === '1',
      status: settings.license_status || (settings.license_key ? 'invalid' : 'free'),
      plan: settings.license_plan || 'free',
      expires_at: settings.license_expires_at || null,
      grace_until: settings.license_grace_until || null,
      issued_at: settings.license_last_validated_at || null,
      features: this.parseFeatures(settings.license_features_json),
      customer_email: settings.license_customer_email || '',
      message: settings.license_message || '',
      license_key: settings.license_key || '',
      machine_id: machineId
    });

    const signedCache = await this.readTrustedSignedCache({
      settings,
      expectedMachineId: machineId,
      expectedLicenseKey: settings.license_key || '',
      serverUrl
    });

    const trustedStatus = signedCache.payload ? this.normalizeLicensePayload(signedCache.payload) : statusFromSettings;
    const now = Date.now();
    const rawStatus = trustedStatus.status || 'free';
    const expiresAt = trustedStatus.expiresAt || null;
    const graceUntil = trustedStatus.graceUntil || null;
    const lastValidatedAt = trustedStatus.issuedAt || null;
    let effectiveStatus = rawStatus;
    let effectiveMessage = trustedStatus.message || '';

    const needsSignedTrust = !this.isLocalLicenseServer(serverUrl);
    const isPremiumState = rawStatus === 'active' || rawStatus === 'grace';

    if (needsSignedTrust && isPremiumState && !signedCache.payload) {
      effectiveStatus = 'free';
      effectiveMessage = signedCache.error || 'Unsigned or invalid license cache is not trusted for this server.';
    } else if (rawStatus === 'active' && expiresAt && new Date(expiresAt).getTime() < now) {
      if (graceUntil && new Date(graceUntil).getTime() >= now) {
        effectiveStatus = 'grace';
        if (!effectiveMessage) {
          effectiveMessage = 'License term ended and is currently in grace mode.';
        }
      } else {
        effectiveStatus = 'expired';
      }
    } else if (rawStatus === 'grace' && graceUntil && new Date(graceUntil).getTime() < now) {
      effectiveStatus = 'expired';
    } else if (rawStatus === 'expired' && graceUntil && new Date(graceUntil).getTime() >= now) {
      effectiveStatus = 'grace';
      if (!effectiveMessage) {
        effectiveMessage = 'License term ended and is currently in grace mode.';
      }
    } else if (isPremiumState && !this.isValidationFresh(lastValidatedAt)) {
      effectiveStatus = 'free';
      effectiveMessage = 'License validation is stale (older than 7 days). Refresh license to restore Premium access.';
    }

    const features = Array.isArray(trustedStatus.features) ? trustedStatus.features : [];

    return {
      key: settings.license_key || '',
      status: effectiveStatus,
      storedStatus: rawStatus,
      plan: trustedStatus.plan || 'free',
      expiresAt,
      lastValidatedAt,
      graceUntil,
      machineId,
      features,
      customerEmail: trustedStatus.customerEmail || '',
      message: effectiveMessage,
      serverUrl
    };
  }

  isValidationFresh(lastValidatedAt) {
    if (!lastValidatedAt) return false;
    const parsed = new Date(lastValidatedAt).getTime();
    if (Number.isNaN(parsed)) return false;
    return (Date.now() - parsed) <= this.validationFreshnessWindowMs;
  }

  canUseFeature(status, feature) {
    if (!feature) return true;
    if (status.status === 'active' || status.status === 'grace') {
      return status.features.includes(feature);
    }
    return false;
  }

  async clearLicense() {
    const machineId = await this.getMachineId();
    await this.settingsRepository.setMany({
      license_key: '',
      license_verified: '0',
      license_checked_at: '',
      license_status: 'free',
      license_plan: 'free',
      license_expires_at: '',
      license_last_validated_at: '',
      license_grace_until: '',
      license_machine_id: machineId,
      license_features_json: '[]',
      license_customer_email: '',
      license_message: 'No license active',
      license_signed_payload: '',
      license_response_signature: '',
      license_response_key_id: '',
      license_response_alg: '',
      license_signature_verified: '0'
    });

    return await this.getStatus();
  }

  async activateLicense({ key, serverUrl, appVersion, platform }) {
    if (!key || !String(key).trim()) {
      throw new Error('Please enter a license key');
    }

    const validationUrl = this.buildValidationUrl(serverUrl);
    const machineId = await this.getMachineId();
    const payload = {
      license_key: String(key).trim(),
      machine_id: machineId,
      app_version: appVersion || 'unknown',
      platform: platform || process.platform
    };

    const response = await this.postJson(validationUrl, payload);
    await this.persistLicenseResponse({
      key: payload.license_key,
      serverUrl: serverUrl || '',
      machineId,
      response
    });
    return await this.getStatus();
  }

  async refreshLicense({ appVersion, platform } = {}) {
    const current = await this.getStatus();
    if (!current.key) {
      throw new Error('No license key is stored yet');
    }
    if (!current.serverUrl) {
      throw new Error('No license server URL is configured');
    }

    const response = await this.postJson(this.buildValidationUrl(current.serverUrl), {
      license_key: current.key,
      machine_id: current.machineId,
      app_version: appVersion || 'unknown',
      platform: platform || process.platform
    });

    await this.persistLicenseResponse({
      key: current.key,
      serverUrl: current.serverUrl,
      machineId: current.machineId,
      response
    });
    return await this.getStatus();
  }

  buildValidationUrl(serverUrl) {
    if (!serverUrl || !String(serverUrl).trim()) {
      throw new Error('Please enter a license server URL');
    }

    const trimmed = String(serverUrl).trim().replace(/\/+$/, '');
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch (error) {
      throw new Error('Please enter a valid license server URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('License server URL must use http:// or https://');
    }

    if (/(\/api\/licenses\/validate|\/licenses\/validate|\/validate)$/i.test(trimmed)) {
      return trimmed;
    }
    return `${trimmed}/api/licenses/validate`;
  }

  async persistLicenseResponse({ key, serverUrl, machineId, response }) {
    const nowIso = new Date().toISOString();
    const validated = await this.extractAndValidateLicensePayload({
      key,
      machineId,
      serverUrl,
      response
    });

    const payload = validated.payload;
    const valid = !!payload.valid;
    const status = payload.status || (valid ? 'active' : 'invalid');
    const features = Array.isArray(payload.features) ? payload.features : [];
    const issuedAt = payload.issuedAt || nowIso;

    await this.settingsRepository.setMany({
      license_key: key,
      license_server_url: serverUrl,
      license_verified: valid ? '1' : '0',
      license_checked_at: nowIso,
      license_status: status,
      license_plan: payload.plan || (valid ? 'premium_yearly' : 'free'),
      license_expires_at: payload.expiresAt || '',
      license_last_validated_at: issuedAt,
      license_grace_until: payload.graceUntil || '',
      license_machine_id: machineId,
      license_features_json: JSON.stringify(features),
      license_customer_email: payload.customerEmail || '',
      license_message: payload.message || (valid ? 'License active' : 'License is not valid'),
      license_signed_payload: validated.signedPayload || '',
      license_response_signature: validated.signature || '',
      license_response_key_id: validated.keyId || '',
      license_response_alg: validated.algorithm || '',
      license_signature_verified: validated.signatureVerified ? '1' : '0'
    });
  }

  parseFeatures(raw) {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  normalizeLicensePayload(raw = {}) {
    const explicitValid = raw.valid;
    const status = raw.status || (explicitValid ? 'active' : 'invalid');
    const valid = typeof explicitValid === 'boolean'
      ? explicitValid
      : (status === 'active' || status === 'grace');
    const features = Array.isArray(raw.features) ? raw.features : [];
    return {
      valid,
      status,
      plan: raw.plan || (valid ? 'premium_yearly' : 'free'),
      expiresAt: raw.expires_at || raw.expiresAt || null,
      graceUntil: raw.grace_until || raw.graceUntil || null,
      issuedAt: raw.issued_at || raw.issuedAt || null,
      features,
      customerEmail: raw.customer_email || raw.customerEmail || '',
      message: raw.message || '',
      machineId: raw.machine_id || raw.machineId || null,
      licenseKey: raw.license_key || raw.licenseKey || null
    };
  }

  isLocalLicenseServer(serverUrl) {
    if (!serverUrl || !String(serverUrl).trim()) return false;
    try {
      const url = new URL(serverUrl);
      const host = String(url.hostname || '').toLowerCase();
      if (!host) return false;
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        return true;
      }
      if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.test')) {
        return true;
      }

      const machineHost = os.hostname().toLowerCase();
      if (host === machineHost || host === `${machineHost}.local`) {
        return true;
      }

      if (this.isPrivateOrLoopbackIp(host)) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  isPrivateOrLoopbackIp(host) {
    const ipType = net.isIP(host);
    if (ipType === 4) {
      if (host.startsWith('127.')) return true;
      if (host.startsWith('10.')) return true;
      if (host.startsWith('192.168.')) return true;
      if (host.startsWith('169.254.')) return true;

      const parts = host.split('.').map(part => parseInt(part, 10));
      if (parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)) {
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
          return true;
        }
      }
      return false;
    }

    if (ipType === 6) {
      const normalized = host.toLowerCase();
      if (normalized === '::1') return true;
      if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // Unique local addresses
      if (normalized.startsWith('fe80:')) return true; // Link-local
      return false;
    }

    return false;
  }

  canAcceptUnsignedResponse(serverUrl) {
    if (process.env.NZBARR_ALLOW_UNSIGNED_LICENSE_RESPONSES === '1') {
      return true;
    }
    return this.isLocalLicenseServer(serverUrl);
  }

  decodeBase64Url(value) {
    const normalized = String(value || '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, 'base64');
  }

  normalizeKeyEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      return { keyId: '', publicKeyPem: entry.trim() };
    }
    if (typeof entry === 'object') {
      const keyId = String(entry.keyId || entry.key_id || entry.id || '').trim();
      const publicKeyPem = String(entry.publicKeyPem || entry.public_key_pem || entry.key || '').trim();
      if (!publicKeyPem) return null;
      return { keyId, publicKeyPem };
    }
    return null;
  }

  parseKeyEntries(rawValue) {
    if (!rawValue || !String(rawValue).trim()) return [];
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => this.normalizeKeyEntry(item))
          .filter(Boolean);
      }
    } catch (error) {
      // Ignore parse failure and treat as plain PEM
    }

    const single = this.normalizeKeyEntry(String(rawValue));
    return single ? [single] : [];
  }

  getTrustedPublicKeysFromSettings(settings = {}) {
    const keys = [];
    keys.push(...this.getBundledPublicKeys());
    keys.push(...this.parseKeyEntries(settings.license_public_keys_json));
    keys.push(...this.parseKeyEntries(settings.license_public_key_pem));
    keys.push(...this.parseKeyEntries(process.env.NZBARR_LICENSE_PUBLIC_KEYS_JSON));
    keys.push(...this.parseKeyEntries(process.env.NZBARR_LICENSE_PUBLIC_KEY_PEM));

    const deduped = [];
    const seen = new Set();
    for (const key of keys) {
      const marker = `${key.keyId}::${key.publicKeyPem}`;
      if (seen.has(marker)) continue;
      seen.add(marker);
      deduped.push(key);
    }
    return deduped;
  }

  getBundledPublicKeys() {
    if (Array.isArray(this.bundledKeyEntries)) {
      return this.bundledKeyEntries;
    }

    const candidates = [
      path.resolve(__dirname, '..', 'config', 'license-public-keys.json'),
      path.resolve(process.resourcesPath || '', 'config', 'license-public-keys.json'),
      path.resolve(process.resourcesPath || '', 'app.asar.unpacked', 'config', 'license-public-keys.json')
    ];

    for (const filePath of candidates) {
      try {
        if (!filePath || !fs.existsSync(filePath)) continue;
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;

        const entries = parsed
          .map(item => this.normalizeKeyEntry(item))
          .filter(Boolean);
        if (entries.length > 0) {
          this.bundledKeyEntries = entries;
          return this.bundledKeyEntries;
        }
      } catch (error) {
        // Ignore malformed optional key files and continue scanning.
      }
    }

    this.bundledKeyEntries = [];
    return this.bundledKeyEntries;
  }

  verifyPayloadClaims(payload, expectedMachineId, expectedLicenseKey) {
    if (payload.machineId && payload.machineId !== expectedMachineId) {
      throw new Error('License signature machine binding mismatch');
    }

    if (payload.licenseKey && expectedLicenseKey && payload.licenseKey !== expectedLicenseKey) {
      throw new Error('License signature key mismatch');
    }

    if (!payload.issuedAt) {
      throw new Error('Signed license payload is missing issued_at');
    }

    const issuedMs = new Date(payload.issuedAt).getTime();
    if (Number.isNaN(issuedMs)) {
      throw new Error('Signed license payload has invalid issued_at');
    }

    if (issuedMs > (Date.now() + this.allowedFutureSkewMs)) {
      throw new Error('Signed license payload issued_at is in the future');
    }
  }

  async verifySignedPayloadEnvelope({ settings, payloadB64, signatureB64, keyId, algorithm, expectedMachineId, expectedLicenseKey }) {
    const algo = String(algorithm || 'ed25519').toLowerCase();
    if (algo !== 'ed25519') {
      throw new Error(`Unsupported license signature algorithm: ${algo}`);
    }

    const payloadBuffer = this.decodeBase64Url(payloadB64);
    const signatureBuffer = this.decodeBase64Url(signatureB64);

    let payloadRaw;
    try {
      payloadRaw = JSON.parse(payloadBuffer.toString('utf8'));
    } catch (error) {
      throw new Error('Signed license payload is not valid JSON');
    }

    const payload = this.normalizeLicensePayload(payloadRaw);
    this.verifyPayloadClaims(payload, expectedMachineId, expectedLicenseKey);

    const trustedKeys = this.getTrustedPublicKeysFromSettings(settings);
    if (trustedKeys.length === 0) {
      throw new Error('No trusted license public key configured');
    }

    const candidateKeys = keyId
      ? trustedKeys.filter(entry => entry.keyId === keyId)
      : trustedKeys;

    if (candidateKeys.length === 0) {
      throw new Error('No trusted public key matches key_id from license response');
    }

    const verified = candidateKeys.some((entry) => {
      try {
        return crypto.verify(null, payloadBuffer, entry.publicKeyPem, signatureBuffer);
      } catch (error) {
        return false;
      }
    });

    if (!verified) {
      throw new Error('License signature verification failed');
    }

    return {
      payload,
      payloadB64,
      signatureB64,
      keyId: keyId || '',
      algorithm: algo
    };
  }

  async readTrustedSignedCache({ settings, expectedMachineId, expectedLicenseKey, serverUrl }) {
    const payloadB64 = settings.license_signed_payload || '';
    const signatureB64 = settings.license_response_signature || '';
    const keyId = settings.license_response_key_id || '';
    const algorithm = settings.license_response_alg || 'ed25519';

    if (!payloadB64 || !signatureB64) {
      return { payload: null, error: '' };
    }

    try {
      const verified = await this.verifySignedPayloadEnvelope({
        settings,
        payloadB64,
        signatureB64,
        keyId,
        algorithm,
        expectedMachineId,
        expectedLicenseKey
      });
      return { payload: verified.payload, error: '' };
    } catch (error) {
      if (this.isLocalLicenseServer(serverUrl)) {
        return { payload: null, error: '' };
      }
      return { payload: null, error: `Signed license cache rejected: ${error.message}` };
    }
  }

  async extractAndValidateLicensePayload({ key, machineId, serverUrl, response }) {
    const envelope = response?.signed && typeof response.signed === 'object' ? response.signed : response;
    const payloadB64 = envelope?.signed_payload || envelope?.payload_b64 || '';
    const signatureB64 = envelope?.signature || '';
    const keyId = envelope?.key_id || envelope?.keyId || '';
    const algorithm = envelope?.alg || envelope?.algorithm || 'ed25519';

    if (payloadB64 && signatureB64) {
      const verified = await this.verifySignedPayloadEnvelope({
        settings: await this.settingsRepository.getMany(['license_public_key_pem', 'license_public_keys_json']),
        payloadB64,
        signatureB64,
        keyId,
        algorithm,
        expectedMachineId: machineId,
        expectedLicenseKey: key
      });

      return {
        payload: verified.payload,
        signedPayload: verified.payloadB64,
        signature: verified.signatureB64,
        keyId: verified.keyId,
        algorithm: verified.algorithm,
        signatureVerified: true
      };
    }

    if (!this.canAcceptUnsignedResponse(serverUrl)) {
      throw new Error('License server response missing signature. Signed responses are required for non-local servers.');
    }

    const payload = this.normalizeLicensePayload(response || {});
    this.verifyPayloadClaims({
      ...payload,
      issuedAt: payload.issuedAt || new Date().toISOString()
    }, machineId, key);

    return {
      payload: {
        ...payload,
        issuedAt: payload.issuedAt || new Date().toISOString()
      },
      signedPayload: '',
      signature: '',
      keyId: '',
      algorithm: '',
      signatureVerified: false
    };
  }

  postJson(urlString, payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const body = JSON.stringify(payload);
      const transport = url.protocol === 'https:' ? https : http;

      const request = transport.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          raw += chunk;
        });
        response.on('end', () => {
          if (!raw) {
            reject(new Error(`License server returned ${response.statusCode} with empty response`));
            return;
          }

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (error) {
            reject(new Error('License server returned invalid JSON'));
            return;
          }

          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(parsed?.message || `License server returned ${response.statusCode}`));
            return;
          }

          resolve(parsed);
        });
      });

      request.on('error', (error) => {
        reject(new Error(`License server request failed: ${error.message}`));
      });

      request.write(body);
      request.end();
    });
  }
}

module.exports = LicenseService;
