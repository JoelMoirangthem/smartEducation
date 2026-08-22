# AI Attendance & Smart Education Platform — Documentation

Comprehensive technical documentation for the Smart Education Platform, featuring AI-based face attendance, real-time notifications, and AI-powered academic assistance (Gemini + Groq, with rule-based fallback).

---

## 🏗️ Architecture Overview

The system follows a decoupled, service-oriented architecture:

```
┌──────────────┐      REST / Socket.io       ┌──────────────────┐
│  React SPA   │ ◄─────────────────────────► │  Node.js Express │
│  (Vite :5173)│                             │  Backend (:5000) │
└──────────────┘                             └──────────────────┘
                                                     │
                         ┌───────────────────────────┼───────────────────┐
                         ▼                           ▼                   ▼
              ┌─────────────────────┐      ┌──────────────┐     ┌──────────────┐
              │ Python Face Service │      │  MongoDB     │     │  Cloudinary  │
              │  (Flask :5001)      │      │  (Atlas/Local)│    │  (avatars)   │
              └─────────────────────┘      └──────────────┘     └──────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │ AI Providers (fallback chain)│
              │  Gemini → Groq → OpenAI →    │
              │  rule-based                 │
              └──────────────────────────────┘
```

### Component Breakdown
1. **Frontend**: Single Page Application (SPA) built with React 19 + Vite. Tailwind CSS + custom CSS for styling. Socket.io-client for real-time features (JWT-authenticated handshake).
2. **Backend**: RESTful API built with Express 5. Handles business logic, authentication (JWT), role-based authorization, and orchestrates AI/Face services. Socket.io server with JWT middleware.
3. **Face Service**: Python microservice (`DeepFace`/Facenet engine by default) dedicated to biometric processing. Fernet-encrypted embeddings at rest.
4. **Database**: MongoDB (Mongoose 9) for users, attendance, marks, notes, notices, notifications, chat sessions.

---

## 📡 Backend API Depth (all under `/api/v1`)

### 🔐 Authentication (`/auth`)
| Method | Path | Description | Access |
|---|---|---|---|
| POST | `/auth/register` | Register the **first admin** (bootstrap) | Public (rate-limited) |
| POST | `/auth/login` | JWT login (role-aware) | Public (rate-limited) |
| POST | `/auth/admin/create-user` | Admin creates teacher/student accounts | Admin |

### 👥 User Management (`/user`) — all require JWT
| Method | Path | Description |
|---|---|---|
| GET | `/user/profile` | Fetch current user profile |
| PUT | `/user/profile` | Update bio/name |
| POST | `/user/profile/avatar` | Upload avatar (Cloudinary) |
| GET | `/user/students` | Students of all classes the teacher manages |
| GET | `/user/classes` | Classes the teacher is associated with |
| GET | `/user/subjects` | Subjects (teacher: own; student: class subjects; admin: all) |

### 📸 AI Face Attendance (`/face-attendance`) — all require JWT
| Method | Path | Description |
|---|---|---|
| POST | `/face-attendance/register` | Send 5–15 face images → Python service builds encrypted centroid embedding (rate-limited) |
| POST | `/face-attendance/mark` | Frame-by-frame recognition → marks attendance with 5s cooldown (rate-limited) |
| GET | `/face-attendance/check/:userId` | Check registration status |
| GET | `/face-attendance/health` | Python service health + registered count |

