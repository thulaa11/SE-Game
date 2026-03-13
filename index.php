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
    <!-- Kid-friendly rounded fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="frontend/styles/style.css">
    <script>
        window.BANANA_USERNAME = <?php echo json_encode($_SESSION['username']); ?>;
        window.BANANA_BASE = <?php echo json_encode($basePath); ?>;
    </script>
</head>
<body data-theme="jungle">
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
                    <div id="profile-panel" class="profile-dropdown glass-panel" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="profile-panel-title">
                        <div class="profile-panel-card glass-panel">
                            <div class="profile-panel-header">
                                <h3 id="profile-panel-title">Profile</h3>
                                <button type="button" class="btn-close-dropdown" id="btn-close-profile" aria-label="Close profile">✕</button>
                            </div>

                            <div class="profile-panel-content">
                            <div class="profile-panel-hero">
                                <div id="profile-avatar-circle" class="profile-avatar-circle">
                                    <img id="profile-avatar-image" alt="Player avatar" class="profile-avatar-image" />
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
                                </div>
                            </div>

                            <div class="profile-stats-grid profile-stats-grid--compact">
                                <div class="profile-stat">
                                    <div class="label">🏆 Top Score</div>
                                    <div id="profile-best-score" class="value">0</div>
                                </div>
                                <div class="profile-stat">
                                    <div class="label">🪙 Total Coins</div>
                                    <div id="profile-coins" class="value">0</div>
                                </div>
                                <div class="profile-stat">
                                    <div class="label">🎮 Current Level</div>
                                    <div id="profile-level" class="value">1</div>
                                </div>
                            </div>
                            <div class="profile-actions-row">
                                <button type="button" id="btn-upgrade-level" class="btn-primary" style="width:100%;">Upgrade to Next Level (10 🪙)</button>
                            </div>
                            <p id="profile-upgrade-message" class="profile-upgrade-message"></p>

                            <section class="profile-leaderboard">
                                <h4 class="profile-leaderboard-title">Top 3 Players</h4>
                                <div id="top3-leaderboard" class="top3-leaderboard-list">
                                    <!-- filled by JS -->
                                </div>
                            </section>
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
                    
                    <div class="timer-container" id="timer-container">
                        <div id="timer" class="timer-text">30</div>
                    </div>
                    
                    <div class="score-container">
                        <span class="score-label">Score</span>
                        <strong id="score" class="score-value">0</strong>
                        <div id="score-popup-container"></div>
                    </div>
                    <div class="coins-container">
                        <span class="coins-icon" aria-hidden="true">🪙</span>
                        <span id="coins-display" class="coins-value">0</span>
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
                        <span class="hearts-label">Hearts:</span>
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

                    <div id="celebration-container" class="celebration-container" aria-live="polite"></div>
                    <section id="puzzle-area">
                        <img id="puzzle-image" src="" alt="Banana Puzzle" class="loading" />
                        <form id="guess-form">
                            <input type="number" id="guess" min="0" max="9" placeholder="?" required autocomplete="off">
                            <button type="submit" id="btn-submit">🎯 Submit</button>
                            <button type="button" id="btn-hint" class="btn-hint" aria-label="Show Hint" title="Show Hint">💡</button>
                        </form>
                        <div class="hint-counter">
                            Hints: <span id="hints-left-display">💡</span>
                            <button id="btn-refill-hints" class="btn-icon-small" title="Refill hints with coins">Refill (5 🪙)</button>
                        </div>
                        <p id="message"></p>
                        <div id="explanation-panel" class="explanation-panel glass-panel hidden">
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
                            <p class="timeout-message">
                                Time’s up this round! 🌟<br>
                                The answer was <strong id="timeout-answer">0</strong> – you can totally get the next one!
                            </p>
                        </div>
                    </div>
                    
                    <div id="game-over-overlay" class="game-over-overlay hidden">
                        <div class="game-over-content">
                            <h2>Oops! Try Again! 🙈</h2>
                            <p>You used all your hearts this round. Want to try again?</p>
                            <button id="restart-game-btn">Try Again! 🌟</button>
                        </div>
                    </div>
                </div>
            </main>

            <!-- Dashboard / Sidebar -->
            <aside class="dashboard-sidebar">
                <div class="dashboard">
                    <h2 class="dashboard-title">The Banana Game</h2>
                    
                    <div class="dashboard-grid" style="grid-template-columns: 1fr; gap: 16px;">
                        <div class="dashboard-card glass-panel">
                            <div class="dashboard-stat-label">🌍 Global Top Score</div>
                            <div id="dashboard-global-top-score" class="dashboard-stat-value">0</div>
                            <div id="dashboard-global-top-user" class="dashboard-small-label"></div>
                        </div>

                        <div class="dashboard-card glass-panel">
                            <div class="dashboard-stat-label">⭐ Your Best Score</div>
                            <div id="dashboard-your-best-score" class="dashboard-stat-value">0</div>
                        </div>

                        <div class="dashboard-card glass-panel">
                            <div class="dashboard-stat-label">🎯 Current Level Score</div>
                            <div id="dashboard-current-level-score" class="dashboard-stat-value">0</div>
                        </div>

                        <!-- Dashboard GIF Display (Fix 5) -->
                        <div id="dashboard-gif-container" class="dashboard-gif-card glass-panel hidden">
                            <div class="gif-wrapper"></div>
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
                    <label for="toggle-sound">🔊 Sound</label>
                    <input type="checkbox" id="toggle-sound">
                </div>
                <div class="setting-item">
                    <label for="toggle-dark-mode">🌙 Dark Mode</label>
                    <input type="checkbox" id="toggle-dark-mode">
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" id="btn-close-settings" class="btn-cancel" style="width: 100%;">Close</button>
            </div>
        </div>
    </div>

    <!-- Pause Menu Overlay -->
    <div id="pause-overlay" class="pause-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="pause-title" aria-hidden="true">
        <div class="pause-backdrop" tabindex="-1"></div>
        <div class="pause-card glass-panel">
            <h3 id="pause-title">Paused</h3>
            <div class="pause-actions">
                <button type="button" id="btn-restart" class="btn-danger">Restart Game</button>
                <button type="button" id="btn-resume" class="btn-primary">Resume Game</button>
            </div>
        </div>
    </div>

    <!-- Puzzle Hint Overlay (Fix 3) -->
    <div id="puzzle-hint-overlay" class="puzzle-hint-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="puzzle-hint-title" aria-hidden="true">
        <div class="puzzle-hint-backdrop" tabindex="-1"></div>
        <div class="puzzle-hint-card glass-panel">
            <h2 id="puzzle-hint-title">Solve the Puzzle to get your Hint!</h2>
            <span class="puzzle-hint-emoji">🐒🤔</span>
            <p id="puzzle-hint-question" class="puzzle-question"></p>
            <input type="number" id="puzzle-hint-input" class="puzzle-input" min="0" placeholder="?">
            <div class="puzzle-actions">
                <button type="button" id="btn-puzzle-submit" class="btn-primary btn-puzzle-submit">Submit Answer</button>
                <button type="button" id="btn-puzzle-cancel" class="btn-puzzle-cancel">Cancel</button>
            </div>
            <p id="puzzle-hint-message" class="modal-message"></p>
        </div>
    </div>

    <script src="frontend/js/game.js"></script>
</body>
</html>
