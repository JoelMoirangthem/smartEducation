import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, X, Clock, Wrench, Zap, ChevronDown, ChevronRight, Ban } from "lucide-react";
import { subagentColor, subagentLabel, STATUS_META } from "./theme";

const StepIcon = ({ status }) => {
    switch (status) {
        case "running": return <Loader2 size={14} className="animate-spin" color={STATUS_META.running.color} />;
        case "ok": return <CheckCircle2 size={14} color={STATUS_META.ok.color} />;
        case "error": return <AlertTriangle size={14} color={STATUS_META.error.color} />;
        case "denied": return <Ban size={14} color={STATUS_META.denied.color} />;
        case "rejected": return <X size={14} color={STATUS_META.rejected.color} />;
        default: return <Clock size={14} color="var(--ag-muted)" />;
    }
};

/**
 * Activity timeline for one agent turn.
 * mode="live"   — open panel that grows while the turn streams
 * mode="static" — collapsed summary chip (click to expand); used on
 *                 completed messages and persisted history (msg.meta)
 */
export default function ActivityTimeline({ intent = {}, steps = [], thinking = false, live = false }) {
    const [open, setOpen] = useState(live);
    const finished = steps.filter((s) => s.status !== "running");
    const totalMs = steps.reduce((acc, s) => acc + (s.duration || 0), 0);
    const accent = subagentColor(intent.subagent);

    if (!live && !steps.length && !intent.subagent) return null;

    const header = (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Zap size={12} color={accent} />
            {intent.subagent && (
                <span style={{
                    fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 7,
                    color: accent, background: `${accent}1a`, border: `1px solid ${accent}40`,
                    letterSpacing: "0.03em",
                }}>{subagentLabel(intent.subagent)}</span>
            )}
            {intent.intent && (
                <span style={{ fontSize: "0.76rem", color: "var(--ag-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>
                    {intent.intent}
                </span>
            )}
        </div>
    );

    if (!live && !open) {
        return (
            <button onClick={() => setOpen(true)} className="ag-glass ag-rise" title="Show agent activity"
                style={{
                    display: "inline-flex", alignItems: "center", gap: 7, marginTop: 10,
                    padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                    color: "var(--ag-muted)", fontSize: "0.72rem", fontWeight: 700,
                }}>
                <Wrench size={12} color={accent} />
                <span>{steps.length} tool{steps.length === 1 ? "" : "s"}</span>
                {intent.subagent && <><span style={{ opacity: 0.4 }}>·</span><span>{subagentLabel(intent.subagent)}</span></>}
                {totalMs > 0 && <><span style={{ opacity: 0.4 }}>·</span><span>{(totalMs / 1000).toFixed(1)}s</span></>}
                <ChevronRight size={12} />
            </button>
        );
    }

    return (
        <div className={`ag-glass ag-rise`} style={{ borderRadius: 14, padding: "10px 12px", marginTop: live ? 0 : 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                {header}
                {!live && (
                    <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--ag-muted)", cursor: "pointer", display: "flex", padding: 2 }}>
                        <ChevronDown size={14} />
                    </button>
                )}
            </div>

            {steps.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                    {steps.map((s, i) => {
                        const meta = STATUS_META[s.status] || STATUS_META.running;
                        return (
                            <div key={`${s.name}-${i}`} title={s.detail || s.label}
                                style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    padding: "6px 10px", borderRadius: 9, fontSize: "0.78rem",
                                    background: "rgba(255,255,255,0.03)",
                                    border: `1px solid ${s.status === "error" || s.status === "denied" ? "rgba(239,68,68,0.3)" : s.status === "rejected" ? "rgba(245,158,11,0.3)" : "var(--ag-border)"}`,
                                }}>
                                <StepIcon status={s.status} />
                                <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                                {s.detail && (
                                    <span style={{ fontSize: "0.68rem", color: "var(--ag-muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {s.detail}
                                    </span>
                                )}
                                {s.duration > 0 && (
                                    <span style={{ fontSize: "0.66rem", color: "var(--ag-muted)", whiteSpace: "nowrap" }}>
                                        {(s.duration / 1000).toFixed(1)}s
                                    </span>
                                )}
                                {s.status !== "running" && (
                                    <span style={{
                                        fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase",
                                        letterSpacing: "0.05em", padding: "1px 6px", borderRadius: 5,
                                        background: `${meta.color}1a`, color: meta.color,
                                    }}>{meta.label}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {live && thinking && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 2px 2px", color: "var(--ag-muted)", fontSize: "0.76rem", fontWeight: 600 }}>
                    <Loader2 size={13} className="animate-spin" color="var(--ag-accent)" />
                    Agent thinking…
                </div>
            )}
        </div>
    );
}
