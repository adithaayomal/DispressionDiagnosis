function openCity(evt, cityName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  // Find the index of the current tab
  var currentIndex = Array.from(tablinks).findIndex(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(cityName));
  for (i = 0; i < 7; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
    // Mark all previous tabs as completed
    if (i < currentIndex) {
      tablinks[i].classList.add('completed-tab');
      tablinks[i].textContent = '✔ Completed';
    } else {
      tablinks[i].classList.remove('completed-tab');
      // Restore original text for non-completed tabs
      tablinks[i].textContent = 'Day ' + (i + 1);
    }
  }
  document.getElementById(cityName).style.display = "block";
  evt.currentTarget.className += " active";
  // Save last selected tab to backend
  saveLastAnxietyTab(cityName);
  // --- ADDED: re-initialize games on tab switch ---
  if (cityName === 'Day2' && document.getElementById('mindful-click-game')) {
    startMindfulClickGame();
  }
  if (cityName === 'Day5' && document.getElementById('bubble-wrap-canvas')) {
    startBubbleWrapGame();
  }
}

// Add completed-tab style if not already present
if (!document.getElementById('completed-tab-style')) {
  var style = document.createElement('style');
  style.id = 'completed-tab-style';
  style.innerHTML = `.completed-tab { background:rgb(0, 126, 0) !important; color: #fff !important; border: 1px solid #388e3c !important; }`;
  document.head.appendChild(style);
}

async function saveLastAnxietyTab(tabName) {
  await fetch('/api/save_last_anxiety_tab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tab: tabName })
  });
}

async function restoreLastAnxietyTab() {
  const res = await fetch('/api/get_last_anxiety_tab');
  const data = await res.json();
  if (data && data.tab) {
    // Find the button for this tab and simulate a click
    var btn = Array.from(document.getElementsByClassName('tablinks')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(data.tab));
    if (btn) {
      btn.click();
      return;
    }
  }
  // Fallback: open default
  var defaultOpen = document.getElementById("defaultOpen");
  if (defaultOpen) defaultOpen.click();
}

// Show a real-time countdown until 4am the next day in all tabcontent divs
function showUnlockCountdown(container) {
  // Do not show timer in Outcomes tab
  if (container.id === 'OutComes') return;
  // Remove any previous countdown
  let old = container.querySelector('.unlock-countdown');
  if (old) old.remove();
  // Create countdown element
  const countdown = document.createElement('div');
  countdown.className = 'unlock-countdown';
  countdown.style.margin = '2.2rem auto 0 auto';
  countdown.style.fontSize = '1.18rem';

  countdown.style.color = '#f07264';
  countdown.style.letterSpacing = '1px';
  countdown.style.textAlign = 'center';
  container.appendChild(countdown);

  function updateCountdown() {
    const now = new Date();
    let unlock = new Date(now);
    unlock.setHours(4,0,0,0); // today at 4am
    if (now >= unlock) {
      // If past 4am, set to next day 4am
      unlock.setDate(unlock.getDate() + 1);
    }
    const diff = unlock - now;
    if (diff <= 0) {
      countdown.textContent = 'Unlocked!';
      return;
    }
    const totalSeconds = Math.floor(diff/1000);
    const ss = String(totalSeconds%60).padStart(2,'0');
    const mm = String(Math.floor(totalSeconds/60)%60).padStart(2,'0');
    const hh = String(Math.floor(totalSeconds/3600)).padStart(2,'0');
    countdown.textContent = `Do the task and come back in ${hh}h:${mm}m:${ss}s`;
    
    setTimeout(updateCountdown, 1000);
  }
  updateCountdown();
}

// Attach countdown to all tabcontent divs on page load
window.addEventListener('DOMContentLoaded', function() {
  restoreLastAnxietyTab();
  document.querySelectorAll('.tabcontent').forEach(tc => showUnlockCountdown(tc));
});

// Handle Go to Assistant button logic from Outcomes tab
window.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('go-to-assistant-btn');
  if (btn) {
    btn.onclick = async function() {
      // Clear chat data for current user in the backend
      await fetch('/clear_chat', { method: 'POST' });
      // Clear last anxiety tab and last assessment category for current user in the backend
      await fetch('/api/save_last_anxiety_tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: null })
      });
      // Set a flag in localStorage to trigger clear data on Assistant page (optional, for UI)
      localStorage.setItem('clearAssistantData', '1');
      window.location.href = '/';
    };
  }
});

