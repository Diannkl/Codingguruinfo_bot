// Progress Tracker Implementation
function loadProgressTracker() {
    const container = document.getElementById('main-container');
    const userId = getUserId();
    
    container.innerHTML = `
        <div class="progress-tracker">
            <h2 class="section-title">Your Progress</h2>
            
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="summary-icon">🔥</div>
                    <div class="summary-content">
                        <div class="summary-title">Current Streak</div>
                        <div class="summary-value" id="current-streak">0</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">⭐</div>
                    <div class="summary-content">
                        <div class="summary-title">Total Points</div>
                        <div class="summary-value" id="total-points">0</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">📊</div>
                    <div class="summary-content">
                        <div class="summary-title">Quiz Avg.</div>
                        <div class="summary-value" id="quiz-average">0%</div>
                    </div>
                </div>
            </div>
            
            <div class="calendar-section">
                <h3>Activity Calendar</h3>
                <div id="activity-calendar" class="activity-calendar">
                    <div class="loading">Loading calendar...</div>
                </div>
            </div>
            
            <div class="badges-section">
                <h3>Your Achievements</h3>
                <div id="badges-container" class="badges-container">
                    <div class="loading">Loading achievements...</div>
                </div>
            </div>
            
            <div class="performance-section">
                <h3>Performance by Topic</h3>
                <div id="performance-chart" class="performance-chart">
                    <div class="loading">Loading chart...</div>
                </div>
                
                <div class="weak-areas-section">
                    <h4>Areas to Improve</h4>
                    <div id="weak-areas-container" class="weak-areas-container">
                        <div class="loading">Analyzing your performance...</div>
                    </div>
                </div>
            </div>

            <!-- Leaderboard Section -->
            <div class="leaderboard-section">
                <h3>Leaderboard</h3>
                <div class="leaderboard-filter">
                    <button class="leaderboard-filter-btn active" data-scope="class">Class</button>
                    <button class="leaderboard-filter-btn" data-scope="global">Global</button>
                </div>
                <div id="leaderboard-container" class="leaderboard-container">
                    <div class="loading">Loading leaderboard...</div>
                </div>
            </div>
            
            <!-- Goals Section -->
            <div class="goals-section">
                <h3>Learning Goals</h3>
                <div id="goals-container" class="goals-container">
                    <div class="loading">Loading your goals...</div>
                </div>
                <button id="add-goal-btn" class="add-goal-btn">Set New Goal</button>
            </div>
        </div>
    `;
    
    // Load user data
    Promise.all([
        database.ref(`users/${userId}/stats`).once('value'),
        database.ref(`users/${userId}/activity`).once('value'),
        database.ref(`users/${userId}/badges`).once('value'),
        database.ref(`users/${userId}/quizResults`).once('value')
    ]).then(([statsSnapshot, activitySnapshot, badgesSnapshot, quizResultsSnapshot]) => {
        const stats = statsSnapshot.val() || { streakDays: 0, points: 0 };
        
        // Update summary cards
        document.getElementById('current-streak').textContent = stats.streakDays;
        document.getElementById('total-points').textContent = stats.points;
        
        // Process activity data for calendar
        const activityData = {};
        activitySnapshot.forEach(childSnapshot => {
            const activity = childSnapshot.val();
            const date = new Date(activity.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!activityData[date]) {
                activityData[date] = 1;
            } else {
                activityData[date]++;
            }
        });
        
        // Render calendar
        renderActivityCalendar(activityData);
        
        // Process badges
        const badges = [];
        badgesSnapshot.forEach(childSnapshot => {
            badges.push(childSnapshot.val());
        });
        renderBadges(badges);
        
        // Process quiz results
        const quizResults = [];
        let totalScore = 0;
        let quizCount = 0;
        
        quizResultsSnapshot.forEach(childSnapshot => {
            const result = childSnapshot.val();
            quizResults.push(result);
            
            if (result.score !== undefined) {
                totalScore += result.score;
                quizCount++;
            }
        });
        
        // Calculate and update quiz average
        const quizAverage = quizCount > 0 ? Math.round(totalScore / quizCount) : 0;
        document.getElementById('quiz-average').textContent = `${quizAverage}%`;
        
        // Render performance chart
        renderPerformanceChart(quizResults);
        
        // New: Identify and render weak areas
        identifyAndRenderWeakAreas(quizResults);

        // Initialize the leaderboard
        initializeLeaderboard();

        // Initialize goal setting
        initializeGoalSetting();
        
        // Initialize enhanced performance analytics
        enhancePerformanceAnalytics();
        
        // Set up global event listeners for all interactive elements
        setupGlobalEventListeners();
    });
}

// Create global variables to track current calendar view
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();

// Enhanced renderActivityCalendar with month navigation
function renderActivityCalendar(activityData, month = currentCalendarMonth, year = currentCalendarYear) {
    const calendarContainer = document.getElementById('activity-calendar');
    
    // Update current view variables
    currentCalendarMonth = month;
    currentCalendarYear = year;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Month name
    const monthNames = ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"];
    
    // Generate calendar HTML
    let calendarHTML = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" id="prev-month">&lt;</button>
            <div class="calendar-month">${monthNames[month]} ${year}</div>
            <button class="calendar-nav-btn" id="next-month">&gt;</button>
        </div>
        <div class="calendar-weekdays">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
        </div>
        <div class="calendar-days">
    `;
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasActivity = activityData[date] > 0;
        const activityCount = activityData[date] || 0;
        const activityClass = hasActivity 
            ? (activityCount >= 5 ? 'high-activity' : (activityCount >= 3 ? 'medium-activity' : 'has-activity')) 
            : '';
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        
        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${activityClass}" 
                 data-date="${date}" data-count="${activityCount}">
                <div class="day-number">${day}</div>
                ${hasActivity ? `<div class="activity-dot" title="${activityCount} activities"></div>` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    calendarContainer.innerHTML = calendarHTML;
    
    // Add event listeners for calendar days with activity
    document.querySelectorAll('.calendar-day[data-count]').forEach(day => {
        const count = parseInt(day.dataset.count);
        if (count > 0) {
            day.addEventListener('click', () => {
                showDayActivityDetails(day.dataset.date, count);
            });
        }
    });
    
    // Add event listeners for calendar navigation
    document.getElementById('prev-month').addEventListener('click', navigateToPreviousMonth);
    document.getElementById('next-month').addEventListener('click', navigateToNextMonth);
}

// Navigate to previous month
function navigateToPreviousMonth() {
    // Calculate previous month
    let newMonth = currentCalendarMonth - 1;
    let newYear = currentCalendarYear;
    
    if (newMonth < 0) {
        newMonth = 11; // December
        newYear--;
    }
    
    // Limit navigation to the past year
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    if (newYear < oneYearAgo.getFullYear() || 
        (newYear === oneYearAgo.getFullYear() && newMonth < oneYearAgo.getMonth())) {
        showToast("Cannot navigate beyond one year in the past");
        return;
    }
    
    // Fetch activity data for the new month and render
    fetchMonthActivityData(newYear, newMonth)
        .then(activityData => {
            renderActivityCalendar(activityData, newMonth, newYear);
        })
        .catch(error => {
            console.error('Error fetching activity data:', error);
            // Render empty calendar if data fetch fails
            renderActivityCalendar({}, newMonth, newYear);
        });
}

// Navigate to next month
function navigateToNextMonth() {
    // Calculate next month
    let newMonth = currentCalendarMonth + 1;
    let newYear = currentCalendarYear;
    
    if (newMonth > 11) {
        newMonth = 0; // January
        newYear++;
    }
    
    // Prevent navigating to future months
    const today = new Date();
    if (newYear > today.getFullYear() || 
        (newYear === today.getFullYear() && newMonth > today.getMonth())) {
        showToast("Cannot navigate to future months");
        return;
    }
    
    // Fetch activity data for the new month and render
    fetchMonthActivityData(newYear, newMonth)
        .then(activityData => {
            renderActivityCalendar(activityData, newMonth, newYear);
        })
        .catch(error => {
            console.error('Error fetching activity data:', error);
            // Render empty calendar if data fetch fails
            renderActivityCalendar({}, newMonth, newYear);
        });
}

// Fetch activity data for a specific month
function fetchMonthActivityData(year, month) {
    const userId = getUserId();
    
    // Create date range for query
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month
    
    // Format dates for Firebase query
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime() + 86399999; // End of day (23:59:59.999)
    
    return new Promise((resolve, reject) => {
        // In a real implementation, this would query Firebase
        // Here we'll simulate with delay and random data
        setTimeout(() => {
            try {
                // Generate random activity data for the month
                const activityData = {};
                
                // Add some random activity for the month
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    // Add activity to about 50% of days in the past, none in the future
                    const date = new Date(year, month, day);
                    const today = new Date();
                    
                    if (date <= today && Math.random() > 0.5) {
                        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        activityData[dateString] = Math.floor(Math.random() * 8) + 1; // 1-8 activities
                    }
                }
                
                resolve(activityData);
            } catch (error) {
                reject(error);
            }
        }, 300);
    });
}

// Show day activity details
function showDayActivityDetails(date, activityCount) {
    // Format the date for display
    const displayDate = new Date(date).toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="day-activity-modal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Activity on ${displayDate}</h3>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="activity-summary">
                        <div class="activity-count">${activityCount}</div>
                        <div class="activity-label">Activities Completed</div>
                    </div>
                    <div class="activity-detail-list">
                        <div class="loading">Loading activity details...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener to close button
    document.querySelector('#day-activity-modal .modal-close-btn').addEventListener('click', () => {
        document.body.removeChild(document.getElementById('day-activity-modal'));
    });
    
    // Fetch and display activity details
    fetchDayActivityDetails(date).then(activities => {
        const detailsContainer = document.querySelector('.activity-detail-list');
        
        if (activities.length === 0) {
            detailsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-message">No detailed activity data available for this day</div>
                </div>
            `;
            return;
        }
        
        // Generate activity details HTML
        const detailsHTML = activities.map(activity => {
            return `
                <div class="activity-detail-item">
                    <div class="activity-time">${formatTime(new Date(activity.timestamp))}</div>
                    <div class="activity-type">${activity.type}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
            `;
        }).join('');
        
        detailsContainer.innerHTML = detailsHTML;
    }).catch(error => {
        console.error('Error fetching activity details:', error);
        document.querySelector('.activity-detail-list').innerHTML = `
            <div class="error-state">
                <div class="error-message">Failed to load activity details</div>
            </div>
        `;
    });
}

