<?php
// addTMDBtonzb.php - NZBarr 2.0: Optimized for Anchor Point filenames & Formatting (Gzip Support)
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

    // Bepaal de extensie en de werknaam (base)
    if ($isNzbGz) {
        $ext = ".nzb.gz";
        $base = substr($file, 0, -7);
    } else {
        $ext = ".nzb";
        $base = substr($file, 0, -4);
    }

    // 1. Check of er al een TMDB ID in de naam staat, en herformatteer indien nodig
    if (preg_match('/[\(.\-]TmdB[.-](\d+)\)?/i', $file, $m)) {
        $existingId = $m[1];
        // Als het NIET het correcte formaat is, herformatteer
        if (!str_contains($file, "(TmdB-$existingId)")) {
            // Verwijder oude notatie uit de base naam
            $tempBase = preg_replace('/[\(.\-]?TmdB[.-]\d+\)?/i', '', $base);
            $newFile = trim($tempBase) . " (TmdB-$existingId)" . $ext;

            if (rename($folderPath . $file, $folderPath . $newFile)) {
                echo "♻️  Gerepareerd formaat: $newFile\n";
            }
        }
        continue; // Sla altijd over als er een ID is gevonden
    }

    // 2. STRIKTE CHECK voor IMDb 
    if (preg_match('/(imdb|tt\d+)/i', $file)) {
        continue; 
    }
    
    // 2a. TV SHOW DETECTIE & TITEL ISOLATIE
    // Zoek naar SxxExx of Sxx (seizoen) als ankerpunt.
    $sTag = '';
    $rawTitle = '';

    // Eerst zoeken naar SxxExx (meest specifiek)
    if (preg_match('/[.\s\-]S(\d{1,2})E(\d{1,2})/i', $base, $matches, PREG_OFFSET_CAPTURE)) {
        $anchorOffset = $matches[0][1];
        $rawTitle = substr($base, 0, $anchorOffset);
        $sTag = $matches[0][0];
    }
    // Anders zoeken naar Sxx (seizoenspakket)
    elseif (preg_match('/[.\s\-]S(\d{1,2})([.\s\-]|$)/i', $base, $matches, PREG_OFFSET_CAPTURE)) {
        $anchorOffset = $matches[0][1];
        $rawTitle = substr($base, 0, $anchorOffset);
        $sTag = $matches[0][0];
    } else {
        // Geen TV ankerpunt gevonden, sla dit bestand over.
        continue;
    }

// 3. TITEL ISOLEREN & OPSCHONEN
    if (empty($rawTitle)) continue;

    // Verwijder rommel (jaar, resolutie, etc.) van het einde van de rauwe titel.
    $cleanTitle = preg_split('/(\.(19|20)\d{2}|[.\-](1080p|720p|480p|2160p|4k|uhd|web|bluray|h264|h265|x264|x265|hevc|ddp|dts|aac|ac3|xvid|divx))/i', $rawTitle)[0];
    $title = trim(str_replace(['.', '_'], ' ', $cleanTitle));
    
    // Hergebruik sTag uit de eerdere match, geen nieuwe match nodig
    if (empty($sTag)) {
        continue;
    }

    if (empty($title)) continue;

    echo "TV Search: '$title' (Anchor: $sTag)... ";
    
    // 4. TMDB API aanroep
    $url = "https://api.themoviedb.org/3/search/tv?api_key=" . TMDB_API_KEY . "&query=" . urlencode($title);
    $data = json_decode(@file_get_contents($url), true);
    
    if (!empty($data['results'][0]['id'])) {
        $tmdbId = $data['results'][0]['id'];
        // Bouw de nieuwe naam op met de correcte extensie
        $newFile = $base . " (TmdB-$tmdbId)" . $ext;
        
        if (rename($folderPath . $file, $folderPath . $newFile)) {
            echo "✅ Gevonden: ID $tmdbId\n";
        }
    } else {
        echo "❌ Niet gevonden\n";
    }
}