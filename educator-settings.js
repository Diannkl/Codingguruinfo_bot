/**
 * Load settings for the educator
 * @param {HTMLElement} container - Container element
 * @param {string} educatorId - Educator ID
 */
function loadEducatorSettings(container, educatorId) {
    // Show loading state
    container.innerHTML = '<div class="loading-indicator">Loading settings...</div>';
    
    // Fetch educator data
    database.ref(`educators/${educatorId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Educator not found');
            }
            
            const educatorData = snapshot.val();
            
            // Render settings form
            container.innerHTML = `
                <div class="settings-form">
                    <h3>Settings</h3>
                    <div class="form-group">
                        <label for="educator-name">Name</label>
                        <input type="text" id="educator-name" class="form-input" value="${educatorData.name || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="educator-email">Email</label>
                        <input type="email" id="educator-email" class="form-input" value="${educatorData.email || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="educator-bio">Bio</label>
                        <textarea id="educator-bio" class="form-textarea" rows="4">${educatorData.bio || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button class="cancel-btn">Cancel</button>
                        <button class="submit-btn">Save Changes</button>
                    </div>
                </div>
            `;
            
            // Set up form submission
            const form = container.querySelector('.settings-form');
            form.querySelector('.submit-btn').addEventListener('click', function() {
                const name = form.querySelector('#educator-name').value.trim();
                const email = form.querySelector('#educator-email').value.trim();
                const bio = form.querySelector('#educator-bio').value.trim();
                
                // Validate form
                if (!name || !email) {
                    showToast('Please fill in all required fields.', 'error');
                    return;
                }
                
                // Show loading state
                const submitBtn = this;
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Saving...';
                
                // Update educator data
                const updates = {
                    name,
                    email,
                    bio,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                };
                
                database.ref(`educators/${educatorId}`).update(updates)
                    .then(() => {
                        showToast('Settings updated successfully.');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Save Changes';
                    })
                    .catch(error => {
                        console.error('Error updating settings:', error);
                        showToast('Error updating settings. Please try again.', 'error');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Save Changes';
                    });
            });
            
            // Cancel button
            container.querySelector('.cancel-btn').addEventListener('click', function() {
                loadEducatorPortal();
            });
        })
        .catch(error => {
            console.error('Error loading educator settings:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Error loading settings. Please try again.</p>
                </div>
            `;
        });
} 