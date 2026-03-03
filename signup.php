<?php
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

    $checkStmt = $conn->prepare('SELECT id FROM users WHERE username = ?');
    if (!$checkStmt) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error.'
        ]);
        exit;
    }

    $checkStmt->bind_param('s', $username);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult && $checkResult->num_rows > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Username already taken.'
        ]);
        $checkStmt->close();
        $conn->close();
        exit;
    }

    $checkStmt->close();

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $insertStmt = $conn->prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    if (!$insertStmt) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error.'
        ]);
        $conn->close();
        exit;
    }

    $insertStmt->bind_param('ss', $username, $hashedPassword);

    if ($insertStmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'New user created successfully.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error creating user.'
        ]);
    }

    $insertStmt->close();
    $conn->close();
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method.'
    ]);
}
?>