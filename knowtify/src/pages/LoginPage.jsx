import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--black)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <div style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "28px",
            fontWeight: 400,
            letterSpacing: "0.1em",
            color: "var(--nude-light)",
            textAlign: "center",
            marginBottom: "40px",
          }}>
            Know<em style={{ color: "var(--nude)", fontStyle: "italic" }}>tify</em>
          </div>
        </Link>

        {/* Card */}
        <div className="glass-card" style={{ padding: "36px" }}>
          <h1 style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "32px",
            fontWeight: 400,
            color: "#f0ece6",
            margin: "0 0 6px",
          }}>
            Welcome back.
          </h1>
          <p style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "11px",
            color: "#666",
            marginBottom: "28px",
          }}>
            Sign in to continue learning.
          </p>

          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@college.edu"
              value={form.email}
              onChange={handle}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "var(--nude)"}
              onBlur={e => e.target.style.borderColor = "var(--card-border)"}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handle}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "var(--nude)"}
              onBlur={e => e.target.style.borderColor = "var(--card-border)"}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={loading}
            style={btnStyle(loading)}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          {/* Register link */}
          <p style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "11px",
            color: "#555",
            textAlign: "center",
            marginTop: "20px",
          }}>
            No account?{" "}
            <Link to="/register" style={{ color: "var(--nude)", textDecoration: "none" }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontFamily: "DM Mono, monospace",
  fontSize: "10px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--muted2, #666)",
  marginBottom: "8px",
};

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
  marginBottom: "16px",
};

const btnStyle = (loading) => ({
  width: "100%",
  padding: "13px",
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
});