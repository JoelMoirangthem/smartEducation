#!/usr/bin/env bash
# SmartEducation — start all services (Linux/macOS)
# Usage: ./scripts/start-all.sh [--face-only] [--backend-only] [--frontend-only]
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FACE_ONLY=0; BACKEND_ONLY=0; FRONTEND_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --face-only) FACE_ONLY=1 ;;
    --backend-only) BACKEND_ONLY=1 ;;
    --frontend-only) FRONTEND_ONLY=1 ;;
  esac
done

if [ "$FACE_ONLY" = "0" ] && [ "$BACKEND_ONLY" = "0" ] && [ "$FRONTEND_ONLY" = "0" ]; then
  FACE_ONLY=1; BACKEND_ONLY=1; FRONTEND_ONLY=1
fi

log() { echo -e "\n\033[1;36m══ $1 \033[0m"; }

check_mongo() {
  if ! pgrep -f mongod > /dev/null 2>&1; then
    echo "⚠️  MongoDB is not running. Start it with: sudo systemctl start mongod"
    echo "   (or: sudo apt install mongodb-org && sudo systemctl enable --now mongod)"
    exit 1
  fi
}

# ---------- Face service (Python) ----------
start_face() {
  log "Starting Python Face Service on :5001 ..."
  cd "$ROOT/face-service"
  if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
  fi
  if [ ! -f ".env" ]; then
    ./venv/bin/python generate_key.py
  fi
  nohup ./venv/bin/python app_deepface.py > ../logs/face-service.log 2>&1 &
  echo "   → face service PID $! (logs: logs/face-service.log)"
  cd "$ROOT"
}

# ---------- Agent service (Python LangGraph) ----------
start_agent() {
  log "Starting Python Agent Service on :8000 ..."
  cd "$ROOT/backend/agent-py"
  if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    ./.venv/bin/pip install -r requirements.txt
  fi
  nohup "$ROOT/backend/agent-py/.venv/bin/uvicorn" main:app --app-dir "$ROOT/backend/agent-py" --host 127.0.0.1 --port 8000 > "$ROOT/logs/agent-service.log" 2>&1 &
  echo "   → agent service PID $! (logs: logs/agent-service.log)"
  cd "$ROOT"
}

# ---------- Backend (Node) ----------
start_backend() {
  check_mongo
  log "Starting Backend on :5000 ..."
  cd "$ROOT/backend"
  if [ ! -d "node_modules" ]; then npm install; fi
  nohup npm start > ../logs/backend.log 2>&1 &
  echo "   → backend PID $! (logs: logs/backend.log)"
  cd "$ROOT"
}

# ---------- Frontend (Vite) ----------
start_frontend() {
  log "Starting Frontend on :5173 ..."
  cd "$ROOT/frontend"
  if [ ! -d "node_modules" ]; then npm install; fi
  nohup npm run dev > ../logs/frontend.log 2>&1 &
  echo "   → frontend PID $! (logs: logs/frontend.log)"
  cd "$ROOT"
}

mkdir -p "$ROOT/logs"
[ "$FACE_ONLY" = "1" ] && start_face
if [ "$BACKEND_ONLY" = "1" ]; then
  start_backend
fi
if [ "$FRONTEND_ONLY" = "1" ]; then
  start_frontend
fi

log "All services launched. URLs:"
echo "   • Frontend:  http://localhost:5173"
echo "   • Backend:   http://localhost:5000/api/v1/health"
echo "   • Agent:     http://localhost:8000/health"
echo "   • Face:      http://localhost:5001/health"
echo "• Stop everything with: ./scripts/stop-all.sh"