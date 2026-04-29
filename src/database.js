// NZBarr Desktop - Database Manager (using better-sqlite3)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const appPaths = require('./appPaths');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  /**
   * Initialize database - create if doesn't exist, run schema if needed
   */
  async initialize() {
    try {
      // Initialize all required directories
      appPaths.initializeDirectories();

      // Get database path from centralized paths manager
      this.dbPath = appPaths.getDatabasePath();
      const dbExists = fs.existsSync(this.dbPath);

      console.log(`[Database] Database path: ${this.dbPath}`);
      console.log(`[Database] Database exists: ${dbExists}`);

      // Open database
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      console.log('Connected to SQLite database');

      const tableNames = this.getUserTableNames();
      const hasNoSchema = tableNames.length === 0;

      // Run schema if database is new, or if a previous first launch created
      // an empty SQLite file before schema setup completed.
      if (!dbExists || hasNoSchema) {
        console.log('Running database schema...');
        await this.runSchema();
        console.log('Database schema created successfully');
      }

      this.validateCoreSchema();

      // Run migrations
      await this.runMigrations();

      // Validate required tables exist even on first-run failures or partial schemas
      this.ensureRequiredTables();

      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  getUserTableNames() {
    return this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map(row => row.name);
  }

  tableExists(name) {
    const row = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name);
    return !!row;
  }

  validateCoreSchema() {
    const requiredTables = ['releases', 'movie_info', 'app_settings'];
    const missingTables = requiredTables.filter(table => !this.tableExists(table));

    if (missingTables.length > 0) {
      throw new Error(`Database schema is incomplete. Missing tables: ${missingTables.join(', ')}`);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    const columns = this.db.pragma('table_info(releases)');
    const movieInfoColumns = this.db.pragma('table_info(movie_info)');
    
    // Check if nzb_hash column exists, add if not
    const hasHash = columns.some(c => c.name === 'nzb_hash');
    if (!hasHash) {
      console.log('Migration: Adding nzb_hash column to releases');
      this.db.exec('ALTER TABLE releases ADD COLUMN nzb_hash TEXT');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_releases_nzb_hash ON releases(nzb_hash)');
    }

    // Check if backdrop_path column exists, add if not
    const hasBackdropPath = columns.some(c => c.name === 'backdrop_path');
    if (!hasBackdropPath) {
      console.log('Migration: Adding backdrop_path column to releases');
      this.db.exec('ALTER TABLE releases ADD COLUMN backdrop_path TEXT');
    }

    // Check if logo_path column exists, add if not
    const hasLogoPath = columns.some(c => c.name === 'logo_path');
    if (!hasLogoPath) {
      console.log('Migration: Adding logo_path column to releases');
      this.db.exec('ALTER TABLE releases ADD COLUMN logo_path TEXT');
    }

    const releaseMigrations = [
      ['ownership_type', "ALTER TABLE releases ADD COLUMN ownership_type TEXT DEFAULT 'imported'"],
      ['ownership_notes', 'ALTER TABLE releases ADD COLUMN ownership_notes TEXT'],
      ['source_path', 'ALTER TABLE releases ADD COLUMN source_path TEXT'],
      ['refresh_status', "ALTER TABLE releases ADD COLUMN refresh_status TEXT DEFAULT 'idle'"],
      ['last_refresh_at', 'ALTER TABLE releases ADD COLUMN last_refresh_at TIMESTAMP'],
      ['last_refresh_error', 'ALTER TABLE releases ADD COLUMN last_refresh_error TEXT'],
      ['parent_release_id', 'ALTER TABLE releases ADD COLUMN parent_release_id INTEGER'],
      ['is_active_revision', 'ALTER TABLE releases ADD COLUMN is_active_revision INTEGER DEFAULT 1'],
      // New mediainfo columns for real metadata from refresh
      ['bit_depth', 'ALTER TABLE releases ADD COLUMN bit_depth TEXT'],
      ['hdr_format', 'ALTER TABLE releases ADD COLUMN hdr_format TEXT'],
      ['frame_rate', 'ALTER TABLE releases ADD COLUMN frame_rate TEXT'],
      ['audio_bitrate', 'ALTER TABLE releases ADD COLUMN audio_bitrate INTEGER'],
      ['audio_sample_rate', 'ALTER TABLE releases ADD COLUMN audio_sample_rate INTEGER'],
      ['aspect_ratio', 'ALTER TABLE releases ADD COLUMN aspect_ratio TEXT'],
      // Additional detailed mediainfo fields
      ['overall_bitrate', 'ALTER TABLE releases ADD COLUMN overall_bitrate INTEGER'],
      ['video_bitrate', 'ALTER TABLE releases ADD COLUMN video_bitrate INTEGER'],
      ['video_profile', 'ALTER TABLE releases ADD COLUMN video_profile TEXT'],
      ['scan_type', 'ALTER TABLE releases ADD COLUMN scan_type TEXT'],
      ['chroma_subsampling', 'ALTER TABLE releases ADD COLUMN chroma_subsampling TEXT'],
      ['duration_ms', 'ALTER TABLE releases ADD COLUMN duration_ms INTEGER'],
      ['color_primaries', 'ALTER TABLE releases ADD COLUMN color_primaries TEXT']
    ];

    for (const [column, sql] of releaseMigrations) {
      if (!columns.some(c => c.name === column)) {
        console.log(`Migration: Adding ${column} column to releases`);
        this.db.exec(sql);
      }
    }

    if (!movieInfoColumns.some(c => c.name === 'collection_id')) {
      console.log('Migration: Adding collection_id column to movie_info');
      this.db.exec('ALTER TABLE movie_info ADD COLUMN collection_id INTEGER');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_movie_info_collection_id ON movie_info(collection_id)');
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        overview TEXT,
        has_poster INTEGER DEFAULT 0,
        has_backdrop INTEGER DEFAULT 0,
        has_logo INTEGER DEFAULT 0,
        poster_path TEXT,
        backdrop_path TEXT,
        logo_path TEXT,
        raw_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_collections_tmdb_id ON collections(tmdb_id)');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stream_library_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        original_filename TEXT,
        media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'tv')),
        year INTEGER,
        season_number INTEGER,
        episode_number INTEGER,
        stream_url TEXT NOT NULL UNIQUE,
        poster_url TEXT,
        poster_path TEXT,
        backdrop_url TEXT,
        backdrop_path TEXT,
        overview TEXT,
        runtime INTEGER,
        resolution TEXT,
        source TEXT,
        video_codec TEXT,
        release_group TEXT,
        file_size INTEGER,
        tmdb_id INTEGER,
        imdb_id TEXT,
        tmdb_cache_key TEXT,
        watched INTEGER DEFAULT 0,
        favorite INTEGER DEFAULT 0,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stream_metadata_cache (
        cache_key TEXT PRIMARY KEY,
        media_type TEXT NOT NULL,
        tmdb_id INTEGER,
        title TEXT NOT NULL,
        year INTEGER,
        poster_url TEXT,
        backdrop_url TEXT,
        overview TEXT,
        runtime INTEGER,
        raw_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec('CREATE INDEX IF NOT EXISTS idx_stream_library_media_type ON stream_library_items(media_type)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_stream_library_date_added ON stream_library_items(date_added)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_stream_library_favorite ON stream_library_items(favorite)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_stream_library_watched ON stream_library_items(watched)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_stream_library_tv_episode ON stream_library_items(title, season_number, episode_number)');

    this.db.exec(`
      INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
      ('license_status', 'free', 'Current license status'),
      ('license_plan', 'free', 'Current license plan'),
      ('license_expires_at', '', 'License expiration timestamp'),
      ('license_last_validated_at', '', 'Last successful license validation timestamp'),
      ('license_grace_until', '', 'License grace-period timestamp'),
      ('license_machine_id', '', 'Local machine identifier for license activation'),
      ('license_features_json', '[]', 'JSON array of licensed feature flags'),
      ('license_public_key_pem', '', 'Trusted license signature public key (PEM)'),
      ('license_public_keys_json', '[]', 'Trusted license signature keys JSON array'),
      ('license_customer_email', '', 'Customer email tied to current license'),
      ('license_message', '', 'Latest license server message'),
      ('license_server_url', '', 'License server base URL'),
      ('pipeline_movies_folder', '', 'Source folder for movie NZB preparation'),
      ('pipeline_tv_folder', '', 'Source folder for TV NZB preparation'),
      ('reanalyze_download_mb', '50', 'Max MB to download when re-analyzing a release'),
      ('ngpost_path', '', 'Path to ngPost executable')
    `);

    this.db.exec(`
      INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
      ('easynews_username', '', 'Easynews username for direct stream URLs'),
      ('easynews_password', '', 'Easynews password for direct stream URLs')
    `);
  }

  ensureRequiredTables() {
    const hasTable = (name) => {
      const row = this.get(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        [name]
      );
      return !!row;
    };

    if (!hasTable('app_settings')) {
      console.log('Bootstrap: Creating missing app_settings table');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.exec(`
        INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
        ('nntp_server', '', 'NNTP server address'),
        ('nntp_port', '563', 'NNTP server port'),
        ('nntp_username', '', 'NNTP username'),
        ('nntp_password', '', 'NNTP password (encrypted)'),
        ('nntp_ssl', '1', 'Use SSL connection (1=yes, 0=no)'),
        ('nntp_connections', '5', 'Number of concurrent NNTP connections'),
        ('download_path', '', 'Default download directory'),
        ('download_max_concurrent', '3', 'Max concurrent downloads'),
        ('download_max_speed', '0', 'Max download speed (0=unlimited, bytes/s)'),
        ('download_retention_days', '0', 'Delete downloaded files after X days (0=never)'),
        ('download_auto_delete_watched', '0', 'Auto-delete after watching (1=yes, 0=no)'),
        ('player_external', '', 'External player (vlc, iina, mpv, or empty for built-in)'),
        ('player_external_path', '', 'Custom player executable path'),
        ('player_auto_open', '0', 'Auto-open downloaded files in player'),
        ('player_resume_playback', '1', 'Resume playback position (1=yes, 0=no)'),
        ('easynews_username', '', 'Easynews username for direct stream URLs'),
        ('easynews_password', '', 'Easynews password for direct stream URLs'),
        ('ui_language', 'en', 'Interface language'),
        ('ui_theme', 'dark', 'UI theme (dark/light)'),
        ('ui_items_per_page', '30', 'Items per page in library view'),
        ('ui_default_view', 'cover', 'Default view mode (cover/list)'),
        ('ui_show_release_counts', '1', 'Show release counts on covers'),
        ('ui_show_welcome_message', '1', 'Show welcome message on Main Page'),
        ('ui_show_hero_slider', '1', 'Show hero slider on Main Page'),
        ('ui_show_featured_movies', '1', 'Show featured movies section on Main Page'),
        ('ui_show_featured_series', '1', 'Show featured series section on Main Page'),
        ('ui_show_grand_vault', '1', 'Show Grand Vault section on Main Page'),
        ('ui_show_at_a_glance', '1', 'Show At A Glance section on Main Page'),
        ('ui_show_freshly_polished', '1', 'Show Freshly Polished section on Main Page'),
        ('api_tmdb_key', '', 'TMDB API key'),
        ('api_imdb_key', '', 'IMDB/OMDb API key'),
        ('api_musicbrainz_key', '', 'MusicBrainz API key'),
        ('api_audiodb_key', '', 'TheAudioDB API key'),
        ('license_key', '', 'NZBarr license key'),
        ('license_verified', '0', 'License verification status'),
        ('license_checked_at', '', 'Last license check timestamp'),
        ('license_status', 'free', 'Current license status'),
        ('license_plan', 'free', 'Current license plan'),
        ('license_expires_at', '', 'License expiration timestamp'),
        ('license_last_validated_at', '', 'Last successful license validation timestamp'),
        ('license_grace_until', '', 'License grace-period timestamp'),
        ('license_machine_id', '', 'Local machine identifier for license activation'),
      ('license_features_json', '[]', 'JSON array of licensed feature flags'),
      ('license_public_key_pem', '', 'Trusted license signature public key (PEM)'),
      ('license_public_keys_json', '[]', 'Trusted license signature keys JSON array'),
      ('license_customer_email', '', 'Customer email tied to current license'),
      ('license_message', '', 'Latest license server message'),
      ('license_server_url', '', 'License server base URL'),
      ('pipeline_movies_folder', '', 'Source folder for movie NZB preparation'),
      ('pipeline_tv_folder', '', 'Source folder for TV NZB preparation'),
      ('reanalyze_download_mb', '50', 'Max MB to download when re-analyzing a release'),
      ('ngpost_path', '', 'Path to ngPost executable'),
      ('auto_refresh_enabled', '0', 'Enable automatic NZB refresh (1=yes, 0=no)'),
        ('auto_refresh_age_threshold', '1', 'Minimum NZB age in years before refresh eligible'),
        ('auto_refresh_interval', 'weekly', 'Check interval for auto-refresh (daily/weekly/monthly)'),
        ('auto_refresh_mode', 'replace', 'Refresh mode: replace or keep_both'),
        ('auto_refresh_newsgroup', '', 'Newsgroup for re-upload'),
        ('auto_refresh_poster', '', 'Poster name/email for re-upload articles'),
        ('auto_refresh_notify', '0', 'Show notification on refresh complete (1=yes, 0=no)'),
        ('sabnzbd_completed_path', '', 'Network-mounted path to SABnzbd completed downloads folder'),
        // Upload NNTP Settings
        ('upload_nntp_server', '', 'Upload NNTP server address (for posting to Usenet)'),
        ('upload_nntp_port', '563', 'Upload NNTP server port'),
        ('upload_nntp_username', '', 'Upload NNTP username'),
        ('upload_nntp_password', '', 'Upload NNTP password (encrypted)'),
        ('upload_nntp_ssl', '1', 'Use SSL for upload NNTP connection (1=yes, 0=no)'),
        ('upload_nntp_connections', '5', 'Number of concurrent NNTP connections for uploading'),
        ('upload_nntp_same_as_download', '0', 'Use download NNTP credentials for upload (1=yes, 0=no)'),
        // Upload Performance Settings
        ('upload_article_size', '716800', 'Maximum bytes per Usenet article (ngpost-style)'),
        ('upload_retry_count', '10', 'Number of retries per article on upload failure'),
        ('upload_thread_count', '8', 'Parallel upload threads for posting'),
        // Refresh Category Settings
        ('refresh_sabnzbd_category', 'nzbarr-refresh', 'SABnzbd category for refresh jobs (like Sonarr/Radarr)'),
        ('refresh_completed_path', '', 'Path to SABnzbd refresh category folder (must be accessible locally)'),
        ('refresh_cleanup_action', 'delete', 'What to do with completed refresh downloads after successful upload'),
        ('refresh_cleanup_move_path', '', 'Destination folder when moving completed refresh downloads')
      `);
    }
  }

  /**
   * Run the database schema SQL
   */
  async runSchema() {
    const schemaPath = path.join(__dirname, '../docs/database-schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove single-line comments
    const cleanedSQL = schemaSQL.replace(/--.*$/gm, '');
    
    // Split by semicolons
    const statements = cleanedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && stmt.match(/^(CREATE|INSERT|PRAGMA|ALTER|DROP)/i));

    console.log(`Executing ${statements.length} schema statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        this.db.exec(statement);
        if (i % 10 === 0) {
          console.log(`  Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error) {
        console.error(`Failed to execute statement #${i + 1}:`, statement.substring(0, 100));
        throw error;
      }
    }
    
    console.log(`Schema execution complete - ${statements.length} statements executed`);
  }

  /**
   * Execute a query that doesn't return rows (INSERT, UPDATE, DELETE, CREATE)
   */
  run(sql, params = []) {
    const result = this.db.prepare(sql).run(...params);
    return {
      id: result.lastInsertRowid,
      changes: result.changes
    };
  }

  /**
   * Execute a query that returns a single row
   */
  get(sql, params = []) {
    return this.db.prepare(sql).get(...params);
  }

  /**
   * Execute a query that returns multiple rows
   */
  all(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const stats = {
      releases: 0,
      downloads: 0,
      watchlist: 0,
      categories: 0,
      movies: 0,
      tvShows: 0
    };

    try {
      const releaseCount = this.get('SELECT COUNT(*) as count FROM releases');
      stats.releases = releaseCount?.count || 0;

      const downloadCount = this.get("SELECT COUNT(*) as count FROM downloads WHERE status != 'deleted'");
      stats.downloads = downloadCount?.count || 0;

      const watchlistCount = this.get('SELECT COUNT(*) as count FROM watchlist');
      stats.watchlist = watchlistCount?.count || 0;

      const categoryCount = this.get('SELECT COUNT(*) as count FROM categories');
      stats.categories = categoryCount?.count || 0;

      const movieCount = this.get('SELECT COUNT(DISTINCT id) as count FROM movie_info');
      stats.movies = movieCount?.count || 0;

      const tvShowCount = this.get('SELECT COUNT(DISTINCT id) as count FROM tv_info');
      stats.tvShows = tvShowCount?.count || 0;
    } catch (error) {
      console.error('Error getting stats:', error);
    }

    return stats;
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;
