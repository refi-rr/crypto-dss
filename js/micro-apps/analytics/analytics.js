// Analytics Micro-App
window.analyticsApp = {
    history: [],

    async render(container) {
        container.innerHTML = '<div class="loading">Loading analytics...</div>';

        try {
            this.history = await window.API.getHistory();
            this.renderAnalytics(container);
        } catch (error) {
            container.innerHTML = `
                <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                    <p style="color: var(--accent-red);">Failed to load analytics: ${error.message}</p>
                </div>
            `;
        }
    },

    renderAnalytics(container) {
        // Calculate signal distribution
        const signalStats = this.history.reduce((acc, h) => {
            acc[h.signal] = (acc[h.signal] || 0) + 1;
            return acc;
        }, {});

        const totalSignals = this.history.length;

        container.innerHTML = `
            <div class="fade-in">
                <!-- Signal Distribution -->
                <div class="card">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Signal Distribution</h3>
                    <div id="signal-chart"></div>
                </div>

                <!-- Statistics -->
                <div class="grid grid-cols-3" style="margin-top: 1.5rem;">
                    <div class="card" style="text-align: center;">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Total Analyses</p>
                        <p style="font-size: 2.5rem; font-weight: 700;">${totalSignals}</p>
                    </div>

                    <div class="card" style="text-align: center;">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Long Signals</p>
                        <p style="font-size: 2.5rem; font-weight: 700; color: var(--accent-green);">${signalStats.LONG || 0}</p>
                        <p style="color: var(--text-secondary); font-size: 0.875rem;">
                            ${totalSignals ? ((signalStats.LONG || 0) / totalSignals * 100).toFixed(1) : 0}%
                        </p>
                    </div>

                    <div class="card" style="text-align: center;">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Short Signals</p>
                        <p style="font-size: 2.5rem; font-weight: 700; color: var(--accent-red);">${signalStats.SHORT || 0}</p>
                        <p style="color: var(--text-secondary); font-size: 0.875rem;">
                            ${totalSignals ? ((signalStats.SHORT || 0) / totalSignals * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>

                <!-- Recent History -->
                <div class="card" style="margin-top: 1.5rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Recent Analysis History</h3>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${this.history.slice(0, 20).map(h => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 0.75rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                                <div>
                                    <p style="font-weight: 600; margin-bottom: 0.25rem;">${h.pair} - ${h.timeframe}</p>
                                    <p style="font-size: 0.875rem; color: var(--text-secondary);">
                                        ${new Date(h.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span class="badge ${h.signal === 'LONG' ? 'badge-long' :
                h.signal === 'SHORT' ? 'badge-short' :
                    'badge-wait'
            }" style="padding: 0.5rem 1rem; font-size: 1rem;">
                                        ${h.signal}
                                    </span>
                                    <span style="font-size: 1.5rem; font-weight: 700; min-width: 50px; text-align: right;">
                                        ${h.score}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Render chart
        this.renderSignalChart(signalStats);
    },

    renderSignalChart(stats) {
        const chartContainer = document.getElementById('signal-chart');
        if (!chartContainer) return;

        const data = {
            labels: Object.keys(stats),
            values: Object.values(stats),
            colors: Object.keys(stats).map(signal =>
                signal === 'LONG' ? '#10b981' :
                    signal === 'SHORT' ? '#ef4444' :
                        '#6b7280'
            )
        };

        window.ChartUtils.createPieChart(chartContainer, data, {
            size: 250,
            title: ''
        });
    }
};