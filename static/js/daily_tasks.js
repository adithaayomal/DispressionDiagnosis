// Daily Tasks Progress Save/Restore Logic
// Usage: Call saveProgress() after any progress change, and call restoreProgress() on page load.

const CATEGORY = (window.location.pathname.includes('dep')) ? 'depression'
                : (window.location.pathname.includes('anx')) ? 'anxiety'
                : null;

function getProgressFromUI() {
    // Save completed days
    const days = document.querySelectorAll('.week-day-vertical .day-circle');
    const completedDays = Array.from(days).map(day => day.innerHTML.includes('svg'));
    // Save current main content view (HTML)
    const tasksContainer = document.querySelector('.tasks-container');
    let currentViewHTML = '';
    if (tasksContainer) {
        currentViewHTML = tasksContainer.innerHTML;
    }
    // Optionally, save scroll position or other UI state here
    return { completedDays, currentViewHTML };
}

function setProgressToUI(progress) {
    if (!progress) return;
    // Restore completed days
    if (progress.completedDays) {
        const days = document.querySelectorAll('.week-day-vertical .day-circle');
        for (let i = 0; i < days.length; i++) {
            if (progress.completedDays[i]) {
                days[i].innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#4CAF50"/><path d="M6 12.5L10 16L16 8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                days[i].style.background = '#4CAF50';
                days[i].style.borderColor = '#388E3C';
                days[i].style.display = 'flex';
                days[i].style.alignItems = 'center';
                days[i].style.justifyContent = 'center';
                days[i].style.padding = '0';
            }
        }
    }
    // Restore current main content view (HTML)
    if (progress.currentViewHTML) {
        const tasksContainer = document.querySelector('.tasks-container');
        if (tasksContainer) {
            tasksContainer.innerHTML = progress.currentViewHTML;
        }
    }
    // Optionally, restore scroll position or other UI state here
}

async function saveProgress() {
    if (!CATEGORY) return;
    const progress = getProgressFromUI();
    await fetch('/api/save_daily_tasks_progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: CATEGORY, progress })
    });
}

async function restoreProgress() {
    if (!CATEGORY) return;
    const res = await fetch(`/api/get_daily_tasks_progress?category=${CATEGORY}`);
    const data = await res.json();
    if (data && data.progress) setProgressToUI(data.progress);
}

// Attach saveProgress to all "I completed the task" buttons
document.addEventListener('DOMContentLoaded', function() {
    restoreProgress();
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('fixed-complete-btn')) {
            setTimeout(saveProgress, 300); // Save after UI updates
        }
    });
});
