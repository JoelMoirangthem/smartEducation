import { Plus, MessageSquare, Trash2 } from "lucide-react";

/** Session history sidebar (shared by both modes). */
export default function SessionSidebar({ sessions, currentSessionId, onNew, onLoad, onDelete, accent = "var(--c-primary)" }) {
    return (
        <aside style={{
            width: 280, height: "100%", display: "flex", flexDirection: "column",
            padding: "20px 14px", flexShrink: 0, position: "relative", zIndex: 10,
            background: "var(--c-sidebar-bg)", borderRight: "1px solid var(--c-border)",
        }}>
            <button onClick={onNew} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14,
                background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)",
                cursor: "pointer", transition: "all 0.2s", marginBottom: 24, fontWeight: 700, fontSize: "0.88rem",
            }}>
                <Plus size={18} color={accent} />
                <span>New Chat</span>
            </button>

            <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
                <p style={{
                    fontSize: "0.68rem", fontWeight: 800, color: "var(--c-muted)", marginBottom: 12,
                    padding: "0 6px", textTransform: "uppercase", letterSpacing: "0.12em",
                }}>History</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {sessions.map((s) => (
                        <div key={s._id} onClick={() => onLoad(s._id)} style={{
                            padding: "10px 12px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
                            cursor: "pointer",
                            color: currentSessionId === s._id ? "var(--c-text)" : "var(--c-muted)",
                            fontSize: "0.85rem", fontWeight: currentSessionId === s._id ? 700 : 500,
                            background: currentSessionId === s._id ? "var(--c-surface-hover)" : "transparent",
                            border: "1px solid",
                            borderColor: currentSessionId === s._id ? "var(--c-border)" : "transparent",
                            transition: "all 0.15s",
                        }}>
                            <MessageSquare size={14} color={currentSessionId === s._id ? accent : "var(--c-muted)"} />
                            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
                            {currentSessionId === s._id && (
                                <button onClick={(e) => onDelete(e, s._id)} style={{
                                    border: "none", background: "transparent", color: "var(--c-muted)",
                                    cursor: "pointer", padding: 3, borderRadius: 5, display: "flex",
                                }}>
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
