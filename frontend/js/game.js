const DIFFICULTY_TIMES = { easy: 45, medium: 30, hard: 18 };
const MAX_LIVES = 5;
const POINTS_TO_LEVEL = 10;
const GAMES_TO_LEVEL = 10;
const COINS_PER_LEVEL = 10;
const HINT_REFILL_COST = 5;

// totalScore tracks the overall run; levelScore tracks only the current level
let score = 0; // total score across the session (kept for backend + stats)
let coins = 0;
let bestScore = 0;
let lives = MAX_LIVES;
let gamesPlayed = 0;
let topScore = 0;
let topUser = '';
let solution = null; // currentAnswer (kept only in JS)
let timer = null;
let timeLeft = 30;
let hints = 3; // hintsLeft
let isPaused = false;
let awaitingNextQuestion = false;
let soundEnabled = localStorage.getItem('bananaSound') !== 'false';
let darkModeEnabled = localStorage.getItem('bananaDarkMode') !== 'false'; // default true
let currentDifficulty = localStorage.getItem('bananaDifficulty') || 'medium';
let currentLevel = 1;
let roundsInLevel = 0;
let pointsInLevel = 0; // score within the current level only

// apply initial theme as early as possible
if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-theme', darkModeEnabled ? 'dark' : 'light');
}

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

// ---------- Audio System ----------
const AudioManager = (() => {
    const base = 'assests/music/';
    const sounds = {
        music: new Audio(base + 'game music loop.mp3'),
        congrats: new Audio(base + 'levelup congrats sound.mp3'),
        coin: new Audio(base + 'coins sound.mp3'),
        timewarn: new Audio(base + 'time counting sound.mp3'),
        gameover: new Audio(base + 'game over sound.mp3'),
        wrong: new Audio(base + 'heart break sound.mp3'),
        correct: new Audio(base + 'nextgame sound.mp3'),
        hint: new Audio(base + 'nextgame sound.mp3'),
    };
    let musicStarted = false;
    sounds.music.loop = true;
    Object.values(sounds).forEach(a => { a.preload = 'auto'; a.volume = 0.9; });

    function canPlay() {
        return soundEnabled;
    }

    function play(name) {
        const a = sounds[name];
        if (!a || !canPlay()) return;
        if (name === 'music') {
            musicStarted = true;
            a.currentTime = 0;
            a.play().catch(() => {});
        } else {
            a.currentTime = 0;
            a.play().catch(() => {});
        }
    }

    function pauseMusic() {
        sounds.music.pause();
    }

    function resumeMusic() {
        if (!canPlay()) return;
        musicStarted = true;
        sounds.music.play().catch(() => {});
    }

    function stopMusic() {
        sounds.music.pause();
        sounds.music.currentTime = 0;
    }

    function maybeStartMusicFromUserGesture() {
        if (!musicStarted && canPlay()) {
            resumeMusic();
        }
    }

    function applyGlobalMuteState() {
        if (!soundEnabled) {
            Object.values(sounds).forEach(a => {
                a.pause();
            });
        } else if (musicStarted) {
            // if re‑enabled and music was started before, resume background loop
            resumeMusic();
        }
    }

    return { play, pauseMusic, resumeMusic, stopMusic, maybeStartMusicFromUserGesture, applyGlobalMuteState };
})();

