<?php

declare(strict_types=1);

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function load_private_key_pem_from_config(array $config): ?string
{
    $signing = is_array($config['signing'] ?? null) ? $config['signing'] : [];
    $inlinePem = trim((string)($signing['private_key_pem'] ?? ''));
    if ($inlinePem !== '') {
        return $inlinePem;
    }

    $privateKeyPath = trim((string)($signing['private_key_path'] ?? ''));
    if ($privateKeyPath === '') {
        return null;
    }

    if (!is_file($privateKeyPath)) {
        throw new RuntimeException('License signing private key file not found');
    }

    $pem = file_get_contents($privateKeyPath);
    if ($pem === false || trim($pem) === '') {
        throw new RuntimeException('License signing private key file is empty or unreadable');
    }

    return $pem;
}

function extract_ed25519_seed_from_pem(string $privateKeyPem): string
{
    $clean = preg_replace('/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/', '', $privateKeyPem);
    if (!is_string($clean) || $clean === '') {
        throw new RuntimeException('Invalid private key PEM format');
    }

    $der = base64_decode($clean, true);
    if ($der === false) {
        throw new RuntimeException('Could not decode private key PEM');
    }

    $marker = "\x04\x22\x04\x20";
    $pos = strpos($der, $marker);
    if ($pos === false) {
        throw new RuntimeException('Unsupported private key format; expected PKCS8 Ed25519 key');
    }

    $seed = substr($der, $pos + strlen($marker), 32);
    if ($seed === false || strlen($seed) !== 32) {
        throw new RuntimeException('Could not extract Ed25519 seed from private key');
    }

    return $seed;
}

function sign_license_response(array $body, array $config, string $licenseKey, string $machineId): array
{
    $signing = is_array($config['signing'] ?? null) ? $config['signing'] : [];
    $enabled = (bool)($signing['enabled'] ?? false);
    if (!$enabled) {
        return $body;
    }

    $privateKeyPem = load_private_key_pem_from_config($config);
    if ($privateKeyPem === null) {
        throw new RuntimeException('Signing is enabled but no private key is configured');
    }

    if (!function_exists('sodium_crypto_sign_seed_keypair')) {
        throw new RuntimeException('libsodium extension is required for Ed25519 signing');
    }

    $payload = $body;
    $payload['issued_at'] = gmdate('c');
    $payload['license_key'] = $licenseKey;
    $payload['machine_id'] = $machineId;

    $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($payloadJson) || $payloadJson === '') {
        throw new RuntimeException('Failed to serialize signed payload');
    }

    $seed = extract_ed25519_seed_from_pem($privateKeyPem);
    $keypair = sodium_crypto_sign_seed_keypair($seed);
    $secretKey = sodium_crypto_sign_secretkey($keypair);
    $signature = sodium_crypto_sign_detached($payloadJson, $secretKey);

    $signed = [
        'signed_payload' => base64url_encode($payloadJson),
        'signature' => base64url_encode($signature),
        'key_id' => trim((string)($signing['key_id'] ?? '')),
        'alg' => trim((string)($signing['algorithm'] ?? 'ed25519'))
    ];

    return array_merge($body, $signed);
}
