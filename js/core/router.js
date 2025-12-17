// Router Service - Client-side routing for micro-apps
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
        window.addEventListener('auth:login', () => {
            const user = window.Auth.getUser();
            const defaultRoute = user.role === 'admin' ? 'dashboard' : 'trader-insight';
            this.navigateTo(defaultRoute);
        });

        window.addEventListener('auth:logout', () => {
            this.navigateTo('login');
        });
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

            // Render micro-app
            if (window[`${name}App`] && typeof window[`${name}App`].render === 'function') {
                await window[`${name}App`].render(this.container);
            } else {
                this.container.innerHTML = '<div class="error">Failed to load micro-app</div>';
            }
        } catch (error) {
            console.error('Failed to load micro-app:', error);
            this.container.innerHTML = '<div class="error">Error loading micro-app</div>';
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
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