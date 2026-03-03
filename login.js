document.getElementById('login-form').addEventListener('submit', function (event) {
    event.preventDefault();  // Prevent default form submission

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Send the form data to the PHP backend using Fetch
    fetch('login.php', {
        method: 'POST',
        body: new URLSearchParams({
            'username': username,
            'password': password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            alert('Login failed: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(() => {
        alert('An error occurred while logging in.');
    });
});