// Members Micro-App
window.membersApp = {
    users: [],

    async render(container) {
        container.innerHTML = '<div class="loading">Loading members...</div>';

        try {
            this.users = await window.API.getUsers();
            this.renderMembers(container);
        } catch (error) {
            container.innerHTML = `
                <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red);">
                    <p style="color: var(--accent-red);">Failed to load members: ${error.message}</p>
                </div>
            `;
        }
    },

    renderMembers(container) {
        container.innerHTML = `
            <div class="fade-in">
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 700;">Member Management</h3>
                        <button id="add-member-btn" class="btn btn-primary">
                            <span>+ Add Member</span>
                        </button>
                    </div>

                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Subscription</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.users.map(user => `
                                    <tr>
                                        <td style="font-weight: 600;">${user.username}</td>
                                        <td>${user.email}</td>
                                        <td>
                                            <span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-member'}">
                                                ${user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${user.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                                                ${user.status}
                                            </span>
                                        </td>
                                        <td style="font-size: 0.875rem;">
                                            ${user.subscription_expired_at ? new Date(user.subscription_expired_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td>
                                            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;" onclick="window.membersApp.editUser(${user.id})">
                                                Edit
                                            </button>
                                            <button class="btn btn-danger" style="padding: 0.5rem 1rem;" onclick="window.membersApp.deleteUser(${user.id}, '${user.username}')">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Edit Modal (hidden by default) -->
                <div id="edit-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                    <div class="card" style="width: 100%; max-width: 500px; margin: 2rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Edit Member</h3>
                        <form id="edit-form">
                            <input type="hidden" id="edit-user-id">
                            
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Email</label>
                                <input type="email" id="edit-email" style="width: 100%;">
                            </div>

                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Role</label>
                                <select id="edit-role" style="width: 100%;">
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Status</label>
                                <select id="edit-status" style="width: 100%;">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Extend Subscription (days)</label>
                                <input type="number" id="edit-subscription" min="0" placeholder="30" style="width: 100%;">
                            </div>

                            <div style="display: flex; gap: 1rem;">
                                <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="window.membersApp.closeModal('edit-modal')">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary" style="flex: 1;">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Add Modal (hidden by default) -->
                <div id="add-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
                    <div class="card" style="width: 100%; max-width: 500px; margin: 2rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Add New Member</h3>
                        <form id="add-form">
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Username</label>
                                <input type="text" id="add-username" required style="width: 100%;" placeholder="Enter username">
                            </div>

                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Email</label>
                                <input type="email" id="add-email" required style="width: 100%;" placeholder="user@example.com">
                            </div>

                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Password</label>
                                <input type="password" id="add-password" required style="width: 100%;" placeholder="Minimum 6 characters">
                            </div>

                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Role</label>
                                <select id="add-role" style="width: 100%;">
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">Subscription Duration (days)</label>
                                <input type="number" id="add-subscription" min="1" value="30" style="width: 100%;">
                            </div>

                            <div style="display: flex; gap: 1rem;">
                                <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="window.membersApp.closeModal('add-modal')">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary" style="flex: 1;">
                                    Add Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.attachEvents(container);
    },

    attachEvents(container) {
        const addBtn = container.querySelector('#add-member-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddModal();
            });
        }

        const editForm = container.querySelector('#edit-form');
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveEdit();
            });
        }

        const addForm = container.querySelector('#add-form');
        if (addForm) {
            addForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addMember();
            });
        }
    },

    showAddModal() {
        const modal = document.getElementById('add-modal');
        modal.style.display = 'flex';
    },

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const modal = document.getElementById('edit-modal');
        modal.style.display = 'flex';

        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-role').value = user.role;
        document.getElementById('edit-status').value = user.status;
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId || 'edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    async addMember() {
        const username = document.getElementById('add-username').value;
        const email = document.getElementById('add-email').value;
        const password = document.getElementById('add-password').value;
        const role = document.getElementById('add-role').value;
        const subscriptionDays = parseInt(document.getElementById('add-subscription').value);

        try {
            await window.API.register({
                username,
                email,
                password,
                role,
                subscription_days: subscriptionDays
            });
            alert('Member added successfully!');
            this.closeModal('add-modal');
            // Reload members
            this.render(document.getElementById('micro-app-container'));
        } catch (error) {
            alert('Failed to add member: ' + error.message);
        }
    },

    async saveEdit() {
        const userId = document.getElementById('edit-user-id').value;
        const updates = {
            email: document.getElementById('edit-email').value,
            role: document.getElementById('edit-role').value,
            status: document.getElementById('edit-status').value
        };

        const subscriptionDays = document.getElementById('edit-subscription').value;
        if (subscriptionDays) {
            updates.subscription_days = parseInt(subscriptionDays);
        }

        try {
            await window.API.updateUser(userId, updates);
            alert('User updated successfully!');
            this.closeModal();
            // Reload members
            this.render(document.getElementById('micro-app-container'));
        } catch (error) {
            alert('Failed to update user: ' + error.message);
        }
    },

    async deleteUser(userId, username) {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
            return;
        }

        try {
            await window.API.deleteUser(userId);
            alert('User deleted successfully!');
            // Reload members
            this.render(document.getElementById('micro-app-container'));
        } catch (error) {
            alert('Failed to delete user: ' + error.message);
        }
    }
};