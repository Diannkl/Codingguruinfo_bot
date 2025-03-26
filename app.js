// Function to create a flashcard
function createFlashcard(cardData) {
    const container = document.getElementById('main-container');
    const flashcardElement = document.createElement('div');
    flashcardElement.className = 'flashcard';
    
    // Front of card
    const frontSide = document.createElement('div');
    frontSide.className = 'card-front';
    frontSide.innerHTML = `
        <h2>${cardData.title}</h2>
        <div class="illustration">
            <img src="${cardData.illustration}" alt="${cardData.title}">
        </div>
    `;
    
    // Back of card
    const backSide = document.createElement('div');
    backSide.className = 'card-back';
    backSide.innerHTML = `
        <div class="explanation">
            <img src="${cardData.animatedExplanation}" alt="Explanation">
        </div>
        <pre class="code-snippet"><code>${cardData.codeSnippet}</code></pre>
        <button class="practice-btn">Practice Now</button>
    `;
    
    // Add to DOM
    flashcardElement.appendChild(frontSide);
    flashcardElement.appendChild(backSide);
    container.appendChild(flashcardElement);
    
    // Add flip animation event
    flashcardElement.addEventListener('click', function() {
        this.classList.toggle('flipped');
        
        // Track interaction in Firebase
        if (window.Telegram && window.Telegram.WebApp) {
            const userId = window.Telegram.WebApp.initDataUnsafe.user.id;
            trackCardFlip(userId, cardData.id);
        }
    });
    
    // Practice button event
    backSide.querySelector('.practice-btn').addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent card flip
        loadPracticeExercise(cardData.id);
    });
    
    // Load syntax highlighting
    highlightCode();
}

// Function to track card flip in Firebase
function trackCardFlip(userId, cardId) {
    const ref = database.ref(`users/${userId}/cards/${cardId}`);
    ref.update({
        lastViewed: new Date().toISOString(),
        viewCount: firebase.database.ServerValue.increment(1)
    });
} 