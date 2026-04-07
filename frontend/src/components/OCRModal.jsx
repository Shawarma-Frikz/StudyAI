import { useState, useCallback, useRef } from "react";


const OCR_API_URL = "http://localhost:5001";

const STAGE = { UPLOAD: "upload", SCANNING: "scanning", REVIEW: "review", DONE: "done" };

export default function OCRModal({ onClose, onTextExtracted }) {
  const [dragActive, setDragActive] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [stage, setStage] = useState(STAGE.UPLOAD);
  const [error, setError] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [filename, setFilename] = useState("ocr_result");
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setError(null);
    setStage(STAGE.UPLOAD);
    setOcrText("");
    setImage(file);
    const base = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9 _-]/g, "_");
    setFilename(base || "ocr_result");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleScan = async () => {
    if (!image) return;
    setStage(STAGE.SCANNING);
    setError(null);
    const formData = new FormData();
    formData.append("image", image);
    try {
      const res = await fetch(`${OCR_API_URL}/ocr-text`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OCR processing failed.");
      setOcrText(data.text);
      setStage(STAGE.REVIEW);
    } catch (err) {
      setError(err.message);
      setStage(STAGE.UPLOAD);
    }
  };

  const handleConfirmPDF = async () => {
    setDownloading(true);
    setError(null);
    const safeName = filename.trim() || "ocr_result";
    try {
      const res = await fetch(`${OCR_API_URL}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText, filename: safeName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "PDF generation failed.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStage(STAGE.DONE);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendToChat = () => {
    if (onTextExtracted && ocrText.trim()) {
      onTextExtracted(ocrText);
      onClose();
    }
  };

  const reset = () => {
    setImage(null);
    setImagePreview(null);
    setOcrText("");
    setFilename("ocr_result");
    setError(null);
    setStage(STAGE.UPLOAD);
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="ocr-modal-backdrop" onClick={handleBackdropClick}>
      <div className="ocr-modal-window">

        {/* Header */}
        <div className="ocr-modal-header">
          <div className="ocr-modal-title">
            <span className="ocr-modal-title-icon">🖼️</span>
            <span>Image to Text</span>
            <span className="ocr-modal-badge">OCR</span>
          </div>
          <button className="ocr-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Stage progress bar */}
        <div className="ocr-stage-bar">
          {["Upload", "Scan", "Review", "Done"].map((label, i) => {
            const stageIndex = { upload: 0, scanning: 1, review: 2, done: 3 }[stage];
            const active = i <= stageIndex;
            const current = i === stageIndex;
            return (
              <div key={label} className={`ocr-stage-step ${active ? "active" : ""} ${current ? "current" : ""}`}>
                <div className="ocr-stage-dot">{active && i < stageIndex ? "✓" : i + 1}</div>
                <span>{label}</span>
                {i < 3 && <div className={`ocr-stage-line ${active && i < stageIndex ? "filled" : ""}`} />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="ocr-modal-body">

          {/* ── UPLOAD / SCANNING ── */}
          {(stage === STAGE.UPLOAD || stage === STAGE.SCANNING) && (
            <>
              {!imagePreview ? (
                <div
                  className={`ocr-dropzone ${dragActive ? "drag-active" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onClick={() => inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files[0])} />
                  <div className="ocr-drop-icon">
                    <svg viewBox="0 0 64 64" fill="none" width="52" height="52">
                      <rect x="8" y="12" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M8 32l12-10 10 8 12-14 14 16" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                      <circle cx="22" cy="24" r="4" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M32 52v-8M28 48l4 4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="ocr-drop-title">Drop your image here</p>
                  <p className="ocr-drop-sub">or click to browse · JPG, PNG, GIF, WEBP, BMP, TIFF</p>
                </div>
              ) : (
                <div className="ocr-preview-section">
                  <div className="ocr-preview-header">
                    <span className="ocr-label">Preview</span>
                    <button className="ocr-btn-ghost" onClick={reset}>✕ Remove</button>
                  </div>
                  <div className="ocr-preview-img-wrap">
                    <img src={imagePreview} alt="Preview" className="ocr-preview-img" />
                  </div>
                  <div className="ocr-file-info">
                    <span className="ocr-file-name">{image?.name}</span>
                    <span className="ocr-file-size">{(image?.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              )}

              {error && <div className="ocr-alert"><span>⚠</span> {error}</div>}

              <button
                className={`ocr-btn-primary ${stage === STAGE.SCANNING ? "loading" : ""}`}
                onClick={handleScan}
                disabled={!image || stage === STAGE.SCANNING}
              >
                {stage === STAGE.SCANNING
                  ? <><span className="ocr-spinner" /> Scanning…</>
                  : <><span>🔍</span> Scan Image</>}
              </button>
            </>
          )}

          {/* ── REVIEW ── */}
          {stage === STAGE.REVIEW && (
            <>
              <div className="ocr-review-row">
                <img src={imagePreview} alt="Scanned" className="ocr-review-thumb" />
                <div className="ocr-review-meta">
                  <span className="ocr-label">Scanned Image</span>
                  <span className="ocr-file-name">{image?.name}</span>
                  <button className="ocr-btn-ghost" onClick={reset}>↩ Scan another</button>
                </div>
              </div>

              <div className="ocr-text-section">
                <div className="ocr-text-header">
                  <span className="ocr-label">Extracted Text</span>
                  <span className="ocr-hint">✏️ Edit before use</span>
                </div>
                <textarea
                  className="ocr-textarea"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  spellCheck={true}
                  rows={7}
                />
                <div className="ocr-char-count">{ocrText.length} characters</div>
              </div>

              <div className="ocr-filename-section">
                <span className="ocr-label">PDF Filename</span>
                <div className="ocr-filename-row">
                  <input
                    className="ocr-filename-input"
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="ocr_result"
                  />
                  <span className="ocr-filename-ext">.pdf</span>
                </div>
              </div>

              {error && <div className="ocr-alert"><span>⚠</span> {error}</div>}

              <div className="ocr-action-row">
                <button
                  className="ocr-btn-secondary"
                  onClick={handleSendToChat}
                  disabled={!ocrText.trim()}
                  title="Send extracted text directly into the chat input"
                >
                  💬 Send to Chat
                </button>
                <button
                  className={`ocr-btn-primary ${downloading ? "loading" : ""}`}
                  onClick={handleConfirmPDF}
                  disabled={!ocrText.trim() || downloading}
                >
                  {downloading
                    ? <><span className="ocr-spinner" /> Generating PDF…</>
                    : <><span>✓</span> Download PDF</>}
                </button>
              </div>
            </>
          )}

          {/* ── DONE ── */}
          {stage === STAGE.DONE && (
            <div className="ocr-done-section">
              <div className="ocr-done-icon">✓</div>
              <h3 className="ocr-done-title">PDF Downloaded!</h3>
              <p className="ocr-done-sub">
                <span className="ocr-file-name">
                  {filename.endsWith(".pdf") ? filename : `${filename}.pdf`}
                </span>{" "}
                saved to your downloads.
              </p>
              <div className="ocr-done-actions">
                <button className="ocr-btn-ghost ocr-btn-wide" onClick={() => setStage(STAGE.REVIEW)}>
                  ✏️ Edit text again
                </button>
                <button className="ocr-btn-secondary" onClick={handleSendToChat} disabled={!ocrText.trim()}>
                  💬 Send to Chat
                </button>
                <button className="ocr-btn-primary" onClick={reset}>
                  <span>✦</span> Scan another
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="ocr-modal-footer">
          Powered by OCR.space · Handwriting → Text → PDF
        </div>
      </div>
    </div>
  );
}
