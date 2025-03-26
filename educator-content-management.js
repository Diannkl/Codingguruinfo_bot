/**
 * Load the content management tab
 * @param {HTMLElement} container - Tab content container
 * @param {string} educatorId - Educator ID
 */
function loadContentManagement(container, educatorId) {
    // Set up content management container
    container.innerHTML = `
        <div class="section-header">
            <h3>Content Management</h3>
            <p>Create and manage educational content for your students</p>
        </div>
        
        <div class="content-actions">
            <button class="action-btn" onclick="showCreateFlashcardsModal()">
                <span class="action-icon">➕</span>
                Create Flashcards
            </button>
            
            <button class="action-btn" onclick="showCreateQuizModal()">
                <span class="action-icon">➕</span>
                Create Quiz
            </button>
            
            <button class="action-btn" onclick="showCreateResourceModal()">
                <span class="action-icon">➕</span>
                Add Resource
            </button>
        </div>
        
        <div class="content-tabs">
            <button class="tab-btn active" data-content-tab="flashcards">Flashcards</button>
            <button class="tab-btn" data-content-tab="quizzes">Quizzes</button>
            <button class="tab-btn" data-content-tab="resources">Resources</button>
        </div>
        
        <div class="content-panels">
            <div id="flashcards-panel" class="content-panel active">
                <div class="loading-indicator">Loading flashcards...</div>
            </div>
            
            <div id="quizzes-panel" class="content-panel">
                <!-- Quizzes will be loaded when tab is clicked -->
            </div>
            
            <div id="resources-panel" class="content-panel">
                <!-- Resources will be loaded when tab is clicked -->
            </div>
        </div>
    `;
    
    // Set up content tab navigation
    const tabButtons = container.querySelectorAll('.content-tabs .tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all tabs
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show selected tab content
            const tabName = this.dataset.contentTab;
            const panels = container.querySelectorAll('.content-panel');
            panels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            const selectedPanel = container.querySelector(`#${tabName}-panel`);
            selectedPanel.classList.add('active');
            
            // Load content if needed
            if (tabName === 'flashcards') {
                loadFlashcardSets(selectedPanel, educatorId);
            } else if (tabName === 'quizzes') {
                loadQuizzes(selectedPanel, educatorId);
            } else if (tabName === 'resources') {
                loadResources(selectedPanel, educatorId);
            }
        });
    });
    
    // Load flashcards by default
    loadFlashcardSets(container.querySelector('#flashcards-panel'), educatorId);
}

/**
 * Load flashcard sets for the content management
 * @param {HTMLElement} container - Container element
 * @param {string} educatorId - Educator ID
 */
