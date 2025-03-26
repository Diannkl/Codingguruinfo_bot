/**
 * Creates a comment element
 * @param {Object} comment - Comment object
 * @returns {string} Comment HTML
 */
function createCommentElement(comment) {
    const currentUserId = getCurrentUserId();
    const createdAt = comment.createdAt ? new Date(comment.createdAt) : null;
    const dateFormatted = createdAt ? formatTimeAgo(createdAt) : 'Unknown date';
    
    let deleteButton = '';
    if (comment.authorId === currentUserId || isUserModerator()) {
        deleteButton = `
            <button class="delete-comment-btn" data-comment-id="${comment.id}">
                <span class="action-icon">🗑️</span>
            </button>
        `;
    }
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-author">${comment.authorName || 'Anonymous'}</div>
                <div class="comment-date">${dateFormatted}</div>
                ${deleteButton}
            </div>
            <div class="comment-content">
                ${comment.content.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;
}

/**
 * Submits a comment on a post
 * @param {string} postId - ID of the post
 * @param {string} commentText - Comment text
 * @param {HTMLElement} modal - Modal element for UI updates
 */
function submitComment(postId, commentText, modal) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('You must be logged in to comment.', 'error');
        return;
    }
    
    // Create comment object
    const comment = {
        postId,
        content: commentText,
        authorId: currentUser.id,
        authorName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Show loading state
    const submitBtn = modal.querySelector('#submit-comment-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Posting...';
    
    // Save comment to Firebase
    database.ref('comments').push(comment)
        .then((commentRef) => {
            // Update comment count on post
            return database.ref(`posts/${postId}/commentCount`).transaction(currentCount => {
                return (currentCount || 0) + 1;
            });
        })
        .then(() => {
            // Clear comment input
            modal.querySelector('#comment-input').value = '';
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Post Comment';
            
            // Refresh comments
            showPostDetails(postId);
        })
        .catch(error => {
            console.error('Error posting comment:', error);
            showToast('Error posting comment. Please try again.', 'error');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Post Comment';
        });
}

/**
 * Shares a post by copying a link to clipboard
 * @param {string} postId - ID of the post
 */
function sharePost(postId) {
    // Create a share URL
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            showToast('Link copied to clipboard!');
        })
        .catch(error => {
            console.error('Error copying to clipboard:', error);
            showToast('Error copying link. Try again later.', 'error');
        });
}

/**
 * Shows modal for reporting a post
 * @param {string} postId - ID of the post
 */
