<?php
/**
 * Backfill Release Data Script
 * 
 * Extracts size and post_date from existing NZB files for releases
 * that have missing data (NULL or 0 values).
 * 
 * Usage:
 *   php bin/backfill_release_data.php                    # Process all releases (pauses after each)
 *   php bin/backfill_release_data.php --limit=100        # Process only 100 releases
 *   php bin/backfill_release_data.php --force            # Re-process even if data exists
 *   php bin/backfill_release_data.php --size-only        # Only update missing size
 *   php bin/backfill_release_data.php --date-only        # Only update missing post_date
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
$limit = null;
$force = false;
$sizeOnly = false;
$dateOnly = false;
$addDateOnly = false;

for ($i = 1; $i < $argc; $i++) {
    $arg = $argv[$i];
    
    if (strpos($arg, '--limit=') === 0) {
        $limit = (int)substr($arg, 8);
    } elseif ($arg === '--force') {
        $force = true;
    } elseif ($arg === '--size-only') {
        $sizeOnly = true;
    } elseif ($arg === '--date-only') {
        $dateOnly = true;
    } elseif ($arg === '--add-date-only') {
        $addDateOnly = true;
    } elseif ($arg === '--help' || $arg === '-h') {
        echo "Usage: php bin/backfill_release_data.php [options]\n";
        echo "\nOptions:\n";
        echo "  --limit=N        Process only N releases\n";
        echo "  --force          Re-process even if data exists\n";
        echo "  --size-only      Only update missing size\n";
        echo "  --date-only      Only update missing post_date\n";
        echo "  --add-date-only  Only update missing add_date\n";
        echo "  --help, -h       Show this help\n";
        exit(0);
    }
}

/**
 * Parse NZB file and extract size and post date
 * 
 * @param string $nzbPath Path to the .nzb.gz file
 * @return array ['size' => int, 'post_date' => string|null]
 */
function parseNzbFile($nzbPath) {
    $size = 0;
    $postDateTimestamp = null;

    if (!file_exists($nzbPath)) {
        return ['size' => 0, 'post_date' => null, 'error' => 'File not found'];
    }

    // Read gzipped content using gzfile (more reliable than gzdecode)
    $lines = @gzfile($nzbPath);
    if ($lines === false) {
        return ['size' => 0, 'post_date' => null, 'error' => 'Could not read file'];
    }
    $nzbContent = implode('', $lines);

    // Parse XML
    $xml = @simplexml_load_string($nzbContent);
    if (!$xml) {
        return ['size' => 0, 'post_date' => null, 'error' => 'Invalid XML'];
    }
    
    $ns = $xml->getDocNamespaces();
    $data = $xml->children($ns[''] ?? null);
    
    // Scan the files for size and date
    foreach ($data->file as $file) {
        $attributes = $file->attributes();
        
        // Date check (Unix timestamp)
        if (isset($attributes['date'])) {
            $rawDate = (string)$attributes['date'];
            $fileDate = is_numeric($rawDate) ? (int)$rawDate : strtotime($rawDate);
            
            if ($fileDate > 0) {
                // We want the earliest date in the NZB (oldest segment)
                if ($postDateTimestamp === null || $fileDate < $postDateTimestamp) {
                    $postDateTimestamp = $fileDate;
                }
            }
        }
        
        // Calculate size via segments
        $fileChildren = $file->children($ns[''] ?? null);
        if (isset($fileChildren->segments)) {
            foreach ($fileChildren->segments->segment as $segment) {
                $segmentAttr = $segment->attributes();
                if (isset($segmentAttr['bytes'])) {
                    $size += (int)$segmentAttr['bytes'];
                }
            }
        }
    }
    
    return [
        'size' => $size,
        'post_date' => $postDateTimestamp ? date('Y-m-d H:i:s', $postDateTimestamp) : null
    ];
}

// Build query for releases needing data
$whereConditions = [];
if (!$force) {
    if ($addDateOnly) {
        // Only add_date
        $whereConditions[] = "(r.add_date IS NULL OR r.add_date = '0000-00-00 00:00:00')";
    } elseif ($sizeOnly) {
        $whereConditions[] = "(r.size IS NULL OR r.size = 0)";
    } elseif ($dateOnly) {
        $whereConditions[] = "(r.post_date IS NULL OR r.post_date = '0000-00-00 00:00:00')";
    } else {
        // Default: check all fields
        $whereConditions[] = "(r.size IS NULL OR r.size = 0 OR r.post_date IS NULL OR r.post_date = '0000-00-00 00:00:00' OR r.add_date IS NULL OR r.add_date = '0000-00-00 00:00:00')";
    }
} else {
    // Force mode: still check add_date
    $whereConditions[] = "(r.add_date IS NULL OR r.add_date = '0000-00-00 00:00:00')";
}

