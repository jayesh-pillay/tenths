document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    passwordInput.addEventListener('input', (e) => {
        const val = e.target.value;
        let strength = 0;

        // Simple strength calculation
        if (val.length > 0) strength += 20;
        if (val.length >= 8) strength += 20;
        if (/[A-Z]/.test(val)) strength += 20;
        if (/[0-9]/.test(val)) strength += 20;
        if (/[^A-Za-z0-9]/.test(val)) strength += 20;

        // UI Update
        strengthFill.style.width = `${strength}%`;

        if (strength === 0) {
            strengthFill.style.width = '0%';
            strengthText.textContent = 'STRENGTH: NONE';
            strengthFill.style.backgroundColor = '#E0E0E0';
        } else if (strength <= 40) {
            strengthText.textContent = 'STRENGTH: WEAK';
            strengthFill.style.backgroundColor = '#C25450';
            strengthText.style.color = '#C25450';
        } else if (strength <= 80) {
            strengthText.textContent = 'STRENGTH: GOOD';
            strengthFill.style.backgroundColor = '#D68A59';
            strengthText.style.color = '#D68A59';
        } else {
            strengthText.textContent = 'STRENGTH: STRONG';
            strengthFill.style.backgroundColor = '#795A54';
            strengthText.style.color = '#795A54';
        }
    });

    // Handle form submission properly using fetch API
    const form = document.getElementById('signup-form');
    let errorDiv = document.getElementById('signup-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'signup-error';
        errorDiv.style.color = '#C25450';
        errorDiv.style.fontSize = '0.85rem';
        errorDiv.style.display = 'none';
        form.insertBefore(errorDiv, form.querySelector('.btn-submit'));
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn-submit');
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm-password').value;
        
        if (password !== confirm) {
            errorDiv.textContent = 'Passwords do not match.';
            errorDiv.style.display = 'block';
            return;
        }

        const originalText = btn.textContent;
        btn.textContent = 'Creating account...';
        btn.style.opacity = '0.8';
        errorDiv.style.display = 'none';
        
        try {
            const response = await fetch('api/signup.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                btn.textContent = 'Welcome to Tenth\'s!';
                btn.style.backgroundColor = '#6A9B7E';
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                throw new Error(data.message);
            }
        } catch(err) {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
            btn.style.opacity = '1';
            errorDiv.textContent = err.message || 'Error communicating with server.';
            errorDiv.style.display = 'block';
        }
    });
});

// Globally exposed Javascript callback required by Google Identity Services payload execution
window.handleCredentialResponse = async (response) => {
    let errorDiv = document.getElementById('signup-error');
    if(!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'signup-error';
        errorDiv.style.color = '#C25450';
        errorDiv.style.fontSize = '0.85rem';
        document.getElementById('signup-form').insertBefore(errorDiv, document.querySelector('.btn-submit'));
    }

    try {
        const fetchResp = await fetch('api/google-auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });
        
        const data = await fetchResp.json();
        
        if (data.status === 'success') {
            window.location.href = 'dashboard.html';
        } else {
            throw new Error(data.message);
        }
    } catch(err) {
        errorDiv.textContent = err.message || 'Google Auth Synchronization Failed.';
        errorDiv.style.display = 'block';
    }
};
