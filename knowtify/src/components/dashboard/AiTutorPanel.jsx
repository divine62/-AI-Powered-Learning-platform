import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "").replace(/\/api$/, "");

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="atp-code-block"><code class="atp-code">${escapeHtml(code.trim())}</code></pre>`
    )
    .replace(/`([^`]+)`/g, '<code class="atp-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(✓ Answer:.*)/g, '<span class="atp-answer">$1</span>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="atp-list-item atp-numbered"><span class="atp-num">$1.</span><span>$2</span></div>')
    .replace(/^[-•] (.+)$/gm, '<div class="atp-list-item"><span class="atp-bullet">→</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div class="atp-spacer"></div>')
    .replace(/\n/g, "<br/>");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function TypingDots() {
  return (
    <div className="atp-bubble atp-bubble-ai atp-typing">
      <span className="atp-dot" /><span className="atp-dot" /><span className="atp-dot" />
    </div>
  );
}

// ── Suggestion bar shown below an AI message ──────────────────────────────────
function SuggestionBar({ suggestion, onAction, disabled }) {
  if (!suggestion) return null;

  const icons = {
    notes:         "≡",
    video:         "▶",
    video_context: "◈",
  };

  return (
    <div className="atp-suggestion-bar">
      <span className="atp-suggestion-hint">✦</span>
      <button
        className="atp-suggestion-btn"
        onClick={() => onAction(suggestion)}
        disabled={disabled}
      >
        <span className="atp-suggestion-icon">{icons[suggestion.type] || "✦"}</span>
        {suggestion.label}
      </button>
    </div>
  );
}

function MessageBubble({ msg, suggestion, onSuggestionAction, loading }) {
  const isUser = msg.role === "user";
  const display = isUser
    ? msg.content.replace(/\n\n\[.*?\]$/s, "")
    : msg.content;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div className={`atp-msg-row ${isUser ? "atp-row-user" : "atp-row-ai"}`}>
        {!isUser && <div className="atp-avatar">✦</div>}
        <div
          className={`atp-bubble ${isUser ? "atp-bubble-user" : "atp-bubble-ai"}`}
          dangerouslySetInnerHTML={{
            __html: isUser ? escapeHtml(display) : renderMarkdown(display),
          }}
        />
        {isUser && <div className="atp-avatar atp-avatar-user">you</div>}
      </div>
      {/* Show suggestion below AI messages only */}
      {!isUser && suggestion && (
        <div style={{ paddingLeft: "30px" }}>
          <SuggestionBar
            suggestion={suggestion}
            onAction={onSuggestionAction}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  { id: "explain",   icon: "◈", label: "Explain",           prompt: "Explain the concept we're discussing step by step with a clear example." },
  { id: "quiz",      icon: "?", label: "Quiz me",            prompt: "Quiz me! Generate 3 MCQs on what we've been discussing. Format each with 4 options and mark the correct answer." },
  { id: "practice",  icon: "⊞", label: "Practice problems",  prompt: "Give me 2 practice problems on this topic with full solutions." },
  { id: "lastvideo", icon: "▶", label: "Explain last video", prompt: "Explain the key concepts from the last video I watched." },
  { id: "notes",     icon: "≡", label: "From my notes",      prompt: "Reference my saved notes to answer my next question." },
];

export default function AiTutorPanel() {
  const token    = localStorage.getItem("kt_token");
  const navigate = useNavigate();

  // Each message: { role, content, suggestion? }
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [userContext,  setUserContext]  = useState({});
  const [notesContext, setNotesContext] = useState("");
  const [notesFetched, setNotesFetched] = useState(false);
  const [watchContext,      setWatchContext]      = useState("");
  const [lastVideoTranscript, setLastVideoTranscript] = useState("");
  const [lastVideoTitle,      setLastVideoTitle]      = useState("");

  const bottomRef = useRef();
  const inputRef  = useRef();

  // Load profile + watch history on mount
  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setUserContext(res.data)).catch(() => {});

    axios.get(`${API}/api/watch-history`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      const videos = Array.isArray(res.data) ? res.data : (res.data.history || []);
      if (!videos.length) return;
      const ctx = videos.slice(0, 5).map((v, i) =>
        `${i + 1}. "${v.title}" by ${v.channel || "unknown"} (subject: ${v.subject || "general"}, watched: ${
          v.watched_at ? new Date(v.watched_at).toLocaleDateString("en-IN") : "recently"
        })`
      ).join("\n");
      setWatchContext(ctx);
      if (videos[0]) setLastVideoTitle(videos[0].title || "");
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchNotesContext = async () => {
    if (notesFetched) return notesContext;
    try {
      const res = await axios.get(`${API}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ctx = (res.data || []).slice(0, 3).map(n =>
        `Note: "${n.title}" (${n.subject}) — ${n.summary || ""}`
      ).join("\n");
      setNotesContext(ctx);
      setNotesFetched(true);
      return ctx;
    } catch { return ""; }
  };

  const fetchLastVideoTranscript = async () => {
    if (lastVideoTranscript) return lastVideoTranscript;
    try {
      const histRes = await axios.get(`${API}/api/watch-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const videos = Array.isArray(histRes.data) ? histRes.data : (histRes.data.history || []);
      if (!videos.length) return "";
      const latest = videos[0];
      setLastVideoTitle(latest.title || "");
      const txRes = await axios.post(`${API}/api/transcript`,
        { video_id: latest.video_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (txRes.data.success && txRes.data.transcript) {
        setLastVideoTranscript(txRes.data.transcript);
        return txRes.data.transcript;
      }
      return "";
    } catch { return ""; }
  };

  // ── Handle suggestion button clicks ──────────────────────────────────────────
  const handleSuggestionAction = async (suggestion) => {
    if (suggestion.action === "generate_notes") {
      // Navigate to notes page with the topic pre-filled via URL state
      navigate("/notes", { state: { subject: suggestion.topic } });
    } else if (suggestion.action === "find_videos") {
      navigate("/search", { state: { subject: suggestion.topic } });
    } else if (suggestion.action === "explain_last_video") {
      sendMessage(`Explain the key concepts from the last video I watched on ${suggestion.topic}.`);
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = async (content) => {
    if (!content.trim() || loading) return;

    let finalContent = content;
    const lower = content.toLowerCase();

    if (
      lower.includes("last video") || lower.includes("recent video") ||
      lower.includes("video i watched") || lower.includes("explain my video")
    ) {
      const transcript = await fetchLastVideoTranscript();
      if (transcript) {
        finalContent = `${content}\n\n[Transcript of my last watched video "${lastVideoTitle}":\n${transcript.slice(0, 6000)}]`;
      } else if (lastVideoTitle) {
        finalContent = `${content}\n\n[My last watched video was "${lastVideoTitle}" — no transcript available]`;
      }
    }

    if (lower.includes("my saved notes") || lower.includes("from my notes") || lower.includes("reference my notes")) {
      const ctx = await fetchNotesContext();
      if (ctx) finalContent = `${finalContent}\n\n[My saved notes:\n${ctx}]`;
    }

    const userMsg     = { role: "user", content: finalContent };
    const newMessages = [...messages, userMsg];
    // Add user message without suggestion
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/api/tutor/chat`,
        { messages: newMessages, user_context: userContext, watch_context: watchContext },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMsg = {
        role:       "assistant",
        content:    res.data.reply,
        suggestion: res.data.suggestion || null,
      };
      setMessages([...newMessages, aiMsg]);
    } catch {
      setMessages([...newMessages, {
        role:    "assistant",
        content: "Sorry, I couldn't connect to the tutor. Please check if the backend is running.",
        suggestion: null,
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown    = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
  const handleQuickAction = (action) => sendMessage(action.prompt);
  const clearChat = () => {
    setMessages([]);
    setNotesFetched(false);
    setNotesContext("");
    setLastVideoTranscript("");
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="atp-panel glass-card">
      <style>{`
        .atp-panel { display:flex; flex-direction:column; height:520px; border-radius:16px; overflow:hidden; position:relative; }
        .atp-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.2rem 0.8rem; border-bottom:1px solid rgba(200,168,130,0.1); flex-shrink:0; }
        .atp-header-left { display:flex; align-items:center; gap:0.6rem; }
        .atp-header-icon { width:28px; height:28px; background:rgba(200,168,130,0.12); border:1px solid rgba(200,168,130,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:var(--nude,#C8A882); }
        .atp-header-title { font-family:'DM Mono',monospace; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; color:rgba(200,168,130,0.7); }
        .atp-header-sub { font-family:'DM Mono',monospace; font-size:0.6rem; color:rgba(200,168,130,0.3); letter-spacing:0.06em; }
        .atp-history-pill { font-family:'DM Mono',monospace; font-size:0.58rem; letter-spacing:0.06em; background:rgba(200,168,130,0.08); border:1px solid rgba(200,168,130,0.15); border-radius:999px; padding:0.18rem 0.6rem; color:rgba(200,168,130,0.45); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
        .atp-clear-btn { background:none; border:none; color:rgba(200,168,130,0.3); font-family:'DM Mono',monospace; font-size:0.65rem; letter-spacing:0.06em; cursor:none; transition:color 0.15s; padding:0.3rem 0.5rem; text-transform:uppercase; }
        .atp-clear-btn:hover { color:rgba(200,168,130,0.7); }
        .atp-chat { flex:1; overflow-y:auto; padding:1rem 1.1rem; display:flex; flex-direction:column; gap:0.8rem; scrollbar-width:thin; scrollbar-color:rgba(200,168,130,0.15) transparent; }
        .atp-chat::-webkit-scrollbar { width:4px; }
        .atp-chat::-webkit-scrollbar-thumb { background:rgba(200,168,130,0.15); border-radius:999px; }
        .atp-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.5rem; text-align:center; gap:0.5rem; }
        .atp-empty-icon { font-size:2rem; margin-bottom:0.3rem; }
        .atp-empty-title { font-family:'Cormorant Garamond',serif; font-size:1.2rem; color:var(--nude,#C8A882); font-weight:600; }
        .atp-empty-sub { font-family:'DM Mono',monospace; font-size:0.68rem; color:rgba(200,168,130,0.35); line-height:1.6; max-width:260px; }
        .atp-msg-row { display:flex; align-items:flex-end; gap:0.5rem; max-width:100%; }
        .atp-row-user { flex-direction:row-reverse; }
        .atp-row-ai   { flex-direction:row; }
        .atp-avatar { width:22px; height:22px; border-radius:6px; background:rgba(200,168,130,0.12); border:1px solid rgba(200,168,130,0.18); display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:var(--nude,#C8A882); flex-shrink:0; font-family:'DM Mono',monospace; }
        .atp-avatar-user { background:rgba(200,168,130,0.18); font-size:0.55rem; }
        .atp-bubble { max-width:78%; border-radius:12px; padding:0.65rem 0.9rem; font-family:'Syne',sans-serif; font-size:0.82rem; line-height:1.65; word-break:break-word; }
        .atp-bubble-user { background:rgba(200,168,130,0.14); border:1px solid rgba(200,168,130,0.2); color:var(--nude,#C8A882); border-bottom-right-radius:4px; }
        .atp-bubble-ai { background:rgba(255,255,255,0.03); border:1px solid rgba(200,168,130,0.1); color:rgba(200,168,130,0.85); border-bottom-left-radius:4px; }
        .atp-bubble strong { color:var(--nude,#C8A882); font-weight:700; }
        .atp-bubble .atp-code-block { background:rgba(6,6,6,0.5); border:1px solid rgba(200,168,130,0.1); border-radius:8px; padding:0.7rem 0.9rem; margin:0.5rem 0; overflow-x:auto; }
        .atp-bubble .atp-code { font-family:'DM Mono',monospace; font-size:0.75rem; color:rgba(200,168,130,0.9); white-space:pre; display:block; }
        .atp-bubble .atp-inline-code { font-family:'DM Mono',monospace; font-size:0.75rem; background:rgba(200,168,130,0.1); border-radius:4px; padding:0.1rem 0.35rem; color:var(--nude,#C8A882); }
        .atp-bubble .atp-list-item { display:flex; gap:0.5rem; align-items:flex-start; padding:0.15rem 0; }
        .atp-bubble .atp-bullet { color:rgba(200,168,130,0.4); flex-shrink:0; font-size:0.7rem; padding-top:0.15rem; }
        .atp-bubble .atp-num { color:rgba(200,168,130,0.5); flex-shrink:0; font-family:'DM Mono',monospace; font-size:0.72rem; padding-top:0.1rem; }
        .atp-bubble .atp-answer { display:inline-block; margin-top:0.3rem; background:rgba(126,200,126,0.1); border:1px solid rgba(126,200,126,0.2); border-radius:6px; padding:0.2rem 0.5rem; color:#7ec87e; font-family:'DM Mono',monospace; font-size:0.75rem; }
        .atp-bubble .atp-spacer { height:0.5rem; }
        .atp-typing { display:flex; align-items:center; gap:4px; padding:0.7rem 1rem; }
        .atp-dot { width:6px; height:6px; background:rgba(200,168,130,0.5); border-radius:50%; animation:atp-bounce 1.2s infinite ease-in-out; }
        .atp-dot:nth-child(1) { animation-delay:0s; }
        .atp-dot:nth-child(2) { animation-delay:0.2s; }
        .atp-dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes atp-bounce { 0%,60%,100% { transform:translateY(0); opacity:0.4; } 30% { transform:translateY(-5px); opacity:1; } }

        /* Suggestion bar */
        .atp-suggestion-bar { display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0; }
        .atp-suggestion-hint { font-size:0.6rem; color:rgba(200,168,130,0.3); flex-shrink:0; }
        .atp-suggestion-btn { display:inline-flex; align-items:center; gap:0.4rem; background:rgba(200,168,130,0.07); border:1px solid rgba(200,168,130,0.2); border-radius:999px; padding:0.28rem 0.8rem; font-family:'DM Mono',monospace; font-size:0.65rem; color:rgba(200,168,130,0.65); cursor:none; transition:all 0.15s; letter-spacing:0.03em; white-space:nowrap; }
        .atp-suggestion-btn:hover:not(:disabled) { background:rgba(200,168,130,0.13); border-color:rgba(200,168,130,0.35); color:var(--nude,#C8A882); }
        .atp-suggestion-btn:disabled { opacity:0.3; }
        .atp-suggestion-icon { font-size:0.68rem; }

        .atp-quick-actions { display:flex; gap:0.4rem; padding:0.6rem 1.1rem; overflow-x:auto; scrollbar-width:none; flex-shrink:0; border-top:1px solid rgba(200,168,130,0.06); }
        .atp-quick-actions::-webkit-scrollbar { display:none; }
        .atp-qa-btn { display:flex; align-items:center; gap:0.35rem; background:rgba(200,168,130,0.06); border:1px solid rgba(200,168,130,0.14); border-radius:999px; padding:0.3rem 0.75rem; font-family:'DM Mono',monospace; font-size:0.65rem; color:rgba(200,168,130,0.6); cursor:none; white-space:nowrap; transition:background 0.15s,color 0.15s,border-color 0.15s; letter-spacing:0.03em; }
        .atp-qa-btn:hover:not(:disabled) { background:rgba(200,168,130,0.12); border-color:rgba(200,168,130,0.28); color:var(--nude,#C8A882); }
        .atp-qa-btn:disabled { opacity:0.3; }
        .atp-qa-icon { font-size:0.7rem; }
        .atp-input-area { display:flex; align-items:flex-end; gap:0.6rem; padding:0.7rem 1rem 0.9rem; border-top:1px solid rgba(200,168,130,0.08); flex-shrink:0; }
        .atp-textarea { flex:1; background:rgba(200,168,130,0.05); border:1px solid rgba(200,168,130,0.15); border-radius:10px; padding:0.6rem 0.9rem; color:var(--nude,#C8A882); font-family:'DM Mono',monospace; font-size:0.8rem; line-height:1.5; resize:none; outline:none; min-height:38px; max-height:100px; transition:border-color 0.2s; scrollbar-width:none; }
        .atp-textarea::-webkit-scrollbar { display:none; }
        .atp-textarea:focus { border-color:rgba(200,168,130,0.4); }
        .atp-textarea::placeholder { color:rgba(200,168,130,0.25); }
        .atp-send-btn { width:36px; height:36px; background:var(--nude,#C8A882); border:none; border-radius:9px; color:#060606; font-size:0.9rem; cursor:none; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:opacity 0.15s,transform 0.1s; }
        .atp-send-btn:hover:not(:disabled) { opacity:0.85; transform:scale(1.05); }
        .atp-send-btn:disabled { opacity:0.3; }
        .atp-send-spinner { width:14px; height:14px; border:2px solid rgba(6,6,6,0.2); border-top-color:#060606; border-radius:50%; animation:atp-spin 0.6s linear infinite; }
        @keyframes atp-spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="atp-header">
        <div className="atp-header-left">
          <div className="atp-header-icon">✦</div>
          <div>
            <div className="atp-header-title">AI Tutor</div>
            <div className="atp-header-sub">Powered by Gemini · exam-aware</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
          {watchContext && (
            <div className="atp-history-pill" title="Tutor knows your watch history">
              ▶ {lastVideoTitle ? lastVideoTitle.slice(0, 28) + (lastVideoTitle.length > 28 ? "…" : "") : "watch history loaded"}
            </div>
          )}
          {!isEmpty && (
            <button className="atp-clear-btn" onClick={clearChat}>New chat</button>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="atp-chat">
        {isEmpty ? (
          <div className="atp-empty">
            <div className="atp-empty-icon">🎓</div>
            <div className="atp-empty-title">Ask me anything</div>
            <div className="atp-empty-sub">
              {watchContext
                ? `I can see your recent videos. Ask me to explain your last video, quiz you on it, or anything else.`
                : "Explain a concept, get quizzed, or practice problems — just type or use a quick action."}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                suggestion={msg.role === "assistant" ? msg.suggestion : null}
                onSuggestionAction={handleSuggestionAction}
                loading={loading}
              />
            ))}
            {loading && (
              <div className="atp-msg-row atp-row-ai">
                <div className="atp-avatar">✦</div>
                <TypingDots />
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="atp-quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button key={action.id} className="atp-qa-btn" onClick={() => handleQuickAction(action)} disabled={loading}>
            <span className="atp-qa-icon">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="atp-input-area">
        <textarea
          ref={inputRef}
          className="atp-textarea"
          placeholder="Ask a question, request an explanation…"
          value={input}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
          }}
          onKeyDown={handleKeyDown}
        />
        <button className="atp-send-btn" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
          {loading ? <div className="atp-send-spinner" /> : "↑"}
        </button>
      </div>
    </div>
  );
}