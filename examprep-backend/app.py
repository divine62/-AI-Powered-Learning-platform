"""
examprep + Knowtify Backend (v7)
Fixes/additions in v7:
  - Added POST /api/transcript (youtube-transcript-api, 4-level fallback)
  - Updated /api/notes/generate to accept optional transcript + video_title fields
  - All other routes unchanged from v6
"""

import re, math, os, io, requests, json, time
from datetime import timedelta, datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from youtube_transcript_api import (
    YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
)

app = Flask(__name__)

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS(app, resources={r"/api/*": {"origins": "*"}},
     supports_credentials=False,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# ── Database ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'knowtify.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET", "knowtify-secret-change-in-prod")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)

db  = SQLAlchemy(app)
jwt = JWTManager(app)

# ── Models ─────────────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(120), nullable=False)
    email         = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    college       = db.Column(db.String(200), nullable=True)
    university    = db.Column(db.String(200), nullable=True)
    year          = db.Column(db.String(20),  nullable=True)
    branch        = db.Column(db.String(100), nullable=True)
    city          = db.Column(db.String(100), nullable=True)

    career_goal   = db.Column(db.String(100), nullable=True)
    target_exam   = db.Column(db.String(100), nullable=True)
    subjects      = db.Column(db.Text,        nullable=True)

    streak        = db.Column(db.Integer,  default=0)
    videos_done   = db.Column(db.Integer,  default=0)
    quiz_avg      = db.Column(db.Float,    default=0.0)
    notes_saved   = db.Column(db.Integer,  default=0)
    last_login    = db.Column(db.Date,     nullable=True)

    def to_dict(self):
        return {
            "id"          : self.id,
            "name"        : self.name,
            "email"       : self.email,
            "college"     : self.college,
            "university"  : self.university,
            "year"        : self.year,
            "branch"      : self.branch,
            "city"        : self.city,
            "career_goal" : self.career_goal,
            "target_exam" : self.target_exam,
            "subjects"    : self.subjects.split(",") if self.subjects else [],
            "stats": {
                "streak"     : self.streak,
                "videos_done": self.videos_done,
                "quiz_avg"   : self.quiz_avg,
                "notes_saved": self.notes_saved,
            }
        }


class QuizAttempt(db.Model):
    __tablename__ = "quiz_attempts"

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subject         = db.Column(db.String(200), nullable=False)
    score           = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, default=10)
    difficulty      = db.Column(db.String(20), default="Medium")
    created_at      = db.Column(db.DateTime, default=db.func.now())

    def to_dict(self):
        return {
            "id"             : self.id,
            "subject"        : self.subject,
            "score"          : self.score,
            "total_questions": self.total_questions,
            "difficulty"     : self.difficulty,
            "date"           : self.created_at.strftime("%b %d, %Y") if self.created_at else "",
        }


class WatchHistory(db.Model):
    __tablename__ = "watch_history"

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    video_id   = db.Column(db.String(50), nullable=False)
    title      = db.Column(db.String(300), nullable=True)
    channel    = db.Column(db.String(200), nullable=True)
    thumbnail  = db.Column(db.String(500), nullable=True)
    subject    = db.Column(db.String(200), nullable=True)
    watched_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id"        : self.id,
            "video_id"  : self.video_id,
            "title"     : self.title,
            "channel"   : self.channel,
            "thumbnail" : self.thumbnail,
            "subject"   : self.subject,
            "watched_at": self.watched_at.isoformat() if self.watched_at else "",
        }


class Note(db.Model):
    __tablename__ = "notes"

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title      = db.Column(db.String(300), nullable=True)
    subject    = db.Column(db.String(200), nullable=True)
    content    = db.Column(db.Text, nullable=True)
    summary    = db.Column(db.Text, nullable=True)
    tags       = db.Column(db.Text, nullable=True)   # comma-separated
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id"        : self.id,
            "title"     : self.title,
            "subject"   : self.subject,
            "content"   : self.content,
            "summary"   : self.summary,
            "tags"      : self.tags.split(",") if self.tags else [],
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }


with app.app_context():
    db.create_all()


# ── AUTH ───────────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data     = request.get_json(force=True)
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        name          = name,
        email         = email,
        password_hash = generate_password_hash(password),
        college       = (data.get("college") or "").strip() or None,
        university    = (data.get("university") or "").strip() or None,
        year          = data.get("year"),
        branch        = data.get("branch"),
        city          = (data.get("city") or "").strip() or None,
        career_goal   = data.get("career_goal"),
        target_exam   = (data.get("target_exam") or "").strip() or None,
        subjects      = ",".join(data.get("subjects", [])) or None,
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data     = request.get_json(force=True)
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))

    # ── Streak logic: increment once per day, reset if gap > 1 day ──
    today = datetime.utcnow().date()
    if user.last_login is None:
        # First ever login
        user.streak     = 1
        user.last_login = today
    elif user.last_login == today:
        # Already logged in today — no change
        pass
    elif (today - user.last_login).days == 1:
        # Consecutive day — increment
        user.streak     = (user.streak or 0) + 1
        user.last_login = today
    else:
        # Gap of 2+ days — reset
        user.streak     = 1
        user.last_login = today
    db.session.commit()

    return jsonify({"token": token, "user": user.to_dict()}), 200


