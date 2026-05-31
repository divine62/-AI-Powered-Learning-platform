import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BRANCHES = [
  "Computer Science (CS/CSE)",
  "Information Technology (IT)",
  "Electronics & Communication (ECE)",
  "Electrical Engineering (EE/EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Chemical Engineering",
  "Biotechnology",
  "Other",
];

const CAREER_GOALS = [
  "Software Development / SDE",
  "GATE Exam",
  "Campus Placements",
  "Higher Studies / MS Abroad",
  "Research / PhD",
  "Startup / Entrepreneurship",
  "Government Jobs / UPSC",
  "Data Science / AI/ML",
  "Other",
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Passout / Alumni"];

// ─── Step components ─────────────────────────────────────────────────────────

function Step1({ data, set }) {
  return (
    <div>
      <StepHeading
        title="Let's get started."
        sub="Create your Knowtify account."
      />
      <Field label="Full Name *" >
        <input style={inputStyle} placeholder="Arjun Sharma"
          value={data.name} onChange={e => set("name", e.target.value)} />
      </Field>
      <Field label="Email *">
        <input style={inputStyle} type="email" placeholder="arjun@college.edu"
          value={data.email} onChange={e => set("email", e.target.value)} />
      </Field>
      <Field label="Password *">
        <input style={inputStyle} type="password" placeholder="Min. 6 characters"
          value={data.password} onChange={e => set("password", e.target.value)} />
      </Field>
    </div>
  );
}

function Step2({ data, set }) {
  return (
    <div>
      <StepHeading
        title="Your institution."
        sub="This helps us show you what students at your college are watching."
      />
      <Field label="College Name">
        <input style={inputStyle} placeholder="e.g. VJTI Mumbai, NIT Trichy…"
          value={data.college} onChange={e => set("college", e.target.value)} />
      </Field>
      <Field label="University / Board">
        <input style={inputStyle} placeholder="e.g. Mumbai University, Anna University…"
          value={data.university} onChange={e => set("university", e.target.value)} />
      </Field>
      <Field label="City">
        <input style={inputStyle} placeholder="e.g. Mumbai, Chennai…"
          value={data.city} onChange={e => set("city", e.target.value)} />
      </Field>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", color: "#444", marginTop: "12px" }}>
        Not enrolled? Leave blank — that's totally fine.
      </p>
    </div>
  );
}

function Step3({ data, set }) {
  return (
    <div>
      <StepHeading
        title="Your academics."
        sub="We'll personalise video recommendations for your year and branch."
      />
      <Field label="Year">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {YEARS.map(y => (
            <Chip key={y} label={y} selected={data.year === y} onClick={() => set("year", y)} />
          ))}
        </div>
      </Field>
      <Field label="Branch">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {BRANCHES.map(b => (
            <Chip key={b} label={b} selected={data.branch === b} onClick={() => set("branch", b)} />
          ))}
        </div>
      </Field>
    </div>
  );
}

function Step4({ data, set }) {
  return (
    <div>
      <StepHeading
        title="Your goal."
        sub="What are you working towards? This shapes your entire feed."
      />
      <Field label="Career Goal">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {CAREER_GOALS.map(g => (
            <Chip key={g} label={g} selected={data.career_goal === g} onClick={() => set("career_goal", g)} />
          ))}
        </div>
      </Field>
      <Field label="Target Exam (optional)">
        <input style={inputStyle} placeholder="e.g. GATE 2027, JEE Advanced, UPSC CSE…"
          value={data.target_exam} onChange={e => set("target_exam", e.target.value)} />
      </Field>
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [step, setStep]   = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    name: "", email: "", password: "",
    college: "", university: "", city: "",
    year: "", branch: "",
    career_goal: "", target_exam: "",
  });

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));

  const validate = () => {
    if (step === 1) {
      if (!data.name.trim())     return "Please enter your name.";
      if (!data.email.trim())    return "Please enter your email.";
      if (data.password.length < 6) return "Password must be at least 6 characters.";
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    if (step < 4) setStep(s => s + 1);
    else submit();
  };

  const submit = async () => {
    setLoading(true);
    try {
      await register(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const steps = [Step1, Step2, Step3, Step4];
  const StepComponent = steps[step - 1];

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--black)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <div style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "28px",
            fontWeight: 400,
            letterSpacing: "0.1em",
            color: "var(--nude-light)",
            textAlign: "center",
            marginBottom: "32px",
          }}>
            Know<em style={{ color: "var(--nude)", fontStyle: "italic" }}>tify</em>
          </div>
        </Link>

        {/* Progress bar */}
        <div style={{
          display: "flex",
          gap: "6px",
          marginBottom: "28px",
        }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{
              flex: 1,
              height: "2px",
              borderRadius: "2px",
              background: n <= step ? "var(--nude)" : "var(--card-border, #2a2a2a)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: "36px" }}>
          <StepComponent data={data} set={set} />

          {/* Error */}
          {error && <div style={errorStyle}>{error}</div>}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
            {step > 1 && (
              <button
                onClick={() => { setError(""); setStep(s => s - 1); }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "transparent",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  color: "var(--nude)",
                  fontFamily: "DM Mono, monospace",
                  fontSize: "12px",
                  cursor: "none",
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={next}
              disabled={loading}
              style={{
                flex: 2,
                padding: "12px",
                background: loading ? "rgba(200,168,130,0.3)" : "var(--nude)",
                color: "var(--black)",
                border: "none",
                borderRadius: "8px",
                fontFamily: "DM Mono, monospace",
                fontSize: "13px",
                letterSpacing: "0.08em",
                fontWeight: 600,
                cursor: "none",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Creating account…" : step === 4 ? "Start Learning →" : "Continue →"}
            </button>
          </div>

          {step === 1 && (
            <p style={{
              fontFamily: "DM Mono, monospace",
              fontSize: "11px",
              color: "#555",
              textAlign: "center",
              marginTop: "20px",
            }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "var(--nude)", textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          )}

          {step > 1 && (
            <button
              onClick={() => { setError(""); next(); }}
              style={{
                background: "none",
                border: "none",
                color: "#444",
                fontFamily: "DM Mono, monospace",
                fontSize: "10px",
                cursor: "none",
                width: "100%",
                marginTop: "14px",
                textAlign: "center",
                letterSpacing: "0.05em",
              }}
            >
              Skip this step →
            </button>
          )}
        </div>

        {/* Step counter */}
        <p style={{
          fontFamily: "DM Mono, monospace",
          fontSize: "10px",
          color: "#333",
          textAlign: "center",
          marginTop: "16px",
          letterSpacing: "0.1em",
        }}>
          STEP {step} OF 4
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeading({ title, sub }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h1 style={{
        fontFamily: "Cormorant Garamond, serif",
        fontSize: "30px",
        fontWeight: 400,
        color: "#f0ece6",
        margin: "0 0 6px",
      }}>
        {title}
      </h1>
      <p style={{
        fontFamily: "DM Mono, monospace",
        fontSize: "11px",
        color: "#555",
        margin: 0,
        lineHeight: 1.5,
      }}>
        {sub}
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{
        display: "block",
        fontFamily: "DM Mono, monospace",
        fontSize: "10px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--muted2, #666)",
        marginBottom: "10px",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: "20px",
        border: `1px solid ${selected ? "var(--nude)" : "var(--card-border, #2a2a2a)"}`,
        background: selected ? "rgba(200,168,130,0.15)" : "transparent",
        color: selected ? "var(--nude)" : "rgba(244,239,233,0.4)",
        fontFamily: "DM Mono, monospace",
        fontSize: "11px",
        cursor: "none",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--black)",
  border: "1px solid var(--card-border, #2a2a2a)",
  borderRadius: "8px",
  color: "#e0dcd6",
  fontFamily: "DM Mono, monospace",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  cursor: "none",
  transition: "border-color 0.2s",
};

const errorStyle = {
  fontFamily: "DM Mono, monospace",
  fontSize: "11px",
  color: "#f87171",
  background: "rgba(248,113,113,0.08)",
  border: "1px solid rgba(248,113,113,0.2)",
  borderRadius: "6px",
  padding: "8px 12px",
  marginBottom: "8px",
};