$sql = "SELECT r.id, r.search_name, r.nzb_guid, r.size, r.post_date, r.add_date
        FROM releases r
        WHERE " . (!empty($whereConditions) ? implode(" OR ", $whereConditions) : "1=1") . "
        ORDER BY r.id DESC" . ($limit ? " LIMIT " . (int)$limit : "");

echo "🔍 Querying releases...\n";
echo "   SQL: $sql\n\n";

$stmt = $pdo->query($sql);
$releases = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($releases)) {
    echo "✅ No releases found that need data extraction.\n";
    exit(0);
}

echo "📦 Found " . count($releases) . " releases to process\n\n";

$updated = 0;
$skipped = 0;
$errors = 0;

foreach ($releases as $index => $release) {
    $nzbGuid = $release['nzb_guid'];
    $firstChar = substr($nzbGuid, 0, 1);
    $nzbPath = rtrim(NZB_FILES_PATH, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $firstChar . DIRECTORY_SEPARATOR . $nzbGuid . '.nzb.gz';
    
    echo "[" . ($index + 1) . "/" . count($releases) . "] Processing: " . $release['search_name'] . "\n";
    echo "   ID: {$release['id']}, GUID: $nzbGuid\n";
    
    // Check if NZB file exists
    if (!file_exists($nzbPath)) {
        echo "   ⚠️  NZB file not found at: $nzbPath\n";
        $errors++;
        continue;
    }
    
    // Parse NZB file
    $nzbData = parseNzbFile($nzbPath);
    
    if (isset($nzbData['error'])) {
        echo "   ⚠️  Error parsing NZB: " . $nzbData['error'] . "\n";
        $errors++;
        continue;
    }
    
    echo "   📊 Extracted - Size: " . number_format($nzbData['size']) . " bytes";
    echo ", Post Date: " . ($nzbData['post_date'] ?? 'N/A') . "\n";
    
    // Get file modification time for add_date fallback
    $fileMtime = filemtime($nzbPath);
    $addDateFromFile = $fileMtime ? date('Y-m-d H:i:s', $fileMtime) : null;
    
    // Determine what needs updating
    $needsUpdate = false;
    $updateFields = [];
    $updateParams = [];
    
    // Check add_date first
    if (($release['add_date'] === null || $release['add_date'] === '0000-00-00 00:00:00') && $addDateFromFile) {
        $updateFields[] = "add_date = :add_date";
        $updateParams[':add_date'] = $addDateFromFile;
        $needsUpdate = true;
        echo "   📝 Will update add_date to: $addDateFromFile (from file mtime)\n";
    }
    
    // Check size (skip if add-date-only)
    if (!$addDateOnly) {
        if (!$sizeOnly && !$dateOnly) {
            // Update both if missing
            if (($release['size'] === null || $release['size'] == 0) && $nzbData['size'] > 0) {
                $updateFields[] = "size = :size";
                $updateParams[':size'] = $nzbData['size'];
                $needsUpdate = true;
            }
            
            if (($release['post_date'] === null || $release['post_date'] === '0000-00-00 00:00:00') && $nzbData['post_date'] !== null) {
                $updateFields[] = "post_date = :post_date";
                $updateParams[':post_date'] = $nzbData['post_date'];
                $needsUpdate = true;
            }
        } elseif ($sizeOnly) {
            // Only update size
            if (($release['size'] === null || $release['size'] == 0) && $nzbData['size'] > 0) {
                $updateFields[] = "size = :size";
                $updateParams[':size'] = $nzbData['size'];
                $needsUpdate = true;
            }
        } elseif ($dateOnly) {
            // Only update post_date
            if (($release['post_date'] === null || $release['post_date'] === '0000-00-00 00:00:00') && $nzbData['post_date'] !== null) {
                $updateFields[] = "post_date = :post_date";
                $updateParams[':post_date'] = $nzbData['post_date'];
                $needsUpdate = true;
            }
        }
    }
    
    if ($needsUpdate) {
        $updateParams[':id'] = $release['id'];
        $updateSql = "UPDATE releases SET " . implode(", ", $updateFields) . " WHERE id = :id";
        
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute($updateParams);
        
        echo "   ✅ Updated: " . implode(", ", $updateFields) . "\n";
        $updated++;
    } else {
        echo "   ⏭️  Skipped: No updates needed\n";
        $skipped++;
    }
    
    echo "\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════\n";
echo "📊 SUMMARY\n";
echo "═══════════════════════════════════════════════════\n";
echo "   Total processed: " . count($releases) . "\n";
echo "   Updated:         $updated\n";
echo "   Skipped:         $skipped\n";
echo "   Errors:          $errors\n";
echo "═══════════════════════════════════════════════════\n";
