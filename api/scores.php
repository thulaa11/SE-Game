<?php
session_start();
// database connection moved under Backend/db
require_once __DIR__ . '/../Backend/db/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $topScore = 0;
    $topUser = '';
    $res = $conn->query("SELECT u.username, s.best_score FROM user_scores s JOIN users u ON u.id = s.user_id ORDER BY s.best_score DESC LIMIT 1");
    if ($res && $row = $res->fetch_assoc()) {
        $topScore = (int) $row['best_score'];
        $topUser = $row['username'];
    }

    $playerScore = 0;
    $playerGames = 0;
    if (isset($_SESSION['user_id'])) {
        $stmt = $conn->prepare("SELECT best_score, games_played FROM user_scores WHERE user_id = ?");
        $stmt->bind_param('i', $_SESSION['user_id']);
        $stmt->execute();
        $stmt->bind_result($ps, $pg);
        if ($stmt->fetch()) {
            $playerScore = (int) $ps;
            $playerGames = (int) $pg;
        }
    }

    echo json_encode([
        'topScore' => $topScore,
        'topUser' => $topUser,
        'playerScore' => $playerScore,
        'playerGames' => $playerGames,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
        echo json_encode(['ok' => false, 'error' => 'Not logged in']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $score = isset($input['score']) ? (int) $input['score'] : 0;

    $stmt = $conn->prepare("INSERT INTO user_scores (user_id, username, best_score, games_played) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE best_score = GREATEST(best_score, ?), games_played = games_played + 1");
    $stmt->bind_param('isii', $_SESSION['user_id'], $_SESSION['username'], $score, $score);
    $ok = $stmt->execute();

    echo json_encode(['ok' => $ok]);
    exit;
}

echo json_encode(['ok' => false, 'error' => 'Invalid method']);
?>
