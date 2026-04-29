const https = require('https');

class FanartService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://webservice.fanart.tv/v3';
  }

  initialize(apiKey) {
    this.apiKey = apiKey || null;
  }

  async getMovieCoverOptions(tmdbId) {
    return this.getMovieArtworkOptions(tmdbId, 'cover');
  }

  async getTVCoverOptions(tvdbId) {
    return this.getTVArtworkOptions(tvdbId, 'cover');
  }

  async getMovieArtworkOptions(tmdbId, assetType = 'cover') {
    if (!this.apiKey) {
      throw new Error('Fanart API key not configured');
    }
    if (!tmdbId) {
      throw new Error('TMDB ID is required for movie fanart');
    }

    const payload = await this.requestJson(`${this.baseUrl}/movies/${tmdbId}?api_key=${encodeURIComponent(this.apiKey)}`);
    return this.normalizeArtwork(this.extractMovieArtwork(payload, assetType));
  }

  async getTVArtworkOptions(tvdbId, assetType = 'cover') {
    if (!this.apiKey) {
      throw new Error('Fanart API key not configured');
    }
    if (!tvdbId) {
      throw new Error('TVDB ID is required for TV fanart');
    }

    const payload = await this.requestJson(`${this.baseUrl}/tv/${tvdbId}?api_key=${encodeURIComponent(this.apiKey)}`);
    return this.normalizeArtwork(this.extractTVArtwork(payload, assetType));
  }

  extractMovieArtwork(payload, assetType) {
    const keysByType = {
      cover: ['movieposter'],
      backdrop: ['moviebackground'],
      logo: ['hdmovielogo', 'movielogo']
    };

    return (keysByType[assetType] || [])
      .flatMap(key => Array.isArray(payload?.[key]) ? payload[key] : []);
  }

  extractTVArtwork(payload, assetType) {
    const keysByType = {
      cover: ['tvposter'],
      backdrop: ['showbackground', 'tvthumb'],
      logo: ['hdtvlogo', 'clearlogo']
    };

    return (keysByType[assetType] || [])
      .flatMap(key => Array.isArray(payload?.[key]) ? payload[key] : []);
  }

  normalizeArtwork(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter(item => item?.url)
      .map((item, index) => ({
        id: `${item.id || index}`,
        url: item.url,
        previewUrl: item.url,
        lang: item.lang || '',
        likes: Number(item.likes || 0)
      }))
      .sort((a, b) => {
        const scoreA = (a.lang === 'en' ? 1000 : 0) + a.likes;
        const scoreB = (b.lang === 'en' ? 1000 : 0) + b.likes;
        return scoreB - scoreA;
      });
  }

  requestJson(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, {
        headers: {
          Accept: 'application/json',
          'api-key': this.apiKey
        }
      }, (response) => {
        let raw = '';
        response.setEncoding('utf8');

        response.on('data', chunk => {
          raw += chunk;
        });

        response.on('end', () => {
          if (response.statusCode !== 200) {
            reject(new Error(`Fanart request failed with ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error('Fanart returned invalid JSON'));
          }
        });
      });

      request.on('error', reject);
    });
  }
}

module.exports = new FanartService();
