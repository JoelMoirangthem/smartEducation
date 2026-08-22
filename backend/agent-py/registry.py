"""
Tool registry: native Python tools declared with @agent_tool metadata.
severity drives the approval policy (read = instant, write/destructive = interrupt).
roles restricts by user role (None = any authenticated role).
"""

import json
import logging
from dataclasses import dataclass
from typing import Awaitable, Callable

from auth import UserCtx

log = logging.getLogger("agent.registry")


@dataclass
class ToolSpec:
    name: str
    label: str
    description: str
    severity: str  # read | write | destructive
    roles: list[str] | None
    domain: str
    fn: Callable[..., Awaitable[dict]]
    # Optional async (params) -> str; computes server-side facts (e.g. how many
    # documents a filter matches) shown on the approval card before the decision.
    preview: Callable[[dict], Awaitable[str]] | None = None


REGISTRY: dict[str, ToolSpec] = {}


def agent_tool(*, name: str, label: str, description: str,
               severity: str = "read", roles: list[str] | None = None,
               domain: str = "general",
               preview: Callable[[dict], Awaitable[str]] | None = None):
    """Register an async function as an agent tool.

    fn(**kwargs) -> {"ok": bool, "summary": str, "data": ..., "error": ...}
    """
    def deco(fn):
        if name in REGISTRY:
            raise ValueError(f"duplicate tool name: {name}")
        REGISTRY[name] = ToolSpec(name=name, label=label, description=description,
                                  severity=severity, roles=roles, domain=domain, fn=fn,
                                  preview=preview)
        fn._tool_spec = REGISTRY[name]
        return fn
    return deco


def has_role(ctx: UserCtx, roles: list[str] | None) -> bool:
    return not roles or ctx.role in roles


def _format_result(name: str, result: dict) -> str:
    payload = {
        "ok": result.get("ok", False),
        "summary": result.get("summary", ""),
        "error": result.get("error"),
        "data": result.get("data"),
    }
    text = json.dumps(payload, ensure_ascii=False, default=str)
    return text if len(text) <= 8000 else text[:8000] + "…"


async def run_tool(spec: ToolSpec, params: dict) -> dict:
    try:
        return await spec.fn(**params)
    except Exception as e:
        log.exception("tool %s failed", spec.name)
        return {"ok": False, "summary": f"{spec.label} failed: {e}", "error": str(e)}
