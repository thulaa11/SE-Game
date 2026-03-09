<?php
session_start();
// database connection helper
require_once __DIR__ . '/../Backend/db/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'Invalid method']);
    exit;
}

if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
    echo json_encode(['ok' => false, 'error' => 'Not logged in']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$newUsername = isset($input['username']) ? trim((string) $input['username']) : '';

if ($newUsername === '' || strlen($newUsername) < 2) {
    echo json_encode(['ok' => false, 'error' => 'Username must be at least 2 characters']);
    exit;
}

if ($newUsername === $_SESSION['username']) {
    echo json_encode(['ok' => true, 'username' => $newUsername]);
    exit;
}

// Check availability
$stmt = $conn->prepare('SELECT id FROM users WHERE username = ?');
$stmt->bind_param('s', $newUsername);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(['ok' => false, 'error' => 'Username already taken']);
    exit;
}

// Update users table
$stmt = $conn->prepare('UPDATE users SET username = ? WHERE id = ?');
$stmt->bind_param('si', $newUsername, $_SESSION['user_id']);
if (!$stmt->execute()) {
    echo json_encode(['ok' => false, 'error' => 'Failed to update username']);
    exit;
}

// Update user_scores table
$stmt = $conn->prepare('UPDATE user_scores SET username = ? WHERE user_id = ?');
$stmt->bind_param('si', $newUsername, $_SESSION['user_id']);
$stmt->execute();

$_SESSION['username'] = $newUsername;
echo json_encode(['ok' => true, 'username' => $newUsername]);
?>
