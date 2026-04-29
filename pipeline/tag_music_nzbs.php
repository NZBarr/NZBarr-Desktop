<?php
/**
 * bin/tag_music_nzbs.php
 * 
 * Scans the NZB import folder for music files (Artist - Album format)
 * and automatically tags them with MusicBrainz IDs if a high-confidence match is found.
 * 
 * Usage: php bin/tag_music_nzbs.php
 */

require_once __DIR__ . '/../private/config.php';

// Ensure we are running in CLI
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.");
}

$targetDir = $argv[1] ?? NZB_IMPORT_FOLDER;

if (!is_dir($targetDir)) {
    die("Error: Import folder not found at " . $targetDir . PHP_EOL);
}

echo "-------------------------------------------------------" . PHP_EOL;
echo "NZBarr 2.0 - Music Auto-Tagger" . PHP_EOL;
echo "Scanning: " . $targetDir . PHP_EOL;
echo "-------------------------------------------------------" . PHP_EOL;

$all_files = scandir($targetDir);
$files = [];
foreach ($all_files as $f) {
    $full_path = $targetDir . '/' . $f;
    if (is_file($full_path) && str_ends_with($f, '.nzb')) {
        $files[] = $full_path;
    }
}
$taggedCount = 0;
$skippedCount = 0;

foreach ($files as $file) {
    $filename = basename($file);
    
    // 1. Skip if already tagged with an ID
    if (preg_match('/(?:\{\{|\[)mbid[:=]\s*([a-f0-9\-]{36})(?:\}\}|\])/i', $filename)) {
        continue;
    }

    // 2. Filter: Only process files that look like "Artist - Album" or "Artist - Album - Year"
    // Updated to handle more flexible formats
    if (strpos($filename, ' - ') === false) {
        continue;
    }

    echo "Processing: " . $filename . "... ";

    // 3. Parse and Clean Filename
    $cleanName = preg_replace('/\.nzb$/i', '', $filename);
    
    // Split on " - " - handle multiple occurrences
    $parts = explode(' - ', $cleanName, 3); // Limit to 3 parts: artist, album, [year]
    
    if (count($parts) < 2) {
        echo "Skipped (Invalid format)." . PHP_EOL;
        continue;
    }
    
    $artist = trim($parts[0]);
    $albumPart = isset($parts[1]) ? trim($parts[1]) : '';
    $yearPart = isset($parts[2]) ? trim($parts[2]) : '';
    
    // Extract year from third part if present (4 digits) - handle (YYYY) or just YYYY
    if (preg_match('/\(?(\d{4})\)?/', $yearPart, $ym)) {
        $year = $ym[1];
        // Remove year from album name
        $album = str_replace($year, '', $albumPart);
    } else {
        $year = '';
        $album = $albumPart;
    }
    
    // Clean album name more aggressively
    $album = preg_replace('/([\(\[]\d{4}[\)\]]|[- ]+\d{4}$)/', '', $album);
    
    // Remove Noise Words
    $noisePattern = '/\b(deluxe|edition|remastered|expanded|anniversary|special|legacy|collector|definitive|limited|super|ultra|mix|remix|mp3|flac|wav|alac|aac|ogg|wma|320kbps|v0|v2|web|cd|vinyl|lp|ep|import|bonus|tracks?|hi-res|high-res|24bit|16bit|44\.1kHz|48kHz|96kHz|192kHz|dts|sacd|bluray|dvd|2cd|3cd|4cd)\b/i';
    $album = preg_replace($noisePattern, '', $album);
    
    // Remove empty brackets
    $album = preg_replace('/[\(\[\{]\s*[\)\]\}]/', '', $album);
    
    // Normalize separators
    $album = str_replace(['-', '_', '.'], ' ', $album);
    
    $artist = trim($artist);
    $album = trim($album);
    $album = preg_replace('/\s+/', ' ', $album);

    if (empty($artist) || empty($album)) {
        echo "Skipped (Empty artist/album)." . PHP_EOL;
        continue;
    }

    // 4. Query MusicBrainz
    $searchQuery = urlencode('artist:"' . $artist . '" release:"' . $album . '"');
    $searchUrl = "https://musicbrainz.org/ws/2/release/?query={$searchQuery}&fmt=json";

    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: NZBarrAutoTagger/1.0 ( " . (defined('MAIL_FROM') ? MAIL_FROM : 'admin@localhost') . " )\r\n"
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
    ];
    $context = stream_context_create($opts);
    
    // Rate Limiting: Sleep 1.1s to respect MusicBrainz API limits (1 req/sec)
    usleep(1100000); 

    $response = @file_get_contents($searchUrl, false, $context);
    
    if ($response) {
        $data = json_decode($response, true);
        
        if (!empty($data['releases'][0])) {
            $match = $data['releases'][0];
            $score = $match['score'] ?? 0;
            
            // 5. Validate Match
            // Lowered to 50 to catch more matches - music is harder to match
            if ($score >= 50) {
                $mbid = $match['id'];
                $newFilename = str_replace('.nzb', " {{mbid:$mbid}}.nzb", $filename);
                $newPath = $targetDir . '/' . $newFilename;
                
                if (rename($file, $newPath)) {
                    echo "MATCH FOUND ($score%) -> Tagged!" . PHP_EOL;
                    $taggedCount++;
                } else {
                    echo "Error renaming file." . PHP_EOL;
                }
            } else {
                echo "Match too weak ($score%). Skipped." . PHP_EOL;
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