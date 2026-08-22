#!/usr/bin/env bash
# Restart the Python agent service detached from this shell.
pkill -f "uvicorn main:app" 2>/dev/null
sleep 1
cd "$(dirname "$0")/../backend/agent-py" || exit 1
setsid nohup ./.venv/bin/uvicorn main:app --app-dir . --host 127.0.0.1 --port 8000 \
  > ../../logs/agent-service.log 2>&1 < /dev/null &
exit 0
