<?php
// movetobin.php - PATH AWARE VERSION (Gzip Support)
require_once __DIR__ . '/../private/config.php';
$folderPath = (isset($argv[1]) ? rtrim($argv[1], DIRECTORY_SEPARATOR) : rtrim(NZB_IMPORT_FOLDER, DIRECTORY_SEPARATOR));
$binPath = $folderPath . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR;

if (!is_dir($binPath)) mkdir($binPath, 0755, true);

$files = scandir($folderPath);
foreach ($files as $file) {
    $lowerFile = strtolower($file);
    
    // Check of het .nzb of .nzb.gz is
    $isNzbGz = str_ends_with($lowerFile, '.nzb.gz');
    $isNzb   = str_ends_with($lowerFile, '.nzb') && !$isNzbGz;

    // Als het geen van beide is, overslaan
    if (!$isNzb && !$isNzbGz) continue;

    // Check if file is in "Artist - Album" format (for music) - these should NOT go to bin
    // This handles: "Artist - Album", "Artist - Album - Year", "Artist - Album (Year)", etc.
    if (preg_match('/^.+? - .+/', $file)) {
        echo "Skipping (proper format): $file\n";
        continue;
    }

    // Check of er GEEN IMDb (tt...), GEEN TMDB ID en GEEN MusicBrainz ID in de naam staat
    if (!preg_match('/tt\d{7,10}/i', $file) && !preg_match('/\(TmdB-\d+\)/i', $file) && !preg_match('/mbid/i', $file)) {
        if (rename($folderPath . DIRECTORY_SEPARATOR . $file, $binPath . $file)) {
            echo "Moved to bin: $file\n";
        }
    }
}