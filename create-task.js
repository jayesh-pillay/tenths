document.addEventListener('DOMContentLoaded', () => {

    // Global UX constraint: Auto-capitalize strictly the first letter of text inputs natively
    document.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.target.type !== 'email' && e.target.type !== 'password' && e.target.type !== 'date' && e.target.type !== 'number') {
                const val = e.target.value;
                if (val.length > 0) {
                    const firstChar = val.charAt(0);
                    // If the first character is lowercase physical letter, force it up
                    if (firstChar >= 'a' && firstChar <= 'z') {
                        // Quick swap to prevent heavy cursor jump destruction
                        const selStart = e.target.selectionStart;
                        const selEnd = e.target.selectionEnd;
                        e.target.value = firstChar.toUpperCase() + val.slice(1);
                        e.target.setSelectionRange(selStart, selEnd);
                    }
                }
            }
        }
    });

    // Global UX constraint: Allow up/down arrows to traverse fields directly
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
                // Ignore selects/numbers natively as arrow keys manipulate their values internally
                if (active.tagName === 'SELECT' || active.type === 'number' || active.type === 'date') {
                    return;
                }
                
                // Allow multiline textareas to move cursors until very top/bottom if needed? 
                // Opted strictly to jump fields on first press to honor request precisely.
                e.preventDefault();
                
                // Grapple all interactive form flows organically down the DOM
                const interactables = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"]'));
                const currentIndex = interactables.indexOf(active);
                
                if (currentIndex > -1) {
                    const nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
                    if (nextIndex >= 0 && nextIndex < interactables.length) {
                        interactables[nextIndex].focus();
                    }
                }
            }
        }
    });
    
    // Attempt to grab username from session lightly to populate avatar (optional luxury UX)
    fetch('api/dashboard.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const name = data.data.user.name;
                document.getElementById('nav-avatar').textContent = name.charAt(0).toUpperCase();
            }
        })
        .catch(err => console.log('Not logged in or error loading avatar.', err));

    const measuringSelect = document.getElementById('task-measuring');
    const otherGroup = document.getElementById('other-measuring-group');
    const totalCountInput = document.getElementById('task-total-count');
    const breakdownSection = document.getElementById('breakdown-section');
    const breakdownWrapper = document.getElementById('breakdown-wrapper');

    // 1. Handle "Other" dropdown reveal
    measuringSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Other') {
            otherGroup.style.display = 'block';
            document.getElementById('task-measuring-other').required = true;
        } else {
            otherGroup.style.display = 'none';
            document.getElementById('task-measuring-other').required = false;
        }
        updateBreakdownLabels(); // Updates placeholder text dynamically based on what we are measuring
    });

    // 2. Handle dynamic Breakdown spawning
    totalCountInput.addEventListener('input', (e) => {
        let count = parseInt(e.target.value, 10);
        
        // Boundaries
        if (isNaN(count) || count < 0) count = 0;
        if (count > 12) {
            count = 12;
            e.target.value = 12; // Force UI visual sync
        }

        if (count > 0) {
            breakdownSection.style.display = 'block';
        } else {
            breakdownSection.style.display = 'none';
        }

        generateBreakdownInputs(count);
    });

    function getUnitLabel() {
        if (measuringSelect.value === 'Other') {
            const custom = document.getElementById('task-measuring-other').value.trim();
            return custom ? custom : 'Item';
        }
        return measuringSelect.value.slice(0, -1); // e.g., "Subjects" -> "Subject"
    }

    // Refresh labels when typing in the 'Other' box
    document.getElementById('task-measuring-other').addEventListener('input', updateBreakdownLabels);

    function updateBreakdownLabels() {
        const unitLabel = getUnitLabel();
        const items = document.querySelectorAll('.breakdown-item');
        items.forEach((item, index) => {
            const nameInput = item.querySelector('.b-name');
            nameInput.placeholder = `${unitLabel} Name (e.g. Maths)`;
        });
    }

    function generateBreakdownInputs(count) {
        const unitLabel = getUnitLabel();
        const existingItems = document.querySelectorAll('.breakdown-item');
        const currentCount = existingItems.length;

        if (count > currentCount) {
            // Inject new DOM siblings safely without destroying existing inputs
            for (let i = currentCount + 1; i <= count; i++) {
                const itemHTML = `
                    <div class="breakdown-item" data-index="${i}">
                        <div class="breakdown-circle">${i}</div>
                        <div class="breakdown-inputs">
                            <input type="text" class="ct-input b-name" placeholder="${unitLabel} Name (e.g. Maths)" required>
                            <input type="text" class="ct-input b-min-target" placeholder="Min Target (e.g. 2 chpts)">
                            <input type="text" class="ct-input b-target" placeholder="Target (e.g. 4 chapters)" required>
                        </div>
                    </div>
                `;
                breakdownWrapper.insertAdjacentHTML('beforeend', itemHTML);
            }
        } else if (count < currentCount) {
            // Remove strict overflow elements from the tail
            for (let i = currentCount; i > count; i--) {
                existingItems[i - 1].remove();
            }
        }
        
        // Re-flush string placehoder tags for global uniformity
        updateBreakdownLabels();
    }

    // --- INTELLIGENT AUTO-DETECTION (Silent Mode) ---
    const taskHeading = document.getElementById('task-heading');
    const taskDeadline = document.getElementById('task-deadline');
    let activeCategory = "Personal Task"; 

    const intelligenceMap = {
        'Fitness': { keywords: ['gym', 'workout', 'exercise', 'run', 'training', 'cardio', 'strength', 'fitness', 'lifting', 'sport'] },
        'Finance': { keywords: ['save', 'budget', 'money', 'invest', 'spending', 'bills', 'finance', 'trading', 'bank', 'stocks'] },
        'Studies': { keywords: ['study', 'exam', 'syllabus', 'chapter', 'lesson', 'revision', 'read', 'math', 'prep', 'homework', 'learning'] },
        'Health': { keywords: ['diet', 'nutrition', 'sleep', 'wellness', 'meditation', 'mental', 'health', 'yoga', 'hospital', 'doctor'] },
        'Hair Care': { keywords: ['hair', 'treatment', 'salon', 'cut', 'style', 'shampoo', 'grooming'] },
        'Work': { keywords: ['project', 'meeting', 'presentation', 'email', 'coding', 'design', 'client', 'deadline', 'work', 'job'] }
    };

    function updateDetectedCategory() {
        const title = taskHeading.value.toLowerCase();
        let found = false;

        for (const [cat, data] of Object.entries(intelligenceMap)) {
            if (data.keywords.some(k => title.includes(k))) {
                activeCategory = cat;
                found = true;
                break;
            }
        }
        if (!found) activeCategory = "Personal Task";
    }

    taskHeading.addEventListener('input', updateDetectedCategory);

    // 3. Handle Form Submission
    document.getElementById('create-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('submit-btn');
        const errorDiv = document.getElementById('form-error');
        
        btn.textContent = 'Creating...';
        btn.style.opacity = '0.7';
        errorDiv.style.display = 'none';

        try {
            // Gather parent task data
            const payload = {
                title: document.getElementById('task-heading').value,
                description: document.getElementById('task-description').value,
                measuring_type: measuringSelect.value,
                measuring_other: document.getElementById('task-measuring-other').value,
                total_count: parseInt(totalCountInput.value, 10),
                due_date: document.getElementById('task-deadline').value,
                category: activeCategory, // Use the correct variable
                breakdowns: []
            };

            // Gather breakdown data
            const breakdownItems = document.querySelectorAll('.breakdown-item');
            for (const item of breakdownItems) {
                const index = parseInt(item.getAttribute('data-index'), 10);
                const bTitle = item.querySelector('.b-name').value;
                const minTargetVal = item.querySelector('.b-min-target').value;
                const targetVal = item.querySelector('.b-target').value;
                
                // Numerical validation: Ensuring Min Target isn't greater than Total Target
                const extractNum = (str) => {
                    const m = str.match(/\d+/g);
                    return m ? parseInt(m.join(''), 10) : 0;
                };

                const minNum = extractNum(minTargetVal);
                const targetNum = extractNum(targetVal);

                if (minNum > targetNum && targetNum > 0) {
                    btn.textContent = 'Create Task';
                    btn.style.opacity = '1';
                    errorDiv.textContent = `Error in "${bTitle}": Minimum target (${minTargetVal}) cannot be more than total target (${targetVal}).`;
                    errorDiv.style.display = 'block';
                    return; // Stop execution
                }

                payload.breakdowns.push({
                    step_index: index,
                    title: bTitle,
                    min_target_val: minTargetVal,
                    target_val: targetVal
                });
            }

            const response = await fetch('api/create-task.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.status === 'success') {
                // Task created! Redirect with new=1 flag for summit notification
                window.location.href = 'task-view.html?id=' + data.task_id + '&new=1';
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            btn.textContent = 'Create Task';
            btn.style.opacity = '1';
            errorDiv.textContent = err.message || 'Failed to connect to server.';
            errorDiv.style.display = 'block';
        }
    });

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