// ---------- Scores API ----------
async function fetchScores() {
    try {
        const res = await fetch('api/scores.php');
        const data = await res.json();
        if (data.error === 'Not logged in') {
            // session expired or not authenticated
            const base = window.BANANA_BASE || '';
            window.location = base + 'Backend/auth/login.php';
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
            const base = window.BANANA_BASE || '';
            window.location = base + 'Backend/auth/login.php';
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
    el('top-score', topScore);
    el('dashboard-your-best-score', bestScore);
    el('dashboard-global-top-score', topScore);
    const topUserLabel = document.getElementById('dashboard-global-top-user');
    if (topUserLabel) {
        topUserLabel.textContent = topUser ? `by ${topUser}` : '';
    }
    // profile panel quick sync (if open)
    const bestProfileEl = document.getElementById('profile-best-score');
    if (bestProfileEl) bestProfileEl.textContent = String(bestScore);
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
    } else {
        // Fix 5: Fail GIF on heart loss (not game over)
        showGif('assests/src/Wrong Answer.gif', 1500, 'top');
    }
}

// ---------- Game Over ----------
function showGameOver() {
    AudioManager.play('gameover');
    showGif('assests/src/Game Over.gif', 3000, 'center');
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.classList.remove('hidden');
    if (guessForm) {
        guessForm.querySelector('input').disabled = true;
        guessForm.querySelector('button').disabled = true;
    }
    AudioManager.stopMusic();
    AudioManager.play('gameover');
    saveScore(score);
}

function updateCoinsDisplay() {
    const el = document.getElementById('coins-display');
    if (el) el.textContent = String(coins);
    const profCoins = document.getElementById('profile-coins');
    if (profCoins) profCoins.textContent = String(coins);
}

function showCelebrationBomb(level) {
    const container = document.getElementById('celebration-container');
    if (!container) return;
    const bomb = document.createElement('div');
    bomb.className = 'celebration-bomb';
    bomb.innerHTML = `<span class="bomb-emoji">💥</span><span class="level-text">Level ${level} Complete!</span>`;
    container.appendChild(bomb);
    bomb.offsetHeight; // force reflow
    bomb.classList.add('blast');
    setTimeout(() => bomb.remove(), 1800);
}

function resetGame() {
    lives = MAX_LIVES;
    score = 0;
    coins = 0;
    hints = 3;
    awaitingNextQuestion = false;
    updateHearts();
    pointsInLevel = 0;
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = String(pointsInLevel);
    document.getElementById('best-score').textContent = bestScore;
    if (typeof updateHintsDisplay === 'function') updateHintsDisplay();
    if (guessForm) {
        guessForm.querySelector('input').disabled = false;
        guessForm.querySelector('button').disabled = false;
    }
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    if (guessInput) {
        guessInput.disabled = false;
        guessInput.classList.remove('hint-revealed');
        guessInput.value = '';
    }
    const nextBtn = document.getElementById('new-game-btn');
    if (nextBtn) nextBtn.textContent = '🔄 New Game';
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.classList.add('hidden');
    updateCoinsDisplay();
    loadPuzzle();
}

// ---------- Dashboard & profile ----------
function updateDashboard() {
    // dashboard now only shows global top, personal best, and current level score
    updateScoresUI();
    const levelScoreEl = document.getElementById('dashboard-current-level-score');
    if (levelScoreEl) levelScoreEl.textContent = String(pointsInLevel);
    updateLevelBadge();
}

function updateLevelBadge() {
    const lvl = currentLevel;
    const badge = document.getElementById('level-badge');
    if (badge) badge.textContent = `Lv.${lvl}`;
}

function checkLevelProgress() {
    if (roundsInLevel >= GAMES_TO_LEVEL || pointsInLevel >= POINTS_TO_LEVEL) {
        levelUp();
    }
}

function levelUp({ byPurchase = false } = {}) {
    if (!byPurchase) {
        currentLevel++;
        coins += COINS_PER_LEVEL;
        AudioManager.play('coin');
    } else {
        currentLevel++;
    }
    
    roundsInLevel = 0;
    pointsInLevel = 0;
    
    updateLevelBadge();
    updateCoinsDisplay();
    
    const levelScoreEl = document.getElementById('dashboard-current-level-score');
    if (levelScoreEl) levelScoreEl.textContent = String(pointsInLevel);

    AudioManager.play('congrats');
    // Blast / Level Move GIF (Fix 5)
    showGif('assests/src/Level Up Blast.gif', 1500, 'center');
    setTimeout(() => {
        // Winning / Level Up GIF (Fix 5)
        showGif('assests/src/Celebration Panel.gif', 2500, 'center');
        showLevelCelebrationPanel({ level: currentLevel, coinsAwarded: byPurchase ? 0 : COINS_PER_LEVEL });
    }, 1500);
}

function showLevelCelebrationPanel({ level, coinsAwarded }) {
    // Hide "Next Question" button if it was shown (Fix for hint auto-next)
    const nextBtn = document.getElementById('new-game-btn');
    if (nextBtn) nextBtn.classList.add('hidden');
    
    const panel = document.createElement('div');
    panel.className = 'level-celebration-panel';
    panel.innerHTML = `
        <div class="level-celebration-card">
          <h3>🎉 Congrats! Level Upgraded!</h3>
          <p>You reached Level <strong>${level}</strong>${coinsAwarded ? ` and earned <strong>${coinsAwarded} 🪙</strong>` : ''}.</p>
          <button id="btn-celebration-continue" class="btn-primary" style="width:100%;">Continue</button>
        </div>
    `;
    document.body.appendChild(panel);
    // confetti
    for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = ['#ffd54f','#ff9f1c','#a855f7','#22c55e','#38bdf8'][Math.floor(Math.random()*5)];
        c.style.animationDelay = (Math.random()*0.8)+'s';
        panel.appendChild(c);
    }
    AudioManager.stopMusic();
    AudioManager.play('congrats');
    const btn = panel.querySelector('#btn-celebration-continue');
    btn?.addEventListener('click', () => {
        panel.remove();
        if (soundEnabled) {
            AudioManager.resumeMusic();
        }
        loadPuzzle();
    });
}