# ── PROFILE ────────────────────────────────────────────────────────────────────

@app.route("/api/user/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@app.route("/api/user/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data   = request.get_json(force=True)
    fields = ["name", "college", "university", "year", "branch",
              "city", "career_goal", "target_exam"]
    for f in fields:
        if f in data:
            setattr(user, f, (data[f] or "").strip() or None)
    if "subjects" in data:
        user.subjects = ",".join(data["subjects"]) if data["subjects"] else None

    db.session.commit()
    return jsonify(user.to_dict()), 200


# ── QUIZ ───────────────────────────────────────────────────────────────────────

@app.route("/api/quiz/submit", methods=["POST"])
@jwt_required()
def submit_quiz():
    user_id = int(get_jwt_identity())
    data    = request.get_json(force=True)

    attempt = QuizAttempt(
        user_id         = user_id,
        subject         = data.get("subject", "Unknown"),
        score           = int(data.get("score", 0)),
        total_questions = int(data.get("total_questions", 10)),
        difficulty      = data.get("difficulty", "Medium"),
    )
    db.session.add(attempt)

    user = User.query.get(user_id)
    if user:
        all_attempts = QuizAttempt.query.filter_by(user_id=user_id).all()
        avg = sum(a.score for a in all_attempts) / len(all_attempts) if all_attempts else 0
        user.quiz_avg = round(avg, 1)

    db.session.commit()
    return jsonify(attempt.to_dict()), 201


@app.route("/api/quiz/history", methods=["GET"])
@jwt_required()
def quiz_history():
    user_id  = int(get_jwt_identity())
    attempts = QuizAttempt.query.filter_by(user_id=user_id)\
                 .order_by(QuizAttempt.created_at.desc()).limit(10).all()
    return jsonify([a.to_dict() for a in attempts]), 200


@app.route("/api/quiz/generate", methods=["POST"])
@jwt_required()
def generate_quiz():
    data       = request.get_json(force=True)
    subject    = (data.get("subject") or "").strip()
    difficulty = (data.get("difficulty") or "Medium").strip()

    if not subject:
        return jsonify({"error": "subject is required"}), 400

    prompt = f"""Generate exactly 10 multiple choice questions for Indian engineering students on the subject: "{subject}".
Difficulty: {difficulty}.
Focus on university exam and GATE-style questions.

Return ONLY a valid JSON array, no markdown, no explanation, just the array:
[
  {{
    "question": "Question text here?",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct": "A",
    "explanation": "Brief explanation of why A is correct."
  }}
]"""

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    resp    = call_gemini(payload)

    if resp is None:
        return jsonify({"error": "Gemini rate limit reached. Please wait a moment and try again."}), 429

    try:
        raw    = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        clean  = re.sub(r"```json|```", "", raw).strip()
        parsed = json.loads(clean)
        if not isinstance(parsed, list) or len(parsed) == 0:
            raise ValueError("Empty or invalid quiz array")
        return jsonify({"questions": parsed[:10]}), 200
    except Exception as e:
        return jsonify({"error": f"Quiz parse error: {str(e)}"}), 502


# ── WATCH HISTORY ──────────────────────────────────────────────────────────────

@app.route("/api/watch-history/log", methods=["POST"])
@jwt_required()
def log_watch():
    user_id = int(get_jwt_identity())
    data    = request.get_json(force=True)

    entry = WatchHistory(
        user_id   = user_id,
        video_id  = data.get("video_id", ""),
        title     = data.get("title", ""),
        channel   = data.get("channel", ""),
        thumbnail = data.get("thumbnail", ""),
        subject   = data.get("subject", ""),
    )
    db.session.add(entry)

    user = User.query.get(user_id)
    if user:
        user.videos_done = (user.videos_done or 0) + 1

    db.session.commit()
    return jsonify(entry.to_dict()), 201


@app.route("/api/watch-history/last", methods=["GET"])
@jwt_required()
def last_watched():
    user_id = int(get_jwt_identity())
    subject = request.args.get("subject", "").strip().lower()

    query = WatchHistory.query.filter_by(user_id=user_id)
    if subject:
        query = query.filter(
            db.func.lower(WatchHistory.subject).contains(subject)
        )
    entry = query.order_by(WatchHistory.watched_at.desc()).first()
    if not entry:
        return jsonify({"video": None}), 200
    return jsonify({"video": entry.to_dict()}), 200


@app.route("/api/watch-history", methods=["GET"])
@jwt_required()
def watch_history_list():
    user_id = int(get_jwt_identity())
    entries = WatchHistory.query.filter_by(user_id=user_id)\
                .order_by(WatchHistory.watched_at.desc()).limit(20).all()
    return jsonify([e.to_dict() for e in entries]), 200


# ── GEMINI HELPERS ─────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODELS  = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
]

