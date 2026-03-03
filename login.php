<?php
session_start();
include('db.php');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if ($username === '' || $password === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Username and password are required.'
        ]);
        exit;
    }

    $stmt = $conn->prepare('SELECT id, username, password FROM users WHERE username = ?');
    if (!$stmt) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error.'
        ]);
        exit;
    }

    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        if (password_verify($password, $row['password'])) {
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['username'] = $row['username'];

            echo json_encode([
                'success' => true,
                'message' => 'Login successful.'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid credentials.'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'User not found.'
        ]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method.'
    ]);
}
?>