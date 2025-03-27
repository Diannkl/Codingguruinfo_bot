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
    updateUserStreak();
    
    // Initialize the app
    initializeApp();
    
    // Initialize the navigation
    const currentView = 'home'; // Default view
    navigateToView(currentView);
    
    // Setup navigation event listeners if not already done
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const viewName = this.getAttribute('data-view');
            navigateToView(viewName);
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

// Update the navigation function to properly load the progress page with streak data
function navigateToView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show the selected view
    const selectedView = document.getElementById(viewName + '-view');
    if (selectedView) {
        selectedView.style.display = 'block';
        
        // Special handling for different views
        if (viewName === 'progress') {
            // Make sure we have the latest streak data
            const streakData = updateUserStreak();
            
            // Load the progress tracker instead of showing "coming soon"
            if (selectedView.querySelector('.coming-soon')) {
                // Replace "coming soon" with our progress tracker container
                selectedView.innerHTML = '<div id="progress-page" class="progress-page"></div>';
                
                // Load the progress tracker
                loadProgressTracker();
            } else if (!selectedView.querySelector('.progress-tracker')) {
                // If there's no progress tracker yet but also no "coming soon" message
                // (e.g., if the HTML was changed manually), add the container
                selectedView.innerHTML = '<div id="progress-page" class="progress-page"></div>';
                loadProgressTracker();
            } else {
                // Progress tracker exists, just update the streak display
                updateStreakDisplay(streakData);
            }
        } else if (viewName === 'home') {
            // Load home content if needed
            loadHomeContent();
        } else if (viewName === 'study') {
            // Load study content if needed
            loadStudyContent();
        }
    }
    
    // Update active state in navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
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