<?php
/**
 * bin/analyze_releases.php - NZBarr 2.0 Release Analysis Script
 * 
 * Analyzes existing releases in the database to extract:
 * - NFO text from NZB files (downloaded from usenet)
 * - MediaInfo from sample/video files (downloaded from usenet)
 * - Password status (from NZB XML or RAR testing via unrar)
 * 
 * Usage:
 *   php bin/analyze_releases.php                          # Process all releases
 *   php bin/analyze_releases.php --limit=100              # Process only 100 releases
 *   php bin/analyze_releases.php --id=221269              # Process specific release
 *   php bin/analyze_releases.php --category=TV            # Only TV releases
 *   php bin/analyze_releases.php --category=Movies        # Only Movie releases
 *   php bin/analyze_releases.php --resume                 # Resume from last position
 *   php bin/analyze_releases.php --force                  # Re-analyze even if data exists
 * 
 * Options:
 *   --limit=N        Process only N releases
 *   --id=N           Process specific release by ID
 *   --category=X    Filter by category (Movies, TV, Music, etc.)
 *   --resume         Resume from last processed release ID
 *   --force          Re-analyze even if data already exists
 */

require_once __DIR__ . '/../private/config.php';
require_once __DIR__ . '/../vendor/autoload.php';

// Increase memory limit for large file downloads
ini_set('memory_limit', '4G');

// CLI Tools
define('MEDIAINFO_BIN', '/usr/local/bin/mediainfo');
define('UNRAR_BIN', '/usr/local/bin/unrar');
define('UNZIP_BIN', '/usr/bin/unzip');
define('SEVENZIP_BIN', '/opt/homebrew/bin/7z');
define('UUDVIEW_BIN', '/opt/homebrew/bin/uudeview');
define('TEMP_DIR', '/tmp/nzbarr_analyze');
define('NO_PASSWORD', 'NO PASSWORD');

// --- NNTP Connection Class ---
class NntpClient {
    private $socket;
    private $server;
    private $port;
    private $username;
    private $password;
    private $connected = false;
    
    public function __construct($server, $port, $username, $password) {
        $this->server = $server;
        $this->port = $port;
        $this->username = $username;
        $this->password = $password;
    }
    
    public function setTimeout($seconds) {
        if ($this->socket) {
            stream_set_timeout($this->socket, $seconds);
        }
    }
    
    public function connect() {
        // Try SSL first, then regular
        $errno = 0;
        $errstr = '';
        
        // Try SSL connection using stream_socket_client
        $context = stream_context_create([
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]
        ]);
        
        $this->socket = @stream_socket_client(
            'ssl://' . $this->server . ':' . $this->port,
            $errno,
            $errstr,
            30,
            STREAM_CLIENT_CONNECT,
            $context
        );
        
        if (!$this->socket) {
            // Try regular connection
            $this->socket = @fsockopen(
                $this->server, 
                $this->port, 
                $errno, 
                $errstr, 
                30
            );
        }
        
        if (!$this->socket) {
            throw new Exception("Cannot connect to NNTP server: $errstr ($errno)");
        }
        
        stream_set_timeout($this->socket, 60);
        
        $response = fgets($this->socket, 512);
        if (substr($response, 0, 3) !== '200') {
            throw new Exception("NNTP connection error: $response");
        }
        
        // Authenticate
        if ($this->username && $this->password) {
            fwrite($this->socket, "AUTHINFO USER " . $this->username . "\r\n");
            $response = fgets($this->socket, 512);
            
            if (substr($response, 0, 3) === '381') {
                fwrite($this->socket, "AUTHINFO PASS " . $this->password . "\r\n");
                $response = fgets($this->socket, 512);
                
                if (substr($response, 0, 3) !== '281') {
                    echo "      ⚠️ NNTP authentication failed: " . trim($response) . "\n";
                    $this->disconnect();
                    return false;
                }
            }
        }
        
        $this->connected = true;
        return true;
    }
    
    public function getArticle($messageId, $retry = 3) {
        if (!$this->connected) {
            throw new Exception("Not connected to NNTP server");
        }
        
        // Add < > if not present
        $id = $messageId;
        if (strpos($id, '<') === false) {
            $id = '<' . $id . '>';
        }
        
        for ($attempt = 0; $attempt < $retry; $attempt++) {
            echo "      ⬆️ Requesting ARTICLE $id\n";
            if (!@fwrite($this->socket, "ARTICLE $id\r\n")) {
                $this->reconnect();
                continue;
            }
            
            $response = @fgets($this->socket, 512);
            
            // 220 and 222 both indicate success
            if ($response && substr($response, 0, 3) !== '220' && substr($response, 0, 3) !== '222') {
                echo "      ❌ NNTP ARTICLE failed for $id: " . trim($response) . "\n";
                return null;
            }
            
            $body = '';
            while (($line = @fgets($this->socket, 8192)) !== false) {
                if ($line === ".\r\n") {
                    break; // End of article
                }
                // Handle byte-stuffing
                if (substr($line, 0, 2) === '..') {
                    $line = substr($line, 1);
                }
                $body .= $line;
            }
            
            return $body;
        }
        
        return null;
    }
    
    private function reconnect() {
        echo "      🔄 Reconnecting to NNTP...\n";
        $this->disconnect();
        
        $errno = 0;
        $errstr = '';
        
        $context = stream_context_create([
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]
        ]);
        
        $this->socket = @stream_socket_client(
            'ssl://' . $this->server . ':' . $this->port,
            $errno,
            $errstr,
            30,
            STREAM_CLIENT_CONNECT,
            $context
        );
        
        if (!$this->socket) {
            throw new Exception("Cannot reconnect to NNTP server: $errstr ($errno)");
        }
        
        stream_set_timeout($this->socket, 60);
        
        $response = fgets($this->socket, 512);
        if (substr($response, 0, 3) !== '200') {
            throw new Exception("NNTP connection error: $response");
        }
        
        // Authenticate
        if ($this->username && $this->password) {
            fwrite($this->socket, "AUTHINFO USER " . $this->username . "\r\n");
            $response = fgets($this->socket, 512);
            
            if (substr($response, 0, 3) === '381') {
                fwrite($this->socket, "AUTHINFO PASS " . $this->password . "\r\n");
                $response = fgets($this->socket, 512);
                
                if (substr($response, 0, 3) !== '281') {
                    throw new Exception("NNTP authentication failed: $response");
                }
            }
        }
        
        $this->connected = true;
        echo "      ✅ Reconnected\n";
    }
    
    public function disconnect() {
        if ($this->socket) {
            fwrite($this->socket, "QUIT\r\n");
            fclose($this->socket);
            $this->socket = null;
            $this->connected = false;
        }
    }
    
    public function isConnected() {
        return $this->connected;
    }
    
    public function __clone() {
        // Note: cloned object will have socket=null, connected=false
        // Each process must create its own connection
    }
}

// --- Argument Parsing ---
$options = getopt('', ['limit::', 'category::', 'resume', 'force', 'help', 'id::', 'mediainfo-only', 'debug-nzb', 'download-all', 'keep-files', 'connections::', 'max-mb::']);
$limit = isset($options['limit']) ? (int)$options['limit'] : 0;
$categoryFilter = $options['category'] ?? null;
$resume = isset($options['resume']);
$force = isset($options['force']);
$specificId = isset($options['id']) ? (int)$options['id'] : null;
$mediainfoOnly = isset($options['mediainfo-only']);
$debugNzb = isset($options['debug-nzb']);
$downloadAll = isset($options['download-all']);
$keepFiles = isset($options['keep-files']);
$numConnections = isset($options['connections']) ? (int)$options['connections'] : 10;
$maxDownloadMb = isset($options['max-mb']) ? (int)$options['max-mb'] : 50;

if (isset($options['help'])) {
    echo <<<HELP
Release Analysis Script - NZBarr 2.0
====================================

OVERVIEW:
  Downloads releases from Usenet via NNTP to extract metadata:
  - NFO text files
  - MediaInfo (resolution, codecs, format, subtitles)
  - Password protection status
  
  Database columns updated: nfo_text, mediainfo_raw, resolution,
  video_codec, audio_codec, format, subtitles, password

USAGE:
  php bin/analyze_releases.php [options]

ARGUMENTS:
  --limit=N           Process only N releases (default: all)
  --id=N              Process specific release by ID
  --category=X        Filter by category (Movies, TV, Music, etc.)
  --resume            Resume from last processed release ID
  --force             Re-analyze even if data already exists
  
  --download-all      Download complete archives from Usenet to extract
                      video files for MediaInfo (required for archives)
  --max-mb=N          Maximum MB to download per archive (default: 500)
                      Partial downloads often work for MediaInfo
  --keep-files        Keep temp files in /tmp/nzbarr_analyze for debugging
  
  --mediainfo-only    Only process releases missing mediainfo_raw
  --debug-nzb         Output raw NZB content and exit
  --connections=N     Number of parallel connections (default: 10)
  --help              Show this help message

EXAMPLES:
  # Process all releases with missing data
  php bin/analyze_releases.php
  
  # Process only 100 releases
  php bin/analyze_releases.php --limit=100
  
  # Process specific release with full archive download
  php bin/analyze_releases.php --download-all --id=221269
  
  # Resume from last position
  php bin/analyze_releases.php --resume
  
  # Only TV category, limit 50
  php bin/analyze_releases.php --category=TV --limit=50
  
  # Debug NZB content
  php bin/analyze_releases.php --debug-nzb --id=221269
  
  # Download with higher limit and keep files
  php bin/analyze_releases.php --download-all --max-mb=1000 --keep-files --id=221269

HELP;
    exit(0);
}

