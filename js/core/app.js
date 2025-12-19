// Main App - Orchestrates everything with new features
class App {
    constructor() {
        this.initialized = false;
        this.sidebarComponent = null;
        this.headerComponent = null;
    }

    async init() {
        if (this.initialized) return;

        console.log('🚀 Initializing Crypto DSS v2.0...');

        // Initialize router
        window.Router.init('micro-app-container');

        // Register routes
        this.registerRoutes();

        // Load theme
        this.loadTheme();

        // Check authentication
        const isAuth = await window.Auth.init();

        console.log('Auth status:', isAuth);

        if (isAuth) {
            console.log('User is authenticated, showing UI...');

            // Check terms acceptance
            await window.TermsComponent.checkAndShowTerms();

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

        if (sidebar) sidebar.classList.add('authenticated');
        if (header) header.classList.add('authenticated');

        // Initialize components
        this.initializeComponents();

        // Navigate to default route
        const user = window.Auth.getUser();
        const defaultRoute = user.role === 'admin' ? 'dashboard' : 'trader-insight';

        // Check URL hash
        const hash = window.location.hash.slice(1);
        if (hash && window.MicroApps[hash]) {
            window.Router.navigateTo(hash);
        } else {
            window.Router.navigateTo(defaultRoute);
        }
    }

    showLoginUI() {
        const sidebar = document.getElementById('sidebar-container');
        const header = document.getElementById('header-container');

        if (sidebar) sidebar.classList.remove('authenticated');
        if (header) header.classList.remove('authenticated');

        // Check if we're on a special page (verify, reset)
        const search = window.location.search;
        if (search.includes('token=')) {
            if (window.location.pathname.includes('verify') || search.includes('verify')) {
                window.Router.navigateTo('verify-email');
                return;
            } else if (window.location.pathname.includes('reset') || search.includes('reset')) {
                window.Router.navigateTo('reset-password');
                return;
            }
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

        window.Router.register('verify-email', {
            title: 'Verify Email',
            requireAuth: false
        });

        window.Router.register('forgot-password', {
            title: 'Forgot Password',
            requireAuth: false
        });

        window.Router.register('reset-password', {
            title: 'Reset Password',
            requireAuth: false
        });

        // Protected routes - All users
        window.Router.register('trader-insight', {
            title: 'Trader Insight',
            requireAuth: true
        });

        window.Router.register('backtest', {
            title: 'Backtesting',
            requireAuth: true
        });

        window.Router.register('win-rate', {
            title: 'Win Rate Tracker',
            requireAuth: true
        });

        window.Router.register('analytics', {
            title: 'Analytics',
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
    }

    initializeComponents() {
        console.log('Initializing components...');

        // Initialize sidebar
        if (window.SidebarComponent) {
            this.sidebarComponent = new window.SidebarComponent('sidebar-container');
        }

        // Initialize header
        if (window.HeaderComponent) {
            this.headerComponent = new window.HeaderComponent('header-container');
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

    if (window.Auth?.isAuthenticated) {
        const sidebar = document.getElementById('sidebar-container');
        const hasSidebarContent = sidebar && sidebar.innerHTML.length > 100;

        if (!hasSidebarContent) {
            console.warn('⚠️ Sidebar empty after page load, re-initializing...');

            if (window.SidebarComponent) {
                new window.SidebarComponent('sidebar-container');
            }
            if (window.HeaderComponent) {
                new window.HeaderComponent('header-container');
            }
        }
    }
});