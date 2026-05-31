import { useReveal } from "../hooks/useReveal";

const NAV_ITEMS = ["Dashboard", "My Videos", "AI Notes", "Quizzes", "AI Tutor", "Progress"];
const QUIZ_BARS = [
  { label: "Python Basics", pct: 92 },
  { label: "ML Intro", pct: 78 },
  { label: "Data Structures", pct: 85 },
];

function StatCard({ label, value, unit, accent }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--card-border)" }}
    >
      <div className="font-mono uppercase mb-1" style={{ fontSize: 8, letterSpacing: "0.1em", color: "rgba(244,239,233,0.28)" }}>
        {label}
      </div>
      <div className="font-sans font-semibold" style={{ fontSize: 20, color: accent ? "var(--nude)" : "var(--nude-light)" }}>
        {value}
      </div>
      <div className="font-mono mt-0.5" style={{ fontSize: 9, color: "rgba(244,239,233,0.28)" }}>
        {unit}
      </div>
    </div>
  );
}

function VideoRow({ badge }) {
  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-lg mb-2"
      style={{ background: "rgba(255,255,255,0.018)" }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded"
        style={{
          width: 46,
          height: 30,
          background: "linear-gradient(135deg, rgba(200,168,130,0.14), rgba(200,168,130,0.04))",
          fontSize: 11,
        }}
      >
        ▶
      </div>
      <div className="flex-1">
        <div className="rounded-sm mb-1" style={{ height: 6, width: "90%", background: "rgba(244,239,233,0.1)" }} />
        <div className="rounded-sm" style={{ height: 5, width: "58%", background: "rgba(244,239,233,0.05)" }} />
      </div>
      <div
        className="font-mono rounded"
        style={{
          fontSize: 7,
          padding: "2px 7px",
          background: "rgba(200,168,130,0.1)",
          color: "var(--nude)",
          letterSpacing: "0.07em",
        }}
      >
        {badge}
      </div>
    </div>
  );
}

export default function DashboardPreview() {
  const eyebrowRef = useReveal();
  const headRef = useReveal(0.12);
  const mockRef = useReveal(0.25);

  return (
    <section
      className="flex flex-col items-center justify-center px-10"
      style={{ minHeight: "100vh", padding: "120px 40px" }}
    >
      {/* Eyebrow */}
      <div
        ref={eyebrowRef}
        className="reveal font-mono uppercase mb-4"
        style={{ fontSize: 10, letterSpacing: "0.22em", color: "var(--nude)" }}
      >
        Your Learning Dashboard
      </div>

      {/* Headline */}
      <h2
        ref={headRef}
        className="reveal font-serif font-light text-center mb-14"
        style={{
          fontSize: "clamp(34px, 4.5vw, 58px)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          maxWidth: 680,
        }}
      >
        Everything in one place.
        <br />
        <em className="italic" style={{ color: "var(--nude)" }}>
          Built for focus.
        </em>
      </h2>

      {/* Mockup */}
      <div
        ref={mockRef}
        className="reveal w-full overflow-hidden"
        style={{
          maxWidth: 860,
          background: "rgba(12,10,8,0.92)",
          border: "1px solid var(--card-border)",
          borderRadius: 18,
          boxShadow: "0 60px 120px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.035)",
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderBottom: "1px solid var(--card-border)" }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
          <div
            className="mx-auto font-mono"
            style={{ fontSize: 9, color: "rgba(244,239,233,0.25)", letterSpacing: "0.1em" }}
          >
            Knowtify — Dashboard
          </div>
        </div>

        {/* Body */}
        <div className="grid" style={{ gridTemplateColumns: "210px 1fr 190px", minHeight: 380 }}>
          {/* Sidebar */}
          <div className="p-4" style={{ borderRight: "1px solid var(--card-border)" }}>
            {NAV_ITEMS.map((item) => (
              <div key={item} className={`dash-nav-item ${item === "Dashboard" ? "active" : ""}`}>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-40"
                  style={{ background: "currentColor" }}
                />
                {item}
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="p-4 flex flex-col gap-3">
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              <StatCard label="Streak" value="14" unit="days 🔥" />
              <StatCard label="Videos" value="38" unit="this month" />
              <StatCard label="Quiz Avg" value="87%" unit="score" accent />
            </div>
            <div
              className="font-mono uppercase mb-2"
              style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(244,239,233,0.28)" }}
            >
              Recommended Videos
            </div>
            <VideoRow badge="New" />
            <VideoRow badge="Continue" />
            <VideoRow badge="Saved" />
          </div>

          {/* Right panel */}
          <div
            className="p-4 flex flex-col gap-3"
            style={{ borderLeft: "1px solid var(--card-border)" }}
          >
            <div
              className="font-mono uppercase mb-1"
              style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(244,239,233,0.28)" }}
            >
              Quiz Progress
            </div>
            {QUIZ_BARS.map((q) => (
              <div key={q.label} className="mb-2">
                <div
                  className="font-mono flex justify-between mb-1"
                  style={{ fontSize: 8, color: "rgba(244,239,233,0.35)" }}
                >
                  <span>{q.label}</span>
                  <span style={{ color: "var(--nude)" }}>{q.pct}%</span>
                </div>
                <div className="rounded-sm overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${q.pct}%`, background: "linear-gradient(90deg, var(--nude-dark), var(--nude))" }}
                  />
                </div>
              </div>
            ))}

            {/* Tutor mini */}
            <div
              className="rounded-xl p-3 mt-auto"
              style={{ background: "rgba(200,168,130,0.055)", border: "1px solid rgba(200,168,130,0.1)" }}
            >
              <div
                className="font-mono uppercase mb-2"
                style={{ fontSize: 8, letterSpacing: "0.1em", color: "var(--nude)" }}
              >
                AI Tutor
              </div>
              {[100, 100, 65].map((w, i) => (
                <div
                  key={i}
                  className="rounded-sm mb-1"
                  style={{ height: 5, width: `${w}%`, background: "rgba(244,239,233,0.07)" }}
                />
              ))}
              <div
                className="mt-2 rounded-md"
                style={{ height: 24, background: "rgba(255,255,255,0.04)", border: "1px solid var(--card-border)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