def call_gemini(payload, retries=3, backoff=5):
    """Call Gemini with retry on 429, cycling through models."""
    for attempt in range(retries):
        for model in GEMINI_MODELS:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={GEMINI_API_KEY}"
            )
            try:
                resp = requests.post(url, json=payload, timeout=45)
                if resp.status_code == 200:
                    return resp
                elif resp.status_code == 429:
                    print(f"[Gemini] 429 on {model}, attempt {attempt+1}/{retries} — waiting {backoff}s")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 30)
                elif resp.status_code == 404:
                    print(f"[Gemini] 404 on {model} — skipping")
                    break
                else:
                    print(f"[Gemini] {resp.status_code} on {model}: {resp.text[:200]}")
            except Exception as e:
                print(f"[Gemini] Exception on {model}: {e}")
    return None


# ── TRANSCRIPT ─────────────────────────────────────────────────────────────────

@app.route("/api/transcript", methods=["POST"])
@jwt_required()
def get_transcript():
    data     = request.get_json(force=True)
    video_id = (data.get("video_id") or "").strip()

    if not video_id:
        return jsonify({"error": "video_id is required"}), 400

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        transcript_obj  = None
        source          = "manual"

        # 1. Manually-created English
        try:
            transcript_obj = transcript_list.find_manually_created_transcript(["en"])
        except NoTranscriptFound:
            pass

        # 2. Any manually-created language -> translate to English
        if transcript_obj is None:
            try:
                all_manual = [t for t in transcript_list if not t.is_generated]
                if all_manual:
                    transcript_obj = all_manual[0]
                    if transcript_obj.language_code != "en":
                        transcript_obj = transcript_obj.translate("en")
                    source = "manual_translated"
            except Exception:
                pass

        # 3. Auto-generated English
        if transcript_obj is None:
            try:
                transcript_obj = transcript_list.find_generated_transcript(["en"])
                source = "generated"
            except NoTranscriptFound:
                pass

        # 4. Any auto-generated -> translate to English
        if transcript_obj is None:
            try:
                all_generated = [t for t in transcript_list if t.is_generated]
                if all_generated:
                    transcript_obj = all_generated[0]
                    if transcript_obj.language_code != "en":
                        transcript_obj = transcript_obj.translate("en")
                    source = "generated_translated"
            except Exception:
                pass

        if transcript_obj is None:
            return jsonify({
                "success": False,
                "error": "No transcript available for this video",
                "fallback_available": True,
            }), 200

        entries   = transcript_obj.fetch()
        full_text = " ".join(
            e["text"].strip() for e in entries if (e.get("text") or "").strip()
        )

        MAX_CHARS = 12000
        trimmed   = len(full_text) > MAX_CHARS
        if trimmed:
            full_text = full_text[:MAX_CHARS]

        return jsonify({
            "success":    True,
            "transcript": full_text,
            "source":     source,
            "trimmed":    trimmed,
        }), 200

    except TranscriptsDisabled:
        return jsonify({
            "success": False,
            "error": "Transcripts are disabled for this video",
            "fallback_available": True,
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Could not fetch transcript: {str(e)}",
            "fallback_available": True,
        }), 200


# ── NOTES ──────────────────────────────────────────────────────────────────────

@app.route("/api/notes/generate", methods=["POST"])
@jwt_required()
def generate_notes():
    data        = request.get_json(force=True)
    subject     = data.get("subject",     "").strip()
    topics      = data.get("topics",      [])
    pyqs        = data.get("pyqs",        "").strip()
    video       = data.get("video",       None)   # legacy field, kept for compat
    transcript  = data.get("transcript",  "").strip()
    video_title = data.get("video_title", "").strip()

    if not subject and not transcript and not topics:
        return jsonify({"error": "subject or transcript is required"}), 400

    topics_str = ", ".join(topics) if topics else "all core topics"

    # Transcript is the primary content source when present
    if transcript:
        v_ref       = f'"{video_title}"' if video_title else "the video"
        content_str = (
            f"\nPRIMARY SOURCE — Transcript of YouTube video {v_ref}:\n"
            f"```\n{transcript}\n```\n\n"
            f"Generate notes that accurately capture what was taught in this video. "
            f"Include every concept, definition, formula, and example from the transcript.\n"
        )
        note_subject = video_title or subject or "Video Notes"
    else:
        video_str = (
            f"\nReference video: '{video.get('title','')}' by {video.get('channel','')}"
            if video else ""
        )
        content_str = (
            f"\nSubject: {subject or 'General'}\n"
            f"Topics to cover: {topics_str}"
            f"{video_str}\n"
        )
        note_subject = subject

    pyqs_str = f"\nPrevious year questions to focus on:\n{pyqs}" if pyqs else ""

    prompt = f"""Generate comprehensive exam-prep notes for an Indian university student.
{content_str}{pyqs_str}

Return a JSON object with this exact structure (no markdown, no backticks, raw JSON only):
{{
  "title": "string — descriptive notes title",
  "summary": "string — 2-3 sentence overview",
  "tags": ["tag1", "tag2", "tag3"],
  "sections": [
    {{
      "heading": "Section Title",
      "content": "Detailed explanation paragraph",
      "key_points": ["point 1", "point 2", "point 3"]
    }}
  ],
  "exam_tips": ["tip 1", "tip 2", "tip 3"]
}}

Include 4-6 sections covering the most important concepts. Make key_points concise and exam-focused."""

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    resp    = call_gemini(payload)

    if resp is None:
        return jsonify({"error": "Gemini API rate limit reached. Please wait 1-2 minutes and try again."}), 429

    try:
        raw        = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        raw        = re.sub(r"```json|```", "", raw).strip()
        notes_data = json.loads(raw)
        notes_data["subject"] = note_subject
        return jsonify(notes_data), 200
    except json.JSONDecodeError:
        return jsonify({
            "title":     f"{note_subject} Notes",
            "summary":   raw[:300] if "raw" in dir() else "Notes generated.",
            "tags":      [note_subject],
            "sections":  [{"heading": "Notes", "content": raw if "raw" in dir() else "", "key_points": []}],
            "exam_tips": [],
            "subject":   note_subject,
        }), 200
    except Exception as e:
        return jsonify({"error": f"Gemini parse error: {str(e)}"}), 502


