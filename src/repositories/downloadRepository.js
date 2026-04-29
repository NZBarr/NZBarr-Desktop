// NZBarr Desktop - Download Repository
const db = require('../database');

class DownloadRepository {
  /**
   * Create a new download
   */
  async create(download) {
    const sql = `
      INSERT INTO downloads (
        release_id, nzb_guid, status, progress, total_size,
        downloaded_size, download_speed, eta, error_message, local_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      download.release_id,
      download.nzb_guid,
      download.status || 'queued',
      download.progress || 0,
      download.total_size || 0,
      download.downloaded_size || 0,
      download.download_speed || 0,
      download.eta || 0,
      download.error_message || null,
      download.local_path || null
    ];

    const result = db.run(sql, params);
    return result.id;
  }

  /**
   * Get download by ID
   */
  async getById(id) {
    const sql = `
      SELECT d.*, r.search_name, r.clean_name, r.category_id
      FROM downloads d
      LEFT JOIN releases r ON d.release_id = r.id
      WHERE d.id = ?
    `;
    return db.get(sql, [id]);
  }

  /**
   * Get download by release ID
   */
  async getByReleaseId(releaseId) {
    return db.get('SELECT * FROM downloads WHERE release_id = ?', [releaseId]);
  }

  /**
   * Get download by NZB GUID
   */
  async getByGuid(nzbGuid) {
    return db.get('SELECT * FROM downloads WHERE nzb_guid = ?', [nzbGuid]);
  }

  /**
   * Get all downloads with filters
   */
  async getAll(options = {}) {
    const {
      status = null,
      limit = 50,
      offset = 0
    } = options;

    let sql = `
      SELECT d.*, r.search_name, r.clean_name, r.cover_image, c.name as category_name
      FROM downloads d
      LEFT JOIN releases r ON d.release_id = r.id
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      if (Array.isArray(status)) {
        const placeholders = status.map(() => '?').join(', ');
        sql += ` AND d.status IN (${placeholders})`;
        params.push(...status);
      } else {
        sql += ' AND d.status = ?';
        params.push(status);
      }
    }

    sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.all(sql, params);
  }

  /**
   * Get active downloads
   */
  async getActive() {
    const sql = `
      SELECT d.*, r.search_name, r.clean_name, r.cover_image, c.name as category_name
      FROM downloads d
      LEFT JOIN releases r ON d.release_id = r.id
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE d.status IN ('queued', 'downloading', 'paused')
      ORDER BY d.created_at ASC
    `;
    return db.all(sql);
  }

  /**
   * Update download
   */
  async update(id, updates) {
    const allowedFields = [
      'status', 'progress', 'total_size', 'downloaded_size',
      'download_speed', 'eta', 'error_message', 'local_path',
      'started_at', 'completed_at'
    ];

    const fields = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => `${key} = ?`);

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const sql = `UPDATE downloads SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const params = [...fields.map(key => updates[key.replace(' = ?', '')]), id];

    return db.run(sql, params);
  }

  /**
   * Update download progress
   */
  async updateProgress(id, downloadedSize, speed, eta) {
    const sql = `
      UPDATE downloads SET
        downloaded_size = ?,
        download_speed = ?,
        eta = ?,
        progress = CASE WHEN total_size > 0 THEN (CAST(? AS REAL) / total_size) * 100 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return db.run(sql, [downloadedSize, speed, eta, downloadedSize, id]);
  }

  /**
   * Mark download as completed
   */
  async markCompleted(id, localPath) {
    const sql = `
      UPDATE downloads SET
        status = 'completed',
        progress = 100,
        local_path = ?,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return db.run(sql, [localPath, id]);
  }

  /**
   * Mark download as failed
   */
  async markFailed(id, errorMessage) {
    const sql = `
      UPDATE downloads SET
        status = 'failed',
        error_message = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return db.run(sql, [errorMessage, id]);
  }

  /**
   * Delete download record
   */
  async delete(id) {
    return db.run('DELETE FROM downloads WHERE id = ?', [id]);
  }

  /**
   * Delete completed downloads older than X days
   */
  async cleanupOldDownloads(daysOld = 30) {
    const sql = `
      DELETE FROM downloads 
      WHERE status = 'completed' 
        AND completed_at < datetime('now', ?)
    `;
    return db.run(sql, [`-${daysOld} days`]);
  }

  /**
   * Get download statistics
   */
  async getStats() {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(downloaded_size) as total_downloaded,
        AVG(download_speed) as avg_speed
      FROM downloads
      GROUP BY status
    `;
    return db.all(sql);
  }

  /**
   * Pause all active downloads
   */
  async pauseAll() {
    const sql = `
      UPDATE downloads SET
        status = 'paused',
        updated_at = CURRENT_TIMESTAMP
      WHERE status = 'downloading'
    `;
    return db.run(sql);
  }

  /**
   * Resume paused downloads
   */
  async resumeAll() {
    const sql = `
      UPDATE downloads SET
        status = 'downloading',
        updated_at = CURRENT_TIMESTAMP
      WHERE status = 'paused'
    `;
    return db.run(sql);
  }
}

module.exports = new DownloadRepository();
