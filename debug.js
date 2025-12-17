// Debug Helper Script
// Run this in browser console to check sidebar status

function debugSidebar() {
    console.group('🔍 SIDEBAR DEBUG INFO');

    const sidebar = document.getElementById('sidebar-container');
    const header = document.getElementById('header-container');

    console.log('=== Elements ===');
    console.log('Sidebar exists:', !!sidebar);
    console.log('Header exists:', !!header);

    if (sidebar) {
        console.log('\n=== Sidebar Classes ===');
        console.log('All classes:', sidebar.className);
        console.log('Has authenticated:', sidebar.classList.contains('authenticated'));
        console.log('Has show:', sidebar.classList.contains('show'));

        console.log('\n=== Sidebar Styles ===');
        const sidebarStyles = window.getComputedStyle(sidebar);
        console.log('Display:', sidebarStyles.display);
        console.log('Width:', sidebarStyles.width);
        console.log('Visibility:', sidebarStyles.visibility);

        console.log('\n=== Sidebar HTML ===');
        console.log('Has content:', sidebar.innerHTML.length > 0);
        console.log('Content length:', sidebar.innerHTML.length);
    }

    if (header) {
        console.log('\n=== Header Classes ===');
        console.log('All classes:', header.className);
        console.log('Has authenticated:', header.classList.contains('authenticated'));
        console.log('Has show:', header.classList.contains('show'));

        console.log('\n=== Header Styles ===');
        const headerStyles = window.getComputedStyle(header);
        console.log('Display:', headerStyles.display);
    }

    console.log('\n=== Auth Status ===');
    console.log('Authenticated:', window.Auth?.isAuthenticated);
    console.log('Current user:', window.Auth?.getUser()?.username);
    console.log('Token exists:', !!localStorage.getItem('token'));

    console.log('\n=== Route Info ===');
    console.log('Current route:', window.Router?.getCurrentRoute());
    console.log('URL hash:', window.location.hash);

    console.groupEnd();

    // Visual test
    console.log('\n🎨 VISUAL STATUS:');
    if (sidebar) {
        const isVisible = sidebarStyles.display !== 'none';
        console.log(isVisible ? '✅ Sidebar is VISIBLE' : '❌ Sidebar is HIDDEN');
    }
    if (header) {
        const headerStyles = window.getComputedStyle(header);
        const isVisible = headerStyles.display !== 'none';
        console.log(isVisible ? '✅ Header is VISIBLE' : '❌ Header is HIDDEN');
    }
}

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(debugSidebar, 1000);
    });
} else {
    setTimeout(debugSidebar, 1000);
}

// Listen to auth events
window.addEventListener('auth:login', () => {
    console.log('🔑 AUTH:LOGIN event detected');
    setTimeout(debugSidebar, 500);
});

window.addEventListener('auth:logout', () => {
    console.log('🚪 AUTH:LOGOUT event detected');
    setTimeout(debugSidebar, 500);
});

// Make available globally
window.debugSidebar = debugSidebar;

console.log('🐛 Debug helper loaded. Run debugSidebar() to check status.');