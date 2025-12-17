// Chart Utilities - Simple charting without external libraries
class ChartUtils {
    // Create a simple bar chart
    static createBarChart(container, data, options = {}) {
        const { labels = [], values = [], colors = [] } = data;
        const { height = 300, title = '' } = options;

        const maxValue = Math.max(...values);
        const chartHTML = `
            <div class="chart-container" style="padding: 1rem;">
                ${title ? `<h3 style="margin-bottom: 1rem;">${title}</h3>` : ''}
                <div class="chart" style="display: flex; align-items: flex-end; justify-content: space-around; height: ${height}px; border-bottom: 2px solid var(--border-color); gap: 0.5rem;">
                    ${values.map((value, i) => {
            const barHeight = (value / maxValue) * 100;
            const color = colors[i] || 'var(--accent-blue)';
            return `
                            <div class="bar-wrapper" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                <div class="bar-value" style="margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 600;">${value}</div>
                                <div class="bar" style="width: 100%; height: ${barHeight}%; background: ${color}; border-radius: 0.25rem 0.25rem 0 0; transition: all 0.3s;"></div>
                                <div class="bar-label" style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">${labels[i]}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
        container.innerHTML = chartHTML;
    }

    // Create a simple pie chart (using CSS)
    static createPieChart(container, data, options = {}) {
        const { labels = [], values = [], colors = [] } = data;
        const { size = 200, title = '' } = options;

        const total = values.reduce((a, b) => a + b, 0);
        let currentAngle = 0;

        const segments = values.map((value, i) => {
            const percentage = (value / total) * 100;
            const angle = (value / total) * 360;
            const color = colors[i] || `hsl(${i * 60}, 70%, 50%)`;

            const segment = {
                percentage: percentage.toFixed(1),
                angle,
                color,
                label: labels[i],
                value
            };

            currentAngle += angle;
            return segment;
        });

        const chartHTML = `
            <div class="pie-chart-container" style="padding: 1rem;">
                ${title ? `<h3 style="margin-bottom: 1rem;">${title}</h3>` : ''}
                <div style="display: flex; align-items: center; gap: 2rem;">
                    <div class="pie-chart" style="width: ${size}px; height: ${size}px; border-radius: 50%; background: conic-gradient(
                        ${segments.map((seg, i) => {
            const start = segments.slice(0, i).reduce((a, s) => a + s.angle, 0);
            const end = start + seg.angle;
            return `${seg.color} ${start}deg ${end}deg`;
        }).join(', ')}
                    );"></div>
                    <div class="pie-legend">
                        ${segments.map(seg => `
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <div style="width: 16px; height: 16px; background: ${seg.color}; border-radius: 0.25rem;"></div>
                                <div>
                                    <span style="font-weight: 600;">${seg.label}</span>
                                    <span style="color: var(--text-secondary); margin-left: 0.5rem;">${seg.value} (${seg.percentage}%)</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = chartHTML;
    }

    // Create a simple line chart using SVG
    static createLineChart(container, data, options = {}) {
        const { labels = [], values = [] } = data;
        const { width = 600, height = 300, title = '' } = options;

        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const range = maxValue - minValue;

        const points = values.map((value, i) => {
            const x = padding + (i / (values.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
            return `${x},${y}`;
        }).join(' ');

        const svgHTML = `
            <div class="line-chart-container" style="padding: 1rem;">
                ${title ? `<h3 style="margin-bottom: 1rem;">${title}</h3>` : ''}
                <svg width="${width}" height="${height}" style="background: var(--bg-tertiary); border-radius: 0.5rem;">
                    <!-- Grid lines -->
                    ${[0, 1, 2, 3, 4].map(i => {
            const y = padding + (i / 4) * chartHeight;
            return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border-color)" stroke-width="1"/>`;
        }).join('')}
                    
                    <!-- Line -->
                    <polyline points="${points}" fill="none" stroke="var(--accent-blue)" stroke-width="2"/>
                    
                    <!-- Points -->
                    ${values.map((value, i) => {
            const x = padding + (i / (values.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
            return `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent-blue)"/>`;
        }).join('')}
                    
                    <!-- Labels -->
                    ${labels.map((label, i) => {
            const x = padding + (i / (values.length - 1)) * chartWidth;
            return `<text x="${x}" y="${height - 10}" text-anchor="middle" fill="var(--text-secondary)" font-size="12">${label}</text>`;
        }).join('')}
                </svg>
            </div>
        `;
        container.innerHTML = svgHTML;
    }

    // Create stat cards
    static createStatCard(title, value, icon = '', color = 'blue') {
        return `
            <div class="card" style="background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">${title}</p>
                        <p style="font-size: 2rem; font-weight: 700;">${value}</p>
                    </div>
                    ${icon ? `<div style="padding: 1rem; background: var(--accent-${color}); border-radius: 0.5rem;">${icon}</div>` : ''}
                </div>
            </div>
        `;
    }
}

// Global instance
window.ChartUtils = ChartUtils;