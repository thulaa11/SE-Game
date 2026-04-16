window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    if (!form) return;
    const inlineError = document.getElementById('auth-inline-error');

    function showInlineError(message) {
        if (inlineError) inlineError.textContent = message;
    }

    form.addEventListener('submit', (e) => {
        showInlineError('');
        const user = form.querySelector('[name=username]').value.trim();
        const pass = form.querySelector('[name=password]').value;
        const conf = form.querySelector('[name=confirm]').value;
        if (user === '' || pass === '') {
            e.preventDefault();
            showInlineError('Please fill in all fields.');
        } else if (pass !== conf) {
            e.preventDefault();
            showInlineError('Passwords must match.');
        } else if (pass.length < 6) {
            e.preventDefault();
            showInlineError('Use at least 6 characters for password.');
        }
    });
});