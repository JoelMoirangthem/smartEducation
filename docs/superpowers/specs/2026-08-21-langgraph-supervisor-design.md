# LangGraph Supervisor Agent — Design

**Date:** 2026-08-21
**Status:** Implemented
**Supersedes:** `2026-08-21-agentic-ai-design.md` (hand-rolled loop, `[EVT]` chunked protocol)

## Motivation

The previous agent (`src/agent/engine.js`) was a hand-rolled function-calling loop on the OpenAI SDK pointed at Sarvam AI. It worked (37 tools, approvals, `[EVT]` line protocol) but had no real structure: a single system prompt handled every domain, no intent parsing, no specialization, and token-level streaming was impossible. This design replaces the engine with a **LangGraph supervisor + subagent architecture**, an **SSE wire protocol**, and a **rebuild of the agent UI** in `Chat.jsx`.

## Decisions (confirmed with stakeholder)

1. Full redesign — engine, wire protocol, and agent UI all replaced. Routes remain (`/v1/agent/chat`, `/approve`, `/actions`, `/health`); the 37 controller-backed tools are preserved and redistributed.
2. Subagents split **by domain** (Academic Ops / Admin / Communication / Helper / General).
3. **SSE over a single `POST /agent/chat`** (OpenAI-compatible `event:`/`data:` framing), consumed via `fetch` + `ReadableStream` reader.

## Graph architecture

```
SUPERVISOR
  ├─ Node 1: intent_parse — LLM with_structured_output (Zod schema):
  │    { intent, subagent, reasoning }  → emits `intent` SSE event
  │    parse failure / non-tool intent  → routes to General agent
  ├─ Node 2: route — conditional edge to the chosen subagent node
  ├─ subagent nodes (5× ReAct agents via create_react_agent):
  │    academic_ops, admin, communication, helper, general
  └─ Node 3: refine — lite LLM pass that polishes the subagent answer
       into the final `answer` event
```

### Subagents & tool distribution (from toolRegistry.js `domain` field)

| Subagent | Tools |
|---|---|
| **academic_ops** | `start_attendance`, `end_attendance`, `mark_my_attendance`, `add_mark`, `update_mark`, `attendance_summary`, `session_stats` |
| **admin** | `create_class`, `create_subject`, `update_subject`, `delete_class`, `delete_subject`, `create_academic_year`, `create_user`, `update_user_academic`, `list_users`, `list_classes`, `list_subjects`, `list_students`, `system_stats` |
| **communication** | `create_notice`, `update_notice`, `delete_notice`, `upload_note`, `list_notes`, `list_notices`, `create_notification`, `my_notifications` |
| **helper** | `get_profile`, `list_my_marks`, `update_profile`, `get_my_classes`, `academic_years`, `face_status`, `face_service_health` |
| **general** | none (conversational fallback: small talk, explanations) |

Subagent system prompts define domain behavior; the root system context (role, platform rules, read-vs-approval policy, no-inventing-IDs, user-language replies) is **shared** across subagents via a common `baseSystemPrompt`.

Tools remain wrapped by `adapter.js` (controller-as-tool, logged-in user session, 15 s timeout), so **all existing permission checks still apply**; the supervisor route never bypasses them.

## Human-in-the-loop (native interrupts)

- Write/destructive tools call `interrupt()` inside the subagent node with `{ tool, label, severity, preview, args }` → the graph pauses at that node; the turn stream emits an `approval` event and ends the HTTP connection.
- `POST /agent/approve { approvalId, decision }` resumes the thread with `Command(resume=...)`: `approve` → the tool executes; `reject` → a `USER_REJECTED` tool message is injected and the subagent continues.
- Checkpointer: in-memory `MemorySaver`-compatible store with **15-minute TTL** (`thread_id` = turnId). Multiple approvals per turn supported. State does not survive restarts (same guarantee as the old in-memory TurnStore).

## SSE wire protocol

`POST /api/v1/agent/chat` → `text/event-stream`; single event per line, `id` incrementing. Data JSON (snake-free, camelCase):

| event | data | emitted by |
|---|---|---|
| `intent` | `{ subagent, intent, reasoning }` | supervisor intent_parse |
| `agent` | `{ subagent, status: start\|done }` | graph node hooks |
| `tool` | `{ name, label, status: start\|ok\|error\|denied\|rejected, summary }` | `get_stream_writer()` custom events in subagent nodes |
| `token` | `{ text }` | `on_chat_model_stream` filtered to provider streaming (best effort — skipped when provider doesn't stream) |
| `approval` | `{ approvalId, tool, label, severity, preview, args }` | interrupt handler |
| `answer` | `{ text }` | refine node |
| `done` | `{ sessionId }` | stream end |
| `error` | `{ message }` | global error handler |

Heartbeats (`event: ping`) every 15 s to keep proxies from closing idle streams.

## Frontend (`Chat.jsx` agent mode)

- SSE consumer: `fetch` + `res.body.getReader()`, LineDecoder, parse `event:`/`data:` frames.
- New supervisor visualization:
  - Intent chip ("Intent: …" + "→ Admin Agent" routing badge)
  - Per-agent activity trail (subagent-colored step feed with live status dots)
- Token-typewriter message bubble (existing queue reused), approval cards (existing UX, severity-colored), session sidebar unchanged.
- Tutor mode untouched.

## Backend file map

- **New:** `src/agent/graph/state.js`, `src/agent/graph/supervisor.js`, `src/agent/graph/nodes.js`, `src/agent/graph/prompts.js`, `src/agent/graph/subagents/*.js` (×5), `src/services/sse.js`
- **Replaced:** `src/agent/engine.js` → LangGraph runner (`runStream`), `src/agent/approvals.js` → TTL checkpointer store
- **Modified:** `src/agent/llm.js` (LangChain clients), `src/agent/toolRegistry.js` (+`domain`), `src/routes/agent.routes.js` (SSE), `.env.example` (no new vars required)

## Error handling & limits

- `recursion_limit` = `AGENT_MAX_STEPS` (12) per subagent run; supervisor has its own small budget.
- Provider timeout 90 s; whole-turn timeout `AGENT_TIMEOUT_MS`.
- Rate limits unchanged: 20 chat/min, 60 approve/min.
- Audit (`AgentActionLog`) unchanged; password scrubber reused.

## Testing

- `scripts/dev/agent_smoke.js` extended: assert `intent` event arrives, `agent` start/done frames for the routed subagent, `tool` frames, and `done` frame; approval interrupt/resume flow via `/approve`; rejected approval path; role-denial path.
- Frontend: `npm run build`.