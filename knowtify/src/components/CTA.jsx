import { Link } from "react-router-dom";
import { useReveal } from "../hooks/useReveal";

export default function CTA() {
  const headRef = useReveal();
  const subRef = useReveal(0.18);
  const btnRef = useReveal(0.32);

  return (
    <section
      className="relative flex flex-col items-center justify-center text-center overflow-hidden px-10"
      style={{ minHeight: "90vh", padding: "120px 40px" }}
    >
      <div className="cta-radial" />
      <div className="cta-ring" />
      <div className="cta-ring-2" />

      <h2
        ref={headRef}
        className="reveal font-serif font-light relative z-10"
        style={{
          fontSize: "clamp(44px, 8vw, 108px)",
          lineHeight: 0.96,
          letterSpacing: "-0.025em",
          maxWidth: 820,
          marginBottom: 20,
        }}
      >
        Stop watching videos.
        <br />
        <em className="italic" style={{ color: "var(--nude)" }}>
          Start learning
        </em>
        <br />
        from them.
      </h2>

      <p
        ref={subRef}
        className="reveal font-mono relative z-10"
        style={{
          fontSize: 11,
          letterSpacing: "0.09em",
          color: "rgba(244,239,233,0.32)",
          marginBottom: 52,
        }}
      >
        No more passive watching. Build real, lasting knowledge.
      </p>

      <Link
        ref={btnRef}
        to="/dashboard"
        className="reveal relative z-10 font-sans font-semibold rounded-full inline-block transition-all duration-300"
        style={{
          fontSize: 14,
          letterSpacing: "0.07em",
          color: "var(--black)",
          background: "var(--nude)",
          padding: "17px 54px",
          textDecoration: "none",
          cursor: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--nude-light)";
          e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
          e.currentTarget.style.boxShadow = "0 20px 50px rgba(200,168,130,0.22)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--nude)";
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        Start Learning →
      </Link>
    </section>
  );
}