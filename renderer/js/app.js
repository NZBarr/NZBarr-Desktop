// NZBarr Desktop - Main App Logic

// SVG Icon definitions (white, transparent, simple)
const SVG_ICONS = {
  movie: '<svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',
  tv: '<svg viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>',
  package: '<svg viewBox="0 0 124 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9 1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12.1 2-12.1 2z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" style="height: 0px;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
  delete: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  add: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
  image: '<svg viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
  games: '<svg viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
  books: '<svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
  xxx: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v-2.58l2.29 2.29 1.42-1.42-2.29-2.29H17v-2h-2.58l2.29-2.29-1.42-1.42-2.29 2.29V4h-2v2.58L8.71 4.29 7.29 5.71 9.58 8H7v2h2.58l-2.29 2.29 1.42 1.42L11 13.42V16z"/></svg>',
};

class NZBarrApp {
  constructor() {
    this.currentPage = 'categories';
    this.currentBrowseSort = 'post_date_desc';
    this.currentBrowseFilter = 'all';
    this.currentBrowseSearch = '';
    this.currentBrowseRefreshStatus = null;
    this.preserveBrowseRefreshStatus = false;
    this.currentBrowsePage = 1;
    this.browsePageSize = 50;
    this.allReleases = [];
    this.currentLibraryData = [];
    this.currentCollectionDetail = null;
    this.collectionDetailReturnTarget = null;
    this.selectedUploadResult = null;
    this.currentRefreshLog = [];
    this.mediaAssetVersionMap = new Map();
    this.batchEditSelection = null;
    this._editLinkedMediaSearchTimer = null;
    this._editLinkedMediaSearchRequestId = 0;
    this._editLinkedMediaSelection = null;
    this.streamFilters = { view: 'all', mediaType: null, query: '' };
    this.easynewsDiscoveryState = null;
    this.init();
  }

  async init() {
    await this.loadAppInfo();
    this.setupNavigation();
    this.setupHomeCarousels();
    this.setupLibraryPage();
    this.setupStreamsPage();
    this.setupCollectionsPage();
    this.setupTrailerModal();
    this.setupBrowsePage();
    this.setupUploadPage();
    this.setupSettings();
    await this.loadSettingsFromDB(); // Load settings and apply cover size
    this.setupPlayer();
    this.setupNZBImport();
    this.setupOwnedRefreshProgress();
    this.setupAutoRefreshNotifications();
    this.setupDragDrop();
    this.deferHomeCarouselLoad();
  }

  async loadAppInfo() {
    try {
      const info = await window.electron.getAppInfo();
      const isGitVariant = info?.variant === 'git' || info?.name === 'NZBarr-GIT';

      document.body.classList.toggle('git-build', isGitVariant);
      document.title = isGitVariant ? 'NZBarr-GIT' : 'NZBarr';

      const badge = document.getElementById('git-build-badge');
      if (badge) {
        badge.hidden = !isGitVariant;
        badge.textContent = isGitVariant ? 'NZBarr-GIT' : '';
      }

      const versionBadge = document.querySelector('.version-badge');
      if (versionBadge && info?.version) {
        versionBadge.textContent = `v${info.version}`;
      }
    } catch (error) {
      console.warn('Could not load app info:', error);
    }
  }

