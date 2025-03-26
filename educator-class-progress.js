/**
 * Render class progress
 * @param {Object} classData - Class data
 * @param {Array} students - Array of student objects
 * @returns {string} HTML for the progress panel
 */
function renderClassProgress(classData, students) {
    const totalStudents = students.length;
    const activeStudents = students.filter(student => student.lastActivity && student.lastActivity >= Date.now() - 30 * 24 * 60 * 60 * 1000).length;
    
    return `
        <div class="progress-summary">
            <h4>Class Progress Overview</h4>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-label">Total Students</div>
                    <div class="stat-value">${totalStudents}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Active Students (Last 30 Days)</div>
                    <div class="stat-value">${activeStudents}</div>
                </div>
            </div>
        </div>
    `;
} 