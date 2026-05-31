/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#060606",
        nude: "#C8A882",
        "nude-light": "#DFC9AF",
        "nude-dark": "#9A7A5C",
        "off-white": "#F4EFE9",
        muted: "#2E2A25",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "serif"],
        mono: ["DM Mono", "monospace"],
        sans: ["Syne", "sans-serif"],
      },
      animation: {
        "float-slow": "floatSlow 4s ease-in-out infinite",
        "float-med": "floatMed 5s ease-in-out infinite",
        "float-fast": "floatFast 4.5s ease-in-out infinite",
        "bar-pulse": "barPulse 1.3s ease-in-out infinite alternate",
        "scroll-line": "scrollLine 2s ease-in-out infinite",
        "cta-glow": "ctaGlow 4s ease-in-out infinite",
        "ring-pulse": "ringPulse 5s ease-in-out infinite",
        "ring-pulse-2": "ringPulse 5s ease-in-out 1s infinite",
      },
      keyframes: {
        floatSlow: {
          "0%,100%": { transform: "translate(0,0) rotate(-1deg)" },
          "50%": { transform: "translate(-4px,-10px) rotate(1deg)" },
        },
        floatMed: {
          "0%,100%": { transform: "translate(0,0) rotate(1deg)" },
          "50%": { transform: "translate(4px,-8px) rotate(-1deg)" },
        },
        floatFast: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        barPulse: {
          from: { transform: "scaleY(1)" },
          to: { transform: "scaleY(0.35)" },
        },
        scrollLine: {
          "0%,100%": { opacity: "0.25", transform: "scaleY(1)" },
          "50%": { opacity: "0.7", transform: "scaleY(1.15)" },
        },
        ctaGlow: {
          "0%,100%": { opacity: "0.8", transform: "translate(-50%,-50%) scale(1)" },
          "50%": { opacity: "1", transform: "translate(-50%,-50%) scale(1.08)" },
        },
        ringPulse: {
          "0%,100%": { opacity: "0.5", transform: "translate(-50%,-50%) scale(1)" },
          "50%": { opacity: "1", transform: "translate(-50%,-50%) scale(1.04)" },
        },
      },
    },
  },
  plugins: [],
};
