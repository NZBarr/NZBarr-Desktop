// NZBarr Desktop - Collection Repository
const db = require('../database');

class CollectionRepository {
  async createOrUpdate(collection) {
    if (!collection?.tmdb_id) {
      throw new Error('Collection TMDB ID is required');
    }

    const existing = db.get('SELECT * FROM collections WHERE tmdb_id = ?', [collection.tmdb_id]);

    if (existing) {
      const sql = `
        UPDATE collections SET
          name = ?,
          overview = ?,
          has_poster = ?,
          has_backdrop = ?,
          has_logo = ?,
          poster_path = ?,
          backdrop_path = ?,
          logo_path = ?,
          raw_json = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      return db.run(sql, [
        collection.name || existing.name || '',
        collection.overview !== undefined ? collection.overview : existing.overview,
        collection.has_poster ? 1 : (existing.has_poster || 0),
        collection.has_backdrop ? 1 : (existing.has_backdrop || 0),
        collection.has_logo ? 1 : (existing.has_logo || 0),
        collection.poster_path || existing.poster_path || null,
        collection.backdrop_path || existing.backdrop_path || null,
        collection.logo_path || existing.logo_path || null,
        collection.raw_json || existing.raw_json || null,
        existing.id
      ]);
    }

    const sql = `
      INSERT INTO collections (
        tmdb_id, name, overview, has_poster, has_backdrop, has_logo,
        poster_path, backdrop_path, logo_path, raw_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;

    return db.run(sql, [
      collection.tmdb_id,
      collection.name || '',
      collection.overview || null,
      collection.has_poster ? 1 : 0,
      collection.has_backdrop ? 1 : 0,
      collection.has_logo ? 1 : 0,
      collection.poster_path || null,
      collection.backdrop_path || null,
      collection.logo_path || null,
      collection.raw_json || null
    ]);
  }

  async getByTMDB(tmdbId) {
    return db.get('SELECT * FROM collections WHERE tmdb_id = ?', [tmdbId]);
  }

  async getLibraryCollections(options = {}) {
    const {
      search = null,
      sortBy = 'name',
      sortOrder = 'ASC',
      page = 1,
      limit = 48
    } = options;

    const offset = (page - 1) * limit;
    const params = [];

    let sql = `
      SELECT
        c.*,
        COUNT(DISTINCT m.id) AS owned_count,
        MAX(r.add_date) AS latest_release_date
      FROM collections c
      INNER JOIN movie_info m ON m.collection_id = c.tmdb_id
      INNER JOIN releases r ON (
        r.media_type = 'movie'
        AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL))
        AND COALESCE(r.refresh_status, 'idle') != 'delete_pending'
      )
      WHERE 1=1
    `;

    let countSql = `
      SELECT COUNT(DISTINCT c.id) AS total
      FROM collections c
      INNER JOIN movie_info m ON m.collection_id = c.tmdb_id
      INNER JOIN releases r ON (
        r.media_type = 'movie'
        AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL))
        AND COALESCE(r.refresh_status, 'idle') != 'delete_pending'
      )
      WHERE 1=1
    `;

    if (search) {
      sql += ' AND c.name LIKE ?';
      countSql += ' AND c.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' GROUP BY c.id';

    const allowedSort = {
      name: 'c.name',
      owned_count: 'owned_count',
      latest_release_date: 'latest_release_date'
    };
    const sortColumn = allowedSort[sortBy] || 'c.name';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    sql += ` ORDER BY ${sortColumn} ${order}, c.name ASC LIMIT ? OFFSET ?`;

    const rows = db.all(sql, [...params, limit, offset]);
    const countRow = db.get(countSql, params);
    const items = rows.map(row => this.decorateCollectionRow(row));

    return {
      items,
      pagination: {
        page,
        limit,
        total: countRow?.total || 0,
        totalPages: Math.ceil((countRow?.total || 0) / limit),
        hasMore: offset + items.length < (countRow?.total || 0)
      }
    };
  }

  async getCollectionDetail(tmdbId) {
    const collection = await this.getByTMDB(tmdbId);
    if (!collection) return null;

    const ownedMovies = db.all(`
      SELECT
        m.id AS info_id,
        m.tmdb_id,
        m.imdb_id,
        m.title,
        m.release_date,
        m.rating,
        m.genres,
        m.cover_path,
        m.backdrop_path,
        m.logo_path,
        m.plot,
        m.youtube_trailer,
        COUNT(DISTINCT r.id) AS release_count,
        MAX(r.add_date) AS latest_release_date
      FROM movie_info m
      INNER JOIN releases r ON (
        r.media_type = 'movie'
        AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL))
        AND COALESCE(r.refresh_status, 'idle') != 'delete_pending'
      )
      WHERE m.collection_id = ?
      GROUP BY m.id
      ORDER BY COALESCE(m.release_date, '9999-12-31') ASC, m.title ASC
    `, [tmdbId]);

    const expectedMovies = this.extractCollectionParts(collection.raw_json);
    const ownedTmdbIds = new Set(ownedMovies.map(movie => Number(movie.tmdb_id)).filter(Boolean));
    const missingMovies = expectedMovies.filter(movie => !ownedTmdbIds.has(Number(movie.tmdb_id)));
    const decoratedCollection = this.decorateCollectionRow({
      ...collection,
      owned_count: ownedMovies.length
    });

    return {
      collection: decoratedCollection,
      ownedMovies,
      missingMovies,
      expectedMovies
    };
  }

  decorateCollectionRow(row) {
    const parts = this.extractCollectionParts(row.raw_json);
    return {
      ...row,
      total_count: parts.length || Number(row.owned_count) || 0,
      completion_label: `${Number(row.owned_count) || 0}/${parts.length || Number(row.owned_count) || 0}`,
      parts
    };
  }

  extractCollectionParts(rawJson) {
    if (!rawJson) return [];

    try {
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed.parts)) return [];

      return parsed.parts.map(part => ({
        tmdb_id: part.id,
        title: part.title || part.name || 'Untitled',
        release_date: part.release_date || null,
        year: part.release_date ? String(part.release_date).substring(0, 4) : '',
        poster_path: part.poster_path || null,
        backdrop_path: part.backdrop_path || null,
        overview: part.overview || ''
      }));
    } catch (error) {
      return [];
    }
  }
}

module.exports = new CollectionRepository();
