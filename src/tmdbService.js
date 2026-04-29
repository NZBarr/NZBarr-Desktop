// NZBarr Desktop - TMDB API Service
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const appPaths = require('./appPaths');

class TMDBService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.themoviedb.org/3';
    this.imageBaseUrl = 'https://image.tmdb.org/t/p/';
    this.cacheDir = null;
  }

  /**
   * Initialize TMDB service
   */
  initialize(apiKey, cacheDir) {
    const nextApiKey = apiKey || null;
    const nextCacheDir = cacheDir || appPaths.getImageCacheDir();
    const changed = this.apiKey !== nextApiKey || this.cacheDir !== nextCacheDir;

    this.apiKey = nextApiKey;
    this.cacheDir = nextCacheDir;

    if (changed) {
      console.log(`[TMDBService] Initialized with cache dir: ${this.cacheDir}`);
    }
  }

  /**
   * Get cover path for a media type and ID
   */
  getCoverPath(mediaType, id, type = 'cover', extension = 'jpg') {
    // Use centralized appPaths methods for consistency
    const mediaTypeMap = {
      'movie': 'movies',
      'tv': 'tv',
      'music': 'music',
      'book': 'books',
      'console': 'games',
      'xxx': 'xxx',
      'collection': 'collections'
    };
    
    const mappedType = mediaTypeMap[mediaType] || 'movies';
    
    switch(type) {
      case 'backdrop':
        return appPaths.getBackdropPath(mappedType, id, extension);
      case 'logo':
        return appPaths.getLogoPath(mappedType, id, extension);
      case 'cutout':
        return appPaths.getCutoutPath(mappedType, id, extension);
      case 'cover':
      default:
        return appPaths.getCoverPath(mappedType, id, extension);
    }
  }

  /**
   * Search for a movie by title
   */
  async searchMovie(title, year = null) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const query = encodeURIComponent(title);
    let url = `${this.baseUrl}/search/movie?query=${query}&include_adult=false`;
    
    if (year) {
      url += `&year=${year}`;
    }

    return this.makeRequest(url);
  }

  /**
   * Search for a TV show by title
   */
  async searchTV(title) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const query = encodeURIComponent(title);
    const url = `${this.baseUrl}/search/tv?query=${query}&include_adult=false`;

    return this.makeRequest(url);
  }

  /**
   * Get movie details by TMDB ID
   */
  async getMovieDetails(tmdbId) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const url = `${this.baseUrl}/movie/${tmdbId}?append_to_response=credits,videos,images,external_ids`;
    return this.makeRequest(url);
  }

  /**
   * Get collection details by TMDB ID
   */
  async getCollectionDetails(tmdbId) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const url = `${this.baseUrl}/collection/${tmdbId}?append_to_response=images`;
    return this.makeRequest(url);
  }

  async getCollectionImages(tmdbId) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const url = `${this.baseUrl}/collection/${tmdbId}/images?include_image_language=en-US,en-GB,en,null`;
    return this.makeRequest(url);
  }

  pickPreferredImage(images = []) {
    if (!Array.isArray(images) || images.length === 0) {
      return null;
    }

    const normalized = images.map(image => ({
      ...image,
      normalizedLanguage: image.iso_639_1 === null ? 'null' : String(image.iso_639_1 || '').toLowerCase()
    }));

    const priority = ['en-us', 'en-gb', 'en', 'null', 'xx'];
    for (const language of priority) {
      const match = normalized.find(image => image.normalizedLanguage === language);
      if (match) {
        return match;
      }
    }

    return normalized[0];
  }

  async getPreferredCollectionData(tmdbId) {
    const details = await this.getCollectionDetails(tmdbId);

    let images = {
      posters: Array.isArray(details?.images?.posters) ? details.images.posters : [],
      backdrops: Array.isArray(details?.images?.backdrops) ? details.images.backdrops : []
    };

    try {
      const freshImages = await this.getCollectionImages(tmdbId);
      if (freshImages) {
        images = {
          posters: Array.isArray(freshImages.posters) ? freshImages.posters : images.posters,
          backdrops: Array.isArray(freshImages.backdrops) ? freshImages.backdrops : images.backdrops
        };
      }
    } catch (error) {
      console.warn(`[TMDB] Failed to fetch collection images for ${tmdbId}: ${error.message}`);
    }

    const preferredPoster = this.pickPreferredImage(images.posters);
    const preferredBackdrop = this.pickPreferredImage(images.backdrops);

    return {
      ...details,
      images,
      preferred_poster_path: preferredPoster?.file_path || details.poster_path || null,
      preferred_backdrop_path: preferredBackdrop?.file_path || details.backdrop_path || null,
      preferred_logo_path: null
    };
  }

  /**
   * Get TV show details by TMDB ID
   */
  async getTVDetails(tmdbId) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const url = `${this.baseUrl}/tv/${tmdbId}?append_to_response=credits,videos,images,external_ids`;
    return this.makeRequest(url);
  }

  /**
   * Get cover image URL for a movie
   */
  async getMovieCover(tmdbId, size = 'w500') {
    const details = await this.getMovieDetails(tmdbId);
    
    if (details && details.poster_path) {
      return `${this.imageBaseUrl}${size}${details.poster_path}`;
    }
    
    return null;
  }

  /**
   * Get cover image URL for a TV show
   */
  async getTVCover(tmdbId, size = 'w500') {
    const details = await this.getTVDetails(tmdbId);
    
    if (details && details.poster_path) {
      return `${this.imageBaseUrl}${size}${details.poster_path}`;
    }
    
    return null;
  }

  /**
   * Download and cache a cover image
   */
  async downloadCover(imageUrl, destPath, extension = 'jpg') {
    if (!imageUrl) return null;
    if (!destPath) return null;
    
    // Ensure destination directory exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Return cached version if exists
    if (fs.existsSync(destPath)) {
      return destPath;
    }

    try {
      return await this.downloadImage(imageUrl, destPath);
    } catch (error) {
      console.error('Failed to download cover:', error.message);
      return null;
    }
  }

  /**
   * Download an image from URL
   */
  downloadImage(url, destPath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          this.downloadImage(response.headers.location, destPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(destPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(destPath);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {}); // Delete partial file
        reject(err);
      });
    });
  }

  /**
   * Find and download cover for a release
   */
  async findAndDownloadCover(release) {
    try {
      let coverUrl = null;
      let metaData = null;
      let tmdbId = release.tmdb_id;

      // If no TMDB ID but has IMDb ID, find it via external ID lookup
      if (!tmdbId && release.imdb_id) {
        console.log(`  Looking up TMDB ID for IMDb: ${release.imdb_id}`);
        tmdbId = await this.findTMDBByIMDB(release.imdb_id, release.media_type);
      }

      if (release.media_type === 'movie' && tmdbId) {
        coverUrl = await this.getMovieCover(tmdbId);
        metaData = await this.getMovieDetails(tmdbId);
        console.log(`  ✓ Movie details fetched (backdrop: ${metaData?.backdrop_path ? 'yes' : 'no'}, logos: ${metaData?.images?.logos?.length || 0})`);
      } else if (release.media_type === 'tv' && tmdbId) {
        coverUrl = await this.getTVCover(tmdbId);
        metaData = await this.getTVDetails(tmdbId);
      } else if (!tmdbId && release.clean_name) {
        // Fallback: search by title
        console.log(`  Searching TMDB by title: ${release.clean_name}`);
        const searchResults = release.media_type === 'tv'
          ? await this.searchTV(release.clean_name)
          : await this.searchMovie(release.clean_name, release.year);

        if (searchResults && searchResults.results && searchResults.results.length > 0) {
          const first = searchResults.results[0];
          tmdbId = first.id;
          coverUrl = `${this.imageBaseUrl}w500${first.poster_path}`;
          // Fetch full details instead of using the truncated search result
          metaData = release.media_type === 'tv'
            ? await this.getTVDetails(tmdbId)
            : await this.getMovieDetails(tmdbId);
        }
      }

      if (coverUrl) {
        // Use IMDB ID or TMDB ID for file naming, not NZB GUID
        const coverId = release.imdb_id || release.tmdb_id?.toString() || release.nzb_guid || release.id;
        const coverPath = this.getCoverPath(release.media_type || 'movie', coverId, 'cover');
        const coverResult = await this.downloadCover(coverUrl, coverPath);
        
        // Also download backdrop and logo if available
        let backdropPath = null;
        let logoPath = null;
        
        if (metaData) {
          if (metaData.backdrop_path) {
            const backdropUrl = `${this.imageBaseUrl}w1280${metaData.backdrop_path}`;
            const backdropPathTarget = this.getCoverPath(release.media_type || 'movie', coverId, 'backdrop');
            backdropPath = await this.downloadCover(backdropUrl, backdropPathTarget);
            console.log(`  ✓ Backdrop ${backdropPath ? 'downloaded' : 'failed'}: ${backdropPathTarget}`);
          } else {
            console.log(`  ⚠ No backdrop available on TMDB`);
          }

          // Logo from TMDB images — prioritize UK/US logos, then English, then others
          if (metaData.images && metaData.images.logos && metaData.images.logos.length > 0) {
            const logos = metaData.images.logos;
            // Priority: en-US > en-GB > en > null/xx language
            const preferredLogos = [
              logos.find(l => l.iso_639_1 === 'en-us'),
              logos.find(l => l.iso_639_1 === 'en-gb'),
              logos.find(l => l.iso_639_1 === 'en'),
              logos.find(l => l.iso_639_1 === null || l.iso_639_1 === 'xx')
            ];
            const logo = preferredLogos.find(l => l !== undefined) || logos[0];

            if (logo) {
              const logoUrl = `${this.imageBaseUrl}w500${logo.file_path}`;
              const logoPathTarget = this.getCoverPath(release.media_type || 'movie', coverId, 'logo', 'png');
              logoPath = await this.downloadCover(logoUrl, logoPathTarget, 'png');
              console.log(`  ✓ Logo ${logoPath ? 'downloaded' : 'failed'} (lang: ${logo.iso_639_1 || 'none'})`);
            } else {
              console.log(`  ⚠ No logos available on TMDB`);
            }
          } else {
            console.log(`  ⚠ No logos available on TMDB`);
          }
        }
        
        return {
          coverPath,
          backdropPath,
          logoPath,
          coverUrl: coverUrl,
          metaData: metaData,
          tmdbId: tmdbId,
          imdbId: metaData?.external_ids?.imdb_id || null
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to find cover:', error.message);
      return null;
    }
  }

  /**
   * Find TMDB ID by IMDb ID
   */
  async findTMDBByIMDB(imdbId, mediaType) {
    try {
      const url = `${this.baseUrl}/find/${imdbId}?external_source=imdb_id`;
      const result = await this.makeRequest(url);
      
      if (mediaType === 'movie' && result.movie_results && result.movie_results.length > 0) {
        return result.movie_results[0].id;
      } else if (mediaType === 'tv' && result.tv_results && result.tv_results.length > 0) {
        return result.tv_results[0].id;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to find TMDB by IMDb ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get person details by TMDB ID (actor/director)
   */
  async getPersonDetails(tmdbId) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    const url = `${this.baseUrl}/person/${tmdbId}`;
    return this.makeRequest(url);
  }

  /**
   * Make HTTP request to TMDB API
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      
      // Add API key as query parameter (v3 API uses api_key, not Bearer)
      const separator = parsedUrl.search ? '&' : '?';
      parsedUrl.search += `${separator}api_key=${this.apiKey}`;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      https.get(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            
            if (response.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.status_message || `HTTP ${response.statusCode}`));
            }
          } catch (error) {
            reject(new Error('Failed to parse TMDB response'));
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = new TMDBService();
