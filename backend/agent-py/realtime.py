"""
Realtime side-effects for agent-made writes.

socket.io clients cannot target rooms (that is a server-only capability), so
the Python service relays room-targeted emits through a minimal authenticated
relay endpoint on the Express server (`POST /api/v1/internal/emit`). This is
pure transport plumbing — no agent/LLM/tool logic lives in Node.
"""

import logging

import httpx

import config

log = logging.getLogger("agent.realtime")

RELAY_TIMEOUT = 5.0

# One shared client: per-emit clients would churn connections on every write.
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=RELAY_TIMEOUT)
    return _client


async def emit(event: str, payload: dict, room: str | None = None, broadcast: bool = False):
    """Emit `event` to a room ('user:<id>', 'class:<id>', 'role:<role>') or
    globally when broadcast=True. Best-effort — never raises."""
    try:
        await _get_client().post(
            f"{config.NODE_API_URL}/api/v1/internal/emit",
            json={"event": event, "payload": payload, "room": room, "broadcast": broadcast},
            headers={"x-agent-relay-key": config.AGENT_RELAY_SECRET},
        )
    except Exception as e:
        log.warning("realtime emit %s failed (live push skipped): %s", event, e)
