// Main JavaScript file for the app

// Add at the beginning of your main.js file
console.log('Main.js loaded');

// Add before initializing any major components
console.log('Initializing app components');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Initialize Telegram WebApp first
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand(); // Expand the mini app to full height
        tg.ready();
        console.log('Telegram WebApp initialized and expanded');
    }
    
    // Check and update user streak
    try {
        updateUserStreak();
    } catch (error) {
        console.error('Error updating user streak:', error);
    }
    
    // Initialize the app
    initializeApp();
    
    // Initialize the navigation
    try {
        const currentView = 'home'; // Default view
        navigateToView(currentView);
    } catch (error) {
        console.error('Error initializing navigation:', error);
    }
    
    // Setup navigation event listeners if not already done
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            try {
                const viewName = this.getAttribute('data-view');
                console.log(`Navigation clicked: ${viewName}`);
                navigateToView(viewName);
            } catch (error) {
                console.error('Error in navigation click handler:', error);
            }
        });
    });
});

// Initialize Firebase Analytics
function initializeFirebase() {
    if (window.firebase) {
        // Enable Firebase Analytics
        try {
            firebase.analytics();
            console.log('Firebase Analytics initialized');
        } catch (error) {
            console.error('Error initializing Firebase Analytics:', error);
        }
    } else {
        console.warn('Firebase not available');
    }
}

// Initialize Telegram WebApp
function initializeTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const webApp = window.Telegram.WebApp;
        
        // Initialize WebApp
        webApp.ready();
        
        // Apply theme
        applyTelegramTheme(webApp);
        
        // Set up main button if needed
        setupMainButton(webApp);
        
        console.log('Telegram WebApp initialized');
    } else {
        console.warn('Telegram WebApp not available, running in browser mode');
    }
}

// Apply Telegram theme
function applyTelegramTheme(webApp) {
    const root = document.documentElement;
    
    // Apply color scheme
    if (webApp.colorScheme === 'dark') {
        root.classList.add('dark-theme');
        
        // Apply dark theme variables
        root.style.setProperty('--background-color', '#1E1E1E');
        root.style.setProperty('--text-color', '#FFFFFF');
        root.style.setProperty('--card-background', '#2E3440');
    }
    
    // Apply accent color
    if (webApp.themeParams && webApp.themeParams.button_color) {
        root.style.setProperty('--primary-color', webApp.themeParams.button_color);
    }
}

// Set up main button
function setupMainButton(webApp) {
    const mainButton = webApp.MainButton;
    
    // Configure the button
    mainButton.setText('Get Started');
    mainButton.show();
    
    // Add click handler
    mainButton.onClick(function() {
        // Handle button click based on current view
        handleMainButtonClick();
    });
}

// Load data from Telegram Storage
function loadDataFromTelegramStorage() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
        // Get user preferences
        window.Telegram.WebApp.CloudStorage.getItems(['preferences', 'weakAreas'], function(items) {
            // Cache the results
            window.appCache = window.appCache || {};
            
            if (items.preferences) {
                try {
                    window.appCache.preferences = JSON.parse(items.preferences);
                    console.log('Loaded preferences from Telegram Storage');
                } catch (e) {
                    console.error('Error parsing preferences from Telegram Storage', e);
                }
            }
            
            if (items.weakAreas) {
                try {
                    window.appCache.weakAreas = JSON.parse(items.weakAreas);
                    console.log('Loaded weak areas from Telegram Storage');
                } catch (e) {
                    console.error('Error parsing weak areas from Telegram Storage', e);
                }
            }
        });
    }
}

// Set up navigation
function setupNavigation() {
    const navContainer = document.createElement('div');
    navContainer.className = 'bottom-navigation';
    navContainer.innerHTML = `
        <div class="nav-item active" data-view="home">
            <div class="nav-icon">🏠</div>
            <div class="nav-label">Home</div>
        </div>
        <div class="nav-item" data-view="progress">
            <div class="nav-icon">📊</div>
            <div class="nav-label">Progress</div>
        </div>
        <div class="nav-item" data-view="study-plan">
            <div class="nav-icon">📚</div>
            <div class="nav-label">Study Plan</div>
        </div>
        <div class="nav-item" data-view="profile">
            <div class="nav-icon">👤</div>
            <div class="nav-label">Profile</div>
        </div>
    `;
    
    document.body.appendChild(navContainer);
    
    // Add event listeners for navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Load the appropriate view
            const view = this.dataset.view;
            loadView(view);
        });
    });
}

