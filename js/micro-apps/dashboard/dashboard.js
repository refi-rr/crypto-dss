// Dashboard Micro-App
window.dashboardApp = {
    stats: null,

    async render(container) {
        container.innerHTML = '<div class="loading">Loading dashboard...</div>';

        try {
            this.stats = await window.API.getDashboard();
            this.renderDashboard(container);
        } catch (error) {
            container.innerHTML = `
                <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                    <p style="color: var(--accent-red);">Failed to load dashboard: ${error.message}</p>
                </div>
            `;
        }
    },

    renderDashboard(container) {
        const s = this.stats;

        container.innerHTML = `
            <div class="fade-in">
                <!-- Stat Cards -->
                <div class="grid grid-cols-3" style="margin-bottom: 2rem;">
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Total Users</p>
                                <p style="font-size: 2.5rem; font-weight: 700;">${s.total_users}</p>
                            </div>
                            <div style="padding: 1rem; background: var(--accent-blue); border-radius: 0.5rem;">
                                <svg width="32" height="32" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Active Users</p>
                                <p style="font-size: 2.5rem; font-weight: 700;">${s.active_users}</p>
                            </div>
                            <div style="padding: 1rem; background: var(--accent-green); border-radius: 0.5rem;">
                                <svg width="32" height="32" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Total Analyses</p>
                                <p style="font-size: 2.5rem; font-weight: 700;">${s.total_analyses}</p>
                            </div>
                            <div style="padding: 1rem; background: var(--accent-purple); border-radius: 0.5rem;">
                                <svg width="32" height="32" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                    <polyline points="17 6 23 6 23 12"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Analyses -->
                <div class="card">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Recent Analyses</h3>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Pair</th>
                                    <th>Timeframe</th>
                                    <th>Signal</th>
                                    <th>Score</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${s.recent_analyses.map(a => `
                                    <tr>
                                        <td style="font-weight: 600;">${a.pair}</td>
                                        <td>${a.timeframe}</td>
                                        <td>
                                            <span class="badge ${a.signal === 'LONG' ? 'badge-long' :
                a.signal === 'SHORT' ? 'badge-short' :
                    'badge-wait'
            }">
                                                ${a.signal}
                                            </span>
                                        </td>
                                        <td style="font-weight: 600;">${a.score}</td>
                                        <td style="color: var(--text-secondary); font-size: 0.875rem;">
                                            ${new Date(a.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
};