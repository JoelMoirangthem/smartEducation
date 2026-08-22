"""
EduSmart agent service (Python) — owns the entire agent path.

Endpoints:
  GET  /api/v1/agent/health    provider + native registry status
  POST /api/v1/agent/chat      stream one agent turn ([EVT] line protocol)
  POST /api/v1/agent/approve   resume an interrupted turn
"""

import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, Body, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.responses import JSONResponse

import config
import llm
import service
from auth import verify_token
from ratelimit import APPROVE_LIMIT, CHAT_LIMIT, limiter
from registry import REGISTRY

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("agent.main")

ALLOWED_ORIGINS = [o.strip() for o in config.CORS_ORIGIN.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    import tools  # noqa: F401 — registers every native tool

    service.start_background_tasks()
    log.info("agent service listening on %s:%s — %d native tools",
             config.HOST, config.PORT, len(REGISTRY))
    yield


app = FastAPI(title="EduSmart Agent", docs_url=None, redoc_url=None, lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded,
                          lambda req, exc: JSONResponse({"message": "Rate limit exceeded"}, status_code=429))
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _evt_headers():
    return {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }


router = APIRouter()


@router.get("/health")
async def health(user: dict = Depends(verify_token)):
    h = llm.get_health()
    h["tools"] = len(REGISTRY)
    return h


@app.get("/health")
async def infra_health():
    """Unauthenticated infra probe (used by the Express server at startup)."""
    h = llm.get_health()
    h["tools"] = len(REGISTRY)
    return h


@limiter.limit(CHAT_LIMIT)
@router.post("/chat")
async def chat(request: Request, body: dict = Body(...), user: dict = Depends(verify_token)):
    message = str((body or {}).get("message") or "").strip()
    if not message:
        raise HTTPException(400, "Message is required")

    history = (body or {}).get("history") or []
    session_id = (body or {}).get("sessionId") or ""

    turn_id = service.start_turn({
        "userId": user["id"], "role": user["role"], "name": user.get("name", ""),
        "token": user["token"], "message": message, "sessionId": session_id,
        "history": history if isinstance(history, list) else [],
    })
    log.info("[chat] turn=%s user=%s msg=%r", turn_id, user["id"], message[:80])

    return StreamingResponse(service.stream_chat(message, history, session_id, turn_id),
                             headers=_evt_headers())


@limiter.limit(APPROVE_LIMIT)
@router.post("/approve")
async def approve(request: Request, body: dict = Body(...), user: dict = Depends(verify_token)):
    approval_id = (body or {}).get("approvalId") or ""
    decision = (body or {}).get("decision") or ""
    if not approval_id:
        raise HTTPException(400, "approvalId is required")
    if decision not in ("approve", "reject"):
        raise HTTPException(400, "decision must be 'approve' or 'reject'")

    log.info("[approve] %s -> %s user=%s", approval_id, decision, user["id"])
    return StreamingResponse(service.resume_turn(approval_id, decision, user["token"], user),
                             headers=_evt_headers())


app.include_router(router, prefix="/api/v1/agent")

import tutor  # noqa: E402
tutor.mount_tutor(app)
