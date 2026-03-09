// auth/login.js
// client-side validation and dynamic loading on submit

window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        const user = form.querySelector('[name=username]').value.trim();
        const pass = form.querySelector('[name=password]').value;
        if (user === '' || pass === '') {
            e.preventDefault();
            alert('Please fill both fields');
            return;
        }
        
        // Dynamic loading screen while submitting
        e.preventDefault(); // Pause submission
        
        const authShell = document.querySelector('.auth-shell');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (authShell && loadingScreen) {
            authShell.style.display = 'none';
            loadingScreen.classList.remove('hidden');
            
            const progress = document.getElementById('loading-progress');
            const status = document.getElementById('loading-status');
            
            const steps = [
                { p: 20, msg: 'Authenticating...' },
                { p: 50, msg: 'Verifying credentials...' },
                { p: 80, msg: 'Loading dashboard...' },
                { p: 100, msg: 'Welcome back!' },
            ];
            
            let i = 0;
            const tick = () => {
                if (i < steps.length) {
                    if (progress) progress.style.width = steps[i].p + '%';
                    if (status) status.textContent = steps[i].msg;
                    i++;
                    setTimeout(tick, 400);
                } else {
                    form.submit(); // Actually submit the form
                }
            };
            setTimeout(tick, 300);
        } else {
            // Fallback if elements not found
            const btn = form.querySelector('button[type=submit]');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Logging in...';
            }
            form.submit();
        }
    });
});