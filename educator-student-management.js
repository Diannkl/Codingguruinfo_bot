/**
 * Show modal for adding a student to a class
 * @param {string} classId - Class ID
 */
function showAddStudentModal(classId) {
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
                <div class="modal-content add-student-modal">
                    <div class="modal-header">
                        <h3>Add Student to ${classData.name}</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="add-options">
                            <div class="option-tabs">
                                <button class="option-tab active" data-tab="search">Search Students</button>
                                <button class="option-tab" data-tab="manual">Add Manually</button>
                                <button class="option-tab" data-tab="bulk">Bulk Import</button>
                            </div>
                            
                            <div class="option-panels">
                                <div id="search-panel" class="option-panel active">
                                    <div class="form-group">
                                        <label for="student-search">Search by name or username:</label>
                                        <input type="text" id="student-search" class="form-input" placeholder="Start typing to search...">
                                    </div>
                                    
                                    <div class="search-results">
                                        <div class="empty-state">
                                            <p>Enter a name or username to search for students.</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div id="manual-panel" class="option-panel">
                                    <form id="manual-add-form">
                                        <div class="form-group">
                                            <label for="student-first-name">First Name</label>
                                            <input type="text" id="student-first-name" class="form-input" required>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="student-last-name">Last Name</label>
                                            <input type="text" id="student-last-name" class="form-input" required>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="student-email">Email</label>
                                            <input type="email" id="student-email" class="form-input" required>
                                        </div>
                                        
                                        <div class="form-actions">
                                            <button type="submit" class="submit-btn">Add Student</button>
                                        </div>
                                    </form>
                                </div>
                                
                                <div id="bulk-panel" class="option-panel">
                                    <div class="bulk-instructions">
                                        <p>Upload a CSV file with student information in the following format:</p>
                                        <code>First Name,Last Name,Email</code>
                                        <p>Each student should be on a new line.</p>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="csv-upload">Upload CSV file:</label>
                                        <input type="file" id="csv-upload" accept=".csv">
                                    </div>
                                    
                                    <div class="form-actions">
                                        <button id="upload-btn" class="submit-btn">Upload and Add</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Set up option tabs
            const tabs = modal.querySelectorAll('.option-tab');
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
                    const panels = modal.querySelectorAll('.option-panel');
                    panels.forEach(panel => {
                        panel.classList.remove('active');
                    });
                    
                    modal.querySelector(`#${tabName}-panel`).classList.add('active');
                });
            });
            
            // Set up close button
            modal.querySelector('.close-modal-btn').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            // Set up search functionality
            const searchInput = modal.querySelector('#student-search');
            const searchResults = modal.querySelector('.search-results');
            
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                const query = this.value.trim();
                
                if (query.length < 3) {
                    searchResults.innerHTML = `
                        <div class="empty-state">
                            <p>Enter at least 3 characters to search for students.</p>
                        </div>
                    `;
                    return;
                }
                
                searchTimeout = setTimeout(() => {
                    searchResults.innerHTML = '<div class="loading-indicator">Searching...</div>';
                    searchStudents(query, classData.id, searchResults);
                }, 300);
            });
            
            // Set up manual add form
            const manualForm = modal.querySelector('#manual-add-form');
            manualForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const firstName = modal.querySelector('#student-first-name').value.trim();
                const lastName = modal.querySelector('#student-last-name').value.trim();
                const email = modal.querySelector('#student-email').value.trim();
                
                if (!firstName || !lastName || !email) {
                    showToast('Please fill in all required fields.', 'error');
                    return;
                }
                
                // Add student manually
                addStudentManually(firstName, lastName, email, classData.id, classData.educatorId);
            });
            
            // Set up bulk import
            const uploadBtn = modal.querySelector('#upload-btn');
            const fileInput = modal.querySelector('#csv-upload');
            
            uploadBtn.addEventListener('click', function() {
                if (!fileInput.files || fileInput.files.length === 0) {
                    showToast('Please select a CSV file to upload.', 'error');
                    return;
                }
                
                const file = fileInput.files[0];
                if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                    showToast('Please upload a valid CSV file.', 'error');
                    return;
                }
                
                // Process CSV file
                processCSVFile(file, classData.id, classData.educatorId);
            });
            
            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        })
        .catch(error => {
            console.error('Error loading class data:', error);
            showToast('Error loading class data. Please try again.', 'error');
        });
}

