<?php

session_start();
header('Content-Type: application/json');

ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    echo json_encode([
        'success' => false,
        'message' => "PHP Error: $errstr in $errfile on line $errline"
    ]);
    exit;
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => "Fatal: " . $error['message'] . " in " . $error['file'] . " line " . $error['line']
        ]);
    }
});

try {
    require_once __DIR__ . '/../db/db.php';
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}


$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || empty($body['id_token'])) {
    echo json_encode(['success' => false, 'message' => 'Missing token. Raw input: ' . substr($raw, 0, 100)]);
    exit;
}

$idToken     = $body['id_token'];
$uid         = $body['uid']          ?? '';
$email       = $body['email']        ?? '';
$displayName = $body['display_name'] ?? '';
$photoUrl    = $body['photo_url']    ?? '';

$firebaseProjectId = 'banana-game-576f0';

$parts = explode('.', $idToken);
if (count($parts) !== 3) {
    echo json_encode(['success' => false, 'message' => 'Invalid token format.']);
    exit;
}

$headerB64    = $parts[0];
$payloadB64   = $parts[1];
$signatureB64 = $parts[2];

$header  = json_decode(base64_decode(strtr($headerB64, '-_', '+/')), true);
$payload = json_decode(base64_decode(strtr($payloadB64, '-_', '+/')), true);

if (!$header || !$payload) {
    echo json_encode(['success' => false, 'message' => 'Cannot decode token.']);
    exit;
}

$now = time();
$expectedIssuer = 'https://securetoken.google.com/' . $firebaseProjectId;

if (($payload['iss'] ?? '') !== $expectedIssuer) {
    echo json_encode(['success' => false, 'message' => 'Invalid issuer: ' . ($payload['iss'] ?? 'none')]);
    exit;
}
if (($payload['aud'] ?? '') !== $firebaseProjectId) {
    echo json_encode(['success' => false, 'message' => 'Invalid audience.']);
    exit;
}
if (($payload['exp'] ?? 0) < $now - 300) {
    echo json_encode(['success' => false, 'message' => 'Token expired.']);
    exit;
}
if (($payload['iat'] ?? 0) > $now + 300) {
    echo json_encode(['success' => false, 'message' => 'Token from the future.']);
    exit;
}
if (empty($payload['sub'])) {
    echo json_encode(['success' => false, 'message' => 'No subject in token.']);
    exit;
}

$certUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken%40system.gserviceaccount.com';
$ch = curl_init($certUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$certResponse = curl_exec($ch);
$curlError    = curl_error($ch);
$certHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($certHttpCode !== 200 || !$certResponse) {
    echo json_encode([
        'success' => false,
        'message' => 'Cannot fetch Google certs. HTTP ' . $certHttpCode . '. cURL: ' . $curlError
    ]);
    exit;
}

$certs = json_decode($certResponse, true);
$kid   = $header['kid'] ?? '';

if (!isset($certs[$kid])) {
    echo json_encode(['success' => false, 'message' => 'No matching cert for kid: ' . $kid]);
    exit;
}

$publicKey = openssl_pkey_get_public($certs[$kid]);
if (!$publicKey) {
    echo json_encode(['success' => false, 'message' => 'Invalid public key from cert.']);
    exit;
}

$dataToVerify = $headerB64 . '.' . $payloadB64;
$signature    = base64_decode(strtr($signatureB64, '-_', '+/'));
$verified     = openssl_verify($dataToVerify, $signature, $publicKey, OPENSSL_ALGO_SHA256);

if ($verified !== 1) {
    echo json_encode(['success' => false, 'message' => 'Signature invalid. openssl_verify returned: ' . $verified]);
    exit;
}


$verifiedUid   = $payload['sub'];
$verifiedEmail = $payload['email'] ?? $email;

$columnCheck = $conn->query("SHOW COLUMNS FROM users LIKE 'firebase_uid'");
if ($columnCheck->num_rows === 0) {
    
    $conn->query("ALTER TABLE users
        ADD COLUMN firebase_uid  VARCHAR(128) DEFAULT NULL,
        ADD COLUMN email         VARCHAR(255) DEFAULT NULL,
        ADD COLUMN display_name  VARCHAR(255) DEFAULT NULL,
        ADD COLUMN photo_url     TEXT         DEFAULT NULL");
    $conn->query("ALTER TABLE users ADD UNIQUE INDEX idx_firebase_uid (firebase_uid)");
}

// FIND OR CREATE USER

$basePath = preg_replace('#/Backend.*$#', '', $_SERVER['PHP_SELF']);
if ($basePath === '') { $basePath = '/'; }
$basePath = rtrim($basePath, '/') . '/';

$stmt = $conn->prepare('SELECT id, username FROM users WHERE firebase_uid = ?');
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'DB prepare error (firebase_uid): ' . $conn->error]);
    exit;
}
$stmt->bind_param('s', $verifiedUid);
$stmt->execute();
$stmt->bind_result($userId, $username);
$found = $stmt->fetch();
$stmt->close();

