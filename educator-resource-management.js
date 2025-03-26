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
            .then(resourceRef => {
                // If not public, create class resource assignments
                if (!isPublic && selectedClasses.length > 0) {
                    const assignmentPromises = selectedClasses.map(classId => {
                        const assignment = {
                            classId,
                            resourceId: resourceRef.key,
                            resourceTitle: title,
                            resourceType: type,
                            educatorId: currentUser.id,
                            assigned: firebase.database.ServerValue.TIMESTAMP
                        };
                        
                        return database.ref('class_resources').push(assignment);
                    });
                    
                    return Promise.all(assignmentPromises);
                }
            })
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
 * Show modal for assigning a resource to a class
 * @param {string} classId - Class ID
 */
function showAssignResourceModal(classId) {
    // Get class data
    database.ref(`classes/${classId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Class not found');
            }
            
            const classData = snapshot.val();
            classData.id = snapshot.key;
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            modal.innerHTML = `
                <div class="modal-content assign-resource-modal">
                    <div class="modal-header">
                        <h3>Assign Resource to ${classData.name}</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="assign-options">
                            <div class="option-tabs">
                                <button class="option-tab active" data-tab="existing">Existing Resources</button>
                                <button class="option-tab" data-tab="new">Create New Resource</button>
                            </div>
                            
                            <div class="option-panels">
                                <div id="existing-panel" class="option-panel active">
                                    <div class="form-group">
                                        <label for="resource-search">Search Resources:</label>
                                        <input type="text" id="resource-search" class="form-input" placeholder="Search by title or topic...">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="resource-filter">Filter by Type:</label>
                                        <select id="resource-filter" class="form-select">
                                            <option value="">All Types</option>
                                            <option value="Video">Videos</option>
                                            <option value="PDF">PDFs</option>
                                            <option value="Article">Articles</option>
                                            <option value="Website">Websites</option>
                                            <option value="Document">Documents</option>
                                            <option value="Presentation">Presentations</option>
                                            <option value="Audio">Audio</option>
                                            <option value="Image">Images</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    
                                    <div class="resource-results">
                                        <div class="loading-indicator">Loading resources...</div>
                                    </div>
                                </div>
                                
                                <div id="new-panel" class="option-panel">
                                    <form id="new-resource-form" class="resource-form">
                                        <div class="form-group">
                                            <label for="new-resource-title">Title</label>
                                            <input type="text" id="new-resource-title" class="form-input" required>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="new-resource-type">Type</label>
                                            <select id="new-resource-type" class="form-select" required>
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
                                            <label for="new-resource-url">URL</label>
                                            <input type="url" id="new-resource-url" class="form-input" required>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="new-resource-topic">Topic</label>
                                            <input type="text" id="new-resource-topic" class="form-input">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="new-resource-description">Description</label>
                                            <textarea id="new-resource-description" class="form-textarea" rows="4"></textarea>
                                        </div>
                                        
                                        <div class="form-actions">
                                            <button type="submit" class="submit-btn">Create and Assign</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Set up option tabs
            const tabs = modal.querySelectorAll('.option-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // Remove active class from all tabs
                    tabs.forEach(t => {
                        t.classList.remove('active');
                    });
                    
                    // Add active class to clicked tab
                    this.classList.add('active');
                    
                    // Show selected panel
                    const tabName = this.dataset.tab;
                    const panels = modal.querySelectorAll('.option-panel');
                    panels.forEach(panel => {
                        panel.classList.remove('active');
                    });
                    
                    modal.querySelector(`#${tabName}-panel`).classList.add('active');
                });
            });
            
            // Set up close button
            modal.querySelector('.close-modal-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Load existing resources
            loadExistingResources(classData);
            
            // Set up new resource form
            const newResourceForm = modal.querySelector('#new-resource-form');
            newResourceForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form values
                const title = modal.querySelector('#new-resource-title').value.trim();
                const type = modal.querySelector('#new-resource-type').value;
                const url = modal.querySelector('#new-resource-url').value.trim();
                const topic = modal.querySelector('#new-resource-topic').value.trim();
                const description = modal.querySelector('#new-resource-description').value.trim();
                
                // Validate form
                if (!title || !type || !url) {
                    showToast('Please fill in all required fields.', 'error');
                    return;
                }
                
                // Show loading state
                const submitBtn = newResourceForm.querySelector('.submit-btn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Creating...';
                
                // Create and assign resource
                createAndAssignResource(title, type, url, topic, description, classData, submitBtn);
            });
            
            // Set up search and filter
            const searchInput = modal.querySelector('#resource-search');
            const filterSelect = modal.querySelector('#resource-filter');
            
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    loadExistingResources(classData, this.value, filterSelect.value);
                }, 300);
            });
            
            filterSelect.addEventListener('change', function() {
                loadExistingResources(classData, searchInput.value, this.value);
            });
            
            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
            
            /**
             * Load existing resources for assignment
             * @param {Object} classData - Class data
             * @param {string} searchQuery - Search query (optional)
             * @param {string} filterType - Filter by resource type (optional)
             */
            function loadExistingResources(classData, searchQuery = '', filterType = '') {
                const resultsContainer = modal.querySelector('.resource-results');
                resultsContainer.innerHTML = '<div class="loading-indicator">Loading resources...</div>';
                
                const currentUser = getCurrentUser();
                
                // First, get resources already assigned to this class
                database.ref('class_resources')
                    .orderByChild('classId')
                    .equalTo(classData.id)
                    .once('value')
                    .then(assignmentsSnapshot => {
                        const assignedResourceIds = [];
                        
                        assignmentsSnapshot.forEach(childSnapshot => {
                            const assignment = childSnapshot.val();
                            assignedResourceIds.push(assignment.resourceId);
                        });
                        
                        // Then get educator's resources
                        return database.ref('resources')
                            .orderByChild('authorId')
                            .equalTo(currentUser.id)
                            .once('value')
                            .then(resourcesSnapshot => {
                                const resources = [];
                                
                                resourcesSnapshot.forEach(childSnapshot => {
                                    const resource = childSnapshot.val();
                                    resource.id = childSnapshot.key;
                                    
                                    // Skip if already assigned
                                    if (assignedResourceIds.includes(resource.id)) {
                                        return;
                                    }
                                    
                                    // Apply search filter
                                    if (searchQuery) {
                                        const title = (resource.title || '').toLowerCase();
                                        const topic = (resource.topic || '').toLowerCase();
                                        const description = (resource.description || '').toLowerCase();
                                        const query = searchQuery.toLowerCase();
                                        
                                        if (!title.includes(query) && !topic.includes(query) && !description.includes(query)) {
                                            return;
                                        }
                                    }
                                    
                                    // Apply type filter
                                    if (filterType && resource.type !== filterType) {
                                        return;
                                    }
                                    
                                    resources.push(resource);
                                });
                                
                                // Sort by creation date (newest first)
                                resources.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                                
                                return resources;
                            });
                    })
                    .then(resources => {
                        if (resources.length === 0) {
                            resultsContainer.innerHTML = `
                                <div class="empty-state">
                                    <p>No matching resources found. Try different search criteria or create a new resource.</p>
                                </div>
                            `;
                            return;
                        }
                        
                        // Render results
                        resultsContainer.innerHTML = `
                            <div class="resources-list">
                                ${resources.map(resource => `
                                    <div class="resource-result-item">
                                        <div class="resource-info">
                                            <div class="resource-title">${resource.title}</div>
                                            <div class="resource-meta">
                                                <span class="resource-type">${getResourceTypeIcon(resource.type)} ${resource.type}</span>
                                                <span class="resource-topic">${resource.topic || 'Uncategorized'}</span>
                                            </div>
                                            ${resource.description ? `<div class="resource-description">${truncateText(resource.description, 100)}</div>` : ''}
                                        </div>
                                        <button class="assign-btn" data-resource-id="${resource.id}">
                                            Assign
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                        
                        // Set up assign buttons
                        resultsContainer.querySelectorAll('.assign-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                const resourceId = this.dataset.resourceId;
                                const resource = resources.find(r => r.id === resourceId);
                                
                                if (resource) {
                                    assignResource(resource, classData);
                                }
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Error loading resources:', error);
                        resultsContainer.innerHTML = `
                            <div class="error-state">
                                <p>Error loading resources. Please try again.</p>
                            </div>
                        `;
                    });
            }
            
            /**
             * Assign a resource to a class
             * @param {Object} resource - Resource object
             * @param {Object} classData - Class data
             */
            function assignResource(resource, classData) {
                // Show loading toast
                showToast('Assigning resource...', 'info');
                
                const currentUser = getCurrentUser();
                
                // Create assignment object
                const assignment = {
                    classId: classData.id,
                    resourceId: resource.id,
                    resourceTitle: resource.title,
                    resourceType: resource.type,
                    educatorId: currentUser.id,
                    assigned: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Save to Firebase
                database.ref('class_resources').push(assignment)
                    .then(() => {
                        showToast('Resource assigned successfully.');
                        document.body.removeChild(modal);
                        
                        // Reload class resources if viewing class
                        if (document.querySelector('.class-detail')) {
                            showClassDetail(classData.id);
                        }
                        
                        // Log activity
                        logEducatorActivity('assign_resource', `Assigned resource to class: ${resource.title}`);
                    })
                    .catch(error => {
                        console.error('Error assigning resource:', error);
                        showToast('Error assigning resource. Please try again.', 'error');
                    });
            }
            
            /**
             * Create a new resource and assign it to a class
             * @param {string} title - Resource title
             * @param {string} type - Resource type
             * @param {string} url - Resource URL
             * @param {string} topic - Resource topic
             * @param {string} description - Resource description
             * @param {Object} classData - Class data
             * @param {HTMLElement} submitBtn - Submit button for loading state
             */
            function createAndAssignResource(title, type, url, topic, description, classData, submitBtn) {
                const currentUser = getCurrentUser();
                
                // Create resource object
                const resource = {
                    title,
                    type,
                    url,
                    topic: topic || 'Uncategorized',
                    description,
                    authorId: currentUser.id,
                    authorName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
                    isPublic: false,
                    classAccess: [classData.id],
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    viewCount: 0
                };
                
                // Save to Firebase
                database.ref('resources').push(resource)
                    .then(resourceRef => {
                        // Create class resource assignment
                        const assignment = {
                            classId: classData.id,
                            resourceId: resourceRef.key,
                            resourceTitle: title,
                            resourceType: type,
                            educatorId: currentUser.id,
                            assigned: firebase.database.ServerValue.TIMESTAMP
                        };
                        
                        return database.ref('class_resources').push(assignment);
                    })
                    .then(() => {
                        showToast('Resource created and assigned successfully.');
                        document.body.removeChild(modal);
                        
                        // Reload class resources if viewing class
                        if (document.querySelector('.class-detail')) {
                            showClassDetail(classData.id);
                        }
                        
                        // Log activity
                        logEducatorActivity('create_assign_resource', `Created and assigned resource: ${title}`);
                    })
                    .catch(error => {
                        console.error('Error creating and assigning resource:', error);
                        showToast('Error creating resource. Please try again.', 'error');
                        
                        // Reset button
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Create and Assign';
                    });
            }
        })
        .catch(error => {
            console.error('Error loading class data:', error);
            showToast('Error loading class data. Please try again.', 'error');
        });
}

