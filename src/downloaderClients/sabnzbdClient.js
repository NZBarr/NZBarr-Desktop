const path = require('path');
const nzbFileUtils = require('../nzbFileUtils');

class SabnzbdClient {
  constructor(settings = {}) {
    this.settings = settings;
  }

  isConfigured() {
    return Boolean(this.settings.sabnzbd_host && this.getSendApiKey());
  }

  getSendApiKey() {
    return this.settings.sabnzbd_nzb_key || this.settings.sabnzbd_api_key || this.settings.sabnzbd_full_api_key || '';
  }

  getFullApiKey() {
    return this.settings.sabnzbd_full_api_key || this.settings.sabnzbd_api_key || '';
  }

  getKeySource() {
    if (this.settings.sabnzbd_nzb_key) {
      return 'NZB Key';
    }
    if (this.settings.sabnzbd_full_api_key || this.settings.sabnzbd_api_key) {
      return 'Full API Key';
    }
    return 'None';
  }

  getAuthMode() {
    return this.settings.sabnzbd_username && this.settings.sabnzbd_password ? 'Basic Auth' : 'None';
  }

  normalizePath(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
  }

  parseHostSetting() {
    const rawHost = String(this.settings.sabnzbd_host || '').trim() || 'localhost';
    const explicitProtocol = this.settings.sabnzbd_ssl === '1' ? 'https' : 'http';
    const explicitPort = String(this.settings.sabnzbd_port || '').trim();
    const explicitBasePath = this.normalizePath(this.settings.sabnzbd_base_path || '');

    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawHost);
    const urlLike = hasScheme || rawHost.includes('/');
    const url = new URL(hasScheme ? rawHost : `http://${rawHost}`);
    const portMatch = rawHost.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:\[[^\]]+\]|[^/:]+)(?::(\d+))?(?:\/|$)/i);

    const host = url.hostname || 'localhost';
    const urlPort = url.port || '';
    const rawPort = portMatch && portMatch[1] ? portMatch[1] : '';
    const urlPath = url.pathname && url.pathname !== '/' ? this.normalizePath(url.pathname) : '';
    const inferredProtocol = hasScheme ? url.protocol.replace(':', '') : explicitProtocol;

    return {
      protocol: inferredProtocol || explicitProtocol,
      host,
      port: urlLike ? (rawPort || urlPort || explicitPort || (inferredProtocol === 'https' ? '443' : '8080')) : (explicitPort || urlPort || (inferredProtocol === 'https' ? '443' : '8080')),
      basePath: urlLike ? (urlPath || explicitBasePath) : (explicitBasePath || urlPath)
    };
  }

  buildApiCandidates() {
    const endpoint = this.parseHostSetting();
    const protocols = [];
    const addProtocol = (value) => {
      if (value && !protocols.includes(value)) {
        protocols.push(value);
      }
    };

    addProtocol(endpoint.protocol);
    addProtocol(endpoint.protocol === 'https' ? 'http' : 'https');

    const basePaths = [];
    const addBasePath = (value) => {
      const normalized = this.normalizePath(value);
      const key = normalized || '';
      if (!basePaths.includes(key)) {
        basePaths.push(key);
      }
    };

    if (endpoint.basePath) {
      addBasePath(endpoint.basePath);
      addBasePath('');
    } else {
      addBasePath('');
      addBasePath('/sabnzbd');
    }

    const candidates = [];
    for (const protocol of protocols) {
      for (const basePath of basePaths) {
        candidates.push(`${protocol}://${endpoint.host}:${endpoint.port}${basePath}/api`);
      }
    }

    return [...new Set(candidates)];
  }

  buildHeaders() {
    if (this.settings.sabnzbd_username && this.settings.sabnzbd_password) {
      const token = Buffer.from(`${this.settings.sabnzbd_username}:${this.settings.sabnzbd_password}`).toString('base64');
      return {
        Authorization: `Basic ${token}`
      };
    }
    return {};
  }

  readNZBBuffer(filePath) {
    return nzbFileUtils.readNZBBuffer(filePath);
  }

  buildCandidateFailureMessage(action, apiBases, error) {
    const tried = apiBases.length > 0 ? ` Tried: ${apiBases.join(', ')}.` : '';
    const suffix = error && error.message ? ` ${error.message}` : '';
    return `SABnzbd ${action} failed.${suffix}${tried}`.trim();
  }

  getDiagnostics() {
    const endpoint = this.parseHostSetting();
    const apiBases = this.buildApiCandidates();
    return {
      rawHost: String(this.settings.sabnzbd_host || '').trim(),
      sslEnabled: this.settings.sabnzbd_ssl === '1',
      protocol: endpoint.protocol,
      host: endpoint.host,
      port: endpoint.port,
      basePath: endpoint.basePath || '',
      keySource: this.getKeySource(),
      authMode: this.getAuthMode(),
      apiBases,
      primaryApiBase: apiBases[0] || null
    };
  }

  async requestApi(apiBase, params, options = {}) {
    const response = await fetch(`${apiBase}?${params.toString()}`, {
      method: options.method || 'GET',
      headers: this.buildHeaders(),
      body: options.body
    });

    if (response.status === 404) {
      const error = new Error(`SABnzbd API not found at ${apiBase}`);
      error.isNotFound = true;
      throw error;
    }

    if (!response.ok) {
      throw new Error(`SABnzbd request failed with ${response.status} ${response.statusText}`);
    }

    const raw = await response.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch (error) {
      throw new Error(`SABnzbd returned non-JSON response. Check host/base path/API settings. First response: ${raw.slice(0, 160)}`);
    }

    return result;
  }

  async requestApiText(apiBase, params, options = {}) {
    const response = await fetch(`${apiBase}?${params.toString()}`, {
      method: options.method || 'GET',
      headers: this.buildHeaders(),
      body: options.body
    });

    if (response.status === 404) {
      const error = new Error(`SABnzbd API not found at ${apiBase}`);
      error.isNotFound = true;
      throw error;
    }

    if (!response.ok) {
      throw new Error(`SABnzbd request failed with ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  async addNZBFile(release) {
    if (!this.isConfigured()) {
      throw new Error('SABnzbd is not configured');
    }

    const nzbBuffer = this.readNZBBuffer(release.nzb_file_path);
    const form = new FormData();
    const fileName = `${(release.search_name || release.clean_name || `release-${release.id}`).replace(/[\\/]/g, '_')}.nzb`;
    form.append('name', new Blob([nzbBuffer], { type: 'application/x-nzb' }), fileName);

    const params = new URLSearchParams({
      mode: 'addfile',
      output: 'json',
      apikey: this.getSendApiKey(),
      nzbname: release.search_name || release.clean_name || `Release ${release.id}`
    });

    if (this.settings.sabnzbd_category) {
      params.set('cat', this.settings.sabnzbd_category);
    }

    const priority = this.settings.sabnzbd_priority;
    if (priority !== undefined && priority !== null && priority !== '') {
      params.set('priority', String(priority));
    }

    const apiBases = this.buildApiCandidates();
    let lastError = null;
    for (const apiBase of apiBases) {
      let result;
      try {
        result = await this.requestApi(apiBase, params, {
          method: 'POST',
          body: form
        });
      } catch (error) {
        if (error.isNotFound) {
          lastError = error;
          continue;
        }
        lastError = error;
        continue;
      }

      if (result.status === false) {
        throw new Error(result.error || result.message || 'SABnzbd rejected the NZB');
      }

      return {
        success: true,
        downloader: 'sabnzbd',
        response: result,
        nzoId: result.nzo_ids ? result.nzo_ids[0] : (result.nzo_id || null)
      };
    }

    throw lastError || new Error(this.buildCandidateFailureMessage('NZB upload', apiBases));
  }

  async testConnection() {
    if (!this.settings.sabnzbd_host) {
      throw new Error('SABnzbd host is not configured');
    }

    const fullApiKey = this.getFullApiKey();
    const sendApiKey = this.getSendApiKey();
    if (!fullApiKey && !sendApiKey) {
      throw new Error('No SABnzbd API key configured');
    }

    if (fullApiKey) {
      return this.testFullApiConnection(fullApiKey);
    }

    return this.testSendOnlyConnection(sendApiKey);
  }

  async testFullApiConnection(apiKey) {
    const params = new URLSearchParams({
      mode: 'queue',
      output: 'json',
      apikey: apiKey
    });

    const apiBases = this.buildApiCandidates();
    let lastError = null;
    for (const apiBase of apiBases) {
      try {
        const result = await this.requestApi(apiBase, params, { method: 'GET' });

        return {
          success: true,
          downloader: 'sabnzbd',
          access: 'full',
          queue: result.queue || null,
          apiBase,
          diagnostics: this.getDiagnostics()
        };
      } catch (error) {
        if (error.isNotFound) {
          lastError = error;
          continue;
        }
        lastError = error;
      }
    }

    throw lastError || new Error(this.buildCandidateFailureMessage('connection test', apiBases));
  }

  async testSendOnlyConnection(apiKey) {
    const params = new URLSearchParams({
      mode: 'version',
      output: 'json',
      apikey: apiKey
    });

    const apiBases = this.buildApiCandidates();
    let sawReachableHost = false;
    let lastError = null;

    for (const apiBase of apiBases) {
      try {
        const raw = await this.requestApiText(apiBase, params, { method: 'GET' });
        let result = null;
        try {
          result = JSON.parse(raw);
        } catch (error) {
          return {
            success: true,
            downloader: 'sabnzbd',
            access: 'send',
            apiBase,
            note: 'Host reachable. Send-only key configured; advanced status checks may require the full API key.'
          };
        }
        sawReachableHost = true;
        return {
          success: true,
          downloader: 'sabnzbd',
          access: 'reachable',
          version: result.version || null,
          apiBase,
          diagnostics: this.getDiagnostics()
        };
      } catch (error) {
        if (error.isNotFound) {
          lastError = error;
          continue;
        }
        lastError = error;
      }
    }

    if (sawReachableHost) {
      return {
        success: true,
        downloader: 'sabnzbd',
        access: 'reachable',
        note: 'SABnzbd reachable. This test confirms the host/base path, but it does not prove a send-only NZB key will be accepted.',
        diagnostics: this.getDiagnostics()
      };
    }

    throw lastError || new Error(this.buildCandidateFailureMessage('send-only connection test', apiBases));
  }

  /**
   * Get the status of a specific download job by NZO ID
   * @param {string} nzoId - The NZO ID from SABnzbd
   * @returns {Promise<{status: string, progress: number, name: string}|null>}
   */
  async getJobStatus(nzoId) {
    const apiKey = this.getFullApiKey() || this.getSendApiKey();
    if (!apiKey) {
      throw new Error('No SABnzbd API key configured');
    }

    // Check queue first
    const queueResult = await this._apiCall('queue', {
      mode: 'queue',
      output: 'json',
      apikey: apiKey
    });

    if (queueResult && queueResult.queue && queueResult.queue.slots) {
      for (const slot of queueResult.queue.slots) {
        if (slot.nzo_id === nzoId) {
          return {
            status: slot.status || 'downloading',
            progress: parseFloat(slot.percentage) || 0,
            name: slot.filename || slot.name,
            nzoId,
            inQueue: true,
            raw: slot
          };
        }
      }
    }

    // Not in queue - check history
    const historyResult = await this._apiCall('history', {
      mode: 'history',
      output: 'json',
      apikey: apiKey,
      failed_only: '0'
    });

    if (historyResult && historyResult.history && historyResult.history.slots) {
      for (const slot of historyResult.history.slots) {
        if (slot.nzo_id === nzoId) {
          return {
            status: slot.status || 'completed',
            progress: 100,
            name: slot.name,
            nzoId,
            inQueue: false,
            path: slot.storage || null,
            completedAt: slot.completed || null,
            failMessage: slot.fail_message || slot.fail_msg || slot.status || null,
            raw: slot
          };
        }
      }
    }

    return null; // Not found in queue or history
  }

  async deleteJob(nzoId) {
    const apiKey = this.getFullApiKey() || this.getSendApiKey();
    if (!apiKey) {
      throw new Error('No SABnzbd API key configured');
    }

    const queueResult = await this._apiCall('queue delete', {
      mode: 'queue',
      name: 'delete',
      value: nzoId,
      output: 'json',
      apikey: apiKey
    });

    return queueResult;
  }

  /**
   * Get the completed download path for a job
   * @param {string} nzoId - The NZO ID
   * @returns {Promise<string|null>} Path to the completed download folder
   */
  async getCompletedDownloadPath(nzoId) {
    const jobStatus = await this.getJobStatus(nzoId);
    if (jobStatus && jobStatus.path) {
      return jobStatus.path;
    }
    return null;
  }

  /**
   * Get recent history entries (completed downloads)
   * @param {number} limit - Max entries to return (default: 50)
   * @returns {Promise<Array<{nzo_id: string, name: string, status: string, path: string, completed: string}>>}
   */
  async getHistory(limit = 50) {
    const apiKey = this.getFullApiKey();
    if (!apiKey) {
      throw new Error('Full SABnzbd API key required for history access');
    }

    const result = await this._apiCall('history', {
      mode: 'history',
      output: 'json',
      apikey: apiKey,
      limit: String(limit),
      failed_only: '0'
    });

    if (result && result.history && result.history.slots) {
      return result.history.slots.map(slot => ({
        nzo_id: slot.nzo_id,
        name: slot.name,
        status: slot.status,
        path: slot.storage,
        completed: slot.completed,
        size: parseInt(slot.size, 10) || 0
      }));
    }

    return [];
  }

  /**
   * Generic API call helper
   */
  async _apiCall(label, params) {
    const apiBases = this.buildApiCandidates();
    let lastError = null;
    for (const apiBase of apiBases) {
      try {
        return await this.requestApi(apiBase, new URLSearchParams(params), { method: 'GET' });
      } catch (error) {
        if (error.isNotFound) {
          lastError = error;
          continue;
        }
        lastError = error;
      }
    }

    throw lastError || new Error(this.buildCandidateFailureMessage(`${label} API call`, apiBases));
  }
}

module.exports = SabnzbdClient;
