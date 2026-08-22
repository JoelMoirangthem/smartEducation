import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

HOST = os.getenv("AGENT_PY_HOST", "127.0.0.1")
PORT = int(os.getenv("AGENT_PY_PORT", "8000"))

NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:5000")

# Shared infrastructure (same values the Express server uses)
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/edusmart")
JWT_SECRET = os.getenv("JWT_SECRET", "")
UPLOADS_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
FACE_SERVICE_URL = os.getenv("PYTHON_SERVICE_URL", "http://localhost:5001")
AGENT_RELAY_SECRET = os.getenv("AGENT_RELAY_SECRET", "agent-relay-dev-secret")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")

# Providers — priority is defined in llm.py: Sarvam first, NVIDIA fallback.
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_API_KEY = (os.getenv("NVIDIA_API_KEY") or "").strip()
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "openai/gpt-oss-120b")

SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai/v1")
SARVAM_API_KEY = (os.getenv("SARVAM_API_KEY") or "").strip()

# AgentRouter (agentrouter.org) — OpenAI-compatible coding relay.
# Requires a coding-tool User-Agent header or it rejects the client.
AGENTROUTER_BASE_URL = os.getenv("AGENTROUTER_BASE_URL", "https://agentrouter.org/v1")
AGENTROUTER_API_KEY = (os.getenv("AGENTROUTER_API_KEY") or "").strip()
AGENTROUTER_MODEL = os.getenv("AGENTROUTER_MODEL", "gpt-5.6-sol")
AGENTROUTER_UA = os.getenv("AGENTROUTER_USER_AGENT", "opencode/1.0.0")

if not NVIDIA_API_KEY and not SARVAM_API_KEY and not AGENTROUTER_API_KEY:
    import warnings
    warnings.warn("⚠️  No AI API keys set (NVIDIA_API_KEY / SARVAM_API_KEY / AGENTROUTER_API_KEY) — agent AI features will be disabled.")

# Agentic Model
AGENT_MODEL = os.getenv("AGENT_MODEL", "openai/gpt-oss-120b")

# Assistant Model
ASSISTANT_MODEL = os.getenv("ASSISTANT_MODEL", "openai/gpt-oss-120b")

MODEL_TIMEOUT = float(os.getenv("AGENT_TIMEOUT_MS", "90000")) / 1000.0
MAX_TOKENS = int(os.getenv("AGENT_MAX_TOKENS", "16384"))
MAX_STEPS = int(os.getenv("AGENT_MAX_STEPS", "12"))

APPROVAL_TTL = float(os.getenv("AGENT_APPROVAL_TTL_MIN", "15")) * 60.0