
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
        if (user === '' || pass === '') {
            e.preventDefault();
            showInlineError('Please enter both username and password.');
            return;
        }
        
        e.preventDefault(); 
        
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
                    form.submit(); 
                }
            };
            setTimeout(tick, 300);
        } else {
            const btn = form.querySelector('button[type=submit]');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Logging in...';
            }
            form.submit();
        }
    });
});