// Load leaderboard data
function loadLeaderboard() {
    const container = document.getElementById('main-container');
    container.innerHTML = `
        <div class="leaderboard-container">
            <h2>Leaderboard</h2>
            <div class="leaderboard-tabs">
                <button class="tab-btn active" data-period="weekly">This Week</button>
                <button class="tab-btn" data-period="monthly">This Month</button>
                <button class="tab-btn" data-period="alltime">All Time</button>
            </div>
            <div class="leaderboard-content" id="leaderboard-list">
                <div class="loading">Loading...</div>
            </div>
        </div>
    `;
    
    // Add tab listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadLeaderboardData(btn.dataset.period);
        });
    });
    
    // Load initial data (weekly)
    loadLeaderboardData('weekly');
}

function loadLeaderboardData(period) {
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '<div class="loading">Loading...</div>';
    
    // Determine reference based on period
    let ref;
    const now = new Date();
    
    switch(period) {
        case 'weekly':
            // Get start of current week (Sunday)
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            ref = database.ref('users').orderByChild('weeklyPoints').limitToLast(20);
            break;
        case 'monthly':
            // Get start of current month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            ref = database.ref('users').orderByChild('monthlyPoints').limitToLast(20);
            break;
        case 'alltime':
            ref = database.ref('users').orderByChild('stats/points').limitToLast(20);
            break;
        default:
            ref = database.ref('users').orderByChild('stats/points').limitToLast(20);
    }
    
    // Fetch data
    ref.once('value')
        .then((snapshot) => {
            const users = [];
            
            // Process users
            snapshot.forEach((userSnapshot) => {
                const userId = userSnapshot.key;
                const userData = userSnapshot.val();
                
                users.push({
                    id: userId,
                    name: userData.firstName || 'Anonymous',
                    username: userData.username || '',
                    points: period === 'alltime' ? 
                        (userData.stats && userData.stats.points ? userData.stats.points : 0) :
                        (userData[`${period}Points`] || 0),
                    streak: userData.stats && userData.stats.streakDays ? userData.stats.streakDays : 0
                });
            });
            
            // Sort by points (highest first)
            users.sort((a, b) => b.points - a.points);
            
            // Render leaderboard
            renderLeaderboard(users);
        })
        .catch((error) => {
            leaderboardList.innerHTML = `<div class="error">Error loading leaderboard: ${error.message}</div>`;
        });
}

function renderLeaderboard(users) {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (users.length === 0) {
        leaderboardList.innerHTML = '<div class="empty-state">No data available yet</div>';
        return;
    }
    
    // Get current user ID if available
    let currentUserId = null;
    if (window.Telegram && window.Telegram.WebApp) {
        currentUserId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    
    // Create HTML
    const leaderboardHTML = users.map((user, index) => {
        const isCurrentUser = user.id === currentUserId;
        const rank = index + 1;
        
        // Determine medal for top 3
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        
        return `
            <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank">${medal || rank}</div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    ${user.username ? `<div class="user-username">@${user.username}</div>` : ''}
                </div>
                <div class="user-stats">
                    <div class="points">${user.points} pts</div>
                    <div class="streak">🔥 ${user.streak}</div>
                </div>
            </div>
        `;
    }).join('');
    
    leaderboardList.innerHTML = leaderboardHTML;
} 