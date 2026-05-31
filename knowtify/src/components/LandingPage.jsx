import Navbar from "./Navbar";
import Hero from "./Hero";
import Transformation from "./Transformation";
import Features from "./Features";
import DashboardPreview from "./DashboardPreview";
import CTA from "./CTA";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Transformation />
        <Features />
        <DashboardPreview />
        <CTA />
      </main>

      <footer
        className="flex justify-between items-center px-16 py-9"
        style={{ borderTop: "1px solid var(--card-border)" }}
      >
        <div className="font-serif text-lg font-light tracking-widest" style={{ color: "rgba(244,239,233,0.35)" }}>
          Know<em className="italic" style={{ color: "var(--nude)" }}>tify</em>
        </div>
        <div
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(244,239,233,0.18)" }}
        >
          © 2025 Knowtify. All rights reserved.
        </div>
      </footer>
    </>
  );
}
