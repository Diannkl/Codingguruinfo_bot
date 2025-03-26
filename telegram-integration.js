// Initialize Telegram WebApp
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're running in Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        const webApp = window.Telegram.WebApp;
        
        // Initialize WebApp
        webApp.ready();
        
        // Enable closing confirmation
        webApp.enableClosingConfirmation();
        
        // Style according to Telegram theme
        applyTelegramThemeStyles(webApp);
        
        // Set up main button if needed
        setupMainButton(webApp);
        
        // Get user info
        const user = webApp.initDataUnsafe.user;
        if (user) {
            initUserData(user.id, user.first_name, user.username);
        }
    } else {
        console.warn('Not running in Telegram WebApp mode');
        // Fallback for testing in browser
        initUserData('test_user_id', 'Test User', 'test_username');
    }
});

function applyTelegramThemeStyles(webApp) {
    const root = document.documentElement;
    
    // Apply Telegram theme colors
    if (webApp.colorScheme === 'dark') {
        root.style.setProperty('--background-color', '#1E1E1E');
        root.style.setProperty('--text-color', '#FFFFFF');
        // Adjust other colors for dark mode
    }
    
    // Set header color to match Telegram
    if (webApp.headerColor) {
        root.style.setProperty('--header-color', webApp.headerColor);
    }
    
    // Set accent color from Telegram
    if (webApp.themeParams && webApp.themeParams.button_color) {
        root.style.setProperty('--primary-color', webApp.themeParams.button_color);
    }
}

function setupMainButton(webApp) {
    const mainButton = webApp.MainButton;
    
    if (mainButton) {
        // Configure button for initial state
        mainButton.setText('Start Learning');
        mainButton.onClick(function() {
            // Handle button click based on current view
            const currentView = getCurrentView();
            handleMainButtonClick(currentView);
        });
    }
}

function initUserData(userId, firstName, username) {
    // Check if user exists in Firebase
    database.ref(`users/${userId}`).once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                // Create new user
                database.ref(`users/${userId}`).set({
                    firstName: firstName,
                    username: username,
                    createdAt: new Date().toISOString(),
                    stats: {
                        streakDays: 0,
                        points: 0,
                        lastActive: new Date().toISOString()
                    }
                });
            } else {
                // Update last active time
                database.ref(`users/${userId}/stats`).update({
                    lastActive: new Date().toISOString()
                });
                
                // Update streak if needed
                updateUserStreak(userId);
            }
        })
        .then(() => {
            // Load main app
            loadMainMenu();
        });
}

// Check if running in Telegram WebApp
function initTelegramWebApp() {
    console.log('Initializing Telegram WebApp');
    
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        console.log('Telegram WebApp available');
        
        tg.ready();
        tg.expand();
        
        // You can access user data if needed
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            console.log('User data available:', tg.initDataUnsafe.user);
        }
        
        return true;
    } else {
        console.warn('Telegram WebApp not available, running in standalone mode');
        return false;
    }
}

// Call this function when your app initializes
document.addEventListener('DOMContentLoaded', initTelegramWebApp); 