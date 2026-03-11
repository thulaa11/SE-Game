const DIFFICULTY_TIMES = { easy: 45, medium: 30, hard: 18 };
const MAX_LIVES = 5;

let score = 0;
let bestScore = 0;
let streak = 0;
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
let musicEnabled = localStorage.getItem('bananaMusic') === 'true';
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

// ---------- Audio System ----------
function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === 'tick') {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'correct') {
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'wrong') {
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'hint') {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        }
    } catch(e) {}
}

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
    el('dashboard-best-score', bestScore);
    el('dashboard-top-score', topScore);
    el('dashboard-top-user', topUser ? `(${topUser})` : '');
    el('dashboard-games-played', gamesPlayed);
    // profile panel quick sync (if open)
    const sessionEl = document.getElementById('profile-session-score');
    if (sessionEl) sessionEl.textContent = String(score);
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
    hints = 3;
    awaitingNextQuestion = false;
    updateHearts();
    document.getElementById('score').textContent = score;
    document.getElementById('best-score').textContent = bestScore;
    updateStreak();
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
    loadPuzzle();
}

// ---------- Dashboard & profile ----------
function updateDashboard() {
    const perfInd = document.getElementById('performance-indicator');
    if (perfInd) {
        perfInd.classList.remove('performance-good', 'performance-average', 'performance-poor');
        let ratio = gamesPlayed === 0 ? 1 : score / gamesPlayed;
        if (ratio >= 0.8) { perfInd.textContent = 'Excellent'; perfInd.classList.add('performance-good'); }
        else if (ratio >= 0.4) { perfInd.textContent = 'Average'; perfInd.classList.add('performance-average'); }
        else { perfInd.textContent = 'Needs Practice'; perfInd.classList.add('performance-poor'); }
    }
    updateScoresUI();
    updateLevelBadge();
}

