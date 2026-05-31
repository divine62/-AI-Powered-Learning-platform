import { useState, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf";

const API = "http://127.0.0.1:5000";

export default function NotesPage() {
  const token = localStorage.getItem("kt_token");
  const fileInputRef = useRef();

  // Form state
  const [subject, setSubject] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState([]);
  const [pyqs, setPyqs] = useState("");
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [parsingSyllabus, setParsingSyllabus] = useState(false);

  // Video reference popup
  const [videoRef, setVideoRef] = useState(null);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [includeVideo, setIncludeVideo] = useState(false);

  // Generated notes
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const addTopic = (e) => {
    if ((e.key === "Enter" || e.key === ",") && topicInput.trim()) {
      e.preventDefault();
      const val = topicInput.trim().replace(/,$/, "");
      if (val && !topics.includes(val)) setTopics((p) => [...p, val]);
      setTopicInput("");
    }
  };
  const removeTopic = (t) => setTopics(topics.filter((x) => x !== t));
  const allTopics = [...new Set([...syllabusTopics, ...topics])];

  // ─── Syllabus upload ──────────────────────────────────────────────────────

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processSyllabus(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) processSyllabus(file);
  };

  const processSyllabus = async (file) => {
    setSyllabusFile(file);
    setParsingSyllabus(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/api/parse_syllabus`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      });
      const parsed = res.data.topics || [];
      setSyllabusTopics(parsed);
      if (res.data.subject && !subject) setSubject(res.data.subject);
    } catch (err) {
      console.error("Syllabus parse error:", err);
    }
    setParsingSyllabus(false);
  };

  // ─── Check watch history ──────────────────────────────────────────────────

  const checkWatchHistory = async (subj) => {
    if (!subj.trim()) return;
    try {
      const res = await axios.get(`${API}/api/watch-history/last?subject=${encodeURIComponent(subj)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.video) {
        setVideoRef(res.data.video);
        setShowVideoPopup(true);
      }
    } catch (_) {}
  };

  // ─── Generate notes ───────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    if (!showVideoPopup && !videoRef) await checkWatchHistory(subject);

    setGenerating(true);
    setNotes(null);
    setSaved(false);
    try {
      const res = await axios.post(
        `${API}/api/notes/generate`,
        {
          subject,
          topics: allTopics,
          pyqs,
          video: includeVideo ? videoRef : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(res.data);
    } catch (err) {
      console.error("Notes generation error:", err);
      alert("Failed to generate notes. Please try again.");
    }
    setGenerating(false);
  };

  // ─── Save notes ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!notes) return;
    setSaving(true);
    try {
      await axios.post(`${API}/api/notes`, notes, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSaved(true);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save notes.");
    }
    setSaving(false);
  };

  // ─── Download PDF ─────────────────────────────────────────────────────────

  const handleDownloadPDF = () => {
    if (!notes) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 48;
    const contentW = W - margin * 2;
    let y = margin;

    const addLine = (height = 12) => {
      y += height;
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Header bar
    doc.setFillColor(200, 168, 130);
    doc.rect(0, 0, W, 52, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(6, 6, 6);
    doc.text("KNOWTIFY", margin, 33);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Learning Platform", margin, 46);

    y = 72;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(6, 6, 6);
    doc.text(notes.title || `${subject} Notes`, margin, y);
    addLine(8);

    // Subject / Date line
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 100, 80);
    const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    doc.text(`Subject: ${subject}   •   Generated: ${dateStr}`, margin, y);
    addLine(6);

    // Tags
    if (notes.tags?.length) {
      doc.setFontSize(8);
      doc.setTextColor(160, 130, 100);
      doc.text(`Tags: ${notes.tags.join("  ·  ")}`, margin, y);
      addLine(6);
    }

    // Divider
    doc.setDrawColor(200, 168, 130);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    addLine(14);

    // Summary
    if (notes.summary) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 20, 10);
      doc.text("Summary", margin, y);
      addLine(12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 40, 30);
      const summaryLines = doc.splitTextToSize(notes.summary, contentW);
      doc.text(summaryLines, margin, y);
      addLine(summaryLines.length * 13 + 8);
    }

    // Sections
    const sections = notes.sections || [];
    sections.forEach((sec) => {
      if (y > 700) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(140, 100, 60);
      doc.text(sec.heading || sec.title || "", margin, y);
      addLine(12);

      if (sec.content) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(40, 30, 20);
        const lines = doc.splitTextToSize(sec.content, contentW);
        doc.text(lines, margin, y);
        addLine(lines.length * 13 + 8);
      }

      if (sec.key_points?.length) {
        sec.key_points.forEach((pt) => {
          if (y > 720) { doc.addPage(); y = margin; }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(50, 40, 30);
          const ptLines = doc.splitTextToSize(`• ${pt}`, contentW - 10);
          doc.text(ptLines, margin + 8, y);
          addLine(ptLines.length * 12 + 4);
        });
        addLine(4);
      }
    });

    // Exam Tips
    if (notes.exam_tips?.length) {
      if (y > 680) { doc.addPage(); y = margin; }
      doc.setFillColor(250, 244, 235);
      doc.setDrawColor(200, 168, 130);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y - 4, contentW, 18 + notes.exam_tips.length * 16, 4, 4, "FD");
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(140, 100, 60);
      doc.text("✦ Exam Tips", margin + 10, y);
      addLine(14);
      notes.exam_tips.forEach((tip) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(60, 45, 30);
        const tipLines = doc.splitTextToSize(`→ ${tip}`, contentW - 20);
        doc.text(tipLines, margin + 10, y);
        addLine(tipLines.length * 13 + 2);
      });
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 160, 130);
      doc.text(`Knowtify — ${subject}`, margin, doc.internal.pageSize.getHeight() - 20);
      doc.text(`${i} / ${totalPages}`, W - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    }

    doc.save(`${subject.replace(/\s+/g, "_")}_Notes_Knowtify.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="notes-page">
      <style>{`
        .notes-page {
          min-height: 100vh;
          padding: 2.5rem 2rem 5rem;
          max-width: 860px;
          margin: 0 auto;
          font-family: 'Syne', sans-serif;
        }
        .np-header { margin-bottom: 2.5rem; }
        .np-header h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 4vw, 3rem);
          color: var(--nude, #C8A882);
          margin: 0 0 0.4rem;
          font-weight: 600;
        }
        .np-header p {
          color: rgba(200,168,130,0.5);
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .np-section {
          margin-bottom: 1.8rem;
        }
        .np-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(200,168,130,0.6);
          margin-bottom: 0.55rem;
          display: block;
        }
        .np-input {
          width: 100%;
          box-sizing: border-box;
          background: var(--card-bg, rgba(255,255,255,0.04));
          border: 1px solid var(--card-border, rgba(200,168,130,0.15));
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: var(--nude, #C8A882);
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .np-input:focus { border-color: var(--nude, #C8A882); }
        .np-input::placeholder { color: rgba(200,168,130,0.3); }
        textarea.np-input {
          resize: vertical;
          min-height: 110px;
          line-height: 1.6;
        }
        .np-drop-zone {
          border: 2px dashed var(--card-border, rgba(200,168,130,0.2));
          border-radius: 12px;
          padding: 2.5rem;
          text-align: center;
          cursor: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .np-drop-zone.drag-over {
          border-color: var(--nude, #C8A882);
          background: rgba(200,168,130,0.04);
        }
        .np-drop-icon { font-size: 2rem; margin-bottom: 0.6rem; }
        .np-drop-text {
          font-family: 'DM Mono', monospace;
          font-size: 0.78rem;
          color: rgba(200,168,130,0.5);
          line-height: 1.6;
        }
        .np-drop-text span { color: var(--nude, #C8A882); text-decoration: underline; cursor: none; }
        .np-file-name {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: rgba(200,168,130,0.7);
          margin-top: 0.5rem;
        }
        .topic-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.5rem;
        }
        .topic-chip {
          background: rgba(200,168,130,0.12);
          border: 1px solid rgba(200,168,130,0.25);
          border-radius: 999px;
          padding: 0.25rem 0.75rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: var(--nude, #C8A882);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .topic-chip.from-syllabus {
          background: rgba(200,168,130,0.06);
          border-style: dashed;
          opacity: 0.75;
        }
        .chip-remove { opacity: 0.5; cursor: none; }
        .chip-remove:hover { opacity: 1; }
        .np-gen-btn {
          width: 100%;
          padding: 1rem;
          background: var(--nude, #C8A882);
          color: var(--black, #060606);
          border: none;
          border-radius: 10px;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: none;
          transition: opacity 0.2s, transform 0.15s;
          margin-top: 0.5rem;
        }
        .np-gen-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .np-gen-btn:disabled { opacity: 0.4; }
        /* Video popup */
        .video-popup-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(6,6,6,0.7);
          backdrop-filter: blur(6px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .video-popup {
          background: #0f0d0a;
          border: 1px solid rgba(200,168,130,0.25);
          border-radius: 16px;
          padding: 2rem;
          max-width: 420px;
          width: 100%;
        }
        .video-popup h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          color: var(--nude, #C8A882);
          margin: 0 0 0.4rem;
        }
        .video-popup p {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: rgba(200,168,130,0.55);
          margin: 0 0 1.2rem;
          line-height: 1.6;
        }
        .video-ref-card {
          display: flex;
          gap: 0.8rem;
          align-items: center;
          background: rgba(200,168,130,0.06);
          border: 1px solid rgba(200,168,130,0.15);
          border-radius: 10px;
          padding: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .video-ref-thumb {
          width: 80px;
          height: 52px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .video-ref-info { flex: 1; min-width: 0; }
        .video-ref-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.8rem;
          color: var(--nude, #C8A882);
          margin: 0 0 0.2rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .video-ref-channel {
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          color: rgba(200,168,130,0.45);
          margin: 0;
        }
        .popup-btns { display: flex; gap: 0.75rem; }
        .popup-btn {
          flex: 1;
          padding: 0.65rem;
          border-radius: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: none;
          border: none;
          transition: opacity 0.2s;
        }
        .popup-btn-yes { background: var(--nude, #C8A882); color: #060606; }
        .popup-btn-no { background: rgba(200,168,130,0.1); color: rgba(200,168,130,0.7); }
        .popup-btn:hover { opacity: 0.8; }
        /* Generated notes */
        .notes-output {
          margin-top: 2.5rem;
        }
        .notes-output-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .notes-output h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.8rem;
          color: var(--nude, #C8A882);
          margin: 0 0 0.3rem;
          font-weight: 600;
        }
        .notes-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.5rem;
        }
        .notes-tag {
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          color: rgba(200,168,130,0.6);
          background: rgba(200,168,130,0.08);
          border: 1px solid rgba(200,168,130,0.15);
          border-radius: 999px;
          padding: 0.18rem 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .notes-action-btns {
          display: flex;
          gap: 0.6rem;
          flex-shrink: 0;
        }
        .notes-btn {
          padding: 0.55rem 1.2rem;
          border-radius: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          cursor: none;
          border: none;
          transition: opacity 0.2s;
          white-space: nowrap;
        }
        .notes-btn-save {
          background: var(--nude, #C8A882);
          color: #060606;
        }
        .notes-btn-save:disabled { opacity: 0.5; }
        .notes-btn-pdf {
          background: rgba(200,168,130,0.12);
          color: var(--nude, #C8A882);
          border: 1px solid rgba(200,168,130,0.25);
        }
        .notes-btn:hover:not(:disabled) { opacity: 0.8; }
        .notes-summary {
          background: rgba(200,168,130,0.06);
          border-left: 3px solid var(--nude, #C8A882);
          border-radius: 0 8px 8px 0;
          padding: 1rem 1.2rem;
          margin-bottom: 1.8rem;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem;
          color: rgba(200,168,130,0.8);
          line-height: 1.7;
        }
        .notes-section {
          margin-bottom: 1.8rem;
        }
        .notes-section-heading {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem;
          color: var(--nude, #C8A882);
          margin: 0 0 0.8rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(200,168,130,0.12);
          font-weight: 600;
        }
        .notes-section-content {
          font-family: 'Syne', sans-serif;
          font-size: 0.88rem;
          color: rgba(200,168,130,0.75);
          line-height: 1.8;
          margin-bottom: 0.8rem;
        }
        .notes-key-points { list-style: none; padding: 0; margin: 0; }
        .notes-key-points li {
          font-family: 'DM Mono', monospace;
          font-size: 0.8rem;
          color: rgba(200,168,130,0.7);
          padding: 0.35rem 0 0.35rem 1.2rem;
          position: relative;
          line-height: 1.6;
        }
        .notes-key-points li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--nude, #C8A882);
          opacity: 0.5;
        }
        .notes-exam-tips {
          background: rgba(200,168,130,0.05);
          border: 1px solid rgba(200,168,130,0.2);
          border-radius: 12px;
          padding: 1.2rem 1.4rem;
          margin-top: 2rem;
        }
        .notes-exam-tips h4 {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--nude, #C8A882);
          margin: 0 0 0.8rem;
        }
        .notes-exam-tips ul { list-style: none; padding: 0; margin: 0; }
        .notes-exam-tips li {
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem;
          color: rgba(200,168,130,0.75);
          padding: 0.3rem 0 0.3rem 1.2rem;
          position: relative;
          line-height: 1.6;
        }
        .notes-exam-tips li::before {
          content: '✦';
          position: absolute;
          left: 0;
          font-size: 0.6rem;
          color: var(--nude, #C8A882);
          top: 0.45rem;
        }
        .generating-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(200,168,130,0.4);
        }
        .generating-state .spinner {
          width: 30px;
          height: 30px;
          border: 2px solid rgba(200,168,130,0.15);
          border-top-color: var(--nude, #C8A882);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }
        .generating-state p {
          font-family: 'DM Mono', monospace;
          font-size: 0.78rem;
          letter-spacing: 0.06em;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .divider {
          border: none;
          border-top: 1px solid rgba(200,168,130,0.1);
          margin: 2rem 0;
        }
        .saved-badge {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: #7ec87e;
          letter-spacing: 0.06em;
          padding-top: 0.3rem;
        }
      `}</style>

      {/* Video popup */}
      {showVideoPopup && videoRef && (
        <div className="video-popup-backdrop">
          <div className="video-popup">
            <h3>Include watched video?</h3>
            <p>We found a video you recently watched on this topic — add it as a reference for richer notes.</p>
            <div className="video-ref-card">
              {videoRef.thumbnail && (
                <img src={videoRef.thumbnail} alt={videoRef.title} className="video-ref-thumb" />
              )}
              <div className="video-ref-info">
                <p className="video-ref-title">{videoRef.title}</p>
                <p className="video-ref-channel">{videoRef.channel}</p>
              </div>
            </div>
            <div className="popup-btns">
              <button
                className="popup-btn popup-btn-yes"
                onClick={() => { setIncludeVideo(true); setShowVideoPopup(false); }}
              >
                Yes, include it
              </button>
              <button
                className="popup-btn popup-btn-no"
                onClick={() => { setIncludeVideo(false); setShowVideoPopup(false); }}
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="np-header">
        <h1>AI Notes</h1>
        <p>Generate intelligent notes from your syllabus & PYQs</p>
      </div>

      {/* Syllabus upload */}
      <div className="np-section">
        <span className="np-label">Upload Syllabus (optional)</span>
        <div
          className={`np-drop-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
          {parsingSyllabus ? (
            <p className="np-drop-text">⏳ Parsing syllabus...</p>
          ) : (
            <>
              <div className="np-drop-icon">📄</div>
              <p className="np-drop-text">
                Drag & drop your syllabus PDF or image here<br />
                or <span>browse to upload</span>
              </p>
            </>
          )}
          {syllabusFile && !parsingSyllabus && (
            <p className="np-file-name">✓ {syllabusFile.name}</p>
          )}
        </div>
        {syllabusTopics.length > 0 && (
          <div className="topic-chips" style={{ marginTop: "0.8rem" }}>
            {syllabusTopics.map((t) => (
              <span key={t} className="topic-chip from-syllabus">
                {t} <span style={{ opacity: 0.4, fontSize: "0.65rem" }}>syllabus</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="np-section">
        <label className="np-label">Subject *</label>
        <input
          className="np-input"
          placeholder="e.g. Operating Systems, Organic Chemistry..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={(e) => e.target.value && checkWatchHistory(e.target.value)}
        />
      </div>

      {/* Topics */}
      <div className="np-section">
        <label className="np-label">Additional Topics (press Enter to add)</label>
        <input
          className="np-input"
          placeholder="e.g. Memory Management, Scheduling..."
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          onKeyDown={addTopic}
        />
        {topics.length > 0 && (
          <div className="topic-chips">
            {topics.map((t) => (
              <span key={t} className="topic-chip">
                {t}
                <span className="chip-remove" onClick={() => removeTopic(t)}>✕</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* PYQs */}
      <div className="np-section">
        <label className="np-label">Previous Year Questions (optional)</label>
        <textarea
          className="np-input"
          placeholder="Paste any PYQs here to tailor notes for exam patterns..."
          value={pyqs}
          onChange={(e) => setPyqs(e.target.value)}
        />
      </div>

      <button
        className="np-gen-btn"
        onClick={handleGenerate}
        disabled={generating || !subject.trim()}
      >
        {generating ? "Generating Notes..." : "✦ Generate AI Notes"}
      </button>

      {/* Results */}
      {generating && (
        <div className="generating-state">
          <div className="spinner" />
          <p>Crafting your notes with Gemini AI...</p>
        </div>
      )}

      {notes && !generating && (
        <div className="notes-output">
          <hr className="divider" />
          <div className="notes-output-header">
            <div>
              <h2>{notes.title || `${subject} Notes`}</h2>
              {notes.tags?.length > 0 && (
                <div className="notes-tags">
                  {notes.tags.map((t) => (
                    <span key={t} className="notes-tag">{t}</span>
                  ))}
                </div>
              )}
              {saved && <p className="saved-badge">✓ Saved to your notes</p>}
            </div>
            <div>
              <div className="notes-action-btns">
                <button
                  className="notes-btn notes-btn-save"
                  onClick={handleSave}
                  disabled={saving || saved}
                >
                  {saved ? "Saved ✓" : saving ? "Saving..." : "Save Notes"}
                </button>
                <button className="notes-btn notes-btn-pdf" onClick={handleDownloadPDF}>
                  ↓ PDF
                </button>
              </div>
            </div>
          </div>

          {notes.summary && (
            <div className="notes-summary">{notes.summary}</div>
          )}

          {(notes.sections || []).map((sec, i) => (
            <div className="notes-section" key={i}>
              <h3 className="notes-section-heading">{sec.heading || sec.title}</h3>
              {sec.content && <p className="notes-section-content">{sec.content}</p>}
              {sec.key_points?.length > 0 && (
                <ul className="notes-key-points">
                  {sec.key_points.map((pt, j) => <li key={j}>{pt}</li>)}
                </ul>
              )}
            </div>
          ))}

          {notes.exam_tips?.length > 0 && (
            <div className="notes-exam-tips">
              <h4>Exam Tips</h4>
              <ul>
                {notes.exam_tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}