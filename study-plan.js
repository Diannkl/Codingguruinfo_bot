// Study Plan Implementation
function loadStudyPlan() {
    const container = document.getElementById('main-container');
    const userId = getUserId();
    
    // Get user preferences and study plan data
    Promise.all([
        database.ref(`users/${userId}/preferences`).once('value'),
        database.ref('studyPlans').once('value')
    ]).then(([preferencesSnapshot, studyPlansSnapshot]) => {
        const preferences = preferencesSnapshot.val() || {
            dailyGoal: 3,
            selectedTopics: []
        };
        
        const studyPlans = studyPlansSnapshot.val() || {};
        
        // Render study plan page
        container.innerHTML = `
            <div class="study-plan">
                <h2 class="section-title">Your Study Plan</h2>
                
                <div class="daily-goals-section">
                    <h3>Daily Learning Goals</h3>
                    <div class="slider-container">
                        <div class="slider-label">Flashcards per day:</div>
                        <div class="slider-controls">
                            <input type="range" id="dailyGoalSlider" min="1" max="10" 
                                value="${preferences.dailyGoal || 3}" class="slider">
                            <div class="slider-value" id="dailyGoalValue">${preferences.dailyGoal || 3}</div>
                        </div>
                    </div>
                    <button id="saveGoalsBtn" class="primary-button">Save Goals</button>
                </div>
                
                <div class="topic-filters-section">
                    <h3>Topics to Study</h3>
                    <div id="topic-filters" class="topic-filters">
                        <div class="loading">Loading topics...</div>
                    </div>
                </div>
                
                <div class="learning-paths-section">
                    <h3>Learning Paths</h3>
                    <div id="learning-paths" class="learning-paths">
                        <div class="loading">Loading learning paths...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Load topics for filters
        loadTopicFilters(preferences.selectedTopics || []);
        
        // Load learning paths
        loadLearningPaths(studyPlans);
        
        // Set up event listeners
        setupStudyPlanEvents(userId, preferences);
    });
}

// Load topic filters
function loadTopicFilters(selectedTopics) {
    const topicFiltersContainer = document.getElementById('topic-filters');
    
    // Fetch topics from Firebase
    database.ref('categories').once('value')
        .then((snapshot) => {
            const topics = snapshot.val() || {};
            
            if (Object.keys(topics).length === 0) {
                topicFiltersContainer.innerHTML = '<div class="empty-state">No topics available</div>';
                return;
            }
            
            const topicCheckboxes = Object.entries(topics).map(([id, topic]) => {
                const isSelected = selectedTopics.includes(id);
                
                return `
                    <div class="topic-filter">
                        <label class="checkbox-container">
                            <input type="checkbox" data-topic-id="${id}" 
                                ${isSelected ? 'checked' : ''}>
                            <span class="checkbox-checkmark"></span>
                            <span class="checkbox-label">${topic.name}</span>
                        </label>
                    </div>
                `;
            }).join('');
            
            topicFiltersContainer.innerHTML = topicCheckboxes;
        });
}

// Load learning paths
function loadLearningPaths(studyPlans) {
    const learningPathsContainer = document.getElementById('learning-paths');
    
    if (Object.keys(studyPlans).length === 0) {
        learningPathsContainer.innerHTML = '<div class="empty-state">No learning paths available</div>';
        return;
    }
    
    const learningPathsHTML = Object.entries(studyPlans).map(([id, plan]) => {
        // Calculate progress if available
        const progress = plan.progress || 0;
        
        // Determine the level badge
        let levelBadge = '';
        switch (plan.level) {
            case 'beginner':
                levelBadge = '<span class="level-badge beginner">Beginner</span>';
                break;
            case 'intermediate':
                levelBadge = '<span class="level-badge intermediate">Intermediate</span>';
                break;
            case 'advanced':
                levelBadge = '<span class="level-badge advanced">Advanced</span>';
                break;
            default:
                levelBadge = '';
        }
        
        return `
            <div class="learning-path-card" data-plan-id="${id}">
                <div class="learning-path-header">
                    <div class="learning-path-title">${plan.title}</div>
                    ${levelBadge}
                </div>
                <div class="learning-path-description">${plan.description}</div>
                <div class="learning-path-stats">
                    <div class="stats-item">
                        <div class="stats-value">${plan.totalCards || 0}</div>
                        <div class="stats-label">Cards</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${plan.estimatedHours || 0}</div>
                        <div class="stats-label">Hours</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${plan.quizzes || 0}</div>
                        <div class="stats-label">Quizzes</div>
                    </div>
                </div>
                <div class="learning-path-progress">
                    <div class="progress-label">Progress: ${progress}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <button class="start-course-btn" data-plan-id="${id}">
                    ${progress > 0 ? 'Continue Course' : 'Start Course'}
                </button>
            </div>
        `;
    }).join('');
    
    learningPathsContainer.innerHTML = learningPathsHTML;
}

// Set up event listeners for the study plan page
function setupStudyPlanEvents(userId, preferences) {
    // Daily goal slider
    const dailyGoalSlider = document.getElementById('dailyGoalSlider');
    const dailyGoalValue = document.getElementById('dailyGoalValue');
    
    if (dailyGoalSlider) {
        dailyGoalSlider.addEventListener('input', function() {
            dailyGoalValue.textContent = this.value;
        });
    }
    
    // Save goals button
    const saveGoalsBtn = document.getElementById('saveGoalsBtn');
    if (saveGoalsBtn) {
        saveGoalsBtn.addEventListener('click', function() {
            // Get selected topics
            const selectedTopics = [];
            document.querySelectorAll('#topic-filters input[type="checkbox"]:checked').forEach(checkbox => {
                selectedTopics.push(checkbox.dataset.topicId);
            });
            
            // Get daily goal value
            const dailyGoal = parseInt(dailyGoalSlider.value, 10);
            
            // Save to Firebase
            const userPreferences = {
                dailyGoal: dailyGoal,
                selectedTopics: selectedTopics,
                lastUpdated: new Date().toISOString()
            };
            
            database.ref(`users/${userId}/preferences`).update(userPreferences)
                .then(() => {
                    // Save to Telegram Storage for offline access
                    saveTelegramStorage('preferences', userPreferences);
                    
                    // Track event in Firebase Analytics
                    logAnalyticsEvent('update_preferences', {
                        daily_goal: dailyGoal,
                        topics_count: selectedTopics.length
                    });
                    
                    // Show success message
                    showToast('Your study plan has been updated!');
                })
                .catch(error => {
                    console.error('Error saving preferences:', error);
                    showToast('Failed to save preferences. Please try again.', 'error');
                });
        });
    }
    
    // Start/Continue course buttons
    document.querySelectorAll('.start-course-btn').forEach(button => {
        button.addEventListener('click', function() {
            const planId = this.dataset.planId;
            
            // Track event in Firebase Analytics
            logAnalyticsEvent('start_course', {
                course_id: planId
            });
            
            // Navigate to the course
            loadCourse(planId);
        });
    });
}

// Function to save data to Telegram WebApp Storage
function saveTelegramStorage(key, value) {
    if (window.Telegram && window.Telegram.WebApp) {
        try {
            const jsonValue = JSON.stringify(value);
            window.Telegram.WebApp.CloudStorage.setItem(key, jsonValue);
        } catch (error) {
            console.error('Error saving to Telegram Storage:', error);
        }
    }
}

// Function to get data from Telegram WebApp Storage
function getTelegramStorage(key) {
    if (window.Telegram && window.Telegram.WebApp) {
        try {
            const value = window.Telegram.WebApp.CloudStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Error getting from Telegram Storage:', error);
            return null;
        }
    }
    return null;
}

// Function to log analytics events
function logAnalyticsEvent(eventName, params) {
    // Log to Firebase Analytics
    if (window.firebase && window.firebase.analytics) {
        window.firebase.analytics().logEvent(eventName, params);
    }
    
    // Also save to our own analytics in database for backup
    const userId = getUserId();
    if (userId) {
        const eventData = {
            userId: userId,
            eventName: eventName,
            params: params,
            timestamp: new Date().toISOString()
        };
        
        database.ref('analytics/events').push(eventData);
    }
}

// Identify weak areas based on quiz performance
function analyzeWeakAreas(userId) {
    return database.ref(`users/${userId}/quizResults`).once('value')
        .then(snapshot => {
            const results = [];
            snapshot.forEach(childSnapshot => {
                results.push(childSnapshot.val());
            });
            
            // Group by topics and calculate average scores
            const topicScores = {};
            
            results.forEach(result => {
                if (!result.topic || result.score === undefined) return;
                
                if (!topicScores[result.topic]) {
                    topicScores[result.topic] = {
                        totalScore: 0,
                        count: 0,
                        quizIds: []
                    };
                }
                
                topicScores[result.topic].totalScore += result.score;
                topicScores[result.topic].count++;
                topicScores[result.topic].quizIds.push(result.quizId);
            });
            
            // Find topics with scores below 70% (weak areas)
            const weakAreas = [];
            
            for (const topic in topicScores) {
                const average = topicScores[topic].totalScore / topicScores[topic].count;
                if (average < 70) {
                    weakAreas.push({
                        topic: topic,
                        averageScore: average,
                        quizCount: topicScores[topic].count,
                        quizIds: topicScores[topic].quizIds
                    });
                }
            }
            
            // Sort weak areas by average score (lowest first)
            weakAreas.sort((a, b) => a.averageScore - b.averageScore);
            
            // Store weak areas in user profile
            if (weakAreas.length > 0) {
                database.ref(`users/${userId}/weakAreas`).set(weakAreas);
                
                // Also save in Telegram Storage for offline access
                saveTelegramStorage('weakAreas', weakAreas);
            }
            
            return weakAreas;
        });
}

// Function to load the course content
function loadCourse(courseId) {
    // Implementation for loading course content
    // This would fetch the course details and navigate to the course view
    console.log(`Loading course with ID: ${courseId}`);
    
    // For now, we'll just show a message
    showToast(`Loading course: ${courseId}...`);
    
    // In a real implementation, we would navigate to the course page
    // and start loading the content from Firebase
}

// Helper function to show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
} 