// Fetch activity details for a specific day
function fetchDayActivityDetails(date) {
    const userId = getUserId();
    
    return new Promise((resolve, reject) => {
        // In a real implementation, this would query Firebase
        // Here we'll simulate with delay and random data
        setTimeout(() => {
            try {
                // Generate random activity data for the day
                const activities = [];
                const activityTypes = ['Quiz Completed', 'Flashcards Studied', 'Lesson Completed', 'Note Created'];
                const activityCount = Math.floor(Math.random() * 5) + 1; // 1-5 activities
                
                // Create timestamp for the given date
                const dayDate = new Date(date);
                
                // Generate activities throughout the day
                for (let i = 0; i < activityCount; i++) {
                    const activityDate = new Date(dayDate);
                    activityDate.setHours(9 + Math.floor(Math.random() * 12)); // Between 9am and 9pm
                    activityDate.setMinutes(Math.floor(Math.random() * 60));
                    
                    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
                    
                    let description = '';
                    switch (activityType) {
                        case 'Quiz Completed':
                            description = `Scored ${Math.floor(Math.random() * 40) + 60}% on ${getRandomTopic()} quiz`;
                            break;
                        case 'Flashcards Studied':
                            description = `Studied ${Math.floor(Math.random() * 20) + 5} ${getRandomTopic()} flashcards`;
                            break;
                        case 'Lesson Completed':
                            description = `Completed ${getRandomTopic()} lesson`;
                            break;
                        case 'Note Created':
                            description = `Created study note on ${getRandomTopic()}`;
                            break;
                    }
                    
                    activities.push({
                        timestamp: activityDate.getTime(),
                        type: activityType,
                        description: description
                    });
                }
                
                // Sort by timestamp (newest first)
                activities.sort((a, b) => b.timestamp - a.timestamp);
                
                resolve(activities);
            } catch (error) {
                reject(error);
            }
        }, 300);
    });
}

// Helper function to get a random topic
function getRandomTopic() {
    const topics = ['Algorithms', 'Data Structures', 'Networking', 'Databases', 'Web Development', 'Mobile Development'];
    return topics[Math.floor(Math.random() * topics.length)];
}

// Helper function to format time (HH:MM AM/PM)
function formatTime(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return `${hours}:${minutes} ${ampm}`;
}

// Helper function to ensure we have a valid user ID
function getUserId() {
    // In a real app, this would come from your authentication system
    return localStorage.getItem('userId') || 'demo_user';
}

// Helper function to show toast messages
function showToast(message, duration = 3000) {
    // Remove existing toast if present
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show the toast (add visible class after a short delay for animation)
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);
    
    // Hide and remove after duration
    setTimeout(() => {
        toast.classList.remove('visible');
        
        // Remove after fade out animation completes
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Render badges
function renderBadges(badges) {
    const badgesContainer = document.getElementById('badges-container');
    
    if (badges.length === 0) {
        badgesContainer.innerHTML = '<div class="empty-state">No badges earned yet</div>';
        return;
    }
    
    const badgesHTML = badges.map(badge => {
        return `
            <div class="badge">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-info">
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-description">${badge.description}</div>
                    <div class="badge-date">Earned on ${formatDate(new Date(badge.earnedOn))}</div>
                </div>
            </div>
        `;
    }).join('');
    
    badgesContainer.innerHTML = badgesHTML;
}

// Render performance chart
function renderPerformanceChart(quizResults) {
    const chartContainer = document.getElementById('performance-chart');
    
    // Group quiz results by category/topic
    const topicPerformance = {};
    
    quizResults.forEach(result => {
        if (!result.topic || result.score === undefined) return;
        
        if (!topicPerformance[result.topic]) {
            topicPerformance[result.topic] = {
                total: 0,
                count: 0
            };
        }
        
        topicPerformance[result.topic].total += result.score;
        topicPerformance[result.topic].count++;
    });
    
    // Calculate averages and prepare chart data
    const topics = [];
    const scores = [];
    
    for (const topic in topicPerformance) {
        const average = Math.round(topicPerformance[topic].total / topicPerformance[topic].count);
        topics.push(topic);
        scores.push(average);
    }
    
    if (topics.length === 0) {
        chartContainer.innerHTML = '<div class="empty-state">No quiz data available</div>';
        return;
    }
    
    // Create a simplified bar chart
    const maxScore = Math.max(...scores);
    const chartHeight = 200;
    
    const barsHTML = topics.map((topic, index) => {
        const height = (scores[index] / 100) * chartHeight;
        return `
            <div class="chart-bar-container">
                <div class="chart-bar-label">${topic}</div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar" style="height: ${height}px">
                        <div class="chart-bar-value">${scores[index]}%</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    chartContainer.innerHTML = `
        <div class="chart-container">
            <div class="chart-y-axis">
                <div>100%</div>
                <div>75%</div>
                <div>50%</div>
                <div>25%</div>
                <div>0%</div>
            </div>
            <div class="chart-bars">${barsHTML}</div>
        </div>
    `;
}

// Helper function to format date
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// New function to identify and render weak areas
function identifyAndRenderWeakAreas(quizResults) {
    const weakAreasContainer = document.getElementById('weak-areas-container');
    
    // Group quiz results by topic and calculate average scores
    const topicPerformance = {};
    const WEAK_THRESHOLD = 70; // Define threshold for weak areas (below 70%)
    
    quizResults.forEach(result => {
        if (!result.topic || result.score === undefined) return;
        
        if (!topicPerformance[result.topic]) {
            topicPerformance[result.topic] = {
                total: 0,
                count: 0,
                scores: [],
                lastAttempt: 0
            };
        }
        
        topicPerformance[result.topic].total += result.score;
        topicPerformance[result.topic].count++;
        topicPerformance[result.topic].scores.push(result.score);
        
        // Track the most recent attempt
        if (result.timestamp > topicPerformance[result.topic].lastAttempt) {
            topicPerformance[result.topic].lastAttempt = result.timestamp;
        }
    });
    
    // Identify weak areas (average score below threshold)
    const weakAreas = [];
    
    for (const topic in topicPerformance) {
        const data = topicPerformance[topic];
        const averageScore = Math.round(data.total / data.count);
        
        // Check if this is a weak area
        if (averageScore < WEAK_THRESHOLD) {
            weakAreas.push({
                topic: topic,
                averageScore: averageScore,
                attempts: data.count,
                lastAttempt: data.lastAttempt,
                // Calculate trend (improving or declining)
                trend: calculateTrend(data.scores)
            });
        }
    }
    
    // Sort weak areas by average score (lowest first)
    weakAreas.sort((a, b) => a.averageScore - b.averageScore);
    
    // Render the weak areas
    renderWeakAreas(weakAreas);
}

// Calculate if performance is improving or declining
function calculateTrend(scores) {
    if (scores.length < 2) return 'neutral'; // Not enough data
    
    // Compare the average of first half vs second half
    const halfway = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, halfway);
    const secondHalf = scores.slice(halfway);
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    if (secondAvg - firstAvg >= 5) return 'improving';
    if (firstAvg - secondAvg >= 5) return 'declining';
    return 'neutral';
}

// Render weak areas in the UI
function renderWeakAreas(weakAreas) {
    const container = document.getElementById('weak-areas-container');
    
    if (weakAreas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <p>Great job! You're performing well in all topics.</p>
            </div>
        `;
        return;
    }
    
    // Create HTML for weak areas
    let weakAreasHTML = `
        <div class="weak-areas-list">
    `;
    
    weakAreas.forEach(area => {
        // Determine trend icon and class
        let trendIcon = '';
        let trendClass = '';
        
        if (area.trend === 'improving') {
            trendIcon = '↗️';
            trendClass = 'trend-improving';
        } else if (area.trend === 'declining') {
            trendIcon = '↘️';
            trendClass = 'trend-declining';
        }
        
        weakAreasHTML += `
            <div class="weak-area-item">
                <div class="weak-area-header">
                    <div class="weak-area-topic">${area.topic}</div>
                    <div class="weak-area-score ${getScoreClass(area.averageScore)}">
                        ${area.averageScore}%
                        <span class="trend-indicator ${trendClass}">${trendIcon}</span>
                    </div>
                </div>
                <div class="weak-area-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${area.averageScore}%"></div>
                    </div>
                </div>
                <div class="weak-area-footer">
                    <span class="weak-area-attempts">${area.attempts} attempt${area.attempts !== 1 ? 's' : ''}</span>
                    <button class="weak-area-action-btn" data-topic="${area.topic}">Study Now</button>
                </div>
            </div>
        `;
    });
    
    weakAreasHTML += `</div>`;
    
    // Add recommendations based on weak areas
    weakAreasHTML += `
        <div class="improvement-recommendations">
            <h5>Recommended Actions</h5>
            <ul class="recommendations-list">
                ${weakAreas.slice(0, 2).map(area => `
                    <li>Review ${area.topic} lessons and take practice quizzes</li>
                `).join('')}
                <li>Set a goal to improve your weakest topic by 10% this week</li>
            </ul>
        </div>
    `;
    
    container.innerHTML = weakAreasHTML;
    
    // Add event listeners to the "Study Now" buttons
    document.querySelectorAll('.weak-area-action-btn').forEach(button => {
        button.addEventListener('click', () => {
            const topic = button.getAttribute('data-topic');
            navigateToStudyMaterial(topic);
        });
    });
}

// Helper function to determine score class based on score value
function getScoreClass(score) {
    if (score < 50) return 'score-critical';
    if (score < 60) return 'score-poor';
    if (score < 70) return 'score-fair';
    return '';
}

// Navigate to study material for a specific topic
function navigateToStudyMaterial(topic) {
    // In a real implementation, this would navigate to the appropriate study material
    showToast(`Navigating to study materials for ${topic}...`);
    
    // You would implement the actual navigation logic here
    // For example:
    // window.location.href = `/study.html?topic=${encodeURIComponent(topic)}`;
}

// Add this function to fetch and display leaderboard data
function initializeLeaderboard() {
    // Check if leaderboard container exists in the DOM
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (!leaderboardContainer) return;
    
    // Initialize with class leaderboard (more relevant for most users)
    loadLeaderboard('class');
    
    // Set up filter buttons event listeners
    document.querySelectorAll('.leaderboard-filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.leaderboard-filter-btn').forEach(btn => 
                btn.classList.remove('active'));
            button.classList.add('active');
            
            // Load selected leaderboard
            const scope = button.getAttribute('data-scope');
            loadLeaderboard(scope);
        });
    });
}

