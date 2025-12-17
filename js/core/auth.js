// Auth Service - Manages authentication state
class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    async init() {
        const token = window.API.getToken();
        if (token) {
            try {
                this.currentUser = await window.API.getCurrentUser();
                this.isAuthenticated = true;
                return true;
            } catch (error) {
                this.logout();
                return false;
            }
        }
        return false;
    }

    async login(username, password) {
        try {
            const data = await window.API.login(username, password);
            this.currentUser = data.user;
            this.isAuthenticated = true;

            // Emit auth event
            window.dispatchEvent(new CustomEvent('auth:login', {
                detail: { user: this.currentUser }
            }));

            return data;
        } catch (error) {
            throw error;
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        window.API.clearToken();

        // Emit logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    getUser() {
        return this.currentUser;
    }

    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    isActive() {
        return this.currentUser?.status === 'active';
    }

    hasAccess(requiredRole) {
        if (!this.isAuthenticated) return false;
        if (requiredRole === 'admin') return this.isAdmin();
        return true;
    }

    checkSubscription() {
        if (this.isAdmin()) return true;
        if (!this.isActive()) return false;

        const expiredAt = this.currentUser?.subscription_expired_at;
        if (!expiredAt) return true;

        return new Date(expiredAt) > new Date();
    }
}

// Global instance
window.Auth = new AuthService();