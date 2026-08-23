#!/usr/bin/env bash
# SmartEducation — stop all services (Linux/macOS)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Stopping SmartEducation services..."

# Stop Vite (frontend)
pkill -f "vite" 2>/dev/null && echo "  ✗ frontend stopped" || echo "  – frontend not running"

# Stop Node backend
pkill -f "node src/server.js" 2>/dev/null && echo "  ✗ backend stopped" || echo "  – backend not running"

# Stop Python face service
pkill -f "app_deepface.py" 2>/dev/null && echo "  ✗ face service stopped" || echo "  – face service not running"

# Stop Python agent service
pkill -f "uvicorn.*8000" 2>/dev/null && echo "  ✗ agent service stopped" || echo "  – agent service not running"
pkill -f "agent-py.*uvicorn" 2>/dev/null && echo "  ✗ agent (alt) stopped" || true

echo "Done."