#!/usr/bin/env bash
# Restart the Express backend detached from this shell.
pkill -f "node src/server.js" 2>/dev/null
sleep 1
cd "$(dirname "$0")/../backend" || exit 1
setsid nohup node src/server.js > ../logs/backend.log 2>&1 < /dev/null &
exit 0
