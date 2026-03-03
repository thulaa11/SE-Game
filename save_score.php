<?php
session_start();
include('db.php');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Not logged in.'
        ]);
        exit;
    }

    $userId = $_SESSION['user_id'];
    $score = isset($_POST['score']) ? (int)$_POST['score'] : 0;
    $difficulty = $_POST['difficulty'] ?? 'easy';

    $stmt = $conn->prepare('INSERT INTO scores (user_id, score, difficulty) VALUES (?, ?, ?)');
    if ($stmt) {
        $stmt->bind_param('iis', $userId, $score, $difficulty);
        $stmt->execute();
        $stmt->close();
    }

    $bestStmt = $conn->prepare('SELECT MAX(score) AS best_score FROM scores WHERE user_id = ?');
    $bestScore = 0;
    if ($bestStmt) {
        $bestStmt->bind_param('i', $userId);
        $bestStmt->execute();
        $result = $bestStmt->get_result();
        if ($result && $row = $result->fetch_assoc()) {
            $bestScore = (int)$row['best_score'];
        }
        $bestStmt->close();
    }

    $conn->close();

    echo json_encode([
        'success' => true,
        'bestScore' => $bestScore
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method.'
    ]);
}
?>

