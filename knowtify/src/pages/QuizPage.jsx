import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

// No Gemini key here — all AI calls go through Flask
const API = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");

const SUBJECTS = [
  "Data Structures & Algorithms",
  "Operating Systems",
  "Database Management (DBMS)",
  "Computer Networks",
  "Object Oriented Programming",
  "Theory of Computation",
  "Computer Architecture",
  "Software Engineering",
  "Python Programming",
  "C / C++",
  "Mathematics / Discrete Maths",
  "Machine Learning",
];

export default function QuizPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [phase,      setPhase]     = useState("setup");
  const [subject,    setSubject]   = useState("");
  const [customSub,  setCustomSub] = useState("");
  const [difficulty, setDiff]      = useState("Medium");
  const [questions,  setQuestions] = useState([]);
  const [current,    setCurrent]   = useState(0);
  const [answers,    setAnswers]   = useState({});
  const [selected,   setSelected]  = useState(null);
  const [revealed,   setRevealed]  = useState(false);
  const [error,      setError]     = useState("");
  const [recentVideos, setRecentVideos] = useState([]);

  const finalSubject = subject === "Other" ? customSub : subject;

  useEffect(() => {
    const token = localStorage.getItem("kt_token");
    if (!token) return;
    axios.get(`${API}/watch-history`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data.history || []);
      setRecentVideos(list.slice(0, 4));
    }).catch(() => {});
  }, []);

  const generateQuiz = async () => {
    if (!finalSubject.trim()) { setError("Please select or enter a subject."); return; }
    setError("");
    setPhase("loading");

    try {
      const res = await axios.post(
        `${API}/quiz/generate`,
        { subject: finalSubject, difficulty },
        { headers: { Authorization: `Bearer ${localStorage.getItem("kt_token")}` } }
      );

      const parsed = res.data.questions;
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No questions returned");

      setQuestions(parsed);
      setCurrent(0); setAnswers({}); setSelected(null); setRevealed(false);
      setPhase("quiz");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate quiz. Please try again.";
      setError(msg);
      setPhase("setup");
    }
  };

  const selectAnswer = (letter) => {
    if (revealed) return;
    setSelected(letter);
    setRevealed(true);
    setAnswers(a => ({ ...a, [current]: letter }));
  };

  const next = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(answers[current + 1] || null);
      setRevealed(!!answers[current + 1]);
    } else {
      submitResults();
    }
  };

  const submitResults = async () => {
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    const pct   = Math.round((score / questions.length) * 100);
    try {
      await axios.post(`${API}/quiz/submit`, {
        subject: finalSubject, score: pct,
        total_questions: questions.length, difficulty,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("kt_token")}` } });
    } catch { /* non-blocking */ }
    setPhase("results");
  };

  if (phase === "setup")   return <SetupScreen subject={subject} setSubject={setSubject} customSub={customSub} setCustomSub={setCustomSub} difficulty={difficulty} setDiff={setDiff} error={error} onStart={generateQuiz} recentVideos={recentVideos} />;
  if (phase === "loading") return <LoadingScreen subject={finalSubject} />;
  if (phase === "quiz")    return <QuizScreen questions={questions} current={current} selected={selected} revealed={revealed} answers={answers} onSelect={selectAnswer} onNext={next} />;
  if (phase === "results") return <ResultsScreen questions={questions} answers={answers} subject={finalSubject} onRetry={() => setPhase("setup")} onDashboard={() => navigate("/dashboard")} />;
}

function SetupScreen({ subject, setSubject, customSub, setCustomSub, difficulty, setDiff, error, onStart, recentVideos }) {
  return (
    <div style={{ paddingTop: "100px", paddingBottom: "80px", minHeight: "100vh", background: "var(--black)" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 24px" }}>
        <p style={tagStyle}>AI Quiz Generator</p>
        <h1 style={heroStyle}>
          Test your <em style={{ color: "var(--nude)", fontStyle: "italic" }}>knowledge.</em>
        </h1>
        <p style={subStyle}>Pick a subject and get 10 AI-generated exam questions instantly.</p>

        {recentVideos.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <p style={{ ...subStyle, marginBottom: "10px", color: "rgba(200,168,130,0.45)" }}>
              From your watch history
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentVideos.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSubject(v.subject || v.title || "Other")}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 14px",
                    background: subject === (v.subject || v.title || "Other") ? "rgba(200,168,130,0.12)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${subject === (v.subject || v.title || "Other") ? "rgba(200,168,130,0.35)" : "rgba(200,168,130,0.1)"}`,
                    borderRadius: "10px", cursor: "none", textAlign: "left",
                    transition: "all 0.15s", width: "100%",
                  }}
                >
                  {v.thumbnail
                    ? <img src={v.thumbnail} alt="" style={{ width: 44, height: 30, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    : <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🎬</span>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: "12px", color: "rgba(244,239,233,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.title || "Untitled"}
                    </div>
                    {v.subject && (
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: "9px", color: "rgba(200,168,130,0.4)", marginTop: 2 }}>
                        {v.subject}
                      </div>
                    )}
                  </div>
                  {subject === (v.subject || v.title || "Other") && (
                    <span style={{ color: "var(--nude)", fontSize: "0.8rem", flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card" style={{ padding: "32px", marginTop: recentVideos.length > 0 ? "20px" : "32px" }}>
          {recentVideos.length > 0 && (
            <p style={{ ...subStyle, marginBottom: "14px", color: "rgba(200,168,130,0.35)" }}>Or choose a subject</p>
          )}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Subject</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => setSubject(s)} style={chipBtn(subject === s)}>{s}</button>
              ))}
              <button onClick={() => setSubject("Other")} style={chipBtn(subject === "Other")}>Other</button>
            </div>
            {subject === "Other" && (
              <input
                style={{ ...inputStyle, marginTop: "12px" }}
                placeholder="Enter subject name…"
                value={customSub}
                onChange={e => setCustomSub(e.target.value)}
              />
            )}
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={labelStyle}>Difficulty</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {["Easy", "Medium", "Hard"].map(d => (
                <button key={d} onClick={() => setDiff(d)} style={{
                  ...chipBtn(difficulty === d), flex: 1, padding: "10px",
                  color: difficulty === d ? d === "Easy" ? "#4ade80" : d === "Hard" ? "#f87171" : "var(--nude)" : "rgba(244,239,233,0.35)",
                  borderColor: difficulty === d ? d === "Easy" ? "#4ade80" : d === "Hard" ? "#f87171" : "var(--nude)" : "var(--card-border)",
                  background: difficulty === d ? d === "Easy" ? "rgba(74,222,128,0.1)" : d === "Hard" ? "rgba(248,113,113,0.1)" : "rgba(200,168,130,0.1)" : "transparent",
                }}>{d}</button>
              ))}
            </div>
          </div>

          {error && <div style={errorStyle}>{error}</div>}
          <button onClick={onStart} style={primaryBtn}>Generate Quiz →</button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ subject }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "20px" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "2px solid rgba(200,168,130,0.2)", borderTopColor: "var(--nude)", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "#f0ece6", fontWeight: 400 }}>
        Generating your <em style={{ color: "var(--nude)" }}>{subject}</em> quiz…
      </p>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "#555" }}>AI is crafting 10 questions for you</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function QuizScreen({ questions, current, selected, revealed, answers, onSelect, onNext }) {
  const q     = questions[current];
  const total = questions.length;
  const done  = Object.keys(answers).length;

  const optionStyle = (letter) => {
    const base = {
      width: "100%", padding: "14px 16px", borderRadius: "10px",
      fontFamily: "DM Mono, monospace", fontSize: "13px",
      textAlign: "left", cursor: "none", transition: "all 0.15s",
      border: "1px solid var(--card-border)",
      background: "rgba(255,255,255,0.02)",
      color: "rgba(244,239,233,0.7)",
      display: "block", marginBottom: "10px",
    };
    if (!revealed) return base;
    if (letter === q.correct) return { ...base, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80" };
    if (letter === selected && letter !== q.correct) return { ...base, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" };
    return { ...base, opacity: 0.4 };
  };

  return (
    <div style={{ paddingTop: "100px", paddingBottom: "80px", minHeight: "100vh", background: "var(--black)" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", color: "#555", letterSpacing: "0.12em" }}>QUESTION {current + 1} OF {total}</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", color: "var(--nude)" }}>{done} answered</span>
        </div>
        <div style={{ height: "2px", background: "var(--card-border)", borderRadius: "2px", marginBottom: "32px" }}>
          <div style={{ height: "100%", width: `${((current + 1) / total) * 100}%`, background: "var(--nude)", borderRadius: "2px", transition: "width 0.3s" }} />
        </div>
        <div className="glass-card" style={{ padding: "32px", marginBottom: "20px" }}>
          <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "22px", color: "#f0ece6", lineHeight: 1.4, fontWeight: 400, marginBottom: "28px" }}>
            {q.question}
          </p>
          {q.options.map((opt) => {
            const letter = opt.charAt(0);
            return <button key={letter} onClick={() => onSelect(letter)} style={optionStyle(letter)}>{opt}</button>;
          })}
          {revealed && (
            <div style={{ marginTop: "16px", padding: "14px 16px", background: "rgba(200,168,130,0.06)", border: "1px solid rgba(200,168,130,0.15)", borderRadius: "8px" }}>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "9px", letterSpacing: "0.15em", color: "var(--nude)", textTransform: "uppercase" }}>Explanation</span>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "rgba(244,239,233,0.6)", marginTop: "6px", lineHeight: 1.6 }}>{q.explanation}</p>
            </div>
          )}
        </div>
        {revealed && (
          <button onClick={onNext} style={primaryBtn}>
            {current < questions.length - 1 ? "Next Question →" : "See Results →"}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultsScreen({ questions, answers, subject, onRetry, onDashboard }) {
  const score   = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const pct     = Math.round((score / questions.length) * 100);
  const color   = pct >= 80 ? "#4ade80" : pct >= 50 ? "var(--nude)" : "#f87171";
  const message = pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort." : "Keep practising.";
  const r = 54, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;

  return (
    <div style={{ paddingTop: "100px", paddingBottom: "80px", minHeight: "100vh", background: "var(--black)" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 24px" }}>
        <p style={tagStyle}>Quiz Complete</p>
        <h1 style={heroStyle}>
          {message.split(" ")[0]}{" "}
          <em style={{ color, fontStyle: "italic" }}>{message.split(" ").slice(1).join(" ")}</em>
        </h1>
        <div style={{ display: "flex", justifyContent: "center", margin: "32px 0" }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 1s ease" }} />
            <text x="70" y="65" textAnchor="middle" dominantBaseline="central"
              style={{ fontSize: 28, fontFamily: "Cormorant Garamond, serif", fill: color, fontWeight: 500 }}>{pct}%</text>
            <text x="70" y="88" textAnchor="middle"
              style={{ fontSize: 9, fontFamily: "DM Mono, monospace", fill: "#555", letterSpacing: "0.1em" }}>{score}/{questions.length} correct</text>
          </svg>
        </div>
        <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#555", marginBottom: "16px" }}>Question Breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.correct;
              return (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, background: isCorrect ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", border: `1px solid ${isCorrect ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: isCorrect ? "#4ade80" : "#f87171" }}>
                    {isCorrect ? "✓" : "✗"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "rgba(244,239,233,0.7)", marginBottom: "4px", lineHeight: 1.4 }}>{q.question}</p>
                    {!isCorrect && (
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", color: "#4ade80" }}>
                        Correct: {q.options.find(o => o.startsWith(q.correct))}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onRetry} style={{ ...primaryBtn, flex: 1, background: "transparent", color: "var(--nude)", border: "1px solid rgba(200,168,130,0.3)" }}>Try Again</button>
          <button onClick={onDashboard} style={{ ...primaryBtn, flex: 2 }}>Back to Dashboard →</button>
        </div>
      </div>
    </div>
  );
}

const tagStyle   = { fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--nude)", marginBottom: "12px", opacity: 0.8 };
const heroStyle  = { fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 500, lineHeight: 1.05, color: "#f0ece6", margin: "0 0 12px" };
const subStyle   = { fontFamily: "DM Mono, monospace", fontSize: "12px", color: "#666", lineHeight: 1.6 };
const labelStyle = { display: "block", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted2,#666)", marginBottom: "10px" };
const inputStyle = { width: "100%", padding: "10px 12px", background: "var(--black)", border: "1px solid var(--card-border,#2a2a2a)", borderRadius: "8px", color: "#e0dcd6", fontFamily: "DM Mono, monospace", fontSize: "13px", outline: "none", boxSizing: "border-box", cursor: "none" };
const errorStyle = { fontFamily: "DM Mono, monospace", fontSize: "11px", color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px" };
const primaryBtn = { width: "100%", padding: "13px", background: "var(--nude)", color: "var(--black)", border: "none", borderRadius: "8px", fontFamily: "DM Mono, monospace", fontSize: "13px", letterSpacing: "0.08em", fontWeight: 600, cursor: "none", transition: "background 0.2s" };
const chipBtn = (active) => ({ padding: "6px 12px", borderRadius: "20px", border: `1px solid ${active ? "var(--nude)" : "var(--card-border,#2a2a2a)"}`, background: active ? "rgba(200,168,130,0.15)" : "transparent", color: active ? "var(--nude)" : "rgba(244,239,233,0.4)", fontFamily: "DM Mono, monospace", fontSize: "11px", cursor: "none", transition: "all 0.15s", whiteSpace: "nowrap" });