// Load leaderboard data based on selected scope
function loadLeaderboard(scope) {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const userId = getUserId();
    
    // Show loading state
    leaderboardContainer.innerHTML = `<div class="loading">Loading ${scope} leaderboard...</div>`;
    
    // In a real implementation, this would be a Firebase query
    // For this example, we'll simulate the data fetch with a timeout
    setTimeout(() => {
        fetchLeaderboardData(scope)
            .then(leaderboardData => {
                renderLeaderboard(leaderboardData, userId);
            })
            .catch(error => {
                console.error('Error loading leaderboard:', error);
                leaderboardContainer.innerHTML = `
                    <div class="error-state">
                        <div class="error-message">Failed to load leaderboard data</div>
                        <button id="retry-leaderboard" class="retry-btn">Retry</button>
                    </div>
                `;
                
                // Add retry functionality
                document.getElementById('retry-leaderboard').addEventListener('click', () => {
                    loadLeaderboard(scope);
                });
            });
    }, 500);
}

// Simulate fetching leaderboard data from backend
function fetchLeaderboardData(scope) {
    return new Promise((resolve, reject) => {
        try {
            const leaderboardData = generateLeaderboardData(scope);
            resolve(leaderboardData);
        } catch (error) {
            reject(error);
        }
    });
}

// Generate simulated leaderboard data
function generateLeaderboardData(scope) {
    const userId = getUserId();
    
    // Create different data based on scope
    let entries = [];
    const userCount = scope === 'class' ? 15 : 50;
    
    // Define some realistic names
    const firstNames = ["Alex", "Jordan", "Taylor", "Jamie", "Morgan", "Casey", "Riley", "Quinn", "Sam", "Avery", 
                         "Drew", "Jessie", "Parker", "Cameron", "Reese", "Skyler", "Hayden", "Dakota", "Remy", "Finley"];
    
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", 
                        "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee"];
    
    // Generate entries
    for (let i = 0; i < userCount; i++) {
        // For class scope, make ranks more competitive (smaller score gaps)
        // For global scope, make ranks more spread out
        const baseScore = scope === 'class' ? 800 : 500;
        const scoreRange = scope === 'class' ? 400 : 1000;
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        entries.push({
            id: `user${i}`,
            name: `${firstName} ${lastName.charAt(0)}.`,
            score: baseScore + Math.floor(Math.random() * scoreRange),
            photoUrl: null, // In a real app, this would be a URL to user's profile photo
            isCurrentUser: false
        });
    }
    
    // Add current user with a reasonable rank (not always at the top, more realistic)
    const userRank = Math.floor(Math.random() * Math.min(10, entries.length));
    const userEntry = {
        id: userId,
        name: "You",
        score: entries[userRank].score, // Take score from the position we want to insert at
        photoUrl: null,
        isCurrentUser: true
    };
    
    // Remove the entry at the position we're inserting the user
    entries.splice(userRank, 1, userEntry);
    
    // Sort by score (descending)
    entries.sort((a, b) => b.score - a.score);
    
    return entries;
}