/**
 * Confirm unassigning a resource from a class
 * @param {string} assignmentId - Resource assignment ID
 * @param {string} resourceTitle - Resource title
 */
function confirmUnassignResource(assignmentId, resourceTitle) {
    if (confirm(`Are you sure you want to unassign "${resourceTitle}" from this class?`)) {
        unassignResource(assignmentId);
    }
}

/**
 * Unassign a resource from a class
 * @param {string} assignmentId - Resource assignment ID
 */
function unassignResource(assignmentId) {
    // Show loading toast
    showToast('Unassigning resource...', 'info');
    
    // Get assignment info for logging
    database.ref(`class_resources/${assignmentId}`).once('value')
        .then(snapshot => {
            const assignment = snapshot.val();
            
            // Delete assignment
            return database.ref(`class_resources/${assignmentId}`).remove()
                .then(() => {
                    showToast('Resource unassigned successfully.');
                    
                    // Reload class resources if viewing class
                    if (document.querySelector('.class-detail')) {
                        showClassDetail(assignment.classId);
                    }
                    
                    // Log activity
                    logEducatorActivity('unassign_resource', `Unassigned resource: ${assignment.resourceTitle}`);
                });
        })
        .catch(error => {
            console.error('Error unassigning resource:', error);
            showToast('Error unassigning resource. Please try again.', 'error');
        });
} 