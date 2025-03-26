// Quiz data structure example
const quizData = {
    id: 'python-basics-1',
    title: 'Python Basics Quiz',
    questions: [
        {
            id: 'q1',
            type: 'multiple-choice',
            question: 'What is the output of `print(2 + 2 * 2)`?',
            options: ['4', '6', '8', 'Error'],
            correctAnswer: '6',
            explanation: 'Python follows mathematical order of operations (PEMDAS)'
        },
        {
            id: 'q2',
            type: 'code-debugging',
            question: 'Fix the error in the following code:',
            code: 'def greet(name):\n    print("Hello " + name)\n\ngreet()',
            correctAnswer: 'def greet(name):\n    print("Hello " + name)\n\ngreet("User")',
            explanation: 'The function greet() requires a name parameter'
        }
    ],
    timeLimit: 300, // in seconds
    points: 10
};

function loadQuiz(quizId) {
    // Fetch quiz data from Firebase
    database.ref(`quizzes/${quizId}`).once('value')
        .then((snapshot) => {
            const quiz = snapshot.val();
            if (quiz) {
                renderQuiz(quiz);
            } else {
                showError('Quiz not found');
            }
        });
}

function renderQuiz(quiz) {
    const container = document.getElementById('main-container');
    container.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-header">
                <h2>${quiz.title}</h2>
                <div class="timer" id="quiz-timer">${formatTime(quiz.timeLimit)}</div>
            </div>
            <div class="quiz-progress">
                <div class="progress-bar">
                    <div class="progress" id="quiz-progress" style="width: 0%"></div>
                </div>
                <div class="question-counter">Question 1/${quiz.questions.length}</div>
            </div>
            <div id="question-container"></div>
            <div class="quiz-navigation">
                <button id="prev-btn" disabled>Previous</button>
                <button id="next-btn">Next</button>
                <button id="submit-btn" style="display: none;">Submit Quiz</button>
            </div>
        </div>
    `;
    
    // Initialize quiz state
    const quizState = {
        currentQuestion: 0,
        answers: {},
        startTime: new Date(),
        timeRemaining: quiz.timeLimit
    };
    
    // Load first question
    renderQuestion(quiz, quizState);
    
    // Set up timer
    const timerInterval = setInterval(() => {
        quizState.timeRemaining--;
        document.getElementById('quiz-timer').textContent = formatTime(quizState.timeRemaining);
        
        if (quizState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitQuiz(quiz, quizState);
        }
    }, 1000);
    
    // Set up navigation buttons
    document.getElementById('next-btn').addEventListener('click', () => {
        if (quizState.currentQuestion < quiz.questions.length - 1) {
            quizState.currentQuestion++;
            renderQuestion(quiz, quizState);
        } else {
            document.getElementById('next-btn').style.display = 'none';
            document.getElementById('submit-btn').style.display = 'block';
        }
    });
    
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (quizState.currentQuestion > 0) {
            quizState.currentQuestion--;
            renderQuestion(quiz, quizState);
        }
    });
    
    document.getElementById('submit-btn').addEventListener('click', () => {
        clearInterval(timerInterval);
        submitQuiz(quiz, quizState);
    });
}

function renderQuestion(quiz, state) {
    const question = quiz.questions[state.currentQuestion];
    const container = document.getElementById('question-container');
    
    // Update progress indicators
    document.getElementById('quiz-progress').style.width = 
        `${(state.currentQuestion + 1) / quiz.questions.length * 100}%`;
    document.querySelector('.question-counter').textContent = 
        `Question ${state.currentQuestion + 1}/${quiz.questions.length}`;
    
    // Enable/disable navigation buttons
    document.getElementById('prev-btn').disabled = state.currentQuestion === 0;
    
    // Render based on question type
    switch(question.type) {
        case 'multiple-choice':
            renderMultipleChoiceQuestion(container, question, state);
            break;
        case 'code-debugging':
            renderCodeDebuggingQuestion(container, question, state);
            break;
        default:
            container.innerHTML = '<p>Unsupported question type</p>';
    }
}

function renderMultipleChoiceQuestion(container, question, state) {
    // Generate options HTML
    const optionsHTML = question.options.map((option, index) => {
        const isSelected = state.answers[question.id] === option;
        return `
            <div class="option ${isSelected ? 'selected' : ''}" data-value="${option}">
                <span class="option-marker">${String.fromCharCode(65 + index)}</span>
                <span class="option-text">${option}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="question-text">${question.question}</div>
        <div class="options-container">
            ${optionsHTML}
        </div>
    `;
    
    // Add click handlers for options
    container.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove previous selection
            container.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Select current option
            option.classList.add('selected');
            
            // Save answer
            state.answers[question.id] = option.dataset.value;
        });
    });
}

// Submit quiz function
function submitQuiz(quiz, state) {
    let score = 0;
    const results = [];
    
    // Calculate score
    quiz.questions.forEach(question => {
        const userAnswer = state.answers[question.id] || null;
        const isCorrect = userAnswer === question.correctAnswer;
        
        if (isCorrect) {
            score += quiz.points / quiz.questions.length;
        }
        
        results.push({
            questionId: question.id,
            userAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect
        });
    });
    
    // Show results
    showQuizResults(quiz, score, results);
    
    // Save to Firebase
    if (window.Telegram && window.Telegram.WebApp) {
        const userId = window.Telegram.WebApp.initDataUnsafe.user.id;
        saveQuizResults(userId, quiz.id, score, results);
    }
}

function showQuizResults(quiz, score, results) {
    const container = document.getElementById('main-container');
    const correctCount = results.filter(r => r.isCorrect).length;
    
    // Calculate percentage
    const percentage = Math.round((correctCount / quiz.questions.length) * 100);
    
    // Determine feedback message
    let feedbackMessage = '';
    if (percentage >= 90) {
        feedbackMessage = 'Excellent! You\'re a coding master!';
    } else if (percentage >= 70) {
        feedbackMessage = 'Good job! Keep practicing!';
    } else if (percentage >= 50) {
        feedbackMessage = 'Not bad, but you can do better!';
    } else {
        feedbackMessage = 'Keep studying and try again!';
    }
    
    // Create results HTML
    container.innerHTML = `
        <div class="quiz-results">
            <h2>Quiz Results</h2>
            <div class="score-container">
                <div class="score-circle">
                    <span class="score-percentage">${percentage}%</span>
                    <span class="score-text">${correctCount}/${quiz.questions.length}</span>
                </div>
            </div>
            <p class="feedback">${feedbackMessage}</p>
            <div class="buttons-container">
                <button id="review-btn">Review Answers</button>
                <button id="retry-btn">Try Again</button>
                <button id="home-btn">Back to Home</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('review-btn').addEventListener('click', () => {
        showQuizReview(quiz, results);
    });
    
    document.getElementById('retry-btn').addEventListener('click', () => {
        loadQuiz(quiz.id);
    });
    
    document.getElementById('home-btn').addEventListener('click', () => {
        loadMainMenu();
    });
    
    // Show confetti for good results
    if (percentage >= 70) {
        showConfetti();
    }
} 