// Update user streak
function updateUserStreak(userId) {
    const userRef = database.ref(`users/${userId}`);
    
    userRef.child('stats').once('value')
        .then((snapshot) => {
            const stats = snapshot.val() || {};
            const lastActive = stats.lastActive ? new Date(stats.lastActive) : null;
            const currentDate = new Date();
            
            if (lastActive) {
                // Check if last active was yesterday
                const yesterday = new Date(currentDate);
                yesterday.setDate(yesterday.getDate() - 1);
                
                const lastActiveDay = lastActive.setHours(0, 0, 0, 0);
                const yesterdayDay = yesterday.setHours(0, 0, 0, 0);
                
                if (lastActiveDay === yesterdayDay) {
                    // Continue streak
                    userRef.child('stats').update({
                        streakDays: (stats.streakDays || 0) + 1
                    });
                } else if (lastActiveDay < yesterdayDay) {
                    // Streak broken, reset to 1
                    userRef.child('stats').update({
                        streakDays: 1
                    });
                }
                // If lastActiveDay is today, streak stays the same
            } else {
                // First time, set streak to 1
                userRef.child('stats').update({
                    streakDays: 1
                });
            }
        });
}

// Add points to user
function awardPoints(userId, points, reason) {
    const updates = {};
    
    // Add points to user total
    updates[`users/${userId}/stats/points`] = firebase.database.ServerValue.increment(points);
    
    // Record point history
    const historyRef = database.ref(`users/${userId}/pointHistory`).push();
    updates[historyRef.path] = {
        points: points,
        reason: reason,
        timestamp: new Date().toISOString()
    };
    
    // Apply all updates atomically
    database.ref().update(updates)
        .then(() => {
            // Show points animation
            showPointsAnimation(points);
        });
}

// Show points animation
function showPointsAnimation(points) {
    const pointsElement = document.createElement('div');
    pointsElement.className = 'points-popup';
    pointsElement.textContent = `+${points}`;
    
    document.body.appendChild(pointsElement);
    
    // Animate
    setTimeout(() => {
        pointsElement.classList.add('show');
    }, 10);
    
    // Remove after animation
    setTimeout(() => {
        pointsElement.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(pointsElement);
        }, 500);
    }, 2000);
}

// Show confetti animation for achievements
function showConfetti() {
    // Create canvas for confetti
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    
    document.body.appendChild(canvas);
    
    // Initialize confetti
    const confetti = window.confetti.create(canvas, {
        resize: true,
        useWorker: true
    });
    
    // Fire confetti
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
    
    // Remove canvas after animation
    setTimeout(() => {
        confetti.reset();
        document.body.removeChild(canvas);
    }, 3000);
}

// Display achievement
function showAchievement(title, description) {
    const achievementElement = document.createElement('div');
    achievementElement.className = 'achievement-popup';
    achievementElement.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
            <h3>${title}</h3>
            <p>${description}</p>
        </div>
    `;
    
    document.body.appendChild(achievementElement);
    
    // Animate in
    setTimeout(() => {
        achievementElement.classList.add('show');
    }, 10);
    
    // Animate out
    setTimeout(() => {
        achievementElement.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(achievementElement);
        }, 500);
    }, 4000);
} 