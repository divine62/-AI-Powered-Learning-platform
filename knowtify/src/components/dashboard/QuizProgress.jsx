import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:5000/api";

function ScoreRing({ pct }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? "#5CE89A" : pct >= 60 ? "var(--nude)" : "#E87060";

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 18 18)" style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="18" y="18" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 8, fontFamily: "'DM Mono', monospace", fill: color, fontWeight: 400 }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function QuizProgress() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kt_token");
    if (!token) { setLoading(false); return; }

    axios.get(`${API}/quiz/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setQuizzes(res.data || []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid var(--card-border)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--card-border)" }}>
        <div className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(244,239,233,0.35)" }}>
          Quiz Scores
        </div>
        <div className="font-mono rounded-full px-2.5 py-1"
          style={{ fontSize: 8, background: "rgba(200,168,130,0.1)", color: "var(--nude)", letterSpacing: "0.08em" }}>
          {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}
        </div>
      </div>

      {/* List */}
      <div className="p-4 flex flex-col gap-3">
        {loading && (
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "#444", textAlign: "center", padding: "20px 0" }}>
            Loading…
          </p>
        )}
        {!loading && quizzes.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "#444" }}>No quizzes yet.</p>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", color: "#333", marginTop: "6px" }}>
              Take your first quiz to see scores here.
            </p>
          </div>
        )}
        {quizzes.map((q, i) => (
          <div key={i} className="flex items-center gap-4">
            <ScoreRing pct={q.score} />
            <div className="flex-1 min-w-0">
              <div className="font-sans truncate"
                style={{ fontSize: 12, fontWeight: 600, color: "var(--off-white)", marginBottom: 2 }}>
                {q.subject}
              </div>
              <div className="font-mono"
                style={{ fontSize: 9, color: "rgba(244,239,233,0.3)" }}>
                {q.total_questions} questions · {q.difficulty} · {q.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}