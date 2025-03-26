// Home screen implementation
function loadHomeScreen() {
    const container = document.getElementById('main-container');
    const userId = getUserId();
    
    // Get user stats from Firebase
    database.ref(`users/${userId}/stats`).once('value')
        .then((snapshot) => {
            const stats = snapshot.val() || { streakDays: 0, points: 0 };
            
            // Render home screen
            container.innerHTML = `
                <div class="home-screen">
                    <div class="header-section">
                        <div class="progress-section">
                            <div class="progress-ring-container">
                                <div class="progress-ring">
                                    <svg width="100" height="100" viewBox="0 0 100 100">
                                        <circle class="progress-ring-circle-bg" cx="50" cy="50" r="45"></circle>
                                        <circle class="progress-ring-circle" cx="50" cy="50" r="45" 
                                                style="stroke-dashoffset: ${calculateProgressRingOffset(stats.streakDays)}"></circle>
                                    </svg>
                                    <div class="progress-ring-text">
                                        <span class="streak-count">${stats.streakDays}</span>
                                        <span class="streak-label">days</span>
                                    </div>
                                </div>
                                <div class="user-points">${stats.points} points</div>
                            </div>
                            <div class="notification-bell">
                                <i class="bell-icon">🔔</i>
                                <span class="notification-badge" id="notification-count">0</span>
                            </div>
                        </div>
                        <h2 class="greeting">Hello, ${getUserName()}!</h2>
                        <p class="motivation-text">Keep up your learning streak!</p>
                    </div>
                    
                    <div class="categories-section">
                        <h3>Topics</h3>
                        <div class="categories-grid" id="categories-grid">
                            <div class="loading">Loading topics...</div>
                        </div>
                    </div>
                    
                    <div class="recent-activity">
                        <h3>Recent Activity</h3>
                        <div id="recent-activity-list">
                            <div class="loading">Loading activity...</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Load categories and recent activity
            loadCategories();
            loadRecentActivity(userId);
            
            // Set up notification bell
            setupNotificationBell();
        });
}

// Calculate progress ring offset based on streak days
function calculateProgressRingOffset(streakDays) {
    const maxDays = 30; // Maximum days in the circle (1 month)
    const normalizedStreak = Math.min(streakDays, maxDays);
    const circumference = 2 * Math.PI * 45; // 2πr where r=45
    const offset = circumference - (normalizedStreak / maxDays) * circumference;
    return offset;
}

// Load topic categories with color coding
function loadCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    
    // Fetch categories from Firebase
    database.ref('categories').once('value')
        .then((snapshot) => {
            const categories = snapshot.val() || {};
            
            if (Object.keys(categories).length === 0) {
                categoriesGrid.innerHTML = '<div class="empty-state">No topics available yet</div>';
                return;
            }
            
            const categoryCards = Object.entries(categories).map(([id, category]) => {
                return `
                    <div class="category-card" style="background-color: ${category.color || '#5E81AC'}" 
                         data-category-id="${id}">
                        <div class="category-icon">${category.icon || '📚'}</div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-progress">
                            <div class="category-progress-bar">
                                <div class="category-progress-fill" style="width: ${category.progress || 0}%"></div>
                            </div>
                            <div class="category-progress-text">${category.progress || 0}%</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            categoriesGrid.innerHTML = categoryCards;
            
            // Add click event to category cards
            document.querySelectorAll('.category-card').forEach(card => {
                card.addEventListener('click', () => {
                    const categoryId = card.dataset.categoryId;
                    loadCategoryCards(categoryId);
                });
            });
        });
}

// Load recent activity list
function loadRecentActivity(userId) {
    const activityList = document.getElementById('recent-activity-list');
    
    // Fetch recent activity from Firebase
    database.ref(`users/${userId}/activity`).orderByChild('timestamp').limitToLast(5).once('value')
        .then((snapshot) => {
            const activities = [];
            snapshot.forEach((childSnapshot) => {
                activities.unshift(childSnapshot.val()); // Add to beginning of array
            });
            
            if (activities.length === 0) {
                activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
                return;
            }
            
            const activityItems = activities.map(activity => {
                const date = new Date(activity.timestamp);
                const formattedTime = formatTimeAgo(date);
                
                let activityContent = '';
                switch (activity.type) {
                    case 'card_viewed':
                        activityContent = `You studied the "${activity.cardTitle}" flashcard`;
                        break;
                    case 'quiz_completed':
                        activityContent = `You scored ${activity.score}% on "${activity.quizTitle}" quiz`;
                        break;
                    case 'achievement':
                        activityContent = `You earned the "${activity.achievementTitle}" badge`;
                        break;
                    default:
                        activityContent = activity.description || 'Unknown activity';
                }
                
                return `
                    <div class="activity-item">
                        <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                        <div class="activity-content">
                            <div class="activity-text">${activityContent}</div>
                            <div class="activity-time">${formattedTime}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            activityList.innerHTML = activityItems;
        });
}

// Set up notification bell functionality
function setupNotificationBell() {
    const bell = document.querySelector('.notification-bell');
    const notificationCount = document.getElementById('notification-count');
    
    // Fetch notifications count from Firebase
    const userId = getUserId();
    database.ref(`users/${userId}/notifications`).orderByChild('read').equalTo(false).once('value')
        .then((snapshot) => {
            const unreadCount = snapshot.numChildren();
            notificationCount.textContent = unreadCount;
            
            if (unreadCount > 0) {
                notificationCount.classList.add('has-notifications');
            } else {
                notificationCount.classList.remove('has-notifications');
            }
        });
    
    // Add click event to open notifications panel
    bell.addEventListener('click', () => {
        loadNotificationsPanel();
    });
}

// Helper functions
function getUserId() {
    if (window.Telegram && window.Telegram.WebApp) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    return 'test_user_id'; // Fallback for testing
}

function getUserName() {
    if (window.Telegram && window.Telegram.WebApp) {
        return window.Telegram.WebApp.initDataUnsafe.user.first_name;
    }
    return 'User'; // Fallback for testing
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

function getActivityIcon(type) {
    switch (type) {
        case 'card_viewed':
            return '📇';
        case 'quiz_completed':
            return '📝';
        case 'achievement':
            return '🏆';
        default:
            return '📌';
    }
} 