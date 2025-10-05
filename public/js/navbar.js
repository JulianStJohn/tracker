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

    // Set up click handlers for all tabs
    const dayTab = document.getElementById('tab-day');
    if (dayTab) {
      dayTab.addEventListener('click', function() {
        window.location.href = '/';
      });
    }

    const foodsTab = document.getElementById('tab-foods');
    if (foodsTab) {
      foodsTab.addEventListener('click', function() {
        window.location.href = '/food.html';
      });
    }

    const mealsTab = document.getElementById('tab-meals');
    if (mealsTab) {
      mealsTab.addEventListener('click', function() {
        window.location.href = '/meals.html';
      });
    }

    const dataTab = document.getElementById('tab-data');
    if (dataTab) {
      dataTab.addEventListener('click', function() {
        window.location.href = '/data.html';
      });
    }

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        window.location.href = '/auth/logout';
      });
    }
}