// Render leaderboard
function renderLeaderboard(leaderboardData, userId) {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    
    if (leaderboardData.length === 0) {
        leaderboardContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏆</div>
                <p>No leaderboard data available yet</p>
            </div>
        `;
        return;
    }
    
    // Find current user rank
    const userRank = leaderboardData.findIndex(entry => entry.id === userId) + 1;
    
    // Generate top 3 winners section
    let leaderboardHTML = `
        <div class="leaderboard-winners">
    `;
    
    // Add top 3 winners (or fewer if less than 3 entries)
    const topThree = leaderboardData.slice(0, Math.min(3, leaderboardData.length));
    
    topThree.forEach((entry, index) => {
        const rank = index + 1;
        const isCurrentUser = entry.id === userId;
        
        // Add medal emoji and class based on rank
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        
        leaderboardHTML += `
            <div class="winner-item rank-${rank} ${isCurrentUser ? 'current-user' : ''}">
                <div class="winner-rank">${medal}</div>
                <div class="winner-avatar">
                    ${entry.photoUrl ? 
                        `<img src="${entry.photoUrl}" alt="${entry.name}">` : 
                        `<div class="avatar-placeholder">${getInitials(entry.name)}</div>`
                    }
                </div>
                <div class="winner-info">
                    <div class="winner-name">${entry.name}</div>
                    <div class="winner-score">${entry.score} pts</div>
                </div>
            </div>
        `;
    });
    
    leaderboardHTML += `</div>`;
    
    // Add the rest of the leaderboard
    leaderboardHTML += `
        <div class="leaderboard-table">
            <div class="leaderboard-header">
                <div class="leaderboard-rank">Rank</div>
                <div class="leaderboard-user">User</div>
                <div class="leaderboard-score">Score</div>
            </div>
            <div class="leaderboard-entries">
    `;
    
    // Skip the top 3 and show the rest
    for (let i = 3; i < leaderboardData.length; i++) {
        const entry = leaderboardData[i];
        const rank = i + 1;
        const isCurrentUser = entry.id === userId;
        
        leaderboardHTML += `
            <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                <div class="leaderboard-rank">${rank}</div>
                <div class="leaderboard-user">
                    <div class="leaderboard-avatar">
                        ${entry.photoUrl ? 
                            `<img src="${entry.photoUrl}" alt="${entry.name}">` : 
                            `<div class="avatar-placeholder">${getInitials(entry.name)}</div>`
                        }
                    </div>
                    <div class="leaderboard-name">${entry.name}</div>
                </div>
                <div class="leaderboard-score">${entry.score} pts</div>
            </div>
        `;
        
        // If we have more than 10 entries and we're at the 10th, show a "Show more" button
        if (i === 9 && leaderboardData.length > 10) {
            leaderboardHTML += `
                <div class="leaderboard-show-more-container">
                    <button id="show-more-leaderboard" class="show-more-btn">Show more</button>
                </div>
            `;
            break;
        }
    }
    
    leaderboardHTML += `
            </div>
        </div>
    `;
    
    // Add user's rank information
    leaderboardHTML += `
        <div class="user-rank-info">
            <div class="user-rank-label">Your rank:</div>
            <div class="user-rank-value">${userRank} of ${leaderboardData.length}</div>
        </div>
    `;
    
    // Update the container
    leaderboardContainer.innerHTML = leaderboardHTML;
    
    // Add event listener for "Show more" button
    const showMoreBtn = document.getElementById('show-more-leaderboard');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            showFullLeaderboard(leaderboardData, userId);
        });
    }
}

// Function to show full leaderboard in a modal
function showFullLeaderboard(leaderboardData, userId) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="full-leaderboard-modal">
            <div class="modal-container large-modal">
                <div class="modal-header">
                    <h3>Complete Leaderboard</h3>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="full-leaderboard-container">
                        <div class="leaderboard-header">
                            <div class="leaderboard-rank">Rank</div>
                            <div class="leaderboard-user">User</div>
                            <div class="leaderboard-score">Score</div>
                        </div>
                        <div class="full-leaderboard-entries">
                            ${leaderboardData.map((entry, index) => {
                                const rank = index + 1;
                                const isCurrentUser = entry.id === userId;
                                
                                return `
                                    <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                                        <div class="leaderboard-rank">${rank}</div>
                                        <div class="leaderboard-user">
                                            <div class="leaderboard-avatar">
                                                ${entry.photoUrl ? 
                                                    `<img src="${entry.photoUrl}" alt="${entry.name}">` : 
                                                    `<div class="avatar-placeholder">${getInitials(entry.name)}</div>`
                                                }
                                            </div>
                                            <div class="leaderboard-name">${entry.name}</div>
                                        </div>
                                        <div class="leaderboard-score">${entry.score} pts</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener to close button
    document.querySelector('#full-leaderboard-modal .modal-close-btn').addEventListener('click', () => {
        document.body.removeChild(document.getElementById('full-leaderboard-modal'));
    });
    
    // Scroll to user's position
    setTimeout(() => {
        const userEntry = document.querySelector('#full-leaderboard-modal .current-user');
        if (userEntry) {
            userEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

// Helper function to get initials from name
function getInitials(name) {
    return name.split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase();
}

// Function to initialize goal setting section event listeners
function initializeGoalSetting() {
    // Add event listener to the "Set New Goal" button
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
        addGoalBtn.addEventListener('click', () => {
            openGoalModal();
        });
    }
    
    // Load user goals
    loadUserGoals();
}

// Function to load user goals from Firebase
function loadUserGoals() {
    const goalsContainer = document.getElementById('goals-container');
    const userId = getUserId();
    
    // Show loading state
    goalsContainer.innerHTML = `<div class="loading">Loading your goals...</div>`;
    
    // Fetch goals from Firebase
    database.ref(`users/${userId}/goals`).once('value')
        .then((snapshot) => {
            renderGoals(snapshot.val() || {});
        })
        .catch((error) => {
            console.error('Error loading goals:', error);
            goalsContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-message">Failed to load your goals</div>
                    <button id="retry-goals" class="retry-btn">Retry</button>
                </div>
            `;
            
            // Add retry functionality
            document.getElementById('retry-goals').addEventListener('click', () => {
                loadUserGoals();
            });
        });
}

// Function to render goals in the UI
function renderGoals(goals) {
    const goalsContainer = document.getElementById('goals-container');
    
    if (!goals || Object.keys(goals).length === 0) {
        goalsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <p>You haven't set any learning goals yet.</p>
                <p>Set goals to track your progress and stay motivated!</p>
            </div>
        `;
        return;
    }
    
    // Create HTML for goals
    let goalsHTML = '<div class="goals-list">';
    
    Object.entries(goals).forEach(([goalId, goal]) => {
        // Calculate progress percentage
        const progress = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
        const isCompleted = progress >= 100;
        
        // Determine goal icon based on type/unit
        let goalIcon;
        switch(goal.unit) {
            case 'flashcards':
                goalIcon = '📇';
                break;
            case 'quizzes':
                goalIcon = '📝';
                break;
            case 'points':
                goalIcon = '⭐';
                break;
            case 'minutes':
                goalIcon = '⏱️';
                break;
            default:
                goalIcon = '🎯';
        }
        
        goalsHTML += `
            <div class="goal-item ${isCompleted ? 'completed' : ''}" data-goal-id="${goalId}">
                <div class="goal-icon">${goalIcon}</div>
                <div class="goal-content">
                    <div class="goal-header">
                        <h4 class="goal-title">${goal.title}</h4>
                        <div class="goal-actions">
                            <button class="goal-edit-btn" data-goal-id="${goalId}" aria-label="Edit goal">
                                <span class="edit-icon">✏️</span>
                            </button>
                            <button class="goal-delete-btn" data-goal-id="${goalId}" aria-label="Delete goal">
                                <span class="delete-icon">🗑️</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="goal-details">
                        <div class="goal-target">${goal.current} / ${goal.target} ${goal.unit}</div>
                        <div class="goal-period">${goal.period}</div>
                    </div>
                    
                    <div class="goal-progress-container">
                        <div class="goal-progress-bar">
                            <div class="goal-progress-fill ${isCompleted ? 'complete' : ''}" style="width: ${progress}%">
                                ${progress >= 20 ? `<span class="goal-progress-text">${progress}%</span>` : ''}
                            </div>
                        </div>
                        ${progress < 20 ? `<div class="goal-progress-text-outside">${progress}%</div>` : ''}
                    </div>
                    
                    ${isCompleted ? `
                        <div class="goal-completion-badge">
                            <span class="completion-icon">✅</span>
                            <span class="completion-text">Completed!</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    goalsHTML += '</div>';
    
    // Update container
    goalsContainer.innerHTML = goalsHTML;
    
    // Add event listeners for goal actions
    document.querySelectorAll('.goal-edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const goalId = button.getAttribute('data-goal-id');
            openGoalModal(goalId);
        });
    });
    
    document.querySelectorAll('.goal-delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const goalId = button.getAttribute('data-goal-id');
            confirmDeleteGoal(goalId);
        });
    });
    
    // Make the entire goal item clickable to show details
    document.querySelectorAll('.goal-item').forEach(goalItem => {
        goalItem.addEventListener('click', () => {
            const goalId = goalItem.getAttribute('data-goal-id');
            showGoalDetails(goalId);
        });
    });
}

// Function to open the goal creation/editing modal
function openGoalModal(goalId = null) {
    const userId = getUserId();
    const isEditing = !!goalId;
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="goal-modal-overlay">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${isEditing ? 'Edit Goal' : 'Create New Goal'}</h3>
                    <button class="modal-close-btn" id="goal-modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    <form id="goal-form">
                        <div class="form-group">
                            <label for="goal-title">Goal Title</label>
                            <input type="text" id="goal-title" placeholder="e.g., Complete Data Structures Flashcards" required maxlength="50">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="goal-target">Target</label>
                                <input type="number" id="goal-target" min="1" max="9999" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="goal-unit">Unit</label>
                                <select id="goal-unit" required>
                                    <option value="flashcards">Flashcards</option>
                                    <option value="quizzes">Quizzes</option>
                                    <option value="points">Points</option>
                                    <option value="minutes">Minutes</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="goal-current">Current Progress</label>
                                <input type="number" id="goal-current" min="0" value="0">
                            </div>
                            
                            <div class="form-group">
                                <label for="goal-period">Time Period</label>
                                <select id="goal-period" required>
                                    <option value="Daily">Daily</option>
                                    <option value="Weekly">Weekly</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Overall">Overall</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" id="goal-cancel-btn" class="secondary-btn">Cancel</button>
                            <button type="submit" id="goal-save-btn" class="primary-btn">${isEditing ? 'Update Goal' : 'Create Goal'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // If editing an existing goal, load its data
    if (isEditing) {
        database.ref(`users/${userId}/goals/${goalId}`).once('value')
            .then((snapshot) => {
                const goalData = snapshot.val();
                if (goalData) {
                    document.getElementById('goal-title').value = goalData.title || '';
                    document.getElementById('goal-target').value = goalData.target || 1;
                    document.getElementById('goal-unit').value = goalData.unit || 'flashcards';
                    document.getElementById('goal-current').value = goalData.current || 0;
                    document.getElementById('goal-period').value = goalData.period || 'Weekly';
                }
            })
            .catch((error) => {
                console.error('Error loading goal data:', error);
                showToast('Error loading goal data');
            });
    }
    
    // Add event listeners
    document.getElementById('goal-modal-close').addEventListener('click', () => {
        closeGoalModal();
    });
    
    document.getElementById('goal-cancel-btn').addEventListener('click', () => {
        closeGoalModal();
    });
    
    document.getElementById('goal-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const title = document.getElementById('goal-title').value.trim();
        const target = parseInt(document.getElementById('goal-target').value);
        const unit = document.getElementById('goal-unit').value;
        const current = parseInt(document.getElementById('goal-current').value || '0');
        const period = document.getElementById('goal-period').value;
        
        // Validate data
        if (!title || target <= 0) {
            showToast('Please fill in all required fields correctly');
            return;
        }
        
        // Create goal object
        const goalData = {
            title,
            target,
            unit,
            current: current || 0,
            period,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        // Save to Firebase
        const goalRef = isEditing 
            ? database.ref(`users/${userId}/goals/${goalId}`)
            : database.ref(`users/${userId}/goals`).push();
        
        goalRef.set(goalData)
            .then(() => {
                showToast(`Goal ${isEditing ? 'updated' : 'created'} successfully!`);
                closeGoalModal();
                loadUserGoals();
            })
            .catch((error) => {
                console.error('Error saving goal:', error);
                showToast(`Failed to ${isEditing ? 'update' : 'create'} goal`);
            });
    });
}

// Function to close the goal modal
function closeGoalModal() {
    const modal = document.getElementById('goal-modal-overlay');
    if (modal) {
        // Add closing animation class
        modal.classList.add('closing');
        
        // Remove after animation completes
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    }
}

// Function to confirm goal deletion
function confirmDeleteGoal(goalId) {
    if (!goalId) return;
    
    // Create confirmation dialog
    const confirmHTML = `
        <div class="modal-overlay" id="confirm-delete-modal">
            <div class="modal-container small-modal">
                <div class="modal-header">
                    <h3>Delete Goal</h3>
                    <button class="modal-close-btn" id="confirm-close-btn">&times;</button>
                </div>
                <div class="modal-content">
                    <p>Are you sure you want to delete this goal? This action cannot be undone.</p>
                    
                    <div class="confirm-actions">
                        <button id="cancel-delete-btn" class="secondary-btn">Cancel</button>
                        <button id="confirm-delete-btn" class="danger-btn">Delete Goal</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', confirmHTML);
    
    // Add event listeners
    document.getElementById('confirm-close-btn').addEventListener('click', closeConfirmModal);
    document.getElementById('cancel-delete-btn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        deleteGoal(goalId);
    });
    
    function closeConfirmModal() {
        const modal = document.getElementById('confirm-delete-modal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 300);
        }
    }
}

// Function to delete a goal
function deleteGoal(goalId) {
    const userId = getUserId();
    
    database.ref(`users/${userId}/goals/${goalId}`).remove()
        .then(() => {
            showToast('Goal deleted successfully');
            
            // Close the confirmation modal
            const modal = document.getElementById('confirm-delete-modal');
            if (modal) {
                document.body.removeChild(modal);
            }
            
            // Reload goals
            loadUserGoals();
        })
        .catch((error) => {
            console.error('Error deleting goal:', error);
            showToast('Failed to delete goal');
        });
}

// Function to show goal details (when clicking on a goal)
function showGoalDetails(goalId) {
    const userId = getUserId();
    
    database.ref(`users/${userId}/goals/${goalId}`).once('value')
        .then((snapshot) => {
            const goal = snapshot.val();
            if (!goal) {
                showToast('Goal not found');
                return;
            }
            
            // Calculate progress percentage
            const progress = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
            const isCompleted = progress >= 100;
            
            // Create detail modal HTML
            const modalHTML = `
                <div class="modal-overlay" id="goal-details-modal">
                    <div class="modal-container">
                        <div class="modal-header">
                            <h3>Goal Details</h3>
                            <button class="modal-close-btn" id="details-close-btn">&times;</button>
                        </div>
                        <div class="modal-content">
                            <div class="goal-details-view">
                                <h4 class="goal-details-title">${goal.title}</h4>
                                
                                <div class="goal-details-progress">
                                    <div class="goal-details-progress-bar">
                                        <div class="goal-details-progress-fill ${isCompleted ? 'complete' : ''}" 
                                             style="width: ${progress}%">
                                        </div>
                                    </div>
                                    <div class="goal-details-progress-text">
                                        ${progress}% Complete
                                    </div>
                                </div>
                                
                                <div class="goal-details-stats">
                                    <div class="goal-details-stat">
                                        <div class="goal-details-stat-label">Current</div>
                                        <div class="goal-details-stat-value">${goal.current}</div>
                                    </div>
                                    <div class="goal-details-stat">
                                        <div class="goal-details-stat-label">Target</div>
                                        <div class="goal-details-stat-value">${goal.target}</div>
                                    </div>
                                    <div class="goal-details-stat">
                                        <div class="goal-details-stat-label">Unit</div>
                                        <div class="goal-details-stat-value">${goal.unit}</div>
                                    </div>
                                    <div class="goal-details-stat">
                                        <div class="goal-details-stat-label">Period</div>
                                        <div class="goal-details-stat-value">${goal.period}</div>
                                    </div>
                                </div>
                                
                                ${isCompleted ? `
                                    <div class="goal-details-complete">
                                        <div class="goal-details-complete-icon">🎉</div>
                                        <div class="goal-details-complete-text">
                                            Goal achieved! Great job!
                                        </div>
                                    </div>
                                ` : `
                                    <div class="goal-details-remaining">
                                        <div class="goal-details-remaining-text">
                                            ${goal.target - goal.current} ${goal.unit} remaining to complete this goal
                                        </div>
                                    </div>
                                `}
                                
                                <div class="goal-details-actions">
                                    <button id="details-update-progress-btn" class="primary-btn">Update Progress</button>
                                    <button id="details-edit-goal-btn" class="secondary-btn">Edit Goal</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Add event listeners
            document.getElementById('details-close-btn').addEventListener('click', closeDetailsModal);
            document.getElementById('details-edit-goal-btn').addEventListener('click', () => {
                closeDetailsModal();
                openGoalModal(goalId);
            });
            document.getElementById('details-update-progress-btn').addEventListener('click', () => {
                openUpdateProgressModal(goalId, goal);
            });
            
            function closeDetailsModal() {
                const modal = document.getElementById('goal-details-modal');
                if (modal) {
                    modal.classList.add('closing');
                    setTimeout(() => {
                        if (document.body.contains(modal)) {
                            document.body.removeChild(modal);
                        }
                    }, 300);
                }
            }
        })
        .catch((error) => {
            console.error('Error loading goal details:', error);
            showToast('Failed to load goal details');
        });
}

