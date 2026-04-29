const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class MusicMetadataService {
  initialize(settings = {}, baseDataPath = null) {
    settings = settings || {};

    // Ensure we have valid settings
    if (typeof settings !== 'object') {
      settings = {};
    }
    
    this.audioDbApiKey = settings.api_audiodb_key || '1';

    // Use the provided baseDataPath or fall back to app data directory
    let baseDir;
    if (baseDataPath) {
      baseDir = path.join(baseDataPath, 'cache');
    } else if (settings.download_path && typeof settings.download_path === 'string' && settings.download_path.trim()) {
      baseDir = path.join(settings.download_path.trim(), 'cache');
    } else {
      baseDir = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'Downloads', 'NZBarr', 'cache');
    }

    this.coversDir = path.join(baseDir, 'covers', 'music');
    this.artistBackdropsDir = path.join(baseDir, 'covers', 'music_artists');
    this.artistLogosDir = path.join(baseDir, 'logos', 'music_artists');
    this.artistCutoutsDir = path.join(baseDir, 'cutouts', 'music_artists');

    // Safely create directories
    try {
      [this.coversDir, this.artistBackdropsDir, this.artistLogosDir, this.artistCutoutsDir].forEach(dir => {
        if (dir && typeof dir === 'string' && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
    } catch (error) {
      console.error('Error creating music cache directories:', error.message);
    }

    console.log(`  Music metadata service initialized`);
    console.log(`  Covers dir: ${this.coversDir}`);
  }

  async fetchMusicMetadata(releaseId, releaseName, metadata = {}) {
    try {
      metadata = metadata || {};
      let artist = metadata.artist || '';
      let album = metadata.album || '';
      let releaseDate = metadata.releaseDate || null;
      const coverUrl = metadata.coverUrl || null;
      const audioDbAlbumId = metadata.audioDbAlbumId || null;
      const audioDbArtistId = metadata.audioDbArtistId || null;
      const musicBrainzId = metadata.musicBrainzId || null;

      if (!artist || !album) {
        const titleSource = metadata.title || releaseName || '';
        const dashMatch = titleSource.match(/^(.+?)\s*-\s*(.+)$/);
        if (dashMatch) {
          artist = artist || dashMatch[1].trim();
          album = album || dashMatch[2].trim();
        }
      }

      if (!artist && !album) {
        artist = 'Unknown';
        album = releaseName || 'Unknown';
      }

      artist = artist.trim();
      album = album.trim();

      console.log(`  Searching music metadata for: ${artist} - ${album}`);

      let result = null;
      if (audioDbAlbumId) {
        result = await this.getAudioDBAlbum(audioDbAlbumId);
      }

      if (!result && artist && album) {
        result = await this.searchAudioDB(artist, album);
      }

      if (!result && musicBrainzId) {
        result = await this.getMusicBrainzRelease(musicBrainzId);
      }

      if (!result && artist && album) {
        result = {
          source: 'manual',
          audioDbAlbumId,
          audioDbArtistId,
          musicBrainzId,
          artist: artist,
          albumTitle: album,
          releaseDate: releaseDate,
          genre: null,
          label: null,
          coverUrl: coverUrl,
          rawJson: JSON.stringify({ artist, album, coverUrl, releaseDate, audioDbAlbumId, audioDbArtistId, musicBrainzId })
        };
      }

      if (!result) {
        console.log(`  ⚠ No music metadata found for: ${artist} - ${album}`);
        return null;
      }

      if (coverUrl) {
        result.coverUrl = coverUrl;
      }
      if (metadata.artist) {
        result.artist = metadata.artist;
      }
      if (metadata.album) {
        result.albumTitle = metadata.album;
      }
      if (releaseDate) {
        result.releaseDate = releaseDate;
      }

      return await this.saveMusicInfo(releaseId, result);
    } catch (error) {
      console.error(`  ⚠ Music metadata fetch failed: ${error.message}`);
      return null;
    }
  }

  async searchAudioDB(artist, album) {
    try {
      const url = `https://www.theaudiodb.com/api/v1/json/${this.audioDbApiKey}/searchalbum.php?s=${encodeURIComponent(artist)}&a=${encodeURIComponent(album)}`;
      const data = await this.fetchJSON(url);

      if (data && data.album && data.album.length > 0) {
        const albumData = data.album[0];
        const result = {
          source: 'audiodb',
          audioDbAlbumId: albumData.idAlbum,
          audioDbArtistId: albumData.idArtist,
          musicBrainzId: albumData.strMusicBrainzID || null,
          artistMbid: albumData.strMusicBrainzArtistID || null,
          artist: albumData.strArtist || artist,
          albumTitle: albumData.strAlbum || album,
          releaseDate: albumData.intYearReleased ? `${albumData.intYearReleased}-01-01` : null,
          genre: albumData.strGenre || null,
          label: albumData.strLabel || null,
          coverUrl: albumData.strAlbumThumb || null,
          artistThumb: albumData.strArtistThumb || null,
          artistLogo: albumData.strArtistLogo || null,
          artistCutout: albumData.strArtistCutout || null,
          rawJson: JSON.stringify(albumData)
        };

        // Get tracks
        try {
          const tracksUrl = `https://www.theaudiodb.com/api/v1/json/1/track.php?m=${albumData.idAlbum}`;
          const tracksData = await this.fetchJSON(tracksUrl);
          if (tracksData && tracksData.track) {
            result.trackList = JSON.stringify(tracksData.track.map(t => t.strTrack));
          }
        } catch (e) {
          // Ignore track fetch errors
        }

        return result;
      }
    } catch (e) {
      // Ignore errors, fall back to MusicBrainz
    }
    return null;
  }

  async searchMusicBrainz(artist, album) {
    try {
      const query = encodeURIComponent(`artist:"${artist}" release:"${album}"`);
      const url = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json`;
      const data = await this.fetchJSON(url, { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });

      if (data && data.releases && data.releases.length > 0) {
        const release = data.releases[0];
        return {
          source: 'musicbrainz',
          musicBrainzId: release.id || null,
          artist: release['artist-credit']?.[0]?.name || artist,
          albumTitle: release.title || album,
          releaseDate: release.date || null,
          genre: null,
          label: null,
          coverUrl: null, // MusicBrainz doesn't provide cover art directly
          rawJson: JSON.stringify(release)
        };
      }
    } catch (e) {
      // Ignore errors
    }
    return null;
  }

  async getAudioDBAlbum(albumId) {
    try {
      const url = `https://www.theaudiodb.com/api/v1/json/${this.audioDbApiKey}/album.php?m=${encodeURIComponent(albumId)}`;
      const data = await this.fetchJSON(url);
      const albumData = data?.album?.[0];
      if (!albumData) {
        return null;
      }

      const result = {
        source: 'audiodb',
        audioDbAlbumId: albumData.idAlbum,
        audioDbArtistId: albumData.idArtist,
        musicBrainzId: albumData.strMusicBrainzID || null,
        artistMbid: albumData.strMusicBrainzArtistID || null,
        artist: albumData.strArtist || null,
        albumTitle: albumData.strAlbum || null,
        releaseDate: albumData.intYearReleased ? `${albumData.intYearReleased}-01-01` : null,
        genre: albumData.strGenre || null,
        label: albumData.strLabel || null,
        coverUrl: albumData.strAlbumThumb || albumData.strAlbumCDart || null,
        artistThumb: albumData.strArtistThumb || null,
        artistLogo: albumData.strArtistLogo || null,
        artistCutout: albumData.strArtistCutout || null,
        rawJson: JSON.stringify(albumData)
      };

      try {
        const tracksUrl = `https://www.theaudiodb.com/api/v1/json/${this.audioDbApiKey}/track.php?m=${albumData.idAlbum}`;
        const tracksData = await this.fetchJSON(tracksUrl);
        if (tracksData && tracksData.track) {
          result.trackList = JSON.stringify(tracksData.track.map(t => t.strTrack));
        }
      } catch (e) {
        // Partial failure is acceptable.
      }

      return result;
    } catch (e) {
      return null;
    }
  }

  async getMusicBrainzRelease(musicBrainzId) {
    try {
      const url = `https://musicbrainz.org/ws/2/release/${encodeURIComponent(musicBrainzId)}?fmt=json&inc=artist-credits+recordings+release-groups`;
      const data = await this.fetchJSON(url, { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
      if (!data) return null;

      return {
        source: 'musicbrainz',
        musicBrainzId: data.id || null,
        artist: data['artist-credit']?.[0]?.name || null,
        albumTitle: data.title || null,
        releaseDate: data.date || null,
        genre: null,
        label: null,
        coverUrl: null,
        rawJson: JSON.stringify(data)
      };
    } catch (e) {
      return null;
    }
  }

  async saveMusicInfo(releaseId, data) {
    const musicInfoRepository = require('./repositories/musicInfoRepository');
    const releaseRepository = require('./repositories/releaseRepository');

    // Download cover
    let coverPath = null;
    if (data.coverUrl && this.coversDir) {
      try {
        const coverFileName = `${data.audioDbAlbumId || data.musicBrainzId || releaseId}-cover.jpg`;
        coverPath = path.join(this.coversDir, coverFileName);
        if (!fs.existsSync(coverPath)) {
          await this.downloadImage(data.coverUrl, coverPath);
        }
      } catch (e) {
        console.error('Error downloading cover:', e.message);
        coverPath = null;
      }
    }

    // Download artist images
    let artistBackdrop = null;
    let artistLogo = null;
    let artistCutout = null;

    if (data.artistThumb && this.artistBackdropsDir) {
      try {
        const backdropFileName = `${data.audioDbArtistId || 'unknown'}-backdrop.jpg`;
        artistBackdrop = path.join(this.artistBackdropsDir, backdropFileName);
        if (!fs.existsSync(artistBackdrop)) {
          await this.downloadImage(data.artistThumb, artistBackdrop);
        }
      } catch (e) {
        console.error('Error downloading artist backdrop:', e.message);
        artistBackdrop = null;
      }
    }

    if (data.artistLogo && this.artistLogosDir) {
      try {
        const logoFileName = `${data.audioDbArtistId || 'unknown'}-logo.png`;
        artistLogo = path.join(this.artistLogosDir, logoFileName);
        if (!fs.existsSync(artistLogo)) {
          await this.downloadImage(data.artistLogo, artistLogo);
        }
      } catch (e) {
        console.error('Error downloading artist logo:', e.message);
        artistLogo = null;
      }
    }

    if (data.artistCutout && this.artistCutoutsDir) {
      try {
        const cutoutFileName = `${data.audioDbArtistId || 'unknown'}-cutout.png`;
        artistCutout = path.join(this.artistCutoutsDir, cutoutFileName);
        if (!fs.existsSync(artistCutout)) {
          await this.downloadImage(data.artistCutout, artistCutout);
        }
      } catch (e) {
        console.error('Error downloading artist cutout:', e.message);
        artistCutout = null;
      }
    }

    // Save to music_info
    await musicInfoRepository.createOrUpdate({
      musicbrainz_id: data.musicBrainzId,
      artist_mbid: data.artistMbid,
      audiodb_album_id: data.audioDbAlbumId,
      audiodb_artist_id: data.audioDbArtistId,
      artist: data.artist,
      album_title: data.albumTitle,
      release_date: data.releaseDate,
      genre: data.genre,
      track_list: data.trackList || null,
      label: data.label || null,
      cover_path: coverPath,
      artist_logo_path: artistLogo,
      artist_cutout_path: artistCutout,
      has_cover: !!coverPath,
      has_artist_logo: !!artistLogo,
      has_artist_cutout: !!artistCutout,
      raw_json: data.rawJson
    });

    // Link release to music_info
    const musicInfo = await musicInfoRepository.getByArtistAndAlbum(data.artist, data.albumTitle);
    if (musicInfo) {
      await releaseRepository.update(releaseId, {
        media_id: musicInfo.id,
        media_type: 'music'
      });
    }

    console.log(`  ✓ Music info saved: ${data.artist} - ${data.albumTitle}`);
    return { coverPath, artistBackdrop, artistLogo, artistCutout, musicInfo };
  }

  downloadImage(url, destPath) {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const client = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destPath);

      client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          this.downloadImage(response.headers.location, destPath).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(destPath);
        });
      }).on('error', reject);
    });
  }

  fetchJSON(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', ...headers } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          this.fetchJSON(res.headers.location, headers).then(resolve).catch(reject);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }
}

module.exports = new MusicMetadataService();
