// Header Component
class Header {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.render();
    }

    render() {
        const user = window.Auth.getUser();
        const currentRoute = window.Router.getCurrentRoute();
        const title = this.getPageTitle(currentRoute);

        this.container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="font-size: 1.5rem; font-weight: 700;">${title}</h2>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="color: var(--text-secondary);">${user?.username || 'Guest'}</span>
                    <span class="badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-member'}">
                        ${user?.role || 'Guest'}
                    </span>
                </div>
            </div>
        `;

        // Listen to route changes
        window.addEventListener('route:change', (e) => {
            this.render();
        });
    }

    getPageTitle(route) {
        const titles = {
            'dashboard': 'Dashboard',
            'members': 'Member Management',
            'analytics': 'Analytics',
            'trader-insight': 'Trader Insight',
            'login': 'Login'
        };
        return titles[route] || 'Crypto DSS';
    }
}

// Initialize when DOM is ready
window.HeaderComponent = Header;