// Enhanced Community Wall Implementation

// Add file input for image uploads
function enhanceCommunityForm() {
    const postForm = document.querySelector('.post-form');
    if (!postForm) return;
    
    // Add hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'image-upload';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    postForm.appendChild(fileInput);
    
    // Add image attachment button and preview area
    const formFooter = document.querySelector('.post-form-footer');
    const postAttachments = document.createElement('div');
    postAttachments.className = 'post-attachments';
    postAttachments.innerHTML = `
        <button id="attach-image-btn" class="attach-image-btn">
            <span class="attach-icon">📷</span>
            <span>Add Image</span>
        </button>
        <div id="image-preview" class="image-preview">
            <img id="preview-image" class="preview-image">
            <button id="remove-image-btn" class="remove-image-btn">×</button>
        </div>
    `;
    
    formFooter.parentNode.insertBefore(postAttachments, formFooter.nextSibling);
    
    // Add event listeners for image upload
    document.getElementById('attach-image-btn').addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Check file type
            if (!file.type.match('image.*')) {
                showToast('Please select an image file.', 'error');
                return;
            }
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image file size must be less than 5MB.', 'error');
                return;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('preview-image').src = e.target.result;
                document.getElementById('image-preview').classList.add('active');
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('remove-image-btn').addEventListener('click', function() {
        fileInput.value = '';
        document.getElementById('image-preview').classList.remove('active');
    });
    
    // Enhance post submission to include image
    const submitBtn = document.getElementById('submit-post-btn');
    const originalClickHandler = submitBtn.onclick;
    
    submitBtn.onclick = function() {
        const content = document.getElementById('post-content').value.trim();
        const postType = document.querySelector('input[name="post-type"]:checked').value;
        const fileInput = document.getElementById('image-upload');
        const hasImage = fileInput.files && fileInput.files[0];
        
        // If no content and no image, show error
        if (!content && !hasImage) {
            showToast('Please enter some content or add an image for your post.', 'error');
            return;
        }
        
        const userId = getUserId();
        if (!userId) {
            showToast('You need to be logged in to post.', 'error');
            return;
        }
        
        // Disable button during upload
        submitBtn.disabled = true;
        
        if (hasImage) {
            // Upload image first, then create post
            uploadImage(fileInput.files[0], userId)
                .then(imageUrl => {
                    return submitPostWithImage(content, postType, imageUrl, userId);
                })
                .then(() => {
                    // Clear form and preview
                    document.getElementById('post-content').value = '';
                    fileInput.value = '';
                    document.getElementById('image-preview').classList.remove('active');
                    
                    // Show success message
                    showToast('Your post has been submitted!');
                    
                    // Reload posts
                    const currentFilter = document.querySelector('.community-filter.active').dataset.filter;
                    loadPosts(currentFilter, userId);
                    
                    // Enable button
                    submitBtn.disabled = false;
                })
                .catch(error => {
                    console.error('Error submitting post with image:', error);
                    showToast('Error submitting your post. Please try again.', 'error');
                    submitBtn.disabled = false;
                });
        } else {
            // No image, use original handler
            originalClickHandler.call(this);
        }
    };
}

// Upload image to Firebase Storage
function uploadImage(file, userId) {
    return new Promise((resolve, reject) => {
        // Simulate Firebase Storage upload
        // In a real implementation, you would use Firebase Storage
        // For this example, we'll simulate it with a setTimeout
        setTimeout(() => {
            // Generate a fake URL for demonstration
            const imageUrl = `https://example.com/images/${userId}_${Date.now()}.jpg`;
            resolve(imageUrl);
        }, 1500);
        
        // Real implementation would be:
        /*
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(`community-images/${userId}_${Date.now()}`);
        
        imageRef.put(file).then(snapshot => {
            return snapshot.ref.getDownloadURL();
        }).then(downloadURL => {
            resolve(downloadURL);
        }).catch(error => {
            reject(error);
        });
        */
    });
}

