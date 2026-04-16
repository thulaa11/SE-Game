<?php
// auth/signup.php
session_start();
// determine base path (everything before /Backend)
$basePath = preg_replace('#/Backend.*$#', '', $_SERVER['PHP_SELF']);
if ($basePath === '') { $basePath = '/'; }
// normalize with trailing slash
$basePath = rtrim($basePath, '/') . '/';
// redirect logged-in visitors away from signup
if (isset($_SESSION['user_id'])) {
    header('Location: ' . $basePath . 'index.php');
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
                header('Location: ' . $basePath . 'Backend/auth/login.php?signup=1');
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
    <title>Sign Up | The Banana Game</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?php echo $basePath; ?>frontend/styles/style.css">
</head>
<body class="auth-page">
    <div class="auth-shell">
        <div class="auth-card">
            <div class="auth-badge">🌟 New Banana Player</div>
            <h1 class="auth-title">Create your account</h1>
            <p class="auth-subtitle">It only takes a moment to start solving banana puzzles.</p>

            <?php if ($message): ?>
                <p class="error auth-message"><?php echo htmlspecialchars($message); ?></p>
            <?php endif; ?>

            <form id="auth-form" class="auth-form" method="post" action="signup.php" novalidate>
                <label class="auth-field">
                    <span class="auth-label">👤 Username</span>
                    <input type="text" name="username" placeholder="Choose a username" required autofocus>
                </label>

                <label class="auth-field">
                    <span class="auth-label">🔒 Password</span>
                    <div class="auth-password-wrap">
                        <input type="password" name="password" id="signup-password" placeholder="Create a password" required>
                        <button type="button" class="auth-toggle-pass" data-target="signup-password" aria-label="Show password">👀</button>
                    </div>
                </label>

                <label class="auth-field">
                    <span class="auth-label">🔐 Confirm Password</span>
                    <div class="auth-password-wrap">
                        <input type="password" name="confirm" id="signup-confirm" placeholder="Type your password again" required>
                        <button type="button" class="auth-toggle-pass" data-target="signup-confirm" aria-label="Show password">👀</button>
                    </div>
                </label>

                <p id="auth-inline-error" class="auth-inline-error" aria-live="polite"></p>
                <button type="submit">🚀 Create Account</button>
            </form>
            <p class="auth-footer-text">
                Already have an account?
                <a href="<?php echo $basePath; ?>Backend/auth/login.php" class="auth-link">Log in</a>
            </p>
        </div>
    </div>
    <script src="<?php echo $basePath; ?>frontend/js/signup.js"></script>
    <script>
        document.querySelectorAll('.auth-toggle-pass').forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.textContent = input.type === 'password' ? '👀' : '🙈';
            });
        });
    </script>
</body>
</html>