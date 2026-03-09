<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: Backend/auth/login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Banana Game</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="frontend/styles/style.css">
</head>
<body>
    <div id="loading-screen" class="loading-screen">
        <div class="loading-content">
            <span class="loading-logo">🍌</span>
            <h1 class="loading-title">The Banana Game</h1>
            <p class="loading-subtitle">Crack the puzzle before the monkey eats your banana</p>
            <div class="loading-bar">
                <div class="loading-progress" id="loading-progress"></div>
            </div>
            <p class="loading-status" id="loading-status">Loading setup...</p>
        </div>
    </div>

    <div id="app-content" class="app-content hidden">
        <div class="app-shell">
            <header class="app-header">
                <div class="app-brand">
                    <span class="app-logo">🍌</span>
                    <div>
                        <h1 class="app-title">The Banana Game</h1>
                        <p class="app-tagline">Crack the puzzle before the monkey eats your banana.</p>
                    </div>
                </div>
                <div class="app-user">
                    <span class="pill">Logged in as <strong><?php echo htmlspecialchars($_SESSION['username']); ?></strong></span>
                    <a href="Backend/auth/logout.php" class="btn-ghost">Logout</a>
                </div>
            </header>

            <div class="app-layout">
                <section class="game-section">
                    <section id="game" class="game-card">
                        <div class="game-profile">
                            <div class="player-avatar" id="player-avatar"><?php echo strtoupper(substr($_SESSION['username'], 0, 1)); ?></div>
                            <div class="player-details">
                                <h3 class="player-name"><?php echo htmlspecialchars($_SESSION['username']); ?></h3>
                                <div class="player-score-row">
                                    <span>Your Best: <strong id="player-best">0</strong></span>
                                    <span>Top Score: <strong id="top-score">0</strong></span>
                                </div>
                            </div>
                            <div class="profile-options">
                                <button type="button" class="btn-profile" id="btn-profile" title="Profile options">⚙</button>
                                <div class="profile-dropdown hidden" id="profile-dropdown">
                                    <button type="button" class="profile-dropdown-btn" id="btn-change-name">Change player name</button>
                                    <a href="Backend/auth/logout.php">Change player / Logout</a>
                                </div>
                            </div>
                        </div>

                        <div class="hearts-row">
                            <span class="hearts-label">Attempts:</span>
                            <div class="hearts" id="hearts">
                                <span class="heart full" data-index="0">♥</span>
                                <span class="heart full" data-index="1">♥</span>
                                <span class="heart full" data-index="2">♥</span>
                                <span class="heart full" data-index="3">♥</span>
                                <span class="heart full" data-index="4">♥</span>
                            </div>
                        </div>

                        <div id="difficulty-selector">
                            <label for="difficulty">Difficulty:</label>
                            <select id="difficulty">
                                <option value="easy">Easy (45s)</option>
                                <option value="medium">Medium (30s)</option>
                                <option value="hard">Hard (18s)</option>
                            </select>
                        </div>
                        <div id="stats">
                            <div>Score: <span id="score">0</span></div>
                            <div>Best: <span id="best-score">0</span></div>
                            <div>Streak: <span id="streak">0</span></div>
                            <div id="timer">Time: 30s</div>
                        </div>
                        <section id="puzzle-area">
                            <img id="puzzle-image" src="" alt="Banana Puzzle" class="loading" />
                            <p>Quest is ready.</p>
                            <p>Enter the missing digit:</p>
                            <form id="guess-form">
                                <input type="number" id="guess" min="0" max="9" required>
                                <button type="submit">Submit</button>
                            </form>
                            <p id="message"></p>
                            <button id="new-game-btn">New Game</button>
                        </section>
                        <div id="game-over-overlay" class="game-over-overlay hidden">
                            <div class="game-over-content">
                                <h2>Game Over!</h2>
                                <p>You've used all 5 attempts. The monkey got your bananas! 🐵</p>
                                <button type="button" id="restart-game-btn">Play Again</button>
                            </div>
                        </div>
                        <div id="timeout-overlay" class="hidden">
                            <div class="timeout-content">
                                <div class="banana-wrapper">
                                    <span class="banana-emoji">🍌</span>
                                    <span class="peel" aria-hidden="true"></span>
                                </div>
                                <div class="monkey-wrapper">
                                    <span class="monkey-emoji">🐵</span>
                                </div>
                                <p class="timeout-message">Time's up! The monkey ate your banana. Answer was <span id="timeout-answer">0</span></p>
                            </div>
                        </div>
                    </section>
                </section>

                <aside class="dashboard-sidebar">
                    <section class="dashboard">
                        <h2 class="dashboard-title">Dashboard</h2>
                        <p class="dashboard-subtitle">Stats & quick actions</p>
                        <div class="dashboard-grid">
                            <article class="dashboard-card">
                                <h3>Your Best</h3>
                                <div class="dashboard-stat-label">All time</div>
                                <div class="dashboard-stat-value" id="dashboard-best-score">0</div>
                            </article>
                            <article class="dashboard-card">
                                <h3>Top Score</h3>
                                <div class="dashboard-stat-label">Best player</div>
                                <div class="dashboard-stat-value" id="dashboard-top-score">0</div>
                                <div class="dashboard-stat-label" id="dashboard-top-user"></div>
                            </article>
                            <article class="dashboard-card">
                                <h3>Streak</h3>
                                <div class="dashboard-stat-label">Correct in a row</div>
                                <div class="dashboard-stat-value" id="dashboard-streak">0</div>
                            </article>
                            <article class="dashboard-card">
                                <h3>Difficulty</h3>
                                <div class="dashboard-stat-label">Level</div>
                                <div class="dashboard-stat-value" id="dashboard-difficulty">Medium</div>
                            </article>
                            <article class="dashboard-card">
                                <h3>Games</h3>
                                <div class="dashboard-stat-label">Played</div>
                                <div class="dashboard-stat-value" id="dashboard-games-played">0</div>
                            </article>
                        </div>
                        <div class="dashboard-actions">
                            <button type="button" id="dashboard-play-btn">Play now</button>
                        </div>
                    </section>
                </aside>
            </div>

            <footer>
                <p>&copy; by <a href="https://marcconrad.com/marc-conrad/index.php?n=12&s=mc">Marc Conrad</a> 2023. The material on this page is presented "as is". There is no warranty implied. This application may be discontinued without notice and must not be used for commercial applications. There is also an <a href="https://marcconrad.com/uob/banana/doc.php">API</a> available. Use <a href="https://sanfoh.com/six/sym.php?icon=banana&smile=1">this link</a> to download up to 1000 games. For any comments or suggestions <a href="http://marcconrad.com/consultancy/">contact Marc Conrad</a>. Last update: June 2024.</p>
            </footer>
        </div>
    </div>

    <div id="change-name-modal" class="modal hidden">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <h3>Change player name</h3>
            <form id="change-name-form">
                <input type="text" id="new-username" placeholder="New username" required minlength="2" maxlength="50">
                <p id="change-name-message" class="modal-message"></p>
                <div class="modal-actions">
                    <button type="submit">Save</button>
                    <button type="button" class="btn-cancel" id="btn-cancel-change-name">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        window.BANANA_USER_ID = <?php echo json_encode($_SESSION['user_id'] ?? null); ?>;
        window.BANANA_USERNAME = <?php echo json_encode($_SESSION['username'] ?? ''); ?>;
    </script>
    <script src="frontend/js/game.js"></script>
</body>
</html>