function loadFlashcardSets(container, educatorId) {
    // Show loading state
    container.innerHTML = '<div class="loading-indicator">Loading flashcards...</div>';
    
    // Fetch flashcard sets
    database.ref('flashcard_sets')
        .orderByChild('authorId')
        .equalTo(educatorId)
        .once('value')
        .then(snapshot => {
            const flashcardSets = [];
            
            snapshot.forEach(childSnapshot => {
                const set = childSnapshot.val();
                set.id = childSnapshot.key;
                flashcardSets.push(set);
            });
            
            // Sort by creation date (newest first)
            flashcardSets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            if (flashcardSets.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't created any flashcard sets yet.</p>
                        <button class="primary-btn" onclick="showCreateFlashcardsModal()">Create Flashcards</button>
                    </div>
                `;
                return;
            }
            
            // Group by subject
            const subjectGroups = {};
            
            flashcardSets.forEach(set => {
                const subject = set.subject || 'Uncategorized';
                
                if (!subjectGroups[subject]) {
                    subjectGroups[subject] = [];
                }
                
                subjectGroups[subject].push(set);
            });
            
            // Render flashcard sets by subject
            const subjectNames = Object.keys(subjectGroups).sort();
            
            container.innerHTML = `
                <div class="subject-tabs">
                    ${subjectNames.map((subject, index) => `
                        <button class="subject-tab ${index === 0 ? 'active' : ''}" data-subject="${subject}">
                            ${subject} (${subjectGroups[subject].length})
                        </button>
                    `).join('')}
                </div>
                
                <div class="flashcard-sets-grid">
                    ${renderFlashcardSets(subjectGroups[subjectNames[0]] || [])}
                </div>
            `;
            
            // Set up subject tab navigation
            const subjectTabs = container.querySelectorAll('.subject-tab');
            subjectTabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // Remove active class from all tabs
                    subjectTabs.forEach(t => {
                        t.classList.remove('active');
                    });
                    
                    // Add active class to clicked tab
                    this.classList.add('active');
                    
                    // Load flashcard sets for the selected subject
                    const subject = this.dataset.subject;
                    const setsGrid = container.querySelector('.flashcard-sets-grid');
                    setsGrid.innerHTML = renderFlashcardSets(subjectGroups[subject] || []);
                    
                    // Set up set action buttons
                    setupFlashcardSetActions();
                });
            });
            
            // Set up set action buttons
            setupFlashcardSetActions();
        })
        .catch(error => {
            console.error('Error loading flashcard sets:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Error loading flashcard sets. Please try again.</p>
                    <button class="primary-btn" onclick="loadFlashcardSets(this.parentNode.parentNode, '${educatorId}')">Retry</button>
                </div>
            `;
        });
}

/**
 * Render flashcard sets
 * @param {Array} sets - Array of flashcard set objects
 * @returns {string} HTML for the flashcard sets
 */
function renderFlashcardSets(sets) {
    if (sets.length === 0) {
        return `
            <div class="empty-state">
                <p>No flashcard sets found for this subject.</p>
            </div>
        `;
    }
    
    return sets.map(set => `
        <div class="flashcard-set-card" data-set-id="${set.id}">
            <div class="set-header">
                <h4 class="set-title">${set.title}</h4>
                <div class="set-meta">
                    <span class="set-cards-count">${set.cardCount || 0} cards</span>
                    <span class="set-date">${formatTimeAgo(new Date(set.createdAt || 0))}</span>
                </div>
            </div>
            
            <div class="set-description">${set.description || 'No description'}</div>
            
            <div class="set-stats">
                <div class="stat-item">
                    <div class="stat-label">Views</div>
                    <div class="stat-value">${set.viewCount || 0}</div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-label">Students</div>
                    <div class="stat-value">${set.studentCount || 0}</div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-label">Avg Mastery</div>
                    <div class="stat-value">${set.avgMastery || 0}%</div>
                </div>
            </div>
            
            <div class="set-actions">
                <button class="icon-btn edit-set-btn" data-set-id="${set.id}">
                    <span class="action-icon">✏️</span>
                </button>
                <button class="icon-btn duplicate-set-btn" data-set-id="${set.id}">
                    <span class="action-icon">🔄</span>
                </button>
                <button class="icon-btn delete-set-btn" data-set-id="${set.id}">
                    <span class="action-icon">🗑️</span>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Set up flashcard set action buttons
 */
function setupFlashcardSetActions() {
    // Edit set buttons
    document.querySelectorAll('.edit-set-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const setId = this.dataset.setId;
            showEditFlashcardsModal(setId);
        });
    });
    
    // Duplicate set buttons
    document.querySelectorAll('.duplicate-set-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const setId = this.dataset.setId;
            duplicateFlashcardSet(setId);
        });
    });
    
    // Delete set buttons
    document.querySelectorAll('.delete-set-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const setId = this.dataset.setId;
            confirmDeleteFlashcardSet(setId);
        });
    });
    
    // Clickable set cards
    document.querySelectorAll('.flashcard-set-card').forEach(card => {
        card.addEventListener('click', function() {
            const setId = this.dataset.setId;
            showFlashcardSetDetail(setId);
        });
    });
}

/**
 * Load quizzes for the content management
 * @param {HTMLElement} container - Container element
 * @param {string} educatorId - Educator ID
 */
function loadQuizzes(container, educatorId) {
    // Show loading state
    container.innerHTML = '<div class="loading-indicator">Loading quizzes...</div>';
    
    // Fetch quizzes
    database.ref('quizzes')
        .orderByChild('authorId')
        .equalTo(educatorId)
        .once('value')
        .then(snapshot => {
            const quizzes = [];
            
            snapshot.forEach(childSnapshot => {
                const quiz = childSnapshot.val();
                quiz.id = childSnapshot.key;
                quizzes.push(quiz);
            });
            
            // Sort by creation date (newest first)
            quizzes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            if (quizzes.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't created any quizzes yet.</p>
                        <button class="primary-btn" onclick="showCreateQuizModal()">Create Quiz</button>
                    </div>
                `;
                return;
            }
            
            // Render quizzes list
            container.innerHTML = `
                <div class="quizzes-list">
                    ${quizzes.map(quiz => `
                        <div class="quiz-card" data-quiz-id="${quiz.id}">
                            <div class="quiz-header">
                                <h4 class="quiz-title">${quiz.title}</h4>
                                <div class="quiz-meta">
                                    <span class="quiz-questions-count">${quiz.questionCount || 0} questions</span>
                                    <span class="quiz-duration">${quiz.duration || 0} min</span>
                                    <span class="quiz-date">${formatTimeAgo(new Date(quiz.createdAt || 0))}</span>
                                </div>
                            </div>
                            
                            <div class="quiz-description">${quiz.description || 'No description'}</div>
                            
                            <div class="quiz-stats">
                                <div class="stat-item">
                                    <div class="stat-label">Attempts</div>
                                    <div class="stat-value">${quiz.attemptCount || 0}</div>
                                </div>
                                
                                <div class="stat-item">
                                    <div class="stat-label">Avg Score</div>
                                    <div class="stat-value">${quiz.avgScore || 0}%</div>
                                </div>
                                
                                <div class="stat-item">
                                    <div class="stat-label">Completion</div>
                                    <div class="stat-value">${quiz.completionRate || 0}%</div>
                                </div>
                            </div>
                            
                            <div class="quiz-actions">
                                <button class="icon-btn edit-quiz-btn" data-quiz-id="${quiz.id}">
                                    <span class="action-icon">✏️</span>
                                </button>
                                <button class="icon-btn duplicate-quiz-btn" data-quiz-id="${quiz.id}">
                                    <span class="action-icon">🔄</span>
                                </button>
                                <button class="icon-btn delete-quiz-btn" data-quiz-id="${quiz.id}">
                                    <span class="action-icon">🗑️</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Set up quiz action buttons
            setupQuizActions();
        })
        .catch(error => {
            console.error('Error loading quizzes:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Error loading quizzes. Please try again.</p>
                    <button class="primary-btn" onclick="loadQuizzes(this.parentNode.parentNode, '${educatorId}')">Retry</button>
                </div>
            `;
        });
} 