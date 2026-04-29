<?php
// move-release-year.php - Verbeterde versie voor NZBarr 2.0 (Gzip ondersteuning)
require_once __DIR__ . '/../private/config.php';

$folderPath = (isset($argv[1]) ? rtrim($argv[1], DIRECTORY_SEPARATOR) : rtrim(NZB_IMPORT_FOLDER, DIRECTORY_SEPARATOR)) . DIRECTORY_SEPARATOR;

if (!is_dir($folderPath)) {
    die("Fout: Map niet gevonden: $folderPath\n");
}

// Gebruik GLOB_BRACE om zowel .nzb als .nzb.gz te vinden
$nzbFiles = glob($folderPath . '*.{nzb,nzb.gz}', GLOB_BRACE);

foreach ($nzbFiles as $filePath) {
    $filename = basename($filePath);
    $lowerFilename = strtolower($filename);

    // Bepaal de extensie en de "werknaam" (base)
    if (str_ends_with($lowerFilename, '.nzb.gz')) {
        $ext = '.nzb.gz';
        $base = substr($filename, 0, -7);
    } else {
        $ext = '.nzb';
        $base = substr($filename, 0, -4);
    }

    // 1. Zoek naar het jaartal (tussen 1920 en 2030) dat VÓÓR een SxxExx patroon staat
    // We gebruiken de $base naam zonder extensie voor de regex
    if (preg_match('/^(.*?)[\s.(_\-]+(19\d{2}|20\d{2})[\s.)\-_]+(.*S\d{1,3}E\d{1,3}.*)$/i', $base, $m)) {
        
        $titlePart = trim($m[1], " ._-");
        $year      = $m[2];
        $restPart  = trim($m[3], " ._-");

        // 2. We herbouwen de naam: [Titel] . [SxxExx] . (Jaar) . [Rest]
        $newBase = preg_replace('/(S\d{1,3}E\d{1,3})/i', "$1.($year)", $restPart, 1);
        $newBase = $titlePart . "." . $newBase;

        // 3. Cleanup: vervang dubbele punten/spaties door één punt
        $newBase = preg_replace(['/[\s_]+/', '/\.+/'], '.', $newBase);
        $newBase = trim($newBase, '.');
        
        // Plak de juiste extensie er weer aan vast
        $newFilename = $newBase . $ext;

        if ($filename !== $newFilename) {
            if (rename($filePath, $folderPath . $newFilename)) {
                echo "Year Moved: $filename  ->  $newFilename\n";
            }
        }
    }
}