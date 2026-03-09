<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: auth/login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Banana Game</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>🍌 The Banana Game 🍌</h1>
    <p>Logged in as <?php echo htmlspecialchars($_SESSION['username']); ?> | <a href="auth/logout.php">Logout</a></p>
    <main id="game">
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
    </main>
    <footer>
        <p>&copy; by <a href="https://marcconrad.com/marc-conrad/index.php?n=12&s=mc">Marc Conrad</a> 2023. The material on this page is presented "as is". There is no warranty implied. This application may be discontinued without notice and must not be used for commercial applications. There is also an <a href="https://marcconrad.com/uob/banana/doc.php">API</a> available. Use <a href="https://sanfoh.com/six/sym.php?icon=banana&smile=1">this link</a> to download up to 1000 games. For any comments or suggestions <a href="http://marcconrad.com/consultancy/">contact Marc Conrad</a>. Last update: June 2024.</p>
    </footer>
    <script src="game.js"></script>
</body>
</html>
