function openCity(evt, cityName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(cityName).style.display = "block";
  evt.currentTarget.className += " active";
  // Save last selected tab to backend
  saveLastAnxietyTab(cityName);
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

// Get the element with id="defaultOpen" and click on it
window.addEventListener('DOMContentLoaded', function() {
  restoreLastAnxietyTab();
});
