<?php
session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'Invalid method']);
    exit;
}

if (!isset($_SESSION['user_id'], $_SESSION['username'])) {
    echo json_encode(['ok' => false, 'error' => 'Not logged in']);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) $input = [];

$newUsername = trim((string)($input['username'] ?? ''));
if ($newUsername === '' || mb_strlen($newUsername) < 2) {
    echo json_encode(['ok' => false, 'error' => 'Username must be at least 2 characters']);
    exit;
}

if ($newUsername === (string)$_SESSION['username']) {
    echo json_encode(['ok' => true, 'username' => $newUsername]);
    exit;
}

function pdoConnect(): PDO {
    $host = 'localhost';
    $db = 'game_db';
    $user = 'root';
    $pass = '';
    $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

try {
    $pdo = pdoConnect();
    $userId = (int)$_SESSION['user_id'];

    // check availability
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$newUsername]);
    if ($stmt->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'Username already taken']);
        exit;
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare('UPDATE users SET username = ? WHERE id = ?');
    $stmt->execute([$newUsername, $userId]);

    // keep user_scores.username in sync if that column exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_scores' AND COLUMN_NAME = 'username'");
    $stmt->execute();
    $hasUsernameCol = (int)$stmt->fetchColumn() > 0;
    if ($hasUsernameCol) {
        $stmt = $pdo->prepare('UPDATE user_scores SET username = ? WHERE user_id = ?');
        $stmt->execute([$newUsername, $userId]);
    }

    $pdo->commit();

    $_SESSION['username'] = $newUsername;
    echo json_encode(['ok' => true, 'username' => $newUsername]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['ok' => false, 'error' => 'Failed to update username']);
}

