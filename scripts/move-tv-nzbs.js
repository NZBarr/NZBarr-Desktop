#!/usr/bin/env node

/*
  NZBarr helper: move prepared TV NZB files out of a mixed folder.

  What it does:
    - Reads one source folder.
    - Looks only at .nzb and .nzb.gz files.
    - Detects prepared TV names with season patterns such as:
        [S01]
        [S01E02]
        [Season 1]
        [Seizoen 1]
    - Moves only those TV-looking NZBs to the destination folder.
    - Leaves movie-looking NZBs in the source folder.
    - Avoids overwriting existing files by adding " (2)", " (3)", etc.

  Dry run first:
    node scripts/move-tv-nzbs.js \
      --source "/Volumes/Data/BACKUP-NZBarr-desktop-NZBS/C" \
      --dest "/Volumes/Data/BACKUP-NZBarr-desktop-NZBS/series"

  Actually move files:
    node scripts/move-tv-nzbs.js \
      --source "/Volumes/Data/BACKUP-NZBarr-desktop-NZBS/C" \
      --dest "/Volumes/Data/BACKUP-NZBarr-desktop-NZBS/series" \
      --move

  Important:
    - Keep --source and --dest as two separate quoted paths.
    - Do not combine them into one string.
    - Run the dry run first and check the printed file list before using --move.
*/

const fs = require('fs');
const path = require('path');
const filenameParser = require('../src/filenameParser');

function printUsage() {
  console.log([
    'Usage:',
    '  node scripts/move-tv-nzbs.js --source "/path/to/mixed-folder" --dest "/path/to/tv-folder" [--move]',
    '',
    'By default this is a dry run. Add --move to actually move files.',
    'Only .nzb and .nzb.gz files with TV season markers are moved.'
  ].join('\n'));
}

function parseArgs(argv) {
  const args = {
    source: '',
    dest: '',
    move: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') {
      args.source = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--dest') {
      args.dest = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--move') {
      args.move = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function isNzbFile(fileName) {
  const lower = String(fileName || '').toLowerCase();
  return lower.endsWith('.nzb') || lower.endsWith('.nzb.gz');
}

function hasPreparedTvPattern(fileName) {
  const stem = String(fileName || '')
    .replace(/\.nzb\.gz$/i, '')
    .replace(/\.nzb$/i, '');

  if (/\[(?:S\d{1,2}(?:E\d{1,3})?|Season[\s._-]*\d{1,2}|Seizoen[\s._-]*\d{1,2})\]/i.test(stem)) {
    return true;
  }

  const parsed = filenameParser.parseFilename(fileName);
  return parsed.season !== null && parsed.season !== undefined;
}

function getUniquePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return targetPath;
  }

  const dir = path.dirname(targetPath);
  const ext = targetPath.toLowerCase().endsWith('.nzb.gz') ? '.nzb.gz' : path.extname(targetPath);
  const base = path.basename(targetPath, ext);
  let counter = 2;

  while (true) {
    const candidate = path.join(dir, `${base} (${counter})${ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    counter += 1;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.source || !args.dest) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const sourceDir = path.resolve(args.source);
  const destDir = path.resolve(args.dest);

  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Source folder does not exist: ${sourceDir}`);
  }

  const files = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && isNzbFile(entry.name));

  const tvFiles = files
    .map(entry => entry.name)
    .filter(hasPreparedTvPattern);

  console.log(`${args.move ? 'Moving' : 'Dry run:'} ${tvFiles.length} TV NZB file(s) found in ${sourceDir}`);
  if (!args.move) {
    console.log('Add --move to actually move these files.');
  }

  if (tvFiles.length === 0) {
    return;
  }

  if (args.move && !fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const fileName of tvFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const destinationPath = getUniquePath(path.join(destDir, fileName));
    console.log(`${fileName} -> ${destinationPath}`);

    if (args.move) {
      fs.renameSync(sourcePath, destinationPath);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