function showScorePopup(points, isNegative = false) {
    const container = document.getElementById('score-popup-container');
    if (!container) return;
    const popup = document.createElement('div');
    popup.className = `score-popup ${isNegative ? 'negative' : ''}`;
    popup.textContent = (isNegative ? '' : '+') + points;
    container.appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
}

function updateDifficultyBadge() {
    if (difficultySelect) {
        difficultySelect.classList.remove('difficulty-easy', 'difficulty-medium', 'difficulty-hard');
        difficultySelect.classList.add(`difficulty-${currentDifficulty}`);
    }
    updateDashboard();
}

// UI Interactions / Modals
// ---------- Global modal system (per spec) ----------
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    // only unlock scroll if no modal is open
    const anyOpen = Array.from(document.querySelectorAll('.modal')).some(m => !m.classList.contains('hidden'));
    if (!anyOpen) document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.classList.contains('modal-backdrop') || t.hasAttribute('data-modal-close')) {
        const modal = t.closest('.modal');
        if (modal?.id) closeModal(modal.id);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(m => closeModal(m.id));
        closeProfileDropdown();
    }
});

function showMessage(text, kind = '') {
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent = text;
    el.className = kind;
}

// ---------- Profile dropdown ----------
const profilePanel = document.getElementById('profile-panel');
const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
const btnOpenProfile = document.getElementById('btn-open-profile');

function toggleProfileDropdown() {
    if (profilePanel?.classList.contains('profile-dropdown--open')) {
        closeProfileDropdown();
    } else {
        openProfileDropdown();
    }
}

function openProfileDropdown() {
    if (!profilePanel) return;
    profilePanel.classList.add('profile-dropdown--open');
    profilePanel.setAttribute('aria-hidden', 'false');
    if (btnOpenProfile) btnOpenProfile.setAttribute('aria-expanded', 'true');
    refreshProfilePanel();
}

function closeProfileDropdown() {
    if (profilePanel) {
        profilePanel.classList.remove('profile-dropdown--open');
        profilePanel.setAttribute('aria-hidden', 'true');
    }
    if (btnOpenProfile) btnOpenProfile.setAttribute('aria-expanded', 'false');
    closeInlineRename();
}

function closeInlineRename() {
    const form = document.getElementById('inline-rename-form');
    const msg = document.getElementById('inline-rename-message');
    const btnEdit = document.getElementById('btn-edit-name');
    if (form) form.classList.remove('inline-rename-form--open');
    if (msg) msg.textContent = '';
    if (btnEdit) btnEdit.classList.remove('editing');
}

// removed rank/tier system

async function refreshProfilePanel() {
    const levelScoreEl = document.getElementById('dashboard-current-level-score');
    const avatarImg = document.getElementById('profile-avatar-image');
    if (avatarImg) {
        const username = typeof window.BANANA_USERNAME === 'string' ? window.BANANA_USERNAME : 'player';
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
        avatarImg.src = avatarUrl;
        avatarImg.alt = 'Player Avatar';
        avatarImg.width = 100;
        avatarImg.height = 100;
        avatarImg.onerror = function() {
            this.src = 'assests/src/default-avatar.png';
        };
    }
    if (levelScoreEl) levelScoreEl.textContent = String(pointsInLevel);

    const statEls = ['profile-best-score'];
    const currentUsername = typeof window.BANANA_USERNAME === 'string' ? window.BANANA_USERNAME : '';
    const usernameEl = document.getElementById('profile-username');
    if (usernameEl) usernameEl.textContent = currentUsername;

    statEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = 'loading...';
            el.classList.add('skeleton');
        }
    });

    try {
        const base = window.BANANA_BASE || '';
        const res = await fetch(base + 'Backend/profile_data.php', { headers: { 'Accept': 'application/json' } });
        const data = await res.json();

        statEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('skeleton');
        });

        if (data?.error) {
            console.error('Profile fetch error:', data.error);
            return;
        }

        const username = (data.username ?? currentUsername).toString();
        const best = Number(data.best_score ?? 0);

        if (usernameEl) usernameEl.textContent = username;
        const bestEl = document.getElementById('profile-best-score');
        const headerAvatarLetter = document.querySelector('#player-avatar .avatar-text');

        if (bestEl) bestEl.textContent = String(best);

        const first = (username || 'U').charAt(0).toUpperCase();
        if (headerAvatarLetter) headerAvatarLetter.textContent = first;

        updateProfileAvatar(username);

        const badge = document.getElementById('level-badge');
        if (badge) badge.textContent = `Lv.${currentLevel}`;
        const profLevel = document.getElementById('profile-level');
        const profCoins = document.getElementById('profile-coins');
        if (profLevel) profLevel.textContent = String(currentLevel);
        if (profCoins) profCoins.textContent = String(coins);
    } catch (err) {
        console.error('[Profile]', err);
        statEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('skeleton');
                el.textContent = 'Error';
            }
        });
    }
}

