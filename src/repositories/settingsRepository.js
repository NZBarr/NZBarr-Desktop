// NZBarr Desktop - Settings Repository
const db = require('../database');

class SettingsRepository {
  ensureTable() {
    const table = db.get(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      ['app_settings']
    );

    if (table) {
      return;
    }

    console.log('[SettingsRepository] app_settings missing, recreating table');

    db.run(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
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
      ('nzbStoragePath', '', 'Custom NZB storage directory'),
      ('api_tmdb_key', '', 'TMDB API key'),
      ('api_imdb_key', '', 'IMDB/OMDb API key'),
      ('api_musicbrainz_key', '', 'MusicBrainz API key'),
      ('api_audiodb_key', '', 'TheAudioDB API key'),
      ('pipeline_movies_folder', '', 'Source folder for movie NZB preparation'),
      ('pipeline_tv_folder', '', 'Source folder for TV NZB preparation'),
      ('archive_work_path', '', 'Working directory for owned media refresh jobs'),
      ('archive_password', 'nzbarr', 'Archive password used for refresh packaging'),
      ('archive_keep_temp_files', '0', 'Keep temp refresh files after completion'),
      ('reanalyze_download_mb', '50', 'Max MB to download when re-analyzing a release'),
      ('ngpost_path', '', 'Path to ngPost executable'),
      ('archive_delete_old_revision_after_success', '0', 'Delete old owned media revision after successful refresh'),
      ('sab_host', '', 'SABnzbd server host'),
      ('sab_port', '8080', 'SABnzbd server port'),
      ('sab_base_path', '', 'SABnzbd base path'),
      ('sab_nzb_key', '', 'SABnzbd NZB add key'),
      ('sab_api_key', '', 'SABnzbd full API key'),
      ('sab_username', '', 'SABnzbd username'),
      ('sab_password', '', 'SABnzbd password'),
      ('sab_category', '', 'Default SABnzbd category'),
      ('sab_priority', '0', 'Default SABnzbd priority'),
      ('sab_ssl', '0', 'Use HTTPS for SABnzbd'),
      ('nzbget_host', '', 'NZBGet server host'),
      ('nzbget_port', '6789', 'NZBGet server port'),
      ('nzbget_username', '', 'NZBGet username'),
      ('nzbget_password', '', 'NZBGet password'),
      ('nzbget_category', '', 'Default NZBGet category'),
      ('nzbget_priority', '0', 'Default NZBGet priority'),
      ('nzbget_ssl', '0', 'Use HTTPS for NZBGet'),
      ('refresh_cleanup_action', 'delete', 'What to do with completed refresh downloads after successful upload'),
      ('refresh_cleanup_move_path', '', 'Destination folder when moving completed refresh downloads'),
      ('preferred_downloader', 'sabnzbd', 'Preferred download client')
    `);
  }

  /**
   * Get a single setting value by key
   */
  async get(key) {
    this.ensureTable();
    const row = db.get('SELECT value FROM app_settings WHERE key = ?', [key]);
    return row?.value || null;
  }

  /**
   * Get multiple settings by keys
   */
  async getMany(keys) {
    this.ensureTable();
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `SELECT key, value FROM app_settings WHERE key IN (${placeholders})`;
    const rows = db.all(sql, keys);
    
    const result = {};
    rows.forEach(row => {
      result[row.key] = row.value;
    });
    
    return result;
  }

  /**
   * Get all settings
   */
  async getAll() {
    this.ensureTable();
    const rows = db.all('SELECT key, value FROM app_settings');
    const result = {};
    rows.forEach(row => {
      result[row.key] = row.value;
    });
    return result;
  }

  /**
   * Get settings by category (prefix)
   */
  async getByCategory(category) {
    this.ensureTable();
    const rows = db.all(
      'SELECT key, value, description FROM app_settings WHERE key LIKE ? ORDER BY key',
      [`${category}_%`]
    );
    
    const result = {};
    rows.forEach(row => {
      result[row.key] = {
        value: row.value,
        description: row.description
      };
    });
    
    return result;
  }

  /**
   * Set a single setting value
   */
  async set(key, value) {
    this.ensureTable();
    const sql = `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `;
    return db.run(sql, [key, String(value)]);
  }

  /**
   * Set multiple settings at once
   */
  async setMany(settings) {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, String(value));
    }
  }

  /**
   * Delete a setting
   */
  async delete(key) {
    this.ensureTable();
    return db.run('DELETE FROM app_settings WHERE key = ?', [key]);
  }

  /**
   * Check if setting exists
   */
  async exists(key) {
    this.ensureTable();
    const row = db.get('SELECT COUNT(*) as count FROM app_settings WHERE key = ?', [key]);
    return row?.count > 0;
  }

  /**
   * Get NNTP settings
   */
  async getNNTPSettings() {
    const settings = await this.getMany([
      'nntp_server',
      'nntp_port',
      'nntp_username',
      'nntp_password',
      'nntp_ssl',
      'nntp_connections'
    ]);

    return {
      server: settings.nntp_server || '',
      port: parseInt(settings.nntp_port) || 563,
      username: settings.nntp_username || '',
      password: settings.nntp_password || '',
      ssl: settings.nntp_ssl === '1',
      connections: parseInt(settings.nntp_connections) || 5
    };
  }

  /**
   * Update NNTP settings
   */
  async updateNNTPSettings(settings) {
    return await this.setMany({
      nntp_server: settings.server,
      nntp_port: String(settings.port),
      nntp_username: settings.username,
      nntp_password: settings.password,
      nntp_ssl: settings.ssl ? '1' : '0',
      nntp_connections: String(settings.connections)
    });
  }

  /**
   * Get download settings
   */
  async getDownloadSettings() {
    const settings = await this.getMany([
      'download_path',
      'download_max_concurrent',
      'download_max_speed',
      'download_retention_days',
      'download_auto_delete_watched'
    ]);

    return {
      path: settings.download_path || '',
      maxConcurrent: parseInt(settings.download_max_concurrent) || 3,
      maxSpeed: parseInt(settings.download_max_speed) || 0,
      retentionDays: parseInt(settings.download_retention_days) || 0,
      autoDeleteWatched: settings.download_auto_delete_watched === '1'
    };
  }

  /**
   * Get player settings
   */
  async getPlayerSettings() {
    const settings = await this.getMany([
      'player_external',
      'player_external_path',
      'player_auto_open',
      'player_resume_playback'
    ]);

    return {
      external: settings.player_external || '',
      externalPath: settings.player_external_path || '',
      autoOpen: settings.player_auto_open === '1',
      resumePlayback: settings.player_resume_playback === '1'
    };
  }

  /**
   * Get UI settings
   */
  async getUISettings() {
    const settings = await this.getMany([
      'ui_language',
      'ui_theme',
      'ui_items_per_page',
      'ui_default_view',
      'ui_show_release_counts',
      'ui_show_welcome_message',
      'ui_show_hero_slider',
      'ui_show_featured_movies',
      'ui_show_featured_series',
      'ui_show_grand_vault',
      'ui_show_at_a_glance',
      'ui_show_freshly_polished'
    ]);

    return {
      language: settings.ui_language || 'en',
      theme: settings.ui_theme || 'dark',
      itemsPerPage: parseInt(settings.ui_items_per_page) || 30,
      defaultView: settings.ui_default_view || 'cover',
      showReleaseCounts: settings.ui_show_release_counts === '1',
      showWelcomeMessage: settings.ui_show_welcome_message !== '0',
      showHeroSlider: settings.ui_show_hero_slider !== '0',
      showFeaturedMovies: settings.ui_show_featured_movies !== '0',
      showFeaturedSeries: settings.ui_show_featured_series !== '0',
      showGrandVault: settings.ui_show_grand_vault !== '0',
      showAtAGlance: settings.ui_show_at_a_glance !== '0',
      showFreshlyPolished: settings.ui_show_freshly_polished !== '0'
    };
  }

  /**
   * Get archive/owned media refresh settings
   */
  async getArchiveSettings() {
    const settings = await this.getMany([
      'archive_work_path',
      'archive_password',
      'archive_keep_temp_files',
      'archive_delete_old_revision_after_success'
    ]);

    return {
      workPath: settings.archive_work_path || '',
      password: settings.archive_password || '',
      keepTempFiles: settings.archive_keep_temp_files === '1',
      deleteOldRevisionAfterSuccess: settings.archive_delete_old_revision_after_success === '1'
    };
  }

  async getDownloaderSettings() {
    return this.getMany([
      'downloader_preferred',
      'sabnzbd_host',
      'sabnzbd_port',
      'sabnzbd_ssl',
      'sabnzbd_base_path',
      'sabnzbd_api_key',
      'sabnzbd_username',
      'sabnzbd_password',
      'sabnzbd_category',
      'sabnzbd_priority',
      'nzbget_host',
      'nzbget_port',
      'nzbget_ssl',
      'nzbget_username',
      'nzbget_password',
      'nzbget_category',
      'nzbget_priority'
    ]);
  }
}

module.exports = new SettingsRepository();
