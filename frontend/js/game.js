const DIFFICULTY_TIMES = { easy: 45, medium: 30, hard: 18 };
const MAX_LIVES = 5;

let score = 0;
let bestScore = 0;
let streak = 0;
let lives = MAX_LIVES;
let gamesPlayed = 0;
let topScore = 0;
let topUser = '';
let solution = null;
let timer = null;
let timeLeft = 30;
let currentDifficulty = localStorage.getItem('bananaDifficulty') || 'medium';

const difficultySelect = document.getElementById('difficulty');
const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess');
const loadingScreen = document.getElementById('loading-screen');
const appContent = document.getElementById('app-content');
const loadingProgress = document.getElementById('loading-progress');
const loadingStatus = document.getElementById('loading-status');

// ---------- Loading screen ----------
function runLoadingSequence() {
    const steps = [
        { p: 15, msg: 'Loading setup...' },
        { p: 35, msg: 'Preparing puzzles...' },
        { p: 55, msg: 'Fetching banana quests...' },
        { p: 80, msg: 'Almost ready...' },
        { p: 95, msg: 'Starting game...' },
    ];
    let i = 0;
    const tick = () => {
        if (i < steps.length) {
            loadingProgress.style.width = steps[i].p + '%';
            loadingStatus.textContent = steps[i].msg;
            i++;
            setTimeout(tick, 400);
        } else {
            loadingProgress.style.width = '100%';
            loadingStatus.textContent = 'Ready!';
            setTimeout(finishLoading, 500);
        }
    };
    setTimeout(tick, 300);
}

function finishLoading() {
    loadingScreen.classList.add('hidden');
    appContent.classList.remove('hidden');
    initGame();
}

// ---------- Scores API ----------
async function fetchScores() {
    try {
        const res = await fetch('api/scores.php');
        const data = await res.json();
        if (data.error === 'Not logged in') {
            // session expired or not authenticated
            window.location = 'Backend/auth/login.php';
            return;
        }
        if (data.topScore !== undefined) topScore = data.topScore;
        if (data.topUser) topUser = data.topUser;
        if (data.playerScore !== undefined) {
            bestScore = data.playerScore;
            document.getElementById('best-score').textContent = bestScore;
        }
        if (data.playerGames !== undefined) gamesPlayed = data.playerGames;
        updateScoresUI();
    } catch (e) {
        console.warn('Could not fetch scores:', e);
    }
}

async function saveScore(finalScore) {
    try {
        const r = await fetch('api/scores.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: finalScore }),
        });
        const j = await r.json();
        if (j.error === 'Not logged in') {
            window.location = 'Backend/auth/login.php';
            return;
        }
        await fetchScores();
    } catch (e) {
        console.warn('Could not save score:', e);
    }
}

function updateScoresUI() {
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('best-score', bestScore);
    el('player-best', bestScore);
    el('top-score', topScore);
    el('dashboard-best-score', bestScore);
    el('dashboard-top-score', topScore);
    el('dashboard-top-user', topUser ? `(${topUser})` : '');
    el('dashboard-games-played', gamesPlayed);
}

// ---------- Hearts ----------
function updateHearts() {
    const container = document.getElementById('hearts');
    if (!container) return;
    const hearts = container.querySelectorAll('.heart');
    hearts.forEach((h, i) => {
        h.classList.toggle('full', i < lives);
        h.classList.toggle('empty', i >= lives);
    });
}

function loseLife() {
    lives--;
    updateHearts();
    if (lives <= 0) {
        showGameOver();
    }
}

// ---------- Game Over ----------
function showGameOver() {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.classList.remove('hidden');
    if (guessForm) {
        guessForm.querySelector('input').disabled = true;
        guessForm.querySelector('button').disabled = true;
    }
    saveScore(score);
}

function resetGame() {
    lives = MAX_LIVES;
    score = 0;
    streak = 0;
    updateHearts();
    document.getElementById('score').textContent = score;
    document.getElementById('best-score').textContent = bestScore;
    updateStreak();
    if (guessForm) {
        guessForm.querySelector('input').disabled = false;
        guessForm.querySelector('button').disabled = false;
    }
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.classList.add('hidden');
    loadPuzzle();
}

