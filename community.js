// Community Wall Implementation
function loadCommunityWall() {
    const container = document.getElementById('main-container');
    const userId = getUserId();
    
    // Render community wall
    container.innerHTML = `
        <div class="community-wall">
            <h2 class="section-title">Community Wall</h2>
            
            <div class="post-form-container">
                <div class="post-form">
                    <textarea id="post-content" class="post-input" placeholder="Share a coding tip, question, or meme..."></textarea>
                    <div class="post-form-footer">
                        <div class="post-type-selector">
                            <label class="post-type-option">
                                <input type="radio" name="post-type" value="tip" checked> Tip
                            </label>
                            <label class="post-type-option">
                                <input type="radio" name="post-type" value="question"> Question
                            </label>
                            <label class="post-type-option">
                                <input type="radio" name="post-type" value="meme"> Meme
                            </label>
                        </div>
                        <button id="submit-post-btn" class="submit-post-btn">Post</button>
                    </div>
                </div>
            </div>
            
            <div class="community-filters">
                <button class="community-filter active" data-filter="recent">Recent</button>
                <button class="community-filter" data-filter="trending">Trending</button>
                <button class="community-filter" data-filter="questions">Questions</button>
                <button class="community-filter" data-filter="tips">Tips</button>
                <button class="community-filter" data-filter="memes">Memes</button>
                <button class="community-filter" data-filter="my-posts">My Posts</button>
            </div>
            
            <div id="posts-container" class="posts-container">
                <div class="loading">Loading posts...</div>
            </div>
        </div>
    `;
    
    // Set up event listeners
    setupCommunityEvents(userId);
    
    // Load posts with default filter (recent)
    loadPosts('recent', userId);
}

// Set up events for community wall
function setupCommunityEvents(userId) {
    // Submit post event
    const submitButton = document.getElementById('submit-post-btn');
    submitButton.addEventListener('click', function() {
        const content = document.getElementById('post-content').value.trim();
        if (content) {
            const postType = document.querySelector('input[name="post-type"]:checked').value;
            submitPost(content, postType, userId);
        } else {
            showToast('Please enter some content for your post.', 'error');
        }
    });
    
    // Filter events
    document.querySelectorAll('.community-filter').forEach(filter => {
        filter.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.community-filter').forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            
            // Apply filter
            const filterType = this.dataset.filter;
            loadPosts(filterType, userId);
        });
    });
}

// Submit a new post
function submitPost(content, postType, userId) {
    if (!userId) {
        showToast('You need to be logged in to post.', 'error');
        return;
    }
    
    // Get user info
    database.ref(`users/${userId}`).once('value')
        .then(snapshot => {
            const userData = snapshot.val() || {};
            const userName = userData.firstName || 'Anonymous';
            const username = userData.username || '';
            
            // Create post data
            const postData = {
                content: content,
                type: postType,
                authorId: userId,
                authorName: userName,
                authorUsername: username,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                votes: {
                    up: 0,
                    down: 0
                }
            };
            
            // Add to Firebase
            const newPostRef = database.ref('communityPosts').push();
            newPostRef.set(postData)
                .then(() => {
                    // Clear form and reload posts
                    document.getElementById('post-content').value = '';
                    
                    // Show success message
                    showToast('Your post has been submitted!');
                    
                    // Reload posts with the current filter
                    const currentFilter = document.querySelector('.community-filter.active').dataset.filter;
                    loadPosts(currentFilter, userId);
                    
                    // Log analytics event
                    logAnalyticsEvent('post_created', { post_type: postType });
                })
                .catch(error => {
                    console.error('Error submitting post:', error);
                    showToast('Error submitting your post. Please try again.', 'error');
                });
        });
}

