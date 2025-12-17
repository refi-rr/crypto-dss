// Sidebar Component - Always Expanded
class Sidebar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Sidebar container not found');
            return;
        }

        // Check if container is visible
        const isVisible = window.getComputedStyle(this.container).display !== 'none';
        console.log('Sidebar container visible:', isVisible);

        this.render();
        this.attachEvents();

        console.log('Sidebar component fully initialized');
    }

    render() {
        const user = window.Auth.getUser();
        if (!user) {
            console.warn('No user found, skipping sidebar render');
            return;
        }

        const isAdmin = window.Auth.isAdmin();
        console.log('Rendering sidebar for user:', user.username, 'isAdmin:', isAdmin);

        this.container.innerHTML = `
            <div class="sidebar-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color);">
                <h1 class="sidebar-title" style="font-size: 1.5rem; font-weight: 700; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    CryptoDSS
                </h1>
            </div>

            <nav class="sidebar-nav" style="flex: 1; padding: 1rem; overflow-y: auto;">
                ${isAdmin ? `
                    <a href="#dashboard" class="nav-item" data-route="dashboard" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; transition: all 0.2s; text-decoration: none; color: var(--text-primary);">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        <span class="nav-label">Dashboard</span>
                    </a>
                    <a href="#members" class="nav-item" data-route="members" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; transition: all 0.2s; text-decoration: none; color: var(--text-primary);">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <span class="nav-label">Members</span>
                    </a>
                    <a href="#analytics" class="nav-item" data-route="analytics" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; transition: all 0.2s; text-decoration: none; color: var(--text-primary);">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                        <span class="nav-label">Analytics</span>
                    </a>
                ` : ''}
                <a href="#trader-insight" class="nav-item" data-route="trader-insight" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; transition: all 0.2s; text-decoration: none; color: var(--text-primary);">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                        <polyline points="17 6 23 6 23 12"/>
                    </svg>
                    <span class="nav-label">Trader Insight</span>
                </a>
            </nav>

            <div class="sidebar-footer" style="padding: 1rem; border-top: 1px solid var(--border-color);">
                <div class="user-info" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <div>
                        <div class="nav-label" style="font-weight: 600;">${user?.username || ''}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${user?.email || ''}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="theme-toggle" class="btn" style="flex: 1; padding: 0.5rem; background: var(--bg-tertiary);" title="Toggle Theme">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="5"/>
                            <line x1="12" y1="1" x2="12" y2="3"/>
                            <line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                            <line x1="1" y1="12" x2="3" y2="12"/>
                            <line x1="21" y1="12" x2="23" y2="12"/>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                    </button>
                    <button id="logout-btn" class="btn btn-danger" style="flex: 2; padding: 0.5rem;" title="Logout">
                        Logout
                    </button>
                </div>
            </div>
        `;

        this.highlightActive();
    }

    attachEvents() {
        // Navigation
        this.container.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const route = item.dataset.route;
                window.Router.navigateTo(route);
            });
        });

        // Theme toggle
        const themeBtn = this.container.querySelector('#theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
            });
        }

        // Logout
        const logoutBtn = this.container.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.Auth.logout();
            });
        }

        // Listen to route changes
        window.addEventListener('route:change', () => {
            this.highlightActive();
        });
    }

    highlightActive() {
        const currentRoute = window.Router.getCurrentRoute();
        this.container.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.route === currentRoute) {
                item.style.background = 'var(--accent-blue)';
            } else {
                item.style.background = 'transparent';
            }
        });
    }
}

// Initialize when DOM is ready
window.SidebarComponent = Sidebar;