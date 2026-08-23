"""
AI Tutor: streaming chat at /api/v1/ai/chat (moved off Node).

Raw text chunk passthrough (text/plain) ending with "\n\n[SESSION_ID:<id>]"
on first save — exactly what the Node handler emitted, so the frontend tutor
parser stays compatible.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

import config
import db as database
from auth import verify_token
from ratelimit import limiter, CHAT_LIMIT

log = logging.getLogger("agent.tutor")

MAX_MESSAGE_CHARS = 8000   # per-message cap — bounds token cost per request
MAX_HISTORY_MESSAGES = 20

SYS_PROMPT = ("You are EduSmart AI, a helpful, concise, and professional academic "
              "assistant for students and teachers in an education platform.")


def _providers() -> list[tuple[str, AsyncOpenAI, str, int]]:
    out = []
    if config.AGENTROUTER_API_KEY:
        out.append(("AgentRouter", AsyncOpenAI(base_url=config.AGENTROUTER_BASE_URL,
                                               api_key=config.AGENTROUTER_API_KEY,
                                               timeout=config.MODEL_TIMEOUT,
                                               default_headers={"User-Agent": config.AGENTROUTER_UA}),
                    config.AGENTROUTER_MODEL, 8192))
    if config.SARVAM_API_KEY:
        out.append(("Sarvam", AsyncOpenAI(base_url=config.SARVAM_BASE_URL,
                                          api_key=config.SARVAM_API_KEY,
                                          timeout=config.MODEL_TIMEOUT),
                    config.ASSISTANT_MODEL, 4096))
    if config.NVIDIA_API_KEY:
        out.append(("NVIDIA", AsyncOpenAI(base_url=config.NVIDIA_BASE_URL,
                                          api_key=config.NVIDIA_API_KEY,
                                          timeout=config.MODEL_TIMEOUT),
                    config.NVIDIA_MODEL, 8192))
    return out


def _history_messages(history: list) -> list[dict]:
    msgs = []
    for m in history or []:
        content = ""
        if isinstance(m.get("parts"), list):
            content = m["parts"][0].get("text", "") if m["parts"] else ""
        elif isinstance(m.get("content"), str):
            content = m["content"]
        content = (content or "")[:MAX_MESSAGE_CHARS]
        if not content:
            continue
        role = "assistant" if m.get("role") == "model" else "user"
        msgs.append({"role": role, "content": content})
    return msgs[-MAX_HISTORY_MESSAGES:]


async def _persist(user: dict, message: str, answer: str, session_id: str) -> str:
    col = database.chatsessions()

    now = datetime.now(timezone.utc)
    user_oid = database.oid(user["id"])
    user_msg = {"role": "user", "content": message, "timestamp": now}
    model_msg = {"role": "model", "content": answer, "timestamp": now}

    sid = database.oid(session_id or "")
    if sid and await col.count_documents({"_id": sid, "user": user_oid}):
        await col.update_one(
            {"_id": sid},
            {"$push": {"messages": {"$each": [user_msg, model_msg], "$slice": -100}},
             "$set": {"updatedAt": now}},
        )
        return str(sid)

    title = message[:37] + ("..." if len(message) > 40 else "")
    res = await col.insert_one({
        "user": user_oid, "title": title, "mode": "tutor",
        "messages": [user_msg, model_msg], "createdAt": now, "updatedAt": now,
    })
    return str(res.inserted_id)


router = APIRouter()


@router.post("/chat")
@limiter.limit(CHAT_LIMIT)
async def tutor_chat(request: Request, body: dict = Body(...), user: dict = Depends(verify_token)):
    message = str((body or {}).get("message") or "").strip()
    if not message:
        raise HTTPException(400, "Message is required")
    message = message[:MAX_MESSAGE_CHARS]
    history = _history_messages((body or {}).get("history") or [])
    session_id = str((body or {}).get("sessionId") or "")

    async def stream():
        accumulated = ""
        try:
            for name, client, model, max_tokens in _providers():
                try:
                    stream_obj = await client.chat.completions.create(
                        model=model,
                        messages=[{"role": "system", "content": SYS_PROMPT},
                                  *history,
                                  {"role": "user", "content": message}],
                        temperature=0.6,
                        top_p=0.7,
                        max_tokens=max_tokens,
                        stream=True,
                    )
                    async for chunk in stream_obj:
                        text = chunk.choices[0].delta.content if chunk.choices else None
                        if text:
                            accumulated += text
                            yield text
                    break
                except Exception as e:
                    log.warning("%s streaming error: %s", name, e)
                    continue
        except Exception as e:
            log.error("tutor stream error: %s", e)

        if not accumulated.strip():
            accumulated = ("I'm currently unable to reach the AI assistant service. "
                           "Please try again shortly. Meanwhile, you can still use attendance, "
                           "marks, and notes.")
            yield accumulated

        new_sid = ""
        try:
            new_sid = await _persist(user, message, accumulated, session_id)
        except Exception as e:
            log.error("Session save error: %s", e)
        if new_sid and not session_id:
            yield f"\n\n[SESSION_ID:{new_sid}]"

    return StreamingResponse(stream(), media_type="text/plain; charset=utf-8",
                             headers={"Cache-Control": "no-cache, no-transform",
                                      "X-Accel-Buffering": "no"})


def mount_tutor(app: FastAPI):
    app.include_router(router, prefix="/api/v1/ai")