// Function to open progress update modal
function openUpdateProgressModal(goalId, goal) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="update-progress-modal">
            <div class="modal-container small-modal">
                <div class="modal-header">
                    <h3>Update Progress</h3>
                    <button class="modal-close-btn" id="progress-close-btn">&times;</button>
                </div>
                <div class="modal-content">
                    <form id="progress-form">
                        <div class="form-group">
                            <label for="progress-current">Current Progress (${goal.unit})</label>
                            <input type="number" id="progress-current" min="0" max="${goal.target}" value="${goal.current}" required>
                        </div>
                        
                        <div class="progress-slider-container">
                            <input type="range" id="progress-slider" min="0" max="${goal.target}" value="${goal.current}" class="progress-slider">
                            <div class="progress-slider-labels">
                                <span>0</span>
                                <span>${goal.target / 2}</span>
                                <span>${goal.target}</span>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" id="progress-cancel-btn" class="secondary-btn">Cancel</button>
                            <button type="submit" id="progress-save-btn" class="primary-btn">Save Progress</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    const currentInput = document.getElementById('progress-current');
    const slider = document.getElementById('progress-slider');
    
    // Sync input and slider
    currentInput.addEventListener('input', () => {
        slider.value = currentInput.value;
    });
    
    slider.addEventListener('input', () => {
        currentInput.value = slider.value;
    });
    
    document.getElementById('progress-close-btn').addEventListener('click', closeProgressModal);
    document.getElementById('progress-cancel-btn').addEventListener('click', closeProgressModal);
    
    document.getElementById('progress-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newProgress = parseInt(currentInput.value);
        updateGoalProgress(goalId, newProgress);
    });
    
    function closeProgressModal() {
        const modal = document.getElementById('update-progress-modal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 300);
        }
    }
}

// Function to update goal progress
function updateGoalProgress(goalId, newProgress) {
    const userId = getUserId();
    
    // First get the current goal to check if this update completes it
    database.ref(`users/${userId}/goals/${goalId}`).once('value')
        .then((snapshot) => {
            const goal = snapshot.val();
            const wasCompleted = goal && goal.current >= goal.target;
            const isNowCompleted = newProgress >= goal.target;
            
            // Update progress
            return database.ref(`users/${userId}/goals/${goalId}`).update({
                current: newProgress,
                updatedAt: Date.now()
            }).then(() => {
                // Close modal
                const modal = document.getElementById('update-progress-modal');
                if (modal) {
                    document.body.removeChild(modal);
                }
                
                // Also close details modal if it exists
                const detailsModal = document.getElementById('goal-details-modal');
                if (detailsModal) {
                    document.body.removeChild(detailsModal);
                }
                
                // Reload goals
                loadUserGoals();
                
                // If goal was just completed, show celebration
                if (!wasCompleted && isNowCompleted) {
                    showGoalCompletionCelebration(goal.title);
                } else {
                    showToast('Progress updated successfully');
                }
            });
        })
        .catch((error) => {
            console.error('Error updating progress:', error);
            showToast('Failed to update progress');
        });
}

// Function to show celebration when a goal is completed
function showGoalCompletionCelebration(goalTitle) {
    // Create celebration overlay
    const celebrationHTML = `
        <div class="celebration-overlay" id="goal-celebration">
            <div class="celebration-container">
                <div class="celebration-icon">🎉</div>
                <h3 class="celebration-title">Goal Completed!</h3>
                <p class="celebration-message">Congratulations! You've completed your goal:</p>
                <p class="celebration-goal-title">${goalTitle}</p>
                <button class="celebration-close-btn">Continue</button>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', celebrationHTML);
    
    // Add confetti effect
    showConfetti();
    
    // Add event listener to close button
    document.querySelector('.celebration-close-btn').addEventListener('click', () => {
        const celebration = document.getElementById('goal-celebration');
        if (celebration) {
            celebration.classList.add('closing');
            setTimeout(() => {
                if (document.body.contains(celebration)) {
                    document.body.removeChild(celebration);
                }
            }, 500);
        }
    });
    
    // Auto-close after 7 seconds
    setTimeout(() => {
        const celebration = document.getElementById('goal-celebration');
        if (celebration) {
            celebration.classList.add('closing');
            setTimeout(() => {
                if (document.body.contains(celebration)) {
                    document.body.removeChild(celebration);
                }
            }, 500);
        }
    }, 7000);
}

// Add the confetti animation function
function showConfetti() {
    // Create confetti container
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
    
    // Generate confetti elements
    const colors = ['#5E81AC', '#A3BE8C', '#EBCB8B', '#D08770', '#BF616A', '#B48EAD'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        
        // Randomize confetti properties
        const size = Math.random() * 10 + 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const animationDelay = Math.random() * 3;
        const animationDuration = Math.random() * 2 + 3;
        
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.backgroundColor = color;
        confetti.style.left = `${left}%`;
        confetti.style.animationDelay = `${animationDelay}s`;
        confetti.style.animationDuration = `${animationDuration}s`;
        
        confettiContainer.appendChild(confetti);
    }
    
    // Remove confetti after animation completes
    setTimeout(() => {
        if (document.body.contains(confettiContainer)) {
            confettiContainer.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(confettiContainer)) {
                    document.body.removeChild(confettiContainer);
                }
            }, 1000);
        }
    }, 5000);
}

// Create a database mock for testing if Firebase is not initialized
if (typeof database === 'undefined') {
    console.warn('Firebase database not detected, using localStorage mock for goals');
    
    // Create a simple mock for database operations
    window.database = {
        ref: function(path) {
            return {
                once: function(event) {
                    return new Promise((resolve) => {
                        const data = JSON.parse(localStorage.getItem(path) || 'null');
                        resolve({
                            val: function() { return data; },
                            forEach: function(callback) {
                                if (!data) return;
                                Object.entries(data).forEach(([key, value]) => {
                                    callback({ 
                                        key: key,
                                        val: function() { return value; }
                                    });
                                });
                            }
                        });
                    });
                },
                set: function(data) {
                    return new Promise((resolve) => {
                        localStorage.setItem(path, JSON.stringify(data));
                        resolve();
                    });
                },
                update: function(data) {
                    return new Promise((resolve) => {
                        const existingData = JSON.parse(localStorage.getItem(path) || '{}');
                        const updatedData = { ...existingData, ...data };
                        localStorage.setItem(path, JSON.stringify(updatedData));
                        resolve();
                    });
                },
                push: function() {
                    const key = 'goal_' + Date.now();
                    const fullPath = path + '/' + key;
                    return {
                        set: function(data) {
                            return new Promise((resolve) => {
                                const parentData = JSON.parse(localStorage.getItem(path) || '{}');
                                parentData[key] = data;
                                localStorage.setItem(path, JSON.stringify(parentData));
                                resolve();
                            });
                        },
                        key: key
                    };
                },
                remove: function() {
                    return new Promise((resolve) => {
                        localStorage.removeItem(path);
                        resolve();
                    });
                }
            };
        }
    };
}

// Enhanced performance analytics with trends over time and topic comparisons
function enhancePerformanceAnalytics() {
    // Find or create the enhanced analytics container
    let analyticsSection = document.querySelector('.enhanced-analytics-section');
    
    if (!analyticsSection) {
        const performanceSection = document.querySelector('.performance-section');
        
        if (!performanceSection) return;
        
        // Create enhanced analytics section after the existing performance chart
        analyticsSection = document.createElement('div');
        analyticsSection.className = 'enhanced-analytics-section';
        analyticsSection.innerHTML = `
            <div class="analytics-tabs">
                <button class="analytics-tab active" data-tab="trends">Score Trends</button>
                <button class="analytics-tab" data-tab="comparisons">Topic Comparisons</button>
                <button class="analytics-tab" data-tab="details">Detailed Analysis</button>
            </div>
            <div class="analytics-content">
                <div class="analytics-panel active" id="trends-panel">
                    <h4>Performance Over Time</h4>
                    <div class="trends-chart-container" id="trends-chart">
                        <div class="loading">Loading trend data...</div>
                    </div>
                </div>
                <div class="analytics-panel" id="comparisons-panel">
                    <h4>Topic Comparisons</h4>
                    <div class="comparisons-chart-container" id="comparisons-chart">
                        <div class="loading">Loading comparison data...</div>
                    </div>
                </div>
                <div class="analytics-panel" id="details-panel">
                    <h4>Detailed Quiz Analysis</h4>
                    <div class="details-container" id="details-container">
                        <div class="loading">Loading detailed analysis...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add the enhanced analytics section to the performance section
        const weakAreasSection = performanceSection.querySelector('.weak-areas-section');
        if (weakAreasSection) {
            performanceSection.insertBefore(analyticsSection, weakAreasSection);
        } else {
            performanceSection.appendChild(analyticsSection);
        }
        
        // Add event listeners to tabs
        const tabs = analyticsSection.querySelectorAll('.analytics-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and panels
                tabs.forEach(t => t.classList.remove('active'));
                analyticsSection.querySelectorAll('.analytics-panel').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const panelId = `${tab.dataset.tab}-panel`;
                document.getElementById(panelId).classList.add('active');
                
                // Load data for the selected panel if not already loaded
                const panelContent = document.getElementById(panelId).querySelector('div[id]');
                if (panelContent.querySelector('.loading')) {
                    loadAnalyticsData(tab.dataset.tab);
                }
            });
        });
    }
    
    // Initially load data for the active tab
    loadAnalyticsData('trends');
}

