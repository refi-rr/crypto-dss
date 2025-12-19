// Email Verification Micro-App
window.verifyEmailApp = {
    async render(container) {
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            container.innerHTML = this.renderError('No verification token provided');
            return;
        }

        container.innerHTML = `
            <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="width: 100%; max-width: 500px; text-align: center;">
                    <div class="loading">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">✉️</div>
                        <p>Verifying your email...</p>
                    </div>
                </div>
            </div>
        `;

        try {
            await window.API.request('/auth/verify-email', {
                method: 'POST',
                body: JSON.stringify({ token }),
                skipAuth: true
            });

            container.innerHTML = this.renderSuccess();
        } catch (error) {
            container.innerHTML = this.renderError(error.message);
        }
    },

    renderSuccess() {
        return `
            <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="width: 100%; max-width: 500px; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">
                        Email Verified!
                    </h2>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                        Your email has been successfully verified. You can now log in to your account.
                    </p>
                    <button onclick="window.Router.navigateTo('login')" class="btn btn-primary">
                        Go to Login
                    </button>
                </div>
            </div>
        `;
    },

    renderError(message) {
        return `
            <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="width: 100%; max-width: 500px; text-align: center; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--accent-red);">
                        Verification Failed
                    </h2>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                        ${message}
                    </p>
                    <button onclick="window.Router.navigateTo('login')" class="btn btn-secondary">
                        Back to Login
                    </button>
                </div>
            </div>
        `;
    }
};