### 📝 Academic Services
| Route group | Endpoints | Notes |
|---|---|---|
| `/attendance` | `POST /start`, `POST /end`, `POST /mark`, `GET /stats`, `GET /student-stats`, `GET /session/:id/export` | Teacher-owned sessions; QR device anti-share; CSV export |
| `/marks` | `POST /add`, `GET /`, `PUT /:markId` | Marks with % virtual field; real-time notifications |
| `/notices` | `POST /create`, `POST /add`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id` | Role/class/subject targeted, soft-delete, socket push |
| `/notes` | `POST /upload`, `GET /`, `PUT /:id/view`, `GET /download/:id`, `DELETE /:id` | Local disk storage; teacher-scoped access |
| `/notifications` | `GET /`, `POST /` (admin only), `PUT /read-all`, `PUT /:id/read`, `DELETE /read` | 7-day TTL |

### 🤖 AI Tutor & Coach (`/ai`)
| Method | Path | Description |
|---|---|---|
| POST | `/ai/explain` | Simplified explanations (Gemini → Groq → OpenAI) |
| POST | `/ai/quiz` | Auto-generates 5 MCQs from study material |
| POST | `/ai/analyze` | Performance coaching from marks (AI with rule-based fallback) |
| POST | `/ai/chat` | **Streaming** chat with session persistence — served by the Python agent service (`:8000`) |
| GET | `/ai/sessions`, `/ai/sessions/:id` | Chat history (filter by `?mode=tutor\|agent`) |
| DELETE | `/ai/sessions/:id` | Delete a session |

### 🤖 Agentic AI Assistant (Python service `:8000/api/v1/agent`) — performs every feature on the user's behalf
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/agent/chat` | Runs an agent turn: plans, calls tools, streams `[EVT]` events (rate-limited) |
| POST | `/api/v1/agent/approve` | `{approvalId, decision: approve\|reject}` — executes or rejects a pending write, resumes the turn |
| GET | `/api/v1/agent/health` | Provider connectivity + native tool count (JWT-protected; unauthenticated probe at service root `/health`) |

**Design**: the agent runs entirely in the **Python service** (`backend/agent-py/`, FastAPI) — a deepagents LLM loop (Sarvam, OpenAI-compatible) over **70 native tools** that query MongoDB directly via Motor with the same permission checks, ownership rules and socket side-effects as the controllers (Node is out of the agent path). Realtime pushes relay through Express `POST /api/v1/internal/emit` (shared `AGENT_RELAY_SECRET`). The tutor chat (`POST /api/v1/ai/chat`) also lives here; Node keeps `/ai/explain|quiz|analyze` and session CRUD.

**Approval model (hybrid)**: read tools execute instantly; write tools pause the turn via a LangGraph `interrupt()` and emit an `approval` event; destructive tools emit `severity: "destructive"` and require explicit confirm. Turn state is held in memory (`AGENT_APPROVAL_TTL_MIN`, default 15 min). Role checks happen *before* approvals — a role-forbidden tool never reaches the model.

**Wire protocol** (chunked `text/plain`, one JSON per line): `[EVT] {"type":"intent|agent_start|agent_done|token|tool_start|tool_result|approval|session|answer|done|error", …}`. Tokens stream live during every LLM leg; the final `answer` carries authoritative text the frontend reconciles against.

**Safety**: JWT on all agent routes (PyJWT), slowapi limits (20 chat/min, 60 approve/min); every executed action is logged to `agentactionlogs` (user, tool, severity, sanitized args — passwords/tokens scrubbed, status); step budget (12/turn) and provider timeout prevent runaway loops.

**Frontend**: the `/chat` page has a **Tutor \| Agent** toggle; the Vite dev proxy routes `/api/v1/agent` + `/api/v1/ai/chat` to `:8000` before the generic `/api` rule to Express. The stream parser renders a live step feed (✓/✗ chips), streaming token buffer, approval cards with payload preview, and a destructive "Confirm Delete" style. Verification: `bash scripts/test-agent.sh` or `node backend/scripts/dev/agent_smoke.js`.

### 🛠️ Admin (`/admin`)
Classes, subjects, academic years CRUD; `GET /students`, `GET /users`, `PUT /users/:id/update-academic`, `GET /stats`.

---

## 🗄️ Data Schema (MongoDB Models)

