const SabnzbdClient = require('./downloaderClients/sabnzbdClient');
const NZBGetClient = require('./downloaderClients/nzbgetClient');

class DownloadDispatchService {
  constructor() {
    this.clientFactories = {
      sabnzbd: (settings) => new SabnzbdClient(settings),
      nzbget: (settings) => new NZBGetClient(settings)
    };
  }

  resolveTarget(settings, requested) {
    if (requested && requested !== 'preferred') return requested;
    return settings.downloader_preferred || 'sabnzbd';
  }

  createClient(settings, target) {
    const factory = this.clientFactories[target];
    if (!factory) {
      throw new Error(`Unsupported downloader: ${target}`);
    }
    return factory(settings);
  }

  async sendRelease(release, settings, requestedTarget = 'preferred') {
    const target = this.resolveTarget(settings, requestedTarget);
    const client = this.createClient(settings, target);

    if (!client.isConfigured()) {
      throw new Error(`${target === 'sabnzbd' ? 'SABnzbd' : 'NZBGet'} is not fully configured in Settings`);
    }

    return client.addNZBFile(release);
  }

  async testConnection(settings, requestedTarget = 'preferred') {
    const target = this.resolveTarget(settings, requestedTarget);
    const client = this.createClient(settings, target);

    if (!client.isConfigured()) {
      if (target === 'sabnzbd' && settings.sabnzbd_host && (settings.sabnzbd_nzb_key || settings.sabnzbd_full_api_key || settings.sabnzbd_api_key)) {
        return client.testConnection();
      }
      throw new Error(`${target === 'sabnzbd' ? 'SABnzbd' : 'NZBGet'} is not fully configured in Settings`);
    }

    if (typeof client.testConnection !== 'function') {
      throw new Error(`No connection test available for ${target}`);
    }

    return client.testConnection();
  }
}

module.exports = new DownloadDispatchService();
