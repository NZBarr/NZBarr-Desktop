-- NZBarr Desktop - SQLite Database Schema
-- Local desktop media library database

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Categories for organizing releases
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_key TEXT, -- Translation key for multilingual support
    parent_id INTEGER,
    icon TEXT, -- Icon class or path
    sort_order INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1, -- 1=active, 0=hidden
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Main releases table (all NZB content)
CREATE TABLE releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_name TEXT NOT NULL, -- Raw NZB filename
    clean_name TEXT, -- Human-readable name
    imdb_id TEXT,
    tmdb_id INTEGER,
    media_id INTEGER, -- Links to *_info tables
    media_type TEXT, -- movie, tv, music, book, console, xxx
    cover_image TEXT, -- Path to local cover image
    category_id INTEGER NOT NULL,
    nzb_guid TEXT UNIQUE, -- Unique identifier from NZB
    nzb_file_path TEXT, -- Path to local NZB file
    size INTEGER DEFAULT 0, -- Size in bytes
    add_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    post_date TIMESTAMP,
    season INTEGER,
    episode INTEGER,
    parts INTEGER DEFAULT 0, -- Number of RAR parts
    grabs INTEGER DEFAULT 0,
    resolution TEXT, -- 1080p, 4K, etc.
    video_codec TEXT, -- H.264, H.265, etc.
    audio_codec TEXT, -- AAC, DTS, etc.
    audio_channels TEXT, -- 2.0, 5.1, 7.1
    source TEXT, -- BluRay, WEB-DL, etc.
    subtitles TEXT, -- Comma-separated languages
    language TEXT,
    format TEXT, -- MKV, MP4, MP3, FLAC, etc.
    bit_depth TEXT, -- 8-bit, 10-bit, 12-bit
    hdr_format TEXT, -- HDR10, HDR10+, Dolby Vision, HLG, None
    frame_rate TEXT, -- 23.976, 24, 25, 29.97, 30, 50, 59.94, 60
    audio_bitrate INTEGER, -- Audio bitrate in bps
    audio_sample_rate INTEGER, -- Audio sample rate in Hz
    aspect_ratio TEXT, -- 16:9, 2.35:1, etc.
    overall_bitrate INTEGER, -- Overall file bitrate in bps
    video_bitrate INTEGER, -- Video stream bitrate in bps
    video_profile TEXT, -- High@L4, Main@L3.1, etc.
    scan_type TEXT, -- Progressive, Interlaced
    chroma_subsampling TEXT, -- 4:2:0, 4:2:2, 4:4:4
    duration_ms INTEGER, -- Duration in milliseconds
    color_primaries TEXT, -- BT.709, BT.2020, etc.
    password TEXT, -- NZB password or 'UNKNOWN'
    nfo_text TEXT, -- Raw NFO contents
    mediainfo_raw TEXT, -- Raw MediaInfo output
    release_group TEXT, -- Release group name
    backdrop_path TEXT, -- Path to local backdrop image
    logo_path TEXT, -- Path to local logo image
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'available', -- available, downloading, downloaded, deleted
    local_file_path TEXT, -- Path to downloaded file(s)
    ownership_type TEXT DEFAULT 'imported', -- imported, owned
    ownership_notes TEXT,
    source_path TEXT,
    refresh_status TEXT DEFAULT 'idle', -- idle, running, completed, failed
    last_refresh_at TIMESTAMP,
    last_refresh_error TEXT,
    parent_release_id INTEGER,
    is_active_revision INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_release_id) REFERENCES releases(id) ON DELETE SET NULL
);

-- ============================================================
-- MEDIA INFO TABLES (linked via releases.media_id + releases.media_type)
-- ============================================================

-- Movie metadata
CREATE TABLE movie_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imdb_id TEXT UNIQUE,
    tmdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    original_title TEXT,
    plot TEXT,
    tagline TEXT,
    release_date DATE,
    runtime INTEGER, -- Minutes
    rating REAL, -- 0.0 - 10.0
    genres TEXT, -- Comma-separated
    actors TEXT, -- JSON array
    director TEXT,
    language TEXT,
    country TEXT,
    youtube_trailer TEXT,
    collection_id INTEGER, -- TMDB collection ID
    has_cover INTEGER DEFAULT 0,
    has_backdrop INTEGER DEFAULT 0,
    has_logo INTEGER DEFAULT 0,
    cover_path TEXT,
    backdrop_path TEXT,
    logo_path TEXT,
    raw_json TEXT, -- Full API response
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TV Series metadata
CREATE TABLE tv_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL UNIQUE,
    imdb_id TEXT,
    title TEXT NOT NULL,
    original_name TEXT,
    plot TEXT,
    first_air_date DATE,
    last_air_date DATE,
    runtime INTEGER, -- Minutes per episode
    number_of_seasons INTEGER,
    number_of_episodes INTEGER,
    rating REAL, -- 0.0 - 10.0
    genres TEXT, -- Comma-separated
    actors TEXT, -- JSON array
    language TEXT,
    country TEXT,
    status TEXT, -- Returning Series, Ended, etc.
    youtube_trailer TEXT,
    has_cover INTEGER DEFAULT 0,
    has_backdrop INTEGER DEFAULT 0,
    has_logo INTEGER DEFAULT 0,
    cover_path TEXT,
    backdrop_path TEXT,
    logo_path TEXT,
    raw_json TEXT, -- Full API response
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TV Episode metadata
CREATE TABLE episode_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tv_tmdb_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    title TEXT,
    plot TEXT,
    air_date DATE,
    rating REAL,
    UNIQUE(tv_tmdb_id, season, episode),
    FOREIGN KEY (tv_tmdb_id) REFERENCES tv_info(tmdb_id) ON DELETE CASCADE
);

