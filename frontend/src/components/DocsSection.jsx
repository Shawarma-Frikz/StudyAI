import { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import QuizOverlay from "./QuizOverlay";

function DocCard({ doc, onDelete, onRename, onQuickSummary, onGenerateQuiz }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(doc.name);
  const inputRef = useRef(null);
  const docId = doc._id || doc.id;

  const icon = doc.type === "pdf" ? "📄" : doc.type === "image" ? "🖼️" : "📝";

  function startRename() {
    setIsEditing(true);
    setEditName(doc.name);
    setTimeout(() => { inputRef.current?.select(); }, 10);
  }

  function finishRename() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== doc.name) onRename(docId, trimmed);
    else setEditName(doc.name);
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); finishRename(); }
    if (e.key === "Escape") { setEditName(doc.name); setIsEditing(false); }
  }

  const dateStr = doc.date || (doc.createdAt ? new Date(doc.createdAt).toISOString().split("T")[0] : "");

  return (
    <div className="doc-card">
      <div className={`doc-icon ${doc.type}`}>{icon}</div>

      {isEditing ? (
        <input
          ref={inputRef}
          className="doc-name editing"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={finishRename}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <div className="doc-name" onDoubleClick={startRename}>{doc.name}</div>
      )}

      <div className="doc-meta">
        <span>{doc.size}</span>
        <span>{dateStr}</span>
      </div>

      <div className="doc-actions">
        <button className="doc-action-btn summary-btn" onClick={() => onQuickSummary(doc.name)}>✨ Quick Summary</button>
        <button className="doc-action-btn summary-btn" onClick={() => onGenerateQuiz(doc.name)}>📝 Generate Quiz</button>
        <button className="doc-action-btn rename-btn" onClick={startRename}>Rename</button>
        <button className="doc-action-btn delete-btn" onClick={() => onDelete(docId)}>Delete</button>
      </div>
    </div>
  );
}

export default function DocsSection({ onQuickSummary }) {
  const { navigateTo, documents, docsLoading, addDocuments, deleteDocument, renameDocument, showToast, currentUser, openAuth } = useApp();
  const [search, setSearch] = useState("");
  const [quizDoc, setQuizDoc] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const filtered = documents.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  function handleFiles(files) {
    if (!currentUser) {
      showToast("Please log in to upload documents", true);
      openAuth("login");
      return;
    }
    if (files.length) addDocuments(files);
  }

  function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e) { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }
  function handleInputChange(e) { handleFiles(e.target.files); e.target.value = ""; }

  function handleQuickSummary(docName) {
    if (onQuickSummary) onQuickSummary(docName);
    navigateTo("chat");
    showToast("Generating summary...");
  }

  return (
    <>
      <section className="docs-section active" id="docsSection">
        <div className="docs-header">
          <h2>
            <span className="title-icon">📚</span>
            <span className="title-text">My Documents</span>
          </h2>
          <button className="back-btn" onClick={() => navigateTo("hero")}>← Back to Home</button>
        </div>

        <div
          className={`upload-area${isDragging ? " dragover" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("generalInput").click()}
        >
          <span className="upload-icon">☁️</span>
          <h3>Upload Your Study Materials</h3>
          <p>Drag and drop files here, or click to browse</p>
          <div className="upload-btn-group">
            <button className="upload-type-btn" onClick={e => { e.stopPropagation(); document.getElementById("pdfInput").click(); }}>📄 Upload PDF</button>
            <button className="upload-type-btn" onClick={e => { e.stopPropagation(); document.getElementById("imageInput").click(); }}>🖼️ Upload Image</button>
            <button className="upload-type-btn" onClick={e => { e.stopPropagation(); document.getElementById("textInput").click(); }}>📝 Upload Text</button>
          </div>
          <input id="generalInput" type="file" className="file-input" accept=".pdf,image/*,.txt,.doc,.docx" multiple onChange={handleInputChange} />
          <input id="pdfInput" type="file" className="file-input" accept=".pdf" multiple onChange={handleInputChange} />
          <input id="imageInput" type="file" className="file-input" accept="image/*" multiple onChange={handleInputChange} />
          <input id="textInput" type="file" className="file-input" accept=".txt,.doc,.docx" multiple onChange={handleInputChange} />
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        {docsLoading ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</div>
            <h3>Loading your documents...</h3>
          </div>
        ) : !currentUser ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <h3>Log in to see your documents</h3>
            <p>Your documents are saved to your account and accessible from any device.</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="docs-grid" id="docsGrid">
            {filtered.map(doc => (
              <DocCard
                key={doc._id || doc.id}
                doc={doc}
                onDelete={deleteDocument}
                onRename={renameDocument}
                onQuickSummary={handleQuickSummary}
                onGenerateQuiz={setQuizDoc}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state" id="emptyState">
            <div className="empty-state-icon">📭</div>
            <h3>{search ? "No documents match your search" : "No documents yet"}</h3>
            <p>{search ? "Try a different search term" : "Upload your first document to get started"}</p>
          </div>
        )}
      </section>

      {quizDoc && <QuizOverlay docName={quizDoc} onClose={() => setQuizDoc(null)} />}
    </>
  );
}
