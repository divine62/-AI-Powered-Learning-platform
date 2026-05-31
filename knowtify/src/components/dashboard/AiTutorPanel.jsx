import { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";

const API = "http://127.0.0.1:5000";

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    // Code blocks
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="atp-code-block"><code class="atp-code">${escapeHtml(code.trim())}</code></pre>`
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="atp-inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // MCQ correct answer highlight
    .replace(/(✓ Answer:.*)/g, '<span class="atp-answer">$1</span>')
    // Numbered list
    .replace(/^(\d+)\. (.+)$/gm, '<div class="atp-list-item atp-numbered"><span class="atp-num">$1.</span><span>$2</span></div>')
    // Bullet list
    .replace(/^[-•] (.+)$/gm, '<div class="atp-list-item"><span class="atp-bullet">→</span><span>$1</span></div>')
    // Line breaks
    .replace(/\n\n/g, '<div class="atp-spacer"></div>')
    .replace(/\n/g, "<br/>");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="atp-bubble atp-bubble-ai atp-typing">
      <span className="atp-dot" />
      <span className="atp-dot" />
      <span className="atp-dot" />
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`atp-msg-row ${isUser ? "atp-row-user" : "atp-row-ai"}`}>
      {!isUser && <div className="atp-avatar">✦</div>}
      <div
        className={`atp-bubble ${isUser ? "atp-bubble-user" : "atp-bubble-ai"}`}
        dangerouslySetInnerHTML={{ __html: isUser ? escapeHtml(msg.content) : renderMarkdown(msg.content) }}
      />
      {isUser && <div className="atp-avatar atp-avatar-user">you</div>}
    </div>
  );
}

// ── Quick action buttons ──────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: "explain",   icon: "◈", label: "Explain",          prompt: "Explain the concept we're discussing step by step with a clear example." },
  { id: "quiz",      icon: "?", label: "Quiz me",           prompt: "Quiz me! Generate 3 MCQs on what we've been discussing. Format each with 4 options and mark the correct answer." },
  { id: "practice",  icon: "⊞", label: "Practice problems", prompt: "Give me 2 practice problems on this topic with full solutions." },
  { id: "notes",     icon: "≡", label: "From my notes",     prompt: "I want you to reference my saved notes to answer my next question." },
  { id: "video",     icon: "▶", label: "From my videos",    prompt: "Reference the videos I've recently watched when explaining concepts to me." },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function AiTutorPanel() {
  const token = localStorage.getItem("kt_token");

  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [userContext, setUserContext] = useState({});
  const [notesFetched, setNotesFetched] = useState(false);
  const [notesContext, setNotesContext] = useState("");
  const [videoContext, setVideoContext] = useState("");

  const bottomRef  = useRef();
  const inputRef   = useRef();
  const chatRef    = useRef();

  // Load user profile for context
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserContext(res.data);
      } catch (_) {}
    };
    fetchProfile();
  }, [token]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Fetch notes for context ─────────────────────────────────────────────────
  const fetchNotesContext = async () => {
    if (notesFetched) return notesContext;
    try {
      const res = await axios.get(`${API}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notes = res.data || [];
      const ctx = notes.slice(0, 3).map(n =>
        `Note: "${n.title}" (${n.subject}) — ${n.summary || ""}`
      ).join("\n");
      setNotesContext(ctx);
      setNotesFetched(true);
      return ctx;
    } catch (_) { return ""; }
  };

  // ── Fetch watch history for context ────────────────────────────────────────
  const fetchVideoContext = async () => {
    if (videoContext) return videoContext;
    try {
      const res = await axios.get(`${API}/api/watch-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const videos = res.data || [];
      const ctx = videos.slice(0, 3).map(v =>
        `Video watched: "${v.title}" by ${v.channel} (subject: ${v.subject})`
      ).join("\n");
      setVideoContext(ctx);
      return ctx;
    } catch (_) { return ""; }
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async (content) => {
    if (!content.trim() || loading) return;

    // Check if we need to inject notes/video context
    let finalContent = content;
    if (content.includes("my saved notes") || content.includes("from my notes")) {
      const ctx = await fetchNotesContext();
      if (ctx) finalContent = `${content}\n\n[My saved notes for context:\n${ctx}]`;
    }
    if (content.includes("my videos") || content.includes("recently watched")) {
      const ctx = await fetchVideoContext();
      if (ctx) finalContent = `${content}\n\n[My recently watched videos:\n${ctx}]`;
    }

    const userMsg = { role: "user", content: finalContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/api/tutor/chat`,
        {
          messages: newMessages,
          user_context: userContext,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages([...newMessages, { role: "assistant", content: res.data.reply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I couldn't connect to the tutor. Please check if the backend is running." },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickAction = (action) => {
    sendMessage(action.prompt);
  };

  const clearChat = () => {
    setMessages([]);
    setNotesFetched(false);
    setNotesContext("");
    setVideoContext("");
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="atp-panel glass-card">
      <style>{`
        .atp-panel {
          display: flex;
          flex-direction: column;
          height: 520px;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }

        /* Header */
        .atp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.2rem 0.8rem;
          border-bottom: 1px solid rgba(200,168,130,0.1);
          flex-shrink: 0;
        }
        .atp-header-left { display: flex; align-items: center; gap: 0.6rem; }
        .atp-header-icon {
          width: 28px; height: 28px;
          background: rgba(200,168,130,0.12);
          border: 1px solid rgba(200,168,130,0.2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem;
          color: var(--nude, #C8A882);
        }
        .atp-header-title {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(200,168,130,0.7);
        }
        .atp-header-sub {
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          color: rgba(200,168,130,0.3);
          letter-spacing: 0.06em;
        }
        .atp-clear-btn {
          background: none;
          border: none;
          color: rgba(200,168,130,0.3);
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.06em;
          cursor: none;
          transition: color 0.15s;
          padding: 0.3rem 0.5rem;
          text-transform: uppercase;
        }
        .atp-clear-btn:hover { color: rgba(200,168,130,0.7); }

        /* Chat area */
        .atp-chat {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          scrollbar-width: thin;
          scrollbar-color: rgba(200,168,130,0.15) transparent;
        }
        .atp-chat::-webkit-scrollbar { width: 4px; }
        .atp-chat::-webkit-scrollbar-thumb { background: rgba(200,168,130,0.15); border-radius: 999px; }

        /* Empty state */
        .atp-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          text-align: center;
          gap: 0.5rem;
        }
        .atp-empty-icon {
          font-size: 2rem;
          margin-bottom: 0.3rem;
        }
        .atp-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem;
          color: var(--nude, #C8A882);
          font-weight: 600;
        }
        .atp-empty-sub {
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          color: rgba(200,168,130,0.35);
          line-height: 1.6;
          max-width: 260px;
        }

        /* Message rows */
        .atp-msg-row {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          max-width: 100%;
        }
        .atp-row-user { flex-direction: row-reverse; }
        .atp-row-ai   { flex-direction: row; }

        /* Avatar */
        .atp-avatar {
          width: 22px; height: 22px;
          border-radius: 6px;
          background: rgba(200,168,130,0.12);
          border: 1px solid rgba(200,168,130,0.18);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem;
          color: var(--nude, #C8A882);
          flex-shrink: 0;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0;
        }
        .atp-avatar-user {
          background: rgba(200,168,130,0.18);
          font-size: 0.55rem;
        }

        /* Bubbles */
        .atp-bubble {
          max-width: 78%;
          border-radius: 12px;
          padding: 0.65rem 0.9rem;
          font-family: 'Syne', sans-serif;
          font-size: 0.82rem;
          line-height: 1.65;
          word-break: break-word;
        }
        .atp-bubble-user {
          background: rgba(200,168,130,0.14);
          border: 1px solid rgba(200,168,130,0.2);
          color: var(--nude, #C8A882);
          border-bottom-right-radius: 4px;
        }
        .atp-bubble-ai {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(200,168,130,0.1);
          color: rgba(200,168,130,0.85);
          border-bottom-left-radius: 4px;
        }

        /* Markdown styles inside bubble */
        .atp-bubble strong { color: var(--nude, #C8A882); font-weight: 700; }
        .atp-bubble .atp-code-block {
          background: rgba(6,6,6,0.5);
          border: 1px solid rgba(200,168,130,0.1);
          border-radius: 8px;
          padding: 0.7rem 0.9rem;
          margin: 0.5rem 0;
          overflow-x: auto;
        }
        .atp-bubble .atp-code {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: rgba(200,168,130,0.9);
          white-space: pre;
          display: block;
        }
        .atp-bubble .atp-inline-code {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          background: rgba(200,168,130,0.1);
          border-radius: 4px;
          padding: 0.1rem 0.35rem;
          color: var(--nude, #C8A882);
        }
        .atp-bubble .atp-list-item {
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
          padding: 0.15rem 0;
        }
        .atp-bubble .atp-bullet {
          color: rgba(200,168,130,0.4);
          flex-shrink: 0;
          font-size: 0.7rem;
          padding-top: 0.15rem;
        }
        .atp-bubble .atp-num {
          color: rgba(200,168,130,0.5);
          flex-shrink: 0;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          padding-top: 0.1rem;
        }
        .atp-bubble .atp-answer {
          display: inline-block;
          margin-top: 0.3rem;
          background: rgba(126,200,126,0.1);
          border: 1px solid rgba(126,200,126,0.2);
          border-radius: 6px;
          padding: 0.2rem 0.5rem;
          color: #7ec87e;
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
        }
        .atp-bubble .atp-spacer { height: 0.5rem; }

        /* Typing dots */
        .atp-typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0.7rem 1rem;
        }
        .atp-dot {
          width: 6px; height: 6px;
          background: rgba(200,168,130,0.5);
          border-radius: 50%;
          animation: atp-bounce 1.2s infinite ease-in-out;
        }
        .atp-dot:nth-child(1) { animation-delay: 0s; }
        .atp-dot:nth-child(2) { animation-delay: 0.2s; }
        .atp-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes atp-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        /* Quick actions */
        .atp-quick-actions {
          display: flex;
          gap: 0.4rem;
          padding: 0.6rem 1.1rem;
          overflow-x: auto;
          scrollbar-width: none;
          flex-shrink: 0;
          border-top: 1px solid rgba(200,168,130,0.06);
        }
        .atp-quick-actions::-webkit-scrollbar { display: none; }
        .atp-qa-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(200,168,130,0.06);
          border: 1px solid rgba(200,168,130,0.14);
          border-radius: 999px;
          padding: 0.3rem 0.75rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          color: rgba(200,168,130,0.6);
          cursor: none;
          white-space: nowrap;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          letter-spacing: 0.03em;
        }
        .atp-qa-btn:hover:not(:disabled) {
          background: rgba(200,168,130,0.12);
          border-color: rgba(200,168,130,0.28);
          color: var(--nude, #C8A882);
        }
        .atp-qa-btn:disabled { opacity: 0.3; }
        .atp-qa-icon { font-size: 0.7rem; }

        /* Input area */
        .atp-input-area {
          display: flex;
          align-items: flex-end;
          gap: 0.6rem;
          padding: 0.7rem 1rem 0.9rem;
          border-top: 1px solid rgba(200,168,130,0.08);
          flex-shrink: 0;
        }
        .atp-textarea {
          flex: 1;
          background: rgba(200,168,130,0.05);
          border: 1px solid rgba(200,168,130,0.15);
          border-radius: 10px;
          padding: 0.6rem 0.9rem;
          color: var(--nude, #C8A882);
          font-family: 'DM Mono', monospace;
          font-size: 0.8rem;
          line-height: 1.5;
          resize: none;
          outline: none;
          min-height: 38px;
          max-height: 100px;
          transition: border-color 0.2s;
          scrollbar-width: none;
        }
        .atp-textarea::-webkit-scrollbar { display: none; }
        .atp-textarea:focus { border-color: rgba(200,168,130,0.4); }
        .atp-textarea::placeholder { color: rgba(200,168,130,0.25); }
        .atp-send-btn {
          width: 36px; height: 36px;
          background: var(--nude, #C8A882);
          border: none;
          border-radius: 9px;
          color: #060606;
          font-size: 0.9rem;
          cursor: none;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.15s, transform 0.1s;
        }
        .atp-send-btn:hover:not(:disabled) { opacity: 0.85; transform: scale(1.05); }
        .atp-send-btn:disabled { opacity: 0.3; }
        .atp-send-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(6,6,6,0.2);
          border-top-color: #060606;
          border-radius: 50%;
          animation: atp-spin 0.6s linear infinite;
        }
        @keyframes atp-spin { to { transform: rotate(360deg); } }
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
        {!isEmpty && (
          <button className="atp-clear-btn" onClick={clearChat}>
            New chat
          </button>
        )}
      </div>

      {/* Chat messages */}
      <div className="atp-chat" ref={chatRef}>
        {isEmpty ? (
          <div className="atp-empty">
            <div className="atp-empty-icon">🎓</div>
            <div className="atp-empty-title">Ask me anything</div>
            <div className="atp-empty-sub">
              Explain a concept, get quizzed, practice problems — just type your question or use a quick action below.
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
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

      {/* Quick action buttons */}
      <div className="atp-quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            className="atp-qa-btn"
            onClick={() => handleQuickAction(action)}
            disabled={loading}
          >
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
        <button
          className="atp-send-btn"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          {loading ? <div className="atp-send-spinner" /> : "↑"}
        </button>
      </div>
    </div>
  );
}