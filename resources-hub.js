/**
 * Resources Hub implementation with search, filtering and viewing capabilities
 */
function initResourcesHub() {
    const container = document.getElementById('resources-container');
    if (!container) return;
    
    // Render the resources hub interface
    container.innerHTML = `
        <div class="section-header-enhanced">
            <h2>Resources Hub <span class="help-icon" title="Find learning materials">?</span></h2>
            <div class="resources-actions">
                <button id="submit-resource-btn" class="secondary-button">
                    <span class="btn-icon">📤</span> Submit Resource
                </button>
            </div>
        </div>
        
        <div class="resources-search-container enhanced-card">
            <div class="search-bar">
                <input type="text" id="resource-search" class="search-input" placeholder="Search resources...">
                <button id="search-resources-btn" class="search-button">
                    <span class="btn-icon">🔍</span>
                </button>
            </div>
            
            <div class="filter-container">
                <div class="filter-group">
                    <label for="media-type-filter">Media Type</label>
                    <select id="media-type-filter" class="filter-select">
                        <option value="all">All Types</option>
                        <option value="video">Videos</option>
                        <option value="pdf">PDFs</option>
                        <option value="article">Articles</option>
                        <option value="interactive">Interactive</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="topic-filter">Topic</label>
                    <select id="topic-filter" class="filter-select">
                        <option value="all">All Topics</option>
                        <!-- Topics will be populated dynamically -->
                    </select>
                </div>
                <div class="filter-group">
                    <label for="sort-filter">Sort By</label>
                    <select id="sort-filter" class="filter-select">
                        <option value="recent">Most Recent</option>
                        <option value="popular">Most Popular</option>
                        <option value="recommended">Recommended</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div id="resources-list" class="resources-list">
            <div class="loading-state">
                <div class="skeleton-loader skeleton-card"></div>
                <div class="skeleton-loader skeleton-card"></div>
                <div class="skeleton-loader skeleton-card"></div>
            </div>
        </div>
        
        <div id="resources-pagination" class="pagination-container"></div>
    `;
    
    // Populate topics
    populateTopics();
    
    // Set up event listeners
    setupResourcesEvents();
    
    // Initial load of resources
    loadResources();
}

/**
 * Populates the topics dropdown from the database
 */
function populateTopics() {
    const topicSelect = document.getElementById('topic-filter');
    if (!topicSelect) return;
    
    // Show loading state
    topicSelect.innerHTML = '<option value="all">Loading topics...</option>';
    
    database.ref('resourceTopics').once('value')
        .then(snapshot => {
            const topics = snapshot.val() || {};
            
            // Reset select with "All Topics" option
            topicSelect.innerHTML = '<option value="all">All Topics</option>';
            
            // Add each topic as an option
            Object.entries(topics).forEach(([id, name]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                topicSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading topics:', error);
            topicSelect.innerHTML = '<option value="all">All Topics</option>';
        });
}

/**
 * Sets up event listeners for the resources hub
 */
function setupResourcesEvents() {
    // Search input
    const searchInput = document.getElementById('resource-search');
    const searchButton = document.getElementById('search-resources-btn');
    
    if (searchInput && searchButton) {
        // Search on enter key
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                loadResources();
            }
        });
        
        // Search on button click
        searchButton.addEventListener('click', function() {
            loadResources();
        });
    }
    
    // Filter changes
    const filters = [
        document.getElementById('media-type-filter'),
        document.getElementById('topic-filter'),
        document.getElementById('sort-filter')
    ];
    
    filters.forEach(filter => {
        if (filter) {
            filter.addEventListener('change', function() {
                loadResources();
            });
        }
    });
    
    // Submit resource button
    const submitButton = document.getElementById('submit-resource-btn');
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            showSubmitResourceModal();
        });
    }
}

/**
 * Loads resources based on selected filters
 * @param {number} page - Page number for pagination
 */