// Submit post with image
function submitPostWithImage(content, postType, imageUrl, userId) {
    return new Promise((resolve, reject) => {
        // Get user info
        database.ref(`users/${userId}`).once('value')
            .then(snapshot => {
                const userData = snapshot.val() || {};
                const userName = userData.firstName || 'Anonymous';
                const username = userData.username || '';
                
                // Create post data with image
                const postData = {
                    content: content,
                    type: postType,
                    authorId: userId,
                    authorName: userName,
                    authorUsername: username,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    imageUrl: imageUrl,
                    votes: {
                        up: 0,
                        down: 0
                    },
                    status: 'pending' // For moderation
                };
                
                // Add to Firebase
                const newPostRef = database.ref('communityPosts').push();
                return newPostRef.set(postData);
            })
            .then(() => {
                // Log analytics event
                logAnalyticsEvent('post_created', { 
                    post_type: postType,
                    has_image: true
                });
                
                resolve();
            })
            .catch(error => {
                reject(error);
            });
    });
}

// Enhanced post rendering to show images and moderation options
function enhancePostRendering() {
    // Override the original renderPosts function
    const originalRenderPosts = window.renderPosts;
    
    window.renderPosts = function(posts, currentUserId) {
        const postsContainer = document.getElementById('posts-container');
        
        const postsHTML = posts.map(post => {
            // Check if post is moderated
            const isModerated = post.status === 'pending' || post.status === 'flagged';
            const moderationBadge = isModerated ? 
                `<span class="moderation-badge">${post.status === 'pending' ? 'Pending Review' : 'Flagged'}</span>` : '';
            
            // Format timestamp
            const postDate = new Date(post.timestamp);
            const formattedDate = formatTimeAgo(postDate);
            
            // Get post type badge
            let typeBadge = '';
            switch (post.type) {
                case 'tip':
                    typeBadge = '<span class="post-type-badge tip">Tip</span>';
                    break;
                case 'question':
                    typeBadge = '<span class="post-type-badge question">Question</span>';
                    break;
                case 'meme':
                    typeBadge = '<span class="post-type-badge meme">Meme</span>';
                    break;
                default:
                    typeBadge = '';
            }
            
            // Calculate vote score
            const voteScore = (post.votes ? (post.votes.up || 0) - (post.votes.down || 0) : 0);
            
            // Check if current user has voted on this post
            const userVotes = post.userVotes || {};
            const hasUpvoted = userVotes[currentUserId] === 'up';
            const hasDownvoted = userVotes[currentUserId] === 'down';
            
            // Check if current user is the author or an admin
            const isAuthor = post.authorId === currentUserId;
            const isAdmin = checkIfUserIsAdmin(currentUserId);
            const showDeleteButton = isAuthor || isAdmin;
            
            // Generate image HTML if the post has an image
            const imageHTML = post.imageUrl ? 
                `<img src="${post.imageUrl}" class="post-image" alt="Post image">` : '';
            
            return `
                <div class="post-card ${isModerated ? 'moderated' : ''}" data-id="${post.id}">
                    <div class="post-header">
                        <div class="post-author">
                            <div class="author-avatar">${post.authorName.charAt(0)}</div>
                            <div class="author-info">
                                <span class="author-name">${post.authorName}</span>
                                ${post.authorUsername ? `<span class="author-username">@${post.authorUsername}</span>` : ''}
                            </div>
                        </div>
                        <div class="post-badges">
                            ${moderationBadge}
                            ${typeBadge}
                        </div>
                    </div>
                    <div class="post-content">${formatPostContent(post.content)}</div>
                    ${imageHTML}
                    <div class="post-footer">
                        <div class="post-actions">
                            <div class="post-votes">
                                <button class="vote-btn upvote ${hasUpvoted ? 'voted' : ''}" data-post-id="${post.id}" data-vote="up">
                                    <span class="vote-icon">👍</span>
                                    <span class="upvote-count">${post.votes ? (post.votes.up || 0) : 0}</span>
                                </button>
                                <button class="vote-btn downvote ${hasDownvoted ? 'voted' : ''}" data-post-id="${post.id}" data-vote="down">
                                    <span class="vote-icon">👎</span>
                                    <span class="downvote-count">${post.votes ? (post.votes.down || 0) : 0}</span>
                                </button>
                                <span class="vote-score">${voteScore > 0 ? '+' : ''}${voteScore}</span>
                            </div>
                            <div class="moderation-actions">
                                <button class="report-btn" data-post-id="${post.id}">Report</button>
                                ${showDeleteButton ? `<button class="delete-btn" data-post-id="${post.id}">Delete</button>` : ''}
                            </div>
                        </div>
                        <div class="post-time">${formattedDate}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        postsContainer.innerHTML = postsHTML;
        
        // Add event listeners to vote buttons
        document.querySelectorAll('.vote-btn').forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const voteType = this.dataset.vote;
                
                if (currentUserId) {
                    voteOnPost(postId, voteType, currentUserId);
                } else {
                    showToast('You need to be logged in to vote.', 'error');
                }
            });
        });
        
        // Add event listeners for report buttons
        document.querySelectorAll('.report-btn').forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                showReportModal(postId, currentUserId);
            });
        });
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                confirmDeletePost(postId, currentUserId);
            });
        });
    };
}

// Check if user is an admin
function checkIfUserIsAdmin(userId) {
    // In a real implementation, you would check against an admins list in Firebase
    // For this example, we'll use a simple array of admin IDs
    const adminIds = ['admin_user_id_1', 'admin_user_id_2'];
    return adminIds.includes(userId);
}

// Show report modal
function showReportModal(postId, userId) {
    // Create modal for reporting
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content report-modal">
            <div class="modal-header">
                <h3>Report Content</h3>
                <button class="close-modal-btn">×</button>
            </div>
            <div class="report-form">
                <div class="report-options">
                    <label class="report-option">
                        <input type="radio" name="report-reason" value="inappropriate" checked>
                        <div>
                            <div class="report-option-label">Inappropriate Content</div>
                            <div class="report-description">Content that violates community guidelines</div>
                        </div>
                    </label>
                    <label class="report-option">
                        <input type="radio" name="report-reason" value="spam">
                        <div>
                            <div class="report-option-label">Spam</div>
                            <div class="report-description">Irrelevant or promotional content</div>
                        </div>
                    </label>
                    <label class="report-option">
                        <input type="radio" name="report-reason" value="harmful">
                        <div>
                            <div class="report-option-label">Harmful Content</div>
                            <div class="report-description">Content that might be harmful to others</div>
                        </div>
                    </label>
                    <label class="report-option">
                        <input type="radio" name="report-reason" value="other">
                        <div>
                            <div class="report-option-label">Other</div>
                            <div class="report-description">Any other reason not listed</div>
                        </div>
                    </label>
                </div>
                <div class="report-buttons">
                    <button class="report-cancel-btn">Cancel</button>
                    <button class="report-submit-btn">Submit Report</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close button
    modal.querySelector('.close-modal-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Handle cancel button
    modal.querySelector('.report-cancel-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Handle submit button
    modal.querySelector('.report-submit-btn').addEventListener('click', function() {
        const reason = document.querySelector('input[name="report-reason"]:checked').value;
        submitReport(postId, reason, userId);
        document.body.removeChild(modal);
    });
    
    // Allow clicking outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Submit a report
function submitReport(postId, reason, userId) {
    // Create report object
    const reportData = {
        postId: postId,
        reason: reason,
        reportedBy: userId,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'pending'
    };
    
    // Add to Firebase
    const newReportRef = database.ref('reports').push();
    newReportRef.set(reportData)
        .then(() => {
            // Flag the post
            return database.ref(`communityPosts/${postId}`).update({
                status: 'flagged',
                reportCount: firebase.database.ServerValue.increment(1)
            });
        })
        .then(() => {
            showToast('Report submitted. Thank you for helping maintain our community!');
            
            // Send notification to Telegram bot for moderation
            sendModerationAlert(postId, reason);
        })
        .catch(error => {
            console.error('Error submitting report:', error);
            showToast('Error submitting report. Please try again.', 'error');
        });
}

// Confirm post deletion
function confirmDeletePost(postId, userId) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        deletePost(postId, userId);
    }
}

// Delete a post
function deletePost(postId, userId) {
    // Check if user is author or admin
    database.ref(`communityPosts/${postId}`).once('value')
        .then(snapshot => {
            const post = snapshot.val();
            
            if (!post) {
                showToast('Post not found.', 'error');
                return Promise.reject('Post not found');
            }
            
            const isAuthor = post.authorId === userId;
            const isAdmin = checkIfUserIsAdmin(userId);
            
            if (!isAuthor && !isAdmin) {
                showToast('You do not have permission to delete this post.', 'error');
                return Promise.reject('Permission denied');
            }
            
            // Delete post
            return database.ref(`communityPosts/${postId}`).remove();
        })
        .then(() => {
            showToast('Post deleted successfully.');
            
            // Reload posts
            const currentFilter = document.querySelector('.community-filter.active').dataset.filter;
            loadPosts(currentFilter, userId);
        })
        .catch(error => {
            if (typeof error === 'string') return; // Already handled
            console.error('Error deleting post:', error);
            showToast('Error deleting post. Please try again.', 'error');
        });
}

// Send moderation alert to Telegram bot
function sendModerationAlert(postId, reason) {
    // In a real implementation, you would send a request to your server
    // which would then send a message to the Telegram Bot API
    console.log(`Moderation alert sent for post ${postId} (${reason})`);
    
    // Example implementation using fetch:
    /*
    fetch('https://your-server.com/api/telegram-moderation-alert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            postId: postId,
            reason: reason
        })
    }).catch(error => {
        console.error('Error sending moderation alert:', error);
    });
    */
}

// Initialize enhanced community features
function initEnhancedCommunity() {
    enhanceCommunityForm();
    enhancePostRendering();
    
    // Add moderation filter for admins
    const userId = getUserId();
    if (checkIfUserIsAdmin(userId)) {
        const filtersContainer = document.querySelector('.community-filters');
        if (filtersContainer) {
            const moderationFilter = document.createElement('button');
            moderationFilter.className = 'community-filter';
            moderationFilter.dataset.filter = 'moderation';
            moderationFilter.textContent = 'Needs Moderation';
            filtersContainer.appendChild(moderationFilter);
            
            moderationFilter.addEventListener('click', function() {
                // Update active state
                document.querySelectorAll('.community-filter').forEach(f => f.classList.remove('active'));
                this.classList.add('active');
                
                // Load posts that need moderation
                loadModerationPosts(userId);
            });
        }
    }
}

// Load posts that need moderation
function loadModerationPosts(adminId) {
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = '<div class="loading">Loading posts for moderation...</div>';
    
    // Create reference to posts in Firebase
    const postsRef = database.ref('communityPosts')
        .orderByChild('status')
        .equalTo('flagged');
    
    // Get posts that need moderation
    postsRef.once('value')
        .then(snapshot => {
            const posts = [];
            
            snapshot.forEach(childSnapshot => {
                const post = childSnapshot.val();
                post.id = childSnapshot.key;
                posts.push(post);
            });
            
            // Sort posts (newest first)
            posts.sort((a, b) => b.timestamp - a.timestamp);
            
            // Render posts
            if (posts.length > 0) {
                renderPosts(posts, adminId);
            } else {
                postsContainer.innerHTML = '<div class="empty-state">No posts currently need moderation.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading moderation posts:', error);
            postsContainer.innerHTML = '<div class="error-state">Error loading posts. Please try again.</div>';
        });
} 