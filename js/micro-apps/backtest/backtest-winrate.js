// Backtesting Micro-App
window.backtestApp = {
    pairs: [],
    result: null,

    async render(container) {
        // Check subscription
        if (!window.Auth.checkSubscription()) {
            container.innerHTML = `
                <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                    <h2>Subscription Required</h2>
                    <p style="color: var(--text-secondary); margin: 1rem 0;">
                        Backtesting feature requires an active subscription
                    </p>
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
                <!-- Backtest Form -->
                <div class="card">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
                        🔬 Strategy Backtesting
                    </h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                        Test our trading strategy on historical data to see how it would have performed
                    </p>

                    <form id="backtest-form">
                        <div class="grid grid-cols-2" style="gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                                    Trading Pair
                                </label>
                                <select id="pair-select" required style="width: 100%;">
                                    ${this.pairs.map(pair => `<option value="${pair}">${pair}</option>`).join('')}
                                </select>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                                    Timeframe
                                </label>
                                <select id="timeframe-select" required style="width: 100%;">
                                    <option value="15m">15 Minutes</option>
                                    <option value="30m">30 Minutes</option>
                                    <option value="1h" selected>1 Hour</option>
                                    <option value="4h">4 Hours</option>
                                    <option value="1d">1 Day</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-3" style="gap: 1rem; margin-bottom: 1.5rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                                    Start Date
                                </label>
                                <input type="date" id="start-date" required style="width: 100%;" 
                                       value="${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                                    End Date
                                </label>
                                <input type="date" id="end-date" required style="width: 100%;"
                                       value="${new Date().toISOString().split('T')[0]}">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-weight: 600;">
                                    Initial Capital ($)
                                </label>
                                <input type="number" id="initial-capital" value="10000" min="100" step="100" required style="width: 100%;">
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            🚀 Run Backtest
                        </button>
                    </form>
                </div>

                <!-- Results -->
                <div id="backtest-results"></div>

                <!-- History -->
                <div id="backtest-history"></div>
            </div>
        `;

        this.attachEvents(container);
        this.loadHistory();
    },

    attachEvents(container) {
        const form = container.querySelector('#backtest-form');
        const resultsDiv = container.querySelector('#backtest-results');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const pair = form.querySelector('#pair-select').value;
            const timeframe = form.querySelector('#timeframe-select').value;
            const startDate = form.querySelector('#start-date').value;
            const endDate = form.querySelector('#end-date').value;
            const initialCapital = parseFloat(form.querySelector('#initial-capital').value);
            const submitBtn = form.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Running Backtest...';
            resultsDiv.innerHTML = '<div class="loading">Running backtest... This may take a minute.</div>';

            try {
                this.result = await window.API.request('/trading/backtest', {
                    method: 'POST',
                    body: JSON.stringify({
                        pair,
                        timeframe,
                        start_date: startDate,
                        end_date: endDate,
                        initial_capital: initialCapital
                    })
                });

                this.renderResults(resultsDiv);
                this.loadHistory();
            } catch (error) {
                resultsDiv.innerHTML = `
                    <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                        <p style="color: var(--accent-red);">Error: ${error.message}</p>
                    </div>
                `;
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Run Backtest';
            }
        });
    },

    renderResults(container) {
        const r = this.result;
        const profitColor = r.total_profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
        const profitIcon = r.total_profit >= 0 ? '📈' : '📉';

        container.innerHTML = `
            <div class="fade-in">
                <!-- Performance Summary -->
                <div class="card" style="background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); color: white; margin-top: 1.5rem;">
                    <div class="grid grid-cols-4">
                        <div style="text-align: center; padding: 1rem; border-right: 1px solid rgba(255,255,255,0.2);">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Profit/Loss</p>
                            <p style="font-size: 2rem; font-weight: 700;">${profitIcon} $${r.total_profit.toFixed(2)}</p>
                            <p style="font-size: 1rem; opacity: 0.9;">ROI: ${r.roi}%</p>
                        </div>

                        <div style="text-align: center; padding: 1rem; border-right: 1px solid rgba(255,255,255,0.2);">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Win Rate</p>
                            <p style="font-size: 2rem; font-weight: 700;">${r.win_rate}%</p>
                            <p style="font-size: 1rem; opacity: 0.9;">${r.winning_trades}W / ${r.losing_trades}L</p>
                        </div>

                        <div style="text-align: center; padding: 1rem; border-right: 1px solid rgba(255,255,255,0.2);">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Trades</p>
                            <p style="font-size: 2rem; font-weight: 700;">${r.total_trades}</p>
                            <p style="font-size: 1rem; opacity: 0.9;">Completed</p>
                        </div>

                        <div style="text-align: center; padding: 1rem;">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Max Drawdown</p>
                            <p style="font-size: 2rem; font-weight: 700;">${r.max_drawdown}%</p>
                            <p style="font-size: 1rem; opacity: 0.9;">Sharpe: ${r.sharpe_ratio}</p>
                        </div>
                    </div>
                </div>

                <!-- Detailed Metrics -->
                <div class="grid grid-cols-2" style="margin-top: 1.5rem;">
                    <div class="card">
                        <h4 style="font-weight: 700; margin-bottom: 1rem;">📊 Capital Performance</h4>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <span>Initial Capital</span>
                            <span style="font-weight: 600;">$${r.initial_capital.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <span>Final Capital</span>
                            <span style="font-weight: 600; color: ${profitColor};">$${r.final_capital.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem 0;">
                            <span>Profit/Loss</span>
                            <span style="font-weight: 700; font-size: 1.25rem; color: ${profitColor};">$${r.total_profit.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="card">
                        <h4 style="font-weight: 700; margin-bottom: 1rem;">📈 Risk Metrics</h4>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <span>Sharpe Ratio</span>
                            <span style="font-weight: 600;">${r.sharpe_ratio}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <span>Max Drawdown</span>
                            <span style="font-weight: 600; color: var(--accent-red);">${r.max_drawdown}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem 0;">
                            <span>Return on Investment</span>
                            <span style="font-weight: 700; font-size: 1.25rem; color: ${profitColor};">${r.roi}%</span>
                        </div>
                    </div>
                </div>

                <!-- Equity Curve -->
                <div class="card" style="margin-top: 1.5rem;">
                    <h4 style="font-weight: 700; margin-bottom: 1rem;">💰 Equity Curve</h4>
                    <div id="equity-chart"></div>
                </div>

                <!-- Recent Trades -->
                <div class="card" style="margin-top: 1.5rem;">
                    <h4 style="font-weight: 700; margin-bottom: 1rem;">📝 Recent Trades (Last 10)</h4>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Entry</th>
                                    <th>Exit</th>
                                    <th>Profit/Loss</th>
                                    <th>Result</th>
                                    <th>Exit Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${r.trades.map(trade => `
                                    <tr>
                                        <td>
                                            <span class="badge ${trade.type === 'LONG' ? 'badge-long' : 'badge-short'}">
                                                ${trade.type}
                                            </span>
                                        </td>
                                        <td>$${trade.entry_price.toFixed(2)}</td>
                                        <td>$${trade.exit_price.toFixed(2)}</td>
                                        <td style="color: ${trade.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: 600;">
                                            $${trade.profit.toFixed(2)}
                                        </td>
                                        <td>
                                            <span class="badge" style="background: ${trade.result === 'WIN' ? 'var(--accent-green)' : 'var(--accent-red)'};">
                                                ${trade.result}
                                            </span>
                                        </td>
                                        <td style="font-size: 0.875rem; color: var(--text-secondary);">${trade.exit_reason}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Interpretation -->
                <div class="card" style="margin-top: 1.5rem; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent-blue);">
                    <h4 style="font-weight: 700; margin-bottom: 1rem;">💡 Backtest Interpretation</h4>
                    <ul style="line-height: 1.8; padding-left: 1.5rem;">
                        <li><strong>Win Rate ${r.win_rate}%:</strong> ${this.interpretWinRate(r.win_rate)}</li>
                        <li><strong>ROI ${r.roi}%:</strong> ${this.interpretROI(r.roi)}</li>
                        <li><strong>Sharpe Ratio ${r.sharpe_ratio}:</strong> ${this.interpretSharpe(r.sharpe_ratio)}</li>
                        <li><strong>Max Drawdown ${r.max_drawdown}%:</strong> ${this.interpretDrawdown(r.max_drawdown)}</li>
                    </ul>
                    <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                        ⚠️ <strong>Remember:</strong> Past performance does not guarantee future results. Market conditions change constantly.
                    </p>
                </div>
            </div>
        `;

        // Render equity chart
        this.renderEquityChart(r.equity_curve);
    },

    renderEquityChart(equity) {
        const chartContainer = document.getElementById('equity-chart');
        if (!chartContainer) return;

        const labels = equity.map((_, i) => i.toString());
        const data = {
            labels: labels,
            values: equity
        };

        window.ChartUtils.createLineChart(chartContainer, data, {
            width: 800,
            height: 250,
            title: ''
        });
    },

    interpretWinRate(rate) {
        if (rate >= 70) return "Excellent win rate! Strategy shows strong predictive power.";
        if (rate >= 60) return "Good win rate. Strategy is performing well.";
        if (rate >= 50) return "Average win rate. Strategy is profitable but could be improved.";
        if (rate >= 40) return "Below average. Strategy needs optimization.";
        return "Poor win rate. Strategy requires significant improvements.";
    },

    interpretROI(roi) {
        if (roi >= 50) return "Outstanding returns!";
        if (roi >= 20) return "Very good returns.";
        if (roi >= 10) return "Decent returns.";
        if (roi >= 0) return "Modest positive returns.";
        return "Negative returns. Strategy lost money.";
    },

    interpretSharpe(sharpe) {
        if (sharpe >= 2) return "Excellent risk-adjusted returns.";
        if (sharpe >= 1) return "Good risk-adjusted returns.";
        if (sharpe >= 0) return "Acceptable risk-adjusted returns.";
        return "Poor risk-adjusted returns.";
    },

    interpretDrawdown(dd) {
        if (dd <= 10) return "Low drawdown - good capital preservation.";
        if (dd <= 20) return "Moderate drawdown - acceptable risk.";
        if (dd <= 30) return "High drawdown - significant risk exposure.";
        return "Very high drawdown - dangerous risk levels.";
    },

    async loadHistory() {
        try {
            const history = await window.API.request('/trading/backtest-history');
            const historyDiv = document.getElementById('backtest-history');

            if (!historyDiv || history.length === 0) return;

            historyDiv.innerHTML = `
                <div class="card" style="margin-top: 1.5rem;">
                    <h4 style="font-weight: 700; margin-bottom: 1rem;">📜 Backtest History</h4>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Pair</th>
                                    <th>Timeframe</th>
                                    <th>Period</th>
                                    <th>Win Rate</th>
                                    <th>ROI</th>
                                    <th>Trades</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${history.slice(0, 10).map(h => `
                                    <tr>
                                        <td style="font-weight: 600;">${h.pair}</td>
                                        <td>${h.timeframe}</td>
                                        <td style="font-size: 0.875rem;">${h.start_date.split('T')[0]} to ${h.end_date.split('T')[0]}</td>
                                        <td style="font-weight: 600;">${h.win_rate}%</td>
                                        <td style="color: ${h.total_profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: 600;">
                                            ${(h.total_profit / 10000 * 100).toFixed(2)}%
                                        </td>
                                        <td>${h.total_trades}</td>
                                        <td style="font-size: 0.875rem; color: var(--text-secondary);">
                                            ${new Date(h.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to load backtest history:', error);
        }
    }
};

// Win Rate Tracker Micro-App
window.winRateApp = {
    stats: null,

    async render(container) {
        container.innerHTML = '<div class="loading">Loading win rate statistics...</div>';

        try {
            this.stats = await window.API.request('/trading/win-rate');
            this.renderStats(container);
        } catch (error) {
            container.innerHTML = `
                <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                    <p style="color: var(--accent-red);">Error: ${error.message}</p>
                </div>
            `;
        }
    },

    renderStats(container) {
        const s = this.stats;

        if (s.total_signals === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">No Trading Data Yet</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                        Start analyzing signals and provide feedback to track your win rate
                    </p>
                    <button onclick="window.Router.navigateTo('trader-insight')" class="btn btn-primary">
                        Start Trading Analysis
                    </button>
                </div>
            `;
            return;
        }

        const winRateColor = s.win_rate >= 60 ? 'var(--accent-green)' : s.win_rate >= 50 ? 'var(--accent-blue)' : 'var(--accent-red)';
        const profitColor = s.total_profit_loss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

        container.innerHTML = `
            <div class="fade-in">
                <!-- Overall Performance -->
                <div class="card" style="background: linear-gradient(135deg, ${winRateColor}, ${winRateColor}88); color: white;">
                    <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem;">Your Trading Performance</h3>
                    <div class="grid grid-cols-4">
                        <div style="text-align: center; padding: 1rem; border-right: 1px solid rgba(255,255,255,0.3);">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Win Rate</p>
                            <p style="font-size: 3rem; font-weight: 700;">${s.win_rate}%</p>
                        </div>

                        <div style="text-align: center; padding: 1rem; border-right: 1px solid rgba(255,255,255,0.3);">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Signals</p>
                            <p style="font-size: 2.5rem; font-weight: 700;">${s.total_signals}</p>
                            <p style="font-size: 0.875rem; opacity: 0.9;">${s.winning_signals}W / ${s.losing_signals}L</p>
                        </div>

                        <div style="text-align: center; padding: 1rem; border-right: 1px solid rgba(255,255,255,0.3);">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Avg P/L</p>
                            <p style="font-size: 2.5rem; font-weight: 700;">${s.average_profit_loss.toFixed(2)}%</p>
                        </div>

                        <div style="text-align: center; padding: 1rem;">
                            <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total P/L</p>
                            <p style="font-size: 2.5rem; font-weight: 700;">${s.total_profit_loss.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>

                <!-- Signal Type Breakdown -->
                <div class="card" style="margin-top: 1.5rem;">
                    <h4 style="font-weight: 700; margin-bottom: 1rem;">📈 Performance by Signal Type</h4>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Signal</th>
                                    <th>Total</th>
                                    <th>Wins</th>
                                    <th>Win Rate</th>
                                    <th>Avg Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${s.by_signal_type.map(st => {
            const winRate = ((st.wins / st.count) * 100).toFixed(2);
            return `
                                        <tr>
                                            <td>
                                                <span class="badge ${st.signal === 'LONG' ? 'badge-long' : 'badge-short'}">
                                                    ${st.signal}
                                                </span>
                                            </td>
                                            <td style="font-weight: 600;">${st.count}</td>
                                            <td style="font-weight: 600; color: var(--accent-green);">${st.wins}</td>
                                            <td style="font-weight: 700; font-size: 1.25rem;">${winRate}%</td>
                                            <td style="color: ${st.avg_profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: 600;">
                                                ${st.avg_profit ? st.avg_profit.toFixed(2) : 0}%
                                            </td>
                                        </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Tips -->
                <div class="card" style="margin-top: 1.5rem; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent-blue);">
                    <h4 style="font-weight: 700; margin-bottom: 1rem;">💡 Performance Tips</h4>
                    <ul style="line-height: 1.8; padding-left: 1.5rem;">
                        <li>A win rate above 60% is considered excellent for crypto trading</li>
                        <li>Focus on signal types that perform best for you</li>
                        <li>Remember to set stop-loss orders to protect your capital</li>
                        <li>Track your trades to identify patterns and improve</li>
                        <li>Don't chase losses - stick to your strategy</li>
                    </ul>
                </div>
            </div>
        `;
    }
};