if ($found) {
    $_SESSION['user_id']  = $userId;
    $_SESSION['username'] = $username;
    echo json_encode(['success' => true, 'redirect' => $basePath . 'index.php']);
    exit;
}

if ($verifiedEmail !== '') {
    $stmt = $conn->prepare('SELECT id, username FROM users WHERE email = ?');
    if ($stmt) {
        $stmt->bind_param('s', $verifiedEmail);
        $stmt->execute();
        $stmt->bind_result($userId, $username);
        $found = $stmt->fetch();
        $stmt->close();

        if ($found) {
            $upd = $conn->prepare('UPDATE users SET firebase_uid = ?, display_name = ?, photo_url = ? WHERE id = ?');
            $upd->bind_param('sssi', $verifiedUid, $displayName, $photoUrl, $userId);
            $upd->execute();
            $upd->close();

            $_SESSION['user_id']  = $userId;
            $_SESSION['username'] = $username;
            echo json_encode(['success' => true, 'redirect' => $basePath . 'index.php']);
            exit;
        }
    }
}

$baseUsername = $displayName !== '' ? $displayName : explode('@', $verifiedEmail)[0];
$baseUsername = preg_replace('/[^a-zA-Z0-9_]/', '', $baseUsername);
if ($baseUsername === '') { $baseUsername = 'player'; }

$tryUsername = $baseUsername;
$counter = 0;
while (true) {
    $check = $conn->prepare('SELECT id FROM users WHERE username = ?');
    $check->bind_param('s', $tryUsername);
    $check->execute();
    $check->store_result();
    if ($check->num_rows === 0) {
        $check->close();
        break;
    }
    $check->close();
    $counter++;
    $tryUsername = $baseUsername . $counter;
    if ($counter > 100) {
        $tryUsername = $baseUsername . '_' . bin2hex(random_bytes(4));
        break;
    }
}

$ins = $conn->prepare(
    'INSERT INTO users (username, password, firebase_uid, email, display_name, photo_url)
     VALUES (?, NULL, ?, ?, ?, ?)'
);
if (!$ins) {
    echo json_encode(['success' => false, 'message' => 'DB prepare error (insert): ' . $conn->error]);
    exit;
}
$ins->bind_param('sssss', $tryUsername, $verifiedUid, $verifiedEmail, $displayName, $photoUrl);

if ($ins->execute()) {
    $newId = $ins->insert_id;
    $ins->close();

    $_SESSION['user_id']  = $newId;
    $_SESSION['username'] = $tryUsername;
    echo json_encode(['success' => true, 'redirect' => $basePath . 'index.php']);
} else {
    $errMsg = $ins->error;
    $ins->close();
    echo json_encode(['success' => false, 'message' => 'Insert failed: ' . $errMsg]);
}
