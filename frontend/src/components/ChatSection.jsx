import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import OCRModal from "./OCRModal";

function formatMessageText(text) {
  return text.replace(
    /@([\w\s\-.]+\.(?:pdf|png|jpg|jpeg|txt|doc|docx))/gi,
    '<span class="document-mention">@$1</span>'
  );
}

function generateAIResponse(userMessage, documents) {
  const lower = userMessage.toLowerCase();
  const mentionRegex = /@([\w\s\-.]+\.(?:pdf|png|jpg|jpeg|txt|doc|docx))/gi;
  const mentions = (userMessage.match(mentionRegex) || []).map(m => m.substring(1));
  if (mentions.length > 0) {
    const docList = mentions.map(d => `@${d}`).join(", ");
    if (lower.includes("summarize") || lower.includes("summary"))
      return `I've analyzed ${docList}. Here's a summary:\n\nThe document covers key concepts in the subject matter, presenting foundational principles and practical applications. Main topics include theoretical frameworks, methodologies, and case studies that demonstrate real-world implementation.\n\nWould you like me to dive deeper into any specific section?`;
    if (lower.includes("quiz") || lower.includes("question"))
      return `Based on ${docList}, here are some quiz questions:\n\n1. What are the main concepts discussed in the document?\n2. How do these principles apply to real-world scenarios?\n3. What are the key differences between the methodologies presented?\n\nWould you like me to generate more questions or explain any of these topics?`;
    if (lower.includes("explain") || lower.includes("understand"))
      return `Let me explain the key concepts from ${docList}:\n\nThe material focuses on building a strong foundation in the subject. It introduces core principles step-by-step and demonstrates how they interconnect. The approach emphasizes practical understanding through examples and exercises.\n\nWhat specific concept would you like me to clarify further?`;
    if (lower.includes("key point") || lower.includes("important"))
      return `The key points from ${docList} are:\n\n• Core principles and foundational concepts\n• Practical applications and use cases\n• Common challenges and solutions\n• Best practices and recommendations\n\nWould you like me to elaborate on any of these points?`;
    return `I've reviewed ${docList}. This document contains valuable information about the topic. The content is well-structured and covers important concepts that are essential for understanding the subject matter.\n\nWhat specific information would you like to know about from this document?`;
  }
  if (lower.includes("hello") || lower.includes("hi"))
    return `Hello! I'm your AI study assistant. I can help you understand your documents, create quizzes, summarize content, and answer questions. Just mention a document using @ and ask me anything!`;
  if (lower.includes("help"))
    return `I'm here to help you study smarter! Here's what I can do:\n\n• Summarize your documents\n• Generate quiz questions\n• Explain complex concepts\n• Create study guides\n• Answer specific questions\n\nTry mentioning a document with @ (like @filename.pdf) and ask me about it!`;
  if (documents.length === 0)
    return `I notice you haven't uploaded any documents yet. Please upload some study materials in the "My Documents" section, then I'll be able to help you analyze and learn from them!`;
  return `I can help you with that! To give you the most accurate answer, please mention which document you'd like me to reference using @ (for example: @${documents[0]?.name || "document.pdf"}). You can click on documents in the sidebar to mention them quickly.`;
}

