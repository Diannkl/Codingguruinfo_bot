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

// Initialize Telegram WebApp
if (window.Telegram && window.Telegram.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.expand(); // Expand the mini app to full height
  
  // Initialize your app once Telegram WebApp is ready
  tg.ready();
}

// Add event listener for the Get Started button
document.addEventListener('DOMContentLoaded', function() {
  const getStartedBtn = document.getElementById('get-started-btn');
  
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function() {
      // Your code to handle the button click
      console.log('Get Started button clicked');
      
      // Navigate to the next screen or initialize app
      navigateToHome();
    });
  } else {
    console.error('Get Started button not found');
  }
});

// Define the navigateToHome function if it doesn't exist
function navigateToHome() {
  console.log('Navigating to home screen');
  
  // Get all page elements
  const pages = document.querySelectorAll('.page');
  
  // Hide all pages
  pages.forEach(page => {
    page.style.display = 'none';
  });
  
  // Show the home page
  const homePage = document.getElementById('home-page');
  if (homePage) {
    homePage.style.display = 'block';
    
    // Also update the navigation to reflect the current page
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.view === 'home') {
        item.classList.add('active');
      }
    });
    
    // Load home content if it's not already loaded
    if (homePage.children.length === 0 || homePage.innerHTML.trim() === '') {
      loadHomeContent();
    }
  } else {
    console.error('Home page element not found');
  }
}

// Function to load home content
function loadHomeContent() {
  const homePage = document.getElementById('home-page');
  
  // Check if the home page element exists
  if (!homePage) {
    console.error('Home page element not found');
    return;
  }
  
  // Create home page content
  homePage.innerHTML = `
    <div class="home-header">
      <h1>Welcome to Coding Guru</h1>
      <p>Your personalized learning journey starts here</p>
    </div>
    
    <div class="categories-container">
      <h2>Learning Categories</h2>
      <div class="categories-grid">
        <div class="category-card" data-category="javascript">
          <div class="category-icon">JS</div>
          <h3>JavaScript</h3>
          <p>Learn the fundamentals of JavaScript programming</p>
        </div>
        <div class="category-card" data-category="python">
          <div class="category-icon">PY</div>
          <h3>Python</h3>
          <p>Master Python programming from basics to advanced</p>
        </div>
        <div class="category-card" data-category="html-css">
          <div class="category-icon">HTML</div>
          <h3>HTML & CSS</h3>
          <p>Build and style beautiful web pages</p>
        </div>
        <div class="category-card" data-category="algorithms">
          <div class="category-icon">ALG</div>
          <h3>Algorithms</h3>
          <p>Solve coding problems and optimize solutions</p>
        </div>
      </div>
    </div>
    
    <div class="recent-activity">
      <h2>Recent Activity</h2>
      <div class="activity-list">
        <p>No recent activity. Start learning to see your progress!</p>
      </div>
    </div>
  `;
  
  // Add event listeners to category cards
  const categoryCards = homePage.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    card.addEventListener('click', function() {
      const category = this.dataset.category;
      console.log(`Selected category: ${category}`);
      // Here you would normally navigate to the category's learning page
      showToast(`${this.querySelector('h3').textContent} category selected!`);
    });
  });
}

// Helper function to show toast notifications
function showToast(message) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  
  // Set message and show toast
  toast.textContent = message;
  toast.classList.add('visible');
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

// Initialize variables for tracking user data
let userStreak = 0;
let userPoints = 0;
let hasNewNotifications = false;

