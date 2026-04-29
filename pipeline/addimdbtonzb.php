<?php
// addimdbtonzb.php - STRENG VOOR MOVIES ONLY (Gzip Support)
require_once __DIR__ . '/../private/config.php';

$folderPath = (isset($argv[1]) ? rtrim($argv[1], DIRECTORY_SEPARATOR) : rtrim(NZB_IMPORT_FOLDER, DIRECTORY_SEPARATOR)) . DIRECTORY_SEPARATOR;

if (!is_dir($folderPath)) {
    die("Fout: Map niet gevonden: $folderPath\n");
}

$files = scandir($folderPath);
foreach ($files as $file) {
    $lowerFile = strtolower($file);
    
    // Check of het .nzb of .nzb.gz is
    $isNzbGz = str_ends_with($lowerFile, '.nzb.gz');
    $isNzb   = str_ends_with($lowerFile, '.nzb') && !$isNzbGz;

    if (!$isNzb && !$isNzbGz) continue;
    
    // --- STAP 1: TV-SHOWS OVER SLAAN ---
    if (preg_match('/S(\d{1,3})E(\d{1,3})/i', $file)) {
        continue;
    }

    // Als er al een IMDB ID in staat -> Sla over
    if (stripos($file, '(tt') !== false) continue;

    // --- STAP 2: TITEL EXTRAHEREN VOOR FILMS ---
    // We bepalen de werknaam en de extensie
    if ($isNzbGz) {
        $ext = ".nzb.gz";
        $filename = substr($file, 0, -7);
    } else {
        $ext = ".nzb";
        $filename = substr($file, 0, -4);
    }
    
    // We proberen het jaartal te vinden om de titel af te kappen
    if (preg_match('/^(.*?)(?:\(|\b)(19|20)\d{2}(?:\b|\))/i', $filename, $m)) {
        $rawTitle = $m[1];
    } else {
        $rawTitle = $filename;
    }

    // Opschonen: Punten, underscores en rommel weg
    $cleanTitle = str_replace(['.', '_', ','], ' ', $rawTitle);
    $cleanTitle = preg_replace('/\s+/', ' ', $cleanTitle);
    $cleanTitle = trim($cleanTitle);

    if (empty($cleanTitle)) continue;

    // --- STAP 3: API SEARCH (MOVIE ONLY) ---
    echo "Movie Search: '$cleanTitle'...";

    $url = "https://api.themoviedb.org/3/search/movie?api_key=" . TMDB_API_KEY . "&query=" . urlencode($cleanTitle);
    $data = json_decode(@file_get_contents($url), true);
    
    if (!empty($data['results'][0]['id'])) {
        $tmdbMovieId = $data['results'][0]['id'];
        
        // IMDB ID ophalen via TMDB Movie ID
        $detailUrl = "https://api.themoviedb.org/3/movie/{$tmdbMovieId}?api_key=" . TMDB_API_KEY;
        $details = json_decode(@file_get_contents($detailUrl), true);
        
        if (!empty($details['imdb_id'])) {
            $imdbId = $details['imdb_id'];
            
            // Nieuwe bestandsnaam opbouwen: Werknaam + IMDb + oorspronkelijke extensie
            $newFile = $filename . " ($imdbId)" . $ext;
            
            if (rename($folderPath . $file, $folderPath . $newFile)) {
                echo " ✅ Movie Found: $imdbId\n";
            }
        } else {
            echo " ❌ Geen IMDB ID gevonden.\n";
        }
    } else {
        echo " ❌ Niet gevonden\n";
    }
}