@app.route("/api/notes", methods=["POST"])
@jwt_required()
def save_note():
    user_id = int(get_jwt_identity())
    data    = request.get_json(force=True)

    note = Note(
        user_id = user_id,
        title   = data.get("title", ""),
        subject = data.get("subject", ""),
        content = json.dumps(data.get("sections", [])),
        summary = data.get("summary", ""),
        tags    = ",".join(data.get("tags", [])),
    )
    db.session.add(note)

    user = User.query.get(user_id)
    if user:
        user.notes_saved = (user.notes_saved or 0) + 1

    db.session.commit()
    return jsonify(note.to_dict()), 201


@app.route("/api/notes", methods=["GET"])
@jwt_required()
def get_notes():
    user_id = int(get_jwt_identity())
    notes   = Note.query.filter_by(user_id=user_id)\
                .order_by(Note.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notes]), 200


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
@jwt_required()
def delete_note(note_id):
    user_id = int(get_jwt_identity())
    note    = Note.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return jsonify({"error": "Note not found"}), 404
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ── COLLEGE TRENDING ───────────────────────────────────────────────────────────

@app.route("/api/trending/college", methods=["GET"])
@jwt_required()
def college_trending():
    rows = db.session.query(User.college, db.func.count(User.id))\
             .filter(User.college != None)\
             .group_by(User.college)\
             .order_by(db.func.count(User.id).desc())\
             .limit(10).all()
    return jsonify([{"college": r[0], "count": r[1]} for r in rows]), 200


# ── VIDEO ──────────────────────────────────────────────────────────────────────

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEO_URL  = "https://www.googleapis.com/youtube/v3/videos"

TESSERACT_CMD = os.environ.get("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
try:
    import pytesseract
    from PIL import Image
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

SYNONYMS = {
    "bst": "binary search tree bst node insertion deletion search",
    "binary search tree": "binary search tree bst inorder traversal node insertion",
    "avl": "avl tree rotation balanced binary tree height",
    "avl tree": "avl tree rotation left right double balanced height",
    "binary tree": "binary tree traversal inorder preorder postorder node level",
    "linked list": "linked list node pointer singly doubly circular operations",
    "stack": "stack push pop peek lifo data structure implementation",
    "queue": "queue enqueue dequeue fifo circular priority implementation",
    "heap": "heap max min heapify priority queue binary tree",
    "hashing": "hashing hash table collision chaining open addressing probe",
    "graph": "graph bfs dfs directed undirected adjacency matrix list traversal",
    "graphs": "graph bfs dfs directed undirected weighted shortest path traversal",
    "trie": "trie prefix tree string search insert autocomplete",
    "dynamic programming": "dynamic programming dp memoization tabulation optimal substructure",
    "dp": "dynamic programming dp memoization tabulation recursion",
    "divide and conquer": "divide conquer merge sort quick sort recursion strategy",
    "sorting": "sorting bubble merge quick heap insertion selection sort algorithm",
    "searching": "searching binary search linear search algorithm complexity",
    "greedy": "greedy algorithm optimal substructure activity selection knapsack",
    "backtracking": "backtracking recursion n queens sudoku constraint satisfaction",
    "complexity": "time complexity space complexity big o notation analysis algorithm",
    "time complexity": "time complexity big o omega theta notation analysis best worst",
    "process scheduling": "process scheduling cpu scheduler fcfs sjf round robin priority",
    "scheduling": "cpu scheduling process scheduler fcfs sjf priority preemptive",
    "deadlock": "deadlock prevention detection avoidance banker algorithm circular wait",
    "memory management": "memory management paging segmentation virtual memory allocation",
    "paging": "paging page table frame virtual memory address translation tlb",
    "virtual memory": "virtual memory page fault demand paging swap thrashing",
    "semaphore": "semaphore mutex synchronization critical section process thread",
    "threads": "threads multithreading concurrency synchronization process creation",
    "ipc": "inter process communication ipc pipes message queue shared memory",
    "file system": "file system directory inode fat ntfs disk storage allocation",
    "normalization": "normalization normal forms 1nf 2nf 3nf bcnf functional dependency",
    "sql": "sql query select join aggregation database relational algebra",
    "transactions": "transactions acid atomicity consistency isolation durability commit",
    "indexing": "indexing b tree b+ tree database query optimization dense sparse",
    "er diagram": "er diagram entity relationship model database schema design",
    "joins": "sql joins inner outer left right cross join relational",
    "acid": "acid transactions atomicity consistency isolation durability",
    "tcp ip": "tcp ip protocol suite network layer transport connection",
    "osi model": "osi model seven layers network protocol stack application",
    "routing": "routing algorithm dijkstra ospf bgp rip distance vector",
    "dns": "dns domain name system resolution protocol server query",
    "http": "http https web protocol request response header method",
    "socket programming": "socket programming tcp udp network client server connection",
    "automata": "automata finite state machine dfa nfa regular language expression",
    "turing machine": "turing machine computability decidability halting problem",
    "context free grammar": "context free grammar cfg parse tree pushdown automata derivation",
}

def expand_topics(topics):
    parts = []
    for topic in topics:
        key = topic.lower().strip()
        parts.append(topic)
        if key in SYNONYMS:
            parts.append(SYNONYMS[key])
    return " ".join(parts)

def search_youtube(query, max_results=20):
    params = {
        "part": "snippet", "q": query, "type": "video",
        "maxResults": max_results, "relevanceLanguage": "en",
        "key": YOUTUBE_API_KEY,
    }
    resp = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json().get("items", [])

def fetch_video_stats(video_ids):
    if not video_ids:
        return {}
    params = {
        "part": "statistics,contentDetails",
        "id": ",".join(video_ids),
        "key": YOUTUBE_API_KEY,
    }
    resp  = requests.get(YOUTUBE_VIDEO_URL, params=params, timeout=10)
    resp.raise_for_status()
    stats = {}
    for item in resp.json().get("items", []):
        vid = item["id"]
        s   = item.get("statistics", {})
        cd  = item.get("contentDetails", {})
        stats[vid] = {
            "views"           : int(s.get("viewCount", 0)),
            "likes"           : int(s.get("likeCount", 0)),
            "duration_seconds": parse_iso_duration(cd.get("duration", "PT0S")),
        }
    return stats

def parse_iso_duration(d):
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d)
    if not m:
        return 0
    return int(m.group(1) or 0)*3600 + int(m.group(2) or 0)*60 + int(m.group(3) or 0)

