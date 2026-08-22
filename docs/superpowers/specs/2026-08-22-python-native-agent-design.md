# Python-Native Agent Platform — Design

**Date:** 2026-08-22
**Status:** Implemented (flat deepagents variant — see Deviations)
**Supersedes:** tool-execution-via-Node design (`2026-08-21-langgraph-supervisor-design.md` §tools, `toolBridge`)

## Goal

All LLM/agent activity runs in the Python service only — no agent logic in Node.js.
Every tool is implemented natively in Python against MongoDB (Motor). The browser
talks to FastAPI directly. Token-by-token streaming is visible in the UI.

## Decisions (user-approved)

1. **Python serves directly** — FastAPI owns `/api/v1/agent/*` and `/api/v1/ai/chat`
   (tutor moves too). Node is completely out of the agent path. PyJWT auth,
   slowapi rate limits.
2. **Python emits sockets** — python-socketio client joins Node's socket server
   (same JWT handshake + room conventions) so agent-made writes still push live.
3. **deepagents library** (0.7.x) replaces the hand-rolled supervisor graph;
   approvals stay via `interrupt()` inside write-tool wrappers.
4. **Full parity + AI tools** — all ~66 existing tools ported natively plus new:
   ai_quiz / ai_explain / ai_analyze, note_upload, exam-score entry, face status/mark.
5. Data layer: **Motor + explicit repo modules** (no ODM).

## Architecture

```
Browser ── vite proxy ──► FastAPI :8000  /api/v1/agent/chat|approve|health   ([EVT] line protocol)
                        /api/v1/ai/chat                                      (plain text + [SESSION_ID:])
                          ├─ deepagents deep_agent (Sarvam, streaming)
                          │    └─ domain subagents → native tools
                          ├─ tools/*.py → repos/*.py → Motor → MongoDB
                          ├─ audit → agentactionlogs          (same collection as before)
                          ├─ persistence → chatsessions (+ meta trail)
                          └─ realtime → python-socketio client → Node :5000 socket server
Browser ── everything else ──► Express :5000 (auth, pages CRUD, uploads serving, socket.io) — unchanged
```

Vite dev proxy: `/api/v1/agent`, `/api/v1/ai` → :8000 listed *before* generic `/api`.
Frontend URLs unchanged. Prod: same two extra proxy rules documented.

## Wire protocol (unchanged)

Agent: text chunked `[EVT] {...}` lines — intent / agent_start|done / tool_start|result /
token / approval / answer(+session via separate evt) / done / error.
Tutor: raw text chunks ending with `[SESSION_ID:<id>]`.

## Python package layout (`backend/agent-py/`)

```
config.py         existing env config + JWT_SECRET + MONGODB_URI
db.py             Motor client + collection helpers
auth.py           PyJWT decode → {id, role, name}; FastAPI dependency
audit.py          AgentActionLog writes (sanitized args)
realtime.py       python-socketio AsyncClient pool; emit(event, room(s), payload)
ratelimit.py      slowapi limits (20/min chat, 60/min approve)
registry.py       @tool decorator: name/label/severity/roles/domain/description/schema
approval.py       interrupt()-based write policy wrapper (port of _policy_write)
repos/<domain>.py explicit query/mutation functions mirroring Mongoose semantics
tools/<domain>.py @tool-decorated functions per registry entry (admin, academic_ops,
                  communication, finance, operations, helper, ai, general)
core.py           deepagents deep_agent assembly (subagents = 7 domains)
service.py        turn store, TTL/checkpoint sweepers, astream_events → [EVT],
                  trail accumulation, ChatSession+meta persistence, resume flow
main.py           FastAPI app: CORS, limits, routes, lifespan
tutor.py          /api/v1/ai/chat SSE passthrough + ChatSession(mode=tutor) persistence
```

## Safety parity

- Role gating per tool before approval; Node-side checks no longer exist for agent
  paths, so repo functions re-validate ownership scopes (student sees own data etc.)
  exactly as controllers did.
- Destructive severity → red confirm cards; reads instant.
- Audit log per action incl. denied/rejected; passwords/tokens scrubbed.
- Turn store TTL 15 min; MemorySaver checkpoint sweeper kept.
- slowapi: chat 20/min, approve 60/min per IP+user.

## Streaming UX

- Every LLM leg streams (parse_intent may stay non-streaming; subagents + refine stream).
- Frontend `ChatPage.jsx`: new `case "token"` appends to a live buffer rendered under
  the activity timeline with a blinking cursor; final `answer` reconciles the buffer.
- Tutor endpoint streams raw chunks; frontend tutor parser already compatible.

## Node deletions

`src/agent/{adapter,toolBridge,toolRegistry,pythonClient}.js`,
`src/routes/agent.routes.js` mount, `/agent/*` route file, ai.controller chat handler
(+ its route), `src/services/sse.js`. Node keeps auth/pages/users/socket/uploads.

## Verification battery (must all pass)

1. Health: provider=sarvam AND matching baseUrl; registry count >0 from native code.
2. Read tool → instant rows w/ duration, correct role-scoped data.
3. Write → approval card → approve → executed + socket event observed + timeline continues.
4. Reject path → `rejected` row, nothing in DB.
5. Role denial (student vs admin tool) before approval stage.
6. Session reload renders persisted meta trail.
7. Token events arrive incrementally (curl shows token frames before answer).
8. Tutor mode regression (streaming + session id).
9. `npm run build` passes; no references to deleted Node agent modules.

## Out of scope

Face video recognition flow (stays student-app), voice, scheduled agents,
multi-agent parallelism, replacing Express page APIs.

## Deviations from the approved design (implementation findings)

1. **Flat deepagents, no domain subagents.** `create_deep_agent` nests
   subagents as separate compiled graphs behind the `task` tool. Pausing on
   `interrupt()` works through the nesting, but RESUMING trips a routing bug
   in the installed langgraph (`KeyError: 'model'` replaying the nested
   branch); deepagents' own `interrupt_on` subagent config never fired at
   all. Approvals are load-bearing, so all 70 tools attach to ONE flat agent
   and domain structure lives in the system prompt + per-tool `domain` meta
   (the UI's intent chip is derived from the first tool executed — zero LLM
   cost). Revisit nested subagents when langgraph fixes nested-interrupt
   resume.
2. **Realtime via relay endpoint.** socket.io clients can't target rooms, so
   Python emits through `POST /api/v1/internal/emit` on Express (shared
   `AGENT_RELAY_SECRET` header) instead of a python-socketio client joining
   Node's server — same room conventions, less protocol surface.
3. **Wire format is `[EVT] {json}` lines end-to-end** (was SSE frames proxied
   by Node). Frontend gained a `token` case: tokens append live; the final
   `answer` event carries authoritative full text and reconciles the buffer
   client-side (only unstreamed suffix is re-typed).
4. **Node keeps `/api/v1/ai/{explain,quiz,analyze}` + sessions CRUD** (note
   ACL logic is controller-bound); only `/ai/chat` moved to Python.
