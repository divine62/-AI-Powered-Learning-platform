import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "").replace(/\/api$/, "");

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n;
}

const VideoCard = ({ video, subject, token }) => {
  const handleClick = async () => {
    try {
      await axios.post(
        `${API}/api/watch-history/log`,
        {
          video_id: video.video_id,
          title: video.title,
          channel: video.channel,
          thumbnail: video.thumbnail,
          subject: subject,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Watch log error:", err);
    }
    window.open(`https://www.youtube.com/watch?v=${video.video_id}`, "_blank");
  };

  const matchColor =
    video.match_score >= 75
      ? "#b5a07a"
      : video.match_score >= 50
      ? "rgba(200,168,130,0.5)"
      : "rgba(200,168,130,0.25)";

  return (
    <div className="vf-video-card glass-card" onClick={handleClick}>
      <div className="vf-thumb-wrap">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="vf-thumb" />
        ) : (
          <div className="vf-thumb-placeholder">▶</div>
        )}
        <div className="vf-play-overlay">
          <span className="vf-play-icon">▶</span>
        </div>
        {video.duration && (
          <span className="vf-duration">{video.duration}</span>
        )}
        {video.match_score > 0 && (
          <span className="vf-match-badge" style={{ color: matchColor, borderColor: matchColor }}>
            {video.match_score}% match
          </span>
        )}
      </div>
      <div className="vf-video-info">
        <p className="vf-video-title">{video.title}</p>
        <p className="vf-video-channel">{video.channel}</p>
        <div className="vf-video-stats">
          <span>⏱ {video.duration || "—"}</span>
          <span>👁 {formatViews(video.views)}</span>
          <span>👍 {formatViews(video.likes)}</span>
        </div>
        {video.final_score > 0 && (
          <div className="vf-score-bar">
            <div className="vf-score-fill" style={{ width: `${video.final_score}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default function VideoFinderPage() {
  const token = localStorage.getItem("kt_token");
  const fileRef = useRef();

  const [subject, setSubject] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState([]);
  const [examDays, setExamDays] = useState(3);

  // Syllabus upload state
  const [fileName, setFileName] = useState("");
  const [fileIsImage, setFileIsImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseWarning, setParseWarning] = useState("");
  const [parseSuccess, setParseSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Results
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [resultMeta, setResultMeta] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  // ── Topics ──────────────────────────────────────────────────────────────────
  const addTopic = (val) => {
    const t = (val ?? topicInput).trim().replace(/,$/, "");
    if (t && !topics.includes(t)) setTopics((p) => [...p, t]);
    setTopicInput("");
  };

  const handleTopicKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTopic(); }
  };

  const removeTopic = (t) => setTopics(topics.filter((x) => x !== t));

  // ── Syllabus upload ─────────────────────────────────────────────────────────
  const isImageFile = (name) => /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(name);

  const processFile = async (file) => {
    if (!file) return;
    const isImg = isImageFile(file.name);
    setFileName(file.name);
    setFileIsImage(isImg);
    setParseWarning("");
    setParseSuccess(false);

    if (isImg) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }

    setParseLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await axios.post(`${API}/api/parse_syllabus`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.warning) setParseWarning(data.warning);
      if (data.topics?.length > 0) {
        setTopics((prev) => {
          const existing = new Set(prev.map((t) => t.toLowerCase()));
          return [...prev, ...data.topics.filter((t) => !existing.has(t.toLowerCase()))];
        });
        setParseSuccess(true);
      } else if (!data.warning) {
        setParseWarning("No topics found. Add them manually or try another file.");
      }
    } catch {
      setParseWarning("Couldn't read this file. Add topics manually.");
    }
    setParseLoading(false);
  };

  const handleFileInput = (e) => processFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const removeFile = () => {
    setFileName("");
    setFileIsImage(false);
    setParseWarning("");
    setParseSuccess(false);
    if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null); }
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!subject.trim()) { setError("Please enter a subject."); return; }
    setError("");
    setLoading(true);
    setSearched(true);
    setVideos([]);
    setResultMeta(null);
    try {
      const { data } = await axios.post(`${API}/api/videos`, {
        subject: subject.trim(),
        syllabus_topics: topics,
        exam_days: examDays,
      });
      setVideos(data.videos || []);
      setResultMeta({
        total: data.total_found,
        availableHours: data.available_hours,
        subject: data.subject,
        examDays: data.exam_days,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div className="vf-page">
      <style>{`
        .vf-page {
          min-height: 100vh;
          padding: 2.5rem 2rem 5rem;
          max-width: 1100px;
          margin: 0 auto;
          font-family: 'Syne', sans-serif;
        }
        .vf-header { margin-bottom: 2.5rem; }
        .vf-header h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 4vw, 3rem);
          color: var(--nude, #C8A882);
          margin: 0 0 0.4rem;
          font-weight: 600;
        }
        .vf-header p {
          color: rgba(200,168,130,0.5);
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .vf-form { display: grid; gap: 1.2rem; margin-bottom: 2.5rem; }
        .vf-row { display: flex; gap: 1rem; flex-wrap: wrap; }
        .vf-input-wrap { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 0.4rem; }
        .vf-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(200,168,130,0.6);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .vf-label-hint {
          font-size: 0.65rem;
          color: rgba(200,168,130,0.35);
          text-transform: none;
          letter-spacing: 0;
        }
        .vf-input {
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
        .vf-input:focus { border-color: var(--nude, #C8A882); }
        .vf-input::placeholder { color: rgba(200,168,130,0.3); }
        .vf-input[type="number"] { -moz-appearance: textfield; }
        .vf-input[type="number"]::-webkit-outer-spin-button,
        .vf-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }

        /* Upload zone */
        .vf-upload-zone {
          border: 2px dashed rgba(200,168,130,0.2);
          border-radius: 12px;
          padding: 1.8rem;
          text-align: center;
          cursor: none;
          transition: border-color 0.2s, background 0.2s;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .vf-upload-zone.drag-over,
        .vf-upload-zone:hover { border-color: rgba(200,168,130,0.45); background: rgba(200,168,130,0.03); }
        .vf-upload-zone.has-file { border-style: solid; border-color: rgba(200,168,130,0.3); padding: 1.2rem; }
        .vf-upload-icon { font-size: 1.8rem; line-height: 1; }
        .vf-upload-text {
          font-family: 'DM Mono', monospace;
          font-size: 0.78rem;
          color: rgba(200,168,130,0.5);
          line-height: 1.6;
        }
        .vf-upload-text span { color: var(--nude, #C8A882); }
        .vf-upload-hint {
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          color: rgba(200,168,130,0.3);
        }
        .vf-file-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .vf-file-name {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: rgba(200,168,130,0.7);
        }
        .vf-success-badge {
          background: rgba(100,200,100,0.12);
          border: 1px solid rgba(100,200,100,0.25);
          color: #7ec87e;
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          border-radius: 999px;
          padding: 0.15rem 0.5rem;
        }
        .vf-remove-file {
          background: none;
          border: none;
          color: rgba(200,168,130,0.4);
          font-size: 1rem;
          cursor: none;
          padding: 0 0.2rem;
          line-height: 1;
        }
        .vf-remove-file:hover { color: rgba(200,168,130,0.8); }
        .vf-img-preview {
          max-height: 100px;
          max-width: 100%;
          border-radius: 6px;
          object-fit: contain;
          margin-bottom: 0.4rem;
          opacity: 0.7;
        }
        .vf-parse-warn {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: rgba(200,168,130,0.5);
          margin-top: 0.4rem;
        }

        /* Topic chips */
        .vf-topic-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          background: var(--card-bg, rgba(255,255,255,0.04));
          border: 1px solid var(--card-border, rgba(200,168,130,0.15));
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          min-height: 44px;
          align-items: center;
          transition: border-color 0.2s;
          cursor: text;
        }
        .vf-topic-wrap:focus-within { border-color: var(--nude, #C8A882); }
        .vf-topic-chip {
          background: rgba(200,168,130,0.12);
          border: 1px solid rgba(200,168,130,0.25);
          border-radius: 999px;
          padding: 0.2rem 0.65rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: var(--nude, #C8A882);
          display: flex;
          align-items: center;
          gap: 0.35rem;
          cursor: none;
        }
        .vf-chip-remove { opacity: 0.45; cursor: none; font-size: 0.8rem; }
        .vf-chip-remove:hover { opacity: 1; }
        .vf-topic-input {
          border: none;
          background: transparent;
          outline: none;
          color: var(--nude, #C8A882);
          font-family: 'DM Mono', monospace;
          font-size: 0.82rem;
          min-width: 160px;
          flex: 1;
          padding: 0.1rem 0;
        }
        .vf-topic-input::placeholder { color: rgba(200,168,130,0.3); }

        /* Exam days stepper */
        .vf-days-wrap {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--card-bg, rgba(255,255,255,0.04));
          border: 1px solid var(--card-border, rgba(200,168,130,0.15));
          border-radius: 8px;
          overflow: hidden;
        }
        .vf-days-btn {
          background: none;
          border: none;
          color: var(--nude, #C8A882);
          font-size: 1.1rem;
          padding: 0.6rem 1rem;
          cursor: none;
          opacity: 0.6;
          transition: opacity 0.15s, background 0.15s;
          font-family: 'DM Mono', monospace;
        }
        .vf-days-btn:hover { opacity: 1; background: rgba(200,168,130,0.08); }
        .vf-days-val {
          flex: 1;
          text-align: center;
          font-family: 'DM Mono', monospace;
          font-size: 0.9rem;
          color: var(--nude, #C8A882);
          user-select: none;
        }
        .vf-days-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.62rem;
          color: rgba(200,168,130,0.35);
          padding-right: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Search button */
        .vf-search-btn {
          width: 100%;
          padding: 0.9rem;
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
          margin-top: 0.4rem;
        }
        .vf-search-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .vf-search-btn:disabled { opacity: 0.4; }

        .vf-error {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: #e07070;
          margin-top: 0.4rem;
        }

        /* Results */
        .vf-results-meta {
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .vf-results-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem;
          color: var(--nude, #C8A882);
          margin: 0 0 0.2rem;
        }
        .vf-results-sub {
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          color: rgba(200,168,130,0.4);
          letter-spacing: 0.05em;
        }
        .vf-results-count {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: rgba(200,168,130,0.45);
          white-space: nowrap;
        }
        .vf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        /* Video card */
        .vf-video-card {
          border-radius: 12px;
          overflow: hidden;
          cursor: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .vf-video-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(200,168,130,0.1);
        }
        .vf-thumb-wrap {
          position: relative;
          aspect-ratio: 16/9;
          overflow: hidden;
          background: rgba(200,168,130,0.05);
        }
        .vf-thumb { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
        .vf-video-card:hover .vf-thumb { transform: scale(1.04); }
        .vf-thumb-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; color: rgba(200,168,130,0.2);
        }
        .vf-play-overlay {
          position: absolute; inset: 0;
          background: rgba(6,6,6,0.35);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .vf-video-card:hover .vf-play-overlay { opacity: 1; }
        .vf-play-icon {
          font-size: 2.5rem;
          color: var(--nude, #C8A882);
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
        }
        .vf-duration {
          position: absolute; bottom: 0.5rem; right: 0.5rem;
          background: rgba(6,6,6,0.8);
          color: #fff; font-family: 'DM Mono', monospace; font-size: 0.68rem;
          padding: 0.15rem 0.45rem; border-radius: 4px;
        }
        .vf-match-badge {
          position: absolute; top: 0.5rem; left: 0.5rem;
          font-family: 'DM Mono', monospace; font-size: 0.65rem;
          border: 1px solid; border-radius: 999px;
          padding: 0.12rem 0.45rem;
          background: rgba(6,6,6,0.6);
        }
        .vf-video-info { padding: 0.85rem 1rem 1rem; }
        .vf-video-title {
          font-family: 'Syne', sans-serif; font-size: 0.87rem;
          color: var(--nude, #C8A882); margin: 0 0 0.3rem; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .vf-video-channel {
          font-family: 'DM Mono', monospace; font-size: 0.7rem;
          color: rgba(200,168,130,0.45); margin: 0 0 0.4rem;
        }
        .vf-video-stats {
          display: flex; gap: 0.8rem;
          font-family: 'DM Mono', monospace; font-size: 0.65rem;
          color: rgba(200,168,130,0.35);
        }
        .vf-score-bar {
          height: 2px; background: rgba(200,168,130,0.1);
          border-radius: 999px; margin-top: 0.6rem; overflow: hidden;
        }
        .vf-score-fill {
          height: 100%; background: var(--nude, #C8A882);
          border-radius: 999px; opacity: 0.5;
          transition: width 0.6s ease;
        }

        /* Empty / loading */
        .vf-empty {
          text-align: center; padding: 5rem 2rem;
          color: rgba(200,168,130,0.3);
        }
        .vf-empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
        .vf-empty p {
          font-family: 'DM Mono', monospace; font-size: 0.78rem;
          letter-spacing: 0.05em; line-height: 1.7;
        }
        .vf-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 0.6rem; padding: 4rem;
          color: rgba(200,168,130,0.5);
          font-family: 'DM Mono', monospace; font-size: 0.78rem; letter-spacing: 0.05em;
        }
        .vf-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(200,168,130,0.15);
          border-top-color: var(--nude, #C8A882);
          border-radius: 50%;
          animation: vfspin 0.7s linear infinite;
        }
        @keyframes vfspin { to { transform: rotate(360deg); } }

        .vf-divider {
          border: none; border-top: 1px solid rgba(200,168,130,0.08);
          margin: 2rem 0;
        }
      `}</style>

      <div className="vf-header">
        <h1>Video Finder</h1>
        <p>Syllabus-aware · exam-timed · curated YouTube lectures</p>
      </div>

      <div className="vf-form">
        {/* Row 1: Subject + Exam Days */}
        <div className="vf-row">
          <div className="vf-input-wrap" style={{ flex: 3 }}>
            <label className="vf-label">Subject</label>
            <input
              className="vf-input"
              placeholder="e.g. Data Structures, Thermodynamics..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="vf-input-wrap" style={{ flex: 1, minWidth: 140 }}>
            <label className="vf-label">
              Days to exam
              <span className="vf-label-hint">filters video length</span>
            </label>
            <div className="vf-days-wrap">
              <button
                className="vf-days-btn"
                onClick={() => setExamDays((d) => Math.max(1, d - 1))}
              >−</button>
              <span className="vf-days-val">{examDays}</span>
              <span className="vf-days-label">days</span>
              <button
                className="vf-days-btn"
                onClick={() => setExamDays((d) => Math.min(30, d + 1))}
              >+</button>
            </div>
          </div>
        </div>

        {/* Row 2: Syllabus upload */}
        <div className="vf-input-wrap" style={{ flex: "unset", minWidth: "unset" }}>
          <label className="vf-label">
            Upload syllabus
            <span className="vf-label-hint">
              {parseLoading
                ? (fileIsImage ? "⏳ AI reading image…" : "⏳ Extracting topics…")
                : "optional — PDF, photo or screenshot, auto-populates topics"}
            </span>
          </label>
          <div
            className={`vf-upload-zone ${dragOver ? "drag-over" : ""} ${fileName ? "has-file" : ""}`}
            onClick={() => !parseLoading && fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
            {parseLoading ? (
              <>
                <div className="vf-spinner" />
                <span className="vf-upload-text">
                  {fileIsImage ? "Reading image with OCR…" : "Extracting topics from PDF…"}
                </span>
              </>
            ) : fileName ? (
              <>
                {imagePreview && (
                  <img src={imagePreview} alt="Syllabus preview" className="vf-img-preview" />
                )}
                <div className="vf-file-row">
                  <span style={{ fontSize: "1.1rem" }}>{fileIsImage ? "🖼" : "📄"}</span>
                  <span className="vf-file-name">{fileName}</span>
                  {parseSuccess && <span className="vf-success-badge">✓ topics found</span>}
                  <button
                    className="vf-remove-file"
                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  >×</button>
                </div>
              </>
            ) : (
              <>
                <span className="vf-upload-icon">↑</span>
                <span className="vf-upload-text">
                  Drop your syllabus here or <span>browse</span>
                </span>
                <span className="vf-upload-hint">PDF · JPG · PNG · Screenshot — topics auto-populate</span>
              </>
            )}
          </div>
          {parseWarning && <p className="vf-parse-warn">⚠ {parseWarning}</p>}
        </div>

        {/* Row 3: Topics */}
        <div className="vf-input-wrap" style={{ flex: "unset", minWidth: "unset" }}>
          <label className="vf-label">
            Syllabus topics
            <span className="vf-label-hint">
              {topics.length > 0
                ? `${topics.length} topic${topics.length !== 1 ? "s" : ""} · type to add more`
                : "auto-filled from upload, or type and press Enter"}
            </span>
          </label>
          <div className="vf-topic-wrap">
            {topics.map((t) => (
              <span key={t} className="vf-topic-chip">
                {t}
                <span className="vf-chip-remove" onClick={() => removeTopic(t)}>✕</span>
              </span>
            ))}
            <input
              className="vf-topic-input"
              placeholder={topics.length === 0 ? "e.g. Binary Trees (optional)" : "Add more…"}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={handleTopicKey}
              onBlur={() => topicInput.trim() && addTopic()}
            />
          </div>
        </div>

        {error && <p className="vf-error">⚠ {error}</p>}

        <button
          className="vf-search-btn"
          onClick={handleSearch}
          disabled={loading || !subject.trim()}
        >
          {loading ? "Searching…" : "✦ Find Videos for My Exam"}
        </button>
      </div>

      <hr className="vf-divider" />

      {loading ? (
        <div className="vf-loading">
          <div className="vf-spinner" />
          Finding and ranking the best lectures…
        </div>
      ) : searched ? (
        <>
          {resultMeta && (
            <div className="vf-results-meta">
              <div>
                <p className="vf-results-title">
                  {resultMeta.subject} · {resultMeta.examDays} day{resultMeta.examDays !== 1 ? "s" : ""} left
                </p>
                <p className="vf-results-sub">
                  {resultMeta.total} videos filtered · {resultMeta.availableHours}h study budget · ranked by syllabus match
                </p>
              </div>
              <span className="vf-results-count">{videos.length} shown</span>
            </div>
          )}
          {videos.length > 0 ? (
            <div className="vf-grid">
              {videos.map((v) => (
                <VideoCard key={v.video_id} video={v} subject={subject} token={token} />
              ))}
            </div>
          ) : (
            <div className="vf-empty">
              <span className="vf-empty-icon">📭</span>
              <p>No videos matched.<br />Try a broader subject name or fewer topics.</p>
            </div>
          )}
        </>
      ) : (
        <div className="vf-empty">
          <span className="vf-empty-icon">🎬</span>
          <p>Enter a subject above to discover curated lectures.<br />
          Upload your syllabus for smarter, topic-matched results.</p>
        </div>
      )}
    </div>
  );
}