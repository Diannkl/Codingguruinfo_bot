/**
 * Show modal for creating a new resource
 */
function showCreateResourceModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content resource-modal">
            <div class="modal-header">
                <h3>Add New Resource</h3>
                <button class="close-modal-btn">×</button>
            </div>
            
            <div class="modal-body">
                <form id="resource-form" class="resource-form">
                    <div class="form-group">
                        <label for="resource-title">Title</label>
                        <input type="text" id="resource-title" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="resource-type">Type</label>
                        <select id="resource-type" class="form-select" required>
                            <option value="">Select resource type</option>
                            <option value="Video">Video</option>
                            <option value="PDF">PDF</option>
                            <option value="Article">Article</option>
                            <option value="Website">Website</option>
                            <option value="Document">Document</option>
                            <option value="Presentation">Presentation</option>
                            <option value="Audio">Audio</option>
                            <option value="Image">Image</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="resource-url">URL</label>
                        <input type="url" id="resource-url" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="resource-topic">Topic</label>
                        <input type="text" id="resource-topic" class="form-input">
                    </div>
                    
                    <div class="form-group">
                        <label for="resource-description">Description</label>
                        <textarea id="resource-description" class="form-textarea" rows="4"></textarea>
                    </div>
                    
                    <div class="form-group access-section">
                        <h4>Resource Access</h4>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="resource-public" checked>
                                Make this resource available to all students
                            </label>
                        </div>
                        
                        <div id="class-access-section" style="display: none;">
                            <div class="form-group">
                                <label>Restrict to specific classes:</label>
                                <div id="class-checkboxes" class="checkbox-list">
                                    <div class="loading-indicator">Loading classes...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Create Resource</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set up close button
    modal.querySelector('.close-modal-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Cancel button
    modal.querySelector('.cancel-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Public checkbox toggle
    const publicCheckbox = modal.querySelector('#resource-public');
    const classAccessSection = modal.querySelector('#class-access-section');
    
    publicCheckbox.addEventListener('change', function() {
        if (this.checked) {
            classAccessSection.style.display = 'none';
        } else {
            classAccessSection.style.display = 'block';
            loadClassCheckboxes();
        }
    });
    
    // Load class checkboxes if needed
    function loadClassCheckboxes() {
        const checkboxesContainer = modal.querySelector('#class-checkboxes');
        if (checkboxesContainer.children.length > 1) return; // Already loaded
        
        const currentUser = getCurrentUser();
        
        database.ref('classes')
            .orderByChild('educatorId')
            .equalTo(currentUser.id)
            .once('value')
            .then(snapshot => {
                const classes = [];
                
                snapshot.forEach(childSnapshot => {
                    const classData = childSnapshot.val();
                    classData.id = childSnapshot.key;
                    classes.push(classData);
                });
                
                if (classes.length === 0) {
                    checkboxesContainer.innerHTML = `
                        <div class="empty-state">
                            <p>You haven't created any classes yet.</p>
                        </div>
                    `;
                    return;
                }
                
                // Sort classes by name
                classes.sort((a, b) => a.name.localeCompare(b.name));
                
                // Create checkboxes
                checkboxesContainer.innerHTML = classes.map(cls => `
                    <label class="checkbox-label">
                        <input type="checkbox" name="class-access" value="${cls.id}">
                        ${cls.name}
                    </label>
                `).join('');
            })
            .catch(error => {
                console.error('Error loading classes:', error);
                checkboxesContainer.innerHTML = `
                    <div class="error-state">
                        <p>Error loading classes. Please try again.</p>
                    </div>
                `;
            });
    }
    
    // Form submission
    const form = modal.querySelector('#resource-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const title = modal.querySelector('#resource-title').value.trim();
        const type = modal.querySelector('#resource-type').value;
        const url = modal.querySelector('#resource-url').value.trim();
        const topic = modal.querySelector('#resource-topic').value.trim();
        const description = modal.querySelector('#resource-description').value.trim();
        const isPublic = modal.querySelector('#resource-public').checked;
        
        // Validate form
        if (!title) {
            showToast('Please enter a title for the resource.', 'error');
            return;
        }
        
        if (!type) {
            showToast('Please select a resource type.', 'error');
            return;
        }
        
        if (!url) {
            showToast('Please enter a URL for the resource.', 'error');
            return;
        }
        
        // Get selected classes if not public
        const selectedClasses = [];
        if (!isPublic) {
            const classCheckboxes = modal.querySelectorAll('input[name="class-access"]:checked');
            classCheckboxes.forEach(checkbox => {
                selectedClasses.push(checkbox.value);
            });
            
            if (selectedClasses.length === 0) {
                showToast('Please select at least one class or make the resource public.', 'error');
                return;
            }
        }
        
        // Show loading state
        const submitBtn = modal.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Creating...';
        
        // Create resource object
        const currentUser = getCurrentUser();
        const resource = {
            title,
            type,
            url,
            topic: topic || 'Uncategorized',
            description,
            authorId: currentUser.id,
            authorName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
            isPublic,
            classAccess: selectedClasses,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            viewCount: 0
        };
        
        // Save to Firebase
        database.ref('resources').push(resource)
            .then(() => {
                showToast('Resource created successfully.');
                document.body.removeChild(modal);
                
                // Reload resources if on content management tab
                const contentPanel = document.querySelector('#content-tab.tab-content.active');
                if (contentPanel) {
                    const resourcesPanel = contentPanel.querySelector('#resources-panel.content-panel.active');
                    if (resourcesPanel) {
                        loadResources(resourcesPanel, currentUser.id);
                    }
                }
                
                // Log activity
                logEducatorActivity('create_resource', `Created resource: ${title}`);
            })
            .catch(error => {
                console.error('Error creating resource:', error);
                showToast('Error creating resource. Please try again.', 'error');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Resource';
            });
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

/**
 * Show modal for editing a resource
 * @param {string} resourceId - Resource ID
 */
function showEditResourceModal(resourceId) {
    // Show loading toast
    showToast('Loading resource data...', 'info');
    
    // Fetch resource data
    database.ref(`resources/${resourceId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Resource not found');
            }
            
            const resource = snapshot.val();
            resource.id = snapshot.key;
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            modal.innerHTML = `
                <div class="modal-content resource-modal">
                    <div class="modal-header">
                        <h3>Edit Resource</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="resource-form" class="resource-form">
                            <div class="form-group">
                                <label for="resource-title">Title</label>
                                <input type="text" id="resource-title" class="form-input" required value="${resource.title || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="resource-type">Type</label>
                                <select id="resource-type" class="form-select" required>
                                    <option value="">Select resource type</option>
                                    <option value="Video" ${resource.type === 'Video' ? 'selected' : ''}>Video</option>
                                    <option value="PDF" ${resource.type === 'PDF' ? 'selected' : ''}>PDF</option>
                                    <option value="Article" ${resource.type === 'Article' ? 'selected' : ''}>Article</option>
                                    <option value="Website" ${resource.type === 'Website' ? 'selected' : ''}>Website</option>
                                    <option value="Document" ${resource.type === 'Document' ? 'selected' : ''}>Document</option>
                                    <option value="Presentation" ${resource.type === 'Presentation' ? 'selected' : ''}>Presentation</option>
                                    <option value="Audio" ${resource.type === 'Audio' ? 'selected' : ''}>Audio</option>
                                    <option value="Image" ${resource.type === 'Image' ? 'selected' : ''}>Image</option>
                                    <option value="Other" ${resource.type === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="resource-url">URL</label>
                                <input type="url" id="resource-url" class="form-input" required value="${resource.url || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="resource-topic">Topic</label>
                                <input type="text" id="resource-topic" class="form-input" value="${resource.topic || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="resource-description">Description</label>
                                <textarea id="resource-description" class="form-textarea" rows="4">${resource.description || ''}</textarea>
                            </div>
                            
                            <div class="form-group access-section">
                                <h4>Resource Access</h4>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="resource-public" ${resource.isPublic ? 'checked' : ''}>
                                        Make this resource available to all students
                                    </label>
                                </div>
                                
                                <div id="class-access-section" style="display: ${resource.isPublic ? 'none' : 'block'};">
                                    <div class="form-group">
                                        <label>Restrict to specific classes:</label>
                                        <div id="class-checkboxes" class="checkbox-list">
                                            <div class="loading-indicator">Loading classes...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="cancel-btn">Cancel</button>
                                <button type="submit" class="submit-btn">Update Resource</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Set up close button
            modal.querySelector('.close-modal-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Cancel button
            modal.querySelector('.cancel-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Public checkbox toggle
            const publicCheckbox = modal.querySelector('#resource-public');
            const classAccessSection = modal.querySelector('#class-access-section');
            
            publicCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    classAccessSection.style.display = 'none';
                } else {
                    classAccessSection.style.display = 'block';
                    loadClassCheckboxes();
                }
            });
            
            // Load class checkboxes
            function loadClassCheckboxes() {
                const checkboxesContainer = modal.querySelector('#class-checkboxes');
                
                database.ref('classes')
                    .orderByChild('educatorId')
                    .equalTo(resource.authorId)
                    .once('value')
                    .then(snapshot => {
                        const classes = [];
                        
                        snapshot.forEach(childSnapshot => {
                            const classData = childSnapshot.val();
                            classData.id = childSnapshot.key;
                            classes.push(classData);
                        });
                        
                        if (classes.length === 0) {
                            checkboxesContainer.innerHTML = `
                                <div class="empty-state">
                                    <p>You haven't created any classes yet.</p>
                                </div>
                            `;
                            return;
                        }
                        
                        // Sort classes by name
                        classes.sort((a, b) => a.name.localeCompare(b.name));
                        
                        // Create checkboxes
                        checkboxesContainer.innerHTML = classes.map(cls => `
                            <label class="checkbox-label">
                                <input type="checkbox" name="class-access" value="${cls.id}" ${resource.classAccess && resource.classAccess.includes(cls.id) ? 'checked' : ''}>
                                ${cls.name}
                            </label>
                        `).join('');
                    })
                    .catch(error => {
                        console.error('Error loading classes:', error);
                        checkboxesContainer.innerHTML = `
                            <div class="error-state">
                                <p>Error loading classes. Please try again.</p>
                            </div>
                        `;
                    });
            }
            
            // Load class checkboxes if not public
            if (!resource.isPublic) {
                loadClassCheckboxes();
            }
            
            // Form submission
            const form = modal.querySelector('#resource-form');
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form values
                const title = modal.querySelector('#resource-title').value.trim();
                const type = modal.querySelector('#resource-type').value;
                const url = modal.querySelector('#resource-url').value.trim();
                const topic = modal.querySelector('#resource-topic').value.trim();
                const description = modal.querySelector('#resource-description').value.trim();
                const isPublic = modal.querySelector('#resource-public').checked;
                
                // Validate form
                if (!title) {
                    showToast('Please enter a title for the resource.', 'error');
                    return;
                }
                
                if (!type) {
                    showToast('Please select a resource type.', 'error');
                    return;
                }
                
                if (!url) {
                    showToast('Please enter a URL for the resource.', 'error');
                    return;
                }
                
                // Get selected classes if not public
                const selectedClasses = [];
                if (!isPublic) {
                    const classCheckboxes = modal.querySelectorAll('input[name="class-access"]:checked');
                    classCheckboxes.forEach(checkbox => {
                        selectedClasses.push(checkbox.value);
                    });
                    
                    if (selectedClasses.length === 0) {
                        showToast('Please select at least one class or make the resource public.', 'error');
                        return;
                    }
                }
                
                // Show loading state
                const submitBtn = modal.querySelector('.submit-btn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Updating...';
                
                // Update resource object
                const updates = {
                    title,
                    type,
                    url,
                    topic: topic || 'Uncategorized',
                    description,
                    isPublic,
                    classAccess: selectedClasses,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Save to Firebase
                database.ref(`resources/${resourceId}`).update(updates)
                    .then(() => {
                        showToast('Resource updated successfully.');
                        document.body.removeChild(modal);
                        
                        // Reload resources if on content management tab
                        const contentPanel = document.querySelector('#content-tab.tab-content.active');
                        if (contentPanel) {
                            const resourcesPanel = contentPanel.querySelector('#resources-panel.content-panel.active');
                            if (resourcesPanel) {
                                loadResources(resourcesPanel, resource.authorId);
                            }
                        }
                        
                        // Log activity
                        logEducatorActivity('update_resource', `Updated resource: ${title}`);
                    })
                    .catch(error => {
                        console.error('Error updating resource:', error);
                        showToast('Error updating resource. Please try again.', 'error');
                        
                        // Reset button
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Update Resource';
                    });
            });
            
            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        })
        .catch(error => {
            console.error('Error loading resource for editing:', error);
            showToast('Error loading resource data. Please try again.', 'error');
        });
}

/**
 * Confirm deletion of a resource
 * @param {string} resourceId - Resource ID
 */
function confirmDeleteResource(resourceId) {
    if (confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
        deleteResource(resourceId);
    }
}

/**
 * Delete a resource
 * @param {string} resourceId - Resource ID
 */
function deleteResource(resourceId) {
    // Show loading toast
    showToast('Deleting resource...', 'info');
    
    // Get resource info for logging
    database.ref(`resources/${resourceId}`).once('value')
        .then(snapshot => {
            const resource = snapshot.val();
            
            // Delete from Firebase
            return database.ref(`resources/${resourceId}`).remove()
                .then(() => {
                    showToast('Resource deleted successfully.');
                    
                    // Reload resources if on content management tab
                    const contentPanel = document.querySelector('#content-tab.tab-content.active');
                    if (contentPanel) {
                        const resourcesPanel = contentPanel.querySelector('#resources-panel.content-panel.active');
                        if (resourcesPanel) {
                            loadResources(resourcesPanel, resource.authorId);
                        }
                    }
                    
                    // Log activity
                    logEducatorActivity('delete_resource', `Deleted resource: ${resource.title}`);
                });
        })
        .catch(error => {
            console.error('Error deleting resource:', error);
            showToast('Error deleting resource. Please try again.', 'error');
        });
} 