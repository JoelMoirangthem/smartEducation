# 🎓 SmartEducation — AI-Powered School Operations Platform

An end-to-end education platform with **AI face attendance**, a full academic suite (marks, notices, notes, timetable, exams, fees, library, transport), and an **agentic AI assistant** that operates the entire platform for you — reading data instantly and executing writes behind **human-approval cards**, just like a coding agent.

```
┌──────────────────┐   REST / Socket.io   ┌─────────────────────┐
│  React SPA       │◄────────────────────►│  Express API        │
│  (Vite :5173)    │                      │  (:5000)            │
└────────┬─────────┘                      └──────────┬──────────┘
         │ /api/v1/agent/*  /api/v1/ai/chat          │
         ▼                                           ▼
┌─────────────────────────────┐        ┌──────────────────────────┐
│  Agent Service (FastAPI)    │        │  MongoDB                 │
│  :8000 · deepagents/langgraph│◄─────►│  users · marks · notices │
│  77 native tools over Mongo  │ relay │  chatsessions · audit…   │
└─────────────────────────────┘ socket └──────────────────────────┘
         │                                            ▲
         ▼                                            │
┌─────────────────────────────┐        ┌──────────────┴───────────┐
│  LLM Providers              │        │  Face Service (Flask)    │
│  AgentRouter → Sarvam →     │        │  :5001 DeepFace/Facenet  │
│  NVIDIA (auto failover)     │        │  Fernet-encrypted faces  │
└─────────────────────────────┘        └──────────────────────────┘
```

## ✨ Highlights

- 🤖 **Conversational platform operator** — *“delete all students with no class”*, *“assign everyone to B.Tech CS 2026”*, *“create a notice about exams at 2 PM”* — the agent parses intent, resolves references (“first 2 classes”, “that class”), composes its own MongoDB queries, and executes.
- 🛡️ **Human-in-the-loop by design** — reads are instant; every write/destructive action pauses mid-turn with a permission card showing the exact command and how many documents it will affect. Nothing changes until you click **Approve**.
- 🧠 **Multi-provider LLM failover** — if the primary provider dies mid-conversation (out of credits, stalls), the turn automatically continues on the next configured provider. Never hangs, never lies about success.
- 📸 **AI face attendance** — DeepFace/Facenet embeddings, Fernet-encrypted at rest, live video recognition with confidence thresholds.
- 📚 **Full academic suite** — classes, subjects, academic years, attendance (QR + face), marks, notices, notes, timetable, exams, fees & payments, library, transport, inventory, leave requests, parent linking, real-time notifications.
- 🔐 **Security first** — JWT everywhere (including Socket.io handshake), role-based access, ownership checks, rate limiting, bcrypt passwords, sanitized audit trail for every agent action.

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4, Socket.io-client |
| API Backend | Node.js 18+, Express 5, Mongoose 9, Socket.io |
| Agent Service | Python 3.12, FastAPI, deepagents, LangGraph, Motor (async MongoDB) |
| Face Service | Python, Flask, DeepFace (Facenet 512-D), OpenCV |
| Database | MongoDB |

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Python 3.10+** (with `pip` and `venv`)
- **MongoDB** running locally (`mongod`) or an Atlas URI

```bash
git clone https://github.com/JoelMoirangthem/smartEducation.git
cd smartEducation
```

### 1 · Configure environment

```bash
# Backend — copy example and fill in secrets
cp backend/.env.example backend/.env

# Face service — generates encryption key automatically
(cd face-service && python3 generate_key.py)

# Frontend (optional — empty file uses the dev proxy)
touch frontend/.env
```

`backend/.env` key settings:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance_db
JWT_SECRET=<random 64-hex string>
CORS_ORIGIN=http://localhost:5173

# --- AI providers (any one enables the agent; priority top→down) ---
AGENTROUTER_API_KEY=...      # https://agentrouter.org  (primary)
SARVAM_API_KEY=...           # https://console.sarvam.ai
NVIDIA_API_KEY=...           # https://build.nvidia.com

