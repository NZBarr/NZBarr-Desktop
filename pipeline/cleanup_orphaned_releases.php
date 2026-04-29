<?php
/**
 * Cleanup Orphaned Releases Script
 * 
 * Removes releases with missing or empty NZB files from the database
 * and cleans up any related files (covers, etc.).
 * 
 * Usage:
 *   php bin/cleanup_orphaned_releases.php                    # Dry run (show what would be deleted)
 *   php bin/cleanup_orphaned_releases.php --execute          # Actually delete
 *   php bin/cleanup_orphaned_releases.php --limit=100        # Process only 100 releases
 *   php bin/cleanup_orphaned_releases.php --execute --limit=100
 */

require_once __DIR__ . '/../private/config.php';

// Initialize database connection
try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
} catch (PDOException $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// Parse command line arguments
$execute = false;
$limit = null;
$specificId = null;
$scanAll = false;
$resume = false;

for ($i = 1; $i < $argc; $i++) {
    $arg = $argv[$i];
    
    if ($arg === '--execute') {
        $execute = true;
    } elseif (strpos($arg, '--limit=') === 0) {
        $limit = (int)substr($arg, 8);
    } elseif (strpos($arg, '--id=') === 0) {
        $specificId = (int)substr($arg, 5);
    } elseif ($arg === '--all') {
        $scanAll = true;
    } elseif ($arg === '--resume') {
        $resume = true;
    } elseif ($arg === '--help' || $arg === '-h') {
        echo "Usage: php bin/cleanup_orphaned_releases.php [options]\n";
        echo "\nOptions:\n";
        echo "  --execute      Actually delete releases (default: dry run)\n";
        echo "  --limit=N      Process only N releases\n";
        echo "  --id=N         Check/delete specific release by ID\n";
        echo "  --all          Scan ALL releases (default: only suspicious ones)\n";
        echo "  --resume       Resume from last position (for large scans)\n";
        echo "  --help, -h     Show this help\n";
        echo "\nBy default, the script only checks releases with:\n";
        echo "  - NULL or 0 size\n";
        echo "  - NULL or invalid post_date\n";
        echo "This makes it much faster for large databases (~300 vs 220k).\n";
        echo "Use --all to scan every release.\n";
        exit(0);
    }
}

echo "======================================================\n";
echo "   NZBarr 2.0 - Orphaned Releases Cleanup\n";
echo "======================================================\n\n";

if (!$execute) {
    echo "⚠️  DRY RUN MODE - No files will be deleted\n";
    echo "   Use --execute to actually delete releases\n\n";
}

// Find releases and check their NZB files
// Default: only scan suspicious releases (NULL/0 size or post_date) for speed
// Use --all to scan every release

$sql = "SELECT r.id, r.search_name, r.nzb_guid, r.category_id, r.media_id, r.media_type,
               r.imdb_id, r.tmdb_id, r.size, r.post_date
        FROM releases r
        WHERE 1=1";

$params = [];

if ($specificId !== null) {
    $sql .= " AND r.id = ?";
    $params[] = $specificId;
} elseif (!$scanAll) {
    // Only scan suspicious releases (much faster for large databases)
    $sql .= " AND (r.size IS NULL OR r.size = 0 OR r.post_date IS NULL OR r.post_date = '0000-00-00 00:00:00')";
}

// Resume from last position
if ($resume && !$specificId) {
    $markerFile = __DIR__ . '/.cleanup_last_id';
    if (file_exists($markerFile)) {
        $lastId = (int)file_get_contents($markerFile);
        $sql .= " AND r.id > ?";
        $params[] = $lastId;
        echo "▶️  Resuming from release ID: $lastId\n\n";
    }
}

$sql .= " ORDER BY r.id ASC" . ($limit ? " LIMIT " . (int)$limit : "");

echo "🔍 Scanning releases...\n";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$releases = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($releases)) {
    echo "✅ No releases found matching criteria.\n";
    exit(0);
}

echo "📦 Found " . count($releases) . " releases to check\n\n";

$orphaned = [];
$valid = 0;

