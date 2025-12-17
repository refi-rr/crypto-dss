// Main App - Orchestrates everything
class App {
    constructor() {
        this.initialized = false;
        this.sidebarComponent = null;
        this.headerComponent = null;
    }

    async init() {
        if (this.initialized) return;

        console.log('🚀 Initializing Crypto DSS...');

        // Initialize router
        window.Router.init('micro-app-container');

        // Register routes
        this.registerRoutes();

        // Load theme
        this.loadTheme();

        // Check authentication
        const isAuth = await window.Auth.init();
        window.addEventListener('auth:login', (e) => {
            const sidebar = document.getElementById('sidebar-container');
            const header = document.getElementById('header-container');

            if (sidebar) sidebar.classList.add('show');
            if (header) header.classList.add('show');

            // init ulang component
            this.initializeComponents();

            const user = e.detail.user;
            const defaultRoute = user.role === 'admin' ? 'dashboard' : 'trader-insight';
            window.Router.navigateTo(defaultRoute);
        });
        window.addEventListener('auth:logout', () => {
            const sidebar = document.getElementById('sidebar-container');
            const header = document.getElementById('header-container');

            if (sidebar) sidebar.classList.remove('show');
            if (header) header.classList.remove('show');

            window.Router.navigateTo('login');
        });

        console.log('Auth status:', isAuth);

        if (isAuth) {
            console.log('User is authenticated, showing UI...');
            this.showAuthenticatedUI();
        } else {
            console.log('User not authenticated, showing login...');
            this.showLoginUI();
        }

        this.initialized = true;
        console.log('✅ App initialized successfully!');
    }

    showAuthenticatedUI() {
        const sidebar = document.getElementById('sidebar-container');
        const header = document.getElementById('header-container');

        console.log('Sidebar element:', sidebar);
        console.log('Header element:', header);

        // Add authenticated class
        if (sidebar) {
            sidebar.classList.add('authenticated');
            console.log('Added authenticated class to sidebar');
        }
        if (header) {
            header.classList.add('authenticated');
            console.log('Added authenticated class to header');
        }

        // IMPORTANT: Initialize components IMMEDIATELY
        // Don't wait for route navigation
        this.initializeComponents();

        // THEN navigate to default route
        const user = window.Auth.getUser();
        const defaultRoute = user.role === 'admin' ? 'dashboard' : 'trader-insight';

        console.log('User role:', user.role);
        console.log('Navigating to:', defaultRoute);

        // Check URL hash
        const hash = window.location.hash.slice(1);
        if (hash && window.MicroApps[hash]) {
            console.log('Found hash in URL, navigating to:', hash);
            window.Router.navigateTo(hash);
        } else {
            console.log('No hash, navigating to default:', defaultRoute);
            window.Router.navigateTo(defaultRoute);
        }
    }

    showLoginUI() {
        const sidebar = document.getElementById('sidebar-container');
        const header = document.getElementById('header-container');

        // Remove authenticated class
        if (sidebar) {
            sidebar.classList.remove('authenticated');
            console.log('Removed authenticated class from sidebar');
        }
        if (header) {
            header.classList.remove('authenticated');
            console.log('Removed authenticated class from header');
        }

        // Show login
        window.Router.navigateTo('login');
    }

    registerRoutes() {
        // Public routes
        window.Router.register('login', {
            title: 'Login',
            requireAuth: false
        });

        // Protected routes
        window.Router.register('trader-insight', {
            title: 'Trader Insight',
            requireAuth: true
        });

        // Admin routes
        window.Router.register('dashboard', {
            title: 'Dashboard',
            requireAuth: true,
            requireAdmin: true
        });

        window.Router.register('members', {
            title: 'Members',
            requireAuth: true,
            requireAdmin: true
        });

        window.Router.register('analytics', {
            title: 'Analytics',
            requireAuth: true,
            requireAdmin: true
        });
    }

    initializeComponents() {
        console.log('Initializing components...');

        // Destroy old instances if exist
        if (this.sidebarComponent) {
            console.log('Destroying old sidebar instance');
        }
        if (this.headerComponent) {
            console.log('Destroying old header instance');
        }

        // Initialize sidebar
        if (window.SidebarComponent) {
            this.sidebarComponent = new window.SidebarComponent('sidebar-container');
            console.log('Sidebar component initialized');
        } else {
            console.error('SidebarComponent not found!');
        }

        // Initialize header
        if (window.HeaderComponent) {
            this.headerComponent = new window.HeaderComponent('header-container');
            console.log('Header component initialized');
        } else {
            console.error('HeaderComponent not found!');
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    const app = new App();
    app.init();
});

// Also try on window load as backup
window.addEventListener('load', () => {
    console.log('Window fully loaded');

    // Double-check if components need re-initialization
    if (window.Auth?.isAuthenticated) {
        const sidebar = document.getElementById('sidebar-container');
        const hasSidebarContent = sidebar && sidebar.innerHTML.length > 100;

        if (!hasSidebarContent) {
            console.warn('⚠️ Sidebar empty after page load, re-initializing...');

            // Force re-render
            if (window.SidebarComponent) {
                new window.SidebarComponent('sidebar-container');
            }
            if (window.HeaderComponent) {
                new window.HeaderComponent('header-container');
            }
        } else {
            console.log('✅ Sidebar has content, all good');
        }
    }
});