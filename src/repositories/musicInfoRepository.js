const db = require('../database');

class MusicInfoRepository {
  async createOrUpdate(music) {
    // Check if existing record by musicbrainz_id or audiodb_album_id
    let existing = null;
    if (music.musicbrainz_id) {
      existing = db.get('SELECT id FROM music_info WHERE musicbrainz_id = ?', [music.musicbrainz_id]);
    }
    if (!existing && music.audiodb_album_id) {
      existing = db.get('SELECT id FROM music_info WHERE audiodb_album_id = ?', [music.audiodb_album_id]);
    }

    if (existing) {
      // Update existing
      const sql = `
        UPDATE music_info SET
          musicbrainz_id = ?, release_group_mbid = ?, artist_mbid = ?,
          audiodb_album_id = ?, audiodb_artist_id = ?, artist = ?, album_title = ?,
          release_date = ?, genre = ?, track_list = ?, label = ?,
          has_cover = ?, has_artist_logo = ?, has_artist_cutout = ?,
          cover_path = ?, artist_logo_path = ?, artist_cutout_path = ?,
          raw_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [
        music.musicbrainz_id || null,
        music.release_group_mbid || null,
        music.artist_mbid || null,
        music.audiodb_album_id || null,
        music.audiodb_artist_id || null,
        music.artist || '',
        music.album_title || '',
        music.release_date || null,
        music.genre || null,
        music.track_list || null,
        music.label || null,
        music.has_cover ? 1 : 0,
        music.has_artist_logo ? 1 : 0,
        music.has_artist_cutout ? 1 : 0,
        music.cover_path || null,
        music.artist_logo_path || null,
        music.artist_cutout_path || null,
        music.raw_json || null,
        existing.id
      ];
      return db.run(sql, params);
    }

    // Insert new
    const sql = `
      INSERT INTO music_info (
        musicbrainz_id, release_group_mbid, artist_mbid,
        audiodb_album_id, audiodb_artist_id, artist, album_title,
        release_date, genre, track_list, label,
        has_cover, has_artist_logo, has_artist_cutout,
        cover_path, artist_logo_path, artist_cutout_path,
        raw_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
    const params = [
      music.musicbrainz_id || null,
      music.release_group_mbid || null,
      music.artist_mbid || null,
      music.audiodb_album_id || null,
      music.audiodb_artist_id || null,
      music.artist || '',
      music.album_title || '',
      music.release_date || null,
      music.genre || null,
      music.track_list || null,
      music.label || null,
      music.has_cover ? 1 : 0,
      music.has_artist_logo ? 1 : 0,
      music.has_artist_cutout ? 1 : 0,
      music.cover_path || null,
      music.artist_logo_path || null,
      music.artist_cutout_path || null,
      music.raw_json || null
    ];

    return db.run(sql, params);
  }

  async getByArtistAndAlbum(artist, album) {
    return db.get('SELECT * FROM music_info WHERE artist = ? AND album_title = ?', [artist, album]);
  }

  async getByAudioDbAlbumId(audiodbAlbumId) {
    return db.get('SELECT * FROM music_info WHERE audiodb_album_id = ?', [audiodbAlbumId]);
  }

  async getByMusicBrainzId(musicbrainzId) {
    return db.get('SELECT * FROM music_info WHERE musicbrainz_id = ?', [musicbrainzId]);
  }

  async getById(id) {
    return db.get('SELECT * FROM music_info WHERE id = ?', [id]);
  }

  async getAll() {
    return db.all('SELECT * FROM music_info ORDER BY artist, album_title');
  }

  async delete(id) {
    return db.run('DELETE FROM music_info WHERE id = ?', [id]);
  }
}

module.exports = new MusicInfoRepository();
