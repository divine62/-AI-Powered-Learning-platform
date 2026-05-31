const VIDEOS = [
  { title: "Introduction to Machine Learning", channel: "3Blue1Brown", duration: "18:42", progress: 100, badge: "Completed", badgeColor: "rgba(40,200,100,0.12)", badgeText: "#5CE89A" },
  { title: "Neural Networks from Scratch",     channel: "Sentdex",       duration: "24:15", progress: 62,  badge: "In Progress", badgeColor: "rgba(200,168,130,0.12)", badgeText: "var(--nude)" },
  { title: "Python for Data Science",          channel: "Corey Schafer",  duration: "45:00", progress: 33,  badge: "In Progress", badgeColor: "rgba(200,168,130,0.12)", badgeText: "var(--nude)" },
  { title: "The Beauty of Bezier Curves",      channel: "Freya Holmér",   duration: "27:08", progress: 0,   badge: "Not Started", badgeColor: "rgba(255,255,255,0.05)",  badgeText: "rgba(244,239,233,0.3)" },
  { title: "Understanding Transformers",       channel: "Andrej Karpathy", duration: "1:58:45", progress: 0, badge: "Saved",       badgeColor: "rgba(130,160,200,0.12)",  badgeText: "#82A0C8" },
];

function ProgressBar({ pct }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: pct === 100
            ? "linear-gradient(90deg, #3ab87a, #5CE89A)"
            : "linear-gradient(90deg, var(--nude-dark), var(--nude))",
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

export default function RecentVideos() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(244,239,233,0.35)" }}>
          Recent Videos
        </div>
        <button
          className="font-mono uppercase transition-colors duration-200"
          style={{ fontSize: 8, letterSpacing: "0.12em", color: "var(--nude)", background: "none", border: "none", cursor: "none" }}
        >
          View All →
        </button>
      </div>

      {/* Rows */}
      {VIDEOS.map((v, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-150"
          style={{
            borderBottom: i < VIDEOS.length - 1 ? "1px solid rgba(244,239,233,0.04)" : "none",
            cursor: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {/* Thumbnail placeholder */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{
              width: 54,
              height: 36,
              background: "linear-gradient(135deg, rgba(200,168,130,0.15), rgba(200,168,130,0.04))",
              fontSize: 14,
            }}
          >
            ▶
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div
              className="font-sans truncate mb-0.5"
              style={{ fontSize: 13, fontWeight: 600, color: "var(--off-white)" }}
            >
              {v.title}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono" style={{ fontSize: 10, color: "rgba(244,239,233,0.32)" }}>
                {v.channel}
              </span>
              <span style={{ color: "rgba(244,239,233,0.15)", fontSize: 10 }}>·</span>
              <span className="font-mono" style={{ fontSize: 10, color: "rgba(244,239,233,0.28)" }}>
                {v.duration}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: 80, flexShrink: 0 }}>
            <ProgressBar pct={v.progress} />
          </div>

          {/* Badge */}
          <div
            className="font-mono rounded-full px-3 py-1 flex-shrink-0"
            style={{
              fontSize: 8,
              letterSpacing: "0.08em",
              background: v.badgeColor,
              color: v.badgeText,
            }}
          >
            {v.badge}
          </div>
        </div>
      ))}
    </div>
  );
}