function showReportPostModal(postId) {
    // Check if user is logged in
    if (!isUserLoggedIn()) {
        showToast('You need to be logged in to report posts.', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content report-modal">
            <div class="modal-header">
                <h3>Report Post</h3>
                <button class="close-modal-btn">×</button>
            </div>
            <div class="report-form">
                <p>Please select a reason for reporting this post:</p>
                
                <div class="form-group">
                    <select id="report-reason" class="form-select">
                        <option value="">Select a reason</option>
                        <option value="spam">Spam or promotional content</option>
                        <option value="inappropriate">Inappropriate or offensive content</option>
                        <option value="harassment">Harassment or bullying</option>
                        <option value="misinformation">False or misleading information</option>
                        <option value="other">Other (please specify)</option>
                    </select>
                </div>
                
                <div class="form-group" id="other-reason-group" style="display: none;">
                    <label for="other-reason">Please specify:</label>
                    <textarea id="other-reason" class="form-textarea" rows="3"></textarea>
                </div>
                
                <div class="form-actions">
                    <button class="cancel-btn">Cancel</button>
                    <button class="submit-btn" id="submit-report-btn">Submit Report</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show/hide other reason field
    const reasonSelect = modal.querySelector('#report-reason');
    const otherReasonGroup = modal.querySelector('#other-reason-group');
    
    reasonSelect.addEventListener('change', function() {
        if (this.value === 'other') {
            otherReasonGroup.style.display = 'block';
        } else {
            otherReasonGroup.style.display = 'none';
        }
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
    modal.querySelector('#submit-report-btn').addEventListener('click', function() {
        const reason = reasonSelect.value;
        
        if (!reason) {
            showToast('Please select a reason for reporting.', 'error');
            return;
        }
        
        let additionalInfo = '';
        if (reason === 'other') {
            additionalInfo = modal.querySelector('#other-reason').value.trim();
            if (!additionalInfo) {
                showToast('Please provide additional information.', 'error');
                return;
            }
        }
        
        submitReport(postId, reason, additionalInfo, modal);
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

/**
 * Submits a report for a post
 * @param {string} postId - ID of the post
 * @param {string} reason - Report reason
 * @param {string} additionalInfo - Additional information for 'other' reason
 * @param {HTMLElement} modal - Modal element
 */
function submitReport(postId, reason, additionalInfo, modal) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('You must be logged in to report posts.', 'error');
        return;
    }
    
    // Create report object
    const report = {
        postId,
        reason,
        additionalInfo,
        reporterId: currentUser.id,
        reporterName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        status: 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Show loading state
    const submitBtn = modal.querySelector('#submit-report-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting...';
    
    // Save report to Firebase
    database.ref('reports').push(report)
        .then(() => {
            showToast('Report submitted successfully. Our moderators will review it.');
            document.body.removeChild(modal);
        })
        .catch(error => {
            console.error('Error submitting report:', error);
            showToast('Error submitting report. Please try again.', 'error');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Report';
        });
}

/**
 * Confirms deletion of a post
 * @param {string} postId - ID of the post
 */
function confirmDeletePost(postId) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        deletePost(postId);
    }
}

/**
 * Deletes a post
 * @param {string} postId - ID of the post
 */
function deletePost(postId) {
    // Mark post as deleted instead of actually removing it
    database.ref(`posts/${postId}/status`).set('deleted')
        .then(() => {
            showToast('Post deleted successfully.');
            
            // Reload posts
            const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
            const category = document.getElementById('category-filter').value;
            loadPosts(activeFilter, category);
        })
        .catch(error => {
            console.error('Error deleting post:', error);
            showToast('Error deleting post. Please try again.', 'error');
        });
}

/**
 * Approves a pending post
 * @param {string} postId - ID of the post
 */
function approvePost(postId) {
    // Check if user is a moderator
    if (!isUserModerator()) {
        showToast('Only moderators can approve posts.', 'error');
        return;
    }
    
    // Update post status
    database.ref(`posts/${postId}/status`).set('approved')
        .then(() => {
            showToast('Post approved successfully.');
            
            // Reload posts
            const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
            const category = document.getElementById('category-filter').value;
            loadPosts(activeFilter, category);
        })
        .catch(error => {
            console.error('Error approving post:', error);
            showToast('Error approving post. Please try again.', 'error');
        });
}

/**
 * Loads the top contributors for the sidebar
 */
function loadTopContributors() {
    const contributorsContainer = document.getElementById('top-contributors');
    if (!contributorsContainer) return;
    
    // Show loading state
    contributorsContainer.innerHTML = '<div class="loading-indicator">Loading...</div>';
    
    // Get all posts
    database.ref('posts').once('value')
        .then(snapshot => {
            const posts = [];
            
            snapshot.forEach(childSnapshot => {
                const post = childSnapshot.val();
                post.id = childSnapshot.key;
                
                // Only include approved posts
                if (post.status === 'approved') {
                    posts.push(post);
                }
            });
            
            // Count posts by author
            const authorCounts = {};
            
            posts.forEach(post => {
                if (!post.authorId) return;
                
                if (!authorCounts[post.authorId]) {
                    authorCounts[post.authorId] = {
                        id: post.authorId,
                        name: post.authorName || 'Anonymous',
                        posts: 0,
                        score: 0
                    };
                }
                
                authorCounts[post.authorId].posts++;
                authorCounts[post.authorId].score += (post.score || 0);
            });
            
            // Convert to array and sort by post count + score
            const authors = Object.values(authorCounts);
            
            authors.sort((a, b) => {
                // Sort by combined score of posts and karma
                const scoreA = a.posts * 10 + a.score;
                const scoreB = b.posts * 10 + b.score;
                return scoreB - scoreA;
            });
            
            // Take top 5
            const topContributors = authors.slice(0, 5);
            
            // Render top contributors
            if (topContributors.length === 0) {
                contributorsContainer.innerHTML = '<div class="empty-state">No contributors yet.</div>';
                return;
            }
            
            contributorsContainer.innerHTML = topContributors.map((author, index) => `
                <div class="contributor-item">
                    <div class="contributor-rank">#${index + 1}</div>
                    <div class="contributor-info">
                        <div class="contributor-name">${author.name}</div>
                        <div class="contributor-stats">
                            <span>${author.posts} posts</span>
                            <span>${author.score} karma</span>
                        </div>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading top contributors:', error);
            contributorsContainer.innerHTML = '<div class="error-state">Error loading contributors</div>';
        });
}

/**
 * Checks if the current user is a moderator
 * @returns {boolean} True if user is a moderator
 */
function isUserModerator() {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    // In a real implementation, this would check the user's role
    // For this example, we'll consider educators as moderators
    return currentUser.role === 'educator';
} 