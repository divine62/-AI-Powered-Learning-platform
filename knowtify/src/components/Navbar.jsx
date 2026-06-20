import { NavLink, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();

  const appRoutes = ["/dashboard", "/chat", "/quiz", "/notes", "/profile"];
  const isDashboard = appRoutes.includes(pathname);
  const isSearch = pathname === "/search";

  const dashboardLinks = [
    { label: "My Videos",  to: "/dashboard" },
    { label: "AI Notes",   to: "/notes" },
    { label: "Quizzes",    to: "/quiz" },
    { label: "Progress",   to: "/dashboard" },
  ];

  const landingLinks = [
    { label: "Features",      to: "#features" },
    { label: "How it Works",  to: "#how-it-works" },
    { label: "Pricing",       to: "#pricing" },
  ];

  const activeLinks = isDashboard ? dashboardLinks : landingLinks;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-16 py-5"
      style={{ background: "linear-gradient(to bottom, rgba(6,6,6,0.96), transparent)" }}
    >
      <NavLink
        to="/"
        className="font-serif text-xl font-light tracking-widest no-underline"
        style={{ color: "var(--nude-light)" }}
      >
        Know<em className="italic" style={{ color: "var(--nude)" }}>tify</em>
      </NavLink>

      {!isSearch && (
        <ul className="flex gap-9 list-none">
          {activeLinks.map((link) => (
            <li key={link.label}>
              <NavLink
                to={link.to}
                className="font-mono text-xs tracking-widest uppercase transition-colors duration-300 no-underline"
                style={{ color: "rgba(244,239,233,0.45)", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nude)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,239,233,0.45)")}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}

      {isSearch ? (
        /* ── /search navbar ── */
        <div className="flex items-center gap-4">
          <NavLink
            to="/dashboard"
            className="font-mono text-xs tracking-widest uppercase no-underline transition-colors duration-300"
            style={{ color: "rgba(244,239,233,0.45)", textDecoration: "none", cursor: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nude)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,239,233,0.45)")}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/"
            className="font-mono text-xs tracking-widest uppercase px-5 py-2 rounded-sm no-underline"
            style={{
              background: "transparent",
              color: "var(--nude)",
              border: "1px solid var(--card-border)",
              cursor: "none",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--nude)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--card-border)";
              e.currentTarget.style.transform = "none";
            }}
          >
            ← Home
          </NavLink>
        </div>
      ) : isDashboard ? (
        /* ── app pages navbar ── */
        <div className="flex items-center gap-4">
          <NavLink
            to="/search"
            className="font-mono text-xs tracking-widest uppercase px-5 py-2 rounded-sm no-underline"
            style={{
              background: "rgba(200,168,130,0.1)",
              color: "var(--nude)",
              border: "1px solid rgba(200,168,130,0.3)",
              cursor: "none",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(200,168,130,0.2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(200,168,130,0.1)";
              e.currentTarget.style.transform = "none";
            }}
          >
            Find Videos ↗
          </NavLink>
          <NavLink
            to="/"
            className="font-mono text-xs tracking-widest uppercase px-5 py-2 rounded-sm no-underline"
            style={{
              background: "transparent",
              color: "var(--nude)",
              border: "1px solid var(--card-border)",
              cursor: "none",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--nude)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--card-border)";
              e.currentTarget.style.transform = "none";
            }}
          >
            ← Back to Home
          </NavLink>
        </div>
      ) : (
        /* ── / landing navbar ── */
        <div className="flex items-center gap-4">
          <NavLink
            to="/search"
            className="font-mono text-xs tracking-widest uppercase px-5 py-2 rounded-sm no-underline"
            style={{
              background: "rgba(200,168,130,0.1)",
              color: "var(--nude)",
              border: "1px solid rgba(200,168,130,0.3)",
              cursor: "none",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(200,168,130,0.2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(200,168,130,0.1)";
              e.currentTarget.style.transform = "none";
            }}
          >
            Find Videos ↗
          </NavLink>
          <NavLink
            to="/dashboard"
            className="font-mono text-xs tracking-widest uppercase no-underline transition-colors duration-300"
            style={{ color: "rgba(244,239,233,0.45)", textDecoration: "none", cursor: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nude)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,239,233,0.45)")}
          >
            Sign In
          </NavLink>
          <NavLink
            to="/dashboard"
            className="font-mono text-xs tracking-widest uppercase px-5 py-2 rounded-sm no-underline"
            style={{
              background: "var(--nude)",
              color: "var(--black)",
              border: "none",
              cursor: "none",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--nude-light)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--nude)";
              e.currentTarget.style.transform = "none";
            }}
          >
            Get Started
          </NavLink>
        </div>
      )}
    </nav>
  );
}