"""
deepagents assembly: one flat deep agent owning every role-permitted native tool.

Why flat instead of domain subagents: deepagents nests subagents as separate
compiled graphs invoked inside the `task` tool. Pausing on interrupt() works,
but RESUMING an interrupt raised below the nesting boundary trips a routing
bug in the current langgraph release (KeyError 'model' while replaying the
nested branch). Approvals are load-bearing, so we keep every tool at a single
graph level — the proven interrupt/resume pattern — and convey domain structure
through the system prompt instead. Revisit when langgraph fixes nested resume.
"""

import logging
from typing import Any

from langchain_core.tools import StructuredTool
from langgraph.checkpoint.memory import InMemorySaver

import audit
import config
import llm
from auth import UserCtx
from registry import REGISTRY, ToolSpec, has_role, run_tool, _format_result

log = logging.getLogger("agent.core")

_CHECKPOINTER: InMemorySaver | None = None


def get_checkpointer() -> InMemorySaver:
    global _CHECKPOINTER
    if _CHECKPOINTER is None:
        _CHECKPOINTER = InMemorySaver()
    return _CHECKPOINTER


DOMAIN_GUIDE = """Domain cheat-sheet (use whichever tools fit the request):
- academic_ops: attendance sessions, marks entry/updates, timetable, exams, notes upload
- admin: users, classes, subjects, academic years, system stats
- communication: notices, notifications, events
- finance: fees, payments, fee statistics
- operations: library, transport routes, inventory, leave requests
- helper: own profile, face registration status, upcoming exams"""


def _system_prompt(role: str, name: str) -> str:
    return f"""You are EduSmart Agent, the hands-on operations assistant of an education platform.
Current authenticated user: {name or "user"} (role: {role}).

MISSION
Complete real actions on the platform using your tools, then report clearly what you did.
You can read data instantly and request changes — writes surface an approval card to the user.
Nothing is hardcoded: you resolve every request yourself — parse the intention,
look up what it refers to, then compose the tool call or database command that fits.

RULES
1. UNDERSTAND BEFORE ACTING — resolve references with real queries, never guesses:
   • Ordinals/positions: "delete the first 2 classes" → run list_classes FIRST,
     take results[0] and results[1], then delete THOSE exact ids.
   • Pronouns/demonstratives: "that class", "this subject" → the entity from the
     immediately preceding context or a fresh lookup — confirm its id before acting.
   • Filters: "students who have no class", "teachers hired before March" → you
     write the matching query yourself.
2. SCOPE DISCIPLINE — never conflate scopes: "students IN class X" is not
   "students IN THE SYSTEM". If a filtered query returns 0 rows, re-check
   globally before claiming the entities do not exist. Report which scope each
   number refers to.
3. NEVER invent or guess IDs, names, counts or outcomes. Every id comes from a
   lookup; every number you state comes from THIS turn's tool_result.
   Copy identifiers VERBATIM — emails, names, codes must appear exactly as the
   tool returned them. Never expand ("Aarav" → never become "Aarav Sharma"),
   abbreviate, or "correct" data you received.
4. NEVER ask the user to confirm an action in chat text and never wait for a "yes".
   Calling a write/destructive tool is itself what pops the permission card on the
   user's screen — that card is the confirmation step. Once you know which tool fits,
   call it immediately. If it comes back rejected, acknowledge briefly and move on.
5. MULTIPLE TARGETS = ONE COMMAND, NOT A LOOP. You have direct database tools
   (admin-only): db_find, db_insert and db_modify (update_one/many, delete_one/many).
   Translate the user's intention INTO THE QUERY YOURSELF: pick the collection,
   write the filter/update JSON (e.g. users with role "student" AND classId null),
   then execute once. db_modify's approval card shows your exact command plus a
   live count of matched documents. Prefer a domain tool when one fits exactly;
   otherwise compose the command. Never loop single-item tools over many targets.
6. For destructive actions run ONE write/destructive call per LLM step so each
   gets its own approval card. Never batch two different write calls into one step.
7. REPORT ONLY VERIFIED STATE. Any count/stat/number you give must come from a
   read tool executed in THIS turn — never reuse numbers remembered from earlier
   turns or history. Claim success ONLY when THIS turn's tool_result was ok, and
   quote its exact summary. If results look inconsistent, re-read before answering.
8. NOTICES / EVENTS / NOTIFICATIONS: you are the copywriter. Compose polished,
   structured content (clear title; greeting; short body paragraphs or bullet
   points; closing line with issuer and date) and put the FULL formatted text
   into the content/message argument. The approval card displays it verbatim,
   so the user reviews exactly what will be published before approving.
   WHEN CORRECTING A FACT (time, date, venue, name): that fact usually appears
   in BOTH the title and the content — update EVERY affected field in the SAME
   call, and after the tool returns, verify from its echoed final values that
   nothing stale remains (e.g. an old time still in the headline).
9. Scope is enforced per role. If a tool you need is missing, the user's role lacks permission;
   say so instead of attempting workarounds.
10. Be concise and structured (short markdown, key numbers only). After actions, confirm exactly
    what changed (names, counts, ids where useful).
11. Casual conversation or questions about yourself: answer directly without tools.

{DOMAIN_GUIDE}"""


