<?php

return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 8889,
        'database' => 'nzbarr_license_test',
        'username' => 'root',
        'password' => 'root',
        'charset' => 'utf8mb4',
    ],
    'signing' => [
        'enabled' => true,
        'algorithm' => 'ed25519',
        'key_id' => 'prod-2026-01',
        // Use your server-only private key path
        'private_key_path' => '/absolute/path/outside/webroot/license-private-key.pem',
        // Optional alternative to private_key_path:
        // 'private_key_pem' => "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    ],
    'admin' => [
        // Set these before going live. Basic auth is intentionally simple.
        'username' => 'admin',
        'password' => 'change-me-now',
    ],
];
