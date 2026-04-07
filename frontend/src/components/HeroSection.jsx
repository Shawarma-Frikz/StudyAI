import { useApp } from "../context/AppContext";

export default function HeroSection() {
  const { navigateTo, learningData, getFormattedStudyHours } = useApp();

  const avgScore = learningData.quizHistory.length === 0
    ? 0
    : Math.round(learningData.quizHistory.reduce((s, q) => s + q.score, 0) / learningData.quizHistory.length);

  return (
    <section className="hero" id="heroSection">
      <div className="hero-text">
        <h1>Your Personal Smart Study Assistant</h1>
        <p>
          Upload your notes, ask questions, generate quizzes, and learn faster using modern AI — all in one place.
        </p>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => navigateTo("docs")}>Get Started</button>
        </div>
      </div>

      <div className="hero-image">
        <div className="glass-card">
          <div className="mock-dashboard">
            <div style={{ color: "#4da6ff", fontWeight: 600, marginBottom: 20 }}>📊 Learning Progress</div>
            <div className="mock-bar"></div>
            <div className="mock-bar" style={{ animationDelay: "0.3s" }}></div>
            <div className="mock-bar" style={{ animationDelay: "0.6s" }}></div>
            <div style={{ marginTop: 25, color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              <div style={{ margin: "10px 0" }}>✓ <span>{learningData.quizHistory.length}</span> Quizzes Completed</div>
              <div style={{ margin: "10px 0" }}>✓ <span>{avgScore}%</span> Average Quiz Score</div>
              <div style={{ margin: "10px 0" }}>✓ <span>{getFormattedStudyHours()}</span> Hours of Study</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