// Initialize Telegram WebApp as soon as possible
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
  console.log('Initializing app...');
  
  // Initialize Telegram WebApp
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    console.log('Telegram WebApp detected');
    
    // Expand to full height
    tg.expand();
    
    // Set header color to match app theme
    tg.headerColor = '#007BFF';
    
    // Initialize app once Telegram WebApp is ready
    tg.ready();
    console.log('Telegram WebApp ready');
    
    // Get user data if available
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      console.log('User data available:', tg.initDataUnsafe.user);
      // You can store user data here
    }
  } else {
    console.warn('Telegram WebApp not available, running in standalone mode');
  }
  
  // Load user data (from Firebase or local storage)
  loadUserData()
    .then(() => {
      console.log('User data loaded successfully');
      // Setup UI components
      setupUIComponents();
      
      // Add event listeners
      setupEventListeners();
      
      // Show welcome screen or home page based on user status
      if (isNewUser()) {
        showWelcomeScreen();
      } else {
        navigateToHome();
      }
    })
    .catch(error => {
      console.error('Error loading user data:', error);
      // Show error message to user
      showToast('Failed to load data. Please try again.');
      
      // Show home page as fallback
      navigateToHome();
    });
}

// Load user data from storage
async function loadUserData() {
  try {
    // Attempt to load from localStorage first (for faster initial load)
    const localData = localStorage.getItem('userData');
    if (localData) {
      const userData = JSON.parse(localData);
      userStreak = userData.streak || 0;
      userPoints = userData.points || 0;
      hasNewNotifications = userData.hasNewNotifications || false;
      
      console.log('Loaded data from localStorage:', userData);
      
      // Update UI with loaded data
      updateUIWithUserData();
    }
    
    // Then attempt to load from Firebase (for most up-to-date data)
    // This is a placeholder - you'll need to implement the actual Firebase fetch
    // const firebaseData = await fetchUserDataFromFirebase();
    // if (firebaseData) {
    //   userStreak = firebaseData.streak || 0;
    //   userPoints = firebaseData.points || 0;
    //   hasNewNotifications = firebaseData.hasNewNotifications || false;
    //   
    //   // Update localStorage with fresh data
    //   saveUserDataToLocalStorage();
    //   
    //   // Update UI with loaded data
    //   updateUIWithUserData();
    // }
    
    // For demo purposes, simulate data
    simulateUserData();
    
    return true;
  } catch (error) {
    console.error('Error loading user data:', error);
    return false;
  }
}

// Simulate user data for testing
function simulateUserData() {
  userStreak = 5;
  userPoints = 350;
  hasNewNotifications = true;
  saveUserDataToLocalStorage();
}

