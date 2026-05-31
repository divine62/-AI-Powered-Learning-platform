import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:5000";

export default function SavedNotes() {
  const token = localStorage.getItem("kt_token");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await axios.get(`${API}/api/notes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotes(res.data || []);
      } catch (err) {
        console.error("Failed to fetch notes:", err);
        setNotes([]);
      }
      setLoading(false);
    };
    fetchNotes();
  }, [token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card saved-notes-card">
      <style>{`
        .saved-notes-card {
          padding: 1.4rem 1.5rem;
        }
        .sn-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.2rem;
        }
        .sn-title {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(200,168,130,0.55);
        }
        .sn-count {
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          color: rgba(200,168,130,0.35);
          letter-spacing: 0.06em;
        }
        .sn-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .sn-item {
          padding: 0.9rem 1rem;
          background: rgba(200,168,130,0.04);
          border: 1px solid rgba(200,168,130,0.1);
          border-radius: 10px;
          cursor: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .sn-item:hover {
          background: rgba(200,168,130,0.07);
          border-color: rgba(200,168,130,0.2);
        }
        .sn-item-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.3rem;
        }
        .sn-item-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem;
          color: var(--nude, #C8A882);
          font-weight: 600;
          line-height: 1.3;
          flex: 1;
        }
        .sn-item-date {
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          color: rgba(200,168,130,0.35);
          white-space: nowrap;
          flex-shrink: 0;
          padding-top: 0.1rem;
        }
        .sn-item-summary {
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: rgba(200,168,130,0.5);
          line-height: 1.5;
          margin: 0.3rem 0 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sn-item-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }
        .sn-tag {
          font-family: 'DM Mono', monospace;
          font-size: 0.63rem;
          color: rgba(200,168,130,0.5);
          background: rgba(200,168,130,0.07);
          border: 1px solid rgba(200,168,130,0.12);
          border-radius: 999px;
          padding: 0.12rem 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .sn-empty {
          text-align: center;
          padding: 2.5rem 1rem;
          color: rgba(200,168,130,0.3);
        }
        .sn-empty-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.6rem;
        }
        .sn-empty p {
          font-family: 'DM Mono', monospace;
          font-size: 0.73rem;
          letter-spacing: 0.04em;
          line-height: 1.6;
        }
        .sn-empty a {
          color: var(--nude, #C8A882);
          text-decoration: none;
          opacity: 0.7;
        }
        .sn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2.5rem;
          color: rgba(200,168,130,0.35);
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.04em;
        }
        .sn-spinner {
          width: 14px;
          height: 14px;
          border: 1.5px solid rgba(200,168,130,0.15);
          border-top-color: var(--nude, #C8A882);
          border-radius: 50%;
          animation: sn-spin 0.7s linear infinite;
        }
        @keyframes sn-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="sn-header">
        <span className="sn-title">Saved Notes</span>
        {!loading && notes.length > 0 && (
          <span className="sn-count">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {loading ? (
        <div className="sn-loading">
          <div className="sn-spinner" />
          Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <div className="sn-empty">
          <span className="sn-empty-icon">📓</span>
          <p>No notes yet.<br /><a href="/notes">Generate your first AI notes →</a></p>
        </div>
      ) : (
        <div className="sn-list">
          {notes.slice(0, 5).map((note) => (
            <div key={note.id} className="sn-item">
              <div className="sn-item-top">
                <span className="sn-item-title">{note.title || note.subject}</span>
                <span className="sn-item-date">{formatDate(note.created_at)}</span>
              </div>
              {note.summary && (
                <p className="sn-item-summary">{note.summary}</p>
              )}
              {note.tags?.length > 0 && (
                <div className="sn-item-tags">
                  {note.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="sn-tag">{tag}</span>
                  ))}
                  {note.tags.length > 4 && (
                    <span className="sn-tag">+{note.tags.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          {notes.length > 5 && (
            <a
              href="/notes"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.7rem",
                color: "rgba(200,168,130,0.5)",
                textAlign: "center",
                display: "block",
                paddingTop: "0.3rem",
                textDecoration: "none",
                letterSpacing: "0.06em",
              }}
            >
              View all {notes.length} notes →
            </a>
          )}
        </div>
      )}
    </div>
  );
}