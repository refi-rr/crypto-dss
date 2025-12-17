// Trader Insight Micro-App
window['trader-insightApp'] = {
    pairs: [],
    analysis: null,

    async render(container) {
        // Fetch pairs
        try {
            const data = await window.API.getTradingPairs();
            this.pairs = data.pairs;
        } catch (error) {
            console.error('Failed to fetch pairs:', error);
        }

        container.innerHTML = `
            <div class="fade-in">
                <!-- Analysis Form -->
                <div class="card">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Trading Signal Analysis</h3>
                    
                    <form id="analysis-form" class="grid grid-cols-3" style="gap: 1rem; margin-bottom: 0;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Select Pair</label>
                            <select id="pair-select" required style="width: 100%;">
                                ${this.pairs.map(pair => `<option value="${pair}">${pair}</option>`).join('')}
                            </select>
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Timeframe</label>
                            <select id="timeframe-select" required style="width: 100%;">
                                <option value="1m">1 Minute</option>
                                <option value="5m">5 Minutes</option>
                                <option value="15m">15 Minutes</option>
                                <option value="30m">30 Minutes</option>
                                <option value="1h" selected>1 Hour</option>
                                <option value="4h">4 Hours</option>
                                <option value="1d">1 Day</option>
                            </select>
                        </div>

                        <div style="display: flex; align-items: flex-end;">
                            <button type="submit" class="btn btn-primary" style="width: 100%;">
                                Analyze
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Analysis Results -->
                <div id="analysis-results"></div>
            </div>
        `;

        this.attachEvents(container);
    },

    attachEvents(container) {
        const form = container.querySelector('#analysis-form');
        const resultsDiv = container.querySelector('#analysis-results');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const pair = form.querySelector('#pair-select').value;
            const timeframe = form.querySelector('#timeframe-select').value;
            const submitBtn = form.querySelector('button[type="submit"]');

            // Check subscription
            if (!window.Auth.checkSubscription()) {
                alert('Your subscription has expired! Please contact admin.');
                return;
            }

            // Show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Analyzing...';
            resultsDiv.innerHTML = '<div class="loading">Analyzing market data...</div>';

            try {
                this.analysis = await window.API.analyzeTrading(pair, timeframe);
                this.renderResults(resultsDiv);
            } catch (error) {
                resultsDiv.innerHTML = `
                    <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                        <p style="color: var(--accent-red);">Error: ${error.message}</p>
                    </div>
                `;
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Analyze';
            }
        });
    },

    renderResults(container) {
        const a = this.analysis;

        const signalColor = a.signal === 'LONG' ? 'var(--accent-green)' :
            a.signal === 'SHORT' ? 'var(--accent-red)' :
                'var(--text-secondary)';

        const signalIcon = a.signal === 'LONG' ? '📈' :
            a.signal === 'SHORT' ? '📉' : '⏸️';

        container.innerHTML = `
            <div class="fade-in">
                <!-- Signal Cards -->
                <div class="grid grid-cols-3" style="margin-top: 1.5rem;">
                    <!-- Main Signal -->
                    <div class="card" style="text-align: center;">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Trading Signal</p>
                        <div style="font-size: 3rem; margin: 0.5rem 0;">${signalIcon}</div>
                        <p style="font-size: 2.5rem; font-weight: 700; color: ${signalColor}; margin-bottom: 0.5rem;">
                            ${a.signal}
                        </p>
                        <p style="color: var(--text-secondary); font-size: 0.875rem;">${a.strength} Confidence</p>
                    </div>

                    <!-- Score Breakdown -->
                    <div class="card">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">Score Breakdown</p>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                            <span style="color: var(--accent-green); font-weight: 600;">Long Score</span>
                            <span style="font-size: 1.5rem; font-weight: 700;">${a.long_score}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                            <span style="color: var(--accent-red); font-weight: 600;">Short Score</span>
                            <span style="font-size: 1.5rem; font-weight: 700;">${a.short_score}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                            <span style="font-weight: 600;">Confidence</span>
                            <span style="font-size: 1.5rem; font-weight: 700;">${a.confidence_score}%</span>
                        </div>
                    </div>

                    <!-- Current Price -->
                    <div class="card">
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Current Price</p>
                        <p style="font-size: 2rem; font-weight: 700; margin-bottom: 1rem;">$${a.current_price.toFixed(2)}</p>
                        <div style="font-size: 0.875rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-secondary);">Upper BB</span>
                                <span style="font-weight: 600;">$${a.upper_bb.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-secondary);">Lower BB</span>
                                <span style="font-weight: 600;">$${a.lower_bb.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Technical Indicators -->
                <div class="card" style="margin-top: 1.5rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Technical Indicators</h3>
                    <div class="grid grid-cols-4" style="gap: 1rem;">
                        ${this.renderIndicator('RSI (14)', a.rsi.toFixed(2))}
                        ${this.renderIndicator('MACD', a.macd.toFixed(2))}
                        ${this.renderIndicator('MACD Signal', a.macd_signal.toFixed(2))}
                        ${this.renderIndicator('Volume Ratio', a.volume_ratio.toFixed(2) + 'x')}
                        ${this.renderIndicator('SMA 20', '$' + a.sma_20.toFixed(2))}
                        ${this.renderIndicator('SMA 50', '$' + a.sma_50.toFixed(2))}
                        ${this.renderIndicator('Upper BB', '$' + a.upper_bb.toFixed(2))}
                        ${this.renderIndicator('Lower BB', '$' + a.lower_bb.toFixed(2))}
                    </div>
                </div>

                <!-- Signal Breakdown -->
                <div class="card" style="margin-top: 1.5rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Signal Breakdown</h3>
                    <div style="display: grid; gap: 0.75rem;">
                        ${a.signals.map(signal => {
            const isBullish = signal.includes('BULLISH');
            const color = isBullish ? 'var(--accent-green)' : 'var(--accent-red)';
            return `
                                <div style="display: flex; align-items: start; gap: 0.75rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                                    <div style="width: 8px; height: 8px; background: ${color}; border-radius: 50%; margin-top: 0.5rem;"></div>
                                    <p style="flex: 1; font-size: 0.875rem;">${signal}</p>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>

                <!-- Risk Warning -->
                <div class="card" style="margin-top: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                    <p style="font-weight: 600; margin-bottom: 0.5rem;">⚠️ Risk Warning</p>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">
                        This analysis is for informational purposes only and should not be considered as financial advice. 
                        Always do your own research and never invest more than you can afford to lose. 
                        Past performance does not guarantee future results.
                    </p>
                </div>
            </div>
        `;
    },

    renderIndicator(label, value) {
        return `
            <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${label}</p>
                <p style="font-size: 1.25rem; font-weight: 700;">${value}</p>
            </div>
        `;
    }
};