function updateLevelBadge() {
    const lvl = Math.floor(score / 50) + 1;
    const badge = document.getElementById('level-badge');
    const avatar = document.getElementById('player-avatar');
    if (badge) badge.textContent = `Lv.${lvl}`;
    if (avatar) {
        avatar.classList.remove('rank-beginner', 'rank-silver', 'rank-gold');
        if (score >= 500) avatar.classList.add('rank-gold');
        else if (score >= 200) avatar.classList.add('rank-silver');
        else avatar.classList.add('rank-beginner');
    }
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

function updateStreak() {
    const el = document.getElementById('streak');
    const streakIcon = document.querySelector('.streak-icon');
    const multiplierEl = document.getElementById('streak-multiplier');
    
    if (el) el.textContent = streak;
    if (streakIcon) {
        if (streak >= 3) streakIcon.classList.add('active');
        else streakIcon.classList.remove('active');
    }
    if (multiplierEl) {
        if (streak >= 5) {
            multiplierEl.textContent = 'x3';
            multiplierEl.classList.remove('hidden');
        } else if (streak >= 3) {
            multiplierEl.textContent = 'x2';
            multiplierEl.classList.remove('hidden');
        } else {
            multiplierEl.classList.add('hidden');
        }
    }
    updateDashboard();
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

function getRankFromScore(s) {
    if (s >= 600) return { name: 'Master', min: 600, max: null, colorClass: 'rank-master' };
    if (s >= 300) return { name: 'Challenger', min: 300, max: 600, colorClass: 'rank-challenger' };
    if (s >= 100) return { name: 'Explorer', min: 100, max: 300, colorClass: 'rank-explorer' };
    return { name: 'Beginner', min: 0, max: 100, colorClass: 'rank-beginner' };
}

function setRankUI({ rankName, progressPct, progressText }) {
    const badge = document.getElementById('profile-rank-badge');
    const bar = document.getElementById('profile-rank-progress-bar');
    const text = document.getElementById('profile-rank-progress-text');
    if (badge) {
        badge.textContent = rankName;
        badge.classList.remove('rank-beginner', 'rank-explorer', 'rank-challenger', 'rank-master');
        badge.classList.add(`rank-${rankName.toLowerCase()}`);
    }
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, progressPct))}%`;
    if (text) text.textContent = progressText;
}

async function refreshProfilePanel() {
    const sessionEl = document.getElementById('profile-session-score');
    if (sessionEl) sessionEl.textContent = String(score);

    const statEls = ['profile-email', 'profile-join-date', 'profile-best-score', 'profile-games-played'];
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
        const email = (data.email ?? '—').toString();
        const joinDate = (data.join_date ?? '—').toString();
        const best = Number(data.best_score ?? 0);
        const played = Number(data.games_played ?? 0);

        if (usernameEl) usernameEl.textContent = username;
        const emailEl = document.getElementById('profile-email');
        const joinEl = document.getElementById('profile-join-date');
        const bestEl = document.getElementById('profile-best-score');
        const playedEl = document.getElementById('profile-games-played');
        const avatarLetter = document.getElementById('profile-avatar-letter');
        const headerAvatarLetter = document.querySelector('#player-avatar .avatar-text');

        if (emailEl) emailEl.textContent = email;
        if (joinEl) joinEl.textContent = joinDate;
        if (bestEl) bestEl.textContent = String(best);
        if (playedEl) playedEl.textContent = String(played);

        const first = (username || 'U').charAt(0).toUpperCase();
        if (avatarLetter) avatarLetter.textContent = first;
        if (headerAvatarLetter) headerAvatarLetter.textContent = first;
        
        const lvl = Math.floor(best / 50) + 1;
        const badge = document.getElementById('level-badge');
        if (badge) badge.textContent = `Lv.${lvl}`;

        const r = getRankFromScore(best);
        let pct = 100;
        let txt = '';
        if (r.max === null) {
            txt = `${best} / 600+`;
        } else {
            const span = r.max - r.min;
            pct = span <= 0 ? 0 : ((best - r.min) / span) * 100;
            txt = `${best} / ${r.max}`;
        }
        setRankUI({ rankName: r.name, progressPct: pct, progressText: txt });
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
    });
}

const themeSelect = document.getElementById('theme-selector');
if (themeSelect instanceof HTMLSelectElement) {
    const savedTheme = localStorage.getItem('bananaTheme') || 'dark';
    themeSelect.value = savedTheme;
    document.body.setAttribute('data-theme', savedTheme);
    themeSelect.addEventListener('change', () => {
        document.body.setAttribute('data-theme', themeSelect.value);
        localStorage.setItem('bananaTheme', themeSelect.value);
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
        if (timeLeft <= 5) {
            if (timerEl) timerEl.classList.add('urgent');
            playSound('tick');
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
}

function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    document.getElementById('pause-overlay')?.classList.add('hidden');
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '⏸️';
    // resume from remaining timeLeft
    startTimer({ resume: true });
}

document.getElementById('btn-pause')?.addEventListener('click', pauseGame);
document.getElementById('btn-resume')?.addEventListener('click', resumeGame);

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
                startTimer({ resume: false });
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

    clearInterval(timer);
    const guess = parseInt(guessInput?.value);
    
    // Hide explanation
    const expPanel = document.getElementById('explanation-panel');
    if (expPanel) expPanel.classList.add('hidden');
    document.getElementById('puzzle-image')?.classList.remove('correct-highlight');

    if (guess === solution) {
        playSound('correct');
        const points = (streak >= 5) ? 3 : ((streak >= 3) ? 2 : 1);
        score += points;
        streak++;
        showScorePopup(points);
        if (streak >= 3 && timeLeft < DIFFICULTY_TIMES[currentDifficulty]) {
            timeLeft = Math.min(DIFFICULTY_TIMES[currentDifficulty], timeLeft + 5);
        }
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
        playSound('wrong');
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

// ---------- Hint System ----------
function applyHint() {
    if (isPaused) return;
    if (hints <= 0) {
        showMessage('No hints remaining! 💡', 'warning');
        return;
    }
    if (solution === null || Number.isNaN(Number(solution))) {
        showMessage('Hint unavailable right now. Please wait for the puzzle to load.', 'error');
        return;
    }

    // apply penalties
    hints = Math.max(0, hints - 1);
    score = Math.max(0, score - 10);
    loseLife();
    playSound('hint');
    showScorePopup(10, true);

    // update UI
    document.getElementById('score').textContent = String(score);
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

document.getElementById('btn-hint')?.addEventListener('click', () => {
    if (isPaused) return;
    applyHint();
});


function updateHintsDisplay() {
    const disp = document.getElementById('hints-left-display');
    if (disp) {
        if (hints === 3) disp.textContent = '💡💡💡';
        else if (hints === 2) disp.textContent = '💡💡⬜';
        else if (hints === 1) disp.textContent = '💡⬜⬜';
        else disp.textContent = '⬜⬜⬜';
    }
}

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
    if (awaitingNextQuestion) {
        awaitingNextQuestion = false;
        // restore input/buttons for next puzzle (keep score/lives)
        if (guessInput) {
            guessInput.disabled = false;
            guessInput.classList.remove('hint-revealed');
            guessInput.value = '';
        }
        const submitBtn = document.getElementById('btn-submit');
        if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
        const expPanel = document.getElementById('explanation-panel');
        if (expPanel) expPanel.classList.add('hidden');
        this.textContent = '🔄 New Game';
        loadPuzzle();
        return;
    }
    resetGame();
});

// ---------- Init ----------
function initGame() {
    if (difficultySelect) {
        difficultySelect.value = currentDifficulty;
        updateDifficultyBadge();
    }
    updateHintsDisplay();
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn instanceof HTMLButtonElement) hintBtn.disabled = hints <= 0;
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
