// Main JavaScript file for the app

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand(); // Expand the WebApp to take full height
        
        // Initialize your app with the Telegram instance
        initApp(tg);
    } else {
        console.error('Telegram WebApp is not available');
        // Fallback for testing outside of Telegram
        initApp(null);
    }
});

function initApp(telegramWebApp) {
    // Store the Telegram WebApp instance globally if needed
    window.telegramWebApp = telegramWebApp;
    
    // Initialize your app components
    loadHomePage();
    setupNavigation();
    initializeFirebase(); // Ensure Firebase is initialized
}

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

function navigateToSection(sectionId) {
    console.log(`Navigating to section: ${sectionId}`); // Debug log
    
    // Hide all sections
    const sections = document.querySelectorAll('.section-container');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show the selected section
    const targetSection = document.getElementById(`${sectionId}-container`);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Load content based on section
        switch(sectionId) {
            case 'home':
                loadHomePage();
                break;
            case 'study-plan':
                loadStudyPlan();
                break;
            case 'progress':
                loadProgress();
                break;
            case 'profile':
                loadProfile();
                break;
        }
    } else {
        console.error(`Section container #${sectionId}-container not found`); // Debug log
    }
} 