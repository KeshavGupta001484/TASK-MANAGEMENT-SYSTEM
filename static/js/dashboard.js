// Dark mode functionality
document.addEventListener('DOMContentLoaded', function() {
  // Get the theme toggle button and body element
  const themeToggle = document.querySelector('.theme-toggle');
  const body = document.body;

  // Check for saved user preference, first in localStorage, then in system preferences
  const darkMode = localStorage.getItem('darkMode') || 
                  window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Set initial theme
  if (darkMode === 'true' || darkMode === true) {
      body.classList.add('dark-mode');
      updateThemeIcon(true);
  }

  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      
      // Save user preference
      localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
      
      // Update icon
      updateThemeIcon(body.classList.contains('dark-mode'));
  });

  // Function to update the theme icon
  function updateThemeIcon(isDark) {
      const icon = themeToggle.querySelector('i');
      const text = themeToggle.querySelector('span');
      
      if (isDark) {
          icon.className = 'fas fa-sun';
          text.textContent = 'Light Mode';
      } else {
          icon.className = 'fas fa-moon';
          text.textContent = 'Dark Mode';
      }
  }
});