<?php
session_start();
include('db.php');

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'loggedIn' => false,
        'bestScore' => 0
    ]);
    $conn->close();
    exit;
}

$userId = $_SESSION['user_id'];

$stmt = $conn->prepare('SELECT MAX(score) AS best_score FROM scores WHERE user_id = ?');
$bestScore = 0;
if ($stmt) {
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result && $row = $result->fetch_assoc()) {
        $bestScore = (int)$row['best_score'];
    }
    $stmt->close();
}

$conn->close();

echo json_encode([
    'loggedIn' => true,
    'bestScore' => $bestScore
]);
?>

