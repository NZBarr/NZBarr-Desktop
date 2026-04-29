<?php
/**
 * NZBarr 2.0 - Universal Metadata & Image Harvester
 * FIXED: English priority with Original Language fallback
 * ADDED: Retry logic for missing covers and skipping of content that has been checked and has no cover.
 */

require_once __DIR__ . '/../private/config.php';

define('TMDB_IMG_BASE', "https://image.tmdb.org/t/p/");
define('POSTER_SIZE', "w500");
define('BACKDROP_SIZE', "w1280");
define('LOGO_SIZE', "w500");

function downloadImage($path, $saveLocation, $size = "original") {
    if (empty($path)) return false;
    $url = TMDB_IMG_BASE . $size . $path;
    $content = @file_get_contents($url);
    if ($content) {
        // Prevent saving SVG content
        if (str_contains($content, '<svg') || str_contains($content, '<?xml')) {
            error_log("SVG content detected in URL, aborting save: " . $url);
            return false;
        }
        $dir = dirname($saveLocation);
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        return file_put_contents($saveLocation, $content);
    }
    return false;
}

function getEnglishLogoPath($imgs) {
    if (empty($imgs['logos'])) return '';
    foreach ($imgs['logos'] as $logo) {
        if ($logo['iso_639_1'] === 'en' && str_ends_with($logo['file_path'], '.png')) return $logo['file_path'];
    }
    // Fallback to first PNG
    foreach ($imgs['logos'] as $logo) {
        if (str_ends_with($logo['file_path'], '.png')) return $logo['file_path'];
    }
    return ''; // No suitable PNG logo found
}

