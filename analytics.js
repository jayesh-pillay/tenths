document.addEventListener('DOMContentLoaded', () => {

    let currentFilter = 'month';

    // 1. Initial Profile Fetch
    fetch('api/dashboard.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                document.getElementById('nav-name').textContent = data.data.user.name;
                document.getElementById('nav-avatar').textContent = data.data.user.name.charAt(0).toUpperCase();
            } else {
                if (data.message === 'Unauthorized') {
                    window.location.href = 'index.html';
                }
            }
        });

    // 2. Main Logic Flow
    function fetchAnalytics(timeWindow) {
        fetch(`api/analytics.php?filter=${timeWindow}`)
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    renderTopMetrics(data.metrics);
                    renderDonut(data.donut);
                    renderTrendLine(data.trend);
                    renderHighImpact(data.high_impact);
                }
            });
    }

    // Top Cards
    function renderTopMetrics(metrics) {
        document.getElementById('val-total').innerText = metrics.total_tasks;
        document.getElementById('val-completed').innerText = metrics.completed;
        document.getElementById('val-in-progress').innerText = metrics.in_progress;
        
        const overdueEl = document.getElementById('val-overdue');
        overdueEl.innerText = metrics.overdue;
        
        // Visual cue: if overdue > 0, make it red/critical
        if (metrics.overdue > 0) {
            overdueEl.style.color = '#c25450'; // Tenths critical red
        } else {
            overdueEl.style.color = '#222'; // Standard dark
        }

        document.getElementById('val-ontime').innerText = metrics.on_time_rate + '%';
        document.getElementById('val-avg-days').innerText = metrics.avg_days;
    }

    // Donut Chart logic dynamically building CSS rings
    function renderDonut(donutData) {
        const total = donutData.done + donutData.active + donutData.late;
        const ring = document.getElementById('donut-ring');
        
        if (total === 0) {
            ring.style.background = '#EEE';
            return;
        }

        const cDone = '#775A50'; 
        const cActive = '#c25450';
        const cLate = '#651e1e';

        const degDone = (donutData.done / total) * 360;
        const degActive = (donutData.active / total) * 360;
        const degLate = (donutData.late / total) * 360;

        let gradArr = [];
        let cur = 0;

        if (degDone > 0) {
            gradArr.push(`${cDone} ${cur}deg ${cur + degDone}deg`);
            cur += degDone;
        }
        if (degActive > 0) {
            gradArr.push(`${cActive} ${cur}deg ${cur + degActive}deg`);
            cur += degActive;
        }
        if (degLate > 0) {
            gradArr.push(`${cLate} ${cur}deg ${cur + degLate}deg`);
        }

        ring.style.background = `conic-gradient(${gradArr.join(', ')})`;
    }

    // Trend SVG Polyline generator
    function renderTrendLine(trendArray) {
        const wrapper = document.getElementById('svg-trend-wrapper');
        // Clean out previous SVGs but keep hlines
        const oldSvg = wrapper.querySelector('svg');
        if (oldSvg) oldSvg.remove();

        // Let's create an SVG overlay manually matching the wrapper bounds perfectly
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.zIndex = '5';
        svg.style.overflow = 'visible'; // allow nodes to spill slightly outside

        // We will assume 4 points horizontally spread equally across 100% width.
        // x positions: 0%, 33%, 66%, 100%
        // We will use actual pixel calculations upon load.
        
        const rect = wrapper.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        // If hidden or 0 width, abort or delay rendering
        if (w === 0) {
            setTimeout(() => renderTrendLine(trendArray), 200);
            return;
        }

        const maxVal = Math.max(...trendArray);
        const yDomain = maxVal === 0 ? 10 : maxVal * 1.2; // Add 20% visual headroom padding for graphics

        const points = [];
        const xStep = w / 3;

        trendArray.forEach((val, idx) => {
            const pxX = idx * xStep;
            
            // Y is inverted (0 is top, h is bottom). 
            // So if mathematically val matches yDomain, Y is 0. If val is 0, Y is h.
            const pxY = h - ((val / yDomain) * h);
            
            points.push(`${pxX},${pxY}`);
            
            // Draw discrete node circle dot
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', pxX);
            circle.setAttribute('cy', pxY);
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', '#775A50');
            svg.appendChild(circle);
        });

        // Draw Polyline connecting coordinates seamlessly
        const polyline = document.createElementNS(svgNS, 'polyline');
        polyline.setAttribute('points', points.join(' '));
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#775A50');
        polyline.setAttribute('stroke-width', '3');
        polyline.setAttribute('stroke-linejoin', 'round');
        polyline.setAttribute('stroke-linecap', 'round');

        // Insert polyline FIRST so nodes overlay naturally
        svg.insertBefore(polyline, svg.firstChild);
        wrapper.appendChild(svg);
    }

    // Bottom cards
    function renderHighImpact(impactArray) {
        const domContainer = document.getElementById('dom-impact-tasks');
        domContainer.innerHTML = '';

        impactArray.forEach(task => {
            const badgeClass = task.badge === 'CRITICAL PHASE' ? '' : 'in-progress';
            
            const card = document.createElement('div');
            card.className = 'impact-card';
            card.style.cursor = 'pointer';
            card.onclick = () => { window.location.href = `task-view.html?id=${task.id}` };

            card.innerHTML = `
                <span class="impact-badge ${badgeClass}">${task.badge}</span>
                <h3 class="ic-title">${task.title}</h3>
                
                <svg class="ic-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                
                <div class="ic-footer">
                    <span class="ic-prog-lbl">PROGRESS</span>
                    <span class="ic-prog-pct">${task.progress}%</span>
                </div>
                <div class="ic-track">
                    <div class="ic-fill" style="width: ${task.progress}%;"></div>
                </div>
            `;
            domContainer.appendChild(card);
        });
    }

    // Filter Buttons logic
    const pills = document.querySelectorAll('.time-pill');
    pills.forEach(p => {
        p.addEventListener('click', (e) => {
            pills.forEach(i => i.classList.remove('active'));
            p.classList.add('active');
            fetchAnalytics(p.getAttribute('data-val'));
        });
    });

    // Window resize observer to continually recalculate native SVG coordinates
    window.addEventListener('resize', () => {
        // Simple debounce
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            // Re-fetch using active pill to redraw
            fetchAnalytics(document.querySelector('.time-pill.active').getAttribute('data-val'));
        }, 150);
    });

    // Boot
    fetchAnalytics('month');

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
