<?php
/**
 * bin/sync_collections.php - NZBarr 2.0 Collection Sync Script
 * 
 * Syncs movie collection data from TMDB to local database.
 * Fetches collection info for all movies, stores collection data,
 * and downloads collection posters, backdrops, and logos.
 * 
 * Usage:
 *   php bin/sync_collections.php                # Full sync
 *   php bin/sync_collections.php --limit=100     # Limit to 100 movies
 *   php bin/sync_collections.php --collection=123 # Sync specific collection
 *   php bin/sync_collections.php --force         # Force re-fetch even if cached
 */

require_once __DIR__ . '/../private/config.php';

define('TMDB_BASE_URL', 'https://api.themoviedb.org/3');
define('TMDB_IMAGE_BASE', 'https://image.tmdb.org/t/p/');

// CLI colors
define('GREEN', "\033[32m");
define('RED', "\033[31m");
define('YELLOW', "\033[33m");
define('RESET', "\033[0m");

$options = getopt('', ['limit::', 'collection::', 'id::', 'force', 'help', 'no-images']);
$force = isset($options['force']);
$noImages = isset($options['no-images']);
$specificCollection = $options['collection'] ?? $options['id'] ?? null;
$limit = isset($options['limit']) ? (int)$options['limit'] : 0;

if (isset($options['help'])) {
    echo <<<HELP
Collection Sync Script - NZBarr 2.0
====================================

Usage:
  php sync_collections.php [options]

Options:
  --limit=N           Process only N movies
  --collection=ID     Sync specific collection (also: --id=ID)
  --force            Force re-fetch even if cached
  --no-images        Skip downloading images
  --help             Show this help message

Examples:
  php sync_collections.php
  php sync_collections.php --limit=100
  php sync_collections.php --collection=645
  php sync_collections.php --force

HELP;
    exit(0);
}

echo "======================================================\n";
echo "   NZBarr 2.0 - Collection Sync Script\n";
echo "======================================================\n\n";

if (!TMDB_API_KEY) {
    die(RED . "Error: TMDB API key not configured in settings.\n" . RESET);
}

if ($specificCollection) {
    echo YELLOW . "Syncing specific collection: $specificCollection\n\n" . RESET;
    syncCollection($specificCollection);
} else {
    $moviesUpdated = syncAllMovieCollections($limit, $force);
    echo "\n" . GREEN . "Sync complete! Updated $moviesUpdated movies.\n" . RESET;
}

/**
 * Sync collection for a specific collection ID
 */
function syncCollection($collectionId) {
    global $pdo, $force, $noImages;
    
    $url = TMDB_BASE_URL . "/collection/{$collectionId}?api_key=" . TMDB_API_KEY;
    $response = @file_get_contents($url);
    
    if (!$response) {
        echo RED . "Failed to fetch collection $collectionId from TMDB\n" . RESET;
        return false;
    }
    
    $data = json_decode($response, true);
    
    if (isset($data['status_code'])) {
        echo RED . "TMDB Error: {$data['status_message']}\n" . RESET;
        return false;
    }
    
    saveCollection($data, $pdo);
    
    if (!$noImages) {
        downloadCollectionImages($data['id'], $data);
    }
    
    echo GREEN . "Collection synced: {$data['name']} ({$data['id']})\n" . RESET;
    echo "  - Parts: " . count($data['parts']) . "\n";
    
    return true;
}

/**
 * Sync collections for all movies
 */
function syncAllMovieCollections($limit = 0, $force = false) {
    global $pdo, $noImages;
    
    // Get movies that need collection checking
    $sql = "SELECT m.imdb_id, m.tmdb_id, m.title, m.collection_id 
            FROM movie_info m 
            INNER JOIN releases r ON m.imdb_id = r.imdb_id
            WHERE m.tmdb_id IS NOT NULL AND m.tmdb_id != ''";
    
    if (!$force) {
        $sql .= " AND (m.collection_id IS NULL OR m.collection_id = 0)";
    }
    
    $sql .= " GROUP BY m.imdb_id ORDER BY m.imdb_id";
    
    if ($limit > 0) {
        $sql .= " LIMIT " . (int)$limit;
    }
    
    $stmt = $pdo->query($sql);
    $movies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($movies) . " movies to check\n\n";
    
    $updated = 0;
    $errors = 0;
    
    foreach ($movies as $movie) {
        echo "Checking: {$movie['title']} (TMDB: {$movie['tmdb_id']})... ";
        
        $url = TMDB_BASE_URL . "/movie/{$movie['tmdb_id']}?api_key=" . TMDB_API_KEY;
        $response = @file_get_contents($url);
        
        if (!$response) {
            echo RED . "Failed\n" . RESET;
            $errors++;
            continue;
        }
        
        $data = json_decode($response, true);
        
        if (isset($data['belongs_to_collection']) && $data['belongs_to_collection']) {
            $collectionId = $data['belongs_to_collection']['id'];
            
            // Fetch full collection data
            $collectionUrl = TMDB_BASE_URL . "/collection/{$collectionId}?api_key=" . TMDB_API_KEY;
            $collectionResponse = @file_get_contents($collectionUrl);
            
            if ($collectionResponse) {
                $collectionData = json_decode($collectionResponse, true);
                
                if (!isset($collectionData['status_code'])) {
                    saveCollection($collectionData, $pdo);
                    
                    if (!$noImages) {
                        downloadCollectionImages($collectionId, $collectionData);
                    }
                    
                    // Update movie with collection_id
                    $updateStmt = $pdo->prepare("UPDATE movie_info SET collection_id = ? WHERE imdb_id = ?");
                    $updateStmt->execute([$collectionId, $movie['imdb_id']]);
                    
                    echo GREEN . "Added to collection: {$collectionData['name']}\n" . RESET;
                    $updated++;
                } else {
                    echo RED . "Error fetching collection\n" . RESET;
                    $errors++;
                }
            } else {
                echo RED . "Failed to fetch collection data\n" . RESET;
                $errors++;
            }
        } else {
            // No collection, mark as NULL explicitly
            $updateStmt = $pdo->prepare("UPDATE movie_info SET collection_id = NULL WHERE imdb_id = ?");
            $updateStmt->execute([$movie['imdb_id']]);
            echo YELLOW . "No collection\n" . RESET;
        }
        
        // Rate limit to avoid TMDB limits
        usleep(100000); // 0.1 second
    }
    
    echo "\n" . GREEN . "Updated: $updated | Errors: $errors\n" . RESET;
    
    return $updated;
}

