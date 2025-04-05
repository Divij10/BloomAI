// Simple redirect script
console.log('App.js loaded - checking if redirection is needed');

// Check if we're on the root path without any route
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    console.log('On root path, redirecting to welcome page');
    // Redirect to the welcome page
    window.location.href = '/welcome';
} 