foreach ($releases as $release) {
    $nzbGuid = $release['nzb_guid'];
    $firstChar = substr($nzbGuid, 0, 1);
    $nzbPath = rtrim(NZB_FILES_PATH, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $firstChar . DIRECTORY_SEPARATOR . $nzbGuid . '.nzb.gz';
    
    $isOrphaned = false;
    $reason = '';
    
    // Check if NZB file exists
    if (!file_exists($nzbPath)) {
        $isOrphaned = true;
        $reason = 'NZB file not found';
    } else {
        // Check if file is empty
        $fileSize = filesize($nzbPath);
        if ($fileSize === 0) {
            $isOrphaned = true;
            $reason = 'NZB file is empty (0 bytes)';
        } else {
            // Try to read and validate
            $lines = @gzfile($nzbPath);
            if ($lines === false || empty($lines)) {
                $isOrphaned = true;
                $reason = 'NZB file is corrupt (cannot decompress)';
            } else {
                $content = implode('', $lines);
                if (stripos($content, '<nzb') === false) {
                    $isOrphaned = true;
                    $reason = 'NZB file is corrupt (invalid XML)';
                }
            }
        }
    }
    
    if ($isOrphaned) {
        $orphaned[] = [
            'release' => $release,
            'reason' => $reason,
            'nzb_path' => $nzbPath
        ];
    } else {
        $valid++;
    }
}

echo "✅ Valid releases: $valid\n";
echo "❌ Orphaned releases: " . count($orphaned) . "\n\n";

if (empty($orphaned)) {
    echo "🎉 No orphaned releases found! Database is clean.\n";
    exit(0);
}

// Report orphaned releases
echo "═══════════════════════════════════════════════════\n";
echo "ORPHANED RELEASES TO DELETE:\n";
echo "═══════════════════════════════════════════════════\n\n";

foreach ($orphaned as $index => $item) {
    $release = $item['release'];
    echo ($index + 1) . ". ID: {$release['id']}\n";
    echo "   Name: {$release['search_name']}\n";
    echo "   GUID: {$release['nzb_guid']}\n";
    echo "   Reason: {$item['reason']}\n";
    echo "   NZB Path: {$item['nzb_path']}\n";
    echo "\n";
}

if (!$execute) {
    echo "═══════════════════════════════════════════════════\n";
    echo "SUMMARY (DRY RUN):\n";
    echo "═══════════════════════════════════════════════════\n";
    echo "   Total orphaned: " . count($orphaned) . " releases\n";
    echo "   Would delete: " . count($orphaned) . " database records\n";
    echo "   Would delete: " . count($orphaned) . " NZB files\n";
    echo "\n";
    echo "⚠️  Run with --execute to actually delete these releases\n";
    exit(0);
}

// EXECUTE DELETION
echo "\n";
echo "═══════════════════════════════════════════════════\n";
echo "EXECUTING DELETION...\n";
echo "═══════════════════════════════════════════════════\n\n";

$deleted = 0;
$errors = 0;
$totalToProcess = count($orphaned);

foreach ($orphaned as $index => $item) {
    $release = $item['release'];
    $releaseId = $release['id'];
    $nzbPath = $item['nzb_path'];
    
    $startTime = microtime(true);
    
    echo "[" . ($index + 1) . "/$totalToProcess] Deleting release ID: {$releaseId} - {$release['search_name']}\n";
    
    // Delete NZB file
    if (file_exists($nzbPath) && @unlink($nzbPath)) {
        echo "   ✅ Deleted NZB: $nzbPath\n";
    }
    
    // Delete from database
    try {
        $deleteStmt = $pdo->prepare("DELETE FROM releases WHERE id = ?");
        $deleteStmt->execute([$releaseId]);
        echo "   ✅ Deleted from database\n";
        $deleted++;
    } catch (PDOException $e) {
        echo "   ❌ Database delete failed: " . $e->getMessage() . "\n";
        $errors++;
    }
    
    // Save progress for resume
    file_put_contents(__DIR__ . '/.cleanup_last_id', $releaseId);
    
    $elapsed = round(microtime(true) - $startTime, 2);
    echo "   ⏱️  Completed in {$elapsed}s\n\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════\n";
echo "CLEANUP COMPLETE\n";
echo "═══════════════════════════════════════════════════\n";
echo "   Deleted:  $deleted releases\n";
echo "   Errors:   $errors\n";
echo "═══════════════════════════════════════════════════\n";

// Clean up resume marker on successful completion
if ($errors === 0 && file_exists(__DIR__ . '/.cleanup_last_id')) {
    @unlink(__DIR__ . '/.cleanup_last_id');
    echo "\n✅ Cleanup marker file removed\n";
}