echo "======================================================\n";
echo "   NZBarr 2.0 - Release Analysis Script\n";
echo "   (With NNTP downloading from Usenet)\n";
echo "======================================================\n\n";

// Create temp directory
if (!is_dir(TEMP_DIR)) {
    mkdir(TEMP_DIR, 0777, true);
}

// Clean up any leftover files from previous runs
echo "🧹 Cleaning up previous temp files...\n";
$oldDirs = glob(TEMP_DIR . '/extract_*', GLOB_ONLYDIR);
$cleaned = 0;
foreach ($oldDirs as $dir) {
    $files = glob("$dir/*");
    foreach ($files as $f) {
        @unlink($f);
    }
    @rmdir($dir);
    $cleaned++;
}
if ($cleaned > 0) {
    echo "   ✅ Cleaned $cleaned leftover directories\n";
}
// Clean any leftover files in main temp dir
foreach (glob(TEMP_DIR . '/*') as $f) {
    if (is_file($f)) {
        @unlink($f);
    }
}

echo "📂 Temp directory: " . TEMP_DIR . "\n\n";

// --- Connect to NNTP ---
echo "🔌 Connecting to NNTP server...\n";
try {
    $nntp = new NntpClient(
        NNTP_SERVER,
        NNTP_PORT,
        NNTP_USERNAME,
        NNTP_PASSWORD
    );
    $nntp->connect();
    echo "✅ Connected to " . NNTP_SERVER . "\n\n";
} catch (Exception $e) {
    die("❌ NNTP Connection failed: " . $e->getMessage() . "\n");
}

// --- Build Query ---
$sql = "SELECT r.id, r.search_name, r.nzb_guid, r.category_id, r.password, r.nfo_text, r.mediainfo_raw, 
                r.resolution, r.video_codec, r.audio_codec, r.format, r.subtitles, c.name as category_name
        FROM releases r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE 1=1";

$params = [];

// If specific ID provided
if ($specificId !== null) {
    $sql .= " AND r.id = ?";
    $params[] = $specificId;
} elseif ($categoryFilter) {
    $categoryMap = [
        'movies' => 1,
        'tv' => 2,
        'music' => 3,
        'console' => 4,
        'games' => 4,
        'books' => 7,
        'xxx' => 8,
    ];
    
    $catKey = strtolower($categoryFilter);
    if (isset($categoryMap[$catKey])) {
        $parentId = $categoryMap[$catKey];
        $sql .= " AND (c.id = ? OR c.parent_id = ?)";
        $params[] = $parentId;
        $params[] = $parentId;
    }
}

if (!$force) {
    echo "ℹ️  Only analyzing releases with missing data (use --force to override)\n\n";
    $sql .= " AND (r.nfo_text IS NULL OR r.nfo_text = '' OR r.mediainfo_raw IS NULL OR r.mediainfo_raw = '' OR r.password IS NULL OR r.password = '')";
} else {
    echo "⚠️  FORCE MODE: Re-analyzing all matching releases\n\n";
}

if ($resume) {
    $markerFile = __DIR__ . '/.analyze_last_id';
    if (file_exists($markerFile)) {
        $lastId = (int)file_get_contents($markerFile);
        $sql .= " AND r.id > ?";
        $params[] = $lastId;
        echo "▶️  Resuming from release ID: $lastId\n\n";
    }
}

$sql .= " ORDER BY r.id ASC";

if ($limit > 0) {
    $sql .= " LIMIT " . (int)$limit;
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$releases = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($releases)) {
    echo "❌ No releases found matching criteria.\n";
    $nntp->disconnect();
    exit(0);
}

if (!$mediainfoOnly) {
    echo "✅ Found " . count($releases) . " releases to analyze\n";
    echo "======================================================\n\n";
}

// --- Processing Loop ---
$processed = 0;
$updated = 0;
$errors = 0;
$totalReleases = count($releases);

foreach ($releases as $release) {
    $releaseId = $release['id'];
    $searchName = $release['search_name'];
    $nzbGuid = $release['nzb_guid'];
    $categoryName = $release['category_name'] ?? 'Unknown';
    $processed++;

    if (!$mediainfoOnly) {
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "📦 Release #$releaseId: $searchName\n";
        echo "   Category: $categoryName | GUID: $nzbGuid\n";
        echo "   📊 Progress: $processed of $totalReleases\n";
    }
    
    // Find NZB file
    $firstChar = substr($nzbGuid, 0, 1);
    $nzbPath = rtrim(NZB_FILES_PATH, '/') . '/' . $firstChar . '/' . $nzbGuid . '.nzb.gz';
    
    if (!file_exists($nzbPath)) {
        if (!$mediainfoOnly) echo "   ❌ NZB file not found: $nzbPath\n";
        $errors++;
        continue;
    }
    
    if (!$mediainfoOnly) echo "   📂 NZB found: " . basename($nzbPath) . "\n";
    
    // Analyze NZB and download from Usenet
    $analysis = analyzeNzbWithDownload($nzbPath, $nntp, $debugNzb, $downloadAll, $keepFiles, $maxDownloadMb);
    
    // Display findings
    if ($analysis['nfo']) {
        echo "   📄 NFO found: " . strlen($analysis['nfo']) . " bytes\n";
    } else {
        echo "   📄 NFO: Not found\n";
    }
    
    if ($analysis['mediainfo']) {
        echo "   🎬 MediaInfo found: " . strlen($analysis['mediainfo']) . " bytes\n";
    } else {
        echo "   🎬 MediaInfo: Not found\n";
    }
    
    if ($analysis['password']) {
        echo "   🔐 Password: " . $analysis['password'] . "\n";
    } else {
        echo "   🔐 Password: None detected\n";
    }
    
    // Update database
    $updateFields = [];
    $updateValues = [];
    $updatedDetails = [];
    
    if ($analysis['nfo'] && (empty($release['nfo_text']) || $release['nfo_text'] === '' || $force)) {
        $updateFields[] = 'nfo_text = ?';
        $updateValues[] = $analysis['nfo'];
        $updatedDetails[] = 'nfo';
        echo "   📝 Will update nfo_text\n";
    }
    
    if ($analysis['mediainfo'] && (empty($release['mediainfo_raw']) || $release['mediainfo_raw'] === '' || $force)) {
        $updateFields[] = 'mediainfo_raw = ?';
        $updateValues[] = $analysis['mediainfo'];
        $updatedDetails[] = 'mediainfo';
        echo "   📝 Will update mediainfo_raw\n";
        
        // Parse MediaInfo and extract additional fields
        $parsedMedia = parseMediaInfo($analysis['mediainfo']);
        if ($parsedMedia) {
            if ($parsedMedia['resolution'] && (empty($release['resolution']) || $force)) {
                $updateFields[] = 'resolution = ?';
                $updateValues[] = $parsedMedia['resolution'];
                $updatedDetails[] = 'resolution';
                echo "   📝 Will update resolution: {$parsedMedia['resolution']}\n";
            }
            if ($parsedMedia['video_codec'] && (empty($release['video_codec']) || $force)) {
                $updateFields[] = 'video_codec = ?';
                $updateValues[] = $parsedMedia['video_codec'];
                $updatedDetails[] = 'video_codec';
                echo "   📝 Will update video_codec: {$parsedMedia['video_codec']}\n";
            }
            if ($parsedMedia['audio_codec'] && (empty($release['audio_codec']) || $force)) {
                $updateFields[] = 'audio_codec = ?';
                $updateValues[] = $parsedMedia['audio_codec'];
                $updatedDetails[] = 'audio_codec';
                echo "   📝 Will update audio_codec: {$parsedMedia['audio_codec']}\n";
            }
            if ($parsedMedia['format'] && (empty($release['format']) || $force)) {
                $updateFields[] = 'format = ?';
                $updateValues[] = $parsedMedia['format'];
                $updatedDetails[] = 'format';
                echo "   📝 Will update format: {$parsedMedia['format']}\n";
            }
            if ($parsedMedia['subtitles'] && (empty($release['subtitles']) || $force)) {
                $updateFields[] = 'subtitles = ?';
                $updateValues[] = $parsedMedia['subtitles'];
                $updatedDetails[] = 'subtitles';
                echo "   📝 Will update subtitles: {$parsedMedia['subtitles']}\n";
            }
        }
    }
    
    if ($analysis['password'] && (empty($release['password']) || $force)) {
        $updateFields[] = 'password = ?';
        $updateValues[] = $analysis['password'];
        $updatedDetails[] = 'password';
        echo "   📝 Will update password\n";
    }
    
    if (!empty($updateFields)) {
        $updateValues[] = $releaseId;
        $updateSql = "UPDATE releases SET " . implode(', ', $updateFields) . " WHERE id = ?";
        
        try {
            // Check if connection is alive, reconnect if necessary
            try {
                $pdo->query("SELECT 1");
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), '2006') !== false || strpos($e->getMessage(), 'gone away') !== false) {
                    echo "   ⚠️ MySQL connection lost. Reconnecting...\n";
                    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES   => false,
                    ]);
                } else {
                    throw $e;
                }
            }

            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute($updateValues);
            echo "   ✅ Database updated!\n";
            $updated++;
        } catch (PDOException $e) {
            echo "   ❌ Database update failed: " . $e->getMessage() . "\n";
            $errors++;
        }
    } else {
        echo "   ⏭️  No changes needed\n";
    }
    
    // Cleanup temp files after processing (skip if --keep-files is set)
    if (!$keepFiles) {
        $releaseTempDir = TEMP_DIR . '/' . $releaseId;
        if (is_dir($releaseTempDir)) {
            array_map('unlink', glob("$releaseTempDir/*"));
            @rmdir($releaseTempDir);
        }
        // Also clean files in main temp dir
        array_map('unlink', glob(TEMP_DIR . "/raw_*"));
        array_map('unlink', glob(TEMP_DIR . "/decoded_*"));
        // Clean archive files (rar, zip, 7z, and multi-part like .001, .002)
        array_map('unlink', glob(TEMP_DIR . "/*.rar"));
        array_map('unlink', glob(TEMP_DIR . "/*.zip"));
        array_map('unlink', glob(TEMP_DIR . "/*.7z"));
        array_map('unlink', glob(TEMP_DIR . "/*.[0-9][0-9][0-9]"));
        // Clean all video file types
        $videoExts = ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'm2ts', 'ts', 'webm', 'mpg', 'mpeg'];
        foreach ($videoExts as $ext) {
            @array_map('unlink', glob(TEMP_DIR . "/*.$ext"));
        }
        // Clean extract directories and any other subdirectories
        $allDirs = glob(TEMP_DIR . "/*", GLOB_ONLYDIR);
        foreach ($allDirs as $dir) {
            $files = glob("$dir/*");
            if (!empty($files)) {
                foreach ($files as $f) {
                    @unlink($f);
                }
            }
            @rmdir($dir);
        }
        // Force remove any remaining directories with shell command
        exec('rm -rf ' . escapeshellarg(TEMP_DIR) . '/*');
    }
    
    $processed++;
    file_put_contents(__DIR__ . '/.analyze_last_id', $releaseId);
    
    // Log progress
    $updatedStr = !empty($updateFields) ? implode(',', $updatedDetails) : 'none';
    
    // Determine archive types found (deduplicated)
    $archiveTypes = 'none';
    if (!empty($analysis['rar_files'])) {
        $exts = array_map(function($f) {
            return strtoupper(pathinfo($f, PATHINFO_EXTENSION));
        }, $analysis['rar_files']);
        $archiveTypes = implode(',', array_unique($exts));
    }
    
    // Get password status for log
    $passwordStatus = $analysis['password'] ?? 'none';
    
    $logMsg = date('Y-m-d H:i:s') . " | #$releaseId | $searchName | Archives: $archiveTypes | Password: $passwordStatus | Updated: $updatedStr | Errors: $errors\n";
    file_put_contents(__DIR__ . '/analyze.log', $logMsg, FILE_APPEND);
    
    // Show mediainfo-only updates on console
    if ($mediainfoOnly && in_array('mediainfo', $updatedDetails)) {
        echo "✅ #$releaseId | $searchName | mediainfo\n";
    } elseif (!$mediainfoOnly) {
        echo "   ✅ Completed release $processed of $totalReleases\n";
    }
}