// Save user data to localStorage
function saveUserDataToLocalStorage() {
  const userData = {
    streak: userStreak,
    points: userPoints,
    hasNewNotifications: hasNewNotifications,
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem('userData', JSON.stringify(userData));
  console.log('Saved user data to localStorage');
}

// Check if this is a new user
function isNewUser() {
  // Check if this is the first time the user is opening the app
  return !localStorage.getItem('userData');
}

// Setup UI components
function setupUIComponents() {
  console.log('Setting up UI components');
  
  // Create UI elements if they don't exist
  ensureUIElementsExist();
  
  // Update UI with user data
  updateUIWithUserData();
}

// Ensure all UI elements exist
function ensureUIElementsExist() {
  const appContainer = document.getElementById('app') || document.body;
  
  // Create header if it doesn't exist
  if (!document.getElementById('app-header')) {
    const header = document.createElement('div');
    header.id = 'app-header';
    header.innerHTML = `
      <div class="header-left">
        <div class="streak-container">
          <div class="streak-ring">
            <span id="streak-count">0</span>
          </div>
          <span class="streak-label">Day Streak</span>
        </div>
      </div>
      <div class="header-center">
        <h1>Coding Guru</h1>
      </div>
      <div class="header-right">
        <div class="points-display">
          <span id="points-count">0</span>
          <span class="points-icon">⭐</span>
        </div>
        <div class="notification-bell" id="notification-bell">
          <span class="bell-icon">🔔</span>
          <span class="notification-indicator" id="notification-indicator"></span>
        </div>
      </div>
    `;
    
    // Insert header at the beginning of the app container
    if (appContainer.firstChild) {
      appContainer.insertBefore(header, appContainer.firstChild);
    } else {
      appContainer.appendChild(header);
    }
  }
  
  // Create welcome screen if it doesn't exist
  if (!document.getElementById('welcome-screen')) {
    const welcomeScreen = document.createElement('div');
    welcomeScreen.id = 'welcome-screen';
    welcomeScreen.className = 'page';
    welcomeScreen.style.display = 'none';
    welcomeScreen.innerHTML = `
      <div class="welcome-content">
        <h1>Welcome to Coding Guru!</h1>
        <p>Your journey to mastering programming starts here.</p>
        <div class="welcome-features">
          <div class="feature">
            <div class="feature-icon">🎮</div>
            <div class="feature-text">Learn through interactive flashcards and quizzes</div>
          </div>
          <div class="feature">
            <div class="feature-icon">📊</div>
            <div class="feature-text">Track your progress and earn achievements</div>
          </div>
          <div class="feature">
            <div class="feature-icon">👥</div>
            <div class="feature-text">Join a community of learners</div>
          </div>
        </div>
        <button id="get-started-btn" class="primary-button">Get Started</button>
      </div>
    `;
    appContainer.appendChild(welcomeScreen);
  }
  
  // Create home page if it doesn't exist
  if (!document.getElementById('home-page')) {
    const homePage = document.createElement('div');
    homePage.id = 'home-page';
    homePage.className = 'page';
    homePage.style.display = 'none';
    appContainer.appendChild(homePage);
  }
  
  // Create navigation bar if it doesn't exist
  if (!document.getElementById('nav-bar')) {
    const navBar = document.createElement('div');
    navBar.id = 'nav-bar';
    navBar.innerHTML = `
      <div class="nav-item active" data-view="home">
        <div class="nav-icon">🏠</div>
        <div class="nav-label">Home</div>
      </div>
      <div class="nav-item" data-view="study">
        <div class="nav-icon">📚</div>
        <div class="nav-label">Study</div>
      </div>
      <div class="nav-item" data-view="progress">
        <div class="nav-icon">📊</div>
        <div class="nav-label">Progress</div>
      </div>
      <div class="nav-item" data-view="profile">
        <div class="nav-icon">👤</div>
        <div class="nav-label">Profile</div>
      </div>
    `;
    appContainer.appendChild(navBar);
  }
  
  // Create toast container if it doesn't exist
  if (!document.getElementById('toast')) {
    const toast = document.createElement('div');
    toast.id = 'toast';
    appContainer.appendChild(toast);
  }
}

// Update UI with user data
function updateUIWithUserData() {
  // Update streak count
  const streakCount = document.getElementById('streak-count');
  if (streakCount) {
    streakCount.textContent = userStreak;
    
    // Update streak ring appearance based on streak value
    const streakRing = document.querySelector('.streak-ring');
    if (streakRing) {
      // Remove all possible status classes first
      streakRing.classList.remove('streak-low', 'streak-medium', 'streak-high');
      
      // Add appropriate class based on streak count
      if (userStreak >= 7) {
        streakRing.classList.add('streak-high');
      } else if (userStreak >= 3) {
        streakRing.classList.add('streak-medium');
      } else {
        streakRing.classList.add('streak-low');
      }
    }
  }
  
  // Update points display
  const pointsCount = document.getElementById('points-count');
  if (pointsCount) {
    pointsCount.textContent = userPoints;
  }
  
  // Update notification indicator
  const notificationIndicator = document.getElementById('notification-indicator');
  if (notificationIndicator) {
    if (hasNewNotifications) {
      notificationIndicator.classList.add('has-notifications');
    } else {
      notificationIndicator.classList.remove('has-notifications');
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners');
  
  // Get Started button
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function() {
      console.log('Get Started button clicked');
      navigateToHome();
    });
  } else {
    console.error('Get Started button not found');
  }
  
  // Navigation items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const view = this.dataset.view;
      console.log(`Navigation: switching to ${view} view`);
      
      // Update active navigation item
      navItems.forEach(navItem => navItem.classList.remove('active'));
      this.classList.add('active');
      
      // Navigate to the selected view
      navigateToView(view);
    });
  });
  
  // Notification bell
  const notificationBell = document.getElementById('notification-bell');
  if (notificationBell) {
    notificationBell.addEventListener('click', function() {
      console.log('Notification bell clicked');
      showNotifications();
    });
  }
}

