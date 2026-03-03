document.getElementById('signup-form').addEventListener('submit', function (event) {
    event.preventDefault();  // Prevent the form from submitting

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Simple validation for the signup
    if (username === "" || password === "") {
        alert("Please enter both username and password.");
    } else {
        fetch('signup.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                username: username,
                password: password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Sign up successful! Please log in.");
                window.location.href = "login.html";
            } else {
                alert("Sign up failed: " + (data.message || "Unknown error"));
            }
        })
        .catch(() => {
            alert("An error occurred while signing up.");
        });
    }
});