// ---------- Dashboard & profile ----------
function updateDashboard() {
    const diffLabel = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
    const diffEl = document.getElementById('dashboard-difficulty');
    const streakEl = document.getElementById('dashboard-streak');
    if (diffEl) diffEl.textContent = diffLabel;
    if (streakEl) streakEl.textContent = streak;
    updateScoresUI();
}

function updateStreak() {
    const el = document.getElementById('streak');
    if (el) el.textContent = streak;
    updateDashboard();
}

function updateDifficultyBadge() {
    if (difficultySelect) {
        difficultySelect.classList.remove('difficulty-easy', 'difficulty-medium', 'difficulty-hard');
        difficultySelect.classList.add(`difficulty-${currentDifficulty}`);
    }
    updateDashboard();
}

// Profile dropdown
const btnProfile = document.getElementById('btn-profile');
const profileDropdown = document.getElementById('profile-dropdown');
if (btnProfile && profileDropdown) {
    btnProfile.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => {
        if (!btnProfile.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
}

// Change player name modal
const changeNameModal = document.getElementById('change-name-modal');
const btnChangeName = document.getElementById('btn-change-name');
const changeNameForm = document.getElementById('change-name-form');
const newUsernameInput = document.getElementById('new-username');
const changeNameMessage = document.getElementById('change-name-message');
const btnCancelChangeName = document.getElementById('btn-cancel-change-name');

function openChangeNameModal() {
    if (changeNameModal && newUsernameInput) {
        profileDropdown?.classList.add('hidden');
        newUsernameInput.value = typeof BANANA_USERNAME === 'string' ? BANANA_USERNAME : '';
        if (changeNameMessage) changeNameMessage.textContent = '';
        changeNameModal.classList.remove('hidden');
        newUsernameInput.focus();
    }
}

function closeChangeNameModal() {
    if (changeNameModal) changeNameModal.classList.add('hidden');
}

btnChangeName?.addEventListener('click', (e) => { e.preventDefault(); openChangeNameModal(); });
btnCancelChangeName?.addEventListener('click', closeChangeNameModal);
changeNameModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeChangeNameModal);

changeNameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newUsernameInput?.value?.trim() || '';
    if (!name || name.length < 2) {
        if (changeNameMessage) changeNameMessage.textContent = 'Username must be at least 2 characters';
        return;
    }
    try {
        const res = await fetch('api/update_username.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: name }),
        });
        const data = await res.json();
        if (data.ok) {
            closeChangeNameModal();
            document.querySelectorAll('.player-name, .pill strong').forEach(el => { el.textContent = data.username; });
            const avatar = document.getElementById('player-avatar');
            if (avatar) avatar.textContent = data.username.charAt(0).toUpperCase();
            window.BANANA_USERNAME = data.username;
            location.reload();
        } else {
            if (changeNameMessage) changeNameMessage.textContent = data.error || 'Failed to update';
        }
    } catch (err) {
        if (changeNameMessage) changeNameMessage.textContent = 'Network error. Try again.';
    }
});

// Dashboard play button
const dashboardPlayBtn = document.getElementById('dashboard-play-btn');
if (dashboardPlayBtn) {
    dashboardPlayBtn.addEventListener('click', () => {
        const gameSection = document.getElementById('game');
        if (gameSection) gameSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (guessInput) guessInput.focus();
    });
}

document.getElementById('restart-game-btn')?.addEventListener('click', resetGame);

// ---------- Timer ----------
function startTimer() {
    timeLeft = DIFFICULTY_TIMES[currentDifficulty];
    updateTimer();
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.classList.remove('urgent');
    timer = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft <= 5 && timerEl) timerEl.classList.add('urgent');
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeUp();
        }
    }, 1000);
}

function updateTimer() {
    const el = document.getElementById('timer');
    if (el) el.textContent = `Time: ${timeLeft}s`;
}

