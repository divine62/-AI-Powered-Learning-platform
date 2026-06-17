import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = "http://127.0.0.1:5000";

const LEVEL_COLORS = [
  "rgba(255,255,255,0.04)",
  "rgba(200,168,130,0.18)",
  "rgba(200,168,130,0.36)",
  "rgba(200,168,130,0.6)",
  "var(--nude)",
];

const DAY_LABELS = ["M", "", "W", "", "F", "", "S"];

// Build a 10-week grid (70 cells) ending today
// Returns array of 10 weeks, each week = 7 day-level values (0-4)
function buildGrid(activeDates) {
  const dateSet = new Set(activeDates); // "YYYY-MM-DD" strings

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find Monday of the current week
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + mondayOffset);

  // Go back 9 more weeks to get 10 weeks total
  const gridStart = new Date(thisMonday);
  gridStart.setDate(thisMonday.getDate() - 9 * 7);

  const weeks = [];
  for (let w = 0; w < 10; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(gridStart);
      cell.setDate(gridStart.getDate() + w * 7 + d);
      const key = cell.toISOString().slice(0, 10);
      // Future days = 0
      if (cell > today) {
        days.push(0);
      } else if (dateSet.has(key)) {
        days.push(3); // active day
      } else {
        days.push(0);
      }
    }
    weeks.push(days);
  }
  return weeks;
}

export default function StreakCalendar() {
  const { user } = useAuth();
  const [grid,    setGrid]    = useState(() => buildGrid([]));
  const [loading, setLoading] = useState(true);

  const streak = user?.stats?.streak ?? 0;

  useEffect(() => {
    const token = localStorage.getItem("kt_token");
    if (!token) { setLoading(false); return; }

    // Fetch both watch history and quiz history to build activity
    Promise.all([
      axios.get(`${API}/api/watch-history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      axios.get(`${API}/api/quiz/history`,  { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
    ]).then(([watchRes, quizRes]) => {
      const watchDates = (Array.isArray(watchRes.data) ? watchRes.data : (watchRes.data.history || []))
        .map(v => v.watched_at?.slice(0, 10))
        .filter(Boolean);

      // Quiz history returns {date: "Jun 14, 2025"} — convert to YYYY-MM-DD
      const quizDates = (Array.isArray(quizRes.data) ? quizRes.data : [])
        .map(q => {
          if (!q.created_at && !q.date) return null;
          // created_at is ISO if returned, date is "Jun 14, 2025"
          if (q.created_at) return q.created_at.slice(0, 10);
          try { return new Date(q.date).toISOString().slice(0, 10); } catch { return null; }
        })
        .filter(Boolean);

      const allDates = [...new Set([...watchDates, ...quizDates])];
      setGrid(buildGrid(allDates));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(244,239,233,0.35)" }}>
          Learning Activity
        </div>
        <div className="flex items-center gap-1.5">
          {streak > 0
            ? <>
                <span className="font-mono" style={{ fontSize: 10, color: "var(--nude)" }}>🔥 {streak}</span>
                <span className="font-mono" style={{ fontSize: 9, color: "rgba(244,239,233,0.3)" }}>day streak</span>
              </>
            : <span className="font-mono" style={{ fontSize: 9, color: "rgba(244,239,233,0.25)" }}>
                Log in daily to build a streak
              </span>
          }
        </div>
      </div>

      {/* Grid */}
      <div className="flex gap-1">
        {/* Day labels — M W F on rows 0,2,4 */}
        <div
          className="flex flex-col gap-0.5 pr-2"
          style={{ paddingTop: 0 }}
        >
          {DAY_LABELS.map((d, i) => (
            <div
              key={i}
              className="font-mono"
              style={{ fontSize: 8, color: "rgba(244,239,233,0.22)", height: 10, lineHeight: "10px" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((level, di) => (
              <div
                key={di}
                className="rounded-sm"
                style={{
                  width: 10, height: 10,
                  background: LEVEL_COLORS[Math.min(level, 4)],
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="font-mono" style={{ fontSize: 8, color: "rgba(244,239,233,0.25)" }}>Less</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} className="rounded-sm" style={{ width: 10, height: 10, background: c }} />
        ))}
        <span className="font-mono" style={{ fontSize: 8, color: "rgba(244,239,233,0.25)" }}>More</span>
      </div>
    </div>
  );
}