// Disconnect NNTP
$nntp->disconnect();

if (!$mediainfoOnly) {
    echo "\n======================================================\n";
    echo "📊 ANALYSIS COMPLETE\n";
    echo "======================================================\n";
    echo "   Processed: $processed releases\n";
    echo "   Updated:  $updated releases\n";
    echo "   Errors:   $errors\n";
    echo "======================================================\n";
}

// Log final summary
$logMsg = date('Y-m-d H:i:s') . " | COMPLETE | Processed: $processed | Updated: $updated | Errors: $errors\n";
file_put_contents(__DIR__ . '/analyze.log', $logMsg, FILE_APPEND);

/**
 * Analyze NZB file - parse and download from Usenet
 * @param bool $downloadAll If true, download complete files from usenet (for archives) and extract video for mediainfo
 */
function analyzeNzbWithDownload($nzbPath, $nntp, $debugNzb = false, $downloadAll = false, $keepFiles = false, $maxDownloadMb = 50) {
    echo "   🔍 Analyzing NZB: $nzbPath\n";
    $result = [
        'nfo' => null,
        'mediainfo' => null,
        'password' => null,
        'rar_files' => [],
    ];
    
    // Read NZB content (handle gzipped files)
    $nzbContent = @gzfile($nzbPath);
    if ($nzbContent) {
        $nzbContent = implode("", $nzbContent);
    } else {
        // Fallback to regular file read
        $nzbContent = @file_get_contents($nzbPath);
    }
    
    if (!$nzbContent) {
        echo "   ⚠️  Could not read NZB file\n";
        return $result;
    }

    // DEBUG: Output NZB content if flag is set
    if ($debugNzb) {
        echo $nzbContent;
        exit;
    }
    echo "   ✅ NZB content read, size: " . strlen($nzbContent) . " bytes\n";
    
    // Check for password in XML metadata
    if (preg_match('/<meta[^>]*type="password"[^>]*>([^<]+)<\/meta>/i', $nzbContent, $m)) {
        $result['password'] = trim($m[1]);
        echo "   🔐 Password from XML: {$result['password']}\n";
    }
    
    // Find NFO files
    preg_match_all('/&quot;([^&"]+\.nfo)&quot;/i', $nzbContent, $nfoMatches);
    if (!empty($nfoMatches[1])) {
        echo "   📄 Found NFO in NZB: {$nfoMatches[1][0]}\n";
        
        // Find and download the NFO article
        foreach ($nfoMatches[1] as $nfoFile) {
            $nfoData = downloadFileFromNzb($nzbContent, $nfoFile, $nntp);
            if ($nfoData) {
                // Convert from CP437 (DOS encoding) to UTF-8, filter out control chars
                $nfoUtf8 = @iconv('CP437', 'UTF-8//IGNORE', $nfoData);
                if ($nfoUtf8) {
                    // Remove remaining control characters except newlines and tabs
                    $nfoUtf8 = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $nfoUtf8);
                    $result['nfo'] = $nfoUtf8;
                } else {
                    $result['nfo'] = $nfoData;
                }
                break;
            }
        }
    }
    
    // --- Find Files in NZB (New Robust Method) ---

    // Define extensions
    $videoExtensions = ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'm2ts', 'ts', 'webm', 'mpg', 'mpeg'];
    $archiveExtensions = ['rar', 'zip', '7z', 'ace', 'arj'];

    // --- Video Files ---
    // Only match actual video extensions, NOT archive extensions
    $videoExtensions = ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'm2ts', 'ts', 'webm', 'mpg', 'mpeg'];
    $videoExtPattern = implode('|', $videoExtensions);
    // Pattern 1: subject="...filename.mkv..." (exclude archive extensions)
    preg_match_all('/subject="([^"]+\.(mkv|mp4|avi|mov|wmv|m2ts|ts|webm|mpg|mpeg))(?:[^"]*)"/i', $nzbContent, $videoMatchesSub);
    // Pattern 2: &quot;...filename.mkv...&quot; (exclude archive extensions)
    preg_match_all('/&quot;([^&"]+\.(mkv|mp4|avi|mov|wmv|m2ts|ts|webm|mpg|mpeg))(?:[^&"]*)&quot;/i', $nzbContent, $videoMatchesQuot);
    // Merge results
    $videoFiles = array_unique(array_merge($videoMatchesSub[1] ?? [], $videoMatchesQuot[1] ?? []));
    
    // FALLBACK: If no video files found with extensions, look for video encoding keywords
    // This handles cases where files are posted without extensions (common in Usenet)
    if (empty($videoFiles)) {
        $videoKeywords = ['x264', 'h264', 'x265', 'hevc', 'avc', 'divx', 'xvid', 'h\.264', 'h\.265'];
        $keywordPattern = implode('|', $videoKeywords);
        
        // Pattern 1: subject="...filename.x264..." or subject="...1080p..." etc.
        preg_match_all('/subject="([^"]+(?:' . $keywordPattern . ')[^"]*)"/i', $nzbContent, $videoKeywordMatchesSub);
        // Pattern 2: &quot;...filename.x264...&quot;
        preg_match_all('/&quot;([^&"]+(?:' . $keywordPattern . ')[^&"]*)&quot;/i', $nzbContent, $videoKeywordMatchesQuot);
        
        $keywordVideoFiles = array_unique(array_merge($videoKeywordMatchesSub[1] ?? [], $videoKeywordMatchesQuot[1] ?? []));
        
        // Filter out archives and nfo files
        $keywordVideoFiles = array_filter($keywordVideoFiles, function($f) {
            $fLower = strtolower($f);
            return !preg_match('/\.(rar|zip|7z|ace|arj|nfo|sfv|sample|par2?)$/i', $fLower);
        });
        
        if (!empty($keywordVideoFiles)) {
            $videoFiles = $keywordVideoFiles;
            echo "   🎬 Found video files (by encoding keyword): " . count($videoFiles) . " file(s)\n";
        }
    }
    
    if (!empty($videoFiles)) {
        echo "   🎬 Found video files in NZB: " . implode(', ', array_slice($videoFiles, 0, 3)) . (count($videoFiles) > 3 ? '...' : '') . "\n";
    } else {
        echo "   🎬 No direct video files found. Checking archives...\n";
    }

    // --- Archive Files ---
    // Match any digit extension for multi-volume archives (.001, .002, ..., .999, .1000, etc.)
    // Pattern 1: subject="...filename.rar" or ...filename.7z.001
    preg_match_all('/subject="([^"]+\.(rar|zip|7z|ace|arj|\d+))"/i', $nzbContent, $archiveMatchesSub);
    // Pattern 2: &quot;...filename.rar&quot; or &quot;...filename.7z.001&quot;
    preg_match_all('/&quot;([^&"]+\.(rar|zip|7z|ace|arj|\d+))&quot;/i', $nzbContent, $archiveMatchesQuot);
    // Merge results
    $archiveFiles = array_unique(array_merge($archiveMatchesSub[1] ?? [], $archiveMatchesQuot[1] ?? []));
    if (!empty($archiveFiles)) {
        echo "   📦 Found archive files in NZB: " . implode(', ', $archiveFiles) . "\n";
    } else {
        echo "   📦 No archive files found in NZB.\n";
    }
    
    // Try video files first, then fall back to archives
    $filesToTry = array_merge($videoFiles, $archiveFiles);
    
    if (!empty($filesToTry)) {
        $fileToTry = $filesToTry[0];
        $fileExt = strtolower(pathinfo($fileToTry, PATHINFO_EXTENSION));
        
        // Check if it's an archive by extension OR by filename containing archive extension
        $isArchive = in_array($fileExt, $archiveExtensions) || 
                     preg_match('/\.(rar|zip|7z|ace|arj)\.\d+$/i', $fileToTry);
        
        // Check if it's a video file without extension (detected by keywords like x264, h264, etc.)
        $isVideoWithoutExt = empty($fileExt) && !empty($videoFiles) && in_array($fileToTry, $videoFiles);
        
        if ($isArchive) {
            echo "   📦 Found archive: $fileToTry (video is inside)\n";
            
            if ($downloadAll) {
                echo "   📥 --download-all: Downloading ALL archive parts from usenet...\n";
                
                // Find ALL archive parts (part1.rar, part2.rar, etc.)
                // Strip &quot; from filenames for proper matching
                $cleanFileToTry = str_replace('&quot;', '', $fileToTry);
                
                // Extract base name - remove archive extensions and part numbers
                // For: name.part01.rar -> name
                // For: name.7z.001 -> name.7z (for 7z volumes, keep .7z)
                if (preg_match('/\.7z\.\d+$/i', $cleanFileToTry)) {
                    // Multi-volume 7z: remove .XXX ending
                    $baseName = preg_replace('/\.\d+$/i', '', $cleanFileToTry);
                } elseif (preg_match('/\.part\d+\.(rar|zip|7z|ace|arj)$/i', $cleanFileToTry)) {
                    // Multi-part RAR: name.part01.rar -> name
                    $baseName = preg_replace('/\.part\d+\.(rar|zip|7z|ace|arj)$/i', '', $cleanFileToTry);
                } else {
                    // Single archive: name.rar -> name
                    $baseName = preg_replace('/\.(rar|zip|7z|ace|arj)$/i', '', $cleanFileToTry);
                }
                
                echo "   🔍 Base name for matching: $baseName\n";
                
                // Also clean archive files array
                $cleanArchiveFiles = array_map(function($f) { return str_replace('&quot;', '', $f); }, $archiveFiles);
                echo "   🔍 Archive files in NZB: " . count($cleanArchiveFiles) . " files\n";
                $allParts = [];
                foreach ($cleanArchiveFiles as $af) {
                    // Match if filename starts with baseName and ends with archive extension
                    if (preg_match('/^' . preg_quote($baseName, '/') . '(\.part\d+)?\.(rar|zip|7z|ace|arj|\d+)$/i', $af)) {
                        $allParts[] = $af;
                        echo "   🔍 ✓ Matched: $af\n";
                    }
                }
                
                echo "   📦 Found " . count($allParts) . " archive parts\n";
                
                // Detect actual archive type
                $baseName = basename($cleanFileToTry);
                if (preg_match('/\.7z(\.\d+)?$/i', $baseName)) {
                    $ext = '7z';
                } elseif (preg_match('/\.rar$/i', $baseName)) {
                    $ext = 'rar';
                } elseif (preg_match('/\.zip$/i', $baseName)) {
                    $ext = 'zip';
                } else {
                    $ext = pathinfo($cleanFileToTry, PATHINFO_EXTENSION);
                }
                echo "   📦 Detected archive type: $ext\n";
                
                $extractDir = TEMP_DIR . '/extract_' . uniqid();
                mkdir($extractDir, 0777, true);
                
                // For multi-volume archives: download, decode each part, then give first part to extractor
                // Both 7z and unrar will auto-find remaining parts in the same directory
                $totalParts = count($allParts);
                $decodedParts = [];
                $partNum = 1;
                $totalPartsDownloaded = 0;
                $totalDownloadedMb = 0;
                $maxBytes = $maxDownloadMb * 1024 * 1024;
                
                echo "   📥 Max download: {$maxDownloadMb}MB (partial downloads often work for MediaInfo)\n";
                
                foreach ($allParts as $partFile) {
                    // Check if we've hit the download limit
                    if ($totalDownloadedMb >= $maxDownloadMb && $totalPartsDownloaded > 0) {
                        echo "   ⚠️ Reached max {$maxDownloadMb}MB limit\n";
                        break;
                    }
                    
                    echo "   🔍 Downloading part $partNum/$totalParts: $partFile\n";
                    // Only download what we still need up to the limit
                    $remainingBytes = ($maxDownloadMb - $totalDownloadedMb) * 1024 * 1024;
                    $partData = downloadCompleteFileFromNzb($nzbContent, $partFile, $nntp, $remainingBytes);
                    
                    if ($partData && strlen($partData) > 1000) {
                        $partSizeMb = round(strlen($partData) / (1024 * 1024), 1);
                        $totalDownloadedMb += $partSizeMb;
                        $totalPartsDownloaded++;
                        
                        // Save the decoded part directly
                        $decodedFile = $extractDir . '/decoded_part_' . str_pad($partNum, 3, '0', STR_PAD_LEFT) . '.' . strtolower($ext);
                        file_put_contents($decodedFile, $partData);
                        
                        if (file_exists($decodedFile)) {
                            $decodedParts[] = $decodedFile;
                            echo "   ✅ Decoded part $partNum: " . basename($decodedFile) . " (" . $partSizeMb . " MB)\n";
                            
                            // Try to extract and get MediaInfo immediately - partial videos often work!
                            echo "   🔄 Trying to extract MediaInfo from partial download...\n";
                            $archiveType = strtolower($ext);
                            $extractedData = extractVideoFromArchive($decodedFile, $archiveType, $extractDir, $result['password']);
                            if ($extractedData && isset($extractedData['video_file'])) {
                                $tempMediaInfo = runMediaInfo($extractedData['video_file']);
                                if ($tempMediaInfo && strlen($tempMediaInfo) > 500 && strpos($tempMediaInfo, 'Video') !== false) {
                                    $result['mediainfo'] = $tempMediaInfo;
                                    echo "   ✅ Got MediaInfo with $totalPartsDownloaded part(s) (" . round($totalDownloadedMb, 1) . " MB)!\n";
                                    if (!$keepFiles && file_exists($extractedData['video_file'])) {
                                        @unlink($extractedData['video_file']);
                                    }
                                    break;
                                }
                            }
                        } else {
                            echo "   ⚠️  Failed to save part $partNum\n";
                        }
                    } else {
                        echo "   ⚠️  Failed to download: $partFile\n";
                    }
                    $partNum++;
                }
                
                echo "   📦 Downloaded $totalPartsDownloaded parts (" . round($totalDownloadedMb, 1) . " MB total)\n";
                
                if ($totalPartsDownloaded > 0) {
                    // Sort decoded parts by filename
                    sort($decodedParts);
                    $actualArchiveFile = $decodedParts[0];
                    echo "   ✅ Using archive: " . basename($actualArchiveFile) . " for extraction\n";
                } else {
                    echo "   ⚠️  Failed to download/decode any parts\n";
                    $actualArchiveFile = null;
                }
                    
                if ($actualArchiveFile && file_exists($actualArchiveFile) && filesize($actualArchiveFile) > 1000) {
                    echo "   ✅ Decoded archive size: " . filesize($actualArchiveFile) . " bytes\n";
                    $archiveType = strtolower($ext);
                    $extractedData = extractVideoFromArchive($actualArchiveFile, $archiveType, $extractDir, $result['password']);
                        
                        if ($extractedData) {
                            $videoFile = $extractedData['video_file'];
                            echo "   📦 Extracted video: $videoFile\n";
                            
                            $mediainfo = runMediaInfo($videoFile);
                            if ($mediainfo && strlen($mediainfo) > 500 && (strpos($mediainfo, 'Video') !== false || strpos($mediainfo, 'Duration') !== false)) {
                                $result['mediainfo'] = $mediainfo;
                                echo "   ✅ MediaInfo extracted from archive: " . strlen($mediainfo) . " bytes\n";
                            } else {
                                echo "   ⚠️  MediaInfo extraction failed from extracted video\n";
                            }
                            
                            // Also look for NFO in extracted files (including subdirectories)
                            if (!$result['nfo']) {
                                $nfoFiles = glob($extractDir . '/**/*.nfo', GLOB_BRACE);
                                foreach ($nfoFiles as $nfoFile) {
                                    if (is_file($nfoFile)) {
                                        $nfoContent = @iconv('CP437', 'UTF-8//IGNORE', file_get_contents($nfoFile));
                                        if ($nfoContent) {
                                            $nfoContent = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $nfoContent);
                                            $result['nfo'] = $nfoContent;
                                            echo "   📄 NFO found in extracted archive: " . strlen($nfoContent) . " bytes\n";
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            if (!$keepFiles) {
                                @unlink($videoFile);
                            }
                        } else {
                            echo "   ⚠️  Failed to extract video from archive\n";
                        }
                        
                    if (!$keepFiles) {
                        @unlink($actualArchiveFile);
                    }
                } else {
                    echo "   ⚠️  Failed to download/decode archive parts\n";
                }
            } else {
                echo "   ⚠️  Skipping MediaInfo - archives need all parts to extract\n";
                echo "   💡 Use --download-all to download complete archive and extract video\n";
            }
        } else {
            // Direct video file (with or without extension)
            echo "   🎬 Found video file: $fileToTry\n";
            if ($isVideoWithoutExt) {
                echo "   ℹ️  Video detected by encoding keyword (no file extension)\n";
            }
            
            // For video files without extension, we need to download ALL segments (like archives)
            // because they're often multi-part posts
            if ($downloadAll || $isVideoWithoutExt) {
                echo "   📥 Downloading complete video file from usenet...\n";
                
                // For video files, allow up to 200MB for sample (enough for MediaInfo)
                // User can increase with --max-mb for full downloads
                $videoMaxBytes = $downloadAll ? ($maxDownloadMb * 1024 * 1024) : (200 * 1024 * 1024);
                
                // Get all segments for this file
                $videoSegments = getAllSegmentsForFile($nzbContent, $fileToTry);
                echo "   📊 Found " . count($videoSegments) . " segments for video file\n";
                
                if (!empty($videoSegments)) {
                    // Download all segments
                    $videoData = downloadCompleteFileFromNzb($nzbContent, $fileToTry, $nntp, $videoMaxBytes);
                    
                    if ($videoData && strlen($videoData) > 1000) {
                        echo "   ✅ Downloaded " . round(strlen($videoData) / (1024 * 1024), 1) . " MB\n";
                        
                        // Save the decoded data
                        $actualDecodedFile = TEMP_DIR . '/decoded_' . uniqid() . '.mkv';
                        file_put_contents($actualDecodedFile, $videoData);
                        
                        if (file_exists($actualDecodedFile) && filesize($actualDecodedFile) > 1000) {
                            echo "   ✅ Decoded file size: " . filesize($actualDecodedFile) . " bytes\n";
                            
                            // Run MediaInfo
                            $mediainfo = runMediaInfo($actualDecodedFile);
                            
                            if ($mediainfo && strlen($mediainfo) > 500 && (strpos($mediainfo, 'Video') !== false || strpos($mediainfo, 'Duration') !== false)) {
                                $result['mediainfo'] = $mediainfo;
                                echo "   ✅ MediaInfo extracted: " . strlen($mediainfo) . " bytes\n";
                            } else {
                                echo "   ⚠️  MediaInfo extraction failed after decode\n";
                                if ($mediainfo) {
                                    echo "   📝 MediaInfo output: " . substr($mediainfo, 0, 300) . "...\n";
                                }
                            }
                            
                            if (!$keepFiles) {
                                @unlink($actualDecodedFile);
                            }
                        }
                    } else {
                        echo "   ⚠️  Failed to download complete video file\n";
                    }
                } else {
                    echo "   ⚠️  No segments found for video file\n";
                }
            } else {
                // Original behavior: download only first segment (for quick checks)
                $downloadLimit = 50 * 1024 * 1024;
                $videoData = downloadFileFromNzb($nzbContent, $fileToTry, $nntp, $downloadLimit);
                
                if ($videoData) {
                    $dataLen = strlen($videoData);
                    echo "   📥 Downloaded $dataLen bytes from usenet\n";
                    
                    $actualDecodedFile = TEMP_DIR . '/decoded_' . uniqid() . '.mkv';
                    file_put_contents($actualDecodedFile, $videoData);
                    
                    if (file_exists($actualDecodedFile) && filesize($actualDecodedFile) > 1000) {
                        echo "   ✅ Decoded file size: " . filesize($actualDecodedFile) . " bytes\n";
                        
                        $mediainfo = runMediaInfo($actualDecodedFile);
                        
                        if ($mediainfo && strlen($mediainfo) > 500 && (strpos($mediainfo, 'Video') !== false || strpos($mediainfo, 'Duration') !== false)) {
                            $result['mediainfo'] = $mediainfo;
                            echo "   ✅ MediaInfo extracted: " . strlen($mediainfo) . " bytes\n";
                        } else {
                            echo "   ⚠️  MediaInfo extraction failed after decode\n";
                            if ($mediainfo) {
                                echo "   📝 MediaInfo output (too short/no video): " . substr($mediainfo, 0, 200) . "...\n";
                            }
                        }
                        
                        if (!$keepFiles) {
                            @unlink($actualDecodedFile);
                        }
                    } else {
                        echo "   ⚠️  Failed to decode file\n";
                    }
                } else {
                    echo "   ⚠️  Could not download data from usenet\n";
                }
            }
        }
    }
    
    // Check all archive files (RAR, ZIP, 7z, ACE, ARJ) for password
    $archiveExtensions = ['rar', 'zip', '7z', 'ace', 'arj'];
    $archivePatterns = [];
    foreach ($archiveExtensions as $ext) {
        $archivePatterns[] = preg_quote($ext, '/');
    }
    $archivePattern = implode('|', $archivePatterns);
    
    preg_match_all('/&quot;([^&"]+\.(' . $archivePattern . '))&quot;/i', $nzbContent, $archiveMatches);
    $archiveFiles = $archiveMatches[1] ?? [];
    
    if (!empty($archiveFiles)) {
        $result['rar_files'] = $archiveFiles;
        
        // If no password found yet, test each archive type
        if (!$result['password']) {
            echo "   🔐 Testing archives for password protection (this may take a moment)...\n";
            
            // Test RAR first
            $rarFiles = preg_grep('/\.(rar)$/i', $archiveFiles);
            if (!empty($rarFiles)) {
                $rarFile = array_values($rarFiles)[0];
                $rarData = downloadFileFromNzb($nzbContent, $rarFile, $nntp, 1024 * 1024);
                if ($rarData) {
                    $tempArchive = TEMP_DIR . '/' . uniqid('test_') . '.rar';
                    file_put_contents($tempArchive, $rarData);
                    $isPassworded = testArchivePassword($tempArchive, 'rar');
                    if ($isPassworded) {
                        $result['password'] = $isPassworded;
                        echo "   🔐 RAR is password protected: $isPassworded\n";
                    }
                    @unlink($tempArchive);
                }
            }
            
            // Test ZIP if no password found
            if (!$result['password']) {
                $zipFiles = preg_grep('/\.(zip)$/i', $archiveFiles);
                if (!empty($zipFiles)) {
                    $zipFile = array_values($zipFiles)[0];
                    $zipData = downloadFileFromNzb($nzbContent, $zipFile, $nntp, 1024 * 1024);
                    if ($zipData) {
                        $tempArchive = TEMP_DIR . '/' . uniqid('test_') . '.zip';
                        file_put_contents($tempArchive, $zipData);
                        $isPassworded = testArchivePassword($tempArchive, 'zip');
                        if ($isPassworded) {
                            $result['password'] = $isPassworded;
                            echo "   🔐 ZIP is password protected: $isPassworded\n";
                        }
                        @unlink($tempArchive);
                    }
                }
            }
            
            // Test 7z if no password found
            if (!$result['password']) {
                $sevenZipFiles = preg_grep('/\.(7z)$/i', $archiveFiles);
                if (!empty($sevenZipFiles)) {
                    $sevenZipFile = array_values($sevenZipFiles)[0];
                    $sevenZipData = downloadFileFromNzb($nzbContent, $sevenZipFile, $nntp, 1024 * 1024);
                    if ($sevenZipData) {
                        $tempArchive = TEMP_DIR . '/' . uniqid('test_') . '.7z';
                        file_put_contents($tempArchive, $sevenZipData);
                        $isPassworded = testArchivePassword($tempArchive, '7z');
                        if ($isPassworded) {
                            $result['password'] = $isPassworded;
                            echo "   🔐 7z is password protected: $isPassworded\n";
                        }
                        @unlink($tempArchive);
                    }
                }
            }
            
            // Test ACE if no password found
            if (!$result['password']) {
                $aceFiles = preg_grep('/\.(ace)$/i', $archiveFiles);
                if (!empty($aceFiles)) {
                    $aceFile = array_values($aceFiles)[0];
                    $aceData = downloadFileFromNzb($nzbContent, $aceFile, $nntp, 1024 * 1024);
                    if ($aceData) {
                        $tempArchive = TEMP_DIR . '/' . uniqid('test_') . '.ace';
                        file_put_contents($tempArchive, $aceData);
                        $isPassworded = testArchivePassword($tempArchive, 'ace');
                        if ($isPassworded) {
                            $result['password'] = $isPassworded;
                            echo "   🔐 ACE is password protected: $isPassworded\n";
                        }
                        @unlink($tempArchive);
                    }
                }
            }
            
            // Test ARJ if no password found
            if (!$result['password']) {
                $arjFiles = preg_grep('/\.(arj)$/i', $archiveFiles);
                if (!empty($arjFiles)) {
                    $arjFile = array_values($arjFiles)[0];
                    $arjData = downloadFileFromNzb($nzbContent, $arjFile, $nntp, 1024 * 1024);
                    if ($arjData) {
                        $tempArchive = TEMP_DIR . '/' . uniqid('test_') . '.arj';
                        file_put_contents($tempArchive, $arjData);
                        $isPassworded = testArchivePassword($tempArchive, 'arj');
                        if ($isPassworded) {
                            $result['password'] = $isPassworded;
                            echo "   🔐 ARJ is password protected: $isPassworded\n";
                        }
                        @unlink($tempArchive);
                    }
                }
            }
        }
    }
    
    // If no password found after all checks, mark as "NO PASSWORD"
    if (!$result['password']) {
        $result['password'] = NO_PASSWORD;
        echo "   🔓 No password required (verified)\n";
    }
    
    return $result;
}

/**
 * Get all segments for a file from NZB content
 */
function getAllSegmentsForFile($nzbContent, $filename) {
    $segments = [];
    
    // Clean filename for matching
    $cleanFilename = str_replace('&quot;', '', $filename);
    
    // Extract base name (remove segment numbers like (1/66), (2/66), etc.)
    $baseName = preg_replace('/\s*\(\d+\/\d+\)\s*$/', '', $cleanFilename);
    
    // Extract key part of filename (the actual video name without posters/ids)
    // Match: white.collar.s06e01.borrowed.time.1080p.amazon.web-dl.dd_5.1.x264-qoq
    if (preg_match('/([a-z0-9][-a-z0-9.]*\.(1080p|720p|2160p)[a-z0-9.-]*)/i', $baseName, $m)) {
        $videoName = $m[1];
    } else {
        $videoName = $baseName;
    }
    
    // Match all file blocks that contain this video name
    preg_match_all('/<file[^>]*>.*?<\/file>/s', $nzbContent, $fileMatches);
    
    foreach ($fileMatches[0] as $fileBlock) {
        // Check if this file block contains our video name
        if (stripos($fileBlock, $videoName) !== false) {
            // Extract all segment message-ids from this file block
            preg_match_all('/<segment[^>]*>([^<]+)<\/segment>/', $fileBlock, $segmentMatches);
            $segments = array_merge($segments, $segmentMatches[1]);
        }
    }
    
    return array_unique($segments);
}

/**
 * Download a file from Usenet based on NZB file references
 */
function downloadFileFromNzb($nzbContent, $filename, $nntp, $maxBytes = 0) {
    // Find the file block in NZB
    $pattern = '/<file[^>]*subject="[^"]*' . preg_quote($filename, '/') . '[^"]*"[^>]*>.*?<\/file>/is';
    
    if (!preg_match($pattern, $nzbContent, $fileBlock)) {
        // Try alternative pattern
        $pattern = '/<file[^>]*subject="[^"]*' . preg_quote(basename($filename), '/') . '[^"]*"[^>]*>.*?<\/file>/is';
        if (!preg_match($pattern, $nzbContent, $fileBlock)) {
            return null;
        }
    }
    
    // Extract all segment message IDs
    preg_match_all('/<segment[^>]*>([^<]+)<\/segment>/is', $fileBlock[0], $segments);
    
    if (empty($segments[1])) {
        return null;
    }
    
    $data = '';
    $bytesDownloaded = 0;
    $maxSegments = $maxBytes > 0 ? 50 : count($segments[1]); // Limit segments if maxBytes set
    
    echo "      📥 Downloading from usenet (" . count($segments[1]) . " segments, max $maxSegments)...\n";
    
    // Set shorter timeout per segment (10 seconds to avoid hanging)
    $nntp->setTimeout(10);
    
        $successCount = 0;
        $segmentsTried = 0;
        $consecutiveFailures = 0;
        foreach ($segments[1] as $i => $messageId) {
            $segmentsTried++;
            if ($segmentsTried > $maxSegments) {
                echo "      ⚠️ Reached max segments limit ($maxSegments)\n";
                break;
            }
            
            // If 5 consecutive failures, give up
            if ($consecutiveFailures >= 5) {
                echo "      ⚠️ Too many consecutive failures, giving up\n";
                break;
            }
            
            $messageId = trim($messageId);
            
            // Download article
            $article = $nntp->getArticle($messageId);
            
            if ($article) {
                $successCount++;
                $consecutiveFailures = 0;
            
                // Decode yEnc using our fast PHP decoder
                if (strpos($article, '=ybegin') !== false || strpos($article, '=yBegin') !== false || strpos($article, '=yEnc') !== false) {
                    $article = yDecode($article);
                }
                
                $data .= $article;
                $bytesDownloaded += strlen($article);
                
                if ($maxBytes > 0 && $bytesDownloaded >= $maxBytes) {
                    break;
                }
            } else {
                $consecutiveFailures++;
            }
        }
    
    echo "      📊 Downloaded: $successCount / " . count($segments[1]) . " segments, $bytesDownloaded bytes\n";
    
    // Reset timeout to default
    $nntp->setTimeout(60);
    
    return !empty($data) ? $data : null;
}

/**
 * Download segments in parallel using multiple connections
 */
function downloadSegmentsParallel($nzbContent, $filename, $nntp, $numConnections = 10) {
    $cleanFilename = str_replace('&quot;', '', $filename);
    $pattern = '/<file[^>]*subject="[^"]*' . preg_quote($cleanFilename, '/') . '[^"]*"[^>]*>.*?<\/file>/is';
    
    if (!preg_match($pattern, $nzbContent, $fileBlock)) {
        $pattern = '/<file[^>]*subject="[^"]*' . preg_quote(basename($cleanFilename), '/') . '[^"]*"[^>]*>.*?<\/file>/is';
        if (!preg_match($pattern, $nzbContent, $fileBlock)) {
            return null;
        }
    }
    
    preg_match_all('/<segment[^>]*>([^<]+)<\/segment>/is', $fileBlock[0], $segments);
    
    if (empty($segments[1])) {
        return null;
    }
    
    $allSegments = $segments[1];
    $totalSegments = count($allSegments);
    
    echo "      📥 Downloading $totalSegments segments with $numConnections parallel connections...\n";
    
    // Create temp file for output
    $tempOutput = tempnam(sys_get_temp_dir(), 'nzb_');
    $tempLock = $tempOutput . '.lock';
    
    // Split segments into chunks for parallel download
    $chunkSize = max(1, ceil($totalSegments / $numConnections));
    $chunks = array_chunk($allSegments, $chunkSize);
    
    $pids = [];
    $maxRetries = 3;
    
    foreach ($chunks as $chunkIndex => $chunk) {
        // Fork child process
        $pid = pcntl_fork();
        
        if ($pid == -1) {
            echo "      ⚠️  Failed to fork process\n";
            continue;
        } elseif ($pid == 0) {
            // Child process
            $childNntp = clone $nntp;
            $childNntp->setTimeout(15);
            
            $chunkData = '';
            $successCount = 0;
            
            foreach ($chunk as $messageId) {
                $messageId = trim($messageId);
                $article = $childNntp->getArticle($messageId);
                
                if ($article) {
                    $successCount++;
                    // Decode yEnc using our fast PHP decoder
                    if (strpos($article, '=ybegin') !== false || strpos($article, '=yBegin') !== false || strpos($article, '=yEnc') !== false) {
                        $article = yDecode($article);
                    }
                    $chunkData .= $article;
                }
            }
            
            // Write results to temp file with lock
            while (file_exists($tempLock)) {
                usleep(1000);
            }
            file_put_contents($tempLock, '1');
            file_put_contents($tempOutput . '.' . $chunkIndex, $successCount . '|' . base64_encode($chunkData));
            @unlink($tempLock);
            
            exit(0);
        } else {
            $pids[] = $pid;
        }
    }
    
    // Wait for all children
    foreach ($pids as $pid) {
        pcntl_waitpid($pid, $status);
    }
    
    // Combine results
    $combinedData = '';
    $totalSuccess = 0;
    
    foreach (glob($tempOutput . '.*') as $partFile) {
        if (is_file($partFile)) {
            $content = file_get_contents($partFile);
            if ($content && strpos($content, '|') !== false) {
                list($count, $data) = explode('|', $content, 2);
                $combinedData .= base64_decode($data);
                $totalSuccess += (int)$count;
            }
            @unlink($partFile);
        }
    }
    
    @unlink($tempOutput);
    
    echo "      📊 Downloaded: $totalSuccess / $totalSegments segments\n";
    
    return !empty($combinedData) ? $combinedData : null;
}

/**
 * Fast yEnc decoder
 */
function yDecode($text) {
    // 1. Separate headers from body (if NNTP headers are present)
    $bodyStart = strpos($text, "\r\n\r\n");
    if ($bodyStart !== false) {
        $text = substr($text, $bodyStart + 4);
    } else {
        $bodyStart = strpos($text, "\n\n");
        if ($bodyStart !== false) {
            $text = substr($text, $bodyStart + 2);
        }
    }

    // 2. Extract yEnc payload
    $dataStart = 0;
    if (($pos = strpos($text, "=ypart ")) !== false) {
        $dataStart = strpos($text, "\n", $pos) + 1;
    } elseif (($pos = strpos($text, "=ybegin ")) !== false) {
        $dataStart = strpos($text, "\n", $pos) + 1;
    }
    
    $dataEnd = strlen($text);
    if (($pos = strpos($text, "\n=yend")) !== false) {
        $dataEnd = $pos;
    } elseif (($pos = strpos($text, "\r\n=yend")) !== false) {
        $dataEnd = $pos;
    }
    
    $body = substr($text, $dataStart, $dataEnd - $dataStart);
    
    // 3. Remove line endings
    $body = str_replace(["\r", "\n"], "", $body);
    
    // 4. Decode escapes
    $body = preg_replace_callback('/=(.)/s', function($m) {
        return chr((ord($m[1]) - 64 + 256) % 256);
    }, $body);
    
    // 5. Apply -42 offset mapping
    static $yencMap = null;
    if ($yencMap === null) {
        $yencMap = [];
        for ($i = 0; $i < 256; $i++) {
            $yencMap[chr($i)] = chr(($i - 42 + 256) % 256);
        }
    }
    
    return strtr($body, $yencMap);
}

/**
 * Run mediainfo CLI
 */
function runMediaInfo($filePath) {
    if (!file_exists($filePath)) {
        return null;
    }
    
    $cmd = MEDIAINFO_BIN . ' "' . $filePath . '"';
    $output = shell_exec($cmd . ' 2>&1');
    
    if ($output) {
        $output = preg_replace('/^.*' . preg_quote($filePath, '/') . '/', '', $output);
        $output = preg_replace('/^.*File[^:]*:/', '', $output);
    }
    
    return $output ?: null;
}

/**
 * Parse MediaInfo output and extract structured data
 */
function parseMediaInfo($mediainfo) {
    if (!$mediainfo) {
        return null;
    }
    
    $data = [
        'resolution' => null,
        'video_codec' => null,
        'audio_codec' => null,
        'format' => null,
        'subtitles' => null,
    ];
    
    // Extract resolution (e.g., 1920x1080)
    // Look for width and height in the Video section (handles "1 280 pixels" and "1,280 pixels")
    if (preg_match('/Width\s*:\s*([\d\s,]+)/i', $mediainfo, $m)) {
        $width = preg_replace('/[\s,]/', '', $m[1]);
    }
    if (preg_match('/Height\s*:\s*([\d\s,]+)/i', $mediainfo, $m)) {
        $height = preg_replace('/[\s,]/', '', $m[1]);
    }
    
    if (!empty($width) && !empty($height)) {
        $data['resolution'] = $width . 'x' . $height;
    } elseif (preg_match('/Frame size\s*:\s*(\d+x\d+)/i', $mediainfo, $m)) {
        $data['resolution'] = $m[1];
    }
    
    // Extract video codec - check Video section
    if (preg_match('/Format\s*:\s*(AV1)/i', $mediainfo, $m)) {
        $data['video_codec'] = 'AV1';
    } elseif (preg_match('/Format\s*:\s*(HEVC|H\.265)/i', $mediainfo, $m)) {
        $data['video_codec'] = 'HEVC';
    } elseif (preg_match('/Format\s*:\s*(AVC|H\.264)/i', $mediainfo, $m)) {
        $data['video_codec'] = 'AVC';
    } elseif (preg_match('/Codec ID\s*:\s*(V_AV1|AV1)/i', $mediainfo, $m)) {
        $data['video_codec'] = 'AV1';
    } elseif (preg_match('/Codec ID\s*:\s*(V_MPEGH|V_HEVC)/i', $mediainfo, $m)) {
        $data['video_codec'] = 'HEVC';
    } elseif (preg_match('/Codec ID\s*:\s*(V_MPEG4|V_AVC|V_H264)/i', $mediainfo, $m)) {
        $data['video_codec'] = 'AVC';
    }
    
    // Extract audio codec - check Audio section
    if (preg_match('/Format\s*:\s*(Opus)/i', $mediainfo, $m)) {
        $data['audio_codec'] = 'Opus';
    } elseif (preg_match('/Format\s*:\s*(AC-3|E-AC-3|Dolby)/i', $mediainfo, $m)) {
        $data['audio_codec'] = 'AC-3';
    } elseif (preg_match('/Format\s*:\s*(AAC)/i', $mediainfo, $m)) {
        $data['audio_codec'] = 'AAC';
    } elseif (preg_match('/Format\s*:\s*(DTS)/i', $mediainfo, $m)) {
        $data['audio_codec'] = 'DTS';
    } elseif (preg_match('/Format\s*:\s*(MP3)/i', $mediainfo, $m)) {
        $data['audio_codec'] = 'MP3';
    } elseif (preg_match('/Format\s*:\s*(FLAC)/i', $mediainfo, $m)) {
        $data['audio_codec'] = 'FLAC';
    }
    
    // Extract format (container)
    if (preg_match('/Format\s*:\s*(Matroska)/i', $mediainfo, $m)) {
        $data['format'] = 'MKV';
    } elseif (preg_match('/Format\s*:\s*(MPEG-4)/i', $mediainfo, $m)) {
        $data['format'] = 'MP4';
    } elseif (preg_match('/Format\s*:\s*(AVI)/i', $mediainfo, $m)) {
        $data['format'] = 'AVI';
    } elseif (preg_match('/Complete name.*\.([a-z0-9]+)$/i', $mediainfo, $m)) {
        $data['format'] = strtoupper($m[1]);
    }
    
    // Extract subtitles - find Text sections with language
    // Look for format/language patterns in subtitle sections
    preg_match_all('/Text\s*[\r\n]+ID\s*:\s*\d+[\r\n]+Format\s*:\s*([^\r\n]+)[\r\n]+(?:Codec ID[\s\S]*?)?Language\s*:\s*([^\r\n]+)/i', $mediainfo, $subtitleMatches, PREG_SET_ORDER);
    
    if (empty($subtitleMatches)) {
        // Alternative pattern: find Language fields in Text sections
        preg_match_all('/Language\s*:\s*([^\r\n]+)/i', $mediainfo, $langMatches);
        if (!empty($langMatches)) {
            $subtitleLanguages = array_unique(array_map('trim', $langMatches[1]));
            $data['subtitles'] = implode(',', $subtitleLanguages);
        }
    } else {
        $subtitleLanguages = [];
        foreach ($subtitleMatches as $match) {
            $lang = trim($match[2]);
            if (!empty($lang) && strtolower($lang) !== 'und') {
                $subtitleLanguages[] = $lang;
            }
        }
        if (!empty($subtitleLanguages)) {
            $data['subtitles'] = implode(',', array_unique($subtitleLanguages));
        }
    }
    
    return $data;
}

/**
 * Test if archive is password protected
 * Supports: RAR, ZIP, 7z, ACE, ARJ
 */
function testArchivePassword($archivePath, $type) {
    if (!file_exists($archivePath)) {
        return null;
    }
    
    $type = strtolower($type);
    $output = '';
    
    switch ($type) {
        case 'rar':
            if (!defined('UNRAR_BIN')) {
                return null;
            }
            $cmd = UNRAR_BIN . ' l -p- "' . $archivePath . '" 2>&1';
            $output = shell_exec($cmd);
            break;
            
        case 'zip':
            if (!defined('UNZIP_BIN')) {
                return null;
            }
            $cmd = UNZIP_BIN . ' l -P "" "' . $archivePath . '" 2>&1';
            $output = shell_exec($cmd);
            break;
            
case '7z':
            if (!defined('SEVENZIP_BIN') || !file_exists(SEVENZIP_BIN)) {
                return null;
            }
            $passArg = ($password && $password !== NO_PASSWORD) ? '-p' . escapeshellarg($password) : '';
            echo "   🔍 7z extracting with password: " . ($passArg ? 'YES' : 'NO') . "\n";
            echo "   🔍 Command: " . SEVENZIP_BIN . ' e -o"' . $extractDir . '" -y ' . $passArg . ' "' . $archivePath . "\"\n";
            $cmd = SEVENZIP_BIN . ' e -o' . escapeshellarg($extractDir) . ' -y ' . $passArg . ' "' . $archivePath . '" 2>&1';
            $output = shell_exec($cmd);
            echo "   🔍 7z output: $output\n";
            break;
            
        case 'ace':
            // ACE is less common, try unace if available
            $cmd = '/usr/bin/unace l -p "" "' . $archivePath . '" 2>&1';
            $output = shell_exec($cmd);
            break;
            
        case 'arj':
            // ARJ is less common, try arj if available
            $cmd = '/usr/bin/arj l -p"" "' . $archivePath . '" 2>&1';
            $output = shell_exec($cmd);
            break;
            
        default:
            return null;
    }
    
    // Check for password protection indicators
    if ($output !== false && $output !== '') {
        $outputLower = strtolower($output);
        $passwordIndicators = [
            'correct password',
            'password required',
            'password protected',
            'encrypted',
            'enter password',
            ' crc failed',  // CRC failure often means wrong password
        ];
        
        foreach ($passwordIndicators as $indicator) {
            if (strpos($outputLower, $indicator) !== false) {
                return 'UNKNOWN';
            }
        }
    }
    
    return null;
}

/**
 * Download a complete file from Usenet (all segments)
 */
function downloadCompleteFileFromNzb($nzbContent, $filename, $nntp, $maxBytes = 0) {
    $cleanFilename = str_replace('&quot;', '', $filename);
    
    // Extract the key video name part for matching
    if (preg_match('/([a-z0-9][-a-z0-9.]*\.(1080p|720p|2160p)[a-z0-9.-]*)/i', $cleanFilename, $m)) {
        $videoName = $m[1];
    } else {
        $videoName = $cleanFilename;
    }
    
    // Find ALL file blocks that contain this video name (not just exact match)
    preg_match_all('/<file[^>]*>.*?<\/file>/is', $nzbContent, $allFileBlocks);
    
    $allSegments = [];
    $matchedCount = 0;
    
    foreach ($allFileBlocks[0] as $fileBlock) {
        // Check if this file block contains our video name
        if (stripos($fileBlock, $videoName) !== false) {
            $matchedCount++;
            // Extract segments from this block
            preg_match_all('/<segment[^>]*>([^<]+)<\/segment>/is', $fileBlock, $segments);
            $allSegments = array_merge($allSegments, $segments[1]);
        }
    }
    
    if (empty($allSegments)) {
        echo "      ❌ Could not find file blocks for: $videoName\n";
        return null;
    }
    
    echo "      📊 Found $matchedCount file blocks with " . count($allSegments) . " total segments\n";
    
    // Remove duplicates and sort (segments should be in order)
    $allSegments = array_values(array_unique($allSegments));
    $totalSegments = count($allSegments);
    
    if ($maxBytes > 0) {
        // Average yEnc segment is ~700KB.
        $maxSegments = ceil($maxBytes / 700000);
        if ($totalSegments > $maxSegments) {
            $allSegments = array_slice($allSegments, 0, $maxSegments);
            $totalSegments = count($allSegments);
            echo "      📥 Limited to $totalSegments segments (" . round($maxBytes / 1024 / 1024) . "MB max)\n";
        }
    } else {
        echo "      📥 Found $totalSegments segments for $cleanFilename\n";
    }
    
    // Use parallel downloads with connections limit
    global $numConnections;
    $activeConnections = $numConnections ?: 10;
    echo "      🚀 Using $activeConnections parallel connections...\n";
    
    // Create temp file for output
    $tempOutput = tempnam(sys_get_temp_dir(), 'nzb_');
    
    // Split segments into chunks for parallel download
    $chunkSize = max(1, ceil($totalSegments / $activeConnections));
    $chunks = array_chunk($allSegments, $chunkSize);
    
    $pids = [];
    
    foreach ($chunks as $chunkIndex => $chunk) {
        $pid = pcntl_fork();
        
        if ($pid == -1) {
            echo "      ⚠️  Failed to fork process\n";
            continue;
        } elseif ($pid == 0) {
            // Child process: create its own NNTP connection
            global $nntp;
            $childNntp = new NntpClient(NNTP_SERVER, NNTP_PORT, NNTP_USERNAME, NNTP_PASSWORD);
            if (!$childNntp->connect()) {
                exit(1);
            }
            $childNntp->setTimeout(15);
            
            $chunkData = '';
            $successCount = 0;
            
            foreach ($chunk as $messageId) {
                $messageId = trim($messageId);
                $article = $childNntp->getArticle($messageId);
                
                if ($article) {
                    $successCount++;
                    // Decode yEnc using our fast PHP decoder
                    if (strpos($article, '=ybegin') !== false || strpos($article, '=yBegin') !== false || strpos($article, '=yEnc') !== false) {
                        $article = yDecode($article);
                    }
                    $chunkData .= $article;
                }
            }
            
            // Write results to temp file
            file_put_contents($tempOutput . '.' . $chunkIndex, $successCount . '|' . base64_encode($chunkData));
            
            $childNntp->disconnect();
            exit(0);
        } else {
            $pids[] = $pid;
        }
    }
    
    // Wait for all children
    foreach ($pids as $pid) {
        pcntl_waitpid($pid, $status);
    }
    
    // Combine results
    $combinedData = '';
    $totalSuccess = 0;
    
    foreach (glob($tempOutput . '.*') as $partFile) {
        if (is_file($partFile)) {
            $content = file_get_contents($partFile);
            if ($content && strpos($content, '|') !== false) {
                list($count, $data) = explode('|', $content, 2);
                $combinedData .= base64_decode($data);
                $totalSuccess += (int)$count;
            }
            @unlink($partFile);
        }
    }
    
    @unlink($tempOutput);
    
    echo "      ✅ Downloaded: $totalSuccess / $totalSegments segments, " . strlen($combinedData) . " bytes\n";
    
    return !empty($combinedData) ? $combinedData : null;
}

/**
 * Extract video file from archive
 * Returns array with 'video_file' path or null on failure
 */
function extractVideoFromArchive($archivePath, $type, $extractDir, $password = null) {
    $videoExtensions = ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'm2ts', 'ts', 'webm', 'mpg', 'mpeg'];
    
    $type = strtolower($type);
    $extractedVideo = null;
    
    switch ($type) {
        case 'rar':
            // Use password if provided, otherwise skip protected files
            $hasPassword = ($password && $password !== NO_PASSWORD);
            $passArg = $hasPassword ? '-p' . escapeshellarg($password) : '-p-';
            echo "   🔐 Extracting RAR" . ($hasPassword ? " (with password from NZB)" : " (skipping if password-protected)...") . "\n";
            echo "   🔍 Running: " . UNRAR_BIN . ' x -kb -o+ ' . $passArg . ' "' . $archivePath . '" ' . escapeshellarg($extractDir) . "\n";
            $cmd = UNRAR_BIN . ' x -kb -o+ ' . $passArg . ' "' . $archivePath . '" ' . escapeshellarg($extractDir) . ' 2>&1';
            $output = shell_exec($cmd);
            echo "   🔍 Unrar output: $output\n";
            
            // Only prompt for password if:
            // 1. No password was provided initially
            // 2. Output indicates password protection (encrypted, wrong password, etc.)
            if (!$hasPassword && $output) {
                $outputLower = strtolower($output);
                $passwordIndicators = ['password', 'encrypted', 'wrong password', 'crc failed', 'access denied'];
                $isPasswordProtected = false;
                
                foreach ($passwordIndicators as $indicator) {
                    if (strpos($outputLower, $indicator) !== false) {
                        $isPasswordProtected = true;
                        break;
                    }
                }
                
                if ($isPasswordProtected) {
                    echo "\n";
                    echo "   ╔══════════════════════════════════════════════════════════╗\n";
                    echo "   ║  🔐 ARCHIVE IS PASSWORD PROTECTED                        ║\n";
                    echo "   ║                                                          ║\n";
                    echo "   ║  Please enter the password or press ENTER to skip:       ║\n";
                    echo "   ║  (Timeout: 60 seconds)                                   ║\n";
                    echo "   ╚══════════════════════════════════════════════════════════╝\n";
                    echo "   > ";
                    
                    // Read password from stdin with 60-second timeout
                    $enteredPassword = '';
                    $stdin = fopen('php://stdin', 'r');
                    stream_set_blocking($stdin, false);
                    
                    $timeout = 60; // seconds
                    $elapsed = 0;
                    $interval = 1; // check every second
                    
                    while ($elapsed < $timeout) {
                        $read = [$stdin];
                        $write = null;
                        $except = null;
                        
                        if (stream_select($read, $write, $except, 1)) {
                            $enteredPassword = trim(fgets($stdin));
                            break;
                        }
                        
                        $elapsed += $interval;
                        if ($elapsed % 10 == 0) {
                            echo ".";
                            flush();
                        }
                    }
                    
                    fclose($stdin);
                    echo "\n";
                    
                    if (!empty($enteredPassword)) {
                        echo "   🔐 Retrying with password...\n";
                        $passArg = '-p' . escapeshellarg($enteredPassword);
                        $cmd = UNRAR_BIN . ' x -kb -o+ ' . $passArg . ' "' . $archivePath . '" ' . escapeshellarg($extractDir) . ' 2>&1';
                        $output = shell_exec($cmd);
                        echo "   🔍 Unrar output: $output\n";
                    } else {
                        echo "   ⏭️  Timeout reached - skipping password-protected archive\n";
                    }
                }
            }
            break;
            
        case 'zip':
            $passArg = ($password && $password !== NO_PASSWORD) ? '-P ' . escapeshellarg($password) : '';
            $cmd = UNZIP_BIN . ' -o ' . $passArg . '"' . $archivePath . '" -d ' . escapeshellarg($extractDir) . ' 2>&1';
            $output = shell_exec($cmd);
            break;
            
        case '7z':
            $passArg = ($password && $password !== NO_PASSWORD) ? '-p' . escapeshellarg($password) : '';
            echo "   🔍 7z extracting - password: " . ($passArg ? 'YES (' . substr($password, 0, 5) . '...)' : 'NO') . "\n";
            $cmd = SEVENZIP_BIN . ' e -o' . escapeshellarg($extractDir) . ' -y ' . $passArg . ' "' . $archivePath . '" 2>&1';
            $output = shell_exec($cmd);
            echo "   🔍 7z output: $output\n";
            break;
            
        default:
            echo "   ⚠️  Unsupported archive type: $type\n";
            return null;
    }
    
    // Find the video file in extracted contents
    $files = glob($extractDir . '/*');
    foreach ($files as $file) {
        if (is_file($file)) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($ext, $videoExtensions)) {
                return ['video_file' => $file];
            }
        }
    }
    
    // Check subdirectories for video files
    $dirs = glob($extractDir . '/*', GLOB_ONLYDIR);
    foreach ($dirs as $dir) {
        $files = glob($dir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array($ext, $videoExtensions)) {
                    return ['video_file' => $file];
                }
            }
        }
    }
    
    return null;
}
