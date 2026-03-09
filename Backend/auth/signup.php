<?php
// auth/signup.php
session_start();
// redirect logged-in visitors away from signup
if (isset($_SESSION['user_id'])) {
    header('Location: ../../index.php');
    exit;
}
// include shared database helper from Backend/db
require_once __DIR__ . '/../db/db.php';

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
            // hash the password for storage
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare('INSERT INTO users (username, password) VALUES (?, ?)');
            $stmt->bind_param('ss', $username, $hash);
            if ($stmt->execute()) {
                // redirect to login page (relative to auth folder)
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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/2541609_Game/frontend/styles/style.css">
</head>
<body class="auth-page">
    <div class="auth-shell">
        <div class="auth-card">
            <h1 class="auth-title">Create your account</h1>
            <p class="auth-subtitle">It only takes a moment to start solving banana puzzles.</p>

            <?php if ($message): ?>
                <p class="error"><?php echo htmlspecialchars($message); ?></p>
            <?php endif; ?>

            <form id="auth-form" class="auth-form" method="post" action="signup.php">
                <input type="text" name="username" placeholder="Username" required autofocus>
                <input type="password" name="password" placeholder="Password" required>
                <input type="password" name="confirm" placeholder="Confirm Password" required>
                <button type="submit">Register</button>
            </form>
            <p class="auth-footer-text">
                Already have an account?
                <a href="login.php" class="auth-link">Log in</a>
            </p>
        </div>
    </div>
    <script src="/2541609_Game/frontend/js/signup.js"></script>
</body>
</html>