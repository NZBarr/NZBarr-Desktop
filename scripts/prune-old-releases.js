#!/usr/bin/env node

/*
  NZBarr helper: delete old releases from the database and disk.

  What it does:
    - Reads the NZBarr SQLite database.
    - Finds movie/TV releases whose post_date is older than --years.
    - Deletes an old release only when a newer alternative exists.
    - Deletes both:
        1. the release row from the database
        2. the stored NZB file from disk, if it still exists

  Safety rule:
    - Movies are matched by the same IMDb ID or TMDB ID.
    - TV is matched by the same IMDb/TMDB ID AND same season/episode.
      This prevents deleting an old S01 release just because S02 exists.
    - If no newer alternative exists, the old release is kept.

  Dry run first:
    node scripts/prune-old-releases.js --years 15

  Actually delete after checking the preview:
    node scripts/prune-old-releases.js --years 15 --delete

  Use a different age:
    node scripts/prune-old-releases.js --years 13
    node scripts/prune-old-releases.js --years 13 --delete

  Use a specific database:
    node scripts/prune-old-releases.js \
      --db "/Users/you/Library/Application Support/nzbarr-desktop/nzbarr.db" \
      --years 15

  Important:
    - Always run without --delete first.
    - The cutoff is based on release post_date, not movie/TV release year.
    - Close NZBarr before running --delete to avoid editing the DB while the app is open.
*/

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_DB_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'nzbarr-desktop',
  'nzbarr.db'
);

function printUsage() {
  console.log([
    'Usage:',
    '  node scripts/prune-old-releases.js [--db "/path/to/nzbarr.db"] [--years 15] [--delete]',
    '',
    'By default this is a dry run. Add --delete to delete DB rows and NZB files.',
    'A release is deleted only when a newer release exists for the same movie,',
    'or for the same TV show + season + episode.'
  ].join('\n'));
}

function parseArgs(argv) {
  const args = {
    dbPath: DEFAULT_DB_PATH,
    years: 15,
    delete: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--db') {
      args.dbPath = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--years') {
      args.years = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (arg === '--delete') {
      args.delete = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function sqlite(dbPath, sql) {
  return execFileSync('sqlite3', [
    '-readonly',
    '-separator',
    '\t',
    dbPath,
    sql
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 200 });
}

function sqliteWrite(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' });
}

function getCutoffDate(years) {
  const now = new Date();
  now.setFullYear(now.getFullYear() - years);
  return now.toISOString();
}

function parseRows(output) {
  return output
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [
        id,
        searchName,
        mediaType,
        imdbId,
        tmdbId,
        season,
        episode,
        postDate,
        nzbFilePath,
        newerCount
      ] = line.split('\t');

      return {
        id: Number.parseInt(id, 10),
        searchName,
        mediaType,
        imdbId,
        tmdbId,
        season,
        episode,
        postDate,
        nzbFilePath,
        newerCount: Number.parseInt(newerCount, 10) || 0
      };
    });
}

function buildReleaseReadSql() {
  return `
    SELECT
      id,
      REPLACE(REPLACE(COALESCE(search_name, ''), char(10), ' '), char(9), ' ') AS search_name,
      COALESCE(media_type, '') AS media_type,
      COALESCE(imdb_id, '') AS imdb_id,
      COALESCE(tmdb_id, '') AS tmdb_id,
      COALESCE(season, '') AS season,
      COALESCE(episode, '') AS episode,
      COALESCE(post_date, '') AS post_date,
      COALESCE(nzb_file_path, '') AS nzb_file_path,
      0 AS newer_count
    FROM releases
    WHERE post_date IS NOT NULL
      AND media_type IN ('movie', 'tv')
    ORDER BY datetime(post_date) ASC;
  `;
}

function getReleaseGroupKeys(release) {
  const keys = [];

  if (release.mediaType === 'movie') {
    if (release.imdbId) keys.push(`movie|imdb|${release.imdbId}`);
    if (release.tmdbId) keys.push(`movie|tmdb|${release.tmdbId}`);
    return keys;
  }

  if (release.mediaType === 'tv') {
    const season = release.season === '' ? 'unknown' : release.season;
    const episode = release.episode === '' ? 'unknown' : release.episode;
    if (release.imdbId) keys.push(`tv|imdb|${release.imdbId}|s${season}|e${episode}`);
    if (release.tmdbId) keys.push(`tv|tmdb|${release.tmdbId}|s${season}|e${episode}`);
  }

  return keys;
}

function findDeletionCandidates(releases, cutoffDate) {
  const cutoffTime = Date.parse(cutoffDate);
  const groupStats = new Map();

  for (const release of releases) {
    const postTime = Date.parse(release.postDate);
    if (!Number.isFinite(postTime)) continue;

    for (const key of getReleaseGroupKeys(release)) {
      const stats = groupStats.get(key) || { newerCount: 0 };
      if (postTime > cutoffTime) {
        stats.newerCount += 1;
      }
      groupStats.set(key, stats);
    }
  }

  return releases
    .filter(release => {
      const postTime = Date.parse(release.postDate);
      if (!Number.isFinite(postTime) || postTime > cutoffTime) return false;
      const keys = getReleaseGroupKeys(release);
      const newerCount = keys.reduce((total, key) => total + (groupStats.get(key)?.newerCount || 0), 0);
      release.newerCount = newerCount;
      return newerCount > 0;
    })
    .sort((a, b) => Date.parse(a.postDate) - Date.parse(b.postDate));
}

function deleteRelease(dbPath, release) {
  if (release.nzbFilePath) {
    try {
      if (fs.existsSync(release.nzbFilePath)) {
        fs.unlinkSync(release.nzbFilePath);
      }
    } catch (error) {
      console.warn(`Could not delete NZB file for release ${release.id}: ${error.message}`);
    }
  }

  sqliteWrite(dbPath, `DELETE FROM releases WHERE id = ${release.id};`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  if (!Number.isFinite(args.years) || args.years < 1) {
    throw new Error('--years must be a positive number');
  }

  if (!fs.existsSync(args.dbPath)) {
    throw new Error(`Database not found: ${args.dbPath}`);
  }

  const cutoffDate = getCutoffDate(args.years);
  const releases = parseRows(sqlite(args.dbPath, buildReleaseReadSql()));
  const rows = findDeletionCandidates(releases, cutoffDate);

  console.log(`${args.delete ? 'Deleting' : 'Dry run:'} ${rows.length} release(s) older than ${args.years} years with newer alternatives`);
  console.log(`Cutoff post_date: ${cutoffDate}`);
  if (!args.delete) {
    console.log('Add --delete to delete these releases from DB and disk.');
  }

  const previewLimit = 25;
  for (const release of rows.slice(0, previewLimit)) {
    console.log(`#${release.id} ${release.postDate} ${release.mediaType} newer=${release.newerCount} ${release.searchName}`);
  }
  if (rows.length > previewLimit) {
    console.log(`...and ${rows.length - previewLimit} more`);
  }

  if (!args.delete || rows.length === 0) {
    return;
  }

  let deleted = 0;
  for (const release of rows) {
    deleteRelease(args.dbPath, release);
    deleted += 1;
  }

  console.log(`Deleted ${deleted} release(s) from DB and disk.`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
