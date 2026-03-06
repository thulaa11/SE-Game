const DIFFICULTY_TIMES = { easy: 45, medium: 30, hard: 18 };

let score = 0;
let bestScore = localStorage.getItem('bananaBestScore') || 0;
let streak = 0;
let solution = null;
let timer = null;
let timeLeft = 30;
let currentDifficulty = localStorage.getItem('bananaDifficulty') || 'medium';


document.getElementById('best-score').textContent = bestScore;

const difficultySelect = document.getElementById('difficulty');
difficultySelect.value = currentDifficulty;
updateDifficultyBadge();

difficultySelect.addEventListener('change', function() {
    currentDifficulty = this.value;
    localStorage.setItem('bananaDifficulty', currentDifficulty);
    updateDifficultyBadge();
});

function updateDifficultyBadge() {
    difficultySelect.classList.remove('difficulty-easy', 'difficulty-medium', 'difficulty-hard');
    difficultySelect.classList.add(`difficulty-${currentDifficulty}`);
}

function startTimer() {
    timeLeft = DIFFICULTY_TIMES[currentDifficulty];
    updateTimer();
    document.getElementById('timer').classList.remove('urgent');
    timer = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft <= 5) {
            document.getElementById('timer').classList.add('urgent');
        }
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeUp();
        }
    }, 1000);
}

function updateTimer() {
    document.getElementById('timer').textContent = `Time: ${timeLeft}s`;
    if (timeLeft <= 5) {
        document.getElementById('timer').style.color = '#f44336';
    } else {
        document.getElementById('timer').style.color = '#ff4500';
    }
}

function showTimeoutAnimation() {
    const overlay = document.getElementById('timeout-overlay');
    const timeoutAnswer = document.getElementById('timeout-answer');
    const guessForm = document.getElementById('guess-form');
    const bananaEmoji = overlay.querySelector('.banana-emoji');
    const peel = overlay.querySelector('.peel');
    const monkeyEmoji = overlay.querySelector('.monkey-emoji');

    timeoutAnswer.textContent = solution;
    guessForm.querySelector('input').disabled = true;
    guessForm.querySelector('button').disabled = true;

    overlay.classList.remove('hidden');
    bananaEmoji.style.animation = 'none';
    peel.style.animation = 'none';
    monkeyEmoji.style.animation = 'none';
    void overlay.offsetHeight;
    bananaEmoji.style.animation = '';
    peel.style.animation = '';
    monkeyEmoji.style.animation = '';

    setTimeout(() => {
        overlay.classList.add('hidden');
        guessForm.querySelector('input').disabled = false;
        guessForm.querySelector('button').disabled = false;
        streak = 0;
        updateStreak();
        loadPuzzle();
    }, 3500);
}

function handleTimeUp() {
    showTimeoutAnimation();
}

async function loadPuzzle() {
    console.log('Loading puzzle...');
    document.getElementById('puzzle-image').classList.add('loading');
    document.getElementById('message').textContent = 'Loading puzzle...';
    document.getElementById('message').className = '';
    try {
        const response = await fetch('https://marcconrad.com/uob/banana/api.php?out=csv&base64=yes');
        console.log('Response status:', response.status);
        const data = await response.text();
        console.log('Data received:', data.substring(0, 100) + '...');
        const parts = data.split(',');
        console.log('Parts:', parts.length, parts[0].substring(0, 50) + '...', parts[1]);
        if (parts.length >= 2) {
            const imgElement = document.getElementById('puzzle-image');
            imgElement.src = 'data:image/png;base64,' + parts[0];
            solution = parseInt(parts[1]);
            console.log('Solution:', solution);

            imgElement.onload = function() {
                console.log('Image loaded successfully');
                document.getElementById('puzzle-image').classList.remove('loading');
                document.getElementById('message').textContent = '';
                startTimer();
            };

            imgElement.onerror = function() {
                console.error('Image failed to load');
                document.getElementById('message').textContent = 'Failed to load puzzle image.';
                document.getElementById('message').className = 'error';
            };
        } else {
            console.error('Invalid data format');
            document.getElementById('message').textContent = 'Failed to load puzzle.';
            document.getElementById('message').className = 'error';
        }
    } catch (error) {
        console.error('Error loading puzzle:', error);
        document.getElementById('message').textContent = 'Error loading puzzle.';
        document.getElementById('message').className = 'error';
    }
}

document.getElementById('guess-form').addEventListener('submit', function(e) {
    e.preventDefault();
    clearInterval(timer);
    const guess = parseInt(document.getElementById('guess').value);
    if (guess === solution) {
        score++;
        streak++;
        document.getElementById('message').textContent = '✅ Correct! New puzzle loaded.';
        document.getElementById('message').className = 'success';
        document.getElementById('score').textContent = score;
        updateStreak();
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('bananaBestScore', bestScore);
            document.getElementById('best-score').textContent = bestScore;
        }
        setTimeout(() => {
            loadPuzzle();
        }, 1500);
    } else {
        document.getElementById('message').textContent = `❌ Wrong! Answer was ${solution}`;
        document.getElementById('message').className = 'error';
        streak = 0;
        updateStreak();
        setTimeout(() => {
            loadPuzzle();
        }, 2000);
    }
    document.getElementById('guess').value = '';
});

function updateStreak() {
    document.getElementById('streak').textContent = streak;
}

document.getElementById('new-game-btn').addEventListener('click', function() {
    score = 0;
    streak = 0;
    document.getElementById('score').textContent = score;
    updateStreak();
    clearInterval(timer);
    loadPuzzle();
});

// Load initial puzzle
loadPuzzle();
