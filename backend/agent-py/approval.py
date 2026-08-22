"""
Human-in-the-loop policy for write/destructive tools via langgraph interrupt().
Replay-safe: LangGraph re-executes the interrupted node on resume, so the same
approvalId is reused for a given (turn, tool).
"""

import json

from langgraph.types import interrupt

from registry import _format_result, run_tool

_APPROVALS: dict[str, dict] = {}
_PENDING: dict[str, str] = {}


def create_approval(turn_id: str, spec, params: dict, extra_preview: str = "") -> tuple[str, dict]:
    """Create (or dedupe) the pending approval; returns (approvalId, card payload).

    The payload doubles as the interrupt() body and the `approval` wire event,
    so there is exactly one source of truth for the card shown to the user.
    Replay-safe: LangGraph re-executes the interrupted node on resume, so the
    same approvalId/payload is reused for a given (turn, tool).
    """
    existing_id = _PENDING.get(turn_id)
    if existing_id and _APPROVALS.get(existing_id, {}).get("tool") == spec.name:
        return existing_id, _APPROVALS[existing_id]

    approval_id = f"apr_{turn_id[-8:]}_{spec.name}"
    preview = f"{spec.label}: {json.dumps(params, ensure_ascii=False, default=str)[:300]}"
    if extra_preview:
        preview = f"{extra_preview} — {preview}"
    payload = {
        "approval_id": approval_id,
        "turn_id": turn_id,
        "tool": spec.name,
        "label": spec.label,
        "severity": spec.severity,
        "preview": preview[:400],
        "args": params,
    }
    _APPROVALS[approval_id] = payload
    _PENDING[turn_id] = approval_id
    return approval_id, payload


def get_approval(approval_id: str) -> dict | None:
    return _APPROVALS.get(approval_id)


def get_pending(turn_id: str) -> dict | None:
    aid = _PENDING.get(turn_id)
    return _APPROVALS.get(aid) if aid else None


def resolve_approval(approval_id: str, turn_id: str) -> None:
    _PENDING.pop(turn_id, None)
    _APPROVALS.pop(approval_id, None)


def sweep_expired(active_turn_ids: set[str]):
    for aid in list(_APPROVALS):
        if _APPROVALS[aid]["turn_id"] not in active_turn_ids:
            _APPROVALS.pop(aid, None)
    for tid in list(_PENDING):
        if tid not in active_turn_ids:
            _PENDING.pop(tid, None)


async def write_policy(spec, params: dict, ctx, turn_id: str) -> str:
    extra_preview = ""
    if spec.preview:
        try:
            extra_preview = await spec.preview(params) or ""
        except Exception:
            extra_preview = ""
    approval_id, payload = create_approval(turn_id, spec, params, extra_preview)
    decision: dict = interrupt(payload)
    if not decision or decision.get("decision") != "approve":
        resolve_approval(approval_id, turn_id)
        return "USER_REJECTED: The user declined this action. Do not perform it; adjust your plan or ask what they'd like instead."

    resolve_approval(approval_id, turn_id)
    result = await run_tool(spec, params)
    return _format_result(spec.name, result)
