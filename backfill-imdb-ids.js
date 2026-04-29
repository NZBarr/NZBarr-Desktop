// Backfill missing IMDB IDs using sqlite3 CLI + TMDB API
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const DB_PATH = "/Users/hermansteijn/Library/Application Support/nzbarr-desktop/nzbarr.db";

function sqliteQuery(sql) {
  try {
    const output = execSync(`sqlite3 -json "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
    if (!output.trim()) return [];
    return JSON.parse(output);
  } catch (e) {
    // If json mode fails, try line mode
    try {
      const output = execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
      if (!output.trim()) return [];
      return output.trim().split('\n').map(line => {
        const parts = line.split('|');
        return parts;
      });
    } catch (e2) {
      return [];
    }
  }
}

function sqliteRun(sql) {
  try {
    execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
  } catch (e) {
    console.error(`  Error: ${e.message}`);
  }
}

function getMovieDetails(tmdbId, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=external_ids&api_key=${apiKey}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  // Get TMDB API key
  const keyRows = sqliteQuery("SELECT value FROM app_settings WHERE key = 'api_tmdb_key'");
  const apiKey = keyRows[0]?.value;
  if (!apiKey) {
    console.error('ERROR: TMDB API key not configured');
    process.exit(1);
  }

  // Find movie_info records missing imdb_id
  const movies = sqliteQuery("SELECT id, tmdb_id, title FROM movie_info WHERE imdb_id IS NULL AND tmdb_id IS NOT NULL");
  console.log(`Found ${movies.length} movie_info records missing IMDB IDs`);

  let updated = 0;
  let errors = 0;

  for (const movie of movies) {
    console.log(`\nLooking up: ${movie.title} (TMDB: ${movie.tmdb_id})`);
    try {
      const details = await getMovieDetails(movie.tmdb_id, apiKey);
      const imdbId = details?.external_ids?.imdb_id;

      if (imdbId) {
        console.log(`  ✓ Found IMDB ID: ${imdbId}`);
        sqliteRun(`UPDATE movie_info SET imdb_id = '${imdbId}' WHERE id = ${movie.id}`);
        sqliteRun(`UPDATE releases SET imdb_id = '${imdbId}' WHERE media_type = 'movie' AND tmdb_id = ${movie.tmdb_id} AND (imdb_id IS NULL OR imdb_id = '')`);
        updated++;
      } else {
        console.log(`  ⚠ No IMDB ID found`);
      }
    } catch (e) {
      console.error(`  ✗ Error: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nDone! Updated ${updated} records, ${errors} errors`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
