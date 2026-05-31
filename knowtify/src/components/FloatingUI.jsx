import { useEffect, useRef } from "react";
import { VideoThumb, NotesCard, QuizCard, TutorCard } from "./CardPieces";

export default function FloatingUI() {
  const wrapRef = useRef(null);
  const vidRef = useRef(null);
  const notesRef = useRef(null);
  const quizRef = useRef(null);
  const tutorRef = useRef(null);

  // Scroll-driven animation
  useEffect(() => {
    const hero = document.getElementById("hero");

    const onScroll = () => {
      const heroH = hero?.offsetHeight || window.innerHeight;
      const scrollY = window.scrollY;
      const raw = Math.min(1, Math.max(0, scrollY / (heroH * 0.6)));
      // Ease out cubic
      const p = 1 - (1 - raw) ** 3;

      // Video: scale down + lift
      if (vidRef.current) {
        const scale = 1 - p * 0.18;
        const y = p * -18;
        vidRef.current.style.transform = `translate(-50%, -50%) scale(${scale}) translateY(${y}px)`;
        vidRef.current.style.boxShadow = `0 ${32 - p * 18}px ${64 - p * 30}px rgba(0,0,0,${0.65 - p * 0.2})`;
      }

      // Notes: drift top-left
      if (notesRef.current) {
        const nx = p * -210, ny = p * -105;
        const rot = -p * 3;
        notesRef.current.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px)) rotate(${rot}deg)`;
        notesRef.current.style.opacity = p > 0.05 ? Math.min(1, (p - 0.05) / 0.4) : 0;
      }

      // Quiz: drift top-right
      if (quizRef.current) {
        const qx = p * 210, qy = p * -105;
        const rot = p * 3;
        quizRef.current.style.transform = `translate(calc(-50% + ${qx}px), calc(-50% + ${qy}px)) rotate(${rot}deg)`;
        quizRef.current.style.opacity = p > 0.08 ? Math.min(1, (p - 0.08) / 0.4) : 0;
      }

      // Tutor: drift down
      if (tutorRef.current) {
        const ty = p * 130;
        tutorRef.current.style.transform = `translate(-50%, calc(-50% + ${ty}px))`;
        tutorRef.current.style.opacity = p > 0.1 ? Math.min(1, (p - 0.1) / 0.45) : 0;
      }

      // Wrapper 3D tilt eases off as cards spread
      if (wrapRef.current) {
        const tiltX = (1 - p) * 2;
        wrapRef.current.style.transform = `perspective(900px) rotateX(${tiltX}deg)`;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mouse parallax (hero only)
  useEffect(() => {
    const onMove = (e) => {
      if (window.scrollY > window.innerHeight * 0.4) return;
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      const dx = ((e.clientX - cx) / cx) * 10;
      const dy = ((e.clientY - cy) / cy) * 6;
      if (wrapRef.current) {
        wrapRef.current.style.transform = `perspective(900px) rotateY(${dx * 0.5}deg) rotateX(${-dy * 0.35}deg)`;
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  const cardBase = {
    position: "absolute",
    top: "50%",
    left: "50%",
    willChange: "transform, opacity",
  };

  return (
    <div
      ref={wrapRef}
      className="relative z-10"
      style={{ width: 660, height: 400, willChange: "transform" }}
    >
      {/* Notes */}
      <div ref={notesRef} style={{ ...cardBase, width: 196, opacity: 0 }}>
        <NotesCard />
      </div>

      {/* Quiz */}
      <div ref={quizRef} style={{ ...cardBase, width: 178, opacity: 0 }}>
        <QuizCard />
      </div>

      {/* Tutor */}
      <div ref={tutorRef} style={{ ...cardBase, width: 204, opacity: 0 }}>
        <TutorCard />
      </div>

      {/* Video (on top) */}
      <div
        ref={vidRef}
        className="glass-card overflow-hidden"
        style={{ ...cardBase, width: 300, height: 188, zIndex: 10 }}
      >
        <VideoThumb />
      </div>
    </div>
  );
}
