#!/usr/bin/env bash
# Reliable service restart script
set -e
PROJ="/home/tipu-sultan/smartEducation"

echo "Stopping all services..."
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "app_deepface" 2>/dev/null || true
sleep 3

mkdir -p "$PROJ/logs"

echo "Starting Backend..."
cd "$PROJ/backend"
node src/server.js > "$PROJ/logs/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 4

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start!"
    cat "$PROJ/logs/backend.log"
    exit 1
fi
echo "✅ Backend PID: $BACKEND_PID"

echo "Starting Agent..."
cd "$PROJ/backend/agent-py"
"$PROJ/backend/agent-py/.venv/bin/uvicorn" main:app --app-dir "$PROJ/backend/agent-py" --host 127.0.0.1 --port 8000 > "$PROJ/logs/agent-service.log" 2>&1 &
AGENT_PID=$!
sleep 4

if ! kill -0 $AGENT_PID 2>/dev/null; then
    echo "❌ Agent failed to start!"
    cat "$PROJ/logs/agent-service.log"
    exit 1
fi
echo "✅ Agent PID: $AGENT_PID"

echo "Starting Frontend..."
cd "$PROJ/frontend"
npx vite > "$PROJ/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
sleep 3
echo "✅ Frontend PID: $FRONTEND_PID"

echo "Starting Face Service..."
cd "$PROJ/face-service"
"$PROJ/face-service/venv/bin/python" app_deepface.py > "$PROJ/logs/face-service.log" 2>&1 &
FACE_PID=$!
sleep 3
echo "✅ Face Service PID: $FACE_PID"

echo ""
echo "=== Health Checks ==="
echo "Backend:  $(curl -s http://localhost:5000/api/v1/health | head -c 80)"
echo "Agent:    $(curl -s http://localhost:8000/health | head -c 80)"
echo "Frontend: $(curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:5173)"
echo "Face:     $(curl -s http://localhost:5001/health | head -c 80)"
echo ""
echo "All services started!"
