/**
 * Enhanced metrics calculation with additional data points
 * @param {Object} progressData - The student's progress data
 * @param {Date|null} cutoffDate - Optional cutoff date for filtering data
 * @returns {Object} Comprehensive metrics
 */
function calculateComprehensiveMetrics(progressData, cutoffDate = null) {
    // Initialize metrics object with default values
    const metrics = {
        // Content metrics
        totalItems: 0,
        completedItems: 0,
        completionRate: 0,
        
        // Quiz metrics
        quizzesTaken: 0,
        quizzesCompleted: 0,
        totalQuizPoints: 0,
        quizAvgScore: 0,
        quizHighScore: 0,
        quizImprovement: 0, // Score improvement over time
        
        // Time metrics
        totalTimeSpent: 0,
        timeSpentLastWeek: 0,
        timeSpentLastMonth: 0,
        avgSessionLength: 0,
        
        // Engagement metrics
        streakDays: progressData.streakDays || 0,
        totalPoints: progressData.points || 0,
        sessionsCount: 0,
        daysSinceLastActive: 0,
        activeRatio: 0, // % of days active in the period
        averageActivitiesPerSession: 0,
        
        // Progress by subject
        subjectProgress: {},
        
        // Activity timeline
        activityTimeline: []
    };
    
    // Last active timestamp
    if (progressData.lastActive) {
        metrics.lastActive = new Date(progressData.lastActive);
        metrics.daysSinceLastActive = Math.floor((new Date() - metrics.lastActive) / (1000 * 60 * 60 * 24));
    }
    
    // Determine analysis period 
    const analysisEndDate = new Date();
    const analysisStartDate = cutoffDate || new Date(analysisEndDate);
    analysisStartDate.setDate(analysisStartDate.getDate() - (cutoffDate ? 0 : 30)); // Default to 30 days if no cutoff
    
    const oneWeekAgo = new Date(analysisEndDate);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date(analysisEndDate);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    // Process activity data for timeline and sessions
    if (progressData.activity) {
        const activities = [];
        
        Object.entries(progressData.activity).forEach(([id, activity]) => {
            if (activity && activity.timestamp) {
                const timestamp = new Date(activity.timestamp);
                
                // Only include activities within the analysis period
                if (timestamp >= analysisStartDate && timestamp <= analysisEndDate) {
                    activities.push({
                        id,
                        type: activity.type || 'unknown',
                        timestamp,
                        details: activity.details || {}
                    });
                    
                    // Count time spent from activities
                    if (activity.details && activity.details.timeSpent) {
                        metrics.totalTimeSpent += activity.details.timeSpent;
                        
                        // Also track time spent by period
                        if (timestamp >= oneWeekAgo) {
                            metrics.timeSpentLastWeek += activity.details.timeSpent;
                        }
                        
                        if (timestamp >= oneMonthAgo) {
                            metrics.timeSpentLastMonth += activity.details.timeSpent;
                        }
                    }
                }
            }
        });
        
        // Sort activities chronologically
        activities.sort((a, b) => a.timestamp - b.timestamp);
        metrics.activityTimeline = activities;
        
        // Calculate active days and sessions
        const activeDays = new Set();
        let currentSession = null;
        let sessionActivities = 0;
        
        activities.forEach((activity, index) => {
            const activityDate = activity.timestamp.toDateString();
            activeDays.add(activityDate);
            
            // Session calculation (a new session starts after 30 minutes of inactivity)
            if (!currentSession || 
                (activity.timestamp - activities[index-1].timestamp) > (30 * 60 * 1000)) {
                if (currentSession) {
                    // Save previous session stats
                    metrics.averageActivitiesPerSession += sessionActivities;
                }
                
                metrics.sessionsCount++;
                sessionActivities = 1;
                currentSession = activity.timestamp;
            } else {
                sessionActivities++;
            }
        });
        
        // Add the last session
        if (sessionActivities > 0) {
            metrics.averageActivitiesPerSession += sessionActivities;
        }
        
        // Calculate average activities per session
        if (metrics.sessionsCount > 0) {
            metrics.averageActivitiesPerSession = Math.round(metrics.averageActivitiesPerSession / metrics.sessionsCount);
        }
        
        // Calculate active ratio (percentage of days within period that were active)
        const totalDays = Math.ceil((analysisEndDate - analysisStartDate) / (1000 * 60 * 60 * 24));
        metrics.activeRatio = totalDays > 0 ? (activeDays.size / totalDays) * 100 : 0;
    }
    
    // Calculate lesson completion
    if (progressData.lessons) {
        Object.entries(progressData.lessons).forEach(([lessonId, lesson]) => {
            if (!isWithinPeriod(lesson, analysisStartDate, analysisEndDate)) return;
            
            metrics.totalItems++;
            if (lesson.completed) {
                metrics.completedItems++;
            }
            
            // Track time spent if not already counted in activities
            if (lesson.timeSpent && !progressData.activity) {
                metrics.totalTimeSpent += lesson.timeSpent;
            }
            
            // Track progress by subject
            const subject = lesson.subject || 'General';
            if (!metrics.subjectProgress[subject]) {
                metrics.subjectProgress[subject] = {
                    total: 0,
                    completed: 0,
                    quizAvg: 0,
                    quizCount: 0,
                    timeSpent: 0
                };
            }
            
            metrics.subjectProgress[subject].total++;
            metrics.subjectProgress[subject].timeSpent += (lesson.timeSpent || 0);
            
            if (lesson.completed) {
                metrics.subjectProgress[subject].completed++;
            }
        });
    }
    
    // Calculate flashcard completion
    if (progressData.flashcardSets) {
        Object.entries(progressData.flashcardSets).forEach(([setId, set]) => {
            if (!isWithinPeriod(set, analysisStartDate, analysisEndDate)) return;
            
            metrics.totalItems++;
            if (set.mastered) {
                metrics.completedItems++;
            }
            
            // Track time spent if not already counted in activities
            if (set.totalTimeSpent && !progressData.activity) {
                metrics.totalTimeSpent += set.totalTimeSpent;
            }
            
            // Track progress by subject
            const subject = set.subject || 'General';
            if (!metrics.subjectProgress[subject]) {
                metrics.subjectProgress[subject] = {
                    total: 0,
                    completed: 0,
                    quizAvg: 0,
                    quizCount: 0,
                    timeSpent: 0
                };
            }
            
            metrics.subjectProgress[subject].total++;
            metrics.subjectProgress[subject].timeSpent += (set.totalTimeSpent || 0);
            
            if (set.mastered) {
                metrics.subjectProgress[subject].completed++;
            }
        });
    }
    
    // Calculate quiz performance
    if (progressData.quizzes) {
        // First sort quizzes chronologically to calculate improvement
        const sortedQuizzes = Object.entries(progressData.quizzes)
            .map(([quizId, quiz]) => ({
                id: quizId,
                ...quiz,
                completedAt: quiz.completedAt ? new Date(quiz.completedAt) : null
            }))
            .filter(quiz => quiz.completed && quiz.score !== undefined && quiz.completedAt)
            .sort((a, b) => a.completedAt - b.completedAt);
        
        // Calculate quiz metrics
        Object.entries(progressData.quizzes).forEach(([quizId, quiz]) => {
            if (!isWithinPeriod(quiz, analysisStartDate, analysisEndDate)) return;
            
            metrics.quizzesTaken++;
            
            if (quiz.completed) {
                metrics.quizzesCompleted++;
                
                if (typeof quiz.score === 'number') {
                    metrics.totalQuizPoints += quiz.score;
                    
                    // Track highest score
                    metrics.quizHighScore = Math.max(metrics.quizHighScore, quiz.score);
                    
                    // Track scores by subject
                    const subject = quiz.subject || 'General';
                    if (!metrics.subjectProgress[subject]) {
                        metrics.subjectProgress[subject] = {
                            total: 0,
                            completed: 0,
                            quizAvg: 0,
                            quizCount: 0,
                            timeSpent: 0
                        };
                    }
                    
                    metrics.subjectProgress[subject].quizAvg += quiz.score;
                    metrics.subjectProgress[subject].quizCount++;
                }
            }
            
            // Track time spent if not already counted in activities
            if (quiz.timeSpent && !progressData.activity) {
                metrics.totalTimeSpent += quiz.timeSpent;
            }
        });
        
        // Calculate average quiz score
        if (metrics.quizzesCompleted > 0) {
            metrics.quizAvgScore = metrics.totalQuizPoints / metrics.quizzesCompleted;
        }
        
        // Calculate subject quiz averages
        Object.keys(metrics.subjectProgress).forEach(subject => {
            const subjectData = metrics.subjectProgress[subject];
            if (subjectData.quizCount > 0) {
                subjectData.quizAvg = subjectData.quizAvg / subjectData.quizCount;
            }
        });
        
        // Calculate quiz improvement (compare first half with second half)
        if (sortedQuizzes.length >= 4) {
            const midpoint = Math.floor(sortedQuizzes.length / 2);
            const firstHalfQuizzes = sortedQuizzes.slice(0, midpoint);
            const secondHalfQuizzes = sortedQuizzes.slice(midpoint);
            
            const firstHalfAvg = firstHalfQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / firstHalfQuizzes.length;
            const secondHalfAvg = secondHalfQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / secondHalfQuizzes.length;
            
            metrics.quizImprovement = secondHalfAvg - firstHalfAvg;
        }
    }
    
    // Calculate average session length
    if (metrics.sessionsCount > 0) {
        metrics.avgSessionLength = metrics.totalTimeSpent / metrics.sessionsCount;
    }
    
    // Calculate final completion rate
    if (metrics.totalItems > 0) {
        metrics.completionRate = (metrics.completedItems / metrics.totalItems) * 100;
    }
    
    return metrics;
}

