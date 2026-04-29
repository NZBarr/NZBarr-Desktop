<?php
/**
 * NZBarr 2.0 - Episode Metadata Harvester (English with Original Fallback)
 */
require_once __DIR__ . '/../private/config.php';

echo "--- Scanning for missing Episode Metadata ---\n";

$failedCacheFile = __DIR__ . '/../storage/failed_episodes.json';
$failedCache = file_exists($failedCacheFile) ? json_decode(file_get_contents($failedCacheFile), true) : [];
if (!is_array($failedCache)) {
    $failedCache = [];
}

$sql = "SELECT DISTINCT tmdb_id, season FROM releases 
        WHERE tmdb_id IS NOT NULL 
        AND season BETWEEN 1 AND 90
        AND CONCAT(tmdb_id, 'x', season) NOT IN (SELECT CONCAT(tv_tmdb_id, 'x', season) FROM episode_info)
        GROUP BY tmdb_id, season";

$toFetch = $pdo->query($sql)->fetchAll();

$saveCache = false;

foreach ($toFetch as $row) {
    $tvId = $row['tmdb_id'];
    $season = $row['season'];
    $cacheKey = $tvId . 'x' . $season;

    if (isset($failedCache[$cacheKey])) {
        continue;
    }

    echo "Fetching S" . sprintf("%02d", $season) . " for TV ID: $tvId... ";

    // We roepen de API aan in het Engels
    $url = "https://api.themoviedb.org/3/tv/$tvId/season/$season?api_key=" . TMDB_API_KEY . "&language=en-US";
    $data = json_decode(@file_get_contents($url), true);

    if (isset($data['episodes'])) {
        $stmt = $pdo->prepare("INSERT INTO episode_info (tv_tmdb_id, season, episode, title, plot, air_date) 
                               VALUES (?, ?, ?, ?, ?, ?) 
                               ON DUPLICATE KEY UPDATE title=VALUES(title), plot=VALUES(plot)");

        foreach ($data['episodes'] as $ep) {
            $plot = $ep['overview'];
            $title = $ep['name'];

            // FALLBACK LOGICA: Als het Engelse plot leeg is, probeer de serie-default op te halen
            if (empty($plot)) {
                // We doen een extra kleine call voor deze specifieke episode in de 'null' taal (original)
                $fallbackUrl = "https://api.themoviedb.org/3/tv/$tvId/season/$season/episode/{$ep['episode_number']}?api_key=" . TMDB_API_KEY;
                $fbData = json_decode(@file_get_contents($fallbackUrl), true);
                
                if (!empty($fbData['overview'])) {
                    $plot = $fbData['overview'];
                }
                if ($title == "Episode " . $ep['episode_number'] && !empty($fbData['name'])) {
                    $title = $fbData['name'];
                }
            }

            $stmt->execute([
                $tvId,
                $season,
                $ep['episode_number'],
                $title,
                $plot,
                !empty($ep['air_date']) ? $ep['air_date'] : null
            ]);
        }
        echo "Done (" . count($data['episodes']) . " episodes) ✅\n";
    } else {
        echo "Failed ❌\n";
        $failedCache[$cacheKey] = time();
        $saveCache = true;
    }
}

if ($saveCache) {
    // Ensure storage directory exists
    if (!is_dir(__DIR__ . '/../storage')) {
        mkdir(__DIR__ . '/../storage', 0777, true);
    }
    file_put_contents($failedCacheFile, json_encode($failedCache));
}

echo "\nDone!\n";