document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');

    if (!taskId) {
        document.getElementById('error-container').innerText = "No Task ID provided.";
        document.getElementById('error-container').style.display = 'block';
        return;
    }

    // Avatar
    fetch('api/dashboard.php')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
        // New Task Celebration
        const params = new URLSearchParams(window.location.search);
        if (params.get('new') === '1') {
            setTimeout(() => {
                window.notifier.peak("A new peak appears on the horizon. Ready for the climb?");
            }, 500);
        }
        
        const name = data.data.user.name;
                document.getElementById('nav-avatar').textContent = name.charAt(0).toUpperCase();
                document.getElementById('nav-name').textContent = name;
            }
        });

    let lastOverallProgress = null;

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
                
                // Summit Celebration Trigger
                if (lastOverallProgress !== null && lastOverallProgress < 100 && data.parent_task.overall_progress === 100) {
                    window.notifier.summit("Summit conquered! You’re one step closer to the ultimate view.");
                }
                lastOverallProgress = data.parent_task.overall_progress;

                renderPage(data.parent_task, data.breakdowns);
            })
            .catch(err => {
                document.getElementById('error-container').innerText = "Failed to load API.";
                document.getElementById('error-container').style.display = 'block';
            });
    }

    function renderPage(parent, breakdowns) {
        // Headers & Badges
        document.getElementById('task-title').textContent = parent.title;
        document.getElementById('badge-days').textContent = parent.days_remaining_badge;
        document.getElementById('badge-status').textContent = parent.status_badge;
        
        // Edit task button
        document.getElementById('edit-task-btn').addEventListener('click', () => {
            window.location.href = 'update-task.html?id=' + taskId;
        });

        // Percentages
        const pctStr = parent.overall_progress + '%';
        document.getElementById('top-overall-pct').textContent = pctStr;
        document.getElementById('card-overall-pct').textContent = pctStr;

        // Pie Ring CSS Conic Gradient logic
        const degree = Math.round((parent.overall_progress / 100) * 360);
        document.getElementById('dom-progress-ring').style.background = `conic-gradient(#fff ${degree}deg, rgba(255,255,255,0.2) 0deg)`;

        // --- INTELLIGENT MOTIVATION ENGINE ---
        const intelligenceMap = {
            'Fitness': {
                keywords: ['gym', 'workout', 'exercise', 'run', 'training', 'cardio', 'strength', 'fitness', 'lifting', 'sport'],
                motivation: "Strength is built one rep at a time. Keep moving towards your peak."
            },
            'Finance': {
                keywords: ['save', 'budget', 'money', 'invest', 'spending', 'bills', 'finance', 'trading', 'bank', 'stocks'],
                motivation: "Smart decisions today build a fortress of wealth for your future self."
            },
            'Studies': {
                keywords: ['study', 'exam', 'syllabus', 'chapter', 'lesson', 'revision', 'read', 'math', 'prep', 'homework', 'learning'],
                motivation: "Knowledge is the only asset that never depreciates. Master your craft."
            },
            'Health': {
                keywords: ['diet', 'nutrition', 'sleep', 'wellness', 'meditation', 'mental', 'health', 'yoga', 'hospital', 'doctor'],
                motivation: "Your body is your only true home. Treat it with the respect it deserves."
            },
            'Hair Care': {
                keywords: ['hair', 'treatment', 'salon', 'cut', 'style', 'shampoo', 'grooming'],
                motivation: "Great results don't happen by chance, they happen by plan and patience."
            },
            'Work': {
                keywords: ['project', 'meeting', 'presentation', 'email', 'coding', 'design', 'client', 'deadline', 'work', 'job'],
                motivation: "Consistency is what transforms average into excellence. Stay focused."
            }
        };

        function getSmartMotivation(title) {
            const t = title.toLowerCase();
            for (const [cat, data] of Object.entries(intelligenceMap)) {
                if (data.keywords.some(k => t.includes(k))) return data.motivation;
            }
            return parent.motivation; // Fallback to server default
        }

        document.getElementById('dom-motivation').textContent = `"${getSmartMotivation(parent.title)}"`;
        document.getElementById('dom-motivation').style.fontStyle = 'italic';
        document.getElementById('dom-motivation').style.fontWeight = '600';

        // Detailed Analytics
        document.getElementById('da-days').textContent = parent.days_remaining_int;
        document.getElementById('da-req-pace').textContent = parent.analytics.req_pace;
        document.getElementById('da-cur-pace').textContent = parent.analytics.cur_pace;
        document.getElementById('da-confidence').textContent = parent.analytics.confidence;
        
        if (parent.analytics.confidence === 'HIGH' || parent.analytics.confidence === 'COMPLETED') {
            document.getElementById('da-conf-bar').style.width = '100%';
            document.getElementById('da-conf-bar').style.backgroundColor = '#8b6d61'; // good brown
        } else {
            document.getElementById('da-conf-bar').style.width = '40%';
            document.getElementById('da-conf-bar').style.backgroundColor = '#c25450'; // warning red
        }

        // Performance Overview Bars
        const blList = document.getElementById('dom-breakdown-list');
        blList.innerHTML = '';
        
        breakdowns.forEach(b => {
            const barHTML = `
                <div class="bl-item">
                    <div class="bl-header">
                        <span class="bl-title">${b.title}</span>
                        <div>
                            ${b.min_target_val ? `<span class="bl-target" style="margin-right: 8px;">MIN: ${b.min_target_val}</span>` : ''}
                            <span class="bl-target">TARGET</span>
                            <span class="bl-pct" style="margin-left: 5px;">${b.pct}%</span>
                        </div>
                    </div>
                    <div class="bl-bar-bg">
                        <div class="bl-bar-fill" style="width: ${b.pct}%;"></div>
                    </div>
                </div>
            `;
            blList.insertAdjacentHTML('beforeend', barHTML);
        });

        // Interactive Updating Cards
        const grid = document.getElementById('interactive-grid');
        grid.innerHTML = '';

        breakdowns.forEach((b, index) => {
            // cycle through 3 pre-defined icon SVG paths for aesthetic variation
            const icons = [
                `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>`,
                `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>`,
                `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>`
            ];
            const iconIndex = index % icons.length;
            
            const current = b.current_val;
            const target = b.target_int;
            const cardPct = target > 0 ? current / target : 0;
            
            let statusPhrase = "Let's get started!";
            let emoji = "🌱";

            if (current === 0) {
                statusPhrase = "Let's get started!"; emoji = "🌱";
            } else if (cardPct < 0.15) {
                statusPhrase = "Starting Your Journey!"; emoji = "🌱";
            } else if (cardPct < 0.24) {
                statusPhrase = "Building Momentum!"; emoji = "📈";
            } else if (cardPct < 0.32) {
                statusPhrase = "Finding Your Rhythm!"; emoji = "⚡";
            } else if (cardPct < 0.45) {
                statusPhrase = "You're Heating Up!"; emoji = "🔥";
            } else if (cardPct <= 0.55) {
                statusPhrase = "Halfway There!"; emoji = "💪";
            } else if (cardPct < 0.65) {
                statusPhrase = "Entering Elite Territory!"; emoji = "🚀";
            } else if (cardPct < 0.80) {
                statusPhrase = "Almost at the Peak!"; emoji = "✨";
            } else if (cardPct < 0.90) {
                statusPhrase = "Champion Mentality!"; emoji = "🏆";
            } else if (cardPct < 1.00) {
                statusPhrase = "Verge of Greatness!"; emoji = "💎";
            } else {
                statusPhrase = "LEGEND STATUS!"; emoji = "🌟";
            }
            
            // Format dynamic exact caption output string
            let finalStatusStr = `${emoji} ${statusPhrase} ${current}/${target}`;
            let statusColor = "#333";
            let statusWeight = "600";
            
            if (cardPct >= 1.00) {
                finalStatusStr = `${emoji} ${statusPhrase} 100% Complete!`;
                statusColor = "#8b6d61"; 
                statusWeight = "700";
            } else if (b.min_target_int > 0 && current >= b.min_target_int) {
                finalStatusStr = `✨ Minimum Reached! ${current}/${target}`;
                statusColor = "#8a9a5b"; 
                statusWeight = "700";
            }

            let actionRowHTML = '';
            if (b.pct >= 100) {
                actionRowHTML = `
                    <div class="ib-action-row" style="background: #f7f5f2; border-radius: 12px; padding: 12px; justify-content: center; border: 1px dashed #eaddd7;">
                        <span style="font-size: 0.85rem; font-weight: 700; color: #8b6d61;">🎉 Slice Completed! Masterful work.</span>
                    </div>
                `;
            } else {
                actionRowHTML = `
                    <div class="ib-action-row">
                        <input type="number" class="ib-input b-input-${b.id}" placeholder="+val" min="1" max="${b.target_int - b.current_val}" step="0.5">
                        <button class="ib-btn submit-progress" data-id="${b.id}">Add Progress</button>
                    </div>
                `;
            }
            
            const cardHTML = `
                <div class="ib-card">
                    <div class="ib-header">
                        <div>
                            <h3 class="ib-title">${b.title}</h3>
                            <p class="ib-subtitle">${b.min_target_val ? `Min: ${b.min_target_val} | ` : ''}${b.current_val}/${b.target_int} units completed</p>
                        </div>
                        <div class="ib-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[iconIndex]}</svg>
                        </div>
                    </div>
                    
                    ${actionRowHTML}

                    <div class="ib-footer">
                        <span class="ib-status" style="color: ${statusColor}; font-weight: ${statusWeight}; font-size: 0.70rem;">${finalStatusStr}</span>
                        <span class="ib-pct">${b.pct}%</span>
                    </div>
                    <div class="ib-bar-bg">
                        <div class="ib-bar-fill" style="width: ${b.pct}%;"></div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Attach event listeners to Add Progress buttons
        const submitBtns = document.querySelectorAll('.submit-progress');
        submitBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bId = e.target.getAttribute('data-id');
                const pInput = document.querySelector(`.b-input-${bId}`);
                let val = parseFloat(pInput.value);
                const maxAllowed = parseFloat(pInput.getAttribute('max'));

                if (isNaN(val) || val <= 0) {
                    alert("Please enter a valid positive number to add.");
                    return;
                }
                
                // Silent Auto-Cap constraint without throwing painful UI errors
                if (val > maxAllowed) {
                    val = maxAllowed;
                    pInput.value = val; // Force UI visual conformity immediately
                }
                
                e.target.textContent = '...';
                e.target.disabled = true;

                fetch('api/update-progress.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        breakdown_id: bId,
                        amount_to_add: val
                    })
                })
                .then(res => res.json())
                .then(response => {
                    if (response.status === 'success') {
                        // Refresh data
                        loadTaskData();
                    } else {
                        alert(response.message);
                        e.target.textContent = 'Add Progress';
                        e.target.disabled = false;
                    }
                })
                .catch(err => {
                    alert("Failed to update.");
                    e.target.textContent = 'Add Progress';
                    e.target.disabled = false;
                });
            });
        });

        // -------------------------
        // Dynamic Hoverable Performance Pie Chart
        // -------------------------
        
        // -------------------------
        // Premium SVG Sunburst Implementation
        // -------------------------
        const pieRingDOM = document.getElementById('perf-pie-ring');
        
        let totalAllTargets = 0;
        breakdowns.forEach(b => { totalAllTargets += b.target_int; });

        const earthPalette = [
            '#6B7A8F', // Slate Blue
            '#9B8E7E', // Earthy Taupe
            '#899E8B', // Sage Green
            '#C9BCB3', // Warm Sand
            '#DCD3CB', // Cream
            '#BAB0A6'  // Stone
        ];

        const renderSunburst = () => {
            const centerX = 200;
            const centerY = 200;
            const innerRadius = 75;
            const maxOuterRadius = 175;
            
            let svgContent = `<svg viewBox="0 0 400 400" style="width:100%; height:100%;">`;

            if (totalAllTargets === 0) {
                // Render an empty gray track if no breakdowns
                svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${innerRadius + (maxOuterRadius - innerRadius)/2}" fill="none" stroke="#eee" stroke-width="${maxOuterRadius - innerRadius}" />`;
            } else {
                svgContent += `<defs>`;
                // 1. Pre-calculate angles with a MINIMUM width for small slices (High Visibility)
                let adjustedBreakdowns = breakdowns.map(b => {
                    let RawAngle = (b.target_int / totalAllTargets) * 360;
                    return { ...b, rawAngle: RawAngle };
                });

                // Ensure every slice has at least 25 degrees so labels never clump
                const minAngleRequirement = 25;
                let totalAdjustedAngle = 0;
                adjustedBreakdowns.forEach(b => {
                    b.angle = Math.max(b.rawAngle, minAngleRequirement);
                    totalAdjustedAngle += b.angle;
                });

                // Rescale back to 360 to keep it a full circle
                adjustedBreakdowns.forEach(b => {
                    b.angle = (b.angle / totalAdjustedAngle) * 360;
                });

                let currentAngle = -90; // Start at 12 o'clock
                
                // 1. Generate text paths
                adjustedBreakdowns.forEach((b, i) => {
                    const sliceAngle = b.angle;
                    const midAngle = (currentAngle + (sliceAngle / 2) + 360) % 360;
                    const textPathRadius = 125;

                    const needsFlip = (midAngle > 90 && midAngle < 270);
                    let startA = currentAngle;
                    let endA = currentAngle + sliceAngle;

                    if (needsFlip) {
                        const startRad = (endA * Math.PI) / 180;
                        const endRad = (startA * Math.PI) / 180;
                        svgContent += `<path id="tp-${i}" d="M ${centerX + textPathRadius * Math.cos(startRad)} ${centerY + textPathRadius * Math.sin(startRad)} A ${textPathRadius} ${textPathRadius} 0 0 0 ${centerX + textPathRadius * Math.cos(endRad)} ${centerY + textPathRadius * Math.sin(endRad)}" />`;
                    } else {
                        const startRad = (startA * Math.PI) / 180;
                        const endRad = (endA * Math.PI) / 180;
                        svgContent += `<path id="tp-${i}" d="M ${centerX + textPathRadius * Math.cos(startRad)} ${centerY + textPathRadius * Math.sin(startRad)} A ${textPathRadius} ${textPathRadius} 0 0 1 ${centerX + textPathRadius * Math.cos(endRad)} ${centerY + textPathRadius * Math.sin(endRad)}" />`;
                    }
                    currentAngle += sliceAngle;
                });

                svgContent += `</defs>`;
                
                // 2. Draw segments
                currentAngle = -90;
                adjustedBreakdowns.forEach((b, i) => {
                    const sliceAngle = b.angle;
                    const color = earthPalette[i % earthPalette.length];
                    
                    let visualPct = b.pct / 100;
                    if (visualPct > 0 && visualPct < 0.15) visualPct = 0.15; // Visibility Boost

                    const startRad = (currentAngle * Math.PI) / 180;
                    const endRad = ((currentAngle + sliceAngle) * Math.PI) / 180;
                    
                    const drawArc = (rInner, rOuter) => {
                        const x1 = centerX + rOuter * Math.cos(startRad);
                        const y1 = centerY + rOuter * Math.sin(startRad);
                        const x2 = centerX + rOuter * Math.cos(endRad);
                        const y2 = centerY + rOuter * Math.sin(endRad);
                        const x3 = centerX + rInner * Math.cos(endRad);
                        const y3 = centerY + rInner * Math.sin(endRad);
                        const x4 = centerX + rInner * Math.cos(startRad);
                        const y4 = centerY + rInner * Math.sin(startRad);
                        const flags = sliceAngle > 180 ? "1 1" : "0 1";
                        const flagsRev = sliceAngle > 180 ? "1 0" : "0 0";
                        return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${flags} ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${flagsRev} ${x4} ${y4} Z`;
                    };

                    svgContent += `<path d="${drawArc(innerRadius, maxOuterRadius)}" fill="${color}" fill-opacity="0.1" />`;
                    
                    const pRadius = innerRadius + (maxOuterRadius - innerRadius) * visualPct;
                    if (b.pct > 0) {
                        svgContent += `<path class="sunburst-slice" data-index="${i}" d="${drawArc(innerRadius, pRadius)}" fill="${color}" stroke="#fff" stroke-width="1.5" style="transition: all 0.3s; cursor:pointer;" />`;
                    }
                    currentAngle += sliceAngle;
                });

                // 3. Draw Labels (On Top Layer)
                currentAngle = -90;
                adjustedBreakdowns.forEach((b, i) => {
                    const sliceAngle = b.angle;
                    svgContent += `<text font-size="8" font-weight="700" fill="#333" pointer-events="none" style="text-shadow: 0 0 3px white;">
                        <textPath href="#tp-${i}" startOffset="50%" text-anchor="middle">${b.title.toUpperCase()}</textPath>
                    </text>`;
                    currentAngle += sliceAngle;
                });
            }

            // 4. Center
            svgContent += `
                <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - 5}" fill="#fff" />
                <text x="${centerX}" y="${centerY - 4}" text-anchor="middle" font-size="28" font-weight="800" fill="#111">${parent.overall_progress}%</text>
                <text x="${centerX}" y="${centerY + 14}" text-anchor="middle" font-size="7" font-weight="700" fill="#aaa" letter-spacing="0.1em">TOTAL ARCHIVE</text>
            `;

            svgContent += `</svg>`;
            pieRingDOM.innerHTML = svgContent;

            // 5. Tooltip
            let tooltip = document.getElementById('sunburst-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'sunburst-tooltip';
                tooltip.className = 'chart-tooltip';
                document.body.appendChild(tooltip);
            }

            const slices = document.querySelectorAll('.sunburst-slice');
            slices.forEach(s => {
                s.addEventListener('mouseenter', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    const b = adjustedBreakdowns[idx];
                    const color = earthPalette[idx % earthPalette.length];
                    
                    tooltip.innerHTML = `
                        <div style="font-weight:800; font-size:0.9rem; color:#111; margin-bottom:4px;">${b.title}</div>
                        <div style="color:#666; font-size:0.8rem;">Completed: <b>${b.current_val}</b></div>
                        <div style="color:#666; font-size:0.8rem;">Remaining: <b>${b.target_int - b.current_val}</b></div>
                        <div style="margin-top:6px; height:4px; width:100%; background:#eee; border-radius:2px;">
                            <div style="height:100%; width:${b.pct}%; background:${color}; border-radius:2px;"></div>
                        </div>
                    `;
                    tooltip.style.opacity = '1';
                });
                s.addEventListener('mousemove', (e) => {
                    tooltip.style.left = (e.pageX + 15) + 'px';
                    tooltip.style.top = (e.pageY + 15) + 'px';
                });
                s.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; });
            });
        };

        renderSunburst();

        // Toggles
        const btnBar = document.getElementById('toggle-bar');
        const btnPie = document.getElementById('toggle-pie');
        const listBar = document.getElementById('dom-breakdown-list');
        const pieContainer = document.getElementById('dom-perf-pie');

        btnBar.addEventListener('click', () => {
            btnBar.classList.add('active');
            btnPie.classList.remove('active');
            listBar.style.display = 'flex';
            pieContainer.style.display = 'none';
        });

        btnPie.addEventListener('click', () => {
            btnPie.classList.add('active');
            btnBar.classList.remove('active');
            pieContainer.style.display = 'flex';
            listBar.style.display = 'none';
        });
    }

    // Initial load
    loadTaskData();

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
