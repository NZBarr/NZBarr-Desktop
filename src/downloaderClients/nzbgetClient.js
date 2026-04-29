const nzbFileUtils = require('../nzbFileUtils');

class NZBGetClient {
  constructor(settings = {}) {
    this.settings = settings;
  }

  isConfigured() {
    return Boolean(this.settings.nzbget_host && this.settings.nzbget_username && this.settings.nzbget_password);
  }

  buildUrl() {
    const protocol = this.settings.nzbget_ssl === '1' ? 'https' : 'http';
    const host = this.settings.nzbget_host || 'localhost';
    const port = this.settings.nzbget_port || '6789';
    return `${protocol}://${host}:${port}/jsonrpc`;
  }

  buildHeaders() {
    const token = Buffer.from(`${this.settings.nzbget_username}:${this.settings.nzbget_password}`).toString('base64');
    return {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json'
    };
  }

  readNZBBase64(filePath) {
    return nzbFileUtils.readNZBBuffer(filePath).toString('base64');
  }

  async addNZBFile(release) {
    if (!this.isConfigured()) {
      throw new Error('NZBGet is not configured');
    }

    const payload = {
      method: 'append',
      params: [
        `${(release.search_name || release.clean_name || `release-${release.id}`).replace(/[\\/]/g, '_')}.nzb`,
        this.readNZBBase64(release.nzb_file_path),
        this.settings.nzbget_category || '',
        parseInt(this.settings.nzbget_priority || '0', 10),
        false,
        false,
        '',
        0,
        'SCORE',
        false,
        []
      ],
      id: Date.now()
    };

    const response = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`NZBGet request failed with ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'NZBGet rejected the NZB');
    }

    if (typeof result.result !== 'number' || result.result <= 0) {
      throw new Error('NZBGet did not return a valid queue ID');
    }

    return {
      success: true,
      downloader: 'nzbget',
      response: result
    };
  }

  async testConnection() {
    if (!this.isConfigured()) {
      throw new Error('NZBGet is not fully configured');
    }

    const payload = {
      method: 'version',
      params: [],
      id: Date.now()
    };

    const response = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`NZBGet request failed with ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'NZBGet connection test failed');
    }

    return {
      success: true,
      downloader: 'nzbget',
      version: result.result
    };
  }
}

module.exports = NZBGetClient;
