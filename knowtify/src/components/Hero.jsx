import FloatingUI from "./FloatingUI";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center overflow-hidden px-10"
      style={{ height: "100vh" }}
    >
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 800,
          height: 800,
          background: "radial-gradient(circle, rgba(200,168,130,0.055) 0%, transparent 68%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
        }}
      />

      {/* Eyebrow — pushed down so it clears the fixed navbar */}
      <div
        className="relative z-10 font-mono text-xs uppercase tracking-[0.22em] opacity-0"
        style={{
          color: "var(--nude)",
          animation: "fadeUp 0.7s ease 0.2s forwards",
          marginTop: 72,   /* clears the ~64px fixed navbar */
        }}
      >
        AI-Powered Learning Platform
      </div>

      {/* Headline */}
      <h1
        className="relative z-10 font-serif font-light text-center opacity-0"
        style={{
          fontSize: "clamp(52px, 8.5vw, 116px)",
          lineHeight: 0.92,
          letterSpacing: "-0.025em",
          margin: "22px 0 18px",
          animation: "fadeUp 1s ease 0.4s forwards",
        }}
      >
        YouTube,
        <br />
        but built for{" "}
        <em className="italic" style={{ color: "var(--nude)" }}>
          learning.
        </em>
      </h1>

      {/* Sub */}
      <p
        className="relative z-10 font-mono text-center opacity-0"
        style={{
          fontSize: 12,
          letterSpacing: "0.07em",
          color: "rgba(244,239,233,0.38)",
          marginBottom: 56,
          animation: "fadeUp 0.8s ease 0.7s forwards",
        }}
      >
        Turn any video into structured knowledge — instantly.
      </p>

      {/* Floating interface */}
      <FloatingUI />

      {/* Scroll hint */}
      <div
        className="absolute bottom-9 flex flex-col items-center gap-2 opacity-0"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(244,239,233,0.25)",
          animation: "fadeUp 0.7s ease 1.4s forwards",
          zIndex: 2,
        }}
      >
        <span>Scroll</span>
        <div
          style={{
            width: 1,
            height: 44,
            background: "linear-gradient(to bottom, var(--nude-dark), transparent)",
            animation: "scrollLine 2s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes scrollLine {
          0%,100% { opacity: 0.25; transform: scaleY(1); }
          50%      { opacity: 0.7;  transform: scaleY(1.15); }
        }
      `}</style>
    </section>
  );
}