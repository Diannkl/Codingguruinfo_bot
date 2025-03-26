/**
 * Initialize Telegram WebApp for community features
 */
function initTelegramCommunityFeatures() {
    // Check if Telegram WebApp is available
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Set up MainButton if needed for creating posts
        tg.MainButton.setText('Create Post');
        tg.MainButton.onClick(function() {
            showCreatePostModal();
        });
        
        // Get user data from Telegram
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            
            // Store user data if not already in our system
            storeUserFromTelegram(user);
        }
        
        // Enable BackButton if needed
        tg.BackButton.onClick(function() {
            // Navigate back to main view
            loadMainView();
        });
    }
}

/**
 * Store Telegram user data in our database
 * @param {Object} telegramUser - Telegram user object
 */
function storeUserFromTelegram(telegramUser) {
    if (!telegramUser || !telegramUser.id) return;
    
    // Check if user already exists
    database.ref(`users/${telegramUser.id}`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                // User exists, update last login
                return database.ref(`users/${telegramUser.id}/lastLogin`).set(firebase.database.ServerValue.TIMESTAMP);
            } else {
                // Create new user
                const newUser = {
                    id: telegramUser.id,
                    firstName: telegramUser.first_name || '',
                    lastName: telegramUser.last_name || '',
                    username: telegramUser.username || '',
                    role: 'student', // Default role
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                };
                
                return database.ref(`users/${telegramUser.id}`).set(newUser);
            }
        })
        .catch(error => {
            console.error('Error storing user data:', error);
        });
}

/**
 * Get the current user ID
 * @returns {string|null} User ID or null if not logged in
 */
function getCurrentUserId() {
    // In a real implementation, this would get the ID from Telegram WebApp
    // For this example, we'll use a simulated user
    return getCurrentUser()?.id || null;
}

/**
 * Get the current user object
 * @returns {Object|null} User object or null if not logged in
 */
function getCurrentUser() {
    // In a real implementation, this would get user data from Telegram WebApp
    // For this example, we'll return a simulated user
    return {
        id: '12345',
        firstName: 'Demo',
        lastName: 'User',
        role: 'student'
    };
}

/**
 * Check if a user is logged in
 * @returns {boolean} True if logged in
 */
function isUserLoggedIn() {
    return !!getCurrentUserId();
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, info)
 */
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto-remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Format time ago from date
 * @param {Date} date - Date to format
 * @returns {string} Formatted time string
 */
function formatTimeAgo(date) {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
        return date.toLocaleDateString();
    } else if (diffDays > 1) {
        return `${diffDays} days ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffHours > 1) {
        return `${diffHours} hours ago`;
    } else if (diffHours === 1) {
        return '1 hour ago';
    } else if (diffMins > 1) {
        return `${diffMins} minutes ago`;
    } else if (diffMins === 1) {
        return '1 minute ago';
    } else {
        return 'Just now';
    }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Check if a URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
} 