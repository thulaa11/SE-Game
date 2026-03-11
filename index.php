<?php
session_start();
// determine base path dynamically (used for redirects)
$basePath = rtrim(dirname($_SERVER['PHP_SELF']), '/') . "/"; // e.g. '/2541609_Game'
if ($basePath === '/') {
    $basePath = '/';
}
if (!isset($_SESSION['user_id'])) {
    header('Location: ' . $basePath . 'Backend/auth/login.php');
    exit;
}
$username = htmlspecialchars($_SESSION['username']);
$firstLetter = strtoupper(substr($username, 0, 1));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Banana Game</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="frontend/styles/style.css">
    <script>
        window.BANANA_USERNAME = <?php echo json_encode($_SESSION['username']); ?>;
        window.BANANA_BASE = <?php echo json_encode($basePath); ?>;
    </script>
</head>
<body data-theme="dark">
    <!-- Loading Screen -->
    <div id="loading-screen" class="loading-screen">
        <div class="loading-content">
            <span class="loading-logo" aria-hidden="true">🍌</span>
            <h1 class="loading-title">The Banana Game</h1>
            <p class="loading-subtitle">Getting everything ready for you...</p>
            <div class="loading-bar">
                <div id="loading-progress" class="loading-progress"></div>
            </div>
            <p id="loading-status" class="loading-status">Waking up monkeys...</p>
        </div>
    </div>

    <div id="app-content" class="app-shell hidden">
        <header class="app-header">
            <div class="app-brand">
                <span class="app-logo" aria-hidden="true">🍌</span>
                <div>
                    <h1 class="app-title">The Banana Game</h1>
                    <p class="app-tagline">Solve math, save bananas!</p>
                </div>
            </div>
            <div class="app-user">
                <div class="profile-dropdown-wrapper">
                    <button type="button" class="game-profile-compact" id="btn-open-profile" aria-controls="profile-panel" aria-expanded="false">
                        <div id="player-avatar" class="player-avatar rank-beginner">
                            <span class="avatar-text"><?php echo $firstLetter; ?></span>
                            <span class="level-badge" id="level-badge">Lv.1</span>
                        </div>
                    </button>
                    
                    <!-- Profile Dropdown Modal -->
                    <div id="profile-panel" class="profile-dropdown" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="profile-panel-title">
                        <div class="profile-panel-card">
                            <div class="profile-panel-header">
                                <h3 id="profile-panel-title">Profile</h3>
                                <button type="button" class="btn-close-dropdown" id="btn-close-profile" aria-label="Close profile">✕</button>
                            </div>

                            <div class="profile-panel-content">
                                <div class="profile-panel-hero">
                                    <div id="profile-avatar-circle" class="profile-avatar-circle">
                                        <span id="profile-avatar-letter" class="avatar-text"><?php echo $firstLetter; ?></span>
                                    </div>
                                    <div class="profile-hero-meta">
                                        <div class="profile-name-editable">
                                            <h4 id="profile-username" class="profile-username"><?php echo $username; ?></h4>
                                            <button type="button" id="btn-edit-name" class="btn-icon-small" aria-label="Rename username" title="Rename username">✏️</button>
                                        </div>
                                        <div id="inline-rename-form" class="inline-rename-form hidden">
                                            <input type="text" id="inline-new-username"
                                                   placeholder="New username..."
                                                   minlength="2" maxlength="20"
                                                   class="inline-rename-input" />
                                            <div class="inline-rename-actions">
                                                <button type="button" id="btn-inline-cancel-rename"
                                                        class="btn-cancel-small">Cancel</button>
                                                <button type="button" id="btn-inline-save-rename"
                                                        class="btn-save-small">Save ✓</button>
                                            </div>
                                            <p id="inline-rename-message" class="inline-rename-msg"></p>
                                        </div>
                                        <div class="profile-subtext">
                                            <span id="profile-email">—</span>
                                            <span class="dot-sep">•</span>
                                            <span>Joined <strong id="profile-join-date">—</strong></span>
                                        </div>
                                    </div>
                                </div>

                                <div class="profile-rank-row">
                                    <span id="profile-rank-badge" class="rank-badge rank-beginner">Beginner</span>
                                    <span id="profile-rank-progress-text" class="rank-progress-text">0 / 100</span>
                                </div>
                                <div class="rank-progress-track" aria-hidden="true">
                                    <div id="profile-rank-progress-bar" class="rank-progress-bar" style="width: 0%"></div>
                                </div>

                                <div class="profile-stats-grid">
                                    <div class="profile-stat">
                                        <div class="label">Session score</div>
                                        <div id="profile-session-score" class="value">0</div>
                                    </div>
                                    <div class="profile-stat">
                                        <div class="label">Personal best</div>
                                        <div id="profile-best-score" class="value">0</div>
                                    </div>
                                    <div class="profile-stat">
                                        <div class="label">Puzzles attempted</div>
                                        <div id="profile-games-played" class="value">0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- logout link included as href fallback -->
                <a href="<?php echo $basePath; ?>Backend/auth/logout.php" id="btn-logout-icon" class="btn-logout-icon" aria-label="Logout" title="Logout">⏻</a>
            </div>
        </header>

        <!-- Main Layout (Game Left, Dashboard Right) -->
        <div class="app-layout">
            <main id="game" class="game-section">
                
                <div class="game-top-bar">
                    <div class="streak-container">
                        <span class="streak-icon">🔥</span>
                        <div class="streak-info">
                            <span class="streak-text">Streak: <strong id="streak">0</strong></span>
                            <span id="streak-multiplier" class="streak-multiplier hidden">x2</span>
                        </div>
                    </div>
                    
                    <div class="timer-container" id="timer-container">
                        <div id="timer" class="timer-text">30</div>
                    </div>
                    
                    <div class="score-container">
                        <span class="score-label">Score</span>
                        <strong id="score" class="score-value">0</strong>
                        <div id="score-popup-container"></div>
                    </div>
                    
                    <div class="best-score-container">
                        <span class="best-score-label">Best: <span id="best-score">0</span></span>
                    </div>
                    
                    <div class="top-bar-actions">
                        <button id="btn-settings" class="btn-icon" aria-label="Settings" title="Settings">⚙️</button>
                        <button id="btn-pause" class="btn-icon" aria-label="Pause Game" title="Pause Game">⏸️</button>
                    </div>
                </div>

                <div class="game-card">
                    <div class="hearts-row">
                        <span class="hearts-label">Attempts:</span>
                        <div id="hearts" class="hearts">
                            <span class="heart full" aria-hidden="true">❤️</span>
                            <span class="heart full" aria-hidden="true">❤️</span>
                            <span class="heart full" aria-hidden="true">❤️</span>
                            <span class="heart full" aria-hidden="true">❤️</span>
                            <span class="heart full" aria-hidden="true">❤️</span>
                        </div>
                    </div>

                    <div id="difficulty-selector">
                        <label for="difficulty">Difficulty Mode:</label>
                        <select id="difficulty" class="difficulty-medium">
                            <option value="easy">Easy (45s)</option>
                            <option value="medium" selected>Medium (30s)</option>
                            <option value="hard">Hard (18s)</option>
                        </select>
                    </div>

                    <section id="puzzle-area">
                        <img id="puzzle-image" src="" alt="Banana Puzzle" class="loading" />
                        <form id="guess-form">
                            <input type="number" id="guess" min="0" max="9" placeholder="?" required autocomplete="off">
                            <button type="submit" id="btn-submit">Submit</button>
                            <button type="button" id="btn-hint" class="btn-hint" aria-label="Show Hint" title="Show Hint">💡</button>
                        </form>
                        <div class="hint-counter">Hints remaining: <span id="hints-left-display">💡</span></div>
                        <p id="message"></p>
                        <div id="explanation-panel" class="explanation-panel hidden">
                            <div class="explanation-content">
                                <h4>Explanation 🤓</h4>
                                <p id="explanation-text"></p>
                            </div>
                        </div>
                        <button id="new-game-btn" class="btn-icon-small" title="New Game">🔄 New Game</button>
                    </section>

                    <div id="timeout-overlay" class="hidden">
                        <div class="timeout-content">
                            <div class="banana-wrapper">
                                <span class="banana-emoji">🍌</span>
                                <span class="peel" aria-hidden="true"></span>
                            </div>
                            <div class="monkey-wrapper">
                                <span class="monkey-emoji">🐵</span>
                            </div>
                            <p class="timeout-message">Time's up! The monkey ate your banana.<br>Answer was <strong id="timeout-answer">0</strong></p>
                        </div>
                    </div>
                    
                    <div id="game-over-overlay" class="game-over-overlay hidden">
                        <div class="game-over-content">
                            <h2>Game Over! 💔</h2>
                            <p>You've run out of attempts.</p>
                            <button id="restart-game-btn">Play Again</button>
                        </div>
                    </div>
                </div>
            </main>

            <!-- Dashboard / Sidebar -->
            <aside class="dashboard-sidebar">
                <div class="dashboard">
                    <h2 class="dashboard-title">Dashboard</h2>
                    <p class="dashboard-subtitle">Your learning journey</p>
                    
                    <div class="dashboard-grid" style="grid-template-columns: 1fr; gap: 16px;">
                        <div class="dashboard-card">
                            <div class="dashboard-stat-label">Your Best Score 🏆</div>
                            <div id="dashboard-best-score" class="dashboard-stat-value">0</div>
                        </div>

                        <div class="dashboard-card mini-leaderboard-card">
                            <div class="dashboard-stat-label">Global Top Score 🌍</div>
                            <div id="dashboard-top-score" class="dashboard-stat-value">0</div>
                            <div id="dashboard-top-user" class="top-user-label"></div>
                        </div>

                        <div class="dashboard-card">
                            <div class="dashboard-stat-label">Puzzles Attempted 🧩</div>
                            <div id="dashboard-games-played" class="dashboard-stat-value" style="font-size: 28px;">0</div>
                        </div>
                        
                        <div class="dashboard-card performance-card" id="performance-card">
                            <div class="dashboard-stat-label">Performance 📈</div>
                            <div id="performance-indicator" class="performance-indicator performance-average">Average</div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </div>

    <!-- Modals & Overlays -->

    <!-- Edit Name Modal (renamed slightly to fit new structure or kept as is) -->
    <div id="change-name-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="change-name-title" aria-hidden="true">
        <div class="modal-backdrop" tabindex="-1"></div>
        <div class="modal-content">
            <button type="button" class="modal-close" data-modal-close aria-label="Close dialog">✕</button>
            <h3 id="change-name-title">Change Username</h3>
            <form id="change-name-form">
                <input type="text" id="new-username" minlength="2" required placeholder="New username...">
                <p id="change-name-message" class="modal-message"></p>
                <div class="modal-actions">
                    <button type="button" id="btn-cancel-change-name" class="btn-cancel">Cancel</button>
                    <button type="submit">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Logout Confirmation Modal -->
    <div id="logout-confirm-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-hidden="true">
        <div class="modal-backdrop" tabindex="-1"></div>
        <div class="modal-content text-center">
            <button type="button" class="modal-close" data-modal-close aria-label="Close dialog">✕</button>
            <h3 id="logout-title">Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div class="modal-actions">
                <button type="button" id="btn-cancel-logout" class="btn-cancel">Cancel</button>
                <button type="button" id="btn-confirm-logout" class="btn-danger">Logout</button>
            </div>
        </div>
    </div>
    

    <!-- Settings Modal -->
    <div id="settings-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title" aria-hidden="true">
        <div class="modal-backdrop" tabindex="-1"></div>
        <div class="modal-content">
            <button type="button" class="modal-close" data-modal-close aria-label="Close dialog">✕</button>
            <h3 id="settings-title">Settings ⚙️</h3>
            <div class="settings-list">
                <div class="setting-item">
                    <label for="toggle-sound">Sound Effects</label>
                    <input type="checkbox" id="toggle-sound" checked>
                </div>
                <div class="setting-item">
                    <label for="toggle-music">Background Music</label>
                    <input type="checkbox" id="toggle-music">
                </div>
                <div class="setting-item">
                    <label for="theme-selector">Theme</label>
                    <select id="theme-selector">
                        <option value="dark" selected>Dark Mode (Vibrant)</option>
                        <option value="light">Light Mode</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" id="btn-close-settings" class="btn-cancel" style="width: 100%;">Close</button>
            </div>
        </div>
    </div>

    <!-- Profile Slide-in Panel (added) -->

    <script src="frontend/js/game.js"></script>
</body>
</html>