function loadResources(page = 1) {
    const resourcesList = document.getElementById('resources-list');
    if (!resourcesList) return;
    
    // Show loading state
    resourcesList.innerHTML = `
        <div class="loading-state">
            <div class="skeleton-loader skeleton-card"></div>
            <div class="skeleton-loader skeleton-card"></div>
            <div class="skeleton-loader skeleton-card"></div>
        </div>
    `;
    
    // Get filter values
    const searchQuery = document.getElementById('resource-search')?.value.trim() || '';
    const mediaType = document.getElementById('media-type-filter')?.value || 'all';
    const topic = document.getElementById('topic-filter')?.value || 'all';
    const sortBy = document.getElementById('sort-filter')?.value || 'recent';
    
    // Build query
    let query = database.ref('resources');
    
    // Apply filters
    if (mediaType !== 'all') {
        query = query.orderByChild('mediaType').equalTo(mediaType);
    }
    
    // Fetch data
    query.once('value')
        .then(snapshot => {
            const resources = [];
            
            snapshot.forEach(childSnapshot => {
                const resource = childSnapshot.val();
                resource.id = childSnapshot.key;
                
                // Apply additional filters that Firebase can't handle
                if (topic !== 'all' && resource.topicId !== topic) {
                    return;
                }
                
                // Apply search filter
                if (searchQuery && !resourceMatchesSearch(resource, searchQuery)) {
                    return;
                }
                
                resources.push(resource);
            });
            
            // Apply sorting
            sortResources(resources, sortBy);
            
            // Handle pagination
            const pageSize = 9;
            const totalPages = Math.ceil(resources.length / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pagedResources = resources.slice(startIndex, endIndex);
            
            // Render resources
            renderResources(pagedResources, resourcesList);
            
            // Update pagination
            updatePagination(page, totalPages, function(newPage) {
                loadResources(newPage);
            });
        })
        .catch(error => {
            console.error('Error loading resources:', error);
            resourcesList.innerHTML = `
                <div class="error-message">
                    Error loading resources. Please try again.
                </div>
            `;
        });
}

/**
 * Check if a resource matches the search query
 * @param {Object} resource - Resource object
 * @param {string} query - Search query
 * @returns {boolean} True if resource matches search
 */
function resourceMatchesSearch(resource, query) {
    const searchFields = [
        resource.title || '',
        resource.description || '',
        resource.author || '',
        resource.tags || []
    ];
    
    const queryLower = query.toLowerCase();
    
    return searchFields.some(field => {
        if (Array.isArray(field)) {
            return field.some(item => item.toLowerCase().includes(queryLower));
        }
        return field.toLowerCase().includes(queryLower);
    });
}

/**
 * Sort resources based on selected sort option
 * @param {Array} resources - Array of resource objects
 * @param {string} sortBy - Sort criteria
 */
function sortResources(resources, sortBy) {
    switch (sortBy) {
        case 'recent':
            resources.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
            break;
        case 'popular':
            resources.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
            break;
        case 'recommended':
            resources.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
            break;
    }
}

/**
 * Renders resources in the resources list
 * @param {Array} resources - Array of resource objects
 * @param {HTMLElement} container - Container element
 */
function renderResources(resources, container) {
    if (resources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <p>No resources found matching your criteria.</p>
                <p class="empty-suggestion">Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }
    
    // Create resources grid
    const resourcesGrid = document.createElement('div');
    resourcesGrid.className = 'resources-grid';
    
    // Render each resource
    resources.forEach(resource => {
        const resourceCard = createResourceCard(resource);
        resourcesGrid.appendChild(resourceCard);
    });
    
    // Clear container and add the grid
    container.innerHTML = '';
    container.appendChild(resourcesGrid);
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-resource-btn').forEach(button => {
        button.addEventListener('click', function() {
            const resourceId = this.dataset.resourceId;
            viewResource(resourceId);
        });
    });
}

/**
 * Creates a resource card element
 * @param {Object} resource - Resource object
 * @returns {HTMLElement} Resource card element
 */
function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = `resource-card enhanced-card ${resource.mediaType}`;
    
    // Format date
    const dateAdded = resource.dateAdded ? new Date(resource.dateAdded) : null;
    const dateFormatted = dateAdded ? formatTimeAgo(dateAdded) : 'Unknown date';
    
    // Determine icon based on media type
    let mediaIcon = '📄';
    switch (resource.mediaType) {
        case 'video': mediaIcon = '🎬'; break;
        case 'pdf': mediaIcon = '📑'; break;
        case 'article': mediaIcon = '📰'; break;
        case 'interactive': mediaIcon = '🎮'; break;
    }
    
    card.innerHTML = `
        <div class="resource-type-badge">${mediaIcon} ${resource.mediaType}</div>
        <h3 class="resource-title">${resource.title}</h3>
        <div class="resource-meta">
            <span class="resource-author">${resource.author || 'Unknown author'}</span>
            <span class="resource-date">${dateFormatted}</span>
        </div>
        <p class="resource-description">${truncateText(resource.description, 120)}</p>
        <div class="resource-tags">
            ${(resource.tags || []).map(tag => `<span class="resource-tag">${tag}</span>`).join('')}
        </div>
        <div class="resource-stats">
            <span class="resource-views"><span class="stat-icon">👁️</span> ${resource.viewCount || 0}</span>
            <span class="resource-rating">
                <span class="stat-icon">⭐</span> 
                ${resource.rating ? resource.rating.toFixed(1) : 'N/A'}
            </span>
        </div>
        <button class="view-resource-btn" data-resource-id="${resource.id}">
            View Resource
        </button>
    `;
    
    return card;
}

