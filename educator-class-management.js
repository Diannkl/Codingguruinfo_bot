/**
 * Show modal for creating a new class
 */
function showCreateClassModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content class-modal">
            <div class="modal-header">
                <h3>Create New Class</h3>
                <button class="close-modal-btn">×</button>
            </div>
            
            <div class="modal-body">
                <form id="class-form" class="class-form">
                    <div class="form-group">
                        <label for="class-name">Class Name</label>
                        <input type="text" id="class-name" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="class-description">Description</label>
                        <textarea id="class-description" class="form-textarea" rows="4"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="class-join-code">Join Code</label>
                        <input type="text" id="class-join-code" class="form-input" placeholder="Optional">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Create Class</button>
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
    
    // Form submission
    const form = modal.querySelector('#class-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = modal.querySelector('#class-name').value.trim();
        const description = modal.querySelector('#class-description').value.trim();
        const joinCode = modal.querySelector('#class-join-code').value.trim();
        
        if (!name) {
            showToast('Please enter a class name.', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = modal.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Creating...';
        
        // Create class object
        const currentUser = getCurrentUser();
        const newClass = {
            name,
            description,
            joinCode,
            educatorId: currentUser.id,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Save to Firebase
        database.ref('classes').push(newClass)
            .then(() => {
                showToast('Class created successfully.');
                document.body.removeChild(modal);
                
                // Reload classes if on class management tab
                const classPanel = document.querySelector('#classes-tab');
                if (classPanel) {
                    loadClassManagement(classPanel, currentUser.id);
                }
                
                // Log activity
                logEducatorActivity('create_class', `Created class: ${name}`);
            })
            .catch(error => {
                console.error('Error creating class:', error);
                showToast('Error creating class. Please try again.', 'error');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Class';
            });
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

/**
 * Confirm removal of a student from a class
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} studentName - Student's name
 */
function confirmRemoveStudent(enrollmentId, studentName) {
    if (confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
        removeStudent(enrollmentId);
    }
}

/**
 * Remove a student from a class
 * @param {string} enrollmentId - Enrollment ID
 */
function removeStudent(enrollmentId) {
    // Show loading toast
    showToast('Removing student...', 'info');
    
    // Delete enrollment from Firebase
    database.ref(`class_enrollments/${enrollmentId}`).remove()
        .then(() => {
            showToast('Student removed successfully.');
            // Reload class details
            const classId = document.querySelector('.class-detail').dataset.classId;
            showClassDetail(classId);
            
            // Log activity
            logEducatorActivity('remove_student', `Removed student from class: ${enrollmentId}`);
        })
        .catch(error => {
            console.error('Error removing student:', error);
            showToast('Error removing student. Please try again.', 'error');
        });
}

/**
 * Show modal for editing a class
 * @param {string} classId - Class ID
 */
function showEditClassModal(classId) {
    // Show loading toast
    showToast('Loading class data...', 'info');
    
    // Fetch class data
    database.ref(`classes/${classId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Class not found');
            }
            
            const classData = snapshot.val();
            classData.id = snapshot.key;
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            modal.innerHTML = `
                <div class="modal-content class-modal">
                    <div class="modal-header">
                        <h3>Edit Class</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="class-form" class="class-form">
                            <div class="form-group">
                                <label for="class-name">Class Name</label>
                                <input type="text" id="class-name" class="form-input" required value="${classData.name || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="class-description">Description</label>
                                <textarea id="class-description" class="form-textarea" rows="4">${classData.description || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="class-join-code">Join Code</label>
                                <input type="text" id="class-join-code" class="form-input" value="${classData.joinCode || ''}">
                                <div class="form-help">Leave empty to generate a random code</div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="cancel-btn">Cancel</button>
                                <button type="submit" class="submit-btn">Update Class</button>
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
            
            // Form submission
            const form = modal.querySelector('#class-form');
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const name = modal.querySelector('#class-name').value.trim();
                const description = modal.querySelector('#class-description').value.trim();
                const joinCode = modal.querySelector('#class-join-code').value.trim();
                
                if (!name) {
                    showToast('Please enter a class name.', 'error');
                    return;
                }
                
                // Show loading state
                const submitBtn = modal.querySelector('.submit-btn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Updating...';
                
                // Update class object
                const updates = {
                    name,
                    description,
                    joinCode,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Save to Firebase
                database.ref(`classes/${classId}`).update(updates)
                    .then(() => {
                        showToast('Class updated successfully.');
                        document.body.removeChild(modal);
                        
                        // Reload class details if viewing class
                        if (document.querySelector('.class-detail')) {
                            showClassDetail(classId);
                        } else {
                            // Reload classes if on class management tab
                            const classPanel = document.querySelector('#classes-tab');
                            if (classPanel) {
                                loadClassManagement(classPanel, classData.educatorId);
                            }
                        }
                        
                        // Log activity
                        logEducatorActivity('update_class', `Updated class: ${name}`);
                    })
                    .catch(error => {
                        console.error('Error updating class:', error);
                        showToast('Error updating class. Please try again.', 'error');
                        
                        // Reset button
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Update Class';
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
            console.error('Error loading class for editing:', error);
            showToast('Error loading class data. Please try again.', 'error');
        });
}

/**
 * Generate a new join code for a class
 * @param {string} classId - Class ID
 */
function generateNewJoinCode(classId) {
    // Generate a random 6-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let joinCode = '';
    
    for (let i = 0; i < 6; i++) {
        joinCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Update the join code in Firebase
    database.ref(`classes/${classId}/joinCode`).set(joinCode)
        .then(() => {
            showToast('New join code generated successfully.');
            
            // Reload class details if viewing class
            if (document.querySelector('.class-detail')) {
                showClassDetail(classId);
            } else {
                // Update code display in the class card
                const codeElement = document.querySelector(`.class-card[data-class-id="${classId}"] .class-code`);
                if (codeElement) {
                    codeElement.textContent = joinCode;
                }
            }
        })
        .catch(error => {
            console.error('Error generating join code:', error);
            showToast('Error generating join code. Please try again.', 'error');
        });
}

/**
 * Confirm deletion of a class
 * @param {string} classId - Class ID
 */
function confirmDeleteClass(classId) {
    if (confirm('Are you sure you want to delete this class? This will remove all student enrollments and cannot be undone.')) {
        deleteClass(classId);
    }
}

/**
 * Delete a class
 * @param {string} classId - Class ID
 */
function deleteClass(classId) {
    // Show loading toast
    showToast('Deleting class...', 'info');
    
    // Get class info for logging
    database.ref(`classes/${classId}`).once('value')
        .then(snapshot => {
            const classData = snapshot.val();
            
            // First, delete all enrollments for this class
            return database.ref('class_enrollments')
                .orderByChild('classId')
                .equalTo(classId)
                .once('value')
                .then(enrollmentsSnapshot => {
                    const deletePromises = [];
                    
                    enrollmentsSnapshot.forEach(childSnapshot => {
                        deletePromises.push(database.ref(`class_enrollments/${childSnapshot.key}`).remove());
                    });
                    
                    return Promise.all(deletePromises);
                })
                .then(() => {
                    // Delete class resources
                    return database.ref('class_resources')
                        .orderByChild('classId')
                        .equalTo(classId)
                        .once('value')
                        .then(resourcesSnapshot => {
                            const deletePromises = [];
                            
                            resourcesSnapshot.forEach(childSnapshot => {
                                deletePromises.push(database.ref(`class_resources/${childSnapshot.key}`).remove());
                            });
                            
                            return Promise.all(deletePromises);
                        });
                })
                .then(() => {
                    // Delete class quizzes
                    return database.ref('class_quizzes')
                        .orderByChild('classId')
                        .equalTo(classId)
                        .once('value')
                        .then(quizzesSnapshot => {
                            const deletePromises = [];
                            
                            quizzesSnapshot.forEach(childSnapshot => {
                                deletePromises.push(database.ref(`class_quizzes/${childSnapshot.key}`).remove());
                            });
                            
                            return Promise.all(deletePromises);
                        });
                })
                .then(() => {
                    // Finally, delete the class itself
                    return database.ref(`classes/${classId}`).remove();
                })
                .then(() => {
                    showToast('Class deleted successfully.');
                    
                    // Go back to class management if viewing class
                    if (document.querySelector('.class-detail')) {
                        loadClassManagement(document.querySelector('#classes-tab'), classData.educatorId);
                    } else {
                        // Reload classes if on class management tab
                        const classPanel = document.querySelector('#classes-tab');
                        if (classPanel) {
                            loadClassManagement(classPanel, classData.educatorId);
                        }
                    }
                    
                    // Log activity
                    logEducatorActivity('delete_class', `Deleted class: ${classData.name}`);
                });
        })
        .catch(error => {
            console.error('Error deleting class:', error);
            showToast('Error deleting class. Please try again.', 'error');
        });
} 