// Profile dropdown event listeners
document.getElementById('btn-open-profile')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProfileDropdown();
});

// Add CSS for avatar styling
const avatarStyle = document.createElement('style');
avatarStyle.textContent = `
#profile-avatar-image {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid #FFD700;
    object-fit: cover;
    display: block;
    margin: 0 auto;
}
`;
document.head.appendChild(avatarStyle);
document.getElementById('btn-open-profile')?.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        toggleProfileDropdown();
    }
});
document.getElementById('btn-close-profile')?.addEventListener('click', closeProfileDropdown);

// Close dropdown when clicking outside (desktop only)
document.addEventListener('click', (e) => {
    if (profilePanel?.classList.contains('profile-dropdown--open')) {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile && !profileDropdownWrapper?.contains(e.target)) {
            closeProfileDropdown();
        }
    }
});

// Close dropdown on mobile when clicking outside the panel
document.addEventListener('click', (e) => {
    if (profilePanel?.classList.contains('profile-dropdown--open')) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && !profilePanel.contains(e.target) && e.target.id !== 'btn-open-profile') {
            closeProfileDropdown();
        }
    }
});

// ---------- Logout modal ----------
document.getElementById('btn-logout-icon')?.addEventListener('click', (e) => { e.preventDefault(); openModal('logout-confirm-modal'); });
document.getElementById('btn-cancel-logout')?.addEventListener('click', () => closeModal('logout-confirm-modal'));

document.getElementById('btn-confirm-logout')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-confirm-logout');
    if (!(btn instanceof HTMLButtonElement)) return;
    const prevText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Logging out...';

    const base = window.BANANA_BASE || '';

    try {
        const res = await fetch(base + 'Backend/auth/logout.php', {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
        });
        const data = await res.json();
        if (!data?.success) {
            showMessage(data?.error || 'Logout failed. Please try again.', 'error');
            btn.disabled = false;
            btn.textContent = prevText;
            return;
        }

        closeModal('logout-confirm-modal');
        const app = document.getElementById('app-content');
        if (app) app.classList.add('fade-out');
        setTimeout(() => {
            window.location.href = base + 'Backend/auth/login.php';
        }, 300);
    } catch (err) {
        console.error('Request failed:', err);
        showMessage('Network error while logging out.', 'error');
        btn.disabled = false;
        btn.textContent = prevText;
    }
});

// ---------- Settings modal + persistence ----------
document.getElementById('btn-settings')?.addEventListener('click', () => openModal('settings-modal'));
document.getElementById('btn-close-settings')?.addEventListener('click', () => closeModal('settings-modal'));

const sndToggle = document.getElementById('toggle-sound');
if (sndToggle instanceof HTMLInputElement) {
    sndToggle.checked = soundEnabled;
    sndToggle.addEventListener('change', () => {
        soundEnabled = sndToggle.checked;
        localStorage.setItem('bananaSound', soundEnabled ? 'true' : 'false');
        AudioManager.applyGlobalMuteState();
    });
}

const darkToggle = document.getElementById('toggle-dark-mode');
    if (darkToggle instanceof HTMLInputElement) {
    darkToggle.checked = darkModeEnabled;
    document.body.setAttribute('data-theme', darkModeEnabled ? 'dark' : 'light');
    darkToggle.addEventListener('change', () => {
        darkModeEnabled = darkToggle.checked;
        document.body.setAttribute('data-theme', darkModeEnabled ? 'dark' : 'light');
        localStorage.setItem('bananaDarkMode', darkModeEnabled ? 'true' : 'false');
        // Fix 2: Sync across all panels instantly
        localStorage.setItem('darkMode', darkModeEnabled ? 'true' : 'false');
    });
}

// ---------- Change username inline form ----------
const inlineRenameForm = document.getElementById('inline-rename-form');
const inlineNewUsernameInput = document.getElementById('inline-new-username');
const inlineRenameMessage = document.getElementById('inline-rename-message');
const btnEditName = document.getElementById('btn-edit-name');

btnEditName?.addEventListener('click', (e) => {
    e.preventDefault();
    if (inlineRenameForm) {
        inlineRenameForm.classList.add('inline-rename-form--open');
        btnEditName.classList.add('editing');
        if (inlineNewUsernameInput instanceof HTMLInputElement) {
            inlineNewUsernameInput.value = typeof window.BANANA_USERNAME === 'string' ? window.BANANA_USERNAME : '';
            inlineNewUsernameInput.focus();
        }
        if (inlineRenameMessage) inlineRenameMessage.textContent = '';
    }
});

