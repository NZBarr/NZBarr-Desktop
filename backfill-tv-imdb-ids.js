// Backfill TV show IMDB IDs from TMDB API
const https = require('https');
const { execSync } = require('child_process');

const DB_PATH = "/Users/hermansteijn/Library/Application Support/nzbarr-desktop/nzbarr.db";

function sqliteQuery(sql) {
  try {
    const output = execSync(`sqlite3 -json "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
    if (!output.trim()) return [];
    return JSON.parse(output);
  } catch (e) {
    return [];
  }
}

function sqliteRun(sql) {
  try {
    execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
  } catch (e) {}
}

function getTVDetails(tmdbId, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?append_to_response=external_ids&api_key=${apiKey}`;
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
  const keyRows = sqliteQuery("SELECT value FROM app_settings WHERE key = 'api_tmdb_key'");
  const apiKey = keyRows[0]?.value;
  if (!apiKey) { console.error('TMDB API key not configured'); process.exit(1); }

  // Get unique tmdb_ids that need imdb_id
  const tvShows = sqliteQuery("SELECT DISTINCT tmdb_id FROM releases WHERE media_type='tv' AND tmdb_id IS NOT NULL AND (imdb_id IS NULL OR imdb_id = '')");
  console.log(`Found ${tvShows.length} TV shows needing IMDB IDs`);

  let updated = 0;
  for (const show of tvShows) {
    console.log(`Looking up TMDB TV ${show.tmdb_id}...`);
    try {
      const details = await getTVDetails(show.tmdb_id, apiKey);
      const imdbId = details?.external_ids?.imdb_id;
      if (imdbId) {
        sqliteRun(`UPDATE tv_info SET imdb_id = '${imdbId}' WHERE tmdb_id = ${show.tmdb_id}`);
        const result = execSync(`sqlite3 "${DB_PATH}" "UPDATE releases SET imdb_id = '${imdbId}' WHERE media_type = 'tv' AND tmdb_id = ${show.tmdb_id} AND (imdb_id IS NULL OR imdb_id = '')"`, { encoding: 'utf8' });
        console.log(`  ✓ ${imdbId}`);
        updated++;
      }
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
    }
  }

  console.log(`\nDone! Updated ${updated} TV shows`);
}

main().catch(e => { console.error(e); process.exit(1); });
