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
  const game = document.getElementById('mindful-click-game');
  if (!game) return;
  game.innerHTML = '';
  let dot = document.createElement('div');
  dot.className = 'mindful-dot';
  game.appendChild(dot);
  let x = 100, y = 100, vx = 1.2, vy = 1.1;
  function moveDot() {
    x += vx; y += vy;
    if (x < 20 || x > 220) vx *= -1;
    if (y < 20 || y > 220) vy *= -1;
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    requestAnimationFrame(moveDot);
  }
  dot.style.position = 'absolute';
  dot.style.width = '40px';
  dot.style.height = '40px';
  dot.style.borderRadius = '50%';
  dot.style.background = 'linear-gradient(135deg,#AEE1F9,#f07264)';
  dot.style.boxShadow = '0 2px 12px rgba(31,38,135,0.10)';
  dot.style.cursor = 'pointer';
  dot.style.left = x + 'px';
  dot.style.top = y + 'px';
  dot.addEventListener('click', function(e) {
    let ripple = document.createElement('div');
    ripple.className = 'mindful-ripple';
    ripple.style.left = (e.offsetX - 20) + 'px';
    ripple.style.top = (e.offsetY - 20) + 'px';
    game.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
  moveDot();
}
// --- Ambient Sound Experience ---
function setupAmbientSound() {
  const audio = document.getElementById('ambient-audio');
  const btns = document.querySelectorAll('.ambient-btn');
  const sounds = {
    rain: '/static/music/rain.wav',
    ocean: '/static/music/ocean.wav',
    forest: '/static/music/forest.wav',
    wind: '/static/music/wind.wav'
  };
  btns.forEach(btn => {
    btn.onclick = function() {
      const env = btn.getAttribute('data-env');
      if (audio) {
        audio.src = sounds[env];
        audio.play();
      }
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
  // Animated particles
  const particles = document.getElementById('ambient-particles');
  if (particles) {
    particles.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      let p = document.createElement('div');
      p.className = 'ambient-particle';
      p.style.left = Math.random()*90 + '%';
      p.style.top = Math.random()*90 + '%';
      p.style.animationDuration = (2.5 + Math.random()*2) + 's';
      particles.appendChild(p);
    }
  }
}
// --- Gentle Movement for Calm (Yoga) ---
// No extra JS needed for video
// --- Bubble Wrap Popping Game (Day 5) ---
function startBubbleWrapGame() {
  const canvas = document.getElementById('bubble-wrap-canvas');
  const cursor = document.getElementById('bubble-cursor');
  if (!canvas || !cursor) return;
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
  }

  // Utility: get mouse/touch coordinates relative to canvas, accounting for scaling
  function getCanvasRelativeCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  // Mouse tracking for custom cursor
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    cursor.style.display = 'block';
    cursor.style.left = (e.clientX - rect.left) + 'px';
    cursor.style.top = (e.clientY - rect.top) + 'px';
  });
  canvas.addEventListener('mouseleave', () => {
    cursor.style.display = 'none';
  });

  // Click handler (fix: use scaling)
  canvas.addEventListener('click', (e) => {
    if (!gameActive) return;
    const { x, y } = getCanvasRelativeCoords(e.clientX, e.clientY);
    bubbles.forEach(bubble => {
      if (bubble.isClicked(x, y)) {
        bubble.pop();
      }
    });
  });
  // Touch support (fix: use scaling)
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameActive) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasRelativeCoords(touch.clientX, touch.clientY);
    bubbles.forEach(bubble => {
      if (bubble.isClicked(x, y)) {
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
  // Start the game
  createBubbleWrap();
  gameLoop();
}
// --- Init ---
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('breathing-circle')) startBreathingAnimation();
  if (document.getElementById('mindful-click-game')) startMindfulClickGame();
  if (document.getElementById('ambient-audio')) setupAmbientSound();
  if (document.getElementById('bubble-wrap-canvas')) startBubbleWrapGame();
});
