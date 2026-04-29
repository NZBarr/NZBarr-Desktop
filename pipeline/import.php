<?php
/**
 * bin/import.php - NZBarr 2.0 Pipeline Smart Import (Argument-Driven)
 *
 * This script now accepts two arguments:
 * 1. The full path to the directory to import.
 * 2. The category name (e.g., "Movies", "TV").
 */

require_once __DIR__ . '/../private/config.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../helpers/MetadataHelper.php';

// --- Argument Handling ---
if ($argc < 3) {
    die("Error: Missing arguments. Usage: php import.php <folder_path> <category_name>\n");
}
$targetFolder = $argv[1];
$categoryName = $argv[2];

if (!is_dir($targetFolder)) {
    die("Error: Folder not found: $targetFolder\n");
}

$files = scandir($targetFolder);
$importCount = 0;

foreach ($files as $file) {
    // 1. PRE-FLIGHT CHECKS (Filter files)
    if ($file === '.' || $file === '..' || str_starts_with($file, '.')) continue;
    
    $filePath = $targetFolder . '/' . $file;
    if (is_dir($filePath)) continue;

    $isGzipFile = str_ends_with($file, '.nzb.gz');
    $isNzb = str_ends_with($file, '.nzb');
    
    if (!$isNzb && !$isGzipFile) continue;

    $baseName = $isGzipFile ? substr($file, 0, -7) : substr($file, 0, -4);

    // 2. READ NZB CONTENT FOR HASH AND XML ANALYSIS
    $nzbContent = file_get_contents($filePath);
    $nzbHash = hash('sha256', $nzbContent);
    
    // 2b. DUPLICATE CHECK (by nzb_hash OR search_name for backward compatibility)
    $checkStmt = $pdo->prepare("SELECT id, search_name FROM releases WHERE nzb_hash = ? OR search_name = ? LIMIT 1");
    $checkStmt->execute([$nzbHash, $baseName]);
    $existingRelease = $checkStmt->fetch(PDO::FETCH_ASSOC);
    if ($existingRelease) {
        echo "ℹ️ Skipping duplicate (hash match: {$existingRelease['search_name']}) and deleting: $baseName\n";
        unlink($filePath);
        continue;
    }

    // 3. XML DATA ANALYSIS (Size, Date, Password)
    $totalBytes = 0; $postDate = null; $password = null; $partsCount = 0;
    
    // Read full content for reliable XML parsing
    $xmlContent = $isGzipFile ? gzfile($filePath) : file($filePath);
    $xmlContent = implode('', $xmlContent);
    
    // Parse segment bytes using regex on full content (handles multiline segments)
    if (preg_match_all('/bytes="(\d+)"/i', $xmlContent, $bytesMatches)) {
        $totalBytes = array_sum($bytesMatches[1]);
        $partsCount = count($bytesMatches[1]);
    }
    
    // Parse date from first <file> tag
    if (preg_match('/<file[^>]+date="(\d+)"/i', $xmlContent, $dateMatch)) {
        $postDate = date('Y-m-d H:i:s', (int)$dateMatch[1]);
    }
    
    // Parse password from meta tag
    if (preg_match('/<meta type="password">(.*?)<\/meta>/i', $xmlContent, $passMatch)) {
        $password = $passMatch[1];
    }
    
    if ($totalBytes == 0) $totalBytes = filesize($filePath);

    // 4. PARSE NORMALIZED FILENAME
    $imdb = preg_match('/\(imdb-(tt\d+)\)/i', $baseName, $m) ? $m[1] : null;
    $tmdb = preg_match('/\(tmdb-(\d+)\)/i', $baseName, $m) ? $m[1] : null;
    $mbid = preg_match('/(?:\{\{|\[)mbid[:=]\s*([a-f0-9\-]{36})(?:\}\}|\])/i', $baseName, $m) ? $m[1] : null;
    // Updated regex to detect season packs like [S01] as well as episodes [S01E02]
    $isTV = preg_match('/\[S(\d{2})(?:E(\d{2}))?\]/i', $baseName, $m);
    $season = $isTV ? (int)$m[1] : null;
    $episode = ($isTV && isset($m[2])) ? (int)$m[2] : null;
    $cleanName = trim(preg_split('/[\[\(\.]/', $baseName)[0]);
    
    // --- Quality Tag Parsing (Resolution, Codecs, Source) ---
    $res = 'SD'; $vCodec = 'h264'; $aCodec = 'AC3'; $source = 'WEB-DL'; $subs = null;
    
    // Verzamel content uit ALLE [vierkante haakjes] blokken om robuuster te parsen.
    preg_match_all('/\[(.*?)\]/i', $baseName, $matches);
    $tagContent = !empty($matches[1]) ? implode('-', $matches[1]) : '';

    if (!empty($tagContent)) {
        if (preg_match('/(2160p|4k|uhd)/i', $tagContent)) $res = '2160p';
        elseif (preg_match('/(1080p|1080i)/i', $tagContent)) $res = '1080p';
        elseif (preg_match('/(720p)/i', $tagContent)) $res = '720p';
        elseif (preg_match('/(480p|576p|sdtv)/i', $tagContent)) $res = 'SD'; // Expliciete SD check

        if (preg_match('/(av1)/i', $tagContent)) $vCodec = 'AV1';
        elseif (preg_match('/(x265|h\.?265|hevc)/i', $tagContent)) $vCodec = 'h265';
        elseif (preg_match('/(xvid|divx)/i', $tagContent)) $vCodec = 'XviD';

        if (preg_match('/(opus)/i', $tagContent)) $aCodec = 'OPUS';
        elseif (preg_match('/(ddp\.?5\.?1|eac3|dd\+)/i', $tagContent)) $aCodec = 'DDP5.1';
        elseif (preg_match('/(dts.?hd|ma)/i', $tagContent)) $aCodec = 'DTS-HD';
        elseif (preg_match('/(dts)/i', $tagContent)) $aCodec = 'DTS';

        if (preg_match('/(bluray|brrip|bdrip)/i', $tagContent)) $source = 'Bluray';
        elseif (preg_match('/(hdtv)/i', $tagContent)) $source = 'HDTV';
        if (preg_match('/-(NL|EN)$|-(NL|EN)-/', $tagContent, $langMatch)) $subs = $langMatch[1];
    }

    // 5. CATEGORY MAPPING (Now argument-driven and reliable)
    $catId = match($categoryName) {
        'TV' => match(true) {
            $res === '2160p' => 2020,
            $res === '1080p' || $res === '720p' => 2010,
            default => 2030,
        },
        'Movies' => match(true) {
            $res === '2160p' => 1020,
            $res === '1080p' || $res === '720p' => 1010,
            default => 1030,
        },
        'Music' => 3010, // Default Music
        'Books' => 7010, // Default E-Book
        'Games' => 4010, // Default PC Game - can be refined later if needed
        'Anime' => 8010, // Default Anime
        default => 9999, // 'Other' category
    };
    
    // 6. STORAGE (SHARDING) & DATABASE
    $guid = md5($baseName . microtime());
    $firstChar = substr($guid, 0, 1);
    $subDir = rtrim(NZB_FILES_PATH, '/') . '/' . $firstChar;
    if (!is_dir($subDir)) mkdir($subDir, 0777, true);
    
    $finalDest = $subDir . '/' . $guid . ".nzb.gz";
    
    if (file_put_contents($finalDest, ($isGzipFile ? $nzbContent : gzencode($nzbContent, 9)))) {
        $stmt = $pdo->prepare(
            "INSERT INTO releases (search_name, clean_name, imdb_id, tmdb_id, category_id, nzb_guid, nzb_hash, size, parts, season, episode, resolution, video_codec, audio_codec, source, subtitles, password, add_date, post_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)"
        );
        
        $params = [
            $baseName, $cleanName, $imdb, $tmdb, $catId, $guid, $nzbHash, $totalBytes, $partsCount, 
            $season, $episode, $res, $vCodec, $aCodec, $source, $subs, $password, $postDate
        ];

        try {
            $stmt->execute($params);
            $releaseId = $pdo->lastInsertId();
            echo "✅ Imported: $cleanName ($res | $vCodec | $aCodec)\n";

            // 7. METADATA HELPERS
            if ($catId >= 1000 && $catId < 3000) { // Movies & TV
                fetchMetadataOnDemand($pdo, $imdb, $tmdb, $isTV);
            } elseif ($catId >= 3000 && $catId < 4000) { // Music
                fetchMusicMetadata($pdo, $releaseId, $baseName, null, ['mbid' => $mbid]);
            } elseif ($catId >= 7000 && $catId < 8000) { // Books
                fetchBookMetadata($pdo, $releaseId, $baseName);
            }

            unlink($filePath);
            $importCount++;
        } catch (PDOException $e) {
            // Always clean up the destination file if the DB insert fails.
            if (file_exists($finalDest)) {
                unlink($finalDest);
            }

            // Specifically catch 'String data, right truncated' (SQLSTATE 22001) for oversized data.
            if ($e->getCode() === '22001') {
                echo "⚠️ Skipping '$baseName' due to oversized data (e.g., password too long). Deleting source file.\n";
                unlink($filePath); // Clean up the original file and continue.
            } else {
                // For any other database error, halt the script for investigation.
                // The source file is intentionally kept for debugging.
                echo "❌ CRITICAL DB ERROR on '$baseName'. Halting script.\n";
                throw $e;
            }
        }
    }
}
echo "--- Import finished for category '$categoryName': $importCount items ---\n";