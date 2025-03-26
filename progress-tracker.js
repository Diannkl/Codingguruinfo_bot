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
    });
}

// Render activity calendar
function renderActivityCalendar(activityData) {
    const calendarContainer = document.getElementById('activity-calendar');
    
    // Generate calendar for current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Month name
    const monthNames = ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"];
    
    // Generate calendar HTML
    let calendarHTML = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" id="prev-month">&lt;</button>
            <div class="calendar-month">${monthNames[currentMonth]} ${currentYear}</div>
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
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasActivity = activityData[date] > 0;
        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        
        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasActivity ? 'has-activity' : ''}">
                <div class="day-number">${day}</div>
                ${hasActivity ? `<div class="activity-dot" title="${activityData[date]} activities"></div>` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    calendarContainer.innerHTML = calendarHTML;
    
    // Add event listeners for calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        // Implementation for previous month navigation
        // This would require keeping track of the current displayed month
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        // Implementation for next month navigation
    });
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