// Function to load analytics data based on selected tab
function loadAnalyticsData(tabType) {
    const userId = getUserId();
    
    // Fetch user's quiz results
    database.ref(`users/${userId}/quizResults`).once('value')
        .then(snapshot => {
            const quizResults = [];
            snapshot.forEach(childSnapshot => {
                quizResults.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Render the appropriate visualization based on tab type
            switch(tabType) {
                case 'trends':
                    renderTrendsChart(quizResults);
                    break;
                case 'comparisons':
                    renderComparisonsChart(quizResults);
                    break;
                case 'details':
                    renderDetailedAnalysis(quizResults);
                    break;
            }
        })
        .catch(error => {
            console.error(`Error loading ${tabType} data:`, error);
            document.getElementById(`${tabType}-panel`).querySelector('div[id]').innerHTML = `
                <div class="error-state">
                    <div class="error-message">Failed to load data</div>
                    <button class="retry-btn" data-type="${tabType}">Retry</button>
                </div>
            `;
            
            // Add retry functionality
            document.querySelector(`button[data-type="${tabType}"]`).addEventListener('click', () => {
                document.getElementById(`${tabType}-panel`).querySelector('div[id]').innerHTML = `
                    <div class="loading">Loading ${tabType} data...</div>
                `;
                loadAnalyticsData(tabType);
            });
        });
}

// Render trends chart showing performance over time
function renderTrendsChart(quizResults) {
    const trendsContainer = document.getElementById('trends-chart');
    
    if (quizResults.length < 2) {
        trendsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>Not enough quiz data to show trends. Complete more quizzes to see your progress over time.</p>
            </div>
        `;
        return;
    }
    
    // Sort quiz results by timestamp
    quizResults.sort((a, b) => a.timestamp - b.timestamp);
    
    // Group results by week
    const weeklyData = {};
    quizResults.forEach(result => {
        if (!result.timestamp || result.score === undefined) return;
        
        // Get week number (YYYY-WW format)
        const date = new Date(result.timestamp);
        const weekNumber = getWeekNumber(date);
        const weekKey = `${date.getFullYear()}-W${weekNumber}`;
        
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                total: 0,
                count: 0,
                scores: []
            };
        }
        
        weeklyData[weekKey].total += result.score;
        weeklyData[weekKey].count++;
        weeklyData[weekKey].scores.push(result.score);
    });
    
    // Prepare data for chart
    const labels = [];
    const averages = [];
    const minScores = [];
    const maxScores = [];
    
    Object.entries(weeklyData).forEach(([weekKey, data]) => {
        labels.push(formatWeekLabel(weekKey));
        averages.push(Math.round(data.total / data.count));
        minScores.push(Math.min(...data.scores));
        maxScores.push(Math.max(...data.scores));
    });
    
    // Create trends chart HTML
    let trendsHTML = `
        <div class="trends-chart">
            <div class="chart-container">
                <div class="chart-y-axis">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                </div>
                <div class="chart-content">
    `;
    
    // Add data points
    for (let i = 0; i < labels.length; i++) {
        const average = averages[i];
        const min = minScores[i];
        const max = maxScores[i];
        
        trendsHTML += `
            <div class="trend-data-point">
                <div class="trend-range" style="bottom: ${min}%; height: ${max - min}%"></div>
                <div class="trend-average" style="bottom: ${average}%"></div>
                <div class="trend-label">${labels[i]}</div>
            </div>
        `;
    }
    
    trendsHTML += `
                </div>
            </div>
            <div class="trends-legend">
                <div class="legend-item">
                    <span class="legend-color avg-color"></span>
                    <span class="legend-label">Average Score</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color range-color"></span>
                    <span class="legend-label">Score Range (Min-Max)</span>
                </div>
            </div>
            <div class="trends-insights">
                <h5>Key Insights</h5>
                <ul>
                    ${generateTrendInsights(averages, labels)}
                </ul>
            </div>
        </div>
    `;
    
    trendsContainer.innerHTML = trendsHTML;
}

// Generate insights based on trend data
function generateTrendInsights(averages, labels) {
    let insights = '';
    
    // Check for overall improvement
    const firstAvg = averages[0];
    const lastAvg = averages[averages.length - 1];
    const change = lastAvg - firstAvg;
    
    if (change > 5) {
        insights += `<li>Your scores improved by ${change}% from ${labels[0]} to ${labels[labels.length - 1]}.</li>`;
    } else if (change < -5) {
        insights += `<li>Your scores decreased by ${Math.abs(change)}% from ${labels[0]} to ${labels[labels.length - 1]}.</li>`;
    } else {
        insights += `<li>Your scores remained stable from ${labels[0]} to ${labels[labels.length - 1]}.</li>`;
    }
    
    // Find highest and lowest weeks
    const highestIndex = averages.indexOf(Math.max(...averages));
    const lowestIndex = averages.indexOf(Math.min(...averages));
    
    insights += `<li>Your best performance was in ${labels[highestIndex]} with an average score of ${averages[highestIndex]}%.</li>`;
    insights += `<li>Your lowest performance was in ${labels[lowestIndex]} with an average score of ${averages[lowestIndex]}%.</li>`;
    
    return insights;
}

// Render comparisons chart showing performance across topics
function renderComparisonsChart(quizResults) {
    const comparisonsContainer = document.getElementById('comparisons-chart');
    
    // Group results by topic
    const topicData = {};
    quizResults.forEach(result => {
        if (!result.topic || result.score === undefined) return;
        
        if (!topicData[result.topic]) {
            topicData[result.topic] = {
                total: 0,
                count: 0,
                scores: [],
                recentScores: [] // For tracking improvement
            };
        }
        
        topicData[result.topic].total += result.score;
        topicData[result.topic].count++;
        topicData[result.topic].scores.push(result.score);
        
        // Keep track of the 3 most recent scores for improvement tracking
        if (result.timestamp) {
            topicData[result.topic].recentScores.push({
                score: result.score,
                timestamp: result.timestamp
            });
            
            // Sort by timestamp (newest first) and keep only most recent 3
            topicData[result.topic].recentScores.sort((a, b) => b.timestamp - a.timestamp);
            if (topicData[result.topic].recentScores.length > 3) {
                topicData[result.topic].recentScores.pop();
            }
        }
    });
    
    if (Object.keys(topicData).length === 0) {
        comparisonsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No topic data available. Complete quizzes on different topics to see comparisons.</p>
            </div>
        `;
        return;
    }
    
    // Prepare data for radar chart
    const topics = Object.keys(topicData);
    const averages = topics.map(topic => Math.round(topicData[topic].total / topicData[topic].count));
    const improvements = topics.map(topic => {
        const recentScores = topicData[topic].recentScores;
        if (recentScores.length < 2) return 0;
        
        // Compare most recent score with the average of previous scores
        const mostRecent = recentScores[0].score;
        const previousAvg = recentScores.slice(1).reduce((sum, item) => sum + item.score, 0) / (recentScores.length - 1);
        return Math.round(mostRecent - previousAvg);
    });
    
    // Create comparisons chart HTML
    let comparisonsHTML = `
        <div class="radar-chart-container">
            <div class="radar-chart" id="topic-radar-chart">
                ${generateRadarChart(topics, averages)}
            </div>
        </div>
        <div class="topic-comparison-table">
            <div class="topic-comparison-header">
                <div class="topic-name">Topic</div>
                <div class="topic-average">Avg. Score</div>
                <div class="topic-trend">Recent Trend</div>
            </div>
            <div class="topic-comparison-body">
    `;
    
    // Add topic rows
    topics.forEach((topic, index) => {
        const average = averages[index];
        const improvement = improvements[index];
        const scoreClass = getScoreColorClass(average);
        
        comparisonsHTML += `
            <div class="topic-comparison-row">
                <div class="topic-name">${topic}</div>
                <div class="topic-average ${scoreClass}">${average}%</div>
                <div class="topic-trend ${improvement > 0 ? 'positive' : (improvement < 0 ? 'negative' : 'neutral')}">
                    ${improvement > 0 ? '↑' : (improvement < 0 ? '↓' : '–')} 
                    ${Math.abs(improvement)}%
                </div>
            </div>
        `;
    });
    
    comparisonsHTML += `
            </div>
        </div>
        <div class="topic-comparison-insights">
            <h5>Topic Insights</h5>
            <ul>
                ${generateTopicInsights(topics, averages, improvements)}
            </ul>
        </div>
    `;
    
    comparisonsContainer.innerHTML = comparisonsHTML;
}

// Generate radar chart SVG
function generateRadarChart(topics, scores) {
    const centerX = 150;
    const centerY = 150;
    const radius = 120;
    const sides = topics.length;
    
    // Don't attempt to render with fewer than 3 topics
    if (sides < 3) {
        return `
            <div class="empty-state">
                <p>Need at least 3 topics for radar chart visualization</p>
            </div>
        `;
    }
    
    // Calculate points on the radar for each score
    const angleStep = (2 * Math.PI) / sides;
    const points = [];
    
    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep - Math.PI / 2; // Start from top
        const scorePercent = scores[i] / 100;
        const pointX = centerX + radius * scorePercent * Math.cos(angle);
        const pointY = centerY + radius * scorePercent * Math.sin(angle);
        points.push({ x: pointX, y: pointY });
    }
    
    // Create SVG content
    let svgContent = `
        <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
            <!-- Background circles -->
            <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#e5e9f0" stroke-width="1" />
            <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.75}" fill="none" stroke="#e5e9f0" stroke-width="1" />
            <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.5}" fill="none" stroke="#e5e9f0" stroke-width="1" />
            <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.25}" fill="none" stroke="#e5e9f0" stroke-width="1" />
            
            <!-- Topic axes -->
    `;
    
    // Add axes lines
    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const endX = centerX + radius * Math.cos(angle);
        const endY = centerY + radius * Math.sin(angle);
        
        svgContent += `<line x1="${centerX}" y1="${centerY}" x2="${endX}" y2="${endY}" stroke="#e5e9f0" stroke-width="1" />`;
        
        // Add topic labels
        const labelX = centerX + (radius + 15) * Math.cos(angle);
        const labelY = centerY + (radius + 15) * Math.sin(angle);
        
        // Adjust text-anchor based on position around the circle
        let textAnchor = "middle";
        if (labelX < centerX - radius * 0.5) textAnchor = "end";
        if (labelX > centerX + radius * 0.5) textAnchor = "start";
        
        svgContent += `<text x="${labelX}" y="${labelY}" text-anchor="${textAnchor}" font-size="10" fill="#4c566a">${topics[i]}</text>`;
    }
    
    // Create polygon for the score area
    svgContent += `
        <polygon points="${points.map(p => `${p.x},${p.y}`).join(' ')}" fill="rgba(94, 129, 172, 0.4)" stroke="#5e81ac" stroke-width="2" />
    `;
    
    // Add dots at each data point
    points.forEach((point, i) => {
        svgContent += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#5e81ac" />`;
        
        // Add score labels
        svgContent += `<text x="${point.x}" y="${point.y - 8}" text-anchor="middle" font-size="9" font-weight="bold" fill="#4c566a">${scores[i]}%</text>`;
    });
    
    svgContent += `</svg>`;
    return svgContent;
}