def format_duration(s):
    if s == 0:
        return "unknown"
    h, m = s // 3600, (s % 3600) // 60
    return f"{h}h {m}m" if h else f"{m}m"

def score_by_syllabus(videos, syllabus_topics):
    if not videos or not syllabus_topics:
        return videos
    syllabus_doc = expand_topics(syllabus_topics)
    vectorizer   = TfidfVectorizer(stop_words="english", ngram_range=(1, 3), min_df=1, sublinear_tf=True)
    titles = [syllabus_doc] + [v.get("snippet", {}).get("title", "") for v in videos]
    descs  = [syllabus_doc] + [v.get("snippet", {}).get("description", "")[:400] for v in videos]
    def similarities(corpus):
        mat = vectorizer.fit_transform(corpus)
        return cosine_similarity(mat[0], mat[1:])[0]
    title_sims = similarities(titles)
    desc_sims  = similarities(descs)
    for i, video in enumerate(videos):
        video["_raw"] = 0.7 * float(title_sims[i]) + 0.3 * float(desc_sims[i])
    max_raw = max((v["_raw"] for v in videos), default=1) or 1
    for video in videos:
        video["match_score"] = round(max((video["_raw"] / max_raw) * 95, 1), 1)
    return videos

def filter_by_time(videos, stats, exam_days):
    cap = exam_days * 3 * 3600 * 0.6
    out = []
    for v in videos:
        vid  = v.get("id", {}).get("videoId", "")
        stat = stats.get(vid, {})
        dur  = stat.get("duration_seconds", 0)
        v["duration_seconds"] = dur
        v["duration_display"] = format_duration(dur)
        v["views"]            = stat.get("views", 0)
        v["likes"]            = stat.get("likes", 0)
        if dur == 0 or dur <= cap:
            out.append(v)
    return out

def rank_videos(videos):
    max_v = max((v.get("views", 1) for v in videos), default=1) or 1
    for v in videos:
        match = v.get("match_score", 0) / 100
        pop   = math.log1p(v.get("views", 0)) / math.log1p(max_v)
        v["final_score"] = round((0.7 * match + 0.3 * pop) * 100, 1)
    return sorted(videos, key=lambda v: v["final_score"], reverse=True)