def _wrap(spec: ToolSpec, ctx: UserCtx, turn_id: str) -> StructuredTool:
    """Wrap one registered tool with role-gating, approval policy and audit."""

    async def _run(**params):
        from approval import write_policy

        if spec.severity != "read":
            result_text = await write_policy(spec, params, ctx, turn_id)
            await audit.log_action(ctx, spec.name, spec.severity, params,
                                   status="rejected" if result_text.startswith("USER_REJECTED") else "ok",
                                   summary="approval flow")
            return result_text

        result = await run_tool(spec, params)
        await audit.log_action(ctx, spec.name, "read", params,
                               status="ok" if result.get("ok") else "error",
                               summary=result.get("summary", ""))
        return _format_result(spec.name, result)

    schema = registry_schema(spec)
    return StructuredTool(name=spec.name,
                          description=f"{spec.label}. {spec.description}",
                          args_schema=schema, coroutine=_run)


_SCHEMA_CACHE: dict[str, Any] = {}


def registry_schema(spec: ToolSpec):
    """Infer the pydantic args schema from the tool's real typed signature.

    Raises on failure: a tool without a proper args schema would repeat the
    LLM-passes-'kwargs' bug, so bad tools must surface at startup, not per turn.
    """
    if spec.name in _SCHEMA_CACHE:
        return _SCHEMA_CACHE[spec.name]

    probe = StructuredTool.from_function(
        coroutine=spec.fn,
        infer_schema=True,
        description=f"{spec.label}. {spec.description}",
    )
    _SCHEMA_CACHE[spec.name] = probe.args_schema
    return probe.args_schema


def _register_harness_profile():
    """Hide deepagents' built-in filesystem/sandbox tools and GP subagent."""
    from deepagents import HarnessProfile, register_harness_profile
    from deepagents.profiles import GeneralPurposeSubagentProfile

    profile = HarnessProfile(
        excluded_tools=frozenset(
            {"ls", "read_file", "write_file", "edit_file", "glob", "grep", "execute"}
        ),
        general_purpose_subagent=GeneralPurposeSubagentProfile(enabled=False),
    )
    # ChatOpenAI-backed models resolve under the "openai" provider key.
    for model_name in {config.AGENT_MODEL, config.NVIDIA_MODEL}:
        register_harness_profile(f"openai:{model_name}", profile)


_register_harness_profile()


def build_agent(ctx: UserCtx, turn_id: str, provider: str | None = None):
    """Assemble the deep agent for one turn (per-role tool set, shared model).

    provider=None → default priority (Sarvam first). A specific provider is
    used for mid-turn failover when the primary dies (quota/auth errors).
    """
    import tools as _registered  # noqa: F401 — imports register every @agent_tool
    from deepagents import create_deep_agent

    if provider:
        model = llm.get_provider_llm(provider, streaming=True, temperature=0.2)
        if model is None:
            raise ValueError(f"provider '{provider}' not configured")
    else:
        model = llm.get_agent_llm(streaming=True, temperature=0.2)

    tools = [_wrap(spec, ctx, turn_id) for spec in REGISTRY.values()
             if has_role(ctx, spec.roles)]
    log.info("turn %s: %d tools for role=%s", turn_id, len(tools), ctx.role)

    return create_deep_agent(
        model=model,
        tools=tools,
        system_prompt=_system_prompt(ctx.role, ctx.name),
        checkpointer=get_checkpointer(),
    )
