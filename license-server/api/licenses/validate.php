<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/lib/bootstrap.php';
require_once dirname(__DIR__, 2) . '/lib/db.php';
require_once dirname(__DIR__, 2) . '/lib/license-validator.php';
require_once dirname(__DIR__, 2) . '/lib/signing.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response([
        'valid' => false,
        'status' => 'invalid',
        'message' => 'Only POST is supported'
    ], 405);
}

$config = load_config();
$payload = read_json_body();

try {
    $pdo = get_pdo($config);
    $result = validate_license($pdo, $payload);
    $signedBody = sign_license_response(
        $result['body'],
        $config,
        trim((string)($payload['license_key'] ?? '')),
        trim((string)($payload['machine_id'] ?? ''))
    );
    json_response($signedBody, $result['http_status']);
} catch (Throwable $error) {
    json_response([
        'valid' => false,
        'status' => 'invalid',
        'message' => 'Server error: ' . $error->getMessage()
    ], 500);
}
