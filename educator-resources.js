/**
 * Load resources for the content management
 * @param {HTMLElement} container - Container element
 * @param {string} educatorId - Educator ID
 */
function loadResources(container, educatorId) {
    // Show loading state
    container.innerHTML = '<div class="loading-indicator">Loading resources...</div>';
    
    // Fetch resources
    database.ref('resources')
        .orderByChild('authorId')
        .equalTo(educatorId)
        .once('value')
        .then(snapshot => {
            const resources = [];
            
            snapshot.forEach(childSnapshot => {
                const resource = childSnapshot.val();
                resource.id = childSnapshot.key;
                resources.push(resource);
            });
            
            // Sort by creation date (newest first)
            resources.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            if (resources.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't added any resources yet.</p>
                        <button class="primary-btn" onclick="showCreateResourceModal()">Add Resource</button>
                    </div>
                `;
                return;
            }
            
            // Group by type
            const typeGroups = {};
            
            resources.forEach(resource => {
                const type = resource.type || 'Other';
                
                if (!typeGroups[type]) {
                    typeGroups[type] = [];
                }
                
                typeGroups[type].push(resource);
            });
            
            // Render resources by type
            const typeNames = Object.keys(typeGroups).sort();
            
            container.innerHTML = `
                <div class="resource-type-tabs">
                    ${typeNames.map((type, index) => `
                        <button class="resource-type-tab ${index === 0 ? 'active' : ''}" data-type="${type}">
                            ${getResourceTypeIcon(type)} ${type} (${typeGroups[type].length})
                        </button>
                    `).join('')}
                </div>
                
                <div class="resources-grid">
                    ${renderResources(typeGroups[typeNames[0]] || [])}
                </div>
            `;
            
            // Set up type tab navigation
            const typeTabs = container.querySelectorAll('.resource-type-tab');
            typeTabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // Remove active class from all tabs
                    typeTabs.forEach(t => {
                        t.classList.remove('active');
                    });
                    
                    // Add active class to clicked tab
                    this.classList.add('active');
                    
                    // Load resources for the selected type
                    const type = this.dataset.type;
                    const resourcesGrid = container.querySelector('.resources-grid');
                    resourcesGrid.innerHTML = renderResources(typeGroups[type] || []);
                    
                    // Set up resource action buttons
                    setupResourceActions();
                });
            });
            
            // Set up resource action buttons
            setupResourceActions();
        })
        .catch(error => {
            console.error('Error loading resources:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Error loading resources. Please try again.</p>
                    <button class="primary-btn" onclick="loadResources(this.parentNode.parentNode, '${educatorId}')">Retry</button>
                </div>
            `;
        });
}

/**
 * Render resources
 * @param {Array} resources - Array of resource objects
 * @returns {string} HTML for the resources
 */
function renderResources(resources) {
    if (resources.length === 0) {
        return `
            <div class="empty-state">
                <p>No resources found for this type.</p>
            </div>
        `;
    }
    
    return `
        <div class="resources-list">
            ${resources.map(resource => `
                <div class="resource-card" data-resource-id="${resource.id}">
                    <div class="resource-type-icon">${getResourceTypeIcon(resource.type)}</div>
                    
                    <div class="resource-content">
                        <h4 class="resource-title">${resource.title}</h4>
                        <div class="resource-description">${resource.description || 'No description'}</div>
                        <div class="resource-meta">
                            <span class="resource-topic">${resource.topic || 'Uncategorized'}</span>
                            <span class="resource-date">${formatTimeAgo(new Date(resource.createdAt || 0))}</span>
                        </div>
                    </div>
                    
                    <div class="resource-actions">
                        <button class="icon-btn view-resource-btn" data-resource-id="${resource.id}" title="View Resource">
                            <span class="action-icon">👁️</span>
                        </button>
                        <button class="icon-btn edit-resource-btn" data-resource-id="${resource.id}" title="Edit Resource">
                            <span class="action-icon">✏️</span>
                        </button>
                        <button class="icon-btn delete-resource-btn" data-resource-id="${resource.id}" title="Delete Resource">
                            <span class="action-icon">🗑️</span>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Get icon for resource type
 * @param {string} type - Resource type
 * @returns {string} Icon for the resource type
 */
function getResourceTypeIcon(type) {
    switch (type) {
        case 'Video':
            return '🎬';
        case 'PDF':
            return '📄';
        case 'Article':
            return '📰';
        case 'Website':
            return '🌐';
        case 'Document':
            return '📑';
        case 'Presentation':
            return '📊';
        case 'Audio':
            return '🎧';
        case 'Image':
            return '🖼️';
        default:
            return '📚';
    }
}

/**
 * Set up resource action buttons
 */
function setupResourceActions() {
    // View resource buttons
    document.querySelectorAll('.view-resource-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const resourceId = this.dataset.resourceId;
            viewResource(resourceId);
        });
    });
    
    // Edit resource buttons
    document.querySelectorAll('.edit-resource-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const resourceId = this.dataset.resourceId;
            showEditResourceModal(resourceId);
        });
    });
    
    // Delete resource buttons
    document.querySelectorAll('.delete-resource-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const resourceId = this.dataset.resourceId;
            confirmDeleteResource(resourceId);
        });
    });
    
    // Clickable resource cards
    document.querySelectorAll('.resource-card').forEach(card => {
        card.addEventListener('click', function() {
            const resourceId = this.dataset.resourceId;
            viewResource(resourceId);
        });
    });
}

