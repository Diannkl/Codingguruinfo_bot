// Resources Hub Implementation
function loadResourcesHub() {
    const container = document.getElementById('main-container');
    
    // Render resources hub
    container.innerHTML = `
        <div class="resources-hub">
            <h2 class="section-title">Learning Resources</h2>
            
            <div class="search-section">
                <div class="search-container">
                    <input type="text" id="resource-search" class="search-input" placeholder="Search for resources...">
                    <button id="search-btn" class="search-button">🔍</button>
                </div>
                <div class="filter-tabs">
                    <button class="filter-tab active" data-filter="all">All</button>
                    <button class="filter-tab" data-filter="video">Videos</button>
                    <button class="filter-tab" data-filter="article">Articles</button>
                    <button class="filter-tab" data-filter="pdf">PDF Notes</button>
                    <button class="filter-tab" data-filter="github">Code</button>
                </div>
            </div>
            
            <div class="topics-filter">
                <label for="topic-select" class="filter-label">Topic:</label>
                <select id="topic-select" class="topic-select">
                    <option value="all">All Topics</option>
                    <option value="algorithms">Algorithms</option>
                    <option value="data-structures">Data Structures</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                    <option value="web-dev">Web Development</option>
                    <option value="databases">Databases</option>
                </select>
            </div>
            
            <div id="resources-container" class="resources-container">
                <div class="loading">Loading resources...</div>
            </div>
        </div>
    `;
    
    // Set up event listeners
    setupResourcesEvents();
    
    // Load resources with default filters
    loadResources('all', 'all', '');
}

// Set up events for resources hub
function setupResourcesEvents() {
    // Search input event
    const searchInput = document.getElementById('resource-search');
    const searchButton = document.getElementById('search-btn');
    
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
            const activeTopic = document.getElementById('topic-select').value;
            loadResources(activeFilter, activeTopic, this.value);
        }
    });
    
    searchButton.addEventListener('click', function() {
        const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
        const activeTopic = document.getElementById('topic-select').value;
        const searchQuery = document.getElementById('resource-search').value;
        loadResources(activeFilter, activeTopic, searchQuery);
    });
    
    // Filter tabs events
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Apply filter
            const filter = this.dataset.filter;
            const topic = document.getElementById('topic-select').value;
            const searchQuery = document.getElementById('resource-search').value;
            loadResources(filter, topic, searchQuery);
        });
    });
    
    // Topic select event
    document.getElementById('topic-select').addEventListener('change', function() {
        const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
        const searchQuery = document.getElementById('resource-search').value;
        loadResources(activeFilter, this.value, searchQuery);
    });
}

// Load resources from Firebase based on filters
function loadResources(typeFilter, topicFilter, searchQuery) {
    const resourcesContainer = document.getElementById('resources-container');
    resourcesContainer.innerHTML = '<div class="loading">Loading resources...</div>';
    
    // Create reference to resources in Firebase
    let resourcesRef = database.ref('resources');
    
    // Get resources and apply filters
    resourcesRef.once('value')
        .then(snapshot => {
            const resources = [];
            
            snapshot.forEach(childSnapshot => {
                const resource = childSnapshot.val();
                resource.id = childSnapshot.key;
                
                // Apply filters
                let includeResource = true;
                
                // Type filter
                if (typeFilter !== 'all' && resource.type !== typeFilter) {
                    includeResource = false;
                }
                
                // Topic filter
                if (topicFilter !== 'all' && resource.topic !== topicFilter) {
                    includeResource = false;
                }
                
                // Search query (case insensitive)
                if (searchQuery && searchQuery.trim() !== '') {
                    const query = searchQuery.toLowerCase();
                    const titleMatch = resource.title && resource.title.toLowerCase().includes(query);
                    const descriptionMatch = resource.description && resource.description.toLowerCase().includes(query);
                    const authorMatch = resource.author && resource.author.toLowerCase().includes(query);
                    
                    if (!titleMatch && !descriptionMatch && !authorMatch) {
                        includeResource = false;
                    }
                }
                
                if (includeResource) {
                    resources.push(resource);
                }
            });
            
            // Sort resources by date (newest first)
            resources.sort((a, b) => {
                const dateA = new Date(a.dateAdded || 0);
                const dateB = new Date(b.dateAdded || 0);
                return dateB - dateA;
            });
            
            // Render resources
            if (resources.length > 0) {
                renderResources(resources);
            } else {
                resourcesContainer.innerHTML = '<div class="empty-state">No resources found matching your filters.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading resources:', error);
            resourcesContainer.innerHTML = '<div class="error-state">Error loading resources. Please try again.</div>';
        });
}

