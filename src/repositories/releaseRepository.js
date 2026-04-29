// NZBarr Desktop - Release Repository
const db = require('../database');

class ReleaseRepository {
  getDateSortExpression(column) {
    return `COALESCE(julianday(r.${column}), 0)`;
  }

  normalizeSearchTokens(query) {
    return String(query || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);
  }

  normalizedSqlExpression(column) {
    return `LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), ':', ' '), '.', ' '), '-', ' '), '_', ' '), '''', ' '), '&', ' and '))`;
  }

  buildTokenSearchClause(columns, query, params) {
    const tokens = this.normalizeSearchTokens(query);
    if (tokens.length === 0) return '';

    const tokenClauses = tokens.map(token => {
      const columnClauses = columns.map(column => `${this.normalizedSqlExpression(column)} LIKE ?`);
      for (let i = 0; i < columns.length; i++) {
        params.push(`%${token}%`);
      }
      return `(${columnClauses.join(' OR ')})`;
    });

    return ` AND ${tokenClauses.join(' AND ')}`;
  }

  /**
   * Create a new release
   */
  async create(release) {
    const sql = `
      INSERT INTO releases (
        search_name, clean_name, imdb_id, tmdb_id, media_id, media_type,
        cover_image, backdrop_path, logo_path, category_id, nzb_guid, nzb_file_path, nzb_hash, size, post_date,
        season, episode, parts, resolution, video_codec, audio_codec,
        audio_channels, source, subtitles, language, format, password,
        nfo_text, mediainfo_raw, release_group, status, ownership_type,
        ownership_notes, source_path, refresh_status, last_refresh_at,
        last_refresh_error, parent_release_id, is_active_revision
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;

    const params = [
      release.search_name,
      release.clean_name,
      release.imdb_id || null,
      release.tmdb_id || null,
      release.media_id || null,
      release.media_type || null,
      release.cover_image || null,
      release.backdrop_path || null,
      release.logo_path || null,
      release.category_id,
      release.nzb_guid,
      release.nzb_file_path || null,
      release.nzb_hash || null,
      release.size || 0,
      release.post_date ? (release.post_date instanceof Date ? release.post_date.toISOString() : release.post_date) : null,
      release.season || null,
      release.episode || null,
      release.parts || 0,
      release.resolution || null,
      release.video_codec || null,
      release.audio_codec || null,
      release.audio_channels || null,
      release.source || null,
      release.subtitles || null,
      release.language || null,
      release.format || null,
      release.password || null,
      release.nfo_text || null,
      release.mediainfo_raw || null,
      release.release_group || null,
      release.status || 'available',
      release.ownership_type || 'imported',
      release.ownership_notes || null,
      release.source_path || null,
      release.refresh_status || 'idle',
      release.last_refresh_at || null,
      release.last_refresh_error || null,
      release.parent_release_id || null,
      release.is_active_revision !== undefined ? release.is_active_revision : 1
    ];

    const result = db.run(sql, params);
    return result.id;
  }

  /**
   * Get release by ID
   */
  async getById(id) {
    const sql = `
      SELECT r.*, c.name as category_name, c.parent_id as category_parent_id
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.id = ?
    `;
    return db.get(sql, [id]);
  }

  /**
   * Get release by NZB GUID
   */
  async getByGuid(nzbGuid) {
    return db.get('SELECT * FROM releases WHERE nzb_guid = ?', [nzbGuid]);
  }

  async getByNzbHash(hash) {
    return db.get('SELECT * FROM releases WHERE nzb_hash = ?', [hash]);
  }

  /**
   * Get releases with pagination and filters
   */
  async getAll(options = {}) {
    const {
      page = 1,
      limit = 30,
      category = null,
      mediaType = null,
      search = null,
      status = null,
      refreshStatus = null,
      sortBy = 'add_date',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    let sql = `
      SELECT r.*, c.name as category_name
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      sql += ' AND (r.category_id = ? OR c.parent_id = ?)';
      params.push(category, category);
    }

    if (mediaType) {
      sql += ' AND r.media_type = ?';
      params.push(mediaType);
    }

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    if (refreshStatus) {
      sql += ' AND r.refresh_status = ?';
      params.push(refreshStatus);
    }

