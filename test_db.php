<?php
require_once 'Backend/db/db.php';

echo "<h2>Database Test</h2>";

// Check users table
echo "<h3>Users:</h3>";
$result = $conn->query("SELECT * FROM users");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo "ID: {$row['id']}, Username: {$row['username']}<br>";
    }
}

// Check user_scores table structure
echo "<h3>User Scores Columns:</h3>";
$result = $conn->query("DESCRIBE user_scores");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo "{$row['Field']} - {$row['Type']}<br>";
    }
}

// Check user_scores data
echo "<h3>User Scores Data:</h3>";
$result = $conn->query("SELECT * FROM user_scores");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "User: {$row['username']}, Best: {$row['best_score']}, Easy: {$row['best_score_easy']}, Medium: {$row['best_score_medium']}, Hard: {$row['best_score_hard']}<br>";
    }
} else {
    echo "No score data found";
}
?>