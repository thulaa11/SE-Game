<?php
session_start();

// if called via POST (AJAX) return JSON, otherwise perform standard logout+redirect
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    // clear session data
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_unset();
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

// any other method -- perform logout then redirect to login page
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_unset();
session_destroy();

// redirect back to login (use relative path)
$basePath = preg_replace('#/Backend.*$#', '', $_SERVER['PHP_SELF']);
$basePath = rtrim($basePath, '/') . '/';
header('Location: ' . $basePath . 'Backend/auth/login.php');
exit;