/**
 * Helper function to check if an item is within the selected time period
 * @param {Object} item - The item to check
 * @param {Date} startDate - The start date of the period
 * @param {Date} endDate - The end date of the period
 * @returns {boolean} True if item is within period
 */
function isWithinPeriod(item, startDate, endDate) {
    // First check if we have any date to work with
    const itemDate = item.completedAt ? new Date(item.completedAt) : 
                    (item.lastStudied ? new Date(item.lastStudied) : 
                    (item.lastAccessed ? new Date(item.lastAccessed) :
                    (item.updatedAt ? new Date(item.updatedAt) : null)));
    
    // If no date, include the item (assume it's relevant)
    if (!itemDate) return true;
    
    // Check if the date is within the period
    return itemDate >= startDate && itemDate <= endDate;
}

/**
 * Calculates an engagement score based on various metrics
 * @param {Object} metrics - The calculated metrics object
 * @returns {number} Engagement score from 0-100
 */
function calculateEngagementScore(metrics) {
    // Components for engagement score
    const components = {
        // Active time component (max 30 points)
        activeTime: Math.min(30, metrics.totalTimeSpent / 3600 * 5),
        
        // Completion component (max 25 points)
        completion: Math.min(25, metrics.completionRate / 4),
        
        // Streak component (max 15 points)
        streak: Math.min(15, metrics.streakDays * 1.5),
        
        // Session frequency component (max 15 points)
        frequency: Math.min(15, metrics.activeRatio / 6.67),
        
        // Performance component (max 15 points)
        performance: Math.min(15, metrics.quizAvgScore / 6.67)
    };
    
    // Calculate final score
    const total = Object.values(components).reduce((sum, val) => sum + val, 0);
    
    // Return rounded score
    return Math.round(total);
}

