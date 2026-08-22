import { AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

/** Severity-colored approval card with a structured args table. */
export default function ApprovalCard({ approval, busy, onDecide }) {
    const destructive = approval.severity === "destructive";
    const accent = destructive ? "#ef4444" : "#8b5cf6";
    const args = approval.args && typeof approval.args === "object" ? approval.args : {};

    return (
        <div className="ag-glass ag-rise" style={{
            flex: 1, borderRadius: 14, padding: "14px 16px",
            borderColor: destructive ? "rgba(239,68,68,0.45)" : "var(--ag-border)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                {destructive
                    ? <AlertTriangle size={14} color="#ef4444" />
                    : <ShieldCheck size={14} color={accent} />}
                <span style={{ fontWeight: 800, fontSize: "0.8rem", color: destructive ? "#ef4444" : "var(--ag-text)" }}>
                    {destructive ? "⚠ Destructive Action" : "Approval Required"}
                </span>
                {approval.label && (
                    <span style={{
                        fontSize: "0.66rem", fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                        background: `${accent}1a`, color: accent, border: `1px solid ${accent}40`,
                    }}>{approval.label}</span>
                )}
            </div>

            <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.9rem", color: "var(--ag-text)" }}>
                {approval.preview || "The agent wants to perform an action."}
            </p>

            {Object.keys(args).length > 0 && (
                <div style={{ marginBottom: 12, borderRadius: 9, overflow: "hidden", border: "1px solid var(--ag-border)" }}>
                    {Object.entries(args).map(([k, v], i) => (
                        <div key={k} style={{
                            display: "flex", gap: 10, padding: "5px 10px", fontSize: "0.72rem",
                            background: i % 2 ? "rgba(255,255,255,0.02)" : "transparent",
                        }}>
                            <span style={{ color: "var(--ag-muted)", fontFamily: "'Fira Code', monospace", minWidth: 90 }}>{k}</span>
                            <span style={{ color: "var(--ag-text)", fontFamily: "'Fira Code', monospace", wordBreak: "break-all" }}>
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onDecide(approval.approvalId, "approve")} disabled={busy} style={{
                    padding: "7px 18px", borderRadius: 10, border: "none",
                    cursor: busy ? "default" : "pointer",
                    background: destructive ? "#ef4444" : accent,
                    color: "white", fontWeight: 700, fontSize: "0.82rem", opacity: busy ? 0.5 : 1,
                    display: "flex", alignItems: "center", gap: 6,
                }}>
                    <CheckCircle2 size={14} /> {busy ? "Processing…" : destructive ? "Confirm" : "Approve"}
                </button>
                <button onClick={() => onDecide(approval.approvalId, "reject")} disabled={busy} style={{
                    padding: "7px 18px", borderRadius: 10,
                    cursor: busy ? "default" : "pointer",
                    background: "transparent", border: "1px solid var(--ag-border)",
                    color: "var(--ag-muted)", fontWeight: 700, fontSize: "0.82rem", opacity: busy ? 0.5 : 1,
                }}>Reject</button>
            </div>
        </div>
    );
}
