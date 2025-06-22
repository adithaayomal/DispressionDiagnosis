// --- Day 7: Mind Unwind – Simple Puzzle Game ---
function showDay7PuzzleTask() {
    const tasksContainer = document.querySelector('.tasks-container');
    tasksContainer.innerHTML = '';
    // Title
    const h2 = document.createElement('h2');
    h2.textContent = 'Your Daily Task';
    tasksContainer.appendChild(h2);
    // Subtitle styled like a title, but smaller
    const subtitle = document.createElement('div');
    subtitle.textContent = 'Mind Unwind – Simple Puzzle Game';
    subtitle.style.fontSize = '1.35rem';
    subtitle.style.fontWeight = '700';
    subtitle.style.color = '#f07264';
    subtitle.style.marginBottom = '0.5rem';
    subtitle.style.letterSpacing = '0.5px';
    tasksContainer.appendChild(subtitle);
    // Description (with goal and mental break info)
    const desc = document.createElement('div');
    desc.className = 'task-desc';
    desc.innerHTML = `<p>Challenge your mind gently with this relaxing puzzle. Rearrange the pieces to complete the picture or pattern.<br><br>Take your time—there’s no timer, no pressure. Just a quiet space to focus, think, and enjoy the satisfaction of solving.</p>`;
    tasksContainer.appendChild(desc);

    // Add the complete button at the bottom, always visible (like previous tasks)
    let completeBtn = document.createElement('button');
    completeBtn.id = 'complete-task-btn';
    completeBtn.className = 'next-btn fixed-complete-btn';
    completeBtn.style.background = '#4CAF50';
    completeBtn.style.color = '#fff';
    completeBtn.textContent = 'I completed the task';
    // Add to tasksContainer so it is absolutely positioned at the bottom
    tasksContainer.appendChild(completeBtn);
    completeBtn.onclick = function() {
        // Mark Day 7 as green (completed)
        const weekDays = document.querySelectorAll('.week-day-vertical .day-circle');
        if (weekDays.length > 6) {
            const day7 = weekDays[6];
            day7.innerHTML = tickSVG;
            day7.style.background = '#4CAF50';
            day7.style.borderColor = '#388E3C';
            day7.style.display = 'flex';
            day7.style.alignItems = 'center';
            day7.style.justifyContent = 'center';
            day7.style.padding = '0';
        }
        const day7Label = document.querySelectorAll('.week-day-vertical .day-label')[6];
        if (day7Label) {
            day7Label.style.color = '#388E3C';
            day7Label.style.fontWeight = '700';
        }
        // Remove all children from tasksContainer
        while (tasksContainer.firstChild) tasksContainer.removeChild(tasksContainer.firstChild);
        // Show congratulations message, summary, and Assistant button
        const congratsDiv = document.createElement('div');
        congratsDiv.style.fontSize = '1.18rem';
        congratsDiv.style.color = '#4CAF50';
        congratsDiv.style.fontWeight = '700';
        congratsDiv.style.margin = '2.5rem 0 1.5rem 0';
        congratsDiv.textContent = 'Congratulations! You have completed the week. Please feel free to go to Assistant and answer the questions given.';
        tasksContainer.appendChild(congratsDiv);

        // Add the summary section
        const summaryDiv = document.createElement('div');
        summaryDiv.style.fontSize = '1.08rem';
        summaryDiv.style.color = '#333';
        summaryDiv.style.fontWeight = '500';
        summaryDiv.style.margin = '1.2rem 0 2.2rem 0';
        summaryDiv.style.textAlign = 'left';
        summaryDiv.innerHTML = `
            <div style="font-size:1.18rem;font-weight:700;color:#f07264;margin-bottom:0.7rem;">What This Week Gave You (For Stressed Minds)</div>
            <ul style="margin:0 0 0.7rem 1.2rem;padding:0;font-size:1.08rem;">
                <li><b>A calmer mind and better focus</b><br><span style='font-weight:400;'>Small, simple games helped you slow down and gently shift your attention away from stress.</span></li>
                <li style='margin-top:0.7rem;'><b>Easier breathing and less tension</b><br><span style='font-weight:400;'>Breathing exercises and light movement helped relax your body and ease anxious thoughts.</span></li>
                <li style='margin-top:0.7rem;'><b>A space to let thoughts out</b><br><span style='font-weight:400;'>Journaling and soft sounds gave you a quiet moment to express what’s on your mind without judgment.</span></li>
                <li style='margin-top:0.7rem;'><b>Moments of lightness and relief</b><br><span style='font-weight:400;'>Gentle, playful games like popping bubbles gave your mind a break and a small dose of joy.</span></li>
                <li style='margin-top:0.7rem;'><b>Clearer thinking through gentle challenges</b><br><span style='font-weight:400;'>Simple puzzles and memory games helped your mind stay active in a peaceful, pressure-free way.</span></li>
            </ul>
        `;
        tasksContainer.appendChild(summaryDiv);

        const assistantBtn = document.createElement('a');
        assistantBtn.href = '/';
        assistantBtn.textContent = 'Go to Assistant';
        assistantBtn.className = 'next-btn';
        assistantBtn.style.background = '#4A90E2';
        assistantBtn.style.color = '#fff';
        assistantBtn.style.fontSize = '1.13rem';
        assistantBtn.style.fontWeight = '600';
        assistantBtn.style.borderRadius = '18px';
        assistantBtn.style.padding = '0.7rem 2.2rem';
        assistantBtn.style.boxShadow = '0 2px 8px rgba(74,144,226,0.10)';
        assistantBtn.style.marginTop = '1.2rem';
        assistantBtn.style.display = 'inline-block';
        assistantBtn.style.textDecoration = 'none';
        assistantBtn.onclick = function(e) {
            // Set flag to repeat questions in Assistant
            localStorage.setItem('repeatQuestions', '1');
            // Let the link proceed as normal
        };
        tasksContainer.appendChild(assistantBtn);
    };

    // Puzzle game container
    const gameDiv = document.createElement('div');
    gameDiv.style.display = 'flex';
    gameDiv.style.justifyContent = 'center';
    gameDiv.style.alignItems = 'center';
    gameDiv.style.margin = '2rem 0';
    gameDiv.style.minHeight = '340px';
    tasksContainer.appendChild(gameDiv);

    // 3x3 sliding puzzle with image tiles
    const size = 3;
    let board = [];
    let empty = {row: size-1, col: size-1};
    // Use 8 images from static/images/puzzle/1.jpg ... 8.jpeg (or .jpg/.jpeg/.png)
    const imagePaths = [
        '/static/images/puzzle/1.jpg',
        '/static/images/puzzle/2.jpg',
        '/static/images/puzzle/3.jpg',
        '/static/images/puzzle/4.jpg',
        '/static/images/puzzle/5.jpg',
        '/static/images/puzzle/6.jpg',
        '/static/images/puzzle/7.jpg',
        '/static/images/puzzle/8.jpg'
    ];
    // Fill board with tile indices 0-7 and one empty
    let nums = Array.from({length: size*size-1}, (_,i)=>i);
    // Shuffle
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    nums.push(null);
    for (let r=0; r<size; r++) {
        board[r] = [];
        for (let c=0; c<size; c++) {
            board[r][c] = nums[r*size+c];
        }
    }

    // Render puzzle
    const puzzle = document.createElement('div');
    puzzle.style.display = 'grid';
    puzzle.style.gridTemplateColumns = `repeat(${size}, 96px)`;
    puzzle.style.gridTemplateRows = `repeat(${size}, 96px)`;
    puzzle.style.gap = '0.7rem';
    puzzle.style.background = 'none';
    puzzle.style.borderRadius = '18px';
    puzzle.style.boxShadow = '0 2px 8px rgba(74,144,226,0.10)';
    puzzle.style.padding = '0.5rem';
    gameDiv.appendChild(puzzle);

    function renderPuzzle() {
        puzzle.innerHTML = '';
        for (let r=0; r<size; r++) {
            for (let c=0; c<size; c++) {
                const val = board[r][c];
                const tile = document.createElement('div');
                tile.style.width = '96px';
                tile.style.height = '96px';
                tile.style.display = 'flex';
                tile.style.alignItems = 'center';
                tile.style.justifyContent = 'center';
                tile.style.borderRadius = '14px';
                tile.style.background = val !== null ? '#E2BDA7' : 'transparent';
                tile.style.cursor = val !== null ? 'pointer' : 'default';
                tile.style.transition = 'background 0.2s, color 0.2s';
                tile.style.overflow = 'hidden';
                tile.style.position = 'relative';
                if (val !== null) {
                    const img = document.createElement('img');
                    img.src = imagePaths[val];
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '14px';
                    tile.appendChild(img);
                }
                // Move logic
                tile.onclick = function() {
                    if (val === null) return;
                    // Can move if adjacent to empty
                    if ((Math.abs(empty.row - r) + Math.abs(empty.col - c)) === 1) {
                        board[empty.row][empty.col] = val;
                        board[r][c] = null;
                        empty = {row: r, col: c};
                        renderPuzzle();
                        if (isSolved()) showCompleteBtn();
                    }
                };
                puzzle.appendChild(tile);
            }
        }
    }

    function isSolved() {
        let n = 0;
        for (let r=0; r<size; r++) {
            for (let c=0; c<size; c++) {
                if (r === size-1 && c === size-1) {
                    if (board[r][c] !== null) return false;
                } else {
                    if (board[r][c] !== n) return false;
                    n++;
                }
            }
        }
        return true;
    }

    renderPuzzle();
}
// --- End Day 7 ---
    // Animated Breathing Circle Game
    const canvas = document.getElementById('breathing-circle');
    const ctx = canvas.getContext('2d');
    const instruction = document.getElementById('breathing-instruction');
    let phase = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold
    let t = 0;
    const phases = [
        { label: 'Inhale', color: '#E2BDA7', duration: 4000, shadow: '#f07264' },
        { label: 'Hold', color: '#f7c6b7', duration: 2000, shadow: '#f07264' },
        { label: 'Exhale', color: '#f07264', duration: 4000, shadow: '#f07264' },
        { label: 'Hold', color: '#f7c6b7', duration: 2000, shadow: '#f07264' }
    ];
    let start = null;
    function animateBreath(ts) {
        if (!start) start = ts;
        let elapsed = ts - start;
        let p = phases[phase];
        let progress = Math.min(elapsed / p.duration, 1);
        // Circle radius: 60 (min) to 120 (max)
        let radius;
        if (phase === 0) radius = 60 + 60 * easeInOut(progress); // Inhale
        else if (phase === 1) radius = 120; // Hold (full)
        else if (phase === 2) radius = 120 - 60 * easeInOut(progress); // Exhale
        else radius = 60; // Hold (empty)
        // Animate background glow
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.beginPath();
        ctx.arc(130, 130, radius + 12, 0, 2 * Math.PI);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = p.shadow;
        ctx.filter = 'blur(10px)';
        ctx.fill();
        ctx.restore();
        // Main circle
        ctx.beginPath();
        ctx.arc(130, 130, radius, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.82;
        ctx.filter = 'none';
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#f07264';
        ctx.shadowColor = p.shadow;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Breathing dots
        for (let i = 0; i < 8; i++) {
            let angle = (i / 8) * 2 * Math.PI;
            let dotR = radius + 18 + 6 * Math.sin(ts/400 + i);
            ctx.beginPath();
            ctx.arc(130 + dotR * Math.cos(angle), 130 + dotR * Math.sin(angle), 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.7;
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        instruction.textContent = p.label;
        instruction.style.color = '#f07264';
        if (elapsed < p.duration) {
            requestAnimationFrame(animateBreath);
        } else {
            phase = (phase + 1) % phases.length;
            start = null;
            requestAnimationFrame(animateBreath);
        }
    }
    function easeInOut(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }
    if (canvas && ctx && instruction) {
        requestAnimationFrame(animateBreath);
    }
    // Add tick SVG for completed day
    const tickSVG = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#4CAF50"/><path d="M6 12.5L10 16L16 8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.addEventListener('DOMContentLoaded', function() {
        const completeBtn = document.getElementById('complete-task-btn');
        if (completeBtn) {
            completeBtn.onclick = function() {
                // Remove/hide breathing section and button
                const breathingSection = document.querySelector('.breathing-section');
                if (breathingSection) breathingSection.remove();
                completeBtn.remove();
                // Remove title if present
                const h2 = document.querySelector('.tasks-container h2');
                if (h2) h2.remove();
                // Remove subtitle if present
                const subtitle = document.getElementById('task-subtitle');
                if (subtitle) subtitle.remove();
                // Mark Day 1 as green (completed)
                const weekDays = document.querySelectorAll('.week-day-vertical .day-circle');
                if (weekDays.length > 0) {
                    const day1 = weekDays[0];
                    day1.innerHTML = tickSVG;
                    day1.style.background = '#4CAF50';
                    day1.style.borderColor = '#388E3C';
                    day1.style.display = 'flex';
                    day1.style.alignItems = 'center';
                    day1.style.justifyContent = 'center';
                    day1.style.padding = '0';
                }
                const day1Label = document.querySelectorAll('.week-day-vertical .day-label')[0];
                if (day1Label) {
                    day1Label.style.color = '#388E3C';
                    day1Label.style.fontWeight = '700';
                }
                // Load Mindful Click task
                const mainContent = document.querySelector('.main-tasks-content');
                if (mainContent) {
                    // Remove any previous Mindful Click section or h2 in mainContent
                    const oldMindful = mainContent.querySelectorAll('.mindful-click-section');
                    oldMindful.forEach(el => el.remove());
                    const oldH2 = mainContent.querySelector('h2');
                    if (oldH2) oldH2.remove();
                    // Add the title
                    const h2 = document.createElement('h2');
                    h2.textContent = 'Your Daily Task';
                    h2.className = '';
                    h2.style.color = '#E2BDA7';
                    h2.style.marginBottom = '1.5rem';
                    h2.style.fontSize = '2rem';
                    h2.style.fontWeight = '700';
                    h2.style.letterSpacing = '1px';
                    mainContent.prepend(h2);
                    // Mindful Click content
                    const mindfulDiv = document.createElement('div');
                    mindfulDiv.className = 'mindful-click-section';
                    mindfulDiv.innerHTML = `
                        <div class="mindful-title" style="font-size:1.35rem;font-weight:700;color:#f07264;margin-bottom:0.5rem;letter-spacing:0.5px;">Mindful Click</div>
                        <div class="mindful-desc" style="font-size:1.08rem;color:#444;margin-bottom:1.2rem;text-align:center;">A floating shape will move gently across the screen. Click it slowly and gently—no rushing. Each click will bring a calming animation. Try to stay present and relaxed.</div>
                        <div id="mindful-click-game" style="width:260px;height:260px;position:relative;margin:0 auto;background:rgba(74,144,226,0.08);border-radius:24px;"></div>
                        <button id="complete-mindful-btn" class="next-btn fixed-complete-btn" style="background:#4CAF50; color:#fff;">I completed the task</button>
                    `;
                    // Insert after h2
                    h2.insertAdjacentElement('afterend', mindfulDiv);
                    startMindfulClickGame();
                    // Add event for new complete button
                    const completeMindfulBtn = document.getElementById('complete-mindful-btn');
                    if (completeMindfulBtn) {
                        completeMindfulBtn.onclick = function() {
                            // Mark Day 2 as green (completed)
                            const weekDays = document.querySelectorAll('.week-day-vertical .day-circle');
                            if (weekDays.length > 1) {
                                const day2 = weekDays[1];
                                day2.innerHTML = tickSVG;
                                day2.style.background = '#4CAF50';
                                day2.style.borderColor = '#388E3C';
                                day2.style.display = 'flex';
                                day2.style.alignItems = 'center';
                                day2.style.justifyContent = 'center';
                                day2.style.padding = '0';
                            }
                            const day2Label = document.querySelectorAll('.week-day-vertical .day-label')[1];
                            if (day2Label) {
                                day2Label.style.color = '#388E3C';
                                day2Label.style.fontWeight = '700';
                            }
                            // Remove Mindful Click section and h2
                            mindfulDiv.remove();
                            h2.remove();
                            // Show Day 3 task
                            const mainContent = document.querySelector('.main-tasks-content');
                            if (mainContent) {
                                // Remove any previous ambient section or h2
                                const oldAmbient = mainContent.querySelectorAll('.ambient-section');
                                oldAmbient.forEach(el => el.remove());
                                const oldH2 = mainContent.querySelector('h2');
                                if (oldH2) oldH2.remove();
                                // Add the title
                                const h2 = document.createElement('h2');
                                h2.textContent = 'Your Daily Task';
                                h2.style.color = '#E2BDA7';
                                h2.style.marginBottom = '1.5rem';
                                h2.style.fontSize = '2rem';
                                h2.style.fontWeight = '700';
                                h2.style.letterSpacing = '1px';
                                mainContent.prepend(h2);
                                // Ambient Sound Experience content
                                const ambientDiv = document.createElement('div');
                                ambientDiv.className = 'ambient-section';
                                ambientDiv.innerHTML = `
                                    <div class="ambient-title">Ambient Sound Experience</div>
                                    <div class="ambient-desc">Choose an environment. The background and sound will change. Relax and enjoy the ambiance for a few minutes.</div>
                                    <div class="ambient-btns" style="display:flex;justify-content:center;gap:1.2rem;margin-bottom:1.5rem;width:100%;">
                                        <button class="ambient-btn" data-env="rain"><span style='font-size:2rem;'>🌧️</span><span style='font-size:0.95rem;'>Rain</span></button>
                                        <button class="ambient-btn" data-env="ocean"><span style='font-size:2rem;'>🌊</span><span style='font-size:0.95rem;'>Ocean</span></button>
                                        <button class="ambient-btn" data-env="forest"><span style='font-size:2rem;'>🌲</span><span style='font-size:2rem;'>Forest</span></button>
                                        <button class="ambient-btn" data-env="wind"><span style='font-size:2rem;'>💨</span><span style='font-size:0.95rem;'>Wind</span></button>
                                    </div>
                                    <div id="ambient-particles"></div>
                                    <audio id="ambient-audio" loop></audio>
                                `;
                                h2.insertAdjacentElement('afterend', ambientDiv);
                                // Insert the complete button as a sibling to ambientDiv, so it is absolutely positioned at the bottom
                                const completeAmbientBtnEl = document.createElement('button');
                                completeAmbientBtnEl.id = 'complete-ambient-btn';
                                completeAmbientBtnEl.className = 'next-btn fixed-complete-btn';
                                completeAmbientBtnEl.textContent = 'I completed the task';
                                completeAmbientBtnEl.style.background = '#4CAF50';
                                completeAmbientBtnEl.style.color = '#fff';
                                ambientDiv.insertAdjacentElement('afterend', completeAmbientBtnEl);
                                // JS: handle ambient button clicks
                                const audio = ambientDiv.querySelector('#ambient-audio');
                                const particlesDiv = ambientDiv.querySelector('#ambient-particles');
                                const envs = {
                                    rain: {
                                        bg: 'linear-gradient(120deg,#AEE1F9 60%,#E2BDA7 100%)',
                                        audio: '/static/music/rain.wav',
                                        icon: '🌧️',
                                        particle: 'raindrop'
                                    },
                                    ocean: {
                                        bg: 'linear-gradient(120deg,#B3E5FC 60%,#E2BDA7 100%)',
                                        audio: '/static/music/ocean.wav',
                                        icon: '🌊',
                                        particle: 'bubble'
                                    },
                                    forest: {
                                        bg: 'linear-gradient(120deg,#C8E6C9 60%,#E2BDA7 100%)',
                                        audio: '/static/music/forest.wav',
                                        icon: '🌲',
                                        particle: 'leaf'
                                    }
                                    wind: {
                                        bg: 'linear-gradient(120deg,#D1C4E9 60%,#E2BDA7 100%)',
                                        audio: '/static/music/wind.wav',
                                        icon: '💨',
                                        particle: 'wind'
                                    }
                                };
                                let particleInterval;
                                ambientDiv.querySelectorAll('.ambient-btn').forEach(btn => {
                                    btn.onclick = function() {
                                        const env = btn.getAttribute('data-env');
                                        // Play audio
                                        audio.src = envs[env].audio;
                                        audio.play();
                                        // Remove old particles
                                        particlesDiv.innerHTML = '';
                                        clearInterval(particleInterval);
                                        // Add floating particles
                                        particleInterval = setInterval(() => {
                                            const p = document.createElement('span');
                                            p.style.position = 'absolute';
                                            p.style.left = Math.random()*90+5+'%';
                                            p.style.top = '-30px';
                                            p.style.fontSize = (Math.random()*1.2+1.2)+'rem';
                                            p.style.opacity = 0.7;
                                            p.textContent = envs[env].icon;
                                            particlesDiv.appendChild(p);
                                            // Animate
                                            const duration = Math.random()*2+2.5;
                                            p.animate([
                                                { transform: 'translateY(0)', opacity: 0.7 },
                                                { transform: translateY(600px)', opacity: 0.1 }
                                            ], { duration: duration*1000, easing: 'linear' });
                                            setTimeout(()=>p.remove(), duration*1000);
                                        }, 500);
                                    };
                                });
                                // Complete button for Day 3
                                const completeAmbientBtn = document.getElementById('complete-ambient-btn');
                                if (completeAmbientBtn) {
                                    completeAmbientBtn.onclick = function() {
                                        // Mark Day 3 as green (completed)
                                        const weekDays = document.querySelectorAll('.week-day-vertical .day-circle');
                                        if (weekDays.length > 2) {
                                            const day3 = weekDays[2];
                                            day3.innerHTML = tickSVG;
                                            day3.style.background = '#4CAF50';
                                            day3.style.borderColor = '#388E3C';
                                            day3.style.display = 'flex';
                                            day3.style.alignItems = 'center';
                                            day3.style.justifyContent = 'center';
                                            day3.style.padding = '0';
                                        }
                                        const day3Label = document.querySelectorAll('.week-day-vertical .day-label')[2];
                                        if (day3Label) {
                                            day3Label.style.color = '#388E3C';
                                            day3Label.style.fontWeight = '700';
                                        }
                                        // Remove ambient section and h2
                                        ambientDiv.remove();
                                        h2.remove();
                                        // Show Day 4 yoga task
                                        showDay4YogaTask();
                                    };
                                }
                            }
                        };
                    }
                }
            };
        }
    });

    function startMindfulClickGame() {
        const gameArea = document.getElementById('mindful-click-game');
        if (!gameArea) return;
        // Remove any previous shape
        gameArea.innerHTML = '';
        // Create the floating shape (circle)
        const shape = document.createElement('div');
        shape.style.width = '54px';
        shape.style.height = '54px';
        shape.style.borderRadius = '50%';
        shape.style.background = 'linear-gradient(135deg,#AEE1F9 60%,#E2BDA7 100%)';
        shape.style.position = 'absolute';
        shape.style.boxShadow = '0 4px 24px 0 rgba(74,144,226,0.13)';
        shape.style.cursor = 'pointer';
        shape.style.transition = 'opacity 0.6s cubic-bezier(.4,0,.2,1), transform 0.6s cubic-bezier(.4,0,.2,1)';
        // Random start position
        let pos = randomPosition();
        shape.style.left = pos.x + 'px';
        shape.style.top = pos.y + 'px';
        // Animate floating
        let angle = Math.random() * 2 * Math.PI;
        let radius = 60 + Math.random() * 40;
        let t = 0;
        let animId;
        function float() {
            t += 0.012;
            const cx = 100 + Math.cos(angle + t) * radius;
            const cy = 100 + Math.sin(angle + t/1.5) * radius;
            shape.style.left = cx + 'px';
            shape.style.top = cy + 'px';
            animId = requestAnimationFrame(float);
        }
        float();
        // Click handler
        shape.onclick = function() {
            cancelAnimationFrame(animId);
            // Calming animation: fade + scale + soft glow
            shape.style.boxShadow = '0 0 32px 12px #AEE1F9, 0 0 0 0 #fff';
            shape.style.opacity = '0';
            shape.style.transform = 'scale(1.3)';
            // Optional: play soft chime
            // setTimeout(() => { /* play sound here if desired */ }, 100);
            setTimeout(() => {
                // Remove and spawn new shape
                shape.remove();
                startMindfulClickGame();
            }, 600);
        };
        gameArea.appendChild(shape);
    }
    function randomPosition() {
        // Keep shape within bounds (game area 260x260, shape 54x54)
        const max = 206; // 260-54
        return {
            x: Math.floor(Math.random() * max),
            y: Math.floor(Math.random() * max)
        };
    }
    // --- Day 4: Yoga Video – Gentle Movement for Calm ---
    function showDay4YogaTask() {
        const mainContent = document.querySelector('.main-tasks-content');
        if (!mainContent) return;
        // Remove any previous yoga section or h2 in mainContent
        const oldYoga = mainContent.querySelectorAll('.yoga-section');
        oldYoga.forEach(el => el.remove());
        const oldH2 = mainContent.querySelector('h2');
        if (oldH2) oldH2.remove();
        // Remove any existing Day 4 completion button (defensive)
        const oldDay4Btns = mainContent.querySelectorAll('.day4-complete-btn, .day4-complete-btn-duplicate, .next-btn');
        oldDay4Btns.forEach(el => {
            // Only remove if it's not inside the new yogaDiv to be created below
            if (!el.closest('.yoga-section')) el.remove();
        });
        // Add the title
        const h2 = document.createElement('h2');
        h2.textContent = 'Your Daily Task';
        h2.className = '';
        h2.style.color = '#E2BDA7';
        h2.style.marginBottom = '1.5rem';
        h2.style.fontSize = '2rem';
        h2.style.fontWeight = '700';
        h2.style.letterSpacing = '1px';
        mainContent.prepend(h2);
        // Yoga section
        const yogaDiv = document.createElement('div');
        yogaDiv.className = 'yoga-section';
    }
// --- End Day 4 ---
