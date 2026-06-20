import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashSidebar from "../components/dashboard/DashSidebar";
import Navbar from "../components/Navbar";
import axios from "axios";

const API = "http://127.0.0.1:5000/api";

const SUGGESTIONS = [
  "Explain a concept from my syllabus",
  "Quiz me on my last topic",
  "Summarise what I studied today",
  "Give me practice problems",
];

function formatText(text) {
  // Convert **bold** to <strong>, and newlines to <br>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "var(--nude-light)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
    ));
  });
}

function Message({ role, text }) {
  return (
    <div style={{ display: "flex", justifyContent: role === "user" ? "flex-end" : "flex-start", marginBottom: 20 }}>
      {role === "assistant" && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "rgba(200,168,130,0.15)", border: "1px solid rgba(200,168,130,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "var(--nude)", flexShrink: 0, marginRight: 12, marginTop: 2,
        }}>◎</div>
      )}
      <div style={{
        maxWidth: "72%",
        padding: "13px 17px",
        borderRadius: role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: role === "user" ? "rgba(200,168,130,0.12)" : "rgba(255,255,255,0.04)",
        border: role === "user" ? "1px solid rgba(200,168,130,0.2)" : "1px solid rgba(255,255,255,0.06)",
        fontFamily: "'Syne', sans-serif",
        fontSize: 13.5, lineHeight: 1.7,
        color: role === "user" ? "var(--nude-light)" : "rgba(244,239,233,0.88)",
      }}>
        {formatText(text)}
      </div>
      {role === "user" && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "rgba(200,168,130,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "var(--nude)", flexShrink: 0, marginLeft: 12, marginTop: 2,
          fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em",
        }}>you</div>
      )}
    </div>
  );
}

