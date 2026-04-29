<?php
// 1x01-to-S01E01.php / rename-nzb.php

require_once __DIR__ . '/../private/config.php';

$folderPath = isset($argv[1])
    ? rtrim($argv[1], DIRECTORY_SEPARATOR)
    : rtrim(NZB_IMPORT_FOLDER, DIRECTORY_SEPARATOR);

if (!is_dir($folderPath)) {
    die("ERROR: Folder missing.\n");
}

function cleanFilename($filename) {
    // Detecteer of het een .gz bestand is
    $isGzipped = str_ends_with(strtolower($filename), '.nzb.gz');
    
    if ($isGzipped) {
        $ext = 'nzb.gz';
        // Haal .nzb.gz van de naam af voor we gaan schoonmaken
        $originalBase = substr($filename, 0, -7);
    } else {
        $ext = 'nzb';
        // Haal .nzb van de naam af
        $originalBase = pathinfo($filename, PATHINFO_FILENAME);
    }

    // -----------------------------
    // 1. TMDB ID veiligstellen
    // -----------------------------
    $tmdbId = null;
    if (preg_match('/(?:tmdbID|TmdB)[\._-]?(\d+)/i', $originalBase, $m)) {
        $tmdbId = $m[1];
    }

    // -----------------------------
    // 2. Schoonmaken: verwijder ID's
    // -----------------------------
    $base = preg_replace('/\(?tt\d+\)?/i', '', $originalBase);
    $base = preg_replace('/\(?(?:tmdbID|TmdB)[\._-]?\d+\)?/i', '', $base);

    // -----------------------------
    // 3. Basis normalisatie
    // -----------------------------
    $base = str_replace(['[', ']', '_'], '.', $base);

    $base = preg_replace_callback(
        '/\b(\d{1,3})[xX](\d{1,3})\b/',
        function($m) {
            return "S" .
                str_pad($m[1], 2, '0', STR_PAD_LEFT) .
                "E" .
                str_pad($m[2], 2, '0', STR_PAD_LEFT);
        },
        $base
    );

    $base = preg_replace('/\.S(\d{2})(?![E\d])/i', '.S$1E00', $base);

    // -----------------------------
    // 4. Zoek SxxExx robuust
    // -----------------------------
    if (preg_match('/S\d{2}E\d{2}/i', $base, $seMatch)) {
        $se = strtoupper($seMatch[0]);
        $parts = preg_split('/S\d{2}E\d{2}/i', $base, 2);
        $before = trim($parts[0], ".");
        $after  = isset($parts[1]) ? trim($parts[1], ".") : '';

        $year = null;
        if (preg_match('/(?<!\d)(19|20)\d{2}(?!\d)/', $after, $yearMatch)) {
            $year = $yearMatch[0];
        }

        if ($year) {
            $after = preg_replace('/\(?' . $year . '\)?/', '', $after);
        }

        $title = trim(preg_replace('/\.+/', '.', $before), '.');
        $rest = trim(preg_replace('/\.+/', '.', $after), '.');

        $base = $title . "." . $se;
        if ($year) { $base .= ".(" . $year . ")"; }
        if (!empty($rest)) { $base .= "." . $rest; }
    }

    $base = preg_replace('/\.{2,}/', '.', $base);
    $base = trim($base, '.');

    if ($tmdbId) {
        $base .= " (TmdB-" . $tmdbId . ")";
    }

    return $base . '.' . $ext;
}

// --------------------------------------------------

$files = scandir($folderPath);

foreach ($files as $file) {
    $lowerFile = strtolower($file);
    
    // Check of het bestand eindigt op .nzb OF .nzb.gz
    $isNzb = str_ends_with($lowerFile, '.nzb');
    $isNzbGz = str_ends_with($lowerFile, '.nzb.gz');

    if (!$isNzb && !$isNzbGz) {
        continue;
    }

    $new = cleanFilename($file);

    if ($file !== $new) {
        if (file_exists($folderPath . "/" . $new)) {
            unlink($folderPath . "/" . $file);
            echo "Deleted (Duplicate): $file\n";
        } else {
            rename($folderPath . "/" . $file, $folderPath . "/" . $new);
            echo "Renamed: $file -> $new\n";
        }
    }
}

echo "Schoonmaak voltooid.\n";