// Claude-exact tokens — warm editorial, paper + ink
// Tutor = Claude light, Agent = Claude with tool chrome

export const AGENT_STYLES = `
/* ── Claude shell — light paper ── */
.chat-shell {
  --ag-bg: #FDFCFA;
  --ag-bg-soft: #F9F5EB;
  --ag-panel: #FFFFFF;
  --ag-panel-hover: #F5F0E8;
  --ag-border: #E8E0D6;
  --ag-border-strong: #DCCFC2;
  --ag-text: #1A1A1E;
  --ag-muted: #6B6B6B;
  --ag-faint: #F5F0E8;
  --ag-accent: #D97706;
  --ag-accent-2: #B45309;
  --ag-accent-soft: #FFF7ED;
  --ag-input: #FFFFFF;
  --ag-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
  --ag-code-bg: #1A1A1E;
  --ag-code-border: #2A2A2E;
  background: var(--ag-bg);
  color: var(--ag-text);
}
[data-theme="dark"] .chat-shell {
  --ag-bg: #0F0F0F;
  --ag-bg-soft: #1A1A1A;
  --ag-panel: #1E1E1E;
  --ag-panel-hover: #252525;
  --ag-border: #2A2A2A;
  --ag-border-strong: #333333;
  --ag-text: #E8E8E8;
  --ag-muted: #9A9A9A;
  --ag-faint: #1A1A1A;
  --ag-accent: #D97706;
  --ag-accent-2: #F59E0B;
  --ag-accent-soft: #2A1F0F;
  --ag-input: #1E1E1E;
  --ag-shadow: 0 4px 24px rgba(0,0,0,0.32);
  --ag-code-bg: #0A0A0A;
  --ag-code-border: #2A2A2A;
  background: var(--ag-bg);
}

/* ── Agent workspace — Claude tool mode (same paper but with indigo tool rail) ── */
.agent-workspace {
  --ag-bg: #FDFCFA;
  --ag-bg-soft: #F9F5EB;
  --ag-panel: #FFFFFF;
  --ag-panel-hover: #F5F0E8;
  --ag-border: #E8E0D6;
  --ag-border-strong: #DCCFC2;
  --ag-text: #1A1A1E;
  --ag-muted: #6B6B6B;
  --ag-faint: #F5F0E8;
  --ag-accent: #6D28D9;
  --ag-accent-2: #7C3AED;
  --ag-accent-soft: #F5F3FF;
  --ag-input: #FFFFFF;
  --ag-shadow: 0 1px 3px rgba(0,0,0,0.04);
  --ag-code-bg: #1A1A1E;
  --ag-code-border: #2A2A2E;
  background: var(--ag-bg);
  color: var(--ag-text);
}
[data-theme="dark"] .agent-workspace {
  --ag-bg: #0F0F0F;
  --ag-bg-soft: #1A1A1A;
  --ag-panel: #1E1E1E;
  --ag-panel-hover: #252525;
  --ag-border: #2A2A2A;
  --ag-border-strong: #333333;
  --ag-text: #E8E8E8;
  --ag-muted: #9A9A9A;
  --ag-faint: #1A1A1A;
  --ag-accent: #8B5CF6;
  --ag-accent-2: #22D3EE;
  --ag-accent-soft: #1E1B2E;
  --ag-input: #1E1E1E;
  --ag-shadow: 0 4px 24px rgba(0,0,0,0.32);
  --ag-code-bg: #0A0A0A;
  --ag-code-border: #2A2A2A;
  background: var(--ag-bg);
}

/* ── Glass removed — Claude is paper, not glass ── */
.chat-shell .ag-glass,
.agent-workspace .ag-glass {
  background: var(--ag-panel);
  border: 1px solid var(--ag-border);
}
[data-theme="dark"] .chat-shell .ag-glass,
[data-theme="dark"] .agent-workspace .ag-glass {
  background: var(--ag-panel);
}

/* ── Claude motion — exact: gentle rise, not spring ── */
@keyframes ag-pulse { 0%,100%{opacity:1} 50%{opacity:0.48} }
@keyframes ag-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes ag-rise { from{opacity:0; transform:translateY(4px)} to{opacity:1; transform:translateY(0)} }
@keyframes ag-fade { from{opacity:0} to{opacity:1} }
@keyframes claude-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes claude-typing { 0%,80%,100%{transform:scale(0); opacity:0.5} 40%{transform:scale(1); opacity:1} }
.ag-rise { animation: ag-rise 0.22s ease-out both; }
.ag-fade { animation: ag-fade 0.18s ease-out both; }

/* ── Claude scrollbar — hairline ── */
.chat-scroll::-webkit-scrollbar { width: 5px; }
.chat-scroll::-webkit-scrollbar-track { background: transparent; }
.chat-scroll::-webkit-scrollbar-thumb { background: #E8E0D6; border-radius: 999px; }
[data-theme="dark"] .chat-scroll::-webkit-scrollbar-thumb { background: #2A2A2A; }

/* ── Claude code block — exact ── */
.claude-code { background: var(--ag-code-bg); border: 1px solid var(--ag-code-border); border-radius: 12px; overflow: hidden; }
.claude-code-head { display:flex; align-items:center; justify-content:space-between; padding: 8px 14px; background: rgba(255,255,255,0.04); border-bottom: 1px solid var(--ag-code-border); font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: #9A9A9A; }
`;

export const SUBAGENT_COLORS = {
  admin: "#D97706",
  academic_ops: "#059669",
  communication: "#0284C7",
  helper: "#7C3AED",
  finance: "#CA8A04",
  operations: "#DC2626",
  general: "#6B7280",
};
export const SUBAGENT_LABELS = {
  admin: "Admin",
  academic_ops: "Academic",
  communication: "Communication",
  helper: "Helper",
  finance: "Finance",
  operations: "Operations",
  general: "General",
};
export const subagentColor = (key) => SUBAGENT_COLORS[key] || SUBAGENT_COLORS.general;
export const subagentLabel = (key) => SUBAGENT_LABELS[key] || "Agent";
export const STATUS_META = {
  running: { color: "#D97706", label: "running" },
  ok: { color: "#059669", label: "done" },
  error: { color: "#DC2626", label: "error" },
  denied: { color: "#DC2626", label: "denied" },
  rejected: { color: "#D97706", label: "rejected" },
};