function SessionItem({ session, active, onClick, onDelete }) {
  const [hover, setHover] = useState(false);
  const date = new Date(session.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: active ? "rgba(200,168,130,0.12)" : hover ? "rgba(200,168,130,0.05)" : "transparent",
        border: active ? "1px solid rgba(200,168,130,0.2)" : "1px solid transparent",
        cursor: "none",
        transition: "all 0.15s",
        marginBottom: 4,
        position: "relative",
      }}
    >
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11,
        color: active ? "var(--nude-light)" : "rgba(244,239,233,0.6)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        paddingRight: hover ? 20 : 0, transition: "padding 0.15s",
      }}>
        {session.title}
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9,
        color: "rgba(200,168,130,0.35)", marginTop: 3, letterSpacing: "0.06em",
      }}>
        {date} · {session.message_count} msgs
      </div>
      {hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "rgba(200,168,130,0.4)",
            fontSize: 13, cursor: "none", padding: 2, lineHeight: 1,
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "rgba(200,168,130,0.8)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "rgba(200,168,130,0.4)"}
        >×</button>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions]           = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  const userContext = {
    name        : user?.name,
    branch      : user?.branch,
    year        : user?.year,
    target_exam : user?.target_exam,
    subjects    : user?.subjects || [],
  };

  // ── Load sessions on mount ─────────────────────────────────────────────────
  useEffect(() => {
    loadSessions();
  }, []);

  // ── Scroll to bottom on new message ───────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await axios.get(`${API}/chat/sessions`);
      setSessions(res.data);
      // Auto-open the most recent session if exists
      if (res.data.length > 0) {
        openSession(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const openSession = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/chat/sessions/${sessionId}`);
      setActiveSessionId(sessionId);
      setMessages(res.data.messages.map(m => ({ role: m.role, text: m.content })));
    } catch (err) {
      console.error("Failed to open session", err);
    }
  };

  const newSession = async () => {
    try {
      const res = await axios.post(`${API}/chat/sessions`, { title: "New Chat" });
      const session = res.data;
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([{
        role: "assistant",
        text: `Hi ${user?.name?.split(" ")[0] || "there"}! Starting a new session. What would you like to work on?`,
      }]);
    } catch (err) {
      console.error("Failed to create session", err);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await axios.delete(`${API}/chat/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        // Open next session if any
        const remaining = sessions.filter(s => s.id !== sessionId);
        if (remaining.length > 0) openSession(remaining[0].id);
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    let sessionId = activeSessionId;

    // Create a session if none exists
    if (!sessionId) {
      try {
        const res = await axios.post(`${API}/chat/sessions`, { title: "New Chat" });
        sessionId = res.data.id;
        setSessions(prev => [res.data, ...prev]);
        setActiveSessionId(sessionId);
      } catch {
        return;
      }
    }

    // Optimistically add user message
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat/sessions/${sessionId}/messages`, {
        message      : msg,
        user_context : userContext,
      });

      const { assistant_message, session_title } = res.data;

      // Update session title in sidebar
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, title: session_title, message_count: (s.message_count || 0) + 2, updated_at: new Date().toISOString() }
          : s
      ));

      setMessages(prev => [...prev, { role: "assistant", text: assistant_message.content }]);
    } catch (err) {
      const errMsg = err?.response?.data?.error || "Something went wrong. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", text: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--black)" }}>
      <DashSidebar />

      {/* ── Chat history sidebar ── */}
      <div style={{
        width: 240, borderRight: "1px solid var(--card-border)",
        display: "flex", flexDirection: "column", flexShrink: 0,
        background: "rgba(10,8,6,0.6)",
      }}>
        {/* Header */}
        <div style={{ padding: "84px 14px 14px", borderBottom: "1px solid var(--card-border)" }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 9,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "rgba(200,168,130,0.35)", marginBottom: 10,
          }}>Chat History</div>
          <button
            onClick={newSession}
            style={{
              width: "100%", padding: "8px 0",
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--nude)", background: "rgba(200,168,130,0.08)",
              border: "1px solid rgba(200,168,130,0.2)", borderRadius: 7,
              cursor: "none", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,168,130,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,168,130,0.08)"; }}
          >
            + New Chat
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", scrollbarWidth: "none" }}>
          {sessionsLoading ? (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(200,168,130,0.3)", textAlign: "center", marginTop: 20 }}>
              Loading…
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(200,168,130,0.25)", textAlign: "center", marginTop: 30, lineHeight: 1.8 }}>
              No chats yet.<br />Start a new one above.
            </div>
          ) : (
            sessions.map(s => (
              <SessionItem
                key={s.id}
                session={s}
                active={s.id === activeSessionId}
                onClick={() => openSession(s.id)}
                onDelete={deleteSession}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "82px 40px 18px",
          borderBottom: "1px solid var(--card-border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "rgba(200,168,130,0.4)" }}>◎</span>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(20px, 2vw, 28px)", fontWeight: 300,
              letterSpacing: "-0.02em", color: "var(--white)", lineHeight: 1,
            }}>
              AI <em style={{ color: "var(--nude)", fontStyle: "italic" }}>Tutor</em>
            </h1>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(200,168,130,0.3)", marginLeft: 6,
            }}>
              Powered by Gemini · exam-aware
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 48px", scrollbarWidth: "none" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>

            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div style={{ textAlign: "center", paddingTop: 60 }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 300,
                  color: "rgba(244,239,233,0.15)", marginBottom: 8, lineHeight: 1.1,
                }}>
                  What do you want to<br />
                  <em style={{ color: "rgba(200,168,130,0.3)", fontStyle: "italic" }}>learn</em> today?
                </div>
                <p style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                  color: "rgba(200,168,130,0.25)", letterSpacing: "0.06em", marginBottom: 40,
                }}>
                  Hi {firstName}! Select a past chat or start a new one.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 11,
                        color: "rgba(200,168,130,0.55)",
                        background: "rgba(200,168,130,0.06)",
                        border: "1px solid rgba(200,168,130,0.15)",
                        borderRadius: 20, padding: "8px 16px",
                        cursor: "none", transition: "all 0.2s", letterSpacing: "0.03em",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--nude)";
                        e.currentTarget.style.background = "rgba(200,168,130,0.12)";
                        e.currentTarget.style.borderColor = "rgba(200,168,130,0.3)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = "rgba(200,168,130,0.55)";
                        e.currentTarget.style.background = "rgba(200,168,130,0.06)";
                        e.currentTarget.style.borderColor = "rgba(200,168,130,0.15)";
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => <Message key={i} role={m.role} text={m.text} />)}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "rgba(200,168,130,0.15)", border: "1px solid rgba(200,168,130,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "var(--nude)", flexShrink: 0,
                }}>◎</div>
                <div style={{ display: "flex", gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "var(--nude)",
                      animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: "14px 48px 26px", borderTop: "1px solid var(--card-border)", flexShrink: 0 }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a question, request an explanation…"
              rows={1}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--card-border)",
                borderRadius: 10, padding: "12px 16px",
                fontFamily: "'DM Mono', monospace", fontSize: 12,
                color: "var(--white)", resize: "none", outline: "none",
                cursor: "none", lineHeight: 1.5,
                transition: "border-color 0.2s",
                overflowY: "auto",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(200,168,130,0.4)"}
              onBlur={e => e.target.style.borderColor = "var(--card-border)"}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 42, height: 42, borderRadius: 10, border: "none",
                background: input.trim() && !loading ? "var(--nude)" : "rgba(200,168,130,0.1)",
                color: input.trim() && !loading ? "var(--black)" : "rgba(200,168,130,0.25)",
                fontSize: 17, cursor: "none", transition: "all 0.2s", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >↑</button>
          </div>
          <div style={{
            maxWidth: 760, margin: "8px auto 0",
            fontFamily: "'DM Mono', monospace", fontSize: 9,
            color: "rgba(200,168,130,0.2)", letterSpacing: "0.08em", textAlign: "center",
          }}>
            ENTER to send · SHIFT+ENTER for new line · All chats saved automatically
          </div>
        </div>
      </div>

      <Navbar />

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}