document.getElementById('btn-inline-cancel-rename')?.addEventListener('click', closeInlineRename);

document.getElementById('btn-inline-save-rename')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target;
    const prevText = btn.textContent;

    const name = (inlineNewUsernameInput instanceof HTMLInputElement ? inlineNewUsernameInput.value.trim() : '');
    if (!name || name.length < 2) {
        if (inlineRenameMessage) {
            inlineRenameMessage.textContent = 'Username must be at least 2 characters';
            inlineRenameMessage.style.color = '#ef4444';
        }
        return;
    }

    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const base = window.BANANA_BASE || '';
        const res = await fetch(base + 'Backend/update_username.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ username: name }),
        });
        const data = await res.json();

        btn.textContent = prevText;
        btn.disabled = false;

        if (data?.ok) {
            window.BANANA_USERNAME = data.username;
            const headerLetter = document.querySelector('#player-avatar .avatar-text');
            if (headerLetter) headerLetter.textContent = data.username.charAt(0).toUpperCase();

            if (inlineRenameMessage) {
                inlineRenameMessage.textContent = '✓ Username updated!';
                inlineRenameMessage.style.color = '#22c55e';
            }

            const usernameEl = document.getElementById('profile-username');
            if (usernameEl) usernameEl.textContent = data.username;

            // refresh DiceBear avatar when username changes
            updateProfileAvatar(data.username);

            setTimeout(closeInlineRename, 1500);
        } else {
            if (inlineRenameMessage) {
                inlineRenameMessage.textContent = data?.error || 'Failed to update';
                inlineRenameMessage.style.color = '#ef4444';
            }
        }
    } catch (err) {
        console.error('[Profile]', err);
        btn.textContent = prevText;
        btn.disabled = false;
        if (inlineRenameMessage) {
            inlineRenameMessage.textContent = 'Network error. Try again.';
            inlineRenameMessage.style.color = '#ef4444';
        }
    }
});

document.getElementById('restart-game-btn')?.addEventListener('click', resetGame);

// Share profile button
document.getElementById('btn-share-profile')?.addEventListener('click', () => {
    const profileUrl = window.location.origin + window.location.pathname;
    const text = `I scored ${bestScore} points on The Banana Game! Can you beat my score? 🍌`;
    if (navigator.share) {
        navigator.share({ title: 'The Banana Game', text: text, url: profileUrl });
    } else {
        alert(`My best score: ${bestScore}\n\n${text}`);
    }
});

// Upgrade level via coins
document.getElementById('btn-upgrade-level')?.addEventListener('click', () => {
    const msgEl = document.getElementById('profile-upgrade-message');
    if (coins < COINS_PER_LEVEL) {
        if (msgEl) {
            msgEl.textContent = '❌ Not enough coins! Earn more coins to upgrade.';
            msgEl.className = 'profile-upgrade-message profile-upgrade-message--error';
            setTimeout(() => {
                msgEl.textContent = '';
                msgEl.className = 'profile-upgrade-message';
            }, 3000);
        }
        return;
    }
    coins -= COINS_PER_LEVEL;
    updateCoinsDisplay();
    levelUp({ byPurchase: true });
    if (msgEl) {
        msgEl.textContent = `✅ Level Upgraded! You are now Level ${currentLevel}.`;
        msgEl.className = 'profile-upgrade-message profile-upgrade-message--success';
        setTimeout(() => {
            msgEl.textContent = '';
            msgEl.className = 'profile-upgrade-message';
        }, 3000);
    }
});

// ---------- Timer ----------
function startTimer({ resume = false } = {}) {
    if (timer) clearInterval(timer);
    if (!resume) timeLeft = DIFFICULTY_TIMES[currentDifficulty];
    updateTimer();
    const timerEl = document.getElementById('timer-container');
    if (timerEl) timerEl.classList.remove('urgent');
    timer = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft === 10) {
            if (timerEl) timerEl.classList.add('urgent');
            AudioManager.play('timewarn');
        }
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeUp();
        }
    }, 1000);
}

function updateTimer() {
    const el = document.getElementById('timer');
    const ring = document.getElementById('timer-ring-progress');
    if (el) el.textContent = timeLeft;
    if (ring) {
        const total = DIFFICULTY_TIMES[currentDifficulty];
        const radius = 26;
        const circumference = 2 * Math.PI * radius;
        const pct = timeLeft / total;
        ring.style.strokeDashoffset = circumference * (1 - pct);
        if (pct > 0.5) ring.style.stroke = 'var(--secondary)';
        else if (pct > 0.2) ring.style.stroke = 'var(--primary)';
        else ring.style.stroke = 'var(--accent)';
    }
}