// Show welcome screen
function showWelcomeScreen() {
  console.log('Showing welcome screen');
  
  // Hide all pages
  hideAllPages();
  
  // Show welcome screen
  const welcomeScreen = document.getElementById('welcome-screen');
  if (welcomeScreen) {
    welcomeScreen.style.display = 'block';
  } else {
    console.error('Welcome screen not found');
  }
  
  // Hide navigation bar on welcome screen
  const navBar = document.getElementById('nav-bar');
  if (navBar) {
    navBar.style.display = 'none';
  }
}

// Navigate to home
function navigateToHome() {
  console.log('Navigating to home');
  
  // Hide all pages
  hideAllPages();
  
  // Show home page
  const homePage = document.getElementById('home-page');
  if (homePage) {
    homePage.style.display = 'block';
    
    // Show navigation bar
    const navBar = document.getElementById('nav-bar');
    if (navBar) {
      navBar.style.display = 'flex';
    }
    
    // Load home content if not already loaded
    if (homePage.children.length === 0 || homePage.innerHTML.trim() === '') {
      loadHomeContent();
    }
  } else {
    console.error('Home page not found');
  }
  
  // Update navigation
  updateActiveNavItem('home');
}

// Navigate to specific view
function navigateToView(view) {
  console.log(`Navigating to ${view} view`);
  
  // Hide all pages
  hideAllPages();
  
  // Show the requested page
  const page = document.getElementById(`${view}-page`);
  if (page) {
    page.style.display = 'block';
    
    // Load content if needed
    if (page.children.length === 0 || page.innerHTML.trim() === '') {
      switch(view) {
        case 'home':
          loadHomeContent();
          break;
        case 'study':
          loadStudyContent();
          break;
        case 'progress':
          loadProgressContent();
          break;
        case 'profile':
          loadProfileContent();
          break;
      }
    }
  } else {
    console.error(`${view} page not found`);
    // Fallback to home
    navigateToHome();
  }
}

// Update active navigation item
function updateActiveNavItem(view) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.view === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Hide all pages
function hideAllPages() {
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.style.display = 'none';
  });
}

// Placeholder functions for loading other content
function loadStudyContent() {
  console.log('Loading study content');
  // Implement study content loading
  
  const studyPage = document.getElementById('study-page');
  if (studyPage) {
    studyPage.innerHTML = `
      <div class="page-header">
        <h2>Study Page</h2>
        <p>Coming soon...</p>
      </div>
    `;
  }
}

function loadProgressContent() {
  console.log('Loading progress content');
  // Implement progress content loading
  
  const progressPage = document.getElementById('progress-page');
  if (progressPage) {
    progressPage.innerHTML = `
      <div class="page-header">
        <h2>Progress Page</h2>
        <p>Coming soon...</p>
      </div>
    `;
  }
}

function loadProfileContent() {
  console.log('Loading profile content');
  // Implement profile content loading
  
  const profilePage = document.getElementById('profile-page');
  if (profilePage) {
    profilePage.innerHTML = `
      <div class="page-header">
        <h2>Profile Page</h2>
        <p>Coming soon...</p>
      </div>
    `;
  }
}

// Show notifications panel
function showNotifications() {
  // Mark notifications as read
  hasNewNotifications = false;
  updateUIWithUserData();
  saveUserDataToLocalStorage();
  
  // Show notification panel
  showToast('Notifications feature coming soon!');
}

// Helper function to show toast notifications
function showToast(message) {
  // Get or create toast element
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  
  // Set message and show toast
  toast.textContent = message;
  toast.classList.add('visible');
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
} 