<?php
// auth/login.php
session_start();
// determine base path (everything before /Backend)
$basePath = preg_replace('#/Backend.*$#', '', $_SERVER['PHP_SELF']);
if ($basePath === '') { $basePath = '/'; }
// normalize with trailing slash
$basePath = rtrim($basePath, '/') . '/';
// if user already logged in, send them to the game
if (isset($_SESSION['user_id'])) {
    header('Location: ' . $basePath . 'index.php');
    exit;
}
// include shared database helper from Backend/db
require_once __DIR__ . '/../db/db.php';

$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $message = 'Please enter both username and password.';
    } else {
        $stmt = $conn->prepare('SELECT id, password FROM users WHERE username = ?');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $stmt->bind_result($id, $hash);
        // buffer result so we can run another query later (rehash)
        $stmt->store_result();
        if ($stmt->fetch()) {
            $valid = false;
            // verify hashed password first, but only if $hash is not null
            if ($hash !== null && password_verify($password, $hash)) {
                $valid = true;
            } elseif ($hash !== null && $password === $hash) {
                // legacy plain‑text password: accept and rehash
                $valid = true;
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                $update = $conn->prepare('UPDATE users SET password = ? WHERE id = ?');
                $update->bind_param('si', $newHash, $id);
                $update->execute();
                $update->close();
            }

            if ($valid) {
                $_SESSION['user_id'] = $id;
                $_SESSION['username'] = $username;
                // redirect to main index at workspace root
                header('Location: ../../index.php');
                exit;
            } else {
                $message = 'Invalid username or password.';
            }
        } else {
            $message = 'Invalid username or password.';
        }
        // close select statement before running any additional commands
        $stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?php echo $basePath; ?>frontend/styles/style.css">
</head>
<body class="auth-page">
    <!-- Dynamic loading screen (shown after login submit) -->
    <div id="loading-screen" class="loading-screen hidden">
        <div class="loading-content">
            <span class="loading-logo">🍌</span>
            <h1 class="loading-title">Logging in...</h1>
            <p class="loading-subtitle">Validating your profile</p>
            <div class="loading-bar">
                <div class="loading-progress" id="loading-progress"></div>
            </div>
            <p class="loading-status" id="loading-status">Authenticating...</p>
        </div>
    </div>

    <div class="auth-shell">
        <div class="auth-card">
            <h1 class="auth-title">Welcome back</h1>
            <p class="auth-subtitle">Log in to continue playing 🍌 The Banana Game.</p>

            <?php if (isset($_GET['signup'])): ?>
                <p class="success">Registration successful, please log in.</p>
            <?php endif; ?>
            <?php if ($message): ?>
                <p class="error"><?php echo htmlspecialchars($message); ?></p>
            <?php endif; ?>

            <form id="auth-form" class="auth-form" method="post" action="login.php">
                <input type="text" name="username" placeholder="Username" required autofocus>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit" id="login-btn">Log in</button>
            </form>
            <p class="auth-footer-text">
                Don't have an account?
                <a href="<?php echo $basePath; ?>Backend/auth/signup.php" class="auth-link">Sign up</a>
            </p>
        </div>
    </div>
    <script src="/2541609_Game/frontend/js/login.js"></script>
</body>
</html>