@app.route("/api/videos", methods=["POST"])
def get_videos():
    data    = request.get_json(force=True)
    subject = data.get("subject", "").strip()

    syllabus_topics = (
        data.get("syllabus_topics") or
        data.get("topics") or
        []
    )
    exam_days = int(data.get("exam_days", 3))

    if not subject:
        return jsonify({"error": "subject is required"}), 400

    if not syllabus_topics:
        syllabus_topics = [subject]

    top_topics   = syllabus_topics[:3]
    search_query = f"{subject} {' '.join(top_topics)} exam lecture tutorial"

    try:
        raw_videos = search_youtube(search_query, max_results=20)
    except requests.HTTPError as e:
        return jsonify({"error": f"YouTube API error: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"Search failed: {str(e)}"}), 500

    if not raw_videos:
        return jsonify({"videos": [], "total_found": 0}), 200

    video_ids = [v["id"]["videoId"] for v in raw_videos if v.get("id", {}).get("kind") == "youtube#video"]
    stats     = fetch_video_stats(video_ids)
    scored    = score_by_syllabus(raw_videos, syllabus_topics)
    filtered  = filter_by_time(scored, stats, exam_days)
    ranked    = rank_videos(filtered)

    out = []
    for v in ranked[:10]:
        snippet = v.get("snippet", {})
        vid_id  = v.get("id", {}).get("videoId", "")
        out.append({
            "video_id"   : vid_id,
            "title"      : snippet.get("title", ""),
            "channel"    : snippet.get("channelTitle", ""),
            "description": snippet.get("description", "")[:150],
            "thumbnail"  : snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
            "url"        : f"https://www.youtube.com/watch?v={vid_id}",
            "duration"   : v.get("duration_display", "unknown"),
            "views"      : v.get("views", 0),
            "likes"      : v.get("likes", 0),
            "match_score": v.get("match_score", 0),
            "final_score": v.get("final_score", 0),
        })

    return jsonify({
        "subject"        : subject,
        "exam_days"      : exam_days,
        "available_hours": exam_days * 3,
        "total_found"    : len(filtered),
        "videos"         : out,
    })


# ── SYLLABUS PARSE ─────────────────────────────────────────────────────────────

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")

def ocr_image_bytes(file_bytes):
    image = Image.open(io.BytesIO(file_bytes))
    w, h  = image.size
    if w < 1200:
        scale = 1200 / w
        image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    image = image.convert("L")
    return pytesseract.image_to_string(image, config="--psm 6")

@app.route("/api/parse_syllabus", methods=["POST"])
def parse_syllabus():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file       = request.files["file"]
    filename   = file.filename.lower()
    file_bytes = file.read()
    raw_text   = ""
    if filename.endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                raw_text += page.get_text()
        except Exception as e:
            return jsonify({"error": f"PDF read failed: {str(e)}"}), 422
    elif any(filename.endswith(ext) for ext in IMAGE_EXTENSIONS):
        if not TESSERACT_AVAILABLE:
            return jsonify({"topics": [], "warning": "Tesseract not installed."}), 200
        try:
            raw_text = ocr_image_bytes(file_bytes)
        except Exception as e:
            return jsonify({"topics": [], "warning": f"OCR failed: {str(e)}"}), 200
        if not raw_text.strip():
            return jsonify({"topics": [], "warning": "Couldn't read text from image."}), 200
    else:
        return jsonify({"error": "Unsupported file type."}), 400
    topics = extract_topics_from_text(raw_text)
    if not topics:
        return jsonify({"topics": [], "warning": "No topics found."}), 200
    return jsonify({"topics": topics, "count": len(topics)})

def extract_topics_from_text(text):
    NON_TOPICS = {
        "unit","module","chapter","section","part","topic","contents","syllabus",
        "course","subject","total","hours","marks","lecture","tutorial","practical",
        "reference","books","text","introduction","overview","objective","outcome",
        "note","and","the","of","to","a","an","in","is","are","for","with","on","by","from",
    }
    text  = re.sub(r"\r\n|\r", "\n", text)
    text  = re.sub(r"\t", " ", text)
    lines = text.split("\n")
    raw_candidates = []
    for line in lines:
        line = re.sub(r"^[\s\d\.\-\•\*\→\—\▪]+", "", line)
        line = re.sub(r"^(unit|module|chapter|section)\s*\d+\s*[:\-]?\s*", "", line, flags=re.I)
        line = line.strip()
        if not line or len(line) < 3:
            continue
        parts = re.split(r"[,;/\—\:\•\|]+", line)
        raw_candidates.extend(parts)
    seen, topics = set(), []
    for c in raw_candidates:
        c = re.sub(r"[^\w\s\(\)\+\#\.]", " ", c)
        c = re.sub(r"\s+", " ", c).strip()
        if not c or len(c) < 3 or len(c) > 60:
            continue
        if re.match(r"^\d+$", c):
            continue
        words = c.lower().split()
        if all(w in NON_TOPICS for w in words):
            continue
        key = c.lower()
        if key not in seen:
            seen.add(key)
            topics.append(c.strip())
    return topics[:30]


# ── AI TUTOR ───────────────────────────────────────────────────────────────────

@app.route("/api/tutor/chat", methods=["POST"])
@jwt_required()
def tutor_chat():
    user_id       = int(get_jwt_identity())
    data          = request.get_json(force=True)
    messages      = data.get("messages", [])
    user_context  = data.get("user_context", {})
    watch_context = data.get("watch_context", "").strip()  # NEW: passed from frontend

    if not messages:
        return jsonify({"error": "messages are required"}), 400

    name        = user_context.get("name", "Student")
    branch      = user_context.get("branch", "")
    target_exam = user_context.get("target_exam", "")
    subjects    = user_context.get("subjects", [])
    year        = user_context.get("year", "")

    context_parts = []
    if branch:      context_parts.append(f"studying {branch}")
    if year:        context_parts.append(f"in year {year}")
    if target_exam: context_parts.append(f"preparing for {target_exam}")
    if subjects:    context_parts.append(f"main subjects: {', '.join(subjects)}")
    context_str = f"The student ({name}) is " + ", ".join(context_parts) + "." if context_parts else ""

    watch_str = f"\n\nRecently watched videos (use these to give context-aware answers):\n{watch_context}" if watch_context else ""

    system_prompt = f"""You are Knowtify's AI Tutor — an expert academic assistant for Indian university students.
{context_str}{watch_str}

Your capabilities:
- Answer subject/topic questions clearly and accurately
- Explain concepts step by step with examples
- Generate quiz questions (MCQ format with 4 options and correct answer marked)
- Create practice problems with detailed solutions
- Proactively reference the student's recently watched videos when relevant — if a question relates to something they watched, say so
- If the student's message includes a video transcript, base your explanation on that transcript content

Response formatting rules:
- Use **bold** for key terms and important points
- Use numbered lists for steps, bullet points for lists
- For code: wrap in triple backticks with language name
- For MCQs: format as "Q: ... \\nA) ... B) ... C) ... D) ...\\n✓ Answer: ..."
- For practice problems: show problem clearly, then "Solution:" section
- Keep responses focused and exam-oriented
- Always be encouraging and supportive

If asked to quiz, generate exactly 3 MCQs on the topic being discussed.
If asked for practice problems, generate 2-3 problems with full solutions.
If asked to explain, use the "concept → why it matters → example → exam tip" structure."""

    gemini_contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        gemini_contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })

    full_contents = [
        {"role": "user",  "parts": [{"text": system_prompt}]},
        {"role": "model", "parts": [{"text": "Understood. I'm ready to help as Knowtify's AI Tutor!"}]},
        *gemini_contents,
    ]

    resp = call_gemini({"contents": full_contents})
    if resp is None:
        return jsonify({"error": "Gemini rate limit reached. Please wait a moment and try again."}), 429
    try:
        reply = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

        # ── Proactive suggestion logic ─────────────────────────────────────
        # Extract the topic from the last user message
        last_user_msg = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
        )

        # Don't suggest if user was asking for quiz/practice (already an action)
        skip_keywords = ["quiz me", "quiz", "practice problem", "mcq", "test me",
                         "generate notes", "find video", "explain last video"]
        should_suggest = not any(kw in last_user_msg.lower() for kw in skip_keywords)

        suggestion = None
        if should_suggest and len(reply) > 100:
            # Check if topic matches any watched video subject
            watched_subjects = []
            if watch_context:
                for line in watch_context.split("\n"):
                    if "subject:" in line.lower():
                        subj = line.lower().split("subject:")[-1].strip().rstrip(")")
                        if subj and subj != "general":
                            watched_subjects.append(subj)

            # Extract topic keyword from last user message (first 6 words)
            topic_words = [w for w in last_user_msg.split()[:6]
                           if len(w) > 3 and w.lower() not in
                           {"what","tell","explain","about","please","how","why","does","give","can","the","this","that","is","are","was","were"}]
            topic = " ".join(topic_words[:3]) if topic_words else ""

            # Decide which suggestion to show
            msg_lower = last_user_msg.lower()
            reply_lower = reply.lower()

            # If reply contains a substantial explanation → offer notes
            explanation_signals = ["is a", "are ", "refers to", "means ", "concept",
                                   "algorithm", "works by", "defined as", "formula",
                                   "example:", "step 1", "1."]
            has_explanation = any(sig in reply_lower for sig in explanation_signals)

            if has_explanation and topic:
                # Check if we have a watched video on this topic
                topic_in_watched = any(topic.lower() in ws for ws in watched_subjects)
                if topic_in_watched:
                    matching = next((ws for ws in watched_subjects if topic.lower() in ws), "")
                    suggestion = {
                        "type":   "video_context",
                        "label":  f"Explain from your {matching} video",
                        "action": "explain_last_video",
                        "topic":  topic,
                    }
                else:
                    suggestion = {
                        "type":   "notes",
                        "label":  f"Generate notes on {topic}",
                        "action": "generate_notes",
                        "topic":  topic,
                    }
            elif topic and not has_explanation:
                suggestion = {
                    "type":   "video",
                    "label":  f"Find videos on {topic}",
                    "action": "find_videos",
                    "topic":  topic,
                }

        return jsonify({"reply": reply, "suggestion": suggestion}), 200
    except Exception as e:
        return jsonify({"error": f"Tutor parse error: {str(e)}"}), 502


