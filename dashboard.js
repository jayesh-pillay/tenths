document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('api/dashboard.php');
        const result = await response.json();
        
        if (result.status === 'success') {
            const data = result.data;
            
            // Populate Welcome
            document.getElementById('welcome-name').textContent = data.user.name;
            document.getElementById('nav-name').textContent = data.user.name;
            document.getElementById('nav-avatar').textContent = data.user.name.charAt(0).toUpperCase();
            
            // Request 2: Urgent Task Text
            document.getElementById('urgent-task-text').textContent = data.urgent_text;
            
            // Request 3: Dynamic Motivation
            document.getElementById('motivation-text').textContent = data.motivation;
            
            // Stats
            document.getElementById('total-tasks-count').textContent = data.stats.total;
            document.getElementById('completed-tasks-count').textContent = data.stats.completed;
            document.getElementById('completion-percentage').textContent = data.stats.percentage + '%';
            
            // In Progress List rendering
            const inProgressList = document.getElementById('in-progress-list');
            inProgressList.innerHTML = '';
            
            if (data.in_progress && data.in_progress.length > 0) {
                data.in_progress.forEach(task => {
                    inProgressList.innerHTML += `
                        <div class="task-item-card" onclick="window.location.href='task-view.html?id=${task.id}'" style="cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div class="task-tag-row">
                                <span class="task-tag">${task.category}</span>
                                <span class="task-pct">${task.progress}%</span>
                            </div>
                            <div class="task-title-area">
                                <h3 class="task-title">${task.title}</h3>
                            </div>
                            <div class="task-bar-bg">
                                <div class="task-bar-fill" style="width: ${task.progress}%;"></div>
                            </div>
                        </div>
                    `;
                });
            } else {
                inProgressList.innerHTML = '<p class="task-subtitle" style="margin-top:1rem;">No tasks currently in progress. Great job!</p>';
            }
            
            // Deadlines List rendering
            const deadlinesList = document.getElementById('deadlines-list');
            deadlinesList.innerHTML = '';
            
            if (data.deadlines && data.deadlines.length > 0) {
                data.deadlines.forEach(task => {
                    const dateObj = new Date(task.due_date);
                    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                    const day = dateObj.getDate();
                    const tagStyle = task.time_left_str && parseInt(task.time_left_str) < 3 ? 'red' : '';
                    
                    deadlinesList.innerHTML += `
                        <div class="task-item-card deadline-item-card" onclick="window.location.href='task-view.html?id=${task.id}'" style="cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div class="deadline-date-box">
                                <span class="d-month">${month}</span>
                                <span class="d-day">${day}</span>
                            </div>
                            <div class="deadline-content">
                                <div class="task-tag-row" style="justify-content:space-between; width:100%; margin-bottom: 0.25rem;">
                                    <h3 class="task-title">${task.title}</h3>
                                    <span class="task-tag ${tagStyle}">${task.time_left_str || 'PENDING'}</span>
                                </div>
                                <p class="task-subtitle">${task.category} Milestone</p>
                            </div>
                        </div>
                    `;
                });
            } else {
                deadlinesList.innerHTML = '<p class="task-subtitle" style="margin-top:1rem;">No upcoming deadlines found.</p>';
            }

            // Sanctuary Tips Engine
            if (data.notif_tips) {
                renderSanctuaryTip();
            }

        } else {
            console.error("Dashboard Auth Error: ", result.message);
            // If unauthorized, redirect to login
            if(result.message === 'Unauthorized') {
               window.location.href = 'login.html';
            }
        }
    } catch (err) {
        console.error("Failed to fetch dashboard: ", err);
    }

    function renderSanctuaryTip() {
        const tips = [
            "Your path to the summit is unique. Focus on the next ten percent.",
            "Rest at the plateau, but don't camp there. Keep climbing.",
            "The clearest view is reserved for those who persevere through the mist.",
            "Consistence is the gear that conquers the steepest inclines.",
            "One step at a time, one milestone at a time. The summit is inevitable."
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        const container = document.getElementById('sanctuary-tip-container');
        
        container.innerHTML = `
            <div class="sanctuary-tip-card">
                <div class="tip-header">
                    <span class="tip-label">SANCTUARY INSIGHT</span>
                    <button class="tip-dismiss" onclick="this.closest('.sanctuary-tip-card').style.opacity='0'; setTimeout(()=>this.closest('#sanctuary-tip-container').style.display='none', 300)">&times;</button>
                </div>
                <p class="tip-text">${randomTip}</p>
            </div>
        `;
        container.style.display = 'block';
    }
    
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
});
