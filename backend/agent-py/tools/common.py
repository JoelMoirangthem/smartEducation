"""Shared helpers for native tools: lookups, scoping, small formatting utils."""

import contextvars
from datetime import datetime, timezone

import db as database

# Per-turn authenticated user context, set by service.py before graph invoke.
# Tools read identity from here — never from LLM-supplied args.
_ctx_var: contextvars.ContextVar = contextvars.ContextVar("agent_user_ctx", default=None)


def set_turn_ctx(ctx) -> None:
    _ctx_var.set(ctx)


def get_ctx():
    return _ctx_var.get()


def me() -> str:
    """Current user's id."""
    ctx = _ctx_var.get()
    return ctx.id if ctx else ""


def my_role() -> str:
    ctx = _ctx_var.get()
    return ctx.role if ctx else "student"


def now() -> datetime:
    return datetime.now(timezone.utc)


async def find_user(uid, projection={"password": 0}) -> dict | None:
    doc = await database.users().find_one({"_id": database.oid(uid)}, projection)
    return database.serialize(doc)


async def join_field(docs: list[dict], coll_name: str, field: str,
                     proj={"password": 0}, as_key: str | None = None) -> list[dict]:
    """Attach populated `<field>_` doc (name/email style projection) to each doc."""
    coll = database.db()[coll_name]
    ids = [d.get(field) for d in docs if d.get(field)]
    idents = list({str(i) for i in ids})
    objs = {str(o["_id"]): o async for o in coll.find({"_id": {"$in": [database.oid(i) for i in idents]}}, proj)}
    as_key = as_key or f"{field}Info"
    for d in docs:
        raw = d.get(field)
        d[as_key] = database.serialize(objs.get(str(raw))) if raw is not None else None
        d.pop(field, None)
    return docs


def ok(summary: str, data=None) -> dict:
    return {"ok": True, "summary": summary, "data": data}


def fail(error: str, summary: str = "", data=None) -> dict:
    return {"ok": False, "summary": summary or error, "error": error, "data": data}


def s(v) -> str:
    return str(v) if v is not None else ""
