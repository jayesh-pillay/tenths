document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');

    if (!taskId) {
        document.getElementById('error-container').innerText = "No Task ID provided.";
        document.getElementById('error-container').style.display = 'block';
        return;
    }

    let nextNewId = 1;

    // Fetch Avatar
    fetch('api/dashboard.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const name = data.data.user.name;
                document.getElementById('nav-avatar').textContent = name.charAt(0).toUpperCase();
                document.getElementById('nav-name').textContent = name;
            }
        });

    function loadTaskData() {
        fetch(`api/task-view.php?id=${taskId}`)
            .then(res => res.json())
            .then(data => {
                if(data.status === 'error') {
                    document.getElementById('error-container').innerText = data.message;
                    document.getElementById('error-container').style.display = 'block';
                    return;
                }
                
                document.getElementById('content-container').style.display = 'block';
                populateForm(data.parent_task, data.breakdowns);
            })
            .catch(err => {
                document.getElementById('error-container').innerText = "Failed to load API.";
                document.getElementById('error-container').style.display = 'block';
            });
    }

    function populateForm(parent, breakdowns) {
        document.getElementById('task-id').value = taskId;
        document.getElementById('task-heading').value = parent.title;
        
        document.getElementById('task-description').value = parent.description || "";
        document.getElementById('task-deadline').value = parent.due_date || "";

        const wrapper = document.getElementById('breakdown-wrapper');
        wrapper.innerHTML = '';
        
        breakdowns.forEach((b) => {
            addBreakdownRow(b.id, b.title, b.min_target_val, b.target_val);
        });
    }

    function addBreakdownRow(id, title, minTargetVal, targetVal) {
        const wrapper = document.getElementById('breakdown-wrapper');
        const rowHTML = `
            <div class="breakdown-item updating-row" data-id="${id}">
                <div class="breakdown-inputs">
                    <input type="text" class="ct-input b-name" style="flex:2;" value="${title}" placeholder="Subject Name">
                    <input type="text" class="ct-input b-min-target" style="flex:1;" value="${minTargetVal || ''}" placeholder="Min Target">
                    <input type="text" class="ct-input b-target" style="flex:1;" value="${targetVal}" placeholder="Target">
                </div>
                <button type="button" class="btn-del-subject" onclick="this.parentElement.remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        wrapper.insertAdjacentHTML('beforeend', rowHTML);
    }

    // Add subject
    document.getElementById('btn-add-subject').addEventListener('click', () => {
        addBreakdownRow('new_' + nextNewId, '', '', '');
        nextNewId++;
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        window.location.href = 'task-view.html?id=' + taskId;
    });

    document.getElementById('update-task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const payload = {
            task_id: taskId,
            title: document.getElementById('task-heading').value,
            description: document.getElementById('task-description').value,
            due_date: document.getElementById('task-deadline').value,
            breakdowns: []
        };

        const rows = document.querySelectorAll('.updating-row');
        rows.forEach(row => {
            const id = row.getAttribute('data-id');
            const title = row.querySelector('.b-name').value;
            const minTarget = row.querySelector('.b-min-target').value;
            const target = row.querySelector('.b-target').value;
            payload.breakdowns.push({
                id: id,
                title: title,
                min_target_val: minTarget,
                target_val: target
            });
        });

        const btn = document.getElementById('submit-btn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        fetch('api/update-task.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                window.location.href = 'task-view.html?id=' + taskId;
            } else {
                alert(data.message);
                btn.textContent = 'Save Updates';
                btn.disabled = false;
            }
        })
        .catch(err => {
            alert('Error connecting to server');
            btn.textContent = 'Save Updates';
            btn.disabled = false;
        });
    });

    // Initial load
    loadTaskData();

});
