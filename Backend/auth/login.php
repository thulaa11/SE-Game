<?php

session_start();

$basePath = preg_replace('#/Backend.*$#', '', $_SERVER['PHP_SELF']);
if ($basePath === '') { $basePath = '/'; }
$basePath = rtrim($basePath, '/') . '/';

if (isset($_SESSION['user_id'])) {
    header('Location: ' . $basePath . 'index.php');
    exit;
}

require_once __DIR__ . '/../db/db.php';

$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['firebase_login'])) {
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $message = 'Please enter both username and password.';
    } else {
        $stmt = $conn->prepare('SELECT id, password FROM users WHERE username = ?');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $stmt->bind_result($id, $hash);
        $stmt->store_result();
        if ($stmt->fetch()) {
            $valid = false;
            if ($hash !== null && password_verify($password, $hash)) {
                $valid = true;
            } elseif ($hash !== null && $password === $hash) {
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
                header('Location: ' . $basePath . 'index.php');
                exit;
            } else {
                $message = 'Invalid username or password.';
            }
        } else {
            $message = 'Invalid username or password.';
        }
        $stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | The Banana Game</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?php echo $basePath; ?>frontend/styles/style.css">
    <style>
        /* ── Firebase / Social login button styles ── */
        .auth-divider {
            display: flex;
            align-items: center;
            margin: 20px 0;
            gap: 12px;
        }
        .auth-divider::before,
        .auth-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(0, 0, 0, 0.1);
        }
        .auth-divider span {
            font-size: 0.8rem;
            color: rgba(0, 0, 0, 0.4);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 500;
        }

        .firebase-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            padding: 12px 16px;
            border: 2px solid rgba(0, 0, 0, 0.08);
            border-radius: 12px;
            background: #ffffff;
            color: #333;
            font-family: 'Outfit', sans-serif;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .firebase-btn:hover {
            background: #fafafa;
            border-color: rgba(0, 0, 0, 0.15);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
        }
        .firebase-btn:active {
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        .firebase-btn img,
        .firebase-btn svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }

        .firebase-error {
            color: #e53e3e;
            font-size: 0.82rem;
            text-align: center;
            margin-top: 8px;
            min-height: 1em;
        }

        /* Hide any auto-injected Firebase UI container */
        #firebaseui-auth-container,
        .firebaseui-container {
            display: none !important;
        }
    </style>