// --- Breathe with the Circle ---
function startBreathingAnimation() {
  const canvas = document.getElementById('breathing-circle');
  const ctx = canvas.getContext('2d');
  const instruction = document.getElementById('breathing-instruction');
  const phases = [
    { label: 'Inhale', color: '#AEE1F9', shadow: '#AEE1F9', duration: 4000 },
    { label: 'Hold', color: '#E2BDA7', shadow: '#E2BDA7', duration: 2000 },
    { label: 'Exhale', color: '#f07264', shadow: '#f07264', duration: 4000 },
    { label: 'Hold', color: '#E2BDA7', shadow: '#E2BDA7', duration: 2000 }
  ];
  let phase = 0, start = null;
  function animateBreath(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    const p = phases[phase];
    let progress = Math.min(elapsed / p.duration, 1);
    let radius = 80 + 40 * (phase === 0 ? progress : phase === 2 ? 1 - progress : phase === 1 ? 1 : 0);
    ctx.clearRect(0, 0, 300, 300);
    // Shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, radius + 18, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.18;
    ctx.filter = 'blur(10px)';
    ctx.fill();
    ctx.restore();
    // Main circle
    ctx.beginPath();
    ctx.arc(150, 150, radius, 0, 2 * Math.PI);
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
      ctx.arc(150 + dotR * Math.cos(angle), 150 + dotR * Math.sin(angle), 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.7;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    instruction.textContent = p.label;
    if (elapsed < p.duration) {
      requestAnimationFrame(animateBreath);
    } else {
      phase = (phase + 1) % phases.length;
      start = null;
      requestAnimationFrame(animateBreath);
    }
  }
  if (canvas && ctx && instruction) {
    requestAnimationFrame(animateBreath);
  }
}
// --- Mindful Click Game ---
function startMindfulClickGame() {
  const gameArea = document.getElementById('mindful-click-game');
  if (!gameArea) return;
  gameArea.innerHTML = '';
  // Create the floating shape (circle)
  const shape = document.createElement('div');
  shape.style.width = '54px';
  shape.style.height = '54px';
  shape.style.borderRadius = '50%';
  shape.style.background = 'linear-gradient(135deg,#AEE1F9 60%,#E2BDA7 100%)';
  shape.style.position = 'absolute';
  shape.style.boxShadow = '0 2px 12px 0 #AEE1F9';
  shape.style.cursor = 'pointer';
  shape.style.transition = 'box-shadow 0.2s, opacity 0.3s, transform 0.3s';
  // Animation state
  let animId = null;
  let pos = randomPosition();
  let dx = (Math.random() - 0.5) * 0.5; // slow motion
  let dy = (Math.random() - 0.5) * 0.5;
  function float() {
    pos.x += dx;
    pos.y += dy;
    // Bounce off walls
    if (pos.x < 0) { pos.x = 0; dx *= -1; }
    if (pos.x > 206) { pos.x = 206; dx *= -1; }
    if (pos.y < 0) { pos.y = 0; dy *= -1; }
    if (pos.y > 206) { pos.y = 206; dy *= -1; }
    shape.style.left = pos.x + 'px';
    shape.style.top = pos.y + 'px';
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
  function randomPosition() {
    // Keep shape within bounds (game area 260x260, shape 54x54)
    const max = 206; // 260-54
    return {
      x: Math.floor(Math.random() * max),
      y: Math.floor(Math.random() * max)
    };
  }
}
// --- End Mindful Click Game ---

// --- Bubble Wrap Popping Game (Day 5) ---
function startBubbleWrapGame() {
  const canvas = document.getElementById('bubble-wrap-canvas');
  const cursor = document.getElementById('bubble-cursor');
  if (!canvas || !cursor) return;
  // --- Add cursor styling ---
  cursor.style.position = 'absolute';
  cursor.style.width = '40px';
  cursor.style.height = '40px';
  cursor.style.borderRadius = '50%';
  cursor.style.background = 'rgba(74,144,226,0.13)';
  cursor.style.border = '2px solid #4A90E2';
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = '10';
  cursor.style.transform = 'translate(-50%, -50%)';
  cursor.style.display = 'block';

  const ctx = canvas.getContext('2d');
  let bubbles = [];
  let poppedCount = 0;
  let totalBubbles = 0;
  let gameActive = true;

  // Bubble class
  class BubbleWrapBubble {
    constructor(x, y, size) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.radius = size / 2;
      this.popped = false;
    }
    draw() {
      ctx.save();
      if (this.popped) {
        ctx.fillStyle = '#e8e8e8';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d0d0d0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(this.x + 2, this.y + this.radius * 0.8, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        const gradient = ctx.createRadialGradient(
          this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
          this.x, this.y, this.radius
        );
        gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.7, 'rgba(240,240,240,0.4)');
        gradient.addColorStop(1, 'rgba(200,200,200,0.8)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,180,180,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    isClicked(mouseX, mouseY) {
      if (this.popped) return false;
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      return (dx * dx + dy * dy) <= (this.radius * this.radius);
    }
    pop() {
      if (this.popped) return;
      this.popped = true;
      poppedCount++;
      updateUI();
    }
  }

  function createBubbleWrap() {
    bubbles = [];
    poppedCount = 0;
    const bubbleSize = 40;
    const spacing = bubbleSize + 5;
    const startX = bubbleSize;
    const startY = bubbleSize;
    const cols = Math.floor((canvas.width - startX * 2) / spacing);
    const rows = Math.floor((canvas.height - startY * 2) / spacing);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * spacing + (row % 2) * (spacing / 2);
        const y = startY + row * spacing;
        if (x + bubbleSize/2 < canvas.width - startX) {
          bubbles.push(new BubbleWrapBubble(x, y, bubbleSize));
        }
      }
    }
    totalBubbles = bubbles.length;
    updateUI();
  }

  // UI for bubbles left
  let bubblesLeftDiv = document.querySelector('.bubble-wrap-section .bubbles-left-text');
  if (!bubblesLeftDiv) {
    bubblesLeftDiv = document.createElement('div');
    bubblesLeftDiv.className = 'bubbles-left-text';
    bubblesLeftDiv.style.margin = '1.2rem auto 0 auto';
    bubblesLeftDiv.style.color = '#4A90E2';
    bubblesLeftDiv.style.fontSize = '1.18rem';
    bubblesLeftDiv.style.fontWeight = '600';
    bubblesLeftDiv.style.textAlign = 'center';
    const parent = document.querySelector('.bubble-wrap-section');
    if (parent) parent.appendChild(bubblesLeftDiv);
  }

  function updateUI() {
    const remaining = totalBubbles - poppedCount;
    if (bubblesLeftDiv) {
      bubblesLeftDiv.textContent = `Bubbles Left: ${remaining}`;
    }
  }

  // Mouse tracking for custom cursor
  document.getElementById('bubble-wrap-game').addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursor.style.left = (e.clientX - rect.left) + 'px';
    cursor.style.top = (e.clientY - rect.top) + 'px';
    cursor.style.display = 'block';
  });
  // Hide cursor on mouse leave
  document.getElementById('bubble-wrap-game').addEventListener('mouseleave', () => {
    cursor.style.display = 'none';
  });
  // Hide cursor on touch devices
  document.getElementById('bubble-wrap-game').addEventListener('touchstart', () => {
    cursor.style.display = 'none';
  });

  // Click handler
  canvas.addEventListener('click', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    bubbles.forEach(bubble => {
      if (bubble.isClicked(mouseX, mouseY)) {
        bubble.pop();
      }
    });
  });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    bubbles.forEach(bubble => {
      if (bubble.isClicked(touchX, touchY)) {
        bubble.pop();
      }
    });
  });

  // Game loop
  function gameLoop() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(240,240,240,0.3)';
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.fillRect(x, 0, 1, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
    bubbles.forEach(bubble => {
      bubble.draw();
    });
    requestAnimationFrame(gameLoop);
  }

  createBubbleWrap();
  gameLoop();
}
// --- End Bubble Wrap Popping Game ---

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('breathing-circle')) startBreathingAnimation();
  if (document.getElementById('mindful-click-game')) startMindfulClickGame();
  if (document.getElementById('ambient-audio')) setupAmbientSound();
  if (document.getElementById('bubble-wrap-canvas')) startBubbleWrapGame();
  const completeBtn = document.getElementById('complete-mindful-btn');
  if (completeBtn) {
    completeBtn.onclick = function() {
      // Mark Day 2 as green (completed)
      const weekDays = document.querySelectorAll('.week-day-vertical .day-circle');
      if (weekDays.length > 1) {
        const day2 = weekDays[1];
        day2.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#4CAF50"/><path d="M6 12.5L10 16L16 8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
      // Optionally hide the section or show a message
      const mindfulDiv = document.querySelector('.mindful-click-section');
      if (mindfulDiv) mindfulDiv.remove();
      const h2 = document.querySelector('#Day2 h2');
      if (h2) h2.remove();
    };
  }
});
