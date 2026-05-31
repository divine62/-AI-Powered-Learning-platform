import { useEffect, useRef, useState } from "react";
import { useReveal } from "../hooks/useReveal";
import { VideoThumb, NotesCard, QuizCard, TutorCard } from "./CardPieces";

export default function Transformation() {
  const eyebrowRef = useReveal();
  const headRef = useReveal(0.18);
  const sceneRef = useReveal(0.35);
  const [exploded, setExploded] = useState(false);
  const tsnRef = useRef(null);

  useEffect(() => {
    const el = tsnRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !exploded) {
          setTimeout(() => setExploded(true), 300);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [exploded]);

  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden px-10"
      style={{ minHeight: "100vh", padding: "140px 40px" }}
    >
      {/* Eyebrow */}
      <div
        ref={eyebrowRef}
        className="reveal font-mono uppercase mb-4"
        style={{ fontSize: 10, letterSpacing: "0.22em", color: "var(--nude)" }}
      >
        The Transformation
      </div>

      {/* Headline */}
      <h2
        ref={headRef}
        className="reveal font-serif font-light text-center mb-20"
        style={{
          fontSize: "clamp(38px, 5.5vw, 76px)",
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          maxWidth: 760,
        }}
      >
        One video.
        <br />
        <em className="italic" style={{ color: "var(--nude)" }}>
          A complete lesson.
        </em>
      </h2>

      {/* Scene */}
      <div
        ref={(el) => {
          tsnRef.current = el;
          sceneRef.current = el;
        }}
        className={`reveal ${exploded ? "exploded" : ""}`}
        style={{ width: "100%", maxWidth: 860, height: 320, position: "relative" }}
      >
        {/* Center video card */}
        <div
          className="glass-card overflow-hidden"
          style={{
            position: "absolute",
            width: 280,
            height: 176,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(200,168,130,0.2)",
            zIndex: 10,
          }}
        >
          <VideoThumb title="Your YouTube Video" progress={42} />
        </div>

        {/* Satellite cards */}
        <div id="tsat-notes" className="t-sat">
          <NotesCard />
        </div>
        <div id="tsat-quiz" className="t-sat">
          <QuizCard />
        </div>
        <div id="tsat-tutor" className="t-sat">
          <TutorCard />
        </div>
      </div>
    </section>
  );
}
