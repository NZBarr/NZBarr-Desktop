<?php

declare(strict_types=1);

function get_pdo(array $config): PDO
{
    $db = $config['db'] ?? [];
    $host = $db['host'] ?? '127.0.0.1';
    $port = (int)($db['port'] ?? 3306);
    $database = $db['database'] ?? '';
    $username = $db['username'] ?? '';
    $password = $db['password'] ?? '';
    $charset = $db['charset'] ?? 'utf8mb4';

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $database, $charset);

    return new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}
