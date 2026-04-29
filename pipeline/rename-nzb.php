<?php
// rename-nzb.php - De 'Anchor Force' Editie
require_once __DIR__ . '/../private/config.php';

$folderPath = (isset($argv[1]) ? rtrim($argv[1], DIRECTORY_SEPARATOR) : rtrim(NZB_IMPORT_FOLDER, DIRECTORY_SEPARATOR));

function cleanNzbFilenames(string $folderPath): void {
    if (!is_dir($folderPath)) return;
    $files = scandir($folderPath);
    foreach ($files as $file) {
        if (str_starts_with($file, '.')) continue;

        $fullPath = $folderPath . DIRECTORY_SEPARATOR . $file;
        $lowerFile = strtolower($file);

        $isNzbGz = str_ends_with($lowerFile, '.nzb.gz');
        $isNzb   = str_ends_with($lowerFile, '.nzb') && !$isNzbGz;

        if (!is_file($fullPath) || (!$isNzb && !$isNzbGz)) continue;

        $ext = $isNzbGz ? ".nzb.gz" : ".nzb";
        $workName = $isNzbGz ? substr($file, 0, -7) : substr($file, 0, -4);

        // 1. Eerst alles naar punten converteren voor makkelijke verwerking
        $workName = str_replace([' ', '_', '-'], '.', $workName);
        $workName = preg_replace('/\.+/', '.', $workName);

        // 2. Vertaal termen naar S01E00
        $workName = preg_replace('/\bmini[\s._-]*series\b/i', 'S01E00', $workName);
        $workName = preg_replace_callback('/\b(Season|Seizoen|Deel)[\s._-]*0*(\d{1,2})\b/i', function($m) {
            return 'S' . str_pad($m[2], 2, '0', STR_PAD_LEFT) . 'E00';
        }, $workName);

        // 3. DE FORCE: SxxExx verplaatsen naar direct na de titel
        // We zoeken de SxxExx op
        if (preg_match('/\.?(S\d{2}E\d{2})\.?/i', $workName, $m, PREG_OFFSET_CAPTURE)) {
            $sTag = $m[1][0];
            $offset = $m[0][1];

            // Alles VOOR de tag is potentieel de titel + wat tags
            $beforeTag = substr($workName, 0, $offset);
            // Alles NA de tag is de rest
            $afterTag = substr($workName, $offset + strlen($m[0][0]));

            // Nu moeten we de ECHTE titel isoleren uit $beforeTag
            // We breken op het eerste jaartal of de eerste resolutie
            $parts = preg_split('/(\.(19|20)\d{2}|[\.](2160p|1080p|720p|4k|uhd|web|bluray))/i', $beforeTag, -1, PREG_SPLIT_OFFSET_CAPTURE);
            
            $cleanTitle = trim($parts[0][0], '.');
            $restOfBefore = substr($beforeTag, strlen($cleanTitle));

            // Bouw de naam opnieuw op: TITEL.SxxExx.REST
            $workName = $cleanTitle . '.' . $sTag . $restOfBefore . '.' . $afterTag;
        }

        // 4. Codec replacements & Schoonmaak
        $replacements = [
            '/\.AV1\./i' => '.AV1.OPUS.',
            '/\.x265\./i' => '.HEVC.',
            '/\.H264\./i' => '.x264.',
            '/\.H265\./i' => '.HEVC.',
        ];
        foreach ($replacements as $pattern => $replacement) {
            $workName = preg_replace($pattern, $replacement, $workName);
        }

        $workName = preg_replace('/\.+/', '.', trim($workName, '.'));
        $destinationName = $workName . $ext;
        $destination = $folderPath . DIRECTORY_SEPARATOR . $destinationName;

        if ($file !== $destinationName && rename($fullPath, $destination)) {
            echo "✅ Reordered: $file -> $destinationName\n";
        }
    }
}
cleanNzbFilenames($folderPath);