# Agentic AI Assistant — Design (Implemented)

Date: 2026-08-21 | Status: **Implemented & smoke-tested**

## Goal
A conversational AI agent that can perform **every manual feature** of SmartEducation on the user's behalf — role-scoped, with hybrid approvals. Lives inside the existing `/chat` page as a "Tutor | Agent" toggle.

## Decisions (user-approved)
- **Hybrid autonomy**: reads execute instantly; every write shows an approval card; destructive actions are flagged `⚠ DESTRUCTIVE` and need explicit confirm.
- **Full feature parity**: 37 tools mapped to existing controllers (approach A — controller adapter, zero business-logic duplication).
- **LLM engine**: Sarvam AI (`https://api.sarvam.ai/v1`, model `sarvam-105b`) via the existing OpenAI SDK pattern; env-driven (`LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL`). Native OpenAI-style function calling verified by probe; JSON action-block parsing kept as fallback.
- **Deletes included** (double-confirm).

## Architecture
```
Chat.jsx (mode: agent)                backend/src/agent/
  POST /agent/chat  ───────────►      engine.js     — loop, events, resume
  POST /agent/approve ─────────┐      llm.js       — OpenAI client @ LLM_BASE_URL
       │                       │      toolRegistry — 37 tools (severity/roles/schema)
       ▼                       ▼      adapter.js   — runs existing controllers w/ req.user
  [EVT] line protocol         approvals.js — TurnStore (TTL 15 min)
                               engine → existing controllers (same permission checks + socket emits)
```

## Backend files
- `src/agent/{llm,adapter,toolRegistry,approvals,engine}.js` — new subsystem
- `src/models/agentActionLog.model.js` — audit trail (sanitized args, no passwords)
- `src/routes/agent.routes.js` — `/agent/chat`, `/agent/approve`, `/agent/actions`, `/agent/health` (JWT + rate-limited)
- `src/models/chatSession.model.js` — `mode: tutor|agent`
- `src/controllers/ai.controller.js` — sessions filter by `?mode=`
- `.env/.env.example` — `LLM_*`, `AGENT_MAX_STEPS`, `AGENT_MAX_TOKENS`, `AGENT_TIMEOUT_MS`, `AGENT_APPROVAL_TTL_MIN`

## Wire protocol (text/plain chunked)
```
[EVT] {"type":"tool_start","tool","label"}
[EVT] {"type":"tool_result","tool","ok","summary","rejected"?}
[EVT] {"type":"approval","approvalId","tool","label","severity","preview","args"}
[EVT] {"type":"answer","text"}            ← final answer (frontend runs its typewriter)
[EVT] {"type":"session","id"}
[EVT] {"type":"done"} / {"type":"error","message"}
```
Approval pause: turn + pending tool calls are stored in-memory (15-min TTL). `POST /approve` verifies turn ownership, executes (or injects `USER_REJECTED` tool result), and resumes the loop — multiple approvals per turn supported, reads never require approval, role checks happen before approvals (denied tools never reach the approval stage).

## Safety
- Tools execute **as the logged-in user** via the controller adapter → all existing permission/ownership checks and socket emits reused (no drift).
- Read/write/destructive severity; destructive cards render red "Confirm Delete".
- Audit log per action (user, tool, severity, sanitized args, status, session); admin views all, others only their own.
- Rate limits: 20 chat/min, 60 approve/min; step budget 12/turn; provider timeout 90s; base64 note upload capped at 5MB.
- In-memory turn store: single-instance backend assumption; expired approvals return a clear "expired — re-send" error.

## Verification
`node scripts/dev/agent_smoke.js` (live server) — 11 checks all pass: health, instant reads, write approval + resume, multi-step chains, rejection path, role denial (student blocked from admin tools), audit population, password scrub.

## Known limitations
- Face recognition capture remains student-app only; agent can check registration status and mark session attendance on request (`attendanceType` not applicable — uses QR-style mark with generated `agent-<userId>` deviceId).
- Turn state is in-memory (restart = approvals expire safely; nothing executes without a fresh approval).
- Sarvam is a reasoning model: first tool result can take a few seconds (reasoning tokens are not streamed to the UI, only `content`).