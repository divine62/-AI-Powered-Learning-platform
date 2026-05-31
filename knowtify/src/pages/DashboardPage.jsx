import { useState } from "react";
import Navbar from "../components/Navbar";
import DashSidebar from "../components/dashboard/DashSidebar";
import StatCard from "../components/dashboard/StatCard";
import RecentVideos from "../components/dashboard/RecentVideos";
import QuizProgress from "../components/dashboard/QuizProgress";
import AiTutorPanel from "../components/dashboard/AiTutorPanel";
import StreakCalendar from "../components/dashboard/StreakCalendar";
import SavedNotes from "../components/dashboard/SavedNotes";
import { useAuth } from "../context/AuthContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const { user } = useAuth();

  const firstName = user?.name?.split(" ")[0] || "there";
  const stats     = user?.stats || {};

  const subLine = user?.college
    ? `${user.college}${user.branch ? " · " + user.branch : ""}${user.year ? " · " + user.year : ""}`
    : "Welcome to Knowtify. Start exploring.";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--black)" }}>
      {/* Sidebar */}
      <DashSidebar active={activeNav} onSelect={setActiveNav} user={user} />

      {/* Main scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "88px 40px 60px", scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Page title */}
          <div className="mb-8">
            <h1
              className="font-serif font-light"
              style={{ fontSize: "clamp(28px, 3vw, 42px)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              {getGreeting()},{" "}
              <em className="italic" style={{ color: "var(--nude)" }}>
                {firstName}.
              </em>
            </h1>
            <p
              className="font-mono mt-2"
              style={{ fontSize: 11, color: "rgba(244,239,233,0.35)", letterSpacing: "0.05em" }}
            >
              {subLine}
            </p>
          </div>

          {/* Stats row */}
          <div
            className="grid gap-4 mb-8"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            <StatCard label="Streak"      value={stats.streak      ?? 0}   unit="days in a row"      trend={0} />
            <StatCard label="Videos Done" value={stats.videos_done  ?? 0}   unit="this month"         trend={0} />
            <StatCard label="Quiz Avg"    value={`${stats.quiz_avg ?? 0}%`} unit="across all quizzes" trend={0} accent />
            <StatCard label="Notes Saved" value={stats.notes_saved  ?? 0}   unit="total notes"        trend={0} />
          </div>

          {/* Activity heatmap */}
          <div className="mb-6">
            <StreakCalendar />
          </div>

          {/* Mid row: recent videos + quiz scores */}
          <div
            className="grid gap-6 mb-6"
            style={{ gridTemplateColumns: "1fr 320px" }}
          >
            <RecentVideos />
            <QuizProgress />
          </div>

          {/* Bottom row: saved notes + AI tutor */}
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <SavedNotes />
            <AiTutorPanel />
          </div>

        </div>
      </div>

      {/* Navbar sits on top */}
      <Navbar />
    </div>
  );
}