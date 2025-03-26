/**
 * Set up event listeners for progress filters (continued)
 * @param {string} educatorId - Educator ID
 */
function setupProgressFilterEvents(educatorId) {
    const classFilter = document.getElementById('class-filter');
    const timePeriod = document.getElementById('time-period');
    const studentSearch = document.getElementById('student-search');
    
    if (!classFilter || !timePeriod || !studentSearch) return;
    
    // Filter change events
    classFilter.addEventListener('change', function() {
        loadProgressData(educatorId, this.value, timePeriod.value, studentSearch.value);
    });
    
    timePeriod.addEventListener('change', function() {
        loadProgressData(educatorId, classFilter.value, this.value, studentSearch.value);
    });
    
    // Setup debounced search
    let searchTimeout;
    studentSearch.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadProgressData(educatorId, classFilter.value, timePeriod.value, this.value);
        }, 300);
    });
}

/**
 * Load progress data based on filters
 * @param {string} educatorId - Educator ID
 * @param {string} classId - Selected class ID (optional)
 * @param {string} timePeriod - Selected time period (days or 'all')
 * @param {string} searchQuery - Student search query (optional)
 */
function loadProgressData(educatorId, classId = '', timePeriod = '30', searchQuery = '') {
    const tableContainer = document.querySelector('.students-table-container');
    if (!tableContainer) return;
    
    // Show loading indicator
    tableContainer.innerHTML = '<div class="loading-indicator">Loading student data...</div>';
    
    // Calculate date cutoff for time period
    let cutoffDate = null;
    if (timePeriod !== 'all') {
        cutoffDate = Date.now() - (parseInt(timePeriod) * 24 * 60 * 60 * 1000);
    }
    
    // First, get all students for this educator
    let studentsQuery;
    if (classId) {
        // Get students for a specific class
        studentsQuery = database.ref('class_enrollments')
            .orderByChild('classId')
            .equalTo(classId)
            .once('value');
    } else {
        // Get all students across all classes for this educator
        studentsQuery = database.ref('class_enrollments')
            .orderByChild('educatorId')
            .equalTo(educatorId)
            .once('value');
    }
    
    studentsQuery
        .then(snapshot => {
            const studentIds = new Set();
            const enrollmentsByStudent = {};
            
            snapshot.forEach(childSnapshot => {
                const enrollment = childSnapshot.val();
                
                // Only include enrollments for this educator
                if (enrollment.educatorId === educatorId) {
                    studentIds.add(enrollment.studentId);
                    
                    if (!enrollmentsByStudent[enrollment.studentId]) {
                        enrollmentsByStudent[enrollment.studentId] = [];
                    }
                    
                    enrollmentsByStudent[enrollment.studentId].push(enrollment);
                }
            });
            
            if (studentIds.size === 0) {
                tableContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No students found for the selected filters.</p>
                    </div>
                `;
                updateProgressOverview(0, 0, 0);
                return;
            }
            
            // Fetch student profile data
            return database.ref('users').once('value')
                .then(usersSnapshot => {
                    const students = [];
                    
                    studentIds.forEach(studentId => {
                        if (usersSnapshot.child(studentId).exists()) {
                            const userData = usersSnapshot.child(studentId).val();
                            
                            // Apply search filter if provided
                            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.toLowerCase();
                            if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) && studentId !== searchQuery) {
                                return;
                            }
                            
                            students.push({
                                id: studentId,
                                firstName: userData.firstName || '',
                                lastName: userData.lastName || '',
                                username: userData.username || '',
                                enrollments: enrollmentsByStudent[studentId] || [],
                                lastActivity: userData.lastLogin || 0,
                                quizStats: {
                                    completed: 0,
                                    avgScore: 0
                                },
                                flashcardStats: {
                                    setsStudied: 0,
                                    cardsMastered: 0
                                },
                                completionRate: 0
                            });
                        }
                    });
                    
                    // Sort students by last name
                    students.sort((a, b) => {
                        if (a.lastName && b.lastName) {
                            return a.lastName.localeCompare(b.lastName);
                        }
                        return 0;
                    });
                    
                    return students;
                })
                .then(students => {
                    // No students match search criteria
                    if (students.length === 0) {
                        tableContainer.innerHTML = `
                            <div class="empty-state">
                                <p>No students found for the selected filters.</p>
                            </div>
                        `;
                        updateProgressOverview(0, 0, 0);
                        return;
                    }
                    
                    // Fetch quiz results
                    return database.ref('quiz_results').once('value')
                        .then(quizResults => {
                            // Process quiz results for each student
                            students.forEach(student => {
                                const studentResults = [];
                                
                                quizResults.forEach(resultSnapshot => {
                                    const result = resultSnapshot.val();
                                    
                                    if (result.studentId === student.id && 
                                        (!cutoffDate || result.timestamp >= cutoffDate)) {
                                        studentResults.push(result);
                                    }
                                });
                                
                                if (studentResults.length > 0) {
                                    student.quizStats.completed = studentResults.length;
                                    
                                    let totalScore = 0;
                                    studentResults.forEach(result => {
                                        totalScore += result.score;
                                    });
                                    
                                    student.quizStats.avgScore = Math.round(totalScore / studentResults.length);
                                }
                            });
                            
                            return students;
                        });
                })
                .then(students => {
                    // Fetch flashcard progress
                    return database.ref('flashcard_progress').once('value')
                        .then(flashcardProgress => {
                            // Process flashcard progress for each student
                            students.forEach(student => {
                                let setsStudied = 0;
                                let cardsMastered = 0;
                                let totalCards = 0;
                                
                                flashcardProgress.forEach(progressSnapshot => {
                                    const progress = progressSnapshot.val();
                                    
                                    if (progress.studentId === student.id &&
                                        (!cutoffDate || progress.lastStudied >= cutoffDate)) {
                                        setsStudied++;
                                        
                                        if (progress.cards) {
                                            const cards = progress.cards;
                                            Object.keys(cards).forEach(cardId => {
                                                totalCards++;
                                                if (cards[cardId].status === 'mastered') {
                                                    cardsMastered++;
                                                }
                                            });
                                        }
                                    }
                                });
                                
                                student.flashcardStats.setsStudied = setsStudied;
                                student.flashcardStats.cardsMastered = cardsMastered;
                                
                                // Calculate completion rate
                                if (totalCards > 0) {
                                    student.completionRate = Math.round((student.quizStats.completed * 0.5 + (cardsMastered / totalCards) * 0.5) * 100);
                                } else if (student.quizStats.completed > 0) {
                                    student.completionRate = Math.round(student.quizStats.avgScore);
                                }
                            });
                            
                            return students;
                        });
                })
                .then(students => {
                    // Calculate overview metrics
                    let totalCompletionRate = 0;
                    let totalQuizScore = 0;
                    let quizScoreCount = 0;
                    let activeCount = 0;
                    
                    students.forEach(student => {
                        totalCompletionRate += student.completionRate;
                        
                        if (student.quizStats.completed > 0) {
                            totalQuizScore += student.quizStats.avgScore;
                            quizScoreCount++;
                        }
                        
                        // Student is active if they have any recent activity
                        if (student.lastActivity && student.lastActivity >= cutoffDate) {
                            activeCount++;
                        }
                    });
                    
                    const avgCompletionRate = students.length > 0 ? 
                        Math.round(totalCompletionRate / students.length) : 0;
                    
                    const avgQuizScore = quizScoreCount > 0 ? 
                        Math.round(totalQuizScore / quizScoreCount) : 0;
                    
                    // Update overview cards
                    updateProgressOverview(avgCompletionRate, avgQuizScore, activeCount, students.length);
                    
                    // Render students table
                    renderStudentsTable(students);
                });
        })
        .catch(error => {
            console.error('Error loading progress data:', error);
            tableContainer.innerHTML = `
                <div class="error-state">
                    <p>Error loading student data. Please try again.</p>
                    <button class="primary-btn" onclick="loadProgressData('${educatorId}', '${classId}', '${timePeriod}', '${searchQuery}')">Retry</button>
                </div>
            `;
            updateProgressOverview(0, 0, 0);
        });
}

/**
 * Update progress overview cards
 * @param {number} completionRate - Average completion rate
 * @param {number} quizScore - Average quiz score
 * @param {number} activeCount - Number of active students
 * @param {number} totalCount - Total number of students
 */
function updateProgressOverview(completionRate, quizScore, activeCount, totalCount = 0) {
    const completionElement = document.querySelector('.completion-rate .rate-value');
    const scoreElement = document.querySelector('.quiz-score .score-value');
    const activeElement = document.querySelector('.active-students .active-value');
    
    if (completionElement) {
        completionElement.textContent = `${completionRate}%`;
    }
    
    if (scoreElement) {
        scoreElement.textContent = `${quizScore}%`;
    }
    
    if (activeElement) {
        activeElement.textContent = `${activeCount}/${totalCount}`;
    }
}

/**
 * Render students table
 * @param {Array} students - Array of student objects
 */
function renderStudentsTable(students) {
    const tableContainer = document.querySelector('.students-table-container');
    if (!tableContainer) return;
    
    tableContainer.innerHTML = `
        <table class="students-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Last Activity</th>
                    <th>Completion Rate</th>
                    <th>Quizzes</th>
                    <th>Avg. Score</th>
                    <th>Flashcards</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${students.map(student => `
                    <tr>
                        <td class="student-name-cell">
                            <div class="student-name">${student.firstName} ${student.lastName}</div>
                            <div class="student-username">${student.username || ''}</div>
                        </td>
                        <td>${student.lastActivity ? formatTimeAgo(new Date(student.lastActivity)) : 'Never'}</td>
                        <td>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${student.completionRate}%"></div>
                                <span class="progress-text">${student.completionRate}%</span>
                            </div>
                        </td>
                        <td>${student.quizStats.completed}</td>
                        <td>${student.quizStats.avgScore}%</td>
                        <td>${student.flashcardStats.setsStudied} sets, ${student.flashcardStats.cardsMastered} mastered</td>
                        <td>
                            <button class="icon-btn" onclick="viewStudentDetails('${student.id}')">
                                <span class="action-icon">👁️</span>
                            </button>
                            <button class="icon-btn" onclick="messagStudent('${student.id}')">
                                <span class="action-icon">✉️</span>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
} 