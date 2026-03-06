// auth/signup.js
window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        const user = form.querySelector('[name=username]').value.trim();
        const pass = form.querySelector('[name=password]').value;
        const conf = form.querySelector('[name=confirm]').value;
        if (user === '' || pass === '') {
            e.preventDefault();
            alert('Please fill in all fields');
        } else if (pass !== conf) {
            e.preventDefault();
            alert('Passwords must match');
        }
    });
});