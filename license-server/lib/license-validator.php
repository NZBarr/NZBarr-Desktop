<?php

declare(strict_types=1);

function record_license_validation_event(PDO $pdo, ?array $license, string $licenseKey, string $machineId, string $eventType, string $status, string $message): void
{
    if (is_array($license) && isset($license['id'])) {
        $touch = $pdo->prepare('
            UPDATE licenses
            SET last_validated_at = UTC_TIMESTAMP()
            WHERE id = :id
        ');
        $touch->execute(['id' => $license['id']]);
    }

    $audit = $pdo->prepare('
        INSERT INTO license_audit_log (
            license_id,
            license_key,
            machine_id,
            event_type,
            status,
            message,
            ip_address,
            user_agent
        ) VALUES (
            :license_id,
            :license_key,
            :machine_id,
            :event_type,
            :status,
            :message,
            :ip_address,
            :user_agent
        )
    ');

    $audit->execute([
        'license_id' => is_array($license) && isset($license['id']) ? $license['id'] : null,
        'license_key' => $licenseKey,
        'machine_id' => $machineId,
        'event_type' => $eventType,
        'status' => $status,
        'message' => $message,
        'ip_address' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64) ?: null,
        'user_agent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255) ?: null
    ]);
}

function validate_license(PDO $pdo, array $payload): array
{
    $licenseKey = trim((string)($payload['license_key'] ?? ''));
    $machineId = trim((string)($payload['machine_id'] ?? ''));
    $appVersion = trim((string)($payload['app_version'] ?? 'unknown'));
    $platform = trim((string)($payload['platform'] ?? 'unknown'));

    if ($licenseKey === '' || $machineId === '') {
        record_license_validation_event(
            $pdo,
            null,
            $licenseKey,
            $machineId,
            'validation_rejected',
            'invalid',
            'license_key and machine_id are required'
        );

        return [
            'http_status' => 400,
            'body' => [
                'valid' => false,
                'status' => 'invalid',
                'message' => 'license_key and machine_id are required'
            ]
        ];
    }

    $stmt = $pdo->prepare('SELECT * FROM licenses WHERE license_key = :license_key LIMIT 1');
    $stmt->execute(['license_key' => $licenseKey]);
    $license = $stmt->fetch();

    if (!$license) {
        record_license_validation_event(
            $pdo,
            null,
            $licenseKey,
            $machineId,
            'validation_lookup_failed',
            'invalid',
            'License key not found'
        );

        return [
            'http_status' => 404,
            'body' => [
                'valid' => false,
                'status' => 'invalid',
                'message' => 'License key not found'
            ]
        ];
    }

    $status = (string)$license['status'];
    $expiresAt = $license['expires_at'] ? gmdate('c', strtotime((string)$license['expires_at'])) : null;
    $graceDays = (int)($license['grace_days'] ?? 14);
    $graceUntil = $license['expires_at']
        ? gmdate('c', strtotime((string)$license['expires_at'] . " +{$graceDays} days"))
        : null;

    if ($status === 'revoked') {
        record_license_validation_event(
            $pdo,
            $license,
            $licenseKey,
            $machineId,
            'validation_denied',
            'revoked',
            'License has been revoked'
        );

        return [
            'http_status' => 403,
            'body' => [
                'valid' => false,
                'status' => 'revoked',
                'plan' => $license['plan'],
                'expires_at' => $expiresAt,
                'grace_until' => $graceUntil,
                'customer_email' => $license['customer_email'],
                'features' => [],
                'message' => 'License has been revoked'
            ]
        ];
    }

    $nowTs = time();
    $expiresTs = $license['expires_at'] ? strtotime((string)$license['expires_at']) : null;
    $graceUntilTs = $graceUntil ? strtotime($graceUntil) : null;

    if ($expiresTs !== null && $expiresTs < $nowTs) {
        if ($graceUntilTs !== null && $graceUntilTs >= $nowTs) {
            // During grace we keep premium feature access active.
            $featuresInGrace = json_decode((string)$license['features_json'], true);
            if (!is_array($featuresInGrace)) {
                $featuresInGrace = [];
            }

            record_license_validation_event(
                $pdo,
                $license,
                $licenseKey,
                $machineId,
                'validation_grace',
                'grace',
                'License term ended and is currently in grace mode'
            );

            return [
                'http_status' => 200,
                'body' => [
                    'valid' => true,
                    'status' => 'grace',
                    'plan' => $license['plan'],
                    'expires_at' => $expiresAt,
                    'grace_until' => $graceUntil,
                    'customer_email' => $license['customer_email'],
                    'features' => array_values($featuresInGrace),
                    'message' => 'License term ended and is currently in grace mode'
                ]
            ];
        }

        record_license_validation_event(
            $pdo,
            $license,
            $licenseKey,
            $machineId,
            'validation_denied',
            'expired',
            'License has expired'
        );

        return [
            'http_status' => 403,
            'body' => [
                'valid' => false,
                'status' => 'expired',
                'plan' => $license['plan'],
                'expires_at' => $expiresAt,
                'grace_until' => $graceUntil,
                'customer_email' => $license['customer_email'],
                'features' => [],
                'message' => 'License has expired'
            ]
        ];
    }

    $activationStmt = $pdo->prepare('SELECT * FROM license_activations WHERE license_id = :license_id AND machine_id = :machine_id LIMIT 1');
    $activationStmt->execute([
        'license_id' => $license['id'],
        'machine_id' => $machineId
    ]);
    $activation = $activationStmt->fetch();

    if ($activation) {
        $updateActivation = $pdo->prepare('
            UPDATE license_activations
            SET app_version = :app_version, platform = :platform, last_seen_at = UTC_TIMESTAMP(), active = 1
            WHERE id = :id
        ');
        $updateActivation->execute([
            'app_version' => $appVersion,
            'platform' => $platform,
            'id' => $activation['id']
        ]);
    } else {
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM license_activations WHERE license_id = :license_id AND active = 1');
        $countStmt->execute(['license_id' => $license['id']]);
        $activeCount = (int)$countStmt->fetchColumn();

        if ($activeCount >= (int)$license['max_activations']) {
            record_license_validation_event(
                $pdo,
                $license,
                $licenseKey,
                $machineId,
                'activation_limit_reached',
                'invalid',
                'Activation limit reached for this license'
            );

            return [
                'http_status' => 403,
                'body' => [
                    'valid' => false,
                    'status' => 'invalid',
                    'plan' => $license['plan'],
                    'expires_at' => $expiresAt,
                    'grace_until' => $graceUntil,
                    'customer_email' => $license['customer_email'],
                    'features' => [],
                    'message' => 'Activation limit reached for this license'
                ]
            ];
        }

        $insertActivation = $pdo->prepare('
            INSERT INTO license_activations (
                license_id,
                machine_id,
                platform,
                app_version,
                first_seen_at,
                last_seen_at,
                active
            ) VALUES (
                :license_id,
                :machine_id,
                :platform,
                :app_version,
                UTC_TIMESTAMP(),
                UTC_TIMESTAMP(),
                1
            )
        ');
        $insertActivation->execute([
            'license_id' => $license['id'],
            'machine_id' => $machineId,
            'platform' => $platform,
            'app_version' => $appVersion
        ]);
    }

    $features = json_decode((string)$license['features_json'], true);
    if (!is_array($features)) {
        $features = [];
    }

    record_license_validation_event(
        $pdo,
        $license,
        $licenseKey,
        $machineId,
        'validation_success',
        'active',
        'License active'
    );

    return [
        'http_status' => 200,
        'body' => [
            'valid' => true,
            'status' => 'active',
            'plan' => $license['plan'],
            'expires_at' => $expiresAt,
            'grace_until' => $graceUntil,
            'customer_email' => $license['customer_email'],
            'features' => array_values($features),
            'message' => 'License active'
        ]
    ];
}
