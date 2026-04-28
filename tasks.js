// tasks.js - Logic for fetching, grouping, filtering, and deleting Tasks

document.addEventListener('DOMContentLoaded', () => {
    
    // Global State
    let allTasks = [];
    let currentFilter = 'ALL';
    let currentSort = 'deadline';
    let selectedTaskIds = new Set();

    // DOM Elements
    const gridEl = document.getElementById('tasks-grid');
    const emptyStateEl = document.getElementById('empty-state');
    const selectAllCb = document.getElementById('select-all');
    const bulkDeleteBtn = document.getElementById('bulk-delete');
    const bulkArchiveBtn = document.getElementById('bulk-archive');
    const sortSelect = document.getElementById('sort-select');

    // Modal Elements
    const modal = document.getElementById('confirm-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const logoutBtn = document.getElementById('logout-btn');

    let modalCallback = null;

    // 1. Initial Profile Fetch
    fetch('api/dashboard.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const name = data.data.user.name;
                document.getElementById('nav-avatar').textContent = name.charAt(0).toUpperCase();
                document.getElementById('nav-name').textContent = name;
            } else {
                window.location.href = 'login.html';
            }
        })
        .catch(err => console.error(err));

    // 2. Fetch Tasks Payload
    function fetchTasks() {
        fetch('api/tasks.php')
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    allTasks = data.tasks;
                    renderGrid();
                } else {
                    console.error("Failed to load tasks:", data.message);
                }
            })
            .catch(err => {
                console.error('API Error:', err);
            });
    }

    // 3. Render Engine
    function renderGrid() {
        gridEl.innerHTML = '';
        selectedTaskIds.clear();
        updateBulkUI();
        selectAllCb.checked = false;

        // Apply Filter
        let filteredTasks = allTasks.filter(t => {
            if (currentFilter === 'ARCHIVED') {
                return t.archived == 1;
            }
            // By default, only show non-archived tasks in other filters
            if (t.archived == 1) return false;
            
            if (currentFilter === 'ALL') return true;
            return t.status === currentFilter;
        });

        // Apply Sort
        filteredTasks.sort((a, b) => {
            if (currentSort === 'deadline') {
                return new Date(a.due_date) - new Date(b.due_date);
            } else if (currentSort === 'asc') {
                return a.title.localeCompare(b.title);
            } else if (currentSort === 'progress') {
                return b.progress - a.progress;
            }
            return 0;
        });

        if (filteredTasks.length === 0) {
            emptyStateEl.style.display = 'block';
            return;
        } else {
            emptyStateEl.style.display = 'none';
        }

        // Generate Cards
        filteredTasks.forEach(task => {
            const isCompleted = task.status === 'COMPLETED';
            const badgeClass = `badge-${task.status.toLowerCase().replace(' ', '-')}`;
            const isArchived = task.archived == 1;
            
            const card = document.createElement('div');
            card.className = `task-card ${isCompleted ? 'is-completed' : ''}`;
            
            // NEW: Entire card is clickable
            card.addEventListener('click', (e) => {
                // Ignore if clicking checkbox or action buttons
                if (e.target.closest('.checkbox-wrapper') || e.target.closest('.ca-btn')) {
                    return;
                }
                window.location.href = `task-view.html?id=${task.id}`;
            });
            
            const cardHTML = `
                <div class="card-top">
                    <!-- Dynamic Badge -->
                    <div class="card-badge ${badgeClass}">${task.status}</div>
                    <!-- Checkbox Checkmark -->
                    <div class="checkbox-wrapper">
                        <input type="checkbox" class="task-checkbox" data-id="${task.id}">
                        <span class="checkmark"></span>
                    </div>
                </div>
                
                <h3 class="card-title">${task.title}</h3>
                <div class="card-desc">${task.description}</div>
                
                <div class="card-progress-zone">
                    <div class="cp-labels">
                        <span class="cp-title">PROGRESS</span>
                        <span class="cp-pct">${task.progress}%</span>
                    </div>
                    <div class="cp-track">
                        <div class="cp-fill" style="width: ${task.progress}%"></div>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="card-date">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${task.due_date_formatted}
                    </div>
                    <div class="card-actions">
                        <button class="ca-btn" onclick="openUpdate(${task.id})" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                        <button class="ca-btn" onclick="triggerArchive(${task.id}, ${!isArchived})" title="${isArchived ? 'Unarchive' : 'Archive'}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                        </button>
                        <button class="ca-btn del-btn" onclick="triggerDelete(${task.id})" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                </div>
            `;
            
            card.innerHTML = cardHTML;
            gridEl.appendChild(card);
        });

        attachCheckboxListeners();
    }

    // Global Modal Trigger
    function showConfirmModal(title, msg, confirmText, cancelText, onConfirm) {
        modalTitle.textContent = title;
        modalMessage.textContent = msg;
        modalConfirmBtn.textContent = confirmText;
        modalCancelBtn.textContent = cancelText;
        modalCallback = onConfirm;
        modal.style.display = 'flex';
    }

    modalCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modalCallback = null;
    });

    modalConfirmBtn.addEventListener('click', () => {
        if (modalCallback) modalCallback();
        modal.style.display = 'none';
    });

    // Logout Modal
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showConfirmModal(
            "Wait...", 
            "Maybe you are a \"quitter\"?", 
            "Yes, I Quit", 
            "No, Let's Keep Going", 
            () => { window.location.href = 'login.html'; }
        );
    });

    // Action Handlers
    window.openUpdate = function(id) {
        window.location.href = `update-task.html?id=${id}`;
    };

    window.triggerDelete = function(id) {
        showConfirmModal(
            "Careful!",
            "Are you sure you want to permanently erase this task from your sanctuary?",
            "Delete Forever",
            "Keep It",
            () => executeDelete([id.toString()])
        );
    };

    window.triggerArchive = function(id, state = true) {
        const title = state ? "Archive Task?" : "Unarchive Task?";
        const msg = state ? "Move this task to your history to keep your sanctuary clean." : "Bring this task back to your active list.";
        showConfirmModal(
            title,
            msg,
            state ? "Archive" : "Unarchive",
            "Nevermind",
            () => executeArchive([id.toString()], state)
        );
    };

    // 4. UI Filters Logic
    const pills = document.querySelectorAll('.pill');
    pills.forEach(p => {
        p.addEventListener('click', () => {
            pills.forEach(i => i.classList.remove('active'));
            p.classList.add('active');
            currentFilter = p.getAttribute('data-filter');
            renderGrid();
        });
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderGrid();
    });

    // 5. Select All & Checkbox Logic
    selectAllCb.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.task-checkbox');
        const isChecked = e.target.checked;
        selectedTaskIds.clear();

        checkboxes.forEach(cb => {
            cb.checked = isChecked;
            if (isChecked) {
                selectedTaskIds.add(cb.getAttribute('data-id'));
            }
        });
        updateBulkUI();
    });

    function attachCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.task-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                if (e.target.checked) {
                    selectedTaskIds.add(id);
                } else {
                    selectedTaskIds.delete(id);
                }
                selectAllCb.checked = (selectedTaskIds.size === checkboxes.length && checkboxes.length > 0);
                updateBulkUI();
            });
        });
    }

    function updateBulkUI() {
        const hasSelection = selectedTaskIds.size > 0;
        bulkDeleteBtn.disabled = !hasSelection;
        bulkArchiveBtn.disabled = !hasSelection;
    }

    // Bulk Handlers
    bulkDeleteBtn.addEventListener('click', () => {
        if(selectedTaskIds.size === 0) return;
        showConfirmModal(
            "Delete Bulk?",
            `Are you sure you want to permanently erase ${selectedTaskIds.size} tasks?`,
            "Delete All",
            "Keep Them",
            () => executeDelete(Array.from(selectedTaskIds))
        );
    });

    bulkArchiveBtn.addEventListener('click', () => {
        if(selectedTaskIds.size === 0) return;
        const state = currentFilter !== 'ARCHIVED';
        showConfirmModal(
            state ? "Archive Selection?" : "Unarchive Selection?",
            `Update history status for ${selectedTaskIds.size} tasks.`,
            state ? "Archive All" : "Restore All",
            "Cancel",
            () => executeArchive(Array.from(selectedTaskIds), state)
        );
    });

    function executeArchive(idArray, state) {
        fetch('api/archive-task.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idArray, archive: state })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') fetchTasks();
            else alert(data.message);
        });
    }

    function executeDelete(idArray) {
        fetch('api/delete-task.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idArray })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') fetchTasks();
            else alert(data.message);
        });
    }

    // Init
    fetchTasks();
});