// ---------- Timeout overlay ----------
function showTimeoutAnimation() {
    const overlay = document.getElementById('timeout-overlay');
    const timeoutAnswer = document.getElementById('timeout-answer');
    const bananaEmoji = overlay?.querySelector('.banana-emoji');
    const peel = overlay?.querySelector('.peel');
    const monkeyEmoji = overlay?.querySelector('.monkey-emoji');

    if (timeoutAnswer) timeoutAnswer.textContent = solution;
    if (guessForm) {
        guessForm.querySelector('input').disabled = true;
        guessForm.querySelector('button').disabled = true;
    }

    loseLife();
    gamesPlayed++;
    saveScore(score);
    updateDashboard();

    if (overlay) {
        overlay.classList.remove('hidden');
        if (bananaEmoji) { bananaEmoji.style.animation = 'none'; void bananaEmoji.offsetHeight; bananaEmoji.style.animation = ''; }
        if (peel) { peel.style.animation = 'none'; void peel.offsetHeight; peel.style.animation = ''; }
        if (monkeyEmoji) { monkeyEmoji.style.animation = 'none'; void monkeyEmoji.offsetHeight; monkeyEmoji.style.animation = ''; }
    }

    setTimeout(() => {
        if (overlay) overlay.classList.add('hidden');
        if (lives > 0) {
            streak = 0;
            updateStreak();
            if (guessForm) {
                guessForm.querySelector('input').disabled = false;
                guessForm.querySelector('button').disabled = false;
            }
            loadPuzzle();
        }
    }, 3500);
}

function handleTimeUp() {
    showTimeoutAnimation();
}

// ---------- Puzzle loading ----------
async function loadPuzzle() {
    const imgEl = document.getElementById('puzzle-image');
    const msgEl = document.getElementById('message');
    if (imgEl) imgEl.classList.add('loading');
    if (msgEl) {
        msgEl.textContent = 'Loading puzzle...';
        msgEl.className = '';
    }
    try {
        const response = await fetch('https://marcconrad.com/uob/banana/api.php?out=csv&base64=yes');
        const data = await response.text();
        const parts = data.split(',');
        if (parts.length >= 2) {
            imgEl.src = 'data:image/png;base64,' + parts[0];
            solution = parseInt(parts[1]);
            imgEl.onload = function() {
                imgEl.classList.remove('loading');
                if (msgEl) msgEl.textContent = '';
                startTimer();
            };
            imgEl.onerror = function() {
                if (msgEl) {
                    msgEl.textContent = 'Failed to load puzzle image.';
                    msgEl.className = 'error';
                }
            };
        } else {
            if (msgEl) {
                msgEl.textContent = 'Failed to load puzzle.';
                msgEl.className = 'error';
            }
        }
    } catch (error) {
        if (msgEl) {
            msgEl.textContent = 'Error loading puzzle.';
            msgEl.className = 'error';
        }
    }
}

// ---------- Guess form ----------
guessForm?.addEventListener('submit', function(e) {
    e.preventDefault();
    clearInterval(timer);
    const guess = parseInt(guessInput?.value);
    if (guess === solution) {
        score++;
        streak++;
        const msgEl = document.getElementById('message');
        if (msgEl) {
            msgEl.textContent = '✅ Correct! New puzzle loaded.';
            msgEl.className = 'success';
        }
        document.getElementById('score').textContent = score;
        if (score > bestScore) bestScore = score;
        updateScoresUI();
        updateStreak();
        gamesPlayed++;
        saveScore(score);
        updateDashboard();
        setTimeout(loadPuzzle, 1500);
    } else {
        loseLife();
        streak = 0;
        const msgEl = document.getElementById('message');
        if (msgEl) {
            msgEl.textContent = `❌ Wrong! Answer was ${solution}`;
            msgEl.className = 'error';
        }
        updateStreak();
        gamesPlayed++;
        saveScore(score);
        updateDashboard();
        if (lives > 0) {
            setTimeout(loadPuzzle, 2000);
        }
    }
    if (guessInput) guessInput.value = '';
});

// ---------- New game / difficulty ----------
difficultySelect?.addEventListener('change', function() {
    currentDifficulty = this.value;
    localStorage.setItem('bananaDifficulty', currentDifficulty);
    updateDifficultyBadge();
});

document.getElementById('new-game-btn')?.addEventListener('click', function() {
    score = 0;
    streak = 0;
    document.getElementById('score').textContent = score;
    updateStreak();
    clearInterval(timer);
    loadPuzzle();
});

// ---------- Init ----------
function initGame() {
    if (difficultySelect) {
        difficultySelect.value = currentDifficulty;
        updateDifficultyBadge();
    }
    updateHearts();
    fetchScores().then(() => {
        updateScoresUI();
        updateDashboard();
    });
    loadPuzzle();
}

// Start loading sequence on page load
if (loadingScreen && appContent) {
    runLoadingSequence();
} else {
    initGame();
}
