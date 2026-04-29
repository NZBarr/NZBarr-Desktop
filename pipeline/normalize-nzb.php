<?php
/**
 * bin/normalize-nzb.php - Versie 4 (Surgical & Clean)
 * Skip music files in "Artist - Album" format
 */

require_once __DIR__ . '/../private/config.php';

$folder = $argv[1] ?? NZB_IMPORT_FOLDER;
$files = glob(rtrim($folder, '/') . "/*.{nzb,nzb.gz}", GLOB_BRACE);

foreach ($files as $filePath) {
    if (is_dir($filePath)) continue;

    $oldName = basename($filePath);
    $ext = str_ends_with($oldName, '.nzb.gz') ? '.nzb.gz' : '.nzb';
    $base = str_replace($ext, '', $oldName);

    // SKIP music files in "Artist - Album" format - don't normalize these!
    if (preg_match('/^.+? - .+?/', $base)) {
        continue;
    }

    // 1. IDs Extractie
    $imdb = preg_match('/(tt\d+)/i', $base, $m) ? $m[1] : '';
    $tmdb = preg_match('/(?:TmdB-|tmdb-)(\d+)/i', $base, $m) ? $m[1] : '';

    // 2. TV Detectie & Mini-series logica
    $sxxexx = '';

    if (preg_match('/[.\s\-]S(\d{1,2})E(\d{1,2})(?:[.\s\-]|_|$)/i', $base, $m)) {
        $seasonNumber = str_pad($m[1], 2, '0', STR_PAD_LEFT);
        $episodeNumber = str_pad($m[2], 2, '0', STR_PAD_LEFT);
        $sxxexx = "S{$seasonNumber}E{$episodeNumber}";
    } 
    elseif (preg_match('/[.\s\-]S(\d{1,2})(?:[.\s\-]|_|$)/i', $base, $m)) {
        $seasonNumber = str_pad($m[1], 2, '0', STR_PAD_LEFT);
        $sxxexx = "S{$seasonNumber}E00";
    }
    elseif (preg_match('/[\.\-\s](mini[\s\-\.]?series)/i', $base)) {
        $sxxexx = "S01E00";
    }

    // 3. Jaartal (Alleen 19xx of 20xx)
    $year = preg_match('/[\.\s\(\-](19\d{2}|20\d{2})[\.\s\)\-]/', $base, $m) ? $m[1] : '';

    // 4. Titel bepalen (Zoek het breekpunt)
    // FIX: year detection now includes (2025) etc
    $breakpoint = preg_split('/(\.S\d+|[\(\.\s\-](19|20)\d{2}[\)\.\s\-]|tt\d+|TmdB-|\d{3,4}p)/i', $base, -1, PREG_SPLIT_OFFSET_CAPTURE);

    $rawTitle = $breakpoint[0][0];
    $cleanTitle = trim(str_replace(['.', '_'], ' ', $rawTitle));

    // 5. Restant bepalen voor de tags []
    $remainderStr = str_replace($rawTitle, '', $base);

    if ($sxxexx) {
        $remainderStr = preg_replace('/[.\s\-]S\d{1,2}(E\d{1,2})?([.\s\-]|_|$)/i', '', $remainderStr, 1);
    }

    $remainderStr = preg_replace('/(tt\d+|TmdB-\d+|\(\d{4}\)|\b(19|20)\d{2}\b|mini[\s\-\.]?series)/i', '', $remainderStr);

    // Vind resolutie
    if (preg_match('/\b\d{3,4}p\b/i', $base, $m)) {
        $resolution = $m[0];
    } else {
        $resolution = '';
    }

    // Tags bouwen
    $tagsRaw = explode('.', $remainderStr);
    $tagParts = [];

    foreach ($tagsRaw as $t) {
        $t = trim($t, ' .()[]-');

        if (!empty($t) && (strlen($t) > 1 || preg_match('/\d{3,4}p/', $t))) {
            $tagParts[] = $t;
        }
    }

    if ($resolution && !in_array($resolution, $tagParts)) {
        array_unshift($tagParts, $resolution);
    }

    $tagBlock = !empty($tagParts) ? "[" . implode('-', $tagParts) . "]" : "";

    // 6. Assembleer nieuwe naam
    $finalParts = [];
    $finalParts[] = $cleanTitle;

    if ($sxxexx) {
        if (str_ends_with($sxxexx, 'E00')) {
            $seasonPart = substr($sxxexx, 0, 3);
            $finalParts[] = "[$seasonPart]";
        } else {
            $finalParts[] = "[$sxxexx]";
        }
    }

    if ($year)   $finalParts[] = "($year)";
    if ($tagBlock) $finalParts[] = $tagBlock;
    if ($imdb)   $finalParts[] = "(imdb-$imdb)";
    if ($tmdb)   $finalParts[] = "(tmdb-$tmdb)";

    $finalName = implode(' ', $finalParts) . $ext;
    $finalName = preg_replace('/\s+/', ' ', $finalName);

    if ($oldName !== $finalName) {
        rename($filePath, dirname($filePath) . '/' . $finalName);
        echo "Normalized: $finalName\n";
    }
}