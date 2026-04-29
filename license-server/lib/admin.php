<?php

declare(strict_types=1);

function admin_config(array $config): array
{
    return is_array($config['admin'] ?? null) ? $config['admin'] : [];
}

function require_admin_auth(array $config): void
{
    $admin = admin_config($config);
    $expectedUser = (string)($admin['username'] ?? '');
    $expectedPass = (string)($admin['password'] ?? '');

    if ($expectedUser === '' || $expectedPass === '') {
        json_response([
            'valid' => false,
            'status' => 'invalid',
            'message' => 'Admin credentials are not configured'
        ], 500);
    }

    $providedUser = (string)($_SERVER['PHP_AUTH_USER'] ?? '');
    $providedPass = (string)($_SERVER['PHP_AUTH_PW'] ?? '');

    if (!hash_equals($expectedUser, $providedUser) || !hash_equals($expectedPass, $providedPass)) {
        header('WWW-Authenticate: Basic realm="NZBarr License Admin"');
        json_response([
            'valid' => false,
            'status' => 'invalid',
            'message' => 'Authentication required'
        ], 401);
    }
}

function admin_input(string $key, string $default = ''): string
{
    return trim((string)($_POST[$key] ?? $default));
}
