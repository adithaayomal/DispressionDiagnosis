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