// Load posts from Firebase based on filter
function loadPosts(filter, userId) {
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
    
    // Create reference to posts in Firebase
    let postsRef = database.ref('communityPosts');
    
    // Apply ordering based on filter
    switch (filter) {
        case 'trending':
            // Order by total votes (up - down)
            postsRef = postsRef.orderByChild('trendingScore');
            break;
        case 'questions':
            postsRef = postsRef.orderByChild('type').equalTo('question');
            break;
        case 'tips':
            postsRef = postsRef.orderByChild('type').equalTo('tip');
            break;
        case 'memes':
            postsRef = postsRef.orderByChild('type').equalTo('meme');
            break;
        case 'my-posts':
            if (userId) {
                postsRef = postsRef.orderByChild('authorId').equalTo(userId);
            } else {
                postsContainer.innerHTML = '<div class="empty-state">You need to be logged in to see your posts.</div>';
                return;
            }
            break;
        case 'recent':
        default:
            // Order by timestamp (newest first)
            postsRef = postsRef.orderByChild('timestamp');
            break;
    }
    
    // Get posts and apply filter
    postsRef.once('value')
        .then(snapshot => {
            const posts = [];
            
            snapshot.forEach(childSnapshot => {
                const post = childSnapshot.val();
                post.id = childSnapshot.key;
                posts.push(post);
            });
            
            // Sort posts (newest first for most filters)
            if (filter === 'recent' || filter === 'questions' || filter === 'tips' || filter === 'memes' || filter === 'my-posts') {
                posts.sort((a, b) => b.timestamp - a.timestamp);
            } else if (filter === 'trending') {
                // For trending, already sorted by trendingScore from Firebase
                posts.reverse(); // Reverse to get highest score first
            }
            
            // Render posts
            if (posts.length > 0) {
                renderPosts(posts, userId);
            } else {
                postsContainer.innerHTML = '<div class="empty-state">No posts found.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading posts:', error);
            postsContainer.innerHTML = '<div class="error-state">Error loading posts. Please try again.</div>';
        });
}

// Render posts to the page
function renderPosts(posts, currentUserId) {
    const postsContainer = document.getElementById('posts-container');
    
    const postsHTML = posts.map(post => {
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
        
        return `
            <div class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <span class="author-name">${post.authorName}</span>
                        ${post.authorUsername ? `<span class="author-username">@${post.authorUsername}</span>` : ''}
                    </div>
                    ${typeBadge}
                </div>
                <div class="post-content">${formatPostContent(post.content)}</div>
                <div class="post-footer">
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
}

// Format post content (handle links, code, etc.)
function formatPostContent(content) {
    // Convert URLs to clickable links
    content = content.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert code blocks (text between backticks)
    content = content.replace(
        /`([^`]+)`/g,
        '<code>$1</code>'
    );
    
    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// Vote on a post
function voteOnPost(postId, voteType, userId) {
    // Reference to the post
    const postRef = database.ref(`communityPosts/${postId}`);
    
    // Get current post data
    postRef.once('value')
        .then(snapshot => {
            const post = snapshot.val();
            if (!post) return;
            
            // Initialize votes and userVotes if they don't exist
            const votes = post.votes || { up: 0, down: 0 };
            const userVotes = post.userVotes || {};
            
            // Get current user's vote
            const currentVote = userVotes[userId];
            
            // Handle different voting scenarios
            if (currentVote === voteType) {
                // User is canceling their vote
                if (voteType === 'up') {
                    votes.up = Math.max(0, votes.up - 1);
                } else {
                    votes.down = Math.max(0, votes.down - 1);
                }
                delete userVotes[userId];
            } else {
                // User is changing their vote or voting for the first time
                if (currentVote === 'up') {
                    // Changing from upvote to downvote
                    votes.up = Math.max(0, votes.up - 1);
                    votes.down = votes.down + 1;
                } else if (currentVote === 'down') {
                    // Changing from downvote to upvote
                    votes.down = Math.max(0, votes.down - 1);
                    votes.up = votes.up + 1;
                } else {
                    // First time voting
                    if (voteType === 'up') {
                        votes.up = votes.up + 1;
                    } else {
                        votes.down = votes.down + 1;
                    }
                }
                
                userVotes[userId] = voteType;
            }
            
            // Calculate trending score (simplified algorithm)
            const trendingScore = votes.up - votes.down;
            
            // Update post data
            return postRef.update({
                votes: votes,
                userVotes: userVotes,
                trendingScore: trendingScore
            });
        })
        .then(() => {
            // Reload the current posts to reflect the change
            const currentFilter = document.querySelector('.community-filter.active').dataset.filter;
            loadPosts(currentFilter, userId);
        })
        .catch(error => {
            console.error('Error voting on post:', error);
            showToast('Error processing your vote. Please try again.', 'error');
        });
} 