export default function ChatSection({ initialMessage }) {
  const { navigateTo, documents, docsLoading, addActivity, showToast } = useApp();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [mentionDrop, setMentionDrop] = useState([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const [showOCR, setShowOCR] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialMessage && !sentInitial.current) {
      sentInitial.current = true;
      setInputText(initialMessage);
      setTimeout(() => dispatchSend(initialMessage), 200);
    }
  }, [initialMessage]);

  function dispatchSend(text) {
    if (!text.trim()) return;
    setShowWelcome(false);
    setMessages(prev => [...prev, { type: "user", text, id: Date.now() }]);
    try { addActivity("chat", "AI Chat interaction", text.substring(0, 50) + (text.length > 50 ? "..." : "")); } catch { }
    setInputText("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    setMentionDrop([]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const response = generateAIResponse(text, documents);
      setMessages(prev => [...prev, { type: "ai", text: response, id: Date.now() }]);
    }, 1500 + Math.random() * 1000);
  }

  function handleSend() { dispatchSend(inputText); }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleInput(e) {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    setInputText(el.value);
    const text = el.value;
    const cursor = el.selectionStart;
    const before = text.substring(0, cursor);
    const lastAt = before.lastIndexOf("@");
    if (lastAt !== -1 && (lastAt === 0 || text[lastAt - 1] === " ")) {
      const term = before.substring(lastAt + 1).toLowerCase();
      const hits = documents.filter(d => d.name.toLowerCase().includes(term));
      setMentionDrop(hits);
      setMentionStart(lastAt);
    } else {
      setMentionDrop([]);
    }
  }

  function selectMention(docName) {
    const el = textareaRef.current;
    const text = el.value;
    const before = text.substring(0, mentionStart);
    const after = text.substring(el.selectionStart);
    const newVal = before + "@" + docName + " " + after;
    setInputText(newVal);
    setMentionDrop([]);
    el.focus();
  }

  function insertDocMention(docName) {
    const current = inputText;
    const prefix = current && !current.endsWith(" ") ? " " : "";
    const newVal = current + prefix + "@" + docName + " ";
    setInputText(newVal);
    textareaRef.current?.focus();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }

  function handleClearChat() {
    if (!window.confirm("Are you sure you want to clear the chat history?")) return;
    setMessages([]);
    setShowWelcome(true);
    showToast("Chat cleared successfully!");
  }

  // Called by OCRModal when user clicks "Send to Chat"
  function handleOCRTextExtracted(text) {
    const prefix = inputText && !inputText.endsWith(" ") ? " " : "";
    const newVal = inputText + prefix + text;
    setInputText(newVal);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      textareaRef.current.focus();
    }
    showToast("OCR text pasted into chat!");
  }

  const docIcon = (type) => type === "pdf" ? "📄" : type === "image" ? "🖼️" : "📝";

  return (
    <>
      <section className="chat-section active" id="chatSection">
        <div className="chat-header">
          <h2>
            <span className="title-icon">🤖</span>
            <span className="title-text">AI Study Assistant</span>
          </h2>
          <div className="chat-controls">
            {/* ── NEW: Image to Text button ── */}
            <button
              className="ocr-trigger-btn"
              onClick={() => setShowOCR(true)}
              title="Convert a handwritten image to text"
            >
              <span className="ocr-trigger-icon">🖼️</span>
              Image to Text
            </button>
            <button className="clear-chat-btn" onClick={handleClearChat}>Clear Chat</button>
            <button className="back-btn" onClick={() => navigateTo("hero")}>← Back to Home</button>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-sidebar">
            <h3>📚 Your Documents</h3>
            <div className="doc-list">
              {docsLoading ? (
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading documents...</p>
              ) : documents.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  No documents yet. Upload some in{" "}
                  <span
                    style={{ color: "#4da6ff", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => navigateTo("docs")}
                  >
                    My Documents
                  </span>
                  .
                </p>
              ) : (
                documents.map(doc => (
                  <div
                    key={doc._id || doc.id}
                    className="doc-item"
                    onClick={() => insertDocMention(doc.name)}
                    title={`Click to mention @${doc.name} in chat`}
                  >
                    <span className="doc-item-icon">{docIcon(doc.type)}</span>
                    <span className="doc-item-name">{doc.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chat-main">
            <div className="chat-messages" id="chatMessages">
              {showWelcome && (
                <div className="chat-welcome">
                  <div className="chat-welcome-icon">💬</div>
                  <h3>Welcome to AI Study Assistant!</h3>
                  <p>Ask me anything about your documents. Use @ to mention specific files, or click a document in the sidebar.</p>
                  <div className="suggestion-chips">
                    <div className="suggestion-chip" onClick={() => dispatchSend("Summarize my notes")}>Summarize my notes</div>
                    <div className="suggestion-chip" onClick={() => dispatchSend("Create quiz questions")}>Create quiz questions</div>
                    <div className="suggestion-chip" onClick={() => dispatchSend("Explain key concepts")}>Explain key concepts</div>
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.type}`}>
                  <div className="message-avatar">{msg.type === "user" ? "👤" : "🤖"}</div>
                  <div className="message-content">
                    <div className="message-text" dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} />
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message ai typing-indicator active">
                  <div className="message-avatar">🤖</div>
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <div className="chat-input-container">
                <div className="chat-input-wrapper">
                  <textarea
                    ref={textareaRef}
                    className="chat-input"
                    placeholder="Ask about your documents... (Use @ to mention files, or click sidebar)"
                    rows={1}
                    value={inputText}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                  />
                  {mentionDrop.length > 0 && (
                    <div className="mention-dropdown active">
                      {mentionDrop.map(doc => (
                        <div key={doc._id || doc.id} className="mention-item" onClick={() => selectMention(doc.name)}>
                          <span className="mention-item-icon">{docIcon(doc.type)}</span>
                          <span>{doc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="send-btn" onClick={handleSend}>Send 📤</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OCR Modal (portal-like, sits on top) ── */}
      {showOCR && (
        <OCRModal
          onClose={() => setShowOCR(false)}
          onTextExtracted={handleOCRTextExtracted}
        />
      )}
    </>
  );
}
