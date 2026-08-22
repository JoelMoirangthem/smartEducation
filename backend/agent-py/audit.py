"""Audit trail — writes the same agentactionlogs documents the Node bridge did."""

import re
from datetime import datetime, timezone

import db as database

_SENSITIVE = re.compile(r"password|token|secret|authorization", re.I)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def sanitize_args(args: dict | None) -> dict:
    out = {}
    for key, value in (args or {}).items():
        if _SENSITIVE.search(key):
            continue
        if isinstance(value, str) and len(value) > 300:
            out[key] = value[:300] + "…"
        else:
            out[key] = value
    return out


async def log_action(user, tool: str, severity: str, args: dict,
                     status: str, summary: str = "", session_id: str = "", ip: str = ""):
    try:
        # user may be a UserCtx dataclass or a plain dict
        uid = user.get("id") if hasattr(user, "get") else getattr(user, "id", None)
        now = _now()
        await database.agentactionlogs().insert_one({
            "userId": database.oid(uid),
            "tool": tool,
            "severity": severity,
            "args": sanitize_args(args),
            "status": status,
            "summary": str(summary or "")[:500],
            **({"sessionId": session_id} if session_id else {}),
            "ip": ip or "",
            # Motor bypasses Mongoose timestamps — set them explicitly
            "createdAt": now,
            "updatedAt": now,
        })
    except Exception:
        import logging
        logging.getLogger("agent.audit").exception("audit log write failed")
