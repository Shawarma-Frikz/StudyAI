import { useApp } from "../context/AppContext";

export default function FeaturesSection() {
  const { navigateTo } = useApp();

  return (
    <section className="features">
      <h2>Powerful Features</h2>
      <div className="feature-grid">
        <div className="card" onClick={() => navigateTo("docs")}>
          <span className="card-icon">📄</span>
          <h3>Upload Notes</h3>
          <p>Upload PDFs, text or images. The AI extracts and organizes your lessons automatically with intelligent categorization.</p>
        </div>
        <div className="card" onClick={() => navigateTo("chat")}>
          <span className="card-icon">🤖</span>
          <h3>AI Chat</h3>
          <p>Ask anything about your courses. Get explanations, examples, and summaries instantly powered by advanced AI.</p>
        </div>
        <div className="card" onClick={() => navigateTo("docs")}>
          <span className="card-icon">📝</span>
          <h3>Auto-Quiz</h3>
          <p>Generate custom quizzes to test your knowledge and track your progress with adaptive difficulty levels.</p>
        </div>
        <div className="card" onClick={() => navigateTo("dashboard")}>
          <span className="card-icon">📊</span>
          <h3>Dashboard</h3>
          <p>Visualize your learning stats, identify weak points, and monitor progress over time with beautiful analytics.</p>
        </div>
      </div>
    </section>
  );
}
