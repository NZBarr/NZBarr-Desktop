const db = require('../database');

function mapBooleanFields(row) {
  if (!row) return row;
  return {
    ...row,
    watched: Boolean(row.watched),
    favorite: Boolean(row.favorite)
  };
}

function normalizeSearchTokens(query) {
  return String(query || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function normalizedSqlExpression(column) {
  return `LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), ':', ' '), '.', ' '), '-', ' '), '_', ' '), '''', ' '), '&', ' and '))`;
}

function addTokenSearch(where, params, columns, query) {
  const tokens = normalizeSearchTokens(query);
  if (tokens.length === 0) return;

  for (const token of tokens) {
    where.push(`(${columns.map(column => `${normalizedSqlExpression(column)} LIKE ?`).join(' OR ')})`);
    columns.forEach(() => params.push(`%${token}%`));
  }
}

class StreamLibraryRepository {
  create(item) {
    const result = db.run(`
      INSERT INTO stream_library_items (
        title, original_filename, media_type, year, season_number, episode_number,
        stream_url, poster_url, poster_path, backdrop_url, backdrop_path, overview,
        runtime, resolution, source, video_codec, release_group, file_size,
        tmdb_id, imdb_id, tmdb_cache_key, watched, favorite
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.title,
      item.original_filename,
      item.media_type,
      item.year,
      item.season_number,
      item.episode_number,
      item.stream_url,
      item.poster_url,
      item.poster_path,
      item.backdrop_url,
      item.backdrop_path,
      item.overview,
      item.runtime,
      item.resolution,
      item.source,
      item.video_codec,
      item.release_group,
      item.file_size,
      item.tmdb_id,
      item.imdb_id,
      item.tmdb_cache_key,
      item.watched ? 1 : 0,
      item.favorite ? 1 : 0
    ]);

    return this.getById(result.id);
  }

  getById(id) {
    return mapBooleanFields(db.get('SELECT * FROM stream_library_items WHERE id = ?', [id]));
  }

  delete(id) {
    const existing = this.getById(id);
    if (!existing) {
      return { success: false, deleted: 0 };
    }

    const result = db.run('DELETE FROM stream_library_items WHERE id = ?', [id]);
    return { success: result.changes > 0, deleted: result.changes };
  }

  findByStreamUrl(streamUrl) {
    return mapBooleanFields(db.get('SELECT * FROM stream_library_items WHERE stream_url = ?', [streamUrl]));
  }

  list(options = {}) {
    const where = [];
    const params = [];

    if (options.mediaType && ['movie', 'tv'].includes(options.mediaType)) {
      where.push('media_type = ?');
      params.push(options.mediaType);
    }

    if (options.view === 'favorites') {
      where.push('favorite = 1');
    } else if (options.view === 'recent') {
      // Sorting handles the recent view.
    } else if (options.view === 'unwatched') {
      where.push('watched = 0');
    } else if (options.view === 'watched') {
      where.push('watched = 1');
    }

    if (options.query) {
      addTokenSearch(where, params, ['title', 'original_filename', 'overview'], options.query);
    }

    const limit = Math.max(1, Math.min(parseInt(options.limit || 120, 10), 500));
    const sql = `
      SELECT *
      FROM stream_library_items
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY date_added DESC, title COLLATE NOCASE ASC
      LIMIT ?
    `;

    return db.all(sql, [...params, limit]).map(mapBooleanFields);
  }

  updateFlags(id, fields = {}) {
    const allowed = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(fields, 'watched')) {
      allowed.push('watched = ?');
      params.push(fields.watched ? 1 : 0);
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'favorite')) {
      allowed.push('favorite = ?');
      params.push(fields.favorite ? 1 : 0);
    }
    if (allowed.length === 0) return this.getById(id);

    allowed.push('updated_at = CURRENT_TIMESTAMP');
    db.run(`UPDATE stream_library_items SET ${allowed.join(', ')} WHERE id = ?`, [...params, id]);
    return this.getById(id);
  }

  updateMetadata(id, fields = {}) {
    const allowedFields = [
      'title', 'year', 'poster_url', 'poster_path', 'backdrop_url', 'backdrop_path',
      'overview', 'runtime', 'tmdb_id', 'imdb_id', 'tmdb_cache_key', 'media_type',
      'season_number', 'episode_number'
    ];

    const entries = Object.entries(fields).filter(([key]) => allowedFields.includes(key));
    if (entries.length === 0) return this.getById(id);

    const setClauses = entries.map(([key]) => `${key} = ?`);
    const params = entries.map(([, value]) => value);
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    db.run(`UPDATE stream_library_items SET ${setClauses.join(', ')} WHERE id = ?`, [...params, id]);
    return this.getById(id);
  }

  getCounts() {
    return db.get(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN media_type = 'movie' THEN 1 ELSE 0 END) AS movies,
        SUM(CASE WHEN media_type = 'tv' THEN 1 ELSE 0 END) AS tv,
        SUM(CASE WHEN favorite = 1 THEN 1 ELSE 0 END) AS favorites,
        SUM(CASE WHEN watched = 1 THEN 1 ELSE 0 END) AS watched
      FROM stream_library_items
    `);
  }

  upsertMetadataCache(cache) {
    db.run(`
      INSERT INTO stream_metadata_cache (
        cache_key, media_type, tmdb_id, title, year, poster_url, backdrop_url,
        overview, runtime, raw_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(cache_key) DO UPDATE SET
        media_type = excluded.media_type,
        tmdb_id = excluded.tmdb_id,
        title = excluded.title,
        year = excluded.year,
        poster_url = excluded.poster_url,
        backdrop_url = excluded.backdrop_url,
        overview = excluded.overview,
        runtime = excluded.runtime,
        raw_json = excluded.raw_json,
        updated_at = CURRENT_TIMESTAMP
    `, [
      cache.cache_key,
      cache.media_type,
      cache.tmdb_id,
      cache.title,
      cache.year,
      cache.poster_url,
      cache.backdrop_url,
      cache.overview,
      cache.runtime,
      cache.raw_json
    ]);
  }
}

module.exports = new StreamLibraryRepository();