  deferHomeCarouselLoad() {
    const load = () => {
      this.loadHomeCarousels().catch(error => {
        console.error('Failed to load home carousels:', error);
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(load, { timeout: 1500 });
    } else {
      setTimeout(load, 250);
    }
  }

  setupOwnedRefreshProgress() {
    window.electron.onOwnedRefreshProgress((data) => {
      if (!this.currentReleaseDetail || this.currentReleaseDetail.id !== data.releaseId) {
        return;
      }

      const statusLine = this.formatOwnedRefreshStatus(data);
      const statusEl = document.getElementById('release-refresh-status');
      if (statusEl) {
        statusEl.textContent = statusLine;
      }

      this.currentRefreshLog.push(`[${new Date(data.timestamp).toLocaleTimeString()}] ${data.step}: ${data.message}`);
    });
  }

  setupAutoRefreshNotifications() {
    window.electron.onAutoRefreshComplete((data) => {
      if (!data || !data.message) {
        return;
      }

      const level = data.error ? 'warning' : 'success';
      this.showNotification(data.message, level);
    });
  }

  formatOwnedRefreshStatus(data) {
    const labels = {
      starting: 'Starting',
      prepare: 'Preparing',
      connect: 'Authenticating',
      download: 'Downloading',
      analyze: 'Analyzing files',
      mediainfo: 'Running MediaInfo',
      completed: 'Completed',
      failed: 'Failed'
    };
    const label = labels[data.step] || data.step;
    return `Refresh status: ${label} • ${data.message}`;
  }

  setupDragDrop() {
    // Prevent default browser drag-drop behavior (opening files)
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const nzbFiles = [];
      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.nzb') || lowerName.endsWith('.nzb.gz')) {
          nzbFiles.push(file);
        }
      }

      if (nzbFiles.length === 0) return;

      this.processDroppedNZBFiles(nzbFiles);
    });

    // Listen for import complete notification from main process
    window.electron.onImportComplete((data) => {
      const msg = `Imported ${data.imported} file(s)${data.failed > 0 ? `, ${data.failed} failed` : ''}`;
      this.showNotification(msg, data.failed > 0 ? 'warning' : 'success');
      if (this.currentPage === 'categories' || this.currentPage === 'library') {
        this.loadHomeCarousels();
      }
    });
  }

  async processDroppedNZBFiles(files) {
    this.showNotification(`Importing ${files.length} NZB file(s)...`, 'info');
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const file of files) {
      try {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });

        const result = await window.electron.importDroppedNZB(file.name, content);
        if (result?.success) {
          imported++;
        } else {
          failed++;
          const errorMsg = result?.error || 'Unknown error';
          errors.push(`${file.name}: ${errorMsg}`);
        }
      } catch (err) {
        console.error(`Failed to import ${file.name}:`, err);
        failed++;
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    let msg = `Imported ${imported} file(s)${failed > 0 ? `, ${failed} failed` : ''}`;
    if (errors.length > 0 && errors.length <= 3) {
      msg += `\n\n${errors.join('\n')}`;
    } else if (errors.length > 3) {
      msg += `\n\nFirst errors: ${errors.slice(0, 3).join(' | ')}...`;
    }
    this.showNotification(msg, failed > 0 ? 'warning' : 'success');
    if (this.currentPage === 'categories' || this.currentPage === 'library') {
      this.loadHomeCarousels();
    }
  }

  // Add Media Page (Manual Entry)
  setupUploadPage() {
    this._addMediaType = 'movie';
    this._addMediaImages = { cover: null, backdrop: null, logo: null };
    this._addMediaTmdbSearchTimer = null;
    this._addMediaTmdbRequestId = 0;
    this._addMediaTmdbSelectedId = null;

    // Media type pills
    document.querySelectorAll('.media-type-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this._addMediaType = btn.dataset.type;
        document.querySelectorAll('.media-type-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show/hide TV-only fields
        document.querySelectorAll('.tv-only-fields').forEach(el => {
          el.classList.toggle('hidden', this._addMediaType !== 'tv');
        });

        // Update placeholder icons for image uploads
        const coverIcon = document.querySelector('#am-cover-preview .image-placeholder-icon');
        if (coverIcon) coverIcon.innerHTML = this._addMediaType === 'tv' ? SVG_ICONS.tv : SVG_ICONS.movie;

        this._addMediaTmdbSelectedId = null;
        this.hideAddMediaTMDBResults();
        this.queueAddMediaTMDBSearch();
      });
    });

    const titleInput = document.getElementById('am-title');
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        this._addMediaTmdbSelectedId = null;
        this.queueAddMediaTMDBSearch();
      });

      titleInput.addEventListener('focus', () => {
        if (titleInput.value.trim().length >= 2 && !this._addMediaTmdbSelectedId) {
          this.queueAddMediaTMDBSearch();
        }
      });
    }

    const tmdbResults = document.getElementById('am-tmdb-results');
    if (tmdbResults) {
      tmdbResults.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
    }

    if (!this._addMediaOutsideClickHandler) {
      this._addMediaOutsideClickHandler = (event) => {
        const wrapper = document.querySelector('.add-media-autocomplete');
        if (!wrapper || wrapper.contains(event.target)) {
          return;
        }
        this.hideAddMediaTMDBResults();
      };
      document.addEventListener('click', this._addMediaOutsideClickHandler);
    }

    // Image file inputs — preview and store
    document.querySelectorAll('.image-file-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewId = input.dataset.preview;
        const preview = document.getElementById(previewId);
        const nameEl = document.getElementById(previewId.replace('-preview', '-name'));

        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
          preview.classList.add('has-image');
          if (nameEl) nameEl.textContent = file.name;
        };
        reader.readAsDataURL(file);

        // Store image data
        const key = input.id.replace('am-', ''); // cover, backdrop, logo
        this._addMediaImages[key] = {
          file,
          data: null // will be loaded as base64 on submit
        };
      });
    });

    // Clear image buttons
    document.querySelectorAll('.image-clear-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const previewId = btn.dataset.preview;
        const input = document.getElementById(targetId);
        const preview = document.getElementById(previewId);
        const nameEl = document.getElementById(previewId.replace('-preview', '-name'));

        if (input) input.value = '';
        if (nameEl) nameEl.textContent = 'No file selected';

        const placeholderIcons = { 'am-cover-preview': SVG_ICONS.movie, 'am-backdrop-preview': SVG_ICONS.image, 'am-logo-preview': SVG_ICONS.tag };
        const iconSvg = this._addMediaType === 'tv' && targetId === 'am-cover-preview' ? SVG_ICONS.tv : (placeholderIcons[previewId] || SVG_ICONS.image);
        preview.innerHTML = `
          <span class="image-placeholder-icon">${iconSvg}</span>
          <span class="image-placeholder-text">${previewId.includes('cover') ? 'Cover' : previewId.includes('backdrop') ? 'Backdrop' : 'Logo'} Image</span>
        `;
        preview.classList.remove('has-image');

        const key = targetId.replace('am-', '');
        this._addMediaImages[key] = null;
      });
    });

    // Form submit
    const form = document.getElementById('add-media-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitAddMediaForm();
      });
    }
  }

  queueAddMediaTMDBSearch() {
    clearTimeout(this._addMediaTmdbSearchTimer);
    this._addMediaTmdbSearchTimer = setTimeout(() => {
      this.searchAddMediaTMDB();
    }, 250);
  }

  async searchAddMediaTMDB() {
    const titleInput = document.getElementById('am-title');
    const resultsEl = document.getElementById('am-tmdb-results');
    if (!titleInput || !resultsEl) return;

    const query = titleInput.value.trim();
    if (query.length < 2 || this._addMediaTmdbSelectedId) {
      this.hideAddMediaTMDBResults();
      return;
    }

    const requestId = Date.now();
    this._addMediaTmdbRequestId = requestId;
    resultsEl.innerHTML = '<div class="add-media-tmdb-hint">Searching TMDB...</div>';
    resultsEl.classList.remove('hidden');

    try {
      const searchFn = this._addMediaType === 'tv' ? window.electron.searchTV : window.electron.searchMovie;
      const response = await searchFn(query);
      if (this._addMediaTmdbRequestId !== requestId) {
        return;
      }

      const results = Array.isArray(response?.results) ? response.results.slice(0, 8) : [];
      if (results.length === 0) {
        resultsEl.innerHTML = '<div class="add-media-tmdb-empty">No TMDB matches found.</div>';
        resultsEl.classList.remove('hidden');
        return;
      }

      resultsEl.innerHTML = '';
      results.forEach((result) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'add-media-tmdb-item';

        const title = result.title || result.name || 'Unknown title';
        const dateValue = result.release_date || result.first_air_date || '';
        const year = dateValue ? String(dateValue).slice(0, 4) : '';
        const posterUrl = result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : '';
        const rating = Number(result.vote_average || 0);
        const mediaLabel = this._addMediaType === 'tv' ? 'TV' : 'Movie';
        const overview = result.overview || 'No overview available.';

        item.innerHTML = `
          ${posterUrl
            ? `<img src="${posterUrl}" alt="" class="add-media-tmdb-poster" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="add-media-tmdb-poster-placeholder" style="display:none;">${mediaLabel === 'TV' ? '📺' : '🎬'}</div>`
            : `<div class="add-media-tmdb-poster-placeholder">${mediaLabel === 'TV' ? '📺' : '🎬'}</div>`}
          <div class="add-media-tmdb-meta">
            <div class="add-media-tmdb-title">${this.escapeHtml(title)}${year ? ` (${this.escapeHtml(year)})` : ''}</div>
            <div class="add-media-tmdb-subtitle">${mediaLabel} • TMDB ${this.escapeHtml(String(result.id))}${rating > 0 ? ` • ★ ${this.escapeHtml(rating.toFixed(1))}` : ''}</div>
            <div class="add-media-tmdb-overview">${this.escapeHtml(overview)}</div>
          </div>
        `;

        item.addEventListener('click', () => this.selectAddMediaTMDBResult(result));
        resultsEl.appendChild(item);
      });

      resultsEl.classList.remove('hidden');
    } catch (error) {
      if (this._addMediaTmdbRequestId !== requestId) {
        return;
      }
      resultsEl.innerHTML = `<div class="add-media-tmdb-empty">TMDB search failed: ${this.escapeHtml(error.message)}</div>`;
      resultsEl.classList.remove('hidden');
    }
  }

  hideAddMediaTMDBResults() {
    const resultsEl = document.getElementById('am-tmdb-results');
    if (!resultsEl) return;
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
  }

  async selectAddMediaTMDBResult(result) {
    if (!result?.id) return;

    const detailsFn = this._addMediaType === 'tv' ? window.electron.getTVDetails : window.electron.getMovieDetails;
    this._addMediaTmdbSelectedId = result.id;
    this.hideAddMediaTMDBResults();

    try {
      const details = await detailsFn(result.id);
      if (!details) {
        throw new Error('Could not load TMDB details');
      }

      this.populateAddMediaFormFromTMDB(details, this._addMediaType === 'tv');
      this.showNotification(`TMDB details loaded for "${details.title || details.name}"`, 'success');
    } catch (error) {
      this._addMediaTmdbSelectedId = null;
      this.showNotification(`TMDB autofill failed: ${error.message}`, 'error');
    }
  }

  populateAddMediaFormFromTMDB(details, isTV) {
    const title = details.title || details.name || '';
    const imdbId = details.imdb_id || details.external_ids?.imdb_id || '';
    const dateValue = details.release_date || details.first_air_date || '';
    const year = dateValue ? String(dateValue).slice(0, 4) : '';
    const genres = Array.isArray(details.genres) ? details.genres.map((genre) => genre?.name).filter(Boolean).join(', ') : '';
    const spokenLanguages = Array.isArray(details.spoken_languages)
      ? details.spoken_languages.map((language) => language?.english_name || language?.name).filter(Boolean).join(', ')
      : '';
    const countries = isTV
      ? (Array.isArray(details.origin_country) ? details.origin_country.filter(Boolean).join(', ') : '')
      : (Array.isArray(details.production_countries) ? details.production_countries.map((country) => country?.name).filter(Boolean).join(', ') : '');
    const actors = Array.isArray(details.credits?.cast)
      ? details.credits.cast.slice(0, 10).map((actor) => actor?.name).filter(Boolean).join(', ')
      : '';
    const directors = Array.isArray(details.credits?.crew)
      ? details.credits.crew.filter((member) => member?.job === 'Director').map((member) => member?.name).filter(Boolean).join(', ')
      : '';
    const trailer = Array.isArray(details.videos?.results)
      ? details.videos.results.find((video) => video?.site === 'YouTube' && video?.type === 'Trailer')?.key || ''
      : '';

    document.getElementById('am-title').value = title;
    document.getElementById('am-year').value = year;
    document.getElementById('am-rating').value = details.vote_average ? Number(details.vote_average).toFixed(1) : '';
    document.getElementById('am-imdb').value = imdbId;
    document.getElementById('am-tmdb').value = details.id || '';
    document.getElementById('am-genres').value = genres;
    document.getElementById('am-plot').value = details.overview || '';
    document.getElementById('am-tagline').value = details.tagline || '';
    document.getElementById('am-runtime').value = isTV
      ? (Array.isArray(details.episode_run_time) ? details.episode_run_time[0] || '' : '')
      : (details.runtime || '');
    document.getElementById('am-language').value = spokenLanguages;
    document.getElementById('am-country').value = countries;
    document.getElementById('am-actors').value = actors;
    document.getElementById('am-trailer').value = trailer || '';

    if (isTV) {
      document.getElementById('am-seasons').value = details.number_of_seasons || '';
      document.getElementById('am-episodes').value = details.number_of_episodes || '';
      document.getElementById('am-status').value = details.status || '';
    } else {
      document.getElementById('am-director').value = directors;
    }
  }

  async submitAddMediaForm() {
    const title = document.getElementById('am-title').value.trim();
    if (!title) {
      this.showNotification('Please enter a title', 'warning');
      return;
    }

    const submitBtn = document.querySelector('.add-media-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Saving...';

    try {
      const year = document.getElementById('am-year').value || null;
      const imdbId = document.getElementById('am-imdb').value.trim() || null;
      const tmdbId = document.getElementById('am-tmdb').value || null;
      const rating = document.getElementById('am-rating').value || null;
      const genres = document.getElementById('am-genres').value.trim() || null;
      const plot = document.getElementById('am-plot').value.trim() || null;
      const tagline = document.getElementById('am-tagline').value.trim() || null;
      const director = document.getElementById('am-director').value.trim() || null;
      const runtime = document.getElementById('am-runtime').value || null;
      const language = document.getElementById('am-language').value.trim() || null;
      const country = document.getElementById('am-country').value.trim() || null;
      const actors = document.getElementById('am-actors').value.trim() || null;
      const youtubeTrailer = document.getElementById('am-trailer').value.trim() || null;

      // Upload images
      let coverPath = null, backdropPath = null, logoPath = null;
      const mediaType = this._addMediaType; // 'movie' or 'tv'

      for (const [key, imgData] of Object.entries(this._addMediaImages)) {
        if (!imgData?.file) continue;

        const base64 = await this._readFileAsBase64(imgData.file);
        const subdir = key === 'cover' ? 'covers' : key === 'backdrop' ? 'backdrops' : 'logos';
        const ext = imgData.file.name.split('.').pop().toLowerCase();
        const filename = `${imdbId || tmdbId || Date.now()}-${key}.${ext}`;

        const uploadResult = await window.electron.uploadImage({
          data: base64,
          type: imgData.file.type,
          subdir,
          filename,
          mediaType
        });

        if (uploadResult.success) {
          if (key === 'cover') coverPath = uploadResult.path;
          else if (key === 'backdrop') backdropPath = uploadResult.path;
          else if (key === 'logo') logoPath = uploadResult.path;
        }
      }

      const releaseDate = year ? `${year}-01-01` : null;

      if (this._addMediaType === 'movie') {
        const movieData = {
          imdb_id: imdbId,
          tmdb_id: tmdbId ? parseInt(tmdbId) : null,
          title,
          plot,
          tagline,
          release_date: releaseDate,
          runtime: runtime ? parseInt(runtime) : null,
          rating: rating ? parseFloat(rating) : null,
          genres,
          actors,
          director,
          language,
          country,
          youtube_trailer: youtubeTrailer,
          has_cover: coverPath ? 1 : 0,
          has_backdrop: backdropPath ? 1 : 0,
          has_logo: logoPath ? 1 : 0,
          cover_path: coverPath,
          backdrop_path: backdropPath,
          logo_path: logoPath
        };

        const result = await window.electron.createMovie(movieData);
        if (result.success) {
          this.showNotification(`✓ "${title}" added to library`, 'success');
          this.resetAddMediaForm();
        } else {
          this.showNotification(`Failed to save: ${result.error}`, 'error');
        }
      } else if (this._addMediaType === 'tv') {
        const tvData = {
          tmdb_id: tmdbId ? parseInt(tmdbId) : Date.now(), // tmdb_id cannot be null (NOT NULL in DB)
          imdb_id: imdbId,
          title,
          plot,
          first_air_date: releaseDate,
          runtime: runtime ? parseInt(runtime) : null,
          number_of_seasons: document.getElementById('am-seasons').value ? parseInt(document.getElementById('am-seasons').value) : null,
          number_of_episodes: document.getElementById('am-episodes').value ? parseInt(document.getElementById('am-episodes').value) : null,
          rating: rating ? parseFloat(rating) : null,
          genres,
          actors,
          language,
          country,
          status: document.getElementById('am-status').value || null,
          youtube_trailer: youtubeTrailer,
          has_cover: coverPath ? 1 : 0,
          has_backdrop: backdropPath ? 1 : 0,
          has_logo: logoPath ? 1 : 0,
          cover_path: coverPath,
          backdrop_path: backdropPath,
          logo_path: logoPath
        };

        const result = await window.electron.createTV(tvData);
        if (result.success) {
          this.showNotification(`✓ "${title}" added to library`, 'success');
          this.resetAddMediaForm();
        } else {
          this.showNotification(`Failed to save: ${result.error}`, 'error');
        }
      }
    } catch (error) {
      this.showNotification(`Failed to save: ${error.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${SVG_ICONS.save} Save to Library`;
    }
  }

  _readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  markMediaAssetUpdated(src) {
    if (!src || src.startsWith('assets/images/')) return;
    this.mediaAssetVersionMap.set(src, Date.now());
  }

  resolveMediaAssetUrl(src) {
    if (!src) return src;
    if (src.startsWith('assets/images/')) return src;

    const version = this.mediaAssetVersionMap.get(src);
    if (!version) return src;

    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}v=${version}`;
  }

  resetAddMediaForm() {
    const form = document.getElementById('add-media-form');
    if (form) form.reset();
    this._addMediaTmdbSelectedId = null;
    clearTimeout(this._addMediaTmdbSearchTimer);
    this.hideAddMediaTMDBResults();

    // Clear image previews
    ['cover', 'backdrop', 'logo'].forEach(key => {
      this._addMediaImages[key] = null;
      const previewId = `am-${key}-preview`;
      const nameId = `am-${key}-name`;
      const preview = document.getElementById(previewId);
      const nameEl = document.getElementById(nameId);
      const placeholderIcons = { 'am-cover-preview': '🎬', 'am-backdrop-preview': '🖼️', 'am-logo-preview': '🏷️' };
      if (preview) {
        preview.innerHTML = `
          <span class="image-placeholder-icon">${placeholderIcons[previewId] || '🖼️'}</span>
          <span class="image-placeholder-text">${key.charAt(0).toUpperCase() + key.slice(1)} Image</span>
        `;
        preview.classList.remove('has-image');
      }
      if (nameEl) nameEl.textContent = 'No file selected';
    });
  }

  // Link NZBs Page
  _linkNZBFiles = [];
  _linkSelectedMedia = null;
  _linkAllItems = [];

  async loadLinkNZBsPage() {
    try {
      // Load all library items once
      const result = await window.electron.getLibraryDropdown();
      this._linkAllItems = result?.items || [];
      this._linkSelectedMedia = null;
      this._linkNZBFiles = [];

      // Hide step 2 and 3
      document.getElementById('link-step-files')?.classList.add('hidden');
      document.getElementById('link-step-action')?.classList.add('hidden');
      document.getElementById('link-selected-display').textContent = '';
      document.getElementById('link-nzb-paths').value = '';
      document.getElementById('link-file-list').innerHTML = '';

      const searchInput = document.getElementById('link-media-search');
      if (searchInput) {
        searchInput.value = '';
        document.getElementById('link-search-results').innerHTML = '<span class="link-search-hint">Start typing to search your library...</span>';

        let debounceTimer;
        searchInput.oninput = () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query.length < 2) {
              document.getElementById('link-search-results').innerHTML = '<span class="link-search-hint">Type at least 2 characters to search...</span>';
              return;
            }
            this._renderLinkSearchResults(query);
          }, 200);
        };
      }

      // Browse button
      const browseBtn = document.getElementById('link-browse-btn');
      if (browseBtn) {
        browseBtn.onclick = async () => {
          try {
            const result2 = await window.electron.selectNZBFiles();
            if (!result2.canceled && result2?.filePaths?.length > 0) {
              this._linkNZBFiles = result2.filePaths;
              const displayInput = document.getElementById('link-nzb-paths');
              if (displayInput) {
                const names = this._linkNZBFiles.map(f => f.split('/').pop()).join(', ');
                displayInput.value = names.length > 100 ? names.substring(0, 100) + '...' : names;
              }
              this.renderLinkFileList();
              this._updateLinkSubmitBtn();
            }
          } catch (e) {
            console.error('Failed to browse for NZB files:', e);
          }
        };
      }

      // Submit button
      const submitBtn = document.getElementById('link-submit-btn');
      if (submitBtn) {
        submitBtn.onclick = () => this.submitLinkNZBs();
      }
    } catch (error) {
      console.error('Failed to load Link NZBs page:', error);
    }
  }

  _renderLinkSearchResults(query) {
    const container = document.getElementById('link-search-results');
    if (!container) return;

    const q = query.toLowerCase();
    const filtered = this._linkAllItems.filter(item =>
      (item.title || '').toLowerCase().includes(q)
    ).slice(0, 50); // max 50 results

    if (filtered.length === 0) {
      container.innerHTML = '<div class="link-search-no-results">No matches found</div>';
      return;
    }

    const movies = filtered.filter(i => i.media_type === 'movie');
    const tvShows = filtered.filter(i => i.media_type === 'tv');

    let html = `
      <div class="tv-batch-bar">
        <label class="tv-batch-select-all">
          <input type="checkbox" id="tv-select-all"> Select All
        </label>
        <button class="btn-small btn-download-selected" id="tv-download-selected" disabled>⬇️ Download Selected</button>
        <button class="btn-small btn-download-selected" id="tv-queue-refresh-selected" disabled>↻ Queue Refresh</button>
        <button class="btn-small btn-download-selected" id="tv-batch-edit-selected" disabled>✎ Batch Edit</button>
        <span class="tv-batch-count" id="tv-batch-count">0 selected</span>
      </div>
    `;

    if (movies.length > 0) {
      html += `<div style="padding:6px 14px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;"><span class="link-search-result-icon">${SVG_ICONS.movie}</span><span>Movies (${movies.length})</span></div>`;
      movies.forEach(item => {
        const year = item.release_date ? item.release_date.substring(0, 4) : '?';
        const selected = this._linkSelectedMedia && this._linkSelectedMedia.tmdbId == item.tmdb_id && this._linkSelectedMedia.imdbId == item.imdb_id;
        html += `
          <div class="link-search-result ${selected ? 'selected' : ''}" data-id="${item.id}" data-imdb="${item.imdb_id || ''}" data-tmdb="${item.tmdb_id || ''}" data-type="movie" data-title="${item.title}">
            <span class="link-search-result-icon">${SVG_ICONS.movie}</span>
            <div class="link-search-result-info">
              <div class="link-search-result-title">${item.title}</div>
              <div class="link-search-result-meta">${year}</div>
            </div>
          </div>
        `;
      });
    }

    if (tvShows.length > 0) {
      html += `<div style="padding:6px 14px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;"><span class="link-search-result-icon">${SVG_ICONS.tv}</span><span>TV Shows (${tvShows.length})</span></div>`;
      tvShows.forEach(item => {
        const year = item.release_date ? item.release_date.substring(0, 4) : '?';
        const selected = this._linkSelectedMedia && this._linkSelectedMedia.tmdbId == item.tmdb_id && this._linkSelectedMedia.imdbId == item.imdb_id;
        html += `
          <div class="link-search-result ${selected ? 'selected' : ''}" data-id="${item.id}" data-imdb="${item.imdb_id || ''}" data-tmdb="${item.tmdb_id || ''}" data-type="tv" data-title="${item.title}">
            <span class="link-search-result-icon">${SVG_ICONS.tv}</span>
            <div class="link-search-result-info">
              <div class="link-search-result-title">${item.title}</div>
              <div class="link-search-result-meta">${year}</div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;

    // Click handlers
    container.querySelectorAll('.link-search-result').forEach(el => {
      el.onclick = () => {
        this._linkSelectedMedia = {
          imdbId: el.dataset.imdb || null,
          tmdbId: el.dataset.tmdb || null,
          mediaType: el.dataset.type,
          title: el.dataset.title
        };

        // Highlight selected
        container.querySelectorAll('.link-search-result').forEach(r => r.classList.remove('selected'));
        el.classList.add('selected');

        // Show step 2
        document.getElementById('link-step-files').classList.remove('hidden');

        // Show selected display
        const display = document.getElementById('link-selected-display');
        display.innerHTML = `<span>${el.dataset.type === 'tv' ? SVG_ICONS.tv : SVG_ICONS.movie}</span> <strong>${el.dataset.title}</strong>`;

        this._updateLinkSubmitBtn();
      };
    });
  }

  renderLinkFileList() {
    const listEl = document.getElementById('link-file-list');
    if (!listEl) return;

    if (this._linkNZBFiles.length === 0) {
      listEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = this._linkNZBFiles.map((f, i) => {
      const name = f.split('/').pop();
      return `
        <div class="link-file-item">
          <span class="link-file-item-name" title="${name}">📄 ${name}</span>
          <button class="link-file-remove" data-idx="${i}">✕</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.link-file-remove').forEach(btn => {
      btn.onclick = () => {
        this._linkNZBFiles.splice(parseInt(btn.dataset.idx), 1);
        this.renderLinkFileList();
        this.updateLinkSubmitBtn();

        const displayInput = document.getElementById('link-nzb-paths');
        if (this._linkNZBFiles.length === 0) {
          if (displayInput) displayInput.value = '';
          document.getElementById('link-step-action')?.classList.add('hidden');
        } else {
          const names = this._linkNZBFiles.map(f => f.split('/').pop()).join(', ');
          if (displayInput) displayInput.value = names.length > 100 ? names.substring(0, 100) + '...' : names;
        }
      };
    });
  }

  _updateLinkSubmitBtn() {
    const btn = document.getElementById('link-submit-btn');
    const actionStep = document.getElementById('link-step-action');
    if (btn && actionStep) {
      const hasMedia = !!this._linkSelectedMedia;
      const hasFiles = this._linkNZBFiles.length > 0;
      btn.disabled = !hasMedia || !hasFiles;
      actionStep.classList.toggle('hidden', !hasMedia || !hasFiles);
    }
  }

  async submitLinkNZBs() {
    if (!this._linkSelectedMedia || this._linkNZBFiles.length === 0) return;

    const submitBtn = document.getElementById('link-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Linking...';

    try {
      const result = await window.electron.linkNZBs({
        imdbId: this._linkSelectedMedia.imdbId,
        tmdbId: this._linkSelectedMedia.tmdbId,
        mediaType: this._linkSelectedMedia.mediaType,
        nzbPaths: this._linkNZBFiles
      });

      if (result.success) {
        let msg = `✓ Linked ${result.imported} NZB(s) to "${this._linkSelectedMedia.title}"`;
        if (result.failed > 0) {
          msg += `, ${result.failed} failed`;
          if (result.errors && result.errors.length > 0) {
            msg += '\n\n' + result.errors.join('\n');
          }
        }
        this.showNotification(msg, result.failed > 0 ? 'warning' : 'success');
        // Reset form
        this._linkNZBFiles = [];
        this._linkSelectedMedia = null;
        document.getElementById('link-nzb-paths').value = '';
        document.getElementById('link-file-list').innerHTML = '';
        document.getElementById('link-step-files').classList.add('hidden');
        document.getElementById('link-step-action').classList.add('hidden');
        document.getElementById('link-selected-display').textContent = '';
        document.getElementById('link-media-search').value = '';
        document.getElementById('link-search-results').innerHTML = '<span class="link-search-hint">Start typing to search your library...</span>';
        submitBtn.disabled = true;
      } else {
        this.showNotification(`Failed to link: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`Failed to link: ${error.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${SVG_ICONS.link} Link NZBs to Selected Media`;
    }
  }

  // Navigation
  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.page === 'library') {
          this.clearLibrarySearch();
        }
        if (btn.dataset.page === 'collections') {
          this.clearCollectionsSearch();
        }
        if (btn.dataset.page === 'browse') {
          this.clearBrowseSearch();
        }
        this.switchPage(btn.dataset.page);
      });
    });

    // Back button from details page
    const backBtn = document.getElementById('back-from-details');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.hideDetailsPage();
      });
    }

    const collectionBackBtn = document.getElementById('back-from-collection-details');
    if (collectionBackBtn) {
      collectionBackBtn.addEventListener('click', () => {
        this.hideCollectionDetailPage();
      });
    }
  }

  hideDetailsPage() {
    // Check if we came from an actor detail page
    if (this._fromActorPage && this.previousPage === 'actor-details') {
      // Hide movie details
      const movieDetails = document.getElementById('page-movie-details');
      if (movieDetails) {
        movieDetails.classList.add('hidden');
        movieDetails.classList.remove('active');
      }
      // Re-show actor detail page with saved data
      this.showActorDetailPage(this._fromActorPage.actor, this._fromActorPage.releases, this._fromActorPage.returnTo || null);
      this._fromActorPage = null;
      return;
    }
    
    // Hide both movie and actor detail pages
    const movieDetails = document.getElementById('page-movie-details');
    if (movieDetails) {
      movieDetails.classList.add('hidden');
      movieDetails.classList.remove('active');
    }
    
    const actorDetails = document.getElementById('page-actor-details');
    if (actorDetails) {
      actorDetails.classList.add('hidden');
      actorDetails.classList.remove('active');
    }

    const collectionDetails = document.getElementById('page-collection-details');
    if (collectionDetails) {
      collectionDetails.classList.add('hidden');
      collectionDetails.classList.remove('active');
    }
    
    // Return to the page we came from
    const returnPage = this.previousPage || 'categories';
    this.switchPage(returnPage);
  }

  // Called when clicking a poster on actor detail page
  navigateFromActorToMovie(tmdbId, imdbId, mediaType, title) {
    let returnPage = this.previousPage || 'categories';
    if (this.actorDetailReturnTarget?.type === 'movie-details') {
      returnPage = this.actorDetailReturnTarget.previousPage || 'categories';
    } else if (this.actorDetailReturnTarget?.type === 'page') {
      returnPage = this.actorDetailReturnTarget.pageName || returnPage;
    }

    this._fromActorPage = null;

    this.showDetailsPage({
      tmdb_id: tmdbId ? parseInt(tmdbId) : null,
      imdb_id: imdbId || null,
      media_type: mediaType,
      clean_name: title
    }, {
      fromActorPage: null,
      overridePreviousPage: returnPage
    });
  }

  // Home Carousels
  setupHomeCarousels() {
    // Hero slider navigation
    const prevBtn = document.getElementById('hero-prev');
    const nextBtn = document.getElementById('hero-next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.heroSliderPrev());
    if (nextBtn) nextBtn.addEventListener('click', () => this.heroSliderNext());

    // Carousel row arrows
    document.querySelectorAll('.row-arrow').forEach(btn => {
      btn.addEventListener('click', () => {
        const slider = document.getElementById(btn.dataset.target);
        if (slider) {
          const dir = btn.classList.contains('left') ? -1 : 1;
          slider.scrollBy({ left: dir * 500, behavior: 'smooth' });
        }
      });
    });

    // Home tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
      });
    });
  }

  // Hero Slider
  heroSliderIndex = 0;
  heroSliderPreviousIndex = 0;
  heroSliderDirection = 1;
  heroSliderInterval = null;
  heroSliderData = [];
  HERO_SLIDE_DURATION = 6000;

  startHeroSlider() {
    if (this.heroSliderInterval) clearInterval(this.heroSliderInterval);
    this.heroSliderIndex = 0;
    this.heroSliderPreviousIndex = 0;
    this.heroSliderDirection = 1;
    this.updateHeroSlide();
    if (this.heroSliderData.length > 1) {
      this.heroSliderInterval = setInterval(() => this.heroSliderNext(), this.HERO_SLIDE_DURATION);
      this.animateTimerLine();
    }
  }

  stopHeroSlider() {
    if (this.heroSliderInterval) {
      clearInterval(this.heroSliderInterval);
      this.heroSliderInterval = null;
    }

    const line = document.getElementById('hero-timer-line');
    if (line) {
      line.style.transition = 'none';
      line.style.width = '0%';
    }
  }

  heroSliderNext() {
    if (this.heroSliderData.length === 0) return;
    this.heroSliderPreviousIndex = this.heroSliderIndex;
    this.heroSliderDirection = 1;
    this.heroSliderIndex = (this.heroSliderIndex + 1) % this.heroSliderData.length;
    this.updateHeroSlide();
    this.resetTimerLine();
  }

  heroSliderPrev() {
    if (this.heroSliderData.length === 0) return;
    this.heroSliderPreviousIndex = this.heroSliderIndex;
    this.heroSliderDirection = -1;
    this.heroSliderIndex = (this.heroSliderIndex - 1 + this.heroSliderData.length) % this.heroSliderData.length;
    this.updateHeroSlide();
    this.resetTimerLine();
  }

  updateHeroSlide() {
    const slides = document.querySelectorAll('.hero-slide');
    slides.forEach((slide, index) => {
      slide.classList.remove('active', 'prev', 'next');
      slide.classList.toggle('active', index === this.heroSliderIndex);
      slide.classList.toggle('prev', index === this.heroSliderPreviousIndex && index !== this.heroSliderIndex && this.heroSliderDirection === 1);
      slide.classList.toggle('next', index === this.heroSliderPreviousIndex && index !== this.heroSliderIndex && this.heroSliderDirection === -1);
      if (index === this.heroSliderIndex) {
        this.ensureDeferredBackground(slide);
      }
    });
  }

  ensureDeferredBackground(element) {
    if (!element || element.dataset.backgroundLoaded === '1') return;
    const src = element.dataset.backgroundSrc;
    if (!src) return;
    element.style.backgroundImage = `url('${src}')`;
    element.dataset.backgroundLoaded = '1';
  }

  animateTimerLine() {
    const line = document.getElementById('hero-timer-line');
    if (!line) return;
    line.style.transition = 'none';
    line.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        line.style.transition = `width ${this.HERO_SLIDE_DURATION}ms linear`;
        line.style.width = '100%';
      });
    });
  }

  resetTimerLine() {
    this.animateTimerLine();
  }

  async loadHomeCarousels() {
    const visibility = this.getHomeSectionVisibility();
    const needsMovies = visibility.showHero || visibility.showMovies;
    const needsTvShows = visibility.showHero || visibility.showSeries;
    const [movies, tvShows, collectionResult, refreshHighlights] = await Promise.all([
      needsMovies ? window.electron.getRecentlyAdded({ limit: 30, mediaType: 'movie' }) : Promise.resolve([]),
      needsTvShows ? window.electron.getRecentlyAdded({ limit: 30, mediaType: 'tv' }) : Promise.resolve([]),
      visibility.showGrandVault ? window.electron.getLibraryCollections({
        limit: 4,
        sortBy: 'owned_count',
        sortOrder: 'DESC'
      }) : Promise.resolve({ items: [] }),
      visibility.showFreshlyPolished ? window.electron.getRefreshHighlights(6) : Promise.resolve([])
    ]);

    // Build hero slider data (mix of movies + TV, up to 10)
    this.heroSliderData = visibility.showHero
      ? [
          ...(movies || []).slice(0, 5),
          ...(tvShows || []).slice(0, 5)
        ]
      : [];
    if (this.heroSliderData.length > 0) {
      // Shuffle
      for (let i = this.heroSliderData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.heroSliderData[i], this.heroSliderData[j]] = [this.heroSliderData[j], this.heroSliderData[i]];
      }
    }

    if (visibility.showHero) {
      this.renderHeroSlider(this.heroSliderData);
      this.startHeroSlider();
    } else {
      this.stopHeroSlider();
      const heroSlides = document.getElementById('hero-slides');
      if (heroSlides) heroSlides.innerHTML = '';
    }

    // Render carousel rows with popout cards (grouped)
    this.renderMediaRow('movies-slider', visibility.showMovies ? (movies || []) : [], 'movie');
    this.renderMediaRow('tv-slider', visibility.showSeries ? (tvShows || []) : [], 'tv');

    // Hide empty sections
    const hasContent = (movies && movies.length > 0) || (tvShows && tvShows.length > 0);
    document.getElementById('carousel-movies')?.classList.toggle('hidden', !visibility.showMovies || !movies || movies.length === 0);
    document.getElementById('carousel-tv')?.classList.toggle('hidden', !visibility.showSeries || !tvShows || tvShows.length === 0);

    // Show/hide empty state
    const emptyState = document.getElementById('home-empty-state');
    if (emptyState) {
      emptyState.classList.toggle('hidden', hasContent);
    }

    this.renderHomeCollectionSpotlights(collectionResult);
    this.renderHomeRefreshRail(refreshHighlights);
    this.renderTrustSignals();

    const openCollectionsBtn = document.getElementById('home-open-collections-btn');
    if (openCollectionsBtn) {
      openCollectionsBtn.onclick = () => this.switchPage('collections');
    }

    this.updateHomeSectionVisibility();
  }

  async renderReleaseGridFromReleases(containerId, mediaType) {
    try {
      const { releases } = await window.electron.getReleases({ limit: 20, mediaType });
      this.renderReleaseGrid(containerId, releases || [], mediaType);
      // Update grid count
      const countId = containerId.replace('grid-', 'grid-count-');
      const el = document.getElementById(countId);
      if (el) el.textContent = releases?.length || 0;
    } catch (e) {
      console.error(`Failed to load release grid for ${mediaType}:`, e);
    }
  }

  renderHeroSlider(items) {
    const container = document.getElementById('hero-slides');
    if (!container) return;

    const slider = document.getElementById('hero-slider');
    if (!items || items.length === 0) {
      slider?.classList.add('hidden');
      return;
    }
    slider?.classList.remove('hidden');

    container.innerHTML = items.map((item, idx) => {
      const identifier = item.imdb_id || item.tmdb_id || item.id;
      const itemType = item.media_type || 'movie';
      const title = item.title || item.clean_name || item.search_name;
      const year = item.year || '';
      const rating = item.info_rating;
      const genre = item.genres ? item.genres.split(',')[0] : '';
      const plot = item.plot || '';
      const youtubeTrailer = item.youtube_trailer;

      // Image paths — use release cover/backdrop/logo as fallback
      const coverPath = this.resolveMediaAssetUrl(item.cover_image || 'assets/images/placeholder-cover.svg');
      const backdropPath = this.resolveMediaAssetUrl(item.backdrop_path || 'assets/images/placeholder-backdrop.svg');
      const logoPath = item.logo_path ? this.resolveMediaAssetUrl(item.logo_path) : null;

      const backdropStyle = idx === 0 ? `style="background-image: url('${backdropPath}');"` : '';
      const backgroundLoaded = idx === 0 ? '1' : '0';

      const posterHtml = `<img src="${coverPath}" class="hero-poster" decoding="async" fetchpriority="${idx === 0 ? 'high' : 'low'}" onerror="this.src='assets/images/placeholder-cover.svg';">`;

      const logoHtml = logoPath
        ? `<img src="${logoPath}" class="hero-logo" loading="${idx === 0 ? 'eager' : 'lazy'}" decoding="async" onerror="this.remove();">`
        : '';
      const typeLabel = itemType === 'tv' ? 'Series Spotlight' : 'Cinema Spotlight';

      const metaParts = [];
      if (year) metaParts.push(`<span class="hero-year">${year}</span>`);
      if (rating) metaParts.push(`<span class="hero-rating">★ ${rating.toFixed(1)}</span>`);
      if (genre) metaParts.push(`<span class="hero-genre">${genre}</span>`);

      const trailerBtn = youtubeTrailer
        ? `<button class="hero-btn hero-btn-secondary" onclick="window.app.playTrailer('${youtubeTrailer}')"><span class="inline-icon">${SVG_ICONS.play}</span> Trailer</button>`
        : '';

      return `
        <div class="hero-slide ${idx === 0 ? 'active' : ''}" ${backdropStyle} data-background-src="${this.escapeHtml(backdropPath)}" data-background-loaded="${backgroundLoaded}">
          <div class="hero-overlay-gradient"></div>
          ${logoHtml}
          <div class="hero-content">
            <div class="hero-content-shell">
              ${posterHtml}
              <div class="hero-info">
                <div class="hero-kicker">${typeLabel}</div>
                <h2 class="hero-title">${title}</h2>
                <div class="hero-meta">${metaParts.join('')}</div>
                ${plot ? `<p class="hero-plot">${plot}</p>` : ''}
                <div class="hero-actions">
                  <button class="hero-btn hero-btn-primary" data-action="details" data-idx="${idx}"><span class="inline-icon">${SVG_ICONS.search}</span> Details</button>
                  ${trailerBtn}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Details button handlers
    container.querySelectorAll('[data-action="details"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showDetailsPage(items[parseInt(btn.dataset.id || btn.dataset.idx)]);
      });
    });
  }

  renderMediaRow(sliderId, items, type) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;

    if (!items || items.length === 0) {
      slider.innerHTML = '';
      return;
    }

    slider.innerHTML = items.map(item => this.buildMediaCard(item, type)).join('');

    // Card clicks - go to detail page
    slider.querySelectorAll('.media-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.ensureDeferredBackground(card.querySelector('.card-hover-backdrop'));
      }, { once: true });

      card.addEventListener('click', () => {
        const item = JSON.parse(card.dataset.item);
        this.showDetailsPage(item);
      });
    });
  }

  buildMediaCard(item, type) {
    const identifier = item.imdb_id || item.tmdb_id || item.id;
    const title = item.title || item.clean_name || item.search_name;
    const year = item.year || '';
    const rating = item.info_rating;
    const plot = item.plot || '';
    const youtubeTrailer = item.youtube_trailer;
    const coverPath = this.resolveMediaAssetUrl(item.cover_image || 'assets/images/placeholder-cover.svg');
    const backdropPath = this.resolveMediaAssetUrl(item.backdrop_path || 'assets/images/placeholder-backdrop.svg');
    const logoPath = item.logo_path ? this.resolveMediaAssetUrl(item.logo_path) : null;
    const genres = item.genres ? item.genres.split(',')[0] : '';

    const isMusic = type === 'music';
    const posterHtml = `<img src="${coverPath}" class="media-poster-img" loading="lazy" decoding="async" onerror="this.src='assets/images/placeholder-cover.svg';">`;

    const logoHtml = logoPath
      ? `<img src="${logoPath}" class="card-hover-logo" loading="lazy" decoding="async" onerror="this.remove();">`
      : '';

    const plotSnippet = plot.length > 180 ? plot.substring(0, 180) + '...' : plot;

    const metaParts = [];
    if (year) metaParts.push(`<span class="card-hover-year">${year}</span>`);
    if (rating) metaParts.push(`<span class="card-hover-rating">★ ${rating.toFixed(1)}</span>`);
    if (genres) metaParts.push(`<span class="card-hover-genre">${genres}</span>`);

    return `
      <div class="media-card ${isMusic ? 'is-music' : ''}" data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>
        <div class="poster-link">${posterHtml}</div>
        <div class="card-hover-overlay">
          <div class="card-hover-backdrop" data-background-src="${this.escapeHtml(backdropPath)}"></div>
          ${logoHtml}
          <div class="card-hover-content">
            <div class="card-hover-title">${title}</div>
            <div class="card-hover-meta">${metaParts.join('')}</div>
            ${plotSnippet ? `<div class="card-hover-plot">${plotSnippet}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  isReleaseDeletePending(release) {
    return (release?.refresh_status || '').toLowerCase() === 'delete_pending';
  }

  getReleasePendingBadgeHtml(release) {
    if (!this.isReleaseDeletePending(release)) {
      return '';
    }

    return '<span class="release-state-badge release-state-badge-pending">DELETE PENDING</span>';
  }

  buildCollectionPosterMarkup(src, alt, className = '', sizeLabel = 'Collection') {
    const safeAlt = alt || sizeLabel;
    const resolvedSrc = this.resolveMediaAssetUrl(src);
    if (src) {
      return `<img class="${className}" src="${resolvedSrc}" alt="${safeAlt}" onerror="this.outerHTML='<div class=&quot;champagne-poster-placeholder ${className} is-fallback&quot;><span>${sizeLabel}</span></div>';">`;
    }

    return `<div class="champagne-poster-placeholder ${className}"><span>${sizeLabel}</span></div>`;
  }

  renderReleaseGrid(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="grid-empty"><i>📭</i><p>No releases yet</p></div>';
      return;
    }

    container.innerHTML = items.map(item => {
      // For release grids, always use search_name (full NZB filename)
      const name = item.search_name || item.clean_name || item.title || '';
      const resolution = item.resolution || '';
      const size = item.size ? this.formatBytes(item.size) : '';
      const pendingClass = this.isReleaseDeletePending(item) ? ' release-delete-pending' : '';
      const pendingBadge = this.getReleasePendingBadgeHtml(item);

      const metaParts = [];
      if (resolution) metaParts.push(`<span class="grid-item-resolution">${resolution}</span>`);
      if (size) metaParts.push(`<span class="grid-item-size">${size}</span>`);

      return `
        <div class="grid-item${pendingClass}" data-action="details">
          <div class="grid-item-info">
            <div class="grid-item-name" title="${name}">${name}</div>
            ${pendingBadge}
            <div class="grid-item-meta">${metaParts.join('')}</div>
          </div>
        </div>
      `;
    }).join('');

    // Click handlers
    container.querySelectorAll('.grid-item').forEach((el, idx) => {
      el.addEventListener('click', () => {
        const release = items[idx];
        this.showReleaseDetail(release.id);
      });
    });
  }

  renderTrustSignals() {
    // Get stats from DB
    window.electron.getDbStats().then(stats => {
      document.getElementById('stat-total').textContent = stats.releases || 0;
    }).catch(() => {});

    window.electron.getLibraryCounts().then(counts => {
      document.getElementById('stat-refreshed').textContent = counts.movies || 0;
      document.getElementById('stat-attention').textContent = counts.tv || 0;
    }).catch(() => {});

    Promise.all([
      window.electron.getLibraryCollections({ limit: 200 }).catch(() => ({ items: [] })),
      window.electron.getLibraryCounts().catch(() => ({ movies: 0, tv: 0 }))
    ]).then(([collectionsResult, counts]) => {
      const collections = collectionsResult.items || [];
      const movieCount = counts.movies || 0;
      const tvShowCount = counts.tv || 0;

      const collectionsEl = document.getElementById('stat-collections');
      if (collectionsEl) collectionsEl.textContent = collections.length;

      const refreshedEl = document.getElementById('stat-refreshed');
      if (refreshedEl) refreshedEl.textContent = movieCount;

      const attentionEl = document.getElementById('stat-attention');
      if (attentionEl) attentionEl.textContent = tvShowCount;

      const noteEl = document.getElementById('home-concierge-note');
      if (noteEl) {
        const completeCollections = collections.filter(collection => {
          const [owned, total] = String(collection.completion_label || '0/0').split('/').map(value => parseInt(value, 10) || 0);
          return total > 0 && owned === total;
        }).length;
        noteEl.textContent = `${movieCount} movie${movieCount !== 1 ? 's' : ''} and ${tvShowCount} TV show${tvShowCount !== 1 ? 's' : ''} are stored, while ${completeCollections} collection${completeCollections !== 1 ? 's are' : ' is'} already complete.`;
      }
    }).catch(() => {});
  }

  openNeedsAttentionView() {
    this.currentBrowseFilter = 'all';
    this.currentBrowseSearch = '';
    this.currentBrowsePage = 1;
    this.currentBrowseRefreshStatus = 'delete_pending';
    this.preserveBrowseRefreshStatus = true;

    const searchInput = document.getElementById('browse-search-input');
    if (searchInput) {
      searchInput.value = '';
    }

    this.switchPage('browse');
  }

  renderHomeCollectionSpotlights(result = null) {
    const container = document.getElementById('home-collection-spotlights');
    if (!container) return;

    try {
      const items = result.items || [];

      if (!items.length) {
        container.innerHTML = '<div class="home-empty-panel">Collections will appear here once your library starts grouping films into TMDB collections.</div>';
        return;
      }

      const [heroItem, ...companionItems] = items;
      const heroBackdrop = heroItem.backdrop_path || 'assets/images/placeholder-backdrop.svg';
      const heroPoster = this.buildCollectionPosterMarkup(heroItem.poster_path || null, heroItem.name, 'home-spotlight-poster home-spotlight-poster-main', 'Collection');
      const heroPosterEchoOne = this.buildCollectionPosterMarkup(heroItem.poster_path || null, heroItem.name, 'home-spotlight-poster home-spotlight-poster-echo', 'Collection');
      const heroPosterEchoTwo = this.buildCollectionPosterMarkup(heroItem.poster_path || null, heroItem.name, 'home-spotlight-poster home-spotlight-poster-echo home-spotlight-poster-echo-far', 'Collection');
      const ownedCount = heroItem.owned_count || 0;
      const totalCount = heroItem.total_count || 0;
      const completionLabel = heroItem.completion_label || `${ownedCount}/${totalCount}`;
      const heroStatus = ownedCount > 0
        ? `${ownedCount} of ${totalCount} titles in residence`
        : `${totalCount} titles prepared for arrival`;

      const companionMarkup = companionItems.map(item => {
        const posterMarkup = this.buildCollectionPosterMarkup(item.poster_path || null, item.name, 'home-spotlight-mini-poster', 'Collection');
        const backdrop = item.backdrop_path || 'assets/images/placeholder-backdrop.svg';
        const companionOwnedCount = item.owned_count || 0;
        const companionTotalCount = item.total_count || 0;
        const companionStatus = companionOwnedCount > 0
          ? `${companionOwnedCount} of ${companionTotalCount} in residence`
          : `${companionTotalCount} titles on the ledger`;

        return `
          <button class="home-spotlight-mini-card" data-tmdb="${item.tmdb_id}">
            <div class="home-spotlight-mini-backdrop" style="background-image:url('${backdrop}')"></div>
            <div class="home-spotlight-mini-overlay"></div>
            <div class="home-spotlight-mini-poster-wrap">
              ${posterMarkup}
            </div>
            <div class="home-spotlight-mini-copy">
              <div class="home-spotlight-mini-eyebrow">Private Salon</div>
              <div class="home-spotlight-mini-title">${item.name}</div>
              <div class="home-spotlight-mini-meta">${companionStatus}</div>
              <div class="home-spotlight-mini-footer">
                <span class="collection-pill">${item.completion_label || `${companionOwnedCount}/${companionTotalCount}`}</span>
                <span class="home-spotlight-mini-link">Enter Collection</span>
              </div>
            </div>
          </button>
        `;
      }).join('');

      container.innerHTML = `
        <button class="home-spotlight-card home-spotlight-hero" data-tmdb="${heroItem.tmdb_id}">
          <div class="home-spotlight-backdrop" style="background-image:url('${heroBackdrop}')"></div>
          <div class="home-spotlight-overlay"></div>
          <div class="home-spotlight-hero-shell">
            <div class="home-spotlight-hero-media">
              <div class="home-spotlight-poster-stack">
                ${heroPosterEchoTwo}
                ${heroPosterEchoOne}
                ${heroPoster}
              </div>
            </div>
            <div class="home-spotlight-copy home-spotlight-hero-copy">
              <div class="home-spotlight-eyebrow">Signature Collection</div>
              <div class="home-spotlight-title">${heroItem.name}</div>
              <p>${heroStatus}</p>
              <div class="home-spotlight-meta">
                <span class="collection-pill">${completionLabel}</span>
                <span class="home-spotlight-hero-note">${totalCount} titles curated in this vault</span>
              </div>
              <div class="home-spotlight-hero-cta">Enter Collection</div>
            </div>
          </div>
        </button>
        <div class="home-spotlight-companions">
          ${companionMarkup}
        </div>
      `;

      container.querySelectorAll('.home-spotlight-card, .home-spotlight-mini-card').forEach(card => {
        card.addEventListener('click', () => {
          this.showCollectionDetailPage(parseInt(card.dataset.tmdb, 10), {
            returnTo: { type: 'page', pageName: 'categories' }
          });
        });
      });
    } catch (error) {
      container.innerHTML = '<div class="home-empty-panel">Collection spotlights are unavailable right now.</div>';
    }
  }

  renderHomeRefreshRail(releases = []) {
    const container = document.getElementById('home-refresh-rail');
    if (!container) return;

    try {
      const refreshed = releases || [];

      if (!refreshed.length) {
        container.innerHTML = '<div class="home-empty-panel">Refreshed titles will be showcased here once your re-upload flow starts building momentum.</div>';
        return;
      }

      container.innerHTML = refreshed.map(release => {
        const cover = this.resolveMediaAssetUrl(release.cover_image || 'assets/images/placeholder-cover.svg');
        const refreshedAtDate = this.parseStoredTimestamp(release.last_refresh_at);
        const refreshedAt = refreshedAtDate ? refreshedAtDate.toLocaleDateString() : 'Unknown date';
        return `
          <button class="home-refresh-card" data-release-id="${release.id}">
            <img class="home-refresh-cover" src="${cover}" alt="${release.clean_name || release.search_name}" onerror="this.src='assets/images/placeholder-cover.svg';">
            <div class="home-refresh-copy">
              <div class="home-refresh-title">${release.clean_name || release.search_name}</div>
              <div class="home-refresh-meta">
                <span>${release.resolution || 'Library Title'}</span>
                <span>Refreshed ${refreshedAt}</span>
              </div>
            </div>
          </button>
        `;
      }).join('');

      container.querySelectorAll('.home-refresh-card').forEach(card => {
        card.addEventListener('click', () => {
          this.showReleaseDetail(parseInt(card.dataset.releaseId, 10));
        });
      });
    } catch (error) {
      container.innerHTML = '<div class="home-empty-panel">Refresh highlights are unavailable right now.</div>';
    }
  }

  async showDetailsPage(item, options = {}) {
    // Store current item for back navigation
    this.currentDetailItem = item;
    this.previousPage = options.overridePreviousPage ?? this.currentPage;
    if (Object.prototype.hasOwnProperty.call(options, 'fromActorPage')) {
      this._fromActorPage = options.fromActorPage;
    }

    // Fetch all releases for this item
    let releases = [];
    try {
      if (item.tmdb_id || item.imdb_id) {
        releases = await window.electron.getReleasesByMovie(item.tmdb_id, item.imdb_id, item.media_type);
      } else {
        // No identifiers - just show this single release
        const release = await window.electron.getReleaseById(item.id);
        releases = release ? [release] : [];
      }
    } catch (e) {
      console.error('Failed to fetch releases for detail page:', e);
      releases = [];
    }

    this.currentDetailReleases = releases || [];

    // Fetch movie/TV info from database
    let info = null;
    try {
      if (item.media_type === 'tv') {
        if (item.imdb_id) {
          info = await window.electron.getTVInfoByIMDB(item.imdb_id);
        }
        if (!info && item.tmdb_id) {
          info = await window.electron.getTVInfoByTMDB(item.tmdb_id);
        }
      } else if (item.media_type === 'music') {
        if (item.media_id) {
          info = await window.electron.getMusicInfoById(item.media_id);
        }
        // If no music_info found, use the item data directly (already enriched from getRecentlyAdded)
        if (!info && (item.cover_image || item.logo_path || item.title)) {
          info = {
            cover_path: item.cover_image,
            logo_path: item.logo_path,
            title: item.title,
            genre: item.genres,
            track_list: item.plot,
            release_date: item.year ? item.year + '-01-01' : null
          };
        }
      } else {
        if (item.imdb_id) {
          info = await window.electron.getMovieInfoByIMDB(item.imdb_id);
        }
        if (!info && item.tmdb_id) {
          info = await window.electron.getMovieInfoByTMDB(item.tmdb_id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch movie/TV info:', e);
    }

    // Use the stored item data as fallback
    this.currentDetailInfo = info;
    const displayItem = info || item;
    
    // Store for trailer access
    this.currentDisplayItem = displayItem;

    // Show/hide music info delete button
    const musicInfoDeleteBtn = document.getElementById('music-info-delete-btn');
    if (musicInfoDeleteBtn) {
      musicInfoDeleteBtn.style.display = (item.media_type === 'music' && info) ? 'inline-block' : 'none';
    }

    // Populate backdrop
    const backdropEl = document.getElementById('movie-backdrop');
    const backdropPath = displayItem.backdrop_path || item.backdrop_path;
    if (backdropPath) {
      backdropEl.innerHTML = `<img src="${this.resolveMediaAssetUrl(backdropPath)}" alt="Backdrop">`;
    } else {
      backdropEl.innerHTML = `<img src="assets/images/placeholder-backdrop.svg" alt="No Backdrop">`;
    }

    // Populate cover
    const coverEl = document.getElementById('movie-cover');
    const coverPath = displayItem.cover_path || item.cover_image;
    if (coverPath) {
      coverEl.src = this.resolveMediaAssetUrl(coverPath);
      coverEl.style.display = 'block';
    } else {
      coverEl.src = 'assets/images/placeholder-cover.svg';
      coverEl.style.display = 'block';
    }

    // Populate logo
    const logoEl = document.getElementById('movie-logo');
    if (displayItem.logo_path) {
      logoEl.src = this.resolveMediaAssetUrl(displayItem.logo_path);
      logoEl.style.display = 'block';
    } else {
      logoEl.removeAttribute('src');
      logoEl.removeAttribute('alt');
      logoEl.style.display = 'none';
    }

    // Title
    const year = this.getDetailYear(item, this.currentDetailInfo || displayItem);
    const titleText = displayItem.title || item.clean_name || '';
    const movieTitleEl = document.getElementById('movie-title-text');
    if (movieTitleEl) {
      movieTitleEl.innerHTML = `${this.escapeHtml(titleText)}${year ? ` <span class="movie-title-year">(${this.escapeHtml(year)})</span>` : ''}`;
    }

    const detailTypeEl = document.getElementById('movie-detail-type');
    if (detailTypeEl) {
      if (item.media_type === 'tv') {
        detailTypeEl.innerHTML = `${SVG_ICONS.tv} Series Detail`;
      } else if (item.media_type === 'music') {
        detailTypeEl.innerHTML = `${SVG_ICONS.music} Album Detail`;
      } else {
        detailTypeEl.innerHTML = `${SVG_ICONS.movie} Movie Detail`;
      }
    }

    const statusLineEl = document.getElementById('movie-status-line');
    if (statusLineEl) {
      const releaseCount = releases?.length || 0;
      let statusLine = '';
      if (item.media_type === 'tv') {
        const seasonCount = displayItem.number_of_seasons || displayItem.num_seasons || null;
        const episodeCount = displayItem.number_of_episodes || displayItem.num_episodes || null;
        const seasonPart = seasonCount ? `${seasonCount} season${seasonCount !== 1 ? 's' : ''}` : null;
        const episodePart = episodeCount ? `${episodeCount} episode${episodeCount !== 1 ? 's' : ''}` : null;
        const catalogPart = [seasonPart, episodePart].filter(Boolean).join(' • ');
        statusLine = catalogPart
          ? `${catalogPart}${releaseCount ? ` • ${releaseCount} release${releaseCount !== 1 ? 's' : ''} linked in your library` : ''}`
          : `${releaseCount} release${releaseCount !== 1 ? 's' : ''} currently linked in your library`;
      } else if (item.media_type === 'music') {
        statusLine = displayItem.genres
          ? `${displayItem.genres}${releaseCount ? ` • ${releaseCount} release${releaseCount !== 1 ? 's' : ''} linked in your library` : ''}`
          : `${releaseCount} release${releaseCount !== 1 ? 's' : ''} currently linked in your library`;
      } else {
        const runtimePart = displayItem.runtime ? `${displayItem.runtime} minutes` : null;
        const releasePart = releaseCount ? `${releaseCount} release${releaseCount !== 1 ? 's' : ''} in residence` : null;
        statusLine = [runtimePart, releasePart].filter(Boolean).join(' • ') || 'Curated film detail';
      }
      statusLineEl.textContent = statusLine;
    }

    // Meta info — use hero-style classes for consistency
    const meta = [];
    if (item.year) meta.push(`<span class="hero-year">${item.year}</span>`);
    if (displayItem.runtime) meta.push(`<span class="badge">${displayItem.runtime} min</span>`);
    if (displayItem.rating) meta.push(`<span class="hero-rating">★ ${displayItem.rating.toFixed(1)}</span>`);
    if (displayItem.genres) {
      displayItem.genres.split(',').forEach(g => {
        if (g.trim()) meta.push(`<span class="hero-genre">${g.trim()}</span>`);
      });
    }
    if (displayItem.director) meta.push(`<span class="badge">Dir: ${displayItem.director}</span>`);
if (displayItem.status) {
    const statusClasses = {
        "Ended": "badge-red",
        "Returning Series": "badge-green",
        "Canceled": "badge-darkred"
    };

    const badgeClass = statusClasses[displayItem.status] || "badge";

    meta.push(`<span class="${badgeClass}">${displayItem.status}</span>`);
}


    if (releases && releases.length > 0) {
      meta.push(`<span class="badge">${releases.length} release${releases.length > 1 ? 's' : ''}</span>`);
    }

    // External link badges (TMDB, IMDB) — inline clickable logos
    const tmdbId = displayItem.tmdb_id || item.tmdb_id;
    const imdbId = displayItem.imdb_id || item.imdb_id;
    if (tmdbId) {
      const tmdbType = (item.media_type === 'tv') ? 'tv' : 'movie';
      const tmdbUrl = `https://www.themoviedb.org/${tmdbType}/${tmdbId}`;
      meta.push(`<a class="meta-link-icon-link" href="${tmdbUrl}" title="View on TMDB">
        <img src="assets/images/tmdb-logo.svg" alt="TMDB" class="meta-link-icon">
      </a>`);
    }
    if (imdbId) {
      const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
      meta.push(`<a class="meta-link-icon-link" href="${imdbUrl}" title="View on IMDB">
        <img src="assets/images/imdb-logo.svg" alt="IMDB" class="meta-link-icon">
      </a>`);
    }

    document.getElementById('movie-meta').innerHTML = meta.join('');

    const releasesSubtitleEl = document.getElementById('movie-releases-subtitle');
    if (releasesSubtitleEl) {
      releasesSubtitleEl.textContent = releases && releases.length > 0
        ? `${releases.length} release${releases.length > 1 ? 's' : ''} currently available in your library`
        : 'No linked releases available yet.';
    }

    // Bind click events on meta links (open in browser)
    document.querySelectorAll('.meta-link-icon-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (link.href) window.electron.openExternal(link.href);
      });
    });

    // Overview/plot
    document.getElementById('movie-overview').textContent = displayItem.plot || displayItem.overview || 'No overview available.';

    // Trailer
    const trailerEl = document.getElementById('movie-trailer');
    const trailerLink = document.getElementById('trailer-link');
    if (displayItem.youtube_trailer) {
      trailerEl.classList.remove('hidden');
      trailerLink.href = '#';
      trailerLink.onclick = (e) => {
        e.preventDefault();
        this.openTrailer(displayItem.youtube_trailer, displayItem.title || 'Trailer');
      };
    } else {
      trailerEl.classList.add('hidden');
    }

    await this.renderMovieCollectionSection(info, item);
    this.renderEasynewsDiscoveryShell(item, displayItem);
    await this.renderMovieDetailStreamLinks(item, displayItem);

    // Releases table
    try {
      this.renderReleasesTable(releases);
    } catch (e) {
      console.error('Failed to render releases table:', e);
      try {
        this.hideSeasonTabs();
        this.renderMovieGrid(releases);
      } catch (e2) {
        console.error('Fallback renderMovieGrid also failed:', e2);
      }
    }

    // Render actors section
    this.renderActorsSection(info, item);

    // Show the detail page
    const page = document.getElementById('page-movie-details');
    if (page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      page.classList.remove('hidden');
      page.classList.add('active');
      this.currentPage = 'movie-details';
    }
  }

  async refreshCurrentDetailsPage() {
    if (!this.currentDetailItem) return;
    await this.showDetailsPage(this.currentDetailItem, {
      overridePreviousPage: this.previousPage,
      fromActorPage: this._fromActorPage
    });
  }

  renderEasynewsDiscoveryShell(item, displayItem) {
    const section = document.getElementById('movie-easynews-discovery-section');
    const results = document.getElementById('movie-easynews-results');
    const button = document.getElementById('movie-easynews-search-btn');
    const subtitle = document.getElementById('movie-easynews-discovery-subtitle');
    if (!section || !results || !button || !subtitle) return;

    if (item.media_type !== 'movie') {
      section.classList.add('hidden');
      results.innerHTML = '';
      button.onclick = null;
      return;
    }

    section.classList.remove('hidden');
    results.innerHTML = '';
    subtitle.textContent = 'Find 720p/1080p MP4 links for this movie.';
    button.disabled = false;
    button.onclick = () => this.searchEasynewsForCurrentMovie(item, displayItem, { page: 1, append: false });
  }

  async searchEasynewsForCurrentMovie(item, displayItem, options = {}) {
    const button = document.getElementById('movie-easynews-search-btn');
    const results = document.getElementById('movie-easynews-results');
    const subtitle = document.getElementById('movie-easynews-discovery-subtitle');
    if (!button || !results || !subtitle) return;

    const page = Math.max(1, parseInt(options.page || 1, 10) || 1);
    const append = Boolean(options.append);
    const currentState = append ? this.easynewsDiscoveryState : null;
    button.disabled = true;
    if (!append) {
      results.innerHTML = '<div class="movie-easynews-empty">Searching Easynews...</div>';
      this.easynewsDiscoveryState = { candidates: [], page: 1, item, displayItem };
    } else {
      const loadMoreBtn = results.querySelector('[data-easynews-load-more]');
      if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading more...';
      }
    }

    try {
      const year = this.getDetailYear(item, displayItem);
      const result = await window.electron.discoverEasynewsMovieStreams({
        mediaType: 'movie',
        tmdbId: displayItem?.tmdb_id || item.tmdb_id || null,
        imdbId: displayItem?.imdb_id || item.imdb_id || null,
        title: displayItem?.title || item.clean_name || item.title || '',
        year,
        page,
        seenIds: currentState?.candidates?.map(candidate => candidate.id).filter(Boolean) || []
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Easynews search failed');
      }

      const queryLabel = Array.isArray(result.queries) && result.queries.length > 1
        ? `${result.queries.length} query variants`
        : result.query;
      const existingCandidates = append && this.easynewsDiscoveryState?.candidates ? this.easynewsDiscoveryState.candidates : [];
      const mergedCandidates = this.mergeEasynewsCandidates(existingCandidates, result.candidates || []);
      this.easynewsDiscoveryState = {
        candidates: mergedCandidates,
        page,
        nextPage: result.nextPage || page + 1,
        item,
        displayItem,
        hasMore: result.hasMore !== false
      };
      subtitle.textContent = `Search: ${queryLabel} • ${mergedCandidates.length} filtered MP4 candidate${mergedCandidates.length === 1 ? '' : 's'}`;
      this.renderEasynewsDiscoveryResults(mergedCandidates, item, displayItem, {
        page,
        nextPage: result.nextPage || page + 1,
        hasMore: result.hasMore !== false,
        loadedThisPage: result.candidates?.length || 0,
        stats: result.stats || null
      });
    } catch (error) {
      results.innerHTML = `<div class="movie-easynews-empty">Easynews search failed: ${this.escapeHtml(error.message)}</div>`;
    } finally {
      button.disabled = false;
    }
  }

  mergeEasynewsCandidates(existing, incoming) {
    const map = new Map();
    [...existing, ...incoming].forEach(candidate => {
      const key = candidate.id || candidate.stream_url_masked || candidate.title;
      if (!map.has(key)) map.set(key, candidate);
    });
    return Array.from(map.values());
  }

  renderEasynewsDiscoveryResults(candidates, item, displayItem, meta = {}) {
    const results = document.getElementById('movie-easynews-results');
    if (!results) return;

    if (!candidates.length) {
      const statsText = meta.stats ? this.formatEasynewsStats(meta.stats) : '';
      results.innerHTML = `
        <div class="movie-easynews-empty">No movie-like 720p/1080p MP4 candidates found on this page.</div>
        ${statsText ? `<div class="movie-easynews-empty">${this.escapeHtml(statsText)}</div>` : ''}
        <button class="movie-easynews-load-more" data-easynews-load-more="1">Load More Results</button>
      `;
      results.onclick = (event) => {
        if (event.target.closest('[data-easynews-load-more]')) {
          this.searchEasynewsForCurrentMovie(item, displayItem, { page: meta.nextPage || ((meta.page || 1) + 1), append: true });
        }
      };
      return;
    }

    results.innerHTML = `
      ${candidates.map((candidate, index) => this.renderEasynewsCandidateRow(candidate, index)).join('')}
      <button class="movie-easynews-load-more" data-easynews-load-more="1">Load More Results</button>
    `;
    results.onclick = async (event) => {
      const loadMoreBtn = event.target.closest('[data-easynews-load-more]');
      if (loadMoreBtn) {
        this.searchEasynewsForCurrentMovie(item, displayItem, { page: meta.nextPage || ((meta.page || 1) + 1), append: true });
        return;
      }

      const importBtn = event.target.closest('[data-easynews-import]');
      const playBtn = event.target.closest('[data-easynews-test]');
      if (!importBtn && !playBtn) return;

      const row = event.target.closest('.movie-easynews-candidate');
      const streamUrl = row?.dataset.streamUrl || '';
      if (!streamUrl) return;

      if (playBtn) {
        const importResult = await window.electron.importStreamUrls([streamUrl]);
        const stream = importResult?.imported?.[0] || importResult?.skipped?.[0]?.item || null;
        if (!stream?.id) {
          this.showNotification('Could not prepare stream for playback', 'error');
          return;
        }
        await this.playStreamInApp(stream.id, stream.title || 'Easynews stream');
        await this.renderMovieDetailStreamLinks(item, displayItem);
        return;
      }

      const result = await window.electron.importStreamUrls([streamUrl]);
      if (result?.imported?.length || result?.skipped?.length) {
        this.showNotification(result.imported?.length ? 'Easynews stream added' : 'Stream already exists', 'success');
        await this.renderMovieDetailStreamLinks(item, displayItem);
        row.remove();
      } else {
        this.showNotification(`Import failed: ${result?.failed?.[0]?.error || result?.error || 'Unknown error'}`, 'error');
      }
    };
  }

  formatEasynewsStats(stats = {}) {
    const raw = stats.raw || 0;
    const parts = [
      `scanned ${raw}`,
      stats.nonMp4 ? `${stats.nonMp4} non-MP4` : null,
      stats.wrongResolution ? `${stats.wrongResolution} not 720p/1080p` : null,
      stats.tvLike ? `${stats.tvLike} TV-like` : null,
      stats.lowScore ? `${stats.lowScore} low title match` : null
    ].filter(Boolean);
    return parts.join(' • ');
  }

  renderEasynewsCandidateRow(candidate, index) {
    const meta = [
      candidate.resolution,
      candidate.extension?.toUpperCase(),
      candidate.video_codec,
      candidate.audio_codec,
      candidate.size_label || (candidate.size ? this.formatBytes(candidate.size) : null),
      candidate.duration,
      candidate.query ? `Matched: ${candidate.query}` : null,
      candidate.page ? `Page ${candidate.page}` : null,
      `Score ${candidate.score}`
    ].filter(Boolean).join(' • ');

    return `
      <div class="movie-easynews-candidate" data-stream-url="${this.escapeHtml(candidate.stream_url || '')}">
        <div class="movie-easynews-rank">${index + 1}</div>
        <div class="movie-easynews-copy">
          <strong>${this.escapeHtml(candidate.title || 'Easynews result')}</strong>
          <span>${this.escapeHtml(meta)}</span>
          <small title="${this.escapeHtml(candidate.stream_url_masked || '')}">${this.escapeHtml(candidate.stream_url_masked || '')}</small>
        </div>
        <div class="movie-easynews-actions">
          <button class="movie-easynews-action" data-easynews-test="${this.escapeHtml(candidate.id)}">${SVG_ICONS.play}</button>
          <button class="movie-easynews-action primary" data-easynews-import="${this.escapeHtml(candidate.id)}">${SVG_ICONS.add}</button>
        </div>
      </div>
    `;
  }

  async renderMovieDetailStreamLinks(item, displayItem) {
    const section = document.getElementById('movie-stream-links-section');
    const subtitle = document.getElementById('movie-stream-links-subtitle');
    const list = document.getElementById('movie-stream-links-list');
    if (!section || !subtitle || !list) return;

    if (item.media_type !== 'movie') {
      section.classList.add('hidden');
      list.innerHTML = '';
      return;
    }

    const year = this.getDetailYear(item, displayItem);
    const streams = await window.electron.getStreamsForMedia({
      mediaType: 'movie',
      tmdbId: displayItem?.tmdb_id || item.tmdb_id || null,
      imdbId: displayItem?.imdb_id || item.imdb_id || null,
      title: displayItem?.title || item.clean_name || item.title || '',
      year
    });

    if (!streams || streams.length === 0) {
      section.classList.add('hidden');
      list.innerHTML = '';
      return;
    }

    section.classList.remove('hidden');
    subtitle.textContent = `${streams.length} direct stream link${streams.length !== 1 ? 's' : ''} available`;
    list.innerHTML = streams.map((stream, index) => this.renderMovieDetailStreamRow(stream, index, streams.length)).join('');

    list.onclick = async (event) => {
      const playBtn = event.target.closest('[data-detail-stream-play]');
      const deleteBtn = event.target.closest('[data-detail-stream-delete]');

      if (playBtn) {
        await this.playStreamInApp(parseInt(playBtn.dataset.detailStreamPlay, 10), playBtn.dataset.title || 'Stream');
        return;
      }

      if (deleteBtn) {
        const label = deleteBtn.dataset.title || 'this stream URL';
        const confirmed = window.confirm(`Delete "${label}" from Streams?`);
        if (!confirmed) return;

        const result = await window.electron.deleteStream(parseInt(deleteBtn.dataset.detailStreamDelete, 10));
        if (!result?.success) {
          this.showNotification(`Delete failed: ${result?.error || 'Stream not found'}`, 'error');
          return;
        }

        this.showNotification('Stream URL deleted', 'success');
        await this.renderMovieDetailStreamLinks(item, displayItem);
      }
    };
  }

  renderMovieDetailStreamRow(stream, index, total) {
    const labelParts = [
      total > 1 ? `Link ${index + 1}` : 'Direct stream',
      stream.resolution,
      stream.source,
      stream.video_codec,
      stream.file_size ? this.formatBytes(stream.file_size) : null
    ].filter(Boolean);
    const label = labelParts.join(' • ');

    return `
      <div class="movie-detail-stream-row">
        <button class="movie-detail-stream-play" title="Play this link" data-detail-stream-play="${this.escapeHtml(stream.id)}" data-title="${this.escapeHtml(label)}">${SVG_ICONS.play}</button>
        <div class="movie-detail-stream-copy">
          <strong>${this.escapeHtml(label)}</strong>
          <span title="${this.escapeHtml(stream.stream_url_masked || '')}">${this.escapeHtml(stream.stream_url_masked || '')}</span>
        </div>
        <button class="movie-detail-stream-delete" title="Delete this link" data-detail-stream-delete="${this.escapeHtml(stream.id)}" data-title="${this.escapeHtml(label)}">${SVG_ICONS.delete}</button>
      </div>
    `;
  }

  async renderMovieCollectionSection(info, item) {
    const section = document.getElementById('movie-collection-section');
    const subtitle = document.getElementById('movie-collection-subtitle');
    const card = document.getElementById('movie-collection-card');
    const owned = document.getElementById('movie-collection-owned');
    const openBtn = document.getElementById('movie-open-collection-btn');

    if (!section || !subtitle || !card || !owned || !openBtn) return;

    let collectionId = info?.collection_id || null;
    let fallbackCollection = null;

    if (!collectionId && info?.raw_json) {
      try {
        fallbackCollection = JSON.parse(info.raw_json)?.belongs_to_collection || null;
        collectionId = fallbackCollection?.id || null;
      } catch (error) {}
    }

    if (item.media_type !== 'movie' || !collectionId) {
      section.classList.add('hidden');
      card.innerHTML = '';
      owned.innerHTML = '';
      openBtn.onclick = null;
      return;
    }

    let result = await window.electron.getCollectionByTMDB(collectionId);

    if (!result?.collection && fallbackCollection) {
      result = {
        collection: {
          tmdb_id: fallbackCollection.id,
          name: fallbackCollection.name,
          overview: '',
          poster_path: fallbackCollection.poster_path ? `https://image.tmdb.org/t/p/w500${fallbackCollection.poster_path}` : null,
          backdrop_path: fallbackCollection.backdrop_path ? `https://image.tmdb.org/t/p/w780${fallbackCollection.backdrop_path}` : null,
          owned_count: 0,
          total_count: 0,
          completion_label: '0/0'
        },
        ownedMovies: [],
        missingMovies: []
      };
    }

    if (!result?.collection) {
      section.classList.add('hidden');
      card.innerHTML = '';
      owned.innerHTML = '';
      openBtn.onclick = null;
      return;
    }

    const collection = result.collection;
    const ownedMovies = result.ownedMovies || [];
    const missingMovies = result.missingMovies || [];
    const totalCount = collection.total_count || (ownedMovies.length + missingMovies.length);
    const posterMarkup = this.buildCollectionPosterMarkup(collection.poster_path || null, collection.name, '', 'Collection');

    subtitle.textContent = `${ownedMovies.length} of ${totalCount} title${totalCount !== 1 ? 's' : ''} currently in your library`;
    card.innerHTML = `
      <div class="movie-collection-card-media">
        ${posterMarkup}
      </div>
      <div class="movie-collection-card-copy">
        <div class="movie-collection-card-title">${collection.name}</div>
        <div class="movie-collection-card-meta">
          <span class="collection-pill">${collection.completion_label || `${ownedMovies.length}/${totalCount}`}</span>
          ${missingMovies.length ? `<span class="collection-pill collection-pill-warning">${missingMovies.length} missing</span>` : '<span class="collection-pill collection-pill-success">Complete</span>'}
        </div>
      </div>
    `;

    owned.innerHTML = ownedMovies.slice(0, 8).map(movie => `
      <button class="movie-collection-owned-item" data-tmdb="${movie.tmdb_id || ''}" data-imdb="${movie.imdb_id || ''}">
        ${this.buildCollectionPosterMarkup(movie.cover_path || null, movie.title, '', 'Movie')}
      </button>
    `).join('');

    owned.querySelectorAll('.movie-collection-owned-item').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const movie = ownedMovies[index];
        this.showDetailsPage({
          tmdb_id: movie.tmdb_id,
          imdb_id: movie.imdb_id,
          media_type: 'movie',
          title: movie.title
        }, {
          overridePreviousPage: this.previousPage
        });
      });
    });

    openBtn.onclick = () => {
      this.showCollectionDetailPage(collection.tmdb_id, {
        returnTo: {
          type: 'movie-details',
          item: {
            tmdb_id: item.tmdb_id,
            imdb_id: item.imdb_id,
            media_type: item.media_type,
            title: item.title || info?.title || item.clean_name
          },
          previousPage: this.previousPage
        }
      });
    };

    section.classList.remove('hidden');
  }

  async showCollectionDetailPage(tmdbId, options = {}) {
    if (!tmdbId) return;

    try {
      const result = await window.electron.getCollectionByTMDB(tmdbId);
      if (!result?.collection) {
        this.showNotification('Collection details are not available yet', 'warning');
        return;
      }

      this.currentCollectionDetail = result.collection;
      this.collectionDetailReturnTarget = options.returnTo || { type: 'page', pageName: this.currentPage };

      const collection = result.collection;
      const ownedMovies = result.ownedMovies || [];
      const missingMovies = result.missingMovies || [];
      const totalCount = collection.total_count || (ownedMovies.length + missingMovies.length);

      document.getElementById('collection-title').textContent = collection.name || 'Collection';
      document.getElementById('collection-overview').textContent = collection.overview || 'A linked movie collection from TMDB.';
      const collectionPoster = document.getElementById('collection-poster');
      if (collectionPoster) {
        collectionPoster.src = this.resolveMediaAssetUrl(collection.poster_path || 'assets/images/placeholder-cover.svg');
      }

      const backdrop = document.getElementById('collection-backdrop');
      if (backdrop) {
        backdrop.style.backgroundImage = `url('${this.resolveMediaAssetUrl(collection.backdrop_path || 'assets/images/placeholder-backdrop.svg')}')`;
      }

      const logoShell = document.getElementById('collection-logo-shell');
      const logoEl = document.getElementById('collection-logo');
      if (logoShell && logoEl) {
        if (collection.logo_path) {
          logoEl.src = this.resolveMediaAssetUrl(collection.logo_path);
          logoEl.alt = `${collection.name || 'Collection'} logo`;
          logoShell.classList.remove('hidden');
        } else {
          logoShell.classList.add('hidden');
        }
      }

      const statusLine = document.getElementById('collection-status-line');
      if (statusLine) {
        statusLine.textContent = ownedMovies.length > 0
          ? `${ownedMovies.length} of ${totalCount} titles already in residence`
          : `${totalCount} titles ready to be curated into your library`;
      }

      const metaEl = document.getElementById('collection-meta');
      if (metaEl) {
        metaEl.innerHTML = `
          <span>${ownedMovies.length} owned</span>
          <span>${totalCount} total</span>
          <span>${collection.completion_label || `${ownedMovies.length}/${totalCount}`}</span>
          <span>${missingMovies.length} missing</span>
        `;
      }

      const ownedSubtitle = document.getElementById('collection-owned-subtitle');
      if (ownedSubtitle) {
        ownedSubtitle.textContent = `${ownedMovies.length} title${ownedMovies.length !== 1 ? 's' : ''} currently linked in your library`;
      }

      const ownedGrid = document.getElementById('collection-owned-grid');
      if (ownedGrid) {
        ownedGrid.innerHTML = ownedMovies.length
          ? ownedMovies.map(movie => `
              <button class="actor-poster-card collection-owned-card" data-tmdb="${movie.tmdb_id || ''}" data-imdb="${movie.imdb_id || ''}">
                <div class="collection-owned-backdrop" style="background-image:url('${this.resolveMediaAssetUrl(movie.backdrop_path || 'assets/images/placeholder-backdrop.svg')}')"></div>
                <div class="collection-owned-overlay"></div>
                <div class="collection-owned-poster-wrap">
                  ${this.buildCollectionPosterMarkup(movie.cover_path || null, movie.title, 'collection-owned-poster', 'Movie')}
                </div>
                <div class="collection-owned-copy">
                  <div class="collection-owned-kicker">In Residence</div>
                  <div class="collection-owned-title">${movie.title}</div>
                  <div class="collection-owned-footer">
                    <span class="actor-poster-icon">${SVG_ICONS.movie}</span>
                    <span class="actor-poster-text">Open Details</span>
                  </div>
                </div>
              </button>
            `).join('')
          : '<div class="actor-empty-state">No owned titles linked to this collection yet.</div>';

        ownedGrid.querySelectorAll('.collection-owned-card').forEach((btn, index) => {
          btn.addEventListener('click', () => {
            const movie = ownedMovies[index];
            this.showDetailsPage({
              tmdb_id: movie.tmdb_id,
              imdb_id: movie.imdb_id,
              media_type: 'movie',
              title: movie.title
            }, {
              overridePreviousPage: 'collections'
            });
          });
        });
      }

      const missingSection = document.getElementById('collection-missing-section');
      const missingSubtitle = document.getElementById('collection-missing-subtitle');
      const missingGrid = document.getElementById('collection-missing-grid');
      if (missingSection && missingSubtitle && missingGrid) {
        if (missingMovies.length === 0) {
          missingSection.classList.add('hidden');
        } else {
          missingSection.classList.remove('hidden');
          missingSubtitle.textContent = `${missingMovies.length} title${missingMovies.length !== 1 ? 's' : ''} still missing from the collection ledger`;
          missingGrid.innerHTML = missingMovies.map(movie => `
            <div class="collection-missing-card">
              <div class="collection-missing-poster-shell">
                ${movie.poster_path
                  ? `<img class="collection-missing-poster" src="https://image.tmdb.org/t/p/w342${movie.poster_path}" alt="${movie.title}">`
                  : '<div class="collection-missing-poster placeholder"></div>'
                }
              </div>
              <div class="collection-missing-kicker">Awaiting Arrival</div>
              <div class="collection-missing-title">${movie.title}</div>
              <div class="collection-missing-year">${movie.year || 'Unknown year'}</div>
            </div>
          `).join('');
        }
      }

      const page = document.getElementById('page-collection-details');
      if (page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        page.classList.remove('hidden');
        page.classList.add('active');
        this.currentPage = 'collection-details';
      }
    } catch (error) {
      console.error('Failed to load collection details:', error);
      this.showNotification('Failed to load collection details', 'error');
    }
  }

  hideCollectionDetailPage() {
    const page = document.getElementById('page-collection-details');
    if (page) {
      page.classList.add('hidden');
      page.classList.remove('active');
    }

    const target = this.collectionDetailReturnTarget || { type: 'page', pageName: 'collections' };
    this.collectionDetailReturnTarget = null;

    if (target.type === 'movie-details' && target.item) {
      this.showDetailsPage(target.item, {
        overridePreviousPage: target.previousPage || 'collections'
      });
      return;
    }

    this.switchPage(target.pageName || 'collections');
  }

  renderReleasesTable(releases) {
    const table = document.getElementById('releases-table');
    if (!table) return;

    if (!releases || releases.length === 0) {
      table.innerHTML = '<div class="empty-state"><p>No releases found</p></div>';
      this.hideSeasonTabs();
      return;
    }

    // Check if any release has season/episode data (TV)
    const isTV = releases.some(r => r.season !== null && r.season !== undefined);

    if (isTV) {
      this.renderTVSeasonTabs(releases);
    } else {
      this.hideSeasonTabs();
      this.renderMovieGrid(releases);
    }
  }

  renderTVSeasonTabs(releases) {
    try {
      // Group releases by season number
      const seasonGroups = {};
      releases.forEach(r => {
        const season = r.season !== null && r.season !== undefined ? r.season : 0;
        if (!seasonGroups[season]) seasonGroups[season] = [];
        seasonGroups[season].push(r);
      });

      // Sort season keys: 1,2,3... then 99 (Complete Series), then 0 (Specials)
      const seasonKeys = Object.keys(seasonGroups).map(Number).sort((a, b) => {
        if (a === 0) return 1;
        if (b === 0) return -1;
        if (a === 99) return 1;
        if (b === 99) return -1;
        return a - b;
      });

      // Build tabs
      const tableEl = document.getElementById('releases-table');
      if (!tableEl) { console.error('[TV] releases-table element not found'); return; }

      const tabsContainer = document.getElementById('season-tabs-container');
      if (!tabsContainer) {
        const container = document.createElement('div');
        container.id = 'season-tabs-container';
        container.className = 'season-tabs-container';
        if (tableEl.parentElement) {
          tableEl.parentElement.insertBefore(container, tableEl);
        } else {
          console.error('[TV] tableEl has no parentElement');
        }
      }

      const tabsEl = document.getElementById('season-tabs-container');
      if (!tabsEl) { console.error('[TV] season-tabs-container still null'); return; }

      let tabsHtml = '<div class="season-tabs">';
      seasonKeys.forEach(season => {
        const count = seasonGroups[season].length;
        const label = this.getSeasonLabel(season);
        const cls = season === this.currentSeasonTab ? 'tab-btn active' : 'tab-btn';
        tabsHtml += `<button class="${cls}" data-season="${season}" title="${count} release${count > 1 ? 's' : ''}">${label}</button>`;
      });
      tabsHtml += '</div>';
      tabsEl.innerHTML = tabsHtml;

      // Store grouped data
      this.seasonGroups = seasonGroups;

      // Bind tab clicks
      tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const season = parseInt(btn.dataset.season);
          this.currentSeasonTab = season;
          tabsEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderTVSeasonTable(this.seasonGroups[season] || []);
          this.bindTVTableActions();
        });
      });

      // Set initial active tab: prefer Season 1, then first numbered season
      let defaultTab = null;
      if (seasonKeys.includes(1)) {
        defaultTab = 1;
      } else {
        // First non-zero, non-99 season
        defaultTab = seasonKeys.find(k => k > 0 && k < 99) ?? seasonKeys[0];
      }
      this.currentSeasonTab = defaultTab;

      const activeBtn = tabsEl.querySelector(`.tab-btn[data-season="${this.currentSeasonTab}"]`);
      if (activeBtn) {
        activeBtn.classList.add('active');
      }

      // Render initial season table
      this.renderTVSeasonTable(this.seasonGroups[this.currentSeasonTab] || []);
      this.bindTVTableActions();
    } catch (e) {
      console.error('[TV] Error rendering TV season tabs:', e);
      console.error('[TV] Stack:', e.stack);
      this.hideSeasonTabs();
      this.renderMovieGrid(releases);
    }
  }

  renderTVSeasonTable(seasonReleases) {
    try {
      const tableEl = document.getElementById('releases-table');
      if (!tableEl) { console.error('[TV-TABLE] releases-table not found'); return; }

      if (!seasonReleases || seasonReleases.length === 0) {
        tableEl.innerHTML = '<div class="empty-state"><p>No releases found for this season.</p></div>';
        return;
      }

    const downloaderLabel = this.getPreferredDownloaderLabel();

    // Separate complete season packs (episode=0 for non-0/non-99 seasons) from individual episodes
    const isSpecials = this.currentSeasonTab === 0;
    const isCompleteSeries = this.currentSeasonTab === 99;
    const isNumberedSeason = !isSpecials && !isCompleteSeries;

    let completePacks = [];
    let episodeGroups = {};

    seasonReleases.forEach(r => {
      const ep = r.episode || 0;
      if (isNumberedSeason && ep === 0) {
        // Complete season pack
        completePacks.push(r);
      } else {
        // Individual episode (or specials/complete series)
        if (!episodeGroups[ep]) episodeGroups[ep] = [];
        episodeGroups[ep].push(r);
      }
    });

    // Sort episode groups by episode number
    const sortedEpKeys = Object.keys(episodeGroups).map(Number).sort((a, b) => a - b);

    // Sort releases within each group: higher resolution first
    completePacks.sort((a, b) => this.sortReleasesByQuality(a, b));
    sortedEpKeys.forEach(ep => {
      episodeGroups[ep].sort((a, b) => this.sortReleasesByQuality(a, b));
    });

    let html = `
      <div class="tv-batch-bar">
        <label class="tv-batch-select-all">
          <input type="checkbox" id="tv-select-all"> Select All
        </label>
        <button class="btn-small btn-download-selected" id="tv-download-selected" disabled>⬇️ Download Selected</button>
        <button class="btn-small btn-download-selected" id="tv-send-selected" disabled>↗ Send to ${downloaderLabel}</button>
        <button class="btn-small btn-download-selected" id="tv-queue-refresh-selected" disabled>↻ Queue Refresh</button>
        <button class="btn-small btn-download-selected" id="tv-batch-edit-selected" disabled>✎ Batch Edit</button>
        <button class="btn-small btn-download-selected" id="tv-delete-selected" disabled>🗑 Delete Selected</button>
        <span class="tv-batch-count" id="tv-batch-count">0 selected</span>
      </div>
    `;

    // Complete Season Pack section (only for numbered seasons)
    if (completePacks.length > 0) {
      html += `
        <div class="tv-season-pack-section">
          <div class="tv-section-header tv-season-pack-header">
            <div class="tv-season-pack-title">
              <span class="tv-season-pack-icon">${SVG_ICONS.tv}</span>
              <div class="tv-season-pack-copy">
                <span class="tv-season-pack-heading">Complete Season Releases</span>
                <span class="tv-season-pack-subtitle">Each release below contains the full season in one package.</span>
              </div>
            </div>
            <span class="tv-pack-count">${completePacks.length} release(s)</span>
          </div>
          <table class="tv-releases-table">
            <thead>
              ${this.getReleaseTableHeaderHtml()}
            </thead>
            <tbody>
      `;

      completePacks.forEach(r => {
        const catName = r.category_name || this.getCategoryName(r.category_id) || 'N/A';
        html += this.buildTVRow(r, true);
      });

      html += '</tbody></table></div>';
    }

    // Episode rows section
    if (sortedEpKeys.length > 0) {
      const sectionHeader = isSpecials
        ? {
            heading: 'Special Releases',
            subtitle: 'The releases below contain specials, bonus episodes, or extras for this show.',
            accentClass: 'tv-episodes-header-specials',
            icon: SVG_ICONS.tv
          }
        : isCompleteSeries
          ? {
              heading: 'Complete Series Releases',
              subtitle: 'Each release below contains the full series in one package.',
              accentClass: 'tv-episodes-header-complete',
              icon: SVG_ICONS.tv
            }
          : {
              heading: 'Episode Releases',
              subtitle: 'The releases below are grouped by individual episode.',
              accentClass: '',
              icon: SVG_ICONS.tv
            };
      html += `<div class="tv-episodes-section">
        <div class="tv-section-header tv-episodes-header ${sectionHeader.accentClass || ''}">
          <div class="tv-season-pack-title">
            <span class="tv-season-pack-icon">${sectionHeader.icon}</span>
            <div class="tv-season-pack-copy">
              <span class="tv-season-pack-heading">${sectionHeader.heading}</span>
              <span class="tv-season-pack-subtitle">${sectionHeader.subtitle}</span>
            </div>
          </div>
          <span class="tv-ep-count">${sortedEpKeys.length} episode(s)</span>
        </div>
      `;

      const shouldOpenFirstEpisodeGroup = completePacks.length === 0;

      sortedEpKeys.forEach((ep, index) => {
        const epReleases = episodeGroups[ep];
        const epLabel = ep === 0 ? 'Special' : `Episode ${String(ep).padStart(2, '0')}`;
        const isOpenByDefault = shouldOpenFirstEpisodeGroup && index === 0;

        // Collapsible episode header
        const collapseId = `ep-collapse-${this.currentSeasonTab}-${ep}`;
        html += `
          <div class="tv-episode-group">
            <div class="tv-episode-header" data-bs-target="#${collapseId}">
              <div class="tv-ep-label">${epLabel}</div>
              <div class="tv-ep-count">${epReleases.length} file(s)</div>
              <div class="tv-ep-toggle">${isOpenByDefault ? '▼' : '▶'}</div>
            </div>
            <div class="tv-episode-releases${isOpenByDefault ? '' : ' collapsed'}" id="${collapseId}">
              <table class="tv-releases-table tv-ep-table">
                <thead>
                  ${this.getReleaseTableHeaderHtml()}
                </thead>
                <tbody>
        `;

        epReleases.forEach(r => {
          const catName = r.category_name || this.getCategoryName(r.category_id) || 'N/A';
          html += this.buildTVRow(r, false);
        });

        html += '</tbody></table></div></div>';
      });

      html += '</div>';
    }

    tableEl.innerHTML = html;

    // Bind episode group toggle
    tableEl.querySelectorAll('.tv-episode-header').forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.getAttribute('data-bs-target');
        const target = tableEl.querySelector(targetId);
        if (!target) return;
        const isCollapsed = target.classList.contains('collapsed');
        if (isCollapsed) {
          target.classList.remove('collapsed');
          header.querySelector('.tv-ep-toggle').textContent = '▼';
        } else {
          target.classList.add('collapsed');
          header.querySelector('.tv-ep-toggle').textContent = '▶';
        }
      });
    });
    } catch (e) {
      console.error('[TV-TABLE] Error:', e.message);
      console.error('[TV-TABLE] Stack:', e.stack);
      const tableEl = document.getElementById('releases-table');
      if (tableEl) {
        tableEl.innerHTML = `<div class="empty-state"><p>Error rendering releases: ${e.message}</p></div>`;
      }
    }
  }

  buildTVRow(r, isPack) {
    const catName = r.category_name || this.getCategoryName(r.category_id) || 'N/A';
    const postedStr = this.formatRelativeTime(r.post_date || r.add_date);
    const sizeStr = this.formatSize(r.size);
    const postedDate = this.parseStoredTimestamp(r.post_date || r.add_date);
    const pendingClass = this.isReleaseDeletePending(r) ? ' release-delete-pending' : '';
    const pendingBadge = this.getReleasePendingBadgeHtml(r);
    const hasLinkedMedia = !!((r.media_type === 'movie' || r.media_type === 'tv') && (r.tmdb_id || r.imdb_id));
    return `
      <tr class="tv-release-row${pendingClass}"
        data-id="${r.id}"
        data-sort-name="${this.escapeHtml(r.search_name || r.clean_name || '')}"
        data-sort-quality="${this.getReleaseQualityRank(r.resolution)}"
        data-sort-video="${this.escapeHtml(r.video_codec || '')}"
        data-sort-audio="${this.escapeHtml(r.audio_codec || '')}"
        data-sort-source="${this.escapeHtml(r.source || '')}"
        data-sort-category="${this.escapeHtml(catName)}"
        data-sort-group="${this.escapeHtml(r.release_group || '')}"
        data-sort-posted="${postedDate ? postedDate.getTime() : 0}"
        data-sort-size="${Number(r.size) || 0}">
        <td class="tv-col-select"><input type="checkbox" class="tv-release-check" data-id="${r.id}"></td>
        <td class="tv-col-name" title="${r.search_name}">
          <div class="tv-release-name-wrap">
            <span class="tv-release-name-text">${r.search_name}</span>
            ${pendingBadge}
          </div>
        </td>
        <td class="tv-col-quality"><span class="badge">${r.resolution || 'N/A'}</span></td>
        <td class="tv-col-video">${r.video_codec || '—'}</td>
        <td class="tv-col-audio">${r.audio_codec || '—'}</td>
        <td class="tv-col-source">${r.source || '—'}</td>
        <td class="tv-col-category"><span class="badge category-badge">${catName}</span></td>
        <td class="tv-col-group">${r.release_group || '—'}</td>
        <td class="tv-col-posted">${postedStr}</td>
        <td class="tv-col-size">${sizeStr}</td>
        <td class="tv-col-actions">
          <button class="action-icon-btn" data-action="open-linked" data-id="${r.id}" data-media-type="${r.media_type || ''}" data-tmdb="${r.tmdb_id || ''}" data-imdb="${r.imdb_id || ''}" data-title="${r.search_name || r.clean_name || ''}" title="${hasLinkedMedia ? 'Open linked movie/TV detail' : 'No linked movie/TV detail'}" ${hasLinkedMedia ? '' : 'disabled'}>${SVG_ICONS.link}</button>
          <button class="action-icon-btn" data-action="download" data-id="${r.id}" title="Download NZB">${SVG_ICONS.download}</button>
          <button class="action-icon-btn" data-action="send" data-id="${r.id}" title="Send to preferred downloader">${SVG_ICONS.send}</button>
          <button class="action-icon-btn" data-action="delete" data-id="${r.id}" title="Delete">${SVG_ICONS.delete}</button>
        </td>
      </tr>
    `;
  }

  parseStoredTimestamp(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    const normalized = String(value).trim();
    const sqliteUtcMatch = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/
    );

    if (sqliteUtcMatch) {
      const [, year, month, day, hour, minute, second, fractional = '0'] = sqliteUtcMatch;
      const milliseconds = Number(fractional.padEnd(3, '0').slice(0, 3));
      return new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        milliseconds
      ));
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  formatRelativeTime(dateStr) {
    if (!dateStr) return '—';
    const now = new Date();
    const date = this.parseStoredTimestamp(dateStr);
    if (!date) return '—';
    const diffMs = now - date;
    if (isNaN(diffMs) || diffMs < 0) return '—';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 0) return 'Today';
    if (diffDay === 1) return '1 day ago';
    if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth === 1) return '1 month ago';
    if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    const diffYear = Math.floor(diffMonth / 12);
    if (diffYear === 1) return '1 year ago';
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return '—';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }

  async renderActorsSection(info, item) {
    const actorsSection = document.getElementById('actors-section');
    const actorsRow = document.getElementById('actors-row');
    if (!actorsSection || !actorsRow) return;

    // Try to get actors from the info record's actors field (now stored as JSON)
    let actors = [];
    if (info && info.actors) {
      try {
        actors = JSON.parse(info.actors);
      } catch (e) {
        // Old comma-separated format — fall back to names only
        actors = info.actors.split(',').filter(n => n.trim()).map(n => ({
          name: n.trim(),
          id: null,
          profile_path: null
        }));
      }
    }

    if (actors.length === 0) {
      actorsSection.style.display = 'none';
      return;
    }

    actorsSection.style.display = 'block';
    actorsRow.innerHTML = '';

    // Show up to 12 actors
    for (const actor of actors.slice(0, 12)) {
      const actorName = actor.name || actor.character || 'Unknown';
      let imgSrc = null;

      // Check if we have a cached profile image
      if (actor.id) {
        const cached = await window.electron.getActorDetail(actor.id);
        if (cached && cached.profile_path && cached.has_profile_image) {
          imgSrc = cached.profile_path;
        }
      }

      const btn = document.createElement('button');
      btn.className = 'actor-avatar-btn';
      btn.innerHTML = `
        ${imgSrc
          ? `<img src="${imgSrc}" class="actor-circle" onerror="this.outerHTML='<div class=&quot;actor-circle actor-circle-placeholder&quot;><span>${(actorName || '?').trim().charAt(0).toUpperCase() || '?'}</span></div>';" alt="${actorName}">`
          : `<div class="actor-circle actor-circle-placeholder"><span>${(actorName || '?').trim().charAt(0).toUpperCase() || '?'}</span></div>`
        }
        <span class="actor-name">${actorName}</span>
      `;
      
      const actorId = actor.id || null;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openActorDetail(actorId || actorName, actor);
      });
      actorsRow.appendChild(btn);
    }
  }

  async openActorDetail(identifier, actorSummary = null) {
    // identifier can be TMDB ID (number) or name (string)
    let tmdbId = typeof identifier === 'number' ? identifier : null;
    let fallbackActorName = actorSummary?.name || (typeof identifier === 'string' ? identifier : 'Actor');

    // If we have a name but no TMDB ID, try to find in cache
    if (!tmdbId && typeof identifier === 'string') {
      const allActors = await window.electron.getAllActors();
      const found = allActors.find(a => a.name.toLowerCase() === identifier.toLowerCase());
      if (found) {
        tmdbId = found.tmdb_person_id;
        fallbackActorName = found.name || fallbackActorName;
      }
    }

    if (!tmdbId) return;

    let returnTo = { type: 'page', pageName: this.currentPage || 'categories' };
    if (this.currentPage === 'movie-details' && this.currentDetailItem) {
      returnTo = {
        type: 'movie-details',
        item: this.currentDetailItem,
        previousPage: this.previousPage || 'categories'
      };
    }

    const requestId = (this._actorDetailRequestId || 0) + 1;
    this._actorDetailRequestId = requestId;

    const cachedActor = await window.electron.getActorDetail(tmdbId);
    const initialActor = cachedActor || {
      tmdb_person_id: tmdbId,
      name: fallbackActorName,
      known_for_department: actorSummary?.known_for_department || 'Performer',
      profile_path: actorSummary?.profile_path || null,
      has_profile_image: actorSummary?.has_profile_image || 0
    };

    this.showActorDetailPage(initialActor, [], returnTo, { releasesLoading: true });

    try {
      const { actor, releases } = await window.electron.getActorReleases(tmdbId);
      if (this._actorDetailRequestId !== requestId) return;
      if (this.currentPage !== 'actor-details') return;
      if (!actor) {
        this.showActorDetailPage(initialActor, [], returnTo, { releasesLoading: false });
        return;
      }

      this.showActorDetailPage(actor, releases, returnTo, { releasesLoading: false });
    } catch (error) {
      if (this._actorDetailRequestId !== requestId) return;
      if (this.currentPage !== 'actor-details') return;
      this.showActorDetailPage(initialActor, [], returnTo, { releasesLoading: false });
      this.showNotification(`Failed to load actor library titles: ${error.message}`, 'error');
    }
  }

  async openLinkedReleaseMedia(linked) {
    if (!linked) return;

    const mediaType = linked.mediaType === 'tv' ? 'tv' : linked.mediaType === 'movie' ? 'movie' : '';
    const tmdbId = linked.tmdbId ? parseInt(linked.tmdbId, 10) : null;
    const imdbId = linked.imdbId || null;

    if (!mediaType || (!tmdbId && !imdbId)) {
      this.showNotification('This release does not have a linked movie or TV show yet', 'warning');
      return;
    }

    try {
      await this.showDetailsPage({
        tmdb_id: tmdbId,
        imdb_id: imdbId,
        media_type: mediaType,
        title: linked.title || ''
      }, {
        overridePreviousPage: this.currentPage
      });
    } catch (error) {
      console.error('Failed to open linked media details:', error);
      this.showNotification(`Failed to open linked media: ${error.message}`, 'error');
    }
  }

  showActorDetailPage(actor, releases, returnTo = null, options = {}) {
    releases = Array.isArray(releases) ? releases : [];
    const releasesLoading = Boolean(options.releasesLoading);

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
      p.classList.add('hidden');
    });

    this.currentActorDetail = actor;
    this._actorReleases = releases;
    this.actorDetailReturnTarget = returnTo || this.actorDetailReturnTarget || { type: 'page', pageName: 'categories' };

    // Hero section
    const actorImg = document.getElementById('actor-profile-image');
    if (actorImg) {
      if (actor.profile_path && actor.has_profile_image) {
        actorImg.src = actor.profile_path;
      } else {
        actorImg.src = 'assets/images/placeholder-cover.svg';
      }
    }

    const actorName = document.getElementById('actor-detail-name');
    if (actorName) actorName.textContent = actor.name;

    const actorRole = document.getElementById('actor-detail-role');
    if (actorRole) {
      actorRole.textContent = actor.known_for_department || 'Performer';
    }

    const actorBio = document.getElementById('actor-biography');
    if (actorBio) {
      if (actor.biography) {
        const fullBio = actor.biography;
        const previewBio = fullBio.substring(0, 600).trim();
        if (fullBio.length > 600) {
          actorBio.innerHTML = `${previewBio}... <span class="actor-bio-toggle">Read more</span>`;
          actorBio.style.cursor = 'pointer';
          actorBio.classList.add('is-collapsed');
          actorBio.onclick = () => {
            if (actorBio.classList.contains('is-collapsed')) {
              actorBio.innerHTML = `${fullBio} <span class="actor-bio-toggle">Show less</span>`;
              actorBio.style.maxHeight = 'none';
              actorBio.classList.remove('is-collapsed');
            } else {
              actorBio.innerHTML = `${previewBio}... <span class="actor-bio-toggle">Read more</span>`;
              actorBio.style.maxHeight = '200px';
              actorBio.classList.add('is-collapsed');
            }
          };
        } else {
          actorBio.textContent = fullBio;
          actorBio.onclick = null;
          actorBio.classList.remove('is-collapsed');
        }
      } else {
        actorBio.textContent = releasesLoading ? 'Loading actor details...' : 'No biography available.';
        actorBio.classList.remove('is-collapsed');
      }
    }

    // Meta facts
    const factsEl = document.getElementById('actor-meta-facts');
    if (factsEl) {
      const facts = [];
      if (actor.birthday) {
        facts.push(`<span>🎂 Born: ${actor.birthday}</span>`);
      }
      if (actor.place_of_birth) {
        facts.push(`<span>📍 ${actor.place_of_birth}</span>`);
      }
      if (actor.deathday) {
        facts.push(`<span>✝️ Died: ${actor.deathday}</span>`);
      }
      if (actor.gender) {
        const genderLabels = { 0: 'Not specified', 1: 'Female', 2: 'Male', 3: 'Non-binary' };
        facts.push(`<span>${genderLabels[actor.gender] || 'Unknown'}</span>`);
      }
      facts.push(releasesLoading
        ? '<span>Loading library titles...</span>'
        : `<span>🎬 ${releases.length} title${releases.length !== 1 ? 's' : ''}</span>`);
      factsEl.innerHTML = facts.join('');
    }

    const releasesSubtitle = document.getElementById('actor-releases-subtitle');
    if (releasesSubtitle) {
      releasesSubtitle.textContent = releasesLoading
        ? 'Looking through your NZBarr library...'
        : releases.length === 0
        ? 'No linked movies or shows found in your library yet.'
        : `${releases.length} title${releases.length !== 1 ? 's' : ''} available in your library`;
    }

    // Render poster grid
    const gridEl = document.getElementById('actor-releases-grid');
    if (gridEl) {
      if (releasesLoading) {
        gridEl.innerHTML = '<div class="actor-loading-state"><p>Loading movie and TV covers...</p></div>';
      } else if (releases.length === 0) {
        gridEl.innerHTML = '<div class="actor-empty-state"><p>No movies or TV shows found for this actor.</p></div>';
      } else {
        gridEl.innerHTML = releases.map(r => {
          const coverPath = this.resolveMediaAssetUrl(r.cover_image || 'assets/images/placeholder-cover.svg');
          const title = r.title || 'Unknown';
          const year = r.year || '';
          const mediaIcon = r.media_type === 'tv' ? SVG_ICONS.tv : SVG_ICONS.movie;
          return `
            <button class="actor-poster-card" data-tmdb="${r.tmdb_id || ''}" data-imdb="${r.imdb_id || ''}" data-type="${r.media_type}" data-title="${title}" type="button">
              <img src="${coverPath}" class="actor-poster-img" onerror="this.src='assets/images/placeholder-cover.svg';" alt="${title}">
              <div class="actor-poster-title">
                <span class="actor-poster-icon">${mediaIcon}</span>
                <span class="actor-poster-text">${title}${year ? ` (${year})` : ''}</span>
              </div>
            </button>
          `;
        }).join('');
      }

      gridEl.querySelectorAll('.actor-poster-card').forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const tmdbId = card.dataset.tmdb || null;
          const imdbId = card.dataset.imdb || null;
          const mediaType = card.dataset.type;
          const title = card.dataset.title || card.querySelector('.actor-poster-text')?.textContent.trim() || '';
          this.navigateFromActorToMovie(tmdbId, imdbId, mediaType, title);
        });
      });
    }

    // Back button
    const backBtn = document.getElementById('back-from-actor');
    if (backBtn) {
      const nextBackBtn = backBtn.cloneNode(true);
      backBtn.parentNode.replaceChild(nextBackBtn, backBtn);
      nextBackBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._actorDetailRequestId = (this._actorDetailRequestId || 0) + 1;
        if (this.actorDetailReturnTarget?.type === 'movie-details' && this.actorDetailReturnTarget.item) {
          await this.showDetailsPage(this.actorDetailReturnTarget.item, {
            overridePreviousPage: this.actorDetailReturnTarget.previousPage || 'categories',
            fromActorPage: null
          });
          return;
        }

        this._fromActorPage = null;
        this.switchPage(this.actorDetailReturnTarget?.pageName || this.previousPage || 'categories');
      });
    }

    // Show the page
    const page = document.getElementById('page-actor-details');
    if (page) {
      page.classList.remove('hidden');
      page.classList.add('active');
      this.currentPage = 'actor-details';
    }
  }

  sortReleasesByQuality(a, b) {
    const ra = this.getReleaseQualityRank(a.resolution);
    const rb = this.getReleaseQualityRank(b.resolution);
    return rb - ra;
  }

  getReleaseQualityRank(resolution) {
    const value = String(resolution || '').toUpperCase();
    if (value.includes('2160') || value.includes('4K')) return 4;
    if (value.includes('1080')) return 3;
    if (value.includes('720')) return 2;
    if (value.includes('480')) return 1;
    return 0;
  }

  getReleaseTableHeaderHtml() {
    const sortableHeader = (className, key, label) => `
      <th class="${className} release-sortable-th" data-sort-key="${key}">
        <button type="button" class="release-sort-btn">
          <span>${label}</span>
          <span class="release-sort-indicator" aria-hidden="true">↕</span>
        </button>
      </th>
    `;

    return `
      <tr>
        <th class="tv-col-select"></th>
        ${sortableHeader('tv-col-name', 'name', 'Release Name')}
        ${sortableHeader('tv-col-quality', 'quality', 'Quality')}
        ${sortableHeader('tv-col-video', 'video', 'Video')}
        ${sortableHeader('tv-col-audio', 'audio', 'Audio')}
        ${sortableHeader('tv-col-source', 'source', 'Source')}
        ${sortableHeader('tv-col-category', 'category', 'Category')}
        ${sortableHeader('tv-col-group', 'group', 'Group')}
        ${sortableHeader('tv-col-posted', 'posted', 'Posted')}
        ${sortableHeader('tv-col-size', 'size', 'Size')}
        <th class="tv-col-actions"></th>
      </tr>
    `;
  }

  getBrowseReleaseTableHeaderHtml() {
    return this.getReleaseTableHeaderHtml().replace(
      '<th class="tv-col-select"></th>',
      '<th class="tv-col-select"><input type="checkbox" id="browse-master-select-all"></th>'
    );
  }

  compareReleaseRows(a, b, key, direction) {
    const numericKeys = new Set(['quality', 'posted', 'size']);
    const directionMultiplier = direction === 'asc' ? 1 : -1;
    const dataKey = `sort${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    const aValue = a.dataset[dataKey] || '';
    const bValue = b.dataset[dataKey] || '';

    if (numericKeys.has(key)) {
      const aNum = Number(aValue) || 0;
      const bNum = Number(bValue) || 0;
      return (aNum - bNum) * directionMultiplier;
    }

    return aValue.localeCompare(bValue, undefined, { sensitivity: 'base', numeric: true }) * directionMultiplier;
  }

  bindDetailReleaseTableSorting(containerEl) {
    if (!containerEl) return;

    containerEl.querySelectorAll('.release-sortable-th').forEach(th => {
      th.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const key = th.dataset.sortKey;
        const table = th.closest('table');
        const tbody = table?.querySelector('tbody');
        if (!key || !tbody) return;

        const nextDirection = th.dataset.sortDirection === 'asc' ? 'desc' : 'asc';
        table.querySelectorAll('.release-sortable-th').forEach(other => {
          other.classList.remove('sorted-asc', 'sorted-desc');
          other.dataset.sortDirection = '';
          const indicator = other.querySelector('.release-sort-indicator');
          if (indicator) indicator.textContent = '↕';
        });

        th.dataset.sortDirection = nextDirection;
        th.classList.add(nextDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        const indicator = th.querySelector('.release-sort-indicator');
        if (indicator) indicator.textContent = nextDirection === 'asc' ? '↑' : '↓';

        const rows = Array.from(tbody.querySelectorAll('.tv-release-row'));
        rows.sort((a, b) => this.compareReleaseRows(a, b, key, nextDirection));
        rows.forEach(row => tbody.appendChild(row));
      });
    });
  }

  bindReleaseSelectCellToggles(containerEl) {
    if (!containerEl) return;

    containerEl.querySelectorAll('td.tv-col-select').forEach(cell => {
      cell.addEventListener('click', (event) => {
        event.stopPropagation();
        if (event.target.closest('input[type="checkbox"]')) return;

        const checkbox = cell.querySelector('.tv-release-check');
        if (!checkbox || checkbox.disabled) return;

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  bindTVTableActions() {
    const tableEl = document.getElementById('releases-table');
    if (!tableEl) return;
    const canUseBulkActions = this.canUseFeature('bulk_actions');
    this.bindDetailReleaseTableSorting(tableEl);
    this.bindReleaseSelectCellToggles(tableEl);

    const updateBatchBar = () => {
      const checked = tableEl.querySelectorAll('.tv-release-check:checked');
      const countEl = document.getElementById('tv-batch-count');
      const downloadBtn = document.getElementById('tv-download-selected');
      const sendBtn = document.getElementById('tv-send-selected');
      const queueRefreshBtn = document.getElementById('tv-queue-refresh-selected');
      const batchEditBtn = document.getElementById('tv-batch-edit-selected');
      const deleteBtn = document.getElementById('tv-delete-selected');
      const selectAll = document.getElementById('tv-select-all');
      const canSend = this.canUseFeature('send_to_downloader');
      const canRefresh = this.canUseFeature('owned_refresh');

      if (countEl) countEl.textContent = `${checked.length} selected`;
      if (downloadBtn) {
        downloadBtn.disabled = checked.length === 0 || !canUseBulkActions;
        downloadBtn.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      }
      if (deleteBtn) {
        deleteBtn.disabled = checked.length === 0 || !canUseBulkActions;
        deleteBtn.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      }
      if (sendBtn) {
        if (!canUseBulkActions) {
          sendBtn.disabled = true;
          sendBtn.title = this.getFeatureUnavailableMessage('bulk_actions');
        } else {
          sendBtn.disabled = checked.length === 0 || !canSend;
          sendBtn.title = canSend ? '' : this.getFeatureUnavailableMessage('send_to_downloader');
        }
      }
      if (queueRefreshBtn) {
        if (!canUseBulkActions) {
          queueRefreshBtn.disabled = true;
          queueRefreshBtn.title = this.getFeatureUnavailableMessage('bulk_actions');
        } else {
          queueRefreshBtn.disabled = checked.length === 0 || !canRefresh;
          queueRefreshBtn.title = canRefresh ? '' : this.getFeatureUnavailableMessage('owned_refresh');
        }
      }
      if (batchEditBtn) {
        batchEditBtn.disabled = checked.length === 0 || !canUseBulkActions;
        batchEditBtn.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      }

      const allChecks = tableEl.querySelectorAll('.tv-release-check');
      if (selectAll && allChecks.length > 0) {
        selectAll.checked = checked.length === allChecks.length;
      }
    };

    const selectAll = document.getElementById('tv-select-all');
    if (selectAll) {
      selectAll.disabled = !canUseBulkActions;
      selectAll.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      selectAll.addEventListener('change', () => {
        if (!canUseBulkActions) {
          selectAll.checked = false;
          return;
        }
        tableEl.querySelectorAll('.tv-release-check').forEach(c => { c.checked = selectAll.checked; });
        updateBatchBar();
      });
    }

    tableEl.querySelectorAll('.tv-release-check').forEach(c => {
      c.disabled = !canUseBulkActions;
      c.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      c.addEventListener('change', updateBatchBar);
    });

    const downloadSelectedBtn = document.getElementById('tv-download-selected');
    if (downloadSelectedBtn) {
      downloadSelectedBtn.addEventListener('click', async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const selected = tableEl.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));

        try {
          const result = await window.electron.downloadNZBBatch(ids);
          if (result.success) {
            this.showNotification(`Downloaded ${result.count} NZB file(s) to: ${result.path}`, 'success');
          } else if (!result.canceled) {
            this.showNotification(`Batch download failed: ${result.error}`, 'error');
          }
        } catch (err) {
          this.showNotification(`Batch download failed: ${err.message}`, 'error');
        }
        updateBatchBar();
      });
    }

    const sendSelectedBtn = document.getElementById('tv-send-selected');
    if (sendSelectedBtn) {
      sendSelectedBtn.addEventListener('click', async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const selected = tableEl.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));
        await this.sendMultipleReleasesToDownloader(ids, 'preferred');
        updateBatchBar();
      });
    }

    const queueRefreshSelectedBtn = document.getElementById('tv-queue-refresh-selected');
    if (queueRefreshSelectedBtn) {
      queueRefreshSelectedBtn.addEventListener('click', async () => {
        if (!this.requireFeature('bulk_actions')) return;
        if (!this.requireFeature('owned_refresh')) return;
        const selected = tableEl.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));
        await this.queueMultipleReleasesForRefresh(ids);
        updateBatchBar();
      });
    }

    const batchEditSelectedBtn = document.getElementById('tv-batch-edit-selected');
    if (batchEditSelectedBtn) {
      batchEditSelectedBtn.addEventListener('click', async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const releases = await this.getSelectedReleasesFromTable(tableEl);
        if (releases.length === 0) return;
        this.openBatchEditSelected(releases);
      });
    }

    const deleteSelectedBtn = document.getElementById('tv-delete-selected');
    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const selected = tableEl.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));
        const confirmed = confirm(`Delete ${ids.length} selected release${ids.length !== 1 ? 's' : ''}?`);
        if (!confirmed) return;

        try {
          for (const id of ids) {
            await window.electron.deleteRelease(id);
          }
          this.showNotification(`Deleted ${ids.length} release${ids.length !== 1 ? 's' : ''}`, 'success');
          this.loadHomeCarousels();
          if (this.currentDetailItem) {
            this.refreshCurrentDetailsPage();
          }
        } catch (err) {
          this.showNotification(`Batch delete failed: ${err.message}`, 'error');
        }
      });
    }

    // Row click to show detail
    tableEl.querySelectorAll('.tv-release-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.action-icon-btn') || e.target.closest('input[type="checkbox"]')) return;
        const check = row.querySelector('.tv-release-check');
        if (check) {
          const id = parseInt(check.dataset.id);
          this.showReleaseDetail(id);
        }
      });
    });

    tableEl.querySelectorAll('.action-icon-btn[data-action="send"]').forEach(btn => {
      btn.disabled = !this.canUseFeature('send_to_downloader');
      btn.title = this.canUseFeature('send_to_downloader') ? '' : this.getFeatureUnavailableMessage('send_to_downloader');
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.sendReleaseIdToDownloader(id, 'preferred', true);
      });
    });

    tableEl.querySelectorAll('.action-icon-btn[data-action="open-linked"]').forEach(btn => {
      const hasLinkedMedia = !!(btn.dataset.mediaType && (btn.dataset.tmdb || btn.dataset.imdb));
      btn.disabled = !hasLinkedMedia;
      btn.title = hasLinkedMedia ? 'Open linked movie/TV detail' : 'No linked movie/TV detail';
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        await this.openLinkedReleaseMedia({
          id: parseInt(btn.dataset.id, 10),
          mediaType: btn.dataset.mediaType,
          tmdbId: btn.dataset.tmdb || '',
          imdbId: btn.dataset.imdb || '',
          title: btn.dataset.title || ''
        });
      });
    });

    tableEl.querySelectorAll('.action-icon-btn[data-action="download"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        try {
          const result = await window.electron.downloadNZB(id);
          if (result.success) {
            this.showNotification(`NZB saved to: ${result.path}`, 'success');
          } else if (!result.canceled) {
            this.showNotification(`Download failed: ${result.error}`, 'error');
          }
        } catch (err) {
          this.showNotification(`Download failed: ${err.message}`, 'error');
        }
      });
    });

    // Individual delete
    tableEl.querySelectorAll('.action-icon-btn[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        if (confirm('Delete this release?')) {
          await window.electron.deleteRelease(id);
          if (this.currentDetailItem) {
            this.refreshCurrentDetailsPage();
          }
        }
      });
    });
  }

  hideSeasonTabs() {
    this.seasonGroups = null;
    this.currentSeasonTab = null;
    const tabsEl = document.getElementById('season-tabs-container');
    if (tabsEl) tabsEl.innerHTML = '';
  }

  getSeasonLabel(season) {
    if (season === 0) return 'Specials';
    if (season === 99) return 'Complete Series';
    return `Season ${season}`;
  }

  getPreferredDownloaderLabel() {
    const preferred = document.getElementById('downloader-preferred')?.value || 'sabnzbd';
    return preferred === 'nzbget' ? 'NZBGet' : 'SABnzbd';
  }

  renderMovieGrid(releases) {
    const tableEl = document.getElementById('releases-table');
    if (!tableEl) return;

    if (!releases || releases.length === 0) {
      tableEl.innerHTML = '<div class="empty-state"><p>No releases found.</p></div>';
      return;
    }

    // Sort by quality (higher resolution first)
    const sorted = [...releases].sort((a, b) => this.sortReleasesByQuality(a, b));
    const downloaderLabel = this.getPreferredDownloaderLabel();

    let html = `
      <div class="tv-batch-bar">
        <label class="tv-batch-select-all">
          <input type="checkbox" id="tv-select-all"> Select All
        </label>
        <button class="btn-small btn-download-selected" id="tv-download-selected" disabled>⬇️ Download Selected</button>
        <button class="btn-small btn-download-selected" id="tv-send-selected" disabled>↗ Send to ${downloaderLabel}</button>
        <button class="btn-small btn-download-selected" id="tv-queue-refresh-selected" disabled>↻ Queue Refresh</button>
        <button class="btn-small btn-download-selected" id="tv-batch-edit-selected" disabled>✎ Batch Edit</button>
        <button class="btn-small btn-download-selected" id="tv-delete-selected" disabled>🗑 Delete Selected</button>
        <span class="tv-batch-count" id="tv-batch-count">0 selected</span>
      </div>
      <table class="tv-releases-table">
        <thead>
          ${this.getReleaseTableHeaderHtml()}
        </thead>
        <tbody>
    `;

    sorted.forEach(r => {
      html += this.buildTVRow(r, false);
    });

    html += '</tbody></table>';
    tableEl.innerHTML = html;

    this.bindTVTableActions();
  }

  getCategoryName(categoryId) {
    const map = {
      1010: 'Movies HD', 1020: 'Movies SD', 1030: 'Movies 4K', 1040: 'Movies 3D',
      2010: 'TV HD', 2020: 'TV SD', 2030: 'TV 4K', 2040: 'TV Docs',
      3010: 'Music MP3', 3020: 'Music FLAC', 3030: 'Music Videos', 3040: 'Audiobooks',
      4010: 'Games', 4020: 'Software',
      5010: 'Ebooks', 5020: 'Magazines', 5030: 'Comics',
      6010: 'XXX'
    };
    return map[categoryId] || null;
  }

  // Browse Page
  clearBrowseSearch() {
    this.currentBrowseSearch = '';
    this.currentBrowsePage = 1;

    const searchInput = document.getElementById('browse-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
  }

  setupBrowsePage() {
    const searchInput = document.getElementById('browse-search-input');

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentBrowseSearch = e.target.value.trim();
          this.currentBrowsePage = 1;
          this.loadBrowsePage();
        }, 300);
      });
    }

    this.renderBrowseCategories();
  }

  renderBrowseCategories() {
    const container = document.getElementById('browse-categories');
    if (!container) return;

    const categories = [
      { id: 'all', label: 'All', icon: SVG_ICONS.package },
      { id: '1', label: 'Movies', icon: SVG_ICONS.movie, subs: [
        { id: '1010', label: 'Movies HD' }, { id: '1020', label: 'Movies SD' }, { id: '1030', label: 'Movies 4K' }
      ]},
      { id: '2', label: 'TV', icon: SVG_ICONS.tv, subs: [
        { id: '2010', label: 'TV HD' }, { id: '2020', label: 'TV SD' }, { id: '2030', label: 'TV 4K' }
      ]},
      { id: '3', label: 'Music', icon: SVG_ICONS.music },
      { id: '4', label: 'Games', icon: SVG_ICONS.games },
      { id: '5', label: 'Books', icon: SVG_ICONS.books },
      { id: '6', label: 'XXX', icon: SVG_ICONS.xxx }
    ];

    let html = '<div class="browse-cat-pills">';
    categories.forEach(cat => {
      const active = this.currentBrowseFilter === cat.id;
      html += `<button class="browse-cat-pill${active ? ' active' : ''}" data-cat="${cat.id}">${cat.icon} ${cat.label}</button>`;
      if (cat.subs) {
        cat.subs.forEach(sub => {
          const subActive = this.currentBrowseFilter === sub.id;
          html += `<button class="browse-cat-pill sub${subActive ? ' active' : ''}" data-cat="${sub.id}">${sub.label}</button>`;
        });
      }
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.browse-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentBrowseFilter = btn.dataset.cat;
        this.currentBrowseRefreshStatus = null;
        this.currentBrowsePage = 1;
        this.renderBrowseCategories();
        this.loadBrowsePage();
      });
    });
  }

  async loadBrowsePage() {
    try {
      let sortField, sortOrder;
      const lastUnderscore = this.currentBrowseSort.lastIndexOf('_');
      if (lastUnderscore === -1) {
        // No direction suffix (e.g., "category")
        sortField = this.currentBrowseSort;
        sortOrder = 'desc';
      } else {
        sortField = this.currentBrowseSort.substring(0, lastUnderscore);
        sortOrder = this.currentBrowseSort.substring(lastUnderscore + 1);
      }

      const sortMap = {
        post_date: 'post_date',
        clean_name: 'clean_name',
        quality: 'quality_rank',
        video_codec: 'video_codec',
        audio_codec: 'audio_codec',
        source: 'source',
        release_group: 'release_group',
        size: 'size',
        category: 'category_name'
      };
      const sortBy = sortMap[sortField] || 'post_date';

      const options = {
        page: this.currentBrowsePage,
        limit: this.browsePageSize,
        sortBy,
        sortOrder: sortOrder === 'asc' ? 'ASC' : 'DESC'
      };

      if (this.currentBrowseRefreshStatus) {
        options.refreshStatus = this.currentBrowseRefreshStatus;
      }

      if (this.currentBrowseFilter !== 'all') {
        options.category = parseInt(this.currentBrowseFilter);
      }

      if (this.currentBrowseSearch) {
        options.search = this.currentBrowseSearch;
      }

      const result = await window.electron.getReleases(options);
      this.renderBrowseResults(result);
    } catch (error) {
      console.error('Failed to load browse page:', error);
    }
  }

  renderBrowseResults(result) {
    const releases = result.releases || [];
    const pagination = result.pagination || { total: 0, page: 1, totalPages: 0 };
    const batchBar = document.getElementById('browse-batch-bar');

    const countEl = document.getElementById('browse-results-count');
    if (countEl) {
      countEl.textContent = this.currentBrowseRefreshStatus === 'delete_pending'
        ? `${pagination.total} release${pagination.total !== 1 ? 's' : ''} need attention`
        : `${pagination.total} indexed release${pagination.total !== 1 ? 's' : ''} available`;
    }

    if (releases.length === 0) {
      if (batchBar) batchBar.style.display = 'none';
      const container = document.getElementById('browse-table-container');
      if (container) {
        container.innerHTML = `<div class="empty-state" style="padding:40px;text-align:center;"><p>No releases found</p></div>`;
      }
      this.renderBrowsePagination(0);
      return;
    }

    // Restore table HTML if it was replaced by empty state
    const container = document.getElementById('browse-table-container');
    if (container && !document.getElementById('browse-releases-tbody')) {
      container.innerHTML = `
        <table class="tv-releases-table" id="browse-releases-table">
          <thead>
            ${this.getBrowseReleaseTableHeaderHtml()}
          </thead>
          <tbody id="browse-releases-tbody"></tbody>
        </table>
      `;
    }

    this.renderBrowseTableHeader();

    const tbody = document.getElementById('browse-releases-tbody');
    if (!tbody) return;
    if (batchBar) batchBar.style.display = 'flex';

    const masterSelectAll = document.getElementById('browse-master-select-all');
    if (masterSelectAll) masterSelectAll.checked = false;

    tbody.innerHTML = releases.map(r => {
      const catName = r.category_name || this.getCategoryName(r.category_id) || 'N/A';
      return this.buildTVRow(r, false);
    }).join('');

    this.bindBrowseTableActions();
    this.renderBrowsePagination(pagination.totalPages, pagination.page);
  }

  renderBrowseTableHeader() {
    const table = document.getElementById('browse-releases-table');
    const thead = table?.querySelector('thead');
    if (!thead) return;
    thead.innerHTML = this.getBrowseReleaseTableHeaderHtml();
  }

  getBrowseSortFromHeaderKey(key, direction) {
    const map = {
      name: 'clean_name',
      quality: 'quality',
      video: 'video_codec',
      audio: 'audio_codec',
      source: 'source',
      category: 'category',
      group: 'release_group',
      posted: 'post_date',
      size: 'size'
    };
    const field = map[key] || 'post_date';
    return `${field}_${direction === 'asc' ? 'asc' : 'desc'}`;
  }

  getBrowseHeaderKeyFromSort() {
    const lastUnderscore = this.currentBrowseSort.lastIndexOf('_');
    const sortField = lastUnderscore === -1
      ? this.currentBrowseSort
      : this.currentBrowseSort.substring(0, lastUnderscore);
    const direction = lastUnderscore === -1
      ? 'desc'
      : this.currentBrowseSort.substring(lastUnderscore + 1);
    const map = {
      clean_name: 'name',
      quality: 'quality',
      video_codec: 'video',
      audio_codec: 'audio',
      source: 'source',
      category: 'category',
      release_group: 'group',
      post_date: 'posted',
      size: 'size'
    };
    return {
      key: map[sortField] || 'posted',
      direction: direction === 'asc' ? 'asc' : 'desc'
    };
  }

  bindBrowseHeaderSorting() {
    const table = document.getElementById('browse-releases-table');
    if (!table) return;

    const active = this.getBrowseHeaderKeyFromSort();
    table.querySelectorAll('.release-sortable-th').forEach(th => {
      const indicator = th.querySelector('.release-sort-indicator');
      const isActive = th.dataset.sortKey === active.key;
      th.classList.toggle('sorted-asc', isActive && active.direction === 'asc');
      th.classList.toggle('sorted-desc', isActive && active.direction === 'desc');
      th.dataset.sortDirection = isActive ? active.direction : '';
      if (indicator) indicator.textContent = isActive ? (active.direction === 'asc' ? '↑' : '↓') : '↕';

      th.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = th.dataset.sortKey;
        const current = this.getBrowseHeaderKeyFromSort();
        const nextDirection = current.key === key && current.direction === 'asc' ? 'desc' : 'asc';
        this.currentBrowseSort = this.getBrowseSortFromHeaderKey(key, nextDirection);
        this.currentBrowsePage = 1;
        this.loadBrowsePage();
      });
    });
  }

  bindBrowseTableActions() {
    const tbody = document.getElementById('browse-releases-tbody');
    if (!tbody) return;
    const canUseBulkActions = this.canUseFeature('bulk_actions');
    this.bindReleaseSelectCellToggles(tbody);
    this.bindBrowseHeaderSorting();

    const batchBar = document.getElementById('browse-batch-bar');
    const countEl = document.getElementById('browse-batch-count');
    const downloadBtn = document.getElementById('browse-download-selected');
    const sendBtn = document.getElementById('browse-send-selected');
    const queueRefreshBtn = document.getElementById('browse-queue-refresh-selected');
    const batchEditBtn = document.getElementById('browse-batch-edit-selected');
    const deleteBtn = document.getElementById('browse-delete-selected');
    const selectAll = document.getElementById('browse-select-all');
    const masterSelectAll = document.getElementById('browse-master-select-all');

    if (sendBtn) {
      sendBtn.textContent = `↗ Send to ${this.getPreferredDownloaderLabel()}`;
    }

    const updateBrowseBatchBar = () => {
      const checked = tbody.querySelectorAll('.tv-release-check:checked');
      const count = checked.length;
      const canSend = this.canUseFeature('send_to_downloader');
      const canRefresh = this.canUseFeature('owned_refresh');
      if (countEl) countEl.textContent = `${count} selected`;
      if (downloadBtn) {
        downloadBtn.disabled = count === 0 || !canUseBulkActions;
        downloadBtn.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      }
      if (deleteBtn) {
        deleteBtn.disabled = count === 0 || !canUseBulkActions;
        deleteBtn.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      }
      if (sendBtn) {
        if (!canUseBulkActions) {
          sendBtn.disabled = true;
          sendBtn.title = this.getFeatureUnavailableMessage('bulk_actions');
        } else {
          sendBtn.disabled = count === 0 || !canSend;
          sendBtn.title = canSend ? '' : this.getFeatureUnavailableMessage('send_to_downloader');
        }
      }
      if (queueRefreshBtn) {
        if (!canUseBulkActions) {
          queueRefreshBtn.disabled = true;
          queueRefreshBtn.title = this.getFeatureUnavailableMessage('bulk_actions');
        } else {
          queueRefreshBtn.disabled = count === 0 || !canRefresh;
          queueRefreshBtn.title = canRefresh ? '' : this.getFeatureUnavailableMessage('owned_refresh');
        }
      }
      if (batchEditBtn) {
        batchEditBtn.disabled = count === 0 || !canUseBulkActions;
        batchEditBtn.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      }

      const allChecks = tbody.querySelectorAll('.tv-release-check');
      const allChecked = allChecks.length > 0 && checked.length === allChecks.length;
      if (selectAll) selectAll.checked = allChecked;
      if (masterSelectAll) masterSelectAll.checked = allChecked;
    };

    if (selectAll) {
      selectAll.disabled = !canUseBulkActions;
      selectAll.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      selectAll.onchange = () => {
        if (!canUseBulkActions) {
          selectAll.checked = false;
          return;
        }
        tbody.querySelectorAll('.tv-release-check').forEach(c => { c.checked = selectAll.checked; });
        updateBrowseBatchBar();
      };
    }

    if (masterSelectAll) {
      masterSelectAll.disabled = !canUseBulkActions;
      masterSelectAll.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      masterSelectAll.onchange = () => {
        if (!canUseBulkActions) {
          masterSelectAll.checked = false;
          return;
        }
        tbody.querySelectorAll('.tv-release-check').forEach(c => { c.checked = masterSelectAll.checked; });
        updateBrowseBatchBar();
      };
    }

    tbody.querySelectorAll('.tv-release-check').forEach(c => {
      c.disabled = !canUseBulkActions;
      c.title = canUseBulkActions ? '' : this.getFeatureUnavailableMessage('bulk_actions');
      c.addEventListener('change', updateBrowseBatchBar);
    });

    if (downloadBtn) {
      downloadBtn.onclick = async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const selected = tbody.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));

        try {
          const result = await window.electron.downloadNZBBatch(ids);
          if (result.success) {
            this.showNotification(`Downloaded ${result.count} NZB file(s) to: ${result.path}`, 'success');
          } else if (!result.canceled) {
            this.showNotification(`Batch download failed: ${result.error}`, 'error');
          }
        } catch (err) {
          this.showNotification(`Batch download failed: ${err.message}`, 'error');
        }
        updateBrowseBatchBar();
      };
    }

    if (sendBtn) {
      sendBtn.onclick = async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const selected = tbody.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));
        await this.sendMultipleReleasesToDownloader(ids, 'preferred');
        updateBrowseBatchBar();
      };
    }

    if (queueRefreshBtn) {
      queueRefreshBtn.onclick = async () => {
        if (!this.requireFeature('bulk_actions')) return;
        if (!this.requireFeature('owned_refresh')) return;
        const selected = tbody.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));
        await this.queueMultipleReleasesForRefresh(ids);
        updateBrowseBatchBar();
      };
    }

    if (batchEditBtn) {
      batchEditBtn.onclick = async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const releases = await this.getSelectedReleasesFromTable(tbody);
        if (releases.length === 0) return;
        this.openBatchEditSelected(releases);
      };
    }

    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!this.requireFeature('bulk_actions')) return;
        const selected = tbody.querySelectorAll('.tv-release-check:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(c => parseInt(c.dataset.id));
        const confirmed = confirm(`Delete ${ids.length} selected release${ids.length !== 1 ? 's' : ''}?`);
        if (!confirmed) return;

        try {
          for (const id of ids) {
            await window.electron.deleteRelease(id);
          }
          this.showNotification(`Deleted ${ids.length} release${ids.length !== 1 ? 's' : ''}`, 'success');
          this.loadHomeCarousels();
          this.loadBrowsePage();
        } catch (err) {
          this.showNotification(`Batch delete failed: ${err.message}`, 'error');
        }
      };
    }

    // Row click to show detail
    tbody.querySelectorAll('.tv-release-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.action-icon-btn') || e.target.closest('input[type="checkbox"]')) return;
        const check = row.querySelector('.tv-release-check');
        if (check) {
          const id = parseInt(check.dataset.id);
          this.showReleaseDetail(id);
        }
      });
    });

    tbody.querySelectorAll('.action-icon-btn[data-action="download"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        try {
          const result = await window.electron.downloadNZB(id);
          if (result.success) {
            this.showNotification(`NZB saved to: ${result.path}`, 'success');
          } else if (!result.canceled) {
            this.showNotification(`Download failed: ${result.error}`, 'error');
          }
        } catch (err) {
          this.showNotification(`Download failed: ${err.message}`, 'error');
        }
      });
    });

    tbody.querySelectorAll('.action-icon-btn[data-action="send"]').forEach(btn => {
      btn.disabled = !this.canUseFeature('send_to_downloader');
      btn.title = this.canUseFeature('send_to_downloader') ? '' : this.getFeatureUnavailableMessage('send_to_downloader');
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await this.sendReleaseIdToDownloader(id, 'preferred', true);
      });
    });

    tbody.querySelectorAll('.action-icon-btn[data-action="open-linked"]').forEach(btn => {
      const hasLinkedMedia = !!(btn.dataset.mediaType && (btn.dataset.tmdb || btn.dataset.imdb));
      btn.disabled = !hasLinkedMedia;
      btn.title = hasLinkedMedia ? 'Open linked movie/TV detail' : 'No linked movie/TV detail';
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        await this.openLinkedReleaseMedia({
          id: parseInt(btn.dataset.id, 10),
          mediaType: btn.dataset.mediaType,
          tmdbId: btn.dataset.tmdb || '',
          imdbId: btn.dataset.imdb || '',
          title: btn.dataset.title || ''
        });
      });
    });

    // Individual delete
    tbody.querySelectorAll('.action-icon-btn[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        if (confirm('Delete this release?')) {
          await window.electron.deleteRelease(id);
          this.loadBrowsePage();
        }
      });
    });

    updateBrowseBatchBar();
  }

  renderBrowsePagination(totalPages, currentPage) {
    const container = document.getElementById('browse-pagination');
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '<div class="browse-pag">';
    html += `<button class="browse-pag-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">← Prev</button>`;

    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, startPage + 6);

    if (startPage > 1) {
      html += `<button class="browse-pag-btn" data-page="1">1</button>`;
      if (startPage > 2) html += '<span class="browse-pag-ellipsis">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
      const cls = i === currentPage ? 'browse-pag-btn active' : 'browse-pag-btn';
      html += `<button class="${cls}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="browse-pag-ellipsis">...</span>';
      html += `<button class="browse-pag-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="browse-pag-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next →</button>`;
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.browse-pag-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentBrowsePage = parseInt(btn.dataset.page);
        this.loadBrowsePage();
        document.getElementById('browse-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  switchPage(pageName) {
    // Hide all pages completely
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
      p.classList.add('hidden');
    });

    // Also explicitly hide detail pages
    const movieDetails = document.getElementById('page-movie-details');
    if (movieDetails) {
      movieDetails.classList.add('hidden');
      movieDetails.classList.remove('active');
    }
    
    const actorDetails = document.getElementById('page-actor-details');
    if (actorDetails) {
      actorDetails.classList.add('hidden');
      actorDetails.classList.remove('active');
    }

    const collectionDetails = document.getElementById('page-collection-details');
    if (collectionDetails) {
      collectionDetails.classList.add('hidden');
      collectionDetails.classList.remove('active');
    }

    // Show target page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
      targetPage.classList.add('active');
      this.currentPage = pageName;

      if (pageName === 'library') {
        const h2 = document.querySelector('#page-library h2');
        if (h2) h2.textContent = 'My Library';
        this.loadLibrary();
      } else if (pageName === 'collections') {
        this.loadCollectionsPage();
      } else if (pageName === 'streams') {
        this.loadStreamsPage();
      } else if (pageName === 'categories') {
        this.loadHomeCarousels();
      } else if (pageName === 'browse') {
        if (!this.preserveBrowseRefreshStatus) {
          this.currentBrowseRefreshStatus = null;
        }
        this.preserveBrowseRefreshStatus = false;
        this.loadBrowsePage();
      }
    }

    // Update nav button active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageName);
    });
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatBitrate(bps) {
    if (!bps || bps === 0) return '0 bps';
    if (bps < 1000) return `${bps} bps`;
    if (bps < 1000000) return `${(bps / 1000).toFixed(0)} kbps`;
    return `${(bps / 1000000).toFixed(2)} Mbps`;
  }

  formatSampleRate(hz) {
    if (!hz || hz === 0) return '0 Hz';
    if (hz < 1000) return `${hz} Hz`;
    return `${(hz / 1000).toFixed(1)} kHz`;
  }

  // NZB Import (drag-and-drop only — header button now links to Link NZBs page)
  setupNZBImport() {
    // No header button handler — navigation is handled in setupNavigation()
  }

  async importNZBFiles() {
    try {
      const result = await window.electron.importNZBFiles();
      
      if (result.canceled) {
        return;
      }

      if (result.success > 0) {
        this.showNotification(
          `✓ Successfully imported ${result.success} NZB file${result.success > 1 ? 's' : ''}`,
          'success'
        );
        
        // Refresh library
        await this.loadLibrary();
      }

      if (result.failed > 0) {
        this.showNotification(
          `⚠ ${result.failed} file${result.failed > 1 ? 's' : ''} failed to import`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Failed to import NZB files:', error);
      this.showNotification('Failed to import NZB files', 'error');
    }
  }

  // Library
  libraryCategory = 'all';
  libraryGenre = 'all';
  librarySearchQuery = '';
  libraryCurrentPage = 1;
  libraryPageSize = 50;
  libraryTotalPages = 0;
  libraryTotalItems = 0;
  libraryCoverSize = 'medium';
  collectionsSearchQuery = '';
  collectionsCurrentPage = 1;
  collectionsPageSize = 36;
  collectionsTotalPages = 0;
  collectionsTotalItems = 0;

  // Apply cover size class to #app
  applyCoverSize(size) {
    const app = document.getElementById('app');
    if (!app) return;
    
    // Remove all cover size classes
    app.classList.remove('cover-size-small', 'cover-size-medium', 'cover-size-large');
    
    // Add the selected one
    app.classList.add(`cover-size-${size}`);
    
    this.libraryCoverSize = size;
  }

  // Validate items per page: 1-80 any number, or 100/120/140/160/180/200
  validateItemsPerPage(value) {
    const num = parseInt(value);
    
    // Default to 50 if invalid
    if (isNaN(num) || num < 1) return 50;
    
    // 1-80: allow any number
    if (num >= 1 && num <= 80) return num;
    
    // 81-99: snap to 80
    if (num > 80 && num < 100) return 80;
    
    // 100-200: snap to nearest 20
    if (num >= 100 && num <= 200) {
      const stepped = Math.round(num / 20) * 20;
      return Math.max(100, Math.min(200, stepped));
    }
    
    // > 200: cap at 200
    return 200;
  }

  clearLibrarySearch() {
    this.librarySearchQuery = '';
    this.libraryCurrentPage = 1;

    const searchInput = document.getElementById('library-search');
    if (searchInput) {
      searchInput.value = '';
    }
  }

  clearCollectionsSearch() {
    this.collectionsSearchQuery = '';
    this.collectionsCurrentPage = 1;

    const searchInput = document.getElementById('collections-search');
    if (searchInput) {
      searchInput.value = '';
    }
  }

  setupLibraryPage() {
    const searchInput = document.getElementById('library-search');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.librarySearchQuery = e.target.value.trim();
          this.libraryCurrentPage = 1;
          this.loadLibrary();
        }, 300);
      });
    }
  }

  setupStreamsPage() {
    const importBtn = document.getElementById('stream-import-btn');
    const importFileBtn = document.getElementById('stream-import-file-btn');
    const refreshMetadataBtn = document.getElementById('stream-refresh-metadata-btn');
    const searchInput = document.getElementById('stream-search');

    if (importBtn) {
      importBtn.addEventListener('click', () => this.importStreamUrlsFromTextarea());
    }

    if (importFileBtn) {
      importFileBtn.addEventListener('click', () => this.importStreamUrlsFromFile());
    }

    if (refreshMetadataBtn) {
      refreshMetadataBtn.addEventListener('click', () => this.refreshStreamMetadata());
    }

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.streamFilters.query = event.target.value.trim();
          this.loadStreamsPage();
        }, 250);
      });
    }

    document.querySelectorAll('.stream-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.stream-filter').forEach(filter => filter.classList.remove('active'));
        btn.classList.add('active');
        this.streamFilters.view = btn.dataset.view || 'all';
        this.streamFilters.mediaType = btn.dataset.mediaType || null;
        this.loadStreamsPage();
      });
    });
  }

  async importStreamUrlsFromTextarea() {
    const input = document.getElementById('stream-url-input');
    if (!input) return;

    const urls = input.value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      this.showNotification('Paste at least one stream URL first', 'warning');
      return;
    }

    const result = await window.electron.importStreamUrls(urls);
    this.renderStreamImportResult(result);
    if (result?.imported?.length) {
      input.value = '';
      await this.loadStreamsPage();
    }
  }

  async importStreamUrlsFromFile() {
    const result = await window.electron.importStreamUrlFile();
    if (result?.canceled) return;
    this.renderStreamImportResult(result);
    if (result?.imported?.length) {
      await this.loadStreamsPage();
    }
  }

  async refreshStreamMetadata() {
    const btn = document.getElementById('stream-refresh-metadata-btn');
    if (btn) btn.disabled = true;

    try {
      const result = await window.electron.refreshStreamMetadata();
      if (!result?.success) {
        throw new Error(result?.error || 'Refresh failed');
      }
      this.showNotification(`Updated artwork/metadata for ${result.updated || 0} stream(s)`, 'success');
      await this.loadStreamsPage();
    } catch (error) {
      this.showNotification(`Artwork refresh failed: ${error.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  renderStreamImportResult(result) {
    const resultEl = document.getElementById('stream-import-result');
    if (!resultEl) return;

    if (!result) {
      resultEl.textContent = 'Import did not return a result.';
      return;
    }

    if (result.error) {
      resultEl.textContent = `Import failed: ${result.error}`;
      this.showNotification(resultEl.textContent, 'error');
      return;
    }

    const imported = result.imported?.length || 0;
    const skipped = result.skipped?.length || 0;
    const failed = result.failed?.length || 0;
    resultEl.textContent = `Imported ${imported}. Skipped ${skipped}. Failed ${failed}.`;
    this.showNotification(resultEl.textContent, failed ? 'warning' : 'success');
  }

  async loadStreamsPage() {
    const grid = document.getElementById('stream-library-grid');
    if (!grid) return;

    try {
      const [counts, items] = await Promise.all([
        window.electron.getStreamCounts(),
        window.electron.getStreamLibrary(this.streamFilters)
      ]);

      this.renderStreamStats(counts);
      this.renderStreamGrid(items || []);
    } catch (error) {
      console.error('Failed to load stream library:', error);
      grid.innerHTML = `<div class="empty-state"><p>Could not load streams: ${this.escapeHtml(error.message)}</p></div>`;
    }
  }

  renderStreamStats(counts = {}) {
    const statStrip = document.getElementById('stream-stat-strip');
    if (!statStrip) return;

    statStrip.innerHTML = `
      <div><strong>${this.escapeHtml(counts.total || 0)}</strong><span>Total</span></div>
      <div><strong>${this.escapeHtml(counts.movies || 0)}</strong><span>Movies</span></div>
      <div><strong>${this.escapeHtml(counts.tv || 0)}</strong><span>TV</span></div>
      <div><strong>${this.escapeHtml(counts.favorites || 0)}</strong><span>Favorites</span></div>
    `;
  }

  renderStreamGrid(items) {
    const grid = document.getElementById('stream-library-grid');
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = `
        <div class="empty-state stream-empty-state">
          <div class="empty-icon">${SVG_ICONS.play}</div>
          <h3>No streams yet</h3>
          <p>Import direct media URLs to build your local stream library.</p>
        </div>
      `;
      return;
    }

    const groups = this.groupStreamItems(items);
    grid.innerHTML = groups.map(group => this.renderStreamCard(group)).join('');
    grid.onclick = (event) => this.handleStreamGridClick(event);
  }

  groupStreamItems(items) {
    const groups = new Map();

    for (const item of items) {
      const titleKey = String(item.title || item.original_filename || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const key = item.tmdb_id
        ? `${item.media_type}:tmdb:${item.tmdb_id}`
        : `${item.media_type}:title:${titleKey}:${item.year || ''}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: item.title,
          year: item.year,
          media_type: item.media_type,
          poster_url: item.poster_url,
          poster_path: item.poster_path,
          overview: item.overview,
          items: []
        });
      }

      const group = groups.get(key);
      group.items.push(item);
      group.poster_url = group.poster_url || item.poster_url;
      group.poster_path = group.poster_path || item.poster_path;
      group.overview = group.overview || item.overview;
    }

    return Array.from(groups.values());
  }

  async handleStreamGridClick(event) {
    const playBtn = event.target.closest('[data-stream-play]');
    const favoriteBtn = event.target.closest('[data-stream-favorite]');
    const watchedBtn = event.target.closest('[data-stream-watched]');
    const deleteBtn = event.target.closest('[data-stream-delete]');

    if (playBtn) {
      await this.playStreamInApp(parseInt(playBtn.dataset.streamPlay, 10), playBtn.dataset.title || 'Stream');
      return;
    }

    if (favoriteBtn) {
      await window.electron.updateStreamFlags(parseInt(favoriteBtn.dataset.streamFavorite, 10), {
        favorite: favoriteBtn.dataset.current !== 'true'
      });
      await this.loadStreamsPage();
      return;
    }

    if (watchedBtn) {
      await window.electron.updateStreamFlags(parseInt(watchedBtn.dataset.streamWatched, 10), {
        watched: watchedBtn.dataset.current !== 'true'
      });
      await this.loadStreamsPage();
      return;
    }

    if (deleteBtn) {
      const title = deleteBtn.dataset.title || 'this stream URL';
      const confirmed = window.confirm(`Delete "${title}" from Streams?`);
      if (!confirmed) return;

      const result = await window.electron.deleteStream(parseInt(deleteBtn.dataset.streamDelete, 10));
      if (!result?.success) {
        this.showNotification(`Delete failed: ${result?.error || 'Stream not found'}`, 'error');
        return;
      }

      this.showNotification('Stream URL deleted', 'success');
      await this.loadStreamsPage();
    }
  }

  renderStreamCard(group) {
    const item = group.items[0];
    const image = item.poster_url || item.poster_path || 'assets/images/placeholder-cover.svg';
    const year = item.year ? ` (${this.escapeHtml(item.year)})` : '';
    const versionCount = group.items.length;
    const episode = item.media_type === 'tv' && item.season_number !== null
      ? `S${String(item.season_number).padStart(2, '0')}${item.episode_number !== null ? `E${String(item.episode_number).padStart(2, '0')}` : ''}`
      : item.media_type === 'movie' ? 'Movie' : 'TV';
    const details = [episode, item.resolution, item.source, item.video_codec].filter(Boolean).join(' • ');
    const versionRows = group.items.map((version, index) => this.renderStreamVersionRow(version, index, versionCount)).join('');

    return `
      <article class="stream-card">
        <div class="stream-poster-wrap">
          <img class="stream-poster" src="${this.escapeHtml(image)}" alt="${this.escapeHtml(item.title)}" onerror="this.src='assets/images/placeholder-cover.svg'">
          <div class="stream-card-actions">
            <button class="stream-icon-btn stream-play-btn" title="Play" data-stream-play="${this.escapeHtml(item.id)}" data-title="${this.escapeHtml(item.title)}">${SVG_ICONS.play}</button>
            <button class="stream-icon-btn" title="Favorite" data-stream-favorite="${this.escapeHtml(item.id)}" data-current="${item.favorite ? 'true' : 'false'}">${item.favorite ? '★' : '☆'}</button>
            <button class="stream-icon-btn" title="Watched" data-stream-watched="${this.escapeHtml(item.id)}" data-current="${item.watched ? 'true' : 'false'}">${item.watched ? '✓' : '○'}</button>
            ${versionCount === 1 ? `<button class="stream-icon-btn stream-delete-btn" title="Delete" data-stream-delete="${this.escapeHtml(item.id)}" data-title="${this.escapeHtml(item.title)}">${SVG_ICONS.delete}</button>` : ''}
          </div>
        </div>
        <div class="stream-card-body">
          <h3>${this.escapeHtml(group.title || item.title)}${year}</h3>
          <div class="stream-card-meta">${this.escapeHtml(details)}</div>
          ${versionCount > 1 ? `<div class="stream-version-count">${versionCount} links available</div>` : ''}
          <div class="stream-version-list">${versionRows}</div>
          ${item.overview ? `<p>${this.escapeHtml(item.overview)}</p>` : ''}
        </div>
      </article>
    `;
  }

  renderStreamVersionRow(item, index, total) {
    const labelParts = [
      total > 1 ? `Link ${index + 1}` : null,
      item.resolution,
      item.source,
      item.video_codec,
      item.file_size ? this.formatBytes(item.file_size) : null
    ].filter(Boolean);
    const label = labelParts.join(' • ') || `Link ${index + 1}`;

    return `
      <div class="stream-version-row">
        <button class="stream-version-play" title="Play this link" data-stream-play="${this.escapeHtml(item.id)}" data-title="${this.escapeHtml(label)}">${SVG_ICONS.play}</button>
        <div class="stream-version-copy">
          <strong>${this.escapeHtml(label)}</strong>
          <span title="${this.escapeHtml(item.stream_url_masked || '')}">${this.escapeHtml(item.stream_url_masked || '')}</span>
        </div>
        <button class="stream-version-delete" title="Delete this link" data-stream-delete="${this.escapeHtml(item.id)}" data-title="${this.escapeHtml(label)}">${SVG_ICONS.delete}</button>
      </div>
    `;
  }

  setupCollectionsPage() {
    const searchInput = document.getElementById('collections-search');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.collectionsSearchQuery = e.target.value.trim();
        this.collectionsCurrentPage = 1;
        this.loadCollectionsPage();
      }, 250);
    });
  }

  setupTrailerModal() {
    // Trailers share the main playback overlay.
  }

  async loadLibrary() {
    try {
      const grid = document.getElementById('library-grid');

      // Get counts for category pills
      const counts = await window.electron.getLibraryCounts();

      // Render category pills
      this.renderLibraryCategoryPills(counts);

      // Render genre pills
      await this.renderLibraryGenrePills();

      // Load current page
      await this.applyLibraryFilter();
    } catch (error) {
      console.error('Failed to load library:', error);
      const grid = document.getElementById('library-grid');
      grid.innerHTML = `<div class="empty-state"><p>Error loading library: ${error.message}</p></div>`;
    }
  }

  async loadCollectionsPage() {
    try {
      const result = await window.electron.getLibraryCollections({
        search: this.collectionsSearchQuery || null,
        sortBy: 'name',
        sortOrder: 'ASC',
        page: this.collectionsCurrentPage,
        limit: this.collectionsPageSize
      });

      this.collectionsTotalPages = result.pagination?.totalPages || 0;
      this.collectionsTotalItems = result.pagination?.total || 0;

      const countEl = document.getElementById('collections-results-count');
      if (countEl) {
        countEl.textContent = `${this.collectionsTotalItems} collection${this.collectionsTotalItems !== 1 ? 's' : ''} in view`;
      }

      this.renderCollectionsGrid(result.items || []);
      this.renderCollectionsPagination();
    } catch (error) {
      console.error('Failed to load collections:', error);
      const grid = document.getElementById('collections-grid');
      if (grid) {
        grid.innerHTML = '<div class="empty-state"><p>Error loading collections</p></div>';
      }
    }
  }

  renderCollectionsGrid(items) {
    const grid = document.getElementById('collections-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🗂️</div><h3>No collections yet</h3><p>Collections will appear automatically when your movie metadata includes TMDB collection data.</p></div>';
      return;
    }

    grid.innerHTML = items.map(item => {
      const posterMarkup = this.buildCollectionPosterMarkup(item.poster_path || null, item.name, 'collection-library-poster', 'Collection');
      const backdrop = this.resolveMediaAssetUrl(item.backdrop_path || 'assets/images/placeholder-backdrop.svg');
      const owned = item.owned_count || 0;
      const total = item.total_count || owned;
      const residenceLine = owned > 0
        ? `${owned} of ${total} titles in residence`
        : `${total} titles prepared for arrival`;

      return `
        <button class="collection-library-card" data-tmdb="${item.tmdb_id}">
          <div class="collection-library-backdrop" style="background-image:url('${backdrop}')"></div>
          <div class="collection-library-overlay"></div>
          <div class="collection-library-veil"></div>
          <div class="collection-library-media">
            ${posterMarkup}
            <div class="collection-library-meta">
              <span class="collection-library-badge">${owned} owned</span>
              <span class="collection-library-badge">${total} total</span>
              <span class="collection-library-progress">${item.completion_label || `${owned}/${total}`}</span>
            </div>
          </div>
          <div class="collection-library-info">
            <div class="collection-library-kicker">Curated Vault</div>
            <div class="collection-library-title">${item.name}</div>
            <div class="collection-library-copy">${residenceLine}</div>
          </div>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.collection-library-card').forEach(card => {
      card.addEventListener('click', () => {
        this.showCollectionDetailPage(parseInt(card.dataset.tmdb, 10), {
          returnTo: { type: 'page', pageName: 'collections' }
        });
      });
    });
  }

  renderCollectionsPagination() {
    const container = document.getElementById('collections-pagination');
    if (!container) return;

    if (this.collectionsTotalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const pages = [];
    for (let page = 1; page <= this.collectionsTotalPages; page++) {
      pages.push(`<button class="browse-pag-btn" data-page="${page}" ${page === this.collectionsCurrentPage ? 'disabled' : ''}>${page}</button>`);
    }

    container.innerHTML = `<div class="browse-pag-controls">${pages.join('')}</div>`;
    container.querySelectorAll('.browse-pag-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        this.collectionsCurrentPage = parseInt(btn.dataset.page, 10);
        this.loadCollectionsPage();
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  renderLibraryCategoryPills(counts) {
    const container = document.getElementById('library-category-pills');
    if (!container) return;

    const categories = [
      { id: 'all', label: 'All', count: counts.total || 0, icon: SVG_ICONS.package },
      { id: 'movie', label: 'Movies', count: counts.movies || 0, icon: SVG_ICONS.movie },
      { id: 'tv', label: 'TV Shows', count: counts.tv || 0, icon: SVG_ICONS.tv }
    ];

    container.innerHTML = categories.map(cat => {
      const active = this.libraryCategory === cat.id;
      const countHtml = cat.count ? `<span class="pill-count">${cat.count}</span>` : '';
      return `<button class="lib-cat-pill${active ? ' active' : ''}" data-cat="${cat.id}">${cat.icon} ${cat.label}${countHtml}</button>`;
    }).join('');

    container.querySelectorAll('.lib-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.libraryCategory = btn.dataset.cat;
        this.libraryGenre = 'all';
        this.libraryCurrentPage = 1;
        container.querySelectorAll('.lib-cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderLibraryGenrePills();
        this.applyLibraryFilter();
      });
    });

    // Set initial active
    const activeBtn = container.querySelector(`[data-cat="${this.libraryCategory}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  async renderLibraryGenrePills() {
    const container = document.getElementById('library-genre-pills');
    if (!container) return;

    try {
      const mediaType = this.libraryCategory === 'all' ? 'all' : this.libraryCategory;
      const genres = await window.electron.getLibraryGenres(mediaType);

      if (!genres || genres.length === 0) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = `<button class="lib-genre-pill${this.libraryGenre === 'all' ? ' active' : ''}" data-genre="all">All</button>` +
        genres.map(g => {
          const active = this.libraryGenre === g;
          return `<button class="lib-genre-pill${active ? ' active' : ''}" data-genre="${g}">${g}</button>`;
        }).join('');

      container.querySelectorAll('.lib-genre-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          this.libraryGenre = btn.dataset.genre;
          this.libraryCurrentPage = 1;
          container.querySelectorAll('.lib-genre-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.applyLibraryFilter();
        });
      });
    } catch (e) {
      console.error('Failed to load library genres:', e);
      container.innerHTML = '';
    }
  }

  async applyLibraryFilter() {
    try {
      const options = {
        mediaType: this.libraryCategory,
        page: this.libraryCurrentPage,
        limit: this.libraryPageSize,
        sortBy: 'title',
        sortOrder: 'ASC'
      };

      if (this.libraryGenre !== 'all') {
        options.genre = this.libraryGenre;
      }

      if (this.librarySearchQuery) {
        options.search = this.librarySearchQuery;
      }

      const result = await window.electron.getLibraryItems(options);
      this.libraryTotalPages = result.pagination?.totalPages || 0;
      this.libraryTotalItems = result.pagination?.total || 0;

      this.renderLibraryGrid(result.items);
      this.renderLibraryPagination();

      // Update count display
      const countEl = document.getElementById('library-results-count');
      if (countEl) {
        countEl.textContent = `${result.pagination.total} title${result.pagination.total !== 1 ? 's' : ''} in view`;
      }
    } catch (error) {
      console.error('Failed to filter library:', error);
      const grid = document.getElementById('library-grid');
      grid.innerHTML = '<div class="empty-state"><p>Error loading items</p></div>';
    }
  }

  renderLibraryGrid(items) {
    const grid = document.getElementById('library-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h3>No matching titles</h3><p>Try different filters or add more releases</p></div>';
      return;
    }

    grid.innerHTML = items.map(item => {
      const coverImage = item.cover_path
        ? `<img src="${this.resolveMediaAssetUrl(item.cover_path)}" alt="${item.title}" class="cover-image" onerror="this.src='assets/images/placeholder-cover.svg';">`
        : `<div class="cover-placeholder"><img src="assets/images/placeholder-cover.svg" alt="No Cover" style="width:100%;height:100%;object-fit:cover;"></div>`;

      const year = (item.release_date || '').substring(0, 4);
      const rating = item.rating ? item.rating.toFixed(1) : null;
      const releaseCount = item.release_count || 0;
      const mediaType = item.library_media_type || (item.number_of_seasons !== undefined ? 'tv' : 'movie');
      const typeIcon = mediaType === 'tv' ? SVG_ICONS.tv : SVG_ICONS.movie;

      const trailerBtn = item.youtube_trailer
        ? `<button class="lib-card-trailer-btn" data-trailer="${item.youtube_trailer}" data-title="${item.title.replace(/'/g, '&#39;')}">${SVG_ICONS.play} Trailer</button>`
        : '';

      return `
        <div class="library-item" data-tmdb="${item.tmdb_id || ''}" data-imdb="${item.imdb_id || ''}" data-media-type="${mediaType}" data-title="${item.title || ''}">
          <div class="lib-card-cover">
            ${coverImage}
            <div class="lib-card-hover-overlay">
              <div class="lib-card-hover-content">
                <div class="lib-card-hover-top">
                  <div class="lib-card-hover-title" title="${item.title}">${item.title}</div>
                  ${year ? `<div class="lib-card-hover-year">${year}</div>` : ''}
                </div>
                <div class="lib-card-hover-meta">
                  <span class="lib-card-type-icon">${typeIcon}</span>
                  ${rating ? `<span class="lib-card-badge rating">★ ${rating}</span>` : ''}
                  ${releaseCount > 0 ? `<span class="lib-card-badge releases">${releaseCount} releases</span>` : ''}
                </div>
              </div>
              ${trailerBtn}
            </div>
            <button class="lib-card-delete-btn">${SVG_ICONS.delete}</button>
          </div>
        </div>
      `;
    }).join('');

    // Click handlers
    document.querySelectorAll('.library-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('lib-card-delete-btn') || e.target.closest('.lib-card-delete-btn')) return;
        const tmdbId = item.dataset.tmdb || null;
        const imdbId = item.dataset.imdb || null;
        const mediaType = item.dataset.mediaType;

        // Build detail page data from library item
        const detailData = {
          tmdb_id: tmdbId,
          imdb_id: imdbId,
          media_type: mediaType,
          title: item.dataset.title || item.querySelector('.lib-card-hover-title')?.title || '',
          cover_image: item.querySelector('.cover-image')?.src || ''
        };
        this.showDetailsPage(detailData);
      });
    });

    // Delete handlers
    document.querySelectorAll('.lib-card-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tmdbId = btn.closest('.library-item').dataset.tmdb;
        const imdbId = btn.dataset.imdb;
        if (confirm('Delete all releases for this title?')) {
          try {
            // Delete by searching releases with these IDs
            const result = await window.electron.getReleases({ search: tmdbId || imdbId, limit: 1000 });
            for (const rel of (result.releases || [])) {
              if (rel.tmdb_id == tmdbId || rel.imdb_id == imdbId) {
                await window.electron.deleteRelease(rel.id);
              }
            }
            this.showNotification('✓ Title and releases deleted', 'success');
            this.loadLibrary();
          } catch (err) {
            this.showNotification('Failed to delete: ' + err.message, 'error');
          }
        }
      });
    });

    // Trailer button click handler
    const trailerBtns = document.querySelectorAll('.lib-card-trailer-btn');
    trailerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trailerId = btn.dataset.trailer;
        const title = btn.dataset.title;
        this.openTrailer(trailerId, title);
      });
    });
  }

  async openTrailer(trailerId, title) {
    if (!trailerId) return;

    // Extract video ID
    let videoId = trailerId;
    if (trailerId.includes('youtube.com')) {
      const match = trailerId.match(/[?&]v=([^&]+)/);
      if (match) videoId = match[1];
    } else if (trailerId.includes('youtu.be/')) {
      const parts = trailerId.split('youtu.be/');
      videoId = parts[1]?.split(/[?&]/)[0];
    }

    const result = await window.electron.openTrailer(videoId, title);
    if (!result?.success || !result.url) {
      this.showNotification(`Trailer failed: ${result?.error || 'Unknown error'}`, 'error');
      return;
    }

    this.playTrailerInApp(result.url, title || 'Trailer');
  }

  closeTrailer() {
    this.closePlayer();
  }

  toggleTrailerFullscreen() {
    // No longer used
  }

  renderLibraryPagination() {
    const container = document.getElementById('library-pagination');
    if (!container) return;

    const totalPages = this.libraryTotalPages;
    const currentPage = this.libraryCurrentPage;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '<div class="browse-pag">';
    html += `<button class="browse-pag-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">← Prev</button>`;

    const startPage = Math.max(1, currentPage - 3);
    const endPage = Math.min(totalPages, startPage + 6);

    if (startPage > 1) {
      html += `<button class="browse-pag-btn" data-page="1">1</button>`;
      if (startPage > 2) html += '<span class="browse-pag-ellipsis">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
      const cls = i === currentPage ? 'browse-pag-btn active' : 'browse-pag-btn';
      html += `<button class="${cls}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="browse-pag-ellipsis">...</span>';
      html += `<button class="browse-pag-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="browse-pag-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next →</button>`;
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.browse-pag-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        this.libraryCurrentPage = parseInt(btn.dataset.page);
        this.applyLibraryFilter();
        document.getElementById('page-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  setupSettings() {
    const saveBtn = document.getElementById('save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // Live update for Library cover size
    const coverSizeSelect = document.getElementById('ui-library-cover-size');
    if (coverSizeSelect) {
      coverSizeSelect.addEventListener('change', (e) => {
        this.applyCoverSize(e.target.value);
        this.saveUISettings();
      });
    }

    // Live update for Library items per page setting
    const libraryItemsInput = document.getElementById('ui-library-items');
    if (libraryItemsInput) {
      libraryItemsInput.addEventListener('change', (e) => {
        const value = this.validateItemsPerPage(e.target.value);
        e.target.value = value;
        this.libraryPageSize = value;
        this.libraryCurrentPage = 1;
        // If library page is active, re-render immediately
        if (this.currentPage === 'library') {
          this.loadLibrary();
        }
        this.saveUISettings();
      });
    }

    // Live update for Browse items per page setting
    const browseItemsInput = document.getElementById('ui-browse-items');
    if (browseItemsInput) {
      browseItemsInput.addEventListener('change', (e) => {
        const value = this.validateItemsPerPage(e.target.value);
        e.target.value = value;
        this.browsePageSize = value;
        this.currentBrowsePage = 1;
        // If browse page is active, re-render immediately
        if (this.currentPage === 'browse') {
          this.renderBrowsePage();
        }
        this.saveUISettings();
      });
    }

    // Accordion toggle
    document.querySelectorAll('.settings-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.parentElement;
        section.classList.toggle('expanded');
      });
    });

    // Settings action buttons
    const addMediaBtn = document.getElementById('settings-add-media-btn');
    if (addMediaBtn) {
      addMediaBtn.addEventListener('click', () => {
        this.switchPage('uploads');
      });
    }

    const linkNZBsBtn = document.getElementById('settings-link-nzbs-btn');
    if (linkNZBsBtn) {
      linkNZBsBtn.addEventListener('click', () => {
        this.switchPage('link-nzbs');
        this.loadLinkNZBsPage();
      });
    }

    const downloadBrowseBtn = document.getElementById('download-path-browse');
    if (downloadBrowseBtn) {
      downloadBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectFolder();
          if (!result.canceled && result.path) {
            document.getElementById('download-path').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select folder:', e);
        }
      });
    }

    const archiveBrowseBtn = document.getElementById('archive-work-path-browse');
    if (archiveBrowseBtn) {
      archiveBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectFolder();
          if (!result.canceled && result.path) {
            document.getElementById('archive-work-path').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select archive work folder:', e);
        }
      });
    }

    const ngPostBrowseBtn = document.getElementById('ngpost-path-browse');
    if (ngPostBrowseBtn) {
      ngPostBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectExecutable();
          if (!result.canceled && result.path) {
            document.getElementById('ngpost-path').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select ngPost executable:', e);
        }
      });
    }

    const pipelineMoviesBrowseBtn = document.getElementById('pipeline-movies-folder-browse');
    if (pipelineMoviesBrowseBtn) {
      pipelineMoviesBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectFolder();
          if (!result.canceled && result.path) {
            document.getElementById('pipeline-movies-folder').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select movies preparation folder:', e);
        }
      });
    }

    const pipelineTvBrowseBtn = document.getElementById('pipeline-tv-folder-browse');
    if (pipelineTvBrowseBtn) {
      pipelineTvBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectFolder();
          if (!result.canceled && result.path) {
            document.getElementById('pipeline-tv-folder').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select TV preparation folder:', e);
        }
      });
    }

    const pipelinePrepareBtn = document.getElementById('pipeline-prepare-btn');
    if (pipelinePrepareBtn) {
      pipelinePrepareBtn.addEventListener('click', () => this.runPreparationPipeline(false));
    }

    const pipelinePrepareImportBtn = document.getElementById('pipeline-prepare-import-btn');
    if (pipelinePrepareImportBtn) {
      pipelinePrepareImportBtn.addEventListener('click', () => this.runPreparationPipeline(true));
    }

    const sabCompletedBrowseBtn = document.getElementById('sabnzbd-completed-path-browse');
    if (sabCompletedBrowseBtn) {
      sabCompletedBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectFolder();
          if (!result.canceled && result.path) {
            document.getElementById('sabnzbd-completed-path').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select SABnzbd completed downloads folder:', e);
        }
      });
    }

    const refreshCompletedBrowseBtn = document.getElementById('refresh-completed-path-browse');
    if (refreshCompletedBrowseBtn) {
      refreshCompletedBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectFolder();
          if (!result.canceled && result.path) {
            document.getElementById('refresh-completed-path').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select refresh completed folder:', e);
        }
      });
    }

    const refreshCleanupAction = document.getElementById('refresh-cleanup-action');
    if (refreshCleanupAction) {
      refreshCleanupAction.addEventListener('change', () => this.updateRefreshCleanupSettingsVisibility());
    }

    const refreshCleanupMoveBrowseBtn = document.getElementById('refresh-cleanup-move-path-browse');
    if (refreshCleanupMoveBrowseBtn) {
      refreshCleanupMoveBrowseBtn.addEventListener('click', async () => {
        try {
          const result = await window.electron.selectFolder();
          if (!result.canceled && result.path) {
            document.getElementById('refresh-cleanup-move-path').value = result.path;
          }
        } catch (e) {
          console.error('Failed to select refresh cleanup move folder:', e);
        }
      });
    }

    const testSabBtn = document.getElementById('test-sabnzbd-btn');
    if (testSabBtn) {
      testSabBtn.addEventListener('click', () => this.testDownloaderConnection('sabnzbd'));
    }

    const copySabDiagnosticsBtn = document.getElementById('copy-sabnzbd-diagnostics-btn');
    if (copySabDiagnosticsBtn) {
      copySabDiagnosticsBtn.addEventListener('click', () => this.copySabnzbdDiagnostics());
    }

    const testNzbGetBtn = document.getElementById('test-nzbget-btn');
    if (testNzbGetBtn) {
      testNzbGetBtn.addEventListener('click', () => this.testDownloaderConnection('nzbget'));
    }

    const saveDownloaderSettingsBtn = document.getElementById('save-downloader-settings-btn');
    if (saveDownloaderSettingsBtn) {
      saveDownloaderSettingsBtn.addEventListener('click', () => this.saveDownloaderSettings());
    }

    const refreshQueueReloadBtn = document.getElementById('refresh-queue-reload-btn');
    if (refreshQueueReloadBtn) {
      refreshQueueReloadBtn.addEventListener('click', () => this.loadRefreshQueuePanel());
    }

    const fanartApiKeyInput = document.getElementById('fanart-api-key');
    if (fanartApiKeyInput) {
      fanartApiKeyInput.addEventListener('input', () => this.updateFanartFeatureAvailability());
    }

    const preferredDownloaderSelect = document.getElementById('downloader-preferred');
    if (preferredDownloaderSelect) {
      preferredDownloaderSelect.addEventListener('change', () => this.updateDownloaderSettingsVisibility());
    }

    const sabDiagnosticsFields = [
      'sabnzbd-host',
      'sabnzbd-port',
      'sabnzbd-base-path',
      'sabnzbd-nzb-key',
      'sabnzbd-full-api-key',
      'sabnzbd-username',
      'sabnzbd-password',
      'sabnzbd-ssl'
    ];
    sabDiagnosticsFields.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const refreshDiagnostics = () => this.updateSabnzbdDiagnosticsPanel();
      el.addEventListener('input', refreshDiagnostics);
      el.addEventListener('change', refreshDiagnostics);
    });

    // Upload NNTP "same as download" toggle
    const uploadNntpSameAsDownload = document.getElementById('upload-nntp-same-as-download');
    if (uploadNntpSameAsDownload) {
      uploadNntpSameAsDownload.addEventListener('change', () => this.updateUploadNntpVisibility());
    }

    // Load settings from database
    this.loadSettingsFromDB();
  }

  updateDownloaderSettingsVisibility() {
    const preferred = document.getElementById('downloader-preferred')?.value || 'sabnzbd';
    const sabPanel = document.getElementById('sabnzbd-settings-panel');
    const nzbgetPanel = document.getElementById('nzbget-settings-panel');

    if (sabPanel) {
      sabPanel.classList.toggle('hidden', preferred !== 'sabnzbd');
    }

    if (nzbgetPanel) {
      nzbgetPanel.classList.toggle('hidden', preferred !== 'nzbget');
    }
  }

  updateRefreshCleanupSettingsVisibility() {
    const action = document.getElementById('refresh-cleanup-action')?.value || 'delete';
    const moveGroup = document.getElementById('refresh-cleanup-move-group');
    const moveInput = document.getElementById('refresh-cleanup-move-path');
    const moveBrowse = document.getElementById('refresh-cleanup-move-path-browse');
    const isMove = action === 'move';

    if (moveGroup) {
      moveGroup.classList.toggle('hidden', !isMove);
    }
    if (moveInput) {
      moveInput.disabled = !isMove;
    }
    if (moveBrowse) {
      moveBrowse.disabled = !isMove;
    }
  }

  normalizeSabnzbdPath(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
  }

  parseSabnzbdHostInput(settings = this.collectDownloaderSettingsFromForm()) {
    const rawHost = String(settings.sabnzbd_host || '').trim() || 'localhost';
    const explicitProtocol = settings.sabnzbd_ssl === '1' ? 'https' : 'http';
    const explicitPort = String(settings.sabnzbd_port || '').trim();
    const explicitBasePath = this.normalizeSabnzbdPath(settings.sabnzbd_base_path || '');
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawHost);
    const urlLike = hasScheme || rawHost.includes('/');
    const url = new URL(hasScheme ? rawHost : `http://${rawHost}`);
    const portMatch = rawHost.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:\[[^\]]+\]|[^/:]+)(?::(\d+))?(?:\/|$)/i);

    const host = url.hostname || 'localhost';
    const urlPort = url.port || '';
    const rawPort = portMatch && portMatch[1] ? portMatch[1] : '';
    const urlPath = url.pathname && url.pathname !== '/' ? this.normalizeSabnzbdPath(url.pathname) : '';
    const inferredProtocol = hasScheme ? url.protocol.replace(':', '') : explicitProtocol;

    return {
      protocol: inferredProtocol || explicitProtocol,
      host,
      port: urlLike
        ? (rawPort || urlPort || explicitPort || (inferredProtocol === 'https' ? '443' : '8080'))
        : (explicitPort || urlPort || (inferredProtocol === 'https' ? '443' : '8080')),
      basePath: urlLike ? (urlPath || explicitBasePath) : (explicitBasePath || urlPath)
    };
  }

  buildSabnzbdDiagnostics(settings = this.collectDownloaderSettingsFromForm(), result = null) {
    const endpoint = this.parseSabnzbdHostInput(settings);
    const apiBases = result?.diagnostics?.apiBases || [
      `${endpoint.protocol}://${endpoint.host}:${endpoint.port}${endpoint.basePath || ''}/api`
    ];
    const keySource = settings.sabnzbd_nzb_key
      ? 'NZB Key'
      : (settings.sabnzbd_full_api_key || settings.sabnzbd_api_key)
        ? 'Full API Key'
        : 'None';
    const authMode = settings.sabnzbd_username && settings.sabnzbd_password ? 'Basic Auth' : 'None';
    const endpointText = `${endpoint.protocol}://${endpoint.host}:${endpoint.port}${endpoint.basePath || ''}`;

    return {
      endpointText,
      keySource,
      authMode,
      apiBases,
      lastTestText: result
        ? `${result.access === 'full' ? 'Full API' : result.access === 'send' ? 'Send-only key' : result.access === 'reachable' ? 'Host reachable' : result.access === 'error' ? 'Connection failed' : 'Test result'}${result.apiBase ? ` via ${result.apiBase}` : ''}${result.note ? ` • ${result.note}` : ''}`
        : 'No test run yet'
    };
  }

  updateSabnzbdDiagnosticsPanel(result = null) {
    const diagnostics = this.buildSabnzbdDiagnostics(this.collectDownloaderSettingsFromForm(), result);

    const endpointEl = document.getElementById('sabnzbd-diagnostic-endpoint');
    const keySourceEl = document.getElementById('sabnzbd-diagnostic-key-source');
    const authModeEl = document.getElementById('sabnzbd-diagnostic-auth-mode');
    const apiBasesEl = document.getElementById('sabnzbd-diagnostic-api-bases');
    const lastTestEl = document.getElementById('sabnzbd-diagnostic-last-test');
    const copyBtn = document.getElementById('copy-sabnzbd-diagnostics-btn');

    if (endpointEl) endpointEl.textContent = diagnostics.endpointText;
    if (keySourceEl) keySourceEl.textContent = diagnostics.keySource;
    if (authModeEl) authModeEl.textContent = diagnostics.authMode;
    if (apiBasesEl) apiBasesEl.textContent = diagnostics.apiBases.join(', ');
    if (lastTestEl) lastTestEl.textContent = diagnostics.lastTestText;

    if (copyBtn) {
      copyBtn.dataset.summary = [
        `Endpoint: ${diagnostics.endpointText}`,
        `Key source: ${diagnostics.keySource}`,
        `Auth mode: ${diagnostics.authMode}`,
        `API candidates: ${diagnostics.apiBases.join(', ')}`,
        `Last test: ${diagnostics.lastTestText}`
      ].join('\n');
    }
  }

  async copySabnzbdDiagnostics() {
    const copyBtn = document.getElementById('copy-sabnzbd-diagnostics-btn');
    const summary = copyBtn?.dataset?.summary || '';
    if (!summary) {
      this.showNotification('No SABnzbd diagnostics available yet.', 'warning');
      return;
    }

    try {
      await window.electron.copyToClipboard(summary);
      this.showNotification('SABnzbd diagnostics copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy SABnzbd diagnostics:', error);
      this.showNotification('Failed to copy SABnzbd diagnostics', 'error');
    }
  }

  isSabnzbdConfigured(settings = this.collectDownloaderSettingsFromForm()) {
    return Boolean(
      settings.sabnzbd_host &&
      (settings.sabnzbd_nzb_key || settings.sabnzbd_api_key || settings.sabnzbd_full_api_key)
    );
  }

  isNzbGetConfigured(settings = this.collectDownloaderSettingsFromForm()) {
    return Boolean(settings.nzbget_host && settings.nzbget_username && settings.nzbget_password);
  }

  updateReleaseDetailDownloaderButtons(settings = this.collectDownloaderSettingsFromForm()) {
    const sendSabBtn = document.getElementById('release-send-sab-btn');
    const sendNzbGetBtn = document.getElementById('release-send-nzbget-btn');
    const canSend = this.canUseFeature('send_to_downloader');
    const lockedMessage = this.getFeatureUnavailableMessage('send_to_downloader');

    if (sendSabBtn) {
      const configured = this.isSabnzbdConfigured(settings);
      sendSabBtn.classList.toggle('hidden', !configured);
      sendSabBtn.disabled = configured ? !canSend : false;
      sendSabBtn.title = configured && !canSend ? lockedMessage : '';
    }

    if (sendNzbGetBtn) {
      const configured = this.isNzbGetConfigured(settings);
      sendNzbGetBtn.classList.toggle('hidden', !configured);
      sendNzbGetBtn.disabled = configured ? !canSend : false;
      sendNzbGetBtn.title = configured && !canSend ? lockedMessage : '';
    }
  }

  updateHomeWelcomeVisibility(settings = null) {
    const intro = document.querySelector('.home-lobby-intro');
    if (!intro) return;

    const showWelcome = settings
      ? settings.ui_show_welcome_message !== '0'
      : document.getElementById('ui-show-welcome-message')?.checked !== false;

    intro.classList.toggle('hidden', !showWelcome);
  }

  getHomeSectionVisibility(settings = null) {
    if (settings) {
      return {
        showWelcome: settings.ui_show_welcome_message !== '0',
        showHero: settings.ui_show_hero_slider !== '0',
        showMovies: settings.ui_show_featured_movies !== '0',
        showSeries: settings.ui_show_featured_series !== '0',
        showGrandVault: settings.ui_show_grand_vault !== '0',
        showAtAGlance: settings.ui_show_at_a_glance !== '0',
        showFreshlyPolished: settings.ui_show_freshly_polished !== '0'
      };
    }

    return {
      showWelcome: document.getElementById('ui-show-welcome-message')?.checked !== false,
      showHero: document.getElementById('ui-show-hero-slider')?.checked !== false,
      showMovies: document.getElementById('ui-show-featured-movies')?.checked !== false,
      showSeries: document.getElementById('ui-show-featured-series')?.checked !== false,
      showGrandVault: document.getElementById('ui-show-grand-vault')?.checked !== false,
      showAtAGlance: document.getElementById('ui-show-at-a-glance')?.checked !== false,
      showFreshlyPolished: document.getElementById('ui-show-freshly-polished')?.checked !== false
    };
  }

  updateHomeSectionVisibility(settings = null) {
    const visibility = this.getHomeSectionVisibility(settings);
    const hero = document.getElementById('hero-slider');
    const movies = document.getElementById('carousel-movies');
    const series = document.getElementById('carousel-tv');
    const grandVault = document.querySelector('.home-spotlight-section');
    const atAGlance = document.querySelector('.home-concierge-section');
    const freshlyPolished = document.querySelector('.home-refresh-section');

    this.updateHomeWelcomeVisibility(settings);
    hero?.classList.toggle('hidden', !visibility.showHero);
    movies?.classList.toggle('hidden', !visibility.showMovies);
    series?.classList.toggle('hidden', !visibility.showSeries);
    grandVault?.classList.toggle('hidden', !visibility.showGrandVault);
    atAGlance?.classList.toggle('hidden', !visibility.showAtAGlance);
    freshlyPolished?.classList.toggle('hidden', !visibility.showFreshlyPolished);

    const line = document.getElementById('hero-timer-line');
    if (!visibility.showHero) {
      this.stopHeroSlider();
    } else if (this.heroSliderData.length > 1 && !this.heroSliderInterval) {
      this.startHeroSlider();
    }

    return visibility;
  }

  updateUploadNntpVisibility() {
    const sameAsDownload = document.getElementById('upload-nntp-same-as-download')?.checked || false;
    const fields = [
      'upload-nntp-server',
      'upload-nntp-port',
      'upload-nntp-username',
      'upload-nntp-password',
      'upload-nntp-connections'
    ];

    for (const id of fields) {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = sameAsDownload;
        el.parentElement?.classList?.toggle('disabled', sameAsDownload);
        el.style.opacity = sameAsDownload ? '0.4' : '1';
      }
    }
  }

  normalizeAutoRefreshNewsgroups(value) {
    const groups = String(value || '')
      .split(/[\n,]+/)
      .map(group => group.trim())
      .filter(Boolean);

    const unique = [];
    for (const group of groups) {
      if (!unique.includes(group)) {
        unique.push(group);
      }
    }

    return unique.slice(0, 3);
  }

  countAutoRefreshNewsgroups(value) {
    const groups = String(value || '')
      .split(/[\n,]+/)
      .map(group => group.trim())
      .filter(Boolean);

    return new Set(groups).size;
  }

  collectPreparationFolderSettings() {
    return {
      pipeline_movies_folder: document.getElementById('pipeline-movies-folder')?.value?.trim() || '',
      pipeline_tv_folder: document.getElementById('pipeline-tv-folder')?.value?.trim() || ''
    };
  }

  collectDownloaderSettingsFromForm() {
    return {
      downloader_preferred: document.getElementById('downloader-preferred').value,
      sabnzbd_host: document.getElementById('sabnzbd-host').value.trim(),
      sabnzbd_port: document.getElementById('sabnzbd-port').value,
      sabnzbd_ssl: document.getElementById('sabnzbd-ssl').checked ? '1' : '0',
      sabnzbd_base_path: document.getElementById('sabnzbd-base-path').value.trim(),
      sabnzbd_nzb_key: document.getElementById('sabnzbd-nzb-key').value,
      sabnzbd_full_api_key: document.getElementById('sabnzbd-full-api-key').value,
      sabnzbd_api_key: document.getElementById('sabnzbd-full-api-key').value,
      sabnzbd_username: document.getElementById('sabnzbd-username').value.trim(),
      sabnzbd_password: document.getElementById('sabnzbd-password').value,
      sabnzbd_category: document.getElementById('sabnzbd-category').value.trim(),
      sabnzbd_priority: document.getElementById('sabnzbd-priority').value,
      sabnzbd_completed_path: document.getElementById('sabnzbd-completed-path').value.trim(),
      nzbget_host: document.getElementById('nzbget-host').value.trim(),
      nzbget_port: document.getElementById('nzbget-port').value,
      nzbget_ssl: document.getElementById('nzbget-ssl').checked ? '1' : '0',
      nzbget_username: document.getElementById('nzbget-username').value.trim(),
      nzbget_password: document.getElementById('nzbget-password').value,
      nzbget_category: document.getElementById('nzbget-category').value.trim(),
      nzbget_priority: document.getElementById('nzbget-priority').value
    };
  }

  hasFanartApiKey(settings = null) {
    if (settings && typeof settings.api_fanart_key !== 'undefined') {
      return Boolean(String(settings.api_fanart_key || '').trim());
    }

    return Boolean(document.getElementById('fanart-api-key')?.value?.trim());
  }

  updateFanartFeatureAvailability(settings = null) {
    const hasFanartKey = this.hasFanartApiKey(settings);
    const hasFanartAccess = this.canUseFeature('fanart_artwork');
    const fanartButtons = [
      { id: 'edit-mi-fanart-cover-btn', label: 'cover' },
      { id: 'edit-mi-fanart-backdrop-btn', label: 'backdrop' },
      { id: 'edit-mi-fanart-logo-btn', label: 'logo' }
    ];

    fanartButtons.forEach(({ id, label }) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.disabled = false;
      button.title = !hasFanartAccess
        ? this.getFeatureUnavailableMessage('fanart_artwork')
        : hasFanartKey
          ? `Browse ${label} artwork from Fanart.tv`
          : 'Add a Fanart API key in Settings to enable Fanart.tv artwork';
      button.classList.toggle('feature-unavailable', !hasFanartAccess || !hasFanartKey);
    });

    const hint = document.getElementById('edit-mi-fanart-hint');
    if (hint) {
      hint.textContent = !hasFanartAccess
        ? 'Fanart.tv artwork is available.'
        : hasFanartKey
          ? 'Fanart.tv artwork is available for cover, backdrop, and logo.'
          : 'Fanart.tv artwork requires a Fanart API key in Settings.';
    }
  }

  async saveSettings() {
    const autoRefreshNewsgroupValue = document.getElementById('auto-refresh-newsgroup').value;
    const autoRefreshGroups = this.normalizeAutoRefreshNewsgroups(autoRefreshNewsgroupValue);

    if (this.countAutoRefreshNewsgroups(autoRefreshNewsgroupValue) > 3) {
      this.showNotification('Auto Refresh supports a maximum of 3 newsgroups.', 'warning');
      return;
    }

    if (autoRefreshNewsgroupValue.trim() && autoRefreshGroups.length === 0) {
      this.showNotification('Please enter at least one valid Auto Refresh newsgroup.', 'warning');
      return;
    }

    const refreshCleanupAction = document.getElementById('refresh-cleanup-action').value || 'delete';
    const refreshCleanupMovePath = document.getElementById('refresh-cleanup-move-path').value.trim();
    if (refreshCleanupAction === 'move' && !refreshCleanupMovePath) {
      this.showNotification('Choose a move destination for completed refresh downloads.', 'warning');
      return;
    }

    const settings = {
      // NNTP (Download)
      nntp_server: document.getElementById('nntp-server').value,
      nntp_port: document.getElementById('nntp-port').value,
      nntp_username: document.getElementById('nntp-username').value,
      nntp_password: document.getElementById('nntp-password').value,
      nntp_ssl: document.getElementById('nntp-ssl').checked ? '1' : '0',
      nntp_connections: document.getElementById('nntp-connections').value || '5',
      // NNTP (Upload)
      upload_nntp_server: document.getElementById('upload-nntp-server').value,
      upload_nntp_port: document.getElementById('upload-nntp-port').value || '563',
      upload_nntp_username: document.getElementById('upload-nntp-username').value,
      upload_nntp_password: document.getElementById('upload-nntp-password').value,
      upload_nntp_ssl: document.getElementById('upload-nntp-ssl').checked ? '1' : '0',
      upload_nntp_connections: document.getElementById('upload-nntp-connections').value || '5',
      upload_nntp_same_as_download: document.getElementById('upload-nntp-same-as-download').checked ? '1' : '0',
      // Upload performance settings
      upload_article_size: document.getElementById('upload-article-size').value || '716800',
      upload_retry_count: document.getElementById('upload-retry-count').value || '10',
      upload_thread_count: document.getElementById('upload-thread-count').value || '8',
      ...this.collectDownloaderSettingsFromForm(),
      // API Keys
      api_tmdb_key: document.getElementById('tmdb-api-key').value,
      api_fanart_key: document.getElementById('fanart-api-key').value,
      easynews_username: document.getElementById('easynews-username').value.trim(),
      easynews_password: document.getElementById('easynews-password').value,
      ...this.collectPreparationFolderSettings(),
      download_path: document.getElementById('download-path').value,
      nzbStoragePath: document.getElementById('nzb-storage-path').value.trim(),
      download_max_concurrent: document.getElementById('max-concurrent').value,
      archive_work_path: document.getElementById('archive-work-path').value,
      archive_password: document.getElementById('archive-password').value,
      archive_keep_temp_files: document.getElementById('archive-keep-temp-files').checked ? '1' : '0',
      reanalyze_download_mb: document.getElementById('reanalyze-download-mb').value || '50',
      ngpost_path: document.getElementById('ngpost-path').value.trim(),
      archive_delete_old_revision_after_success: document.getElementById('archive-delete-old-revision-after-success').checked ? '1' : '0',
      // Auto Refresh
      auto_refresh_enabled: document.getElementById('auto-refresh-enabled').checked ? '1' : '0',
      auto_refresh_age_threshold: document.getElementById('auto-refresh-age-threshold').value || '1',
      auto_refresh_interval: document.getElementById('auto-refresh-interval').value || 'weekly',
      auto_refresh_mode: document.getElementById('auto-refresh-mode').value || 'replace',
      auto_refresh_newsgroup: autoRefreshGroups.join(', '),
      auto_refresh_poster: document.getElementById('auto-refresh-poster').value.trim(),
      auto_refresh_notify: document.getElementById('auto-refresh-notify').checked ? '1' : '0',
      // Refresh Category
      refresh_sabnzbd_category: document.getElementById('refresh-sabnzbd-category').value.trim() || 'nzbarr-refresh',
      refresh_completed_path: document.getElementById('refresh-completed-path').value.trim(),
      refresh_cleanup_action: refreshCleanupAction,
      refresh_cleanup_move_path: refreshCleanupMovePath,
      // Player
      player_external: document.getElementById('external-player').value,
      player_auto_open: '0',
      player_resume_playback: '1',
      // UI
      ui_language: 'en',
      ui_theme: 'dark',
      ui_items_per_page: '30',
      ui_default_view: 'cover',
      ui_show_release_counts: '1',
      ui_show_welcome_message: document.getElementById('ui-show-welcome-message').checked ? '1' : '0',
      ui_show_hero_slider: document.getElementById('ui-show-hero-slider').checked ? '1' : '0',
      ui_show_featured_movies: document.getElementById('ui-show-featured-movies').checked ? '1' : '0',
      ui_show_featured_series: document.getElementById('ui-show-featured-series').checked ? '1' : '0',
      ui_show_grand_vault: document.getElementById('ui-show-grand-vault').checked ? '1' : '0',
      ui_show_at_a_glance: document.getElementById('ui-show-at-a-glance').checked ? '1' : '0',
      ui_show_freshly_polished: document.getElementById('ui-show-freshly-polished').checked ? '1' : '0',
      ui_browse_items: document.getElementById('ui-browse-items').value,
      ui_library_items: document.getElementById('ui-library-items').value,
      ui_library_cover_size: document.getElementById('ui-library-cover-size').value,
      // Release Groups
      release_groups: document.getElementById('release-groups').value
    };

    try {
      const result = await window.electron.saveSettings(settings);
      this.updateReleaseDetailDownloaderButtons(settings);
      this.updateHomeSectionVisibility(settings);
      this.updateFanartFeatureAvailability(settings);
      this.showNotification('✓ Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  async saveDownloaderSettings() {
    try {
      const settings = this.collectDownloaderSettingsFromForm();
      await window.electron.saveSettings(settings);
      this.updateReleaseDetailDownloaderButtons(settings);
      this.showNotification('Downloader settings saved', 'success');
    } catch (error) {
      console.error('Failed to save downloader settings:', error);
      this.showNotification('Failed to save downloader settings', 'error');
    }
  }

  // Save UI settings only (without showing notification)
  async saveUISettings() {
    try {
      const settings = {
        ui_browse_items: document.getElementById('ui-browse-items').value,
        ui_library_items: document.getElementById('ui-library-items').value,
        ui_library_cover_size: document.getElementById('ui-library-cover-size').value,
      };
      await window.electron.saveSettings(settings);
    } catch (error) {
      console.error('Failed to save UI settings:', error);
    }
  }

  async loadSettingsFromDB() {
    try {
      const allSettings = await window.electron.getAllSettings();
      
      // NNTP Settings (Download)
      document.getElementById('nntp-server').value = allSettings.nntp_server || '';
      document.getElementById('nntp-port').value = allSettings.nntp_port || '563';
      document.getElementById('nntp-username').value = allSettings.nntp_username || '';
      document.getElementById('nntp-password').value = allSettings.nntp_password || '';
      document.getElementById('nntp-ssl').checked = allSettings.nntp_ssl === '1';
      document.getElementById('nntp-connections').value = allSettings.nntp_connections || '5';

      // NNTP Settings (Upload)
      document.getElementById('upload-nntp-server').value = allSettings.upload_nntp_server || '';
      document.getElementById('upload-nntp-port').value = allSettings.upload_nntp_port || '563';
      document.getElementById('upload-nntp-username').value = allSettings.upload_nntp_username || '';
      document.getElementById('upload-nntp-password').value = allSettings.upload_nntp_password || '';
      document.getElementById('upload-nntp-ssl').checked = allSettings.upload_nntp_ssl === '1';
      document.getElementById('upload-nntp-connections').value = allSettings.upload_nntp_connections || '5';
      document.getElementById('upload-nntp-same-as-download').checked = allSettings.upload_nntp_same_as_download === '1';

      // Upload performance
      document.getElementById('upload-article-size').value = allSettings.upload_article_size || '716800';
      document.getElementById('upload-retry-count').value = allSettings.upload_retry_count || '10';
      document.getElementById('upload-thread-count').value = allSettings.upload_thread_count || '8';

      document.getElementById('downloader-preferred').value = allSettings.downloader_preferred || 'sabnzbd';
      document.getElementById('sabnzbd-host').value = allSettings.sabnzbd_host || '';
      document.getElementById('sabnzbd-port').value = allSettings.sabnzbd_port || '8080';
      document.getElementById('sabnzbd-ssl').checked = allSettings.sabnzbd_ssl === '1';
      document.getElementById('sabnzbd-base-path').value = allSettings.sabnzbd_base_path || '/sabnzbd';
      document.getElementById('sabnzbd-nzb-key').value = allSettings.sabnzbd_nzb_key || '';
      document.getElementById('sabnzbd-full-api-key').value = allSettings.sabnzbd_full_api_key || allSettings.sabnzbd_api_key || '';
      document.getElementById('sabnzbd-username').value = allSettings.sabnzbd_username || '';
      document.getElementById('sabnzbd-password').value = allSettings.sabnzbd_password || '';
      document.getElementById('sabnzbd-category').value = allSettings.sabnzbd_category || '';
      document.getElementById('sabnzbd-priority').value = allSettings.sabnzbd_priority || '0';
      document.getElementById('sabnzbd-completed-path').value = allSettings.sabnzbd_completed_path || '';
      document.getElementById('nzbget-host').value = allSettings.nzbget_host || '';
      document.getElementById('nzbget-port').value = allSettings.nzbget_port || '6789';
      document.getElementById('nzbget-ssl').checked = allSettings.nzbget_ssl === '1';
      document.getElementById('nzbget-username').value = allSettings.nzbget_username || '';
      document.getElementById('nzbget-password').value = allSettings.nzbget_password || '';
      document.getElementById('nzbget-category').value = allSettings.nzbget_category || '';
      document.getElementById('nzbget-priority').value = allSettings.nzbget_priority || '0';
      this.updateDownloaderSettingsVisibility();
      this.updateReleaseDetailDownloaderButtons(allSettings);
      this.updateSabnzbdDiagnosticsPanel();
      document.getElementById('ui-show-welcome-message').checked = allSettings.ui_show_welcome_message !== '0';
      document.getElementById('ui-show-hero-slider').checked = allSettings.ui_show_hero_slider !== '0';
      document.getElementById('ui-show-featured-movies').checked = allSettings.ui_show_featured_movies !== '0';
      document.getElementById('ui-show-featured-series').checked = allSettings.ui_show_featured_series !== '0';
      document.getElementById('ui-show-grand-vault').checked = allSettings.ui_show_grand_vault !== '0';
      document.getElementById('ui-show-at-a-glance').checked = allSettings.ui_show_at_a_glance !== '0';
      document.getElementById('ui-show-freshly-polished').checked = allSettings.ui_show_freshly_polished !== '0';
      this.updateHomeSectionVisibility(allSettings);
      
      // API Keys
      document.getElementById('tmdb-api-key').value = allSettings.api_tmdb_key || '';
      document.getElementById('fanart-api-key').value = allSettings.api_fanart_key || '';
      document.getElementById('easynews-username').value = allSettings.easynews_username || '';
      document.getElementById('easynews-password').value = allSettings.easynews_password || '';
      document.getElementById('pipeline-movies-folder').value = allSettings.pipeline_movies_folder || '';
      document.getElementById('pipeline-tv-folder').value = allSettings.pipeline_tv_folder || '';
      this.updateFanartFeatureAvailability(allSettings);
      document.getElementById('download-path').value = allSettings.download_path || '';
      document.getElementById('nzb-storage-path').value = allSettings.nzbStoragePath || '';
      document.getElementById('max-concurrent').value = allSettings.download_max_concurrent || '3';
      document.getElementById('archive-work-path').value = allSettings.archive_work_path || '';
      document.getElementById('archive-password').value = allSettings.archive_password || '';
      document.getElementById('archive-keep-temp-files').checked = allSettings.archive_keep_temp_files === '1';
      document.getElementById('reanalyze-download-mb').value = allSettings.reanalyze_download_mb || '50';
      document.getElementById('ngpost-path').value = allSettings.ngpost_path || '';
      document.getElementById('archive-delete-old-revision-after-success').checked = allSettings.archive_delete_old_revision_after_success === '1';

      // Auto Refresh
      document.getElementById('auto-refresh-enabled').checked = allSettings.auto_refresh_enabled === '1';
      document.getElementById('auto-refresh-age-threshold').value = allSettings.auto_refresh_age_threshold || '1';
      document.getElementById('auto-refresh-interval').value = allSettings.auto_refresh_interval || 'weekly';
      document.getElementById('auto-refresh-mode').value = allSettings.auto_refresh_mode || 'replace';
      document.getElementById('auto-refresh-newsgroup').value = allSettings.auto_refresh_newsgroup || '';
      document.getElementById('auto-refresh-poster').value = allSettings.auto_refresh_poster || '';
      document.getElementById('auto-refresh-notify').checked = allSettings.auto_refresh_notify === '1';
      this.loadRefreshQueuePanel().catch(error => {
        console.error('Failed to load refresh queue panel:', error);
      });

      // Refresh Category
      document.getElementById('refresh-sabnzbd-category').value = allSettings.refresh_sabnzbd_category || 'nzbarr-refresh';
      document.getElementById('refresh-completed-path').value = allSettings.refresh_completed_path || '';
      document.getElementById('refresh-cleanup-action').value = allSettings.refresh_cleanup_action === 'move' ? 'move' : 'delete';
      document.getElementById('refresh-cleanup-move-path').value = allSettings.refresh_cleanup_move_path || '';
      this.updateRefreshCleanupSettingsVisibility();

      // Player
      document.getElementById('external-player').value = allSettings.player_external || '';

      // Release Groups
      document.getElementById('release-groups').value = allSettings.release_groups || '';

      // UI Settings
      document.getElementById('ui-browse-items').value = allSettings.ui_browse_items || '50';
      document.getElementById('ui-library-items').value = allSettings.ui_library_items || '50';
      document.getElementById('ui-library-cover-size').value = allSettings.ui_library_cover_size || 'medium';

      // Apply browse items per page setting
      this.browsePageSize = this.validateItemsPerPage(allSettings.ui_browse_items) || 50;
      this.libraryPageSize = this.validateItemsPerPage(allSettings.ui_library_items) || 50;
      
      // Apply library cover size
      this.applyCoverSize(allSettings.ui_library_cover_size || 'medium');

      // Apply upload NNTP visibility based on "same as download" checkbox
      this.updateUploadNntpVisibility();

      // Always start with settings sections collapsed
      document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('expanded');
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadRefreshQueuePanel() {
    const summaryEl = document.getElementById('refresh-queue-summary');
    const activeEl = document.getElementById('refresh-queue-active');
    const listEl = document.getElementById('refresh-queue-list');

    if (!summaryEl || !activeEl || !listEl) return;

    summaryEl.textContent = 'Loading queue...';
    activeEl.innerHTML = '';
    listEl.innerHTML = '';

    try {
      const [queuedResult, activeJobs] = await Promise.all([
        window.electron.getQueuedAutoRefreshes(),
        window.electron.getAutoRefreshActiveJobs()
      ]);

      const queued = Array.isArray(queuedResult?.queued) ? queuedResult.queued : [];
      const active = Array.isArray(activeJobs)
        ? activeJobs.filter(job => !['complete', 'failed', 'cancelled'].includes(String(job.status || '').toLowerCase()))
        : [];

      summaryEl.textContent = `${queued.length} queued${active.length > 0 ? `, ${active.length} running` : ''}`;

      if (active.length > 0) {
        activeEl.innerHTML = active.map(job => `
          <div class="refresh-queue-row running">
            <div>
              <strong>${this.escapeHtml(job.releaseName || `Release ${job.releaseId}`)}</strong>
              <span>${this.escapeHtml(job.message || job.status || 'Running')}</span>
            </div>
            <em>${Math.round(Number(job.progress) || 0)}%</em>
          </div>
        `).join('');
      } else {
        activeEl.innerHTML = '<div class="refresh-queue-empty">No refresh is running right now.</div>';
      }

      if (queued.length === 0) {
        listEl.innerHTML = '<div class="refresh-queue-empty">No releases are waiting in the queue.</div>';
        return;
      }

      listEl.innerHTML = queued.map((release, index) => `
        <div class="refresh-queue-row">
          <div>
            <strong>${index + 1}. ${this.escapeHtml(release.clean_name || release.search_name || `Release ${release.id}`)}</strong>
            <span>${this.escapeHtml(release.media_type || 'release')}</span>
          </div>
          <em>queued</em>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load refresh queue:', error);
      summaryEl.textContent = 'Queue unavailable';
      listEl.innerHTML = `<div class="refresh-queue-empty">Could not load refresh queue: ${this.escapeHtml(error.message)}</div>`;
    }
  }

  setPreparationPipelineStatus(status, logText = '') {
    const statusEl = document.getElementById('pipeline-run-status');
    const logEl = document.getElementById('pipeline-run-log');
    if (statusEl) statusEl.textContent = status;
    if (logEl && typeof logText === 'string') logEl.value = logText;
  }

  formatPreparationPipelineResult(result) {
    const lines = [];
    const summary = result?.summary || {};
    lines.push(`Folders processed: ${summary.foldersProcessed || 0}`);
    lines.push(`Files scanned: ${summary.filesScanned || 0}`);
    lines.push(`Prepared: ${summary.prepared || 0}`);
    lines.push(`Original titles kept: ${summary.prepared || 0}`);
    lines.push(`Renamed: ${summary.renamed || 0}`);
    lines.push(`Imported: ${summary.imported || 0}`);
    lines.push(`Skipped: ${summary.skipped || 0}`);
    lines.push(`Failed: ${summary.failed || 0}`);
    if ((summary.duplicates || 0) > 0) {
      lines.push(`Duplicates: ${summary.duplicates || 0}`);
    }
    if ((summary.needsImdb || 0) > 0) {
      lines.push(`Needs IMDb: ${summary.needsImdb || 0}`);
    }

    if (Array.isArray(result?.logLines) && result.logLines.length > 0) {
      lines.push('');
      lines.push('Activity');
      lines.push(result.logLines.join('\n'));
    }

    return lines.join('\n');
  }

  async runPreparationPipeline(importAfterPrepare = false) {
    const folderSettings = this.collectPreparationFolderSettings();
    if (!folderSettings.pipeline_movies_folder && !folderSettings.pipeline_tv_folder) {
      this.showNotification('Set at least one Movies or TV preparation folder first.', 'warning');
      return;
    }

    const prepareBtn = document.getElementById('pipeline-prepare-btn');
    const prepareImportBtn = document.getElementById('pipeline-prepare-import-btn');

    if (prepareBtn) prepareBtn.disabled = true;
    if (prepareImportBtn) prepareImportBtn.disabled = true;

    try {
      await window.electron.saveSettings(folderSettings);
      this.setPreparationPipelineStatus(
        importAfterPrepare ? 'Running Prepare + Import' : 'Running Prepare',
        'NZBarr is preparing your configured folders...\n'
      );

      const result = await window.electron.runPreparationPipeline({ importAfterPrepare });
      if (!result?.success) {
        throw new Error(result?.error || 'Preparation pipeline failed');
      }

      this.setPreparationPipelineStatus(
        importAfterPrepare ? 'Prepare + Import Completed' : 'Preparation Completed',
        this.formatPreparationPipelineResult(result)
      );

      if (importAfterPrepare) {
        await this.loadHomeCarousels();
      }

      this.showNotification(
        importAfterPrepare ? 'Preparation and import completed' : 'Preparation completed',
        'success'
      );
    } catch (error) {
      console.error('Preparation pipeline failed:', error);
      this.setPreparationPipelineStatus('Preparation Failed', `Error\n${error.message}`);
      this.showNotification(`Preparation failed: ${error.message}`, 'error');
    } finally {
      if (prepareBtn) prepareBtn.disabled = false;
      if (prepareImportBtn) prepareImportBtn.disabled = false;
    }
  }

  canUseFeature(feature) {
    return true;
  }

  hasFullFeatureAccess() {
    return true;
  }

  getFeatureUnavailableMessage(feature) {
    return '';
  }

  requireFeature(feature, message = '') {
    return true;
  }

  setLockedElementState(element, locked, lockedMessage, options = {}) {
    if (!element) return;

    const {
      disable = true,
      hide = false
    } = options;

    if (hide) {
      element.classList.toggle('hidden', !!locked);
    }
    if (disable) {
      element.disabled = !!locked;
    }

    const defaultTitle = element.dataset.defaultTitle ?? element.getAttribute('title') ?? '';
    if (element.dataset.defaultTitle === undefined) {
      element.dataset.defaultTitle = defaultTitle;
    }

    element.title = locked ? lockedMessage : defaultTitle;
    element.classList.toggle('feature-unavailable', !!locked);
  }

  applyFeatureAvailabilityState() {
    [
      'pipeline-prepare-btn',
      'pipeline-prepare-import-btn'
    ].forEach((id) => {
      this.setLockedElementState(
        document.getElementById(id),
        !this.hasFullFeatureAccess(),
        ''
      );
    });

    this.setLockedElementState(
      document.getElementById('edit-movie-info-btn'),
      !this.canUseFeature('edit_media_info'),
      this.getFeatureUnavailableMessage('edit_media_info'),
      { disable: false }
    );

    [
      'edit-movie-info-save-btn',
      'edit-movie-info-fetch-tmdb-btn',
      'edit-mi-search-tmdb-btn',
      'edit-movie-info-delete-btn'
    ].forEach((id) => {
      this.setLockedElementState(
        document.getElementById(id),
        !this.canUseFeature('edit_media_info'),
        this.getFeatureUnavailableMessage('edit_media_info'),
        { disable: false }
      );
    });

    ['cover', 'backdrop', 'logo'].forEach((assetType) => {
      this.setLockedElementState(
        document.getElementById(`edit-mi-upload-${assetType}-btn`),
        !this.canUseFeature('custom_artwork_upload'),
        this.getFeatureUnavailableMessage('custom_artwork_upload'),
        { disable: false }
      );
    });

    [
      'auto-refresh-enabled',
      'auto-refresh-age-threshold',
      'auto-refresh-interval',
      'auto-refresh-mode',
      'auto-refresh-newsgroup',
      'auto-refresh-poster',
      'auto-refresh-notify',
      'refresh-sabnzbd-category',
      'refresh-completed-path'
    ].forEach((id) => {
      this.setLockedElementState(
        document.getElementById(id),
        !this.canUseFeature('auto_refresh'),
        this.getFeatureUnavailableMessage('auto_refresh')
      );
    });

    this.setLockedElementState(
      document.getElementById('release-refresh-btn'),
      !this.canUseFeature('owned_refresh'),
      this.getFeatureUnavailableMessage('owned_refresh')
    );
    this.setLockedElementState(
      document.getElementById('release-queue-refresh-btn'),
      !this.canUseFeature('owned_refresh'),
      this.getFeatureUnavailableMessage('owned_refresh')
    );

    document.querySelectorAll('.action-icon-btn[data-action="send"]').forEach((button) => {
      this.setLockedElementState(
        button,
        !this.canUseFeature('send_to_downloader'),
        this.getFeatureUnavailableMessage('send_to_downloader')
      );
    });

    this.updateReleaseDetailDownloaderButtons();
    this.updateFanartFeatureAvailability();
  }

  // Player
  setupPlayer() {
    const closeBtn = document.getElementById('close-player');
    if (closeBtn) {
      closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.closePlayer();
      });
    }

    document.addEventListener('click', (event) => {
      const closeTarget = event.target?.closest?.('#close-player, [data-close-player]');
      if (!closeTarget) return;
      event.preventDefault();
      event.stopPropagation();
      this.closePlayer();
    }, true);

    const overlay = document.getElementById('player-overlay');
    if (overlay) {
      overlay.addEventListener('click', (event) => {
        const clickedBackdrop = event.target === overlay
          || event.target?.classList?.contains('player-content');
        if (!clickedBackdrop) return;
        event.preventDefault();
        this.closePlayer();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const playerOverlay = document.getElementById('player-overlay');
      if (!playerOverlay || playerOverlay.classList.contains('hidden')) return;
      event.preventDefault();
      this.closePlayer();
    }, true);

    const video = document.getElementById('video-player');
    if (video) {
      video.addEventListener('error', async () => {
        if (!this.currentInternalStreamId || this._internalPlayerFallbackInProgress) return;
        this._internalPlayerFallbackInProgress = true;
        this.showNotification('Internal playback failed. Opening fallback player...', 'warning');
        try {
          const result = await window.electron.playStream(this.currentInternalStreamId);
          if (!result?.success) {
            this.showNotification(`Fallback playback failed: ${result?.error || 'Unknown error'}`, 'error');
          }
        } finally {
          this._internalPlayerFallbackInProgress = false;
        }
      });
    }

    // Release detail close button
    const closeRelease = document.getElementById('close-release-detail');
    if (closeRelease) {
      closeRelease.addEventListener('click', () => this.hideReleaseDetail());
    }

    // Release detail delete button
    const deleteBtn = document.getElementById('release-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteCurrentRelease());
    }

    // Release detail download button
    const downloadBtn = document.getElementById('release-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadRelease());
    }

    const sendSabBtn = document.getElementById('release-send-sab-btn');
    if (sendSabBtn) {
      sendSabBtn.addEventListener('click', () => this.sendCurrentReleaseToDownloader('sabnzbd'));
    }

    const sendNzbGetBtn = document.getElementById('release-send-nzbget-btn');
    if (sendNzbGetBtn) {
      sendNzbGetBtn.addEventListener('click', () => this.sendCurrentReleaseToDownloader('nzbget'));
    }

    // Release detail re-analyze button
    const reanalyzeBtn = document.getElementById('release-reanalyze-btn');
    if (reanalyzeBtn) {
      reanalyzeBtn.addEventListener('click', () => this.reanalyzeRelease());
    }

    const refreshBtn = document.getElementById('release-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshOwnedRelease());
    }

    const queueRefreshBtn = document.getElementById('release-queue-refresh-btn');
    if (queueRefreshBtn) {
      queueRefreshBtn.addEventListener('click', () => this.queueCurrentReleaseForRefresh());
    }

    const saveOwnershipBtn = document.getElementById('release-save-ownership-btn');
    if (saveOwnershipBtn) {
      saveOwnershipBtn.addEventListener('click', () => this.saveOwnedMediaDetails());
    }

    // Release detail edit button
    const editBtn = document.getElementById('release-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.openEditRelease());
    }

    // Edit release modal close button
    const closeEditRelease = document.getElementById('close-edit-release');
    if (closeEditRelease) {
      closeEditRelease.addEventListener('click', () => this.closeEditRelease());
    }

    // Edit release save button
    const saveEditBtn = document.getElementById('edit-release-save-btn');
    if (saveEditBtn) {
      saveEditBtn.addEventListener('click', () => this.saveEditRelease());
    }

    // Edit release cancel button
    const cancelEditBtn = document.getElementById('edit-release-cancel-btn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => this.closeEditRelease());
    }

    // Edit release fetch TMDB button
    const fetchTMDBBtn = document.getElementById('edit-release-fetch-tmdb-btn');
    if (fetchTMDBBtn) {
      fetchTMDBBtn.addEventListener('click', () => this.fetchTMDBForEdit());
    }

    const editMediaType = document.getElementById('edit-media-type');
    if (editMediaType) {
      editMediaType.addEventListener('change', () => {
        this.updateEditReleaseFieldVisibility();
        this.updateEditLinkedMediaSelectedDisplay();
        this.scheduleEditLinkedMediaSearch();
      });
    }

    const editCategoryId = document.getElementById('edit-category-id');
    if (editCategoryId) {
      editCategoryId.addEventListener('change', () => this.updateEditReleaseFieldVisibility());
    }

    const editLinkedMediaSearch = document.getElementById('edit-linked-media-search');
    if (editLinkedMediaSearch) {
      editLinkedMediaSearch.addEventListener('input', () => this.scheduleEditLinkedMediaSearch());
      editLinkedMediaSearch.addEventListener('focus', () => this.scheduleEditLinkedMediaSearch());
      editLinkedMediaSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.clearEditLinkedMediaSearchResults();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          this.performEditLinkedMediaSearch();
        }
      });
    }

    const editTmdbId = document.getElementById('edit-tmdb-id');
    if (editTmdbId) {
      editTmdbId.addEventListener('input', () => {
        this.updateEditReleaseSearchNameIdTags();
        this.updateEditLinkedMediaSelectedDisplay();
      });
    }

    const editImdbId = document.getElementById('edit-imdb-id');
    if (editImdbId) {
      editImdbId.addEventListener('input', () => {
        this.updateEditReleaseSearchNameIdTags();
        this.updateEditLinkedMediaSelectedDisplay();
      });
    }

    // Edit movie/TV info button (on detail page)
    const editMovieInfoBtn = document.getElementById('edit-movie-info-btn');
    if (editMovieInfoBtn) {
      editMovieInfoBtn.addEventListener('click', () => this.openEditMovieInfo());
    }

    // Edit movie/TV info modal close button
    const closeEditMovieInfo = document.getElementById('close-edit-movie-info');
    if (closeEditMovieInfo) {
      closeEditMovieInfo.addEventListener('click', () => this.closeEditMovieInfo());
    }

    // Edit movie/TV info save button
    const saveEditMovieInfoBtn = document.getElementById('edit-movie-info-save-btn');
    if (saveEditMovieInfoBtn) {
      saveEditMovieInfoBtn.addEventListener('click', () => this.saveEditMovieInfo());
    }

    // Edit movie/TV info cancel button
    const cancelEditMovieInfoBtn = document.getElementById('edit-movie-info-cancel-btn');
    if (cancelEditMovieInfoBtn) {
      cancelEditMovieInfoBtn.addEventListener('click', () => this.closeEditMovieInfo());
    }

    // Edit movie/TV info fetch TMDB button
    const fetchTMDBMovieInfoBtn = document.getElementById('edit-movie-info-fetch-tmdb-btn');
    if (fetchTMDBMovieInfoBtn) {
      fetchTMDBMovieInfoBtn.addEventListener('click', () => this.fetchTMDBForEditMovieInfo());
    }

    const uploadCoverBtn = document.getElementById('edit-mi-upload-cover-btn');
    const uploadCoverInput = document.getElementById('edit-mi-cover-file');
    if (uploadCoverBtn && uploadCoverInput) {
      uploadCoverBtn.addEventListener('click', () => {
        if (!this.requireFeature('custom_artwork_upload')) return;
        uploadCoverInput.click();
      });
      uploadCoverInput.addEventListener('change', () => this.uploadEditMovieInfoAsset('cover'));
    }

    const fanartCoverBtn = document.getElementById('edit-mi-fanart-cover-btn');
    if (fanartCoverBtn) {
      fanartCoverBtn.addEventListener('click', () => this.openFanartArtworkPicker('cover'));
    }

    const uploadBackdropBtn = document.getElementById('edit-mi-upload-backdrop-btn');
    const uploadBackdropInput = document.getElementById('edit-mi-backdrop-file');
    if (uploadBackdropBtn && uploadBackdropInput) {
      uploadBackdropBtn.addEventListener('click', () => {
        if (!this.requireFeature('custom_artwork_upload')) return;
        uploadBackdropInput.click();
      });
      uploadBackdropInput.addEventListener('change', () => this.uploadEditMovieInfoAsset('backdrop'));
    }

    const fanartBackdropBtn = document.getElementById('edit-mi-fanart-backdrop-btn');
    if (fanartBackdropBtn) {
      fanartBackdropBtn.addEventListener('click', () => this.openFanartArtworkPicker('backdrop'));
    }

    const uploadLogoBtn = document.getElementById('edit-mi-upload-logo-btn');
    const uploadLogoInput = document.getElementById('edit-mi-logo-file');
    if (uploadLogoBtn && uploadLogoInput) {
      uploadLogoBtn.addEventListener('click', () => {
        if (!this.requireFeature('custom_artwork_upload')) return;
        uploadLogoInput.click();
      });
      uploadLogoInput.addEventListener('change', () => this.uploadEditMovieInfoAsset('logo'));
    }

    const fanartLogoBtn = document.getElementById('edit-mi-fanart-logo-btn');
    if (fanartLogoBtn) {
      fanartLogoBtn.addEventListener('click', () => this.openFanartArtworkPicker('logo'));
    }

    const closeFanartCoverBtn = document.getElementById('close-fanart-cover');
    if (closeFanartCoverBtn) {
      closeFanartCoverBtn.addEventListener('click', () => this.closeFanartCoverPicker());
    }

    // Search & Link TMDB button
    const searchTMDBBtn = document.getElementById('edit-mi-search-tmdb-btn');
    if (searchTMDBBtn) {
      searchTMDBBtn.addEventListener('click', () => this.openTMDBSearchDialog());
    }

    // Close TMDB search dialog
    const closeTMDBSearchBtn = document.getElementById('close-tmdb-search');
    if (closeTMDBSearchBtn) {
      closeTMDBSearchBtn.addEventListener('click', () => this.closeTMDBSearchDialog());
    }

    // TMDB search button
    const tmdbSearchBtn = document.getElementById('tmdb-search-btn');
    if (tmdbSearchBtn) {
      tmdbSearchBtn.addEventListener('click', () => this.performTMDBSearch());
    }

    // TMDB search input enter key
    const tmdbSearchInput = document.getElementById('tmdb-search-input');
    if (tmdbSearchInput) {
      tmdbSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.performTMDBSearch();
      });
    }

    // Delete movie/TV info button
    const deleteMovieInfoBtn = document.getElementById('edit-movie-info-delete-btn');
    if (deleteMovieInfoBtn) {
      deleteMovieInfoBtn.addEventListener('click', () => this.deleteFullMovieInfo());
    }

    // Music info delete button
    const musicInfoDeleteBtn = document.getElementById('music-info-delete-btn');
    if (musicInfoDeleteBtn) {
      musicInfoDeleteBtn.addEventListener('click', () => this.deleteMusicInfo());
    }
  }

  async playStreamInApp(streamId, title = 'Stream') {
    const result = await window.electron.getInternalStreamUrl(streamId);
    if (!result?.success || !result.url) {
      const fallback = await window.electron.playStream(streamId);
      if (!fallback?.success) {
        this.showNotification(`Playback failed: ${fallback?.error || result?.error || 'Unknown error'}`, 'error');
      }
      return;
    }

    this.currentInternalStreamId = streamId;
    this._internalPlayerFallbackInProgress = false;

    const overlay = document.getElementById('player-overlay');
    const video = document.getElementById('video-player');
    const trailerFrame = document.getElementById('trailer-player-frame');
    const titleEl = document.getElementById('player-title');
    if (!overlay || !video) return;

    if (titleEl) titleEl.textContent = title || 'Stream';
    if (trailerFrame) {
      trailerFrame.classList.add('hidden');
      trailerFrame.src = '';
    }
    video.classList.remove('hidden');
    video.pause();
    video.src = result.url;
    video.load();
    overlay.classList.remove('hidden');

    try {
      await video.play();
    } catch (error) {
      // Browsers may block autoplay; controls are visible, so the user can press play.
    }
  }

  playTrailerInApp(url, title = 'Trailer') {
    const overlay = document.getElementById('player-overlay');
    const video = document.getElementById('video-player');
    const trailerFrame = document.getElementById('trailer-player-frame');
    const titleEl = document.getElementById('player-title');
    if (!overlay || !trailerFrame) return;

    this.currentInternalStreamId = null;
    this._internalPlayerFallbackInProgress = false;

    if (titleEl) titleEl.textContent = title || 'Trailer';
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.classList.add('hidden');
    }
    trailerFrame.src = url;
    trailerFrame.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  playTrailer(youtubeId) {
    this.openTrailer(youtubeId);
  }

  playTrailerFromDetails() {
    // Get the current movie's trailer from the displayed item
    if (this.currentDisplayItem && this.currentDisplayItem.youtube_trailer) {
      this.openTrailer(this.currentDisplayItem.youtube_trailer, this.currentDisplayItem.title || 'Trailer');
    }
  }

  closePlayer() {
    this.currentInternalStreamId = null;
    this._internalPlayerFallbackInProgress = false;

    const player = document.getElementById('player-overlay');
    if (player) player.classList.add('hidden');
    const video = document.getElementById('video-player');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.classList.remove('hidden');
    }
    const trailerFrame = document.getElementById('trailer-player-frame');
    if (trailerFrame) {
      trailerFrame.src = '';
      trailerFrame.classList.add('hidden');
    }
  }

  setReleaseSpecValue(elementId, value, formatter = null) {
    const valueEl = document.getElementById(elementId);
    if (!valueEl) return;

    const specItem = valueEl.closest('.spec-item');
    const hasValue = value !== null && value !== undefined && value !== '' && value !== 0;

    if (!hasValue) {
      valueEl.textContent = '';
      if (specItem) specItem.style.display = 'none';
      return;
    }

    valueEl.textContent = formatter ? formatter(value) : String(value);
    if (specItem) specItem.style.display = '';
  }

  sanitizeMediaInfoForDisplay(rawText) {
    if (!rawText) return '';

    return rawText
      .replace(/^(Complete name\s*:\s*)(.+)$/gim, (_, prefix, fullPath) => {
        const normalized = String(fullPath).trim().replace(/[\\/]+$/, '');
        const fileName = normalized.split(/[\\/]/).pop() || normalized;
        return `${prefix}${fileName}`;
      })
      .replace(/^(Folder name\s*:\s*)(.+)$/gim, (_, prefix, fullPath) => {
        const normalized = String(fullPath).trim().replace(/[\\/]+$/, '');
        const folderName = normalized.split(/[\\/]/).pop() || normalized;
        return `${prefix}${folderName}`;
      });
  }

  getDetailYear(item, info = null) {
    if (item?.year) return String(item.year);
    const releaseDate = info?.release_date || item?.release_date || '';
    const year = String(releaseDate).substring(0, 4);
    return /^\d{4}$/.test(year) ? year : '';
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  renderReleaseDetail(release) {
    if (!release) return;

    // Store current release for delete action and follow-up interactions.
    this.currentReleaseDetail = release;

    // Populate header — use search_name (full NZB filename) as primary display
    document.getElementById('release-detail-title').textContent = release.search_name || release.clean_name;

    // Populate specs grid
    this.setReleaseSpecValue('release-resolution', release.resolution);
    this.setReleaseSpecValue('release-video', release.video_codec);
    this.setReleaseSpecValue('release-audio', release.audio_codec);
    this.setReleaseSpecValue('release-channels', release.audio_channels);
    this.setReleaseSpecValue('release-source', release.source);
    this.setReleaseSpecValue('release-format', release.format);
    this.setReleaseSpecValue('release-bit-depth', release.bit_depth);
    this.setReleaseSpecValue('release-hdr-format', release.hdr_format);
    this.setReleaseSpecValue('release-frame-rate', release.frame_rate);
    this.setReleaseSpecValue('release-audio-bitrate', release.audio_bitrate, (value) => this.formatBitrate(value));
    this.setReleaseSpecValue('release-audio-sample-rate', release.audio_sample_rate, (value) => this.formatSampleRate(value));
    this.setReleaseSpecValue('release-aspect-ratio', release.aspect_ratio);
    this.setReleaseSpecValue('release-video-profile', release.video_profile);
    this.setReleaseSpecValue('release-scan-type', release.scan_type);
    this.setReleaseSpecValue('release-chroma', release.chroma_subsampling);
    this.setReleaseSpecValue('release-color-primaries', release.color_primaries);
    this.setReleaseSpecValue('release-overall-bitrate', release.overall_bitrate, (value) => this.formatBitrate(value));
    this.setReleaseSpecValue('release-video-bitrate', release.video_bitrate, (value) => this.formatBitrate(value));
    this.setReleaseSpecValue('release-size', release.size, (value) => this.formatBytes(value));
    this.setReleaseSpecValue('release-parts', release.parts);
    this.setReleaseSpecValue('release-password', release.password);
    this.setReleaseSpecValue('release-subtitles', release.subtitles);
    this.setReleaseSpecValue('release-group', release.release_group);
    this.setReleaseSpecValue('release-postdate', release.post_date, (value) => this.parseStoredTimestamp(value)?.toLocaleDateString() || '—');
    this.setReleaseSpecValue('release-added', release.add_date, (value) => this.parseStoredTimestamp(value)?.toLocaleDateString() || '—');

    // Populate name blocks
    document.getElementById('release-search-name').textContent = release.search_name;
    document.getElementById('release-group-detail').textContent = release.release_group || 'Unknown';
    const refreshStatusText = release.refresh_status || 'idle';
    document.getElementById('release-refresh-status').textContent =
      `Refresh status: ${refreshStatusText}${release.last_refresh_at ? ` • Last run ${this.parseStoredTimestamp(release.last_refresh_at)?.toLocaleString() || release.last_refresh_at}` : ''}${release.last_refresh_error ? ` • Error: ${release.last_refresh_error}` : ''}`;

    const refreshBtn = document.getElementById('release-refresh-btn');
    if (refreshBtn) {
      // Refresh button now works for all releases via SABnzbd-based pipeline
      refreshBtn.disabled = !this.canUseFeature('owned_refresh');
      refreshBtn.title = this.canUseFeature('owned_refresh') ? '' : this.getFeatureUnavailableMessage('owned_refresh');
    }
    const queueRefreshBtn = document.getElementById('release-queue-refresh-btn');
    if (queueRefreshBtn) {
      queueRefreshBtn.disabled = !this.canUseFeature('owned_refresh');
      queueRefreshBtn.title = this.canUseFeature('owned_refresh') ? '' : this.getFeatureUnavailableMessage('owned_refresh');
    }

    this.updateReleaseDetailDownloaderButtons();
    this.applyFeatureAvailabilityState();

    // NFO section
    const nfoSection = document.getElementById('nfo-section');
    if (release.nfo_text) {
      nfoSection.classList.remove('hidden');
      document.getElementById('release-nfo').textContent = release.nfo_text;
    } else {
      nfoSection.classList.add('hidden');
    }

    // MediaInfo section
      const mediainfoSection = document.getElementById('mediainfo-section');
      if (release.mediainfo_raw) {
        mediainfoSection.classList.remove('hidden');
        document.getElementById('release-mediainfo').textContent = this.sanitizeMediaInfoForDisplay(release.mediainfo_raw);
      } else {
        mediainfoSection.classList.add('hidden');
      }

    // Show modal
    document.getElementById('release-detail').classList.remove('hidden');
  }

  async showReleaseDetail(id) {
    try {
      const release = await window.electron.getReleaseById(id);
      if (!release) return;
      this.renderReleaseDetail(release);
    } catch (error) {
      console.error('Failed to load release details:', error);
    }
  }

  mergeAnalysisResultIntoRelease(release, analysisResult) {
    if (!release || !analysisResult) return release;

    return {
      ...release,
      password: analysisResult.password ?? release.password,
      nfo_text: analysisResult.nfoText ?? release.nfo_text,
      mediainfo_raw: analysisResult.mediainfoRaw ?? release.mediainfo_raw,
      resolution: analysisResult.resolution ?? release.resolution,
      video_codec: analysisResult.videoCodec ?? release.video_codec,
      audio_codec: analysisResult.audioCodec ?? release.audio_codec,
      audio_channels: analysisResult.audioChannels ?? release.audio_channels,
      format: analysisResult.format ?? release.format,
      subtitles: analysisResult.subtitles ?? release.subtitles,
      bit_depth: analysisResult.bitDepth ?? release.bit_depth,
      hdr_format: analysisResult.hdrFormat ?? release.hdr_format,
      frame_rate: analysisResult.frameRate ?? release.frame_rate,
      audio_bitrate: analysisResult.audioBitrate ?? release.audio_bitrate,
      audio_sample_rate: analysisResult.audioSampleRate ?? release.audio_sample_rate,
      aspect_ratio: analysisResult.aspectRatio ?? release.aspect_ratio,
      overall_bitrate: analysisResult.overallBitrate ?? release.overall_bitrate,
      video_bitrate: analysisResult.videoBitrate ?? release.video_bitrate,
      video_profile: analysisResult.videoProfile ?? release.video_profile,
      scan_type: analysisResult.scanType ?? release.scan_type,
      chroma_subsampling: analysisResult.chromaSubsampling ?? release.chroma_subsampling,
      color_primaries: analysisResult.colorPrimaries ?? release.color_primaries,
      size: analysisResult.fileSize ?? release.size
    };
  }

  hideReleaseDetail() {
    document.getElementById('release-detail').classList.add('hidden');
    this.currentReleaseDetail = null;
  }

  getReleaseEditFormValues() {
    return {
      search_name: document.getElementById('edit-search-name').value.trim(),
      imdb_id: document.getElementById('edit-imdb-id').value.trim(),
      tmdb_id: document.getElementById('edit-tmdb-id').value.trim(),
      media_type: document.getElementById('edit-media-type').value,
      category_id: document.getElementById('edit-category-id').value.trim(),
      season: document.getElementById('edit-season').value.trim(),
      episode: document.getElementById('edit-episode').value.trim(),
      resolution: document.getElementById('edit-resolution').value,
      video_codec: document.getElementById('edit-video-codec').value,
      audio_codec: document.getElementById('edit-audio-codec').value.trim(),
      audio_channels: document.getElementById('edit-audio-channels').value,
      source: document.getElementById('edit-source').value,
      format: document.getElementById('edit-format').value,
      release_group: document.getElementById('edit-release-group').value.trim(),
      subtitles: document.getElementById('edit-subtitles').value.trim(),
      language: document.getElementById('edit-language').value.trim(),
      password: document.getElementById('edit-password').value.trim(),
      mediainfo_raw: document.getElementById('edit-mediainfo-raw').value
    };
  }

  updateEditReleaseSearchNameIdTags() {
    const searchNameInput = document.getElementById('edit-search-name');
    if (!searchNameInput || searchNameInput.dataset.mixed === '1') return;

    let nextName = searchNameInput.value || '';
    const imdbId = document.getElementById('edit-imdb-id')?.value.trim() || '';
    const tmdbId = document.getElementById('edit-tmdb-id')?.value.trim() || '';

    if (imdbId) {
      nextName = nextName.replace(/imdb-tt\d{7,9}/gi, `imdb-${imdbId}`);
    }

    if (tmdbId) {
      nextName = nextName.replace(/tmdb-\d+/gi, `tmdb-${tmdbId}`);
    }

    if (nextName !== searchNameInput.value) {
      searchNameInput.value = nextName;
    }
  }

  setEditReleaseModalMode(isBatch, count = 1) {
    const titleEl = document.querySelector('#edit-release-overlay h2');
    const saveBtn = document.getElementById('save-edit-release');
    const linkedMediaRow = document.getElementById('edit-linked-media-row');
    if (titleEl) titleEl.textContent = isBatch ? `Batch Edit ${count} Releases` : 'Edit Release';
    if (saveBtn) saveBtn.textContent = isBatch ? 'Apply to Selected' : 'Save Changes';
    if (linkedMediaRow) linkedMediaRow.classList.toggle('hidden', isBatch);
  }

  populateEditReleaseForm(release) {
    const ids = ['search-name', 'imdb-id', 'tmdb-id', 'media-type', 'category-id', 'season', 'episode', 'resolution', 'video-codec', 'audio-codec', 'audio-channels', 'source', 'format', 'release-group', 'subtitles', 'language', 'password', 'mediainfo-raw'];
    for (const id of ids) {
      const input = document.getElementById(`edit-${id}`);
      if (!input) continue;
      input.dataset.originalValue = '';
      input.dataset.mixed = '0';
    }
    document.getElementById('edit-search-name').value = release.search_name || '';
    document.getElementById('edit-imdb-id').value = release.imdb_id || '';
    document.getElementById('edit-tmdb-id').value = release.tmdb_id || '';
    document.getElementById('edit-media-type').value = release.media_type || '';
    document.getElementById('edit-category-id').value = release.category_id ? String(release.category_id) : '';
    document.getElementById('edit-season').value = release.season || '';
    document.getElementById('edit-episode').value = release.episode || '';
    document.getElementById('edit-resolution').value = release.resolution || '';
    document.getElementById('edit-video-codec').value = release.video_codec || '';
    document.getElementById('edit-audio-codec').value = release.audio_codec || '';
    document.getElementById('edit-audio-channels').value = release.audio_channels || '';
    document.getElementById('edit-source').value = release.source || '';
    document.getElementById('edit-format').value = release.format || '';
    document.getElementById('edit-release-group').value = release.release_group || '';
    document.getElementById('edit-subtitles').value = release.subtitles || '';
    document.getElementById('edit-language').value = release.language || '';
    document.getElementById('edit-password').value = release.password || '';
    document.getElementById('edit-mediainfo-raw').value = release.mediainfo_raw || '';
  }

  openEditRelease() {
    const release = this.currentReleaseDetail;
    if (!release) return;

    this.batchEditSelection = null;
    this.populateEditReleaseForm(release);
    this.setEditReleaseModalMode(false);
    this.updateEditReleaseFieldVisibility();
    this.populateEditLinkedMediaControls(release);
    document.getElementById('edit-release-overlay').classList.remove('hidden');
    this.scheduleEditLinkedMediaSearch(true);
  }

  openBatchEditSelected(releases) {
    if (!Array.isArray(releases) || releases.length === 0) return;
    this.batchEditSelection = releases;
    const fields = ['search_name', 'imdb_id', 'tmdb_id', 'media_type', 'category_id', 'season', 'episode', 'resolution', 'video_codec', 'audio_codec', 'audio_channels', 'source', 'format', 'release_group', 'subtitles', 'language', 'password', 'mediainfo_raw'];
    const first = releases[0];
    for (const field of fields) {
      const values = releases.map(r => r?.[field] == null ? '' : String(r[field]));
      const same = values.every(v => v === values[0]);
      const input = document.getElementById(`edit-${field.replace(/_/g, '-')}`);
      if (!input) continue;
      input.value = same ? values[0] : '';
      input.dataset.originalValue = same ? values[0] : '';
      input.dataset.mixed = same ? '0' : '1';
    }
    this.setEditReleaseModalMode(true, releases.length);
    this.updateEditReleaseFieldVisibility();
    this.clearEditLinkedMediaSearchResults();
    document.getElementById('edit-release-overlay').classList.remove('hidden');
  }

  async getSelectedReleasesFromTable(tableEl) {
    const selected = tableEl?.querySelectorAll('.tv-release-check:checked') || [];
    const ids = Array.from(selected).map(c => parseInt(c.dataset.id)).filter(Number.isFinite);
    if (ids.length === 0) return [];

    const releases = [];
    for (const id of ids) {
      try {
        const release = await window.electron.getReleaseById(id);
        if (release) releases.push(release);
      } catch (error) {
        console.error(`Failed to load release ${id} for batch edit:`, error);
      }
    }
    return releases;
  }

  getEditReleaseContentType() {
    const mediaType = document.getElementById('edit-media-type')?.value || '';
    const categoryId = document.getElementById('edit-category-id')?.value || '';

    if (mediaType === 'movie' || mediaType === 'tv') {
      return mediaType;
    }

    if (/^1\d{3}$/.test(categoryId)) return 'movie';
    if (/^2\d{3}$/.test(categoryId)) return 'tv';

    return '';
  }

  updateEditReleaseFieldVisibility() {
    const contentType = this.getEditReleaseContentType();
    const seasonRow = document.getElementById('edit-season-row');
    const episodeRow = document.getElementById('edit-episode-row');
    const seasonInput = document.getElementById('edit-season');
    const episodeInput = document.getElementById('edit-episode');
    const showTvFields = contentType === 'tv';

    if (seasonRow) {
      seasonRow.classList.toggle('hidden', !showTvFields);
    }

    if (episodeRow) {
      episodeRow.classList.toggle('hidden', !showTvFields);
    }

    if (!showTvFields) {
      if (seasonInput) seasonInput.value = '';
      if (episodeInput) episodeInput.value = '';
    }
  }

  clearEditLinkedMediaSearchResults(message = 'Start typing to search for a movie or TV show') {
    const resultsContainer = document.getElementById('edit-linked-media-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = `<div class="tmdb-search-empty">${message}</div>`;
    }
  }

  updateEditLinkedMediaCurrentDisplay() {
    const display = document.getElementById('edit-linked-media-current');
    if (!display) return;

    const selection = this._editLinkedMediaSelection;
    if (!selection) {
      display.classList.add('is-empty');
      display.textContent = 'Current linked media: none';
      return;
    }

    display.classList.remove('is-empty');
    const typeLabel = selection.mediaType === 'tv' ? 'TV show' : 'Movie';
    const pieces = [typeLabel, selection.title || 'Untitled'];
    if (selection.year) pieces.push(`(${selection.year})`);
    if (selection.tmdbId) pieces.push(`TMDB ${selection.tmdbId}`);
    if (selection.imdbId) pieces.push(`IMDB ${selection.imdbId}`);
    display.textContent = `Current linked media: ${pieces.join(' • ')}`;
  }

  getEditLinkedMediaSearchType() {
    const mediaType = document.getElementById('edit-media-type')?.value || '';
    if (mediaType === 'movie' || mediaType === 'tv') return mediaType;
    return '';
  }

  getEditLinkedMediaSelectionSummary(selection = this._editLinkedMediaSelection) {
    if (!selection) {
      const tmdbId = document.getElementById('edit-tmdb-id')?.value.trim() || '';
      const imdbId = document.getElementById('edit-imdb-id')?.value.trim() || '';
      const mediaType = document.getElementById('edit-media-type')?.value || '';
      if (!tmdbId && !imdbId && !mediaType) return '';
      const parts = [];
      if (mediaType) parts.push(mediaType === 'tv' ? 'TV show' : 'Movie');
      if (tmdbId) parts.push(`TMDB ${tmdbId}`);
      if (imdbId) parts.push(`IMDB ${imdbId}`);
      return parts.join(' • ');
    }

    const typeLabel = selection.mediaType === 'tv' ? 'TV show' : 'Movie';
    const parts = [typeLabel, selection.title || 'Untitled'];
    if (selection.year) parts.push(`(${selection.year})`);
    if (selection.tmdbId) parts.push(`TMDB ${selection.tmdbId}`);
    if (selection.imdbId) parts.push(`IMDB ${selection.imdbId}`);
    return parts.join(' • ');
  }

  updateEditLinkedMediaSelectedDisplay(selection = this._editLinkedMediaSelection) {
    const display = document.getElementById('edit-linked-media-selected');
    if (!display) return;

    const summary = this.getEditLinkedMediaSelectionSummary(selection);
    if (!summary) {
      display.style.display = 'none';
      display.textContent = '';
      return;
    }

    display.style.display = 'flex';
    display.textContent = summary;
  }

  populateEditLinkedMediaControls(release) {
    const searchInput = document.getElementById('edit-linked-media-search');
    if (searchInput) {
      searchInput.value = release?.clean_name || release?.search_name || '';
    }

    const tmdbId = release?.tmdb_id || null;
    const imdbId = release?.imdb_id || null;
    const mediaType = release?.media_type || '';
    if (tmdbId || imdbId || mediaType) {
      this._editLinkedMediaSelection = {
        title: release?.search_name || release?.clean_name || 'Current selection',
        tmdbId: tmdbId ? String(tmdbId) : null,
        imdbId: imdbId || null,
        mediaType: mediaType || '',
        year: ''
      };
    } else {
      this._editLinkedMediaSelection = null;
    }

    this.updateEditLinkedMediaCurrentDisplay();
    this.updateEditLinkedMediaSelectedDisplay();
    this.refreshEditLinkedMediaCurrentTitle(release);
  }

  async refreshEditLinkedMediaCurrentTitle(release) {
    if (!release) return;

    const mediaType = release.media_type === 'tv' ? 'tv' : release.media_type === 'movie' ? 'movie' : '';
    const tmdbId = release.tmdb_id ? parseInt(release.tmdb_id, 10) : null;
    const imdbId = release.imdb_id || null;
    if (!mediaType || (!tmdbId && !imdbId)) return;

    try {
      let info = null;
      if (mediaType === 'movie') {
        if (imdbId) info = await window.electron.getMovieInfoByIMDB(imdbId);
        if (!info && tmdbId) info = await window.electron.getMovieInfoByTMDB(tmdbId);
      } else {
        if (imdbId) info = await window.electron.getTVInfoByIMDB(imdbId);
        if (!info && tmdbId) info = await window.electron.getTVInfoByTMDB(tmdbId);
      }

      if (!info) return;

      const title = info.title || info.original_title || info.original_name || this._editLinkedMediaSelection?.title || release.search_name || release.clean_name || 'Current selection';
      const year = (info.release_date || info.first_air_date || '').substring(0, 4);
      this._editLinkedMediaSelection = {
        ...this._editLinkedMediaSelection,
        title,
        year,
        tmdbId: String(info.tmdb_id || tmdbId || ''),
        imdbId: info.imdb_id || imdbId || null,
        mediaType
      };
      this.updateEditLinkedMediaCurrentDisplay();
      this.updateEditLinkedMediaSelectedDisplay();
    } catch (error) {
      console.warn('Failed to resolve current linked media title:', error);
    }
  }

  scheduleEditLinkedMediaSearch(immediate = false) {
    clearTimeout(this._editLinkedMediaSearchTimer);
    if (immediate) {
      this.performEditLinkedMediaSearch();
      return;
    }
    this._editLinkedMediaSearchTimer = setTimeout(() => {
      this.performEditLinkedMediaSearch();
    }, 300);
  }

  async performEditLinkedMediaSearch() {
    const searchInput = document.getElementById('edit-linked-media-search');
    const resultsContainer = document.getElementById('edit-linked-media-results');
    if (!searchInput || !resultsContainer) return;

    const query = searchInput.value.trim();
    const searchId = ++this._editLinkedMediaSearchRequestId;

    if (!query) {
      this.clearEditLinkedMediaSearchResults();
      return;
    }

    if (query.length < 2) {
      this.clearEditLinkedMediaSearchResults('Type at least 2 characters to search');
      return;
    }

    try {
      const mediaType = this.getEditLinkedMediaSearchType();
      resultsContainer.innerHTML = '<div class="tmdb-search-loading">Searching your library...</div>';

      const response = await window.electron.searchLinkedMedia(query, { mediaType: mediaType || null });
      if (searchId !== this._editLinkedMediaSearchRequestId) return;

      const items = response?.items || [];
      if (items.length === 0) {
        this.clearEditLinkedMediaSearchResults('No matching movie or TV show found');
        return;
      }

      const selected = this._editLinkedMediaSelection;
      const html = items.slice(0, 20).map((result) => {
        const title = result.title || 'Unknown';
        const year = (result.release_date || '').substring(0, 4);
        const typeLabel = result.media_type === 'tv' ? 'TV show' : 'Movie';
        const sourceLabel = 'Local library';
        const isSelected = selected
          && String(selected.tmdbId || '') === String(result.tmdb_id || '')
          && selected.mediaType === result.media_type;
        const coverUrl = result.cover_path ? this.resolveMediaAssetUrl(result.cover_path) : '';
        const coverHtml = coverUrl
          ? `<img src="${coverUrl}" class="edit-linked-media-poster" alt="${this.escapeHtml(title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="edit-linked-media-poster-placeholder" style="display:none;">${result.media_type === 'tv' ? '📺' : '🎬'}</div>`
          : `<div class="edit-linked-media-poster-placeholder">${result.media_type === 'tv' ? '📺' : '🎬'}</div>`;

        return `
          <div class="link-search-result ${isSelected ? 'selected' : ''}" data-id="${result.id}" data-type="${result.media_type}" data-title="${this.escapeHtml(title)}" data-year="${this.escapeHtml(year)}" data-imdb="${this.escapeHtml(result.imdb_id || '')}" data-tmdb="${this.escapeHtml(String(result.tmdb_id || ''))}">
            ${coverHtml}
            <div class="link-search-result-info">
              <div class="link-search-result-title">${this.escapeHtml(title)}${year ? ` (${this.escapeHtml(year)})` : ''}</div>
              <div class="link-search-result-meta"><span>${sourceLabel}</span><span>${typeLabel}</span>${result.tmdb_id ? `<span>TMDB ${this.escapeHtml(String(result.tmdb_id))}</span>` : ''}${result.imdb_id ? `<span>IMDB ${this.escapeHtml(result.imdb_id)}</span>` : ''}</div>
            </div>
          </div>
        `;
      });

      resultsContainer.innerHTML = html.join('') || '<div class="tmdb-search-empty">No matching movie or TV show found</div>';

      resultsContainer.querySelectorAll('.link-search-result').forEach((el) => {
        el.addEventListener('click', () => {
          this.selectEditLinkedMediaResult({
            id: el.dataset.id,
            title: el.dataset.title,
            year: el.dataset.year,
            imdbId: el.dataset.imdb || '',
            tmdbId: el.dataset.tmdb || '',
            mediaType: el.dataset.type
          });
        });
      });
    } catch (error) {
      if (searchId !== this._editLinkedMediaSearchRequestId) return;
      resultsContainer.innerHTML = `<div class="tmdb-search-empty">Search failed: ${this.escapeHtml(error.message)}</div>`;
    }
  }

  async selectEditLinkedMediaResult(result) {
    if (!result) return;

    const mediaType = result.mediaType === 'tv' ? 'tv' : 'movie';
    const tmdbId = parseInt(result.tmdbId || result.id, 10);
    if (!Number.isFinite(tmdbId)) {
      this.showNotification('Could not read TMDB ID from the selected item', 'error');
      return;
    }

    const selection = {
      title: result.title || 'Unknown',
      year: result.year || '',
      tmdbId: String(tmdbId),
      imdbId: result.imdbId || null,
      mediaType
    };

    this._editLinkedMediaSelection = selection;
    this.updateEditLinkedMediaCurrentDisplay();
    this.updateEditLinkedMediaSelectedDisplay(selection);
    document.getElementById('edit-media-type').value = mediaType;
    document.getElementById('edit-tmdb-id').value = String(tmdbId);
    this.updateEditReleaseFieldVisibility();

    const searchInput = document.getElementById('edit-linked-media-search');
    if (searchInput) {
      searchInput.value = selection.title + (selection.year ? ` (${selection.year})` : '');
    }
    document.getElementById('edit-imdb-id').value = selection.imdbId || '';
    this.updateEditReleaseSearchNameIdTags();
  }

  closeEditRelease() {
    document.getElementById('edit-release-overlay').classList.add('hidden');
    this.batchEditSelection = null;
    this.setEditReleaseModalMode(false);
    this._editLinkedMediaSelection = null;
    clearTimeout(this._editLinkedMediaSearchTimer);
    this._editLinkedMediaSearchRequestId += 1;
  }

  async saveEditRelease() {
    const values = this.getReleaseEditFormValues();
    const isBatch = Array.isArray(this.batchEditSelection) && this.batchEditSelection.length > 0;
    const releases = isBatch ? this.batchEditSelection : [this.currentReleaseDetail].filter(Boolean);
    if (releases.length === 0) return;

    const fields = {};
    const release = releases[0];
    const searchName = values.search_name;
    const imdbId = values.imdb_id;
    const tmdbId = values.tmdb_id;
    const mediaType = values.media_type;
    const categoryId = values.category_id;
    const season = values.season;
    const episode = values.episode;
    const resolution = values.resolution;
    const videoCodec = values.video_codec;
    const audioCodec = values.audio_codec;
    const audioChannels = values.audio_channels;
    const source = values.source;
    const format = values.format;
    const releaseGroup = values.release_group;
    const subtitles = values.subtitles;
    const language = values.language;
    const password = values.password;
    const mediainfoRaw = values.mediainfo_raw;

    const assignIfChanged = (key, value, current, inputEl) => {
      if (inputEl?.dataset?.mixed === '1' && value === '') {
        return;
      }
      if (value !== current) fields[key] = value || null;
    };
    assignIfChanged('search_name', searchName, release.search_name || '', document.getElementById('edit-search-name'));
    assignIfChanged('imdb_id', imdbId, release.imdb_id || '', document.getElementById('edit-imdb-id'));
    assignIfChanged('tmdb_id', tmdbId, String(release.tmdb_id || ''), document.getElementById('edit-tmdb-id'));
    assignIfChanged('media_type', mediaType, release.media_type || '', document.getElementById('edit-media-type'));
    assignIfChanged('category_id', categoryId, String(release.category_id || ''), document.getElementById('edit-category-id'));
    assignIfChanged('season', season, String(release.season || ''), document.getElementById('edit-season'));
    assignIfChanged('episode', episode, String(release.episode || ''), document.getElementById('edit-episode'));
    assignIfChanged('resolution', resolution, release.resolution || '', document.getElementById('edit-resolution'));
    assignIfChanged('video_codec', videoCodec, release.video_codec || '', document.getElementById('edit-video-codec'));
    assignIfChanged('audio_codec', audioCodec, release.audio_codec || '', document.getElementById('edit-audio-codec'));
    assignIfChanged('audio_channels', audioChannels, release.audio_channels || '', document.getElementById('edit-audio-channels'));
    assignIfChanged('source', source, release.source || '', document.getElementById('edit-source'));
    assignIfChanged('format', format, release.format || '', document.getElementById('edit-format'));
    assignIfChanged('release_group', releaseGroup, release.release_group || '', document.getElementById('edit-release-group'));
    assignIfChanged('subtitles', subtitles, release.subtitles || '', document.getElementById('edit-subtitles'));
    assignIfChanged('language', language, release.language || '', document.getElementById('edit-language'));
    assignIfChanged('password', password, release.password || '', document.getElementById('edit-password'));
    assignIfChanged('mediainfo_raw', mediainfoRaw, release.mediainfo_raw || '', document.getElementById('edit-mediainfo-raw'));

    if (Object.keys(fields).length === 0) {
      this.showNotification('No changes made', 'warning');
      return;
    }

    let savedRelease = null;
    try {
      if (isBatch) {
        const ids = releases.map(r => r.id);
        const result = await window.electron.batchUpdateReleases(ids, fields);
        if (!result.success) throw new Error(result.error || 'Batch update failed');
        this.showNotification(`Updated ${result.updated || ids.length} releases`, 'success');
      } else {
        const result = await window.electron.updateRelease(release.id, fields);
        if (!result.success) throw new Error(result.error || 'Update failed');
        if (result.release) {
          savedRelease = result.release;
        }
        this.showNotification('Release updated', 'success');
      }
      this.closeEditRelease();
      this.batchEditSelection = null;

      // Update the local release object with the new values immediately
      for (const r of releases) {
        for (const [key, value] of Object.entries(fields)) {
          r[key] = value;
        }
      }
      if (savedRelease) {
        Object.assign(release, savedRelease);
      }
      this.currentReleaseDetail = release;

      // Refresh the movie/TV detail page if it's visible
      const detailPage = document.getElementById('page-movie-details');
      if (detailPage && detailPage.classList.contains('active') && this.currentDetailItem) {
        this.refreshCurrentDetailsPage();
      }

      // Re-render the release detail modal immediately so cleared fields disappear right away.
      if (this.currentReleaseDetail) {
        this.renderReleaseDetail(this.currentReleaseDetail);
      }

      // Refresh home if on categories page
      if (this.currentPage === 'categories' || this.currentPage === 'library') {
        this.loadHomeCarousels();
      } else if (this.currentPage === 'browse') {
        this.loadBrowsePage();
      }
    } catch (e) {
      this.showNotification(`Update failed: ${e.message}`, 'error');
    }
  }

  async fetchTMDBForEdit() {
    const tmdbId = document.getElementById('edit-tmdb-id').value.trim();
    const mediaType = document.getElementById('edit-media-type').value;
    if (!tmdbId || !mediaType) {
      this.showNotification('Enter a TMDB ID and media type first', 'warning');
      return;
    }

    try {
      const details = mediaType === 'movie'
        ? await window.electron.getMovieDetails(parseInt(tmdbId))
        : await window.electron.getTVDetails(parseInt(tmdbId));

      if (!details) {
        this.showNotification('Could not fetch TMDB data', 'error');
        return;
      }

      // Auto-fill from TMDB
      if (details.external_ids?.imdb_id) {
        document.getElementById('edit-imdb-id').value = details.external_ids.imdb_id;
      }
      this.updateEditReleaseSearchNameIdTags();
      this.showNotification('TMDB data fetched', 'success');
    } catch (e) {
      this.showNotification(`TMDB fetch failed: ${e.message}`, 'error');
    }
  }

  async deleteCurrentRelease() {
    if (!this.currentReleaseDetail) return;

    if (!confirm(`Delete this release?\n\n${this.currentReleaseDetail.search_name}`)) {
      return;
    }

    try {
      await window.electron.deleteRelease(this.currentReleaseDetail.id);
      this.showNotification('Release deleted', 'success');
      this.hideReleaseDetail();

      // Refresh the detail page if we're on it
      const detailPage = document.getElementById('page-movie-details');
      if (detailPage && detailPage.classList.contains('active') && this.currentDetailItem) {
        this.refreshCurrentDetailsPage();
      } else {
        // Refresh the current page (home/library/browse)
        if (this.currentPage === 'categories') {
          this.loadHomeCarousels();
        } else if (this.currentPage === 'library') {
          this.loadLibrary();
        } else if (this.currentPage === 'browse') {
          this.loadBrowsePage();
        }
      }
    } catch (error) {
      console.error('Failed to delete release:', error);
      this.showNotification('Failed to delete release', 'error');
    }
  }

  async deleteMusicInfo() {
    if (!this.currentDetailItem || this.currentDetailItem.media_type !== 'music' || !this.currentDetailItem.media_id) return;

    if (!confirm(`Delete music metadata for this album?\n\n${this.currentDetailItem.title}\n\nThis will allow re-uploading to fetch fresh metadata.`)) {
      return;
    }

    try {
      await window.electron.deleteMusicInfo(this.currentDetailItem.media_id);
      this.showNotification('Music metadata deleted', 'success');

      // Refresh the detail page
      this.refreshCurrentDetailsPage();
    } catch (error) {
      console.error('Failed to delete music info:', error);
      this.showNotification('Failed to delete music metadata', 'error');
    }
  }

  // Edit Movie/TV Info
  openEditMovieInfo() {
    const item = this.currentDetailItem;
    if (!item) return;

    const isTV = item.media_type === 'tv';
    const info = this.currentDetailInfo || item;

    // Set modal title
    document.getElementById('edit-movie-info-title').textContent = isTV ? 'Edit TV Info' : 'Edit Movie Info';

    // Update delete button text
    const deleteBtn = document.getElementById('edit-movie-info-delete-btn');
    if (deleteBtn) deleteBtn.textContent = isTV ? 'Delete Show' : 'Delete Movie';

    // Common fields
    document.getElementById('edit-mi-imdb-id').value = info.imdb_id || '';
    document.getElementById('edit-mi-tmdb-id').value = info.tmdb_id || '';
    document.getElementById('edit-mi-title').value = info.title || '';
    document.getElementById('edit-mi-original-title').value = info.original_title || info.original_name || '';
    document.getElementById('edit-mi-plot').value = info.plot || '';
    document.getElementById('edit-mi-tagline').value = info.tagline || '';
    document.getElementById('edit-mi-release-date').value = info.release_date || '';
    document.getElementById('edit-mi-runtime').value = info.runtime || '';
    document.getElementById('edit-mi-rating').value = info.rating || '';
    document.getElementById('edit-mi-genres').value = info.genres || '';
    document.getElementById('edit-mi-director').value = info.director || '';
    document.getElementById('edit-mi-language').value = info.language || '';
    document.getElementById('edit-mi-country').value = info.country || '';
    document.getElementById('edit-mi-trailer').value = info.youtube_trailer || '';
    this.updateEditMovieInfoCoverPreview(info.cover_path || item.cover_image || 'assets/images/placeholder-cover.svg');
    this.updateEditMovieInfoAssetPreview('backdrop', info.backdrop_path || item.backdrop_path || 'assets/images/placeholder-backdrop.svg');
    this.updateEditMovieInfoAssetPreview('logo', info.logo_path || item.logo_path || 'assets/images/placeholder-logo.svg');
    const coverInput = document.getElementById('edit-mi-cover-file');
    if (coverInput) coverInput.value = '';
    const backdropInput = document.getElementById('edit-mi-backdrop-file');
    if (backdropInput) backdropInput.value = '';
    const logoInput = document.getElementById('edit-mi-logo-file');
    if (logoInput) logoInput.value = '';

    // TV-specific fields
    document.querySelectorAll('.tv-only-field').forEach(el => {
      el.classList.toggle('hidden', !isTV);
    });
    if (isTV) {
      document.getElementById('edit-mi-first-air-date').value = info.first_air_date || '';
      document.getElementById('edit-mi-last-air-date').value = info.last_air_date || '';
      document.getElementById('edit-mi-num-seasons').value = info.number_of_seasons || '';
      document.getElementById('edit-mi-num-episodes').value = info.number_of_episodes || '';
      document.getElementById('edit-mi-status').value = info.status || '';
    }

    document.getElementById('edit-movie-info-overlay').classList.remove('hidden');
    this.applyFeatureAvailabilityState();
    this.updateFanartFeatureAvailability();
  }

  closeEditMovieInfo() {
    document.getElementById('edit-movie-info-overlay').classList.add('hidden');
  }

  updateEditMovieInfoCoverPreview(src, cacheBust = false) {
    this.updateEditMovieInfoAssetPreview('cover', src, cacheBust);
  }

  updateEditMovieInfoAssetPreview(assetType, src, cacheBust = false) {
    const image = document.getElementById(`edit-mi-${assetType}-image`);
    if (!image) return;
    if (!src) {
      const placeholders = {
        cover: 'assets/images/placeholder-cover.svg',
        backdrop: 'assets/images/placeholder-backdrop.svg',
        logo: 'assets/images/placeholder-logo.svg'
      };
      image.src = placeholders[assetType] || 'assets/images/placeholder-cover.svg';
      return;
    }

    image.src = cacheBust ? `${src}?v=${Date.now()}` : src;
  }

  async persistEditMovieInfoAssetPath(assetType, assetPath) {
    const item = this.currentDetailItem;
    if (!item) return;

    const isTV = item.media_type === 'tv';
    const info = this.currentDetailInfo || item;
    const pathField = `${assetType}_path`;
    const hasField = `has_${assetType}`;

    if (info.id) {
      const updateFn = isTV ? window.electron.updateTVInfo : window.electron.updateMovieInfo;
      await updateFn(info.id, {
        [pathField]: assetPath,
        [hasField]: 1
      });
    } else {
      const upsertPayload = {
        imdb_id: info.imdb_id || item.imdb_id || null,
        tmdb_id: info.tmdb_id || item.tmdb_id || null,
        title: info.title || item.title || item.clean_name || 'Untitled',
        [pathField]: assetPath,
        [hasField]: 1
      };

      if (isTV) {
        upsertPayload.original_name = info.original_name || info.title || item.title || null;
        await window.electron.upsertTVInfo(upsertPayload);
      } else {
        upsertPayload.original_title = info.original_title || info.title || item.title || null;
        await window.electron.upsertMovieInfo(upsertPayload);
      }
    }

    this.markMediaAssetUpdated(assetPath);
    this.currentDetailInfo = {
      ...info,
      [pathField]: assetPath,
      [hasField]: 1
    };
    this.currentDetailItem = {
      ...item,
      ...(assetType === 'cover' ? { cover_image: assetPath } : {}),
      ...(assetType === 'backdrop' ? { backdrop_path: assetPath } : {}),
      ...(assetType === 'logo' ? { logo_path: assetPath } : {})
    };
  }

  async uploadEditMovieInfoAsset(assetType = 'cover') {
    if (!this.requireFeature('custom_artwork_upload')) return;

    const item = this.currentDetailItem;
    if (!item) return;

    const input = document.getElementById(`edit-mi-${assetType}-file`);
    const button = document.getElementById(`edit-mi-upload-${assetType}-btn`);
    const file = input?.files?.[0];
    if (!file) return;

    const isTV = item.media_type === 'tv';
    const info = this.currentDetailInfo || item;
    const currentPath = assetType === 'cover'
      ? (info.cover_path || item.cover_image || '')
      : assetType === 'backdrop'
        ? (info.backdrop_path || item.backdrop_path || '')
        : (info.logo_path || item.logo_path || '');
    const existingFileName = currentPath ? currentPath.split('/').pop() : '';
    const existingExt = existingFileName.includes('.') ? existingFileName.split('.').pop().toLowerCase() : '';
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const defaultExt = assetType === 'logo' ? 'png' : 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(existingExt) ? existingExt : (['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? fileExt : defaultExt);
    const baseId = info.tmdb_id || info.imdb_id || item.media_id || item.id || Date.now();
    const filename = existingFileName || `${String(baseId).replace(/[^\w.-]/g, '_')}-${assetType}.${safeExt}`;

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Uploading...';
      }

      const base64 = await this._readFileAsBase64(file);
      const uploadResult = await window.electron.uploadImage({
        data: base64,
        type: file.type,
        subdir: assetType === 'cover' ? 'covers' : assetType === 'backdrop' ? 'backdrops' : 'logos',
        filename,
        mediaType: isTV ? 'tv' : 'movie'
      });

      if (!uploadResult.success || !uploadResult.path) {
        throw new Error(uploadResult.error || 'Cover upload failed');
      }

      await this.persistEditMovieInfoAssetPath(assetType, uploadResult.path);

      this.updateEditMovieInfoAssetPreview(assetType, uploadResult.path, true);
      this.showNotification(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} updated`, 'success');
      await this.refreshCurrentDetailsPage();
    } catch (error) {
      console.error(`Failed to upload custom ${assetType}:`, error);
      this.showNotification(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} upload failed: ${error.message}`, 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Upload';
      }
      if (input) {
        input.value = '';
      }
    }
  }

  closeFanartCoverPicker() {
    document.getElementById('fanart-cover-overlay')?.classList.add('hidden');
  }

  async resolveTVDBIdForCurrentDetail(info) {
    const rawJson = info?.raw_json;
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed?.external_ids?.tvdb_id) {
          return String(parsed.external_ids.tvdb_id);
        }
      } catch (error) {}
    }

    if (info?.tmdb_id) {
      const details = await window.electron.getTVDetails(info.tmdb_id);
      if (details?.external_ids?.tvdb_id) {
        return String(details.external_ids.tvdb_id);
      }
    }

    return null;
  }

  async openFanartArtworkPicker(assetType = 'cover') {
    if (!this.requireFeature('fanart_artwork')) return;

    const item = this.currentDetailItem;
    if (!item) return;

    const info = this.currentDetailInfo || item;
    const isTV = item.media_type === 'tv';
    const titleEl = document.getElementById('fanart-cover-title');
    const resultsEl = document.getElementById('fanart-cover-results');
    const overlay = document.getElementById('fanart-cover-overlay');
    if (!resultsEl || !overlay) return;

    const assetLabel = assetType.charAt(0).toUpperCase() + assetType.slice(1);
    resultsEl.className = `fanart-cover-grid fanart-cover-grid-${assetType}`;
    resultsEl.innerHTML = `<div class="home-empty-panel">Loading ${assetType} artwork from fanart.tv...</div>`;
    overlay.classList.remove('hidden');
    if (titleEl) {
      titleEl.textContent = `Choose Fanart ${assetType.charAt(0).toUpperCase() + assetType.slice(1)}${info?.title ? ` for ${info.title}` : ''}`;
    }

    try {
      let tvdbId = null;
      if (isTV) {
        tvdbId = await this.resolveTVDBIdForCurrentDetail(info);
        if (!tvdbId) {
          throw new Error('No TVDB ID found for this show. Try refreshing TMDB data first.');
        }
      }

      const result = await window.electron.getFanartCoverOptions({
        mediaType: isTV ? 'tv' : 'movie',
        assetType,
        tmdbId: info.tmdb_id || item.tmdb_id || null,
        tvdbId
      });

      if (!result?.success) {
        throw new Error(result?.error || `Unable to load fanart ${assetType} artwork`);
      }

      const items = result.items || [];
      if (items.length === 0) {
        resultsEl.innerHTML = `<div class="home-empty-panel">No fanart ${assetType} options were found for this title.</div>`;
        return;
      }

      resultsEl.innerHTML = items.map(option => `
        <button class="fanart-cover-option" data-url="${option.url}" data-asset-type="${assetType}" type="button">
          <img src="${option.previewUrl}" alt="Fanart ${assetType} option">
          <div class="fanart-cover-meta">
            <span>${option.lang || 'n/a'}</span>
            <span>${option.likes || 0} likes</span>
          </div>
        </button>
      `).join('');

      resultsEl.querySelectorAll('.fanart-cover-option').forEach(button => {
        button.addEventListener('click', () => this.applyFanartArtwork(button.dataset.url, button.dataset.assetType || 'cover'));
      });
    } catch (error) {
      resultsEl.innerHTML = `<div class="home-empty-panel">Fanart ${assetType} lookup failed: ${error.message}</div>`;
    }
  }

  async applyFanartArtwork(imageUrl, assetType = 'cover') {
    const item = this.currentDetailItem;
    if (!item || !imageUrl) return;

    const info = this.currentDetailInfo || item;
    const currentPath = assetType === 'cover'
      ? (info.cover_path || item.cover_image || '')
      : assetType === 'backdrop'
        ? (info.backdrop_path || item.backdrop_path || '')
        : (info.logo_path || item.logo_path || '');
    const existingFileName = currentPath ? currentPath.split('/').pop() : '';
    const safeExt = existingFileName.includes('.') ? existingFileName.split('.').pop().toLowerCase() : 'jpg';
    const baseId = info.tmdb_id || info.imdb_id || item.media_id || item.id || Date.now();
    const finalExt = assetType === 'logo' ? (safeExt || 'png') : (safeExt || 'jpg');
    const fileName = existingFileName || `${String(baseId).replace(/[^\w.-]/g, '_')}-${assetType}.${finalExt}`;
    const mediaFolder = item.media_type === 'tv' ? 'tv' : 'movies';
    const assetFolder = assetType === 'cover' ? 'covers' : assetType === 'backdrop' ? 'backdrops' : 'logos';
    const destPath = currentPath || `${await window.electron.getAppPath('userData')}/media-cache/${assetFolder}/${mediaFolder}/${fileName}`;

    try {
      const result = await window.electron.downloadImageToPath({
        url: imageUrl,
        destPath
      });

      if (!result?.success || !result.path) {
        throw new Error(result?.error || `Failed to download selected fanart ${assetType}`);
      }

      await this.persistEditMovieInfoAssetPath(assetType, result.path);
      this.updateEditMovieInfoAssetPreview(assetType, result.path, true);
      this.closeFanartCoverPicker();
      this.showNotification(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} updated from fanart.tv`, 'success');
      await this.refreshCurrentDetailsPage();
    } catch (error) {
      console.error(`Failed to apply fanart ${assetType}:`, error);
      this.showNotification(`Fanart ${assetType} failed: ${error.message}`, 'error');
    }
  }

  async saveEditMovieInfo() {
    if (!this.requireFeature('edit_media_info')) return;

    const item = this.currentDetailItem;
    if (!item) return;

    const isTV = item.media_type === 'tv';
    const info = this.currentDetailInfo || item;
    const infoId = info.id;

    const fields = {};

    // Common fields
    const imdbId = document.getElementById('edit-mi-imdb-id').value.trim();
    const tmdbId = document.getElementById('edit-mi-tmdb-id').value.trim();
    const title = document.getElementById('edit-mi-title').value.trim();
    const originalTitle = document.getElementById('edit-mi-original-title').value.trim();
    const plot = document.getElementById('edit-mi-plot').value.trim();
    const tagline = document.getElementById('edit-mi-tagline').value.trim();
    const releaseDate = document.getElementById('edit-mi-release-date').value.trim();
    const runtime = document.getElementById('edit-mi-runtime').value.trim();
    const rating = document.getElementById('edit-mi-rating').value.trim();
    const genres = document.getElementById('edit-mi-genres').value.trim();
    const director = document.getElementById('edit-mi-director').value.trim();
    const language = document.getElementById('edit-mi-language').value.trim();
    const country = document.getElementById('edit-mi-country').value.trim();
    const trailer = document.getElementById('edit-mi-trailer').value.trim();

    if (imdbId !== (info.imdb_id || '')) fields.imdb_id = imdbId || null;
    if (tmdbId !== String(info.tmdb_id || '')) fields.tmdb_id = tmdbId ? parseInt(tmdbId) : null;
    if (title !== (info.title || '')) fields.title = title || null;
    if (originalTitle !== (info.original_title || info.original_name || '')) fields[isTV ? 'original_name' : 'original_title'] = originalTitle || null;
    if (plot !== (info.plot || '')) fields.plot = plot || null;
    if (tagline !== (info.tagline || '')) fields.tagline = tagline || null;
    if (releaseDate !== (info.release_date || '')) fields.release_date = releaseDate || null;
    if (runtime !== String(info.runtime || '')) fields.runtime = runtime ? parseInt(runtime) : null;
    if (rating !== String(info.rating || '')) fields.rating = rating ? parseFloat(rating) : null;
    if (genres !== (info.genres || '')) fields.genres = genres || null;
    if (director !== (info.director || '')) fields.director = director || null;
    if (language !== (info.language || '')) fields.language = language || null;
    if (country !== (info.country || '')) fields.country = country || null;
    if (trailer !== (info.youtube_trailer || '')) fields.youtube_trailer = trailer || null;

    // TV-specific fields
    if (isTV) {
      const firstAirDate = document.getElementById('edit-mi-first-air-date').value.trim();
      const lastAirDate = document.getElementById('edit-mi-last-air-date').value.trim();
      const numSeasons = document.getElementById('edit-mi-num-seasons').value.trim();
      const numEpisodes = document.getElementById('edit-mi-num-episodes').value.trim();
      const status = document.getElementById('edit-mi-status').value;

      if (firstAirDate !== (info.first_air_date || '')) fields.first_air_date = firstAirDate || null;
      if (lastAirDate !== (info.last_air_date || '')) fields.last_air_date = lastAirDate || null;
      if (numSeasons !== String(info.number_of_seasons || '')) fields.number_of_seasons = numSeasons ? parseInt(numSeasons) : null;
      if (numEpisodes !== String(info.number_of_episodes || '')) fields.number_of_episodes = numEpisodes ? parseInt(numEpisodes) : null;
      if (status !== (info.status || '')) fields.status = status || null;
    }

    if (Object.keys(fields).length === 0) {
      this.showNotification('No changes made', 'warning');
      return;
    }

    try {
      if (infoId) {
        const updateFn = isTV ? window.electron.updateTVInfo : window.electron.updateMovieInfo;
        await updateFn(infoId, fields);
      } else {
        const upsertPayload = {
          imdb_id: imdbId || null,
          tmdb_id: tmdbId ? parseInt(tmdbId) : null,
          title: title || null,
          plot: plot || null,
          rating: rating ? parseFloat(rating) : null,
          genres: genres || null,
          language: language || null,
          country: country || null,
          youtube_trailer: trailer || null
        };

        if (isTV) {
          upsertPayload.original_name = originalTitle || null;
          upsertPayload.first_air_date = document.getElementById('edit-mi-first-air-date').value.trim() || null;
          upsertPayload.last_air_date = document.getElementById('edit-mi-last-air-date').value.trim() || null;
          upsertPayload.runtime = runtime ? parseInt(runtime) : null;
          upsertPayload.number_of_seasons = document.getElementById('edit-mi-num-seasons').value.trim() ? parseInt(document.getElementById('edit-mi-num-seasons').value.trim()) : null;
          upsertPayload.number_of_episodes = document.getElementById('edit-mi-num-episodes').value.trim() ? parseInt(document.getElementById('edit-mi-num-episodes').value.trim()) : null;
          upsertPayload.status = document.getElementById('edit-mi-status').value || null;
          await window.electron.upsertTVInfo(upsertPayload);
        } else {
          upsertPayload.original_title = originalTitle || null;
          upsertPayload.tagline = tagline || null;
          upsertPayload.release_date = releaseDate || null;
          upsertPayload.runtime = runtime ? parseInt(runtime) : null;
          upsertPayload.director = director || null;
          await window.electron.upsertMovieInfo(upsertPayload);
        }

        await window.electron.updateRelease(item.id, {
          media_type: isTV ? 'tv' : 'movie',
          tmdb_id: upsertPayload.tmdb_id,
          imdb_id: upsertPayload.imdb_id
        });
      }

      this.showNotification('Info updated', 'success');
      this.closeEditMovieInfo();

      // Refresh the detail page
      if (this.currentDetailItem) {
        this.refreshCurrentDetailsPage();
      }
    } catch (e) {
      this.showNotification(`Update failed: ${e.message}`, 'error');
    }
  }

  async fetchTMDBForEditMovieInfo() {
    if (!this.requireFeature('edit_media_info')) return;

    const tmdbId = document.getElementById('edit-mi-tmdb-id').value.trim();
    const item = this.currentDetailItem;
    if (!item) return;

    const isTV = item.media_type === 'tv';

    if (!tmdbId) {
      this.showNotification('Enter a TMDB ID first', 'warning');
      return;
    }

    try {
      const details = isTV
        ? await window.electron.getTVDetails(parseInt(tmdbId))
        : await window.electron.getMovieDetails(parseInt(tmdbId));

      if (!details) {
        this.showNotification('Could not fetch TMDB data', 'error');
        return;
      }

      // Auto-fill from TMDB
      if (details.imdb_id || details.external_ids?.imdb_id) {
        document.getElementById('edit-mi-imdb-id').value = details.imdb_id || details.external_ids.imdb_id;
      }
      if (details.title || details.name) {
        document.getElementById('edit-mi-title').value = details.title || details.name;
      }
      if (details.original_title || details.original_name) {
        document.getElementById('edit-mi-original-title').value = details.original_title || details.original_name;
      }
      if (details.overview) {
        document.getElementById('edit-mi-plot').value = details.overview;
      }
      if (details.tagline) {
        document.getElementById('edit-mi-tagline').value = details.tagline;
      }
      if (details.release_date) {
        document.getElementById('edit-mi-release-date').value = details.release_date;
      }
      if (details.runtime) {
        document.getElementById('edit-mi-runtime').value = details.runtime;
      }
      if (details.vote_average) {
        document.getElementById('edit-mi-rating').value = details.vote_average;
      }
      if (details.genres) {
        document.getElementById('edit-mi-genres').value = details.genres.map(g => g.name).join(', ');
      }
      if (isTV) {
        if (details.first_air_date) {
          document.getElementById('edit-mi-first-air-date').value = details.first_air_date;
        }
        if (details.last_air_date) {
          document.getElementById('edit-mi-last-air-date').value = details.last_air_date;
        }
        if (details.number_of_seasons) {
          document.getElementById('edit-mi-num-seasons').value = details.number_of_seasons;
        }
        if (details.number_of_episodes) {
          document.getElementById('edit-mi-num-episodes').value = details.number_of_episodes;
        }
        if (details.status) {
          document.getElementById('edit-mi-status').value = details.status;
        }
      }
      // Director/crew
      if (details.credits?.crew) {
        const directors = details.credits.crew.filter(c => c.job === 'Director');
        if (directors.length > 0) {
          document.getElementById('edit-mi-director').value = directors.map(d => d.name).join(', ');
        }
      }
      if (details.original_language) {
        document.getElementById('edit-mi-language').value = details.original_language;
      }
      if (details.production_countries && details.production_countries.length > 0) {
        document.getElementById('edit-mi-country').value = details.production_countries[0].iso_3166_1;
      }
      if (details.videos?.results) {
        const trailer = details.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        if (trailer) {
          document.getElementById('edit-mi-trailer').value = trailer.key;
        }
      }

      const saveFn = isTV ? window.electron.saveTVInfoFromTMDB : window.electron.saveMovieInfoFromTMDB;
      const savedInfo = await saveFn(details);
      if (savedInfo && this.currentDetailItem) {
        await window.electron.updateRelease(this.currentDetailItem.id, {
          media_type: isTV ? 'tv' : 'movie',
          media_id: savedInfo.id,
          tmdb_id: savedInfo.tmdb_id || parseInt(tmdbId),
          imdb_id: savedInfo.imdb_id || details.imdb_id || details.external_ids?.imdb_id || this.currentDetailItem.imdb_id || null
        });

        this.currentDetailItem.tmdb_id = savedInfo.tmdb_id || parseInt(tmdbId);
        this.currentDetailItem.imdb_id = savedInfo.imdb_id || details.imdb_id || details.external_ids?.imdb_id || this.currentDetailItem.imdb_id;
        this.currentDetailItem.media_id = savedInfo.id;
        this.currentDetailInfo = savedInfo;
      }

      this.showNotification('TMDB data fetched and saved', 'success');
    } catch (e) {
      this.showNotification(`TMDB fetch failed: ${e.message}`, 'error');
    }
  }

  // TMDB Search & Link Dialog
  openTMDBSearchDialog() {
    if (!this.requireFeature('edit_media_info')) return;

    const item = this.currentDetailItem;
    if (!item) return;

    const isTV = item.media_type === 'tv';
    const searchTitle = document.getElementById('tmdb-search-title');
    if (searchTitle) {
      searchTitle.textContent = isTV ? 'Search TV Shows' : 'Search Movies';
    }

    // Clear previous results
    const resultsContainer = document.getElementById('tmdb-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="tmdb-search-empty">Enter a title and click Search</div>';
    }

    const searchInput = document.getElementById('tmdb-search-input');
    const originalTitleInput = document.getElementById('edit-mi-original-title');
    const titleInput = document.getElementById('edit-mi-title');
    const suggestedQuery =
      originalTitleInput?.value.trim() ||
      titleInput?.value.trim() ||
      '';

    if (searchInput) {
      searchInput.value = suggestedQuery;
    }

    document.getElementById('tmdb-search-overlay').classList.remove('hidden');
    if (searchInput) searchInput.focus();
  }

  closeTMDBSearchDialog() {
    document.getElementById('tmdb-search-overlay').classList.add('hidden');
  }

  async performTMDBSearch() {
    const query = document.getElementById('tmdb-search-input').value.trim();
    if (!query) {
      this.showNotification('Enter a title to search', 'warning');
      return;
    }

    const item = this.currentDetailItem;
    const isTV = item.media_type === 'tv';
    const resultsContainer = document.getElementById('tmdb-search-results');

    resultsContainer.innerHTML = '<div class="tmdb-search-loading">Searching TMDB...</div>';

    try {
      const searchFn = isTV ? window.electron.searchTV : window.electron.searchMovie;
      const results = await searchFn(query);

      if (!results || !results.results || results.results.length === 0) {
        resultsContainer.innerHTML = '<div class="tmdb-search-empty">No results found</div>';
        return;
      }

      resultsContainer.innerHTML = '';
      results.results.slice(0, 10).forEach(result => {
        const title = result.title || result.name || 'Unknown';
        const year = (result.release_date || result.first_air_date || '').substring(0, 4);
        const overview = result.overview || 'No overview available';
        const posterPath = result.poster_path;
        const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w92${posterPath}` : '';
        const rating = result.vote_average ? result.vote_average.toFixed(1) : 'N/A';

        const resultEl = document.createElement('div');
        resultEl.className = 'tmdb-search-result-item';
        resultEl.innerHTML = `
          ${posterUrl
            ? `<img src="${posterUrl}" class="tmdb-search-result-poster" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="tmdb-search-result-poster-placeholder" style="display:none;">🎬</div>`
            : `<div class="tmdb-search-result-poster-placeholder">🎬</div>`
          }
          <div class="tmdb-search-result-info">
            <div class="tmdb-search-result-title">${title} ${year ? `(${year})` : ''}</div>
            <div class="tmdb-search-result-meta">
              <span>★ ${rating}</span>
              <span>ID: ${result.id}</span>
            </div>
            <div class="tmdb-search-result-meta" style="margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${overview}</div>
          </div>
        `;

        resultEl.addEventListener('click', () => this.linkTMDBResult(result, isTV));
        resultsContainer.appendChild(resultEl);
      });
    } catch (e) {
      resultsContainer.innerHTML = `<div class="tmdb-search-empty">Search failed: ${e.message}</div>`;
    }
  }

  async linkTMDBResult(tmdbResult, isTV) {
    const item = this.currentDetailItem;
    if (!item) return;

    this.closeTMDBSearchDialog();
    this.showNotification('Fetching full details from TMDB...', 'info');

    try {
      // Fetch full details
      const detailsFn = isTV ? window.electron.getTVDetails : window.electron.getMovieDetails;
      const details = await detailsFn(tmdbResult.id);

      if (!details) {
        this.showNotification('Could not fetch full details from TMDB', 'error');
        return;
      }

      // Save to database (adds to tv_info/movie_info table)
      const saveFn = isTV ? window.electron.saveTVInfoFromTMDB : window.electron.saveMovieInfoFromTMDB;
      const savedInfo = await saveFn(details);

      if (!savedInfo) {
        this.showNotification('Failed to save to database', 'error');
        return;
      }

      // Update the release to point to this new info
      const updateFields = {
        tmdb_id: tmdbResult.id,
        media_id: savedInfo.id,
        media_type: isTV ? 'tv' : 'movie'
      };

      // Also update imdb_id if available
      if (details.imdb_id || details.external_ids?.imdb_id) {
        updateFields.imdb_id = details.imdb_id || details.external_ids?.imdb_id;
      }

      await window.electron.updateRelease(item.id, updateFields);

      // Update currentDetailInfo so the details page shows the new data
      this.currentDetailInfo = {
        ...savedInfo,
        media_type: isTV ? 'tv' : 'movie'
      };

      // Update the edit form with new data
      this.populateEditFormFromTMDB(details, isTV);

      // Refresh the detail page to show new images and actors
      if (this.currentDetailItem) {
        // Update currentDetailItem with new TMDB data
        this.currentDetailItem.tmdb_id = tmdbResult.id;
        this.currentDetailItem.imdb_id = details.imdb_id || details.external_ids?.imdb_id || this.currentDetailItem.imdb_id;
        this.currentDetailItem.media_id = savedInfo.id;
        this.currentDetailItem.media_type = isTV ? 'tv' : 'movie';

        // Re-fetch releases and info for this title
        const releases = await window.electron.getReleasesByMovie(
          this.currentDetailItem.tmdb_id,
          this.currentDetailItem.imdb_id,
          this.currentDetailItem.media_type
        );
        this.currentDetailReleases = releases || [];

        // Fetch fresh info from database
        let freshInfo = null;
        if (isTV) {
          if (this.currentDetailItem.imdb_id) {
            freshInfo = await window.electron.getTVInfoByIMDB(this.currentDetailItem.imdb_id);
          }
          if (!freshInfo && this.currentDetailItem.tmdb_id) {
            freshInfo = await window.electron.getTVInfoByTMDB(this.currentDetailItem.tmdb_id);
          }
        } else {
          if (this.currentDetailItem.imdb_id) {
            freshInfo = await window.electron.getMovieInfoByIMDB(this.currentDetailItem.imdb_id);
          }
          if (!freshInfo && this.currentDetailItem.tmdb_id) {
            freshInfo = await window.electron.getMovieInfoByTMDB(this.currentDetailItem.tmdb_id);
          }
        }

        if (freshInfo) {
          this.currentDetailInfo = freshInfo;
          this.closeEditMovieInfo();
          this.refreshCurrentDetailsPage();
        }
      }

      this.showNotification(`Linked to "${details.title || details.name}" — images downloaded and saved`, 'success');
    } catch (e) {
      this.showNotification(`Link failed: ${e.message}`, 'error');
    }
  }

  populateEditFormFromTMDB(details, isTV) {
    document.getElementById('edit-mi-tmdb-id').value = details.id || '';
    if (details.imdb_id || details.external_ids?.imdb_id) {
      document.getElementById('edit-mi-imdb-id').value = details.imdb_id || details.external_ids.imdb_id || '';
    }
    if (details.title || details.name) {
      document.getElementById('edit-mi-title').value = details.title || details.name;
    }
    if (details.original_title || details.original_name) {
      document.getElementById('edit-mi-original-title').value = details.original_title || details.original_name || '';
    }
    if (details.overview) {
      document.getElementById('edit-mi-plot').value = details.overview;
    }
    if (details.tagline) {
      document.getElementById('edit-mi-tagline').value = details.tagline || '';
    }
    if (details.release_date) {
      document.getElementById('edit-mi-release-date').value = details.release_date;
    }
    if (details.runtime) {
      document.getElementById('edit-mi-runtime').value = details.runtime || '';
    }
    if (details.vote_average) {
      document.getElementById('edit-mi-rating').value = details.vote_average;
    }
    if (details.genres) {
      document.getElementById('edit-mi-genres').value = details.genres.map(g => g.name).join(', ');
    }
    if (details.credits?.crew) {
      const directors = details.credits.crew.filter(c => c.job === 'Director');
      if (directors.length > 0) {
        document.getElementById('edit-mi-director').value = directors.map(d => d.name).join(', ');
      }
    }
    if (details.original_language) {
      document.getElementById('edit-mi-language').value = details.original_language;
    }
    if (details.production_countries && details.production_countries.length > 0) {
      document.getElementById('edit-mi-country').value = details.production_countries[0].iso_3166_1;
    }
    if (details.videos?.results) {
      const trailer = details.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
      if (trailer) {
        document.getElementById('edit-mi-trailer').value = trailer.key;
      }
    }
    if (isTV) {
      if (details.first_air_date) {
        document.getElementById('edit-mi-first-air-date').value = details.first_air_date;
      }
      if (details.last_air_date) {
        document.getElementById('edit-mi-last-air-date').value = details.last_air_date;
      }
      if (details.number_of_seasons) {
        document.getElementById('edit-mi-num-seasons').value = details.number_of_seasons;
      }
      if (details.number_of_episodes) {
        document.getElementById('edit-mi-num-episodes').value = details.number_of_episodes;
      }
      if (details.status) {
        document.getElementById('edit-mi-status').value = details.status;
      }
    }
  }

  async deleteFullMovieInfo() {
    if (!this.requireFeature('edit_media_info')) return;

    const item = this.currentDetailItem;
    if (!item) return;

    const info = this.currentDetailInfo || item;
    const isTV = item.media_type === 'tv';
    const label = isTV ? 'TV show' : 'movie';
    const title = info?.title || item.title || item.clean_name;

    if (!confirm(`⚠️ Delete this ${label} completely?\n\n"${title}"\n\nThis will:\n• Delete all ${this.currentDetailReleases?.length || '?'} release(s)\n• Delete all associated NZB files\n• Delete all cached images (cover, backdrop, logo)\n• Remove the ${label} from the database\n\nThis cannot be undone!`)) {
      return;
    }

    // Double confirm
    if (!confirm(`Are you SURE? This will permanently delete "${title}" and all its files.`)) {
      return;
    }

    const tmdbId = info?.tmdb_id || item.tmdb_id || null;
    const imdbId = info?.imdb_id || item.imdb_id || null;

    try {
      const deleteFn = isTV ? window.electron.deleteTVInfoFull : window.electron.deleteMovieInfoFull;
      const result = await deleteFn(tmdbId, imdbId, item.media_type);

      if (result.success) {
        this.showNotification(`${isTV ? 'TV show' : 'Movie'} deleted (${result.deletedReleases} releases removed)`, 'success');
        this.closeEditMovieInfo();

        // Go back to library
        const detailPage = document.getElementById('page-movie-details');
        if (detailPage) detailPage.classList.add('hidden');
        this.currentDetailItem = null;
        this.currentDetailInfo = null;
        this.switchPage('library');
      } else {
        this.showNotification(`Delete failed: ${result.error}`, 'error');
      }
    } catch (e) {
      this.showNotification(`Delete failed: ${e.message}`, 'error');
    }
  }

  async downloadRelease() {
    if (!this.currentReleaseDetail) return;

    try {
      const result = await window.electron.downloadNZB(this.currentReleaseDetail.id);
      if (result.success) {
        this.showNotification(`NZB saved to: ${result.path}`, 'success');
      } else if (!result.canceled) {
        this.showNotification(`Download failed: ${result.error}`, 'error');
      }
    } catch (e) {
      this.showNotification(`Download failed: ${e.message}`, 'error');
    }
  }

  getDownloaderLabel(target) {
    const labels = {
      preferred: 'preferred downloader',
      sabnzbd: 'SABnzbd',
      nzbget: 'NZBGet'
    };
    return labels[target] || target;
  }

  async sendReleaseIdToDownloader(releaseId, target = 'preferred', showSuccess = false) {
    if (!this.requireFeature('send_to_downloader')) {
      throw new Error(this.getFeatureUnavailableMessage('send_to_downloader'));
    }

    const result = await window.electron.sendReleaseToDownloader(releaseId, target);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send release');
    }

    if (showSuccess) {
      this.showNotification(`Release sent to ${this.getDownloaderLabel(result.downloader)}`, 'success');
    }

    return result;
  }

  async sendMultipleReleasesToDownloader(releaseIds, target = 'preferred') {
    if (!this.requireFeature('send_to_downloader')) return;
    if (!Array.isArray(releaseIds) || releaseIds.length === 0) return;

    let successCount = 0;
    let lastError = null;

    for (const releaseId of releaseIds) {
      try {
        await this.sendReleaseIdToDownloader(releaseId, target, false);
        successCount += 1;
      } catch (error) {
        console.error(`Failed to send release ${releaseId}:`, error);
        lastError = error;
      }
    }

    if (successCount === 0) {
      throw new Error(lastError?.message || 'Failed to send selected releases');
    }

    const failureCount = releaseIds.length - successCount;
    const failureText = failureCount > 0 ? `, ${failureCount} failed` : '';
    this.showNotification(
      `Sent ${successCount} release${successCount !== 1 ? 's' : ''} to ${this.getDownloaderLabel(target)}${failureText}`,
      failureCount > 0 ? 'warning' : 'success'
    );
  }

  async queueMultipleReleasesForRefresh(releaseIds) {
    if (!this.requireFeature('owned_refresh')) return;
    if (!Array.isArray(releaseIds) || releaseIds.length === 0) return;

    try {
      const result = await window.electron.queueAutoRefreshBatch(releaseIds);
      if (!result.success) {
        throw new Error(result.error || 'Failed to queue selected releases');
      }

      const failed = Array.isArray(result.errors) ? result.errors.length : 0;
      const failText = failed > 0 ? `, ${failed} failed` : '';
      this.showNotification(
        `Queued ${result.queued} release${result.queued !== 1 ? 's' : ''} for refresh${failText}. NZBarr will refresh them one by one.`,
        failed > 0 ? 'warning' : 'success'
      );

      if (this.currentPage === 'browse') {
        await this.loadBrowsePage();
      } else if (this.currentDetailItem) {
        this.refreshCurrentDetailsPage();
      }
    } catch (error) {
      console.error('Failed to queue refresh batch:', error);
      this.showNotification(`Queue refresh failed: ${error.message}`, 'error');
    }
  }

  async sendCurrentReleaseToDownloader(target = 'preferred') {
    if (!this.currentReleaseDetail) return;

    try {
      await this.sendReleaseIdToDownloader(this.currentReleaseDetail.id, target, true);
    } catch (error) {
      console.error('Failed to send release to downloader:', error);
      this.showNotification(`Send failed: ${error.message}`, 'error');
    }
  }

  async testDownloaderConnection(target) {
    const labels = {
      sabnzbd: 'SABnzbd',
      nzbget: 'NZBGet',
      preferred: 'preferred downloader'
    };

    try {
      const result = await window.electron.testDownloaderConnection(target, this.collectDownloaderSettingsFromForm());
      if (!result.success) {
        throw new Error(result.error || 'Connection test failed');
      }

      let detail = '';
      if (result.downloader === 'sabnzbd' && result.apiBase) {
        detail = ` (${result.apiBase})`;
      } else if (result.downloader === 'nzbget' && result.version) {
        detail = ` (version ${result.version})`;
      }
      const accessText = result.access === 'send'
        ? 'send-only access configured'
        : result.access === 'full'
          ? 'full API access configured'
          : result.access === 'reachable'
            ? 'host reachable'
          : 'connection OK';
      const note = result.note ? ` ${result.note}` : '';
      this.showNotification(`${labels[result.downloader] || result.downloader}: ${accessText}${detail}.${note}`.trim(), 'success');
      if (result.downloader === 'sabnzbd') {
        this.updateSabnzbdDiagnosticsPanel(result);
      }
    } catch (error) {
      console.error('Downloader connection test failed:', error);
      this.showNotification(`Connection test failed: ${error.message}`, 'error');
      if (target === 'sabnzbd') {
        this.updateSabnzbdDiagnosticsPanel({
          access: 'error',
          note: error.message
        });
      }
    }
  }

  async saveOwnedMediaDetails() {
    const release = this.currentReleaseDetail;
    if (!release) return;

    const ownershipType = document.getElementById('release-owned-toggle').checked ? 'owned' : 'imported';
    const sourcePath = document.getElementById('release-source-path').value.trim();
    const ownershipNotes = document.getElementById('release-ownership-notes').value.trim();

    try {
      await window.electron.updateRelease(release.id, {
        ownership_type: ownershipType,
        source_path: sourcePath || null,
        ownership_notes: ownershipNotes || null
      });

      release.ownership_type = ownershipType;
      release.source_path = sourcePath || null;
      release.ownership_notes = ownershipNotes || null;
      this.currentReleaseDetail = release;

      const refreshBtn = document.getElementById('release-refresh-btn');
      if (refreshBtn) {
        refreshBtn.disabled = ownershipType !== 'owned' || !this.canUseFeature('owned_refresh');
        refreshBtn.title = this.canUseFeature('owned_refresh') ? '' : this.getFeatureUnavailableMessage('owned_refresh');
      }
      const queueRefreshBtn = document.getElementById('release-queue-refresh-btn');
      if (queueRefreshBtn) {
        queueRefreshBtn.disabled = !this.canUseFeature('owned_refresh');
        queueRefreshBtn.title = this.canUseFeature('owned_refresh') ? '' : this.getFeatureUnavailableMessage('owned_refresh');
      }

      document.getElementById('release-refresh-status').textContent =
        `Refresh status: ${release.refresh_status || 'idle'}`;

      this.showNotification('Owned media settings saved', 'success');
    } catch (error) {
      console.error('Failed to save owned media details:', error);
      this.showNotification('Failed to save owned media details', 'error');
    }
  }

  async refreshOwnedRelease() {
    if (!this.requireFeature('owned_refresh')) return;

    const release = this.currentReleaseDetail;
    if (!release) return;

    // Use the new SABnzbd-based auto-refresh pipeline (works for all releases, not just "owned")
    const refreshBtn = document.getElementById('release-refresh-btn');
    if (refreshBtn) refreshBtn.disabled = true;
    this.currentRefreshLog = [];
    document.getElementById('release-refresh-status').textContent = 'Refresh status: Starting';

    // Set up progress listener
    const progressHandler = (data) => {
      console.log('[Refresh Progress]', data);
      if (String(data.releaseId) === String(release.id)) {
        const statusEl = document.getElementById('release-refresh-status');
        if (statusEl) statusEl.textContent = `Refresh status: ${data.status} - ${data.message}`;
      }
    };
    window.electron.onAutoRefreshProgress(progressHandler);

    try {
      const result = await window.electron.triggerAutoRefreshManual(release.id);
      console.log('[Refresh Result]', result);
      if (!result.success) {
        const refreshError = new Error(result.error || 'Refresh failed');
        refreshError.markedDeletePending = Boolean(result.markedDeletePending);
        throw refreshError;
      }

      this.showNotification('Release refresh completed', 'success');
      if (this.currentPage === 'browse') {
        await this.loadBrowsePage();
      } else if (this.currentPage === 'categories' || this.currentPage === 'library') {
        this.loadHomeCarousels();
      }
      await this.showReleaseDetail(release.id);
    } catch (error) {
      console.error('Release refresh failed:', error);
      this.showNotification(`Refresh failed: ${error.message}`, 'error');
      document.getElementById('release-refresh-status').textContent = `Refresh status: failed • Error: ${error.message}`;

      if (error.markedDeletePending) {
        await this.showReleaseDetail(release.id);
      }
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  async queueCurrentReleaseForRefresh() {
    if (!this.requireFeature('owned_refresh')) return;

    const release = this.currentReleaseDetail;
    if (!release) return;

    const queueBtn = document.getElementById('release-queue-refresh-btn');
    if (queueBtn) queueBtn.disabled = true;

    try {
      const result = await window.electron.queueAutoRefreshManual(release.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to queue refresh');
      }

      document.getElementById('release-refresh-status').textContent =
        'Refresh status: queued • NZBarr will refresh this release when the current refresh queue reaches it.';
      this.showNotification('Release added to the refresh queue', 'success');
      await this.showReleaseDetail(release.id);
    } catch (error) {
      console.error('Failed to queue release refresh:', error);
      this.showNotification(`Queue refresh failed: ${error.message}`, 'error');
    } finally {
      if (queueBtn) queueBtn.disabled = false;
    }
  }

  async reanalyzeRelease() {
    if (!this.currentReleaseDetail) return;

    const reanalyzeBtn = document.getElementById('release-reanalyze-btn');
    if (reanalyzeBtn) {
      reanalyzeBtn.textContent = '⏳ Analyzing...';
      reanalyzeBtn.disabled = true;
    }

    try {
      const result = await window.electron.reanalyzeRelease(this.currentReleaseDetail.id);
      
      if (result.success) {
        if (result.updated > 0) {
          this.showNotification('✓ Content analysis complete', 'success');
        } else {
          this.showNotification(result.message || 'Content analysis completed, but no new metadata was found.', 'warning');
        }
        this.currentReleaseDetail = this.mergeAnalysisResultIntoRelease(this.currentReleaseDetail, result.result);
        this.renderReleaseDetail(this.currentReleaseDetail);
        // Refresh the visible views so browse rows and the detail modal stay in sync.
        if (this.currentPage === 'browse') {
          await this.loadBrowsePage();
        } else if (this.currentPage === 'categories' || this.currentPage === 'library') {
          this.loadHomeCarousels();
        }
      } else {
        this.showNotification(`Analysis failed: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to re-analyze release:', error);
      this.showNotification('Failed to re-analyze release', 'error');
    } finally {
      if (reanalyzeBtn) {
        reanalyzeBtn.innerHTML = `${SVG_ICONS.refresh} Re-analyze`;
        reanalyzeBtn.disabled = false;
      }
    }
  }

  // Notifications
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    console.log(`[NOTIFICATION ${type}] ${message}`);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new NZBarrApp();
});