/**
 * View resource
 * @param {string} resourceId - Resource ID
 */
function viewResource(resourceId) {
    // Fetch resource data
    database.ref(`resources/${resourceId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Resource not found');
            }
            
            const resource = snapshot.val();
            resource.id = snapshot.key;
            
            // Create modal for resource viewer
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            // Different content based on resource type
            let resourceContent = '';
            
            switch (resource.type) {
                case 'Video':
                    if (resource.url && resource.url.includes('youtube.com')) {
                        // Extract YouTube video ID
                        const videoId = extractYouTubeId(resource.url);
                        if (videoId) {
                            resourceContent = `
                                <div class="video-container">
                                    <iframe 
                                        src="https://www.youtube.com/embed/${videoId}" 
                                        frameborder="0" 
                                        allowfullscreen
                                    ></iframe>
                                </div>
                            `;
                        } else {
                            resourceContent = `
                                <div class="resource-link">
                                    <a href="${resource.url}" target="_blank" rel="noopener noreferrer">
                                        Open Video in New Tab
                                    </a>
                                </div>
                            `;
                        }
                    } else if (resource.url) {
                        resourceContent = `
                            <div class="resource-link">
                                <a href="${resource.url}" target="_blank" rel="noopener noreferrer">
                                    Open Video in New Tab
                                </a>
                            </div>
                        `;
                    }
                    break;
                    
                case 'PDF':
                    if (resource.url) {
                        resourceContent = `
                            <div class="pdf-container">
                                <iframe 
                                    src="${resource.url}" 
                                    frameborder="0"
                                ></iframe>
                            </div>
                        `;
                    }
                    break;
                    
                case 'Website':
                case 'Article':
                    if (resource.url) {
                        resourceContent = `
                            <div class="website-container">
                                <iframe 
                                    src="${resource.url}" 
                                    frameborder="0"
                                ></iframe>
                            </div>
                            
                            <div class="resource-link">
                                <a href="${resource.url}" target="_blank" rel="noopener noreferrer">
                                    Open in New Tab
                                </a>
                            </div>
                        `;
                    }
                    break;
                    
                case 'Image':
                    if (resource.url) {
                        resourceContent = `
                            <div class="image-container">
                                <img src="${resource.url}" alt="${resource.title}">
                            </div>
                        `;
                    }
                    break;
                    
                default:
                    if (resource.url) {
                        resourceContent = `
                            <div class="resource-link">
                                <a href="${resource.url}" target="_blank" rel="noopener noreferrer">
                                    Open Resource in New Tab
                                </a>
                            </div>
                        `;
                    }
            }
            
            modal.innerHTML = `
                <div class="modal-content resource-viewer-modal">
                    <div class="modal-header">
                        <h3>${resource.title}</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="resource-details">
                            <div class="detail-item">
                                <span class="detail-label">Type:</span>
                                <span class="detail-value">${getResourceTypeIcon(resource.type)} ${resource.type}</span>
                            </div>
                            
                            <div class="detail-item">
                                <span class="detail-label">Topic:</span>
                                <span class="detail-value">${resource.topic || 'Uncategorized'}</span>
                            </div>
                            
                            ${resource.description ? `
                                <div class="detail-item description">
                                    <span class="detail-label">Description:</span>
                                    <span class="detail-value">${resource.description}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="resource-viewer">
                            ${resourceContent || `
                                <div class="empty-state">
                                    <p>No preview available for this resource.</p>
                                    ${resource.url ? `
                                        <a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="primary-btn">
                                            Open Resource
                                        </a>
                                    ` : ''}
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Set up close button
            modal.querySelector('.close-modal-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
            
            // Update view count
            database.ref(`resources/${resourceId}/viewCount`).transaction(currentCount => {
                return (currentCount || 0) + 1;
            });
        })
        .catch(error => {
            console.error('Error viewing resource:', error);
            showToast('Error loading resource. Please try again.', 'error');
        });
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} YouTube video ID or null if not found
 */
function extractYouTubeId(url) {
    if (!url) return null;
    
    // Match YouTube video ID from various URL formats
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[7].length === 11) ? match[7] : null;
} 