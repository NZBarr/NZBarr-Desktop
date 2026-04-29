// NZBarr Desktop - Actor Cache Repository
const db = require('../database');

class ActorCacheRepository {
  /**
   * Save or update an actor from TMDB person data
   */
  async saveOrUpdate(person) {
    // Check if exists
    const existing = db.get('SELECT * FROM actor_cache WHERE tmdb_person_id = ?', [person.tmdb_person_id]);

    if (existing) {
      const sql = `
        UPDATE actor_cache SET
          name = COALESCE(?, name),
          biography = COALESCE(?, biography),
          birthday = ?,
          deathday = ?,
          place_of_birth = ?,
          also_known_as = ?,
          known_for_department = COALESCE(?, known_for_department),
          popularity = ?,
          gender = ?,
          profile_path = COALESCE(?, profile_path),
          has_profile_image = COALESCE(?, has_profile_image),
          raw_json = COALESCE(?, raw_json),
          updated_at = CURRENT_TIMESTAMP
        WHERE tmdb_person_id = ?
      `;
      const params = [
        person.name,
        person.biography || null,
        person.birthday || null,
        person.deathday || null,
        person.place_of_birth || null,
        person.also_known_as ? JSON.stringify(person.also_known_as) : null,
        person.known_for_department || null,
        person.popularity || null,
        person.gender || null,
        person.profile_path || null,
        person.has_profile_image !== undefined ? (person.has_profile_image ? 1 : 0) : existing.has_profile_image,
        person.raw_json || null,
        person.tmdb_person_id
      ];
      db.run(sql, params);
      return this.getByTMDB(person.tmdb_person_id);
    } else {
      const sql = `
        INSERT INTO actor_cache (
          tmdb_person_id, name, profile_path, has_profile_image, biography,
          birthday, deathday, place_of_birth, also_known_as, known_for_department,
          popularity, gender, raw_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const params = [
        person.tmdb_person_id,
        person.name || '',
        person.profile_path || null,
        person.has_profile_image ? 1 : 0,
        person.biography || null,
        person.birthday || null,
        person.deathday || null,
        person.place_of_birth || null,
        person.also_known_as ? JSON.stringify(person.also_known_as) : null,
        person.known_for_department || null,
        person.popularity || null,
        person.gender || null,
        person.raw_json || null
      ];
      const result = db.run(sql, params);
      return this.getById(result.id);
    }
  }

  /**
   * Get actor by TMDB person ID
   */
  getByTMDB(tmdbId) {
    return db.get('SELECT * FROM actor_cache WHERE tmdb_person_id = ?', [tmdbId]);
  }

  /**
   * Get actor by internal ID
   */
  getById(id) {
    return db.get('SELECT * FROM actor_cache WHERE id = ?', [id]);
  }

  /**
   * Search actors by name
   */
  searchByName(query) {
    return db.all('SELECT * FROM actor_cache WHERE name LIKE ? ORDER BY popularity DESC LIMIT 50', [`%${query}%`]);
  }

  /**
   * Get all actors
   */
  getAll() {
    return db.all('SELECT * FROM actor_cache ORDER BY name');
  }

  /**
   * Get top actors by popularity
   */
  getTop(limit = 20) {
    return db.all('SELECT * FROM actor_cache ORDER BY popularity DESC LIMIT ?', [limit]);
  }

  /**
   * Update profile image path
   */
  updateProfileImage(tmdbId, imagePath) {
    db.run('UPDATE actor_cache SET profile_path = ?, has_profile_image = 1, updated_at = CURRENT_TIMESTAMP WHERE tmdb_person_id = ?', [imagePath, tmdbId]);
    return this.getByTMDB(tmdbId);
  }
}

module.exports = new ActorCacheRepository();
