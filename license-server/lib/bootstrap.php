<?php

declare(strict_types=1);

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response([
            'valid' => false,
            'status' => 'invalid',
            'message' => 'Request body must be valid JSON'
        ], 400);
    }

    return $decoded;
}

function load_config(): array
{
    $configPath = dirname(__DIR__) . '/config.php';
    if (!file_exists($configPath)) {
        json_response([
            'valid' => false,
            'status' => 'invalid',
            'message' => 'Server config.php is missing'
        ], 500);
    }

    $config = require $configPath;
    if (!is_array($config)) {
        json_response([
            'valid' => false,
            'status' => 'invalid',
            'message' => 'Server config.php is invalid'
        ], 500);
    }

    return $config;
}