// Load view based on navigation
function loadView(view) {
    // Log analytics event
    logAnalyticsEvent('screen_view', { screen_name: view });
    
    switch (view) {
        case 'home':
            loadHomeScreen();
            break;
        case 'progress':
            loadProgressTracker();
            break;
        case 'study-plan':
            loadStudyPlan();
            break;
        case 'profile':
            loadProfileScreen();
            break;
        default:
            loadHomeScreen();
    }
}

// Handle main button click
function handleMainButtonClick() {
    // Get the current active view
    const activeView = document.querySelector('.nav-item.active').dataset.view;
    
    switch (activeView) {
        case 'home':
            // Start learning with the first available category
            const firstCategory = document.querySelector('.category-card');
            if (firstCategory) {
                firstCategory.click();
            }
            break;
        case 'study-plan':
            // Save study plan settings
            const saveButton = document.getElementById('saveGoalsBtn');
            if (saveButton) {
                saveButton.click();
            }
            break;
        case 'progress':
            // Analyze weak areas
            analyzeWeakAreas(getUserId())
                .then(weakAreas => {
                    if (weakAreas.length > 0) {
                        showToast(`Found ${weakAreas.length} area(s) to improve on!`);
                    } else {
                        showToast('No weak areas found. Great job!');
                    }
                });
            break;
        case 'profile':
            // Toggle dark mode or similar action
            break;
    }
}

// Load profile screen
function loadProfileScreen() {
    const container = document.getElementById('main-container');
    const userId = getUserId();
    
    // Placeholder for profile screen
    container.innerHTML = `
        <div class="profile-screen">
            <h2 class="section-title">Your Profile</h2>
            <div class="loading">Loading profile...</div>
        </div>
    `;
    
    // In a complete implementation, we would load user data and render the profile
}

// Add in your button click handlers
function handleGetStartedClick() {
    console.log('Get Started button clicked');
    // Your existing code
}

// Ensure all the study, progress, and profile pages exist
function createPagesIfNeeded() {
    const appContainer = document.getElementById('app') || document.body;
    
    // Create study page if it doesn't exist
    if (!document.getElementById('study-page')) {
        const studyPage = document.createElement('div');
        studyPage.id = 'study-page';
        studyPage.className = 'page';
        studyPage.style.display = 'none';
        appContainer.appendChild(studyPage);
    }
    
    // Create progress page if it doesn't exist
    if (!document.getElementById('progress-page')) {
        const progressPage = document.createElement('div');
        progressPage.id = 'progress-page';
        progressPage.className = 'page';
        progressPage.style.display = 'none';
        appContainer.appendChild(progressPage);
    }
    
    // Create profile page if it doesn't exist
    if (!document.getElementById('profile-page')) {
        const profilePage = document.createElement('div');
        profilePage.id = 'profile-page';
        profilePage.className = 'page';
        profilePage.style.display = 'none';
        appContainer.appendChild(profilePage);
    }
}

// Update the navigation function to properly load all pages
function navigateToView(viewName) {
    console.log(`Navigating to view: ${viewName}`);
    
    try {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.style.display = 'none';
        });
        
        // Show the selected view
        const selectedView = document.getElementById(viewName + '-view');
        if (selectedView) {
            selectedView.style.display = 'block';
            
            // Special handling for different views
            switch(viewName) {
                case 'progress':
                    // Handle progress view
                    handleProgressView(selectedView);
                    break;
                    
                case 'home':
                    // Handle home view
                    handleHomeView(selectedView);
                    break;
                    
                case 'study':
                    // Handle study view
                    handleStudyView(selectedView);
                    break;
                    
                case 'profile':
                    // Handle profile view
                    handleProfileView(selectedView);
                    break;
            }
        } else {
            console.error(`View "${viewName}-view" not found`);
        }
        
        // Update active state in navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    } catch (error) {
        console.error('Error in navigateToView:', error);
    }
}

