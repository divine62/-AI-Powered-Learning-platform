import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BRANCHES = [
  "Computer Science (CS/CSE)", "Information Technology (IT)",
  "Electronics & Communication (ECE)", "Electrical Engineering (EE/EEE)",
  "Mechanical Engineering (ME)", "Civil Engineering (CE)",
  "Chemical Engineering", "Biotechnology", "Other",
];
const CAREER_GOALS = [
  "Software Development / SDE", "GATE Exam", "Campus Placements",
  "Higher Studies / MS Abroad", "Research / PhD", "Startup / Entrepreneurship",
  "Government Jobs / UPSC", "Data Science / AI/ML", "Other",
];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Passout / Alumni"];

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name        : user?.name         || "",
    college     : user?.college      || "",
    university  : user?.university   || "",
    city        : user?.city         || "",
    year        : user?.year         || "",
    branch      : user?.branch       || "",
    career_goal : user?.career_goal  || "",
    target_exam : user?.target_exam  || "",
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await updateProfile(form);
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const initials = user.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ paddingTop: "100px", paddingBottom: "80px", minHeight: "100vh", background: "var(--black)" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--nude)", marginBottom: "12px", opacity: 0.8 }}>
              Your Profile
            </p>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 500, lineHeight: 1.05, color: "#f0ece6", margin: 0 }}>
              {user.name?.split(" ")[0]}<em style={{ color: "var(--nude)", fontStyle: "italic" }}>.</em>
            </h1>
            {user.college && (
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "12px", color: "#666", marginTop: "8px" }}>
                {user.college}{user.year ? ` · ${user.year}` : ""}
              </p>
            )}
          </div>

          {/* Avatar */}
          <div style={{
            width: "64px", height: "64px",
            borderRadius: "50%",
            background: "rgba(200,168,130,0.15)",
            border: "1px solid rgba(200,168,130,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "24px",
            color: "var(--nude)",
            flexShrink: 0,
          }}>
            {initials}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
          {[
            { label: "Streak",       value: user.stats?.streak     || 0, unit: "days" },
            { label: "Videos",       value: user.stats?.videos_done || 0, unit: "watched" },
            { label: "Quiz Avg",     value: `${user.stats?.quiz_avg || 0}%`, unit: "score" },
            { label: "Notes",        value: user.stats?.notes_saved || 0, unit: "saved" },
          ].map(s => (
            <div key={s.label} className="glass-card" style={{ padding: "16px", textAlign: "center" }}>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "28px", color: "var(--nude)", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: "9px", color: "#555", marginTop: "4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Profile card */}
        <div className="glass-card" style={{ padding: "32px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <h2 style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", margin: 0 }}>
              Profile Details
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "6px 14px", color: "var(--nude)", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.1em", cursor: "none" }}
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <EditForm form={form} set={set} />
          ) : (
            <ViewProfile user={user} />
          )}

          {success && (
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", padding: "8px 12px", marginTop: "16px" }}>
              ✓ Profile updated successfully.
            </div>
          )}
          {error && (
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", padding: "8px 12px", marginTop: "16px" }}>
              {error}
            </div>
          )}

          {editing && (
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                onClick={() => { setEditing(false); setError(""); }}
                style={{ flex: 1, padding: "11px", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "8px", color: "var(--nude)", fontFamily: "DM Mono, monospace", fontSize: "12px", cursor: "none" }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{ flex: 2, padding: "11px", background: saving ? "rgba(200,168,130,0.3)" : "var(--nude)", color: "var(--black)", border: "none", borderRadius: "8px", fontFamily: "DM Mono, monospace", fontSize: "12px", fontWeight: 600, cursor: "none" }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", color: "rgba(248,113,113,0.6)", fontFamily: "DM Mono, monospace", fontSize: "11px", letterSpacing: "0.1em", cursor: "none", marginTop: "8px" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── View mode ────────────────────────────────────────────────────────────────
function ViewProfile({ user }) {
  const rows = [
    { label: "Email",        value: user.email },
    { label: "College",      value: user.college },
    { label: "University",   value: user.university },
    { label: "City",         value: user.city },
    { label: "Year",         value: user.year },
    { label: "Branch",       value: user.branch },
    { label: "Career Goal",  value: user.career_goal },
    { label: "Target Exam",  value: user.target_exam },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {rows.map(r => r.value ? (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--card-border)", paddingBottom: "14px" }}>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" }}>{r.label}</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "12px", color: "#ccc", textAlign: "right", maxWidth: "60%" }}>{r.value}</span>
        </div>
      ) : null)}
      {rows.every(r => !r.value) && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "12px", color: "#444", textAlign: "center", padding: "20px 0" }}>
          No profile details yet. Click Edit to fill in your info.
        </p>
      )}
    </div>
  );
}

// ─── Edit mode ────────────────────────────────────────────────────────────────
function EditForm({ form, set }) {
  return (
    <div>
      <Row label="Name *">
        <input style={iS} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
      </Row>
      <Row label="College">
        <input style={iS} value={form.college} onChange={e => set("college", e.target.value)} placeholder="e.g. VJTI Mumbai" />
      </Row>
      <Row label="University">
        <input style={iS} value={form.university} onChange={e => set("university", e.target.value)} placeholder="e.g. Mumbai University" />
      </Row>
      <Row label="City">
        <input style={iS} value={form.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Mumbai" />
      </Row>
      <Row label="Year">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {YEARS.map(y => <Chip key={y} label={y} selected={form.year === y} onClick={() => set("year", y)} />)}
        </div>
      </Row>
      <Row label="Branch">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {BRANCHES.map(b => <Chip key={b} label={b} selected={form.branch === b} onClick={() => set("branch", b)} />)}
        </div>
      </Row>
      <Row label="Career Goal">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {CAREER_GOALS.map(g => <Chip key={g} label={g} selected={form.career_goal === g} onClick={() => set("career_goal", g)} />)}
        </div>
      </Row>
      <Row label="Target Exam">
        <input style={iS} value={form.target_exam} onChange={e => set("target_exam", e.target.value)} placeholder="e.g. GATE 2027, JEE…" />
      </Row>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#555", marginBottom: "8px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 10px", borderRadius: "20px",
      border: `1px solid ${selected ? "var(--nude)" : "var(--card-border, #2a2a2a)"}`,
      background: selected ? "rgba(200,168,130,0.15)" : "transparent",
      color: selected ? "var(--nude)" : "rgba(244,239,233,0.35)",
      fontFamily: "DM Mono, monospace", fontSize: "10px",
      cursor: "none", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

const iS = {
  width: "100%", padding: "9px 12px",
  background: "var(--black)",
  border: "1px solid var(--card-border, #2a2a2a)",
  borderRadius: "8px", color: "#e0dcd6",
  fontFamily: "DM Mono, monospace", fontSize: "12px",
  outline: "none", boxSizing: "border-box", cursor: "none",
};