<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function load_config(): array
{
    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        respond(['success' => false, 'message' => 'SMTP config is missing.'], 500);
    }

    $config = require $configPath;
    if (!is_array($config)) {
        respond(['success' => false, 'message' => 'SMTP config is invalid.'], 500);
    }

    return $config;
}

function read_request_data(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    return $_POST;
}

function clean_text($value, int $maxLength = 2000): string
{
    $text = trim((string) $value);
    $text = preg_replace('/[\r\n]+/', ' ', $text) ?? $text;
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $maxLength);
    }
    return substr($text, 0, $maxLength);
}

function clean_multiline($value, int $maxLength = 4000): string
{
    $text = trim((string) $value);
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $maxLength);
    }
    return substr($text, 0, $maxLength);
}

function clean_email($value): string
{
    $email = trim((string) $value);
    $email = preg_replace('/[\r\n]+/', '', $email) ?? $email;
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

function smtp_read_line($socket): string
{
    $line = '';
    while (!feof($socket)) {
        $chunk = fgets($socket, 515);
        if ($chunk === false) {
            break;
        }
        $line .= $chunk;
        if (strlen($chunk) < 4 || $chunk[3] !== '-') {
            break;
        }
    }

    return $line;
}

function smtp_command($socket, string $command, array $expectedCodes): array
{
    fwrite($socket, $command . "\r\n");
    $response = smtp_read_line($socket);
    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        return ['ok' => false, 'code' => $code, 'response' => $response];
    }

    return ['ok' => true, 'code' => $code, 'response' => $response];
}

function smtp_send_mail(array $config, string $to, string $subject, string $body, string $replyTo): array
{
    $host = trim((string) ($config['smtp_host'] ?? ''));
    $port = (int) ($config['smtp_port'] ?? 465);
    $username = trim((string) ($config['smtp_username'] ?? ''));
    $password = (string) ($config['smtp_password'] ?? '');
    $fromEmail = clean_email($config['smtp_from_email'] ?? $username);
    $fromName = trim((string) ($config['smtp_from_name'] ?? 'NZBarr Website'));
    $encryption = strtolower(trim((string) ($config['smtp_encryption'] ?? 'ssl')));
    $timeout = (int) ($config['smtp_timeout'] ?? 20);

    if ($host === '' || $username === '' || $password === '' || $fromEmail === '') {
        return ['ok' => false, 'message' => 'SMTP settings are incomplete.'];
    }

    $remote = $encryption === 'ssl' ? "ssl://{$host}" : $host;
    $socket = @stream_socket_client($remote . ':' . $port, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        return ['ok' => false, 'message' => "Unable to connect to SMTP server: {$errstr}"];
    }

    stream_set_timeout($socket, $timeout);
    $greeting = smtp_read_line($socket);
    if ((int) substr($greeting, 0, 3) !== 220) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP server did not return a greeting.'];
    }

    $ehloHost = $config['smtp_ehlo_host'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');
    $result = smtp_command($socket, "EHLO {$ehloHost}", [250]);
    if (!$result['ok'] && $encryption !== 'ssl') {
        $result = smtp_command($socket, "HELO {$ehloHost}", [250]);
    }
    if (!$result['ok']) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP handshake failed.'];
    }

    if ($encryption === 'starttls') {
        $tls = smtp_command($socket, 'STARTTLS', [220]);
        if (!$tls['ok']) {
            fclose($socket);
            return ['ok' => false, 'message' => 'SMTP STARTTLS was not accepted.'];
        }

        $cryptoOk = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if (!$cryptoOk) {
            fclose($socket);
            return ['ok' => false, 'message' => 'Unable to start TLS encryption.'];
        }

        $result = smtp_command($socket, "EHLO {$ehloHost}", [250]);
        if (!$result['ok']) {
            fclose($socket);
            return ['ok' => false, 'message' => 'SMTP EHLO failed after STARTTLS.'];
        }
    }

    $auth = smtp_command($socket, 'AUTH LOGIN', [334]);
    if (!$auth['ok']) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP AUTH LOGIN was rejected.'];
    }

    $userStep = smtp_command($socket, base64_encode($username), [334]);
    if (!$userStep['ok']) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP username was rejected.'];
    }

    $passStep = smtp_command($socket, base64_encode($password), [235]);
    if (!$passStep['ok']) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP password was rejected.'];
    }

    $fromHeader = $fromName !== '' ? sprintf('"%s" <%s>', addcslashes($fromName, '"\\'), $fromEmail) : $fromEmail;
    $mailFrom = smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250]);
    if (!$mailFrom['ok']) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP MAIL FROM was rejected.'];
    }

    $rcptTo = smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
    if (!$rcptTo['ok']) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP RCPT TO was rejected.'];
    }

    $data = smtp_command($socket, 'DATA', [354]);
    if (!$data['ok']) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP DATA was rejected.'];
    }

    $headers = [
        'Date: ' . gmdate('D, d M Y H:i:s O'),
        'From: ' . $fromHeader,
        'Reply-To: ' . $replyTo,
        'To: ' . $to,
        'Subject: ' . $subject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: NZBarr Website'
    ];

    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;
    $messageLines = preg_split("/\r\n|\r|\n/", $message) ?: [];
    foreach ($messageLines as $line) {
        if ($line !== '' && isset($line[0]) && $line[0] === '.') {
            $line = '.' . $line;
        }
        fwrite($socket, $line . "\r\n");
    }
    fwrite($socket, ".\r\n");
    $sendResponse = smtp_read_line($socket);
    if ((int) substr($sendResponse, 0, 3) !== 250) {
        fclose($socket);
        return ['ok' => false, 'message' => 'SMTP message was not accepted.'];
    }

    smtp_command($socket, 'QUIT', [221]);
    fclose($socket);

    return ['ok' => true, 'message' => 'Message sent.'];
}

$config = load_config();
$data = read_request_data();

if (($data['company'] ?? '') !== '') {
    respond(['success' => true, 'message' => 'Request received']);
}

$topic = clean_text($data['topic'] ?? '', 40);
$name = clean_text($data['name'] ?? '', 160);
$email = clean_email($data['email'] ?? '');
$subjectInput = clean_text($data['subject'] ?? '', 160);
$message = clean_multiline($data['message'] ?? '', 4000);

if ($topic === '' || $name === '' || $email === '' || $subjectInput === '' || $message === '') {
    respond(['success' => false, 'message' => 'Please fill in the required fields.'], 400);
}

$recipientMap = [
    'general' => 'info@nzbarr.com',
    'support' => 'hello@nzbarr.com',
    'support' => 'support@nzbarr.com'
];

$recipient = $recipientMap[$topic] ?? 'support@nzbarr.com';
$subject = sprintf('NZBarr contact - %s', $subjectInput);

$body = implode("\n", [
    'NZBarr contact request',
    '',
    'Topic: ' . $topic,
    'Name: ' . $name,
    'Email: ' . $email,
    '',
    'Message:',
    $message
]);

$sendResult = smtp_send_mail($config, $recipient, $subject, $body, $email);
if (!$sendResult['ok']) {
    error_log('[NZBarr website] Contact request failed: ' . $sendResult['message']);
    respond(['success' => false, 'message' => $sendResult['message']], 500);
}

respond(['success' => true, 'message' => 'Contact request sent.']);