/**
 * Search for students to add to a class
 * @param {string} query - Search query
 * @param {string} classId - Class ID
 * @param {HTMLElement} resultsContainer - Container for search results
 */
function searchStudents(query, classId, resultsContainer) {
    // First, get existing enrollments for this class
    database.ref('class_enrollments')
        .orderByChild('classId')
        .equalTo(classId)
        .once('value')
        .then(enrollmentsSnapshot => {
            const enrolledStudentIds = [];
            
            enrollmentsSnapshot.forEach(childSnapshot => {
                const enrollment = childSnapshot.val();
                enrolledStudentIds.push(enrollment.studentId);
            });
            
            // Search for students
            return database.ref('users')
                .orderByChild('role')
                .equalTo('student')
                .once('value')
                .then(usersSnapshot => {
                    const matchingStudents = [];
                    const lowercaseQuery = query.toLowerCase();
                    
                    usersSnapshot.forEach(childSnapshot => {
                        const user = childSnapshot.val();
                        user.id = childSnapshot.key;
                        
                        // Check if student is already enrolled
                        if (enrolledStudentIds.includes(user.id)) {
                            return;
                        }
                        
                        // Match by name or username
                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
                        const username = (user.username || '').toLowerCase();
                        
                        if (fullName.includes(lowercaseQuery) || username.includes(lowercaseQuery)) {
                            matchingStudents.push(user);
                        }
                    });
                    
                    return matchingStudents;
                });
        })
        .then(matchingStudents => {
            if (matchingStudents.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No matching students found. Try a different search or add a new student.</p>
                    </div>
                `;
                return;
            }
            
            // Sort students by last name
            matchingStudents.sort((a, b) => {
                if (a.lastName && b.lastName) {
                    return a.lastName.localeCompare(b.lastName);
                }
                return 0;
            });
            
            // Render search results
            resultsContainer.innerHTML = `
                <div class="search-results-list">
                    ${matchingStudents.slice(0, 10).map(student => `
                        <div class="student-result">
                            <div class="student-info">
                                <div class="student-name">${student.firstName} ${student.lastName}</div>
                                ${student.username ? `<div class="student-username">@${student.username}</div>` : ''}
                            </div>
                            <button class="add-student-btn" data-student-id="${student.id}">
                                Add to Class
                            </button>
                        </div>
                    `).join('')}
                    ${matchingStudents.length > 10 ? `
                        <div class="more-results">
                            ${matchingStudents.length - 10} more results. Refine your search to see more specific results.
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Set up add buttons
            const addButtons = resultsContainer.querySelectorAll('.add-student-btn');
            addButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const studentId = this.dataset.studentId;
                    enrollStudent(studentId, classId);
                });
            });
        })
        .catch(error => {
            console.error('Error searching for students:', error);
            resultsContainer.innerHTML = `
                <div class="error-state">
                    <p>Error searching for students. Please try again.</p>
                </div>
            `;
        });
}

/**
 * Add a student manually to a class
 * @param {string} firstName - Student first name
 * @param {string} lastName - Student last name
 * @param {string} email - Student email
 * @param {string} classId - Class ID
 * @param {string} educatorId - Educator ID
 */
function addStudentManually(firstName, lastName, email, classId, educatorId) {
    // Show loading toast
    showToast('Adding student...', 'info');
    
    // Create user object
    const newUser = {
        firstName,
        lastName,
        email,
        role: 'student',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: educatorId
    };
    
    // Save to Firebase
    const newUserRef = database.ref('users').push();
    newUserRef.set(newUser)
        .then(() => {
            // Now enroll the student
            return enrollStudent(newUserRef.key, classId);
        })
        .catch(error => {
            console.error('Error adding student:', error);
            showToast('Error adding student. Please try again.', 'error');
        });
}

/**
 * Enroll a student in a class
 * @param {string} studentId - Student ID
 * @param {string} classId - Class ID
 * @returns {Promise} Promise that resolves when enrollment is complete
 */
function enrollStudent(studentId, classId) {
    // Show loading toast
    showToast('Enrolling student...', 'info');
    
    // Get class and student data for the enrollment
    return Promise.all([
        database.ref(`classes/${classId}`).once('value'),
        database.ref(`users/${studentId}`).once('value')
    ])
        .then(([classSnapshot, studentSnapshot]) => {
            if (!classSnapshot.exists()) {
                throw new Error('Class not found');
            }
            
            if (!studentSnapshot.exists()) {
                throw new Error('Student not found');
            }
            
            const classData = classSnapshot.val();
            const studentData = studentSnapshot.val();
            
            // Create enrollment object
            const enrollment = {
                classId,
                studentId,
                educatorId: classData.educatorId,
                className: classData.name,
                studentName: `${studentData.firstName} ${studentData.lastName}`,
                enrolledAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Save to Firebase
            return database.ref('class_enrollments').push(enrollment);
        })
        .then(() => {
            showToast('Student enrolled successfully.');
            
            // Reload class details if viewing class
            if (document.querySelector('.class-detail')) {
                showClassDetail(classId);
            }
            
            // Log activity
            logEducatorActivity('enroll_student', `Enrolled student in class: ${classId}`);
            
            return true;
        })
        .catch(error => {
            console.error('Error enrolling student:', error);
            showToast('Error enrolling student. Please try again.', 'error');
            return false;
        });
}

/**
 * Process a CSV file to bulk import students
 * @param {File} file - CSV file
 * @param {string} classId - Class ID
 * @param {string} educatorId - Educator ID
 */
function processCSVFile(file, classId, educatorId) {
    // Show loading toast
    showToast('Processing file...', 'info');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const contents = e.target.result;
        const lines = contents.split('\n');
        
        // Parse CSV data
        const students = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(',');
            if (parts.length < 3) continue;
            
            students.push({
                firstName: parts[0].trim(),
                lastName: parts[1].trim(),
                email: parts[2].trim()
            });
        }
        
        if (students.length === 0) {
            showToast('No valid student data found in the file.', 'error');
            return;
        }
        
        // Confirm import
        if (confirm(`Add ${students.length} students to the class?`)) {
            importStudents(students, classId, educatorId);
        }
    };
    
    reader.onerror = function() {
        showToast('Error reading file. Please try again.', 'error');
    };
    
    reader.readAsText(file);
}

/**
 * Import multiple students from parsed CSV data
 * @param {Array} students - Array of student objects
 * @param {string} classId - Class ID
 * @param {string} educatorId - Educator ID
 */
function importStudents(students, classId, educatorId) {
    // Show loading toast
    showToast(`Importing ${students.length} students...`, 'info');
    
    // Create a counter for progress tracking
    let successCount = 0;
    let errorCount = 0;
    
    // Process students sequentially to avoid overloading Firebase
    const processNext = (index) => {
        if (index >= students.length) {
            // All done
            showToast(`Import complete. ${successCount} students added, ${errorCount} errors.`);
            
            // Reload class details if viewing class
            if (document.querySelector('.class-detail')) {
                showClassDetail(classId);
            }
            
            return;
        }
        
        const student = students[index];
        
        // Add student
        const newUser = {
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            role: 'student',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: educatorId
        };
        
        // Save to Firebase
        const newUserRef = database.ref('users').push();
        newUserRef.set(newUser)
            .then(() => {
                // Now enroll the student
                return enrollStudent(newUserRef.key, classId);
            })
            .then(success => {
                if (success) {
                    successCount++;
                } else {
                    errorCount++;
                }
                
                // Process next student
                processNext(index + 1);
            })
            .catch(error => {
                console.error('Error adding student:', error);
                errorCount++;
                
                // Process next student
                processNext(index + 1);
            });
    };
    
    // Start processing
    processNext(0);
} 