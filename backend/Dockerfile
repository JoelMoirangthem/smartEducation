# EduSmart Backend — Node + Express + Socket.IO
# Free-tier friendly: single stage, node:20-alpine (~120MB)
FROM node:20-alpine

WORKDIR /app

# Install frontend first (for single-service option where Express serves Vite dist)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
# Build frontend — VITE_API_URL empty => relative /api/v1 (same-origin, free single-service)
# For split Vercel+Render, this build is unused and frontend is hosted on Vercel separately
RUN cd frontend && npm run build

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend ./backend

ENV NODE_ENV=production
EXPOSE 10000

WORKDIR /app/backend

# Render injects PORT=10000; server.js respects process.env.PORT
CMD ["node", "src/server.js"]