// Render resources to the page
function renderResources(resources) {
    const resourcesContainer = document.getElementById('resources-container');
    
    const resourcesHTML = resources.map(resource => {
        // Get resource icon based on type
        let resourceIcon = '';
        switch (resource.type) {
            case 'video':
                resourceIcon = '🎬';
                break;
            case 'article':
                resourceIcon = '📄';
                break;
            case 'pdf':
                resourceIcon = '📕';
                break;
            case 'github':
                resourceIcon = '💻';
                break;
            default:
                resourceIcon = '🔗';
        }
        
        // Format date
        const dateAdded = resource.dateAdded ? new Date(resource.dateAdded) : new Date();
        const formattedDate = dateAdded.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        
        return `
            <div class="resource-card" data-id="${resource.id}">
                <div class="resource-icon">${resourceIcon}</div>
                <div class="resource-content">
                    <h3 class="resource-title">${resource.title}</h3>
                    <p class="resource-description">${resource.description}</p>
                    <div class="resource-meta">
                        <span class="resource-author">By ${resource.author || 'Unknown'}</span>
                        <span class="resource-date">${formattedDate}</span>
                    </div>
                </div>
                <button class="view-resource-btn" data-url="${resource.url}" data-type="${resource.type}">View</button>
            </div>
        `;
    }).join('');
    
    resourcesContainer.innerHTML = resourcesHTML;
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-resource-btn').forEach(button => {
        button.addEventListener('click', function() {
            const url = this.dataset.url;
            const type = this.dataset.type;
            
            if (url) {
                openResource(url, type);
            }
        });
    });
}

// Open resource based on type
function openResource(url, type) {
    // Log analytics event
    logAnalyticsEvent('resource_viewed', { 
        resource_type: type,
        resource_url: url
    });
    
    // Handle different resource types
    switch (type) {
        case 'video':
            // Show video in an embedded player
            showVideoPlayer(url);
            break;
            
        case 'pdf':
            // Show PDF in an embedded viewer
            showPdfViewer(url);
            break;
            
        default:
            // For other types, open in Telegram's browser
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.openLink(url);
            } else {
                window.open(url, '_blank');
            }
    }
}

// Show embedded video player
function showVideoPlayer(videoUrl) {
    // Create modal for video player
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    // Extract video ID if it's a YouTube URL
    let videoId = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const urlObj = new URL(videoUrl);
        if (videoUrl.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        } else {
            videoId = urlObj.pathname.substring(1);
        }
    }
    
    if (videoId) {
        modal.innerHTML = `
            <div class="modal-content video-modal">
                <div class="modal-header">
                    <button class="close-modal-btn">×</button>
                </div>
                <div class="video-container">
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `;
    } else {
        modal.innerHTML = `
            <div class="modal-content video-modal">
                <div class="modal-header">
                    <button class="close-modal-btn">×</button>
                </div>
                <div class="video-container">
                    <video controls autoplay>
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>
        `;
    }
    
    document.body.appendChild(modal);
    
    // Handle close button
    modal.querySelector('.close-modal-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Allow clicking outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Show embedded PDF viewer
function showPdfViewer(pdfUrl) {
    // Create modal for PDF viewer
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content pdf-modal">
            <div class="modal-header">
                <button class="close-modal-btn">×</button>
            </div>
            <div class="pdf-container">
                <iframe 
                    src="https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true" 
                    frameborder="0">
                </iframe>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close button
    modal.querySelector('.close-modal-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Allow clicking outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
} 