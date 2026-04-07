import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
function createMockQuiz(docName) {
  const mcq = [
    {
      type: "mcq", question: "What is the primary focus of this document?",
      options: ["Theoretical foundations", "Practical applications", "Historical context", "Future predictions"],
      correct: 0, explanation: "The document primarily emphasizes theoretical foundations and core principles."
    },
    {
      type: "mcq", question: "Which methodology is most emphasized in the material?",
      options: ["Quantitative analysis", "Qualitative research", "Mixed methods", "Experimental design"],
      correct: 2, explanation: "The material uses a mixed methods approach combining multiple perspectives."
    },
    {
      type: "mcq", question: "What is the recommended approach for beginners?",
      options: ["Jump to advanced topics", "Master fundamentals first", "Learn through trial and error", "Skip theory, focus on practice"],
      correct: 1, explanation: "The document strongly recommends mastering fundamentals before moving to advanced concepts."
    },
  ];
  const tf = [
    {
      type: "trueFalse", question: "The document suggests that practical experience is more important than theoretical knowledge.",
      options: ["True", "False"], correct: 1, explanation: "The document emphasizes the importance of both theory and practice equally."
    },
    {
      type: "trueFalse", question: "According to the material, all concepts build upon previously introduced principles.",
      options: ["True", "False"], correct: 0, explanation: "The document follows a progressive structure where each concept builds on the last."
    },
    {
      type: "trueFalse", question: "The document is primarily intended for advanced learners only.",
      options: ["True", "False"], correct: 1, explanation: "The material is designed to be accessible to learners at all levels."
    },
  ];
  const open = [
    {
      type: "open", question: "Explain the main concept discussed in this document in your own words.",
      sampleAnswer: "The document discusses fundamental principles and their practical applications, emphasizing a structured approach to learning."
    },
    {
      type: "open", question: "What are three key takeaways from this material?",
      sampleAnswer: "1) Build strong fundamentals, 2) Theory and practice are equally important, 3) Learning is progressive and cumulative."
    },
    {
      type: "open", question: "How would you apply the concepts from this document to a real-world scenario?",
      sampleAnswer: "By first understanding the theoretical framework, then identifying practical use cases, and finally implementing solutions based on the principles learned."
    },
    {
      type: "open", question: "What challenges might someone face when learning this material and how can they overcome them?",
      sampleAnswer: "Common challenges include information overload and abstract concepts. These can be overcome through consistent practice, breaking down complex topics, and seeking additional resources."
    },
  ];
  const questions = [...mcq.slice(0, 3), ...tf.slice(0, 3), ...open.slice(0, 4)];
  return { documentName: docName, questions, totalQuestions: questions.length };
}
export default function QuizOverlay({ docName, onClose }) {
  const { trackQuizCompletion, showToast } = useApp();
  const [quiz] = useState(() => createMockQuiz(docName));
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState(() => new Array(createMockQuiz(docName).questions.length).fill(null));
  const [phase, setPhase] = useState("quiz");
  const [results, setResults] = useState(null);
  useEffect(() => { showToast("Quiz generated successfully!"); }, []);
  const q = quiz.questions[qIndex];
  const typeLabel = q.type === "mcq" ? "Multiple Choice" : q.type === "trueFalse" ? "True / False" : "Open Question";
  const progress = ((qIndex + 1) / quiz.totalQuestions) * 100;
  function selectAnswer(idx) {
    setAnswers(prev => { const a = [...prev]; a[qIndex] = idx; return a; });
  }
  function saveOpenAnswer(val) {
    setAnswers(prev => { const a = [...prev]; a[qIndex] = val.trim(); return a; });
  }
  function handleSubmit() {
    const unanswered = answers.some((a, i) => {
      const q = quiz.questions[i];
      return q.type === "open" ? (!a || a.length === 0) : a === null;
    });
    if (unanswered && !window.confirm("Some questions are unanswered. Submit anyway?")) return;
    let correct = 0;
    const questionResults = [];
    quiz.questions.forEach((q, i) => {
      let isCorrect = false;
      if (q.type === "mcq" || q.type === "trueFalse") {
        isCorrect = answers[i] === q.correct;
        if (isCorrect) correct++;
      } else {
        isCorrect = answers[i] && answers[i].length > 20;
        if (isCorrect) correct += 0.5;
      }
      questionResults.push({ question: q.question, correct: isCorrect, userAnswer: answers[i] });
    });
    const percentage = Math.round((correct / quiz.totalQuestions) * 100);
    trackQuizCompletion({ documentName: quiz.documentName, score: percentage, correctAnswers: correct, totalQuestions: quiz.totalQuestions, questionResults });
    setResults({ percentage, correctCount: correct });
    setPhase("results");
  }
  function retake() {
    onClose();
    setTimeout(() => { }, 300);
  }
  const scoreInfo = (pct) => {
    if (pct < 50) return { emoji: "📚", message: "Keep studying!" };
    if (pct < 70) return { emoji: "👍", message: "Good effort!" };
    if (pct < 90) return { emoji: "🌟", message: "Great job!" };
    return { emoji: "🎉", message: "Excellent work!" };
  };
  return (
    <div className="quiz-overlay active" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quiz-container">
        <button className="quiz-close-btn" onClick={onClose}>×</button>
        {phase === "quiz" && (
          <div id="quizContent">
            <div className="quiz-header">
              <h2>📝 Quiz Time!</h2>
              <div className="quiz-doc-name">Based on: {docName}</div>
            </div>
            <div className="quiz-progress">
              <span className="quiz-progress-text">Question {qIndex + 1}/{quiz.totalQuestions}</span>
              <div className="quiz-progress-bar-container">
                <div className="quiz-progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            <div className="quiz-question-card active" data-question={qIndex}>
              <span className="question-type-badge">{typeLabel}</span>
              <div className="question-text">{q.question}</div>
              {(q.type === "mcq" || q.type === "trueFalse") ? (
                <div className="quiz-options">
                  {q.options.map((opt, i) => (
                    <label key={i} className={`quiz-option${answers[qIndex] === i ? " selected" : ""}`}
                      onClick={() => selectAnswer(i)}>
                      <input type="radio" name={`q${qIndex}`} value={i} readOnly checked={answers[qIndex] === i} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="quiz-open-input"
                  placeholder="Type your answer here..."
                  defaultValue={answers[qIndex] || ""}
                  onChange={e => saveOpenAnswer(e.target.value)}
                />
              )}
            </div>
            <div className="quiz-navigation">
              <button className="quiz-nav-btn quiz-prev-btn" disabled={qIndex === 0}
                onClick={() => setQIndex(i => i - 1)}>← Previous</button>
              {qIndex < quiz.totalQuestions - 1
                ? <button className="quiz-nav-btn quiz-next-btn" onClick={() => setQIndex(i => i + 1)}>Next →</button>
                : <button className="quiz-nav-btn quiz-submit-btn" onClick={handleSubmit}>Submit Quiz 🎯</button>
              }
            </div>
          </div>
        )}
        {(phase === "results" || phase === "review") && results && (
          <div className="quiz-results active">
            <div className={`results-summary${phase === "review" ? " hidden" : ""}`}>
              <div className="results-emoji">{scoreInfo(results.percentage).emoji}</div>
              <div className="results-score">{results.percentage}%</div>
              <div className="results-message">{scoreInfo(results.percentage).message}</div>
              <div className="results-submessage">You got {results.correctCount} out of {quiz.totalQuestions} correct</div>
              <div className="results-actions">
                <button className="results-btn review-btn" onClick={() => setPhase("review")}>📋 Review Answers</button>
                <button className="results-btn retake-btn" onClick={retake}>🔄 Retake Quiz</button>
              </div>
            </div>
            <div className={`results-breakdown${phase === "review" ? " active" : ""}`}>
              <div className="breakdown-header">
                <h3>📋 Answer Review</h3>
                <button className="back-to-results-btn" onClick={() => setPhase("results")}>← Back to Results</button>
              </div>
              <div className="breakdown-content">
                {quiz.questions.map((q, i) => {
                  const ua = answers[i];
                  const isCorrect = (q.type === "mcq" || q.type === "trueFalse")
                    ? ua === q.correct
                    : ua && ua.length > 20;
                  const answerText = (q.type === "mcq" || q.type === "trueFalse")
                    ? (ua !== null ? q.options[ua] : "Not answered")
                    : (ua || "Not answered");
                  const correctText = (q.type === "mcq" || q.type === "trueFalse") ? q.options[q.correct] : q.sampleAnswer;
                  const tLabel = q.type === "mcq" ? "Multiple Choice" : q.type === "trueFalse" ? "True/False" : "Open Question";
                  return (
                    <div key={i} className={`result-item ${isCorrect ? "correct" : "incorrect"}`}>
                      <div className="result-item-header">
                        <div className="result-item-number">{i + 1}</div>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{tLabel}</span>
                        <div className="result-item-status">{isCorrect ? "✓ Correct" : "✗ Incorrect"}</div>
                      </div>
                      <div className="result-item-question">{q.question}</div>
                      <div className="result-answer-section">
                        <div className="result-answer-label">Your Answer:</div>
                        <div className={`result-item-answer ${isCorrect ? "correct" : "incorrect"}`}>{answerText}</div>
                      </div>
                      {!isCorrect && (
                        <>
                          <div className="result-answer-section">
                            <div className="result-answer-label">Correct Answer:</div>
                            <div className="result-item-correct-answer">{correctText}</div>
                          </div>
                          {q.explanation && <div className="result-item-explanation">{q.explanation}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