/**
 * Calculates improvement rate over time periods
 * @param {Object} progressData - The student's progress data
 * @returns {number} Improvement rate (-100 to 100)
 */
function calculateImprovementRate(progressData) {
    const currentPeriodEnd = new Date();
    const currentPeriodStart = new Date(currentPeriodEnd);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - 30);
    
    const previousPeriodEnd = new Date(currentPeriodStart);
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
    
    // Calculate metrics for both periods
    const currentMetrics = calculateComprehensiveMetrics(progressData, currentPeriodStart);
    const previousMetrics = calculateComprehensiveMetrics(progressData, previousPeriodStart);
    
    // Calculate weighted improvement factors
    const factors = {
        // Activity improvement (25%)
        activity: previousMetrics.sessionsCount > 0 ? 
            ((currentMetrics.sessionsCount - previousMetrics.sessionsCount) / previousMetrics.sessionsCount) * 25 : 0,
        
        // Time spent improvement (25%)
        timeSpent: previousMetrics.totalTimeSpent > 0 ?
            ((currentMetrics.totalTimeSpent - previousMetrics.totalTimeSpent) / previousMetrics.totalTimeSpent) * 25 : 0,
        
        // Completion rate improvement (25%)
        completion: previousMetrics.completionRate > 0 ?
            ((currentMetrics.completionRate - previousMetrics.completionRate) / previousMetrics.completionRate) * 25 : 0,
        
        // Quiz performance improvement (25%)
        quizPerformance: previousMetrics.quizAvgScore > 0 ?
            ((currentMetrics.quizAvgScore - previousMetrics.quizAvgScore) / previousMetrics.quizAvgScore) * 25 : 0
    };
    
    // Sum up improvement factors
    const totalImprovement = Object.values(factors).reduce((sum, val) => sum + val, 0);
    
    // Cap and round the value
    return Math.max(-100, Math.min(100, Math.round(totalImprovement)));
}

/**
 * Determines the color class for a completion rate
 * @param {number} rate - Completion rate percentage
 * @returns {string} CSS class name
 */
function getCompletionClass(rate) {
    if (rate >= 80) return 'high-completion';
    if (rate >= 50) return 'medium-completion';
    return 'low-completion';
}

/**
 * Determines the color class for a quiz score
 * @param {number} score - Quiz score percentage
 * @returns {string} CSS class name
 */
function getScoreClass(score) {
    if (score >= 80) return 'high-score';
    if (score >= 60) return 'medium-score';
    return 'low-score';
}

/**
 * Formats a date relative to today (Today, Yesterday, or date)
 * @param {string|Date} dateString - The date to format
 * @returns {string} Formatted date string
 */
function formatDateRelative(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
}

/**
 * Formats a timestamp as a relative time (e.g., "5 minutes ago")
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string
 */
function formatTimeAgo(date) {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
        return date.toLocaleDateString();
    } else if (diffDays > 1) {
        return `${diffDays} days ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffHours > 1) {
        return `${diffHours} hours ago`;
    } else if (diffHours === 1) {
        return '1 hour ago';
    } else if (diffMins > 1) {
        return `${diffMins} minutes ago`;
    } else if (diffMins === 1) {
        return '1 minute ago';
    } else {
        return 'Just now';
    }
} 