// Handle loading the progress view
function handleProgressView(container) {
    console.log('Loading progress view');
    
    // Make sure we have the latest streak data
    let streakData;
    try {
        streakData = updateUserStreak();
        console.log('Updated user streak:', streakData);
    } catch (streakError) {
        console.error('Error updating user streak:', streakError);
        streakData = { currentStreak: 0, points: 0 };
    }
    
    // Remove "coming soon" if it exists and create progress container
    if (container.querySelector('.coming-soon')) {
        container.innerHTML = '<div id="progress-page" class="progress-page"></div>';
    } else if (!container.querySelector('#progress-page')) {
        container.innerHTML = '<div id="progress-page" class="progress-page"></div>';
    }
    
    // Load the progress tracker
    try {
        if (typeof loadProgressTracker === 'function') {
            loadProgressTracker();
        } else {
            console.error('loadProgressTracker function not found');
        }
    } catch (error) {
        console.error('Error loading progress tracker:', error);
        document.getElementById('progress-page').innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p class="error-message">Failed to load progress tracker. Please try again.</p>
                <button class="retry-btn" onclick="loadProgressTracker()">Reload</button>
            </div>
        `;
    }
}

// Handle loading the home view
function handleHomeView(container) {
    // Check if we need to load home content
    if (container.querySelector('.coming-soon') || !container.querySelector('.home-content')) {
        try {
            if (typeof loadHomeContent === 'function') {
                loadHomeContent();
            } else {
                // Simple fallback if loadHomeContent doesn't exist
                container.innerHTML = `
                    <div class="home-content">
                        <h2 class="section-title">Welcome to Language Learning App</h2>
                        <div class="streaks-summary">
                            <div class="streak-card">
                                <div class="streak-icon">🔥</div>
                                <div class="streak-info">
                                    <div class="streak-count">${getUserData().currentStreak || 0}</div>
                                    <div class="streak-label">Day Streak</div>
                                </div>
                            </div>
                        </div>
                        <div class="recent-activity">
                            <h3>Recent Activity</h3>
                            <div class="activity-placeholder">
                                Start learning to see your recent activity here!
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading home content:', error);
        }
    }
}

// Handle loading the study view
function handleStudyView(container) {
    // Check if we need to load study content
    if (container.querySelector('.coming-soon') || !container.querySelector('.study-content')) {
        try {
            if (typeof loadStudyContent === 'function') {
                loadStudyContent();
            } else {
                // Simple fallback if loadStudyContent doesn't exist
                container.innerHTML = `
                    <div class="study-content">
                        <h2 class="section-title">Study Materials</h2>
                        <div class="categories-container">
                            <div class="category-placeholder">
                                Choose a category to begin studying
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading study content:', error);
        }
    }
}

// Handle loading the profile view
function handleProfileView(container) {
    // Check if we need to load profile content
    if (container.querySelector('.coming-soon') || !container.querySelector('.profile-content')) {
        try {
            if (typeof loadProfileContent === 'function') {
                loadProfileContent();
            } else {
                // Simple fallback to show basic profile info
                const userData = getUserData();
                container.innerHTML = `
                    <div class="profile-content">
                        <h2 class="section-title">Your Profile</h2>
                        <div class="profile-stats">
                            <div class="profile-stat">
                                <div class="stat-label">Current Streak</div>
                                <div class="stat-value">${userData.currentStreak || 0} days</div>
                            </div>
                            <div class="profile-stat">
                                <div class="stat-label">Total Points</div>
                                <div class="stat-value">${userData.points || 0}</div>
                            </div>
                        </div>
                        <div class="profile-actions">
                            <button class="profile-action-btn">Edit Profile</button>
                            <button class="profile-action-btn">Settings</button>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading profile content:', error);
        }
    }
}

// Function to update user streak
function updateUserStreak() {
    try {
        // Get user data from localStorage
        let userData = getUserData();
        
        // Get current date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Check if this is first login (no last login date)
        if (!userData.lastLoginDate) {
            // First time user, initialize streak
            userData = {
                ...userData,
                currentStreak: 1,
                lastLoginDate: todayStr,
            };
            console.log('First login, streak initialized to 1');
        } 
        // Check if already logged in today
        else if (userData.lastLoginDate === todayStr) {
            // Already logged in today, do nothing to streak
            console.log('Already logged in today, streak unchanged');
        } 
        // Check if last login was yesterday
        else {
            const lastLogin = new Date(userData.lastLoginDate);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastLogin.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
                // Consecutive day, increment streak
                userData.currentStreak = (userData.currentStreak || 0) + 1;
                userData.lastLoginDate = todayStr;
                console.log(`Consecutive login, streak incremented to ${userData.currentStreak}`);
                
                // Add bonus points based on streak length
                const bonus = calculateStreakBonus(userData.currentStreak);
                userData.points = (userData.points || 0) + bonus;
                
                // If it's a milestone, we'll celebrate later when the UI is ready
            } else {
                // Streak broken, reset to 1
                userData.currentStreak = 1;
                userData.lastLoginDate = todayStr;
                console.log('Streak reset to 1 (not consecutive days)');
            }
        }
        
        // Save updated user data
        saveUserData(userData);
        
        // Update Firebase if available
        updateUserStreakInFirebase(userData);
        
        return userData;
    } catch (error) {
        console.error('Error updating user streak:', error);
        return { currentStreak: 0, lastLoginDate: new Date().toISOString().split('T')[0] };
    }
}

