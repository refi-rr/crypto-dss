// API Service - Shared across all micro-apps
class ApiService {
    constructor() {
        this.baseURL = 'http://148.230.96.135:2401/api';
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    getToken() {
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);

            if (response.status === 401) {
                this.clearToken();
                window.dispatchEvent(new CustomEvent('auth:logout'));
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            skipAuth: true
        });
        this.setToken(data.access_token);
        return data;
    }

    async register(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            skipAuth: true
        });
    }

    async getCurrentUser() {
        return await this.request('/users/me');
    }

    // User management
    async getUsers() {
        return await this.request('/users');
    }

    async updateUser(userId, updates) {
        return await this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteUser(userId) {
        return await this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // Trading
    async getTradingPairs() {
        return await this.request('/trading/pairs');
    }

    async analyzeTrading(pair, timeframe) {
        return await this.request('/trading/analyze', {
            method: 'POST',
            body: JSON.stringify({ pair, timeframe })
        });
    }

    // Analytics
    async getDashboard() {
        return await this.request('/analytics/dashboard');
    }

    async getHistory() {
        return await this.request('/analytics/history');
    }
}

// Global instance
window.API = new ApiService();