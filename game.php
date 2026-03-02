<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $player = $_POST['player'];
    $score = $_POST['score'];

    // Save score to the database
    $conn = new mysqli("localhost", "root", "", "game_db");
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    $sql = "INSERT INTO scores (player, score) VALUES ('$player', '$score')";
    if ($conn->query($sql) === TRUE) {
        echo "Score saved!";
    } else {
        echo "Error: " . $conn->error;
    }

    $conn->close();
}
?>