// Generate insights based on topic comparison data
function generateTopicInsights(topics, averages, improvements) {
    let insights = '';
    
    // Find strongest and weakest topics
    const maxIndex = averages.indexOf(Math.max(...averages));
    const minIndex = averages.indexOf(Math.min(...averages));
    
    insights += `<li>Your strongest topic is <strong>${topics[maxIndex]}</strong> with an average score of ${averages[maxIndex]}%.</li>`;
    insights += `<li>Your weakest topic is <strong>${topics[minIndex]}</strong> with an average score of ${averages[minIndex]}%.</li>`;
    
    // Find most improved topic
    const mostImprovedIndex = improvements.indexOf(Math.max(...improvements));
    if (improvements[mostImprovedIndex] > 0) {
        insights += `<li>Your most improved topic is <strong>${topics[mostImprovedIndex]}</strong>, which improved by ${improvements[mostImprovedIndex]}% recently.</li>`;
    }
    
    // Make recommendations
    if (averages[minIndex] < 70) {
        insights += `<li>Focus on improving <strong>${topics[minIndex]}</strong> to balance your knowledge.</li>`;
    }
    
    return insights;
}

// Render detailed quiz analysis
function renderDetailedAnalysis(quizResults) {
    const detailsContainer = document.getElementById('details-container');
    
    if (quizResults.length === 0) {
        detailsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>No quiz data available. Complete quizzes to see detailed analysis.</p>
            </div>
        `;
        return;
    }
    
    // Sort quizzes by timestamp (most recent first)
    quizResults.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Generate summary statistics
    const totalQuizzes = quizResults.length;
    const averageScore = Math.round(quizResults.reduce((sum, quiz) => sum + (quiz.score || 0), 0) / totalQuizzes);
    const perfectScores = quizResults.filter(quiz => quiz.score === 100).length;
    const lowScores = quizResults.filter(quiz => quiz.score < 60).length;
    
    // Create detailed analysis HTML
    let detailsHTML = `
        <div class="detailed-stats">
            <div class="stat-card">
                <div class="stat-value">${totalQuizzes}</div>
                <div class="stat-label">Quizzes Taken</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${averageScore}%</div>
                <div class="stat-label">Average Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${perfectScores}</div>
                <div class="stat-label">Perfect Scores</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${lowScores}</div>
                <div class="stat-label">Needs Improvement</div>
            </div>
        </div>
        
        <h5 class="recent-quizzes-title">Recent Quizzes</h5>
        <div class="recent-quizzes-list">
    `;
    
    // Add recent quizzes (up to 5)
    const recentQuizzes = quizResults.slice(0, 5);
    recentQuizzes.forEach(quiz => {
        const quizDate = quiz.timestamp ? new Date(quiz.timestamp).toLocaleDateString() : 'Unknown date';
        const scoreClass = getScoreColorClass(quiz.score);
        
        detailsHTML += `
            <div class="quiz-item" data-quiz-id="${quiz.id || ''}">
                <div class="quiz-info">
                    <div class="quiz-title">${quiz.title || quiz.topic || 'Unnamed Quiz'}</div>
                    <div class="quiz-date">${quizDate}</div>
                </div>
                <div class="quiz-score ${scoreClass}">${quiz.score || 0}%</div>
                <button class="quiz-details-btn" data-quiz-id="${quiz.id || ''}">Details</button>
            </div>
        `;
    });
    
    detailsHTML += `
        </div>
        
        <div class="score-distribution">
            <h5>Score Distribution</h5>
            <div class="distribution-chart">
                ${generateScoreDistribution(quizResults)}
            </div>
        </div>
    `;
    
    detailsContainer.innerHTML = detailsHTML;
    
    // Add event listeners to quiz detail buttons
    document.querySelectorAll('.quiz-details-btn').forEach(button => {
        button.addEventListener('click', () => {
            const quizId = button.dataset.quizId;
            const quiz = quizResults.find(q => q.id === quizId);
            if (quiz) {
                showQuizDetails(quiz);
            }
        });
    });
}

// Generate score distribution chart
function generateScoreDistribution(quizResults) {
    // Group scores into ranges
    const ranges = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        'Below 60': 0
    };
    
    quizResults.forEach(quiz => {
        const score = quiz.score || 0;
        if (score >= 90) ranges['90-100']++;
        else if (score >= 80) ranges['80-89']++;
        else if (score >= 70) ranges['70-79']++;
        else if (score >= 60) ranges['60-69']++;
        else ranges['Below 60']++;
    });
    
    // Create distribution bars
    let distributionHTML = '';
    const total = quizResults.length;
    
    Object.entries(ranges).forEach(([range, count]) => {
        const percentage = Math.round((count / total) * 100) || 0;
        const barClass = getDistributionBarClass(range);
        
        distributionHTML += `
            <div class="distribution-bar-container">
                <div class="distribution-label">${range}</div>
                <div class="distribution-bar-wrapper">
                    <div class="distribution-bar ${barClass}" style="width: ${percentage}%">
                        <span class="distribution-count">${count}</span>
                    </div>
                </div>
                <div class="distribution-percentage">${percentage}%</div>
            </div>
        `;
    });
    
    return distributionHTML;
}

// Show detailed information for a specific quiz
function showQuizDetails(quiz) {
    // Format quiz date
    const quizDate = quiz.timestamp 
        ? new Date(quiz.timestamp).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Unknown date';
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="quiz-details-modal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Quiz Details</h3>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="quiz-details-header">
                        <h4>${quiz.title || quiz.topic || 'Unnamed Quiz'}</h4>
                        <div class="quiz-details-meta">
                            <div class="quiz-details-date">${quizDate}</div>
                            <div class="quiz-details-score ${getScoreColorClass(quiz.score)}">${quiz.score || 0}%</div>
                        </div>
                    </div>
                    
                    ${quiz.questions ? `
                        <div class="quiz-questions-review">
                            <h5>Questions Review</h5>
                            <div class="questions-list">
                                ${renderQuizQuestions(quiz.questions)}
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <p>Detailed question data not available for this quiz.</p>
                        </div>
                    `}
                    
                    <div class="quiz-details-footer">
                        <button id="quiz-retake-btn" class="secondary-btn">Study This Topic</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.querySelector('#quiz-details-modal .modal-close-btn').addEventListener('click', () => {
        document.body.removeChild(document.getElementById('quiz-details-modal'));
    });
    
    document.getElementById('quiz-retake-btn').addEventListener('click', () => {
        document.body.removeChild(document.getElementById('quiz-details-modal'));
        navigateToStudyMaterial(quiz.topic || '');
    });
}

// Render quiz questions review
function renderQuizQuestions(questions) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return '<div class="empty-state"><p>No question data available.</p></div>';
    }
    
    let questionsHTML = '';
    
    questions.forEach((question, index) => {
        const isCorrect = question.isCorrect || false;
        
        questionsHTML += `
            <div class="question-item ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="question-status">${isCorrect ? '✓' : '✗'}</div>
                <div class="question-content">
                    <div class="question-text">${question.text || `Question ${index + 1}`}</div>
                    ${question.userAnswer ? `
                        <div class="question-answer">
                            <span class="answer-label">Your answer:</span>
                            <span class="user-answer">${question.userAnswer}</span>
                        </div>
                    ` : ''}
                    ${!isCorrect && question.correctAnswer ? `
                        <div class="question-answer">
                            <span class="answer-label">Correct answer:</span>
                            <span class="correct-answer">${question.correctAnswer}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    return questionsHTML;
}

// Helper function to get week number from date
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to format week label
function formatWeekLabel(weekKey) {
    const [year, week] = weekKey.split('-W');
    return `W${week}`;
}

// Helper function to get score color class
function getScoreColorClass(score) {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 70) return 'score-average';
    if (score >= 60) return 'score-fair';
    return 'score-poor';
}

// Helper function to get distribution bar class
function getDistributionBarClass(range) {
    switch (range) {
        case '90-100': return 'excellent-range';
        case '80-89': return 'good-range';
        case '70-79': return 'average-range';
        case '60-69': return 'fair-range';
        default: return 'poor-range';
    }
}

// Function to set up global event listeners
function setupGlobalEventListeners() {
    // Time filter buttons for progress summary
    document.querySelectorAll('.time-filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.time-filter-btn').forEach(btn => 
                btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter data by selected period
            const period = button.getAttribute('data-period');
            filterProgressByPeriod(period);
        });
    });
    
    // Add any other global event listeners here
}

// Filter progress data by time period
function filterProgressByPeriod(period) {
    // This would normally filter your data based on the selected time period
    // For demonstration, just show a toast
    showToast(`Filtering progress by ${period}...`);
    
    // In a real implementation, you would update your charts and statistics
    // based on the selected time period
}

// Function to setup all event listeners throughout the progress tracker
function setupProgressTrackerEventListeners() {
    // Time filter buttons for progress summary
    document.querySelectorAll('.time-filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.time-filter-btn').forEach(btn => 
                btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter data by selected period
            const period = button.getAttribute('data-period');
            filterProgressByPeriod(period);
        });
    });
    
    // Calendar day clicks for activity details
    document.querySelectorAll('.calendar-day[data-count]').forEach(day => {
        const count = parseInt(day.dataset.count);
        if (count > 0) {
            day.addEventListener('click', () => {
                showDayActivityDetails(day.dataset.date, count);
            });
        }
    });
    
    // Badge clicks for details
    document.querySelectorAll('.badge-item').forEach(badge => {
        badge.addEventListener('click', () => {
            const badgeId = badge.dataset.badgeId;
            const badgeData = {
                id: badgeId,
                name: badge.querySelector('.badge-name').textContent,
                description: badge.querySelector('.badge-description').textContent,
                icon: badge.querySelector('.badge-icon').textContent
            };
            showBadgeDetails(badgeData, badge.classList.contains('earned'));
        });
    });
    
    // Weak area study buttons
    document.querySelectorAll('.weak-area-action-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent parent elements from receiving the click
            const topic = button.getAttribute('data-topic');
            navigateToStudyMaterial(topic);
        });
    });
    
    // Leaderboard filter buttons (re-attach in case they were dynamically created)
    document.querySelectorAll('.leaderboard-filter-btn').forEach(button => {
        button.removeEventListener('click', handleLeaderboardFilter); // Remove existing to prevent duplicates
        button.addEventListener('click', handleLeaderboardFilter);
    });
    
    // Goal related buttons
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) {
        addGoalBtn.removeEventListener('click', openGoalModal); // Remove existing to prevent duplicates
        addGoalBtn.addEventListener('click', () => openGoalModal());
    }
    
    // Goal edit buttons
    document.querySelectorAll('.goal-edit-btn').forEach(button => {
        button.removeEventListener('click', handleGoalEdit); // Remove existing to prevent duplicates
        button.addEventListener('click', handleGoalEdit);
    });
    
    // Goal delete buttons
    document.querySelectorAll('.goal-delete-btn').forEach(button => {
        button.removeEventListener('click', handleGoalDelete); // Remove existing to prevent duplicates
        button.addEventListener('click', handleGoalDelete);
    });
    
    // Goal items (for showing details)
    document.querySelectorAll('.goal-item').forEach(item => {
        item.removeEventListener('click', handleGoalClick); // Remove existing to prevent duplicates
        item.addEventListener('click', handleGoalClick);
    });
    
    // Analytics tab buttons
    document.querySelectorAll('.analytics-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabs = document.querySelectorAll('.analytics-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const panels = document.querySelectorAll('.analytics-panel');
            panels.forEach(p => p.classList.remove('active'));
            
            const panelId = `${tab.dataset.tab}-panel`;
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('active');
            
            // Load data if needed
            loadAnalyticsData(tab.dataset.tab);
        });
    });
    
    // Quiz details buttons
    document.querySelectorAll('.quiz-details-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const quizId = button.getAttribute('data-quiz-id');
            loadQuizDetails(quizId);
        });
    });
}

// Helper functions for event handlers
function handleLeaderboardFilter() {
    // Update active state
    document.querySelectorAll('.leaderboard-filter-btn').forEach(btn => 
        btn.classList.remove('active'));
    this.classList.add('active');
    
    // Load selected leaderboard
    const scope = this.getAttribute('data-scope');
    loadLeaderboard(scope);
}

function handleGoalEdit(e) {
    e.stopPropagation(); // Prevent parent goal item from receiving click
    const goalId = this.getAttribute('data-goal-id');
    openGoalModal(goalId);
}

function handleGoalDelete(e) {
    e.stopPropagation(); // Prevent parent goal item from receiving click
    const goalId = this.getAttribute('data-goal-id');
    confirmDeleteGoal(goalId);
}

function handleGoalClick() {
    const goalId = this.getAttribute('data-goal-id');
    showGoalDetails(goalId);
}

// Filter progress data by time period
function filterProgressByPeriod(period) {
    try {
        showLoadingState('.summary-cards');
        
        // This would normally filter your data based on the selected time period
        // For now, just show different data based on period
        setTimeout(() => {
            let streakValue, pointsValue, quizValue;
            
            switch(period) {
                case 'week':
                    streakValue = '5';
                    pointsValue = '350';
                    quizValue = '82%';
                    break;
                case 'month':
                    streakValue = '14';
                    pointsValue = '1,250';
                    quizValue = '78%';
                    break;
                case 'all':
                    streakValue = '23';
                    pointsValue = '3,750';
                    quizValue = '75%';
                    break;
            }
            
            // Update the summary cards
            document.getElementById('current-streak').textContent = streakValue;
            document.getElementById('total-points').textContent = pointsValue;
            document.getElementById('quiz-average').textContent = quizValue;
            
            hideLoadingState('.summary-cards');
            showToast(`Showing ${period} progress summary`);
        }, 500); // Simulate network delay
    } catch (error) {
        console.error('Error filtering by period:', error);
        hideLoadingState('.summary-cards');
        showToast('Error filtering data. Please try again.', 'error');
    }
}

// Function to show loading state in a container
function showLoadingState(containerSelector, message = 'Loading...') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Store original content so we can restore it if needed
    container.dataset.originalContent = container.innerHTML;
    
    // Add loading class and show loading message
    container.classList.add('loading-state');
    container.innerHTML = `<div class="loading-indicator"><div class="spinner"></div><p>${message}</p></div>`;
}

// Function to hide loading state and restore original content
function hideLoadingState(containerSelector, newContent = null) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    container.classList.remove('loading-state');
    
    if (newContent) {
        // If new content is provided, use that
        container.innerHTML = newContent;
    } else if (container.dataset.originalContent) {
        // Otherwise restore original content if available
        container.innerHTML = container.dataset.originalContent;
        delete container.dataset.originalContent;
    }
}

// Function to show error state
function showErrorState(containerSelector, message = 'An error occurred', retryFn = null) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    const retryButton = retryFn ? `<button class="retry-btn">Try Again</button>` : '';
    
    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <p class="error-message">${message}</p>
            ${retryButton}
        </div>
    `;
    
    if (retryFn) {
        container.querySelector('.retry-btn').addEventListener('click', retryFn);
    }
}

// Function to show empty state
function showEmptyState(containerSelector, message = 'No data available', icon = '📊') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <p>${message}</p>
        </div>
    `;
}

// Enhanced toast notification with different types (success, error, warning)
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast if present
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    
    // Add appropriate icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '✅';
            break;
        case 'error':
            icon = '❌';
            break;
        case 'warning':
            icon = '⚠️';
            break;
        default:
            icon = 'ℹ️';
    }
    
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${message}</span>`;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);
    
    // Hide and remove after duration
    setTimeout(() => {
        toast.classList.remove('visible');
        
        // Remove after fade out animation completes
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Function to safely load data with error handling
function safelyLoadData(dataPromise, successCallback, containerSelector) {
    showLoadingState(containerSelector);
    
    dataPromise
        .then(data => {
            successCallback(data);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            showErrorState(containerSelector, 'Failed to load data. Please try again.', () => {
                safelyLoadData(dataPromise, successCallback, containerSelector);
            });
            showToast('Error loading data', 'error');
        })
        .finally(() => {
            // No need to hide loading state here as it will be replaced by content
        });
}

// Function to load quiz details with error handling
function loadQuizDetails(quizId) {
    try {
        const userId = getUserId();
        
        showLoadingState('body', 'Loading quiz details...');
        
        // Fetch quiz data from Firebase
        database.ref(`users/${userId}/quizResults/${quizId}`).once('value')
            .then(snapshot => {
                const quiz = snapshot.val();
                if (!quiz) {
                    throw new Error('Quiz not found');
                }
                
                // Add the ID to the quiz object
                quiz.id = quizId;
                
                // Show quiz details
                showQuizDetails(quiz);
            })
            .catch(error => {
                console.error('Error loading quiz details:', error);
                showToast('Failed to load quiz details', 'error');
            })
            .finally(() => {
                hideLoadingState('body');
            });
    } catch (error) {
        console.error('Error in loadQuizDetails:', error);
        hideLoadingState('body');
        showToast('An unexpected error occurred', 'error');
    }
}

// Function to validate goal data
function validateGoalData(title, target, current, unit, period) {
    const errors = [];
    
    // Title validation
    if (!title || title.trim() === '') {
        errors.push('Please enter a goal title');
    } else if (title.length > 50) {
        errors.push('Title must be 50 characters or less');
    }
    
    // Target validation
    if (!target || isNaN(target) || target <= 0) {
        errors.push('Target must be a positive number');
    } else if (target > 9999) {
        errors.push('Target must be 9999 or less');
    }
    
    // Current progress validation
    if (current === undefined || isNaN(current) || current < 0) {
        errors.push('Current progress must be a non-negative number');
    } else if (current > target) {
        errors.push('Current progress cannot exceed target');
    }
    
    // Unit validation
    const validUnits = ['flashcards', 'quizzes', 'points', 'minutes'];
    if (!validUnits.includes(unit)) {
        errors.push('Please select a valid unit');
    }
    
    // Period validation
    const validPeriods = ['Daily', 'Weekly', 'Monthly', 'Overall'];
    if (!validPeriods.includes(period)) {
        errors.push('Please select a valid time period');
    }
    
    return errors;
}

// Update the goal form submission to include validation
function updateGoalFormSubmission() {
    const form = document.getElementById('goal-form');
    if (!form) return;
    
    // Replace the existing event listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const title = document.getElementById('goal-title').value.trim();
        const target = parseInt(document.getElementById('goal-target').value);
        const unit = document.getElementById('goal-unit').value;
        const current = parseInt(document.getElementById('goal-current').value || '0');
        const period = document.getElementById('goal-period').value;
        
        // Get goal ID if editing
        const saveBtn = document.getElementById('goal-save-btn');
        const isEditing = saveBtn.textContent.includes('Update');
        const goalId = isEditing ? saveBtn.getAttribute('data-goal-id') : null;
        
        // Validate form data
        const validationErrors = validateGoalData(title, target, current, unit, period);
        
        if (validationErrors.length > 0) {
            // Show validation errors
            showValidationErrors(validationErrors);
            return;
        }
        
        // Create goal object
        const goalData = {
            title,
            target,
            unit,
            current: current || 0,
            period,
            updatedAt: Date.now()
        };
        
        if (!isEditing) {
            goalData.createdAt = Date.now();
        }
        
        // Save to Firebase
        const userId = getUserId();
        const goalRef = isEditing 
            ? database.ref(`users/${userId}/goals/${goalId}`)
            : database.ref(`users/${userId}/goals`).push();
        
        showLoadingState('.modal-content', 'Saving goal...');
        
        goalRef.set(goalData)
            .then(() => {
                closeGoalModal();
                loadUserGoals();
                showToast(`Goal ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
            })
            .catch((error) => {
                console.error('Error saving goal:', error);
                hideLoadingState('.modal-content');
                showToast(`Failed to ${isEditing ? 'update' : 'create'} goal`, 'error');
            });
    });
}

// Function to show validation errors in the form
function showValidationErrors(errors) {
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.validation-error');
    existingErrors.forEach(el => el.remove());
    
    // Create error summary at the top of the form
    const form = document.getElementById('goal-form');
    const errorSummary = document.createElement('div');
    errorSummary.className = 'validation-error error-summary';
    
    let errorHTML = '<ul>';
    errors.forEach(error => {
        errorHTML += `<li>${error}</li>`;
    });
    errorHTML += '</ul>';
    
    errorSummary.innerHTML = errorHTML;
    form.insertBefore(errorSummary, form.firstChild);
    
    // Highlight the form inputs with errors
    if (errors.some(e => e.includes('title'))) {
        highlightInvalidField('goal-title');
    }
    
    if (errors.some(e => e.includes('Target'))) {
        highlightInvalidField('goal-target');
    }
    
    if (errors.some(e => e.includes('Current'))) {
        highlightInvalidField('goal-current');
    }
    
    // Focus on the first invalid input
    const firstInvalidInput = document.querySelector('.invalid-input');
    if (firstInvalidInput) {
        firstInvalidInput.focus();
    }
}

// Function to highlight invalid form fields
function highlightInvalidField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('invalid-input');
        
        // Remove the invalid class when the user starts typing
        field.addEventListener('input', function onInput() {
            field.classList.remove('invalid-input');
            field.removeEventListener('input', onInput);
        });
    }
}