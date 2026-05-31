import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Cursor from "./components/Cursor";
import LandingPage from "./components/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import VideoFinderPage from "./pages/VideoFinderPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import QuizPage from "./pages/QuizPage";
import "./styles/globals.css";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "var(--black)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "DM Mono, monospace", fontSize: "11px",
      color: "var(--nude)", letterSpacing: "0.1em",
    }}>
      Loading…
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <>
      <Cursor />
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/register"  element={<RegisterPage />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/search"    element={<Protected><VideoFinderPage /></Protected>} />
        <Route path="/profile"   element={<Protected><ProfilePage /></Protected>} />
        <Route path="/quiz"      element={<Protected><QuizPage /></Protected>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}