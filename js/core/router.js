// Router Service - Client-side routing for micro-apps with new features
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.container = null;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);

        // Listen to popstate for back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.navigateTo(e.state.route, false);
            }
        });

        // Listen to auth events
        window.addEventListener('auth:login', async () => {
            // Check terms acceptance
            await window.TermsComponent.checkAndShowTerms();

            const user = window.Auth.getUser();
            const defaultRoute = user.role === 'admin' ? 'dashboard' : 'trader-insight';
            this.navigateTo(defaultRoute);
        });

        window.addEventListener('auth:logout', () => {
            this.navigateTo('login');
        });

        // Handle email verification and password reset from URL
        const path = window.location.pathname;
        const search = window.location.search;

        if (search.includes('token=')) {
            if (path.includes('verify') || search.includes('verify')) {
                this.navigateTo('verify-email', false);
                return;
            } else if (path.includes('reset') || search.includes('reset')) {
                this.navigateTo('reset-password', false);
                return;
            }
        }
    }

    register(name, config) {
        this.routes[name] = config;
    }

    async navigateTo(routeName, pushState = true) {
        const route = this.routes[routeName];

        if (!route) {
            console.error(`Route ${routeName} not found`);
            return;
        }

        // Check authentication
        if (route.requireAuth && !window.Auth.isAuthenticated) {
            this.navigateTo('login');
            return;
        }

        // Check admin access
        if (route.requireAdmin && !window.Auth.isAdmin()) {
            alert('Admin access required');
            return;
        }

        // Update browser history
        if (pushState) {
            window.history.pushState(
                { route: routeName },
                route.title || routeName,
                `#${routeName}`
            );
        }

        this.currentRoute = routeName;

        // Load micro-app
        await this.loadMicroApp(routeName);

        // Emit route change event
        window.dispatchEvent(new CustomEvent('route:change', {
            detail: { route: routeName }
        }));
    }

    async loadMicroApp(name) {
        const microApp = window.MicroApps[name];

        if (!microApp) {
            this.container.innerHTML = '<div class="error">Micro-app not found</div>';
            return;
        }

        // Show loading
        this.container.innerHTML = '<div class="loading">Loading...</div>';

        try {
            // Lazy load script if not loaded
            if (!microApp.loaded) {
                await this.loadScript(microApp.path);
                microApp.loaded = true;
            }

            // Map route names to app objects
            const appMap = {
                'login': 'loginApp',
                'verify-email': 'verifyEmailApp',
                'forgot-password': 'forgotPasswordApp',
                'reset-password': 'resetPasswordApp',
                'dashboard': 'dashboardApp',
                'members': 'membersApp',
                'analytics': 'analyticsApp',
                'trader-insight': 'traderInsightApp',
                'backtest': 'backtestApp',
                'win-rate': 'winRateApp'
            };

            const appName = appMap[name];

            // Render micro-app
            if (window[appName] && typeof window[appName].render === 'function') {
                await window[appName].render(this.container);
            } else {
                console.error(`App ${appName} not found or no render method`);
                this.container.innerHTML = '<div class="error">Failed to load micro-app</div>';
            }
        } catch (error) {
            console.error('Failed to load micro-app:', error);
            this.container.innerHTML = `<div class="error">Error loading micro-app: ${error.message}</div>`;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getCurrentRoute() {
        return this.currentRoute;
    }
}

// Global instance
window.Router = new Router();