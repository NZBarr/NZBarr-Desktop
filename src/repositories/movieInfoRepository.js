// NZBarr Desktop - Movie Info Repository
const db = require('../database');

class MovieInfoRepository {
  async createOrUpdate(movie) {
    // First check if record exists by tmdb_id or imdb_id
    let existing = null;
    if (movie.tmdb_id) {
      existing = db.get('SELECT * FROM movie_info WHERE tmdb_id = ?', [movie.tmdb_id]);
    }
    if (!existing && movie.imdb_id) {
      existing = db.get('SELECT * FROM movie_info WHERE imdb_id = ?', [movie.imdb_id]);
    }

    if (existing) {
      // Update existing record
      const sql = `
        UPDATE movie_info SET
          imdb_id = COALESCE(?, imdb_id),
          tmdb_id = COALESCE(?, tmdb_id),
          title = ?, original_title = ?, plot = ?, tagline = ?, release_date = ?,
          runtime = ?, rating = ?, genres = ?, actors = ?, director = ?, language = ?,
          country = ?, youtube_trailer = ?, collection_id = ?, has_cover = ?, has_backdrop = ?, has_logo = ?,
          cover_path = ?, backdrop_path = ?, logo_path = ?,
          raw_json = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [
        movie.imdb_id || null,
        movie.tmdb_id || null,
        movie.title || existing.title || '',
        movie.original_title || existing.original_title || null,
        movie.plot || existing.plot || null,
        movie.tagline || existing.tagline || null,
        movie.release_date || existing.release_date || null,
        movie.runtime || existing.runtime || null,
        movie.rating || existing.rating || null,
        movie.genres || existing.genres || null,
        movie.actors || existing.actors || null,
        movie.director || existing.director || null,
        movie.language || existing.language || null,
        movie.country || existing.country || null,
        movie.youtube_trailer || existing.youtube_trailer || null,
        movie.collection_id !== undefined ? movie.collection_id : (existing.collection_id || null),
        movie.has_cover ? 1 : (existing.has_cover || 0),
        movie.has_backdrop ? 1 : (existing.has_backdrop || 0),
        movie.has_logo ? 1 : (existing.has_logo || 0),
        movie.cover_path || existing.cover_path || null,
        movie.backdrop_path || existing.backdrop_path || null,
        movie.logo_path || existing.logo_path || null,
        movie.raw_json || existing.raw_json || null,
        existing.id
      ];
      return db.run(sql, params);
    }

    // Insert new record
    const sql = `
      INSERT INTO movie_info (
        imdb_id, tmdb_id, title, original_title, plot, tagline, release_date,
        runtime, rating, genres, actors, director, language, country,
        collection_id,
        youtube_trailer, has_cover, has_backdrop, has_logo,
        cover_path, backdrop_path, logo_path, raw_json, last_updated
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `;
    const params = [
      movie.imdb_id || null,
      movie.tmdb_id || null,
      movie.title || '',
      movie.original_title || null,
      movie.plot || null,
      movie.tagline || null,
      movie.release_date || null,
      movie.runtime || null,
      movie.rating || null,
      movie.genres || null,
      movie.actors || null,
      movie.director || null,
      movie.language || null,
      movie.country || null,
      movie.collection_id || null,
      movie.youtube_trailer || null,
      movie.has_cover ? 1 : 0,
      movie.has_backdrop ? 1 : 0,
      movie.has_logo ? 1 : 0,
      movie.cover_path || null,
      movie.backdrop_path || null,
      movie.logo_path || null,
      movie.raw_json || null
    ];

    return db.run(sql, params);
  }

  async getByIMDB(imdbId) {
    return db.get('SELECT * FROM movie_info WHERE imdb_id = ?', [imdbId]);
  }

  async getByTMDB(tmdbId) {
    return db.get('SELECT * FROM movie_info WHERE tmdb_id = ?', [tmdbId]);
  }

  async getAll() {
    return db.all('SELECT * FROM movie_info ORDER BY title');
  }

  async update(id, updates) {
    const allowedFields = [
      'imdb_id', 'tmdb_id', 'title', 'original_title', 'plot', 'tagline',
      'release_date', 'runtime', 'rating', 'genres', 'actors', 'director',
      'language', 'country', 'youtube_trailer', 'collection_id', 'cover_path', 'backdrop_path',
      'logo_path', 'has_cover', 'has_backdrop', 'has_logo'
    ];

    const fields = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields[key] = value;
      }
    }

    if (Object.keys(fields).length === 0) return;

    const setClauses = Object.keys(fields).map(key => `${key} = ?`);
    const sql = `UPDATE movie_info SET ${setClauses.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [...Object.values(fields), id];
    return db.run(sql, params);
  }

  async delete(id) {
    // Get record first to retrieve image paths
    const record = db.get('SELECT * FROM movie_info WHERE id = ?', [id]);
    if (record) {
      // Delete from DB
      db.run('DELETE FROM movie_info WHERE id = ?', [id]);
    }
    return { success: !!record, record };
  }
}

module.exports = new MovieInfoRepository();
