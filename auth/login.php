<?php
// auth/login.php
session_start();
require_once __DIR__ . '/db.php';

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
        if ($stmt->fetch()) {
            if ($password === $hash) {
                $_SESSION['user_id'] = $id;
                $_SESSION['username'] = $username;
                header('Location: ../index.php');
                exit;
            } else {
                $message = 'Invalid username or password.';
            }
        } else {
            $message = 'Invalid username or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="../style.css">
    <style>
        #auth-form { max-width: 400px; margin: 50px auto; }
        #auth-form input { display:block; width:100%; margin-bottom:15px; }
    </style>
</head>
<body>
    <h1>Login</h1>
    <?php if (isset($_GET['signup'])): ?>
        <p class="success">Registration successful, please log in.</p>
    <?php endif; ?>
    <?php if ($message): ?>
        <p class="error"><?php echo htmlspecialchars($message); ?></p>
    <?php endif; ?>
    <form id="auth-form" method="post" action="login.php">
        <input type="text" name="username" placeholder="Username" required autofocus>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Log in</button>
    </form>
    <p>Don't have an account? <a href="signup.php">Sign up</a></p>
    <script src="login.js"></script>
</body>
</html>