</head>
<body class="auth-page">

    <!-- Dynamic loading screen -->
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
            <div class="auth-badge">🍌 Banana Adventure</div>
            <h1 class="auth-title">Welcome back, Banana Hero!</h1>
            <p class="auth-subtitle">Log in and keep collecting stars, coins, and fun wins.</p>

            <?php if (isset($_GET['signup'])): ?>
                <p class="success auth-message">Registration successful. You can log in now! 🎉</p>
            <?php endif; ?>
            <?php if ($message): ?>
                <p class="error auth-message"><?php echo htmlspecialchars($message); ?></p>
            <?php endif; ?>

            <!-- ═══ SINGLE Google Sign-In Button ═══ -->
            <div id="firebase-auth-section">
                <button type="button" class="firebase-btn" id="google-login-btn">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
                    Continue with Google
                </button>
                <p class="firebase-error" id="firebase-error"></p>
            </div>

            <!-- ═══ DIVIDER ═══ -->
            <div class="auth-divider"><span>or</span></div>

            <!-- ═══ CLASSIC USERNAME / PASSWORD ═══ -->
            <form id="auth-form" class="auth-form" method="post" action="login.php" novalidate>
                <label class="auth-field">
                    <span class="auth-label">👤 Username</span>
                    <input type="text" name="username" placeholder="Enter your username" required autofocus>
                </label>

                <label class="auth-field">
                    <span class="auth-label">🔒 Password</span>
                    <div class="auth-password-wrap">
                        <input type="password" name="password" id="login-password" placeholder="Enter your password" required>
                        <button type="button" class="auth-toggle-pass" data-target="login-password" aria-label="Show password">👀</button>
                    </div>
                </label>

                <p id="auth-inline-error" class="auth-inline-error" aria-live="polite"></p>
                <button type="submit" id="login-btn">🎮 Log In</button>
            </form>

            <p class="auth-footer-text">
                Don't have an account?
                <a href="<?php echo $basePath; ?>Backend/auth/signup.php" class="auth-link">Sign up</a>
            </p>
        </div>
    </div>

    <!-- ═══ FIREBASE SDK ═══ -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
        import { getAnalytics }  from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";
        import {
            getAuth,
            signInWithPopup,
            GoogleAuthProvider
        } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

        // ── Config ──
        const firebaseConfig = {
            apiKey:            "AIzaSyBhauK8NmGmOrbSL0gL-kMjKrTdnrt07j4",
            authDomain:        "banana-game-576f0.firebaseapp.com",
            projectId:         "banana-game-576f0",
            storageBucket:     "banana-game-576f0.firebasestorage.app",
            messagingSenderId: "212741407429",
            appId:             "1:212741407429:web:f3b29e5dd8ea665a24e6ac",
            measurementId:     "G-5LS2SQ6PRF"
        };

        const app       = initializeApp(firebaseConfig);
        const analytics  = getAnalytics(app);
        const auth       = getAuth(app);
        const provider   = new GoogleAuthProvider();

        // ── DOM ──
        const errorEl         = document.getElementById('firebase-error');
        const loadingScreen   = document.getElementById('loading-screen');
        const loadingStatus   = document.getElementById('loading-status');
        const loadingProgress = document.getElementById('loading-progress');

        function showLoading(msg) {
            loadingScreen.classList.remove('hidden');
            loadingStatus.textContent = msg || 'Authenticating...';
            if (loadingProgress) loadingProgress.style.width = '60%';
        }

        function hideLoading() {
            loadingScreen.classList.add('hidden');
            if (loadingProgress) loadingProgress.style.width = '0%';
        }

        // ── After Firebase auth, send token to PHP backend ──
        async function handleFirebaseUser(user) {
            showLoading('Verifying with server...');
            if (loadingProgress) loadingProgress.style.width = '80%';

            const idToken = await user.getIdToken();

            const res = await fetch('firebase_login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_token:     idToken,
                    uid:          user.uid,
                    email:        user.email,
                    display_name: user.displayName,
                    photo_url:    user.photoURL
                })
            });

            const data = await res.json();

            if (data.success) {
                if (loadingProgress) loadingProgress.style.width = '100%';
                loadingStatus.textContent = 'Redirecting...';
                window.location.href = data.redirect || '<?php echo $basePath; ?>index.php';
            } else {
                hideLoading();
                errorEl.textContent = data.message || 'Server authentication failed.';
            }
        }

        // ── Google button click ──
        document.getElementById('google-login-btn').addEventListener('click', async () => {
            errorEl.textContent = '';
            try {
                const result = await signInWithPopup(auth, provider);
                await handleFirebaseUser(result.user);
            } catch (err) {
                console.error('Firebase auth error:', err);
                if (err.code === 'auth/popup-closed-by-user') return;
                errorEl.textContent = friendlyError(err.code);
            }
        });

        // ── Friendly errors ──
        function friendlyError(code) {
            const map = {
                'auth/account-exists-with-different-credential':
                    'An account already exists with a different sign-in method.',
                'auth/popup-blocked':
                    'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
                'auth/cancelled-popup-request':
                    'Only one sign-in window at a time.',
                'auth/network-request-failed':
                    'Network error — check your connection.',
            };
            return map[code] || 'Authentication failed. Please try again.';
        }
    </script>

    <!-- Existing login.js for classic form loading animation -->
    <script src="<?php echo $basePath; ?>frontend/js/login.js"></script>
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
