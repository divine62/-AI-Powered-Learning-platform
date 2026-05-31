export default function StatCard({ label, value, unit, accent = false, trend }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden"
      style={{
        background: accent
          ? "rgba(200,168,130,0.07)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${accent ? "rgba(200,168,130,0.2)" : "var(--card-border)"}`,
      }}
    >
      {/* Subtle top shimmer on accent */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(200,168,130,0.35), transparent)" }}
        />
      )}

      <div
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: "0.16em", color: "rgba(244,239,233,0.35)" }}
      >
        {label}
      </div>

      <div
        className="font-sans font-semibold"
        style={{ fontSize: 32, lineHeight: 1.1, color: accent ? "var(--nude)" : "var(--nude-light)" }}
      >
        {value}
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="font-mono" style={{ fontSize: 10, color: "rgba(244,239,233,0.3)" }}>
          {unit}
        </div>
        {trend && (
          <div
            className="font-mono rounded-full px-2 py-0.5"
            style={{
              fontSize: 9,
              background: trend > 0 ? "rgba(40,200,100,0.1)" : "rgba(200,60,60,0.1)",
              color: trend > 0 ? "#5CE89A" : "#E87060",
              letterSpacing: "0.05em",
            }}
          >
            {trend > 0 ? "+" : ""}{trend}%
          </div>
        )}
      </div>
    </div>
  );
}
