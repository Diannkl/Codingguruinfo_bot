/**
 * View detailed information for a student
 * @param {string} studentId - Student ID
 */
function viewStudentDetails(studentId) {
    // Create modal for student details
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content student-details-modal">
            <div class="modal-header">
                <h3>Student Details</h3>
                <button class="close-modal-btn">×</button>
            </div>
            <div class="modal-body">
                <div class="loading-indicator">Loading student details...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set up close button
    modal.querySelector('.close-modal-btn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Load student data
    loadStudentDetails(modal.querySelector('.modal-body'), studentId);
}

/**
 * Load student details into the modal
 * @param {HTMLElement} container - Container element
 * @param {string} studentId - Student ID
 */
function loadStudentDetails(container, studentId) {
    // Fetch student data
    database.ref(`users/${studentId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Student not found');
            }
            
            const student = snapshot.val();
            student.id = snapshot.key;
            
            // Fetch enrollments
            return database.ref('class_enrollments')
                .orderByChild('studentId')
                .equalTo(studentId)
                .once('value')
                .then(enrollmentsSnapshot => {
                    const enrollments = [];
                    
                    enrollmentsSnapshot.forEach(childSnapshot => {
                        const enrollment = childSnapshot.val();
                        enrollment.id = childSnapshot.key;
                        enrollments.push(enrollment);
                    });
                    
                    // Get class data for each enrollment
                    return Promise.all(enrollments.map(enrollment => {
                        return database.ref(`classes/${enrollment.classId}`).once('value')
                            .then(classSnapshot => {
                                enrollment.classData = classSnapshot.val() || { name: 'Unknown Class' };
                                return enrollment;
                            });
                    })).then(enrollmentsWithClassData => {
                        return {
                            student,
                            enrollments: enrollmentsWithClassData
                        };
                    });
                });
        })
        .then(data => {
            // Fetch activity data
            return Promise.all([
                // Quiz results
                database.ref('quiz_results')
                    .orderByChild('studentId')
                    .equalTo(studentId)
                    .limitToLast(10)
                    .once('value'),
                    
                // Flashcard progress
                database.ref('flashcard_progress')
                    .orderByChild('studentId')
                    .equalTo(studentId)
                    .limitToLast(10)
                    .once('value'),
                    
                // General activity
                database.ref('activity_logs')
                    .orderByChild('studentId')
                    .equalTo(studentId)
                    .limitToLast(20)
                    .once('value')
            ]).then(([quizResults, flashcardProgress, activityLogs]) => {
                const quizData = [];
                quizResults.forEach(childSnapshot => {
                    const result = childSnapshot.val();
                    result.id = childSnapshot.key;
                    quizData.push(result);
                });
                
                const flashcardData = [];
                flashcardProgress.forEach(childSnapshot => {
                    const progress = childSnapshot.val();
                    progress.id = childSnapshot.key;
                    flashcardData.push(progress);
                });
                
                const activities = [];
                activityLogs.forEach(childSnapshot => {
                    const activity = childSnapshot.val();
                    activity.id = childSnapshot.key;
                    activities.push(activity);
                });
                
                return {
                    ...data,
                    quizData,
                    flashcardData,
                    activities
                };
            });
        })
        .then(data => {
            // Render student details
            container.innerHTML = `
                <div class="student-profile">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            ${data.student.firstName.charAt(0)}${data.student.lastName.charAt(0)}
                        </div>
                        <div class="profile-info">
                            <h4>${data.student.firstName} ${data.student.lastName}</h4>
                            <div class="profile-meta">
                                ${data.student.username ? `<span class="username">@${data.student.username}</span>` : ''}
                                <span class="join-date">Joined: ${formatDate(new Date(data.student.createdAt || Date.now()))}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-body">
                        <div class="detail-tabs">
                            <button class="detail-tab active" data-tab="overview">Overview</button>
                            <button class="detail-tab" data-tab="activity">Activity</button>
                            <button class="detail-tab" data-tab="quizzes">Quizzes</button>
                            <button class="detail-tab" data-tab="flashcards">Flashcards</button>
                        </div>
                        
                        <div class="detail-panels">
                            <div id="overview-panel" class="detail-panel active">
                                ${renderStudentOverview(data)}
                            </div>
                            
                            <div id="activity-panel" class="detail-panel">
                                ${renderStudentActivity(data.activities)}
                            </div>
                            
                            <div id="quizzes-panel" class="detail-panel">
                                ${renderStudentQuizzes(data.quizData)}
                            </div>
                            
                            <div id="flashcards-panel" class="detail-panel">
                                ${renderStudentFlashcards(data.flashcardData)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Set up tab navigation
            setupStudentDetailTabs(container);
        })
        .catch(error => {
            console.error('Error loading student details:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Error loading student details. Please try again.</p>
                    <button class="primary-btn" onclick="loadStudentDetails(this.parentNode.parentNode, '${studentId}')">Retry</button>
                </div>
            `;
        });
}

/**
 * Set up student detail tabs
 * @param {HTMLElement} container - Container element
 */
function setupStudentDetailTabs(container) {
    const tabs = container.querySelectorAll('.detail-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show selected panel
            const tabName = this.dataset.tab;
            const panels = container.querySelectorAll('.detail-panel');
            panels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            container.querySelector(`#${tabName}-panel`).classList.add('active');
        });
    });
}

