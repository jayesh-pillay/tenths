// profile.js

document.addEventListener('DOMContentLoaded', () => {

    // 1. Initial Profile Fetch to hydrate DOM
    fetch('api/get-profile.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const u = data.profile;
                const f = data.focus_time;

                // Sync Global Sidebar Elements
                const firstChar = u.username.charAt(0).toUpperCase();
                document.getElementById('nav-name').textContent = u.username;
                document.getElementById('nav-avatar').textContent = firstChar;
                if(document.getElementById('header-avatar')) {
                    document.getElementById('header-avatar').textContent = firstChar;
                }
                
                // Form Fields
                document.getElementById('input-username').value = u.username;
                document.getElementById('input-email').value = u.email;

                // Notifications States (boolean maps exactly to `.checked` param)
                document.getElementById('toggle-email').checked = u.notif_email_summary;
                document.getElementById('toggle-push').checked = u.notif_push;
                document.getElementById('toggle-tips').checked = u.notif_tips;



                // Focus Time Calculations Injection
                document.getElementById('fc-val').textContent = f.hours + ' hrs';
                document.getElementById('fc-desc').innerHTML = `You've reached <b>${f.percentage}%</b> of your monthly sanctuary goal.`;
                
                // Allow a small tick before sliding the progress animation physically for visual impact
                setTimeout(() => {
                    document.getElementById('fc-fill').style.width = f.percentage + '%';
                }, 200);

            } else {
                window.location.href = 'login.html';
            }
        })
        .catch(err => console.error(err));

    // 2. Form submission intercept: Update User Info
    document.getElementById('btn-save-profile').addEventListener('click', () => {
        const username = document.getElementById('input-username').value;
        const email = document.getElementById('input-email').value;
        const btn = document.getElementById('btn-save-profile');
        
        btn.textContent = 'Saving...';
        btn.style.opacity = '0.5';

        fetch('api/update-profile.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                // Update side panel globally
                const newChar = username.charAt(0).toUpperCase();
                document.getElementById('nav-name').textContent = username;
                document.getElementById('nav-avatar').textContent = newChar;
                if(document.getElementById('header-avatar')) {
                    document.getElementById('header-avatar').textContent = newChar;
                }
            } else {
                alert(data.message);
            }
        })
        .catch(() => alert('Network error'))
        .finally(() => {
            btn.textContent = 'Save Changes';
            btn.style.opacity = '1';
        });
    });

    // 3. Form submission intercept: Update Password
    document.getElementById('btn-update-pwd').addEventListener('click', () => {
        const curPwd = document.getElementById('input-cur-pwd');
        const newPwd = document.getElementById('input-new-pwd');
        const btn = document.getElementById('btn-update-pwd');

        if(newPwd.value.length < 8) {
            alert("New password must be strictly at least 8 characters long.");
            return;
        }

        btn.textContent = 'Authenticating...';
        btn.disabled = true;

        fetch('api/update-password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_password: curPwd.value,
                new_password: newPwd.value
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Password successfully changed.');
                curPwd.value = '';
                newPwd.value = '';
            } else {
                alert(data.message);
            }
        })
        .catch(() => alert('Network error'))
        .finally(() => {
            btn.textContent = 'Update Password';
            btn.disabled = false;
        });
    });

    // 4. Persistence bindings for generic UI toggles
    function syncSetting(key, val) {
        fetch('api/update-settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting_key: key, setting_value: val })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                window.notifier.path("Your path has been realigned. Keep ascending.");
            }
        })
        .catch(err => console.error('Failed silently persisting:', err));
    }

    document.getElementById('toggle-email').addEventListener('change', (e) => { syncSetting('notif_email_summary', e.target.checked); });
    document.getElementById('toggle-push').addEventListener('change', (e) => { syncSetting('notif_push', e.target.checked); });
    document.getElementById('toggle-tips').addEventListener('change', (e) => { syncSetting('notif_tips', e.target.checked); });

    // 5. Appearance section removed (requested by user)

    // 6. Sanctuary Modal Logic (Logout & Delete)
    const logoutBtn = document.getElementById('logout-btn');
    const deleteBtn = document.getElementById('btn-delete-account');
    const confirmModal = document.getElementById('confirm-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    let modalAction = 'logout'; // 'logout' or 'delete'

    function showModal(type) {
        modalAction = type;
        if (type === 'logout') {
            modalTitle.textContent = 'Wait...';
            modalMessage.textContent = 'Maybe you are a "quitter"?';
            modalCancel.textContent = "No, Let's Keep Going";
            modalConfirm.textContent = 'Yes, I Quit';
            modalConfirm.className = 'pm-btn pm-btn-quit';
        } else if (type === 'delete') {
            modalTitle.textContent = 'The Final Step';
            modalMessage.textContent = 'Do you want to delete the account forever?';
            modalCancel.textContent = "No, let's continue to grind";
            modalConfirm.textContent = 'Yes, adios!';
            modalConfirm.className = 'pm-btn pm-btn-quit'; // Keep same style for destructive
        }
        confirmModal.style.display = 'flex';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('logout');
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            showModal('delete');
        });
    }

    modalCancel.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });

    modalConfirm.addEventListener('click', () => {
        if (modalAction === 'logout') {
            window.location.href = 'api/logout.php';
        } else if (modalAction === 'delete') {
            modalConfirm.textContent = 'Purging...';
            modalConfirm.disabled = true;

            fetch('api/delete-account.php', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        // Redirect to index or signup
                        window.location.href = 'index.html';
                    } else {
                        alert(data.message);
                        confirmModal.style.display = 'none';
                    }
                })
                .catch(() => alert('Network error'))
                .finally(() => {
                    modalConfirm.textContent = 'Yes, adios!';
                    modalConfirm.disabled = false;
                });
        }
    });

    // Close on outside click
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) confirmModal.style.display = 'none';
    });

});
