let score = 0;
let bestScore = 0;
let currentEquation = { text: '', correctAnswer: 0 };
let currentDifficulty = 'easy';
let timeLeft = 0;
let timerInterval = null;

function setDifficultyFromUI() {
    const select = document.getElementById('difficulty');
    if (select) {
        currentDifficulty = select.value;
    }
}

function startTimer() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    if (currentDifficulty === 'easy') {
        timeLeft = 20;
    } else if (currentDifficulty === 'medium') {
        timeLeft = 15;
    } else {
        timeLeft = 10;
    }

    timerElement.innerText = `Time: ${timeLeft}`;

    timerInterval = setInterval(() => {
        timeLeft -= 1;
        timerElement.innerText = `Time: ${timeLeft}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert('Time is up! New question.');
            generateNewEquation();
        }
    }, 1000);
}

function generateNewEquation() {
    setDifficultyFromUI();

    let min = 1;
    let max = 10;
    let operations = ['+'];

    if (currentDifficulty === 'medium') {
        max = 20;
        operations = ['+', '-'];
    } else if (currentDifficulty === 'hard') {
        max = 50;
        operations = ['+', '-', '*'];
    }

    const num1 = Math.floor(Math.random() * (max - min + 1)) + min;
    const num2 = Math.floor(Math.random() * (max - min + 1)) + min;
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let correctAnswer;
    let text;
    if (operation === '+') {
        correctAnswer = num1 + num2;
        text = `${num1} + ${num2} = ?`;
    } else if (operation === '-') {
        correctAnswer = num1 - num2;
        text = `${num1} - ${num2} = ?`;
    } else {
        correctAnswer = num1 * num2;
        text = `${num1} × ${num2} = ?`;
    }

    currentEquation = { text, correctAnswer };

    const equationElement = document.getElementById('equation');
    if (equationElement) {
        equationElement.innerText = currentEquation.text;
    }

    const answerInput = document.getElementById('answer');
    if (answerInput) {
        answerInput.value = '';
        answerInput.focus();
    }

    const bananaImage = document.getElementById('banana-image');
    if (bananaImage) {
        bananaImage.src = getRandomBananaImage();
    }

    startTimer();
}

function getRandomBananaImage() {
    const images = ['assets/banana1.png', 'assets/banana2.png', 'assets/banana3.png'];
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
}

function updateScoreUI() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.innerText = `Score: ${score}`;
    }

    const bestScoreElement = document.getElementById('best-score');
    if (bestScoreElement) {
        bestScoreElement.innerText = `Best score: ${bestScore}`;
    }
}

function checkAnswer() {
    const answerInput = document.getElementById('answer');
    if (!answerInput) return;

    const answer = parseInt(answerInput.value, 10);
    if (isNaN(answer)) {
        alert('Please enter a number.');
        return;
    }

    if (answer === currentEquation.correctAnswer) {
        score++;
        alert('Correct!');
        saveScoreToServer();
        generateNewEquation();
    } else {
        alert(`Wrong! The correct answer was ${currentEquation.correctAnswer}.`);
        generateNewEquation();
    }

    updateScoreUI();
}

function saveScoreToServer() {
    fetch('save_score.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            score: score,
            difficulty: currentDifficulty,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.bestScore !== undefined) {
                bestScore = data.bestScore;
                updateScoreUI();
            }
        })
        .catch(() => {
            // Ignore errors for now (e.g., not logged in)
        });
}

function loadUserInfoAndBestScore() {
    fetch('me.php')
        .then((response) => response.json())
        .then((data) => {
            const userInfoElement = document.getElementById('user-info');
            if (userInfoElement) {
                if (data.loggedIn) {
                    userInfoElement.innerText = `Logged in as: ${data.username}`;
                } else {
                    userInfoElement.innerHTML = 'Not logged in. <a href="login.html">Login</a>';
                }
            }
        })
        .catch(() => {});

    fetch('get_best_score.php')
        .then((response) => response.json())
        .then((data) => {
            if (data.bestScore !== undefined) {
                bestScore = data.bestScore;
                updateScoreUI();
            }
        })
        .catch(() => {});
}

window.onload = function () {
    const submitButton = document.getElementById('submit-answer');
    if (submitButton) {
        submitButton.addEventListener('click', checkAnswer);
    }

    const difficultySelect = document.getElementById('difficulty');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', () => {
            score = 0;
            updateScoreUI();
            generateNewEquation();
        });
    }

    loadUserInfoAndBestScore();
    generateNewEquation();
    updateScoreUI();
};