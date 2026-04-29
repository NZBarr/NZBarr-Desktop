// NZBarr Desktop - TV Info Repository
const db = require('../database');

class TVInfoRepository {
  async createOrUpdate(tv) {
    // First check if record exists by tmdb_id or imdb_id
    let existing = null;
    if (tv.tmdb_id) {
      existing = db.get('SELECT * FROM tv_info WHERE tmdb_id = ?', [tv.tmdb_id]);
    }
    if (!existing && tv.imdb_id) {
      existing = db.get('SELECT * FROM tv_info WHERE imdb_id = ?', [tv.imdb_id]);
    }

    if (existing) {
      // Update existing record
      const sql = `
        UPDATE tv_info SET
          tmdb_id = COALESCE(?, tmdb_id),
          imdb_id = COALESCE(?, imdb_id),
          title = ?, original_name = ?, plot = ?, first_air_date = ?,
          last_air_date = ?, runtime = ?, number_of_seasons = ?, number_of_episodes = ?,
          rating = ?, genres = ?, actors = ?, language = ?, country = ?,
          status = ?, youtube_trailer = ?, has_cover = ?, has_backdrop = ?, has_logo = ?,
          cover_path = ?, backdrop_path = ?, logo_path = ?,
          raw_json = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [
        tv.tmdb_id || existing.tmdb_id || null,
        tv.imdb_id || null,
        tv.title || existing.title || '',
        tv.original_title || tv.original_name || existing.original_name || null,
        tv.plot || existing.plot || null,
        tv.first_air_date || existing.first_air_date || null,
        tv.last_air_date || existing.last_air_date || null,
        tv.runtime || existing.runtime || null,
        tv.number_of_seasons || existing.number_of_seasons || null,
        tv.number_of_episodes || existing.number_of_episodes || null,
        tv.rating || existing.rating || null,
        tv.genres || existing.genres || null,
        tv.actors || existing.actors || null,
        tv.language || existing.language || null,
        tv.country || existing.country || null,
        tv.status || existing.status || null,
        tv.youtube_trailer || existing.youtube_trailer || null,
        tv.has_cover ? 1 : (existing.has_cover || 0),
        tv.has_backdrop ? 1 : (existing.has_backdrop || 0),
        tv.has_logo ? 1 : (existing.has_logo || 0),
        tv.cover_path || existing.cover_path || null,
        tv.backdrop_path || existing.backdrop_path || null,
        tv.logo_path || existing.logo_path || null,
        tv.raw_json || existing.raw_json || null,
        existing.id
      ];
      return db.run(sql, params);
    }

    // Insert new record
    const sql = `
      INSERT INTO tv_info (
        tmdb_id, imdb_id, title, original_name, plot, first_air_date,
        last_air_date, runtime, number_of_seasons, number_of_episodes,
        rating, genres, actors, language, country,
        status, youtube_trailer, has_cover, has_backdrop, has_logo,
        cover_path, backdrop_path, logo_path, raw_json, last_updated
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `;
    const params = [
      tv.tmdb_id || null,
      tv.imdb_id || null,
      tv.title || '',
      tv.original_title || tv.original_name || null,
      tv.plot || null,
      tv.first_air_date || null,
      tv.last_air_date || null,
      tv.runtime || null,
      tv.number_of_seasons || null,
      tv.number_of_episodes || null,
      tv.rating || null,
      tv.genres || null,
      tv.actors || null,
      tv.language || null,
      tv.country || null,
      tv.status || null,
      tv.youtube_trailer || null,
      tv.has_cover ? 1 : 0,
      tv.has_backdrop ? 1 : 0,
      tv.has_logo ? 1 : 0,
      tv.cover_path || null,
      tv.backdrop_path || null,
      tv.logo_path || null,
      tv.raw_json || null
    ];

    return db.run(sql, params);
  }

  async getByTMDB(tmdbId) {
    return db.get('SELECT * FROM tv_info WHERE tmdb_id = ?', [tmdbId]);
  }

  async getByIMDB(imdbId) {
    return db.get('SELECT * FROM tv_info WHERE imdb_id = ?', [imdbId]);
  }

  async getAll() {
    return db.all('SELECT * FROM tv_info ORDER BY title');
  }

  async update(id, updates) {
    const allowedFields = [
      'imdb_id', 'tmdb_id', 'title', 'original_name', 'plot', 'first_air_date',
      'last_air_date', 'runtime', 'number_of_seasons', 'number_of_episodes',
      'rating', 'genres', 'actors', 'language', 'country', 'status',
      'youtube_trailer', 'cover_path', 'backdrop_path', 'logo_path',
      'has_cover', 'has_backdrop', 'has_logo'
    ];

    const fields = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields[key] = value;
      }
    }

    if (Object.keys(fields).length === 0) return;

    const setClauses = Object.keys(fields).map(key => `${key} = ?`);
    const sql = `UPDATE tv_info SET ${setClauses.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [...Object.values(fields), id];
    return db.run(sql, params);
  }

  async delete(id) {
    const record = db.get('SELECT * FROM tv_info WHERE id = ?', [id]);
    if (record) {
      db.run('DELETE FROM tv_info WHERE id = ?', [id]);
    }
    return { success: !!record, record };
  }
}

module.exports = new TVInfoRepository();
