# Face Attendance — Setup & Usage Guide

How to set up and use the AI face attendance feature end-to-end.

> **IMPORTANT (fixed):** The production engine is now **`app_deepface.py`** (DeepFace/Facenet) — NOT `app.py`. Thresholds are configurable via `face-service/.env`. The guide below reflects the real code.

---

## 1. Architecture (3 services)

| Service | Tech | Port | Role |
|---|---|---|---|
| Python Face Service | Flask + DeepFace (Facenet) | 5001 | Face encoding/recognition, encrypted storage |
| Node Backend | Express + Socket.io | 5000 | API, sessions, DB, real-time push |
| Frontend | React + Vite | 5173 | Webcam UI (registration & scanning) |

## 2. Install

**Face service (Linux/macOS):**
```bash
cd face-service
python3 -m venv venv
./venv/bin/pip install -r requirements.txt    # now includes deepface, tensorflow-cpu, cryptography
./venv/bin/python generate_key.py             # creates .env with EMBEDDING_ENCRYPTION_KEY
./venv/bin/python app_deepface.py
```

**Face service (Windows):** run `face-service/start.bat` (auto-creates venv, installs deps, generates key).

**Backend:**
```bash
cd backend && npm install
# backend/.env needs: MONGODB_URI, JWT_SECRET, PYTHON_SERVICE_URL=http://localhost:5001
npm start
```

**Frontend:** `cd frontend && npm install && npm run dev`

**MongoDB:** local (`sudo systemctl enable --now mongod`) or Atlas URI in `backend/.env`.

Or everything at once: `./scripts/start-all.sh` (Linux) / `scripts/start-all.bat` (Windows).

## 3. Usage workflow

1. **Bootstrap admin** → `http://localhost:5173/register/admin`
2. **Admin**: create Academic Year → Class → Subjects → Teacher → Student (use `admin/dashboard`, `admin/academic`, `admin/users`)
3. **Student** → `face-register` page:
   - Allow camera access → capture **5–15 photos** (good lighting, different angles, no mask/sunglasses)
   - Submit → backend forwards to Python service → ≥5 faces must be detected → centroid embedding computed → **encrypted** and saved to `embeddings.pkl`
   - Optional: update later (replaces old embedding)
4. **Teacher** → `face-attendance` page:
   - **INITIALIZE SESSION** → enter Subject ID + Class ID (the subjects/classes visible to the teacher are used)
   - **ACTIVATE MATRIX** (webcam) → **INITIALIZE SCAN**
   - Scan runs every 500ms; a student is logged once per session (5-second in-session cooldown prevents duplicates from rapid frames)
   - Verified identities appear live in the "Verified Personas" panel and via socket `attendance_update`
   - **DATA EXPORT** → CSV of all class students vs presence

## 4. Verification & testing

```bash
# 1. Health: both sides
curl http://localhost:5001/health
curl http://localhost:5000/api/v1/face-attendance/health -H "Authorization: Bearer <token>"

# 2. Check embeddings file (should contain face data for registered students)
python -c "
import pickle
with open('face-service/embeddings.pkl','rb') as f: print(list(pickle.load(f).keys()))
"

# 3. Registration (from backend, use a student token)
curl -X POST http://localhost:5000/api/v1/face-attendance/register \
  -H "Authorization: Bearer <student-token>" -H "Content-Type: application/json" \
  -d '{"images":["<base64>","<base64>","<base64>","<base64>","<base64>"]}'
```

### Anti-proxy / anti-duplicate tests
- **Same student twice in one session** → second attempt returns `alreadyMarked` (unique `{sessionId, studentId}` index)
- **Wrong class student** → `403 Student is not enrolled in this class`
- **Multiple faces in frame** → DeepFace uses the first detected face

## 5. Common issues & fixes (UPDATED)

| Symptom | Cause / Fix |
|---|---|
| `Python face service unavailable` (503) | Face service not running. `curl localhost:5001/health`. |
| `ModuleNotFoundError` on fresh install | Old `requirements.txt` was missing `deepface`/`tensorflow-cpu`/`cryptography`/`python-dotenv`. Re-install from the fixed file. |
| `Only 0 valid faces detected` with `...haarcascade_frontalface_default.xml... violated` | `opencv-python` **5.x dropped the haar cascade data files**. `requirements.txt` now pins `opencv-python-headless<5` — reinstall: `./venv/bin/pip install --force-reinstall -r requirements.txt`. |
| `ValueError: ... requires tf-keras package` at startup | TensorFlow 2.21 needs the keras-3 compat bridge. `requirements.txt` now includes `tf-keras`. |
| `Fernet key must be 32 url-safe base64-encoded bytes` | Key must be **44-char padded** base64. Regenerate: `./venv/bin/python generate_key.py`. |
| `Decryption Failed` on load | `EMBEDDING_ENCRYPTION_KEY` changed. Existing encrypted data is unreadable — keep the key safe. Old plaintext data still loads (backward compatible). |
| `Only N valid faces detected` (N<5) | Lighting/angle/blur. Capture at least 5 clearly visible, centered faces. |
| `Face not recognized` at 1.5m+ distance | Default threshold is 0.68 (strict). Loosen via `FACE_THRESHOLD=0.8` in `face-service/.env` (0.5 for maximum strictness). |
| Wrong student authenticated | Tighten: `FACE_THRESHOLD=0.5`, `MIN_CONFIDENCE=50`. |
| First scan is slow (~5s) | Facenet model loading on demand. Expected on first request; model is cached afterwards. |
| Socket events not arriving | Re-login so the new token reaches the socket handshake; check browser console `🔗 WebSocket Connected`. |

## 6. Threshold tuning summary

| Setting (`face-service/.env`) | Default | Effect |
|---|---|---|
| `FACE_THRESHOLD` | `0.68` | Max L2 distance for a match. Lower = stricter, fewer false positives, more missed identifications |
| `MIN_CONFIDENCE` | `35` | Min confidence % to accept (`(1 - distance/threshold) × 100`). Higher = stricter |
| `FLASK_DEBUG` | `false` | Set `true` for stack traces during development |

## 7. Security notes

- Embeddings are **Fernet-encrypted** at rest (AES-128-CBC + HMAC-SHA256), key in `face-service/.env` (never commit it).
- The Python service trusts the Node backend (JWT-protected); it is not exposed publicly.
- One attendance record per student per session; 5s cooldown; 120 req/min API rate limit.