/**
 * Save collection to database
 */
function saveCollection($data, $pdo) {
    $basePosterUrl = TMDB_IMAGE_BASE . "w500";
    $baseBackdropUrl = TMDB_IMAGE_BASE . "w1280";
    
    $posterUrl = !empty($data['poster_path']) ? $basePosterUrl . $data['poster_path'] : null;
    $backdropUrl = !empty($data['backdrop_path']) ? $baseBackdropUrl . $data['backdrop_path'] : null;
    
    $hasPoster = !empty($posterUrl) ? 1 : 0;
    $hasBackdrop = !empty($backdropUrl) ? 1 : 0;
    
    $rawJson = json_encode($data);
    
    $stmt = $pdo->prepare("
        INSERT INTO collections (id, tmdb_id, name, overview, poster_url, backdrop_url, has_poster, has_backdrop, raw_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            overview = VALUES(overview),
            poster_url = VALUES(poster_url),
            backdrop_url = VALUES(backdrop_url),
            has_poster = VALUES(has_poster),
            has_backdrop = VALUES(has_backdrop),
            raw_json = VALUES(raw_json),
            updated_at = NOW()
    ");
    
    $stmt->execute([
        $data['id'],
        $data['id'],
        $data['name'] ?? '',
        $data['overview'] ?? '',
        $posterUrl,
        $backdropUrl,
        $hasPoster,
        $hasBackdrop,
        $rawJson
    ]);
    
    // Update all movies in collection with collection_id
    if (isset($data['parts']) && is_array($data['parts'])) {
        $updateStmt = $pdo->prepare("UPDATE movie_info SET collection_id = ? WHERE tmdb_id = ?");
        
        foreach ($data['parts'] as $part) {
            if (isset($part['id']) && $part['id']) {
                $updateStmt->execute([$data['id'], $part['id']]);
            }
        }
    }
}

/**
 * Download collection images
 */
function downloadCollectionImages($collectionId, $data) {
    global $pdo;
    
    // Download poster
    if (!empty($data['poster_path'])) {
        $posterUrl = TMDB_IMAGE_BASE . "w500" . $data['poster_path'];
        $posterFile = COLLECTION_COVERS_DIR . $collectionId . '.jpg';
        
        if (!file_exists(dirname($posterFile))) {
            mkdir(dirname($posterFile), 0755, true);
        }
        
        if (!file_exists($posterFile)) {
            $imageData = @file_get_contents($posterUrl);
            if ($imageData) {
                file_put_contents($posterFile, $imageData);
                
                // Update has_poster in database
                $pdo->prepare("UPDATE collections SET has_poster = 1 WHERE id = ?")->execute([$collectionId]);
                echo "  + Poster saved\n";
            }
        }
    }
    
    // Download backdrop
    if (!empty($data['backdrop_path'])) {
        $backdropUrl = TMDB_IMAGE_BASE . "w1280" . $data['backdrop_path'];
        $backdropFile = COLLECTION_BACKDROPS_DIR . $collectionId . '.jpg';
        
        if (!file_exists(dirname($backdropFile))) {
            mkdir(dirname($backdropFile), 0755, true);
        }
        
        if (!file_exists($backdropFile)) {
            $imageData = @file_get_contents($backdropUrl);
            if ($imageData) {
                file_put_contents($backdropFile, $imageData);
                
                // Update has_backdrop in database
                $pdo->prepare("UPDATE collections SET has_backdrop = 1 WHERE id = ?")->execute([$collectionId]);
                echo "  + Backdrop saved\n";
            }
        }
    }
    
    // Download logo if available (TMDB doesn't always have logos for collections)
    // We'll skip this for now as TMDB doesn't provide collection logos separately
}
