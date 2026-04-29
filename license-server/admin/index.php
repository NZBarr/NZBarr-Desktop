<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/admin.php';

$config = load_config();
require_admin_auth($config);
$pdo = get_pdo($config);

$message = '';
$error = '';

function redirect_to_self(string $message = '', string $error = ''): void
{
    $params = [];
    if ($message !== '') {
        $params['message'] = $message;
    }
    if ($error !== '') {
        $params['error'] = $error;
    }
    $query = http_build_query($params);
    header('Location: ' . ($_SERVER['PHP_SELF'] ?? '/admin/') . ($query !== '' ? '?' . $query : ''));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = admin_input('action');

    try {
        if ($action === 'create_license') {
            $licenseKey = admin_input('license_key');
            $email = admin_input('customer_email');
            $plan = admin_input('plan', 'premium_yearly');
            $days = max(1, (int)admin_input('duration_days', '365'));
            $maxActivations = max(1, (int)admin_input('max_activations', '2'));
            $featuresRaw = admin_input('features_json');
            $notes = admin_input('notes');

            if ($licenseKey === '' || $email === '') {
                throw new RuntimeException('License key and customer email are required');
            }

            $features = json_decode($featuresRaw, true);
            if (!is_array($features)) {
                throw new RuntimeException('Features must be valid JSON array');
            }

            $expiresAt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
                ->modify('+' . $days . ' days')
                ->format('Y-m-d H:i:s');

            $stmt = $pdo->prepare('
                INSERT INTO licenses (
                    license_key, customer_email, plan, status, issued_at, expires_at,
                    grace_days, max_activations, features_json, notes
                ) VALUES (
                    :license_key, :customer_email, :plan, :status, UTC_TIMESTAMP(),
                    :expires_at,
                    :grace_days, :max_activations, :features_json, :notes
                )
            ');
            $stmt->execute([
                'license_key' => $licenseKey,
                'customer_email' => $email,
                'plan' => $plan,
                'status' => 'active',
                'expires_at' => $expiresAt,
                'grace_days' => 14,
                'max_activations' => $maxActivations,
                'features_json' => json_encode(array_values($features), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'notes' => $notes !== '' ? $notes : null
            ]);

            redirect_to_self('License created');
        }

        if ($action === 'revoke_license') {
            $licenseKey = admin_input('license_key');
            $stmt = $pdo->prepare('UPDATE licenses SET status = "revoked", revoked_at = UTC_TIMESTAMP() WHERE license_key = :license_key');
            $stmt->execute(['license_key' => $licenseKey]);
            $deactivate = $pdo->prepare('
                UPDATE license_activations
                SET active = 0
                WHERE license_id = (SELECT id FROM licenses WHERE license_key = :license_key LIMIT 1)
            ');
            $deactivate->execute(['license_key' => $licenseKey]);
            redirect_to_self('License revoked');
        }

        if ($action === 'extend_license') {
            $licenseKey = admin_input('license_key');
            $days = max(1, (int)admin_input('extend_days', '30'));
            $newExpiry = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
                ->modify('+' . $days . ' days')
                ->format('Y-m-d H:i:s');
            $stmt = $pdo->prepare('
                UPDATE licenses
                SET expires_at = :expires_at
                WHERE license_key = :license_key
            ');
            $stmt->execute([
                'license_key' => $licenseKey,
                'expires_at' => $newExpiry
            ]);
            redirect_to_self('License extended');
        }
    } catch (Throwable $e) {
        redirect_to_self('', $e->getMessage());
    }
}

$licenses = $pdo->query('
    SELECT license_key, customer_email, plan, status, expires_at, grace_days, max_activations, created_at, updated_at
    FROM licenses
    ORDER BY created_at DESC
    LIMIT 25
')->fetchAll();

$activations = $pdo->query('
    SELECT la.machine_id, la.platform, la.app_version, la.first_seen_at, la.last_seen_at, la.active, l.license_key
    FROM license_activations la
    JOIN licenses l ON l.id = la.license_id
    ORDER BY la.last_seen_at DESC
    LIMIT 25
')->fetchAll();

$message = (string)($_GET['message'] ?? '');
$error = (string)($_GET['error'] ?? '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NZBarr License Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #0b1118; color: #eef4f8; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 56px; }
    h1, h2 { margin: 0 0 16px; }
    .panel { background: #101a25; border: 1px solid #223244; border-radius: 16px; padding: 18px; margin: 18px 0; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    label { display: block; font-size: 0.92rem; color: #a9bdcc; margin-bottom: 6px; }
    input, textarea, select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #2d4157; background: #0d151f; color: #eef4f8; }
    textarea { min-height: 110px; }
    button { border: 0; border-radius: 999px; padding: 10px 16px; background: #5de4c7; color: #081019; font-weight: 700; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #223244; vertical-align: top; }
    .meta { color: #a9bdcc; font-size: 0.92rem; }
    .ok { color: #5de4c7; }
    .err { color: #ff8a8a; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    .note { margin: 8px 0 0; color: #a9bdcc; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>NZBarr License Admin</h1>
    <p class="meta">Protected admin area for creating and managing license records.</p>

    <?php if ($message !== ''): ?>
      <div class="panel ok"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endif; ?>
    <?php if ($error !== ''): ?>
      <div class="panel err"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endif; ?>

    <div class="panel">
      <h2>Create License</h2>
      <form method="post">
        <input type="hidden" name="action" value="create_license">
        <div class="grid">
          <div>
            <label>License key</label>
            <input name="license_key" placeholder="NZBARR-ABC-123" required>
          </div>
          <div>
            <label>Customer email</label>
            <input name="customer_email" type="email" placeholder="customer@example.com" required>
          </div>
          <div>
            <label>Plan</label>
            <input name="plan" value="premium_yearly">
          </div>
          <div>
            <label>Duration days</label>
            <input name="duration_days" type="number" value="365" min="1">
          </div>
          <div>
            <label>Max activations</label>
            <input name="max_activations" type="number" value="2" min="1">
          </div>
          <div>
            <label>Features JSON array</label>
            <textarea name="features_json">["send_to_downloader","edit_media_info","custom_artwork_upload","fanart_artwork","auto_refresh","owned_refresh","bulk_actions"]</textarea>
          </div>
        </div>
        <div style="margin-top: 16px;">
          <label>Notes</label>
          <textarea name="notes" placeholder="Optional internal notes"></textarea>
        </div>
        <div class="actions">
          <button type="submit">Create License</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h2>Manage License</h2>
      <form method="post" class="grid">
        <input type="hidden" name="action" value="revoke_license">
        <div>
          <label>License key to revoke</label>
          <input name="license_key" placeholder="NZBARR-ABC-123">
        </div>
        <div style="align-self:end;">
          <button type="submit">Revoke</button>
        </div>
      </form>
      <form method="post" class="grid" style="margin-top: 16px;">
        <input type="hidden" name="action" value="extend_license">
        <div>
          <label>License key to extend</label>
          <input name="license_key" placeholder="NZBARR-ABC-123">
        </div>
        <div>
          <label>Extend days</label>
          <input name="extend_days" type="number" value="30" min="1">
        </div>
        <div style="align-self:end;">
          <button type="submit">Extend</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h2>Recent Licenses</h2>
      <table>
        <thead>
          <tr>
            <th>Key</th><th>Email</th><th>Plan</th><th>Status</th><th>Expires</th><th>Activations</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($licenses as $license): ?>
            <tr>
              <td class="mono"><?= htmlspecialchars((string)$license['license_key'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$license['customer_email'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$license['plan'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$license['status'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$license['expires_at'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$license['max_activations'], ENT_QUOTES, 'UTF-8') ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <h2>Recent Activations</h2>
      <table>
        <thead>
          <tr>
            <th>License</th><th>Machine</th><th>Platform</th><th>App Version</th><th>Last Seen</th><th>Active</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($activations as $activation): ?>
            <tr>
              <td class="mono"><?= htmlspecialchars((string)$activation['license_key'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="mono"><?= htmlspecialchars((string)$activation['machine_id'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$activation['platform'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$activation['app_version'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars((string)$activation['last_seen_at'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= ((string)$activation['active'] === '1') ? 'Yes' : 'No' ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
