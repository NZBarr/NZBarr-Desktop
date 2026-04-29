<?php
/**
 * bin/rename-music-nzb.php
 * 
 * Renames music NZB files to "Artist - Album - Year [extras].nzb" format
 * so they work with the music tagger script.
 * 
 * Usage: php bin/rename-music-nzb.php [folder_path]
 */

require_once __DIR__ . '/../private/config.php';

if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.\n");
}

$targetDir = $argv[1] ?? NZB_IMPORT_FOLDER . '/Music';

if (!is_dir($targetDir)) {
    $targetDir = $argv[1] ?? NZB_IMPORT_FOLDER;
    if (!is_dir($targetDir)) {
        die("Error: Import folder not found at " . $targetDir . "\n");
    }
}

echo "-------------------------------------------------------\n";
echo "NZBarr 2.0 - Music Filename Normalizer\n";
echo "Scanning: " . $targetDir . "\n";
echo "-------------------------------------------------------\n";

$all_files = scandir($targetDir);
$files = [];
foreach ($all_files as $f) {
    $full_path = $targetDir . '/' . $f;
    if (is_file($full_path) && str_ends_with($f, '.nzb')) {
        $files[] = $full_path;
    }
}
$renamedCount = 0;
$skippedCount = 0;
$errorCount = 0;

// Known multi-word artists
$knownArtists = [
    'linkin park', 'taylor swift', 'ac dc', 'guns n roses', 'pink floyd', 
    'foo fighters', 'the weeknd', 'bonnie tyler', 'enrique iglesias',
    'susan mccann', 'michael jackson', 'celine dion', 'barbra streisand',
    'adele', 'ed sheeran', 'riana', 'lady gaga', 'bruno mars',
    'maroon 5', 'coldplay', 'imagine dragons', 'one direction'
];

foreach ($files as $file) {
    $filename = basename($file);
    
    // Skip if already has mbid tag (already processed)
    if (preg_match('/\{\{mbid:/i', $filename)) {
        echo "Skipping (already tagged): $filename\n";
        $skippedCount++;
        continue;
    }
    
    // Skip if already in correct format
    if (preg_match('/^.+ - .+ - \d{4}/', $filename)) {
        echo "Skipping (already formatted): $filename\n";
        $skippedCount++;
        continue;
    }
    
    // Remove .nzb extension for processing
    $name = preg_replace('/\.nzb$/i', '', $filename);
    
    // Already in "Artist - Album - (YYYY)" format? Fix the parentheses
    if (preg_match('/^(.+?) - (.+?) - \((\d{4})\)(.*)$/', $name, $m)) {
        // Already formatted but has (YYYY) - convert to YYYY
        $artist = trim($m[1]);
        $album = trim($m[2]);
        $year = $m[3];
        $extrasStr = trim($m[4]);
        
        // Extract extras from brackets
        while (preg_match('/\[([^\]]+)\]/', $extrasStr, $em)) {
            $extras[] = $em[1];
            $extrasStr = str_replace($em[0], '', $extrasStr);
        }
        
        // Clean up artist
        $artist = trim($artist);
        $artist = preg_replace('/^the\s+/i', '', $artist);
        
        // Clean album
        $album = ucwords(strtolower(trim($album)));
        
        // Build new name
        $newParts = [$artist, $album];
        if (!empty($year)) $newParts[] = $year;
        
        $newName = implode(' - ', $newParts);
        if (!empty($extras)) $newName .= ' [' . implode(' ', $extras) . ']';
        
        $newFilename = $newName . '.nzb';
        
        // Handle duplicates
        $targetPath = $targetDir . '/' . $newFilename;
        if (file_exists($targetPath)) {
            $counter = 1;
            while (file_exists($targetDir . '/' . $newName . " ($counter).nzb")) {
                $counter++;
            }
            $newFilename = $newName . " ($counter).nzb";
        }
        
        if (rename($file, $targetDir . '/' . $newFilename)) {
            echo "Fixed: $filename -> $newFilename\n";
            $renamedCount++;
        }
        continue;
    }
    
    // Extract year (YYYY) or (YYYY)
    $year = '';
    $year = '';
    if (preg_match('/\((\d{4})\)/', $name, $m)) {
        $year = $m[1];
        $name = str_replace($m[0], '', $name);
    } elseif (preg_match('/[\s\.\-_](\d{4})[\s\.\-_]?$/', $name, $m)) {
        $year = $m[1];
        $name = str_replace(' ' . $year, '', $name);
    }
    
    // Extract extra info from brackets [...] - preserve them
    $extras = [];
    while (preg_match('/\[([^\]]+)\]/', $name, $m)) {
        $extras[] = $m[1];
        $name = str_replace($m[0], '', $name);
    }
    
    // Clean up the name
    $name = trim($name);
    $name = preg_replace('/[\s\-_]+/', ' ', $name);
    $name = preg_replace('/^\d+\s*/', '', $name);
    
    // Try to detect artist
    $artist = '';
    $album = '';
    $lowerName = strtolower($name);
    
    // Check for known multi-word artists at the start
    foreach ($knownArtists as $known) {
        if (strpos($lowerName, $known) === 0) {
            $artist = ucwords($known);
            $album = trim(substr($name, strlen($known)));
            break;
        }
    }
    
    // If no known artist match, try splitting
    if (empty($artist)) {
        $words = explode(' ', $name);
        
        if (count($words) <= 2) {
            $artist = $name;
            $album = '';
        } else {
            // First word as artist
            $artist = $words[0];
            $album = implode(' ', array_slice($words, 1));
            
            // If artist is too short, include more
            if (strlen($artist) <= 3 && count($words) > 2) {
                $artist = implode(' ', array_slice($words, 0, 2));
                $album = implode(' ', array_slice($words, 2));
            }
        }
    }
    
    // Clean up artist name
    $artist = trim($artist);
    $artist = preg_replace('/^the\s+/i', '', $artist);
    
    // Clean up album name
    $album = trim($album);
    $album = preg_replace('/^' . preg_quote($artist, '/') . '[\s\-_]*/i', '', $album);
    $album = ucwords(strtolower($album));
    
    // Reconstruct filename
    $newParts = [];
    if (!empty($artist)) {
        $newParts[] = $artist;
    }
    if (!empty($album)) {
        $newParts[] = $album;
    }
    if (!empty($year)) {
        $newParts[] = $year;
    }
    
    if (count($newParts) < 2) {
        echo "Skipping (cannot parse): $filename\n";
        $skippedCount++;
        continue;
    }
    
    $newName = implode(' - ', $newParts);
    
    // Add extras back in brackets
    if (!empty($extras)) {
        $newName .= ' [' . implode(' ', $extras) . ']';
    }
    
    $newFilename = $newName . '.nzb';
    
    // Handle duplicates
    $targetPath = $targetDir . '/' . $newFilename;
    if (file_exists($targetPath)) {
        $counter = 1;
        while (file_exists($targetDir . '/' . $newName . " ($counter).nzb")) {
            $counter++;
        }
        $newFilename = $newName . " ($counter).nzb";
    }
    
    $oldPath = $file;
    $newPath = $targetDir . '/' . $newFilename;
    
    if (rename($oldPath, $newPath)) {
        echo "Renamed: $filename -> $newFilename\n";
        $renamedCount++;
    } else {
        echo "ERROR renaming: $filename\n";
        $errorCount++;
    }
}

echo "-------------------------------------------------------\n";
echo "Finished. Renamed: $renamedCount | Skipped: $skippedCount | Errors: $errorCount\n";
