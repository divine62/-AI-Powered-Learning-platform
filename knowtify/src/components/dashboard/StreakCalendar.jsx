// Generates the last 10 weeks of fake activity data
function generateActivity() {
  const weeks = [];
  for (let w = 9; w >= 0; w--) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      // More likely to have activity in recent weeks
      const rand = Math.random();
      const level = rand < 0.3 ? 0 : rand < 0.55 ? 1 : rand < 0.75 ? 2 : rand < 0.9 ? 3 : 4;
      days.push(level);
    }
    weeks.push(days);
  }
  // Force last 14 days active for the "14 day streak" stat
  weeks[9][1] = 3; weeks[9][2] = 4; weeks[9][3] = 3; weeks[9][4] = 2; weeks[9][5] = 4; weeks[9][6] = 3;
  weeks[8][0] = 2; weeks[8][1] = 3; weeks[8][2] = 4; weeks[8][3] = 2; weeks[8][4] = 3; weeks[8][5] = 4; weeks[8][6] = 2;
  return weeks;
}

const ACTIVITY = generateActivity();

const LEVEL_COLORS = [
  "rgba(255,255,255,0.04)",
  "rgba(200,168,130,0.18)",
  "rgba(200,168,130,0.36)",
  "rgba(200,168,130,0.6)",
  "var(--nude)",
];

const DAY_LABELS = ["M", "W", "F"];

export default function StreakCalendar() {
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
          <span className="font-mono" style={{ fontSize: 10, color: "var(--nude)" }}>🔥 14</span>
          <span className="font-mono" style={{ fontSize: 9, color: "rgba(244,239,233,0.3)" }}>day streak</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col justify-around pr-2" style={{ height: 7 * 10 + 6 * 2 }}>
          {DAY_LABELS.map((d) => (
            <div key={d} className="font-mono" style={{ fontSize: 8, color: "rgba(244,239,233,0.22)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {ACTIVITY.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((level, di) => (
              <div
                key={di}
                className="rounded-sm"
                style={{
                  width: 10,
                  height: 10,
                  background: LEVEL_COLORS[level],
                  transition: "background 0.2s",
                }}
                title={`Activity level ${level}`}
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
