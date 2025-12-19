// Terms & Disclaimer Component
window.TermsComponent = {
    async checkAndShowTerms() {
        try {
            const response = await window.API.request('/legal/has-accepted-terms');

            if (!response.has_accepted) {
                await this.showTermsModal();
            }
        } catch (error) {
            console.error('Failed to check terms acceptance:', error);
        }
    },

    async showTermsModal() {
        // Get terms and disclaimer
        const [terms, disclaimer] = await Promise.all([
            window.API.request('/legal/terms'),
            window.API.request('/legal/disclaimer')
        ]);

        const modalHTML = `
            <div id="terms-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; overflow: auto;">
                <div class="card" style="width: 90%; max-width: 800px; max-height: 90vh; overflow: auto; margin: 2rem;">
                    <div style="position: sticky; top: 0; background: var(--bg-secondary); padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; z-index: 1;">
                        <h2 style="font-size: 1.5rem; font-weight: 700;">⚠️ Important Legal Information</h2>
                        <p style="color: var(--text-secondary); margin-top: 0.5rem;">
                            Please read and accept our terms and risk disclaimer before continuing
                        </p>
                    </div>

                    <!-- Tabs -->
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border-color);">
                        <button id="tab-disclaimer" class="tab-btn active" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid var(--accent-red); font-weight: 600; cursor: pointer; color: var(--text-primary); margin-bottom: -2px;">
                            Risk Disclaimer
                        </button>
                        <button id="tab-terms" class="tab-btn" style="padding: 0.75rem 1.5rem; background: none; border: none; font-weight: 600; cursor: pointer; color: var(--text-secondary); margin-bottom: -2px;">
                            Terms of Service
                        </button>
                    </div>

                    <!-- Disclaimer Content -->
                    <div id="content-disclaimer" class="tab-content" style="display: block;">
                        <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid var(--accent-red); border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                            ${disclaimer.content}
                        </div>
                    </div>

                    <!-- Terms Content -->
                    <div id="content-terms" class="tab-content" style="display: none;">
                        <div style="line-height: 1.6;">
                            ${terms.content}
                        </div>
                    </div>

                    <!-- Acceptance Checkboxes -->
                    <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 0.5rem; margin-top: 1.5rem;">
                        <label style="display: flex; align-items: start; gap: 0.75rem; cursor: pointer; margin-bottom: 1rem;">
                            <input type="checkbox" id="accept-risk" style="margin-top: 0.25rem; width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1;">
                                I understand and accept the <strong>risks of cryptocurrency trading</strong>, including potential loss of all invested capital.
                            </span>
                        </label>

                        <label style="display: flex; align-items: start; gap: 0.75rem; cursor: pointer; margin-bottom: 1rem;">
                            <input type="checkbox" id="accept-terms" style="margin-top: 0.25rem; width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1;">
                                I have read and agree to the <strong>Terms of Service</strong>.
                            </span>
                        </label>

                        <label style="display: flex; align-items: start; gap: 0.75rem; cursor: pointer;">
                            <input type="checkbox" id="accept-no-advice" style="margin-top: 0.25rem; width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1;">
                                I understand that CryptoDSS <strong>does not provide financial advice</strong> and I am responsible for my own trading decisions.
                            </span>
                        </label>
                    </div>

                    <div id="acceptance-message" style="display: none; padding: 0.75rem; border-radius: 0.5rem; margin-top: 1rem; font-size: 0.875rem;">
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button id="accept-btn" class="btn btn-primary" style="flex: 1;" disabled>
                            Accept & Continue
                        </button>
                    </div>

                    <p style="text-align: center; font-size: 0.75rem; color: var(--text-secondary); margin-top: 1rem;">
                        You must accept all terms to use CryptoDSS
                    </p>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachModalEvents(terms.version);
    },

    attachModalEvents(termsVersion) {
        const modal = document.getElementById('terms-modal');
        const acceptRisk = document.getElementById('accept-risk');
        const acceptTerms = document.getElementById('accept-terms');
        const acceptNoAdvice = document.getElementById('accept-no-advice');
        const acceptBtn = document.getElementById('accept-btn');
        const messageDiv = document.getElementById('acceptance-message');

        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.id.replace('tab-', 'content-');

                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottom = 'none';
                    b.style.color = 'var(--text-secondary)';
                });

                btn.classList.add('active');
                btn.style.borderBottom = btn.id === 'tab-disclaimer' ? '2px solid var(--accent-red)' : '2px solid var(--accent-blue)';
                btn.style.color = 'var(--text-primary)';

                tabContents.forEach(content => {
                    content.style.display = 'none';
                });

                document.getElementById(targetId).style.display = 'block';
            });
        });

        // Enable button when all checked
        const checkAllAccepted = () => {
            if (acceptRisk.checked && acceptTerms.checked && acceptNoAdvice.checked) {
                acceptBtn.disabled = false;
            } else {
                acceptBtn.disabled = true;
            }
        };

        acceptRisk.addEventListener('change', checkAllAccepted);
        acceptTerms.addEventListener('change', checkAllAccepted);
        acceptNoAdvice.addEventListener('change', checkAllAccepted);

        // Accept button
        acceptBtn.addEventListener('click', async () => {
            acceptBtn.disabled = true;
            acceptBtn.textContent = 'Processing...';

            try {
                await window.API.request('/legal/accept-terms', {
                    method: 'POST',
                    body: JSON.stringify({ terms_version: termsVersion })
                });

                messageDiv.style.display = 'block';
                messageDiv.style.background = 'rgba(16, 185, 129, 0.2)';
                messageDiv.style.border = '1px solid var(--accent-green)';
                messageDiv.style.color = 'var(--accent-green)';
                messageDiv.textContent = '✓ Terms accepted! Welcome to CryptoDSS.';

                setTimeout(() => {
                    modal.remove();
                }, 1500);
            } catch (error) {
                messageDiv.style.display = 'block';
                messageDiv.style.background = 'rgba(239, 68, 68, 0.2)';
                messageDiv.style.border = '1px solid var(--accent-red)';
                messageDiv.style.color = 'var(--accent-red)';
                messageDiv.textContent = 'Failed to accept terms: ' + error.message;

                acceptBtn.disabled = false;
                acceptBtn.textContent = 'Accept & Continue';
            }
        });
    },

    // Show terms anytime (for settings/info)
    async showTermsInfo() {
        const [terms, disclaimer] = await Promise.all([
            window.API.request('/legal/terms'),
            window.API.request('/legal/disclaimer')
        ]);

        const modalHTML = `
            <div id="terms-info-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; overflow: auto;">
                <div class="card" style="width: 90%; max-width: 800px; max-height: 90vh; overflow: auto; margin: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="font-size: 1.5rem; font-weight: 700;">Legal Information</h2>
                        <button id="close-info-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">×</button>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border-color);">
                        <button id="info-tab-disclaimer" class="info-tab-btn active" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid var(--accent-red); font-weight: 600; cursor: pointer; color: var(--text-primary); margin-bottom: -2px;">
                            Risk Disclaimer
                        </button>
                        <button id="info-tab-terms" class="info-tab-btn" style="padding: 0.75rem 1.5rem; background: none; border: none; font-weight: 600; cursor: pointer; color: var(--text-secondary); margin-bottom: -2px;">
                            Terms of Service
                        </button>
                    </div>

                    <div id="info-content-disclaimer" class="info-tab-content" style="display: block;">
                        ${disclaimer.content}
                    </div>

                    <div id="info-content-terms" class="info-tab-content" style="display: none;">
                        ${terms.content}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Close button
        document.getElementById('close-info-modal').addEventListener('click', () => {
            document.getElementById('terms-info-modal').remove();
        });

        // Tab switching
        const tabBtns = document.querySelectorAll('.info-tab-btn');
        const tabContents = document.querySelectorAll('.info-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.id.replace('info-tab-', 'info-content-');

                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottom = 'none';
                    b.style.color = 'var(--text-secondary)';
                });

                btn.classList.add('active');
                btn.style.borderBottom = btn.id === 'info-tab-disclaimer' ? '2px solid var(--accent-red)' : '2px solid var(--accent-blue)';
                btn.style.color = 'var(--text-primary)';

                tabContents.forEach(content => {
                    content.style.display = 'none';
                });

                document.getElementById(targetId).style.display = 'block';
            });
        });
    }
};