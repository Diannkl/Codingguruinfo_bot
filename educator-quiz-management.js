/**
 * Show modal for creating a new quiz
 */
function showCreateQuizModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content quiz-modal">
            <div class="modal-header">
                <h3>Create New Quiz</h3>
                <button class="close-modal-btn">×</button>
            </div>
            
            <div class="modal-body">
                <form id="quiz-form" class="quiz-form">
                    <div class="form-group">
                        <label for="quiz-title">Quiz Title</label>
                        <input type="text" id="quiz-title" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="quiz-description">Description</label>
                        <textarea id="quiz-description" class="form-textarea" rows="3"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="quiz-topic">Topic</label>
                            <input type="text" id="quiz-topic" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label for="quiz-duration">Duration (minutes)</label>
                            <input type="number" id="quiz-duration" class="form-input" min="1" value="15">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <h4>Questions</h4>
                        <div id="questions-container">
                            <!-- Empty at first -->
                        </div>
                        
                        <button type="button" id="add-question-btn" class="secondary-btn">
                            <span class="action-icon">➕</span> Add Question
                        </button>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Create Quiz</button>
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
    
    // Add initial question
    addQuestion();
    
    // Set up add question button
    modal.querySelector('#add-question-btn').addEventListener('click', function() {
        addQuestion();
    });
    
    // Form submission
    const form = modal.querySelector('#quiz-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get quiz details
        const title = modal.querySelector('#quiz-title').value.trim();
        const description = modal.querySelector('#quiz-description').value.trim();
        const topic = modal.querySelector('#quiz-topic').value.trim();
        const duration = parseInt(modal.querySelector('#quiz-duration').value) || 15;
        
        // Validate quiz details
        if (!title) {
            showToast('Please enter a quiz title.', 'error');
            return;
        }
        
        // Get questions
        const questions = [];
        const questionElements = modal.querySelectorAll('.question-item');
        
        if (questionElements.length === 0) {
            showToast('Please add at least one question.', 'error');
            return;
        }
        
        let hasError = false;
        
        questionElements.forEach((questionEl, index) => {
            const questionText = questionEl.querySelector('.question-text').value.trim();
            const questionType = questionEl.querySelector('.question-type').value;
            
            if (!questionText) {
                showToast(`Question ${index + 1} is missing text.`, 'error');
                hasError = true;
                return;
            }
            
            if (!questionType) {
                showToast(`Please select a type for question ${index + 1}.`, 'error');
                hasError = true;
                return;
            }
            
            const question = {
                text: questionText,
                type: questionType
            };
            
            // Get answers based on question type
            if (questionType === 'multiple_choice' || questionType === 'single_choice') {
                const answerEls = questionEl.querySelectorAll('.answer-item');
                const answers = [];
                
                let hasCorrectAnswer = false;
                
                answerEls.forEach((answerEl, answerIndex) => {
                    const answerText = answerEl.querySelector('.answer-text').value.trim();
                    const isCorrect = answerEl.querySelector('.answer-correct').checked;
                    
                    if (!answerText) {
                        showToast(`Question ${index + 1}, Answer ${answerIndex + 1} is missing text.`, 'error');
                        hasError = true;
                        return;
                    }
                    
                    if (isCorrect) {
                        hasCorrectAnswer = true;
                    }
                    
                    answers.push({
                        text: answerText,
                        isCorrect
                    });
                });
                
                if (!hasCorrectAnswer) {
                    showToast(`Question ${index + 1} must have at least one correct answer.`, 'error');
                    hasError = true;
                    return;
                }
                
                question.answers = answers;
            } else if (questionType === 'true_false') {
                const correctAnswer = questionEl.querySelector('input[name="correct_' + index + '"]:checked').value === 'true';
                question.answers = [
                    { text: 'True', isCorrect: correctAnswer },
                    { text: 'False', isCorrect: !correctAnswer }
                ];
            } else if (questionType === 'text') {
                const correctAnswer = questionEl.querySelector('.text-answer').value.trim();
                
                if (!correctAnswer) {
                    showToast(`Question ${index + 1} is missing the correct answer.`, 'error');
                    hasError = true;
                    return;
                }
                
                question.correctAnswer = correctAnswer;
            }
            
            questions.push(question);
        });
        
        if (hasError) {
            return;
        }
        
        // Show loading state
        const submitBtn = modal.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Creating...';
        
        // Create quiz object
        const currentUser = getCurrentUser();
        const quiz = {
            title,
            description,
            topic: topic || 'Uncategorized',
            duration,
            questions,
            authorId: currentUser.id,
            authorName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            questionCount: questions.length
        };
        
        // Save to Firebase
        database.ref('quizzes').push(quiz)
            .then(() => {
                showToast('Quiz created successfully.');
                document.body.removeChild(modal);
                
                // Reload quizzes if on content management tab
                const contentPanel = document.querySelector('#content-tab.tab-content.active');
                if (contentPanel) {
                    const quizzesPanel = contentPanel.querySelector('#quizzes-panel.content-panel.active');
                    if (quizzesPanel) {
                        loadQuizzes(quizzesPanel, currentUser.id);
                    }
                }
                
                // Log activity
                logEducatorActivity('create_quiz', `Created quiz: ${title}`);
            })
            .catch(error => {
                console.error('Error creating quiz:', error);
                showToast('Error creating quiz. Please try again.', 'error');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Quiz';
            });
    });
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    /**
     * Add a new question to the form
     */
    function addQuestion() {
        const container = modal.querySelector('#questions-container');
        const questionIndex = container.children.length;
        
        const questionEl = document.createElement('div');
        questionEl.className = 'question-item';
        questionEl.innerHTML = `
            <div class="question-header">
                <h5>Question ${questionIndex + 1}</h5>
                <button type="button" class="remove-question-btn">✕</button>
            </div>
            
            <div class="form-group">
                <label for="question-text-${questionIndex}">Question</label>
                <textarea id="question-text-${questionIndex}" class="form-textarea question-text" rows="2" required></textarea>
            </div>
            
            <div class="form-group">
                <label for="question-type-${questionIndex}">Question Type</label>
                <select id="question-type-${questionIndex}" class="form-select question-type">
                    <option value="">Select question type</option>
                    <option value="multiple_choice">Multiple Choice (Multiple Answers)</option>
                    <option value="single_choice">Multiple Choice (Single Answer)</option>
                    <option value="true_false">True/False</option>
                    <option value="text">Text Answer</option>
                </select>
            </div>
            
            <div class="question-answers">
                <!-- Will be populated based on question type -->
            </div>
        `;
        
        container.appendChild(questionEl);
        
        // Set up remove button
        questionEl.querySelector('.remove-question-btn').addEventListener('click', function() {
            container.removeChild(questionEl);
            
            // Update question numbers
            container.querySelectorAll('.question-item').forEach((item, idx) => {
                item.querySelector('h5').textContent = `Question ${idx + 1}`;
            });
        });
        
        // Set up question type change
        const typeSelect = questionEl.querySelector('.question-type');
        typeSelect.addEventListener('change', function() {
            const answersContainer = questionEl.querySelector('.question-answers');
            const type = this.value;
            
            switch (type) {
                case 'multiple_choice':
                case 'single_choice':
                    setupMultipleChoiceAnswers(answersContainer, type, questionIndex);
                    break;
                case 'true_false':
                    setupTrueFalseAnswers(answersContainer, questionIndex);
                    break;
                case 'text':
                    setupTextAnswer(answersContainer, questionIndex);
                    break;
                default:
                    answersContainer.innerHTML = '';
            }
        });
    }
    
    /**
     * Set up multiple choice answers
     * @param {HTMLElement} container - Answers container
     * @param {string} type - Question type ('multiple_choice' or 'single_choice')
     * @param {number} questionIndex - Question index
     */
    function setupMultipleChoiceAnswers(container, type, questionIndex) {
        container.innerHTML = `
            <div class="answers-header">
                <label>Answers</label>
                <button type="button" class="add-answer-btn">Add Answer</button>
            </div>
            
            <div class="answers-list">
                <!-- At least two answers -->
                <div class="answer-item">
                    <input type="${type === 'single_choice' ? 'radio' : 'checkbox'}" class="answer-correct" name="question_${questionIndex}">
                    <input type="text" class="form-input answer-text" placeholder="Answer">
                    <button type="button" class="remove-answer-btn">✕</button>
                </div>
                <div class="answer-item">
                    <input type="${type === 'single_choice' ? 'radio' : 'checkbox'}" class="answer-correct" name="question_${questionIndex}">
                    <input type="text" class="form-input answer-text" placeholder="Answer">
                    <button type="button" class="remove-answer-btn">✕</button>
                </div>
            </div>
        `;
        
        // Set up add answer button
        container.querySelector('.add-answer-btn').addEventListener('click', function() {
            addAnswer(container.querySelector('.answers-list'), type, questionIndex);
        });
        
        // Set up remove answer buttons
        setupRemoveAnswerButtons(container);
    }
    
    /**
     * Add an answer to multiple choice question
     * @param {HTMLElement} container - Answers list container
     * @param {string} type - Question type ('multiple_choice' or 'single_choice')
     * @param {number} questionIndex - Question index
     */
    function addAnswer(container, type, questionIndex) {
        const answerEl = document.createElement('div');
        answerEl.className = 'answer-item';
        answerEl.innerHTML = `
            <input type="${type === 'single_choice' ? 'radio' : 'checkbox'}" class="answer-correct" name="question_${questionIndex}">
            <input type="text" class="form-input answer-text" placeholder="Answer">
            <button type="button" class="remove-answer-btn">✕</button>
        `;
        
        container.appendChild(answerEl);
        
        // Set up remove button
        answerEl.querySelector('.remove-answer-btn').addEventListener('click', function() {
            // Don't allow removing if only two answers left
            if (container.children.length <= 2) {
                showToast('Multiple choice questions must have at least two answers.', 'error');
                return;
            }
            
            container.removeChild(answerEl);
        });
    }
    
    /**
     * Set up remove answer buttons
     * @param {HTMLElement} container - Answers container
     */
    function setupRemoveAnswerButtons(container) {
        container.querySelectorAll('.remove-answer-btn').forEach(button => {
            button.addEventListener('click', function() {
                const answersList = container.querySelector('.answers-list');
                
                // Don't allow removing if only two answers left
                if (answersList.children.length <= 2) {
                    showToast('Multiple choice questions must have at least two answers.', 'error');
                    return;
                }
                
                answersList.removeChild(this.parentElement);
            });
        });
    }
    
    /**
     * Set up true/false answers
     * @param {HTMLElement} container - Answers container
     * @param {number} questionIndex - Question index
     */
    function setupTrueFalseAnswers(container, questionIndex) {
        container.innerHTML = `
            <div class="true-false-answers">
                <label>Correct Answer:</label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="correct_${questionIndex}" value="true" checked>
                        True
                    </label>
                    <label>
                        <input type="radio" name="correct_${questionIndex}" value="false">
                        False
                    </label>
                </div>
            </div>
        `;
    }
    
    /**
     * Set up text answer
     * @param {HTMLElement} container - Answers container
     * @param {number} questionIndex - Question index
     */
    function setupTextAnswer(container, questionIndex) {
        container.innerHTML = `
            <div class="text-answer-container">
                <label for="text-answer-${questionIndex}">Correct Answer:</label>
                <input type="text" id="text-answer-${questionIndex}" class="form-input text-answer" placeholder="Enter the correct answer">
                <div class="form-help">Students must enter this exact text to be marked correct.</div>
            </div>
        `;
    }
}

