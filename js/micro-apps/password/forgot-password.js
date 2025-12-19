// Forgot Password Micro-App
window.forgotPasswordApp = {
    async render(container) {
        container.innerHTML = `
            <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="width: 100%; max-width: 450px;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🔑</div>
                        <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem;">
                            Forgot Password?
                        </h1>
                        <p style="color: var(--text-secondary);">
                            Enter your email and we'll send you a reset link
                        </p>
                    </div>

                    <form id="forgot-password-form">
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">
                                Email Address
                            </label>
                            <input type="email" id="email" name="email" required 
                                   placeholder="your@email.com" style="width: 100%;">
                        </div>

                        <div id="message" style="display: none; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem;">
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">
                            Send Reset Link
                        </button>

                        <div style="text-align: center;">
                            <a href="#login" onclick="window.Router.navigateTo('login')" 
                               style="color: var(--accent-blue); text-decoration: none; font-size: 0.875rem;">
                                ← Back to Login
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.attachEvents(container);
    },

    attachEvents(container) {
        const form = container.querySelector('#forgot-password-form');
        const messageDiv = container.querySelector('#message');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = form.email.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            messageDiv.style.display = 'none';

            try {
                await window.API.request('/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email }),
                    skipAuth: true
                });

                messageDiv.style.display = 'block';
                messageDiv.style.background = 'rgba(16, 185, 129, 0.2)';
                messageDiv.style.border = '1px solid var(--accent-green)';
                messageDiv.style.color = 'var(--accent-green)';
                messageDiv.textContent = '✓ If an account exists with that email, you will receive a reset link shortly.';

                form.reset();
            } catch (error) {
                messageDiv.style.display = 'block';
                messageDiv.style.background = 'rgba(239, 68, 68, 0.2)';
                messageDiv.style.border = '1px solid var(--accent-red)';
                messageDiv.style.color = 'var(--accent-red)';
                messageDiv.textContent = error.message || 'Failed to send reset link';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Reset Link';
            }
        });
    }
};

// Reset Password Micro-App
window.resetPasswordApp = {
    async render(container) {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            container.innerHTML = `
                <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
                    <div class="card" style="width: 100%; max-width: 450px; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">
                            Invalid Reset Link
                        </h2>
                        <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                            This password reset link is invalid or has expired.
                        </p>
                        <button onclick="window.Router.navigateTo('forgot-password')" class="btn btn-primary">
                            Request New Link
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
                <div class="card" style="width: 100%; max-width: 450px;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🔐</div>
                        <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem;">
                            Reset Password
                        </h1>
                        <p style="color: var(--text-secondary);">
                            Enter your new password below
                        </p>
                    </div>

                    <form id="reset-password-form">
                        <input type="hidden" id="token" value="${token}">
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">
                                New Password
                            </label>
                            <input type="password" id="new-password" name="new_password" required 
                                   placeholder="Enter new password" minlength="6" style="width: 100%;">
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                Minimum 6 characters
                            </p>
                        </div>

                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">
                                Confirm Password
                            </label>
                            <input type="password" id="confirm-password" name="confirm_password" required 
                                   placeholder="Confirm new password" minlength="6" style="width: 100%;">
                        </div>

                        <div id="message" style="display: none; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem;">
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">
                            Reset Password
                        </button>

                        <div style="text-align: center;">
                            <a href="#login" onclick="window.Router.navigateTo('login')" 
                               style="color: var(--accent-blue); text-decoration: none; font-size: 0.875rem;">
                                ← Back to Login
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.attachEvents(container);
    },

    attachEvents(container) {
        const form = container.querySelector('#reset-password-form');
        const messageDiv = container.querySelector('#message');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = form.token.value;
            const newPassword = form['new-password'].value;
            const confirmPassword = form['confirm-password'].value;
            const submitBtn = form.querySelector('button[type="submit"]');

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                messageDiv.style.display = 'block';
                messageDiv.style.background = 'rgba(239, 68, 68, 0.2)';
                messageDiv.style.border = '1px solid var(--accent-red)';
                messageDiv.style.color = 'var(--accent-red)';
                messageDiv.textContent = 'Passwords do not match';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Resetting...';
            messageDiv.style.display = 'none';

            try {
                await window.API.request('/auth/reset-password', {
                    method: 'POST',
                    body: JSON.stringify({ token, new_password: newPassword }),
                    skipAuth: true
                });

                messageDiv.style.display = 'block';
                messageDiv.style.background = 'rgba(16, 185, 129, 0.2)';
                messageDiv.style.border = '1px solid var(--accent-green)';
                messageDiv.style.color = 'var(--accent-green)';
                messageDiv.textContent = '✓ Password reset successfully! Redirecting to login...';

                setTimeout(() => {
                    window.Router.navigateTo('login');
                }, 2000);
            } catch (error) {
                messageDiv.style.display = 'block';
                messageDiv.style.background = 'rgba(239, 68, 68, 0.2)';
                messageDiv.style.border = '1px solid var(--accent-red)';
                messageDiv.style.color = 'var(--accent-red)';
                messageDiv.textContent = error.message || 'Failed to reset password';

                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
            }
        });
    }
};