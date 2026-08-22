# Agent Platform Fix + Pro UI Rebuild — Design

**Date:** 2026-08-21
**Status:** Implemented & verified (see Verification log at bottom)
**Builds on:** `2026-08-21-langgraph-supervisor-design.md` (Python LangGraph supervisor, SSE protocol)

## Goal

Fix the bugs found in the agent audit, persist each agent turn's activity trail to MongoDB, and rebuild the chat UI as a pro-grade agentic workspace with its own visual identity. The working SSE wire protocol is unchanged.

## Decisions (user-approved)

1. Approach A: structured rebuild — components split, protocol untouched.
2. Activity timeline persisted in DB per message.
3. Both Tutor and Agent modes redesigned; Agent gets a distinct identity.
4. New agent visual identity (scoped `--ag-*` tokens), existing app theme vars untouched.

## 1. Bug fixes

| # | File | Fix |
|---|------|-----|
| 1 | `agent-py/llm.py` `get_health()` | `baseUrl` must reflect the active provider (Sarvam when `SARVAM_API_KEY` set), not NVIDIA whenever that key exists. |
| 2 | `agent-py/config.py`, `llm.py` | Comments say "Primary: NVIDIA"; actual priority is Sarvam→NVIDIA. Align comments; single source of truth for priority in one place (`llm.py`). |
| 3 | `agent-py/main.py` | Replace deprecated `@app.on_event("startup")` with `lifespan` async context manager. |
| 4 | `agent-py/service.py` | `_ttl_sweeper` runs `time.sleep(60)` in a raw thread; replace with an asyncio task created on the event loop (`asyncio.create_task` from lifespan). |
| 5 | `agent-py/graph.py` | `MemorySaver` accumulates one thread per turn forever. Add periodic sweep: drop checkpoint threads older than `APPROVAL_TTL` whose turns are finished. |
| 6 | `backend/src/agent/orchestrator.js` | Entire file is dead code (imported nowhere; routes call `pythonClient.js` directly). Delete it. |

## 2. Step persistence

**Schema:** `ChatSession.messages[]` entries gain optional `meta`:

```js
meta: {
  intent: String,          // supervisor intent phrase
  subagent: String,        // routed domain key
  reasoning: String,       // routing reasoning (one sentence)
  steps: [{                // ordered tool trail
    name: String, label: String,
    status: String,        // ok | error | denied | rejected
    duration: Number,      // ms
    detail: String         // result summary (truncated 300)
  }]
}
```

Only agent-mode model messages carry `meta`. Old messages without it render as plain text.

**Accumulation point:** `backend/src/agent/pythonClient.js` already parses every Python SSE frame while proxying. It collects the trail there:

- `intent` frame → record `{intent, subagent, reasoning}`
- `tool` frames → start row on `status:"start"`, finalize on terminal status with duration measured at the gateway
- `answer` frame → pass accumulated `meta` into `persistSession()` alongside the answer text

**Read path:** `GET /ai/sessions/:id` already returns full messages; `meta` flows through unchanged. No new endpoint.

## 3. Frontend architecture

Split `frontend/src/pages/Chat.jsx` (793 lines) into:

```
frontend/src/components/chat/
├── ChatPage.jsx         container: state machine, SSE consumption, sessions
├── SessionSidebar.jsx   history list, delete, active highlight
├── MessageList.jsx      scroll area, empty state, quick actions
├── MessageBubble.jsx    user/model bubbles + embedded ActivityTimeline
├── ActivityTimeline.jsx live + persisted step trail (see §4)
├── ApprovalCard.jsx     severity-colored card, structured args table
├── ChatInput.jsx        auto-grow textarea, send/stop button
└── theme.js             --ag-* token definitions + subagent color map
```

`pages/Chat.jsx` becomes a thin re-export of `ChatPage`.

**Agent identity (scoped, additive):**

- Tokens defined in `theme.js` and injected as CSS variables on the workspace root class `.agent-workspace`; global `--c-*` vars untouched so the rest of the app is unaffected.
- Palette: deep-navy gradient background, glass panels (`backdrop-filter: blur`), violet→cyan accent gradient.
- Subagent colors: admin=amber, academic_ops=emerald, communication=sky, helper=violet, finance=gold, operations=rose, general=slate.
- Motion: pulse on running steps, expand/collapse transitions, blinking stream cursor, subtle message entrance. All via CSS keyframes; no animation library added.

**Tutor mode:** same shell components (sidebar, input, bubbles) with its own accent token; no timeline features.

## 4. Timeline behavior

**Live (during streaming):**
- `intent` event → chip appears immediately ("Intent … → Admin Agent") with reasoning tooltip.
- Subagent badge shows spinner until `agent_done`.
- Each `tool_start` appends a row (spinner); terminal status swaps icon (✓/✗/🚫/rejected), shows duration and truncated summary; full summary on hover/title.
- Rows arrive inside a collapsible "Activity" panel attached to the in-progress assistant slot.

**On completion:**
- Timeline collapses into a summary chip on the final message: `⚙ N tools · <Subagent> · Xs`. Click toggles the full trail.
- Trail comes from component state during the live session; from `message.meta` after reload.

**Approval flow:** approval card pauses the stream; on approve/reject the resumed stream continues appending to the same timeline.

## 5. Error handling

- Gateway timeout / Python down → existing `error` event renders as inline error bubble (unchanged behavior, restyled).
- Malformed `meta` in history → render message without timeline (defensive `Array.isArray` checks).
- Timeline state resets per turn; approval resume reuses the same accumulator instance.

## 6. Testing & verification

1. Restart all services (`scripts/restart-services.sh`); `/agent/health` reports provider=sarvam AND matching sarvam baseUrl.
2. Read request → instant tool row with correct duration (no stale-closure timing).
3. Write request → approval card → approve → tool executes, timeline continues; reject → rejected row, no execution.
4. Reload a completed session → timelines render from DB `meta`.
5. Tutor mode regression: normal streaming chat works.
6. `cd frontend && npm run build` passes.
7. Grep confirms no remaining references to removed orchestrator dead code.

## Out of scope

- Wire protocol changes, new endpoints, Python-side schema changes beyond internal cleanups.
- Voice, proactive/scheduled agents, multi-agent parallelism.

## Verification log (2026-08-21, post-implementation)

All §6 checks pass. Three additional bugs were found and fixed during live verification:

1. **`main.py` missing `import asyncio`** — registry refresh crashed every turn
   (`registry load failed: name 'asyncio' is not defined`), so the agent ran with
   0 tools and never called any. Added the import.
2. **Empty tool summaries** — `on_tool_end` output is a `ToolMessage`, not a raw
   string; `str()` of it broke `json.loads`, falling into the no-summary branch.
   `service.py` now unwraps `.content` first (and falls back to truncated text).
3. **Silently dropped tool arguments** — langchain-core ≥1.x treats a zero-field
   BaseModel `args_schema` as a no-arg tool and calls the coroutine with no
   kwargs (`tools/base.py` fast path). Every write tool executed with empty args
   after approval. Replaced `AnyArgs` with a free-form JSON-schema dict
   (`additionalProperties: true`) in `tools.py`.

Also fixed during verification: LangGraph's approval-resume node replay emitted a
duplicate `tool_start`; the Node gateway now suppresses it so live timelines and
persisted `meta` keep a single row per tool call.

Verified live: read tools with durations, write → approval card → approve →
executed + timeline continued, reject → `rejected` row + nothing written to DB,
persisted `meta` renders on session reload, tutor chat regression OK,
`npm run build` passes, no orchestrator references remain.
