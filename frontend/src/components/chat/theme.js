// Agent workspace identity tokens + subagent color system.
// Scoped under .agent-workspace so global --c-* theme vars are untouched.

export const AGENT_STYLES = `
/* Tutor mode: map --ag-* onto the app theme so shared chat components work */
.chat-shell {
    --ag-panel: var(--c-surface);
    --ag-panel-hover: var(--c-surface-hover);
    --ag-border: var(--c-border);
    --ag-text: var(--c-text);
    --ag-muted: var(--c-muted);
    --ag-accent: var(--c-primary);
    --ag-accent-2: var(--c-primary);
}
.agent-workspace {
    --ag-bg-1: #0b1020;
    --ag-bg-2: #131a36;
    --ag-panel: rgba(255, 255, 255, 0.045);
    --ag-panel-hover: rgba(255, 255, 255, 0.08);
    --ag-border: rgba(148, 163, 184, 0.16);
    --ag-text: #e6eaf3;
    --ag-muted: #8b93a7;
    --ag-accent: #8b5cf6;
    --ag-accent-2: #22d3ee;
    background:
        radial-gradient(1200px 500px at 15% -10%, rgba(139, 92, 246, 0.14), transparent 60%),
        radial-gradient(1000px 500px at 90% 110%, rgba(34, 211, 238, 0.10), transparent 55%),
        linear-gradient(165deg, var(--ag-bg-1), var(--ag-bg-2));
    color: var(--ag-text);
}
.agent-workspace .ag-glass {
    background: var(--ag-panel);
    border: 1px solid var(--ag-border);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
}
@keyframes ag-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes ag-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes ag-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.ag-rise { animation: ag-rise 0.25s ease-out both; }
`;

export const SUBAGENT_COLORS = {
    admin: "#f59e0b",
    academic_ops: "#10b981",
    communication: "#38bdf8",
    helper: "#a78bfa",
    finance: "#eab308",
    operations: "#fb7185",
    general: "#94a3b8",
};

export const SUBAGENT_LABELS = {
    admin: "Admin Agent",
    academic_ops: "Academic Ops Agent",
    communication: "Communication Agent",
    helper: "Helper Agent",
    finance: "Finance Agent",
    operations: "Operations Agent",
    general: "General Agent",
};

export const subagentColor = (key) => SUBAGENT_COLORS[key] || SUBAGENT_COLORS.general;
export const subagentLabel = (key) => SUBAGENT_LABELS[key] || "Agent";

export const STATUS_META = {
    running: { color: "#8b5cf6", label: "running" },
    ok: { color: "#22c55e", label: "done" },
    error: { color: "#ef4444", label: "error" },
    denied: { color: "#ef4444", label: "denied" },
    rejected: { color: "#f59e0b", label: "rejected" },
};
