// Sidebar Component - Always Expanded with New Features
class Sidebar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Sidebar container not found');
            return;
        }

        this.render();
        this.attachEvents();
    }

    render() {
        const user = window.Auth.getUser();
        if (!user) {
            console.warn('No user found, skipping sidebar render');
            return;
        }

        const isAdmin = window.Auth.isAdmin();
        const hasSubscription = window.Auth.checkSubscription();

        this.container.innerHTML = `
            <div class="sidebar-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color);">
                <h1 class="sidebar-title" style="font-size: 1.5rem; font-weight: 700; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    CryptoDSS <sup style="font-size: 0.5rem; color: var(--accent-blue);">v2.0</sup>
                </h1>
            </div>

            <nav class="sidebar-nav" style="flex: 1; padding: 1rem; overflow-y: auto;">
                ${isAdmin ? `
                    <a href="#dashboard" class="nav-item" data-route="dashboard">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        <span class="nav-label">Dashboard</span>
                    </a>
                    <a href="#members" class="nav-item" data-route="members">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <span class="nav-label">Members</span>
                    </a>
                ` : ''}
                
                <!-- Main Feature: Trader Insight -->
                <a href="#trader-insight" class="nav-item ${!hasSubscription ? 'disabled' : ''}" data-route="trader-insight">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                        <polyline points="17 6 23 6 23 12"/>
                    </svg>
                    <span class="nav-label">Trader Insight</span>
                    ${!hasSubscription ? '<span style="font-size: 0.75rem; color: var(--accent-red); margin-left: auto;">🔒</span>' : ''}
                </a>

                <!-- NEW: Backtesting -->
                <a href="#backtest" class="nav-item ${!hasSubscription ? 'disabled' : ''}" data-route="backtest">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span class="nav-label">Backtesting</span>
                    ${!hasSubscription ? '<span style="font-size: 0.75rem; color: var(--accent-red); margin-left: auto;">🔒</span>' : ''}
                </a>

                <!-- NEW: Win Rate Tracker -->
                <a href="#win-rate" class="nav-item" data-route="win-rate">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                    <span class="nav-label">Win Rate</span>
                </a>
                
                <!-- Analytics -->
                <a href="#analytics" class="nav-item" data-route="analytics">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <span class="nav-label">Analytics</span>
                </a>

                <!-- Divider -->
                <div style="height: 1px; background: var(--border-color); margin: 1rem 0;"></div>

                <!-- Legal -->
                <a href="javascript:void(0)" id="view-terms" class="nav-item">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <span class="nav-label">Terms & Risk</span>
                </a>
            </nav>

            <div class="sidebar-footer" style="padding: 1rem; border-top: 1px solid var(--border-color);">
                <div class="user-info" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="nav-label" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user?.username || ''}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user?.email || ''}</div>
                        ${!hasSubscription && !isAdmin ? `
                            <div style="font-size: 0.7rem; color: var(--accent-red); margin-top: 0.25rem;">⚠️ Subscription Expired</div>
                        ` : ''}
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
        this.addStyles();
    }

    addStyles() {
        // Add dynamic styles for nav items
        const style = document.createElement('style');
        style.textContent = `
            .nav-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                border-radius: 0.5rem;
                margin-bottom: 0.5rem;
                transition: all 0.2s;
                text-decoration: none;
                color: var(--text-primary);
                cursor: pointer;
            }
            
            .nav-item:hover:not(.disabled) {
                background: var(--bg-tertiary);
                transform: translateX(4px);
            }

            .nav-item.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .nav-item svg {
                flex-shrink: 0;
            }

            .nav-label {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(style);
    }

    attachEvents() {
        // Navigation
        this.container.querySelectorAll('.nav-item[data-route]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Check if disabled
                if (item.classList.contains('disabled')) {
                    alert('⚠️ Your subscription has expired! Please contact admin to renew access.');
                    return;
                }

                const route = item.dataset.route;
                window.Router.navigateTo(route);
            });
        });

        // View Terms button
        const viewTermsBtn = this.container.querySelector('#view-terms');
        if (viewTermsBtn) {
            viewTermsBtn.addEventListener('click', () => {
                window.TermsComponent.showTermsInfo();
            });
        }

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
                if (confirm('Are you sure you want to logout?')) {
                    window.Auth.logout();
                }
            });
        }

        // Listen to route changes
        window.addEventListener('route:change', () => {
            this.highlightActive();
        });
    }

    highlightActive() {
        const currentRoute = window.Router.getCurrentRoute();
        this.container.querySelectorAll('.nav-item[data-route]').forEach(item => {
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