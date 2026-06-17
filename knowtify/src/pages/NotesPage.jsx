import { useState, useRef, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";

const API = "http://127.0.0.1:5000";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (weeks  >= 2) return `${weeks}w ago`;
  if (days   >= 7) return `1w ago`;
  if (days   >= 1) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours  >= 1) return `${hours}h ago`;
  return "just now";
}

export default function NotesPage() {
  const token = localStorage.getItem("kt_token");
  const syllabusInputRef = useRef();
  const pyqInputRef      = useRef();

  const [subject,        setSubject]        = useState("");
  const [topicInput,     setTopicInput]     = useState("");
  const [topics,         setTopics]         = useState([]);
  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [syllabusFiles,  setSyllabusFiles]  = useState([]);
  const [syllabusDrag,   setSyllabusDrag]   = useState(false);
  const [parsingSyllabus,setParsingSyllabus]= useState(false);
  const [pyqFiles,       setPyqFiles]       = useState([]);
  const [pyqDrag,        setPyqDrag]        = useState(false);
  const [parsingPyq,     setParsingPyq]     = useState(false);

  // NEW: watch history + transcript
  const [watchHistory,     setWatchHistory]     = useState([]);
  const [historyLoading,   setHistoryLoading]   = useState(true);
  const [selectedVideo,    setSelectedVideo]    = useState(null);
  const [transcript,       setTranscript]       = useState("");
  const [transcriptStatus, setTranscriptStatus] = useState("idle");
  // "idle" | "loading" | "found" | "fallback" | "error"

  const [generating, setGenerating] = useState(false);
  const [notes,      setNotes]      = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [genError,   setGenError]   = useState("");

  const allTopics = [...new Set([...syllabusTopics, ...topics])];

  // Load watch history on mount
  useEffect(() => {
    if (!token) { setHistoryLoading(false); return; }
    axios
      .get(`${API}/api/watch-history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data.history || []);
        setWatchHistory(list);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [token]);

  // Select a video and fetch its transcript
  const handleSelectVideo = async (video) => {
    if (selectedVideo?.video_id === video.video_id) {
      setSelectedVideo(null);
      setTranscript("");
      setTranscriptStatus("idle");
      return;
    }
    setSelectedVideo(video);
    setTranscript("");
    setTranscriptStatus("loading");
    setGenError("");
    try {
      const res = await axios.post(
        `${API}/api/transcript`,
        { video_id: video.video_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.transcript) {
        setTranscript(res.data.transcript);
        setTranscriptStatus("found");
      } else {
        setTranscript("");
        setTranscriptStatus("fallback");
      }
    } catch {
      setTranscript("");
      setTranscriptStatus("error");
    }
  };

  const addTopic = (e) => {
    if ((e.key === "Enter" || e.key === ",") && topicInput.trim()) {
      e.preventDefault();
      const val = topicInput.trim().replace(/,$/, "");
      if (val && !topics.includes(val)) setTopics((p) => [...p, val]);
      setTopicInput("");
    }
  };
  const removeTopic         = (t) => setTopics(topics.filter((x) => x !== t));
  const removeSyllabusTopic = (t) => setSyllabusTopics(syllabusTopics.filter((x) => x !== t));

  const processSyllabusFiles = async (files) => {
    if (!files.length) return;
    setParsingSyllabus(true);
    const newFiles = Array.from(files).map((f) => ({ name: f.name, status: "parsing" }));
    setSyllabusFiles((prev) => [...prev, ...newFiles]);
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res    = await axios.post(`${API}/api/parse_syllabus`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const parsed = res.data.topics || [];
        setSyllabusTopics((prev) => {
          const existing = new Set(prev.map((t) => t.toLowerCase()));
          return [...prev, ...parsed.filter((t) => !existing.has(t.toLowerCase()))];
        });
        setSyllabusFiles((prev) =>
          prev.map((f) => (f.name === file.name ? { ...f, status: "done" } : f))
        );
        if (res.data.subject && !subject) setSubject(res.data.subject);
      } catch {
        setSyllabusFiles((prev) =>
          prev.map((f) => (f.name === file.name ? { ...f, status: "error" } : f))
        );
      }
    }
    setParsingSyllabus(false);
  };
  const handleSyllabusInput = (e) => processSyllabusFiles(e.target.files);
  const handleSyllabusDrop  = (e) => { e.preventDefault(); setSyllabusDrag(false); processSyllabusFiles(e.dataTransfer.files); };
  const removeSyllabusFile  = (name) => setSyllabusFiles((prev) => prev.filter((f) => f.name !== name));

  const processPyqFiles = async (files) => {
    if (!files.length) return;
    setParsingPyq(true);
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res  = await axios.post(`${API}/api/parse_syllabus`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const text = res.data.topics?.join("\n") || "";
        setPyqFiles((prev) => [...prev, { name: file.name, text }]);
      } catch {
        setPyqFiles((prev) => [...prev, { name: file.name, text: "", error: true }]);
      }
    }
    setParsingPyq(false);
  };
  const handlePyqInput = (e) => processPyqFiles(e.target.files);
  const handlePyqDrop  = (e) => { e.preventDefault(); setPyqDrag(false); processPyqFiles(e.dataTransfer.files); };
  const removePyqFile  = (name) => setPyqFiles((prev) => prev.filter((f) => f.name !== name));

  const handleGenerate = async () => {
    if (!subject.trim() && !selectedVideo) {
      setGenError("Please select a video or enter a subject.");
      return;
    }
    setGenerating(true);
    setNotes(null);
    setSaved(false);
    setGenError("");
    const pyqText = pyqFiles.map((f) => f.text).filter(Boolean).join("\n\n");
    try {
      const res = await axios.post(
        `${API}/api/notes/generate`,
        {
          subject,
          topics:      allTopics,
          pyqs:        pyqText,
          // NEW — only sent when a video is selected
          transcript:  transcript  || undefined,
          video_title: selectedVideo?.title || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes(res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error || err.message || "Failed to generate notes.";
      if (status === 429) {
        setGenError("Gemini rate limit reached. Please wait 1-2 minutes and try again.");
      } else {
        setGenError(msg);
      }
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!notes) return;
    setSaving(true);
    try {
      await axios.post(`${API}/api/notes`, notes, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSaved(true);
    } catch (err) {
      alert("Failed to save notes: " + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  const handleDownloadPDF = () => {
    if (!notes) return;
    try {
      const doc      = new jsPDF({ unit: "pt", format: "a4" });
      const W        = doc.internal.pageSize.getWidth();
      const H        = doc.internal.pageSize.getHeight();
      const margin   = 48;
      const contentW = W - margin * 2;
      let y = margin;
      const checkPage = (needed = 40) => { if (y + needed > H - margin) { doc.addPage(); y = margin; } };
      const addY      = (h) => { y += h; checkPage(); };

      doc.setFillColor(200, 168, 130);
      doc.rect(0, 0, W, 52, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(6, 6, 6);
      doc.text("KNOWTIFY", margin, 33);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("AI-Powered Learning Platform", margin, 46);
      y = 72;

      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 20, 10);
      const noteSubject = notes.subject || subject;
      const title = (notes.title || noteSubject + " Notes").replace(/[^\x00-\x7F]/g, "");
      doc.text(title, margin, y); addY(20);

      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 100, 80);
      const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      doc.text("Subject: " + noteSubject + "   Generated: " + dateStr, margin, y); addY(14);

      if (notes.tags?.length) {
        doc.setFontSize(8); doc.setTextColor(160, 130, 100);
        doc.text("Tags: " + notes.tags.map((t) => t.replace(/[^\x00-\x7F]/g, "")).join(" | "), margin, y); addY(14);
      }
      doc.setDrawColor(200, 168, 130); doc.setLineWidth(0.5);
      doc.line(margin, y, W - margin, y); addY(18);

      if (notes.summary) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 20, 10);
        doc.text("Summary", margin, y); addY(14);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(50, 40, 30);
        const sl = doc.splitTextToSize((notes.summary || "").replace(/[^\x00-\x7F]/g, ""), contentW);
        checkPage(sl.length * 14); doc.text(sl, margin, y); addY(sl.length * 14 + 10);
      }
      for (const sec of notes.sections || []) {
        checkPage(60);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(140, 100, 60);
        doc.text((sec.heading || sec.title || "").replace(/[^\x00-\x7F]/g, ""), margin, y); addY(14);
        if (sec.content) {
          doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 30, 20);
          const cl = doc.splitTextToSize(sec.content.replace(/[^\x00-\x7F]/g, ""), contentW);
          checkPage(cl.length * 13); doc.text(cl, margin, y); addY(cl.length * 13 + 8);
        }
        for (const pt of sec.key_points || []) {
          checkPage(20);
          const pl = doc.splitTextToSize(("- " + pt).replace(/[^\x00-\x7F]/g, ""), contentW - 10);
          doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(50, 40, 30);
          doc.text(pl, margin + 8, y); addY(pl.length * 12 + 4);
        }
        addY(6);
      }
      if (notes.exam_tips?.length) {
        checkPage(40 + notes.exam_tips.length * 20);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(140, 100, 60);
        doc.text("Exam Tips", margin, y); addY(14);
        for (const tip of notes.exam_tips) {
          const tl = doc.splitTextToSize(("- " + tip).replace(/[^\x00-\x7F]/g, ""), contentW - 10);
          doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(60, 45, 30);
          checkPage(tl.length * 13); doc.text(tl, margin + 8, y); addY(tl.length * 13 + 4);
        }
      }
      const totalPages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(180, 160, 130);
        doc.text("Knowtify -- " + noteSubject, margin, H - 20);
        doc.text(i + " / " + totalPages, W - margin, H - 20, { align: "right" });
      }
      doc.save((noteSubject || "notes").replace(/\s+/g, "_") + "_Notes_Knowtify.pdf");
    } catch (e) {
      console.error("PDF error:", e);
      alert("PDF error: " + e.message);
    }
  };

  const generateLabel = (() => {
    if (generating)                       return "Generating Notes...";
    if (transcriptStatus === "loading")   return "Fetching transcript...";
    if (transcriptStatus === "found")     return "Generate Notes from Video Transcript";
    if (transcriptStatus === "fallback")  return "Generate Notes (topic fallback)";
    if (transcriptStatus === "error")     return "Generate Notes (topic fallback)";
    return "Generate AI Notes";
  })();

  const canGenerate = !generating && transcriptStatus !== "loading" && (!!subject.trim() || !!selectedVideo);

  return (
    <div className="notes-page">
      <style>{`
        .notes-page { min-height:100vh; padding:2.5rem 2rem 5rem; max-width:860px; margin:0 auto; font-family:'Syne',sans-serif; }
        .np-header { margin-bottom:2.5rem; }
        .np-header h1 { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3rem); color:var(--nude,#C8A882); margin:0 0 0.4rem; font-weight:600; }
        .np-header p { color:rgba(200,168,130,0.5); font-family:'DM Mono',monospace; font-size:0.75rem; letter-spacing:0.08em; text-transform:uppercase; }
        .np-section { margin-bottom:1.8rem; }
        .np-label { font-family:'DM Mono',monospace; font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; color:rgba(200,168,130,0.6); margin-bottom:0.55rem; display:flex; align-items:center; gap:0.5rem; }
        .np-label-hint { font-size:0.62rem; color:rgba(200,168,130,0.35); text-transform:none; letter-spacing:0; }
        .np-input { width:100%; box-sizing:border-box; background:var(--card-bg,rgba(255,255,255,0.04)); border:1px solid var(--card-border,rgba(200,168,130,0.15)); border-radius:8px; padding:0.75rem 1rem; color:var(--nude,#C8A882); font-family:'DM Mono',monospace; font-size:0.85rem; outline:none; transition:border-color 0.2s; }
        .np-input:focus { border-color:var(--nude,#C8A882); }
        .np-input::placeholder { color:rgba(200,168,130,0.3); }
        .np-drop-zone { border:2px dashed rgba(200,168,130,0.2); border-radius:12px; padding:1.5rem; text-align:center; cursor:none; transition:border-color 0.2s,background 0.2s; }
        .np-drop-zone.drag-over { border-color:var(--nude,#C8A882); background:rgba(200,168,130,0.04); }
        .np-drop-text { font-family:'DM Mono',monospace; font-size:0.78rem; color:rgba(200,168,130,0.45); line-height:1.6; }
        .np-drop-text span { color:var(--nude,#C8A882); text-decoration:underline; }
        .np-drop-hint { font-family:'DM Mono',monospace; font-size:0.65rem; color:rgba(200,168,130,0.25); margin-top:0.3rem; }
        .np-file-list { display:flex; flex-direction:column; gap:0.4rem; margin-top:0.75rem; }
        .np-file-item { display:flex; align-items:center; gap:0.6rem; background:rgba(200,168,130,0.06); border:1px solid rgba(200,168,130,0.12); border-radius:8px; padding:0.5rem 0.75rem; }
        .np-file-icon { font-size:0.9rem; flex-shrink:0; }
        .np-file-item-name { font-family:'DM Mono',monospace; font-size:0.72rem; color:rgba(200,168,130,0.7); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .np-file-status { font-family:'DM Mono',monospace; font-size:0.62rem; }
        .np-file-status.done { color:#7ec87e; }
        .np-file-status.parsing { color:rgba(200,168,130,0.45); }
        .np-file-status.error { color:#e07070; }
        .np-file-remove { background:none; border:none; color:rgba(200,168,130,0.35); cursor:none; font-size:0.85rem; padding:0 0.2rem; flex-shrink:0; }
        .np-file-remove:hover { color:rgba(200,168,130,0.8); }
        .topic-chips { display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.6rem; }
        .topic-chip { background:rgba(200,168,130,0.12); border:1px solid rgba(200,168,130,0.25); border-radius:999px; padding:0.22rem 0.7rem; font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--nude,#C8A882); display:flex; align-items:center; gap:0.35rem; }
        .topic-chip.from-syllabus { background:rgba(200,168,130,0.06); border-style:dashed; }
        .chip-remove { opacity:0.45; cursor:none; font-size:0.8rem; }
        .chip-remove:hover { opacity:1; }
        .np-gen-btn { width:100%; padding:1rem; background:var(--nude,#C8A882); color:var(--black,#060606); border:none; border-radius:10px; font-family:'DM Mono',monospace; font-size:0.85rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; cursor:none; transition:opacity 0.2s,transform 0.15s; margin-top:0.5rem; }
        .np-gen-btn:hover:not(:disabled) { opacity:0.85; transform:translateY(-1px); }
        .np-gen-btn:disabled { opacity:0.4; }
        .np-error { font-family:'DM Mono',monospace; font-size:0.75rem; color:#e07070; margin-top:0.8rem; padding:0.7rem 1rem; background:rgba(224,112,112,0.08); border:1px solid rgba(224,112,112,0.2); border-radius:8px; }
        .notes-output { margin-top:2.5rem; }
        .notes-output-header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
        .notes-output h2 { font-family:'Cormorant Garamond',serif; font-size:1.8rem; color:var(--nude,#C8A882); margin:0 0 0.3rem; font-weight:600; }
        .notes-tags { display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:0.5rem; }
        .notes-tag { font-family:'DM Mono',monospace; font-size:0.68rem; color:rgba(200,168,130,0.6); background:rgba(200,168,130,0.08); border:1px solid rgba(200,168,130,0.15); border-radius:999px; padding:0.18rem 0.6rem; text-transform:uppercase; letter-spacing:0.06em; }
        .notes-action-btns { display:flex; gap:0.6rem; flex-shrink:0; }
        .notes-btn { padding:0.55rem 1.2rem; border-radius:8px; font-family:'DM Mono',monospace; font-size:0.72rem; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; cursor:none; border:none; transition:opacity 0.2s; white-space:nowrap; }
        .notes-btn-save { background:var(--nude,#C8A882); color:#060606; }
        .notes-btn-save:disabled { opacity:0.5; }
        .notes-btn-pdf { background:rgba(200,168,130,0.12); color:var(--nude,#C8A882); border:1px solid rgba(200,168,130,0.25); }
        .notes-btn:hover:not(:disabled) { opacity:0.8; }
        .notes-summary { background:rgba(200,168,130,0.06); border-left:3px solid var(--nude,#C8A882); border-radius:0 8px 8px 0; padding:1rem 1.2rem; margin-bottom:1.8rem; font-family:'Syne',sans-serif; font-size:0.9rem; color:rgba(200,168,130,0.8); line-height:1.7; }
        .notes-section { margin-bottom:1.8rem; }
        .notes-section-heading { font-family:'Cormorant Garamond',serif; font-size:1.3rem; color:var(--nude,#C8A882); margin:0 0 0.8rem; padding-bottom:0.4rem; border-bottom:1px solid rgba(200,168,130,0.12); font-weight:600; }
        .notes-section-content { font-family:'Syne',sans-serif; font-size:0.88rem; color:rgba(200,168,130,0.75); line-height:1.8; margin-bottom:0.8rem; }
        .notes-key-points { list-style:none; padding:0; margin:0; }
        .notes-key-points li { font-family:'DM Mono',monospace; font-size:0.8rem; color:rgba(200,168,130,0.7); padding:0.35rem 0 0.35rem 1.2rem; position:relative; line-height:1.6; }
        .notes-key-points li::before { content:'->'; position:absolute; left:0; color:rgba(200,168,130,0.4); font-size:0.7rem; }
        .notes-exam-tips { background:rgba(200,168,130,0.05); border:1px solid rgba(200,168,130,0.2); border-radius:12px; padding:1.2rem 1.4rem; margin-top:2rem; }
        .notes-exam-tips h4 { font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--nude,#C8A882); margin:0 0 0.8rem; }
        .notes-exam-tips ul { list-style:none; padding:0; margin:0; }
        .notes-exam-tips li { font-family:'Syne',sans-serif; font-size:0.85rem; color:rgba(200,168,130,0.75); padding:0.3rem 0 0.3rem 1.2rem; position:relative; line-height:1.6; }
        .notes-exam-tips li::before { content:'*'; position:absolute; left:0; color:var(--nude,#C8A882); }
        .generating-state { text-align:center; padding:4rem 2rem; color:rgba(200,168,130,0.4); }
        .generating-state .spinner { width:30px; height:30px; border:2px solid rgba(200,168,130,0.15); border-top-color:var(--nude,#C8A882); border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 1rem; }
        .generating-state p { font-family:'DM Mono',monospace; font-size:0.78rem; letter-spacing:0.06em; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .divider { border:none; border-top:1px solid rgba(200,168,130,0.1); margin:2rem 0; }
        .saved-badge { font-family:'DM Mono',monospace; font-size:0.72rem; color:#7ec87e; letter-spacing:0.06em; padding-top:0.3rem; }

        /* Video picker */
        .np-video-picker { border:1px solid rgba(200,168,130,0.15); border-radius:12px; overflow:hidden; max-height:224px; overflow-y:auto; background:rgba(255,255,255,0.02); }
        .np-video-picker::-webkit-scrollbar { width:4px; }
        .np-video-picker::-webkit-scrollbar-thumb { background:rgba(200,168,130,0.2); border-radius:2px; }
        .np-video-item { display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.9rem; cursor:none; transition:background 0.15s; border-bottom:1px solid rgba(200,168,130,0.07); }
        .np-video-item:last-child { border-bottom:none; }
        .np-video-item:hover { background:rgba(200,168,130,0.06); }
        .np-video-item.selected { background:rgba(200,168,130,0.12); }
        .np-video-thumb { width:52px; height:36px; border-radius:4px; flex-shrink:0; background:rgba(200,168,130,0.08); display:flex; align-items:center; justify-content:center; font-size:1rem; overflow:hidden; }
        .np-video-thumb img { width:100%; height:100%; object-fit:cover; }
        .np-video-info { flex:1; min-width:0; }
        .np-video-title { font-family:'Syne',sans-serif; font-size:0.8rem; color:rgba(200,168,130,0.85); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:0.15rem; }
        .np-video-item.selected .np-video-title { color:var(--nude,#C8A882); }
        .np-video-meta { font-family:'DM Mono',monospace; font-size:0.65rem; color:rgba(200,168,130,0.35); }
        .np-video-check { font-size:0.8rem; color:var(--nude,#C8A882); font-weight:700; flex-shrink:0; }
        .np-history-empty { font-family:'DM Mono',monospace; font-size:0.72rem; color:rgba(200,168,130,0.3); padding:1.2rem; text-align:center; border:1px dashed rgba(200,168,130,0.12); border-radius:12px; line-height:1.6; }
        .np-transcript-badge { font-family:'DM Mono',monospace; font-size:0.68rem; padding:0.35rem 0.75rem; border-radius:6px; margin-top:0.5rem; display:inline-block; }
        .ts-loading  { background:rgba(200,168,130,0.08);  color:rgba(200,168,130,0.5); }
        .ts-found    { background:rgba(126,200,126,0.1);   color:#7ec87e; }
        .ts-fallback { background:rgba(224,160,80,0.1);    color:#e0a050; }
        .ts-error    { background:rgba(224,112,112,0.08);  color:#e07070; }
        .np-section-divider { display:flex; align-items:center; gap:0.75rem; margin:0.2rem 0 1.8rem; }
        .np-section-divider::before,.np-section-divider::after { content:''; flex:1; height:1px; background:rgba(200,168,130,0.1); }
        .np-section-divider span { font-family:'DM Mono',monospace; font-size:0.62rem; color:rgba(200,168,130,0.3); letter-spacing:0.1em; text-transform:uppercase; white-space:nowrap; }
      `}</style>

      <div className="np-header">
        <h1>AI Notes</h1>
        <p>Generate intelligent notes from your syllabus and PYQs</p>
      </div>

      {/* ── NEW: From a watched video ── */}
      <div className="np-section">
        <label className="np-label">
          From a watched video
          <span className="np-label-hint">click to select — transcript fetched automatically</span>
        </label>

        {historyLoading ? (
          <div className="np-history-empty">Loading your watch history...</div>
        ) : watchHistory.length === 0 ? (
          <div className="np-history-empty">
            No watch history yet.<br />
            Watch videos on the Video Finder and they'll appear here.
          </div>
        ) : (
          <div className="np-video-picker">
            {watchHistory.map((v, i) => (
              <div
                key={v.video_id || i}
                className={`np-video-item ${selectedVideo?.video_id === v.video_id ? "selected" : ""}`}
                onClick={() => handleSelectVideo(v)}
              >
                <div className="np-video-thumb">
                  {v.thumbnail ? <img src={v.thumbnail} alt="" /> : "🎬"}
                </div>
                <div className="np-video-info">
                  <div className="np-video-title">{v.title || "Untitled Video"}</div>
                  <div className="np-video-meta">
                    {v.channel && <span>{v.channel}</span>}
                    {v.channel && v.watched_at && <span> · </span>}
                    {v.watched_at && <span>{timeAgo(v.watched_at)}</span>}
                  </div>
                </div>
                {selectedVideo?.video_id === v.video_id && (
                  <span className="np-video-check">✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {transcriptStatus !== "idle" && (
          <div className={`np-transcript-badge ts-${transcriptStatus}`}>
            {transcriptStatus === "loading"  && "Fetching transcript..."}
            {transcriptStatus === "found"    && "✓ Transcript ready — notes will use actual video content"}
            {transcriptStatus === "fallback" && "⚠ No transcript available — will use video title + topics"}
            {transcriptStatus === "error"    && "✕ Transcript fetch failed — will use video title + topics"}
          </div>
        )}
      </div>

      <div className="np-section-divider"><span>or add more context</span></div>

      {/* Syllabus upload */}
      <div className="np-section">
        <label className="np-label">
          Upload Syllabus
          <span className="np-label-hint">optional — PDF or images, multiple files supported</span>
        </label>
        <div
          className={`np-drop-zone ${syllabusDrag ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setSyllabusDrag(true); }}
          onDragLeave={() => setSyllabusDrag(false)}
          onDrop={handleSyllabusDrop}
          onClick={() => syllabusInputRef.current.click()}
        >
          <input ref={syllabusInputRef} type="file" accept=".pdf,image/*" multiple style={{ display:"none" }} onChange={handleSyllabusInput} />
          {parsingSyllabus
            ? <p className="np-drop-text">Parsing files...</p>
            : <><p className="np-drop-text">Drop syllabus files here or <span>browse</span></p><p className="np-drop-hint">PDF, JPG, PNG — topics auto-populate below</p></>}
        </div>
        {syllabusFiles.length > 0 && (
          <div className="np-file-list">
            {syllabusFiles.map((f) => (
              <div key={f.name} className="np-file-item">
                <span className="np-file-icon">{f.name.endsWith(".pdf") ? "P" : "I"}</span>
                <span className="np-file-item-name">{f.name}</span>
                <span className={"np-file-status " + f.status}>
                  {f.status === "done" ? "topics extracted" : f.status === "parsing" ? "parsing..." : "error"}
                </span>
                <button className="np-file-remove" onClick={(e) => { e.stopPropagation(); removeSyllabusFile(f.name); }}>x</button>
              </div>
            ))}
          </div>
        )}
        {syllabusTopics.length > 0 && (
          <div className="topic-chips">
            {syllabusTopics.map((t) => (
              <span key={t} className="topic-chip from-syllabus">
                {t}<span className="chip-remove" onClick={() => removeSyllabusTopic(t)}>x</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="np-section">
        <label className="np-label">Subject</label>
        <input
          className="np-input"
          placeholder="e.g. Operating Systems, Organic Chemistry..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      {/* Additional Topics */}
      <div className="np-section">
        <label className="np-label">Additional Topics <span className="np-label-hint">press Enter to add</span></label>
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
                {t}<span className="chip-remove" onClick={() => removeTopic(t)}>x</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* PYQ upload */}
      <div className="np-section">
        <label className="np-label">
          Upload Previous Year Questions
          <span className="np-label-hint">optional — PDF or images, multiple files</span>
        </label>
        <div
          className={`np-drop-zone ${pyqDrag ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setPyqDrag(true); }}
          onDragLeave={() => setPyqDrag(false)}
          onDrop={handlePyqDrop}
          onClick={() => pyqInputRef.current.click()}
        >
          <input ref={pyqInputRef} type="file" accept=".pdf,image/*" multiple style={{ display:"none" }} onChange={handlePyqInput} />
          {parsingPyq
            ? <p className="np-drop-text">Reading PYQ files...</p>
            : <><p className="np-drop-text">Drop PYQ papers here or <span>browse</span></p><p className="np-drop-hint">PDF or photos of past exam papers</p></>}
        </div>
        {pyqFiles.length > 0 && (
          <div className="np-file-list">
            {pyqFiles.map((f) => (
              <div key={f.name} className="np-file-item">
                <span className="np-file-icon">Q</span>
                <span className="np-file-item-name">{f.name}</span>
                <span className={"np-file-status " + (f.error ? "error" : "done")}>
                  {f.error ? "read error" : "ready"}
                </span>
                <button className="np-file-remove" onClick={(e) => { e.stopPropagation(); removePyqFile(f.name); }}>x</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="np-gen-btn" onClick={handleGenerate} disabled={!canGenerate}>
        {generateLabel}
      </button>

      {genError && <div className="np-error">Error: {genError}</div>}

      {generating && (
        <div className="generating-state">
          <div className="spinner" />
          <p>
            {transcriptStatus === "found"
              ? `Reading transcript of "${selectedVideo?.title}"...`
              : "Crafting your notes with Gemini AI..."}
          </p>
        </div>
      )}

      {notes && !generating && (
        <div className="notes-output">
          <hr className="divider" />
          <div className="notes-output-header">
            <div>
              <h2>{notes.title || (notes.subject || subject) + " Notes"}</h2>
              {notes.tags?.length > 0 && (
                <div className="notes-tags">
                  {notes.tags.map((t) => <span key={t} className="notes-tag">{t}</span>)}
                </div>
              )}
              {saved && <p className="saved-badge">Saved to your notes</p>}
            </div>
            <div className="notes-action-btns">
              <button className="notes-btn notes-btn-save" onClick={handleSave} disabled={saving || saved}>
                {saved ? "Saved" : saving ? "Saving..." : "Save Notes"}
              </button>
              <button className="notes-btn notes-btn-pdf" onClick={handleDownloadPDF}>Download PDF</button>
            </div>
          </div>
          {notes.summary && <div className="notes-summary">{notes.summary}</div>}
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
              <ul>{notes.exam_tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}