-- Music Album metadata
CREATE TABLE music_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    musicbrainz_id TEXT,
    release_group_mbid TEXT,
    artist_mbid TEXT,
    audiodb_album_id INTEGER UNIQUE,
    audiodb_artist_id INTEGER,
    artist TEXT,
    album_title TEXT NOT NULL,
    release_date DATE,
    genre TEXT,
    track_list TEXT, -- JSON array of tracks
    label TEXT,
    has_cover INTEGER DEFAULT 0,
    has_artist_logo INTEGER DEFAULT 0,
    has_artist_cutout INTEGER DEFAULT 0,
    cover_path TEXT,
    artist_logo_path TEXT,
    artist_cutout_path TEXT,
    raw_json TEXT, -- Full API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Book metadata
CREATE TABLE book_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_books_id TEXT UNIQUE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'book', -- book, magazine, comic, newspaper
    author TEXT,
    publisher TEXT,
    publish_date DATE,
    description TEXT,
    isbn13 TEXT,
    isbn10 TEXT,
    page_count INTEGER,
    language TEXT,
    has_cover INTEGER DEFAULT 0,
    cover_path TEXT,
    raw_json TEXT, -- Full API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Console/Game metadata
CREATE TABLE console_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    igdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    platform TEXT,
    developer TEXT,
    publisher TEXT,
    release_date DATE,
    genre TEXT,
    summary TEXT,
    has_cover INTEGER DEFAULT 0,
    cover_path TEXT,
    raw_json TEXT, -- Full API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- XXX/Anime metadata
CREATE TABLE xxx_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anidb_id INTEGER UNIQUE,
    mal_id INTEGER UNIQUE, -- MyAnimeList ID
    title TEXT NOT NULL,
    type TEXT, -- TV Series, Movie, OVA
    description TEXT,
    start_date DATE,
    end_date DATE,
    rating REAL,
    genres TEXT,
    has_cover INTEGER DEFAULT 0,
    cover_path TEXT,
    raw_json TEXT, -- Full API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movie Collections/Franchises
