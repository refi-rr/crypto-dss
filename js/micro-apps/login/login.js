// Login Micro-App
window.loginApp = {
    async render(container) {
        container.innerHTML = `
            <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="width: 100%; max-width: 400px;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h1 style="font-size: 2rem; font-weight: 700; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem;">
                            CryptoDSS
                        </h1>
                        <p style="color: var(--text-secondary);">Decision Support System for Crypto Trading</p>
                    </div>

                    <form id="login-form">
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Username</label>
                            <input type="text" id="username" name="username" required placeholder="Enter username" style="width: 100%;">
                        </div>

                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Password</label>
                            <input type="password" id="password" name="password" required placeholder="Enter password" style="width: 100%;">
                        </div>

                        <div id="error-message" style="display: none; padding: 0.75rem; background: rgba(239, 68, 68, 0.2); border: 1px solid var(--accent-red); border-radius: 0.5rem; margin-bottom: 1rem; color: var(--accent-red); font-size: 0.875rem;">
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Login
                        </button>
                    </form>

                    <div style="margin-top: 1.5rem; text-align: center; font-size: 0.875rem; color: var(--text-secondary);">
                        <p>Demo Credentials:</p>
                        <p><strong>Username:</strong> admin | <strong>Password:</strong> admin123</p>
                    </div>
                </div>
            </div>
        `;

        this.attachEvents(container);
    },

    attachEvents(container) {
        const form = container.querySelector('#login-form');
        const errorMsg = container.querySelector('#error-message');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = form.username.value;
            const password = form.password.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            // Show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            errorMsg.style.display = 'none';

            try {
                await window.Auth.login(username, password);
                // Auth service will trigger navigation
            } catch (error) {
                errorMsg.textContent = error.message || 'Invalid credentials';
                errorMsg.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    }
};