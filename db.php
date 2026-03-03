<?php
$servername = "localhost";
$username = "root";  // Default MySQL username
$password = "1234";      // Default MySQL password (or your password)
$dbname = "gameSE"; // The name of your database

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>