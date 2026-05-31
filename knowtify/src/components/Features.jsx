import { useRef } from "react";
import { useReveal } from "../hooks/useReveal";

const FEATURES = [
  {
    icon: "📋",
    title: "Generate AI Notes",
    desc: "Paste any YouTube URL. Get structured, timestamped notes covering every concept — in seconds.",
  },
  {
    icon: "💬",
    title: "Ask the AI Tutor",
    desc: "Still confused? The AI tutor knows exactly what the video taught and explains it clearly on demand.",
  },
  {
    icon: "🧠",
    title: "Take a Quiz",
    desc: "Auto-generated quizzes built directly from video content. Test retention without any manual effort.",
  },
  {
    icon: "📊",
    title: "Track Progress",
    desc: "Your dashboard shows learning streaks, completed videos, quiz scores, and recommended next steps.",
  },
];

function FeatureCard({ feature, delay }) {
  const cardRef = useRef(null);
  const revealRef = useReveal(delay);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-5px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) scale(1.015)`;
    card.style.background = `radial-gradient(circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgba(200,168,130,0.07), rgba(16,13,10,0.88) 70%)`;
    card.style.borderColor = "rgba(200,168,130,0.24)";
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "";
    card.style.background = "";
    card.style.borderColor = "";
  };

  return (
    <div
      ref={(el) => {
        cardRef.current = el;
        revealRef.current = el;
      }}
      className="reveal glass-card p-8 relative overflow-hidden"
      style={{
        borderRadius: 20,
        transformStyle: "preserve-3d",
        transition:
          "opacity 0.7s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, background 0.3s",
        transitionDelay: `${delay}s`,
        transform: "translateY(50px) rotateX(18deg) rotateY(-4deg)",
        cursor: "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{ background: "linear-gradient(90deg, transparent, rgba(200,168,130,0.28), transparent)" }}
      />

      <span style={{ fontSize: 28, display: "block", marginBottom: 16 }}>{feature.icon}</span>
      <div
        className="font-sans font-semibold mb-2"
        style={{ fontSize: 17, color: "var(--off-white)" }}
      >
        {feature.title}
      </div>
      <p
        className="font-mono leading-relaxed"
        style={{ fontSize: 11, letterSpacing: "0.02em", color: "rgba(244,239,233,0.42)" }}
      >
        {feature.desc}
      </p>
    </div>
  );
}

export default function Features() {
  const headRef = useReveal();

  return (
    <section
      className="flex flex-col items-center justify-center px-10"
      style={{ minHeight: "100vh", padding: "120px 40px" }}
    >
      {/* Divider */}
      <div
        className="mb-20 mx-auto"
        style={{
          width: 1,
          height: 70,
          background: "linear-gradient(to bottom, transparent, rgba(200,168,130,0.25), transparent)",
        }}
      />

      {/* Headline */}
      <h2
        ref={headRef}
        className="reveal font-serif font-light text-center mb-20"
        style={{
          fontSize: "clamp(46px, 6.5vw, 92px)",
          letterSpacing: "-0.025em",
          lineHeight: 0.98,
        }}
      >
        Think.{" "}
        <em className="italic" style={{ color: "var(--nude)" }}>
          Learn.
        </em>
        <br />
        Master.
      </h2>

      {/* Grid */}
      <div
        className="grid gap-5 w-full"
        style={{ maxWidth: 840, gridTemplateColumns: "repeat(2, 1fr)", perspective: 900 }}
      >
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} feature={f} delay={0.08 + i * 0.1} />
        ))}
      </div>
    </section>
  );
}