# ── RECOMMENDATIONS ────────────────────────────────────────────────────────────

BRANCH_SUBJECTS = {
    "computer science": ["Data Structures & Algorithms", "Operating Systems", "DBMS", "Computer Networks", "OOP"],
    "cse":              ["Data Structures & Algorithms", "Operating Systems", "DBMS", "Computer Networks", "OOP"],
    "information technology": ["Web Development", "DBMS", "Computer Networks", "Software Engineering", "Python"],
    "electronics":      ["Digital Electronics", "Signals & Systems", "Microprocessors", "VLSI", "Communication Systems"],
    "ece":              ["Digital Electronics", "Signals & Systems", "Microprocessors", "VLSI", "Communication Systems"],
    "electrical":       ["Power Systems", "Control Systems", "Electrical Machines", "Circuit Theory", "Power Electronics"],
    "mechanical":       ["Thermodynamics", "Fluid Mechanics", "Manufacturing", "Machine Design", "Engineering Mechanics"],
    "civil":            ["Structural Analysis", "Concrete Structures", "Geotechnical Engineering", "Fluid Mechanics", "Surveying"],
}

@app.route("/api/recommendations", methods=["GET"])
@jwt_required()
def get_recommendations():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    watch_entries = WatchHistory.query.filter_by(user_id=user_id)\
                      .order_by(WatchHistory.watched_at.desc()).all()
    quiz_entries  = QuizAttempt.query.filter_by(user_id=user_id)\
                      .order_by(QuizAttempt.created_at.desc()).all()

    watch_counts = {}
    for w in watch_entries:
        subj = (w.subject or "").strip().lower()
        if subj:
            watch_counts[subj] = watch_counts.get(subj, 0) + 1

    quiz_scores = {}
    quiz_counts = {}
    for q in quiz_entries:
        subj = (q.subject or "").strip().lower()
        if subj:
            quiz_scores[subj] = quiz_scores.get(subj, 0) + q.score
            quiz_counts[subj] = quiz_counts.get(subj, 0) + 1
    quiz_avg = {s: round(quiz_scores[s] / quiz_counts[s]) for s in quiz_scores}

    recommendations = []

    # Rule 1: Watched but quiz score < 60 → needs revision
    for subj, count in watch_counts.items():
        avg = quiz_avg.get(subj)
        if avg is not None and avg < 60:
            recommendations.append({
                "type": "weak", "subject": subj.title(),
                "reason": f"Quiz avg {avg}% — needs revision",
                "action": "quiz", "icon": "◈", "priority": 1,
            })

    # Rule 2: Quizzed well but haven't watched much → go deeper
    for subj, avg in quiz_avg.items():
        if avg >= 75 and watch_counts.get(subj, 0) < 2:
            recommendations.append({
                "type": "deepen", "subject": subj.title(),
                "reason": f"Quiz avg {avg}% — ready for advanced content",
                "action": "video", "icon": "▶", "priority": 2,
            })

    # Rule 3: Branch subjects not yet explored
    branch_key     = (user.branch or "").lower()
    matched_branch = next((k for k in BRANCH_SUBJECTS if k in branch_key), None)
    if matched_branch:
        watched_lower = set(watch_counts.keys())
        for bs in BRANCH_SUBJECTS[matched_branch]:
            if bs.lower() not in watched_lower:
                recommendations.append({
                    "type": "explore", "subject": bs,
                    "reason": f"Core topic for {user.branch} — not yet explored",
                    "action": "video", "icon": "→", "priority": 3,
                })

    # Rule 4: Career goal specific suggestions
    goal = (user.career_goal or "").lower()
    goal_subjects = []
    if "gate" in goal:
        goal_subjects = ["Engineering Mathematics", "General Aptitude", "Data Structures & Algorithms"]
    elif "data science" in goal or "ai" in goal or "ml" in goal:
        goal_subjects = ["Machine Learning", "Python Programming", "Linear Algebra", "Statistics"]
    elif "software" in goal or "sde" in goal:
        goal_subjects = ["System Design", "Data Structures & Algorithms", "Operating Systems"]
    elif "placement" in goal:
        goal_subjects = ["Data Structures & Algorithms", "Aptitude", "OOP Concepts"]

    for gs in goal_subjects:
        if gs.lower() not in watch_counts:
            recommendations.append({
                "type": "goal", "subject": gs,
                "reason": f"Recommended for {user.career_goal}",
                "action": "video", "icon": "✦", "priority": 2,
            })

    # Rule 5: Fallback if no history
    if not recommendations:
        fallback = BRANCH_SUBJECTS.get(matched_branch, [])[:3] if matched_branch \
                   else ["Data Structures & Algorithms", "Python Programming", "Computer Networks"]
        for fs in fallback:
            recommendations.append({
                "type": "start", "subject": fs,
                "reason": "Popular starting point for your branch",
                "action": "video", "icon": "→", "priority": 3,
            })

    # Sort by priority, deduplicate, cap at 5
    seen_subjects = set()
    unique = []
    for r in sorted(recommendations, key=lambda x: x["priority"]):
        key = r["subject"].lower()
        if key not in seen_subjects:
            seen_subjects.add(key)
            unique.append(r)
        if len(unique) >= 5:
            break

    return jsonify({"recommendations": unique}), 200


# ── DEBUG / HEALTH ─────────────────────────────────────────────────────────────

@app.route("/api/test-gemini", methods=["GET"])
def test_gemini():
    models = [
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
    ]
    results = {}
    for url in models:
        model_name = url.split("/models/")[1].split(":")[0]
        try:
            r = requests.post(url, json={"contents": [{"role": "user", "parts": [{"text": "Say hi"}]}]}, timeout=10)
            results[model_name] = {"status": r.status_code, "ok": r.status_code == 200, "body": r.text[:200]}
        except Exception as e:
            results[model_name] = {"status": "error", "ok": False, "body": str(e)}
    return jsonify(results)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status"             : "ok",
        "message"            : "knowtify + examprep backend v7 running",
        "tesseract_available": TESSERACT_AVAILABLE,
    })



if __name__ == "__main__":
    app.run(debug=True, port=5000)