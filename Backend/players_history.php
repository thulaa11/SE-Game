<?php
ob_start();
session_start();
header('Content-Type: application/json');
require_once 'db/db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

try {
    $query = "SELECT 
                u.id,
                u.username,
                COALESCE(us.best_score, 0) AS best_score,
                COALESCE(us.best_score_easy, 0) AS best_score_easy,
                COALESCE(us.best_score_medium, 0) AS best_score_medium,
                COALESCE(us.best_score_hard, 0) AS best_score_hard,
                COALESCE(us.games_played, 0) AS games_played,
                COALESCE(us.games_played_easy, 0) AS games_played_easy,
                COALESCE(us.games_played_medium, 0) AS games_played_medium,
                COALESCE(us.games_played_hard, 0) AS games_played_hard,
                u.created_at
              FROM users u
              LEFT JOIN user_scores us ON u.id = us.user_id
              ORDER BY us.best_score DESC, u.username ASC";
    
    $result = $conn->query($query);
    
    $players = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $players[] = [
                'id' => $row['id'],
                'username' => htmlspecialchars($row['username']),
                'best_score' => (int)$row['best_score'],
                'best_score_easy' => (int)$row['best_score_easy'],
                'best_score_medium' => (int)$row['best_score_medium'],
                'best_score_hard' => (int)$row['best_score_hard'],
                'games_played' => (int)$row['games_played'],
                'games_played_easy' => (int)$row['games_played_easy'],
                'games_played_medium' => (int)$row['games_played_medium'],
                'games_played_hard' => (int)$row['games_played_hard'],
                'created_at' => date('Y-m-d', strtotime($row['created_at']))
            ];
        }
    }
    
    $out = json_encode(['success' => true, 'players' => $players]);
    if (ob_get_length()) {
        ob_clean();
    }
    echo $out;
} catch (Exception $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    echo json_encode(['error' => 'Failed to fetch players history']);
}
?>