/**
 * Log educator activity
 * @param {string} activityType - Type of activity
 * @param {string} message - Activity description
 */
function logEducatorActivity(activityType, message) {
    const currentUser = getCurrentUser();
    
    if (!currentUser) return;
    
    const activity = {
        educatorId: currentUser.id,
        type: activityType,
        message: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('activity_logs').push(activity)
        .catch(error => {
            console.error('Error logging activity:', error);
        });
}

/**
 * Show modal for editing a quiz
 * @param {string} quizId - Quiz ID
 */
function showEditQuizModal(quizId) {
    // Show loading toast
    showToast('Loading quiz data...', 'info');
    
    // Fetch quiz data
    database.ref(`quizzes/${quizId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error('Quiz not found');
            }
            
            const quiz = snapshot.val();
            quiz.id = snapshot.key;
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            modal.innerHTML = `
                <div class="modal-content quiz-modal">
                    <div class="modal-header">
                        <h3>Edit Quiz</h3>
                        <button class="close-modal-btn">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="quiz-form" class="quiz-form">
                            <div class="form-group">
                                <label for="quiz-title">Quiz Title</label>
                                <input type="text" id="quiz-title" class="form-input" required value="${quiz.title || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="quiz-description">Description</label>
                                <textarea id="quiz-description" class="form-textarea" rows="3">${quiz.description || ''}</textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="quiz-topic">Topic</label>
                                    <input type="text" id="quiz-topic" class="form-input" value="${quiz.topic || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="quiz-duration">Duration (minutes)</label>
                                    <input type="number" id="quiz-duration" class="form-input" min="1" value="${quiz.duration || 15}">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <h4>Questions</h4>
                                <div id="questions-container">
                                    <!-- Will be populated with existing questions -->
                                </div>
                                
                                <button type="button" id="add-question-btn" class="secondary-btn">
                                    <span class="action-icon">➕</span> Add Question
                                </button>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="cancel-btn">Cancel</button>
                                <button type="submit" class="submit-btn">Update Quiz</button>
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
            
            // Load existing questions
            const questionsContainer = modal.querySelector('#questions-container');
            
            if (quiz.questions && quiz.questions.length > 0) {
                quiz.questions.forEach((question, index) => {
                    addExistingQuestion(question, index);
                });
            } else {
                // Add empty question if none exist
                addQuestion();
            }
            
            // Set up add question button
            modal.querySelector('#add-question-btn').addEventListener('click', function() {
                addQuestion();
            });
            
            // Form submission
            const form = modal.querySelector('#quiz-form');
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get quiz details
                const title = modal.querySelector('#quiz-title').value.trim();
                const description = modal.querySelector('#quiz-description').value.trim();
                const topic = modal.querySelector('#quiz-topic').value.trim();
                const duration = parseInt(modal.querySelector('#quiz-duration').value) || 15;
                
                // Validate quiz details
                if (!title) {
                    showToast('Please enter a quiz title.', 'error');
                    return;
                }
                
                // Get questions (similar to create quiz function)
                const questions = [];
                const questionElements = modal.querySelectorAll('.question-item');
                
                if (questionElements.length === 0) {
                    showToast('Please add at least one question.', 'error');
                    return;
                }
                
                let hasError = false;
                
                questionElements.forEach((questionEl, index) => {
                    // Same question processing logic as in createQuiz
                    const questionText = questionEl.querySelector('.question-text').value.trim();
                    const questionType = questionEl.querySelector('.question-type').value;
                    
                    if (!questionText) {
                        showToast(`Question ${index + 1} is missing text.`, 'error');
                        hasError = true;
                        return;
                    }
                    
                    if (!questionType) {
                        showToast(`Please select a type for question ${index + 1}.`, 'error');
                        hasError = true;
                        return;
                    }
                    
                    const question = {
                        text: questionText,
                        type: questionType
                    };
                    
                    // Process based on question type (same as in createQuiz)
                    if (questionType === 'multiple_choice' || questionType === 'single_choice') {
                        const answerEls = questionEl.querySelectorAll('.answer-item');
                        const answers = [];
                        
                        let hasCorrectAnswer = false;
                        
                        answerEls.forEach((answerEl, answerIndex) => {
                            const answerText = answerEl.querySelector('.answer-text').value.trim();
                            const isCorrect = answerEl.querySelector('.answer-correct').checked;
                            
                            if (!answerText) {
                                showToast(`Question ${index + 1}, Answer ${answerIndex + 1} is missing text.`, 'error');
                                hasError = true;
                                return;
                            }
                            
                            if (isCorrect) {
                                hasCorrectAnswer = true;
                            }
                            
                            answers.push({
                                text: answerText,
                                isCorrect
                            });
                        });
                        
                        if (!hasCorrectAnswer) {
                            showToast(`Question ${index + 1} must have at least one correct answer.`, 'error');
                            hasError = true;
                            return;
                        }
                        
                        question.answers = answers;
                    } else if (questionType === 'true_false') {
                        const correctAnswer = questionEl.querySelector(`input[name="correct_${index}"]:checked`).value === 'true';
                        question.answers = [
                            { text: 'True', isCorrect: correctAnswer },
                            { text: 'False', isCorrect: !correctAnswer }
                        ];
                    } else if (questionType === 'text') {
                        const correctAnswer = questionEl.querySelector('.text-answer').value.trim();
                        
                        if (!correctAnswer) {
                            showToast(`Question ${index + 1} is missing the correct answer.`, 'error');
                            hasError = true;
                            return;
                        }
                        
                        question.correctAnswer = correctAnswer;
                    }
                    
                    questions.push(question);
                });
                
                if (hasError) {
                    return;
                }
                
                // Show loading state
                const submitBtn = modal.querySelector('.submit-btn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Updating...';
                
                // Update quiz object
                const updates = {
                    title,
                    description,
                    topic: topic || 'Uncategorized',
                    duration,
                    questions,
                    questionCount: questions.length,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Save to Firebase
                database.ref(`quizzes/${quizId}`).update(updates)
                    .then(() => {
                        showToast('Quiz updated successfully.');
                        document.body.removeChild(modal);
                        
                        // Reload quizzes if on content management tab
                        const contentPanel = document.querySelector('#content-tab.tab-content.active');
                        if (contentPanel) {
                            const quizzesPanel = contentPanel.querySelector('#quizzes-panel.content-panel.active');
                            if (quizzesPanel) {
                                loadQuizzes(quizzesPanel, quiz.authorId);
                            }
                        }
                        
                        // Log activity
                        logEducatorActivity('update_quiz', `Updated quiz: ${title}`);
                    })
                    .catch(error => {
                        console.error('Error updating quiz:', error);
                        showToast('Error updating quiz. Please try again.', 'error');
                        
                        // Reset button
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Update Quiz';
                    });
            });
            
            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
            
            /**
             * Add an existing question to the form
             * @param {Object} question - Question object
             * @param {number} index - Question index
             */
            function addExistingQuestion(question, index) {
                const questionEl = document.createElement('div');
                questionEl.className = 'question-item';
                questionEl.innerHTML = `
                    <div class="question-header">
                        <h5>Question ${index + 1}</h5>
                        <button type="button" class="remove-question-btn">✕</button>
                    </div>
                    
                    <div class="form-group">
                        <label for="question-text-${index}">Question</label>
                        <textarea id="question-text-${index}" class="form-textarea question-text" rows="2" required>${question.text || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="question-type-${index}">Question Type</label>
                        <select id="question-type-${index}" class="form-select question-type">
                            <option value="">Select question type</option>
                            <option value="multiple_choice" ${question.type === 'multiple_choice' ? 'selected' : ''}>Multiple Choice (Multiple Answers)</option>
                            <option value="single_choice" ${question.type === 'single_choice' ? 'selected' : ''}>Multiple Choice (Single Answer)</option>
                            <option value="true_false" ${question.type === 'true_false' ? 'selected' : ''}>True/False</option>
                            <option value="text" ${question.type === 'text' ? 'selected' : ''}>Text Answer</option>
                        </select>
                    </div>
                    
                    <div class="question-answers">
                        <!-- Will be populated based on question type -->
                    </div>
                `;
                
                questionsContainer.appendChild(questionEl);
                
                // Set up remove button
                questionEl.querySelector('.remove-question-btn').addEventListener('click', function() {
                    questionsContainer.removeChild(questionEl);
                    
                    // Update question numbers
                    questionsContainer.querySelectorAll('.question-item').forEach((item, idx) => {
                        item.querySelector('h5').textContent = `Question ${idx + 1}`;
                    });
                });
                
                // Set up answers based on question type
                const answersContainer = questionEl.querySelector('.question-answers');
                
                switch (question.type) {
                    case 'multiple_choice':
                    case 'single_choice':
                        setupExistingMultipleChoiceAnswers(answersContainer, question.type, index, question.answers || []);
                        break;
                    case 'true_false':
                        setupExistingTrueFalseAnswers(answersContainer, index, question.answers || []);
                        break;
                    case 'text':
                        setupExistingTextAnswer(answersContainer, index, question.correctAnswer || '');
                        break;
                }
                
                // Set up question type change
                const typeSelect = questionEl.querySelector('.question-type');
                typeSelect.addEventListener('change', function() {
                    const answersContainer = questionEl.querySelector('.question-answers');
                    const type = this.value;
                    
                    switch (type) {
                        case 'multiple_choice':
                        case 'single_choice':
                            setupMultipleChoiceAnswers(answersContainer, type, index);
                            break;
                        case 'true_false':
                            setupTrueFalseAnswers(answersContainer, index);
                            break;
                        case 'text':
                            setupTextAnswer(answersContainer, index);
                            break;
                        default:
                            answersContainer.innerHTML = '';
                    }
                });
            }
            
            /**
             * Set up existing multiple choice answers
             * @param {HTMLElement} container - Answers container
             * @param {string} type - Question type ('multiple_choice' or 'single_choice')
             * @param {number} questionIndex - Question index
             * @param {Array} answers - Existing answers
             */
            function setupExistingMultipleChoiceAnswers(container, type, questionIndex, answers) {
                container.innerHTML = `
                    <div class="answers-header">
                        <label>Answers</label>
                        <button type="button" class="add-answer-btn">Add Answer</button>
                    </div>
                    
                    <div class="answers-list">
                        ${answers.map(answer => `
                            <div class="answer-item">
                                <input type="${type === 'single_choice' ? 'radio' : 'checkbox'}" class="answer-correct" name="question_${questionIndex}" ${answer.isCorrect ? 'checked' : ''}>
                                <input type="text" class="form-input answer-text" placeholder="Answer" value="${answer.text || ''}">
                                <button type="button" class="remove-answer-btn">✕</button>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Set up add answer button
                container.querySelector('.add-answer-btn').addEventListener('click', function() {
                    addAnswer(container.querySelector('.answers-list'), type, questionIndex);
                });
                
                // Set up remove answer buttons
                setupRemoveAnswerButtons(container);
            }
            
            /**
             * Set up existing true/false answers
             * @param {HTMLElement} container - Answers container
             * @param {number} questionIndex - Question index
             * @param {Array} answers - Existing answers
             */
            function setupExistingTrueFalseAnswers(container, questionIndex, answers) {
                // Determine correct answer
                let correctIsTrue = true;
                if (answers.length >= 2) {
                    // Find which answer is correct
                    for (const answer of answers) {
                        if (answer.text === 'True' && answer.isCorrect) {
                            correctIsTrue = true;
                            break;
                        }
                        if (answer.text === 'False' && answer.isCorrect) {
                            correctIsTrue = false;
                            break;
                        }
                    }
                }
                
                container.innerHTML = `
                    <div class="true-false-answers">
                        <label>Correct Answer:</label>
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="correct_${questionIndex}" value="true" ${correctIsTrue ? 'checked' : ''}>
                                True
                            </label>
                            <label>
                                <input type="radio" name="correct_${questionIndex}" value="false" ${!correctIsTrue ? 'checked' : ''}>
                                False
                            </label>
                        </div>
                    </div>
                `;
            }
            
            /**
             * Set up existing text answer
             * @param {HTMLElement} container - Answers container
             * @param {number} questionIndex - Question index
             * @param {string} correctAnswer - Existing correct answer
             */
            function setupExistingTextAnswer(container, questionIndex, correctAnswer) {
                container.innerHTML = `
                    <div class="text-answer-container">
                        <label for="text-answer-${questionIndex}">Correct Answer:</label>
                        <input type="text" id="text-answer-${questionIndex}" class="form-input text-answer" placeholder="Enter the correct answer" value="${correctAnswer || ''}">
                        <div class="form-help">Students must enter this exact text to be marked correct.</div>
                    </div>
                `;
            }
            
            /**
             * Add a new question to the form
             */
            function addQuestion() {
                // Same as the addQuestion function in createQuizModal
                const questionIndex = questionsContainer.children.length;
                
                const questionEl = document.createElement('div');
                questionEl.className = 'question-item';
                questionEl.innerHTML = `
                    <div class="question-header">
                        <h5>Question ${questionIndex + 1}</h5>
                        <button type="button" class="remove-question-btn">✕</button>
                    </div>
                    
                    <div class="form-group">
                        <label for="question-text-${questionIndex}">Question</label>
                        <textarea id="question-text-${questionIndex}" class="form-textarea question-text" rows="2" required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="question-type-${questionIndex}">Question Type</label>
                        <select id="question-type-${questionIndex}" class="form-select question-type">
                            <option value="">Select question type</option>
                            <option value="multiple_choice">Multiple Choice (Multiple Answers)</option>
                            <option value="single_choice">Multiple Choice (Single Answer)</option>
                            <option value="true_false">True/False</option>
                            <option value="text">Text Answer</option>
                        </select>
                    </div>
                    
                    <div class="question-answers">
                        <!-- Will be populated based on question type -->
                    </div>
                `;
                
                questionsContainer.appendChild(questionEl);
                
                // Set up remove button
                questionEl.querySelector('.remove-question-btn').addEventListener('click', function() {
                    questionsContainer.removeChild(questionEl);
                    
                    // Update question numbers
                    questionsContainer.querySelectorAll('.question-item').forEach((item, idx) => {
                        item.querySelector('h5').textContent = `Question ${idx + 1}`;
                    });
                });
                
                // Set up question type change
                const typeSelect = questionEl.querySelector('.question-type');
                typeSelect.addEventListener('change', function() {
                    const answersContainer = questionEl.querySelector('.question-answers');
                    const type = this.value;
                    
                    switch (type) {
                        case 'multiple_choice':
                        case 'single_choice':
                            setupMultipleChoiceAnswers(answersContainer, type, questionIndex);
                            break;
                        case 'true_false':
                            setupTrueFalseAnswers(answersContainer, questionIndex);
                            break;
                        case 'text':
                            setupTextAnswer(answersContainer, questionIndex);
                            break;
                        default:
                            answersContainer.innerHTML = '';
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error loading quiz for editing:', error);
            showToast('Error loading quiz data. Please try again.', 'error');
        });
}

/**
 * Confirm deletion of a quiz
 * @param {string} quizId - Quiz ID
 */
function confirmDeleteQuiz(quizId) {
    if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        deleteQuiz(quizId);
    }
}

/**
 * Delete a quiz
 * @param {string} quizId - Quiz ID
 */
function deleteQuiz(quizId) {
    // Show loading toast
    showToast('Deleting quiz...', 'info');
    
    // Get quiz info for logging
    database.ref(`quizzes/${quizId}`).once('value')
        .then(snapshot => {
            const quiz = snapshot.val();
            
            if (!quiz) {
                throw new Error('Quiz not found');
            }
            
            // First, check if quiz is assigned to any classes
            return database.ref('class_quizzes')
                .orderByChild('quizId')
                .equalTo(quizId)
                .once('value')
                .then(assignmentsSnapshot => {
                    const deletePromises = [];
                    
                    // Delete any class assignments
                    assignmentsSnapshot.forEach(childSnapshot => {
                        deletePromises.push(database.ref(`class_quizzes/${childSnapshot.key}`).remove());
                    });
                    
                    // Delete quiz results
                    return database.ref('quiz_results')
                        .orderByChild('quizId')
                        .equalTo(quizId)
                        .once('value')
                        .then(resultsSnapshot => {
                            resultsSnapshot.forEach(childSnapshot => {
                                deletePromises.push(database.ref(`quiz_results/${childSnapshot.key}`).remove());
                            });
                            
                            // Wait for all deletions to complete
                            return Promise.all(deletePromises);
                        })
                        .then(() => {
                            // Finally, delete the quiz itself
                            return database.ref(`quizzes/${quizId}`).remove();
                        })
                        .then(() => {
                            showToast('Quiz deleted successfully.');
                            
                            // Reload quizzes if on content management tab
                            const contentPanel = document.querySelector('#content-tab.tab-content.active');
                            if (contentPanel) {
                                const quizzesPanel = contentPanel.querySelector('#quizzes-panel.content-panel.active');
                                if (quizzesPanel) {
                                    loadQuizzes(quizzesPanel, quiz.authorId);
                                }
                            }
                            
                            // Log activity
                            logEducatorActivity('delete_quiz', `Deleted quiz: ${quiz.title}`);
                        });
                });
        })
        .catch(error => {
            console.error('Error deleting quiz:', error);
            showToast('Error deleting quiz. Please try again.', 'error');
        });
} 