// --- 1. MOVIES ---
echo "--- Scanning for Movies ---\n";
$movies = $pdo->query("
    SELECT r.imdb_id FROM releases r
    LEFT JOIN movie_info mi ON r.imdb_id = mi.imdb_id
    WHERE r.imdb_id IS NOT NULL 
    AND r.imdb_id != ''
    AND r.season IS NULL 
    AND (mi.imdb_id IS NULL OR mi.has_cover = 0)
    GROUP BY r.imdb_id
")->fetchAll();

foreach ($movies as $row) {
    $id = $row['imdb_id'];
    echo "Processing Movie: $id... ";

    $findUrl = "https://api.themoviedb.org/3/find/$id?api_key=".TMDB_API_KEY."&external_source=imdb_id&language=en-US";
    $findRes = json_decode(@file_get_contents($findUrl), true);

    if (!empty($findRes['movie_results'])) {
        $tmdbId = $findRes['movie_results'][0]['id'];
        $detailUrl = "https://api.themoviedb.org/3/movie/$tmdbId?api_key=".TMDB_API_KEY."&append_to_response=images,credits,videos&include_image_language=en,null&language=en-US";
        $m = json_decode(@file_get_contents($detailUrl), true);

        if (empty($m['overview']) || empty($m['tagline'])) {
            $fallbackUrl = "https://api.themoviedb.org/3/movie/$tmdbId?api_key=".TMDB_API_KEY;
            $fb = json_decode(@file_get_contents($fallbackUrl), true);
            if (empty($m['overview'])) $m['overview'] = $fb['overview'] ?? '';
            if (empty($m['tagline'])) $m['tagline'] = $fb['tagline'] ?? '';
        }

        $genres = !empty($m['genres']) ? implode(', ', array_column($m['genres'], 'name')) : '';
        $actors = !empty($m['credits']['cast']) ? implode(', ', array_slice(array_column($m['credits']['cast'], 'name'), 0, 10)) : '';
        $director = '';
        if (!empty($m['credits']['crew'])) {
            foreach ($m['credits']['crew'] as $crew) { if ($crew['job'] === 'Director') { $director = $crew['name']; break; }}
        }
        $trailer = '';
        if (!empty($m['videos']['results'])) {
            foreach ($m['videos']['results'] as $v) { if ($v['site'] === 'YouTube' && $v['type'] === 'Trailer') { $trailer = $v['key']; break; }}
        }
        $country = !empty($m['production_countries']) ? implode(', ', array_column($m['production_countries'], 'name')) : '';
        $movieUrl = "https://www.themoviedb.org/movie/" . $tmdbId;

        $hasCover = empty($m['poster_path']) ? 2 : (downloadImage($m['poster_path'], MOVIE_COVERS_DIR . "$id-cover.jpg", POSTER_SIZE) ? 1 : 0);
        $hasBackdrop = empty($m['backdrop_path']) ? 2 : (downloadImage($m['backdrop_path'], MOVIE_BACKDROPS_DIR . "$id-backdrop.jpg", BACKDROP_SIZE) ? 1 : 0);
        $logoPath = getEnglishLogoPath($m['images'] ?? []);
        $hasLogo = empty($logoPath) ? 2 : (downloadImage($logoPath, MOVIE_LOGOS_DIR . "$id-logo.png", LOGO_SIZE) ? 1 : 0);
        
        $sql = "INSERT INTO movie_info (imdb_id, tmdb_id, title, original_title, tagline, plot, release_date, rating, genres, actors, director, runtime, language, country, youtube_trailer, movie_url, has_cover, has_backdrop, has_logo, raw_json, last_updated) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())
                ON DUPLICATE KEY UPDATE 
                tmdb_id=VALUES(tmdb_id), title=VALUES(title), original_title=VALUES(original_title), tagline=VALUES(tagline), plot=VALUES(plot), release_date=VALUES(release_date), rating=VALUES(rating), genres=VALUES(genres), actors=VALUES(actors), director=VALUES(director), runtime=VALUES(runtime), language=VALUES(language), country=VALUES(country), youtube_trailer=VALUES(youtube_trailer), movie_url=VALUES(movie_url), has_cover=VALUES(has_cover), has_backdrop=VALUES(has_backdrop), has_logo=VALUES(has_logo), raw_json=VALUES(raw_json), last_updated=NOW()";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id, $tmdbId, $m['title'] ?? '', $m['original_title'] ?? '', $m['tagline'] ?? '', $m['overview'] ?? '', $m['release_date'] ?? null, $m['vote_average'] ?? 0, $genres, $actors, $director, $m['runtime'] ?? 0, $m['original_language'] ?? '', $country, $trailer, $movieUrl, $hasCover, $hasBackdrop, $hasLogo, json_encode($m)]);
        echo " ✅ Movie saved/updated.\n";
    } else { 
        $sql = "INSERT INTO movie_info (imdb_id, has_cover) VALUES (?, 2) ON DUPLICATE KEY UPDATE has_cover = 2";
        $pdo->prepare($sql)->execute([$id]);
        echo " ❌ Not found on TMDb. Marked to be skipped.\n"; 
    }
}

// --- 2. TV SHOWS ---
echo "\n--- Scanning for TV Shows ---\n";
$tvShows = $pdo->query("
    SELECT r.tmdb_id FROM releases r
    LEFT JOIN tv_info ti ON r.tmdb_id = ti.tmdb_id
    WHERE r.tmdb_id IS NOT NULL 
    AND r.tmdb_id > 0
    AND r.season IS NOT NULL 
    AND (ti.tmdb_id IS NULL OR ti.has_cover = 0)
    GROUP BY r.tmdb_id
")->fetchAll();

foreach ($tvShows as $row) {
    $id = $row['tmdb_id'];
    echo "Processing TV Show: $id... ";

    $detailUrl = "https://api.themoviedb.org/3/tv/$id?api_key=".TMDB_API_KEY."&append_to_response=images,credits,videos,external_ids&include_image_language=en,null&language=en-US";
    $t = json_decode(@file_get_contents($detailUrl), true);

    if (isset($t['id'])) {
        if (empty($t['overview'])) {
            $fb = json_decode(@file_get_contents("https://api.themoviedb.org/3/tv/$id?api_key=".TMDB_API_KEY), true);
            $t['overview'] = $fb['overview'] ?? '';
        }

        $genres = !empty($t['genres']) ? implode(', ', array_column($t['genres'], 'name')) : '';
        $actors = !empty($t['credits']['cast']) ? implode(', ', array_slice(array_column($t['credits']['cast'], 'name'), 0, 10)) : '';
        $trailer = '';
        if (!empty($t['videos']['results'])) {
            foreach ($t['videos']['results'] as $v) { if ($v['site'] === 'YouTube' && $v['type'] === 'Trailer') { $trailer = $v['key']; break; }}
        }
        $country = !empty($t['origin_country']) ? implode(', ', $t['origin_country']) : '';
        $tvUrl = "https://www.themoviedb.org/tv/" . $id;

        $hasCover = empty($t['poster_path']) ? 2 : (downloadImage($t['poster_path'], TV_COVERS_DIR . "$id-cover.jpg", POSTER_SIZE) ? 1 : 0);
        $hasBackdrop = empty($t['backdrop_path']) ? 2 : (downloadImage($t['backdrop_path'], TV_BACKDROPS_DIR . "$id-backdrop.jpg", BACKDROP_SIZE) ? 1 : 0);
        $logoPath = getEnglishLogoPath($t['images'] ?? []);
        $hasLogo = empty($logoPath) ? 2 : (downloadImage($logoPath, TV_LOGOS_DIR . "$id-logo.png", LOGO_SIZE) ? 1 : 0);
        
        $sql = "INSERT INTO tv_info (tmdb_id, imdb_id, title, original_name, plot, first_air_date, last_air_date, runtime, number_of_seasons, number_of_episodes, rating, genres, actors, language, country, status, youtube_trailer, tv_url, has_cover, has_backdrop, has_logo, raw_json, last_updated) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())
                ON DUPLICATE KEY UPDATE
                imdb_id=VALUES(imdb_id), title=VALUES(title), original_name=VALUES(original_name), plot=VALUES(plot), first_air_date=VALUES(first_air_date), last_air_date=VALUES(last_air_date), runtime=VALUES(runtime), number_of_seasons=VALUES(number_of_seasons), number_of_episodes=VALUES(number_of_episodes), rating=VALUES(rating), genres=VALUES(genres), actors=VALUES(actors), language=VALUES(language), country=VALUES(country), status=VALUES(status), youtube_trailer=VALUES(youtube_trailer), tv_url=VALUES(tv_url), has_cover=VALUES(has_cover), has_backdrop=VALUES(has_backdrop), has_logo=VALUES(has_logo), raw_json=VALUES(raw_json), last_updated=NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id, $t['external_ids']['imdb_id'] ?? null, $t['name'] ?? '', $t['original_name'] ?? '', $t['overview'] ?? '', $t['first_air_date'] ?? null, $t['last_air_date'] ?? null, ($t['episode_run_time'][0] ?? 0), $t['number_of_seasons'] ?? 0, $t['number_of_episodes'] ?? 0, $t['vote_average'] ?? 0, $genres, $actors, $t['original_language'] ?? '', $country, $t['status'] ?? '', $trailer, $tvUrl, $hasCover, $hasBackdrop, $hasLogo, json_encode($t)]);
        echo " ✅ TV Show saved/updated.\n";
    } else { 
        $sql = "INSERT INTO tv_info (tmdb_id, has_cover) VALUES (?, 2) ON DUPLICATE KEY UPDATE has_cover = 2";
        $pdo->prepare($sql)->execute([$id]);
        echo " ❌ Not found on TMDb. Marked to be skipped.\n";
    }
}

echo "\nDone!\n";