# SmartEducation — AI Attendance & Smart Education Platform

An education platform with **AI face attendance** (DeepFace/Facenet), QR attendance, AI tutor (Gemini + Groq), **agentic AI assistant (Sarvam AI — performs any feature on your behalf with approval controls)**, marks, notices, notes, and real-time notifications.

## Quick start

```bash
# 1. Install & run everything (Linux/macOS)
./scripts/start-all.sh

# Windows: scripts/start-all.bat

# 2. Open http://localhost:5173/register/admin → create the first admin account
```

Requires: Node.js 18+, Python 3.9+ (with pip/venv), and MongoDB (`sudo apt install mongodb-org && sudo systemctl enable --now mongod`).

## Services

| Service | Dir | Tech | Port |
|---|---|---|---|
| Frontend | `frontend/` | React 19 + Vite | 5173 |
| Backend | `backend/` | Express 5 + Mongoose + Socket.io | 5000 |
| Face Service | `face-service/` | Flask + DeepFace (Facenet) | 5001 |

## Docs

- [DOCUMENTATION.md](DOCUMENTATION.md) — full architecture, API, schemas, deployment
- [FACE_ATTENDANCE_GUIDE.md](FACE_ATTENDANCE_GUIDE.md) — face attendance setup, tuning, troubleshooting
- `face-service/README.md`, `face-service/INSTALL_WINDOWS.md`, `face-service/TESTING_GUIDE.md`

## Env files (never commit these)

- `backend/.env` ← copy `backend/.env.example`
- `face-service/.env` ← `python generate_key.py` creates it
- `frontend/.env` (optional; empty = use Vite dev proxy)

## Recent fixes

- Face service install now works (`requirements.txt` includes deepface/tensorflow-cpu/cryptography/python-dotenv)
- DeepFace engine is the default; configurable thresholds (0.68 / 35%)
- Groq AI support with Gemini → Groq → OpenAI fallback chain
- Socket.io JWT handshake (no unauthenticated room joining)
- Role/ownership checks on attendance/marks/notices/notes endpoints
- Rate limiting on login/register/face/agent routes
- Dead code removed; CORS whitelist; startup config validation

## Agentic AI assistant

Open `/chat` and switch to **Agent** mode. Ask the agent to do anything the UI can do (37 tools): reads (marks, notices, students, stats…) run instantly; writes (add marks, create notices, start attendance, admin CRUD…) pause for your **Approve/Reject** card; destructive actions (deletes) require a red **Confirm Delete**. Every action is written to an audit log (`GET /api/v1/agent/actions`).

Configured via `backend/.env` (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL=sarvam-105b`). See `DOCUMENTATION.md` → Agent section. Smoke test: `node backend/scripts/dev/agent_smoke.js`.