CREATE TABLE collections (
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
    raw_json TEXT, -- Full API response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actor/Person Cache (populated from TMDB credits)
CREATE TABLE actor_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_person_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    profile_path TEXT, -- Local path to cached image
    has_profile_image INTEGER DEFAULT 0,
    biography TEXT,
    birthday DATE,
    deathday DATE,
    place_of_birth TEXT,
    also_known_as TEXT, -- JSON array of alternate names
    known_for_department TEXT,
    popularity REAL,
    gender INTEGER, -- 0=Not set, 1=Female, 2=Male, 3=Non-binary
    raw_json TEXT, -- Full TMDB person response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DESKTOP-SPECIFIC TABLES
-- ============================================================

-- Active and completed downloads
CREATE TABLE downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    nzb_guid TEXT NOT NULL,
    status TEXT DEFAULT 'queued', -- queued, downloading, paused, completed, failed, deleted
    progress REAL DEFAULT 0.0, -- 0.0 - 100.0
    total_size INTEGER DEFAULT 0, -- Total bytes
    downloaded_size INTEGER DEFAULT 0, -- Bytes downloaded
    download_speed REAL DEFAULT 0.0, -- Bytes per second
    eta INTEGER DEFAULT 0, -- Seconds remaining
    error_message TEXT,
    local_path TEXT, -- Downloaded file location
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- User's watch queue (instead of user_basket)
CREATE TABLE watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 0, -- 0=normal, 1=high
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    watched_date TIMESTAMP,
    notes TEXT,
    UNIQUE(release_id),
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- Track playback progress (resume where you left off)
CREATE TABLE playback_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    file_path TEXT NOT NULL, -- Specific file if multi-file release
    current_position INTEGER DEFAULT 0, -- Seconds
    total_duration INTEGER, -- Total seconds
    play_count INTEGER DEFAULT 0,
    last_played TIMESTAMP,
    completed INTEGER DEFAULT 0, -- 1=finished watching
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(release_id, file_path),
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- Map releases to actual files on disk
CREATE TABLE local_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT, -- video, audio, ebook, game, etc.
    file_size INTEGER,
    file_name TEXT,
    is_primary INTEGER DEFAULT 0, -- Main file vs extras/samples
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(release_id, file_path),
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- App settings (NNTP, downloads, player, UI)
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Releases
CREATE INDEX idx_releases_category ON releases(category_id);
CREATE INDEX idx_releases_media ON releases(media_id, media_type);
CREATE INDEX idx_releases_imdb ON releases(imdb_id);
CREATE INDEX idx_releases_tmdb ON releases(tmdb_id);
CREATE INDEX idx_releases_add_date ON releases(add_date);
CREATE INDEX idx_releases_status ON releases(status);
CREATE INDEX idx_releases_clean_name ON releases(clean_name);

-- Downloads
CREATE INDEX idx_downloads_status ON downloads(status);
CREATE INDEX idx_downloads_release ON downloads(release_id);
CREATE INDEX idx_downloads_created ON downloads(created_at);

-- Watchlist
CREATE INDEX idx_watchlist_added ON watchlist(added_date);

-- Playback
CREATE INDEX idx_playback_release ON playback_progress(release_id);
CREATE INDEX idx_playback_last_played ON playback_progress(last_played);

-- Media info tables
CREATE INDEX idx_movie_info_title ON movie_info(title);
CREATE INDEX idx_movie_info_release_date ON movie_info(release_date);
CREATE INDEX idx_tv_info_title ON tv_info(title);
CREATE INDEX idx_music_info_artist ON music_info(artist);
CREATE INDEX idx_music_info_album ON music_info(album_title);
CREATE INDEX idx_book_info_title ON book_info(title);
CREATE INDEX idx_book_info_author ON book_info(author);
CREATE INDEX idx_console_info_title ON console_info(title);
CREATE INDEX idx_xxx_info_title ON xxx_info(title);

-- ============================================================
-- SEED DATA: Default Categories
-- ============================================================

INSERT INTO categories (id, name, name_key, parent_id, icon, sort_order) VALUES
(1, 'Movies', 'category_movies', NULL, 'movie', 1),
(2, 'TV', 'category_tv', NULL, 'tv', 2),
(3, 'Music', 'category_music', NULL, 'music', 3),
(4, 'Console', 'category_console', NULL, 'gamepad', 4),
(5, 'Books', 'category_books', NULL, 'book', 5),
(6, 'XXX', 'category_xxx', NULL, 'adult', 6);

-- Movie subcategories
INSERT INTO categories (id, name, name_key, parent_id, icon, sort_order) VALUES
(1010, 'Movies HD', 'category_movies_hd', 1, 'hd', 1),
(1020, 'Movies SD', 'category_movies_sd', 1, 'sd', 2),
(1030, 'Movies 4K', 'category_movies_4k', 1, '4k', 3),
(1040, 'Movies 3D', 'category_movies_3d', 1, '3d', 4);

-- TV subcategories
INSERT INTO categories (id, name, name_key, parent_id, icon, sort_order) VALUES
(2010, 'TV HD', 'category_tv_hd', 2, 'hd', 1),
(2020, 'TV SD', 'category_tv_sd', 2, 'sd', 2),
(2030, 'TV 4K', 'category_tv_4k', 2, '4k', 3),
(2040, 'TV Documentaries', 'category_tv_docs', 2, 'documentary', 4);

-- Music subcategories
INSERT INTO categories (id, name, name_key, parent_id, icon, sort_order) VALUES
(3010, 'Music MP3', 'category_music_mp3', 3, 'mp3', 1),
(3020, 'Music FLAC', 'category_music_flac', 3, 'flac', 2),
(3030, 'Music Videos', 'category_music_videos', 3, 'video', 3),
(3040, 'Audiobooks', 'category_audiobooks', 3, 'audiobook', 4);

-- Books subcategories
INSERT INTO categories (id, name, name_key, parent_id, icon, sort_order) VALUES
(5010, 'Ebooks', 'category_ebooks', 5, 'ebook', 1),
(5020, 'Magazines', 'category_magazines', 5, 'magazine', 2),
(5030, 'Comics', 'category_comics', 5, 'comic', 3);

-- Console subcategories
INSERT INTO categories (id, name, name_key, parent_id, icon, sort_order) VALUES
(4010, 'Games', 'category_games', 4, 'game', 1),
(4020, 'Software', 'category_software', 4, 'software', 2);

-- ============================================================
-- SEED DATA: Default App Settings
-- ============================================================

-- NNTP Settings
INSERT INTO app_settings (key, value, description) VALUES
('nntp_server', '', 'NNTP server address'),
('nntp_port', '563', 'NNTP server port'),
('nntp_username', '', 'NNTP username'),
('nntp_password', '', 'NNTP password (encrypted)'),
('nntp_ssl', '1', 'Use SSL connection (1=yes, 0=no)'),
('nntp_connections', '5', 'Number of concurrent NNTP connections');

-- Download Settings
INSERT INTO app_settings (key, value, description) VALUES
('download_path', '', 'Default download directory'),
('download_max_concurrent', '3', 'Max concurrent downloads'),
('download_max_speed', '0', 'Max download speed (0=unlimited, bytes/s)'),
('download_retention_days', '0', 'Delete downloaded files after X days (0=never)'),
('download_auto_delete_watched', '0', 'Auto-delete after watching (1=yes, 0=no)');

-- Player Settings
INSERT INTO app_settings (key, value, description) VALUES
('player_external', '', 'External player (vlc, iina, mpv, or empty for built-in)'),
('player_external_path', '', 'Custom player executable path'),
('player_auto_open', '0', 'Auto-open downloaded files in player'),
('player_resume_playback', '1', 'Resume playback position (1=yes, 0=no)');

-- UI Settings
INSERT INTO app_settings (key, value, description) VALUES
('ui_language', 'en', 'Interface language'),
('ui_theme', 'dark', 'UI theme (dark/light)'),
('ui_items_per_page', '30', 'Items per page in library view'),
('ui_default_view', 'cover', 'Default view mode (cover/list)'),
('ui_show_release_counts', '1', 'Show release counts on covers');

-- API Keys (for metadata)
INSERT INTO app_settings (key, value, description) VALUES
('api_tmdb_key', '', 'TMDB API key'),
('api_imdb_key', '', 'IMDB/OMDb API key'),
('api_musicbrainz_key', '', 'MusicBrainz API key'),
('api_audiodb_key', '', 'TheAudioDB API key');

-- License
INSERT INTO app_settings (key, value, description) VALUES
('license_key', '', 'NZBarr license key'),
('license_verified', '0', 'License verification status'),
('license_checked_at', '', 'Last license check timestamp');

-- Auto Refresh Settings
INSERT INTO app_settings (key, value, description) VALUES
('auto_refresh_enabled', '0', 'Enable automatic NZB refresh (1=yes, 0=no)'),
('auto_refresh_age_threshold', '1', 'Minimum NZB age in years before refresh eligible'),
('auto_refresh_interval', 'weekly', 'Check interval for auto-refresh (daily/weekly/monthly)'),
('auto_refresh_mode', 'replace', 'Refresh mode: replace or keep_both'),
('auto_refresh_newsgroup', '', 'Newsgroup for re-upload'),
('auto_refresh_poster', '', 'Poster name/email for re-upload articles'),
('auto_refresh_notify', '0', 'Show notification on refresh complete (1=yes, 0=no)');

-- ngPost
INSERT INTO app_settings (key, value, description) VALUES
('ngpost_path', '', 'Path to ngPost executable');

-- Upload NNTP Settings
INSERT INTO app_settings (key, value, description) VALUES
('upload_nntp_server', '', 'Upload NNTP server address (for posting to Usenet)'),
('upload_nntp_port', '563', 'Upload NNTP server port'),
('upload_nntp_username', '', 'Upload NNTP username'),
('upload_nntp_password', '', 'Upload NNTP password (encrypted)'),
('upload_nntp_ssl', '1', 'Use SSL for upload NNTP connection (1=yes, 0=no)'),
('upload_nntp_connections', '5', 'Number of concurrent NNTP connections for uploading'),
('upload_nntp_same_as_download', '0', 'Use download NNTP credentials for upload (1=yes, 0=no)');

-- Upload Performance Settings (ngpost-style)
INSERT INTO app_settings (key, value, description) VALUES
('upload_article_size', '716800', 'Maximum bytes per Usenet article'),
('upload_retry_count', '10', 'Number of retries per article on upload failure'),
('upload_thread_count', '8', 'Parallel upload threads for posting');

-- Refresh Category Settings
INSERT INTO app_settings (key, value, description) VALUES
('refresh_sabnzbd_category', 'nzbarr-refresh', 'SABnzbd category for refresh jobs (like Sonarr/Radarr)'),
('refresh_completed_path', '', 'Path to SABnzbd refresh category folder (must be accessible locally)'),
('refresh_cleanup_action', 'delete', 'What to do with completed refresh downloads after successful upload'),
('refresh_cleanup_move_path', '', 'Destination folder when moving completed refresh downloads');
