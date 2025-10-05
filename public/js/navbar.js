export function addNavBar(){
  fetch("/_navbar.html")
    .then(response => response.text())
    .then(html => {
      document.getElementById("navbar").outerHTML = html;
      renderNavBar();
    });
}

export function renderNavBar(){
    console.log('navbar js loaded');

    // Set up click handlers
    const dayTab = document.getElementById('tab-day');
    if (dayTab) {
      dayTab.addEventListener('click', function() {
        window.location.href = '/';
      });
    }

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        window.location.href = '/auth/logout';
      });
    }
}

