import { useApp, getTimeAgo } from "../context/AppContext";

function getAverageScore(quizHistory) {
  if (!quizHistory.length) return 0;
  return Math.round(quizHistory.reduce((s, q) => s + q.score, 0) / quizHistory.length);
}

function calculateWeakTopics(quizHistory) {
  if (!quizHistory.length) return [];
  const docScores = {};
  quizHistory.forEach(q => {
    if (!docScores[q.documentName]) docScores[q.documentName] = [];
    docScores[q.documentName].push(q.score);
  });
  return Object.entries(docScores)
    .map(([name, scores]) => ({ name, avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), attempts: scores.length }))
    .filter(t => t.avgScore < 70)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);
}

function getDocProgress(quizHistory) {
  const docProgress = {};
  quizHistory.forEach(q => {
    if (!docProgress[q.documentName]) docProgress[q.documentName] = [];
    docProgress[q.documentName].push(q.score);
  });
  return Object.entries(docProgress).slice(0, 5).map(([name, scores]) => ({
    name,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    latestScore: scores[scores.length - 1],
  }));
}

export default function DashboardSection() {
  const { navigateTo, documents, learningData } = useApp();
  const { quizHistory, activityLog, studyStreak } = learningData;

  const hasData = documents.length > 0 || quizHistory.length > 0 || activityLog.length > 0;
  const avgScore = getAverageScore(quizHistory);
  const weakTopics = calculateWeakTopics(quizHistory);
  const docProgress = getDocProgress(quizHistory);

  const activityIcon = (type) =>
    type === "quiz" ? "📝" : type === "upload" ? "📄" : type === "chat" ? "💬" : "✨";

  return (
    <section className="dashboard-section active" id="dashboardSection">
      <div className="dashboard-header">
        <h2>
          <span className="title-icon">📊</span>
          <span className="title-text">Learning Dashboard</span>
        </h2>
        <button className="back-btn" onClick={() => navigateTo("hero")}>← Back to Home</button>
      </div>

      {hasData ? (
        <div id="dashboardContent">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">📄</span>
              <div className="stat-value">{documents.length}</div>
              <div className="stat-label">Documents Uploaded</div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📝</span>
              <div className="stat-value">{quizHistory.length}</div>
              <div className="stat-label">Quizzes Completed</div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎯</span>
              <div className="stat-value">{avgScore}%</div>
              <div className="stat-label">Average Score</div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🔥</span>
              <div className="stat-value">{studyStreak}</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>

          <div className="dashboard-row">
            <div className="dashboard-card">
              <h3>📈 Learning Progress</h3>
              {docProgress.length === 0
                ? <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 20 }}>No quiz data yet. Complete quizzes to see progress!</p>
                : docProgress.map(({ name, latestScore }) => (
                  <div key={name} className="progress-item">
                    <div className="progress-header">
                      <span className="progress-label">{name}</span>
                      <span className="progress-percentage">{latestScore}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${latestScore}%` }}></div>
                    </div>
                  </div>
                ))
              }
            </div>

            <div className="dashboard-card">
              <h3>⚠️ Topics to Review</h3>
              {weakTopics.length === 0
                ? <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 20 }}>🎉 No weak topics! Keep up the great work!</p>
                : weakTopics.map(topic => (
                  <div key={topic.name} className="weak-topic-item">
                    <span className="weak-topic-icon">⚠️</span>
                    <div className="weak-topic-content">
                      <div className="weak-topic-name">{topic.name}</div>
                      <div className="weak-topic-score">
                        Average: {topic.avgScore}% • {topic.attempts} attempt{topic.attempts > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="dashboard-card">
            <h3>📅 Recent Activity</h3>
            <div className="activity-timeline">
              {activityLog.length === 0
                ? <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 20 }}>No recent activity</p>
                : activityLog.map((activity, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-icon-wrapper">{activityIcon(activity.type)}</div>
                    <div className="activity-content">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-description">{activity.description}</div>
                      <div className="activity-time">{getTimeAgo(activity.timestamp)}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-dashboard">
          <div className="empty-dashboard-icon">📊</div>
          <h3>No Learning Data Yet</h3>
          <p>Start uploading documents and taking quizzes to see your progress!</p>
          <button className="empty-dashboard-btn" onClick={() => navigateTo("docs")}>Upload Documents</button>
        </div>
      )}
    </section>
  );
}