// Get user data from localStorage
function getUserData() {
    try {
        const userData = localStorage.getItem('userStreak');
        return userData ? JSON.parse(userData) : { currentStreak: 0, points: 0 };
    } catch (error) {
        console.error('Error getting user data:', error);
        return { currentStreak: 0, points: 0 };
    }
}

// Save user data to localStorage
function saveUserData(userData) {
    try {
        localStorage.setItem('userStreak', JSON.stringify(userData));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Update user streak in Firebase
function updateUserStreakInFirebase(userData) {
    const userId = getUserId(); // Make sure this function is defined
    if (!userId || !window.firebase) return;
    
    try {
        const userRef = firebase.database().ref(`users/${userId}/stats`);
        userRef.update({
            streakDays: userData.currentStreak,
            points: userData.points,
            lastLoginDate: userData.lastLoginDate
        }).then(() => {
            console.log('User streak updated in Firebase');
        }).catch(error => {
            console.error('Error updating user streak in Firebase:', error);
        });
    } catch (error) {
        console.error('Error updating Firebase:', error);
    }
}

// Adding simple helper function for streak functions if they don't exist yet

// Function to get user streak data from localStorage
function getUserStreakData() {
    try {
        const streakData = localStorage.getItem('userStreak');
        if (streakData) {
            return JSON.parse(streakData);
        }
    } catch (error) {
        console.error('Error getting user streak data:', error);
    }
    return { currentStreak: 0, points: 0, lastLoginDate: null };
}

// Helper function to determine streak ring class based on streak count
function getStreakRingClass(streakCount) {
    if (streakCount >= 30) return 'streak-ring-high';
    if (streakCount >= 7) return 'streak-ring-medium';
    return 'streak-ring-low';
}

// Helper function to generate motivational streak message
function getStreakMessage(streakCount) {
    if (streakCount === 0) return "Start your streak today!";
    if (streakCount === 1) return "You're on your way!";
    if (streakCount < 7) return "Keep it going!";
    if (streakCount < 14) return "Impressive consistency!";
    if (streakCount < 30) return "You're on fire!";
    return "Unstoppable!";
}

// Helper function to calculate bonus points based on streak length
function calculateStreakBonus(streakCount) {
    if (streakCount === 0) return 0;
    if (streakCount < 3) return 5;
    if (streakCount < 7) return 10;
    if (streakCount < 14) return 15;
    if (streakCount < 30) return 25;
    return 50;
}

// Function to update the streak display
function updateStreakDisplay(streakData) {
    try {
        console.log('Updating streak display:', streakData);
        
        // First check if the elements exist before trying to update them
        const streakRing = document.querySelector('.streak-ring');
        const streakCount = document.querySelector('.streak-count');
        const streakMessage = document.querySelector('.streak-message');
        const streakBonus = document.querySelector('.streak-bonus');
        const summaryStreak = document.getElementById('current-streak');
        
        if (!streakRing || !streakCount || !streakMessage || !streakBonus) {
            console.warn('Streak elements not found in the DOM');
            return; // Exit if elements don't exist
        }
        
        // Update the streak count
        const currentStreak = streakData?.currentStreak || 0;
        streakCount.textContent = currentStreak;
        if (summaryStreak) summaryStreak.textContent = currentStreak;
        
        // Update the streak ring class
        streakRing.className = `streak-ring ${getStreakRingClass(currentStreak)}`;
        
        // Update the streak message
        streakMessage.textContent = getStreakMessage(currentStreak);
        
        // Update the bonus points
        const bonus = calculateStreakBonus(currentStreak);
        streakBonus.textContent = `+ ${bonus} bonus points today`;
    } catch (error) {
        console.error('Error updating streak display:', error);
    }
} 