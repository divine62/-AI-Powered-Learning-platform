export function VideoThumb({ title = "Introduction to Machine Learning — 12:34", progress = 42 }) {
  return (
    <div
      className="w-full h-full rounded-lg relative flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(145deg, #18120c, #0a0807)" }}
    >
      {/* Waveform bars */}
      <div className="flex gap-[3px] items-end h-9">
        {[60, 100, 40, 80, 55, 90, 38].map((h, i) => (
          <div
            key={i}
            className="v-bar"
            style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>

      {/* Play button */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: "rgba(200,168,130,0.88)" }}
      >
        <div
          style={{
            borderStyle: "solid",
            borderWidth: "7px 0 7px 13px",
            borderColor: "transparent transparent transparent #060606",
            marginLeft: "3px",
          }}
        />
      </div>

      {/* Title */}
      <div
        className="absolute bottom-2.5 left-2.5 right-2.5 font-mono uppercase"
        style={{ fontSize: "8px", letterSpacing: "0.1em", color: "rgba(200,168,130,0.65)" }}
      >
        {title}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-sm" style={{ width: `${progress}%`, background: "var(--nude)" }} />
      </div>
    </div>
  );
}

export function NotesCard() {
  return (
    <div className="glass-card p-5">
      <div className="card-tag">AI Notes</div>
      <div className="card-line" style={{ width: "92%" }} />
      <div className="card-line card-line-highlight" />
      <div className="card-line" style={{ width: "65%" }} />
      <div className="card-line" style={{ width: "92%" }} />
      <div className="card-line card-line-highlight" />
      <div className="card-line" style={{ width: "65%" }} />
    </div>
  );
}

export function QuizCard() {
  return (
    <div className="glass-card p-5">
      <div className="card-tag">Quiz</div>
      {[
        { selected: true, w: "100%" },
        { selected: false, w: "72%" },
        { selected: false, w: "82%" },
      ].map((opt, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              border: opt.selected ? "none" : "1px solid var(--card-border)",
              background: opt.selected ? "var(--nude)" : "transparent",
            }}
          />
          <div
            className="h-1.5 rounded-sm flex-1"
            style={{ width: opt.w, background: "rgba(244,239,233,0.07)" }}
          />
        </div>
      ))}
    </div>
  );
}

export function TutorCard() {
  return (
    <div className="glass-card p-5">
      <div className="card-tag">AI Tutor</div>
      <div
        className="rounded-lg p-2.5 mb-2"
        style={{ background: "rgba(200,168,130,0.07)", border: "1px solid rgba(200,168,130,0.09)" }}
      >
        {[100, 100, 100, 72].map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded-sm mb-1 last:mb-0"
            style={{ width: `${w}%`, background: "rgba(244,239,233,0.09)" }}
          />
        ))}
      </div>
      <div
        className="flex gap-2 items-center p-2 rounded-lg mt-2"
        style={{ background: "rgba(255,255,255,0.035)", border: "1px solid var(--card-border)" }}
      >
        <div className="h-1.5 rounded-sm flex-1" style={{ background: "rgba(244,239,233,0.07)" }} />
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px]"
          style={{ background: "var(--nude)", color: "var(--black)" }}
        >
          →
        </div>
      </div>
    </div>
  );
}
