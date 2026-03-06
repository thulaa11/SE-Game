<?php
// auth/signup.php
session_start();
require_once __DIR__ . '/db.php';

$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm = $_POST['confirm'] ?? '';

    if ($username === '' || $password === '') {
        $message = 'Please provide both username and password.';
    } elseif ($password !== $confirm) {
        $message = 'Passwords do not match.';
    } else {
        // check availability
        $stmt = $conn->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            $message = 'Username already taken.';
        } else {
            $hash = $password; // Store plain text password
            $stmt = $conn->prepare('INSERT INTO users (username, password) VALUES (?, ?)');
            $stmt->bind_param('ss', $username, $hash);
            if ($stmt->execute()) {
                // redirect to login page
                header('Location: login.php?signup=1');
                exit;
            } else {
                $message = 'Registration failed, please try again.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up</title>
    <link rel="stylesheet" href="../style.css">
    <style>
        /* simple styling override for auth forms */
        #auth-form { max-width: 400px; margin: 50px auto; }
        #auth-form input { display:block; width:100%; margin-bottom:15px; }
    </style>
</head>
<body>
    <h1>Sign Up</h1>
    <?php if ($message): ?>
        <p class="error"><?php echo htmlspecialchars($message); ?></p>
    <?php endif; ?>
    <form id="auth-form" method="post" action="signup.php">
        <input type="text" name="username" placeholder="Username" required autofocus>
        <input type="password" name="password" placeholder="Password" required>
        <input type="password" name="confirm" placeholder="Confirm Password" required>
        <button type="submit">Register</button>
    </form>
    <p>Already have an account? <a href="login.php">Log in</a></p>
    <script src="signup.js"></script>
</body>
</html>