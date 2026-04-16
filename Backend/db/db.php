<?php
// auth/db.php
// simple database connection helper for the banana game authentication

$DB_HOST = 'localhost';
$DB_USER = 'root';
$DB_PASS = '';
$DB_NAME = 'game_db';

// create connection
$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($conn->connect_error) {
    die('Database connection failed: ' . $conn->connect_error);
}

// ensure users table exists
$conn->query(
    "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB CHARACTER SET utf8mb4"
);

// ensure user_scores table exists
$conn->query(
    "CREATE TABLE IF NOT EXISTS user_scores (
        user_id INT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        best_score INT DEFAULT 0,
        best_score_easy INT DEFAULT 0,
        best_score_medium INT DEFAULT 0,
        best_score_hard INT DEFAULT 0,
        games_played INT DEFAULT 0,
        games_played_easy INT DEFAULT 0,
        games_played_medium INT DEFAULT 0,
        games_played_hard INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB CHARACTER SET utf8mb4"
);

// Add difficulty columns if they don't exist (for existing databases)
$columnsToCheck = ['best_score_easy', 'best_score_medium', 'best_score_hard', 'games_played_easy', 'games_played_medium', 'games_played_hard'];
foreach ($columnsToCheck as $col) {
    $result = $conn->query("SHOW COLUMNS FROM user_scores LIKE '$col'");
    if ($result && $result->num_rows == 0) {
        $conn->query("ALTER TABLE user_scores ADD COLUMN $col INT DEFAULT 0");
    }
}

?>