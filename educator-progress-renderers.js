/**
 * Renders a comprehensive activity timeline for student progress
 * @param {Object} activityData - The student's activity data
 * @returns {string} HTML for the activity timeline
 */
function renderActivityTimeline(activityData) {
    // Handle empty data gracefully
    if (!activityData || Object.keys(activityData).length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <p>No activity has been recorded for this student.</p>
                <p class="empty-suggestion">They haven't interacted with any content yet.</p>
            </div>
        `;
    }
    
    // Convert to array and sort by timestamp
    const activities = [];
    Object.entries(activityData || {}).forEach(([id, activity]) => {
        if (activity && activity.timestamp) {
            activities.push({
                id: id,
                type: activity.type || 'unknown',
                timestamp: activity.timestamp,
                details: activity.details || {}
            });
        }
    });
    
    // Return early if no valid activities
    if (activities.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <p>No valid activity data found for this student.</p>
            </div>
        `;
    }
    
    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Group activities by date
    const groupedActivities = {};
    activities.forEach(activity => {
        const date = new Date(activity.timestamp);
        const dateString = date.toLocaleDateString();
        
        if (!groupedActivities[dateString]) {
            groupedActivities[dateString] = [];
        }
        
        groupedActivities[dateString].push(activity);
    });
    
    // Generate activity summary
    const activityCount = activities.length;
    const activityDates = Object.keys(groupedActivities).length;
    const latestActivity = new Date(activities[0].timestamp);
    const latestActivityFormatted = formatTimeAgo(latestActivity);
    
    // Render timeline with summary
    let html = `
        <div class="activity-summary">
            <div class="summary-item">
                <div class="summary-value">${activityCount}</div>
                <div class="summary-label">Total Activities</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${activityDates}</div>
                <div class="summary-label">Active Days</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${latestActivityFormatted}</div>
                <div class="summary-label">Last Activity</div>
            </div>
        </div>
    `;
    
    // Render timeline groups
    html += '<div class="timeline-container">';
    
    Object.entries(groupedActivities)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .forEach(([dateString, dateActivities]) => {
            html += `
                <div class="timeline-date-group">
                    <div class="timeline-date">${formatDateRelative(dateString)}</div>
                    <div class="timeline-items">
            `;
            
            dateActivities.forEach(activity => {
                const time = new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // Determine icon, color, and text based on activity type
                const activityDisplay = getActivityDisplay(activity);
                
                html += `
                    <div class="timeline-item ${activityDisplay.colorClass}">
                        <div class="timeline-icon" title="${activityDisplay.typeLabel}">${activityDisplay.icon}</div>
                        <div class="timeline-content">
                            <div class="timeline-time">${time}</div>
                            <div class="timeline-action">${activityDisplay.actionText}</div>
                            ${activityDisplay.detailsHtml}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
    
    html += '</div>';
    
    return html;
}

/**
 * Helper function to determine display properties for an activity
 * @param {Object} activity - The activity object
 * @returns {Object} Display properties for the activity
 */
function getActivityDisplay(activity) {
    let icon = '📝';
    let colorClass = 'activity-default';
    let typeLabel = 'Activity';
    let actionText = 'Unknown activity';
    let detailsHtml = '';
    
    switch (activity.type) {
        case 'login':
            icon = '🔐';
            colorClass = 'activity-login';
            typeLabel = 'Login';
            actionText = 'Logged into the app';
            break;
            
        case 'quiz_started':
            icon = '🔍';
            colorClass = 'activity-quiz';
            typeLabel = 'Quiz Started';
            const quizStartTitle = activity.details.quizTitle || 'a quiz';
            actionText = `Started ${quizStartTitle}`;
            
            if (activity.details.topicName) {
                detailsHtml = `<div class="activity-detail">Topic: ${activity.details.topicName}</div>`;
            }
            break;
            
        case 'quiz_completed':
            icon = '✅';
            colorClass = 'activity-quiz';
            typeLabel = 'Quiz Completed';
            const quizTitle = activity.details.quizTitle || 'a quiz';
            actionText = `Completed ${quizTitle}`;
            
            let scoreClass = '';
            if (activity.details.score !== undefined) {
                if (activity.details.score >= 80) scoreClass = 'high-score';
                else if (activity.details.score >= 60) scoreClass = 'medium-score';
                else scoreClass = 'low-score';
                
                detailsHtml = `
                    <div class="activity-detail score ${scoreClass}">
                        Score: ${activity.details.score}%
                    </div>
                `;
                
                if (activity.details.timeSpent) {
                    const timeFormatted = formatSeconds(activity.details.timeSpent);
                    detailsHtml += `<div class="activity-detail">Time: ${timeFormatted}</div>`;
                }
            }
            break;
            
        case 'lesson_started':
            icon = '📚';
            colorClass = 'activity-lesson';
            typeLabel = 'Lesson Started';
            actionText = `Started lesson: "${activity.details.lessonTitle || 'Unknown'}"`;
            
            if (activity.details.topicName) {
                detailsHtml = `<div class="activity-detail">Topic: ${activity.details.topicName}</div>`;
            }
            break;
            
        case 'lesson_completed':
            icon = '🎓';
            colorClass = 'activity-lesson';
            typeLabel = 'Lesson Completed';
            actionText = `Completed lesson: "${activity.details.lessonTitle || 'Unknown'}"`;
            
            if (activity.details.timeSpent) {
                const timeFormatted = formatSeconds(activity.details.timeSpent);
                detailsHtml = `<div class="activity-detail">Time spent: ${timeFormatted}</div>`;
            }
            break;
            
        case 'flashcards_studied':
            icon = '🔄';
            colorClass = 'activity-flashcard';
            typeLabel = 'Flashcards';
            actionText = `Studied flashcards: "${activity.details.setTitle || 'Unknown'}"`;
            
            let detailsArray = [];
            if (activity.details.cardsReviewed) {
                detailsArray.push(`${activity.details.cardsReviewed} cards reviewed`);
            }
            if (activity.details.timeSpent) {
                detailsArray.push(`${formatSeconds(activity.details.timeSpent)} study time`);
            }
            if (activity.details.cardsLearned) {
                detailsArray.push(`${activity.details.cardsLearned} new cards learned`);
            }
            
            if (detailsArray.length > 0) {
                detailsHtml = `<div class="activity-detail">${detailsArray.join(' • ')}</div>`;
            }
            break;
            
        case 'achievement_earned':
            icon = '🏆';
            colorClass = 'activity-achievement';
            typeLabel = 'Achievement';
            actionText = `Earned achievement: "${activity.details.achievementTitle || 'Unknown'}"`;
            
            if (activity.details.points) {
                detailsHtml = `<div class="activity-detail points">+${activity.details.points} points</div>`;
            }
            break;
            
        case 'class_joined':
            icon = '👥';
            colorClass = 'activity-class';
            typeLabel = 'Class Joined';
            actionText = `Joined class: "${activity.details.className || 'Unknown'}"`;
            
            if (activity.details.teacherName) {
                detailsHtml = `<div class="activity-detail">Teacher: ${activity.details.teacherName}</div>`;
            }
            break;
            
        case 'post_created':
            icon = '✏️';
            colorClass = 'activity-community';
            typeLabel = 'Post Created';
            actionText = 'Created a community post';
            
            if (activity.details.title) {
                detailsHtml = `<div class="activity-detail">"${truncateText(activity.details.title, 40)}"</div>`;
            }
            break;
            
        case 'comment_added':
            icon = '💬';
            colorClass = 'activity-community';
            typeLabel = 'Comment';
            actionText = 'Commented on a post';
            
            if (activity.details.text) {
                detailsHtml = `<div class="activity-detail">"${truncateText(activity.details.text, 40)}"</div>`;
            }
            break;
    }
    
    return {
        icon,
        colorClass,
        typeLabel,
        actionText,
        detailsHtml
    };
}

/**
 * Helper function to truncate text with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Format seconds into a readable time string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatSeconds(seconds) {
    if (!seconds) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}

/**
 * Renders a comprehensive list of quizzes with performance data
 * @param {Object} quizzesData - The student's quiz data
 * @returns {string} HTML for the quizzes list
 */
function renderQuizzesList(quizzesData) {
    // Handle empty data gracefully
    if (!quizzesData || Object.keys(quizzesData).length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>No quiz data available for this student.</p>
                <p class="empty-suggestion">They haven't attempted any quizzes yet.</p>
            </div>
        `;
    }
    
    // Convert to array and add additional properties
    const quizzes = [];
    Object.entries(quizzesData || {}).forEach(([quizId, quiz]) => {
        if (quiz) {
            quizzes.push({
                id: quizId,
                title: quiz.title || 'Untitled Quiz',
                score: quiz.score !== undefined ? quiz.score : null,
                completed: quiz.completed || false,
                completedAt: quiz.completedAt ? new Date(quiz.completedAt) : null,
                startedAt: quiz.startedAt ? new Date(quiz.startedAt) : null,
                totalQuestions: quiz.totalQuestions || 0,
                correctAnswers: quiz.correctAnswers || 0,
                timeSpent: quiz.timeSpent || 0,
                subject: quiz.subject || 'General',
                difficulty: quiz.difficulty || 'Medium',
                attempts: quiz.attempts || 1
            });
        }
    });
    
    // Return early if no valid quizzes
    if (quizzes.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>No valid quiz data found for this student.</p>
            </div>
        `;
    }
    
    // Calculate quiz metrics
    const completedQuizzes = quizzes.filter(q => q.completed);
    const inProgressQuizzes = quizzes.filter(q => !q.completed && q.startedAt);
    const notStartedQuizzes = quizzes.filter(q => !q.completed && !q.startedAt);
    
    const totalQuizzes = quizzes.length;
    const completionRate = totalQuizzes > 0 ? Math.round((completedQuizzes.length / totalQuizzes) * 100) : 0;
    
    // Calculate average score from completed quizzes
    let averageScore = 0;
    let highestScore = 0;
    let totalCorrectAnswers = 0;
    let totalTimeSpent = 0;
    
    if (completedQuizzes.length > 0) {
        const totalScore = completedQuizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
        averageScore = Math.round(totalScore / completedQuizzes.length);
        
        highestScore = Math.max(...completedQuizzes.map(quiz => quiz.score || 0));
        
        totalCorrectAnswers = completedQuizzes.reduce((sum, quiz) => sum + (quiz.correctAnswers || 0), 0);
        totalTimeSpent = completedQuizzes.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);
    }
    
    // Sort quizzes by status and completion date
    const sortedQuizzes = [
        ...inProgressQuizzes.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)),
        ...completedQuizzes.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
        ...notStartedQuizzes
    ];
    
    // Create score class
    let scoreClass = '';
    if (averageScore >= 80) scoreClass = 'high-score';
    else if (averageScore >= 60) scoreClass = 'medium-score';
    else scoreClass = 'low-score';
    
    // Render quizzes list with summary
    let html = `
        <div class="quiz-performance-summary">
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="card-value">${totalQuizzes}</div>
                    <div class="card-label">Total Quizzes</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${completedQuizzes.length}</div>
                    <div class="card-label">Completed</div>
                    <div class="card-subtitle">${completionRate}% completion rate</div>
                </div>
                <div class="summary-card">
                    <div class="card-value ${scoreClass}">${averageScore}%</div>
                    <div class="card-label">Average Score</div>
                    <div class="card-subtitle">Highest: ${highestScore}%</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${totalCorrectAnswers}</div>
                    <div class="card-label">Correct Answers</div>
                    <div class="card-subtitle">${formatSeconds(totalTimeSpent)} total time</div>
                </div>
            </div>
            
            <div class="quiz-status-breakdown">
                <div class="status-item">
                    <div class="status-bar completed" style="width: ${completedQuizzes.length/totalQuizzes*100}%"></div>
                    <div class="status-label">Completed (${completedQuizzes.length})</div>
                </div>
                <div class="status-item">
                    <div class="status-bar in-progress" style="width: ${inProgressQuizzes.length/totalQuizzes*100}%"></div>
                    <div class="status-label">In Progress (${inProgressQuizzes.length})</div>
                </div>
                <div class="status-item">
                    <div class="status-bar not-started" style="width: ${notStartedQuizzes.length/totalQuizzes*100}%"></div>
                    <div class="status-label">Not Started (${notStartedQuizzes.length})</div>
                </div>
            </div>
        </div>
        
        <div class="quiz-items-list">
    `;
    
    // Render each quiz item
    sortedQuizzes.forEach((quiz, index) => {
        const formattedDate = quiz.completed ? 
            (quiz.completedAt ? formatTimeAgo(quiz.completedAt) : 'Date unknown') : 
            (quiz.startedAt ? `Started ${formatTimeAgo(quiz.startedAt)}` : 'Not started');
        
        let statusClass = quiz.completed ? 'completed' : (quiz.startedAt ? 'in-progress' : 'not-started');
        let statusText = quiz.completed ? 'Completed' : (quiz.startedAt ? 'In Progress' : 'Not Started');
        
        let scoreDisplay = '';
        if (quiz.completed && quiz.score !== null) {
            let quizScoreClass = '';
            if (quiz.score >= 80) quizScoreClass = 'high-score';
            else if (quiz.score >= 60) quizScoreClass = 'medium-score';
            else quizScoreClass = 'low-score';
            
            scoreDisplay = `<div class="quiz-score ${quizScoreClass}">${quiz.score}%</div>`;
        } else if (quiz.startedAt) {
            scoreDisplay = `<div class="quiz-progress">In progress</div>`;
        }
        
        // Difficulty badge
        let difficultyClass = '';
        switch(quiz.difficulty.toLowerCase()) {
            case 'easy': difficultyClass = 'easy'; break;
            case 'medium': difficultyClass = 'medium'; break;
            case 'hard': difficultyClass = 'hard'; break;
            default: difficultyClass = 'medium';
        }
        
        html += `
            <div class="quiz-item ${statusClass}">
                <div class="quiz-status-icon">
                    ${quiz.completed ? '✅' : (quiz.startedAt ? '⏳' : '📝')}
                </div>
                <div class="quiz-info">
                    <div class="quiz-header">
                        <div class="quiz-title">${quiz.title}</div>
                        ${scoreDisplay}
                    </div>
                    <div class="quiz-meta">
                        <span class="quiz-subject">${quiz.subject}</span>
                        <span class="quiz-difficulty ${difficultyClass}">${quiz.difficulty}</span>
                        <span class="quiz-date">${formattedDate}</span>
                        ${quiz.attempts > 1 ? `<span class="quiz-attempts">Attempts: ${quiz.attempts}</span>` : ''}
                    </div>
                    ${quiz.completed ? `
                    <div class="quiz-details">
                        <div class="detail-item">
                            <span class="detail-icon">❓</span>
                            <span class="detail-value">${quiz.totalQuestions} questions</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">✓</span>
                            <span class="detail-value">${quiz.correctAnswers}/${quiz.totalQuestions} correct</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">⏱️</span>
                            <span class="detail-value">${formatSeconds(quiz.timeSpent)}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="quiz-expand-toggle" data-quiz-id="${quiz.id}">
                    <span class="toggle-icon">▼</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add event listener initialization function
    html += `
        <script>
            // Add after the content is inserted into DOM
            document.querySelectorAll('.quiz-expand-toggle').forEach(toggle => {
                toggle.addEventListener('click', function() {
                    const quizItem = this.closest('.quiz-item');
                    quizItem.classList.toggle('expanded');
                    this.querySelector('.toggle-icon').textContent = 
                        quizItem.classList.contains('expanded') ? '▲' : '▼';
                });
            });
        </script>
    `;
    
    return html;
}

/**
 * Renders a comprehensive list of lessons with completion data
 * @param {Object} lessonsData - The student's lesson data
 * @returns {string} HTML for the lessons list
 */
function renderLessonsList(lessonsData) {
    // Handle empty data gracefully
    if (!lessonsData || Object.keys(lessonsData).length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <p>No lesson data available for this student.</p>
                <p class="empty-suggestion">They haven't accessed any lessons yet.</p>
            </div>
        `;
    }
    
    // Convert to array and add additional properties
    const lessons = [];
    Object.entries(lessonsData || {}).forEach(([lessonId, lesson]) => {
        if (lesson) {
            lessons.push({
                id: lessonId,
                title: lesson.title || 'Untitled Lesson',
                completed: lesson.completed || false,
                completedAt: lesson.completedAt ? new Date(lesson.completedAt) : null,
                startedAt: lesson.startedAt ? new Date(lesson.startedAt) : null,
                progress: lesson.progress || 0,
                lastAccessed: lesson.lastAccessed ? new Date(lesson.lastAccessed) : null,
                timeSpent: lesson.timeSpent || 0,
                subject: lesson.subject || 'General',
                category: lesson.category || 'Other',
                difficulty: lesson.difficulty || 'Medium',
                moduleOrder: lesson.moduleOrder || 0
            });
        }
    });
    
    // Return early if no valid lessons
    if (lessons.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <p>No valid lesson data found for this student.</p>
            </div>
        `;
    }
    
    // Calculate lesson metrics
    const completedLessons = lessons.filter(l => l.completed);
    const inProgressLessons = lessons.filter(l => !l.completed && l.progress > 0);
    const notStartedLessons = lessons.filter(l => !l.completed && l.progress === 0);
    
    const totalLessons = lessons.length;
    const completionRate = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
    
    // Calculate average progress and time metrics
    let averageProgress = 0;
    let totalTimeSpent = 0;
    
    if (lessons.length > 0) {
        const totalProgress = lessons.reduce((sum, lesson) => sum + lesson.progress, 0);
        averageProgress = Math.round(totalProgress / lessons.length);
        
        totalTimeSpent = lessons.reduce((sum, lesson) => sum + (lesson.timeSpent || 0), 0);
    }
    
    // Sort lessons by module order and last accessed time
    lessons.sort((a, b) => {
        // First by module order
        if (a.moduleOrder !== b.moduleOrder) {
            return a.moduleOrder - b.moduleOrder;
        }
        
        // Then by completion status
        if (a.completed !== b.completed) {
            return a.completed ? -1 : 1;
        }
        
        // Then by progress for incomplete ones
        if (!a.completed && !b.completed && a.progress !== b.progress) {
            return b.progress - a.progress;
        }
        
        // Finally by last accessed time
        const timeA = a.lastAccessed || a.startedAt || new Date(0);
        const timeB = b.lastAccessed || b.startedAt || new Date(0);
        return timeB - timeA;
    });
    
    // Group lessons by category
    const categories = {};
    lessons.forEach(lesson => {
        if (!categories[lesson.category]) {
            categories[lesson.category] = [];
        }
        categories[lesson.category].push(lesson);
    });
    
    // Render lessons with summary and categories
    let html = `
        <div class="lesson-progress-summary">
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="card-value">${totalLessons}</div>
                    <div class="card-label">Total Lessons</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${completedLessons.length}</div>
                    <div class="card-label">Completed</div>
                    <div class="card-subtitle">${completionRate}% completion rate</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${inProgressLessons.length}</div>
                    <div class="card-label">In Progress</div>
                    <div class="card-subtitle">${averageProgress}% avg progress</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${formatTimeHours(totalTimeSpent)}</div>
                    <div class="card-label">Total Time</div>
                    <div class="card-subtitle">Across all lessons</div>
                </div>
            </div>
            
            <div class="lesson-status-breakdown">
                <div class="status-item">
                    <div class="status-bar completed" style="width: ${completedLessons.length/totalLessons*100}%"></div>
                    <div class="status-label">Completed (${completedLessons.length})</div>
                </div>
                <div class="status-item">
                    <div class="status-bar in-progress" style="width: ${inProgressLessons.length/totalLessons*100}%"></div>
                    <div class="status-label">In Progress (${inProgressLessons.length})</div>
                </div>
                <div class="status-item">
                    <div class="status-bar not-started" style="width: ${notStartedLessons.length/totalLessons*100}%"></div>
                    <div class="status-label">Not Started (${notStartedLessons.length})</div>
                </div>
            </div>
        </div>
    `;
    
    // Render lessons by category
    Object.entries(categories).sort().forEach(([category, categoryLessons]) => {
        html += `
            <div class="lesson-category">
                <h5 class="category-title">
                    <span class="category-name">${category}</span>
                    <span class="category-count">${categoryLessons.length} lessons</span>
                </h5>
                <div class="lesson-items">
        `;
        
        categoryLessons.forEach(lesson => {
            const statusClass = lesson.completed ? 'completed' : 
                (lesson.progress > 0 ? 'in-progress' : 'not-started');
                
            const statusIcon = lesson.completed ? '✅' : 
                (lesson.progress > 0 ? '⏳' : '📚');
                
            const statusText = lesson.completed ? 'Completed' : 
                (lesson.progress > 0 ? `${lesson.progress}% complete` : 'Not started');
            
            const dateText = lesson.completed ? 
                `Completed ${formatTimeAgo(lesson.completedAt)}` : 
                (lesson.lastAccessed ? `Last accessed ${formatTimeAgo(lesson.lastAccessed)}` : 
                (lesson.startedAt ? `Started ${formatTimeAgo(lesson.startedAt)}` : 'Never accessed'));
            
            html += `
                <div class="lesson-item ${statusClass}">
                    <div class="lesson-status-icon">${statusIcon}</div>
                    <div class="lesson-info">
                        <div class="lesson-header">
                            <div class="lesson-title">${lesson.title}</div>
                            <div class="lesson-module-order">Module ${lesson.moduleOrder || '?'}</div>
                        </div>
                        <div class="lesson-meta">
                            <span class="lesson-subject">${lesson.subject}</span>
                            <span class="lesson-date">${dateText}</span>
                            ${lesson.timeSpent ? `<span class="lesson-time">Time spent: ${formatSeconds(lesson.timeSpent)}</span>` : ''}
                        </div>
                        <div class="lesson-progress">
                            <div class="progress-bar-container">
                                <div class="progress-bar ${statusClass}" style="width: ${lesson.progress}%"></div>
                            </div>
                            <div class="progress-text">${statusText}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    return html;
}

/**
 * Format seconds into a readable time string, optimized for hours
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string in hours and minutes
 */
function formatTimeHours(seconds) {
    if (!seconds) return '0h';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Renders a comprehensive list of flashcard sets with study data
 * @param {Object} flashcardsData - The student's flashcard data
 * @returns {string} HTML for the flashcards list
 */
function renderFlashcardsList(flashcardsData) {
    // Handle empty data gracefully
    if (!flashcardsData || Object.keys(flashcardsData).length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔄</div>
                <p>No flashcard data available for this student.</p>
                <p class="empty-suggestion">They haven't studied any flashcard sets yet.</p>
            </div>
        `;
    }
    
    // Convert to array and add additional properties
    const flashcardSets = [];
    Object.entries(flashcardsData || {}).forEach(([setId, set]) => {
        if (set) {
            flashcardSets.push({
                id: setId,
                title: set.title || 'Untitled Set',
                cardsCount: set.cardsCount || 0,
                masteredCount: set.masteredCount || 0,
                learningCount: set.learningCount || 0,
                newCount: set.cardsCount - (set.masteredCount + set.learningCount),
                mastered: set.mastered || false,
                lastStudied: set.lastStudied ? new Date(set.lastStudied) : null,
                studySessions: set.studySessions || 0,
                totalTimeSpent: set.totalTimeSpent || 0,
                averageTimePerCard: set.averageTimePerCard || 0,
                subject: set.subject || 'General',
                creator: set.creator || 'System',
                creatorType: set.creatorType || 'system'
            });
        }
    });
    
    // Return early if no valid flashcard sets
    if (flashcardSets.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔄</div>
                <p>No valid flashcard data found for this student.</p>
            </div>
        `;
    }
    
    // Calculate flashcard metrics
    const totalSets = flashcardSets.length;
    const masteredSets = flashcardSets.filter(set => set.mastered).length;
    const inProgressSets = flashcardSets.filter(set => !set.mastered && set.lastStudied).length;
    const notStartedSets = flashcardSets.filter(set => !set.lastStudied).length;
    
    const totalMasteryRate = totalSets > 0 ? Math.round((masteredSets / totalSets) * 100) : 0;
    
    // Calculate total cards and mastery metrics
    const totalCards = flashcardSets.reduce((sum, set) => sum + set.cardsCount, 0);
    const totalMasteredCards = flashcardSets.reduce((sum, set) => sum + set.masteredCount, 0);
    const totalLearningCards = flashcardSets.reduce((sum, set) => sum + set.learningCount, 0);
    const totalNewCards = totalCards - totalMasteredCards - totalLearningCards;
    
    const overallMasteryRate = totalCards > 0 ? Math.round((totalMasteredCards / totalCards) * 100) : 0;
    
    // Calculate total study time and sessions
    const totalStudySessions = flashcardSets.reduce((sum, set) => sum + set.studySessions, 0);
    const totalStudyTime = flashcardSets.reduce((sum, set) => sum + (set.totalTimeSpent || 0), 0);
    
    // Sort flashcard sets by last studied date and mastery status
    flashcardSets.sort((a, b) => {
        // First by mastery status
        if (a.mastered !== b.mastered) {
            return a.mastered ? -1 : 1;
        }
        
        // Then by last studied date (most recent first)
        if (a.lastStudied && b.lastStudied) {
            return b.lastStudied - a.lastStudied;
        } else if (a.lastStudied) {
            return -1;
        } else if (b.lastStudied) {
            return 1;
        }
        
        // Finally alphabetically by title
        return a.title.localeCompare(b.title);
    });
    
    // Group by subject
    const subjects = {};
    flashcardSets.forEach(set => {
        if (!subjects[set.subject]) {
            subjects[set.subject] = [];
        }
        subjects[set.subject].push(set);
    });
    
    // Render flashcards list with summary
    let html = `
        <div class="flashcard-progress-summary">
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="card-value">${totalSets}</div>
                    <div class="card-label">Total Sets</div>
                    <div class="card-subtitle">${totalCards} cards total</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${masteredSets}</div>
                    <div class="card-label">Mastered Sets</div>
                    <div class="card-subtitle">${totalMasteryRate}% of sets mastered</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${totalMasteredCards}</div>
                    <div class="card-label">Mastered Cards</div>
                    <div class="card-subtitle">${overallMasteryRate}% mastery rate</div>
                </div>
                <div class="summary-card">
                    <div class="card-value">${formatTimeHours(totalStudyTime)}</div>
                    <div class="card-label">Study Time</div>
                    <div class="card-subtitle">${totalStudySessions} study sessions</div>
                </div>
            </div>
            
            <div class="card-status-breakdown">
                <div class="breakdown-title">Card Status Distribution</div>
                <div class="breakdown-chart">
                    <div class="chart-segment mastered" style="width: ${(totalMasteredCards/totalCards*100)}%" title="Mastered: ${totalMasteredCards} cards"></div>
                    <div class="chart-segment learning" style="width: ${(totalLearningCards/totalCards*100)}%" title="Learning: ${totalLearningCards} cards"></div>
                    <div class="chart-segment new" style="width: ${(totalNewCards/totalCards*100)}%" title="New: ${totalNewCards} cards"></div>
                </div>
                <div class="breakdown-legend">
                    <div class="legend-item">
                        <span class="legend-color mastered"></span>
                        <span class="legend-label">Mastered (${totalMasteredCards})</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color learning"></span>
                        <span class="legend-label">Learning (${totalLearningCards})</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color new"></span>
                        <span class="legend-label">New (${totalNewCards})</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Render flashcards by subject
    if (Object.keys(subjects).length > 1) {
        // If multiple subjects exist, show tabs
        html += '<div class="subject-tabs">';
        Object.keys(subjects).sort().forEach((subject, index) => {
            html += `
                <button class="subject-tab ${index === 0 ? 'active' : ''}" data-subject="${subject}">
                    ${subject} (${subjects[subject].length})
                </button>
            `;
        });
        html += '</div>';
        
        // Render each subject's content
        html += '<div class="subject-content">';
        Object.entries(subjects).sort().forEach(([subject, sets], index) => {
            html += `
                <div class="subject-sets ${index === 0 ? 'active' : ''}" data-subject="${subject}">
                    ${renderFlashcardSetsBySubject(sets)}
                </div>
            `;
        });
        html += '</div>';
        
        // Add tab switching script
        html += `
            <script>
                // Add after the content is inserted into DOM
                document.querySelectorAll('.subject-tab').forEach(tab => {
                    tab.addEventListener('click', function() {
                        const subject = this.dataset.subject;
                        
                        // Update active tab
                        document.querySelectorAll('.subject-tab').forEach(t => {
                            t.classList.remove('active');
                        });
                        this.classList.add('active');
                        
                        // Show corresponding content
                        document.querySelectorAll('.subject-sets').forEach(content => {
                            content.classList.remove('active');
                        });
                        document.querySelector(`.subject-sets[data-subject="${subject}"]`).classList.add('active');
                    });
                });
            </script>
        `;
    } else {
        // If only one subject, render directly
        const subject = Object.keys(subjects)[0];
        html += renderFlashcardSetsBySubject(subjects[subject]);
    }
    
    return html;
}

/**
 * Renders flashcard sets for a specific subject
 * @param {Array} sets - Array of flashcard sets for this subject
 * @returns {string} HTML for the flashcard sets
 */
function renderFlashcardSetsBySubject(sets) {
    let html = '<div class="flashcard-items">';
    
    sets.forEach(set => {
        const lastStudiedText = set.lastStudied ? 
            `Last studied ${formatTimeAgo(set.lastStudied)}` : 'Never studied';
        
        const masteryRate = set.cardsCount > 0 ? 
            Math.round((set.masteredCount / set.cardsCount) * 100) : 0;
        
        let statusClass = '';
        let statusIcon = '';
        
        if (set.mastered) {
            statusClass = 'mastered';
            statusIcon = '✅';
        } else if (masteryRate >= 50) {
            statusClass = 'learning';
            statusIcon = '⏳';
        } else if (set.lastStudied) {
            statusClass = 'started';
            statusIcon = '📝';
        } else {
            statusClass = 'not-started';
            statusIcon = '🆕';
        }
        
        // Calculate card distribution for this set
        const newCards = set.cardsCount - (set.masteredCount + set.learningCount);
        
        html += `
            <div class="flashcard-item ${statusClass}">
                <div class="flashcard-status-icon">${statusIcon}</div>
                <div class="flashcard-info">
                    <div class="flashcard-header">
                        <div class="flashcard-title">${set.title}</div>
                        <div class="flashcard-mastery-badge ${statusClass}">${masteryRate}%</div>
                    </div>
                    <div class="flashcard-meta">
                        <span class="flashcard-count">${set.cardsCount} cards</span>
                        <span class="flashcard-date">${lastStudiedText}</span>
                        ${set.studySessions > 0 ? `<span class="study-sessions">${set.studySessions} study sessions</span>` : ''}
                    </div>
                    
                    <div class="cards-distribution">
                        <div class="distribution-segment">
                            <div class="segment-count mastered">${set.masteredCount}</div>
                            <div class="segment-label">Mastered</div>
                        </div>
                        <div class="distribution-segment">
                            <div class="segment-count learning">${set.learningCount}</div>
                            <div class="segment-label">Learning</div>
                        </div>
                        <div class="distribution-segment">
                            <div class="segment-count new">${newCards}</div>
                            <div class="segment-label">New</div>
                        </div>
                    </div>
                    
                    <div class="flashcard-mastery">
                        <div class="mastery-progress">
                            <div class="progress-bar-complex">
                                <div class="progress-segment mastered" style="width: ${(set.masteredCount/set.cardsCount*100)}%"></div>
                                <div class="progress-segment learning" style="width: ${(set.learningCount/set.cardsCount*100)}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    ${set.totalTimeSpent > 0 ? `
                    <div class="study-time-info">
                        <span class="time-icon">⏱️</span>
                        <span class="time-value">Total study time: ${formatSeconds(set.totalTimeSpent)}</span>
                        ${set.averageTimePerCard > 0 ? `<span class="time-avg">(avg ${formatSeconds(set.averageTimePerCard)} per card)</span>` : ''}
                    </div>
                    ` : ''}
                </div>
                <div class="flashcard-expand-toggle" data-set-id="${set.id}">
                    <span class="toggle-icon">▼</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add event listener initialization
    html += `
        <script>
            // Add after the content is inserted into DOM
            document.querySelectorAll('.flashcard-expand-toggle').forEach(toggle => {
                toggle.addEventListener('click', function() {
                    const flashcardItem = this.closest('.flashcard-item');
                    flashcardItem.classList.toggle('expanded');
                    this.querySelector('.toggle-icon').textContent = 
                        flashcardItem.classList.contains('expanded') ? '▲' : '▼';
                });
            });
        </script>
    `;
    
    return html;
} 