    if (search) {
      sql += this.buildTokenSearchClause(['r.clean_name', 'r.search_name'], search, params);
    }

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = [
      'add_date',
      'clean_name',
      'size',
      'post_date',
      'rating',
      'category_id',
      'category_name',
      'quality_rank',
      'video_codec',
      'audio_codec',
      'source',
      'release_group'
    ];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'post_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (sortColumn === 'category_name') {
      sql += ` ORDER BY COALESCE(c.name, '') ${order}, r.clean_name ASC`;
    } else if (sortColumn === 'quality_rank') {
      sql += ` ORDER BY CASE
        WHEN UPPER(COALESCE(r.resolution, '')) LIKE '%2160%' OR UPPER(COALESCE(r.resolution, '')) LIKE '%4K%' THEN 4
        WHEN UPPER(COALESCE(r.resolution, '')) LIKE '%1080%' THEN 3
        WHEN UPPER(COALESCE(r.resolution, '')) LIKE '%720%' THEN 2
        WHEN UPPER(COALESCE(r.resolution, '')) LIKE '%480%' THEN 1
        ELSE 0
      END ${order}, r.size ${order}`;
    } else if (sortColumn === 'post_date' || sortColumn === 'add_date') {
      sql += ` ORDER BY ${this.getDateSortExpression(sortColumn)} ${order}`;
    } else {
      sql += ` ORDER BY r.${sortColumn} ${order}`;
    }
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const releases = db.all(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM releases WHERE 1=1';
    const countParams = [];

    if (category) {
      countSql += ' AND (category_id = ? OR category_id IN (SELECT id FROM categories WHERE parent_id = ?))';
      countParams.push(category, category);
    }
    if (mediaType) {
      countSql += ' AND media_type = ?';
      countParams.push(mediaType);
    }
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (refreshStatus) {
      countSql += ' AND refresh_status = ?';
      countParams.push(refreshStatus);
    }
    if (search) {
      countSql += this.buildTokenSearchClause(['clean_name', 'search_name'], search, countParams);
    }

    const countResult = db.get(countSql, countParams);
    const total = countResult?.total || 0;

    return {
      releases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + releases.length < total
      }
    };
  }

  /**
   * Update release
   */
  async update(id, updates) {
    const allowedFields = [
      'search_name', 'status', 'local_file_path', 'cover_image', 'backdrop_path', 'logo_path',
      'nfo_text', 'mediainfo_raw', 'password', 'season', 'episode', 'media_id',
      'media_type', 'imdb_id', 'tmdb_id', 'category_id', 'resolution', 'video_codec',
      'audio_codec', 'audio_channels', 'source', 'subtitles', 'language', 'format',
      'release_group', 'grabs', 'nzb_guid', 'nzb_hash', 'nzb_file_path', 'ownership_type',
      'ownership_notes', 'source_path', 'refresh_status', 'last_refresh_at',
      'last_refresh_error', 'parent_release_id', 'is_active_revision'
    ];

    const fields = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => `${key} = ?`);

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const sql = `UPDATE releases SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [...fields.map(key => updates[key.replace(' = ?', '')]), id];

    const result = db.run(sql, params);

    // Force WAL checkpoint to ensure the write is visible to subsequent reads
    db.run('PRAGMA wal_checkpoint(TRUNCATE)');

    return result;
  }

  /**
   * Delete release and its associated files
   */
  async delete(id) {
    // Get the release first
    const release = await this.getById(id);
    
    if (release) {
      const fs = require('fs');
      
      // Delete NZB file
      if (release.nzb_file_path) {
        try {
          if (fs.existsSync(release.nzb_file_path)) {
            fs.unlinkSync(release.nzb_file_path);
            console.log(`  ✓ Deleted NZB file: ${release.nzb_file_path}`);
          }
        } catch (error) {
          console.error(`  ⚠ Failed to delete NZB file: ${error.message}`);
        }
      }
    }

    return db.run('DELETE FROM releases WHERE id = ?', [id]);
  }

  /**
   * Get recent releases
   */
  async getRecent(limit = 20) {
    const sql = `
      SELECT r.*, c.name as category_name
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY r.add_date DESC
      LIMIT ?
    `;
    return db.all(sql, [limit]);
  }

  /**
   * Search releases
   */
  async search(query, options = {}) {
    const { limit = 50, category = null, mediaType = null } = options;
    const params = [];
    
    const sql = `
      SELECT r.*, c.name as category_name
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE 1=1
      ${this.buildTokenSearchClause(['r.clean_name', 'r.search_name'], query, params)}
      ${category ? 'AND (r.category_id = ? OR c.parent_id = ?)' : ''}
      ${mediaType ? 'AND r.media_type = ?' : ''}
      ORDER BY r.add_date DESC
      LIMIT ?
    `;

    if (category) params.push(category, category);
    if (mediaType) params.push(mediaType);
    params.push(limit);

    return db.all(sql, params);
  }

  /**
   * Get releases by media type
   */
  async getByMediaType(mediaType, limit = 30, offset = 0) {
    const sql = `
      SELECT r.*, c.name as category_name
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.media_type = ?
      ORDER BY r.add_date DESC
      LIMIT ? OFFSET ?
    `;
    return db.all(sql, [mediaType, limit, offset]);
  }

  /**
   * Get unique movies (one entry per movie, with best quality release)
   */
  async getUniqueMovies(options = {}) {
    const {
      page = 1,
      limit = 30,
      category = null,
      search = null,
      sortBy = 'add_date',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    // Get unique movies by grouping on IMDB/TMDB ID
    let sql = `
      SELECT r.*, c.name as category_name,
             COUNT(*) as release_count
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.media_type = 'movie'
    `;
    const params = [];

    if (category) {
      sql += ' AND (r.category_id = ? OR c.parent_id = ?)';
      params.push(category, category);
    }

    if (search) {
      sql += this.buildTokenSearchClause(['r.clean_name', 'r.search_name'], search, params);
    }

    // Group by movie identifier - use imdb_id or tmdb_id, fall back to release id
    sql += ' GROUP BY CASE WHEN r.imdb_id IS NOT NULL THEN r.imdb_id WHEN r.tmdb_id IS NOT NULL THEN r.tmdb_id ELSE r.id END';
    
    const allowedSortColumns = ['add_date', 'clean_name', 'size', 'post_date'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'add_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    if (sortColumn === 'post_date' || sortColumn === 'add_date') {
      sql += ` ORDER BY MAX(${this.getDateSortExpression(sortColumn)}) ${order}`;
    } else {
      sql += ` ORDER BY MAX(r.${sortColumn}) ${order}`;
    }
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const movies = db.all(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(DISTINCT CASE WHEN imdb_id IS NOT NULL THEN imdb_id WHEN tmdb_id IS NOT NULL THEN tmdb_id ELSE id END) as total
      FROM releases WHERE media_type = 'movie'
    `;
    const countResult = db.get(countSql);
    const total = countResult?.total || 0;

    return {
      movies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + movies.length < total
      }
    };
  }

  /**
   * Get unique TV shows (one entry per show, with best quality release)
   */
  async getUniqueTV(options = {}) {
    const {
      page = 1,
      limit = 30,
      category = null,
      search = null,
      sortBy = 'add_date',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*, c.name as category_name,
             COUNT(*) as release_count
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.media_type = 'tv'
    `;
    const params = [];

    if (category) {
      sql += ' AND (r.category_id = ? OR c.parent_id = ?)';
      params.push(category, category);
    }

    if (search) {
      sql += this.buildTokenSearchClause(['r.clean_name', 'r.search_name'], search, params);
    }

    sql += ' GROUP BY CASE WHEN r.tmdb_id IS NOT NULL THEN r.tmdb_id ELSE r.id END';

    const allowedSortColumns = ['add_date', 'clean_name', 'size', 'post_date'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'add_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    if (sortColumn === 'post_date' || sortColumn === 'add_date') {
      sql += ` ORDER BY MAX(${this.getDateSortExpression(sortColumn)}) ${order}`;
    } else {
      sql += ` ORDER BY MAX(r.${sortColumn}) ${order}`;
    }
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const shows = db.all(sql, params);

    let countSql = `
      SELECT COUNT(DISTINCT CASE WHEN tmdb_id IS NOT NULL THEN tmdb_id ELSE id END) as total
      FROM releases WHERE media_type = 'tv'
    `;
    const countResult = db.get(countSql);
    const total = countResult?.total || 0;

    return {
      shows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + shows.length < total
      }
    };
  }

  /**
   * Get releases with local files (downloaded)
   */
  async getDownloaded() {
    const sql = `
      SELECT r.*, c.name as category_name
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.local_file_path IS NOT NULL AND r.status = 'downloaded'
      ORDER BY r.add_date DESC
    `;
    return db.all(sql);
  }

  /**
   * Get all releases for a movie/TV show (by TMDB or IMDB ID)
   */
  async getByMovieId(tmdbId, imdbId, mediaType = null) {
    let sql = `
      SELECT r.*, c.name as category_name
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE `;

    const params = [];
    const conditions = [];

    if (mediaType) {
      sql += 'r.media_type = ? AND ';
      params.push(mediaType);
    }

    if (tmdbId) {
      conditions.push('r.tmdb_id = ?');
      params.push(tmdbId);
    }
    if (imdbId) {
      conditions.push('r.imdb_id = ?');
      params.push(imdbId);
    }

    if (conditions.length === 0) {
      return [];
    }

    sql += '(' + conditions.join(' OR ') + ') ORDER BY r.resolution DESC, r.size DESC';

    return db.all(sql, params);
  }

  /**
   * Get TV episodes for a series
   */
  async getTVEpisodes(tmdbId) {
    const sql = `
      SELECT r.*, c.name as category_name
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.tmdb_id = ? AND r.media_type = 'tv'
      ORDER BY r.season DESC, r.episode DESC
    `;
    return db.all(sql, [tmdbId]);
  }

  /**
   * Get recently added items grouped by title (movies, TV, music, etc.)
   * Returns one entry per unique title with the best cover image
   */
  async getRecentlyAdded(options = {}) {
    const { limit = 20, mediaType = null } = options;

    // Get recently added unique items grouped by identifier
    let sql = `
      SELECT
        MIN(r.id) as id,
        MAX(r.tmdb_id) as tmdb_id,
        MAX(r.imdb_id) as imdb_id,
        MAX(r.media_type) as media_type,
        MAX(r.clean_name) as clean_name,
        MAX(r.search_name) as search_name,
        MAX(r.resolution) as resolution,
        MAX(r.size) as size,
        MAX(r.add_date) as add_date,
        MAX(r.category_id) as category_id,
        MAX(c.name) as category_name,
        MAX(r.cover_image) as cover_image,
        MAX(r.backdrop_path) as backdrop_path,
        MAX(r.logo_path) as logo_path,
        COUNT(*) as release_count,
        MAX(r.add_date) as latest_add_date
      FROM releases r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (mediaType) {
      sql += ' AND r.media_type = ?';
      params.push(mediaType);
    }

    // Group by identifier
    sql += ` GROUP BY CASE
      WHEN r.imdb_id IS NOT NULL THEN r.imdb_id
      WHEN r.tmdb_id IS NOT NULL THEN r.tmdb_id
      ELSE r.id
    END`;

    sql += ` ORDER BY MAX(r.add_date) DESC LIMIT ?`;
    params.push(limit);

    const items = db.all(sql, params);

    // Now enrich with movie_info/tv_info/music_info data for backdrops, logos, plots, etc.
    for (const item of items) {
      let info = null;
      if (item.media_type === 'movie' && item.imdb_id) {
        info = db.get(
          'SELECT title, release_date, rating, genres, plot, cover_path, backdrop_path, logo_path, youtube_trailer, director, runtime FROM movie_info WHERE imdb_id = ?',
          [item.imdb_id]
        );
      }
      if (item.media_type === 'movie' && item.tmdb_id && !info) {
        // Fallback: lookup by TMDB when the info row does not carry the release IMDb ID.
        info = db.get(
          'SELECT title, release_date, rating, genres, plot, cover_path, backdrop_path, logo_path, youtube_trailer, director, runtime FROM movie_info WHERE tmdb_id = ?',
          [item.tmdb_id]
        );
      } else if (item.media_type === 'tv' && item.tmdb_id) {
        info = db.get(
          'SELECT title, first_air_date as release_date, rating, genres, plot, cover_path, backdrop_path, logo_path, youtube_trailer FROM tv_info WHERE tmdb_id = ?',
          [item.tmdb_id]
        );
      } else if (item.media_type === 'music' && item.media_id) {
        info = db.get(
          'SELECT artist, album_title as title, genre, cover_path, artist_logo_path as logo_path, release_date, track_list FROM music_info WHERE id = ?',
          [item.media_id]
        );
        if (info) {
          item.title = (info.artist ? info.artist + ' - ' : '') + (info.title || '');
          item.year = info.release_date ? info.release_date.substring(0, 4) : null;
          item.genres = info.genre;
          item.plot = info.track_list ? `Tracklist:\n${JSON.parse(info.track_list).join('\n')}` : null;
          item.cover_image = info.cover_path || item.cover_image;
          item.logo_path = info.logo_path || item.logo_path;
        }
      } else if (item.media_type === 'music' && !item.media_id && item.clean_name) {
        // Fallback: try to find music_info by title match
        const searchName = item.clean_name.replace(/\[.*?\]/g, '').replace(/[-_]/g, ' ').trim();
        info = db.get(
          'SELECT artist, album_title as title, genre, cover_path, artist_logo_path as logo_path, release_date, track_list FROM music_info WHERE album_title LIKE ? LIMIT 1',
          ['%' + searchName + '%']
        );
        if (info) {
          item.title = (info.artist ? info.artist + ' - ' : '') + (info.title || '');
          item.year = info.release_date ? info.release_date.substring(0, 4) : null;
          item.genres = info.genre;
          item.plot = info.track_list ? `Tracklist:\n${JSON.parse(info.track_list).join('\n')}` : null;
          item.cover_image = info.cover_path || item.cover_image;
          item.logo_path = info.logo_path || item.logo_path;
        }
      }

      if (info) {
        item.title = item.title || info.title;
        item.year = info.release_date ? info.release_date.substring(0, 4) : null;
        item.info_rating = info.rating;
        item.genres = info.genres;
        item.plot = info.plot;
        // Use info paths if available, fall back to release-level paths
        item.cover_image = info.cover_path || item.cover_image;
        if (info.backdrop_path) item.backdrop_path = info.backdrop_path;
        if (info.logo_path) item.logo_path = info.logo_path;
        item.youtube_trailer = info.youtube_trailer;
        item.director = info.director;
        item.runtime = info.runtime;
      } else {
        item.title = item.clean_name;
        item.year = null;
        item.info_rating = null;
        item.genres = null;
        item.plot = null;
      }
    }

    return items;
  }

  async getRefreshHighlights(limit = 6) {
    const sql = `
      SELECT
        r.id,
        r.clean_name,
        r.search_name,
        r.cover_image,
        r.resolution,
        r.last_refresh_at
      FROM releases r
      WHERE r.last_refresh_at IS NOT NULL
        AND COALESCE(r.refresh_status, 'idle') != 'delete_pending'
      ORDER BY r.last_refresh_at DESC
      LIMIT ?
    `;

    return db.all(sql, [limit]);
  }

  /**
   * Get library items (movies/TV with rich metadata) that have at least one release.
   * Joins info tables with releases to get titles, genres, ratings, cover images, etc.
   * Supports pagination, genre filter, and search.
   */
  async getLibrary(options = {}) {
    const {
      mediaType = 'all',     // 'all', 'movie', 'tv'
      genre = null,
      search = null,
      sortBy = 'title',
      sortOrder = 'ASC',
      page = 1,
      limit = 50
    } = options;

    const offset = (page - 1) * limit;

    let sql = '';
    let countSql = '';
    const params = [];

    if (mediaType === 'movie') {
      sql = `
        SELECT
          m.id as info_id, m.imdb_id, m.tmdb_id, m.title, m.release_date, m.rating,
          m.genres, m.cover_path, m.backdrop_path, m.logo_path, m.plot, m.youtube_trailer,
          COUNT(DISTINCT r.id) as release_count,
          MAX(r.add_date) as latest_release_date
        FROM movie_info m
        INNER JOIN releases r ON (r.media_type = 'movie' AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL)))
        WHERE (m.imdb_id IS NOT NULL OR m.tmdb_id IS NOT NULL)
      `;
      countSql = `
        SELECT COUNT(DISTINCT m.id) as total
        FROM movie_info m
        INNER JOIN releases r ON (r.media_type = 'movie' AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL)))
        WHERE (m.imdb_id IS NOT NULL OR m.tmdb_id IS NOT NULL)
      `;

      if (genre) {
        sql += ' AND m.genres LIKE ?';
        countSql += ' AND m.genres LIKE ?';
        params.push(`%${genre}%`);
      }

      if (search) {
        const searchParams = [];
        const searchClause = this.buildTokenSearchClause(['m.title', 'm.original_title'], search, searchParams);
        sql += searchClause;
        countSql += searchClause;
        params.push(...searchParams);
      }

      sql += ' GROUP BY m.id';

      const allowedSort = ['title', 'rating', 'release_date', 'latest_release_date'];
      const sortCol = allowedSort.includes(sortBy) ? sortBy : 'title';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sql += ` ORDER BY m.${sortCol} ${order}`;

    } else if (mediaType === 'tv') {
      sql = `
        SELECT
          t.id as info_id, t.imdb_id, t.tmdb_id, t.title, t.first_air_date as release_date, t.rating,
          t.genres, t.cover_path, t.backdrop_path, t.logo_path, t.plot, t.youtube_trailer,
          t.number_of_seasons, t.number_of_episodes, t.status,
          COUNT(DISTINCT r.id) as release_count,
          MAX(r.add_date) as latest_release_date
        FROM tv_info t
        INNER JOIN releases r ON (r.media_type = 'tv' AND (r.tmdb_id = t.tmdb_id OR (r.imdb_id = t.imdb_id AND t.tmdb_id IS NULL)))
        WHERE (t.tmdb_id IS NOT NULL OR t.imdb_id IS NOT NULL)
      `;
      countSql = `
        SELECT COUNT(DISTINCT t.id) as total
        FROM tv_info t
        INNER JOIN releases r ON (r.media_type = 'tv' AND (r.tmdb_id = t.tmdb_id OR (r.imdb_id = t.imdb_id AND t.tmdb_id IS NULL)))
        WHERE (t.tmdb_id IS NOT NULL OR t.imdb_id IS NOT NULL)
      `;

      if (genre) {
        sql += ' AND t.genres LIKE ?';
        countSql += ' AND t.genres LIKE ?';
        params.push(`%${genre}%`);
      }

      if (search) {
        const searchParams = [];
        const searchClause = this.buildTokenSearchClause(['t.title', 't.original_name'], search, searchParams);
        sql += searchClause;
        countSql += searchClause;
        params.push(...searchParams);
      }

      sql += ' GROUP BY t.id';

      const allowedSort = ['title', 'rating', 'first_air_date', 'latest_release_date'];
      const sortCol = allowedSort.includes(sortBy) ? sortBy : 'title';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sql += ` ORDER BY ${sortCol} ${order}`;

    } else {
      // 'all' — union of movies and TV
      const movieSql = `
        SELECT m.id as info_id, m.imdb_id, m.tmdb_id, m.title, m.release_date, m.rating,
          m.genres, m.cover_path, m.backdrop_path, m.logo_path, m.plot, m.youtube_trailer,
          'movie' as library_media_type,
          COUNT(DISTINCT r.id) as release_count,
          MAX(r.add_date) as latest_release_date
        FROM movie_info m
        INNER JOIN releases r ON (r.media_type = 'movie' AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL)))
        WHERE (m.imdb_id IS NOT NULL OR m.tmdb_id IS NOT NULL)
        GROUP BY m.id
      `;
      const tvSql = `
        SELECT t.id as info_id, t.imdb_id, t.tmdb_id, t.title, t.first_air_date as release_date, t.rating,
          t.genres, t.cover_path, t.backdrop_path, t.logo_path, t.plot, t.youtube_trailer,
          'tv' as library_media_type,
          COUNT(DISTINCT r.id) as release_count,
          MAX(r.add_date) as latest_release_date
        FROM tv_info t
        INNER JOIN releases r ON (r.media_type = 'tv' AND (r.tmdb_id = t.tmdb_id OR (r.imdb_id = t.imdb_id AND t.tmdb_id IS NULL)))
        WHERE (t.tmdb_id IS NOT NULL OR t.imdb_id IS NOT NULL)
        GROUP BY t.id
      `;

      const movieParams = [];
      const tvParams = [];
      let movieWhere = '';
      let tvWhere = '';

      if (genre) {
        movieWhere += ' AND m.genres LIKE ?';
        tvWhere += ' AND t.genres LIKE ?';
        movieParams.push(`%${genre}%`);
        tvParams.push(`%${genre}%`);
      }
      if (search) {
        movieWhere += this.buildTokenSearchClause(['m.title', 'm.original_title'], search, movieParams);
        tvWhere += this.buildTokenSearchClause(['t.title', 't.original_name'], search, tvParams);
      }

      sql = `SELECT * FROM (${movieSql.replace('GROUP BY m.id', movieWhere + ' GROUP BY m.id')}) UNION ALL SELECT * FROM (${tvSql.replace('GROUP BY t.id', tvWhere + ' GROUP BY t.id')})`;
      params.push(...movieParams, ...tvParams);

      // Counts
      const movieCountSql = `SELECT COUNT(DISTINCT m.id) as total FROM movie_info m INNER JOIN releases r ON (r.media_type = 'movie' AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL))) WHERE (m.imdb_id IS NOT NULL OR m.tmdb_id IS NOT NULL)` + movieWhere;
      const tvCountSql = `SELECT COUNT(DISTINCT t.id) as total FROM tv_info t INNER JOIN releases r ON (r.media_type = 'tv' AND (r.tmdb_id = t.tmdb_id OR (r.imdb_id = t.imdb_id AND t.tmdb_id IS NULL))) WHERE (t.tmdb_id IS NOT NULL OR t.imdb_id IS NOT NULL)` + tvWhere;
      countSql = `SELECT (${movieCountSql}) + (${tvCountSql}) as total`;

      const allowedSort = ['title', 'rating', 'release_date', 'latest_release_date'];
      const sortCol = allowedSort.includes(sortBy) ? sortBy : 'title';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sql += ` ORDER BY title ${order}`;
    }

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = db.all(sql, params);

    // Get count
    let total = 0;
    if (countSql) {
      const countParams = params.filter((_, i) => i < params.length - 2); // remove limit, offset
      const result = db.get(countSql, countParams);
      total = result?.total || result?.count || 0;
    }

    return {
      items: items || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + (items || []).length < total
      }
    };
  }

  /**
   * Get all unique genres from the library
   */
  async getLibraryGenres(mediaType = 'all') {
    let sql = '';
    if (mediaType === 'movie') {
      sql = "SELECT DISTINCT genres FROM movie_info m INNER JOIN releases r ON (r.media_type = 'movie' AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL))) WHERE m.genres IS NOT NULL AND m.genres != ''";
    } else if (mediaType === 'tv') {
      sql = "SELECT DISTINCT genres FROM tv_info t INNER JOIN releases r ON (r.media_type = 'tv' AND (r.tmdb_id = t.tmdb_id OR (r.imdb_id = t.imdb_id AND t.tmdb_id IS NULL))) WHERE t.genres IS NOT NULL AND t.genres != ''";
    } else {
      sql = "SELECT DISTINCT genres FROM movie_info m INNER JOIN releases r ON (r.media_type = 'movie' AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL))) WHERE m.genres IS NOT NULL AND m.genres != '' UNION SELECT DISTINCT genres FROM tv_info t INNER JOIN releases r ON (r.media_type = 'tv' AND (r.tmdb_id = t.tmdb_id OR (r.imdb_id = t.imdb_id AND t.tmdb_id IS NULL))) WHERE t.genres IS NOT NULL AND t.genres != ''";
    }

    const rows = db.all(sql);
    const genreSet = new Set();
    rows.forEach(row => {
      if (row.genres) {
        row.genres.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genreSet.add(trimmed);
        });
      }
    });
    return [...genreSet].sort();
  }

  /**
   * Get counts for each media type in the library
   */
  async getLibraryCounts() {
    const movieCount = db.get(
      "SELECT COUNT(DISTINCT m.id) as total FROM movie_info m INNER JOIN releases r ON (r.media_type = 'movie' AND (r.imdb_id = m.imdb_id OR (r.tmdb_id = m.tmdb_id AND m.imdb_id IS NULL))) WHERE m.imdb_id IS NOT NULL OR m.tmdb_id IS NOT NULL"
    );
    const tvCount = db.get(
      "SELECT COUNT(DISTINCT t.id) as total FROM tv_info t INNER JOIN releases r ON (r.media_type = 'tv' AND (r.tmdb_id = t.tmdb_id OR (r.imdb_id = t.imdb_id AND t.tmdb_id IS NULL))) WHERE t.tmdb_id IS NOT NULL OR t.imdb_id IS NOT NULL"
    );
    return {
      movies: movieCount?.total || 0,
      tv: tvCount?.total || 0,
      total: (movieCount?.total || 0) + (tvCount?.total || 0)
    };
  }
}

module.exports = new ReleaseRepository();
