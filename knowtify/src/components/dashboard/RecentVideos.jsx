import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:5000";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days  >= 7) return `${Math.floor(days / 7)}w ago`;
  if (days  >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (mins  >= 1) return `${mins}m ago`;
  return "just now";
}

function ThumbPlaceholder() {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-lg"
      style={{
        width: 54, height: 36,
        background: "linear-gradient(135deg, rgba(200,168,130,0.15), rgba(200,168,130,0.04))",
        fontSize: 14,
      }}
    >
      ▶
    </div>
  );
}

export default function RecentVideos() {
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("kt_token");
    if (!token) { setLoading(false); return; }

    axios.get(`${API}/api/watch-history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.history || []);
        setVideos(list.slice(0, 5));
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.018)", border: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(244,239,233,0.35)" }}>
          Recent Videos
        </div>
        <button
          className="font-mono uppercase transition-colors duration-200"
          style={{ fontSize: 8, letterSpacing: "0.12em", color: "var(--nude)", background: "none", border: "none", cursor: "none" }}
          onClick={() => navigate("/search")}
        >
          Find More →
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-5 py-8 text-center">
          <p className="font-mono" style={{ fontSize: 11, color: "rgba(244,239,233,0.25)" }}>Loading…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && videos.length === 0 && (
        <div className="px-5 py-8 text-center" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>🎬</span>
          <p className="font-mono" style={{ fontSize: 11, color: "rgba(244,239,233,0.25)" }}>No videos watched yet.</p>
          <button
            className="font-mono"
            style={{ fontSize: 10, color: "var(--nude)", background: "none", border: "none", cursor: "none", marginTop: 4, textDecoration: "underline" }}
            onClick={() => navigate("/search")}
          >
            Find videos →
          </button>
        </div>
      )}

      {/* Real rows */}
      {!loading && videos.map((v, i) => (
        <div
          key={v.id || i}
          className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-150"
          style={{
            borderBottom: i < videos.length - 1 ? "1px solid rgba(244,239,233,0.04)" : "none",
            cursor: "none",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          onClick={() => window.open(`https://www.youtube.com/watch?v=${v.video_id}`, "_blank")}
        >
          {/* Thumbnail */}
          {v.thumbnail
            ? <img
                src={v.thumbnail} alt={v.title}
                className="flex-shrink-0 rounded-lg"
                style={{ width: 54, height: 36, objectFit: "cover" }}
                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
              />
            : null
          }
          {(!v.thumbnail) && <ThumbPlaceholder />}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-sans truncate mb-0.5" style={{ fontSize: 13, fontWeight: 600, color: "var(--off-white)" }}>
              {v.title || "Untitled"}
            </div>
            <div className="flex items-center gap-2">
              {v.channel && (
                <span className="font-mono" style={{ fontSize: 10, color: "rgba(244,239,233,0.32)" }}>
                  {v.channel}
                </span>
              )}
              {v.channel && v.watched_at && (
                <span style={{ color: "rgba(244,239,233,0.15)", fontSize: 10 }}>·</span>
              )}
              {v.watched_at && (
                <span className="font-mono" style={{ fontSize: 10, color: "rgba(244,239,233,0.28)" }}>
                  {timeAgo(v.watched_at)}
                </span>
              )}
            </div>
          </div>

          {/* Subject pill */}
          {v.subject && (
            <div
              className="font-mono rounded-full px-3 py-1 flex-shrink-0"
              style={{ fontSize: 8, letterSpacing: "0.08em", background: "rgba(200,168,130,0.1)", color: "var(--nude)" }}
            >
              {v.subject}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}