| Model | Key fields | Integrity logic |
|---|---|---|
| `User` | name, email (unique), password (bcrypt), role (admin/teacher/student), classId, managedClassIds[], assignedSubjectIds[], academicYearId, avatar | Index `{role,classId}` |
| `AttendanceRecord` | sessionId, studentId, attendanceType (qr/face), confidence, status, markedAt | **Unique `{sessionId,studentId}`** (anti-proxy) + sparse unique `{sessionId,deviceId}` (anti-sharing) |
| `AttendanceSession` | teacherId, classId, subjectId, isActive, expiresAt (+1h) | TTL index on expiresAt; auto-closes prior active sessions |
| `Mark` | studentId, subjectId, examType, marksObtained, maxMarks, uploadedBy | Virtual `percentage`; indexes by student/subject |
| `Subject` | name, code, classId, teachers[], creditHours | Unique `{classId,code}` |
| `Class` | name, code (unique), section, academicYearId, classTeacher | Index `{academicYearId,name}` |
| `Notice` | title, content, targetType (ALL/CLASS/SUBJECT/ROLE), classId, subjectId, priority | Soft delete via `isActive` |
| `Note` | title, fileUrl, publicId, subjectId, classId, views[], downloads[] | Local disk backed |
| `Notification` | userId, message, type, relatedId, isRead | TTL 7 days |
| `ChatSession` | user, title, mode (tutor/agent), messages[] (capped at 100) | Scoped per user |
| `AgentActionLog` | userId, tool, severity (read/write/destructive), args (sanitized), status, summary, sessionId, approvalId, ip | Audit trail for agent executions; index `{userId, createdAt}` |
| `FaceData` | userId (unique), imagesCount, isRegistered | Metadata only — embeddings live in Python service |
| `AcademicYear` | name (unique), startDate, endDate, isCurrent | Single current year enforced in controller |

---

## 🐍 Python Face Service (port 5001)

Two engines ship in `face-service/`:

1. **Primary: `app_deepface.py`** — `DeepFace` with the **Facenet** model (512-D vectors).
   - Registration: ≥5 images (default) with a detectable face each → average embedding ("centroid") → **Fernet/AES encrypted** → pickled to `embeddings.pkl`.
   - Recognition: live frame → Facenet embedding → L2 distance vs all registrants → match if `distance < FACE_THRESHOLD` (default `0.68`) **and** confidence ≥ `MIN_CONFIDENCE` (default `35%`).
   - Encryption key from `EMBEDDING_ENCRYPTION_KEY` in `face-service/.env` (generate via `generate_key.py`, which writes `.env` for you).
   - Backward-compatible decrypt: old plaintext embeddings remain readable.
2. **Fallback: `app.py`** — `face_recognition` (dlib) engine, 128-D encodings, same API contract, threshold default `0.5`.

### API contract (both engines)
- `GET /health` → `{ status, registered_faces, encryption_enabled, threshold }`
- `POST /register-face` `{ studentId, images: [base64...] }` → 200 `{ message, images_processed, ... }` | 400 if <5 valid faces
- `POST /recognize-face` `{ image: base64 }` → 200 `{ recognized, studentId?, confidence?, distance?, reason? }`
- `DELETE /delete-face/<studentId>`

### Environment variables (`face-service/.env`)
```
EMBEDDING_ENCRYPTION_KEY=   # generate_key.py
EMBEDDINGS_FILE=embeddings.pkl
FLASK_PORT=5001
FACE_THRESHOLD=0.68         # lower = stricter
MIN_CONFIDENCE=35           # minimum accepted confidence %
FLASK_DEBUG=false
```

---

## 💻 Frontend Implementation

- **API layer**: `src/services/api.js` — central axios instance (`VITE_API_URL` or dev proxy `/api`), auto-attaches JWT, handles 401 globally.
- **Real-time**: `src/services/socket.service.js` — socket.io with `auth: { token }` handshake (server-verified JWT), room joining on `authenticate`.
- **Pages**: role-based routing via `ProtectedRoute`; face registration (`FaceRegister`), face attendance (`FaceAttendance`, 500ms scan + 5s cooldown), QR attendance, marks, notes, notices, AI chat, admin dashboard.
- **Visuals**: DarkVeil-style glassmorphism, 3D scenes (`@react-three/*`), Tailwind v4.