# --- Optional extras ---
GROQ_API_KEY=...             # AI tutor explain/quiz fallbacks
CLOUDINARY_URL=...           # avatar uploads (optional)
```

> 💡 The agent works with any OpenAI-compatible endpoint. See `backend/.env.example` for the full list of knobs (timeouts, step limits, approval TTL).

### 2 · Run everything

```bash
./scripts/start-all.sh        # Linux/macOS — starts all four services
# Windows: scripts/start-all.bat
```

| Service | URL | Health check |
|---|---|---|
| Frontend | http://localhost:5173 | — |
| API Backend | http://localhost:5000 | `/api/v1/health` |
| Agent Service | http://localhost:8000 | `/health` |
| Face Service | http://localhost:5001 | `/health` |

Stop everything: `./scripts/stop-all.sh` · Individual restarts: `scripts/restart-{agent,backend,services}.sh`

Logs land in `logs/`.

### 3 · First-time bootstrap

1. Open **http://localhost:5173/register/admin** → create the first admin *(self-registration closes after the first admin exists)*
2. In **Admin Dashboard**: create an Academic Year → Class → Subjects → teacher/student accounts
3. Students optionally register their face at `/face-register` (5–15 photos)
4. Teachers start face/QR attendance from `/attendance`
5. Open **/chat → Agent mode** and try:
   - *“Show me all students”*
   - *“Assign every student to \<class name\>”*
   - *“Create a notice for tomorrow's English session at 2 PM”*

## 🤖 The Agentic AI Assistant

Switch to **Agent mode** in `/chat`. The assistant is not a chatbot bolted on top — it's an operator wired directly into MongoDB:

| Action type | Behavior |
|---|---|
| **Reads** (`list_users`, `db_find`, stats…) | execute instantly |
| **Writes** (create/update, `db_insert`, `db_modify`) | pause → approval card → you decide |
| **Destructive** (deletes, cascades) | red confirmation card with live match count |

**Intent-driven, not hardcoded:** the model translates your words into its own queries. Ask *"delete the first 2 classes"* and it lists classes, resolves positions 0–1, shows you the exact command plus *"would match 2 document(s)"*, and only then acts.

**Safety rails**

- Collection allowlist + blocked operators (`$where`, `$function`…) — no JS injection
- Password fields rejected in raw DB commands (bcrypt lives in proper tools)
- Zero-match operations report *"matched 0 documents — NOTHING was changed"*
- Self-deletion impossible; soft-deleted records visible to admins via `include_inactive`
- Every executed/denied action lands in the `agentactionlogs` audit collection (secrets scrubbed)

**Provider failover** — configure several keys; when one dies mid-turn (quota, stall, auth), the turn transparently switches to the next and tells you it did.

## 📜 Scripts

| Script | Purpose |
|---|---|
| `scripts/start-all.sh` | Launch frontend + backend + agent + face service |
| `scripts/stop-all.sh` | Stop everything |
| `scripts/test-agent.sh` | End-to-end agent verification battery |
| `scripts/restart-agent.sh` | Restart the Python agent service |
| `scripts/restart-backend.sh` | Restart the Express API |

## 📚 Documentation

- **[DOCUMENTATION.md](DOCUMENTATION.md)** — full architecture, REST API reference, data schemas, deployment guide, troubleshooting
- **[FACE_ATTENDANCE_GUIDE.md](FACE_ATTENDANCE_GUIDE.md)** — face enrollment, thresholds, tuning
- **[docs/superpowers/specs/](docs/superpowers/specs/)** — design specs (agentic architecture, approval protocol)

## 🔒 Security Notes

- All `.env` files are gitignored — never commit real keys
- Face embeddings are encrypted at rest (Fernet/AES); biometric raw images are never persisted
- Admin self-registration auto-closes after bootstrap (`ALLOW_PUBLIC_REGISTRATION=true` reopens it)
- CORS whitelist, no query-string tokens, bcrypt cost 10+

---

Built with ❤️ as a full-stack demonstration of production-minded agentic AI: powerful enough to operate the whole school, restrained enough to never act without you.