function pauseGame() {
    if (isPaused) return;
    isPaused = true;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    document.getElementById('pause-overlay')?.classList.remove('hidden');
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '▶️';
    AudioManager.pauseMusic();
}

function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    document.getElementById('pause-overlay')?.classList.add('hidden');
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '⏸️';
    // resume from remaining timeLeft
    startTimer({ resume: true });
    AudioManager.resumeMusic();
}

document.getElementById('btn-pause')?.addEventListener('click', pauseGame);
document.getElementById('btn-resume')?.addEventListener('click', resumeGame);
document.getElementById('btn-restart')?.addEventListener('click', () => {
    document.getElementById('pause-overlay')?.classList.add('hidden');
    isPaused = false;
    if (soundEnabled) {
        AudioManager.resumeMusic();
    }
    resetGame();
});

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
    roundsInLevel++;
    checkLevelProgress();
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
            if (guessForm) {
                guessForm.querySelector('input').disabled = false;
                guessForm.querySelector('button').disabled = false;
            }
            loadPuzzle();
        }
    }, 3500);
}

function handleTimeUp() {
    AudioManager.play('wrong');
    showGif('assests/src/Wrong Answer.gif', 1500, 'top');
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
        // Use backend proxy endpoint to avoid browser CORS issues with the external Banana API
        const response = await fetch('api/banana.php');
        const data = await response.text();
        const parts = data.split(',');
        if (parts.length >= 2) {
            imgEl.src = 'data:image/png;base64,' + parts[0];
            solution = parseInt(parts[1]);
                imgEl.onload = function() {
                imgEl.classList.remove('loading');
                if (msgEl) msgEl.textContent = '';
                    startTimer({ resume: false });
                    // respect autoplay policy: only (re)start music after user interaction
                    AudioManager.maybeStartMusicFromUserGesture();
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
    if (isPaused) return;
    awaitingNextQuestion = false;
    const nextBtn = document.getElementById('new-game-btn');
    if (nextBtn) nextBtn.textContent = '🔄 New Game';
    if (guessInput) guessInput.disabled = false;
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;

    // Button press animation
    const btn = document.getElementById('btn-submit');
    if (btn) { btn.classList.add('btn-press'); setTimeout(() => btn.classList.remove('btn-press'), 150); }
    AudioManager.maybeStartMusicFromUserGesture();

    clearInterval(timer);
    const guess = parseInt(guessInput?.value);

    // Hide explanation
    // const expPanel = document.getElementById('explanation-panel');
    // if (expPanel) expPanel.classList.add('hidden');
    document.getElementById('puzzle-image')?.classList.remove('correct-highlight');

    if (guess === solution) {
        AudioManager.play('correct');
        // Correct Answer GIF (Fix 5)
        showGif('assests/src/Correct Answer.gif', 1000, 'answer-area');
        const points = 1;
        score += points;
        pointsInLevel += points;
        roundsInLevel += 1;
        showScorePopup(points);
        const msgEl = document.getElementById('message');
        if (msgEl) {
            msgEl.textContent = '✅ Correct! New puzzle loaded.';
            msgEl.className = 'success';
        }
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = String(pointsInLevel);
        if (score > bestScore) bestScore = score;
        updateScoresUI();
        gamesPlayed++;
        checkLevelProgress();
        saveScore(score);
        updateDashboard();
        setTimeout(loadPuzzle, 1500);
    } else {
        AudioManager.play('wrong');
        // Fail GIF (Fix 5)
        showGif('assests/src/Wrong Answer.gif', 1500, 'top');
        loseLife();
        roundsInLevel += 1;
        const msgEl = document.getElementById('message');
        if (msgEl) {
            msgEl.textContent = `❌ Wrong! Answer was ${solution}`;
            msgEl.className = 'error';
        }
        checkLevelProgress();
        gamesPlayed++;
        saveScore(score);
        updateDashboard();
        if (lives > 0) {
            setTimeout(loadPuzzle, 2000);
        }
    }
    if (guessInput) guessInput.value = '';
});

// ---------- Hint System ----------
function applyHint() {
    if (isPaused) return;
    if (hints <= 0) {
        showMessage('No hints left. Use Refill to buy more with coins.', 'warning');
        return;
    }
    if (solution === null || Number.isNaN(Number(solution))) {
        showMessage('Hint unavailable right now. Please wait for the puzzle to load.', 'error');
        return;
    }

    // consume a hint without penalties
    hints = Math.max(0, hints - 1);
    AudioManager.play('hint');

    // update UI
    updateHintsDisplay();

    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn instanceof HTMLButtonElement && hints <= 0) {
        hintBtn.disabled = true;
        hintBtn.classList.add('disabled');
    }

    if (guessInput) {
        guessInput.value = String(solution);
        guessInput.classList.add('hint-revealed');
        guessInput.disabled = true;
        setTimeout(() => guessInput.classList.remove('hint-revealed'), 1200);
    }

    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

    showMessage(`The answer is ${solution} 💡 (Hint used)`, 'success');

    const expPanel = document.getElementById('explanation-panel');
    const expText = document.getElementById('explanation-text');
    if (expPanel && expText) {
        expText.textContent = 'Hint used: compare the banana counts and patterns carefully to understand why this number fits.';
        expPanel.classList.remove('hidden');
    }

    const nextBtn = document.getElementById('new-game-btn');
    if (nextBtn) {
        nextBtn.textContent = 'Next Question →';
        nextBtn.classList.remove('hidden');
    }
    awaitingNextQuestion = true;
}



