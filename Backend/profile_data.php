<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not logged in']);
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
    
    // Attempt to grab generic user info
    $stmt = $pdo->prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $userEntry = $stmt->fetch();

    if (!$userEntry) {
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $bestScore = 0;
    $gamesPlayed = 0;

    // Check if user_scores exists to get stats safely
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_scores'");
    $stmt->execute();
    $hasUserScores = (int)$stmt->fetchColumn() > 0;

    if ($hasUserScores) {
        $stmt = $pdo->prepare('SELECT best_score, games_played FROM user_scores WHERE user_id = ?');
        $stmt->execute([$userId]);
        if ($scoreData = $stmt->fetch()) {
            $bestScore = (int)$scoreData['best_score'];
            $gamesPlayed = (int)$scoreData['games_played'];
        }
    }

    $created = strtotime($userEntry['created_at']);
    $joinDate = $created ? date('F Y', $created) : '—';

    echo json_encode([
        'username' => $userEntry['username'],
        'email' => $userEntry['email'] ?? '—',
        'join_date' => $joinDate,
        'best_score' => $bestScore,
        'games_played' => $gamesPlayed
    ]);
} catch (Throwable $e) {
    echo json_encode(['error' => 'Database error']);
}
