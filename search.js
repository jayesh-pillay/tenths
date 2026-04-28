document.addEventListener('DOMContentLoaded', () => {
    const searchBars = document.querySelectorAll('.search-bar');
    
    searchBars.forEach(bar => {
        // Ensure relative positioning on the container to anchor the dropdown perfectly
        bar.style.position = 'relative';
        
        const input = bar.querySelector('input');
        if (!input) return;

        // Construct the dropdown container dynamically
        const dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.06);
            margin-top: 8px;
            z-index: 1000;
            overflow: hidden;
            display: none;
            flex-direction: column;
            border: 1px solid #f0eee9;
        `;
        bar.appendChild(dropdown);

        let timeout = null;

        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                dropdown.style.display = 'none';
                return;
            }

            // Debounce for smooth typing performance
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    const res = await fetch(`api/search.php?q=${encodeURIComponent(query)}`);
                    const json = await res.json();
                    
                    dropdown.innerHTML = '';
                    
                    if (json.status === 'success' && json.data.length > 0) {
                        dropdown.style.display = 'flex';
                        json.data.forEach(task => {
                            const item = document.createElement('div');
                            item.style.cssText = `
                                padding: 12px 16px;
                                cursor: pointer;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                border-bottom: 1px solid #f9f9f9;
                                transition: background 0.2s;
                            `;
                            item.onmouseover = () => item.style.backgroundColor = '#fcfcfc';
                            item.onmouseout = () => item.style.backgroundColor = 'transparent';
                            
                            // Embolden the matching substring explicitly
                            const regex = new RegExp(`(${query})`, 'gi');
                            const highlightedTitle = task.title.replace(regex, '<strong style="color: #6C5248; font-weight: 700;">$1</strong>');
                            
                            item.innerHTML = `
                                <div>
                                    <div style="font-size: 0.9rem; font-weight: 500; margin-bottom: 2px;">${highlightedTitle}</div>
                                    <div style="font-size: 0.7rem; color: #888; text-transform: uppercase; font-weight: 600;">${task.category}</div>
                                </div>
                                <div style="font-size: 0.8rem; font-weight: 700; color: #8b6d61;">${task.progress}%</div>
                            `;
                            item.addEventListener('click', () => {
                                window.location.href = `task-view.html?id=${task.id}`;
                            });
                            dropdown.appendChild(item);
                        });
                    } else {
                        dropdown.style.display = 'flex';
                        const noResult = document.createElement('div');
                        noResult.style.cssText = `padding: 16px; text-align: center; font-size: 0.85rem; color: #888;`;
                        noResult.textContent = 'No tasks matched that keyword.';
                        dropdown.appendChild(noResult);
                    }
                } catch (err) {
                    console.error("Search failed:", err);
                }
            }, 250);
        });

        // Hide dropdown on blur
        document.addEventListener('click', (e) => {
            if (!bar.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });
});
