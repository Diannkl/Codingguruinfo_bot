/**
 * Renders the activity timeline for a student
 * @param {Object} activityData - The student's activity data
 * @returns {string} HTML for the activity timeline
 */
function renderActivityTimeline(activityData) {
    if (!activityData || Object.keys(activityData).length === 0) {
        return '<div class="empty-state">No recent activity found.</div>';
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
        return '<div class="empty-state">No recent activity found.</div>';
    }
    
    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Limit to most recent 20 activities
    const recentActivities = activities.slice(0, 20);
    
    // Group activities by date
    const groupedActivities = {};
    recentActivities.forEach(activity => {
        const date = new Date(activity.timestamp);
        const dateString = date.toLocaleDateString();
        
        if (!groupedActivities[dateString]) {
            groupedActivities[dateString] = [];
        }
        
        groupedActivities[dateString].push(activity);
    });
    
    // Render timeline
    let html = '';
    
    Object.entries(groupedActivities).forEach(([dateString, dateActivities]) => {
        html += `
            <div class="timeline-date-group">
                <div class="timeline-date">${formatDateRelative(dateString)}</div>
                <div class="timeline-items">
        `;
        
        dateActivities.forEach(activity => {
            const time = new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Determine icon and text based on activity type
            let icon = '📝';
            let actionText = 'Unknown activity';
            let detailsHtml = '';
            
            switch (activity.type) {
                case 'login':
                    icon = '🔐';
                    actionText = 'Logged in';
                    break;
                case 'quiz_started':
                    icon = '🔍';
                    actionText = `Started quiz: "${activity.details.quizTitle || 'Unknown'}"`;
                    break;
                case 'quiz_completed':
                    icon = '✅';
                    actionText = `Completed quiz: "${activity.details.quizTitle || 'Unknown'}"`;
                    if (activity.details.score !== undefined) {
                        detailsHtml = `<div class="activity-detail">Score: ${activity.details.score}%</div>`;
                    }
                    break;
                case 'lesson_started':
                    icon = '📚';
                    actionText = `Started lesson: "${activity.details.lessonTitle || 'Unknown'}"`;
                    break;
                case 'lesson_completed':
                    icon = '🎓';
                    actionText = `Completed lesson: "${activity.details.lessonTitle || 'Unknown'}"`;
                    break;
                case 'flashcards_studied':
                    icon = '🔄';
                    actionText = `Studied flashcards: "${activity.details.setTitle || 'Unknown'}"`;
                    if (activity.details.cardsReviewed) {
                        detailsHtml = `<div class="activity-detail">Cards reviewed: ${activity.details.cardsReviewed}</div>`;
                    }
                    break;
                case 'achievement_earned':
                    icon = '🏆';
                    actionText = `Earned achievement: "${activity.details.achievementTitle || 'Unknown'}"`;
                    if (activity.details.points) {
                        detailsHtml = `<div class="activity-detail">+${activity.details.points} points</div>`;
                    }
                    break;
                case 'class_joined':
                    icon = '👥';
                    actionText = `Joined class: "${activity.details.className || 'Unknown'}"`;
                    break;
            }
            
            html += `
                <div class="timeline-item">
                    <div class="timeline-icon">${icon}</div>
                    <div class="timeline-content">
                        <div class="timeline-time">${time}</div>
                        <div class="timeline-action">${actionText}</div>
                        ${detailsHtml}
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
 * Renders a list of quizzes with performance data
 * @param {Object} quizzesData - The student's quiz data
 * @returns {string} HTML for the quizzes list
 */
function renderQuizzesList(quizzesData) {
    if (!quizzesData || Object.keys(quizzesData).length === 0) {
        return '<div class="empty-state">No quiz data found.</div>';
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
                totalQuestions: quiz.totalQuestions || 0,
                correctAnswers: quiz.correctAnswers || 0,
                timeSpent: quiz.timeSpent || 0,
                subject: quiz.subject || 'General'
            });
        }
    });
    
    // Return early if no valid quizzes
    if (quizzes.length === 0) {
        return '<div class="empty-state">No quiz data found.</div>';
    }
    
    // Sort by completion date (newest first)
    quizzes.sort((a, b) => {
        if (!a.completedAt && !b.completedAt) return 0;
        if (!a.completedAt) return 1;
        if (!b.completedAt) return -1;
        return b.completedAt - a.completedAt;
    });
    
    // Render quizzes list
    let html = `
        <div class="quiz-stats-summary">
            <div class="quiz-stat">
                <div class="stat-value">${quizzes.filter(q => q.completed).length}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="quiz-stat">
                <div class="stat-value">${calculateAverageQuizScore(quizzes).toFixed(1)}%</div>
                <div class="stat-label">Avg Score</div>
            </div>
            <div class="quiz-stat">
                <div class="stat-value">${calculateTotalCorrectAnswers(quizzes)}</div>
                <div class="stat-label">Correct Answers</div>
            </div>
        </div>
        <div class="quiz-items">
    `;
    
    quizzes.forEach(quiz => {
        const formattedDate = quiz.completedAt ? formatTimeAgo(quiz.completedAt) : 'Not completed';
        const scoreClass = quiz.completed ? getScoreClass(quiz.score) : '';
        const scoreDisplay = quiz.completed ? `${quiz.score}%` : 'In progress';
        
        html += `
            <div class="quiz-item">
                <div class="quiz-info">
                    <div class="quiz-title">${quiz.title}</div>
                    <div class="quiz-meta">
                        <span class="quiz-subject">${quiz.subject}</span>
                        <span class="quiz-date">${formattedDate}</span>
                    </div>
                </div>
                <div class="quiz-score ${scoreClass}">${scoreDisplay}</div>
                ${quiz.completed ? `
                <div class="quiz-details">
                    <div class="quiz-detail">
                        <span class="detail-label">Questions</span>
                        <span class="detail-value">${quiz.totalQuestions}</span>
                    </div>
                    <div class="quiz-detail">
                        <span class="detail-label">Correct</span>
                        <span class="detail-value">${quiz.correctAnswers}/${quiz.totalQuestions}</span>
                    </div>
                    <div class="quiz-detail">
                        <span class="detail-label">Time</span>
                        <span class="detail-value">${formatTime(quiz.timeSpent)}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Renders a list of lessons with completion data
 * @param {Object} lessonsData - The student's lesson data
 * @returns {string} HTML for the lessons list
 */
function renderLessonsList(lessonsData) {
    if (!lessonsData || Object.keys(lessonsData).length === 0) {
        return '<div class="empty-state">No lesson data found.</div>';
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
                progress: lesson.progress || 0,
                lastAccessed: lesson.lastAccessed ? new Date(lesson.lastAccessed) : null,
                subject: lesson.subject || 'General',
                category: lesson.category || 'Other'
            });
        }
    });
    
    // Return early if no valid lessons
    if (lessons.length === 0) {
        return '<div class="empty-state">No lesson data found.</div>';
    }
    
    // Sort by completion date (for completed ones) and last accessed (for incomplete ones)
    lessons.sort((a, b) => {
        if (a.completed && b.completed) {
            if (!a.completedAt && !b.completedAt) return 0;
            if (!a.completedAt) return 1;
            if (!b.completedAt) return -1;
            return b.completedAt - a.completedAt;
        } else if (a.completed) {
            return -1;
        } else if (b.completed) {
            return 1;
        } else {
            if (!a.lastAccessed && !b.lastAccessed) return 0;
            if (!a.lastAccessed) return 1;
            if (!b.lastAccessed) return -1;
            return b.lastAccessed - a.lastAccessed;
        }
    });
    
    // Group lessons by category
    const categories = {};
    lessons.forEach(lesson => {
        if (!categories[lesson.category]) {
            categories[lesson.category] = [];
        }
        categories[lesson.category].push(lesson);
    });
    
    // Render lessons by category
    let html = `
        <div class="lesson-stats-summary">
            <div class="lesson-stat">
                <div class="stat-value">${lessons.filter(l => l.completed).length}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="lesson-stat">
                <div class="stat-value">${lessons.filter(l => l.progress > 0 && !l.completed).length}</div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="lesson-stat">
                <div class="stat-value">${calculateAverageLessonProgress(lessons).toFixed(0)}%</div>
                <div class="stat-label">Avg Progress</div>
            </div>
        </div>
    `;
    
    Object.entries(categories).forEach(([category, categoryLessons]) => {
        html += `
            <div class="lesson-category">
                <h5 class="category-title">${category}</h5>
                <div class="lesson-items">
        `;
        
        categoryLessons.forEach(lesson => {
            const statusClass = lesson.completed ? 'completed' : (lesson.progress > 0 ? 'in-progress' : 'not-started');
            const statusText = lesson.completed ? 'Completed' : (lesson.progress > 0 ? `${lesson.progress}% completed` : 'Not started');
            
            const dateText = lesson.completed ? 
                `Completed ${formatTimeAgo(lesson.completedAt)}` : 
                (lesson.lastAccessed ? `Last accessed ${formatTimeAgo(lesson.lastAccessed)}` : 'Never accessed');
            
            html += `
                <div class="lesson-item ${statusClass}">
                    <div class="lesson-info">
                        <div class="lesson-title">${lesson.title}</div>
                        <div class="lesson-meta">
                            <span class="lesson-subject">${lesson.subject}</span>
                            <span class="lesson-date">${dateText}</span>
                        </div>
                    </div>
                    <div class="lesson-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar ${statusClass}" style="width: ${lesson.progress}%"></div>
                        </div>
                        <div class="progress-text">${statusText}</div>
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
 * Renders a list of flashcard sets with study data
 * @param {Object} flashcardsData - The student's flashcard data
 * @returns {string} HTML for the flashcards list
 */
function renderFlashcardsList(flashcardsData) {
    if (!flashcardsData || Object.keys(flashcardsData).length === 0) {
        return '<div class="empty-state">No flashcard data found.</div>';
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
                mastered: set.mastered || false,
                lastStudied: set.lastStudied ? new Date(set.lastStudied) : null,
                studySessions: set.studySessions || 0,
                subject: set.subject || 'General'
            });
        }
    });
    
    // Return early if no valid flashcard sets
    if (flashcardSets.length === 0) {
        return '<div class="empty-state">No flashcard data found.</div>';
    }
    
    // Sort by last studied date (newest first)
    flashcardSets.sort((a, b) => {
        if (!a.lastStudied && !b.lastStudied) return 0;
        if (!a.lastStudied) return 1;
        if (!b.lastStudied) return -1;
        return b.lastStudied - a.lastStudied;
    });
    
    // Render flashcard sets
    let html = `
        <div class="flashcard-stats-summary">
            <div class="flashcard-stat">
                <div class="stat-value">${flashcardSets.length}</div>
                <div class="stat-label">Total Sets</div>
            </div>
            <div class="flashcard-stat">
                <div class="stat-value">${flashcardSets.filter(s => s.mastered).length}</div>
                <div class="stat-label">Mastered Sets</div>
            </div>
            <div class="flashcard-stat">
                <div class="stat-value">${calculateTotalMasteredCards(flashcardSets)}</div>
                <div class="stat-label">Mastered Cards</div>
            </div>
        </div>
        <div class="flashcard-items">
    `;
    
    flashcardSets.forEach(set => {
        const lastStudiedText = set.lastStudied ? 
            `Last studied ${formatTimeAgo(set.lastStudied)}` : 'Never studied';
        
        const masteryRate = set.cardsCount > 0 ? 
            Math.round((set.masteredCount / set.cardsCount) * 100) : 0;
        
        let statusClass = '';
        if (set.mastered) {
            statusClass = 'mastered';
        } else if (masteryRate >= 50) {
            statusClass = 'learning';
        } else if (set.lastStudied) {
            statusClass = 'started';
        } else {
            statusClass = 'not-started';
        }
        
        html += `
            <div class="flashcard-item ${statusClass}">
                <div class="flashcard-info">
                    <div class="flashcard-title">${set.title}</div>
                    <div class="flashcard-meta">
                        <span class="flashcard-subject">${set.subject}</span>
                        <span class="flashcard-date">${lastStudiedText}</span>
                        ${set.studySessions > 0 ? `<span class="study-sessions">${set.studySessions} study sessions</span>` : ''}
                    </div>
                </div>
                <div class="flashcard-mastery">
                    <div class="mastery-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar ${statusClass}" style="width: ${masteryRate}%"></div>
                        </div>
                        <div class="progress-text">
                            <span class="mastery-rate">${masteryRate}% mastered</span>
                            <span class="cards-count">${set.masteredCount}/${set.cardsCount} cards</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Utility function to export progress data
 * @param {string} educatorId - The ID of the educator
 */
function exportProgressData(educatorId) {
    // Get current filter values
    const classId = document.getElementById('class-filter').value;
    const timePeriod = document.getElementById('time-filter').value;
    const searchQuery = document.getElementById('student-progress-search').value.trim();
    
    // Show loading toast
    showToast('Preparing export, please wait...', 'info');
    
    // Determine the cutoff date for the selected time period
    let cutoffDate = null;
    if (timePeriod !== 'all') {
        const days = parseInt(timePeriod);
        if (!isNaN(days)) {
            cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
        }
    }
    
    // Get class name for filename
    let classNamePromise;
    if (classId === 'all') {
        classNamePromise = Promise.resolve('All Classes');
    } else {
        classNamePromise = database.ref(`classes/${classId}`).once('value')
            .then(snapshot => {
                const classData = snapshot.val() || {};
                return classData.name || 'Unknown Class';
            });
    }
    
    // Get students based on class filter
    let studentsPromise;
    
    if (classId === 'all') {
        // Get all students across all of this educator's classes
        studentsPromise = database.ref('classes')
            .orderByChild('educatorId')
            .equalTo(educatorId)
            .once('value')
            .then(snapshot => {
                const studentIds = new Set();
                
                snapshot.forEach(classSnapshot => {
                    const classData = classSnapshot.val();
                    if (classData.students) {
                        Object.keys(classData.students).forEach(studentId => {
                            studentIds.add(studentId);
                        });
                    }
                });
                
                return Array.from(studentIds);
            });
    } else {
        // Get students from the specific class
        studentsPromise = database.ref(`classes/${classId}/students`)
            .once('value')
            .then(snapshot => {
                const studentIds = [];
                snapshot.forEach(childSnapshot => {
                    studentIds.push(childSnapshot.key);
                });
                return studentIds;
            });
    }
    
    // Process all data and create CSV
    Promise.all([classNamePromise, studentsPromise])
        .then(([className, studentIds]) => {
            if (studentIds.length === 0) {
                showToast('No students found to export.', 'error');
                return Promise.reject(new Error('No students found'));
            }
            
            // Get detailed data for each student
            const studentPromises = studentIds.map(studentId => {
                return Promise.all([
                    database.ref(`users/${studentId}`).once('value'),
                    database.ref(`progress/${studentId}`).once('value')
                ])
                .then(([userSnapshot, progressSnapshot]) => {
                    const userData = userSnapshot.val() || {};
                    const progressData = progressSnapshot.val() || {};
                    
                    // Calculate student metrics
                    const metrics = calculateStudentMetrics(progressData, cutoffDate);
                    
                    return {
                        id: studentId,
                        firstName: userData.firstName || '',
                        lastName: userData.lastName || '',
                        username: userData.username || '',
                        email: userData.email || '',
                        lastActive: userData.lastActive ? new Date(userData.lastActive) : null,
                        joinDate: userData.createdAt ? new Date(userData.createdAt) : null,
                        metrics: metrics
                    };
                });
            });
            
            return Promise.all([className, Promise.all(studentPromises)]);
        })
        .then(([className, studentsData]) => {
            // Apply search filter if provided
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                studentsData = studentsData.filter(student => {
                    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                    const username = (student.username || '').toLowerCase();
                    return fullName.includes(query) || username.includes(query);
                });
            }
            
            if (studentsData.length === 0) {
                showToast('No students match your search criteria.', 'error');
                return Promise.reject(new Error('No matching students'));
            }
            
            // Sort students by name
            studentsData.sort((a, b) => {
                const nameA = `${a.firstName} ${a.lastName}`.trim();
                const nameB = `${b.firstName} ${b.lastName}`.trim();
                return nameA.localeCompare(nameB);
            });
            
            // Create CSV content
            let csvContent = 'First Name,Last Name,Username,Email,Join Date,Last Active,Completion Rate (%),Quiz Score (%),Total Items,Completed Items,Quizzes Taken,Streak Days\n';
            
            studentsData.forEach(student => {
                const joinDate = student.joinDate ? formatDate(student.joinDate) : 'Unknown';
                const lastActive = student.lastActive ? formatDate(student.lastActive) : 'Never';
                
                const row = [
                    student.firstName,
                    student.lastName,
                    student.username,
                    student.email,
                    joinDate,
                    lastActive,
                    student.metrics.completionRate.toFixed(1),
                    student.metrics.quizAvgScore.toFixed(1),
                    student.metrics.totalItems,
                    student.metrics.completedItems,
                    student.metrics.quizzesTaken,
                    student.metrics.streakDays
                ];
                
                // Escape any commas in the data
                const escapedRow = row.map(cell => {
                    if (cell !== null && cell !== undefined) {
                        const cellStr = String(cell);
                        return cellStr.includes(',') ? `"${cellStr}"` : cellStr;
                    }
                    return '';
                });
                
                csvContent += escapedRow.join(',') + '\n';
            });
            
            return { csvContent, className };
        })
        .then(({ csvContent, className }) => {
            // Format filename with date
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            
            const safeName = className.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `progress_${safeName}_${dateStr}.csv`;
            
            // Create download link
            const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            
            showToast('Progress data exported successfully!');
        })
        .catch(error => {
            console.error('Error exporting progress data:', error);
            if (error.message !== 'No students found' && error.message !== 'No matching students') {
                showToast('Error exporting data. Please try again.', 'error');
            }
        });
}

/**
 * Shows a modal for messaging a student
 * @param {string} studentId - The ID of the student
 */
function showMessageStudentModal(studentId) {
    // Get student data
    database.ref(`users/${studentId}`).once('value')
        .then(snapshot => {
            const userData = snapshot.val() || {};
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            // Format student name
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Student';
            const username = userData.username ? `@${userData.username}` : '';
            
            modal.innerHTML = `
                <div class="modal-content message-modal">
                    <div class="modal-header">
                        <h3>Message Student</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    <div class="message-form">
                        <div class="recipient-info">
                            <div class="student-avatar">${userData.firstName ? userData.firstName.charAt(0) : '?'}</div>
                            <div class="student-info">
                                <div class="student-name">${fullName}</div>
                                ${username ? `<div class="student-username">${username}</div>` : ''}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="message-subject">Subject</label>
                            <input type="text" id="message-subject" class="form-input" placeholder="Enter message subject">
                        </div>
                        
                        <div class="form-group">
                            <label for="message-content">Message</label>
                            <textarea id="message-content" class="form-textarea" rows="6" placeholder="Type your message here..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button class="cancel-btn">Cancel</button>
                            <button class="submit-btn" id="send-message-btn">Send Message</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            document.getElementById('send-message-btn').addEventListener('click', function() {
                const subject = document.getElementById('message-subject').value.trim();
                const content = document.getElementById('message-content').value.trim();
                
                if (!subject) {
                    showToast('Please enter a subject.', 'error');
                    return;
                }
                
                if (!content) {
                    showToast('Please enter a message.', 'error');
                    return;
                }
                
                // Send the message
                sendMessageToStudent(studentId, fullName, subject, content)
                    .then(() => {
                        document.body.removeChild(modal);
                    })
                    .catch(error => {
                        console.error('Error sending message:', error);
                    });
            });
            
            // Handle cancel button
            modal.querySelector('.cancel-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Handle close button
            modal.querySelector('.close-modal-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Allow clicking outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        })
        .catch(error => {
            console.error('Error loading student data:', error);
            showToast('Error loading student data. Please try again.', 'error');
        });
}

/**
 * Sends a message to a student
 * @param {string} studentId - The ID of the student
 * @param {string} studentName - The name of the student
 * @param {string} subject - The message subject
 * @param {string} content - The message content
 * @returns {Promise} Promise that resolves when message is sent
 */
function sendMessageToStudent(studentId, studentName, subject, content) {
    // Get current educator info
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
        return Promise.reject(new Error('Not authenticated'));
    }
    
    // Create message object
    const messageData = {
        from: currentUser.id,
        fromName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        subject: subject,
        content: content,
        sent: firebase.database.ServerValue.TIMESTAMP,
        read: false,
        deleted: false
    };
    
    // Add to Firebase
    return database.ref(`messages/${studentId}`).push(messageData)
        .then(() => {
            showToast(`Message sent to ${studentName}!`);
            
            // Log educator activity
            logEducatorActivity(currentUser.id, 'message_sent', `Sent message to ${studentName}`);
            
            return Promise.resolve();
        })
        .catch(error => {
            console.error('Error sending message:', error);
            showToast('Error sending message. Please try again.', 'error');
            throw error;
        });
}

/**
 * Log an educator activity
 * @param {string} educatorId - The ID of the educator
 * @param {string} type - The type of activity
 * @param {string} description - Description of the activity
 */
function logEducatorActivity(educatorId, type, description) {
    if (!educatorId) return;
    
    const activityData = {
        type: type,
        description: description,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref(`educators/${educatorId}/activity`).push(activityData)
        .catch(error => {
            console.error('Error logging educator activity:', error);
        });
}

// Helper functions for calculations
function calculateAverageQuizScore(quizzes) {
    const completedQuizzes = quizzes.filter(q => q.completed && q.score !== null);
    if (completedQuizzes.length === 0) return 0;
    
    const totalScore = completedQuizzes.reduce((sum, quiz) => sum + quiz.score, 0);
    return totalScore / completedQuizzes.length;
}

function calculateTotalCorrectAnswers(quizzes) {
    return quizzes.reduce((sum, quiz) => sum + (quiz.correctAnswers || 0), 0);
}

function calculateAverageLessonProgress(lessons) {
    if (lessons.length === 0) return 0;
    const totalProgress = lessons.reduce((sum, lesson) => sum + lesson.progress, 0);
    return totalProgress / lessons.length;
}

function calculateTotalMasteredCards(flashcardSets) {
    return flashcardSets.reduce((sum, set) => sum + (set.masteredCount || 0), 0);
}

// Helper functions for formatting
function getScoreClass(score) {
    if (score >= 80) return 'high-score';
    if (score >= 60) return 'medium-score';
    return 'low-score';
}

function formatTime(seconds) {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
        return `${remainingSeconds}s`;
    } else if (remainingSeconds === 0) {
        return `${minutes}m`;
    } else {
        return `${minutes}m ${remainingSeconds}s`;
    }
}

function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString();
}

function formatDateRelative(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString();
    }
}

function formatTimeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
        return date.toLocaleDateString();
    } else if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
} 