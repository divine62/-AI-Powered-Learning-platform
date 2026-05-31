import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  {
    section: "Main",
    items: [
      { id: "dashboard", icon: "⊞", label: "Dashboard", route: "/dashboard" },
    ],
  },
  {
    section: "Learn",
    items: [
      { id: "search", icon: "▶", label: "Video Finder", route: "/search" },
      { id: "quiz", icon: "◈", label: "Quiz", route: "/quiz" },
      { id: "notes", icon: "≡", label: "AI Notes", route: "/notes" },
    ],
  },
  {
    section: "Account",
    items: [
      { id: "profile", icon: "◎", label: "Profile", route: "/profile" },
    ],
  },
];

export default function DashSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const currentRoute = location.pathname;

  return (
    <aside className="dash-sidebar">
      <style>{`
        .dash-sidebar {
          width: 220px;
          min-height: 100vh;
          background: var(--card-bg, rgba(255,255,255,0.03));
          border-right: 1px solid var(--card-border, rgba(200,168,130,0.1));
          display: flex;
          flex-direction: column;
          padding: 1.8rem 0 1.5rem;
          flex-shrink: 0;
        }
        .sidebar-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem;
          color: var(--nude, #C8A882);
          font-weight: 600;
          padding: 0 1.4rem 2rem;
          letter-spacing: 0.02em;
        }
        .sidebar-logo span {
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          color: rgba(200,168,130,0.4);
          display: block;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 0.1rem;
        }
        .sidebar-section {
          margin-bottom: 1.4rem;
        }
        .sidebar-section-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(200,168,130,0.3);
          padding: 0 1.4rem 0.5rem;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.6rem 1.4rem;
          cursor: none;
          transition: background 0.15s, color 0.15s;
          border-left: 2px solid transparent;
          margin: 0 0.3rem;
          border-radius: 0 8px 8px 0;
        }
        .sidebar-nav-item:hover {
          background: rgba(200,168,130,0.06);
          color: var(--nude, #C8A882);
        }
        .sidebar-nav-item.active {
          background: rgba(200,168,130,0.1);
          border-left-color: var(--nude, #C8A882);
        }
        .nav-icon {
          font-size: 0.95rem;
          color: rgba(200,168,130,0.5);
          width: 18px;
          text-align: center;
          flex-shrink: 0;
        }
        .sidebar-nav-item.active .nav-icon {
          color: var(--nude, #C8A882);
        }
        .nav-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.78rem;
          color: rgba(200,168,130,0.55);
          letter-spacing: 0.03em;
        }
        .sidebar-nav-item.active .nav-label {
          color: var(--nude, #C8A882);
        }
        .sidebar-spacer { flex: 1; }
        .sidebar-user {
          padding: 1rem 1.4rem;
          border-top: 1px solid rgba(200,168,130,0.1);
          cursor: none;
          transition: background 0.15s;
        }
        .sidebar-user:hover { background: rgba(200,168,130,0.04); }
        .sidebar-user-name {
          font-family: 'Syne', sans-serif;
          font-size: 0.82rem;
          color: var(--nude, #C8A882);
          margin-bottom: 0.15rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-user-email {
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          color: rgba(200,168,130,0.35);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-logout {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.4rem;
          cursor: none;
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          color: rgba(200,168,130,0.3);
          letter-spacing: 0.06em;
          transition: color 0.15s;
          margin-top: 0.2rem;
        }
        .sidebar-logout:hover { color: rgba(200,168,130,0.65); }
      `}</style>

      <div className="sidebar-logo">
        Knowtify
        <span>AI Learning Platform</span>
      </div>

      {navItems.map((group) => (
        <div className="sidebar-section" key={group.section}>
          <p className="sidebar-section-label">{group.section}</p>
          {group.items.map((item) => (
            <div
              key={item.id}
              className={`sidebar-nav-item ${currentRoute === item.route ? "active" : ""}`}
              onClick={() => navigate(item.route)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="sidebar-spacer" />

      {user && (
        <div className="sidebar-user" onClick={() => navigate("/profile")}>
          <p className="sidebar-user-name">{user.name || "Student"}</p>
          <p className="sidebar-user-email">{user.email}</p>
        </div>
      )}

      <div className="sidebar-logout" onClick={logout}>
        ← Log out
      </div>
    </aside>
  );
}