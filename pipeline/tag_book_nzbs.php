<?php
/**
 * bin/tag_book_nzbs.php
 * 
 * Scans the NZB import folder for book files (Author - Title format)
 * and automatically tags them with Google Books IDs if a match is found.
 * 
 * Usage: php bin/tag_book_nzbs.php
 */

require_once __DIR__ . '/../private/config.php';

// Ensure we are running in CLI
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.");
}

$targetDir = NZB_IMPORT_FOLDER;

if (!is_dir($targetDir)) {
    die("Error: Import folder not found at " . $targetDir . PHP_EOL);
}

echo "-------------------------------------------------------" . PHP_EOL;
echo "NZBarr 2.0 - Book Auto-Tagger" . PHP_EOL;
echo "Scanning: " . $targetDir . PHP_EOL;
echo "-------------------------------------------------------" . PHP_EOL;

$files = glob($targetDir . '/*.nzb');
$taggedCount = 0;
$skippedCount = 0;

foreach ($files as $file) {
    $filename = basename($file);
    
    // 1. Skip if already tagged with an ID
    if (preg_match('/(?:\{\{|\[)google[:=]\s*([a-zA-Z0-9_\-]+)(?:\}\}|\])/i', $filename)) {
        continue;
    }

    // 2. Filter: Only process files that look like "Author - Title"
    if (strpos($filename, ' - ') === false) {
        continue;
    }

    echo "Processing: " . $filename . "... ";

    // 3. Parse and Clean Filename
    $cleanName = preg_replace('/\.nzb$/i', '', $filename);
    list($author, $titlePart) = explode(' - ', $cleanName, 2);
    
    // Remove common ebook formats and noise
    $title = preg_replace('/\(?(epub|mobi|pdf|retail|ebook|azw3)\)?/i', '', $titlePart);
    
    // Remove Year if present at end
    $title = preg_replace('/([\(\[]\d{4}[\)\]]|[- ]+\d{4}$)/', '', $title);

    // Normalize separators
    $title = str_replace(['.', '_'], ' ', $title);
    $author = str_replace(['.', '_'], ' ', $author);
    
    $author = trim($author);
    $title = trim($title);
    $title = preg_replace('/\s+/', ' ', $title);

    if (empty($author) || empty($title)) {
        echo "Skipped (Empty author/title)." . PHP_EOL;
        continue;
    }

    // 4. Query Google Books
    // Construct query: intitle:TITLE+inauthor:AUTHOR
    $searchQuery = 'intitle:' . $title . ' inauthor:' . $author;
    $searchUrl = "https://www.googleapis.com/books/v1/volumes?q=" . urlencode($searchQuery) . "&maxResults=1&printType=books";

    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: NZBarrAutoTagger/1.0 ( " . (defined('MAIL_FROM') ? MAIL_FROM : 'admin@localhost') . " )\r\n"
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
    ];
    $context = stream_context_create($opts);
    
    // Rate Limiting (Google Books is generous, but let's be polite)
    usleep(200000); // 0.2s

    $response = @file_get_contents($searchUrl, false, $context);
    
    if ($response) {
        $data = json_decode($response, true);
        
        if (!empty($data['items'][0])) {
            $book = $data['items'][0];
            $googleId = $book['id'];
            $info = $book['volumeInfo'];
            $foundTitle = $info['title'] ?? '';
            
            // 5. Validate Match (Basic similarity check)
            similar_text(strtolower($title), strtolower($foundTitle), $percent);
            
            if ($percent >= 50) { // Threshold for acceptance
                $newFilename = str_replace('.nzb', " {{google:$googleId}}.nzb", $filename);
                $newPath = $targetDir . '/' . $newFilename;
                
                if (rename($file, $newPath)) {
                    echo "MATCH FOUND ($foundTitle) -> Tagged!" . PHP_EOL;
                    $taggedCount++;
                } else {
                    echo "Error renaming file." . PHP_EOL;
                }
            } else {
                echo "Match too weak ($percent% - $foundTitle). Skipped." . PHP_EOL;
                $skippedCount++;
            }
        } else {
            echo "No results found." . PHP_EOL;
            $skippedCount++;
        }
    } else {
        echo "API Request Failed." . PHP_EOL;
    }
}

echo "-------------------------------------------------------" . PHP_EOL;
echo "Finished. Tagged: $taggedCount | Skipped: $skippedCount" . PHP_EOL;