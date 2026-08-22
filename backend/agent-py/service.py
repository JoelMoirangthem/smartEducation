"""
Turn orchestration: turn store, [EVT] wire protocol, streaming from the
deepagents graph, approval pause/resume, and ChatSession persistence.

Wire protocol (one JSON object per line, prefixed "[EVT] "):
  metadata / intent / agent_start|done / tool_start / tool_result /
  token / approval / session / answer / done / error
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from langgraph.types import Command

import approval
import config
import core
import db as database
import llm
from auth import UserCtx
from registry import REGISTRY

log = logging.getLogger("agent.service")

DOMAIN_LABELS = {
    "academic_ops": "Academic Ops",
    "admin": "Admin",
    "communication": "Communication",
    "helper": "Helper",
    "general": "General",
    "finance": "Finance & Fees",
    "operations": "School Operations",
}

TURNS: dict[str, dict] = {}
TURN_STEPS: dict[str, list] = {}
TURN_CREATED: dict[str, float] = {}

_BG_TASKS: list[asyncio.Task] = []


def new_turn_id() -> str:
    return uuid.uuid4().hex


def start_turn(ctx: dict) -> str:
    turn_id = new_turn_id()
    TURNS[turn_id] = {"created": time.time(), **ctx}
    TURN_CREATED[turn_id] = time.time()
    TURN_STEPS[turn_id] = []
    return turn_id


def finish_turn(turn_id: str):
    TURNS.pop(turn_id, None)
    TURN_STEPS.pop(turn_id, None)
    approval.sweep_expired(set(TURNS.keys()))


def get_turn_ctx(turn_id: str) -> dict | None:
    return TURNS.get(turn_id)


async def _ttl_sweeper():
    while True:
        await asyncio.sleep(60)
        now = time.time()
        for turn_id in list(TURNS):
            if now - TURN_CREATED.get(turn_id, now) > config.APPROVAL_TTL:
                log.info("turn %s expired by TTL", turn_id)
                finish_turn(turn_id)  # also sweeps expired approvals
        _sweep_checkpoints(now)


def _sweep_checkpoints(now: float):
    """Drop MemorySaver threads for finished turns past the approval TTL."""
    checkpointer = core.get_checkpointer()
    for turn_id in list(TURN_CREATED):
        if turn_id in TURNS:
            continue
        if now - TURN_CREATED[turn_id] <= config.APPROVAL_TTL:
            continue
        try:
            checkpointer.delete_thread(turn_id)
        except Exception as e:
            log.warning("checkpoint cleanup failed for %s: %s", turn_id, e)
        TURN_CREATED.pop(turn_id, None)


def start_background_tasks():
    _BG_TASKS.append(asyncio.create_task(_ttl_sweeper()))


# ── [EVT] protocol ───────────────────────────────────────────────────────────

def _evt(type_: str, **data) -> str:
    return "[EVT] " + json.dumps({"type": type_, **data}, ensure_ascii=False, default=str) + "\n"


def _history_messages(history: list) -> list:
    msgs = []
    for m in history or []:
        text = ""
        if isinstance(m.get("content"), str):
            text = m["content"]
        elif isinstance(m.get("parts"), list):
            text = "".join(p.get("text", "") for p in m["parts"] if isinstance(p, dict))
        text = text.strip()[:8000]
        if not text:
            continue
        role = "assistant" if m.get("role") in ("model", "assistant") else "user"
        msgs.append({"role": role, "content": text})
    return msgs[-20:]


def _unwrap_tool_output(raw) -> tuple[str, dict | None]:
    """ToolNode wraps results in a ToolMessage; unwrap .content first."""
    content = getattr(raw, "content", None)
    if isinstance(content, str):
        text = content
    elif content is not None:
        try:
            text = json.dumps(content, ensure_ascii=False, default=str)
        except Exception:
            text = str(content)
    else:
        text = str(raw or "")
    parsed = None
    try:
        parsed = json.loads(text)
    except Exception:
        pass
    return text, (parsed if isinstance(parsed, dict) else None)


async def _persist_session(ctx: dict, answer: str, steps: list) -> str:
    """Upsert the agent ChatSession; returns the session id."""
    col = database.chatsessions()
    now = datetime.now(timezone.utc)
    user_oid = database.oid(ctx.get("userId"))
    user_msg = {"role": "user", "content": ctx["message"], "timestamp": now}
    model_msg: dict = {"role": "model", "content": answer, "timestamp": now}
    if steps:
        model_msg["meta"] = {
            "intent": ctx.get("intent", ""),
            "subagent": ctx.get("subagent", ""),
            "reasoning": "",
            "steps": [{"name": s["name"], "label": s["label"], "status": s["status"],
                       "duration": s["duration"], "detail": s["detail"]} for s in steps],
        }

    sid = database.oid(ctx.get("sessionId") or "")
    if sid and await col.count_documents({"_id": sid, "user": user_oid}):
        await col.update_one(
            {"_id": sid},
            {"$push": {"messages": {"$each": [user_msg, model_msg], "$slice": -100}},
             "$set": {"updatedAt": now}},
        )
        return str(sid)

    title = ctx["message"][:37] + ("..." if len(ctx["message"]) > 40 else "")
    res = await col.insert_one({
        "user": user_oid, "title": title, "mode": "agent",
        "messages": [user_msg, model_msg], "createdAt": now, "updatedAt": now,
    })
    return str(res.inserted_id)


async def run_turn(agent_input, turn_id: str) -> AsyncGenerator[str, None]:
    """
    Streams one turn (fresh input or Command(resume=...) after /approve)
    as [EVT] lines. Shared by /chat and /approve.
    """
    from tools.common import set_turn_ctx

    sse_ctx = get_turn_ctx(turn_id)
    if not sse_ctx:
        yield _evt("error", message="Turn expired. Please re-send your request.")
        yield _evt("done")
        return

    user = UserCtx({"id": sse_ctx["userId"], "role": sse_ctx.get("role", "student"),
                    "name": sse_ctx.get("name", ""), "token": sse_ctx.get("token", "")})
    set_turn_ctx(user)

    steps = TURN_STEPS.setdefault(turn_id, [])
    intent_sent = False

    def _intent_for(tool_name: str) -> dict:
        spec = REGISTRY.get(tool_name)
        domain = spec.domain if spec else "general"
        return {"subagent": domain, "label": DOMAIN_LABELS.get(domain, domain),
                "intent": sse_ctx["message"][:200], "reasoning": ""}

    yield _evt("metadata", turnId=turn_id, message=sse_ctx["message"],
               sessionId=sse_ctx.get("sessionId") or "")
    yield _evt("agent_start", subagent="main", label="EduSmart Agent")

    import asyncio
    provider = llm.primary_provider()
    side_effects = False      # a write/destructive tool completed → never auto-retry
    dead_providers = set()    # providers that failed THIS turn — never retried
    config_ = None

    while True:  # provider attempts (failover on billing/auth stalls)
        config_ = {
            "configurable": {"thread_id": turn_id},
            "recursion_limit": config.MAX_STEPS + 8,
        }
        try:
            # Watchdog: cap the gap between ANY two graph events. A stalled LLM
            # stream (provider sends headers then goes silent) otherwise hangs the
            # turn — and the UI spinner — forever.
            agent = core.build_agent(user, turn_id, provider=provider)
            aiter = agent.astream_events(agent_input, config=config_, version="v2")
            while True:
                try:
                    evt = await asyncio.wait_for(aiter.__anext__(), timeout=config.MODEL_TIMEOUT)
                except StopAsyncIteration:
                    break
                except asyncio.TimeoutError:
                    raise RuntimeError(f"provider stalled: no event for {int(config.MODEL_TIMEOUT)}s")
                kind = evt.get("event", "")

                if kind == "on_chat_model_stream":
                    chunk = evt["data"].get("chunk")
                    text = ""
                    if chunk is not None:
                        content = getattr(chunk, "content", None)
                        if isinstance(content, str):
                            text = content
                        elif isinstance(content, list):
                            text = "".join(
                                part.get("text", "") if isinstance(part, dict) else str(part)
                                for part in content
                            )
                    if text:
                        yield _evt("token", text=text)
                    continue

                if kind == "on_tool_start":
                    name = evt.get("name", "")
                    spec = REGISTRY.get(name)
                    label = spec.label if spec else name
                    # Approval resume replays the interrupted node — don't double-count.
                    already = any(s["name"] == name and s["status"] == "running" for s in steps)
                    if not already:
                        steps.append({"name": name, "label": label, "status": "running",
                                      "startedAt": time.time(), "duration": 0, "detail": ""})
                    if not intent_sent:
                        intent_sent = True
                        info = _intent_for(name)
                        sse_ctx["subagent"] = info["subagent"]
                        sse_ctx["intent"] = info["intent"]
                        yield _evt("intent", **info)
                    yield _evt("tool_start", tool=name, label=label)
                    continue

                if kind == "on_tool_end":
                    name = evt.get("name", "")
                    spec = REGISTRY.get(name)
                    label = spec.label if spec else name
                    text, parsed = _unwrap_tool_output(evt.get("data", {}).get("output"))

                    rejected = text.startswith("USER_REJECTED")
                    denied = text.startswith("PERMISSION DENIED")
                    summary = (parsed or {}).get("summary", "") if parsed else text[:300]
                    ok_flag = bool((parsed or {}).get("ok")) if parsed else not rejected and not denied

                    for i in range(len(steps) - 1, -1, -1):
                        if steps[i]["name"] == name and steps[i]["status"] == "running":
                            steps[i].update({
                                "status": "rejected" if rejected else ("denied" if denied else ("ok" if ok_flag else "error")),
                                "detail": summary,
                                "duration": int((time.time() - steps[i]["startedAt"]) * 1000),
                            })
                            break

                    payload = {"tool": name, "label": label, "ok": ok_flag,
                               "summary": summary or ("Action rejected by user" if rejected else "")}
                    if rejected:
                        payload.update(status="rejected", rejected=True)
                    elif denied:
                        payload.update(status="denied")
                    elif parsed and parsed.get("error"):
                        payload["error"] = parsed.get("error")
                    yield _evt("tool_result", **payload)
                    if spec and spec.severity != "read":
                        side_effects = True   # no provider failover past this point
                    continue

        except Exception as e:
            # Mid-turn provider death (out of credits / auth / stall): switch to
            # the other configured provider and restart the turn cleanly — but
            # ONLY if nothing has been written yet, and never back into a
            # provider that already failed this turn.
            alt = llm.other_provider(provider) if provider else None
            retryable = llm.provider_dead(e)
            if retryable and provider:
                dead_providers.add(provider)
                if alt in dead_providers:
                    alt = None
            if not side_effects and alt and retryable:
                log.warning("provider '%s' dead (%.120s) — failing over to '%s'",
                            provider, str(e), alt)
                provider = alt
                steps.clear()
                intent_sent = False
                sse_ctx.pop("subagent", None)
                yield _evt("token", text="[AI provider switched — retrying…]\n\n")
                continue
            import traceback
            log.error("stream error: %s\n%s", e, traceback.format_exc())
            friendly = ("The AI provider is out of credits or unauthorized — "
                        "check billing / API keys." if llm.provider_dead(e) else None)
            yield _evt("error", message=(friendly or str(e))[:500])
            yield _evt("answer", text=friendly or "Sorry, something went wrong while handling that request.")
            yield _evt("done")
            finish_turn(turn_id)
            return
        break  # stream finished cleanly with this provider

    # ── End state: paused (approval pending) vs finished ──
    state = await agent.aget_state(config_)
    if state.next:  # non-empty → paused waiting for approval
        pending = approval.get_pending(turn_id)
        if pending:
            yield _evt("approval", approvalId=pending["approval_id"], tool=pending["tool"],
                       label=pending["label"], severity=pending["severity"],
                       preview=pending["preview"], args=pending["args"])
        return  # keep the turn thread alive for /approve

    # ── Finished: final answer from the last AI message ──
    answer = ""
    messages = (state.values or {}).get("messages", [])
    for message in reversed(messages):
        if getattr(message, "type", None) == "ai" or getattr(message, "role", None) == "ai":
            content = message.content
            if isinstance(content, str):
                answer = content
            elif isinstance(content, list):
                answer = "".join(part.get("text", "") if isinstance(part, dict) else str(part)
                                 for part in content)
            break
    if not answer:
        answer = "Sorry, I could not produce an answer. Please rephrase your request."

    session_id = ""
    try:
        session_id = await _persist_session(sse_ctx, answer, steps)
    except Exception as e:
        log.warning("ChatSession persist failed: %s", e)

    if session_id:
        yield _evt("session", id=session_id)
    yield _evt("agent_done", subagent=sse_ctx.get("subagent") or "main",
               label=DOMAIN_LABELS.get(sse_ctx.get("subagent") or "", "General"))
    yield _evt("answer", text=answer, meta={
        "intent": sse_ctx.get("intent", ""),
        "subagent": sse_ctx.get("subagent", ""),
        "reasoning": "",
        "steps": [{k: v for k, v in s.items() if k != "startedAt"} for s in steps],
    } if (sse_ctx.get("subagent") or steps) else None)
    yield _evt("done")
    finish_turn(turn_id)


async def stream_chat(message: str, history: list, session_id: str, turn_id: str) -> AsyncGenerator[str, None]:
    ctx = get_turn_ctx(turn_id)
    if ctx is None:
        yield _evt("error", message="Turn expired.")
        return
    payload = {"messages": _history_messages(history) + [{"role": "user", "content": message}]}
    async for line in run_turn(payload, turn_id):
        yield line


async def resume_turn(approval_id: str, decision: str, token: str, user: dict) -> AsyncGenerator[str, None]:
    """Resumes an interrupted turn via Command(resume=...) on the approval thread."""
    ap = approval.get_approval(approval_id)
    if not ap:
        yield _evt("error", message="Approval expired. Please re-send your request.")
        yield _evt("done")
        return
    turn_id = ap["turn_id"]
    ctx = get_turn_ctx(turn_id)
    if not ctx:
        approval.resolve_approval(approval_id, turn_id)
        yield _evt("error", message="Turn expired. Please re-send your request.")
        yield _evt("done")
        return

    # Ownership check — only the requesting user may decide.
    if str(user.get("id", "")) != str(ctx.get("userId", "")):
        yield _evt("error", message="Not authorized for this approval.")
        yield _evt("done")
        return

    ctx["token"] = token

    # Batched tool calls (e.g. "delete all students") stack MULTIPLE pending
    # interrupts on the thread. LangGraph then requires resume values keyed
    # by interrupt id — a scalar resume raises RuntimeError. Apply the user's
    # single decision to every pending interrupt of this turn.
    user_ctx = UserCtx({"id": user.get("id", ""), "role": user.get("role", "student"),
                        "name": user.get("name", ""), "token": token})
    agent = core.build_agent(user_ctx, turn_id)
    config_ = {
        "configurable": {"thread_id": turn_id},
        "recursion_limit": config.MAX_STEPS + 8,
    }
    try:
        state = await agent.aget_state(config_)
        interrupt_ids = [
            intr.id
            for task in (state.tasks or [])
            for intr in (getattr(task, "interrupts", None) or [])
        ]
    except Exception as e:
        log.warning("interrupt state probe failed: %s", e)
        interrupt_ids = []

    if len(interrupt_ids) > 1:
        log.info("resume %s: %d stacked interrupts -> batch decision", approval_id, len(interrupt_ids))
        command = Command(resume={iid: {"decision": decision} for iid in interrupt_ids})
    else:
        command = Command(resume={"decision": decision})

    async for line in run_turn(command, turn_id):
        yield line
