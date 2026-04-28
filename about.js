// about.js

document.addEventListener('DOMContentLoaded', () => {

    // Premium Logout Modal Logic (Sanctuary Standard)
    const logoutBtn = document.getElementById('logout-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    if (logoutBtn && confirmModal) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            confirmModal.style.display = 'flex';
        });

        modalCancel.addEventListener('click', () => {
            confirmModal.style.display = 'none';
        });

        modalConfirm.addEventListener('click', () => {
            window.location.href = 'api/logout.php';
        });

        // Close on outside click
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) confirmModal.style.display = 'none';
        });
    }

    // 1. Initially Hydrate Sidebar and form defaults
    fetch('api/get-profile.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const u = data.profile;
                document.getElementById('nav-name').textContent = u.username;
                
                // Sidebar Avatar fix for standard Tenth's sidebar
                const avatar = document.getElementById('nav-avatar');
                if (avatar) avatar.textContent = u.username.charAt(0).toUpperCase();
                
                // Pre-fill feedback form with user data for a smoother experience
                const nameInput = document.getElementById('fb-name');
                const emailInput = document.getElementById('fb-email');
                if(!nameInput.value) nameInput.value = u.username;
                if(!emailInput.value) emailInput.value = u.email;
            } else {
                // Not strictly throwing to login because Help pages could theoretically be public,
                // but for this app architecture, redirect back to index.
                window.location.href = 'index.html';
            }
        })
        .catch(err => console.error(err));

    // 2. Form Interception Logic
    const form = document.getElementById('feedback-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('fb-submit');
        const ogText = btn.textContent;
        
        btn.textContent = 'Transmitting...';
        btn.disabled = true;
        
        const payload = {
            full_name: document.getElementById('fb-name').value,
            email: document.getElementById('fb-email').value,
            category: document.getElementById('fb-category').value,
            message: document.getElementById('fb-message').value
        };
        
        fetch('api/feedback.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert(data.message);
                // Clear out the message block so it feels officially "Sent"
                document.getElementById('fb-message').value = ''; 
                // Restore defaults on Category
                document.getElementById('fb-category').selectedIndex = 0;
            } else {
                alert(data.message);
            }
        })
        .catch(() => alert('Failed to connect to Tenths servers. Try again.'))
        .finally(() => {
            btn.textContent = ogText;
            btn.disabled = false;
        });
    });

    // 3. Handle Hash Navigation for Nested Scroll Container
    const scrollToHash = () => {
        const hash = window.location.hash;
        if (hash) {
            const target = document.querySelector(hash);
            if (target) {
                const scrollContainer = document.querySelector('.dashboard-main');
                if (scrollContainer) {
                    setTimeout(() => {
                        scrollContainer.scrollTo({
                            top: target.offsetTop - 40,
                            behavior: 'smooth'
                        });
                    }, 150);
                }
            }
        }
    };
    
    // Execute on initial page load if hash exists
    scrollToHash();
    
    // Execute when link is clicked from within the same page
    window.addEventListener('hashchange', scrollToHash);

});
