/**
 * Complete assignment process after confirmation
 * @param {Object} quiz - Quiz object
 * @param {Object} classData - Class data
 * @param {string} dueDate - Due date (ISO string or empty)
 * @param {string} notes - Assignment notes
 * @param {boolean} notifyStudents - Whether to notify students
 * @param {HTMLElement} modal - Modal element for UI updates
 */
function completeQuizAssignment(quiz, classData, dueDate, notes, notifyStudents, modal) {
    // Show loading state
    const submitBtn = modal.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Assigning...';
    
    // Create assignment object
    const currentUser = getCurrentUser();
    const assignment = {
        classId: classData.id,
        quizId: quiz.id,
        quizTitle: quiz.title,
        educatorId: currentUser.id,
        assignedAt: firebase.database.ServerValue.TIMESTAMP,
        questionCount: quiz.questionCount || 0,
        duration: quiz.duration || 15,
        studentCount: 0, // Will be calculated later
        completionCount: 0,
        avgScore: 0
    };
    
    if (dueDate) {
        assignment.dueDate = new Date(dueDate).getTime();
    }
    
    if (notes) {
        assignment.notes = notes;
    }
    
    // Save assignment to Firebase
    database.ref('class_quizzes').push(assignment)
        .then(assignmentRef => {
            // Get student count
            return database.ref('class_enrollments')
                .orderByChild('classId')
                .equalTo(classData.id)
                .once('value')
                .then(enrollmentsSnapshot => {
                    let studentCount = 0;
                    const notificationPromises = [];
                    
                    enrollmentsSnapshot.forEach(childSnapshot => {
                        const enrollment = childSnapshot.val();
                        studentCount++;
                        
                        // Notify students if requested
                        if (notifyStudents) {
                            const notification = {
                                userId: enrollment.studentId,
                                type: 'quiz_assigned',
                                title: 'New Quiz Assigned',
                                message: `Your teacher has assigned a new quiz: ${quiz.title}`,
                                classId: classData.id,
                                className: classData.name,
                                quizId: quiz.id,
                                quizTitle: quiz.title,
                                isRead: false,
                                createdAt: firebase.database.ServerValue.TIMESTAMP
                            };
                            
                            if (dueDate) {
                                notification.dueDate = new Date(dueDate).getTime();
                                notification.message += ` due on ${new Date(dueDate).toLocaleDateString()}`;
                            }
                            
                            notificationPromises.push(database.ref('notifications').push(notification));
                        }
                    });
                    
                    // Update student count
                    return database.ref(`class_quizzes/${assignmentRef.key}/studentCount`).set(studentCount)
                        .then(() => {
                            // Wait for all notifications to be sent
                            if (notificationPromises.length > 0) {
                                return Promise.all(notificationPromises);
                            }
                        });
                });
        })
        .then(() => {
            showToast('Quiz assigned successfully.');
            document.body.removeChild(modal);
            
            // Reload class quizzes if viewing class
            if (document.querySelector('.class-detail')) {
                showClassDetail(classData.id);
            }
            
            // Log activity
            logEducatorActivity('assign_quiz', `Assigned quiz "${quiz.title}" to class "${classData.name}"`);
        })
        .catch(error => {
            console.error('Error assigning quiz:', error);
            showToast('Error assigning quiz. Please try again.', 'error');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Assign Quiz';
        });
}

/**
 * Show confirmation for assignment update
 * @param {string} assignmentId - Assignment ID
 */
