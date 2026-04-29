<?php
/**
 * bin/tag_game_nzbs.php
 * 
 * Scans the NZB import folder for game files
 * and automatically tags them with IGDB IDs if a match is found.
 * 
 * Usage: php bin/tag_game_nzbs.php
 */

require_once __DIR__ . '/../private/config.php';

// Ensure we are running in CLI
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.");
}

$targetDir = NZB_IMPORT_FOLDER;

if (!is_dir($targetDir)) {
    die("Error: Import folder not found at " . $targetDir . PHP_EOL);
}

if (!defined('IGDB_CLIENT_ID') || !defined('IGDB_ACCESS_TOKEN')) {
    die("Error: IGDB credentials (IGDB_CLIENT_ID, IGDB_ACCESS_TOKEN) not defined in config.php" . PHP_EOL);
}

echo "-------------------------------------------------------" . PHP_EOL;
echo "NZBarr 2.0 - Game Auto-Tagger (IGDB)" . PHP_EOL;
echo "Scanning: " . $targetDir . PHP_EOL;
echo "-------------------------------------------------------" . PHP_EOL;

$files = glob($targetDir . '/*.nzb');
$taggedCount = 0;
$skippedCount = 0;

foreach ($files as $file) {
    $filename = basename($file);
    
    // 1. Skip if already tagged with an ID
    if (preg_match('/(?:\{\{|\[)igdb[:=]\s*(\d+)(?:\}\}|\])/i', $filename)) {
        continue;
    }

    // 2. Filter: Skip files that look like TV shows (S01E01) to avoid false positives
    if (preg_match('/S\d{2}E\d{2}/i', $filename)) {
        continue;
    }

    echo "Processing: " . $filename . "... ";

    // 3. Parse and Clean Filename
    $cleanName = preg_replace('/\.nzb$/i', '', $filename);
    
    // Replace dots, underscores, dashes with spaces
    $title = str_replace(['.', '_', '-'], ' ', $cleanName);
    
    // Remove version numbers (e.g., v1.0.2, v1.0)
    $title = preg_replace('/v\d+(\.\d+)*\b/i', '', $title);
    
    // Remove common game keywords and platform tags to isolate the title
    $noise = '/\b(switch|nsw|ps4|ps5|xbox|one|series|x|s|pc|game|eshop|multi\d*|region|free|eur|usa|jpn|asia|update|dlc|repack|fitgirl|dodi|iso|crack|cracked|scene|hacked)\b/i';
    $title = preg_replace($noise, '', $title);
    
    // Remove Year (19xx or 20xx)
    $title = preg_replace('/\b(19|20)\d{2}\b/', '', $title);
    
    // Collapse spaces and trim
    $title = trim(preg_replace('/\s+/', ' ', $title));

    if (empty($title) || strlen($title) < 3) {
        echo "Skipped (Title too short/empty)." . PHP_EOL;
        continue;
    }

    // 4. Query IGDB API
    $url = "https://api.igdb.com/v4/games";
    // IGDB Search Query: search "Title"; fields name, id; limit 1;
    $queryBody = 'search "' . addslashes($title) . '"; fields name, id; limit 1;';

    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Client-ID: " . IGDB_CLIENT_ID . "\r\n" .
                        "Authorization: Bearer " . IGDB_ACCESS_TOKEN . "\r\n" .
                        "Content-Type: text/plain\r\n",
            'content' => $queryBody
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
    ];
    $context = stream_context_create($opts);
    
    // Rate Limiting (IGDB allows 4 requests/sec, let's be safe with 0.25s delay)
    usleep(250000); 

    $response = @file_get_contents($url, false, $context);
    
    if ($response) {
        $data = json_decode($response, true);
        
        if (!empty($data[0])) {
            $game = $data[0];
            $igdbId = $game['id'];
            $foundName = $game['name'];
            
            // 5. Validate Match (Similarity check)
            similar_text(strtolower($title), strtolower($foundName), $percent);
            
            if ($percent >= 60) { // Threshold for acceptance
                $newFilename = str_replace('.nzb', " {{igdb:$igdbId}}.nzb", $filename);
                $newPath = $targetDir . '/' . $newFilename;
                
                if (rename($file, $newPath)) {
                    echo "MATCH FOUND ($foundName) -> Tagged!" . PHP_EOL;
                    $taggedCount++;
                } else {
                    echo "Error renaming file." . PHP_EOL;
                }
            } else {
                echo "Match too weak ($percent% - $foundName). Skipped." . PHP_EOL;
                $skippedCount++;
            }
        } else {
            echo "No results found." . PHP_EOL;
            $skippedCount++;
        }
    } else {
        echo "API Request Failed." . PHP_EOL;
    }
}

echo "-------------------------------------------------------" . PHP_EOL;
echo "Finished. Tagged: $taggedCount | Skipped: $skippedCount" . PHP_EOL;