/**
 * Opens a resource for viewing
 * @param {string} resourceId - ID of the resource to view
 */
function viewResource(resourceId) {
    // Increment view count
    incrementResourceViewCount(resourceId);
    
    // Fetch resource details
    database.ref(`resources/${resourceId}`).once('value')
        .then(snapshot => {
            const resource = snapshot.val();
            if (!resource) {
                showToast('Resource not found.', 'error');
                return;
            }
            
            // Open resource based on type
            openResourceByType(resource);
        })
        .catch(error => {
            console.error('Error loading resource:', error);
            showToast('Error loading resource. Please try again.', 'error');
        });
}

/**
 * Increments the view count for a resource
 * @param {string} resourceId - ID of the resource
 */
function incrementResourceViewCount(resourceId) {
    const viewCountRef = database.ref(`resources/${resourceId}/viewCount`);
    
    viewCountRef.transaction(currentViews => {
        return (currentViews || 0) + 1;
    }).catch(error => {
        console.error('Error updating view count:', error);
    });
}

/**
 * Opens a resource based on its type
 * @param {Object} resource - Resource object
 */
function openResourceByType(resource) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    let contentHtml = '';
    
    switch (resource.mediaType) {
        case 'video':
            contentHtml = `
                <div class="video-container">
                    <iframe src="${resource.url}" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
            break;
            
        case 'pdf':
            contentHtml = `
                <div class="pdf-container">
                    <iframe src="${resource.url}" frameborder="0"></iframe>
                </div>
                <div class="resource-download">
                    <a href="${resource.url}" target="_blank" class="download-btn">
                        <span class="btn-icon">📥</span> Download PDF
                    </a>
                </div>
            `;
            break;
            
        case 'article':
            contentHtml = `
                <div class="article-container">
                    <iframe src="${resource.url}" frameborder="0"></iframe>
                </div>
                <div class="resource-open-external">
                    <a href="${resource.url}" target="_blank" class="external-link-btn">
                        <span class="btn-icon">🔗</span> Open in New Tab
                    </a>
                </div>
            `;
            break;
            
        case 'interactive':
            contentHtml = `
                <div class="interactive-container">
                    <iframe src="${resource.url}" frameborder="0"></iframe>
                </div>
            `;
            break;
            
        default:
            contentHtml = `
                <div class="generic-resource">
                    <p>This resource cannot be displayed inline.</p>
                    <a href="${resource.url}" target="_blank" class="external-link-btn">
                        <span class="btn-icon">🔗</span> Open Resource
                    </a>
                </div>
            `;
    }
    
    modal.innerHTML = `
        <div class="modal-content resource-modal">
            <div class="modal-header">
                <h3>${resource.title}</h3>
                <button class="close-modal-btn">×</button>
            </div>
            <div class="resource-content">
                ${contentHtml}
                
                <div class="resource-details">
                    <div class="resource-meta">
                        <span class="resource-author">${resource.author || 'Unknown author'}</span>
                        <span class="resource-date">Added ${resource.dateAdded ? formatTimeAgo(new Date(resource.dateAdded)) : 'Unknown date'}</span>
                    </div>
                    
                    <div class="resource-description-full">
                        <h4>Description</h4>
                        <p>${resource.description || 'No description available.'}</p>
                    </div>
                    
                    <div class="resource-tags-container">
                        <h4>Tags</h4>
                        <div class="resource-tags">
                            ${(resource.tags || []).map(tag => `<span class="resource-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="resource-rating-container">
                        <h4>Rate this resource</h4>
                        <div class="star-rating" data-resource-id="${resource.id}">
                            <span class="star" data-rating="1">★</span>
                            <span class="star" data-rating="2">★</span>
                            <span class="star" data-rating="3">★</span>
                            <span class="star" data-rating="4">★</span>
                            <span class="star" data-rating="5">★</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close button event listener
    modal.querySelector('.close-modal-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Star rating event listeners
    modal.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            const resourceId = this.closest('.star-rating').dataset.resourceId;
            rateResource(resourceId, rating);
            
            // Update UI
            updateStarRating(this.closest('.star-rating'), rating);
        });
    });
}

/**
 * Updates the star rating display
 * @param {HTMLElement} container - Rating container element
 * @param {number} rating - Selected rating (1-5)
 */
function updateStarRating(container, rating) {
    const stars = container.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

/**
 * Submits a rating for a resource
 * @param {string} resourceId - ID of the resource
 * @param {number} rating - Rating value (1-5)
 */
function rateResource(resourceId, rating) {
    // Get current user ID
    const userId = getCurrentUserId();
    if (!userId) {
        showToast('You need to be logged in to rate resources.', 'error');
        return;
    }
    
    // Save the user's rating
    database.ref(`userRatings/${resourceId}/${userId}`).set(rating)
        .then(() => {
            showToast('Thank you for rating this resource!');
            
            // Update the resource's average rating
            updateResourceAverageRating(resourceId);
        })
        .catch(error => {
            console.error('Error rating resource:', error);
            showToast('Error submitting rating. Please try again.', 'error');
        });
}

/**
 * Updates the average rating for a resource
 * @param {string} resourceId - ID of the resource
 */
function updateResourceAverageRating(resourceId) {
    database.ref(`userRatings/${resourceId}`).once('value')
        .then(snapshot => {
            const ratings = snapshot.val() || {};
            const ratingValues = Object.values(ratings);
            
            if (ratingValues.length === 0) return;
            
            // Calculate average
            const sum = ratingValues.reduce((total, rating) => total + rating, 0);
            const average = sum / ratingValues.length;
            
            // Update resource's average rating
            return database.ref(`resources/${resourceId}/rating`).set(average);
        })
        .catch(error => {
            console.error('Error updating average rating:', error);
        });
}

/**
 * Shows modal for submitting a new resource
 */
function showSubmitResourceModal() {
    // Check if user is logged in
    const userId = getCurrentUserId();
    if (!userId) {
        showToast('You need to be logged in to submit resources.', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content submit-resource-modal">
            <div class="modal-header">
                <h3>Submit a Resource</h3>
                <button class="close-modal-btn">×</button>
            </div>
            <div class="submit-resource-form">
                <div class="form-group">
                    <label for="resource-title">Title <span class="required">*</span></label>
                    <input type="text" id="resource-title" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label for="resource-url">Resource URL <span class="required">*</span></label>
                    <input type="url" id="resource-url" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label for="resource-media-type">Media Type <span class="required">*</span></label>
                    <select id="resource-media-type" class="form-select" required>
                        <option value="">Select a type</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="article">Article</option>
                        <option value="interactive">Interactive</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="resource-topic">Topic <span class="required">*</span></label>
                    <select id="resource-topic" class="form-select" required>
                        <option value="">Select a topic</option>
                        <!-- Topics will be populated dynamically -->
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="resource-description">Description</label>
                    <textarea id="resource-description" class="form-textarea" rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="resource-author">Author/Creator</label>
                    <input type="text" id="resource-author" class="form-input">
                </div>
                
                <div class="form-group">
                    <label for="resource-tags">Tags (comma separated)</label>
                    <input type="text" id="resource-tags" class="form-input" placeholder="tutorial, beginner, grammar, etc.">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="cancel-btn">Cancel</button>
                    <button type="button" class="submit-btn" id="submit-resource-form-btn">Submit Resource</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Populate topics dropdown
    const topicSelect = modal.querySelector('#resource-topic');
    database.ref('resourceTopics').once('value')
        .then(snapshot => {
            const topics = snapshot.val() || {};
            
            Object.entries(topics).forEach(([id, name]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                topicSelect.appendChild(option);
            });
        });
    
    // Close button event listener
    modal.querySelector('.close-modal-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Cancel button event listener
    modal.querySelector('.cancel-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Submit button event listener
    modal.querySelector('#submit-resource-form-btn').addEventListener('click', function() {
        submitResourceForm(modal);
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

/**
 * Submits the resource form data
 * @param {HTMLElement} modal - The modal element containing the form
 */
function submitResourceForm(modal) {
    // Get form values
    const title = modal.querySelector('#resource-title').value.trim();
    const url = modal.querySelector('#resource-url').value.trim();
    const mediaType = modal.querySelector('#resource-media-type').value;
    const topicId = modal.querySelector('#resource-topic').value;
    const description = modal.querySelector('#resource-description').value.trim();
    const author = modal.querySelector('#resource-author').value.trim();
    const tagsInput = modal.querySelector('#resource-tags').value.trim();
    
    // Validate required fields
    if (!title || !url || !mediaType || !topicId) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
        showToast('Please enter a valid URL.', 'error');
        return;
    }
    
    // Process tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    
    // Get current user ID
    const userId = getCurrentUserId();
    
    // Create resource object
    const resource = {
        title,
        url,
        mediaType,
        topicId,
        description,
        author,
        tags,
        submittedBy: userId,
        dateAdded: firebase.database.ServerValue.TIMESTAMP,
        viewCount: 0,
        status: 'pending' // Resources are pending until approved by an educator
    };
    
    // Save to Firebase
    database.ref('resources').push(resource)
        .then(() => {
            showToast('Resource submitted successfully! It will be reviewed by our team.');
            document.body.removeChild(modal);
            
            // Reload resources to show the new one (if it's already approved)
            loadResources();
        })
        .catch(error => {
            console.error('Error submitting resource:', error);
            showToast('Error submitting resource. Please try again.', 'error');
        });
} 