function updateHintsDisplay() {
    const disp = document.getElementById('hints-left-display');
    if (disp) {
        if (hints === 3) disp.textContent = '💡💡💡';
        else if (hints === 2) disp.textContent = '💡💡⬜';
        else if (hints === 1) disp.textContent = '💡⬜⬜';
        else disp.textContent = '⬜⬜⬜';
    }
}

// Refill hints using coins
document.getElementById('btn-refill-hints')?.addEventListener('click', () => {
    if (hints >= 3) {
        showMessage('Hints already full.', 'info');
        return;
    }
    if (coins < HINT_REFILL_COST) {
        showMessage('Not enough coins to refill hints.', 'error');
        return;
    }
    coins -= HINT_REFILL_COST;
    hints = 3;
    updateCoinsDisplay();
    updateHintsDisplay();
    AudioManager.play('coin');
});

// ---------- Keyboard shortcuts ----------
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h' && document.activeElement !== guessInput) {
        document.getElementById('btn-hint')?.click();
    }
});

// ---------- New game / difficulty ----------
difficultySelect?.addEventListener('change', function() {
    currentDifficulty = this.value;
    localStorage.setItem('bananaDifficulty', currentDifficulty);
    updateDifficultyBadge();
});

document.getElementById('new-game-btn')?.addEventListener('click', function() {
    if (isPaused) return;
    if (awaitingNextQuestion) {
        awaitingNextQuestion = false;
        this.textContent = '🔄 New Game';
        loadPuzzle();
    } else {
        // If not awaiting, it acts as a manual skip or restart round
        loadPuzzle();
    }
});

// ---------- Init ----------
function initGame() {
    // Initial theme sync (Fix 2)
    const storedTheme = localStorage.getItem('bananaDarkMode');
    if (storedTheme !== null) {
        darkModeEnabled = storedTheme === 'true';
        document.body.setAttribute('data-theme', darkModeEnabled ? 'dark' : 'light');
    }

    if (difficultySelect) {
        difficultySelect.value = currentDifficulty;
        updateDifficultyBadge();
    }
    // background music will be started on first user interaction to respect autoplay policies
    updateHintsDisplay();
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn instanceof HTMLButtonElement) hintBtn.disabled = hints <= 0;
    updateHearts();
    updateCoinsDisplay();
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

