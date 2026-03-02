let score = 0;
let currentGame = 'assets/tomato1.png';  // Static starting image

// Function to update the score
function updateScore() {
    document.getElementById('score').innerText = 'Score: ' + score;
}

// Function to create number buttons (0-9)
function createButtons() {
    const buttonContainer = document.getElementById('buttons');
    for (let i = 0; i < 10; i++) {
        const button = document.createElement('button');
        button.textContent = i;  // Set button text to the number
        button.onclick = () => checkAnswer(i);  // Call checkAnswer when clicked
        buttonContainer.appendChild(button);
    }
}

// Function to check if the player's answer is correct
function checkAnswer(answer) {
    const correct = (answer === 1);  // Simple logic: the correct answer is 1
    if (correct) {
        score++;  // Increase score for correct answer
        alert('Correct!');
        updateScore();
        changeImage();  // Change the image for the next round
    } else {
        alert('Wrong! Try again.');
    }
}

// Function to change the game image (this is a static image for now)
function changeImage() {
    const newImage = (currentGame === 'assets/tomato1.png') ? 'assets/tomato2.png' : 'assets/tomato1.png';
    currentGame = newImage;
    document.getElementById('tomato-image').src = currentGame;
}

// Initialize the game when the page loads
function initGame() {
    createButtons();  // Create number buttons
    updateScore();    // Initialize the score
}

window.onload = initGame;  // Start the game when the page is loaded