function showEditQuizAssignmentModal(assignmentId) {
    // Show loading toast
    showToast('Loading assignment data...', 'info');
    
    // Fetch assignment data
    database.ref(`class_quizzes/${assignmentId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Assignment not found');
            }
            
            const assignment = snapshot.val();
            assignment.id = snapshot.key;
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            // Format date for datetime-local input
            let dueDateValue = '';
            if (assignment.dueDate) {
                const dueDate = new Date(assignment.dueDate);
                const yyyy = dueDate.getFullYear();
                const MM = String(dueDate.getMonth() + 1).padStart(2, '0');
                const dd = String(dueDate.getDate()).padStart(2, '0');
                const hh = String(dueDate.getHours()).padStart(2, '0');
                const mm = String(dueDate.getMinutes()).padStart(2, '0');
                dueDateValue = `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
            }
            
            modal.innerHTML = `
                <div class="modal-content assignment-details-modal">
                    <div class="modal-header">
                        <h3>Edit Assignment</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="quiz-summary">
                            <h4>${assignment.quizTitle}</h4>
                            <div class="quiz-meta">
                                <span class="quiz-questions">${assignment.questionCount || 0} questions</span>
                                <span class="quiz-duration">${assignment.duration || 15} min</span>
                                <span class="assignment-date">Assigned: ${formatDate(new Date(assignment.assignedAt))}</span>
                            </div>
                        </div>
                        
                        <form id="assignment-form" class="assignment-form">
                            <div class="form-group">
                                <label for="due-date">Due Date (Optional)</label>
                                <input type="datetime-local" id="due-date" class="form-input" value="${dueDateValue}">
                            </div>
                            
                            <div class="form-group">
                                <label for="assignment-notes">Notes (Optional)</label>
                                <textarea id="assignment-notes" class="form-textarea" rows="3" placeholder="Add instructions or notes for students...">${assignment.notes || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="notify-students" checked>
                                    Notify students about changes
                                </label>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="cancel-btn">Cancel</button>
                                <button type="submit" class="submit-btn">Update Assignment</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Set up close button
            modal.querySelector('.close-modal-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Cancel button
            modal.querySelector('.cancel-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Set minimum date to today
            const today = new Date();
            const isoDate = today.toISOString().split('T')[0];
            const isoTime = today.toTimeString().split(' ')[0].substring(0, 5);
            const minDateTime = `${isoDate}T${isoTime}`;
            
            const dueDateInput = modal.querySelector('#due-date');
            dueDateInput.min = minDateTime;
            
            // Form submission
            const form = modal.querySelector('#assignment-form');
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form values
                const dueDate = modal.querySelector('#due-date').value;
                const notes = modal.querySelector('#assignment-notes').value.trim();
                const notifyStudents = modal.querySelector('#notify-students').checked;
                
                // Show loading state
                const submitBtn = modal.querySelector('.submit-btn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Updating...';
                
                // Update assignment object
                const updates = {};
                
                if (dueDate) {
                    updates.dueDate = new Date(dueDate).getTime();
                } else {
                    // Remove due date if not set
                    updates.dueDate = null;
                }
                
                updates.notes = notes;
                updates.updatedAt = firebase.database.ServerValue.TIMESTAMP;
                
                // Save to Firebase
                database.ref(`class_quizzes/${assignmentId}`).update(updates)
                    .then(() => {
                        if (notifyStudents) {
                            // Fetch class and students
                            return database.ref(`class_enrollments`)
                                .orderByChild('classId')
                                .equalTo(assignment.classId)
                                .once('value')
                                .then(enrollmentsSnapshot => {
                                    const notificationPromises = [];
                                    
                                    enrollmentsSnapshot.forEach(childSnapshot => {
                                        const enrollment = childSnapshot.val();
                                        
                                        // Notify student
                                        const notification = {
                                            userId: enrollment.studentId,
                                            type: 'quiz_updated',
                                            title: 'Quiz Assignment Updated',
                                            message: `Your teacher has updated the assignment: ${assignment.quizTitle}`,
                                            classId: assignment.classId,
                                            className: enrollment.className,
                                            quizId: assignment.quizId,
                                            quizTitle: assignment.quizTitle,
                                            isRead: false,
                                            createdAt: firebase.database.ServerValue.TIMESTAMP
                                        };
                                        
                                        if (dueDate) {
                                            notification.dueDate = new Date(dueDate).getTime();
                                            notification.message += ` due on ${new Date(dueDate).toLocaleDateString()}`;
                                        }
                                        
                                        notificationPromises.push(database.ref('notifications').push(notification));
                                    });
                                    
                                    // Wait for all notifications to be sent
                                    if (notificationPromises.length > 0) {
                                        return Promise.all(notificationPromises);
                                    }
                                });
                        }
                    })
                    .then(() => {
                        showToast('Assignment updated successfully.');
                        document.body.removeChild(modal);
                        
                        // Reload class quizzes if viewing class
                        if (document.querySelector('.class-detail')) {
                            showClassDetail(assignment.classId);
                        }
                        
                        // Log activity
                        logEducatorActivity('update_quiz_assignment', `Updated quiz assignment: ${assignment.quizTitle}`);
                    })
                    .catch(error => {
                        console.error('Error updating assignment:', error);
                        showToast('Error updating assignment. Please try again.', 'error');
                        
                        // Reset button
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Update Assignment';
                    });
            });
            
            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        })
        .catch(error => {
            console.error('Error loading assignment data:', error);
            showToast('Error loading assignment data. Please try again.', 'error');
        });
}

/**
 * Confirm unassigning a quiz from a class
 * @param {string} assignmentId - Assignment ID
 * @param {string} quizTitle - Quiz title
 */
function confirmUnassignQuiz(assignmentId, quizTitle) {
    if (confirm(`Are you sure you want to unassign "${quizTitle}" from this class? Student results will remain.`)) {
        unassignQuiz(assignmentId, quizTitle);
    }
}

/**
 * Unassign a quiz from a class
 * @param {string} assignmentId - Assignment ID
 * @param {string} quizTitle - Quiz title
 */
function unassignQuiz(assignmentId, quizTitle) {
    // Show loading toast
    showToast('Unassigning quiz...', 'info');
    
    // Get assignment info for logging
    database.ref(`class_quizzes/${assignmentId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Assignment not found');
            }
            
            const assignment = snapshot.val();
            const classId = assignment.classId;
            
            // Delete assignment
            return database.ref(`class_quizzes/${assignmentId}`).remove()
                .then(() => {
                    showToast('Quiz unassigned successfully.');
                    
                    // Reload class quizzes if viewing class
                    if (document.querySelector('.class-detail')) {
                        showClassDetail(classId);
                    }
                    
                    // Log activity
                    logEducatorActivity('unassign_quiz', `Unassigned quiz: ${quizTitle}`);
                });
        })
        .catch(error => {
            console.error('Error unassigning quiz:', error);
            showToast('Error unassigning quiz. Please try again.', 'error');
        });
} 