// ---------- Interactive Puzzle Hint (Fix 3) ----------
// ---------- Interactive Puzzle Hint (Fix 3) ----------
const PuzzleHintSystem = (() => {
    const questions = [
        { q: "🌙 How many moons does Earth have?", a: 1 },
        { q: "👀 How many eyes does a human have?", a: 2 },
        { q: "🚦 How many colors are on a traffic light?", a: 3 },
        { q: "🐕 How many legs does a dog have?", a: 4 },
        { q: "✋ How many fingers are on one hand?", a: 5 },
        { q: "📅 Which number month is June?", a: 6 },
        { q: "🌈 How many colors are in a rainbow?", a: 7 },
        { q: "🕷️ How many legs does a spider have?", a: 8 },
        { q: "🪐 How many planets are in the solar system?", a: 9 },
        { q: "🐝 How many wings does a bee have?", a: 4 },
        { q: "🎲 How many sides does a dice have?", a: 6 },
        { q: "🌍 How many continents are on Earth?", a: 7 },
        { q: "🐙 How many arms does an octopus have?", a: 8 },
        { q: "🎵 How many notes are in a musical scale?", a: 7 },
        { q: "🍀 How many leaves does a lucky clover have?", a: 4 }
    ];

    let lastThree = [];
    let currentQuestion = null;
    let wasTimerRunning = false;

    function getElements() {
        return {
            overlay: document.getElementById('puzzle-hint-overlay'),
            questionEl: document.getElementById('puzzle-hint-question'),
            inputEl: document.getElementById('puzzle-hint-input'),
            messageEl: document.getElementById('puzzle-hint-message'),
            submitBtn: document.getElementById('btn-puzzle-submit'),
            cancelBtn: document.getElementById('btn-puzzle-cancel')
        };
    }

    function open() {
        if (isPaused) return;
        if (hints <= 0) {
            showMessage('No hints left. Use Refill to buy more with coins.', 'warning');
            return;
        }
        
        // Use global solution from game.js
        if (typeof solution === 'undefined' || solution === null || Number.isNaN(Number(solution))) {
            showMessage('Wait for the puzzle to load first!', 'error');
            return;
        }

        // Pause timer while puzzle is open
        if (timer) {
            clearInterval(timer);
            timer = null;
            wasTimerRunning = true;
        } else {
            wasTimerRunning = false;
        }
        
        const els = getElements();
        if (!els.overlay) {
            console.error('Puzzle hint overlay not found!');
            return;
        }

        const available = questions.filter(q => !lastThree.includes(q.q));
        currentQuestion = available[Math.floor(Math.random() * available.length)];
        
        lastThree.push(currentQuestion.q);
        if (lastThree.length > 3) lastThree.shift();

        if (els.questionEl) els.questionEl.textContent = currentQuestion.q;
        if (els.inputEl) {
            els.inputEl.value = '';
            els.inputEl.disabled = false;
        }
        if (els.messageEl) els.messageEl.textContent = '';
        if (els.submitBtn) els.submitBtn.disabled = false;
        if (els.cancelBtn) els.cancelBtn.disabled = false;
        
        els.overlay.classList.remove('hidden');
        els.inputEl?.focus();

        // Consume hint immediately upon opening the puzzle (one chance)
        consumeHint();

        // Re-bind events to current elements just in case
        if (els.submitBtn) els.submitBtn.onclick = check;
        if (els.cancelBtn) els.cancelBtn.onclick = close;
        if (els.inputEl) els.inputEl.onkeydown = (e) => { if (e.key === 'Enter') check(); };
    }

    function close() {
        getElements().overlay?.classList.add('hidden');
        // Resume timer if it was running before
        if (wasTimerRunning && !isPaused) {
            startTimer({ resume: true });
        }
    }

    function check() {
        const els = getElements();
        const val = parseInt(els.inputEl?.value);
        
        // Disable input/buttons to prevent multiple clicks during the "one chance" window
        if (els.inputEl) els.inputEl.disabled = true;
        if (els.submitBtn) els.submitBtn.disabled = true;
        if (els.cancelBtn) els.cancelBtn.disabled = true;

        if (val === currentQuestion.a) {
            AudioManager.play('correct');
            if (els.messageEl) {
                els.messageEl.style.color = '#22c55e';
                els.messageEl.textContent = "🎉 Correct! Moving to next game...";
            }
            setTimeout(() => {
                // Re-enable elements before closing/next use
                if (els.inputEl) els.inputEl.disabled = false;
                if (els.submitBtn) els.submitBtn.disabled = false;
                if (els.cancelBtn) els.cancelBtn.disabled = false;
                
                close();
                loadPuzzle();
            }, 1500);
        } else {
            AudioManager.play('wrong');
            if (els.messageEl) {
                els.messageEl.style.color = '#ef4444';
                els.messageEl.textContent = "Oops! Wrong answer. Returning to game... 🐒";
            }
            setTimeout(() => {
                // Re-enable elements for next time before closing
                if (els.inputEl) els.inputEl.disabled = false;
                if (els.submitBtn) els.submitBtn.disabled = false;
                if (els.cancelBtn) els.cancelBtn.disabled = false;
                
                close();
            }, 2000);
        }
    }

    return { open };
})();

function consumeHint() {
    if (hints > 0) {
        hints--;
        updateHintsDisplay();
        AudioManager.play('hint');
        const hintBtn = document.getElementById('btn-hint');
        if (hintBtn instanceof HTMLButtonElement && hints <= 0) {
            hintBtn.disabled = true;
            hintBtn.classList.add('disabled');
        }
    }
}

document.getElementById('btn-hint')?.addEventListener('click', () => {
    PuzzleHintSystem.open();
});

// ---------- GIF Animation System (Fix 5) ----------
let currentGifTimeout = null;
function showGif(gifPath, duration) {
    const container = document.getElementById('dashboard-gif-container');
    const wrapper = container?.querySelector('.gif-wrapper');
    if (!container || !wrapper) return;

    // Clear previous
    if (currentGifTimeout) clearTimeout(currentGifTimeout);
    wrapper.innerHTML = '';

    const img = document.createElement('img');
    img.src = gifPath + '?t=' + Date.now();
    
    wrapper.appendChild(img);
    container.classList.remove('hidden');

    currentGifTimeout = setTimeout(() => {
        container.classList.add('hidden');
        wrapper.innerHTML = '';
        currentGifTimeout = null;
    }, duration);
}