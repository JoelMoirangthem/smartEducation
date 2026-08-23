# EduSmart Agent — FastAPI + LangGraph (AgentRouter/Sarvam/NVIDIA)
FROM python:3.11-slim

WORKDIR /app

# System deps for building native wheels (if needed by langchain)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/agent-py/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent source
COPY backend/agent-py ./backend/agent-py
COPY backend/.env.example ./backend/.env.example

# Env: Render will inject MONGODB_URI, JWT_SECRET, AGENTROUTER_API_KEY etc.
# Must bind 0.0.0.0 for Docker/Render (not 127.0.0.1)
ENV AGENT_PY_HOST=0.0.0.0
ENV AGENT_PY_PORT=8000
ENV NODE_ENV=production

EXPOSE 8000

# Health check (unauth): GET /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "backend/agent-py"]
