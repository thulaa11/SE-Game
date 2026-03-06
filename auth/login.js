// auth/login.js
// basic client-side validation/example

window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        const user = form.querySelector('[name=username]').value.trim();
        const pass = form.querySelector('[name=password]').value;
        if (user === '' || pass === '') {
            e.preventDefault();
            alert('Please fill both fields');
        }
    });
});