---

## 🚀 Setup & Deployment

### 1. Prerequisites
- Node.js 18+ (tested on v24)
- Python 3.9+ (face service; pip + venv)
- MongoDB (local: `mongodb-org` package; or Atlas URI)

### 2. Environment files (all gitignored)
| File | Purpose |
|---|---|
| `backend/.env` | Backend config — copy from `backend/.env.example` |
| `face-service/.env` | Face config — run `python generate_key.py` to create |
| `frontend/.env` | Optional; leave empty to use dev proxy |

```env
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance_db   # or Atlas mongodb+srv://...
JWT_SECRET=<random 64-hex string>
JWT_EXPIRES_IN=1d
PYTHON_SERVICE_URL=http://localhost:5001
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=            # optional
OPENAI_API_KEY=            # optional
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
LLM_BASE_URL=https://api.sarvam.ai/v1     # Agentic AI (OpenAI-compatible)
LLM_API_KEY=...                           # enables the agent
LLM_MODEL=sarvam-105b
AGENT_MAX_STEPS=12
AGENT_MAX_TOKENS=4096
AGENT_TIMEOUT_MS=90000
AGENT_APPROVAL_TTL_MIN=15
```

### 3. Install & run

**Linux/macOS** (one command):
```bash
./scripts/start-all.sh       # starts face :5001, backend :5000, frontend :5173
./scripts/stop-all.sh        # stops everything
```
(Individual services: `--face-only`, `--backend-only`, `--frontend-only`)

**Windows**: double-click `scripts/start-all.bat` (or `face-service/start.bat` for face only).

**Manual:**
```bash
# Backend (port 5000)
cd backend && npm install && npm start

# Frontend (port 5173)
cd frontend && npm install && npm run dev

# Face service (port 5001)
cd face-service
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
./venv/bin/python generate_key.py      # creates .env with encryption key
./venv/bin/python app_deepface.py      # primary engine

# MongoDB
sudo systemctl enable --now mongod     # or mongosh / docker
```

### 4. First-time bootstrap
1. Open `http://localhost:5173/register/admin` and create the first admin account.
2. As admin: create Academic Year → Class → Subjects → teachers/students (`Admin Dashboard`).
3. **Student**: `face-register` page → capture 5–15 photos.
4. **Teacher**: `face-attendance` → initialize session (subject + class) → start scan → faces are recognized and marked in real time; `Data Export` downloads the CSV.

---

## 🛠️ Debugging & Health Checks
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/api/v1/health`
- Face service: `http://localhost:5001/health`
- Logs (Linux): `logs/face-service.log`, `logs/backend.log`, `logs/frontend.log`

### Face service troubleshooting
| Symptom | Fix |
|---|---|
| `503 Python face service unavailable` | Start face service; run `curl http://localhost:5001/health` |
| `Only N valid faces detected` | Better lighting, face centered, different angles; ≥5 valid needed |
| `Face not recognized` | Re-register with better photos; relax `FACE_THRESHOLD` (e.g. 0.8) in face-service/.env |
| Wrong student matched | Stricter threshold (e.g. 0.5) + raise `MIN_CONFIDENCE` |
| First request is slow | Expected — Facenet model loads on demand (~5s) |

---

## 🔒 Security measures
- JWT auth on all protected routes and the **socket.io handshake** (no unauthenticated room joining).
- Role checks on attendance/marks/notices/notes/admin endpoints (ownership enforced).
- Rate limiting on login/register/face endpoints.
- Fernet-encrypted face embeddings at rest (key in face-service/.env).
- Password hashing (bcrypt), CORS whitelist, no query-string tokens.
- Admin self-registration is allowed **only for the first admin** (set `ALLOW_PUBLIC_REGISTRATION=true` to re-enable).