/**
 * Render student overview panel
 * @param {Object} data - Student data
 * @returns {string} HTML for the overview panel
 */
function renderStudentOverview(data) {
    const enrollmentsHtml = data.enrollments.length > 0 
        ? data.enrollments.map(enrollment => `
            <div class="enrollment-item">
                <div class="enrollment-class">${enrollment.classData.name}</div>
                <div class="enrollment-date">Since ${formatDate(new Date(enrollment.enrolledAt || Date.now()))}</div>
            </div>
        `).join('')
        : '<div class="empty-state">Not enrolled in any classes</div>';
    
    // Calculate stats
    let quizCount = data.quizData.length;
    let totalScore = 0;
    let avgScore = 0;
    
    if (quizCount > 0) {
        data.quizData.forEach(quiz => {
            totalScore += quiz.score;
        });
        avgScore = Math.round(totalScore / quizCount);
    }
    
    let flashcardSetsCount = data.flashcardData.length;
    let totalCards = 0;
    let masteredCards = 0;
    let masteryRate = 0;
    
    data.flashcardData.forEach(set => {
        if (set.cards) {
            const cards = Object.values(set.cards);
            totalCards += cards.length;
            
            cards.forEach(card => {
                if (card.status === 'mastered') {
                    masteredCards++;
                }
            });
        }
    });
    
    if (totalCards > 0) {
        masteryRate = Math.round((masteredCards / totalCards) * 100);
    }
    
    // Count activities by type
    const activityCounts = {
        total: data.activities.length,
        quiz: 0,
        flashcard: 0,
        login: 0,
        other: 0
    };
    
    data.activities.forEach(activity => {
        if (activity.type.includes('quiz')) {
            activityCounts.quiz++;
        } else if (activity.type.includes('flashcard')) {
            activityCounts.flashcard++;
        } else if (activity.type.includes('login')) {
            activityCounts.login++;
        } else {
            activityCounts.other++;
        }
    });
    
    return `
        <div class="overview-grid">
            <div class="overview-section">
                <h5>Class Enrollments</h5>
                <div class="enrollments-list">
                    ${enrollmentsHtml}
                </div>
            </div>
            
            <div class="overview-section">
                <h5>Learning Stats</h5>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value">${quizCount}</div>
                        <div class="stat-label">Quizzes Taken</div>
                    </div>
                    
                    <div class="stat-box">
                        <div class="stat-value">${avgScore}%</div>
                        <div class="stat-label">Avg. Quiz Score</div>
                    </div>
                    
                    <div class="stat-box">
                        <div class="stat-value">${flashcardSetsCount}</div>
                        <div class="stat-label">Flashcard Sets</div>
                    </div>
                    
                    <div class="stat-box">
                        <div class="stat-value">${masteryRate}%</div>
                        <div class="stat-label">Flashcard Mastery</div>
                    </div>
                </div>
            </div>
            
            <div class="overview-section">
                <h5>Recent Activity</h5>
                <div class="activity-summary">
                    <div class="activity-counts">
                        <div class="count-item">
                            <span class="count-value">${activityCounts.total}</span>
                            <span class="count-label">Total Activities</span>
                        </div>
                        <div class="count-item">
                            <span class="count-value">${activityCounts.quiz}</span>
                            <span class="count-label">Quiz Activities</span>
                        </div>
                        <div class="count-item">
                            <span class="count-value">${activityCounts.flashcard}</span>
                            <span class="count-label">Flashcard Activities</span>
                        </div>
                        <div class="count-item">
                            <span class="count-value">${activityCounts.login}</span>
                            <span class="count-label">Logins</span>
                        </div>
                    </div>
                    
                    <div class="last-activity">
                        Last active: ${data.student.lastLogin ? formatTimeAgo(new Date(data.student.lastLogin)) : 'Never'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render student activity panel
 * @param {Array} activities - Student activities
 * @returns {string} HTML for the activity panel
 */
function renderStudentActivity(activities) {
    if (!activities || activities.length === 0) {
        return `
            <div class="empty-state">
                <p>No activity recorded for this student yet.</p>
            </div>
        `;
    }
    
    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    return `
        <div class="activity-timeline">
            ${activities.map(activity => `
                <div class="timeline-item">
                    <div class="timeline-icon">${getActivityIcon(activity.type)}</div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-title">${activity.message || 'Activity'}</span>
                            <span class="timeline-time">${formatTimeAgo(new Date(activity.timestamp || 0))}</span>
                        </div>
                        ${activity.details ? `<div class="timeline-details">${activity.details}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render student quizzes panel
 * @param {Array} quizzes - Student quiz results
 * @returns {string} HTML for the quizzes panel
 */
function renderStudentQuizzes(quizzes) {
    if (!quizzes || quizzes.length === 0) {
        return `
            <div class="empty-state">
                <p>This student hasn't taken any quizzes yet.</p>
            </div>
        `;
    }
    
    // Sort quizzes by timestamp (newest first)
    quizzes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Fetch quiz titles if needed
    return `
        <div class="quiz-results-list">
            ${quizzes.map(quiz => `
                <div class="quiz-result-item">
                    <div class="quiz-result-header">
                        <div class="quiz-result-title">${quiz.quizTitle || 'Quiz'}</div>
                        <div class="quiz-result-date">${formatDate(new Date(quiz.timestamp || 0))}</div>
                    </div>
                    
                    <div class="quiz-result-body">
                        <div class="result-stats">
                            <div class="result-stat">
                                <div class="stat-label">Score</div>
                                <div class="stat-value ${getScoreClass(quiz.score)}">${quiz.score}%</div>
                            </div>
                            
                            <div class="result-stat">
                                <div class="stat-label">Time Spent</div>
                                <div class="stat-value">${formatDuration(quiz.timeSpent || 0)}</div>
                            </div>
                            
                            <div class="result-stat">
                                <div class="stat-label">Correct</div>
                                <div class="stat-value">${quiz.correctCount || 0}/${quiz.totalQuestions || 0}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render student flashcards panel
 * @param {Array} flashcards - Student flashcard progress
 * @returns {string} HTML for the flashcards panel
 */
function renderStudentFlashcards(flashcards) {
    if (!flashcards || flashcards.length === 0) {
        return `
            <div class="empty-state">
                <p>This student hasn't studied any flashcards yet.</p>
            </div>
        `;
    }
    
    // Sort flashcards by last studied date (newest first)
    flashcards.sort((a, b) => (b.lastStudied || 0) - (a.lastStudied || 0));
    
    return `
        <div class="flashcards-progress-list">
            ${flashcards.map(set => {
                // Calculate mastery stats
                let totalCards = 0;
                let masteredCards = 0;
                let learningCards = 0;
                
                if (set.cards) {
                    const cards = Object.values(set.cards);
                    totalCards = cards.length;
                    
                    cards.forEach(card => {
                        if (card.status === 'mastered') {
                            masteredCards++;
                        } else if (card.status === 'learning') {
                            learningCards++;
                        }
                    });
                }
                
                const notStartedCards = totalCards - masteredCards - learningCards;
                const masteryRate = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
                
                return `
                    <div class="flashcard-progress-item">
                        <div class="progress-header">
                            <div class="set-title">${set.setTitle || 'Flashcard Set'}</div>
                            <div class="last-studied">Last studied: ${formatTimeAgo(new Date(set.lastStudied || 0))}</div>
                        </div>
                        
                        <div class="progress-body">
                            <div class="mastery-progress">
                                <div class="progress-bar-container">
                                    <div class="progress-bar mastery-bar" style="width: ${masteryRate}%"></div>
                                </div>
                                <div class="mastery-rate">${masteryRate}% Mastered</div>
                            </div>
                            
                            <div class="card-stats">
                                <div class="card-stat mastered">
                                    <div class="stat-value">${masteredCards}</div>
                                    <div class="stat-label">Mastered</div>
                                </div>
                                
                                <div class="card-stat learning">
                                    <div class="stat-value">${learningCards}</div>
                                    <div class="stat-label">Learning</div>
                                </div>
                                
                                <div class="card-stat not-started">
                                    <div class="stat-value">${notStartedCards}</div>
                                    <div class="stat-label">Not Started</div>
                                </div>
                            </div>
                            
                            <div class="study-stats">
                                <div class="stat-item">
                                    <div class="stat-label">Study Sessions</div>
                                    <div class="stat-value">${set.sessionCount || 1}</div>
                                </div>
                                
                                <div class="stat-item">
                                    <div class="stat-label">Total Time</div>
                                    <div class="stat-value">${formatDuration(set.totalTime || 0)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Get class for score coloring
 * @param {number} score - Quiz score
 * @returns {string} CSS class for the score
 */
function getScoreClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    return 'needs-improvement';
}

/**
 * Format duration in minutes to a readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
function formatDuration(minutes) {
    if (minutes < 1) {
        return 'Less than 1 min';
    }
    
    if (minutes < 60) {
        return `${Math.round(minutes)} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (remainingMinutes === 0) {
        return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Format date to a readable string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
} 