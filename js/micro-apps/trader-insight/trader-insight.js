// Trader Insight Micro-App
window['traderInsightApp'] = {
    pairs: [],
    analysis: null,

    async render(container) {
        // Check subscription first
        if (!window.Auth.checkSubscription()) {
            container.innerHTML = `
                <div class="fade-in">
                    <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); text-align: center; padding: 3rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Subscription Required</h2>
                        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                            Your subscription has expired. Please contact administrator to renew access to Trader Insight features.
                        </p>
                        <button onclick="window.Router.navigateTo('dashboard')" class="btn btn-primary">
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            `;
            return;
        }

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
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">📊 Advanced Trading Signal Analysis</h3>
                    
                    <form id="analysis-form">
                        <!-- Basic Parameters -->
                        <div class="grid grid-cols-3" style="gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                                    Trading Pair <span style="color: var(--accent-red);">*</span>
                                </label>
                                <select id="pair-select" required style="width: 100%;">
                                    ${this.pairs.map(pair => `<option value="${pair}">${pair}</option>`).join('')}
                                </select>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                                    Timeframe <span style="color: var(--accent-red);">*</span>
                                </label>
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
                                    🔍 Analyze Signal
                                </button>
                            </div>
                        </div>
                        
                        <!-- Advanced Filters -->
                        <details style="margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem;">
                            <summary style="cursor: pointer; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem;">
                                ⚙️ Advanced Filters & Settings
                            </summary>
                            
                            <div class="grid grid-cols-3" style="gap: 1rem;">
                                <!-- Signal Strength Filter -->
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                                        Minimum Confidence Score
                                    </label>
                                    <input type="range" id="min-confidence" min="0" max="100" value="50" style="width: 100%;">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary);">
                                        <span>0 (All)</span>
                                        <span id="confidence-value">50</span>
                                        <span>100 (Strong)</span>
                                    </div>
                                </div>
                                
                                <!-- RSI Filter -->
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                                        RSI Period
                                    </label>
                                    <select id="rsi-period" style="width: 100%;">
                                        <option value="14" selected>14 (Standard)</option>
                                        <option value="7">7 (Fast)</option>
                                        <option value="21">21 (Slow)</option>
                                        <option value="28">28 (Very Slow)</option>
                                    </select>
                                </div>
                                
                                <!-- Volume Filter -->
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                                        Volume Threshold
                                    </label>
                                    <select id="volume-threshold" style="width: 100%;">
                                        <option value="1.0">Normal (1x)</option>
                                        <option value="1.5" selected>Above Average (1.5x)</option>
                                        <option value="2.0">High (2x)</option>
                                        <option value="3.0">Very High (3x)</option>
                                    </select>
                                </div>
                                
                                <!-- Trend Filter -->
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                                        Trend Filter
                                    </label>
                                    <select id="trend-filter" style="width: 100%;">
                                        <option value="all" selected>All Signals</option>
                                        <option value="trend-only">Only Trending</option>
                                        <option value="reversal-only">Only Reversals</option>
                                    </select>
                                </div>
                                
                                <!-- Signal Type -->
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                                        Signal Type Preference
                                    </label>
                                    <select id="signal-preference" style="width: 100%;">
                                        <option value="all" selected>All Types</option>
                                        <option value="long-only">Long Only</option>
                                        <option value="short-only">Short Only</option>
                                        <option value="no-wait">Exclude WAIT</option>
                                    </select>
                                </div>
                                
                                <!-- Indicator Weight -->
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                                        Indicator Priority
                                    </label>
                                    <select id="indicator-priority" style="width: 100%;">
                                        <option value="balanced" selected>Balanced</option>
                                        <option value="momentum">Momentum (RSI/MACD)</option>
                                        <option value="trend">Trend (MA/BB)</option>
                                        <option value="volume">Volume Priority</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Info Box -->
                            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid var(--accent-blue); border-radius: 0.25rem;">
                                <p style="font-size: 0.875rem; color: var(--text-secondary);">
                                    💡 <strong>Tip:</strong> Higher confidence thresholds filter weaker signals. Use trend filters for directional trading, and volume thresholds for confirmation.
                                </p>
                            </div>
                        </details>
                    </form>
                </div>

                <!-- Analysis Results -->
                <div id="analysis-results"></div>
                
                <!-- Data Source Indicator -->
                <div id="data-source-indicator" style="display: none; margin-top: 1rem;">
                    <div class="card" style="background: rgba(251, 191, 36, 0.1); border: 1px solid #fbbf24;">
                        <p style="font-size: 0.875rem; color: #fbbf24;">
                            ⚠️ <strong>Demo Mode:</strong> Using simulated market data. Connect to internet for live data.
                        </p>
                    </div>
                </div>
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

                // Show data source indicator if using mock data
                const indicator = document.getElementById('data-source-indicator');
                if (this.analysis.data_source === 'mock') {
                    indicator.style.display = 'block';
                } else {
                    indicator.style.display = 'none';
                }
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
        const filters = this.filters || {};

        // Apply filters to analysis
        const meetsConfidence = a.confidence_score >= (filters.minConfidence || 0);
        const meetsSignalPref = filters.signalPreference === 'all' ||
            (filters.signalPreference === 'long-only' && a.signal === 'LONG') ||
            (filters.signalPreference === 'short-only' && a.signal === 'SHORT') ||
            (filters.signalPreference === 'no-wait' && a.signal !== 'WAIT');

        const passesFilters = meetsConfidence && meetsSignalPref;

        const signalColor = a.signal === 'LONG' ? 'var(--accent-green)' :
            a.signal === 'SHORT' ? 'var(--accent-red)' :
                'var(--text-secondary)';

        const signalIcon = a.signal === 'LONG' ? '📈' :
            a.signal === 'SHORT' ? '📉' : '⏸️';

        container.innerHTML = `
            <div class="fade-in">
                <!-- Filter Status Banner -->
                ${!passesFilters ? `
                    <div class="card" style="background: rgba(251, 191, 36, 0.1); border: 1px solid #fbbf24; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="font-size: 2rem;">⚠️</div>
                            <div>
                                <p style="font-weight: 600; margin-bottom: 0.25rem;">Signal Filtered</p>
                                <p style="font-size: 0.875rem; color: var(--text-secondary);">
                                    ${!meetsConfidence ? `Confidence (${a.confidence_score}) below threshold (${filters.minConfidence})` : ''}
                                    ${!meetsSignalPref ? `Signal type doesn't match preference` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Applied Filters Summary -->
                ${Object.keys(filters).length > 0 ? `
                    <div class="card" style="margin-bottom: 1rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="font-weight: 600; font-size: 0.875rem;">🎯 Active Filters:</span>
                            ${filters.minConfidence > 0 ? `<span class="badge" style="background: var(--accent-blue);">Min Confidence: ${filters.minConfidence}</span>` : ''}
                            ${filters.rsiPeriod !== 14 ? `<span class="badge" style="background: var(--accent-blue);">RSI: ${filters.rsiPeriod}</span>` : ''}
                            ${filters.volumeThreshold !== 1.5 ? `<span class="badge" style="background: var(--accent-blue);">Volume: ${filters.volumeThreshold}x</span>` : ''}
                            ${filters.trendFilter !== 'all' ? `<span class="badge" style="background: var(--accent-blue);">${filters.trendFilter}</span>` : ''}
                            ${filters.signalPreference !== 'all' ? `<span class="badge" style="background: var(--accent-blue);">${filters.signalPreference}</span>` : ''}
                            ${filters.indicatorPriority !== 'balanced' ? `<span class="badge" style="background: var(--accent-blue);">${filters.indicatorPriority}</span>` : ''}
                        </div>
                    </div>
                ` : ''}
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